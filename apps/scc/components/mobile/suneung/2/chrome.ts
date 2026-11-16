import type { PaperItem, PaperLine, PaperPage } from "../paper/types";

// Each question is one page of the mobile booklet, so it takes the paper's
// own header and page-number box, exactly as printed and renumbered for the
// question: the cover header on 1 and 23 (first page of the 미적분 booklet),
// the running header elsewhere, mirrored by parity like the paper (odd: 홀수형
// box left, number right; even: number left, box right).

const HEADER_LEFT = 87.2;
const HEADER_RIGHT = 754.8;
/** Advance of one 견명조 digit in the page-number box, in em (from the printed `20`). */
const DIGIT_EM = 0.666;
/** Header numbers were printed one digit wide; two digits set at the face's own tighter advance. */
const HEADER_DIGIT_EM = 0.56;

export type Anchor = "left" | "center" | "right" | "full";
export type PaperRegion = { x: number; y: number; w: number; h: number; items: PaperItem[] };

const isColumnRule = (item: PaperItem) => (item.k === "fill" || item.k === "v") && item.h > 500;
const isPageNumber = (item: PaperItem): item is PaperLine =>
  item.k === "line" && item.runs.length === 1 && item.runs[0].f === "mb" && /^\d+\s*$/.test(item.runs[0].t) && item.s > 20;

/** A line whose runs sit far apart on the paper (`2 ··· 홀수형`) becomes one line per group. */
function splitLine(line: PaperLine): PaperLine[] {
  const parts: PaperLine[] = [];
  let start = 0;
  for (let i = 1; i <= line.runs.length; i++) {
    const previous = line.runs[i - 1];
    const next = line.runs[i];
    if (next && next.x - (previous.x + previous.e) < 40) continue;
    const runs = line.runs.slice(start, i);
    const offset = runs[0].x;
    const last = runs[runs.length - 1];
    parts.push({
      ...line,
      id: start === 0 ? line.id : `${line.id}.${start}`,
      x: line.x + offset,
      w: last.x + last.e - offset,
      runs: runs.map((run, j) => ({ ...run, x: run.x - offset, w: j === runs.length - 1 ? run.e : run.w })),
    });
    start = i;
  }
  return parts;
}

/** Renumbered header digits keep the face's own spacing (`e: -1` tells the fit pass to leave them); width is estimated for anchoring. */
function renumber(line: PaperLine, n: number, anchor: Anchor): PaperLine {
  const text = String(n);
  if (text.length === 1) return { ...line, runs: [{ ...line.runs[0], t: text }] };
  const width = Array.from(text).reduce((sum, digit) => sum + (digit === "1" ? 0.42 : HEADER_DIGIT_EM), 0) * line.s;
  const x = anchor === "right" ? line.x + line.w - width : line.x;
  return { ...line, x, w: width, runs: [{ ...line.runs[0], t: text, x: 0, w: width, e: -1 }] };
}

function extent(item: PaperItem): { left: number; width: number; top: number; bottom: number } {
  switch (item.k) {
    case "line":
      return { left: item.x, width: item.w, top: item.y - item.s * 0.95, bottom: item.y + item.s * 0.25 };
    case "h":
      return { left: item.x, width: item.w, top: item.y - item.sw / 2, bottom: item.y + item.sw / 2 };
    case "v":
      return { left: item.x - item.sw / 2, width: item.sw, top: item.y, bottom: item.y + item.h };
    case "box":
    case "fill":
    case "fig":
      return { left: item.x, width: item.w, top: item.y, bottom: item.y + item.h };
    case "d":
      return { left: Math.min(item.x, item.x2), width: Math.abs(item.x2 - item.x), top: Math.min(item.y, item.y2), bottom: Math.max(item.y, item.y2) };
  }
}

function anchorOf(item: PaperItem, left: number, width: number): Anchor {
  if (item.k === "h" && width > 600) return "full";
  const center = left + width / 2;
  if (center < 300) return "left";
  if (center > 542) return "right";
  return "center";
}

/** Template page for question n: cover or running header, by section and parity. */
function templatePage(n: number) {
  if (n === 1) return 1;
  if (n === 23) return 13;
  if (n < 23) return n % 2 ? 3 : 2;
  return n % 2 ? 15 : 14;
}

/** The printed header of the template page, exactly as laid out, renumbered for question n. */
export function headerFor(n: number, pages: ReadonlyMap<number, PaperPage>): PaperRegion {
  const page = pages.get(templatePage(n))!;
  const rule = page.items
    .filter((item): item is Extract<PaperItem, { k: "h" }> => item.k === "h" && item.w > 600 && item.y > 140)
    .sort((a, b) => a.y - b.y)[0];
  const bottom = rule.y + rule.sw / 2;
  const items = page.items
    .filter((item) => !isColumnRule(item) && item.y <= bottom + 0.5)
    .flatMap((item): PaperItem[] => (item.k === "line" ? splitLine(item) : [item]))
    .map((item) => {
      if (!isPageNumber(item)) return item;
      const box = extent(item);
      return renumber(item, n, anchorOf(item, box.left, box.width));
    });
  const top = Math.min(...items.map((item) => extent(item).top)) - 1;
  return { x: HEADER_LEFT, y: top, w: HEADER_RIGHT - HEADER_LEFT, h: bottom + 0.5 - top, items };
}

/** The printed page-number box, reading `n` over `total`. */
export function footerFor(n: number, total: number, pages: ReadonlyMap<number, PaperPage>): PaperRegion {
  const page = pages.get(1)!;
  const items = page.items
    .filter((item) => !isColumnRule(item) && item.y > 1075)
    .map((item) => {
      if (item.k !== "line") return item;
      const value = item.runs[0].t === "1" ? n : total;
      const text = String(value);
      const width = text.length * DIGIT_EM * item.s;
      return { ...item, w: width, runs: [{ ...item.runs[0], t: text, x: 0, w: width, e: width }] };
    });
  return { x: 394.6, y: 1081, w: 53, h: 24.4, items };
}
