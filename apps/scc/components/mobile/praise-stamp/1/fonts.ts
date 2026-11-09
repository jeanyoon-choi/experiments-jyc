// Faces cut into Korean classroom stamps. Temporarily system faces while the
// self-hosted set is prepared.
export const FONTS = {
  jua: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  dohyeon: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  hansans: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  dodum: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  gaegu: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
} as const;

export const GAEGU_WEIGHT = 700;

export type FontKey = keyof typeof FONTS;

export const fontClassNames = "";
