// What the academy sells, and which part of the report each is sold at. Every
// price is a figure reported or listed for that method, in won, read on
// 2026-11-23 (source for each row in the experiment note); the flyer charges
// it once per sitting, three tenths of a 등급.

export type Tool = "glasses" | "button" | "watch" | "booklet" | "card";

export type Item = {
  key: string;
  label: string;
  price: number;
  tool: Tool;
  /** Places on the report where it is sold: column indices, or `WHOLE`. */
  targets: readonly number[];
};

/** The 수험번호 and 성명 row: whoever sits the exam sits all of it. */
export const WHOLE = 7;

export const CATALOG: readonly Item[] = [
  // 국어 and 영어: the paper is read through the lens.
  { key: "glasses", label: "AI 안경", price: 690_000, tool: "glasses", targets: [1, 3] },
  // 수학: a button camera out, a rice-grain earpiece back.
  { key: "kit", label: "커닝 세트", price: 110_000, tool: "button", targets: [2] },
  // 한국사 and 탐구: what was to be memorised, on the wrist.
  { key: "watch", label: "스마트워치", price: 369_000, tool: "watch", targets: [0, 4, 5] },
  // 제2외국어/한문: a language test sat by someone else.
  { key: "sitter", label: "대리응시", price: 2_000_000, tool: "booklet", targets: [6] },
  { key: "proxy", label: "대리시험", price: 6_200_000, tool: "card", targets: [WHOLE] },
];

/** Rows named with their price in the head of the flyer. */
export const TEASERS = ["glasses", "watch", "proxy"].map((key) => CATALOG.find((item) => item.key === key)!);

/** Catalogue row sold at a place on the report. */
export const itemAt = (target: number) => CATALOG.findIndex((item) => item.targets.includes(target));

export const won = (value: number) => Math.round(value).toLocaleString("ko-KR");

/** A price in 만원, as flyers print it: 69, 36.9, 620. */
export const man = (value: number) => (value / 10_000).toLocaleString("ko-KR");
