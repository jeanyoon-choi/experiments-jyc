export type BannerLook = "neon" | "matrix" | "solid" | "flash" | "rainbow";

export type Banner = {
  id: string;
  lines: readonly string[];
  look: BannerLook;
  /** A scrolling banner is one line that runs past; a still one is fitted to the screen. */
  scroll: boolean;
  /** Two colours, linear 0–1 RGB as displayed (sRGB values). */
  ink: readonly [number, number, number];
  ink2: readonly [number, number, number];
  ground: readonly [number, number, number];
};

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

const BLACK = rgb("#000000");

export const BANNERS: readonly Banner[] = [
  { id: "passed", lines: ["너가 떨어져서", "내가 붙었어!"], look: "neon", scroll: false, ink: rgb("#ff1f8e"), ink2: rgb("#ff1f8e"), ground: BLACK },
  { id: "eliminated", lines: ["탈락 축하해! 가시밭길만 걷자"], look: "matrix", scroll: true, ink: rgb("#ff3329"), ink2: rgb("#ff9e4d"), ground: BLACK },
  { id: "mistake-today", lines: ["오늘도 실수해줘서", "정말 고마워요"], look: "solid", scroll: false, ink: rgb("#8dffd0"), ink2: rgb("#8dffd0"), ground: BLACK },
  { id: "fail", lines: ["불합격해"], look: "flash", scroll: false, ink: BLACK, ink2: BLACK, ground: rgb("#ffe900") },
  { id: "mistake", lines: ["실수해줘서 고마워"], look: "rainbow", scroll: true, ink: rgb("#ffffff"), ink2: rgb("#ffffff"), ground: BLACK },
  { id: "chant", lines: ["불합! 탈락! 불합!"], look: "neon", scroll: true, ink: rgb("#2fb4ff"), ink2: rgb("#2fb4ff"), ground: BLACK },
];

export const LOOK_INDEX: Record<BannerLook, number> = { neon: 0, matrix: 1, solid: 2, flash: 3, rainbow: 4 };
