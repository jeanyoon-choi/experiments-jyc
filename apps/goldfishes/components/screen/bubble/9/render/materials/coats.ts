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

/** 섞음's coats: 24 hues a golden angle apart, saturation 1, lightness cycling 0.50 · 0.62 · 0.42. */
export const MIXED_COATS: readonly Rgb[] = Array.from({ length: 24 }, (_, index) => hsl((index * GOLDEN) % 360, 1, LIGHTNESS[index % 3]!));

/** The coat 섞음 gives a seed, as the shader's mixedCoat picks it. */
export function mixedCoatOf(seed: number): Rgb {
  const pick = seed * 7.31 - Math.floor(seed * 7.31);
  return MIXED_COATS[Math.min(MIXED_COATS.length - 1, Math.floor(pick * MIXED_COATS.length))]!;
}

/** GLSL: mixedCoat(pick), pick in [0, 1). */
export const MIXED_COAT_GLSL = /* glsl */ `
const vec3 mixedCoats[${MIXED_COATS.length}] = vec3[${MIXED_COATS.length}](
${MIXED_COATS.map((c) => `  vec3(${c.map((v) => v.toFixed(3)).join(", ")})`).join(",\n")});
vec3 mixedCoat(float pick) {
  return mixedCoats[min(int(pick * ${MIXED_COATS.length.toFixed(1)}), ${MIXED_COATS.length - 1})];
}
`;
