// The 졸라맨 of finger-network/3 (rest endpoints and joint construction copied from its rig), aged:
// a child is shorter with a larger head, an old body shrinks a little and stoops forward.

export type Point = { x: number; y: number };

export type Pose = {
  head: Point;
  neck: Point;
  shoulders: Point;
  pelvis: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftHand: Point;
  rightHand: Point;
  leftKnee: Point;
  rightKnee: Point;
  leftFoot: Point;
  rightFoot: Point;
  /** Head radius in rest-body units. */
  headRadius: number;
};

// Rest-body units: head at the origin, feet on y = 470.
export const bodyHeight = 470;
const headRadius = 24;
const rest = { hand: { x: 135, y: 250 }, foot: { x: 62, y: bodyHeight } };

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

function curve(points: readonly (readonly [number, number])[], x: number) {
  if (x <= points[0]![0]) return points[0]![1];
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index]!;
    const [x0, y0] = points[index - 1]!;
    if (x <= x1) return mix(y0, y1, (x - x0) / (x1 - x0));
  }
  return points[points.length - 1]![1];
}

// Height as a share of adult height.
const growth = [[0, 0.3], [1, 0.4], [3, 0.52], [6, 0.64], [10, 0.76], [14, 0.9], [18, 1], [60, 1], [80, 0.96], [100, 0.92]] as const;
// Head radius relative to the adult proportion.
const headGrowth = [[0, 2.2], [3, 1.8], [10, 1.35], [18, 1]] as const;
const stoopCurve = [[60, 0], [100, 1]] as const;

export const statureAt = (age: number) => curve(growth, age);

// `hold` replaces a hand (rest-body units) where it takes a spouse's hand.
export function poseAt(age: number, reach: number, hold?: { left?: Point; right?: Point }): Pose {
  const stoop = curve(stoopCurve, age);
  const head = { x: 70 * stoop, y: 34 * stoop };
  const leftHand = hold?.left ?? { x: -rest.hand.x * reach + 30 * stoop, y: rest.hand.y + 20 * stoop };
  const rightHand = hold?.right ?? { x: rest.hand.x * reach + 30 * stoop, y: rest.hand.y + 20 * stoop };
  const leftFoot = { x: -rest.foot.x, y: rest.foot.y };
  const rightFoot = { x: rest.foot.x, y: rest.foot.y };

  // Joint construction as in finger-network/3 `buildPose`, at rest scale.
  const handMid = { x: (leftHand.x + rightHand.x) / 2, y: (leftHand.y + rightHand.y) / 2 };
  const height = bodyHeight - head.y;
  const axisX = head.x * 0.48 + handMid.x * 0.2;
  const shoulderX = mix(head.x, axisX, 0.42);
  const hipX = mix(axisX, 0, 0.3);
  const shoulderY = head.y + 66;
  const hipY = Math.min(head.y + height * 0.62, Math.max(shoulderY + 46, bodyHeight - 45));
  const shoulderHalf = clamp((rightHand.x - leftHand.x) * 0.11, 24, 53);
  const hipHalf = shoulderHalf * 0.54;
  const leftShoulder = { x: shoulderX - shoulderHalf, y: shoulderY };
  const rightShoulder = { x: shoulderX + shoulderHalf, y: shoulderY };
  const leftHip = { x: hipX - hipHalf, y: hipY };
  const rightHip = { x: hipX + hipHalf, y: hipY };

  return {
    head,
    neck: { x: mix(head.x, shoulderX, 0.4), y: head.y + 38 },
    shoulders: { x: shoulderX, y: shoulderY },
    pelvis: { x: hipX, y: hipY },
    leftElbow: { x: mix(leftShoulder.x, leftHand.x, 0.56) - 9, y: mix(leftShoulder.y, leftHand.y, 0.54) + 6 },
    rightElbow: { x: mix(rightShoulder.x, rightHand.x, 0.56) + 9, y: mix(rightShoulder.y, rightHand.y, 0.54) + 6 },
    leftHand,
    rightHand,
    leftKnee: { x: mix(leftHip.x, leftFoot.x, 0.53) - 7, y: mix(leftHip.y, leftFoot.y, 0.54) },
    rightKnee: { x: mix(rightHip.x, rightFoot.x, 0.53) + 7, y: mix(rightHip.y, rightFoot.y, 0.54) },
    leftFoot,
    rightFoot,
    headRadius: headRadius * curve(headGrowth, age),
  };
}
