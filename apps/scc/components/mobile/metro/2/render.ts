import { ATLAS_DPR, CAPSULE, type Cell, GROUND, RIVER, type Scene } from "./scene";

// One frame of the moving network. Lines are one batched path per line (two
// strokes for hollow and dashed lines) through their cords' current nodes,
// lines sharing a link offset along the cord's own normals; dots are one path
// per ring colour; capsules turn with the cord leaving their station; names
// and badges are drawImage calls from an immutable atlas, carried by their
// stations. Nothing is rasterised from text per frame.

function trace(path: Path2D, p: Float32Array, ids: number[], offset: number) {
  const count = ids.length;
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
    if (j === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
}

function blit(ctx: CanvasRenderingContext2D, atlas: CanvasImageSource, c: Cell, x: number, y: number, dpr: number, width: number, height: number) {
  const w = c.sw / ATLAS_DPR;
  const h = c.sh / ATLAS_DPR;
  if (x < -w || y < -h || x > width + w || y > height + h) return;
  ctx.drawImage(atlas, c.sx, c.sy, c.sw, c.sh, (x - w / 2) * dpr, (y - h / 2) * dpr, w * dpr, h * dpr);
}

export function draw(ctx: CanvasRenderingContext2D, scene: Scene, atlas: CanvasImageSource, dpr: number) {
  const p = scene.net.pos;
  const { width, height } = scene;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, width, height);
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
      const w = t.sw / ATLAS_DPR;
      const h = t.sh / ATLAS_DPR;
      ctx.setTransform(dpr * Math.cos(t.angle), dpr * Math.sin(t.angle), -dpr * Math.sin(t.angle), dpr * Math.cos(t.angle), dpr * t.x, dpr * t.y);
      ctx.drawImage(atlas, t.sx, t.sy, t.sw, t.sh, -w / 2, -h / 2, w, h);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // Lines.
  scene.styles.forEach((style, si) => {
    const path = new Path2D();
    for (const ri of scene.runsOf[si]) {
      const run = scene.runs[ri];
      trace(path, p, run.ids, run.offsets[run.lines.indexOf(si)]);
    }
    ctx.lineCap = "round";
    ctx.strokeStyle = style.colour;
    ctx.lineWidth = style.width;
    ctx.stroke(path);
    if (style.kind === "double") {
      ctx.strokeStyle = GROUND;
      ctx.lineWidth = style.width * 0.44;
      ctx.stroke(path);
    } else if (style.kind === "dashed") {
      ctx.lineCap = "butt";
      ctx.strokeStyle = GROUND;
      ctx.lineWidth = style.width * 0.3;
      ctx.setLineDash([style.width * 1.3, style.width * 1.3]);
      ctx.stroke(path);
      ctx.setLineDash([]);
    }
  });

  // Ordinary stations.
  {
    const plain = new Path2D();
    const ringed = new Map<string, Path2D>();
    for (const dot of scene.dots) {
      const x = p[dot.node * 2];
      const y = p[dot.node * 2 + 1];
      let target = plain;
      if (dot.ring) {
        target = ringed.get(dot.ring) ?? new Path2D();
        ringed.set(dot.ring, target);
      }
      target.moveTo(x + dot.radius, y);
      target.arc(x, y, dot.radius, 0, Math.PI * 2);
    }
    ctx.fillStyle = "#ffffff";
    ctx.fill(plain);
    ctx.lineWidth = Math.max(0.8, scene.W * 0.13);
    for (const [colour, path] of ringed) {
      ctx.fill(path);
      ctx.strokeStyle = colour;
      ctx.stroke(path);
    }
  }

  // Interchanges: traffic-light capsules across the cord leaving the station.
  for (const c of scene.capsules) {
    const x = p[c.node * 2];
    const y = p[c.node * 2 + 1];
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
    c.colours.forEach((colour, i) => {
      ctx.beginPath();
      ctx.arc(-span / 2 + i * c.step, 0, c.r * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
    });
  }

  // Badges and names, carried by their stations.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const b of scene.badges) {
    const x = p[b.node * 2];
    const y = p[b.node * 2 + 1];
    const dx = x - p[b.toward * 2];
    const dy = y - p[b.toward * 2 + 1];
    const len = Math.hypot(dx, dy) || 1;
    blit(ctx, atlas, b, x + (dx / len) * b.reach, y + (dy / len) * b.reach, dpr, width, height);
  }
  for (const l of scene.labels) {
    blit(ctx, atlas, l, p[l.node * 2] + l.dx, p[l.node * 2 + 1] + l.dy, dpr, width, height);
  }
}
