// The 성적통지표 as a model. Every column holds one continuous position on the
// 등급 scale, lower being better; everything printed is read off that position.
//
// 등급 is a stanine: nine bands half a standard deviation wide around the mean
// (cumulative 4, 11, 23, 40, 60, 77, 89, 96 %). So a position g is the z-score
// (5 − g) / 2, the printed 등급 is g rounded, and 표준점수 and 백분위 follow from
// z by their definitions. Nothing clamps g: pressed past 1등급 the same rule
// prints 0등급, −1등급 and a 표준점수 no paper can give.

export type Column = {
  key: string;
  /** 영역 as headed on the report. */
  area: string;
  /** 선택과목, or "" where the report prints none. */
  subject: string;
  /** 표준점수 mean and deviation, or null for 절대평가 areas, which print 등급 only. */
  scale: { mean: number; deviation: number } | null;
};

export const COLUMNS: readonly Column[] = [
  { key: "history", area: "한국사", subject: "", scale: null },
  { key: "korean", area: "국어", subject: "화법과 작문", scale: { mean: 100, deviation: 20 } },
  { key: "math", area: "수학", subject: "확률과 통계", scale: { mean: 100, deviation: 20 } },
  { key: "english", area: "영어", subject: "", scale: null },
  { key: "inquiry-a", area: "탐구", subject: "생활과 윤리", scale: { mean: 50, deviation: 10 } },
  { key: "inquiry-b", area: "탐구", subject: "사회·문화", scale: { mean: 50, deviation: 10 } },
  { key: "second", area: "제2외국어/한문", subject: "일본어Ⅰ", scale: null },
];

export type Cell = { standard: string; percentile: string; grade: string };

// Standard normal distribution function (Abramowitz and Stegun 26.2.17).
function phi(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const tail = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI) *
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - tail : tail;
}

// U+2212, the minus sign: a hyphen reads as a dash beside a digit.
const signed = (value: number) => (value < 0 ? `−${-value}` : `${value}`);

/** What the report prints for a column at position `g`. */
export function cellOf(column: Column, g: number): Cell {
  const grade = signed(Math.round(g) + 0);
  if (!column.scale) return { standard: "", percentile: "", grade };
  const z = (5 - g) / 2;
  return {
    standard: `${Math.round(column.scale.mean + column.scale.deviation * z)}`,
    percentile: `${Math.round(100 * phi(z))}`,
    grade,
  };
}

/** A report nobody would frame: every area between 5등급 and 8등급. */
export function drawReport(random: () => number = Math.random) {
  return {
    // 수험번호 is eight digits.
    number: `${Math.floor(10_000_000 + random() * 90_000_000)}`,
    // Whole 등급 are bought, so every area starts in the middle of one.
    grades: COLUMNS.map(() => Math.round(5 + random() * 3.4)),
  };
}

export type Report = ReturnType<typeof drawReport>;
