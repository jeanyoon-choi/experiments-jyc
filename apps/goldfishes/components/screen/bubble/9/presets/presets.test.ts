// The presets' behaviour, pinned. The digests and the base below were recorded from the implementation before the
// presets became one model (2026-11-18: settings.ts SETUPS · TRIALS, index.tsx chooseSetup · chooseTrial): a refactor
// must leave them as they are; a deliberate change of a preset's values updates its digest (printed on failure).
// The base is the opening's values as plain data (state/opening.ts needs the renderer, which node does not load).

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { OBJECT_DEFAULTS } from "../objects/kinds/parameters.ts";
import { OPENING_PRESET, presetFamilies } from "./families.ts";
import { applyPreset, matchPreset, type Preset, type PresetSlices, type PresetState } from "./model.ts";

const BASE = {
  rates: { growth: 0.85, volatility: 1.5, floor: 16.709682421671808, dynamics: 1, burstAt: 80, recovery: 10 },
  fish: { scale: 0.65, speed: 3, follow: 0.6, novelty: 1, habituation: 1.75, span: 0.5, schooling: 2, patrol: 1 },
  feedback: { influence: 20, ceiling: 9.1, perFish: 0 },
  objects: OBJECT_DEFAULTS,
  // prettier-ignore
  visual: {"lightColour":[1,1,1],"background":[1,1,1],"coating":[0.78,0.77,0.75],"coatingMix":1,"mixHue":0,"mixDepth":1,"mixSaturation":1,"mixLightness":0.5,"exposure":0.9,"metalness":1,"roughness":0.02,"clearcoat":0.2,"variety":0.15,"viewTilt":0.4,"lightTurn":0.1,"photo":2,"photoStrength":1.2,"keyStrength":1.2,"keySize":0.3,"shadowLift":0.05,"groundLight":0.8,"edgeShadow":0.3,"colourBleed":0,"neighbourReflection":0.85,"crease":0.5,"material":7,"filmThickness":900,"filmColour":0.2,"filmSwirl":1,"filmFlow":1,"filmBody":0.15,"filmLens":1,"filmDye":0.7,"filmSheen":0.03,"filmEdge":0.9,"filmDome":0.45,"filmRipple":0.9,"filmRound":0.85,"plasterSheen":0.03,"plasterTranslucency":0.1,"plasterOcclusion":0.85,"plasterGrain":0.5,"stoneMarble":0,"stoneWarmth":0.25,"stoneScatter":0.5,"stoneOcclusion":0.85,"stoneDust":0.3,"stoneAge":0.4,"stoneSeam":0.2,"stoneUnfinished":0.55,"stoneChisel":0.7,"stonePolish":0.6,"stoneVein":0.2,"glassIor":1.5,"glassDispersion":0.25,"glassAbsorb":0.35,"glassColour":1,"glassFrost":0,"glassFlags":0.85,"glassBase":0.15,"serumHue":0.63,"serumChroma":0.85,"serumDensity":2.2,"serumMurk":0.18,"serumCoat":0,"serumIor":1.38,"serumBase":0.8,"serumFlags":0.3,"serumCaustic":0.9,"serumSwirl":0.5,"serumHaze":0.05,"serumBubbles":0.6,"serumBubbleSize":1,"serumGloss":1,"serumBox":0.7,"serumMeniscus":0.6,"serumWobble":0.5,"serumFlow":1,"mixMetal":0.38,"mixMatte":0.42,"mixPalette":2,"mixSpread":0.4,"mixParts":0,"mixGrain":0.6,"mixCrackle":0.5,"mixSeed":0,"hmrStyle":0,"hmrPalette":1,"hmrRough":0.5,"hmrSpread":0,"hmrAmbient":0.3,"hmrLight":3,"hmrKey":0,"hmrSeams":0.45,"printRegion":0,"printKind":0,"printScale":0.7,"printScraps":3,"printWrap":1,"printGloss":0.7,"printAge":0.5,"printCrumple":0.4,"printTint":0,"printSeed":0,"lsdBreath":0.6,"lsdTrail":0.35,"lsdSplit":0.6,"lsdDrift":1,"lsdPearl":0.5,"lsdSaturation":1.35,"lsdMirror":0.8,"lsdSpeed":1,"lsdCoat":0,"lsdMelt":0,"lsdEcho":0,"lsdSolar":0,"lsdCycle":0,"area":0.8,"portions":1.95,"flow":1},
} as unknown as PresetSlices;

const FAMILIES = presetFamilies(BASE);
const [MOVEMENT, LSD] = FAMILIES.map((family) => family.items) as [readonly Preset[], readonly Preset[]];
const ALL = [...MOVEMENT, ...LSD];
/** A's members that write the movement alone, and those that are one of them in other colours (`resets`). */
const PLAIN = MOVEMENT.filter((preset) => !preset.resets);
const MIXES = MOVEMENT.filter((preset) => preset.resets);
const [GOLDFISH, CLOCK, NIGHT, LARGE, PASTEL] = MOVEMENT as [Preset, Preset, Preset, Preset, Preset];

const apply = (state: PresetState, preset: Preset) => applyPreset(state, preset, BASE);
const match = (state: PresetState) => matchPreset(state, FAMILIES, BASE);
/** bubble/9 as it opens: A1 over the base. */
const opening = () => apply({ ...BASE, owing: null }, MOVEMENT[OPENING_PRESET]!);
const slices = ({ rates, fish, feedback, objects, visual }: PresetSlices) => ({ rates, fish, feedback, objects, visual });

/** The object keys a preset writes (the rest are the catalogue's kinds, which no preset holds). */
const OBJECT_KEYS = ["style", "duration", "soften", "wobble", "ripple", "overshoot", "swell", "pages", "facing", "size", "puff", "portions"];
const sorted = (value: unknown): unknown =>
  Array.isArray(value) ? value.map(sorted) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted((value as Record<string, unknown>)[key])])) : value;
function digest(state: PresetSlices) {
  const objects = Object.fromEntries(OBJECT_KEYS.map((key) => [key, (state.objects as Record<string, unknown>)[key]]));
  return createHash("sha256").update(JSON.stringify(sorted({ ...slices(state), objects }))).digest("hex").slice(0, 16);
}

// A1–A5 were a2, a3, c2, a4, c1 until 2026-11-24 (renamed; the values are those recorded then).
const RECORDED: Record<string, string> = {
  a1: "38f838994da9fdb5",
  a2: "708afe8aba31edb9",
  a3: "2df203d15c2ba83f",
  a4: "0cefd254c49165be",
  a5: "abe71accc63739de",
  b1: "7b4429a458cf8ad4",
  b2: "e4a53694cfdfdf6f",
  b3: "dc0f3f156270bc88",
  b4: "bd904274ff2982e1",
};

test("the list is A1 … A5, B1 … B4, opening on A1", () => {
  assert.deepEqual(ALL.map((preset) => preset.label), ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4"]);
  assert.deepEqual(ALL.map((preset) => preset.name), ["금붕어", "시계 출렁", "밤 도시", "크게 쏠림", "파스텔", "무지개", "푸른 금속", "초록 바닥", "노랑 바닥"]);
  assert.equal(match(opening()), GOLDFISH);
  assert.equal(opening().visual.area, 1);
  assert.equal(opening().objects.facing, 2);
});

test("every preset, chosen from the opening, is the one the values then are, with the values recorded", () => {
  for (const preset of ALL) {
    const state = apply(opening(), preset);
    assert.equal(match(state), preset, preset.label);
    assert.equal(digest(state), RECORDED[preset.id], `${preset.label}: ${digest(state)}`);
  }
});

test("the base is the opening before A2: an LSD preset starts from 버블 면적 0.8, not A1's 1", () => {
  const state = apply(opening(), LSD[0]!);
  assert.equal(state.visual.area, 0.8);
  assert.equal(state.visual.material, 10);
  assert.equal(state.objects.portions, 0);
  assert.equal(state.owing, LSD[0]);
});

test("A after B restores the base look and the portions: as if A had been chosen from the opening", () => {
  for (const b of LSD) {
    for (const a of MOVEMENT) {
      const state = apply(apply(opening(), b), a);
      assert.deepEqual(slices(state), slices(apply(opening(), a)), `${b.label} → ${a.label}`);
      assert.deepEqual(state.visual, { ...BASE.visual, ...a.patch.visual });
      assert.equal(state.objects.portions, OBJECT_DEFAULTS.portions);
      assert.equal(state.owing, a.resets ? a : null);
      assert.equal(match(state), a);
    }
  }
});

test("B after B carries nothing over", () => {
  for (const first of LSD) {
    for (const second of LSD) assert.deepEqual(slices(apply(apply(opening(), first), second)), slices(apply(opening(), second)), `${first.label} → ${second.label}`);
  }
});

test("a plain A after a plain A writes its own keys only: a look chosen in between stays", () => {
  const moved = { ...opening(), visual: { ...opening().visual, roughness: 0.33, material: 3 } };
  const state = apply(moved, LARGE);
  assert.equal(state.visual.roughness, 0.33);
  assert.equal(state.visual.material, 3);
  assert.equal(match(state), LARGE);
});

test("leaving B is known by its having been chosen, not by its values", () => {
  // A slider moved, or the whole look replaced (처음 값으로, 기본값 3, a 연출): still B's to give back.
  const inB = apply(opening(), LSD[1]!);
  const moved = { ...inB, visual: { ...inB.visual, roughness: 0.33 } };
  assert.equal(match(moved), null);
  assert.deepEqual(apply(moved, GOLDFISH).visual, { ...BASE.visual, ...GOLDFISH.patch.visual });
  const replaced = { ...inB, visual: BASE.visual };
  assert.equal(replaced.owing, LSD[1]);
  assert.equal(apply(replaced, GOLDFISH).objects.portions, OBJECT_DEFAULTS.portions);
  // And once A has been chosen, nothing is owed any more.
  const inA = apply(inB, GOLDFISH);
  const coloured = { ...inA, visual: { ...inA.visual, material: 10 }, objects: { ...inA.objects, portions: 0 } };
  const next = apply(coloured, CLOCK);
  assert.equal(next.visual.material, 10);
  assert.equal(next.objects.portions, 0);
});

test("B is told first: B1 holds A4's rates and objects too", () => {
  const state = apply(apply(opening(), LARGE), LSD[0]!);
  assert.equal(match(state), LSD[0]);
  assert.equal(match({ ...state, fish: { ...state.fish, speed: 1 } }), LSD[0]);
});

test("a value moved is no preset; a slice not written is the same object", () => {
  const state = opening();
  assert.equal(match({ ...state, fish: { ...state.fish, speed: 1 } }), null);
  assert.equal(match({ ...state, rates: { ...state.rates, volatility: 0.5 } }), GOLDFISH);
  const lsd = apply(state, LSD[2]!);
  assert.equal(lsd.fish, state.fish);
  assert.equal(lsd.feedback, state.feedback);
  assert.notEqual(lsd.visual, state.visual);
});

test("A3 and A5 are their export whole: the member before them, under a look from the base", () => {
  const [night, pastel] = [NIGHT, PASTEL].map((preset) => apply(opening(), preset)) as [PresetState, PresetState];
  // A3: A2's movement (the clock that never quite sets).
  assert.deepEqual({ ...night.rates }, { ...apply(opening(), CLOCK).rates });
  assert.equal(night.objects.style, 1);
  assert.deepEqual(night.visual, { ...BASE.visual, background: [0, 0, 0], mixSaturation: 0.32, mixLightness: 0.72, photo: 3, area: 1 });
  // A5: A4's movement; the base's 버블 면적, and none of the others' black ground.
  assert.deepEqual({ ...pastel.rates }, { ...apply(opening(), LARGE).rates });
  assert.equal(pastel.objects.size, 1.5);
  assert.deepEqual(pastel.visual, { ...BASE.visual, background: [1, 1, 1], mixHue: 19, mixSaturation: 0.86, mixLightness: 0.89, photo: 0, photoStrength: 1, neighbourReflection: 1 });
  for (const state of [night, pastel]) assert.equal(state.objects.portions, OBJECT_DEFAULTS.portions);
});

test("A3 and A5 carry nothing over, from any preset, and the member after them gets the look back", () => {
  assert.deepEqual(MIXES, [NIGHT, PASTEL]);
  for (const mix of MIXES) {
    for (const before of ALL) assert.deepEqual(slices(apply(apply(opening(), before), mix)), slices(apply(opening(), mix)), `${before.label} → ${mix.label}`);
    for (const a of PLAIN) {
      const state = apply(apply(opening(), mix), a);
      assert.deepEqual(slices(state), slices(apply(opening(), a)), `${mix.label} → ${a.label}`);
      assert.equal(state.owing, null);
      assert.equal(match(state), a);
    }
  }
});

test("stepping through the whole list and round again, every stop is told as itself", () => {
  let state = opening();
  for (const preset of [...ALL, ...ALL]) {
    state = apply(state, preset);
    assert.equal(match(state), preset, preset.label);
  }
});
