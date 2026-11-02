"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { PREFIX, UI } from "../marks";
import "./split.css";

const MARK = `data-${PREFIX}`;
const PROPERTY = `--${PREFIX}-`;
/** On a copied scroller: the axis it follows its live scroller on (`y` or `x`). */
const FOLLOW = "data-split-follow";
/** On a copied scroller's sticky child: held in place, as the live one is. */
const PIN = "data-split-pin";
/** Custom properties on a copied scroller: the live scroller's timeline and its scroll range. */
const TIMELINE = "--split-timeline";
const RANGE = "--split-range";

/** Everything the renderer (or this mirror) wrote into a live element that its copy must not carry. */
const unwanted = (name: string) => name.startsWith(PROPERTY) || name.startsWith("scroll-timeline");
const strip = (element: Element) => {
  for (const name of element.getAttributeNames()) if (name.startsWith(MARK)) element.removeAttribute(name);
  const style = (element as HTMLElement).style;
  if (!style) return;
  for (let i = style.length - 1; i >= 0; i--) if (unwanted(style[i])) style.removeProperty(style[i]);
  if (element.getAttribute("style") === "") element.removeAttribute("style");
};
/** A live style attribute as its copy should read it, measured on a scratch element so the copy is touched only on a real change. */
const scratch = typeof document === "undefined" ? null : document.createElement("div");
const strippedStyle = (value: string) => {
  if (!scratch) return value;
  scratch.setAttribute("style", value);
  for (let i = scratch.style.length - 1; i >= 0; i--) if (unwanted(scratch.style[i])) scratch.style.removeProperty(scratch.style[i]);
  return scratch.getAttribute("style") ?? "";
};

/** Scroll-driven animations run with the scroll itself, on the compositor; without them the copy is scrolled from scroll events. */
const timelines = typeof CSS !== "undefined" && CSS.supports("animation-timeline: --a") && CSS.supports("timeline-scope: --a");

/**
 * The untouched interface, drawn over the left half of the screen. It is a copy of the live clone's DOM kept in step by a
 * MutationObserver (React and the renderer write only into the live one), with the renderer's marks stripped and the subtree
 * marked as our own UI, so the hiding sheet leaves it in its original paint. It takes no input: every touch falls through to
 * the live, replaced clone underneath, whose right half shows past the copy.
 *
 * Scrolling never passes through script. Each live scroller, once it moves, names its scroll timeline; its copy stops
 * scrolling and its children are translated by an animation on that timeline over exactly the live scroll range, so both
 * halves move in the same compositor frame, momentum and snapping included.
 */
export default function Mirror({ source }: { source: RefObject<HTMLElement | null> }) {
  const host = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const live = source.current;
    const mirror = host.current;
    if (!live || !mirror) return;
    const root = document.documentElement;
    const pairs = new WeakMap<Node, Node>();
    // Copies made since the last pass: values, playback and scroll positions are set once the copy is in the document.
    let fresh: [Node, Node][] = [];
    // Live scroller → its timeline's name and axis; the names are scoped on <html> so the copy, outside the scroller, can use them.
    const followed = new Map<Element, { name: string; axis: "x" | "y" }>();
    let count = 0;

    /** A copy's scroller made to follow its live scroller's timeline, and its direct sticky children pinned. */
    const decorate = (from: Element, to: HTMLElement) => {
      const follow = followed.get(from);
      if (!follow) return;
      to.setAttribute(FOLLOW, follow.axis);
      to.style.setProperty(TIMELINE, follow.name);
      to.scrollTop = 0;
      to.scrollLeft = 0;
      measure(from, to);
      for (const child of to.children) pin(from, child);
    };
    const measure = (from: Element, to: HTMLElement) => {
      const axis = followed.get(from)?.axis;
      const range = axis === "x" ? from.scrollWidth - from.clientWidth : from.scrollHeight - from.clientHeight;
      const value = `${Math.max(0, range)}px`;
      if (to.style.getPropertyValue(RANGE) !== value) to.style.setProperty(RANGE, value);
    };
    const pin = (scroller: Element, child: Element) => {
      const liveChild = Array.from(scroller.children).find((c) => pairs.get(c) === child);
      const sticky = liveChild ? getComputedStyle(liveChild).position === "sticky" : false;
      if (sticky !== child.hasAttribute(PIN)) child.toggleAttribute(PIN, sticky);
    };

    const copyState = (from: Node, to: Node) => {
      if (from instanceof HTMLInputElement || from instanceof HTMLTextAreaElement) {
        const target = to as HTMLInputElement;
        if (target.value !== from.value) target.value = from.value;
        if (from instanceof HTMLInputElement && target.checked !== from.checked) target.checked = from.checked;
      }
      if (from instanceof HTMLVideoElement) {
        const video = to as HTMLVideoElement;
        video.muted = true;
        if (Math.abs(video.currentTime - from.currentTime) > 0.25) video.currentTime = from.currentTime;
        if (from.paused !== video.paused) void (from.paused ? video.pause() : video.play().catch(() => undefined));
      }
      if (from instanceof Element && to instanceof HTMLElement) {
        if (followed.has(from)) decorate(from, to);
        else if (!timelines && (from.scrollTop || from.scrollLeft || to.scrollTop || to.scrollLeft)) {
          to.scrollTop = from.scrollTop;
          to.scrollLeft = from.scrollLeft;
        }
      }
    };

    const pair = (from: Node, to: Node) => {
      pairs.set(from, to);
      if (to instanceof Element) strip(to);
      if (from instanceof HTMLInputElement || from instanceof HTMLTextAreaElement || from instanceof HTMLVideoElement || followed.has(from as Element)) fresh.push([from, to]);
      for (let a = from.firstChild, b = to.firstChild; a && b; a = a.nextSibling, b = b.nextSibling) pair(a, b);
    };
    const copyOf = (node: Node) => {
      const known = pairs.get(node);
      if (known) return known;
      const copy = node.cloneNode(true);
      pair(node, copy);
      return copy;
    };
    /** The copy's children made to match the live node's, reusing the copies already made. */
    const reconcile = (from: Node, to: Node) => {
      const wanted = Array.from(from.childNodes, copyOf);
      let moved = false;
      wanted.forEach((child, i) => {
        if (to.childNodes[i] !== child) {
          to.insertBefore(child, to.childNodes[i] ?? null);
          moved = true;
        }
      });
      while (to.childNodes.length > wanted.length) {
        to.removeChild(to.lastChild!);
        moved = true;
      }
      if (moved && from instanceof Element && followed.has(from)) for (const child of (to as Element).children) pin(from, child);
    };
    const settle = () => {
      for (const [from, to] of fresh) copyState(from, to);
      fresh = [];
    };

    /** A live scroller that moved for the first time names its timeline; from then on its copy follows without script. */
    const follow = (scroller: Element) => {
      const style = getComputedStyle(scroller);
      const axis = scroller.scrollWidth > scroller.clientWidth && /auto|scroll/.test(style.overflowX) && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(style.overflowY)) ? "x" : "y";
      const name = `--split-${count++}`;
      followed.set(scroller, { name, axis });
      (scroller as HTMLElement).style.setProperty("scroll-timeline", `${name} ${axis === "x" ? "inline" : "block"}`);
      root.style.setProperty("timeline-scope", Array.from(followed.values(), (f) => f.name).join(", "));
      const copy = pairs.get(scroller);
      if (copy instanceof HTMLElement) decorate(scroller, copy);
    };

    mirror.replaceChildren();
    pairs.set(live, mirror);
    reconcile(live, mirror);
    settle();

    const observer = new MutationObserver((records) => {
      const parents = new Set<Node>();
      for (const record of records) {
        const copy = pairs.get(record.target);
        if (!copy) continue;
        if (record.type === "childList") parents.add(record.target);
        else if (record.type === "characterData") (copy as CharacterData).data = (record.target as CharacterData).data;
        else if (record.attributeName && copy !== mirror) {
          const name = record.attributeName;
          // The renderer's marks and cell properties are most of what changes; the copy is touched only for the clone's own.
          if (name.startsWith(MARK)) continue;
          const element = copy as HTMLElement;
          const raw = (record.target as Element).getAttribute(name);
          if (name === "style") {
            const value = raw === null ? "" : strippedStyle(raw);
            const ownBefore = element.getAttribute("style") ?? "";
            if (followed.has(record.target as Element)) {
              element.setAttribute("style", value);
              decorate(record.target as Element, element);
            } else if (ownBefore !== value) {
              if (value) element.setAttribute("style", value);
              else element.removeAttribute("style");
            }
          } else if (raw === null) element.removeAttribute(name);
          else if (element.getAttribute(name) !== raw) element.setAttribute(name, raw);
        }
      }
      for (const parent of parents) {
        const copy = pairs.get(parent);
        if (copy && parent.isConnected) reconcile(parent, copy);
      }
      settle();
      // A controlled field set from state (a sent comment clearing its box) fires no event; a scroller's range moves with its content.
      for (const field of live.querySelectorAll("input, textarea")) {
        const copy = pairs.get(field);
        if (copy) copyState(field, copy);
      }
      for (const [scroller] of followed) {
        const copy = pairs.get(scroller);
        if (scroller.isConnected && copy instanceof HTMLElement) measure(scroller, copy);
        else if (!scroller.isConnected) followed.delete(scroller);
      }
    });
    observer.observe(live, { subtree: true, childList: true, characterData: true, attributes: true });

    const onEvent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !live.contains(target)) return;
      if (event.type === "scroll") {
        if (timelines) {
          if (!followed.has(target)) follow(target);
          return;
        }
      }
      const copy = pairs.get(target);
      if (copy) copyState(target, copy);
    };
    const kinds = ["scroll", "input", "change", "play", "pause", "seeked"] as const;
    for (const kind of kinds) document.addEventListener(kind, onEvent, { capture: true, passive: true });
    const onResize = () => {
      for (const [scroller] of followed) {
        const copy = pairs.get(scroller);
        if (copy instanceof HTMLElement) measure(scroller, copy);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      for (const kind of kinds) document.removeEventListener(kind, onEvent, { capture: true });
      window.removeEventListener("resize", onResize);
      for (const [scroller] of followed) (scroller as HTMLElement).style.removeProperty("scroll-timeline");
      root.style.removeProperty("timeline-scope");
      mirror.replaceChildren();
    };
  }, [source]);

  return <div ref={host} {...{ [UI]: "" }} className="dada-text-split" aria-hidden="true" inert />;
}
