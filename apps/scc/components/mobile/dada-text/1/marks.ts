/**
 * Every name this experiment writes into the page, in one place: the root state attribute, the attributes that mark our own
 * UI, written cells and raw reads, and the custom properties a cell is written as.
 * `drawing/sheet.css` repeats these names by hand (CSS cannot import them); `marks.test.mjs` checks that it does.
 */
export const PREFIX = "dada-text";

/** On `<html>` while the filter is on: the clone hidden, a black ground. */
export const ROOT = `data-${PREFIX}`;
/** Our own option panel, and pictures shown as they are among the cells: never read, never hidden. */
export const UI = `${ROOT}-ui`;
/** An element whose background holds cells. */
export const CELL = `${ROOT}-cell`;
/** Lifts the hiding from one element for the moment its original fill and borders are read. */
export const RAW = `${ROOT}-raw`;

/** The width of the outer frame, set on the root. */
export const EDGE = `--${PREFIX}-edge`;
/** The custom properties a cell is written as on its element (see `drawing/properties.ts`). */
export const CELL_PROPERTIES = ["fill", "frame", "image", "position", "size", "origin", "attachment", "border-top", "border-right", "border-bottom", "border-left"] as const;
export const property = (name: (typeof CELL_PROPERTIES)[number]) => `--${PREFIX}-${name}`;
