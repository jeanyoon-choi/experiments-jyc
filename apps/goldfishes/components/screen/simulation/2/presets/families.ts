// The presets themselves, as data: adding a family or a member is an edit here. Written over `base` (the opening's
// values, state/opening.ts) so that this file loads without the renderer.

import { OBJECT_DEFAULTS } from "../objects/kinds/parameters.ts"; // 오브제
import { LIQUID_DEFAULTS, MORPH_STYLES } from "../objects/morph/liquid.ts";
import type { Preset, PresetFamily, PresetPatch, PresetSlices } from "./model.ts";

/**
 * The presets, as the one list the interface steps through (user, 2026-11-18): a family is one question asked of the
 * parameters, its members numbered, and more of either are expected. A — 맥시멀 믹스, each member a step from one
 * before it (how the pages move on and set, then that movement in other colours); B — LSD, by colour. A member's
 * label is its address (B3), its name what it is.
 */
export function presetFamilies(base: PresetSlices): readonly PresetFamily[] {
  /**
   * A, 파생 (user, 2026-11-24; 움직임 A1–A4 from 2026-11-13, 섞음 색 C1 · C2 for a day): one line of descent, each member
   * the one named before it with one thing changed, so stepping through shows what each change does.
   *   A1 금붕어    — bubble/9's opening: a page turns when the fish have watched it;
   *   A2 시계 출렁 — A1 on the clock that never quite sets (bubble/9b's);
   *   A3 밤 도시   — A2 in other colours: 섞음 greyed, under the night city;
   *   A4 크게 쏠림 — A1 with larger objects and the rank concentrated;
   *   A5 파스텔    — A4 in other colours: 섞음 pale, under the loft, on white.
   * A1, A2 and A4 write only the values of MOVEMENT (every key of it): everything else stays as it is — the material
   * and look, the objects chosen, the fish and their count. A3 and A5 are their movement whole under a look that
   * starts from the opening's (`resets`), so each is its export whatever was chosen before, and the member chosen
   * after it gets the look back. Everything that is code and not a value (흐름 버블, 물듦, how a retarget carries its
   * melt …) is bubble/9's in all of them. bubble/8's values (시계 굳음, the first A1) were taken out on 2026-11-24;
   * its morph style stays in 오브제 (objects/morph/liquid.ts).
   */
  const MOVEMENT = {
    // 순위 쏠림 (floor) and 회복 are a member's too since 크게 쏠림 (2026-11-17).
    rates: { growth: base.rates.growth, burstAt: base.rates.burstAt, floor: base.rates.floor, recovery: base.rates.recovery },
    fish: { speed: base.fish.speed },
    feedback: { influence: base.feedback.influence, ceiling: base.feedback.ceiling },
    // The liquid, and which groups the pages are and how the objects are turned (오브제 → 페이지, 각도).
    objects: { style: 0, duration: MORPH_STYLES[0].duration as number, soften: LIQUID_DEFAULTS.soften, wobble: LIQUID_DEFAULTS.wobble, ripple: LIQUID_DEFAULTS.ripple, overshoot: LIQUID_DEFAULTS.overshoot, swell: LIQUID_DEFAULTS.swell, pages: OBJECT_DEFAULTS.pages as number, facing: OBJECT_DEFAULTS.facing as number, size: OBJECT_DEFAULTS.size as number, puff: OBJECT_DEFAULTS.puff as number },
    // 라프트 → 이웃 반사 and 버블 면적 (the visual panel's), and the ground's colour (배경): black (user, 2026-11-23),
    // so bubble/9 opens on black. The values of the look a member holds.
    visual: { neighbourReflection: base.visual.neighbourReflection as number, area: base.visual.area as number, background: [0, 0, 0] as readonly [number, number, number] },
  } satisfies PresetPatch;
  // A1 and A2 since 2026-11-18 (user): the bubbles' sizes as far apart as 크게 쏠림's (its 순위 쏠림), a larger raft
  // (버블 면적 1, was 0.8) and the objects turned the way they move. MOVEMENT itself stays the opening these were,
  // since the LSD family below is written as its difference from it.
  const ALIGNED = { rates: { ...MOVEMENT.rates, floor: 0.2106029267357361 }, objects: { ...MOVEMENT.objects, facing: 2 }, visual: { ...MOVEMENT.visual, area: 1 } } satisfies PresetPatch;
  const goldfish: Preset = { id: "a1", label: "A1", name: "금붕어", patch: { ...MOVEMENT, ...ALIGNED } };
  const clock: Preset = { id: "a2", label: "A2", name: "시계 출렁", patch: { ...MOVEMENT, ...ALIGNED, objects: { ...ALIGNED.objects, style: 1, duration: MORPH_STYLES[1].duration } } };
  // The user's own setup (exported 2026-11-17, bubble-9-2026-11-17T07-27-27-078Z.json), every value in which it
  // differs from the opening: more new pages, the rank far more concentrated (floor), a page swells further before
  // it bursts and recovers slower, the objects larger, more blown up and turned the way they move, 이웃 반사 1.
  const large: Preset = {
    id: "a4",
    label: "A4",
    name: "크게 쏠림",
    patch: {
      ...MOVEMENT,
      rates: { growth: 0.9, burstAt: 100, floor: 0.2106029267357361, recovery: 19 },
      objects: { ...MOVEMENT.objects, size: 1.5, puff: 2, facing: 2 },
      visual: { ...MOVEMENT.visual, neighbourReflection: 1 },
    },
  };
  // A member in other colours: states the user saved on 2026-11-22 and 23, in 맥시멀 믹스 as the opening is — what
  // differs is 섞음's own H · S · L (비주얼 → 색, every coat moved together), the room and the ground. `from`'s rates,
  // fish, feedback and objects whole, with the opening's 이동 중 (an LSD member's bubbles do not carry in).
  const recoloured = (id: string, label: string, name: string, from: Preset, visual: PresetPatch["visual"]): Preset => ({
    id,
    label,
    name,
    resets: ["visual"],
    patch: { ...from.patch, objects: { ...from.patch.objects, portions: OBJECT_DEFAULTS.portions as number }, visual },
  });
  const movement: readonly Preset[] = [
    goldfish,
    clock,
    // The coats greyed (S 0.32, L 0.72) under the night city, 버블 면적 1, on black. (bubble-9-2026-11-23T06-57-06-789Z.json)
    recoloured("a3", "A3", "밤 도시", clock, { background: [0, 0, 0], mixSaturation: 0.32, mixLightness: 0.72, photo: 3, area: 1 }),
    large,
    // The coats pale (H +19, S 0.86, L 0.89) under the loft at 1, 이웃 반사 1, on white as saved. Two files of the same
    // values. (bubble-9-2026-11-22T11-21-48-632Z.json, …T11-30-30-931Z.json)
    recoloured("a5", "A5", "파스텔", large, { background: [1, 1, 1], mixHue: 19, mixSaturation: 0.86, mixLightness: 0.89, photo: 0, photoStrength: 1, neighbourReflection: 1 }),
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
    { letter: "A", label: "맥시멀 믹스", items: movement },
    { letter: "B", label: "LSD", items: lsds },
  ];
}

/** bubble/9 opens on A1 (the family first in the list, this member of it). */
export const OPENING_PRESET = 0;
