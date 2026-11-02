import type { Category, NormalizedLandmark } from "@mediapipe/tasks-vision";

// Face Landmarker output → a flat set of expression readings. Pure apart from
// the reader's own history; no DOM. Every reading has a value (its unit), a
// display weight 0–1 and, for conditions, a threshold above which it is on.

export const BLENDSHAPES = [
  "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight",
  "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
  "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight",
  "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight",
  "eyeWideLeft", "eyeWideRight",
  "jawForward", "jawLeft", "jawOpen", "jawRight",
  "mouthClose", "mouthDimpleLeft", "mouthDimpleRight", "mouthFrownLeft", "mouthFrownRight", "mouthFunnel",
  "mouthLeft", "mouthLowerDownLeft", "mouthLowerDownRight", "mouthPressLeft", "mouthPressRight", "mouthPucker",
  "mouthRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper",
  "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight",
  "mouthUpperUpLeft", "mouthUpperUpRight", "noseSneerLeft", "noseSneerRight",
] as const;

export type BlendshapeName = (typeof BLENDSHAPES)[number];
export type ReadingGroup = "condition" | "head" | "dynamics" | "geometry" | "raw";
export type Unit = "pct" | "deg" | "cm" | "count" | "rate" | "sec" | "ms" | "ratio" | "signed" | "hz";

export type ReadingSpec = {
  id: string;
  label: string;
  group: ReadingGroup;
  unit: Unit;
  /** Display range: |value| / range is the weight. */
  range: number;
  /** Conditions are on at or above this value (in the reading's own unit). */
  threshold?: number;
};

type B = Record<BlendshapeName, number>;

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
// Rescale so `low` reads 0 and `high` reads 1; condition intensities are
// deliberately steep so an exaggerated face saturates them.
const ramp = (value: number, low: number, high: number) => clamp((value - low) / (high - low));
const mean = (...values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const both = (b: B, stem: string) => mean(b[`${stem}Left` as BlendshapeName], b[`${stem}Right` as BlendshapeName]);
const lr = (b: B, stem: string) => b[`${stem}Left` as BlendshapeName] - b[`${stem}Right` as BlendshapeName];
const degrees = (radians: number) => radians * 180 / Math.PI;

// Condition formulas over neutral-calibrated blendshapes (0 at rest). Loosely
// FACS: sadness AU1+4+15, anger AU4+5+7+23, fear AU1+2+4+5+20, disgust AU9+10.
const CONDITIONS: readonly { id: string; label: string; read: (b: B, h: HeadState) => number }[] = [
  { id: "smile", label: "smile", read: (b) => ramp(both(b, "mouthSmile"), 0.05, 0.6) },
  { id: "duchenne", label: "duchenne", read: (b) => Math.min(ramp(both(b, "mouthSmile"), 0.1, 0.6), ramp(mean(both(b, "cheekSquint"), both(b, "eyeSquint")), 0.05, 0.4)) },
  { id: "grin", label: "grin", read: (b) => ramp(both(b, "mouthSmile") * 0.6 + both(b, "mouthStretch") * 0.2 + both(b, "mouthUpperUp") * 0.4, 0.15, 0.6) },
  { id: "laugh", label: "laugh", read: (b) => ramp(both(b, "mouthSmile"), 0.15, 0.55) * ramp(b.jawOpen, 0.1, 0.45) },
  { id: "smirk-l", label: "smirk L", read: (b) => ramp(lr(b, "mouthSmile") + lr(b, "mouthDimple") * 0.5, 0.08, 0.4) },
  { id: "smirk-r", label: "smirk R", read: (b) => ramp(-lr(b, "mouthSmile") - lr(b, "mouthDimple") * 0.5, 0.08, 0.4) },
  { id: "contempt", label: "contempt", read: (b) => ramp(Math.abs(lr(b, "mouthDimple")) + Math.abs(lr(b, "mouthSmile")) * 0.5 + Math.abs(lr(b, "mouthPress")) * 0.5, 0.1, 0.45) },
  { id: "frown", label: "frown", read: (b) => ramp(both(b, "mouthFrown"), 0.05, 0.45) },
  { id: "sad", label: "sad", read: (b) => ramp(b.browInnerUp * 0.4 + both(b, "mouthFrown") * 0.4 + b.mouthShrugLower * 0.3 + both(b, "browDown") * 0.15, 0.1, 0.45) },
  { id: "cry", label: "cry", read: (b) => ramp(b.browInnerUp * 0.35 + both(b, "mouthFrown") * 0.25 + both(b, "eyeSquint") * 0.25 + both(b, "mouthStretch") * 0.25, 0.15, 0.5) },
  { id: "angry", label: "angry", read: (b) => ramp(both(b, "browDown") * 0.5 + both(b, "eyeSquint") * 0.2 + both(b, "mouthPress") * 0.2 + both(b, "noseSneer") * 0.3, 0.12, 0.5) },
  { id: "rage", label: "rage", read: (b) => ramp(both(b, "browDown"), 0.15, 0.55) * ramp(both(b, "mouthUpperUp") + both(b, "mouthStretch") + b.jawOpen * 0.5, 0.15, 0.6) },
  { id: "surprise", label: "surprise", read: (b) => ramp(b.browInnerUp * 0.25 + both(b, "browOuterUp") * 0.25 + both(b, "eyeWide") * 0.25 + b.jawOpen * 0.35, 0.12, 0.5) },
  { id: "shock", label: "shock", read: (b) => ramp(both(b, "eyeWide") + both(b, "browOuterUp"), 0.2, 0.7) * ramp(b.jawOpen, 0.25, 0.6) },
  { id: "fear", label: "fear", read: (b) => ramp(b.browInnerUp * 0.3 + both(b, "eyeWide") * 0.3 + both(b, "mouthStretch") * 0.35 + both(b, "browDown") * 0.1, 0.12, 0.45) },
  { id: "disgust", label: "disgust", read: (b) => ramp(both(b, "noseSneer") * 0.5 + both(b, "mouthUpperUp") * 0.4 + both(b, "cheekSquint") * 0.2, 0.1, 0.45) },
  { id: "sneer-l", label: "sneer L", read: (b) => ramp(b.noseSneerLeft + b.mouthUpperUpLeft * 0.5 - b.noseSneerRight * 0.6, 0.1, 0.45) },
  { id: "sneer-r", label: "sneer R", read: (b) => ramp(b.noseSneerRight + b.mouthUpperUpRight * 0.5 - b.noseSneerLeft * 0.6, 0.1, 0.45) },
  { id: "grimace", label: "grimace", read: (b) => ramp(both(b, "mouthStretch") * 0.5 + both(b, "mouthUpperUp") * 0.3 + both(b, "mouthLowerDown") * 0.3, 0.1, 0.45) },
  { id: "teeth", label: "teeth", read: (b) => ramp(both(b, "mouthUpperUp") + both(b, "mouthLowerDown") * 0.6, 0.15, 0.7) },
  { id: "scream", label: "scream", read: (b) => ramp(b.jawOpen, 0.35, 0.75) * ramp(both(b, "mouthStretch") + b.browInnerUp * 0.5 + both(b, "mouthUpperUp") * 0.5, 0.1, 0.5) },
  { id: "yawn", label: "yawn", read: (b) => ramp(b.jawOpen, 0.45, 0.8) * ramp(both(b, "eyeSquint") + both(b, "eyeBlink") * 0.6, 0.1, 0.5) },
  { id: "jaw-drop", label: "jaw drop", read: (b) => ramp(b.jawOpen, 0.2, 0.7) },
  { id: "o-mouth", label: "O mouth", read: (b) => ramp(b.mouthFunnel, 0.08, 0.45) * ramp(b.jawOpen, 0.03, 0.25) },
  { id: "kiss", label: "kiss", read: (b) => ramp(b.mouthPucker, 0.15, 0.7) },
  { id: "duckface", label: "duckface", read: (b) => ramp(b.mouthPucker * 0.6 + b.mouthFunnel * 0.2 + both(b, "cheekSquint") * 0.2 + b.mouthShrugUpper * 0.3, 0.2, 0.6) },
  { id: "pout", label: "pout", read: (b) => ramp(b.mouthShrugLower * 0.5 + b.mouthPucker * 0.3 + both(b, "mouthFrown") * 0.3, 0.15, 0.55) },
  { id: "puff", label: "cheek puff", read: (b) => ramp(b.cheekPuff, 0.08, 0.5) },
  { id: "press", label: "lips press", read: (b) => ramp(both(b, "mouthPress"), 0.1, 0.5) },
  { id: "suck", label: "lips in", read: (b) => ramp(mean(b.mouthRollUpper, b.mouthRollLower), 0.1, 0.5) },
  { id: "jaw-l", label: "jaw L", read: (b) => ramp(b.jawLeft - b.jawRight, 0.04, 0.3) },
  { id: "jaw-r", label: "jaw R", read: (b) => ramp(b.jawRight - b.jawLeft, 0.04, 0.3) },
  { id: "underbite", label: "underbite", read: (b) => ramp(b.jawForward, 0.08, 0.45) },
  { id: "mouth-l", label: "mouth L", read: (b) => ramp(b.mouthLeft - b.mouthRight, 0.05, 0.4) },
  { id: "mouth-r", label: "mouth R", read: (b) => ramp(b.mouthRight - b.mouthLeft, 0.05, 0.4) },
  { id: "wink-l", label: "wink L", read: (b) => ramp(b.eyeBlinkLeft - b.eyeBlinkRight, 0.2, 0.6) },
  { id: "wink-r", label: "wink R", read: (b) => ramp(b.eyeBlinkRight - b.eyeBlinkLeft, 0.2, 0.6) },
  { id: "eyes-shut", label: "eyes shut", read: (b) => ramp(Math.min(b.eyeBlinkLeft, b.eyeBlinkRight), 0.3, 0.7) },
  { id: "squint", label: "squint", read: (b) => ramp(both(b, "eyeSquint"), 0.1, 0.5) },
  { id: "wide-eyes", label: "wide eyes", read: (b) => ramp(both(b, "eyeWide"), 0.08, 0.45) },
  { id: "brows-up", label: "brows up", read: (b) => ramp(b.browInnerUp * 0.5 + both(b, "browOuterUp") * 0.5, 0.1, 0.5) },
  { id: "brow-l", label: "brow L up", read: (b) => ramp(b.browOuterUpLeft - b.browOuterUpRight + (b.browDownRight - b.browDownLeft) * 0.5, 0.1, 0.4) },
  { id: "brow-r", label: "brow R up", read: (b) => ramp(b.browOuterUpRight - b.browOuterUpLeft + (b.browDownLeft - b.browDownRight) * 0.5, 0.1, 0.4) },
  { id: "furrow", label: "furrow", read: (b) => ramp(both(b, "browDown"), 0.08, 0.45) },
  { id: "worry", label: "worry", read: (b) => ramp(b.browInnerUp, 0.12, 0.55) * (1 - ramp(both(b, "browOuterUp"), 0.2, 0.6) * 0.6) },
  { id: "look-l", label: "side-eye L", read: (b) => ramp(mean(b.eyeLookOutLeft, b.eyeLookInRight), 0.2, 0.6) },
  { id: "look-r", label: "side-eye R", read: (b) => ramp(mean(b.eyeLookOutRight, b.eyeLookInLeft), 0.2, 0.6) },
  { id: "eye-roll", label: "eye roll", read: (b) => ramp(both(b, "eyeLookUp"), 0.15, 0.55) },
  { id: "look-down", label: "look down", read: (b) => ramp(both(b, "eyeLookDown"), 0.2, 0.6) },
  { id: "cross-eyed", label: "cross-eyed", read: (b) => ramp(Math.min(b.eyeLookInLeft, b.eyeLookInRight), 0.15, 0.5) },
  { id: "turn-l", label: "turn L", read: (_, h) => ramp(h.yaw, 10, 35) },
  { id: "turn-r", label: "turn R", read: (_, h) => ramp(-h.yaw, 10, 35) },
  { id: "chin-up", label: "chin up", read: (_, h) => ramp(h.pitch, 8, 28) },
  { id: "chin-down", label: "chin down", read: (_, h) => ramp(-h.pitch, 8, 28) },
  { id: "tilt-l", label: "tilt L", read: (_, h) => ramp(h.roll, 8, 30) },
  { id: "tilt-r", label: "tilt R", read: (_, h) => ramp(-h.roll, 8, 30) },
  { id: "close", label: "too close", read: (_, h) => ramp(-h.distance, -30, -18) },
  { id: "far", label: "far away", read: (_, h) => ramp(h.distance, 55, 90) },
];

const CONDITION_THRESHOLD = 0.5;
const EMOTIONS = ["smile", "sad", "angry", "surprise", "fear", "disgust", "contempt"] as const;

const LABEL_STEMS: Record<string, string> = {
  browDown: "brow down", browInnerUp: "brow inner", browOuterUp: "brow outer",
  cheekPuff: "cheek puff", cheekSquint: "cheek sqnt",
  eyeBlink: "blink", eyeLookDown: "look dn", eyeLookIn: "look in", eyeLookOut: "look out", eyeLookUp: "look up",
  eyeSquint: "eye squint", eyeWide: "eye wide",
  jawForward: "jaw fwd", jawLeft: "jaw left", jawOpen: "jaw open", jawRight: "jaw right",
  mouthClose: "mouth shut", mouthDimple: "dimple", mouthFrown: "mouth frown", mouthFunnel: "funnel",
  mouthLeft: "mouth left", mouthLowerDown: "lower dn", mouthPress: "press", mouthPucker: "pucker",
  mouthRight: "mouth right", mouthRollLower: "roll lower", mouthRollUpper: "roll upper",
  mouthShrugLower: "shrug lower", mouthShrugUpper: "shrug upper", mouthSmile: "mouth smile",
  mouthStretch: "stretch", mouthUpperUp: "upper up", noseSneer: "nose sneer",
};

function blendshapeLabel(name: string) {
  const side = name.endsWith("Left") ? " L" : name.endsWith("Right") && name !== "jawRight" && name !== "mouthRight" ? " R" : "";
  const stem = side ? name.slice(0, side === " L" ? -4 : -5) : name;
  return `${LABEL_STEMS[stem] ?? stem}${side}`;
}

const HEAD: readonly ReadingSpec[] = [
  { id: "yaw", label: "yaw", group: "head", unit: "deg", range: 45 },
  { id: "pitch", label: "pitch", group: "head", unit: "deg", range: 35 },
  { id: "roll", label: "roll", group: "head", unit: "deg", range: 35 },
  { id: "distance", label: "distance", group: "head", unit: "cm", range: 90 },
  { id: "face-x", label: "face x", group: "head", unit: "signed", range: 1 },
  { id: "face-y", label: "face y", group: "head", unit: "signed", range: 1 },
  { id: "face-fill", label: "face fill", group: "head", unit: "pct", range: 1 },
  { id: "head-speed", label: "head speed", group: "head", unit: "rate", range: 120 },
  { id: "nods", label: "nods", group: "head", unit: "count", range: 10 },
  { id: "shakes", label: "shakes", group: "head", unit: "count", range: 10 },
];

const DYNAMICS: readonly ReadingSpec[] = [
  { id: "energy", label: "energy", group: "dynamics", unit: "pct", range: 1 },
  { id: "valence", label: "valence", group: "dynamics", unit: "signed", range: 1 },
  { id: "arousal", label: "arousal", group: "dynamics", unit: "pct", range: 1 },
  { id: "asymmetry", label: "asymmetry", group: "dynamics", unit: "pct", range: 1 },
  { id: "neutral", label: "neutral", group: "dynamics", unit: "pct", range: 1 },
  { id: "change", label: "change", group: "dynamics", unit: "rate", range: 6 },
  { id: "stillness", label: "stillness", group: "dynamics", unit: "sec", range: 10 },
  { id: "talking", label: "talking", group: "dynamics", unit: "pct", range: 1, threshold: 0.5 },
  { id: "blinks", label: "blinks", group: "dynamics", unit: "count", range: 60 },
  { id: "blink-rate", label: "blink /min", group: "dynamics", unit: "count", range: 40 },
  { id: "blink-ms", label: "blink ms", group: "dynamics", unit: "ms", range: 500 },
  { id: "since-blink", label: "no blink", group: "dynamics", unit: "sec", range: 15 },
  { id: "winks", label: "winks", group: "dynamics", unit: "count", range: 20 },
  { id: "smile-held", label: "smile held", group: "dynamics", unit: "sec", range: 10 },
  { id: "micro", label: "micro expr", group: "dynamics", unit: "count", range: 20 },
  { id: "peak", label: "peak 5s", group: "dynamics", unit: "pct", range: 1 },
  { id: "fps", label: "fps", group: "dynamics", unit: "hz", range: 30 },
];

const GEOMETRY: readonly ReadingSpec[] = [
  { id: "ear-l", label: "eye open L", group: "geometry", unit: "ratio", range: 0.45 },
  { id: "ear-r", label: "eye open R", group: "geometry", unit: "ratio", range: 0.45 },
  { id: "mar", label: "mouth open", group: "geometry", unit: "ratio", range: 0.8 },
  { id: "mouth-width", label: "mouth wide", group: "geometry", unit: "ratio", range: 1.2 },
  { id: "brow-l-h", label: "brow hgt L", group: "geometry", unit: "ratio", range: 0.6 },
  { id: "brow-r-h", label: "brow hgt R", group: "geometry", unit: "ratio", range: 0.6 },
  { id: "corner-tilt", label: "lip tilt", group: "geometry", unit: "signed", range: 0.3 },
  { id: "face-aspect", label: "face long", group: "geometry", unit: "ratio", range: 2 },
];

export const READINGS: readonly ReadingSpec[] = [
  ...CONDITIONS.map((condition): ReadingSpec => ({
    id: condition.id, label: condition.label, group: "condition", unit: "pct", range: 1, threshold: CONDITION_THRESHOLD,
  })),
  ...HEAD,
  ...DYNAMICS,
  ...GEOMETRY,
  ...BLENDSHAPES.map((name): ReadingSpec => ({ id: name, label: blendshapeLabel(name), group: "raw", unit: "pct", range: 1 })),
];

export type HeadState = { yaw: number; pitch: number; roll: number; distance: number };

export type FaceInput = {
  blendshapes: Category[] | undefined;
  landmarks: NormalizedLandmark[] | undefined;
  /** Column-major 4×4 facial transformation matrix (cm). */
  matrix: ArrayLike<number> | undefined;
  /** Source image size, for aspect-correct landmark distances. */
  width: number;
  height: number;
};

export type ExpressionReader = {
  readonly values: Float64Array;
  readonly weights: Float32Array;
  readonly on: Uint8Array;
  readonly calibrated: () => boolean;
  update: (input: FaceInput, now: number) => boolean;
  lose: (now: number) => void;
  recalibrate: () => void;
};

const CALIBRATION_FRAMES = 30;

function headFromMatrix(m: ArrayLike<number>) {
  // R_rc = m[c * 4 + r]; Y-X-Z decomposition.
  return {
    yaw: degrees(Math.asin(clamp(-m[2], -1, 1))),
    pitch: degrees(Math.atan2(m[6], m[10])),
    roll: degrees(Math.atan2(m[1], m[0])),
    distance: Math.abs(m[14]),
  };
}

export function createExpressionReader(): ExpressionReader {
  const index = new Map(READINGS.map((spec, position) => [spec.id, position]));
  const values = new Float64Array(READINGS.length);
  const weights = new Float32Array(READINGS.length);
  const on = new Uint8Array(READINGS.length);
  const raw = Object.fromEntries(BLENDSHAPES.map((name) => [name, 0])) as B;
  const calibratedShapes = { ...raw };
  const baseline = { ...raw };
  const previous = { ...raw };
  let baselineFrames = 0;
  let headBase = { yaw: 0, pitch: 0, roll: 0 };
  let headSum = { yaw: 0, pitch: 0, roll: 0 };
  let lastTime = 0;
  let lastHead: HeadState | null = null;
  let headSpeed = 0;
  let change = 0;
  let lastActive = 0;
  // Events.
  let blinkOpen = true;
  let blinkStart = 0;
  let blinkMs = 0;
  let lastBlink = 0;
  let blinks = 0;
  const blinkTimes: number[] = [];
  let winks = 0;
  let winking = false;
  let smileStart = 0;
  let nods = 0;
  let shakes = 0;
  const nodSwing = { sign: 0, extreme: 0, time: 0, swings: 0 };
  const shakeSwing = { sign: 0, extreme: 0, time: 0, swings: 0 };
  const jawHistory: { time: number; value: number }[] = [];
  const peaks: { time: number; value: number }[] = [];
  const emotionOnset = new Map<string, number>();
  let micro = 0;
  let fps = 0;
  let pitchCovariance = 0;
  let lastMatrixPitch = 0;
  let lastGeometricPitch = 0;

  const set = (id: string, value: number) => {
    const position = index.get(id);
    if (position === undefined) return;
    const spec = READINGS[position];
    values[position] = value;
    weights[position] = clamp(Math.abs(value) / spec.range);
    on[position] = spec.threshold !== undefined && value >= spec.threshold ? 1 : 0;
  };

  // A head swing counts after reversing direction with enough amplitude;
  // two swings within 1.4 s make one nod or shake.
  const swing = (state: typeof nodSwing, velocity: number, angle: number, now: number) => {
    const sign = Math.abs(velocity) > 25 ? Math.sign(velocity) : 0;
    if (!sign) return false;
    if (state.sign && sign !== state.sign && Math.abs(angle - state.extreme) > 5) {
      state.swings = now - state.time < 1400 ? state.swings + 1 : 1;
      state.time = now;
      state.extreme = angle;
      state.sign = sign;
      if (state.swings >= 2) {
        state.swings = 0;
        return true;
      }
      return false;
    }
    if (!state.sign || sign === state.sign) state.extreme = angle;
    state.sign = sign;
    return false;
  };

  const update = (input: FaceInput, now: number) => {
    const { blendshapes, landmarks, matrix, width, height } = input;
    if (!blendshapes?.length || !landmarks?.length) return false;
    const elapsed = lastTime ? Math.max(1, now - lastTime) : 50;
    lastTime = now;
    fps += (1000 / elapsed - fps) * 0.1;
    for (const category of blendshapes) {
      if (category.categoryName in raw) raw[category.categoryName as BlendshapeName] = category.score;
    }

    // Head pose: matrix magnitudes, signed so that L/R follow the subject's
    // own left and right (as the blendshapes do) and chin up is positive.
    const point = (i: number) => landmarks[i];
    const nose = point(1);
    const eyeL = point(263); // subject's left eye outer corner (image right)
    const eyeR = point(33);
    const mouthTop = point(13);
    const pixel = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
    const eyeSpan = Math.max(1, pixel(eyeL, eyeR));
    const eyeMidX = (eyeL.x + eyeR.x) / 2;
    const eyeMidY = (eyeL.y + eyeR.y) / 2;
    const geometricYaw = (nose.x - eyeMidX) * width / eyeSpan;
    const geometricPitch = ((mouthTop.y + eyeMidY) / 2 - nose.y) * height / eyeSpan;
    const matrixHead = matrix && matrix.length >= 16 ? headFromMatrix(matrix) : null;
    const rawHead = {
      yaw: matrixHead ? Math.abs(matrixHead.yaw) * Math.sign(geometricYaw || 1) : geometricYaw * 90,
      pitch: matrixHead ? matrixHead.pitch : geometricPitch * 90,
      roll: degrees(Math.atan2((eyeL.y - eyeR.y) * height, (eyeL.x - eyeR.x) * width)),
      distance: matrixHead ? matrixHead.distance : 6.3 * width * 0.9 / eyeSpan,
    };

    if (baselineFrames < CALIBRATION_FRAMES) {
      baselineFrames += 1;
      for (const name of BLENDSHAPES) baseline[name] += (raw[name] - baseline[name]) / baselineFrames;
      headSum = { yaw: headSum.yaw + rawHead.yaw, pitch: headSum.pitch + rawHead.pitch, roll: headSum.roll + rawHead.roll };
      headBase = { yaw: headSum.yaw / baselineFrames, pitch: headSum.pitch / baselineFrames, roll: headSum.roll / baselineFrames };
    }
    for (const name of BLENDSHAPES) {
      calibratedShapes[name] = clamp((raw[name] - baseline[name]) / Math.max(0.2, 1 - baseline[name]));
    }
    // The matrix pitch sign is not documented; learn it from the landmark
    // reading (nose tip rising between eyes and mouth = chin up).
    const pitchDelta = rawHead.pitch - headBase.pitch;
    if (matrixHead) {
      pitchCovariance = pitchCovariance * 0.98 + (matrixHead.pitch - lastMatrixPitch) * (geometricPitch - lastGeometricPitch);
      lastMatrixPitch = matrixHead.pitch;
      lastGeometricPitch = geometricPitch;
    }
    const head: HeadState = {
      yaw: rawHead.yaw - headBase.yaw,
      pitch: matrixHead && pitchCovariance < 0 ? -pitchDelta : pitchDelta,
      roll: rawHead.roll - headBase.roll,
      distance: rawHead.distance,
    };

    CONDITIONS.forEach((condition) => set(condition.id, condition.read(calibratedShapes, head)));
    for (const name of BLENDSHAPES) set(name, raw[name]);

    // Head.
    set("yaw", head.yaw);
    set("pitch", head.pitch);
    set("roll", head.roll);
    set("distance", head.distance);
    set("face-x", clamp((0.5 - nose.x) * 2, -1, 1));
    set("face-y", clamp((0.5 - nose.y) * 2, -1, 1));
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const landmark of landmarks) {
      if (landmark.x < minX) minX = landmark.x;
      if (landmark.x > maxX) maxX = landmark.x;
      if (landmark.y < minY) minY = landmark.y;
      if (landmark.y > maxY) maxY = landmark.y;
    }
    set("face-fill", clamp((maxX - minX) * (maxY - minY)));
    if (lastHead) {
      const seconds = elapsed / 1000;
      const yawVelocity = (head.yaw - lastHead.yaw) / seconds;
      const pitchVelocity = (head.pitch - lastHead.pitch) / seconds;
      const rollVelocity = (head.roll - lastHead.roll) / seconds;
      headSpeed += (Math.hypot(yawVelocity, pitchVelocity, rollVelocity) - headSpeed) * 0.3;
      if (swing(nodSwing, pitchVelocity, head.pitch, now)) nods += 1;
      if (swing(shakeSwing, yawVelocity, head.yaw, now)) shakes += 1;
    }
    lastHead = head;
    set("head-speed", headSpeed);
    set("nods", nods);
    set("shakes", shakes);

    // Dynamics.
    let energy = 0;
    let delta = 0;
    for (const name of BLENDSHAPES) {
      energy += calibratedShapes[name];
      delta += Math.abs(raw[name] - previous[name]);
      previous[name] = raw[name];
    }
    energy = clamp(energy / BLENDSHAPES.length * 6);
    change += (delta / (elapsed / 1000) - change) * 0.25;
    if (change > 1.2 || headSpeed > 30) lastActive = now;
    const c = calibratedShapes;
    const valence = clamp(
      both(c, "mouthSmile") * 1.3 + both(c, "cheekSquint") * 0.4
        - both(c, "mouthFrown") * 1.2 - both(c, "browDown") * 0.7 - both(c, "noseSneer") * 0.8 - both(c, "mouthPress") * 0.4 - c.browInnerUp * 0.3,
      -1, 1,
    );
    const arousal = clamp(both(c, "eyeWide") * 0.8 + c.jawOpen * 0.8 + both(c, "browOuterUp") * 0.5 + c.browInnerUp * 0.3 + both(c, "mouthStretch") * 0.5 + headSpeed / 200);
    let asymmetry = 0;
    let pairs = 0;
    for (const name of BLENDSHAPES) {
      if (!name.endsWith("Left")) continue;
      const right = name.replace(/Left$/, "Right") as BlendshapeName;
      if (!(right in raw)) continue;
      asymmetry += Math.abs(c[name] - c[right]);
      pairs += 1;
    }
    asymmetry = clamp(asymmetry / Math.max(1, pairs) * 5);
    set("energy", energy);
    set("valence", valence);
    set("arousal", arousal);
    set("asymmetry", asymmetry);
    set("neutral", clamp(1 - energy * 1.4 - headSpeed / 150));
    set("change", change);
    set("stillness", (now - lastActive) / 1000);

    jawHistory.push({ time: now, value: raw.jawOpen });
    while (jawHistory.length && now - jawHistory[0].time > 1200) jawHistory.shift();
    const jawMean = jawHistory.reduce((sum, sample) => sum + sample.value, 0) / jawHistory.length;
    const jawDeviation = Math.sqrt(jawHistory.reduce((sum, sample) => sum + (sample.value - jawMean) ** 2, 0) / jawHistory.length);
    set("talking", ramp(jawDeviation, 0.02, 0.09));

    const closedBoth = Math.min(raw.eyeBlinkLeft, raw.eyeBlinkRight);
    if (blinkOpen && closedBoth > 0.5) {
      blinkOpen = false;
      blinkStart = now;
    } else if (!blinkOpen && closedBoth < 0.3) {
      blinkOpen = true;
      const duration = now - blinkStart;
      if (duration < 600) {
        blinks += 1;
        blinkMs = duration;
        blinkTimes.push(now);
      }
      lastBlink = now;
    }
    while (blinkTimes.length && now - blinkTimes[0] > 60_000) blinkTimes.shift();
    if (!lastBlink) lastBlink = now;
    set("blinks", blinks);
    set("blink-rate", blinkTimes.length * 60_000 / Math.min(60_000, Math.max(5_000, now - (blinkTimes[0] ?? now))));
    set("blink-ms", blinkMs);
    set("since-blink", blinkOpen ? (now - lastBlink) / 1000 : 0);

    const wink = Math.max(values[index.get("wink-l")!], values[index.get("wink-r")!]);
    if (!winking && wink > 0.6) {
      winking = true;
      winks += 1;
    } else if (winking && wink < 0.3) winking = false;
    set("winks", winks);

    const smile = values[index.get("smile")!];
    if (smile >= CONDITION_THRESHOLD) smileStart ||= now;
    else smileStart = 0;
    set("smile-held", smileStart ? (now - smileStart) / 1000 : 0);

    // A micro-expression: an emotion that rises past 0.45 and falls back
    // within half a second.
    let peak = 0;
    for (const id of EMOTIONS) {
      const value = values[index.get(id)!];
      peak = Math.max(peak, value);
      const onset = emotionOnset.get(id);
      if (value > 0.45 && onset === undefined) emotionOnset.set(id, now);
      else if (value < 0.25 && onset !== undefined) {
        if (now - onset < 500) micro += 1;
        emotionOnset.delete(id);
      }
    }
    peaks.push({ time: now, value: peak });
    while (peaks.length && now - peaks[0].time > 5000) peaks.shift();
    set("micro", micro);
    set("peak", peaks.reduce((max, sample) => Math.max(max, sample.value), 0));
    set("fps", fps);

    // Landmark geometry, normalised by the eye span so distance cancels.
    const ratio = (a: number, b: number, c: number, d: number) => pixel(point(a), point(b)) / Math.max(1, pixel(point(c), point(d)));
    set("ear-l", ratio(386, 374, 263, 362));
    set("ear-r", ratio(159, 145, 33, 133));
    set("mar", ratio(13, 14, 61, 291));
    set("mouth-width", pixel(point(61), point(291)) / eyeSpan);
    set("brow-l-h", pixel(point(334), point(386)) / eyeSpan);
    set("brow-r-h", pixel(point(105), point(159)) / eyeSpan);
    set("corner-tilt", ((point(61).y - point(291).y) * height) / eyeSpan);
    set("face-aspect", pixel(point(10), point(152)) / Math.max(1, pixel(point(234), point(454))));
    return true;
  };

  const lose = (now: number) => {
    lastHead = null;
    lastTime = now;
    smileStart = 0;
    for (let position = 0; position < READINGS.length; position += 1) {
      const spec = READINGS[position];
      if (spec.group === "condition" || spec.group === "raw") {
        values[position] = 0;
        weights[position] = 0;
        on[position] = 0;
      }
    }
  };

  const recalibrate = () => {
    baselineFrames = 0;
    for (const name of BLENDSHAPES) baseline[name] = 0;
    headSum = { yaw: 0, pitch: 0, roll: 0 };
  };

  return { values, weights, on, calibrated: () => baselineFrames >= CALIBRATION_FRAMES, update, lose, recalibrate };
}

export function formatReading(spec: ReadingSpec, value: number) {
  switch (spec.unit) {
    case "pct": return String(Math.round(value * 100));
    case "deg": return `${Math.round(value)}°`;
    case "cm": return `${Math.round(value)}cm`;
    case "count": return String(Math.round(value));
    case "rate": return String(Math.round(value));
    case "hz": return String(Math.round(value));
    case "sec": return value < 10 ? value.toFixed(1) : String(Math.round(value));
    case "ms": return String(Math.round(value));
    case "ratio": return value.toFixed(2);
    case "signed": return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}`;
  }
}
