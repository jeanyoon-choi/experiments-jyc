import localFont from "next/font/local";

// Faces cut into Korean classroom stamps: rounded display (Jua, Do Hyeon),
// heavy grade letters (Black Han Sans), the thin gothic of the old rubber
// stamps (Gowun Dodum) and a teacher's hand (Gaegu Bold). All SIL OFL 1.1
// from google/fonts, subset to the letters on these stamps.
const jua = localFont({ src: "./fonts/jua.woff2", display: "block", preload: false });
const doHyeon = localFont({ src: "./fonts/dohyeon.woff2", display: "block", preload: false });
const hanSans = localFont({ src: "./fonts/hansans.woff2", display: "block", preload: false });
const dodum = localFont({ src: "./fonts/dodum.woff2", display: "block", preload: false });
const gaegu = localFont({ src: "./fonts/gaegu.woff2", weight: "700", display: "block", preload: false });

export const FONTS = {
  jua: jua.style.fontFamily,
  dohyeon: doHyeon.style.fontFamily,
  hansans: hanSans.style.fontFamily,
  dodum: dodum.style.fontFamily,
  gaegu: gaegu.style.fontFamily,
} as const;

export const GAEGU_WEIGHT = 700;

export type FontKey = keyof typeof FONTS;

/** Class names that declare every face on the page, so their @font-face rules exist. */
export const fontClassNames = [jua, doHyeon, hanSans, dodum, gaegu].map((font) => font.className).join(" ");
