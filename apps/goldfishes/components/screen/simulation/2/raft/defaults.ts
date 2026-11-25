// The raft's own constants (they were in settings.ts, which brought the look, the panels' tables and every preset in
// under the layout).

/** Share of the field's area that all pages together cover; area = displayed rank × this. 0.4 (user, 2026-10-12; /2 keeps 0.3). */
export const AREA_BUDGET = 0.4;
/** createRankedWeb's default seed. */
export const DEFAULT_SEED = 0x2545f491;
/** Two echo chambers from the start (user, 2026-10-11); bubble/2 starts with one web. */
export const DEFAULT_GROUPS = 2;
