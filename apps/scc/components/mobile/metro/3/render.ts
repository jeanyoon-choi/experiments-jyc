import { CAPSULE, type Cell, GROUND, RIVER, type Scene } from "./scene";

// The moving network, always at the device's own pixel density.
//
// A frame repaints only where something moved: every node remembers where it
// was last drawn, and a node that has drifted from there marks the tiles its
// old and new marks touch — line bundles through it and its neighbours, its
// dot or capsule, its badge and name. Those tiles are cleared to the paper
// and everything that reaches into them is drawn again, in the full order,
// clipped to them; the rest of the canvas keeps its pixels. Names and badges
// are 1:1 blits from a device-scale atlas, snapped to the device pixel grid.
// Lines are drawn as curves through the midpoints of their cords, so a
// stretched cord bends smoothly instead of in 10 px facets.

/** Tile edge, device px. */
const TILE = 96;

type Sources = CanvasImageSource[];

export class Painter {
  private drawn: Float32Array;
  private moved: Uint8Array;
  private cols: number;
  private rows: number;
  private dirty: Uint8Array;
  private dirtyCount = 0;
  private bw: number;
  private bh: number;
  /** Fraction of the canvas repainted by the last frame, for measurement. */
  last = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private scene: Scene,
    public atlas: Sources,
  ) {
    const { width, height, dpr } = scene;
    this.bw = Math.round(width * dpr);
    this.bh = Math.round(height * dpr);
    this.cols = Math.ceil(this.bw / TILE);
    this.rows = Math.ceil(this.bh / TILE);
    this.dirty = new Uint8Array(this.cols * this.rows);
    this.drawn = Float32Array.from(scene.net.pos);
    this.moved = new Uint8Array(scene.net.count);
  }

  /** Repaints everything. */
  full() {
    this.dirty.fill(1);
    this.dirtyCount = this.dirty.length;
    this.drawn.set(this.scene.net.pos);
    this.paint();
  }

  /**
   * Repaints where any node has drifted more than `tolerance` CSS px from
   * where it was last drawn. Returns the repainted fraction of the canvas.
   */
  update(tolerance: number) {
    const { scene, drawn, moved } = this;
    const p = scene.net.pos;
    const n = scene.net.count;
    const t2 = tolerance * tolerance;
    let any = false;
    for (let i = 0; i < n; i += 1) {
      const dx = p[i * 2] - drawn[i * 2];
      const dy = p[i * 2 + 1] - drawn[i * 2 + 1];
      const m = dx * dx + dy * dy > t2 ? 1 : 0;
      moved[i] = m;
      if (m) any = true;
    }
    if (!any) {
      this.last = 0;
      return 0;
    }
    this.dirty.fill(0);
    this.dirtyCount = 0;
    this.markMoved();
    for (let i = 0; i < n; i += 1) {
      if (!moved[i]) continue;
      drawn[i * 2] = p[i * 2];
      drawn[i * 2 + 1] = p[i * 2 + 1];
    }
    this.paint();
    return this.last;
  }

  // Dirty tiles.

  private mark(x0: number, y0: number, x1: number, y1: number) {
    const d = this.scene.dpr;
    const c0 = Math.max(0, Math.floor((x0 * d - 2) / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((x1 * d + 2) / TILE));
    const r0 = Math.max(0, Math.floor((y0 * d - 2) / TILE));
    const r1 = Math.min(this.rows - 1, Math.floor((y1 * d + 2) / TILE));
    for (let r = r0; r <= r1; r += 1) {
      for (let c = c0; c <= c1; c += 1) {
        const k = r * this.cols + c;
        if (!this.dirty[k]) {
          this.dirty[k] = 1;
          this.dirtyCount += 1;
        }
      }
    }
  }

  private touches(x0: number, y0: number, x1: number, y1: number) {
    if (this.dirtyCount === this.dirty.length) return x1 >= 0 && y1 >= 0 && x0 <= this.scene.width && y0 <= this.scene.height;
    const d = this.scene.dpr;
    const c0 = Math.max(0, Math.floor((x0 * d - 2) / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((x1 * d + 2) / TILE));
    const r0 = Math.max(0, Math.floor((y0 * d - 2) / TILE));
    const r1 = Math.min(this.rows - 1, Math.floor((y1 * d + 2) / TILE));
    for (let r = r0; r <= r1; r += 1) {
      for (let c = c0; c <= c1; c += 1) if (this.dirty[r * this.cols + c]) return true;
    }
    return false;
  }

  /** Marks the old and new extent of every mark hanging on a moved node. */
  private markMoved() {
    const { scene, drawn, moved } = this;
    const p = scene.net.pos;
    // Line bundles: a moved cord node and its neighbours, before and after.
    for (const run of scene.runs) {
      const ids = run.ids;
      const pad = run.half + 1;
      for (let j = 0; j < ids.length; j += 1) {
        if (!moved[ids[j]]) continue;
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let q = Math.max(0, j - 1); q <= Math.min(ids.length - 1, j + 1); q += 1) {
          const i = ids[q] * 2;
          x0 = Math.min(x0, p[i], drawn[i]);
          x1 = Math.max(x1, p[i], drawn[i]);
          y0 = Math.min(y0, p[i + 1], drawn[i + 1]);
          y1 = Math.max(y1, p[i + 1], drawn[i + 1]);
        }
        this.mark(x0 - pad, y0 - pad, x1 + pad, y1 + pad);
      }
    }
    for (const dot of scene.dots) {
      if (!moved[dot.node]) continue;
      const r = dot.radius + 1.5;
      for (const a of [p, drawn]) this.mark(a[dot.node * 2] - r, a[dot.node * 2 + 1] - r, a[dot.node * 2] + r, a[dot.node * 2 + 1] + r);
    }
    for (const c of scene.capsules) {
      if (!moved[c.node] && !moved[c.toward]) continue;
      const r = c.extent + 1;
      for (const a of [p, drawn]) this.mark(a[c.node * 2] - r, a[c.node * 2 + 1] - r, a[c.node * 2] + r, a[c.node * 2 + 1] + r);
    }
    const d = scene.dpr;
    for (const b of scene.badges) {
      if (!moved[b.node] && !moved[b.toward]) continue;
      const hw = b.sw / d / 2;
      const hh = b.sh / d / 2;
      for (const a of [p, drawn]) {
        const [x, y] = badgeAt(a, b.node, b.toward, b.reach);
        this.mark(x - hw, y - hh, x + hw, y + hh);
      }
    }
    for (const l of scene.labels) {
      if (!moved[l.node]) continue;
      const hw = l.sw / d / 2;
      const hh = l.sh / d / 2;
      for (const a of [p, drawn]) {
        const x = a[l.node * 2] + l.dx;
        const y = a[l.node * 2 + 1] + l.dy;
        this.mark(x - hw, y - hh, x + hw, y + hh);
      }
    }
  }

  // Painting.

  private paint() {
    const { ctx, scene } = this;
    const { dpr, width, height } = scene;
    const p = scene.net.pos;
    const whole = this.dirtyCount === this.dirty.length;
    this.last = this.dirtyCount / this.dirty.length;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!whole) {
      // Clip to the dirty tiles, merged into horizontal spans.
      ctx.beginPath();
      for (let r = 0; r < this.rows; r += 1) {
        let c = 0;
        while (c < this.cols) {
          if (!this.dirty[r * this.cols + c]) {
            c += 1;
            continue;
          }
          const start = c;
          while (c < this.cols && this.dirty[r * this.cols + c]) c += 1;
          ctx.rect(start * TILE, r * TILE, (c - start) * TILE, TILE);
        }
      }
      ctx.clip();
    }
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, this.bw, this.bh);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);

    // 한강, on the paper.
    {
      const r = scene.river.points;
      ctx.beginPath();
      ctx.moveTo(r[0], r[1]);
      for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]);
      ctx.strokeStyle = RIVER;
      ctx.lineWidth = scene.river.width;
      ctx.stroke();
      const t = scene.riverText;
      if (t) {
        const w = t.sw / dpr;
        const h = t.sh / dpr;
        const cos = Math.cos(t.angle);
        const sin = Math.sin(t.angle);
        ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * t.x, dpr * t.y);
        ctx.drawImage(this.atlas[t.page], t.sx, t.sy, t.sw, t.sh, -w / 2, -h / 2, w, h);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    // Lines: which runs reach a dirty tile.
    const live = new Uint8Array(scene.runs.length);
    scene.runs.forEach((run, ri) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const id of run.ids) {
        const x = p[id * 2];
        const y = p[id * 2 + 1];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      const pad = run.half + 1;
      if (this.touches(x0 - pad, y0 - pad, x1 + pad, y1 + pad)) live[ri] = 1;
    });
    scene.styles.forEach((style, si) => {
      ctx.beginPath();
      let some = false;
      for (const s of scene.strokes[si]) {
        if (!live[s.run]) continue;
        trace(ctx, p, scene.runs[s.run].ids, s.offset);
        some = true;
      }
      if (!some) return;
      ctx.lineCap = "round";
      ctx.strokeStyle = style.colour;
      ctx.lineWidth = style.width;
      ctx.stroke();
      if (style.kind === "double") {
        ctx.strokeStyle = GROUND;
        ctx.lineWidth = style.width * 0.44;
        ctx.stroke();
      } else if (style.kind === "dashed") {
        ctx.lineCap = "butt";
        ctx.strokeStyle = GROUND;
        ctx.lineWidth = style.width * 0.3;
        ctx.setLineDash([style.width * 1.3, style.width * 1.3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Ordinary stations: one path for plain dots, one per ring colour.
    {
      ctx.beginPath();
      let ringColour: string | null = null;
      let open = false;
      const flush = () => {
        if (!open) return;
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        if (ringColour) ctx.stroke();
        ctx.beginPath();
        open = false;
      };
      ctx.lineWidth = Math.max(0.8, scene.W * 0.14);
      for (const dot of scene.dotsByRing) {
        if (dot.ring !== ringColour) {
          flush();
          ringColour = dot.ring;
          if (ringColour) ctx.strokeStyle = ringColour;
        }
        const x = p[dot.node * 2];
        const y = p[dot.node * 2 + 1];
        const r = dot.radius;
        if (!this.touches(x - r - 1, y - r - 1, x + r + 1, y + r + 1)) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
        open = true;
      }
      flush();
    }

    // Interchanges: traffic-light capsules across the cord leaving the station.
    for (const c of scene.capsules) {
      const x = p[c.node * 2];
      const y = p[c.node * 2 + 1];
      if (!this.touches(x - c.extent, y - c.extent, x + c.extent, y + c.extent)) continue;
      const dx = p[c.toward * 2] - x;
      const dy = p[c.toward * 2 + 1] - y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = -dy / len;
      const uy = dx / len;
      const span = (c.colours.length - 1) * c.step;
      ctx.setTransform(dpr * ux, dpr * uy, -dpr * uy, dpr * ux, dpr * x, dpr * y);
      ctx.beginPath();
      ctx.roundRect(-span / 2 - c.r - c.pad, -c.r - c.pad, span + 2 * (c.r + c.pad), 2 * (c.r + c.pad), c.r + c.pad);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = c.ring;
      ctx.strokeStyle = CAPSULE;
      ctx.stroke();
      for (let i = 0; i < c.colours.length; i += 1) {
        ctx.beginPath();
        ctx.arc(-span / 2 + i * c.step, 0, c.r * 0.86, 0, Math.PI * 2);
        ctx.fillStyle = c.colours[i];
        ctx.fill();
      }
    }

    // Badges and names, carried by their stations: 1:1 on the device grid.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const b of scene.badges) {
      const [x, y] = badgeAt(p, b.node, b.toward, b.reach);
      this.blit(b, x, y, width, height);
    }
    for (const l of scene.labels) {
      this.blit(l, p[l.node * 2] + l.dx, p[l.node * 2 + 1] + l.dy, width, height);
    }
    ctx.restore();
  }

  private blit(c: Cell, x: number, y: number, width: number, height: number) {
    const d = this.scene.dpr;
    const hw = c.sw / d / 2;
    const hh = c.sh / d / 2;
    if (x < -hw || y < -hh || x > width + hw || y > height + hh) return;
    if (!this.touches(x - hw, y - hh, x + hw, y + hh)) return;
    this.ctx.drawImage(this.atlas[c.page], c.sx, c.sy, c.sw, c.sh, Math.round(x * d) - c.sw / 2, Math.round(y * d) - c.sh / 2, c.sw, c.sh);
  }
}

function badgeAt(a: Float32Array, node: number, toward: number, reach: number): [number, number] {
  const x = a[node * 2];
  const y = a[node * 2 + 1];
  const dx = x - a[toward * 2];
  const dy = y - a[toward * 2 + 1];
  const len = Math.hypot(dx, dy) || 1;
  return [x + (dx / len) * reach, y + (dy / len) * reach];
}

/**
 * A cord as a smooth curve: straight to the first midpoint, quadratic through
 * each node to the next midpoint, straight into the last station. Parallel
 * lines are offset along each node's own normal.
 */
function trace(ctx: CanvasRenderingContext2D, p: Float32Array, ids: number[], offset: number) {
  const count = ids.length;
  let px = 0;
  let py = 0;
  for (let j = 0; j < count; j += 1) {
    const i = ids[j] * 2;
    let x = p[i];
    let y = p[i + 1];
    if (offset !== 0) {
      const a = ids[Math.max(0, j - 1)] * 2;
      const b = ids[Math.min(count - 1, j + 1)] * 2;
      const tx = p[b] - p[a];
      const ty = p[b + 1] - p[a + 1];
      const len = Math.hypot(tx, ty) || 1;
      x += (-ty / len) * offset;
      y += (tx / len) * offset;
    }
    if (j === 0) ctx.moveTo(x, y);
    else if (j === 1 || j === count - 1) {
      if (j === count - 1 && j > 1) ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
      if (j === 1 && count > 2) ctx.lineTo((px + x) / 2, (py + y) / 2);
      else ctx.lineTo(x, y);
    } else ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    px = x;
    py = y;
  }
}
