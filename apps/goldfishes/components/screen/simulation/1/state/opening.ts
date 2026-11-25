// What bubble/9 opens with, and what 기본값 3 and the presets' base go back to.

import { FISH_DEFAULTS, type FishPaletteId, type FishParameters } from "../fish/goldfish";
import { LIFE_DEFAULTS } from "../fish/lifecycle";
import { CHROME, LOOK_BASE, materialLook } from "../looks/base";
import { OBJECT_DEFAULTS } from "../objects/kinds/parameters"; // 오브제
import { MIX_MATERIAL } from "../render/materials/mix";
import { DEFAULT_DAMPING, DEFAULT_PARAMETERS, FLOOR_RANGE } from "../web/model";
import { FEEDBACK_DEFAULTS, type Feedback, type Rates, type Visual } from "./schema";

/**
 * 기본값 3 (user, 2026-10-20): the set read off scc bubble/3 — one web of a
 * thousand pages, a fast school — with bubble/2's look (연출 갤러리). bubble/4
 * opens with it; 기본값 3 in the goldfish panel brings every panel back to it.
 */
// The opening is bubble/8 as the user tuned it (user, 2026-11-06; components/screen/bubble/docs/9.md "Opening"): only the values
// that differ from bubble/9's are set here, each with what it was. bubble/9 itself opens on preset A1 over these
// (presets/families.ts), which the presets' base is not: 버블 면적 0.8 and 각도 0 here.
export const OPENING = {
  rates: {
    // 새 페이지 0.85 (was 0.3): the web keeps growing new pages to move between.
    growth: 0.85,
    volatility: 1.5,
    // 순위 쏠림 0.03, as bubble/5.
    floor: FLOOR_RANGE[0] * (FLOOR_RANGE[1] / FLOOR_RANGE[0]) ** (1 - 0.03),
    // bubble/6: bubble/5's motion, the extreme bursting (web/model.ts); 터지는 크기 80 (was 50): a watched page swells further before it bursts.
    dynamics: DEFAULT_PARAMETERS.dynamics,
    burstAt: 80,
    recovery: DEFAULT_PARAMETERS.recovery,
  } satisfies Rates,
  damping: DEFAULT_DAMPING,
  // One bubble (artist, 2026-11-25; 200 earlier the same day, for a computer that could not play bubble/9's 800):
  // the rest come from the audience's strokes.
  pages: 1,
  groups: 1,
  // bubble/8: bubble/7's opening (크롬: its white ground, studio, light and view) on 맥시멀 믹스; 버블 면적 0.8 (user,
  // 2026-11-07; bubble/8 0.6, was 0.55). 팔레트 2 (코팅색) with 색 섞음, so every sphere and object takes its own
  // coat, and 부분 나눔 0 (user, 2026-11-11; were 팔레트 0 맥시멀, one coat, 부분 나눔 0.25).
  visual: { ...LOOK_BASE, ...CHROME, ...materialLook(MIX_MATERIAL, MIX_MATERIAL.looks[0]!.look), area: 0.8, mixPalette: 2, coatingMix: 1, mixParts: 0 } satisfies Visual,
  fishCount: 380,
  // 속도 3 (was 2.2).
  fish: { ...FISH_DEFAULTS, scale: 0.65, speed: 3, follow: 0.6, novelty: 1, habituation: 1.75, span: 0.5, schooling: 2, patrol: 1 } satisfies FishParameters,
  fishPalette: "rose" as FishPaletteId,
  // 금붕어 → 버블: 품질에 주는 영향 20 and 영향 상한 9.1 (were 0.52, 1.5): the pages the fish watch swell and burst.
  feedback: { ...FEEDBACK_DEFAULTS, influence: 20, ceiling: 9.1 } satisfies Feedback,
  life: LIFE_DEFAULTS,
  objects: OBJECT_DEFAULTS, // 오브제
};
