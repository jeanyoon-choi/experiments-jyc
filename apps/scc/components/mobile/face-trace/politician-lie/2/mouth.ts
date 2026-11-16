// The opening between the lips, measured from MediaPipe Face Landmarker's
// inner-lip ring, in mirrored canvas pixels.

export type Point = { x: number; y: number };

// Inner-lip ring as one closed loop: along the upper lip from the image-left
// corner (78) to the right corner (308), then back along the lower lip.
export const INNER_LIPS = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

/** Outline points the renderer receives: every ring point plus one between. */
export const OUTLINE_POINTS = INNER_LIPS.length * 2;

export type Cover = { offsetX: number; offsetY: number; width: number; height: number };

/** The part of the camera frame on screen: its centre in frame coordinates and its scale. */
export type View = { u: number; v: number; scale: number };

export function createView(): View {
  return { u: 0.5, v: 0.5, scale: 0 };
}

// The mouth's drawn width as a share of the canvas's short side: the lips fill
// the screen and little else of the face fits beside them.
const MOUTH_FILL = 0.72;
// A mouth is about this wide next to the distance between the outer eye
// corners, which stays the same whatever the lips are doing.
const MOUTH_PER_EYES = 0.55;
const MAX_ZOOM = 8;
const MOVE_MS = 120;
const GROW_MS = 260;

/**
 * Where the mirrored camera frame lands on the canvas when it is enlarged
 * around the mouth. `view` eases toward the mouth over `elapsed` ms; without
 * a face it stays where it was, and before any face it is the plain cover.
 */
export function zoomFrame(
  view: View,
  points: readonly Point[] | null,
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number,
  elapsed: number,
): Cover {
  const base = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
  view.scale = Math.max(view.scale, base);
  const upper = points?.[13];
  const lower = points?.[14];
  const leftEye = points?.[33];
  const rightEye = points?.[263];
  if (upper && lower && leftEye && rightEye) {
    const eyes = Math.hypot((rightEye.x - leftEye.x) * videoWidth, (rightEye.y - leftEye.y) * videoHeight);
    if (eyes > 1) {
      const wanted = MOUTH_FILL * Math.min(canvasWidth, canvasHeight) / (eyes * MOUTH_PER_EYES);
      const aim = Math.min(base * MAX_ZOOM, Math.max(base, wanted));
      const move = 1 - Math.exp(-elapsed / MOVE_MS);
      view.u += ((upper.x + lower.x) / 2 - view.u) * move;
      view.v += ((upper.y + lower.y) / 2 - view.v) * move;
      view.scale += (aim - view.scale) * (1 - Math.exp(-elapsed / GROW_MS));
    }
  }
  const width = videoWidth * view.scale;
  const height = videoHeight * view.scale;
  // The mouth sits at the canvas centre unless that would show past the frame's edge.
  const offsetX = Math.min(0, Math.max(canvasWidth - width, canvasWidth / 2 - (1 - view.u) * width));
  const offsetY = Math.min(0, Math.max(canvasHeight - height, canvasHeight / 2 - view.v * height));
  return { offsetX, offsetY, width, height };
}

// Inner-lip gap over mouth width, the measure face-trace/1 uses: independent
// of distance and face size. Closed lips sit near 0.02, speech near 0.15.
export function openingRatio(points: readonly Point[], aspect: number) {
  const upper = points[13];
  const lower = points[14];
  const left = points[61];
  const right = points[291];
  if (!upper || !lower || !left || !right) return 0;
  const gap = Math.hypot((lower.x - upper.x) * aspect, lower.y - upper.y);
  const span = Math.hypot((right.x - left.x) * aspect, right.y - left.y);
  return span > 1e-6 ? gap / span : 0;
}

export type MouthShape = {
  /** Closed outline, x then y, OUTLINE_POINTS pairs, canvas pixels (y down). */
  outline: Float32Array;
  centerX: number;
  centerY: number;
  /** Unit vector from the screen-left mouth corner to the right one. */
  axisX: number;
  axisY: number;
  /** Half extents along the axis and across it. */
  halfWidth: number;
  halfHeight: number;
};

export function createMouthShape(): MouthShape {
  return { outline: new Float32Array(OUTLINE_POINTS * 2), centerX: 0, centerY: 0, axisX: 1, axisY: 0, halfWidth: 0, halfHeight: 0 };
}

const ring = new Float32Array(INNER_LIPS.length * 2);

export type MouthMemory = { ring: Float32Array; primed: boolean };

export function createMouthMemory(): MouthMemory {
  return { ring: new Float32Array(INNER_LIPS.length * 2), primed: false };
}

/**
 * Writes the mirrored, canvas-space opening into `shape`. `memory` holds the
 * last ring; still lips are steadied against landmark noise while moving lips
 * pass through unfiltered, so the outline never trails the mouth.
 */
export function measureMouth(
  points: readonly Point[],
  cover: Cover,
  memory: MouthMemory,
  shape: MouthShape,
) {
  const count = INNER_LIPS.length;
  for (let index = 0; index < count; index += 1) {
    const point = points[INNER_LIPS[index]];
    if (!point) return false;
    ring[index * 2] = cover.offsetX + (1 - point.x) * cover.width;
    ring[index * 2 + 1] = cover.offsetY + point.y * cover.height;
  }
  const span = Math.hypot(ring[20] - ring[0], ring[21] - ring[1]);
  if (span < 4) return false;
  if (memory.primed) {
    const previous = memory.ring;
    const still = span * 0.024;
    for (let index = 0; index < count; index += 1) {
      const x = index * 2;
      const y = x + 1;
      const follow = Math.min(1, 0.3 + Math.hypot(ring[x] - previous[x], ring[y] - previous[y]) / still);
      ring[x] = previous[x] + (ring[x] - previous[x]) * follow;
      ring[y] = previous[y] + (ring[y] - previous[y]) * follow;
    }
  }
  memory.ring.set(ring);
  memory.primed = true;

  // Each ring point, then the Catmull-Rom midpoint to the next: a smooth lip
  // line through the landmarks instead of a 20-sided polygon.
  const outline = shape.outline;
  for (let index = 0; index < count; index += 1) {
    const before = ((index + count - 1) % count) * 2;
    const here = index * 2;
    const next = ((index + 1) % count) * 2;
    const after = ((index + 2) % count) * 2;
    outline[index * 4] = ring[here];
    outline[index * 4 + 1] = ring[here + 1];
    outline[index * 4 + 2] = (-ring[before] + 9 * ring[here] + 9 * ring[next] - ring[after]) / 16;
    outline[index * 4 + 3] = (-ring[before + 1] + 9 * ring[here + 1] + 9 * ring[next + 1] - ring[after + 1]) / 16;
  }

  // Mirroring puts landmark 78 on the screen's right; the axis runs left to right.
  let axisX = ring[20] - ring[0];
  let axisY = ring[21] - ring[1];
  if (axisX < 0) {
    axisX = -axisX;
    axisY = -axisY;
  }
  axisX /= span;
  axisY /= span;
  let minAlong = Infinity;
  let maxAlong = -Infinity;
  let minAcross = Infinity;
  let maxAcross = -Infinity;
  for (let index = 0; index < OUTLINE_POINTS; index += 1) {
    const x = outline[index * 2];
    const y = outline[index * 2 + 1];
    const along = x * axisX + y * axisY;
    const across = -x * axisY + y * axisX;
    minAlong = Math.min(minAlong, along);
    maxAlong = Math.max(maxAlong, along);
    minAcross = Math.min(minAcross, across);
    maxAcross = Math.max(maxAcross, across);
  }
  const along = (minAlong + maxAlong) / 2;
  const across = (minAcross + maxAcross) / 2;
  shape.centerX = along * axisX - across * axisY;
  shape.centerY = along * axisY + across * axisX;
  shape.axisX = axisX;
  shape.axisY = axisY;
  shape.halfWidth = (maxAlong - minAlong) / 2;
  shape.halfHeight = (maxAcross - minAcross) / 2;
  return true;
}
