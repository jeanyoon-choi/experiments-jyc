import type { LabelCache } from "./labels";
import { ground, lineById } from "./model";
import type { Run, Scene } from "./scene";
import { BRANCH_DOT, DASH, DISC, DOT_R, DOUBLE, GROUND, NAME, RING, RING_DOT, RIVER, SEOUL, WIDTH, tint } from "./style";

// One frame at device resolution. The camera maps map units to CSS px:
// screen = map · s + (tx, ty); the canvas transform adds the device pixel
// ratio, so every stroke and fill is vector-sharp at any zoom. Names and
// badges are bitmaps from LabelCache at the frame's device scale.

export type Camera = { s: number; tx: number; ty: number };

// Plain names smaller than this (CSS px) are left out; nothing is legible below it.
const MIN_NAME_PX = 3.2;

const KIND_ORDER = { light: 0, dashed: 1, double: 2, metro: 3 } as const;

function trace(path: Path2D, p: Float32Array, r: Run) {
  const ids = r.ids;
  const last = ids.length - 1;
  path.moveTo(p[ids[0] * 2] + r.ax, p[ids[0] * 2 + 1] + r.ay);
  for (let j = 1; j < last; j += 1) path.lineTo(p[ids[j] * 2], p[ids[j] * 2 + 1]);
  path.lineTo(p[ids[last] * 2] + r.bx, p[ids[last] * 2 + 1] + r.by);
}

function polygons(path: Path2D, list: number[][]) {
  for (const poly of list) {
    path.moveTo(poly[0], poly[1]);
    for (let i = 2; i < poly.length; i += 2) path.lineTo(poly[i], poly[i + 1]);
    path.closePath();
  }
}

let groundPaths: { seoul: Path2D; water: Path2D } | null = null;
function groundPath() {
  if (!groundPaths) {
    const seoul = new Path2D();
    polygons(seoul, ground.seoul);
    const water = new Path2D();
    polygons(water, ground.river);
    polygons(water, ground.sea);
    groundPaths = { seoul, water };
  }
  return groundPaths;
}

/** Draws one frame; returns true while some names still wait for their bitmaps. */
export function draw(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  labels: LabelCache,
  cam: Camera,
  view: { width: number; height: number; dpr: number },
): boolean {
  const { width, height, dpr } = view;
  const p = scene.net.pos;
  const k = cam.s * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(k, 0, 0, k, cam.tx * dpr, cam.ty * dpr);

  // Visible map rectangle, with a margin for names.
  const margin = 80;
  const vx0 = -cam.tx / cam.s - margin;
  const vy0 = -cam.ty / cam.s - margin;
  const vx1 = (width - cam.tx) / cam.s + margin;
  const vy1 = (height - cam.ty) / cam.s + margin;
  const inView = (x: number, y: number) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

  const g = groundPath();
  ctx.fillStyle = SEOUL;
  ctx.fill(g.seoul);
  ctx.fillStyle = RIVER;
  ctx.fill(g.water);

  // Lines, lightest grammar underneath.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const order = [...scene.byLine.keys()].sort(
    (a, b) => KIND_ORDER[lineById.get(a)!.kind] - KIND_ORDER[lineById.get(b)!.kind],
  );
  for (const id of order) {
    const runs = scene.byLine.get(id)!;
    const line = lineById.get(id)!;
    const path = new Path2D();
    for (const r of runs) trace(path, p, r);
    const w = WIDTH[line.kind];
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    ctx.strokeStyle = line.colour;
    ctx.lineWidth = w;
    ctx.stroke(path);
    if (line.kind === "double") {
      ctx.strokeStyle = tint(line.colour, DOUBLE.tint);
      ctx.lineWidth = w - 2 * DOUBLE.stroke;
      ctx.stroke(path);
    } else if (line.kind === "dashed") {
      ctx.lineCap = "butt";
      ctx.strokeStyle = SEOUL;
      ctx.lineWidth = DASH.width;
      ctx.setLineDash([DASH.on, DASH.off]);
      ctx.stroke(path);
      ctx.setLineDash([]);
    }
  }

  // Plain stations: white dots in solid lines, ringed dots on double and
  // dashed lines and where a line branches.
  const dots = new Path2D();
  const rings = new Map<string, { path: Path2D; width: number }>();
  for (const m of scene.marks) {
    if (m.transfer) continue;
    const x = p[m.node * 2];
    const y = p[m.node * 2 + 1];
    if (!inView(x, y)) continue;
    const line = lineById.get(m.line!)!;
    if (m.branch || line.kind === "double" || line.kind === "dashed") {
      const spec = m.branch ? BRANCH_DOT : RING_DOT;
      const key = `${line.colour}|${spec.stroke}`;
      const entry = rings.get(key) ?? { path: new Path2D(), width: spec.stroke };
      rings.set(key, entry);
      entry.path.moveTo(x + spec.r, y);
      entry.path.arc(x, y, spec.r, 0, Math.PI * 2);
    } else {
      dots.moveTo(x + DOT_R, y);
      dots.arc(x, y, DOT_R, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = "#ffffff";
  ctx.fill(dots);
  for (const [key, { path, width: lw }] of rings) {
    ctx.fill(path);
    ctx.strokeStyle = key.split("|")[0];
    ctx.lineWidth = lw;
    ctx.stroke(path);
  }

  // Interchanges: dark rings, then white, then line discs — the rings of
  // neighbouring discs merge into one outline like an "8".
  const outer = new Path2D();
  const inner = new Path2D();
  const byColour = new Map<string, Path2D>();
  const ro = DISC.r + DISC.white + DISC.ring;
  const ri = DISC.r + DISC.white;
  for (const m of scene.marks) {
    if (!m.transfer) continue;
    const x = p[m.node * 2];
    const y = p[m.node * 2 + 1];
    if (!inView(x, y)) continue;
    for (const d of m.discs!) {
      const cx = x + d.dx;
      const cy = y + d.dy;
      outer.moveTo(cx + ro, cy);
      outer.arc(cx, cy, ro, 0, Math.PI * 2);
      inner.moveTo(cx + ri, cy);
      inner.arc(cx, cy, ri, 0, Math.PI * 2);
      const colour = lineById.get(d.line)!.colour;
      const path = byColour.get(colour) ?? new Path2D();
      byColour.set(colour, path);
      path.moveTo(cx + DISC.r, cy);
      path.arc(cx, cy, DISC.r, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = RING;
  ctx.fill(outer);
  ctx.fillStyle = "#ffffff";
  ctx.fill(inner);
  for (const [colour, path] of byColour) {
    ctx.fillStyle = colour;
    ctx.fill(path);
  }

  // Bitmaps: badges and names, in device pixels.
  labels.frame();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const blit = (canvas: HTMLCanvasElement, mx: number, my: number, mw: number, mh: number) => {
    ctx.drawImage(canvas, (mx * cam.s + cam.tx) * dpr, (my * cam.s + cam.ty) * dpr, mw * k, mh * k);
  };
  for (const b of scene.badges) {
    const x = p[b.node * 2] + b.dx;
    const y = p[b.node * 2 + 1] + b.dy;
    if (!inView(x, y)) continue;
    const sp = labels.badge(lineById.get(b.line)!, k);
    blit(sp.canvas, x + sp.x, y + sp.y, sp.w, sp.h);
  }
  const plainVisible = NAME.plain.size * cam.s >= MIN_NAME_PX;
  for (const m of scene.marks) {
    if (!m.transfer && !plainVisible) continue;
    if (m.transfer && NAME.transfer.size * cam.s < MIN_NAME_PX) continue;
    const x = p[m.node * 2];
    const y = p[m.node * 2 + 1];
    if (!inView(x, y)) continue;
    const sp = labels.name(m, k);
    if (!sp) continue;
    blit(sp.canvas, x + sp.x, y + sp.y, sp.w, sp.h);
  }
  return labels.missing > 0;
}
