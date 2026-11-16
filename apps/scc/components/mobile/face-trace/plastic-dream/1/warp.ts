// Pure warp math, mirrored line for line by the fragment shader in
// `renderer.ts`. Points are photo pixels over photo height: x in [0, aspect],
// y in [0, 1], y down. Every kernel is a bijection of the plane, and kernels
// compose in sequence, so no amount, however large, can fold the photo.

export type Vec = { x: number; y: number };

/** Unit face axes in photo space: x along the eye line, y toward the chin. */
export type Frame = { xx: number; xy: number; yx: number; yy: number };

export const MAGNIFY = 0;
export const PUSH = 1;
export const MAX_KERNELS = 64;

// Inside this share of its radius a magnify kernel scales uniformly; between
// here and the rim the scale eases back to 1, compressing what surrounds it.
export const PLATEAU = 0.4;

export type Kernel = {
  kind: typeof MAGNIFY | typeof PUSH;
  /** Magnify: its centre. Push: where the pushed point lands. */
  cx: number;
  cy: number;
  /** Radii along the face axes. */
  rx: number;
  ry: number;
  /** Magnify: 1 / scale along each face axis. Push: the displacement. */
  a: number;
  b: number;
};

export type KernelSpec =
  | { kind: typeof MAGNIFY; anchor: Vec; rx: number; ry: number; sx: number; sy: number }
  | { kind: typeof PUSH; anchor: Vec; rx: number; ry: number; vx: number; vy: number };

function smoothstep(low: number, high: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

/** Output point → the point it shows, for one kernel. */
export function inverseKernel(kernel: Kernel, frame: Frame, point: Vec): Vec {
  const dx = point.x - kernel.cx;
  const dy = point.y - kernel.cy;
  const qx = dx * frame.xx + dy * frame.xy;
  const qy = dx * frame.yx + dy * frame.yy;
  const t = Math.hypot(qx / kernel.rx, qy / kernel.ry);
  if (kernel.kind === PUSH) {
    const weight = Math.exp(-t * t);
    return { x: point.x - kernel.a * weight, y: point.y - kernel.b * weight };
  }
  if (t >= 1) return point;
  const ease = smoothstep(PLATEAU, 1, t);
  const sx = qx * (kernel.a + (1 - kernel.a) * ease);
  const sy = qy * (kernel.b + (1 - kernel.b) * ease);
  return {
    x: kernel.cx + frame.xx * sx + frame.yx * sy,
    y: kernel.cy + frame.xy * sx + frame.yy * sy,
  };
}

/** A point of the kernel's input → where the kernel moves it. */
export function forwardKernel(kernel: Kernel, frame: Frame, point: Vec): Vec {
  if (kernel.kind === PUSH) {
    // point = out - v·w(out): a contraction, because the radii are kept wide
    // enough for |v·∇w| < 1 (see `resolveKernels`).
    let x = point.x;
    let y = point.y;
    for (let step = 0; step < 48; step += 1) {
      const dx = x - kernel.cx;
      const dy = y - kernel.cy;
      const qx = (dx * frame.xx + dy * frame.xy) / kernel.rx;
      const qy = (dx * frame.yx + dy * frame.yy) / kernel.ry;
      const weight = Math.exp(-(qx * qx + qy * qy));
      x = point.x + kernel.a * weight;
      y = point.y + kernel.b * weight;
    }
    return { x, y };
  }
  const dx = point.x - kernel.cx;
  const dy = point.y - kernel.cy;
  const sx = dx * frame.xx + dy * frame.xy;
  const sy = dx * frame.yx + dy * frame.yy;
  if (Math.hypot(sx / kernel.rx, sy / kernel.ry) >= 1) return point;
  // The output radius t solves |s / f(t)| = t; the left side only falls as t
  // grows, so the root is unique.
  let low = 0;
  let high = 1;
  for (let step = 0; step < 30; step += 1) {
    const t = (low + high) / 2;
    const ease = smoothstep(PLATEAU, 1, t);
    const qx = sx / (kernel.a + (1 - kernel.a) * ease);
    const qy = sy / (kernel.b + (1 - kernel.b) * ease);
    if (Math.hypot(qx / kernel.rx, qy / kernel.ry) > t) low = t;
    else high = t;
  }
  const ease = smoothstep(PLATEAU, 1, (low + high) / 2);
  const qx = sx / (kernel.a + (1 - kernel.a) * ease);
  const qy = sy / (kernel.b + (1 - kernel.b) * ease);
  return {
    x: kernel.cx + frame.xx * qx + frame.yx * qy,
    y: kernel.cy + frame.xy * qx + frame.yy * qy,
  };
}

/** Screen point → photo point, through every kernel, last applied first. */
export function inverseWarp(kernels: readonly Kernel[], frame: Frame, point: Vec): Vec {
  let current = point;
  for (let index = kernels.length - 1; index >= 0; index -= 1) {
    current = inverseKernel(kernels[index], frame, current);
  }
  return current;
}

/**
 * Places each spec in the space the earlier kernels have already deformed, so
 * an operation stays on its own feature however far its neighbours have grown.
 */
export function resolveKernels(specs: readonly KernelSpec[], frame: Frame): Kernel[] {
  const kernels: Kernel[] = [];
  for (const spec of specs) {
    if (kernels.length >= MAX_KERNELS) break;
    let centre = spec.anchor;
    for (const kernel of kernels) centre = forwardKernel(kernel, frame, centre);
    if (spec.kind === MAGNIFY) {
      kernels.push({
        kind: MAGNIFY,
        cx: centre.x,
        cy: centre.y,
        rx: spec.rx * spec.sx,
        ry: spec.ry * spec.sy,
        a: 1 / spec.sx,
        b: 1 / spec.sy,
      });
      continue;
    }
    // A push stays one-to-one while |v / r| stays under 1.16; widening each
    // radius with its own share of the push keeps it at 0.8 at most.
    const along = Math.abs(spec.vx * frame.xx + spec.vy * frame.xy);
    const across = Math.abs(spec.vx * frame.yx + spec.vy * frame.yy);
    kernels.push({
      kind: PUSH,
      cx: centre.x + spec.vx,
      cy: centre.y + spec.vy,
      rx: Math.max(spec.rx, along * 1.77),
      ry: Math.max(spec.ry, across * 1.77),
      a: spec.vx,
      b: spec.vy,
    });
  }
  return kernels;
}
