import { ATLAS_DPR, CAPSULE, GROUND, PROBE, RIVER, type Scene, type Sprite } from "./scene";

// One frame of the deformed map. Lines are one batched path per line (two
// strokes for hollow and dashed lines); offsets for lines running side by side
// follow the deformed centreline's normals; dots are one path per ring colour;
// every glyph and badge is a drawImage from an immutable atlas bitmap under
// the local Jacobian. Nothing is rasterised from text per frame.

type Source = CanvasImageSource;

function trace(path: Path2D, p: Float32Array, ids: number[], offset: number) {
  const count = ids.length;
  for (let j = 0; j < count; j += 1) {
    const i = ids[j] * 2;
    let x = p[i];
    let y = p[i + 1];
    if (offset !== 0) {
      // Normal from the neighbours (one-sided at the ends).
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

function sprite(ctx: CanvasRenderingContext2D, atlas: Source, p: Float32Array, s: Sprite, dpr: number, upright: boolean, width: number, height: number) {
  const cx = p[s.point * 2];
  const cy = p[s.point * 2 + 1];
  const w = s.sw / ATLAS_DPR;
  const h = s.sh / ATLAS_DPR;
  if (cx < -w || cy < -h || cx > width + w || cy > height + h) return;
  if (upright) {
    ctx.setTransform(dpr, 0, 0, dpr, dpr * cx, dpr * cy);
  } else {
    const a = (p[s.px * 2] - cx) / PROBE;
    const b = (p[s.px * 2 + 1] - cy) / PROBE;
    const c = (p[s.py * 2] - cx) / PROBE;
    const d = (p[s.py * 2 + 1] - cy) / PROBE;
    ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * d, dpr * cx, dpr * cy);
  }
  ctx.drawImage(atlas, s.sx, s.sy, s.sw, s.sh, -w / 2, -h / 2, w, h);
}

export function draw(ctx: CanvasRenderingContext2D, scene: Scene, atlas: Source, dpr: number) {
  const p = scene.points;
  const { width, height } = scene;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);

  // 한강.
  {
    const path = new Path2D();
    trace(path, p, scene.river.ids, 0);
    ctx.strokeStyle = RIVER;
    ctx.lineWidth = scene.river.width;
    ctx.stroke(path);
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

  // Ordinary stations: white dots, ringed on lighter lines.
  {
    const plain = new Path2D();
    const ringed = new Map<string, Path2D>();
    for (const dot of scene.dots) {
      const x = p[dot.point * 2];
      const y = p[dot.point * 2 + 1];
      const target = dot.ring ? (ringed.get(dot.ring) ?? ringed.set(dot.ring, new Path2D()).get(dot.ring)!) : plain;
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

  // Interchanges: traffic-light capsules, turned with the space they sit in.
  for (const c of scene.capsules) {
    const x = p[c.point * 2];
    const y = p[c.point * 2 + 1];
    const angle = Math.atan2(p[c.probe * 2 + 1] - y, p[c.probe * 2] - x);
    const span = (c.colours.length - 1) * c.step;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * x, dpr * y);
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

  for (const b of scene.badges) sprite(ctx, atlas, p, b, dpr, true, width, height);
  for (const g of scene.glyphs) sprite(ctx, atlas, p, g, dpr, false, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
