// Client-side mirror of the moving-image/1 snapshot, plus the plane math and local
// runtime the relay also uses (the screen falls back to it while offline).
export {
  IDENTITY,
  bodyDelta,
  boxHalf,
  fromAxisAngle,
  fromDeviceOrientation,
  multiply,
  normalize,
  planeAxes,
  PIVOTS,
  planeCentre,
  rotate,
  slerp,
} from "@/socket/experiments/moving-image/1/plane.mjs";
export {
  CUBISM_RATES,
  createCubismRuntime,
  facePlane,
  setClip,
  setPivot,
  setRate,
  snapshotCubism,
  turnPlane,
} from "@/socket/experiments/moving-image/1/model.mjs";

export type Quaternion = [number, number, number, number];

export type CubismPivot = "now" | "cube";

export type CubismSnapshot = {
  /** The cut plane: w, x, y, z. Identity = ordinary playback. */
  orientation: Quaternion;
  /** Seconds into the clip at serverTime (unwrapped). */
  playhead: number;
  /** 1 forward, 0 still, -1 reverse. */
  rate: number;
  /** Clip chosen on the screen; null = the default clip. */
  clip: string | null;
  /** "now": turns about the present frame, time loops. "cube": Fels's sweep. */
  pivot: CubismPivot;
  serverTime: number;
};

/** A snapshot and the local clock (performance.now) at which it was taken. */
export type CubismReceived = { snapshot: CubismSnapshot; receivedAt: number };
