// Author-only options for the spacetime/1 screen (bottom-right control).
// Operations can be isolated to judge each one against the plain clip.

export type SpacetimeOperations = {
  /** O1: the shared time circle. Off = the clip's own loop. */
  compact: boolean;
  /** O2: the observer chain. Off = the rest frame. */
  boost: boolean;
  /** O3: masses slow local clocks. Off = no lag, no lensing. */
  mass: boolean;
  /** O3's spatial part. Off = time dilation only. */
  lens: boolean;
};

export type SpacetimeScreenSettings = {
  operations: SpacetimeOperations;
  clipId: string;
};

export const defaultSpacetimeOperations: SpacetimeOperations = {
  compact: true,
  boost: true,
  mass: true,
  lens: true,
};
