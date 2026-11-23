import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { MAGNIFY, PLATEAU, PUSH, type Frame, type KernelSpec, type Vec } from "./warp";

// Each procedure is one place on the face with one amount: how long it has
// been pressed (see `RATE`), never falling and never capped. Its warp is a smooth function
// of that amount alone, measured from this face's own landmarks.

export type Zone = { x: number; y: number; rx: number; ry: number };

export type Procedure = {
  id: string;
  /** Where a press lands on it: an ellipse on the face axes, in photo space. */
  zone: Zone;
  specs: (amount: number) => KernelSpec[];
};

export type Face = {
  frame: Frame;
  /** Applied in this order; presses are matched in `hitOrder`. */
  procedures: Procedure[];
  hitOrder: number[];
  /** Face outline, for presses that land on skin. */
  oval: Vec[];
  /** Eyes and lips, which the skin treatment leaves alone. */
  guards: Zone[];
  /** Reach of one skin press. */
  skinRadius: number;
  /** The face alone, with room to grow: a centre and a height in photo space. */
  view: { x: number; y: number; height: number };
};

const OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

// Features that grow keep growing, but ever more slowly relative to their
// size, and nearly as wide as tall, so the photo is enlarged rather than smeared.
const growth = (amount: number, power: number) => (1 + 0.1 * amount) ** power;

// Operations that close a distance approach it without ever arriving.
const closing = (amount: number) => 1 - Math.exp(-amount / 5);

export function measureFace(landmarks: NormalizedLandmark[], aspect: number): Face | null {
  if (landmarks.length < 468) return null;
  const at = (index: number): Vec => ({ x: landmarks[index].x * aspect, y: landmarks[index].y });
  const mix = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const distance = (a: Vec, b: Vec) => Math.hypot(b.x - a.x, b.y - a.y);

  const eyeLine = distance(at(33), at(263));
  if (eyeLine < 1e-4) return null;
  const xx = (at(263).x - at(33).x) / eyeLine;
  const xy = (at(263).y - at(33).y) / eyeLine;
  const frame: Frame = { xx, xy, yx: -xy, yy: xx };
  const along = (point: Vec, right: number, down: number): Vec => ({
    x: point.x + frame.xx * right + frame.yx * down,
    y: point.y + frame.xy * right + frame.yy * down,
  });
  const unit = (x: number, y: number) => {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  };

  const bridge = at(6);
  // The vector that carries a point onto the face's midline.
  const toMidline = (point: Vec): Vec => {
    const offset = (point.x - bridge.x) * frame.xx + (point.y - bridge.y) * frame.xy;
    return { x: -frame.xx * offset, y: -frame.xy * offset };
  };

  const eye = (distance(at(33), at(133)) + distance(at(263), at(362))) / 2;
  const mouth = distance(at(61), at(291));
  const face = distance(at(234), at(454));
  const nose = distance(at(129), at(358));
  const bridgeLength = distance(at(6), at(5));
  const lipHeight = Math.max(distance(at(0), at(17)), mouth * 0.22);
  const philtrum = distance(at(2), at(0));
  const brow = distance(at(10), at(9));
  const mouthCentre = mix(at(13), at(14), 0.5);

  const push = (anchor: Vec, vector: Vec, rx: number, ry: number): KernelSpec => ({
    kind: PUSH, anchor, rx, ry, vx: vector.x, vy: vector.y,
  });
  // A long push is drawn as a stroke of equal short ones, each carried on by
  // the last, so it can travel far and still move only what is near it.
  const stroke = (steps: number, anchor: Vec, vector: Vec, rx: number, ry: number): KernelSpec[] =>
    Array.from({ length: steps }, () => push(anchor, { x: vector.x / steps, y: vector.y / steps }, rx, ry));
  // Radii are set so the uniform core holds the whole feature at any scale.
  const magnify = (anchor: Vec, halfX: number, halfY: number, sx: number, sy: number): KernelSpec => ({
    kind: MAGNIFY, anchor, rx: halfX / PLATEAU, ry: halfY / PLATEAU, sx, sy,
  });
  const scaled = (vector: Vec, amount: number): Vec => ({ x: vector.x * amount, y: vector.y * amount });
  const zone = (centre: Vec, rx: number, ry: number): Zone => ({ x: centre.x, y: centre.y, rx, ry });

  const procedures: Procedure[] = [];
  const add = (id: string, hit: Zone, specs: Procedure["specs"]) => procedures.push({ id, zone: hit, specs });

  // 앞트임: the inner corner travels toward the bridge of the nose.
  for (const [side, inner] of [["a", 133], ["b", 362]] as const) {
    const corner = at(inner);
    const reach = toMidline(corner);
    add(`inner-${side}`, zone(corner, eye * 0.3, eye * 0.3), (amount) =>
      stroke(3, corner, scaled(reach, 0.9 * closing(amount)), eye * 0.32, eye * 0.32));
  }

  // 뒤트임 · 밑트임: the outer corner tears outward and down, without limit.
  for (const [side, outer, inner] of [["a", 33, 133], ["b", 263, 362]] as const) {
    const corner = at(outer);
    const away = unit(corner.x - at(inner).x, corner.y - at(inner).y);
    const direction = unit(away.x + frame.yx * 0.35, away.y + frame.yy * 0.35);
    add(`outer-${side}`, zone(mix(at(inner), corner, 1.1), eye * 0.3, eye * 0.3), (amount) =>
      stroke(4, corner, scaled(direction, eye * 0.09 * amount), eye * 0.32, eye * 0.32));
  }

  // 콧볼 축소: each wing closes on the midline.
  for (const [side, wing] of [["a", 129], ["b", 358]] as const) {
    const point = at(wing);
    const reach = toMidline(point);
    add(`alar-${side}`, zone(point, nose * 0.28, nose * 0.28), (amount) =>
      stroke(2, point, scaled(reach, 0.85 * closing(amount)), nose * 0.3, nose * 0.3));
  }

  // 코끝: the tip lifts toward the bridge, shortening the nose.
  {
    const tip = at(1);
    const reach = { x: at(197).x - tip.x, y: at(197).y - tip.y };
    add("tip", zone(tip, nose * 0.3, nose * 0.3), (amount) =>
      stroke(3, tip, scaled(reach, 0.7 * closing(amount)), nose * 0.34, nose * 0.3));
  }

  // 융비술: both flanks of the bridge close on its centre line.
  {
    const centre = at(197);
    const half = eye * 0.34;
    add("bridge", zone(centre, eye * 0.2, bridgeLength * 0.5), (amount) => [-1, 1].map((sign) => push(
      along(centre, sign * half, 0),
      { x: -frame.xx * sign * half * 0.8 * closing(amount), y: -frame.xy * sign * half * 0.8 * closing(amount) },
      eye * 0.3,
      bridgeLength * 0.7,
    )));
  }

  // 입꼬리 수술: each corner of the mouth climbs outward and up, without limit.
  for (const [side, index] of [["a", 61], ["b", 291]] as const) {
    const corner = at(index);
    const away = unit(corner.x - mouthCentre.x, corner.y - mouthCentre.y);
    const direction = unit(away.x * 0.6 - frame.yx, away.y * 0.6 - frame.yy);
    add(`corner-${side}`, zone(corner, mouth * 0.2, mouth * 0.2), (amount) =>
      stroke(4, corner, scaled(direction, mouth * 0.05 * amount), mouth * 0.26, mouth * 0.26));
  }

  // 인중 축소: the upper lip rises to the base of the nose.
  {
    const lip = at(0);
    const base = at(2);
    const reach = { x: base.x - lip.x, y: base.y - lip.y };
    add("philtrum", zone(at(164), mouth * 0.25, Math.max(philtrum * 0.4, mouth * 0.08)), (amount) =>
      stroke(3, lip, scaled(reach, 0.85 * closing(amount)), mouth * 0.45, philtrum * 0.6));
  }

  // 쌍꺼풀 · 눈매교정: the whole eye opens, taller faster than wider.
  for (const [side, outer, inner] of [["a", 33, 133], ["b", 263, 362]] as const) {
    const centre = mix(at(outer), at(inner), 0.5);
    add(`eye-${side}`, zone(centre, eye * 0.62, eye * 0.42), (amount) => [
      magnify(centre, eye * 0.58, eye * 0.3, growth(amount, 1.15), growth(amount, 1.5)),
    ]);
  }

  // 입술 필러: the lips thicken.
  add("lips", zone(mouthCentre, mouth * 0.5, lipHeight * 0.55), (amount) => [
    magnify(mouthCentre, mouth * 0.55, lipHeight * 0.6, growth(amount, 0.95), growth(amount, 1.5)),
  ]);

  // 광대 축소: each cheekbone sinks toward the midline.
  for (const [side, edge, cheek] of [["a", 234, 116], ["b", 454, 345]] as const) {
    const point = mix(at(edge), at(cheek), 0.25);
    const reach = toMidline(point);
    add(`cheek-${side}`, zone(mix(at(edge), at(cheek), 0.4), face * 0.11, face * 0.11), (amount) =>
      stroke(3, point, scaled(reach, 0.45 * closing(amount)), face * 0.14, face * 0.2));
  }

  // 사각턱 절제: each jaw angle is cut in toward the midline and a little up.
  for (const [side, index] of [["a", 172], ["b", 397]] as const) {
    const angle = at(index);
    const inward = toMidline(angle);
    const reach = { x: inward.x - frame.yx * face * 0.06, y: inward.y - frame.yy * face * 0.06 };
    add(`jaw-${side}`, zone(along(angle, 0, -face * 0.02), face * 0.11, face * 0.11), (amount) =>
      stroke(4, angle, scaled(reach, 0.6 * closing(amount)), face * 0.12, face * 0.14));
  }

  // V라인 · 턱끝: the chin is drawn down to a point, without limit.
  {
    const chin = at(152);
    add("chin", zone(along(chin, 0, -face * 0.04), face * 0.13, face * 0.08), (amount) =>
      stroke(4, chin, { x: frame.yx * face * 0.035 * amount, y: frame.yy * face * 0.035 * amount }, face * 0.13, face * 0.13));
  }

  // 이마 지방이식: the forehead rises from the hairline, without limit; the
  // brows below it stay where they are.
  {
    const top = at(10);
    add("forehead", zone(mix(top, at(9), 0.4), face * 0.28, brow * 0.4), (amount) =>
      stroke(4, top, { x: -frame.yx * brow * 0.16 * amount, y: -frame.yy * brow * 0.16 * amount }, face * 0.34, brow * 0.55));
  }

  // Small targets win where zones overlap.
  const rank = (id: string) => {
    const name = id.replace(/-[ab]$/, "");
    return ["inner", "outer", "alar", "tip", "bridge", "corner", "philtrum", "eye", "lips", "cheek", "jaw", "chin", "forehead"].indexOf(name);
  };
  const hitOrder = procedures.map((_, index) => index).sort((a, b) => rank(procedures[a].id) - rank(procedures[b].id));

  const eyeCentre = (outer: number, inner: number) => mix(at(outer), at(inner), 0.5);
  return {
    frame,
    procedures,
    hitOrder,
    oval: OVAL.map(at),
    guards: [
      zone(eyeCentre(33, 133), eye * 0.75, eye * 0.42),
      zone(eyeCentre(263, 362), eye * 0.75, eye * 0.42),
      zone(mouthCentre, mouth * 0.62, lipHeight * 0.7),
    ],
    skinRadius: face * 0.14,
    view: { ...mix(at(10), at(152), 0.46), height: distance(at(10), at(152)) * 1.7 },
  };
}

// Squared distance from a zone's centre, in zone radii: under 1 is inside.
function zoneDistance(zone: Zone, frame: Frame, point: Vec) {
  const dx = point.x - zone.x;
  const dy = point.y - zone.y;
  const qx = (dx * frame.xx + dy * frame.xy) / zone.rx;
  const qy = (dx * frame.yx + dy * frame.yy) / zone.ry;
  return qx * qx + qy * qy;
}

function inOutline(outline: Vec[], point: Vec) {
  let inside = false;
  for (let index = 0, last = outline.length - 1; index < outline.length; last = index, index += 1) {
    const a = outline[index];
    const b = outline[last];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < a.x + (b.x - a.x) * (point.y - a.y) / (b.y - a.y)) {
      inside = !inside;
    }
  }
  return inside;
}

export const SKIN = -1;
export const NOTHING = -2;

// A finger that lands just beside a zone still means that zone.
const NEAR = 1.5 * 1.5;

/** The procedure under a photo-space point, `SKIN` for bare face, else `NOTHING`. */
export function hitFace(face: Face, point: Vec) {
  let nearest = NOTHING;
  let nearestDistance = NEAR;
  for (const index of face.hitOrder) {
    const distance = zoneDistance(face.procedures[index].zone, face.frame, point);
    if (distance < 1) return index;
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }
  if (nearest !== NOTHING) return nearest;
  return inOutline(face.oval, point) ? SKIN : NOTHING;
}

export function buildSpecs(face: Face, amounts: Float32Array) {
  const specs: KernelSpec[] = [];
  for (let index = 0; index < face.procedures.length; index += 1) {
    if (amounts[index] > 0) specs.push(...face.procedures[index].specs(amounts[index]));
  }
  return specs;
}
