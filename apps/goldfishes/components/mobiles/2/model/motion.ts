// A group's motion: one pose eased into another between two moments. The
// vertex shader (gl/shaders.ts) evaluates the same curves on the GPU every
// frame; this copy evaluates them on the CPU only when a motion is
// interrupted, so the next one starts exactly where the last one was
// (nothing jumps). Keep the two in step: EASE ids and formulas are mirrored.

export const EASE = {
  linear: 0,
  /** Lands softly: transitions, banners leaving. */
  out: 1,
  /** Leaves and lands softly: the thumb's travel. */
  inOut: 2,
  /** Overshoots and settles: banners dropping, cards landing (iOS springs). */
  spring: 3,
  /** A flick: fast, then the long exponential coast of iOS scrolling. */
  flick: 4,
  /** Accelerates away: things thrown off the glass. */
  in: 5,
  /** A stiffer spring with less overshoot: app launches. */
  snap: 6,
} as const;

export type Ease = (typeof EASE)[keyof typeof EASE];

export type Pose = { x: number; y: number; sx: number; sy: number; rot: number; opacity: number };

export const REST: Pose = Object.freeze({ x: 0, y: 0, sx: 1, sy: 1, rot: 0, opacity: 1 });

export type Motion = {
  t0: number;
  t1: number;
  ease: Ease;
  from: Pose;
  to: Pose;
  /** Scale and rotation are about this point, in the group's own space. */
  ox: number;
  oy: number;
};

export function eased(ease: Ease, u: number) {
  const t = u <= 0 ? 0 : u >= 1 ? 1 : u;
  switch (ease) {
    case EASE.out:
      return 1 - (1 - t) ** 3;
    case EASE.inOut:
      return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    case EASE.spring:
      return t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(7.5 * t);
    case EASE.flick:
      return (1 - Math.exp(-5.5 * t)) / (1 - Math.exp(-5.5));
    case EASE.in:
      return t * t * t;
    case EASE.snap:
      return t >= 1 ? 1 : 1 - Math.exp(-8 * t) * Math.cos(5 * t);
    default:
      return t;
  }
}

export function poseAt(motion: Motion, time: number): Pose {
  const span = motion.t1 - motion.t0;
  const k = eased(motion.ease, span <= 0 ? 1 : (time - motion.t0) / span);
  const { from, to } = motion;
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    sx: from.sx + (to.sx - from.sx) * k,
    sy: from.sy + (to.sy - from.sy) * k,
    rot: from.rot + (to.rot - from.rot) * k,
    opacity: Math.min(1, Math.max(0, from.opacity + (to.opacity - from.opacity) * k)),
  };
}

/** A motion holding one pose. */
export function still(pose: Partial<Pose> = {}, ox = 0, oy = 0): Motion {
  const at = { ...REST, ...pose };
  return { t0: 0, t1: 0, ease: EASE.linear, from: at, to: at, ox, oy };
}

/** Applies a pose to a point of the group's space (as the shader does). */
export function applyPose(pose: Pose, ox: number, oy: number, x: number, y: number) {
  const dx = (x - ox) * pose.sx;
  const dy = (y - oy) * pose.sy;
  const c = Math.cos(pose.rot);
  const s = Math.sin(pose.rot);
  return { x: ox + c * dx - s * dy + pose.x, y: oy + s * dx + c * dy + pose.y };
}
