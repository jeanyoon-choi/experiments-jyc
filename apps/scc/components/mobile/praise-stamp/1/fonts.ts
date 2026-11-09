import { Black_Han_Sans, Do_Hyeon, Gaegu, Gowun_Dodum, Jua } from "next/font/google";

// Faces cut into Korean classroom stamps: rounded display (Jua, Do Hyeon),
// heavy grade letters (Black Han Sans), the thin gothic of the old rubber
// stamps (Gowun Dodum) and a teacher's hand (Gaegu).
const jua = Jua({ weight: "400", preload: false, display: "block" });
const doHyeon = Do_Hyeon({ weight: "400", preload: false, display: "block" });
const hanSans = Black_Han_Sans({ weight: "400", preload: false, display: "block" });
const dodum = Gowun_Dodum({ weight: "400", preload: false, display: "block" });
const gaegu = Gaegu({ weight: "700", preload: false, display: "block" });

export const FONTS = {
  jua: jua.style.fontFamily,
  dohyeon: doHyeon.style.fontFamily,
  hansans: hanSans.style.fontFamily,
  dodum: dodum.style.fontFamily,
  gaegu: `${gaegu.style.fontFamily}`,
} as const;

export const GAEGU_WEIGHT = 700;

export type FontKey = keyof typeof FONTS;

/** Class names that declare every face on the page, so their @font-face rules exist. */
export const fontClassNames = [jua, doHyeon, hanSans, dodum, gaegu].map((font) => font.className).join(" ");
