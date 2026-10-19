import { RAW, UI } from "../marks";
import { remote } from "./geometry";

/**
 * The original paint of every box, read once and cached: what the hiding sheet overrides and a cell depends on. The fill,
 * background image, borders and shadow, and the colours a part is represented by: the box's own fill, its text colour,
 * an icon's stroke or fill.
 */
export type Facts = { alpha: number; image: "none" | "photo" | "gradient"; borders: string[]; shadow: boolean; fill: string | null; colour: string | null };

/** Tags never entered. */
export const skipped = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "LINK", "META"]);
/** Tags whose insides are not entered: an icon's colour is read on the svg itself, a field has no parts. */
export const graphic = new Set(["svg", "IMG", "VIDEO", "CANVAS", "IFRAME", "INPUT", "TEXTAREA", "SELECT"]);

export const alphaOf = (color: string) => {
  if (color === "transparent") return 0;
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return 1;
  const parts = match[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length > 3 ? parseFloat(parts[3]) * (parts[3].endsWith("%") ? 0.01 : 1) : 1;
};

/** A colour that shows: not transparent, and not a fully transparent rgba. */
const visibleColour = (value: string) => (value && value !== "none" && alphaOf(value) > 0 ? value : null);

function readFacts(element: Element, style: CSSStyleDeclaration): Facts {
  const image = style.backgroundImage;
  const svg = element.tagName === "svg";
  return {
    fill: visibleColour(style.backgroundColor),
    colour: svg ? visibleColour(style.stroke) ?? visibleColour(style.fill) ?? visibleColour(style.color) : visibleColour(style.color),
    alpha: alphaOf(style.backgroundColor),
    // A photograph given as a CSS background (a thumbnail div) is a part; a gradient or an SVG drawing is only a fill.
    image: image === "none" ? "none" : /url\(/.test(image) && !/\.svg|image\/svg/.test(image) ? "photo" : "gradient",
    borders: (["top", "right", "bottom", "left"] as const).filter((side) =>
      parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
      style.getPropertyValue(`border-${side}-style`) !== "none" &&
      alphaOf(style.getPropertyValue(`border-${side}-color`)) > 0.1),
    shadow: style.boxShadow !== "none",
  };
}

/**
 * Original facts for every box element that has none cached, or sits in a subtree that changed since it was read.
 * Those elements alone are un-hidden while they are read, so the style pass touches only them.
 */
export function refreshFacts(root: Element, cache: WeakMap<Element, Facts>, changed: Set<Element>) {
  const stale: Element[] = [];
  const walk = (element: Element, dirty: boolean) => {
    if (skipped.has(element.tagName) || element.hasAttribute(UI)) return;
    dirty ||= changed.has(element);
    if (remote(element)) return;
    if (dirty || !cache.has(element)) stale.push(element);
    if (graphic.has(element.tagName)) return;
    for (const child of Array.from(element.children)) walk(child, dirty);
  };
  walk(root, false);
  changed.clear();
  if (!stale.length) return;
  // Ancestors are un-hidden too, so an inherited colour (`currentColor`, a text colour set on the row) reads as the original.
  const raw = new Set<Element>();
  for (const element of stale) for (let node: Element | null = element; node && node !== root.parentElement && !raw.has(node); node = node.parentElement) raw.add(node);
  for (const element of raw) element.setAttribute(RAW, "");
  for (const element of stale) cache.set(element, readFacts(element, window.getComputedStyle(element)));
  for (const element of raw) element.removeAttribute(RAW);
}
