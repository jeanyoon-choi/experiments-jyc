// The goldfish's feedback into the web. Apart from schema.ts so that the presets (presets/families.ts) load without
// the renderer (node --test).

import { ATTENDED_QUALITY } from "../web/model.ts";

/**
 * How much the goldfish's watching feeds back into the web (user, 2026-10-22:
 * by default it is two orders below the quality's own noise). 품질에 주는
 * 영향 scales it; 영향 상한 is the most log quality watching can give a page
 * above its group mean; 무리 크기 반영 at 0 shares one school's effect among
 * its fish (more fish, the same total), at 1 lets every fish count alone
 * (380 fish, about 13 times the effect). The defaults are the earlier behaviour.
 */
export type Feedback = { influence: number; ceiling: number; perFish: number };

export const FEEDBACK_DEFAULTS: Feedback = { influence: 0.52, ceiling: ATTENDED_QUALITY, perFish: 0 };
