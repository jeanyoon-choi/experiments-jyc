// What the panels adjust: their defaults and the tables their controls are
// drawn from. Nothing here runs per frame.

import { LOOK_DEFAULTS, type Colour, type Look } from "./render/foam";
import { FISH_DEFAULTS, type FishPaletteId, type FishParameters } from "./fish/goldfish";
import { LIFE_DEFAULTS, type LifeParameters } from "./fish/lifecycle";
import { ATTENDED_QUALITY, DEFAULT_DAMPING, DEFAULT_PARAMETERS, FLOOR_RANGE } from "./web/model";
import type { SoundParameters } from "./sound/sound";
import { REACTION_DEFAULTS } from "./reactions/reactions"; // 반응
import { OBJECT_DEFAULTS } from "./objects/objects"; // 오브제

/** Share of the field's area that all pages together cover; area = displayed rank × this. 0.4 (user, 2026-10-12; /2 keeps 0.3). */
export const AREA_BUDGET = 0.4;
/** Portions carrying less than this share of the mean flow are not drawn (they would read as specks). */
export const LEAST_PORTION = 0.5;
export const MIN_PAGES = 20;
/** createRankedWeb's default seed. */
export const DEFAULT_SEED = 0x2545f491;
/** Two echo chambers from the start (user, 2026-10-11); bubble/2 starts with one web. */
export const DEFAULT_GROUPS = 2;

export type PanelId = "network" | "objects" | "visual" | "fish" | "life" | "sound";

/** A slider: key, label, range, step. */
export type SliderControl<Key extends string> = { key: Key; label: string; min: number; max: number; step: number };

// Visual

/** Everything the visual panel adjusts: the renderer's look plus the raft's own scale and flow. */
export type Visual = Look & { area: number; portions: number };

export const VISUAL_DEFAULTS: Visual = { ...LOOK_DEFAULTS, area: AREA_BUDGET, portions: LEAST_PORTION };

// 기본값 2 (user, 2026-10-11): the defaults (fish included) on a mid grey (#5e5e5e) instead of black; a button in the goldfish panel, not the default.
/** 기본값 (the goldfish panel's): bubble/1's black. */
export const FIRST_BACKGROUND: Colour = [0, 0, 0];
export const SECOND_BACKGROUND: Colour = [94 / 255, 94 / 255, 94 / 255];

export type NumericKey = { [K in keyof Visual]: Visual[K] extends number ? K : never }[keyof Visual];

/** A titled group of sliders in the visual panel. */
export type SliderGroup = { title: string; controls: readonly SliderControl<NumericKey>[] };

export const SLIDER_GROUPS: readonly SliderGroup[] = [
  {
    title: "재질",
    controls: [
      { key: "metalness", label: "금속성 (0 래커 · 1 금속)", min: 0, max: 1, step: 0.01 },
      { key: "roughness", label: "거칠기", min: 0, max: 1, step: 0.01 },
      { key: "clearcoat", label: "클리어코트", min: 0, max: 1, step: 0.01 },
      { key: "variety", label: "구슬마다 차이", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "빛",
    controls: [
      { key: "viewTilt", label: "시점 (0 위에서 · 1 옆에서)", min: 0, max: 1, step: 0.01 },
      { key: "lightTurn", label: "빛 방향", min: 0, max: 1, step: 0.005 },
      { key: "photoStrength", label: "환경 사진 밝기", min: 0, max: 3, step: 0.01 },
      { key: "keyStrength", label: "주광 세기", min: 0, max: 5, step: 0.05 },
      { key: "keySize", label: "주광 크기 (0 작고 선명 · 1 크고 부드럽게)", min: 0, max: 1, step: 0.01 },
      { key: "shadowLift", label: "어두운 곳 밝기", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "바닥",
    controls: [
      { key: "groundLight", label: "바닥 반사 (테두리)", min: 0, max: 2, step: 0.01 },
      { key: "edgeShadow", label: "가장자리 그림자 (0 없음)", min: 0, max: 1, step: 0.01 },
      { key: "colourBleed", label: "색 번짐 (0 없음)", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "라프트",
    controls: [
      { key: "neighbourReflection", label: "이웃 반사", min: 0, max: 1, step: 0.01 },
      { key: "crease", label: "맞닿은 틈", min: 0, max: 1, step: 0.01 },
      { key: "area", label: "버블 면적", min: 0.1, max: 0.6, step: 0.01 },
      { key: "portions", label: "흐름 버블 (적을수록 많이)", min: 0, max: 3, step: 0.05 },
      { key: "exposure", label: "노출", min: 0.3, max: 2.5, step: 0.01 },
    ],
  },
];

/** 환경: a photographed room's light (foam.ts LIGHT_FILES), or a portrait hung on the camera's side (FACE_ENVIRONMENT). */
export const PHOTO_ROOMS = [
  { mode: 0, label: "로프트" },
  { mode: 1, label: "흐린 하늘" },
  { mode: 2, label: "스튜디오" },
  { mode: 3, label: "밤 도시" },
  { mode: 4, label: "숲" },
  { mode: 5, label: "호숫가" },
  { mode: 6, label: "일론 머스크" },
] as const;

/** Coats; 섞음 gives each sphere one of five (magenta, yellow, blue, orange, red). */
export const COATINGS: readonly { id: string; label: string; colour: Colour | null }[] = [
  { id: "crimson", label: "크림슨", colour: [0.82, 0.04, 0.1] },
  { id: "magenta", label: "마젠타", colour: [0.92, 0.1, 0.48] },
  { id: "yellow", label: "옐로", colour: [1, 0.78, 0.1] },
  { id: "blue", label: "블루", colour: [0.08, 0.26, 0.95] },
  { id: "orange", label: "오렌지", colour: [1, 0.4, 0.06] },
  { id: "silver", label: "은색", colour: [0.78, 0.77, 0.75] },
  { id: "gold", label: "금색", colour: [1, 0.74, 0.32] },
  { id: "porcelain", label: "흰색", colour: [0.93, 0.89, 0.86] },
  { id: "mix", label: "섞음", colour: null },
];

export const COLOUR_CONTROLS = [
  { key: "lightColour", label: "빛" },
  { key: "background", label: "배경 (액체)" },
] as const;

export function toHex(colour: Colour) {
  return `#${colour.map((value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function fromHex(hex: string): Colour {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

// Goldfish

/** Unlike bubble/2 (no fish), the school is there from the start (user, 2026-10-11). */
export const DEFAULT_FISH_COUNT = 250;
export const DEFAULT_FISH_PALETTE: FishPaletteId = "instagram";
export const DEFAULT_INFLUENCE = 0.2;

export const FISH_CONTROLS: readonly SliderControl<keyof FishParameters>[] = [
  { key: "scale", label: "크기", min: 0.4, max: 2, step: 0.05 },
  { key: "speed", label: "속도", min: 0.25, max: 3, step: 0.05 },
  { key: "follow", label: "링크를 따라 헤엄칠 확률", min: 0, max: 1, step: 0.01 },
  { key: "novelty", label: "새 페이지에 끌림", min: 0, max: 3, step: 0.05 },
  { key: "habituation", label: "싫증", min: 0, max: 3, step: 0.05 },
  { key: "span", label: "주의 지속 (초)", min: 0.5, max: 8, step: 0.1 },
  { key: "schooling", label: "무리 짓기", min: 0, max: 2, step: 0.05 },
  { key: "patrol", label: "가장자리 오가기", min: 0, max: 2, step: 0.05 },
];

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

export const FEEDBACK_CONTROLS: readonly SliderControl<keyof Feedback>[] = [
  { key: "influence", label: "품질에 주는 영향", min: 0, max: 20, step: 0.01 },
  { key: "ceiling", label: "영향 상한", min: 0, max: 10, step: 0.1 },
  { key: "perFish", label: "무리 크기 반영 (0 나눠 갖기 · 1 한 마리씩)", min: 0, max: 1, step: 0.01 },
];

// Lifecycle

/** 생애주기's sliders (fish/lifecycle.ts); 켜기 · 끄기 is a pair of chips. */
export const LIFE_CONTROLS: readonly SliderControl<Exclude<keyof LifeParameters, "enabled">>[] = [
  { key: "lifespan", label: "수명 (컨텐츠를 볼 수 있는 시간, 초)", min: 2, max: 60, step: 0.5 },
  { key: "idleWear", label: "보지 않고 헤엄칠 때 닳는 정도", min: 0, max: 1, step: 0.01 },
  { key: "spread", label: "수명의 개체차", min: 0, max: 1, step: 0.01 },
  { key: "tintRate", label: "본 구슬 색으로 물드는 속도", min: 0, max: 3, step: 0.05 },
  { key: "fadeAt", label: "죽기 전 미리 회색이 되는 남은 기력 (0 죽는 순간)", min: 0, max: 0.8, step: 0.01 },
  { key: "sinkSpeed", label: "떨어지는 속도 (px/초)", min: 10, max: 500, step: 1 },
  { key: "crushDistance", label: "버블에 밀려 죽는 거리 (px, 0 끔)", min: 0, max: 60, step: 1 },
  { key: "waveEvery", label: "새로 오는 주기 (초)", min: 1, max: 30, step: 0.5 },
];

// Sound

type SoundSlider = SliderControl<"volume" | "space" | "grain">;

export const SOUND_CONTROLS: readonly SoundSlider[] = [
  { key: "volume", label: "음량", min: 0, max: 1, step: 0.01 },
  { key: "space", label: "공간 (잔향 · 메아리)", min: 0, max: 1, step: 0.01 },
  { key: "grain", label: "부서짐 (끊기는 알갱이 · 되풀이되는 고함 · 쌓이는 알림)", min: 0, max: 1, step: 0.01 },
];

/** v2 is dry: no room, no echoes. */
export const SOUND_RAW_CONTROLS: readonly SoundSlider[] = [
  { key: "volume", label: "음량", min: 0, max: 1, step: 0.01 },
  { key: "grain", label: "부서짐 (연타)", min: 0, max: 1, step: 0.01 },
];

// 기본값 3

/** What every 연출 starts from: bubble/2's look (갤러리) with 기본값 3's raft. */
export const LOOK_BASE: Visual = { ...VISUAL_DEFAULTS, area: 0.46, portions: 1.95 };

/** 우유 수조 (crimson metal in the studio room, seen from straight above): bubble/5's opening look (user, 2026-10-25). */
/** 크롬 (bare polished chrome at a slant, the studio mirrored nearly unblurred): bubble/6's opening look (user, 2026-10-25; again 2026-10-27). */
const CHROME: Partial<Visual> = { coating: [0.78, 0.77, 0.75], viewTilt: 0.4, lightTurn: 0.1, photo: 2, photoStrength: 1.2, keyStrength: 1.2, keySize: 0.3, shadowLift: 0.05, groundLight: 0.8, edgeShadow: 0.3, roughness: 0.02, clearcoat: 0.2, variety: 0.15, exposure: 0.9 };

/** 갤러리 · 거칠기 1: bubble/6 opened on it briefly (user, 2026-10-27), then on 크롬 again. */
const MATTE: Partial<Visual> = { roughness: 1, clearcoat: 0 };

const MILK: Partial<Visual> = { coating: [0.72, 0.015, 0.035], metalness: 1, roughness: 0.12, clearcoat: 0.35, variety: 0.15, viewTilt: 0, lightTurn: 0.875, photo: 2, photoStrength: 0.45, keyStrength: 2.6, keySize: 0.85, shadowLift: 0.18, groundLight: 1.1, edgeShadow: 0.05, colourBleed: 0, neighbourReflection: 0.9, crease: 0.35, background: [1, 1, 1], exposure: 0.85 };

/**
 * 기본값 3 (user, 2026-10-20): the set read off scc bubble/3 — one web of a
 * thousand pages, a fast school — with bubble/2's look (연출 갤러리). bubble/4
 * opens with it; 기본값 3 in the goldfish panel brings every panel back to it.
 */
export const PRESET_3 = {
  rates: {
    growth: DEFAULT_PARAMETERS.growth,
    volatility: 1.5,
    // 순위 쏠림 0.03, as bubble/5.
    floor: FLOOR_RANGE[0] * (FLOOR_RANGE[1] / FLOOR_RANGE[0]) ** (1 - 0.03),
    // bubble/6: bubble/5's motion, the extreme bursting (web/model.ts).
    dynamics: DEFAULT_PARAMETERS.dynamics,
    burstAt: DEFAULT_PARAMETERS.burstAt,
    recovery: DEFAULT_PARAMETERS.recovery,
  },
  damping: DEFAULT_DAMPING,
  // 800 pages (user, 2026-10-25; 기본값 3 had 1,000).
  pages: 800,
  groups: 1,
  visual: { ...LOOK_BASE, ...CHROME } satisfies Visual,
  fishCount: 380,
  fish: { ...FISH_DEFAULTS, scale: 0.65, speed: 2.2, follow: 0.6, novelty: 1, habituation: 1.75, span: 0.5, schooling: 2, patrol: 1 } satisfies FishParameters,
  fishPalette: "rose" as FishPaletteId,
  feedback: FEEDBACK_DEFAULTS,
  life: LIFE_DEFAULTS,
  reactions: REACTION_DEFAULTS, // 반응
  objects: OBJECT_DEFAULTS, // 오브제
};

/**
 * 연출: whole looks, each a different environment, material and viewpoint
 * (the raft's area and flow stay unless a look sets them). The first is bubble/2's, which bubble/4
 * opened on; bubble/5 opens on 우유 수조, bubble/6 on 크롬.
 */
export const LOOKS: readonly { id: string; label: string; look: Partial<Visual> }[] = [
  // bubble/2: magenta steel in a photographed loft, seen from the side, each lobe turned its own way.
  { id: "gallery", label: "갤러리 (bubble/2)", look: {} },
  // The same, roughness 1 (and no clear coat, whose sharper reflection would still show specks): no reflected
  // surroundings at all, only the light's soft gradient over the coat (user, 2026-10-22).
  { id: "matte", label: "갤러리 · 거칠기 1", look: MATTE },
  // bubble/2's look with the blue coat, as in the first lifecycle recording (bubble-4-lifecycle.gif): the
  // goldfish's own colours, the blue they take on and their grey all read against it (user, 2026-10-22).
  { id: "gallery-blue", label: "갤러리 · 블루", look: { coating: [0.08, 0.26, 0.95], coatingMix: 0 } },
  // Saved by the user with JSON 내려받기 (bubble-3-2026-10-22T06-00-47-849Z.json): blue coat under violet light,
  // roughness 1, the dark parts lifted almost to the light, a bright ground, larger bubbles.
  {
    id: "violet",
    label: "보랏빛 무광",
    look: {
      lightColour: [0.8823529411764706, 0, 1],
      background: [1, 1, 1],
      coating: [0.2, 0, 1],
      coatingMix: 0,
      exposure: 1.29,
      metalness: 0.87,
      roughness: 1,
      clearcoat: 0.26,
      variety: 1,
      viewTilt: 1,
      lightTurn: 1,
      photo: 0,
      photoStrength: 0.24,
      keyStrength: 0.45,
      keySize: 0.46,
      shadowLift: 0.98,
      groundLight: 1.62,
      edgeShadow: 0,
      colourBleed: 0.16,
      neighbourReflection: 1,
      crease: 0,
      area: 0.6,
      portions: 1.95,
    },
  },
  // The user's two references (crimson metallic spheres in milk), without their generated haze: deep crimson
  // metal from straight above, every rim mirroring the white liquid all round, the middles the dim room, one
  // large soft window from the upper left, a barely-there contact shade on the milk.
  {
    id: "milk",
    label: "우유 수조",
    look: MILK,
  },
  // The second reference: the same, with more contrast — darker middles, a smaller, crisper window.
  {
    id: "milk-deep",
    label: "우유 수조 · 진하게",
    look: { coating: [0.72, 0.015, 0.035], metalness: 1, roughness: 0.06, clearcoat: 0.4, variety: 0.15, viewTilt: 0, lightTurn: 0.875, photo: 2, photoStrength: 0.3, keyStrength: 3, keySize: 0.55, shadowLift: 0.08, groundLight: 1.1, edgeShadow: 0.05, colourBleed: 0, neighbourReflection: 0.9, crease: 0.35, background: [1, 1, 1], exposure: 0.85 },
  },
  // Bare polished chrome, seen at a slant, the studio mirrored nearly unblurred.
  {
    id: "chrome",
    label: "크롬",
    look: CHROME,
  },
  // Gold in a forest's light, half from the side.
  {
    id: "gold",
    label: "금빛 숲",
    look: { coating: [1, 0.74, 0.32], viewTilt: 0.7, lightTurn: 0.3, photo: 4, photoStrength: 1.6, keyStrength: 0.4, keySize: 0.6, shadowLift: 0.05, groundLight: 0.4, roughness: 0.18, clearcoat: 0.3, variety: 0.15, background: [0.93, 0.9, 0.84], exposure: 0.9 },
  },
];

/** The renderer's look for a frame: the visual panel's, without the raft's own area and portions. */
export function lookOf(visual: Visual): Look {
  const { area, portions, ...look } = visual;
  void area;
  void portions;
  return look;
}

/**
 * Every panel's values at once, as a JSON file to save: \`look\` is the
 * visual panel's look in the form a LOOKS entry takes (paste it as a new
 * 연출), the rest records the raft, network, goldfish and sound with it.
 */
export function saveSnapshot(snapshot: Record<string, unknown>) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = new Blob([JSON.stringify({ experiment: "screen/bubble/7", savedAt: new Date().toISOString(), ...snapshot }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bubble-7-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

