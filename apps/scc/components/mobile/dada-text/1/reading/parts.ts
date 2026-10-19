import { UI } from "../marks";
import { wordFor } from "../words/reading";
import { skipped, type Facts } from "./facts";
import { boxSize, near, radiusOf, remote, roundedInset } from "./geometry";
import { hsl, hueOf } from "./hues";
import { emptyPaint, type Paint, type ReadOptions } from "./paint";
import { representativeColour } from "./picture-colour";
import { collectText, type TextEntry } from "./text";

/**
 * Reads the Instagram clone into cells, one paint per element that already occupies the place (see `paint.ts`).
 * Element parts (icons, pictures, faces, fields, photo backgrounds, empty boxes) get a cell filling their own box; a box
 * that is filled, bordered or shadowed is kept as a box; text parts are gathered by carrier and written by `text.ts`.
 */

const interactive = "button, a, input, textarea, select, summary, label, [role='button'], [role='link'], [role='tab'], [role='checkbox'], [role='switch'], [role='menuitem'], [role='option']";

type Context = { faded: boolean; carrier: Element | null; control: Element | null; heading: boolean };

export function collect(root: Element, cache: WeakMap<Element, Facts>, options: ReadOptions) {
  const { group, sequence, stroke, coloured, random, onColour } = options;
  /** A picture's or frame's mean colour, sampled once per source; an image not yet loaded reports back through `onColour`. */
  const pictureColour = (element: Element) => coloured && (element instanceof HTMLImageElement || element instanceof HTMLVideoElement)
    ? representativeColour(element, onColour) ?? "#b8b8b8"
    : null;
  /** A box's representative colour: its own fill, else its text colour (an svg's stroke or fill), else that of its only child. */
  const boxColour = (element: Element): string | null => {
    if (!coloured) return null;
    const facts = cache.get(element);
    if (facts?.fill) return facts.fill;
    if (facts?.colour && (element.tagName === "svg" || Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()))) return facts.colour;
    if (element.children.length === 1) return element.children[0].tagName === "svg" ? cache.get(element.children[0])?.colour ?? null : boxColour(element.children[0]);
    return facts?.colour ?? null;
  };
  const viewportArea = window.innerWidth * window.innerHeight;
  const paints = new Map<Element, Paint>();
  const texts = new Map<Element, TextEntry[]>();
  const styleOf = (element: Element) => window.getComputedStyle(element);
  const paintOf = (element: Element) => {
    let paint = paints.get(element);
    if (!paint) paints.set(element, (paint = emptyPaint()));
    return paint;
  };

  /**
   * An element cell: the word fills the box, kept clear of rounded corners (its own, or a same-sized clipping parent's).
   * A field (the search box, SCROLL) keeps its own word when words are dealt, and is never framed.
   */
  const elementCell = (element: Element, style: CSSStyleDeclaration, word: string, colour: string | null = null, field = false) => {
    if (random) colour = hsl(hueOf(element));
    const { width, height } = boxSize(element);
    if (width < 1 || height < 1 || !near(element)) return;
    let radius = radiusOf(style, width);
    const parent = element.parentElement;
    if (parent) {
      const parentStyle = styleOf(parent);
      const parentBox = boxSize(parent);
      if (parentStyle.overflow !== "visible" && Math.abs(parentBox.width - width) < 2 && Math.abs(parentBox.height - height) < 2) {
        radius = Math.max(radius, radiusOf(parentStyle, parentBox.width));
      }
    }
    const inset = roundedInset(radius, width, height);
    const paint = paintOf(element);
    const cell = { width, height, word, framed: false, insetX: 0, insetY: 0, colour };
    paint.fill = true;
    paint.frame = !field;
    // Letters fill the box up to the CSS frame drawn inside it (none at 0), and stay clear of rounded corners.
    const clear = Math.max(field ? 0 : stroke, inset);
    cell.insetX = cell.insetY = clear;
    if (sequence && !field) {
      const box = element.getBoundingClientRect();
      sequence.name(cell, element, 0, box.top, box.left);
    }
    paint.layers.push({ cell, whole: true });
  };

  const visit = (element: Element, context: Context): number => {
    if (skipped.has(element.tagName) || element.hasAttribute(UI) || remote(element)) return 0;
    const style = styleOf(element);
    // Overlays a browser extension lays over every page sit at the top of the z range; they are not the interface.
    if (style.display === "none" || parseInt(style.zIndex, 10) >= 2147483000) return 0;
    const faded = context.faded || parseFloat(style.opacity) === 0;
    const shown = !faded && style.visibility === "visible";
    const tag = element.tagName;
    const control = element.matches(interactive) ? element : context.control;

    if (tag === "svg" || tag === "IMG" || tag === "VIDEO") {
      if (!shown) return 0;
      const { width, height } = boxSize(element);
      if (width < 1 || height < 1) return 0;
      if (tag === "svg") {
        elementCell(element, style, wordFor("icon", control, group), coloured ? cache.get(element)?.colour ?? null : null);
      } else {
        // A small square picture rounded into a circle, by itself or by the box clipping it, is someone's face.
        const parent = element.parentElement;
        const round = width <= 120 && Math.abs(width - height) < 2 && (radiusOf(style, width) >= width * 0.4 ||
          Boolean(parent && radiusOf(styleOf(parent), boxSize(parent).width) >= width * 0.4));
        elementCell(element, style, wordFor(tag === "IMG" && round ? "avatar" : "media", control, group), pictureColour(element));
      }
      return 1;
    }
    if (tag === "CANVAS" || tag === "IFRAME") return 0;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      if (!shown || ["hidden", "checkbox", "radio", "range"].includes((element as HTMLInputElement).type)) return 0;
      elementCell(element, style, wordFor("field", control, group), boxColour(element), true);
      return 1;
    }

    const inline = style.display === "inline" || style.display === "contents";
    const carrier = inline ? context.carrier : element;
    const heading = context.heading || /^H[1-6]$/.test(tag) || element.getAttribute("role") === "heading";
    const next: Context = { faded, carrier, control, heading };

    let atoms = 0;
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!shown || !carrier || !child.textContent?.trim()) continue;
        let list = texts.get(carrier);
        if (!list) texts.set(carrier, (list = []));
        list.push({ node: child as Text, control, heading });
        atoms++;
      } else if (child instanceof Element) atoms += visit(child, next);
    }

    const facts = cache.get(element);
    if (!shown || inline || !facts) return atoms;
    // The element's own box: a photograph background is a part itself; an opaque fill hides what passes under it, as in the
    // original. A box draws no frame and no borders of its own: only cells are framed, once each, so frames never nest.
    if (facts.image === "photo") {
      elementCell(element, style, wordFor("media", control, group), boxColour(element));
      return atoms + 1;
    }
    const edged = facts.borders.length > 0 || facts.shadow;
    // Light-mode chips are a 5 % tint of black; anything fainter is not a visible box.
    if (facts.alpha < 0.03 && facts.image === "none" && !edged) return atoms;
    const { width, height } = boxSize(element);
    const area = width * height;
    if (area < 1) return atoms;
    const ground = area >= viewportArea * 0.6;
    if (!ground && !near(element)) return atoms;
    const opaque = facts.alpha >= 0.6;
    if (!opaque && !edged && area > viewportArea * 0.25) return atoms; // a scrim over media, not a box
    const paint = paintOf(element);
    paint.fill ||= opaque || (!ground && facts.alpha >= 0.03);
    // An empty box (a progress bar, a placeholder, a badge without text) is a part of its own.
    if (atoms === 0 && !ground && height >= 10 && width >= 16) {
      paint.fill = true;
      elementCell(element, style, wordFor("icon", control, group), boxColour(element));
    }
    return atoms;
  };

  visit(root, { faded: false, carrier: null, control: null, heading: false });
  collectText(texts, paintOf, cache, options);
  sequence?.settle();
  return paints;
}
