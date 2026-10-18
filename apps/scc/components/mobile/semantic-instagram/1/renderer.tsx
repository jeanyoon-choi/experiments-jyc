"use client";

import { useLayoutEffect, useRef } from "react";
import { cellProperties } from "./drawing/properties";
import { palette, type Look } from "./drawing/look";
import "./drawing/sheet.css";
import { CELL, EDGE, RAW, ROOT, TEXT, UI } from "./marks";
import { refreshFacts, type Facts } from "./reading/facts";
import type { Reach, ReadOptions } from "./reading/paint";
import { collect } from "./reading/parts";
import type { CommandGroup } from "./words/vocabulary";

/** The root's state for a look and reach: which sheet hides what (everything, or content cells alone), the ground, and the outer frame. */
const mark = (root: HTMLElement, look: Look, reach: Reach) => {
  root.setAttribute(ROOT, `${reach === "content" ? "content-" : ""}${look.dark ? "dark" : "replace"}`);
  root.style.setProperty(EDGE, `${look.edge}px`);
};
const SCROLL_INTERVAL = 100;
/** Input types `reading/parts.ts` gives no cell. */
const uncelled = new Set(["hidden", "checkbox", "radio", "range"]);

/**
 * Reads the page and writes every cell into the page's own CSS backgrounds, so nothing has to follow scrolling.
 * The page is re-read in the frame after its DOM, layout or loaded media change, and every 100 ms while it scrolls, for parts
 * coming within a screen of view. A new look only rewrites the cells from what was already read.
 */
export default function Renderer({ group, look, reach }: { group: CommandGroup; look: Look; reach: Reach }) {
  const lookRef = useRef(look);
  const rewrite = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    lookRef.current = look;
    if (rewrite.current) {
      mark(document.documentElement, look, reach);
      rewrite.current();
    }
  }, [look, reach]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const facts = new WeakMap<Element, Facts>();
    // Subtrees whose classes or styles changed: their original paint is read again.
    const changed = new Set<Element>();
    const written = new Map<Element, Record<string, string>>();
    let frame = 0;

    const read = () => {
      frame = 0;
      lastRead = performance.now();
      const look = lookRef.current;
      refreshFacts(body, facts, changed);
      const options: ReadOptions = { group, reach, stroke: palette(look).stroke, coloured: look.ink === "colour", random: look.ink === "random", onColour: schedule };
      const paints = collect(body, facts, options);

      // The clone is hidden only now, in the same frame its cells are written.
      mark(root, look, reach);
      const next = new Map<Element, Record<string, string>>();
      for (const [element, paint] of paints) {
        if (!paint.fill && !paint.frame && !paint.borders.length && !paint.layers.length) continue;
        const properties = cellProperties(paint, look);
        const before = written.get(element);
        const style = (element as HTMLElement).style;
        for (const name in properties) if (before?.[name] !== properties[name]) style.setProperty(name, properties[name]);
        if (!before) element.setAttribute(CELL, "");
        if (paint.text) element.setAttribute(TEXT, "");
        else if (before) element.removeAttribute(TEXT);
        next.set(element, properties);
      }
      for (const [element, properties] of written) {
        if (next.has(element)) continue;
        for (const name in properties) (element as HTMLElement).style.removeProperty(name);
        element.removeAttribute(CELL);
        element.removeAttribute(TEXT);
      }
      written.clear();
      for (const [element, properties] of next) written.set(element, properties);
      // Our own attribute and property writes are not changes of the clone.
      observer.takeRecords();
    };

    const schedule = () => {
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
        scrollTimer = 0;
      }
      if (!frame) frame = window.requestAnimationFrame(read);
    };
    // Scrolling alone changes no cell already written; it only brings parts within a screen of view, so it is read less often.
    let lastRead = -Infinity;
    let scrollTimer = 0;
    const onScroll = () => {
      if (frame || scrollTimer) return;
      const wait = lastRead + SCROLL_INTERVAL - performance.now();
      if (wait <= 0) schedule();
      else scrollTimer = window.setTimeout(() => { scrollTimer = 0; schedule(); }, wait);
    };

    const ours = (node: Node) => Boolean((node instanceof Element ? node : node.parentElement)?.closest(`[${UI}]`));
    const observer = new MutationObserver((mutations) => {
      let relevant = false;
      for (const mutation of mutations) {
        if (ours(mutation.target)) continue;
        if (mutation.type === "attributes") {
          const target = mutation.target as Element;
          if (mutation.attributeName === CELL || mutation.attributeName === RAW || mutation.attributeName === TEXT) continue;
          // A range, hidden, checkbox or radio input has no cell and holds no text: its value, name or style changing (a
          // playing video's scrubber, several times a second) changes nothing that is read.
          if (target instanceof HTMLInputElement && uncelled.has(target.type)) continue;
          changed.add(target);
          // A bar or meter whose inline size changes every frame (a playing video's progress) moves no text, and its cell is
          // its own box; it is re-read with the next change that does need a reading.
          if (mutation.attributeName === "style" && !target.textContent?.trim()) continue;
        }
        relevant = true;
      }
      if (relevant) schedule();
    });

    read();
    rewrite.current = read;
    observer.observe(body, { subtree: true, childList: true, characterData: true, attributes: true });
    const onResize = () => {
      // Media queries may restyle anything.
      changed.add(body);
      schedule();
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(body);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("load", schedule, true);
    document.addEventListener("transitionend", schedule, true);
    document.addEventListener("animationend", schedule, true);
    document.fonts?.ready.then(schedule);

    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("load", schedule, true);
      document.removeEventListener("transitionend", schedule, true);
      document.removeEventListener("animationend", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      for (const [element, properties] of written) {
        for (const name in properties) (element as HTMLElement).style.removeProperty(name);
        element.removeAttribute(CELL);
        element.removeAttribute(TEXT);
      }
      root.removeAttribute(ROOT);
      root.style.removeProperty(EDGE);
      rewrite.current = null;
    };
  }, [group, reach]);

  return null;
}
