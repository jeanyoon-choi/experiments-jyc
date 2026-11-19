// Browser-side geometry for a raft of soap bubbles (from 7-glsl-3's copy).
// Springs along links (direction ignored), a short-range repulsion, a pull
// toward the centre, and bubble contact (see below). Neighbours are found by
// sweep and prune along x (bubbles of very different sizes mix freely), so a
// step stays cheap at a thousand pages. Position never feeds back into the
// model.
//
// A step works on flat arrays (positions, velocities, forces) read from the
// bodies at its start and written back at its end; the arithmetic and the
// order pairs are visited in are exactly those of the per-object version.

export type Body = { x: number; y: number; vx: number; vy: number };
export type Frame = { width: number; height: number };
export type Pair = { readonly from: number; readonly to: number };

/** Strong enough that the bubbles gather into one raft and press together. */
const GRAVITY = 0.6;
const REPULSION = 0.35;
const SPRING = 0.4;
/** Bubbles within this gap (px) of touching are drawn together, with this stiffness (1/s²), once per step. */
const CAPILLARY_REACH = 10;
const CAPILLARY = 2;
const CONTACT_PASSES = 6;

/** Where each group's raft gathers, as shares of the field, by group count. */
const GROUP_LAYOUTS: readonly (readonly (readonly [number, number])[])[] = [
  [[0.5, 0.5]],
  [[0.28, 0.5], [0.72, 0.5]],
  [[0.25, 0.34], [0.75, 0.34], [0.5, 0.72]],
  [[0.27, 0.3], [0.73, 0.3], [0.27, 0.72], [0.73, 0.72]],
];

/** Bodies kept sorted along x between steps (nearly sorted, so an insertion sort is cheap). */
let order: Int32Array = new Int32Array(0);
// Scratch, grown as needed and reused between steps.
let capacity = 0;
let xs = new Float64Array(0);
let ys = new Float64Array(0);
let vxs = new Float64Array(0);
let vys = new Float64Array(0);
let forceX = new Float64Array(0);
let forceY = new Float64Array(0);
let reaches = new Float64Array(0);
let lefts = new Float64Array(0);

function reserve(count: number) {
  if (count <= capacity) return;
  capacity = Math.max(count, capacity * 2, 64);
  xs = new Float64Array(capacity);
  ys = new Float64Array(capacity);
  vxs = new Float64Array(capacity);
  vys = new Float64Array(capacity);
  forceX = new Float64Array(capacity);
  forceY = new Float64Array(capacity);
  reaches = new Float64Array(capacity);
  lefts = new Float64Array(capacity);
}

export function idealLength(frame: Frame, count: number) {
  // 7-glsl: .42 of the area; far less here, so repulsion is short-ranged and
  // the bubbles pack into foam instead of spreading apart.
  return Math.sqrt((frame.width * frame.height * 0.12) / Math.max(1, count));
}

export function bodyAt(frame: Frame, random: () => number): Body {
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * Math.min(frame.width, frame.height) * 0.3;
  return { x: frame.width / 2 + Math.cos(angle) * distance, y: frame.height / 2 + Math.sin(angle) * distance, vx: 0, vy: 0 };
}

/**
 * Where each group's raft gathers, as shares of the field: one centre, two
 * side by side, three in a triangle, four in a square (transposed on a
 * portrait field). Writes x, y pairs into `out`.
 */
export function groupAnchors(groups: number, frame: Frame, out: Float64Array) {
  const points = GROUP_LAYOUTS[Math.max(1, Math.min(GROUP_LAYOUTS.length, groups)) - 1]!;
  const portrait = frame.height > frame.width;
  for (let group = 0; group < points.length; group += 1) {
    const [a, b] = points[group]!;
    out[group * 2] = (portrait ? b : a) * frame.width;
    out[group * 2 + 1] = (portrait ? a : b) * frame.height;
  }
}

export function rescaleBodies(bodies: Body[], previous: Frame, next: Frame) {
  if (previous.width <= 0 || previous.height <= 0) return;
  const scale = Math.min(next.width / previous.width, next.height / previous.height);
  for (const body of bodies) {
    body.x = next.width / 2 + (body.x - previous.width / 2) * scale;
    body.y = next.height / 2 + (body.y - previous.height / 2) * scale;
  }
}

/** Sorts `order` by each disc's left edge (insertion sort: the order barely changes between calls). */
function sortByLeft(count: number, radii: ArrayLike<number>) {
  if (order.length !== count) order = Int32Array.from({ length: count }, (_, index) => index);
  for (let index = 0; index < count; index += 1) lefts[index] = xs[index]! - radii[index]!;
  for (let at = 1; at < count; at += 1) {
    const index = order[at]!;
    const key = lefts[index]!;
    let to = at - 1;
    while (to >= 0 && lefts[order[to]!]! > key) {
      order[to + 1] = order[to]!;
      to -= 1;
    }
    order[to + 1] = index;
  }
}

/** The rest distance of two touching bubbles (see the contact passes below). */
function restDistance(ra: number, rb: number) {
  return Math.max(Math.sqrt(ra * ra + rb * rb - ra * rb), Math.max(ra, rb) + 0.25 * Math.min(ra, rb));
}

/**
 * One relaxation step; `radii` are the drawn disc radii. `presence` (0–1 per
 * body, default 1) scales a body's reach: two bodies repel by the product of
 * their presences, collide with a gap of 1 + 3 × the smaller presence, and a
 * link's rest length shrinks with the mean presence of its ends.
 */
export function relaxBodies(
  bodies: Body[],
  links: readonly Pair[],
  radii: ArrayLike<number>,
  frame: Frame,
  delta: number,
  presence?: ArrayLike<number>,
  /** Per body, the x, y its gravity pulls toward (the field's centre when absent). */
  anchors?: ArrayLike<number>,
) {
  const count = bodies.length;
  reserve(count);
  const length = idealLength(frame, count);
  const softening = (length * 0.25) ** 2;
  const repulsion = length * length * REPULSION;
  // Pairs whose discs, widened by the capillary reach, overlap along both
  // axes are exactly the pairs the contacts act on.
  const margin = CAPILLARY_REACH;
  for (let index = 0; index < count; index += 1) {
    const body = bodies[index]!;
    xs[index] = body.x;
    ys[index] = body.y;
    vxs[index] = body.vx;
    vys[index] = body.vy;
    reaches[index] = presence ? presence[index]! : 1;
    forceX[index] = 0;
    forceY[index] = 0;
  }

  // Repulsion between every pair.
  for (let first = 0; first < count; first += 1) {
    const ax = xs[first]!;
    const ay = ys[first]!;
    const scaled = repulsion * reaches[first]!;
    let fx = 0;
    let fy = 0;
    for (let second = first + 1; second < count; second += 1) {
      const dx = ax - xs[second]!;
      const dy = ay - ys[second]!;
      const push = (scaled * reaches[second]!) / (dx * dx + dy * dy + softening);
      fx += dx * push;
      fy += dy * push;
      forceX[second]! -= dx * push;
      forceY[second]! -= dy * push;
    }
    forceX[first]! += fx;
    forceY[first]! += fy;
  }

  // Capillary attraction: bubbles just short of touching are drawn
  // together by a gentle force, once per step. (Applied as a position
  // correction in every contact pass, it summed over a crowd's many
  // neighbours and collapsed small bubbles onto a single point.)
  sortByLeft(count, radii);
  for (let at = 0; at < count; at += 1) {
    const first = order[at]!;
    const ax = xs[first]!;
    const ay = ys[first]!;
    const ra = radii[first]!;
    const right = ax + ra + margin;
    for (let after = at + 1; after < count; after += 1) {
      const second = order[after]!;
      const rb = radii[second]!;
      const bx = xs[second]!;
      if (bx - rb > right) break;
      const by = ys[second]!;
      if (Math.abs(by - ay) > ra + rb + margin) continue;
      const dx = bx - ax;
      const dy = by - ay;
      const distance = Math.hypot(dx, dy);
      const gap = distance - restDistance(ra, rb);
      if (gap <= 0 || distance > ra + rb + CAPILLARY_REACH) continue;
      const pull = (CAPILLARY * gap) / distance;
      forceX[first]! += dx * pull;
      forceY[first]! += dy * pull;
      forceX[second]! -= dx * pull;
      forceY[second]! -= dy * pull;
    }
  }

  for (const link of links) {
    const from = link.from;
    const to = link.to;
    const dx = xs[to]! - xs[from]!;
    const dy = ys[to]! - ys[from]!;
    const distance = Math.max(1e-3, Math.hypot(dx, dy));
    // Rest length includes both discs, so big pages keep their neighbours at the rim.
    const rest = length * 0.6 * (0.35 + 0.65 * (reaches[from]! + reaches[to]!) / 2) + radii[from]! + radii[to]!;
    const pull = ((distance - rest) / distance) * SPRING;
    forceX[from]! += dx * pull;
    forceY[from]! += dy * pull;
    forceX[to]! -= dx * pull;
    forceY[to]! -= dy * pull;
  }

  const short = Math.min(frame.width, frame.height);
  const gravityX = GRAVITY * (short / frame.width);
  const gravityY = GRAVITY * (short / frame.height);
  const step = Math.min(delta, 1 / 30);
  const damping = Math.exp(-6 * step);
  const maxSpeed = length * 6;
  const centreX = frame.width / 2;
  const centreY = frame.height / 2;
  for (let index = 0; index < count; index += 1) {
    const x = xs[index]!;
    const y = ys[index]!;
    const anchorX = anchors ? anchors[index * 2]! : centreX;
    const anchorY = anchors ? anchors[index * 2 + 1]! : centreY;
    let vx = (vxs[index]! + (forceX[index]! - (x - anchorX) * gravityX) * step) * damping;
    let vy = (vys[index]! + (forceY[index]! - (y - anchorY) * gravityY) * step) * damping;
    const speed = Math.hypot(vx, vy);
    if (speed > maxSpeed) {
      vx *= maxSpeed / speed;
      vy *= maxSpeed / speed;
    }
    vxs[index] = vx;
    vys[index] = vy;
    xs[index] = x + vx * step;
    ys[index] = y + vy * step;
  }

  // Contact, as floating soap bubbles: two bubbles of radii r₁, r₂ rest at
  // √(r₁² + r₂² − r₁r₂), where their films meet the shared wall at 120°
  // (at least the larger radius plus a quarter of the smaller, so a small
  // bubble always shows on a large one's surface instead of sinking in);
  // closer, they are pushed apart (capillary attraction, above, draws those
  // a little farther apart together). Resolved a few times per step.
  // The last pass settles only small bubbles against much larger ones, so
  // none is left inside a large bubble at the end of the step.
  // Positions move during a pass, so every read below is of the live value.
  for (let pass = 0; pass <= CONTACT_PASSES; pass += 1) {
    const settling = pass === CONTACT_PASSES;
    sortByLeft(count, radii);
    for (let at = 0; at < count; at += 1) {
      const first = order[at]!;
      const ra = radii[first]!;
      const right = xs[first]! + ra + margin;
      for (let after = at + 1; after < count; after += 1) {
        const second = order[after]!;
        const rb = radii[second]!;
        if (xs[second]! - rb > right) break;
        if (Math.abs(ys[second]! - ys[first]!) > ra + rb + margin) continue;
        let dx = xs[second]! - xs[first]!;
        let dy = ys[second]! - ys[first]!;
        // Two bubbles on the very same spot part along a direction of their own
        // (otherwise there is no direction to push them apart and they stay
        // stacked for good).
        if (Math.abs(dx) + Math.abs(dy) < 1e-3) {
          const angle = (first * 2.399963 + second * 0.618034 * Math.PI) % (Math.PI * 2);
          dx = Math.cos(angle) * 1e-2;
          dy = Math.sin(angle) * 1e-2;
        }
        const reach = ra + rb + CAPILLARY_REACH;
        if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
        const distance = Math.hypot(dx, dy);
        const overlap = restDistance(ra, rb) - distance;
        if (overlap <= 0) continue;
        // Bubbles of like size share the correction; against a much larger
        // one (3× or more) a small bubble takes all of it, so a crowd of small
        // bubbles can never push one into a large bubble.
        const ratio = ra / rb;
        if (settling && ratio < 3 && ratio > 1 / 3) continue;
        const share = ratio >= 3 ? 0 : ratio <= 1 / 3 ? 1 : 0.5;
        const shiftX = (dx / distance) * overlap;
        const shiftY = (dy / distance) * overlap;
        xs[first]! -= shiftX * share;
        ys[first]! -= shiftY * share;
        xs[second]! += shiftX * (1 - share);
        ys[second]! += shiftY * (1 - share);
        // Pressed together, they stop closing in (an inelastic contact): only
        // the part of their velocities that drives one into the other is taken
        // away, so nothing is set moving and gravity and springs cannot keep
        // pushing a bubble further into another.
        const nx = dx / distance;
        const ny = dy / distance;
        const closing = (vxs[second]! - vxs[first]!) * nx + (vys[second]! - vys[first]!) * ny;
        if (closing < 0) {
          vxs[first]! += 0.5 * closing * nx;
          vys[first]! += 0.5 * closing * ny;
          vxs[second]! -= 0.5 * closing * nx;
          vys[second]! -= 0.5 * closing * ny;
        }
      }
    }
  }

  for (let index = 0; index < count; index += 1) {
    const body = bodies[index]!;
    const r = radii[index]!;
    body.x = Math.min(frame.width - r - 2, Math.max(r + 2, xs[index]!));
    body.y = Math.min(frame.height - r - 2, Math.max(r + 2, ys[index]!));
    body.vx = vxs[index]!;
    body.vy = vys[index]!;
  }
}
