// The nostrils. MediaPipe's face mesh marks the nose but not the openings, so
// the landmarks only say where to look: inside the box they give, each
// nostril is the dark patch that grows from the darkest spot on its side.
import type { Point } from "./mouth";

export const NOSE_WIDTH = 64;
export const NOSE_HEIGHT = 40;
const SIZE = NOSE_WIDTH * NOSE_HEIGHT;

// Nose tip, the base of the nose between the nostrils, and the two wings.
const TIP = 4;
const BASE = 2;
const WING_A = 129;
const WING_B = 358;

// A nostril is at least this much darker (0–255) than the skin around it.
const CONTRAST = 40;
const FOLLOW = 0.6;
// The flag's place: a measured box this far (in mask cells) from the held one
// is the nostril itself having changed and is taken at once; anything nearer
// is measuring error and only nudges the running mean.
const CHANGED = 7;
const DRIFT = 0.06;

/**
 * A nostril's box in the camera frame, 0–1 both ways. `box` is the same box
 * within the nose's own box (centre x, y, half width, half height), which is
 * what is steadied: there the nostril stays put while the head moves.
 */
export type Nostril = { found: boolean; u: number; v: number; halfU: number; halfV: number; box: [number, number, number, number]; held: boolean };

export type Nose = {
  /** NOSE_WIDTH × NOSE_HEIGHT, 0–255: how much of each cell is nostril. */
  mask: Uint8Array;
  /** The part of the camera frame the mask covers, 0–1. */
  rect: { x: number; y: number; width: number; height: number };
  nostrils: [Nostril, Nostril];
  /** The two wings, camera frame 0–1: x, y, x, y. */
  wings: [number, number, number, number];
  visible: boolean;
};

export function createNose(): Nose {
  const nostril = (): Nostril => ({ found: false, u: 0, v: 0, halfU: 0, halfV: 0, box: [0, 0, 0, 0], held: false });
  return {
    mask: new Uint8Array(SIZE),
    rect: { x: 0, y: 0, width: 1, height: 1 },
    nostrils: [nostril(), nostril()],
    wings: [0, 0, 1, 0],
    visible: false,
  };
}

const raw = new Float32Array(SIZE);
const light = new Float32Array(SIZE);
const level = new Float32Array(SIZE);
const filled = new Uint8Array(SIZE);
const stack = new Int32Array(SIZE);
const histogram = new Uint32Array(256);

/** Fades the mask out when no face is there to measure. */
export function fadeNose(nose: Nose) {
  nose.visible = false;
  nose.nostrils[0].found = false;
  nose.nostrils[1].found = false;
}

/**
 * Finds the nostrils in `frame` (the picture the landmarks were read from)
 * and writes their mask and boxes into `nose`. `scratch` is a
 * NOSE_WIDTH × NOSE_HEIGHT 2D context.
 */
export function measureNose(
  points: readonly Point[],
  frame: CanvasImageSource,
  frameWidth: number,
  frameHeight: number,
  scratch: CanvasRenderingContext2D,
  nose: Nose,
) {
  const tip = points[TIP];
  const base = points[BASE];
  const wingA = points[WING_A];
  const wingB = points[WING_B];
  if (!tip || !base || !wingA || !wingB) return false;
  const span = Math.abs(wingB.x - wingA.x);
  if (span * frameWidth < 12) return false;
  const tall = span * frameWidth / frameHeight;
  const left = Math.max(0, Math.min(wingA.x, wingB.x) - span * 0.08);
  const right = Math.min(1, Math.max(wingA.x, wingB.x) + span * 0.08);
  const top = Math.max(0, Math.min(tip.y, base.y) - tall * 0.1);
  const bottom = Math.min(1, Math.max(tip.y, base.y) + tall * 0.12);
  if (right - left <= 0 || bottom - top <= 0) return false;

  scratch.drawImage(
    frame,
    left * frameWidth, top * frameHeight, (right - left) * frameWidth, (bottom - top) * frameHeight,
    0, 0, NOSE_WIDTH, NOSE_HEIGHT,
  );
  const pixels = scratch.getImageData(0, 0, NOSE_WIDTH, NOSE_HEIGHT).data;
  for (let index = 0; index < SIZE; index += 1) {
    raw[index] = pixels[index * 4] * 0.299 + pixels[index * 4 + 1] * 0.587 + pixels[index * 4 + 2] * 0.114;
  }
  // A 3×3 mean, so one dark pixel of noise is not taken for a nostril.
  histogram.fill(0);
  for (let y = 0; y < NOSE_HEIGHT; y += 1) {
    for (let x = 0; x < NOSE_WIDTH; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const row = y + dy;
        if (row < 0 || row >= NOSE_HEIGHT) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const column = x + dx;
          if (column < 0 || column >= NOSE_WIDTH) continue;
          sum += raw[row * NOSE_WIDTH + column];
          count += 1;
        }
      }
      const value = sum / count;
      light[y * NOSE_WIDTH + x] = value;
      histogram[Math.min(255, Math.round(value))] += 1;
    }
  }
  let skin = 0;
  for (let seen = 0; skin < 255; skin += 1) {
    seen += histogram[skin];
    if (seen >= SIZE / 2) break;
  }

  filled.fill(0);
  const split = Math.max(4, Math.min(NOSE_WIDTH - 4, Math.round((base.x - left) / (right - left) * NOSE_WIDTH)));
  for (let side = 0; side < 2; side += 1) {
    const from = side === 0 ? 0 : split;
    const to = side === 0 ? split : NOSE_WIDTH;
    const nostril = nose.nostrils[side];
    let seed = -1;
    let darkest = Infinity;
    for (let y = 1; y < NOSE_HEIGHT - 1; y += 1) {
      for (let x = from + 1; x < to - 1; x += 1) {
        const value = light[y * NOSE_WIDTH + x];
        if (value < darkest) {
          darkest = value;
          seed = y * NOSE_WIDTH + x;
        }
      }
    }
    nostril.found = false;
    if (seed < 0 || skin - darkest < CONTRAST) continue;
    const limit = darkest + (skin - darkest) * 0.5;
    let top2 = 0;
    stack[top2++] = seed;
    filled[seed] = side + 1;
    let count = 0;
    let minX = NOSE_WIDTH;
    let maxX = 0;
    let minY = NOSE_HEIGHT;
    let maxY = 0;
    let edge = false;
    while (top2 > 0) {
      const cell = stack[--top2];
      const x = cell % NOSE_WIDTH;
      const y = (cell - x) / NOSE_WIDTH;
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      if (x === 0 || x === NOSE_WIDTH - 1 || y === 0 || y === NOSE_HEIGHT - 1) edge = true;
      const visit = (next: number, inside: boolean) => {
        if (inside && filled[next] === 0 && light[next] < limit) {
          filled[next] = side + 1;
          stack[top2++] = next;
        }
      };
      visit(cell - 1, x > from);
      visit(cell + 1, x < to - 1);
      visit(cell - NOSE_WIDTH, y > 0);
      visit(cell + NOSE_WIDTH, y < NOSE_HEIGHT - 1);
    }
    // A patch that runs off the box or fills its side is shadow, not a nostril.
    if (count < 3 || edge || count > (to - from) * NOSE_HEIGHT * 0.35) {
      for (let index = 0; index < SIZE; index += 1) if (filled[index] === side + 1) filled[index] = 0;
      continue;
    }
    const box = nostril.box;
    const measured = [(minX + maxX + 1) / 2, (minY + maxY + 1) / 2, (maxX - minX + 1) / 2, (maxY - minY + 1) / 2];
    for (let index = 0; index < 4; index += 1) {
      const off = Math.abs(measured[index] - box[index]) / CHANGED;
      const follow = nostril.held ? Math.min(1, DRIFT + off * off) : 1;
      box[index] += (measured[index] - box[index]) * follow;
    }
    nostril.held = true;
    nostril.found = true;
  }

  // Each cell eases toward what was found, then a 3×3 mean softens the edge.
  for (let index = 0; index < SIZE; index += 1) {
    level[index] += ((filled[index] ? 255 : 0) - level[index]) * FOLLOW;
  }
  for (let y = 0; y < NOSE_HEIGHT; y += 1) {
    for (let x = 0; x < NOSE_WIDTH; x += 1) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const row = Math.max(0, Math.min(NOSE_HEIGHT - 1, y + dy));
        for (let dx = -1; dx <= 1; dx += 1) {
          sum += level[row * NOSE_WIDTH + Math.max(0, Math.min(NOSE_WIDTH - 1, x + dx))];
        }
      }
      nose.mask[y * NOSE_WIDTH + x] = Math.round(sum / 9);
    }
  }
  // The steadied boxes ride on this frame's nose, so they keep up with the head.
  for (const nostril of nose.nostrils) {
    if (!nostril.held) continue;
    nostril.u = left + nostril.box[0] / NOSE_WIDTH * (right - left);
    nostril.v = top + nostril.box[1] / NOSE_HEIGHT * (bottom - top);
    nostril.halfU = nostril.box[2] / NOSE_WIDTH * (right - left);
    nostril.halfV = nostril.box[3] / NOSE_HEIGHT * (bottom - top);
  }
  nose.rect.x = left;
  nose.rect.y = top;
  nose.rect.width = right - left;
  nose.rect.height = bottom - top;
  nose.wings[0] = wingA.x;
  nose.wings[1] = wingA.y;
  nose.wings[2] = wingB.x;
  nose.wings[3] = wingB.y;
  nose.visible = nose.nostrils[0].found || nose.nostrils[1].found;
  return true;
}
