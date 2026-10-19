import type { CellSpec } from "../reading/paint";

/**
 * Six tech-hype keywords, dealt again and again (after `complex-systems/bubble/3`'s tech keywords; user, 2026-10-19).
 * A space breaks a word over two lines in its cell (BLOCK / CHAIN, META / VERSE; see `drawing/cell-image.ts`).
 * Data only; the sequence below deals them out. A first test used the NYT banner of 12 September 2001.
 */
export const TECH_HYPE: readonly string[] = ["AI", "BLOCK CHAIN", "META VERSE", "NFT", "WEB3", "AGI"];

/**
 * 하이프: each part takes the next word of the list in reading order, cycling, and keeps it for as long as its element lives.
 * A part is an element and a slot within it (0 for an element cell, the token's index for text). Parts first met in one
 * reading are numbered top to bottom, then left to right, once all of that reading's cells are known (`settle`).
 */
export type Sequence = {
  name: (cell: CellSpec, key: Element, slot: number, top: number, left: number) => void;
  settle: () => void;
};

export function createSequence(words: readonly string[] = TECH_HYPE): Sequence {
  const numbers = new WeakMap<Element, Map<number, number>>();
  let next = 0;
  let pending: { cell: CellSpec; key: Element; slot: number; top: number; left: number }[] = [];
  const wordOf = (index: number) => words[index % words.length];

  return {
    name(cell, key, slot, top, left) {
      const known = numbers.get(key)?.get(slot);
      if (known !== undefined) cell.word = wordOf(known);
      else pending.push({ cell, key, slot, top, left });
    },
    settle() {
      pending.sort((a, b) => a.top - b.top || a.left - b.left);
      for (const { cell, key, slot } of pending) {
        let slots = numbers.get(key);
        if (!slots) numbers.set(key, (slots = new Map()));
        let index = slots.get(slot);
        if (index === undefined) slots.set(slot, (index = next++));
        cell.word = wordOf(index);
      }
      pending = [];
    },
  };
}
