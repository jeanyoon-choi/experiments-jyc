// Client-side mirror of the cubism/2 snapshot, plus the geometry and local
// runtime the relay also uses (the screen falls back to it while offline).
export {
  addAmount,
  boxHalf,
  cubeAt,
  OPERATION_SPECS,
  OPERATIONS,
  presentDepth,
  presentPlaneZ,
  sliceAt,
} from "@/socket/experiments/cubism/2/geometry.mjs";
export {
  BEND_RATES,
  bend,
  createBendRuntime,
  flatten,
  setClip,
  setOperation,
  setRate,
  snapshotBend,
} from "@/socket/experiments/cubism/2/model.mjs";

export type BendOperation = "shear" | "cylinder" | "sphere" | "curvature" | "torus" | "flux";

export type BendAmount = [number, number];

export type BendSnapshot = {
  /** The operation the screen chose; phones change its amount. */
  operation: BendOperation;
  /** Every operation's amount; (0, 0) = flat = the ordinary video. */
  amounts: Record<BendOperation, BendAmount>;
  /** Seconds into the clip at serverTime (unwrapped). */
  playhead: number;
  /** 1 forward, 0 still, -1 reverse. */
  rate: number;
  /** Clip chosen on the screen; null = the default clip. */
  clip: string | null;
  serverTime: number;
};

/** A snapshot and the local clock (performance.now) at which it was taken. */
export type BendReceived = { snapshot: BendSnapshot; receivedAt: number };
