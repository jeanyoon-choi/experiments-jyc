export type Point = { x: number; y: number };
export type Role = "head" | "leftHand" | "rightHand" | "leftFoot" | "rightFoot";
export type RoleIds = Record<Role, number>;
export type Endpoints = Record<Role, Point>;

export type Pose = Endpoints & {
  neck: Point;
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftHip: Point;
  rightHip: Point;
  leftKnee: Point;
  rightKnee: Point;
  chest: Point;
  pelvis: Point;
  scale: number;
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

export function assignRoles(contacts: ReadonlyMap<number, Point>): RoleIds | null {
  if (contacts.size !== 5) return null;
  const ranked = [...contacts.entries()].sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x);
  const head = ranked[0]!;
  const arms = ranked.slice(1, 3).sort((a, b) => a[1].x - b[1].x);
  const legs = ranked.slice(3, 5).sort((a, b) => a[1].x - b[1].x);
  return {
    head: head[0],
    leftHand: arms[0]![0],
    rightHand: arms[1]![0],
    leftFoot: legs[0]![0],
    rightFoot: legs[1]![0],
  };
}

export function endpointsFor(contacts: ReadonlyMap<number, Point>, ids: RoleIds): Endpoints | null {
  const head = contacts.get(ids.head);
  const leftHand = contacts.get(ids.leftHand);
  const rightHand = contacts.get(ids.rightHand);
  const leftFoot = contacts.get(ids.leftFoot);
  const rightFoot = contacts.get(ids.rightFoot);
  if (!head || !leftHand || !rightHand || !leftFoot || !rightFoot) return null;
  return { head, leftHand, rightHand, leftFoot, rightFoot };
}

export function buildPose(endpoints: Endpoints): Pose {
  const { head, leftHand, rightHand, leftFoot, rightFoot } = endpoints;
  const handMid = midpoint(leftHand, rightHand);
  const footMid = midpoint(leftFoot, rightFoot);
  const height = clamp(footMid.y - head.y, 170, 700);
  const scale = clamp(height / 470, 0.62, 1.4);
  const axisX = head.x * 0.48 + handMid.x * 0.2 + footMid.x * 0.32;
  const shoulderX = mix(head.x, axisX, 0.42);
  const hipX = mix(axisX, footMid.x, 0.3);
  const shoulderY = head.y + 66 * scale;
  const hipY = Math.min(head.y + height * 0.62, Math.max(shoulderY + 46 * scale, footMid.y - 45 * scale));
  const shoulderHalf = clamp((rightHand.x - leftHand.x) * 0.11, 24 * scale, 53 * scale);
  const hipHalf = shoulderHalf * 0.54;
  const leftShoulder = { x: shoulderX - shoulderHalf, y: shoulderY };
  const rightShoulder = { x: shoulderX + shoulderHalf, y: shoulderY };
  const leftHip = { x: hipX - hipHalf, y: hipY };
  const rightHip = { x: hipX + hipHalf, y: hipY };

  return {
    ...endpoints,
    neck: { x: mix(head.x, shoulderX, 0.4), y: head.y + 38 * scale },
    leftShoulder,
    rightShoulder,
    leftElbow: { x: mix(leftShoulder.x, leftHand.x, 0.56) - 9 * scale, y: mix(leftShoulder.y, leftHand.y, 0.54) + 6 * scale },
    rightElbow: { x: mix(rightShoulder.x, rightHand.x, 0.56) + 9 * scale, y: mix(rightShoulder.y, rightHand.y, 0.54) + 6 * scale },
    leftHip,
    rightHip,
    leftKnee: { x: mix(leftHip.x, leftFoot.x, 0.53) - 7 * scale, y: mix(leftHip.y, leftFoot.y, 0.54) },
    rightKnee: { x: mix(rightHip.x, rightFoot.x, 0.53) + 7 * scale, y: mix(rightHip.y, rightFoot.y, 0.54) },
    chest: { x: shoulderX, y: shoulderY + height * 0.13 },
    pelvis: { x: hipX, y: hipY },
    scale,
  };
}

export type Anchor = Role | "feet";
export type Binding = ReadonlyMap<number, Anchor>;
export type Frame = { x: number; y: number; angle: number; scale: number };
export type Figure = { frame: Frame; endpoints: Endpoints };

const roles: Role[] = ["head", "leftHand", "rightHand", "leftFoot", "rightFoot"];
export const restEndpoints: Endpoints = {
  head: { x: 0, y: 0 },
  leftHand: { x: -135, y: 250 },
  rightHand: { x: 135, y: 250 },
  leftFoot: { x: -62, y: 470 },
  rightFoot: { x: 62, y: 470 },
};
const restShoulder = { x: 31, y: 66 };
const restArmAngle = Math.atan2(restEndpoints.rightHand.x - restShoulder.x, restEndpoints.rightHand.y - restShoulder.y);
const restArmLength = Math.hypot(restEndpoints.rightHand.x - restShoulder.x, restEndpoints.rightHand.y - restShoulder.y);
const raisedArmAngle = (150 / 180) * Math.PI;

const copyEndpoints = (endpoints: Endpoints): Endpoints =>
  Object.fromEntries(roles.map((role) => [role, { ...endpoints[role] }])) as Endpoints;
const idsByX = (entries: readonly (readonly [number, Point])[]) => [...entries].sort((a, b) => a[1].x - b[1].x).map((entry) => entry[0]);

export function anchorPoint(endpoints: Endpoints, anchor: Anchor): Point {
  return anchor === "feet" ? midpoint(endpoints.leftFoot, endpoints.rightFoot) : endpoints[anchor];
}

export function toWorld(frame: Frame, point: Point): Point {
  const cos = Math.cos(frame.angle) * frame.scale;
  const sin = Math.sin(frame.angle) * frame.scale;
  return { x: frame.x + cos * point.x - sin * point.y, y: frame.y + sin * point.x + cos * point.y };
}

function toLocal(frame: Frame, point: Point): Point {
  const cos = Math.cos(frame.angle);
  const sin = Math.sin(frame.angle);
  const dx = point.x - frame.x;
  const dy = point.y - frame.y;
  return { x: (cos * dx + sin * dy) / frame.scale, y: (cos * dy - sin * dx) / frame.scale };
}

// Fresh contacts read top to bottom: 2 = head + both feet, 3 = head + feet, 4 = hands + feet, 5 = full body.
export function defaultBinding(contacts: ReadonlyMap<number, Point>): Binding | null {
  const ranked = [...contacts.entries()].sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x);
  if (contacts.size === 2) return new Map<number, Anchor>([[ranked[0]![0], "head"], [ranked[1]![0], "feet"]]);
  if (contacts.size === 3) {
    const [leftFoot, rightFoot] = idsByX(ranked.slice(1));
    return new Map<number, Anchor>([[ranked[0]![0], "head"], [leftFoot!, "leftFoot"], [rightFoot!, "rightFoot"]]);
  }
  if (contacts.size === 4) {
    const [leftHand, rightHand] = idsByX(ranked.slice(0, 2));
    const [leftFoot, rightFoot] = idsByX(ranked.slice(2));
    return new Map<number, Anchor>([[leftHand!, "leftHand"], [rightHand!, "rightHand"], [leftFoot!, "leftFoot"], [rightFoot!, "rightFoot"]]);
  }
  const ids = assignRoles(contacts);
  return ids ? new Map<number, Anchor>(roles.map((role) => [ids[role], role])) : null;
}

// Lifting fingers keeps the body parts still held; adding a finger rereads the whole hand.
export function continueBinding(binding: Binding | null, contacts: ReadonlyMap<number, Point>): Binding | null {
  if (contacts.size < 2 || contacts.size > 5) return null;
  if (binding && contacts.size <= binding.size && [...contacts.keys()].every((id) => binding.has(id))) {
    return contacts.size === binding.size ? binding : new Map([...binding].filter(([id]) => contacts.has(id)));
  }
  return defaultBinding(contacts);
}

// A frozen pose replaces the rest pose: parts whose fingers lifted stay exactly where they were left.
export function solveFigure(binding: Binding, contacts: ReadonlyMap<number, Point>, lockedScale: number | null, frozen: Endpoints | null = null): Figure | null {
  const rest = frozen ?? restEndpoints;
  const pairs: { anchor: Anchor; rest: Point; target: Point }[] = [];
  for (const [id, anchor] of binding) {
    const target = contacts.get(id);
    if (!target) return null;
    pairs.push({ anchor, rest: anchorPoint(rest, anchor), target });
  }
  if (pairs.length < 2) return null;

  const count = pairs.length;
  const restCenter = pairs.reduce((sum, { rest }) => ({ x: sum.x + rest.x / count, y: sum.y + rest.y / count }), { x: 0, y: 0 });
  const targetCenter = pairs.reduce((sum, { target }) => ({ x: sum.x + target.x / count, y: sum.y + target.y / count }), { x: 0, y: 0 });
  let real = 0;
  let imaginary = 0;
  let spread = 0;
  for (const { rest, target } of pairs) {
    const qx = rest.x - restCenter.x;
    const qy = rest.y - restCenter.y;
    const px = target.x - targetCenter.x;
    const py = target.y - targetCenter.y;
    real += px * qx + py * qy;
    imaginary += py * qx - px * qy;
    spread += qx * qx + qy * qy;
  }
  const angle = Math.atan2(imaginary, real);
  const fittedScale = clamp(Math.hypot(real, imaginary) / Math.max(1, spread), 0.25, 2.4);
  // Five fingers are fitted like the rest, so every hand count shares one body frame and morphs into the next.
  const scale = count === 2 || count === 5 ? fittedScale : (lockedScale ?? fittedScale);
  const origin = toWorld({ x: 0, y: 0, angle, scale }, restCenter);
  const frame = { x: targetCenter.x - origin.x, y: targetCenter.y - origin.y, angle, scale };
  const endpoints = copyEndpoints(rest);
  if (count === 2) return { frame, endpoints };

  const held = new Set<Anchor>();
  for (const { anchor, target } of pairs) {
    if (anchor === "feet") continue;
    endpoints[anchor] = toLocal(frame, target);
    held.add(anchor);
  }
  if (frozen) return { frame, endpoints };
  const handsFree = !held.has("leftHand") && !held.has("rightHand");
  if (handsFree && held.has("leftFoot") && held.has("rightFoot")) {
    const stance = endpoints.rightFoot.x - endpoints.leftFoot.x - (restEndpoints.rightFoot.x - restEndpoints.leftFoot.x);
    const armAngle = mix(restArmAngle, raisedArmAngle, clamp(stance / 210, 0, 1));
    const reach = { x: Math.sin(armAngle) * restArmLength, y: Math.cos(armAngle) * restArmLength };
    const shoulderY = endpoints.head.y + restShoulder.y;
    endpoints.leftHand = { x: endpoints.head.x - restShoulder.x - reach.x, y: shoulderY + reach.y };
    endpoints.rightHand = { x: endpoints.head.x + restShoulder.x + reach.x, y: shoulderY + reach.y };
  }
  if (!held.has("head") && held.has("leftHand") && held.has("rightHand")) {
    const hands = midpoint(endpoints.leftHand, endpoints.rightHand);
    endpoints.head = { x: hands.x * 0.35, y: clamp((hands.y - restEndpoints.leftHand.y) * 0.2, -40, 40) };
  }
  return { frame, endpoints };
}

// After a hand change the body eases into the new fit, then tracks the nodes tightly again.
const morphSeconds = 0.6;
const morphRate = 4;
const trackRate = 19;

// One person per touch session, carried by that session's nodes as /2's figure is carried by fingers.
export type Person = {
  binding: Binding | null;
  figure: Figure | null;
  frozen: Endpoints | null;
  lockedScale: number | null;
  morph: number;
};

export function createPerson(): Person {
  return { binding: null, figure: null, frozen: null, lockedScale: null, morph: 1 };
}

// `anchors` are the session's newest nodes (two to five). A node that fades away freezes the part it held,
// so the person keeps its shape while it disappears; a new node rereads the hand and the body morphs into it.
export function updatePerson(person: Person, anchors: ReadonlyMap<number, Point>, elapsedSeconds: number) {
  const previous = person.binding;
  const next = continueBinding(previous, anchors);
  if (next && next !== previous) {
    person.lockedScale = person.figure ? person.figure.frame.scale : null;
    const lost = previous !== null && next.size < previous.size && [...next.keys()].every((id) => previous.has(id));
    if (lost && person.figure) {
      person.frozen = copyEndpoints(person.figure.endpoints);
    } else {
      person.frozen = null;
      person.morph = 0;
    }
  }
  person.binding = next;
  const target = next ? solveFigure(next, anchors, person.lockedScale, person.frozen) : null;
  if (!target) return person;
  if (!person.figure) {
    person.figure = { frame: { ...target.frame }, endpoints: copyEndpoints(target.endpoints) };
    return person;
  }
  person.morph = Math.min(1, person.morph + elapsedSeconds / morphSeconds);
  const follow = 1 - Math.exp(-elapsedSeconds * (morphRate + (trackRate - morphRate) * person.morph * person.morph));
  const current = person.figure.frame;
  const turn = Math.atan2(Math.sin(target.frame.angle - current.angle), Math.cos(target.frame.angle - current.angle));
  person.figure.frame = {
    x: current.x + (target.frame.x - current.x) * follow,
    y: current.y + (target.frame.y - current.y) * follow,
    angle: current.angle + turn * follow,
    scale: current.scale + (target.frame.scale - current.scale) * follow,
  };
  for (const role of roles) {
    const point = person.figure.endpoints[role];
    person.figure.endpoints[role] = {
      x: point.x + (target.endpoints[role].x - point.x) * follow,
      y: point.y + (target.endpoints[role].y - point.y) * follow,
    };
  }
  return person;
}
