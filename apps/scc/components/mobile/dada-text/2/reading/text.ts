import { wordFor } from "../words/reading";
import type { Facts } from "./facts";
import { boxSize, near } from "./geometry";
import { hsl, tokenHue } from "./hues";
import type { Paint, ReadOptions } from "./paint";
import { splitTokens, textRole, type TextRole } from "./tokens";

/**
 * Text parts. Text has no element of its own, so a text part becomes a background layer of the nearest block that holds it
 * (its carrier), positioned at the part's line boxes relative to that block, which do not change when anything scrolls.
 */

/** One text node, with the control and heading it sits inside. */
export type TextEntry = { node: Text; control: Element | null; heading: boolean };

type Run = { entries: TextEntry[]; tokens: { start: number; end: number; role: TextRole }[]; control: Element | null; ownColour: string | null };

/** Adjacent text nodes are one run (React splits `@{handle} · {time}` into several nodes); a run is split by job. */
function runsOf(entries: TextEntry[], cache: WeakMap<Element, Facts>, coloured: boolean) {
  const runs: Run[] = [];
  let index = 0;
  while (index < entries.length) {
    const run = [entries[index]];
    while (index + run.length < entries.length) {
      const candidate = entries[index + run.length];
      let between = run[run.length - 1].node.nextSibling;
      while (between && between.nodeType === Node.COMMENT_NODE) between = between.nextSibling;
      if (between !== candidate.node) break;
      run.push(candidate);
    }
    index += run.length;
    const full = run.map((entry) => entry.node.data).join("");
    const bold = parseInt(window.getComputedStyle(run[0].node.parentElement!).fontWeight, 10) >= 600;
    const { control, heading } = run[0];
    runs.push({
      entries: run,
      tokens: splitTokens(full).map((token) => ({ start: token.start, end: token.end, role: textRole(token.text, { bold, heading, interactive: Boolean(control) }) })),
      control,
      // A text part takes the colour its letters had, or in 랜덤 a hue of its own.
      ownColour: coloured ? cache.get(run[0].node.parentElement!)?.colour ?? null : null,
    });
  }
  return runs;
}

/** Writes one cell per line of each text part into its carrier's paint. */
export function collectText(texts: Map<Element, TextEntry[]>, paintOf: (element: Element) => Paint, cache: WeakMap<Element, Facts>, { group, reach, stroke, coloured, random }: ReadOptions) {
  const contentOnly = reach === "content";
  const range = document.createRange();
  for (const [carrier, entries] of texts) {
    const size = boxSize(carrier);
    if (!size.width || !size.height || !near(carrier)) continue;
    const box = carrier.getBoundingClientRect();
    const scaleX = box.width / size.width || 1;
    const scaleY = box.height / size.height || 1;
    const carrierStyle = window.getComputedStyle(carrier);
    const scrolls = /(auto|scroll|hidden)/.test(carrierStyle.overflowX + carrierStyle.overflowY) &&
      (carrier.scrollHeight > carrier.clientHeight || carrier.scrollWidth > carrier.clientWidth);
    const paint = paintOf(carrier);
    if (scrolls) paint.local = true;
    const offsetX = scrolls ? carrier.scrollLeft - carrier.clientLeft : 0;
    const offsetY = scrolls ? carrier.scrollTop - carrier.clientTop : 0;

    const runs = runsOf(entries, cache, coloured);
    // In the 콘텐츠 reach only a block that carries body text or a title is replaced, and then whole, so no line is half read.
    if (contentOnly) {
      if (!runs.some((run) => run.tokens.some((token) => token.role === "copy" || token.role === "title"))) continue;
      paint.text = true;
    }

    let tokenIndex = 0;
    for (const { entries: run, tokens, control, ownColour } of runs) {
      const locate = (offset: number) => {
        for (const entry of run) {
          if (offset <= entry.node.data.length) return { node: entry.node, offset };
          offset -= entry.node.data.length;
        }
        const last = run[run.length - 1].node;
        return { node: last, offset: last.data.length };
      };

      for (const token of tokens) {
        const start = locate(token.start);
        const end = locate(token.end);
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        const word = wordFor(token.role, control, group);
        const colour = random ? hsl(tokenHue(carrier, tokenIndex++)) : ownColour;
        // One cell per line the part occupies: glyph boxes on the same line are joined.
        const lines: { left: number; top: number; right: number; bottom: number }[] = [];
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width < 0.5 || rect.height < 0.5) continue;
          const line = lines.find((other) => Math.min(other.bottom, rect.bottom) - Math.max(other.top, rect.top) > Math.min(other.bottom - other.top, rect.height) * 0.5);
          if (line) {
            line.left = Math.min(line.left, rect.left);
            line.right = Math.max(line.right, rect.right);
            line.top = Math.min(line.top, rect.top);
            line.bottom = Math.max(line.bottom, rect.bottom);
          } else lines.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
        }
        for (const line of lines) {
          let x = (line.left - box.left) / scaleX + offsetX;
          let y = (line.top - box.top) / scaleY + offsetY;
          let w = (line.right - line.left) / scaleX;
          let h = (line.bottom - line.top) / scaleY;
          // A line box taller than a tight control (a count in a 20 px button) would lose its frame at the box edge, where the
          // background ends; the cell is kept inside the box instead.
          if (!scrolls) {
            const right = Math.min(x + w, size.width);
            const bottom = Math.min(y + h, size.height);
            x = Math.max(0, x);
            y = Math.max(0, y);
            w = right - x;
            h = bottom - y;
            if (w < 1 || h < 1) continue;
          }
          const inset = stroke + (h >= 12 ? 0.5 : 0) || 0.5;
          paint.layers.unshift({ cell: { width: w, height: h, word, framed: true, insetX: inset + 0.5, insetY: inset, colour }, x, y, w, h });
        }
      }
    }
  }
  range.detach();
}
