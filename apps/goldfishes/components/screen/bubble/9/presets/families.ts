// The presets themselves, as data: adding a family or a member is an edit here. Written over `base` (the opening's
// values, state/opening.ts) so that this file loads without the renderer.

import { GROUPS, groupBit, OBJECT_DEFAULTS } from "../objects/kinds/parameters.ts"; // 오브제
import { LIQUID_DEFAULTS, MORPH_STYLES } from "../objects/morph/liquid.ts";
import { FEEDBACK_DEFAULTS } from "../state/feedback.ts";
import { DEFAULT_PARAMETERS } from "../web/model.ts";
import type { Preset, PresetFamily, PresetPatch, PresetSlices } from "./model.ts";

/**
 * The presets, as the one list the interface steps through (user, 2026-11-18): a family is one question asked of the
 * parameters, its members numbered, and more of either are expected. A — how the pages move on and set, in 맥시멀
 * 믹스; B — LSD, by colour. A member's label is its address (B3), its name what it is.
 */
export function presetFamilies(base: PresetSlices): readonly PresetFamily[] {
  /**
   * A, 움직임 (user, 2026-11-13; A4 added 2026-11-17; they were 셋업 A · B · C · D until 2026-11-18): ways the bubbles
   * and the morphs behave, to go between in one screen. Only these values change; everything else stays as it is —
   * the material and look, the objects chosen, the fish and their count — and everything that is code and not a
   * value (흐름 버블, 물듦, how a retarget carries its melt …) is bubble/9's in all of them.
   *   A1 — bubble/8's values: pages turn on a 14 s clock in a quick morph that washes the detail out, few new pages, a
   *        page bursts sooner, the fish slower and hardly feeding the pages they watch;
   *   A2 — bubble/9's opening: a page turns when the fish have watched it;
   *   A3 — bubble/9b's: A2 on the clock that never quite sets.
   * Every member sets every key of MOVEMENT.
   */
  const MOVEMENT = {
    // 순위 쏠림 (floor) and 회복 are a member's too since A4 (2026-11-17).
    rates: { growth: base.rates.growth, burstAt: base.rates.burstAt, floor: base.rates.floor, recovery: base.rates.recovery },
    fish: { speed: base.fish.speed },
    feedback: { influence: base.feedback.influence, ceiling: base.feedback.ceiling },
    // The liquid, and which groups the pages are and how the objects are turned (오브제 → 페이지, 각도): A1 has its own (user, 2026-11-14).
    objects: { style: 0, duration: MORPH_STYLES[0].duration as number, soften: LIQUID_DEFAULTS.soften, wobble: LIQUID_DEFAULTS.wobble, ripple: LIQUID_DEFAULTS.ripple, overshoot: LIQUID_DEFAULTS.overshoot, swell: LIQUID_DEFAULTS.swell, pages: OBJECT_DEFAULTS.pages as number, facing: OBJECT_DEFAULTS.facing as number, size: OBJECT_DEFAULTS.size as number, puff: OBJECT_DEFAULTS.puff as number },
    // 라프트 → 이웃 반사 and 버블 면적 (the visual panel's), and the ground's colour (배경): black in every member (user,
    // 2026-11-23), so bubble/9 opens on black. The values of the look a member holds.
    visual: { neighbourReflection: base.visual.neighbourReflection as number, area: base.visual.area as number, background: [0, 0, 0] as readonly [number, number, number] },
  } satisfies PresetPatch;
  // A2 and A3 since 2026-11-18 (user): the bubbles' sizes as far apart as A4's (its 순위 쏠림), a larger raft (버블 면적
  // 1, was 0.8) and the objects turned the way they move, as A1's and A4's are. MOVEMENT itself stays the opening
  // these were, since the LSD family below is written as its difference from it.
  const ALIGNED = { rates: { ...MOVEMENT.rates, floor: 0.2106029267357361 }, objects: { ...MOVEMENT.objects, facing: 2 }, visual: { ...MOVEMENT.visual, area: 1 } } satisfies PresetPatch;
  const movement: readonly Preset[] = [
    {
      id: "a1",
      label: "A1",
      name: "시계 굳음",
      patch: {
        rates: { ...MOVEMENT.rates, growth: DEFAULT_PARAMETERS.growth, burstAt: DEFAULT_PARAMETERS.burstAt },
        fish: { speed: 2.2 },
        feedback: { influence: FEEDBACK_DEFAULTS.influence, ceiling: FEEDBACK_DEFAULTS.ceiling },
        // The user's own setup under A1 (exported 2026-11-14): the pages 테크 하이프 alone, the objects turned the way they move.
        objects: { ...MOVEMENT.objects, style: 2, duration: MORPH_STYLES[2].duration, soften: 3.2, wobble: 0.05, ripple: 0.35, overshoot: 0.18, swell: 0.85, pages: groupBit(GROUPS[0]!), facing: 2 },
        visual: MOVEMENT.visual,
      },
    },
    { id: "a2", label: "A2", name: "금붕어", patch: { ...MOVEMENT, ...ALIGNED } },
    { id: "a3", label: "A3", name: "시계 출렁", patch: { ...MOVEMENT, ...ALIGNED, objects: { ...ALIGNED.objects, style: 1, duration: MORPH_STYLES[1].duration } } },
    // The user's own setup (exported 2026-11-17, bubble-9-2026-11-17T07-27-27-078Z.json), every value in which it
    // differs from the opening: more new pages, the rank far more concentrated (floor), a page swells further before
    // it bursts and recovers slower, the objects larger, more blown up and turned the way they move, 이웃 반사 1.
    {
      id: "a4",
      label: "A4",
      name: "크게 쏠림",
      patch: {
        ...MOVEMENT,
        rates: { growth: 0.9, burstAt: 100, floor: 0.2106029267357361, recovery: 19 },
        objects: { ...MOVEMENT.objects, size: 1.5, puff: 2, facing: 2 },
        visual: { ...MOVEMENT.visual, neighbourReflection: 1 },
      },
    },
  ];

  /**
   * B1–B4, LSD (user, 2026-11-18; first 실험 E1–E4): states the user saved on 2026-11-17 and liked, to look through and
   * choose among; none is an opening. Each is the values in which its export differs from bubble/9's opening — the
   * web's rates, the look with 버블 면적, and the objects' 크기 · 부풂 · 각도 · 이동 중 — and choosing one starts those
   * from the opening again (`resets` for the look, LSD_FROM for the rest), so nothing of one carries into the next.
   * All four are in LSD (도파민); B2–B4 differ only in the light's and the ground's colours. In all four the portions
   * under way are bubbles (이동 중 0; user, 2026-11-18: not the opening's hearts — only the last export had it so). Six
   * were tried: the first was A4's values exactly, and the third (LSD pushed furthest over a black coat) was not to
   * the user's taste; both were taken out the same day and the rest renumbered.
   */
  const LSD_FROM = {
    rates: MOVEMENT.rates,
    objects: { size: OBJECT_DEFAULTS.size as number, puff: OBJECT_DEFAULTS.puff as number, facing: OBJECT_DEFAULTS.facing as number, portions: OBJECT_DEFAULTS.portions as number },
  };
  const lsd = (id: string, label: string, name: string, own: { rates: Partial<typeof LSD_FROM.rates>; visual: PresetPatch["visual"]; objects: Partial<typeof LSD_FROM.objects> }): Preset => ({
    id,
    label,
    name,
    resets: ["visual"],
    patch: { rates: { ...LSD_FROM.rates, ...own.rates }, visual: own.visual, objects: { ...LSD_FROM.objects, ...own.objects } },
  });
  const lsds: readonly Preset[] = [
    // A4's rates and objects in LSD (도파민): its breath, split, pearl, melt and solarisation turned up; 맥시멀's palette, on black (배경 검정: user, 2026-11-23; it was white). (bubble-9-2026-11-17T07-30-47-471Z.json)
    lsd("b1", "B1", "무지개", { rates: { burstAt: 100, floor: 0.2106029267357361, growth: 0.9, recovery: 19 }, visual: { background: [0, 0, 0], coatingMix: 0, lsdBreath: 1.2, lsdCycle: 0.5, lsdDrift: 3, lsdMelt: 0.6, lsdMirror: 0.6, lsdPearl: 1.4, lsdSaturation: 1.9, lsdSolar: 1, lsdSplit: 1.4, lsdTrail: 0.7, material: 10, mixPalette: 0, mixParts: 0.25 }, objects: { facing: 2, puff: 2, size: 1.5, portions: 0 } }),
    // LSD over a grey coat under a dim blue-grey light, the room bright (환경 사진 2.62), 버블 면적 1.2, the rank more concentrated still, on black (user, 2026-11-23). (bubble-9-2026-11-17T07-42-36-139Z.json)
    lsd("b2", "B2", "푸른 금속", { rates: { burstAt: 100, floor: 0.05, growth: 0.9, recovery: 19 }, visual: { background: [0, 0, 0], coating: [0.3, 0.3, 0.3], coatingMix: 0, lightColour: [0.34901960784313724, 0.4196078431372549, 0.592156862745098], lightTurn: 0.105, lsdBreath: 1.55, lsdCoat: 1, lsdCycle: 0.5, lsdDrift: 3, lsdMelt: 1.39, lsdMirror: 0.6, lsdPearl: 1.4, lsdSaturation: 1.9, lsdSolar: 1, lsdSpeed: 2.93, lsdSplit: 1.4, lsdTrail: 1.12, material: 10, mixPalette: 0, mixParts: 0.25, photoStrength: 2.62, area: 1.2 }, objects: { facing: 2, puff: 2, size: 1.5, portions: 0 } }),
    // B2 under a blue light on a green ground. (bubble-9-2026-11-17T07-48-29-402Z.json)
    lsd("b3", "B3", "초록 바닥", { rates: { burstAt: 100, floor: 0.05, growth: 0.9, recovery: 19 }, visual: { background: [0, 1, 0.34901960784313724], coating: [0.3, 0.3, 0.3], coatingMix: 0, lightColour: [0, 0.2823529411764706, 1], lightTurn: 0.105, lsdBreath: 1.55, lsdCoat: 1, lsdCycle: 0.5, lsdDrift: 3, lsdMelt: 1.39, lsdMirror: 0.6, lsdPearl: 1.4, lsdSaturation: 1.9, lsdSolar: 1, lsdSpeed: 2.93, lsdSplit: 1.4, lsdTrail: 1.12, material: 10, mixPalette: 0, mixParts: 0.25, photoStrength: 2.62, area: 1.2 }, objects: { facing: 2, puff: 2, size: 1.5, portions: 0 } }),
    // B2 under a red light on a pale yellow ground. (bubble-9-2026-11-17T07-53-30-035Z.json)
    lsd("b4", "B4", "노랑 바닥", { rates: { burstAt: 100, floor: 0.05, growth: 0.9, recovery: 19 }, visual: { background: [1, 0.9568627450980393, 0.47843137254901963], coating: [0.3, 0.3, 0.3], coatingMix: 0, lightColour: [1, 0, 0], lightTurn: 0.105, lsdBreath: 1.55, lsdCoat: 1, lsdCycle: 0.5, lsdDrift: 3, lsdMelt: 1.39, lsdMirror: 0.6, lsdPearl: 1.4, lsdSaturation: 1.9, lsdSolar: 1, lsdSpeed: 2.93, lsdSplit: 1.4, lsdTrail: 1.12, material: 10, mixPalette: 0, mixParts: 0.25, photoStrength: 2.62, area: 1.2 }, objects: { facing: 2, portions: 0, puff: 2, size: 1.5 } }),
  ];

  return [
    { letter: "A", label: "움직임", items: movement },
    { letter: "B", label: "LSD", items: lsds },
  ];
}

/** bubble/9 opens on A2 (the family first in the list, this member of it). */
export const OPENING_PRESET = 1;
