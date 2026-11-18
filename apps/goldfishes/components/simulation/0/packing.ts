// Where the bubbles sit, as the gallery's models had it: discs that push each other apart and lean toward the
// centre. It belongs to the model only because a bubble's neighbours are the ones it touches. Under a raft of its
// own (simulation/1 onward) the raft gives the neighbours and this file is not used.

import { FIELD, type Bubble, type World } from "./model.ts";

/** Each bubble's target radius from its heat. */
export function radii(world: World) {
  const { parameters: p, bubbles } = world;
  const total = p.area * Math.PI * FIELD * FIELD;
  if (p.ownSize >= 0.5) {
    // Area from the bubble's own heat alone: the scale is fixed at the start, from every bubble equally hot.
    const reference = Math.pow(world.startHeat, p.contrast);
    const floor = 0.08 * reference;
    const scale = total / (p.bubbles * (reference + floor));
    for (const bubble of bubbles) bubble.radius = Math.sqrt((scale * (Math.pow(Math.max(0, bubble.heat), p.contrast) + floor)) / Math.PI);
    return;
  }
  // M8.1 and before: shares of one fixed area, so one bubble growing shrinks the rest.
  let sum = 0;
  for (const bubble of bubbles) sum += Math.pow(Math.max(0, bubble.heat), p.contrast);
  const floor = (sum / bubbles.length) * 0.08 + 1e-6;
  const whole = sum + floor * bubbles.length;
  for (const bubble of bubbles) bubble.radius = Math.sqrt((total * (Math.pow(Math.max(0, bubble.heat), p.contrast) + floor)) / whole / Math.PI);
}

/** One pass: overlapping bubbles part, the smaller giving way by area; all lean toward the centre. */
export function relax(world: World) {
  const { bubbles } = world;
  for (const bubble of bubbles) {
    for (const other of bubbles) {
      if (other === bubble) continue;
      const dx = other.x - bubble.x;
      const dy = other.y - bubble.y;
      const distance = Math.hypot(dx, dy) || 1e-6;
      const reach = bubble.shown + other.shown;
      if (distance >= reach) continue;
      const share = (other.shown * other.shown) / (bubble.shown * bubble.shown + other.shown * other.shown);
      const push = (reach - distance) * 0.4 * share;
      bubble.x -= (dx / distance) * push;
      bubble.y -= (dy / distance) * push;
    }
  }
  const pull = world.parameters.trueContact >= 0.5 ? 0.004 : 0.012;
  for (const bubble of bubbles) {
    bubble.x += (0.5 - bubble.x) * pull;
    bubble.y += (0.5 - bubble.y) * pull;
  }
}

/** Who each bubble sees: the ones it touches, or (evenView) its `view` nearest by the gap between edges. */
export function neighbours(world: World) {
  const { parameters: p, bubbles } = world;
  if (p.evenView >= 0.5) {
    const gaps: [number, Bubble][] = [];
    for (const bubble of bubbles) {
      gaps.length = 0;
      for (const other of bubbles) if (other !== bubble) gaps.push([Math.hypot(other.x - bubble.x, other.y - bubble.y) - other.shown - bubble.shown, other]);
      gaps.sort((a, b) => a[0] - b[0]);
      bubble.neighbours = gaps.slice(0, p.view).map((entry) => entry[1]);
    }
    return;
  }
  const slack = p.trueContact >= 0.5 ? 1.02 : 1.15;
  const margin = p.trueContact >= 0.5 ? 0.002 : 0.005;
  for (const bubble of bubbles) bubble.neighbours = [];
  for (let a = 0; a < bubbles.length; a += 1) {
    const one = bubbles[a]!;
    for (let b = a + 1; b < bubbles.length; b += 1) {
      const other = bubbles[b]!;
      if (Math.hypot(other.x - one.x, other.y - one.y) >= (one.shown + other.shown) * slack + margin) continue;
      one.neighbours.push(other);
      other.neighbours.push(one);
    }
  }
}
