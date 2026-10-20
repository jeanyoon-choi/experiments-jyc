// What the panels adjust: their defaults and the tables their controls are
// drawn from. Nothing here runs per frame.

import { LOOK_DEFAULTS, type Colour, type Look } from "./render/foam";
import { FISH_DEFAULTS, type FishPaletteId, type FishParameters } from "./fish/goldfish";
import { MEDIA_DEFAULTS, type MediaMode, type MediaParameters } from "./media/model";
import type { SurfaceId } from "./media/catalogue";
import { DEFAULT_DAMPING, DEFAULT_PARAMETERS } from "./web/model";
import type { SoundParameters } from "./sound/sound";

/** Share of the field's area that all pages together cover; area = displayed rank × this. 0.4 (user, 2026-10-12; /2 keeps 0.3). */
export const AREA_BUDGET = 0.4;
/** Portions carrying less than this share of the mean flow are not drawn (they would read as specks). */
export const LEAST_PORTION = 0.5;
export const MIN_PAGES = 20;
/** createRankedWeb's default seed. */
export const DEFAULT_SEED = 0x2545f491;
/** Two echo chambers from the start (user, 2026-10-11); bubble/2 starts with one web. */
export const DEFAULT_GROUPS = 2;

export type PanelId = "network" | "visual" | "fish" | "media" | "sound";

/** A slider: key, label, range, step. */
export type SliderControl<Key extends string> = { key: Key; label: string; min: number; max: number; step: number };

// Visual

/** Everything the visual panel adjusts: the renderer's look plus the raft's own scale and flow. */
export type Visual = Look & { area: number; portions: number };

export const VISUAL_DEFAULTS: Visual = { ...LOOK_DEFAULTS, area: AREA_BUDGET, portions: LEAST_PORTION };

// 기본값 2 (user, 2026-10-11): the defaults (fish included) on a mid grey (#5e5e5e) instead of black; a button in the goldfish panel, not the default.
export const SECOND_BACKGROUND: Colour = [94 / 255, 94 / 255, 94 / 255];

type NumericKey = { [K in keyof Visual]: Visual[K] extends number ? K : never }[keyof Visual];

/** Visual sliders. Defaults reproduce bubble/1. */
export const VISUAL_CONTROLS: readonly SliderControl<Exclude<NumericKey, "envMode">>[] = [
  { key: "sphere", label: "반사 곡면 (0 납작 · 1 구)", min: 0, max: 1, step: 0.01 },
  { key: "envContrast", label: "환경 선명도·대비", min: 0, max: 1, step: 0.01 },
  { key: "reflectionTint", label: "반사에 간섭색 입히기", min: 0, max: 1, step: 0.01 },
  { key: "backReflection", label: "뒷면 반사", min: 0, max: 1, step: 0.01 },
  { key: "area", label: "버블 면적", min: 0.1, max: 0.6, step: 0.01 },
  { key: "portions", label: "흐름 버블 (적을수록 많이)", min: 0, max: 3, step: 0.05 },
  { key: "filmThickness", label: "막 두께 (nm)", min: 200, max: 2000, step: 10 },
  { key: "colourAmount", label: "간섭색", min: 0, max: 1, step: 0.01 },
  { key: "flowSpeed", label: "막 흐름 속도", min: 0, max: 4, step: 0.05 },
  { key: "swirl", label: "소용돌이", min: 0, max: 3, step: 0.05 },
  { key: "domeDepth", label: "돔 깊이", min: 0.05, max: 1.2, step: 0.01 },
  { key: "fresnelGain", label: "가장자리 반사", min: 0, max: 2, step: 0.01 },
  { key: "wallGain", label: "벽 밝기", min: 0, max: 1.5, step: 0.01 },
  { key: "windowGain", label: "반사 세기", min: 0, max: 2, step: 0.01 },
  { key: "ambient", label: "주변광", min: 0, max: 0.4, step: 0.005 },
  { key: "exposure", label: "노출", min: 0.3, max: 2.5, step: 0.01 },
  { key: "textureDiversity", label: "결 다양성", min: 0, max: 1, step: 0.01 },
  { key: "filmFlow", label: "막 흐름 (배수·대류)", min: 0, max: 3, step: 0.05 },
];

/** What the films reflect; 0 is bubble/1's window. 6 is an uploaded image. */
export const ENVIRONMENTS = [
  { mode: 0, label: "창" },
  { mode: 1, label: "흐린 하늘" },
  { mode: 2, label: "스튜디오" },
  { mode: 3, label: "밤 도시" },
  { mode: 4, label: "나뭇잎 빛" },
  { mode: 5, label: "물빛" },
] as const;
export const IMAGE_ENVIRONMENT = 6;

/** What each bubble is made of: bubble/1's soap film, or Koons's coated mirror steel (Balloon Dog). */
export const MATERIALS = [
  { mode: 0, label: "비눗막" },
  { mode: 1, label: "쿤스" },
] as const;

/**
 * The Balloon Dog coats, as the steel's reflectance tint, read off photographs
 * of the five (Magenta at Versailles, Yellow on the Met roof, Blue at the
 * Broad, Orange, Red), plus the bare polished steel. 섞음 gives each bubble one
 * of the five.
 */
export const COATINGS: readonly { id: string; label: string; colour: Colour | null }[] = [
  { id: "magenta", label: "마젠타", colour: [0.92, 0.1, 0.48] },
  { id: "yellow", label: "옐로", colour: [1, 0.78, 0.1] },
  { id: "blue", label: "블루", colour: [0.08, 0.26, 0.95] },
  { id: "orange", label: "오렌지", colour: [1, 0.4, 0.06] },
  { id: "red", label: "레드", colour: [0.95, 0.07, 0.08] },
  { id: "steel", label: "스틸", colour: [0.78, 0.77, 0.75] },
  { id: "mix", label: "섞음", colour: null },
];

/** Colour palettes: light, film, background. The first is bubble/1. */
export const PALETTES = [
  { id: "plain", label: "무채", lightColour: "#ffffff", filmTint: "#ffffff", background: "#000000" },
  { id: "dawn", label: "새벽", lightColour: "#dde5ff", filmTint: "#f4f6ff", background: "#080b12" },
  { id: "amber", label: "호박", lightColour: "#ffe0b5", filmTint: "#fff1dc", background: "#110b05" },
  { id: "moss", label: "이끼", lightColour: "#e4efd4", filmTint: "#eef4e6", background: "#060905" },
  { id: "paper", label: "종이", lightColour: "#ffffff", filmTint: "#d9d9d9", background: "#cfccc5" },
] as const;

export const COLOUR_CONTROLS = [
  { key: "lightColour", label: "빛" },
  { key: "filmTint", label: "막" },
  { key: "background", label: "배경" },
] as const;

export function toHex(colour: Colour) {
  return `#${colour.map((value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function fromHex(hex: string): Colour {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

// Media

/** The picture's own look, apart from the film's: part of `Look`, kept out of the visual panel's reset. */
export type MediaLook = Pick<Look, "mediaSaturation" | "mediaBrightness" | "mediaZoom" | "mediaDrift" | "filmOverMedia">;

export const MEDIA_LOOK_DEFAULTS: MediaLook = {
  mediaSaturation: LOOK_DEFAULTS.mediaSaturation,
  mediaBrightness: LOOK_DEFAULTS.mediaBrightness,
  mediaZoom: LOOK_DEFAULTS.mediaZoom,
  mediaDrift: LOOK_DEFAULTS.mediaDrift,
  filmOverMedia: LOOK_DEFAULTS.filmOverMedia,
};

export const MEDIA_LOOK_CONTROLS: readonly SliderControl<keyof MediaLook>[] = [
  { key: "mediaSaturation", label: "채도", min: 0, max: 1.2, step: 0.01 },
  { key: "mediaBrightness", label: "밝기", min: 0.2, max: 2, step: 0.01 },
  { key: "filmOverMedia", label: "막 비침", min: 0, max: 1, step: 0.01 },
  { key: "mediaZoom", label: "확대", min: 1, max: 2.5, step: 0.01 },
  { key: "mediaDrift", label: "흐름", min: 0, max: 4, step: 0.05 },
];

/** How an image sits on a bubble (foam.ts mediaMode 1–4); 0 is bubble/2's bare film. */
export const MAPPINGS = [
  { mode: 1, label: "평면" },
  { mode: 2, label: "조각" },
  { mode: 3, label: "구면" },
  { mode: 4, label: "결" },
] as const;
export const DEFAULT_MAPPING = 3;

export const MEDIA_MODES: readonly { id: MediaMode; label: string }[] = [
  { id: "fixed", label: "고정" },
  { id: "churn", label: "제각각" },
  { id: "trend", label: "유행 따라가기" },
];

/**
 * 닿을 때만: a page's picture appears while a fish touches it and goes when
 * none does, each over 바뀜 부드럽게 (the media fade; 0 is instant) — user, 2026-10-11.
 * 항상 by default since 2026-10-12 (user); 닿을 때만 was the default before.
 */
export const DEFAULT_ON_TOUCH = false;

/** The renderer's look for a frame: the visual panel's (without the raft's own area and portions), the picture's, and the media switches. */
export function filmLook(visual: Visual, mediaLook: MediaLook, media: Pick<Look, "mediaMode" | "mediaReveal" | "mediaSolid">): Look {
  const { area, portions, ...look } = visual;
  void area;
  void portions;
  return { ...look, ...mediaLook, ...media };
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

// Sound

export const SOUND_CONTROLS: readonly SliderControl<Exclude<keyof SoundParameters, "scape">>[] = [
  { key: "volume", label: "음량", min: 0, max: 1, step: 0.01 },
  { key: "space", label: "공간 (잔향 · 메아리)", min: 0, max: 1, step: 0.01 },
  { key: "grain", label: "부서짐 (끊기는 알갱이 · 되풀이되는 고함)", min: 0, max: 1, step: 0.01 },
];

// 기본값 3

/**
 * 기본값 3 (user, 2026-10-20): the set read off scc bubble/3 (here with the
 * bubbles in Koons's magenta steel; 재질 비눗막 is bubble/1's film) — one web of a
 * thousand pages on a white field, no media under the films, a fast grey
 * school. Goldfishes bubble/1 opens with it; 기본값 3 in the goldfish panel
 * brings every panel back to it.
 */
export const PRESET_3 = {
  rates: { growth: DEFAULT_PARAMETERS.growth, volatility: 1.5, floor: DEFAULT_PARAMETERS.floor },
  damping: DEFAULT_DAMPING,
  pages: 1_000,
  groups: 1,
  visual: {
    ...VISUAL_DEFAULTS,
    envMode: 0,
    lightColour: [1, 1, 1],
    filmTint: [1, 1, 1],
    background: [1, 1, 1],
    sphere: 0.33,
    envContrast: 0.49,
    reflectionTint: 0,
    backReflection: 0,
    area: 0.46,
    portions: 1.95,
    filmThickness: 270,
    colourAmount: 0.4,
    flowSpeed: 0,
    swirl: 2.25,
    domeDepth: 0.13,
    fresnelGain: 0.54,
    wallGain: 0.44,
    windowGain: 0.94,
    ambient: 0.07,
    exposure: 0.8,
    textureDiversity: 0.75,
    filmFlow: 1,
    material: 1,
    coating: [0.92, 0.1, 0.48],
    coatingMix: 0,
  } satisfies Visual,
  surface: "none" as SurfaceId,
  onTouch: false,
  mapping: 3,
  media: MEDIA_DEFAULTS satisfies MediaParameters,
  mediaLook: MEDIA_LOOK_DEFAULTS,
  carry: true,
  fishCount: 380,
  fish: { ...FISH_DEFAULTS, scale: 0.65, speed: 2.2, follow: 0.6, novelty: 1, habituation: 1.75, span: 0.5, schooling: 2, patrol: 1 } satisfies FishParameters,
  fishPalette: "mono" as FishPaletteId,
  influence: 0.52,
};
