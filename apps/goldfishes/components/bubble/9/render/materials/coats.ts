// Colours by HSL (user, 2026-11-06: "그냥 hsl 로"): no hand-picked palettes.
//   hueWheel — a material's chips: the 12 hues of the colour wheel, 30° apart, at one saturation and lightness the
//              material reads best at (액체, 젤 · 세럼, 유리 each pass their own).
//   MIXED_COATS — 섞음: hues a golden angle (137.5°) apart, so each next one lands in the widest gap left and no two
//              near in the list are near in hue, at full saturation and three lightnesses in turn. Each sphere or
//              object takes one by its seed; the shader (shading.ts) and the school (frame-loop) read the same list.

type Rgb = readonly [number, number, number];

/** sRGB (0–1) of HSL: hue in degrees, saturation and lightness 0–1. */
export function hsl(hue: number, saturation: number, lightness: number): Rgb {
  const k = (n: number) => (n + hue / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n: number) => Math.round((lightness - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 1000) / 1000;
  return [f(0), f(8), f(4)];
}

/** HSL of an sRGB colour (0–1): hue in degrees (0 when grey), saturation and lightness 0–1. */
export function hslOf([r, g, b]: Rgb): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const d = max - min;
  if (d < 1e-6) return [0, 0, lightness];
  const saturation = d / (1 - Math.abs(2 * lightness - 1));
  const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue * 60, Math.min(1, saturation), lightness];
}

const HUE_NAMES = ["빨강", "주황", "노랑", "연두", "초록", "청록", "시안", "하늘", "파랑", "보라", "자홍", "분홍"] as const;

/** A material's chips: the colour wheel's 12 hues at `saturation` and `lightness`, ids `<prefix>-<hue>`. */
export function hueWheel(prefix: string, saturation: number, lightness: number) {
  return HUE_NAMES.map((label, index) => ({ id: `${prefix}-${index * 30}`, label, colour: hsl(index * 30, saturation, lightness) as [number, number, number] }));
}

const GOLDEN = 137.50776;
const LIGHTNESS = [0.5, 0.62, 0.42] as const;

/** 섞음's S and L as it opens: the sliders at these give MIXED_COATS. */
export const MIX_SATURATION: number = 1;
export const MIX_LIGHTNESS: number = LIGHTNESS[0];
export const MIX_HUE: number = 0;
export const MIX_DEPTH: number = 1;
const MIXED_HUES = Array.from({ length: 24 }, (_, index) => (index * GOLDEN) % 360);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** 섞음's coats: 24 hues a golden angle apart, saturation 1, lightness cycling 0.50 · 0.62 · 0.42. */
export const MIXED_COATS: readonly Rgb[] = MIXED_HUES.map((hue, index) => hsl(hue, MIX_SATURATION, LIGHTNESS[index % 3]!));

/**
 * The coat 섞음 gives a seed, as the shader's mixedCoat picks it. `saturation` and `lightness` are 섞음's S and L
 * (user, 2026-11-13: the sliders move the whole mix and keep it mixed): every coat takes the saturation, and the
 * lightness with its own step kept (0, +0.12, −0.08 by turns), so the mix stays three lightnesses deep. `turn` is
 * 섞음's H: every hue turned by that many degrees. `depth` scales the steps: 1 as 섞음's own palette, 0 when 섞음 was
 * turned on over a chosen colour, whose saturation and lightness every coat then has exactly (only the hue is mixed).
 */
export function mixedCoatOf(seed: number, saturation = MIX_SATURATION, lightness = MIX_LIGHTNESS, turn = MIX_HUE, depth = MIX_DEPTH): Rgb {
  const pick = seed * 7.31 - Math.floor(seed * 7.31);
  const index = Math.min(MIXED_COATS.length - 1, Math.floor(pick * MIXED_COATS.length));
  if (saturation === MIX_SATURATION && lightness === MIX_LIGHTNESS && turn === MIX_HUE && depth === MIX_DEPTH) return MIXED_COATS[index]!;
  return hsl((MIXED_HUES[index]! + turn) % 360, saturation, clamp01(lightness + depth * (LIGHTNESS[index % 3]! - MIX_LIGHTNESS)));
}

/**
 * GLSL: mixedCoat(pick), pick in [0, 1): mixedCoatOf above, with the uniforms mixHue, mixSaturation and mixLightness;
 * and mixTuned(colour), the same three applied to a colour that is not one of 섞음's coats (a material's own palette
 * under 섞음: 맥시멀 믹스, 메시 복원), relative to what it was: its hue turned, its saturation scaled, its lightness
 * moved towards white or black. With the sliders as they open, or 섞음 off, it returns the colour unchanged.
 * mixedHue(pick) is the hue alone (degrees, without mixHue), for a material that mixes its own colour's hue (젤 · 세럼).
 * Needs the uniform coatingMix declared before it (shading.ts COAT).
 */
export const MIXED_COAT_GLSL = /* glsl */ `
uniform float mixHue;                 // 섞음's H: every coat's hue turned, degrees
uniform float mixSaturation;          // 섞음's S: every coat's saturation
uniform float mixLightness;           // 섞음's L: the middle lightness, each coat keeping its own step from it
uniform float mixDepth;               // how much of that step: 1 섞음's own palette, 0 one lightness for all
const float mixedHues[${MIXED_HUES.length}] = float[${MIXED_HUES.length}](${MIXED_HUES.map((hue) => hue.toFixed(2)).join(", ")});
float mixedHue(float pick) {
  return mixedHues[min(int(pick * ${MIXED_HUES.length.toFixed(1)}), ${MIXED_HUES.length - 1})];
}
vec3 mixedCoat(float pick) {
  int i = min(int(pick * ${MIXED_HUES.length.toFixed(1)}), ${MIXED_HUES.length - 1});
  int turn = i - (i / 3) * 3;
  float light = clamp(mixLightness + mixDepth * (turn == 1 ? ${(LIGHTNESS[1] - LIGHTNESS[0]).toFixed(2)} : (turn == 2 ? ${(LIGHTNESS[2] - LIGHTNESS[0]).toFixed(2)} : 0.0)), 0.0, 1.0);
  float a = mixSaturation * min(light, 1.0 - light);
  vec3 k = mod(vec3(0.0, 8.0, 4.0) + (mixedHues[i] + mixHue) / 30.0, 12.0);
  return light - a * clamp(min(k - 3.0, 9.0 - k), -1.0, 1.0);
}
vec3 mixTuned(vec3 c) {
  if (coatingMix < 0.5) return c;
  float angle = radians(mixHue);
  vec3 axis = vec3(0.57735);
  c = c * cos(angle) + cross(axis, c) * sin(angle) + axis * dot(axis, c) * (1.0 - cos(angle));
  float grey = 0.5 * (max(c.r, max(c.g, c.b)) + min(c.r, min(c.g, c.b)));
  c = grey + (c - grey) * mixSaturation;
  float shift = 2.0 * (mixLightness - ${LIGHTNESS[0].toFixed(2)});
  c = shift >= 0.0 ? mix(c, vec3(1.0), shift) : c * (1.0 + shift);
  return clamp(c, 0.0, 1.0);
}
`;
