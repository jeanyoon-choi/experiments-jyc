// Where every face of the tree sits. Pure: no three.js, the same tree on every load.
// The tree is 1 tall: a short trunk, then tiers of boughs, each a cone skirt wider at its foot than the
// tier above is at its own, so the outline steps in as a fir's does. Faces lie on the skirts like
// shingles, row over row, close enough that no gap shows between them.

export type Leaf = {
  /** centre of the face */
  x: number;
  y: number;
  z: number;
  /** where round the trunk it sits, rad */
  azimuth: number;
  /** how far the surface it lies on leans in from upright, rad (0 = a wall, π/2 = a floor) */
  slope: number;
  /** its top tipped out of the tree, as a bough lifts at its tip, rad */
  lean: number;
  /** turned in its own plane, rad */
  roll: number;
  /** height of the face */
  size: number;
};

export const FACE_ASPECT = 520 / 628; // the cut-out's width over its height
export const TRUNK_TOP = 0.25;
export const TREE_TOP = 1;
export const TREE_RADIUS = 0.33;
const TIERS = 5;
const ROW_STEP = 0.55; // of a face's height, between rows up a skirt
const COLUMN_STEP = 0.5; // of a face's width, between neighbours in a row

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function plantTree(seed = 1225): Leaf[] {
  const random = mulberry32(seed);
  const leaves: Leaf[] = [];

  // one skirt: a cone frustum from (footRadius, footY) up to (headRadius, headY), shingled with faces
  const skirt = (footRadius: number, footY: number, headRadius: number, headY: number, size: number, hang: number) => {
    const rise = headY - footY;
    const run = footRadius - headRadius;
    const length = Math.hypot(rise, run);
    const slope = Math.atan2(run, rise);
    const rows = Math.max(1, Math.ceil(length / (size * ROW_STEP)));
    for (let row = 0; row <= rows; row += 1) {
      const f = row / rows;
      const radius = lerp(footRadius, headRadius, f);
      const y = lerp(footY, headY, f) - (row === 0 ? size * hang : 0);
      const count = Math.max(3, Math.ceil((2 * Math.PI * radius) / (size * FACE_ASPECT * COLUMN_STEP)));
      const turn = random() * Math.PI * 2;
      for (let i = 0; i < count; i += 1) {
        const azimuth = turn + ((i + (random() - 0.5) * 0.5) / count) * Math.PI * 2;
        // neighbours overlap by half: every other one stands a little proud, so a nose does not come through the next head
        const out = radius + random() * 0.004 + (i % 2) * size * 0.17;
        leaves.push({
          x: Math.cos(azimuth) * out,
          y: y + (random() - 0.5) * size * 0.12,
          z: Math.sin(azimuth) * out,
          azimuth,
          slope,
          lean: 0.28 + random() * 0.14,
          roll: (random() - 0.5) * 0.36,
          size: size * (0.86 + random() * 0.28),
        });
      }
    }
  };

  // the trunk: a narrow column of small heads, running on up inside the boughs to the top
  skirt(0.045, 0.035, 0.045, TREE_TOP - 0.04, 0.07, 0);

  // the boughs: lower tiers are taller and wider, and their faces larger
  const weights = Array.from({ length: TIERS }, (_, k) => TIERS - k + 2.5);
  const total = weights.reduce((sum, w) => sum + w, 0);
  const envelope = (y: number) => TREE_RADIUS * Math.pow(Math.max(0, (TREE_TOP - y) / (TREE_TOP - TRUNK_TOP)), 0.92);
  let foot = TRUNK_TOP;
  for (let k = 0; k < TIERS; k += 1) {
    const height = ((TREE_TOP - TRUNK_TOP) * weights[k]) / total;
    const next = foot + height;
    const last = k === TIERS - 1;
    // each tier runs on up inside the one above, so no hole opens where they meet
    const head = last ? TREE_TOP - 0.02 : next + height * 0.3;
    const size = lerp(0.118, 0.066, k / (TIERS - 1));
    skirt(envelope(foot) + 0.03, foot, last ? 0.012 : envelope(head) * 0.4, head, size, 0.1);
    foot = next;
  }
  return leaves;
}
