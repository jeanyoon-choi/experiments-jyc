"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { myeongjo } from "./fonts";
import { collectGlyphs, skate, step, type Scene } from "./model/physics";
import { createRenderer } from "./model/render";
import { BOOK, CHAPTERS } from "./model/text";
import styles from "./reader.module.css";

const STORAGE_KEY = "scc:no-longer-human/1:progress";
// Taps in the outer 30% turn pages; the middle shows or hides the reader bars.
const EDGE = 0.3;
const SWIPE = 0.18;
// Particle safety budget: canvas at DPR 1, letters drifting on their own float
// at 24 Hz; frames follow the display while a finger is down, a page is
// turning, or letters still carry a push (faster than 1 px/frame).
const IDLE_FRAME = 1000 / 24;
const STEP = 1000 / 60;

type Layout = { width: number; pages: number; chapterStarts: number[] };

const readProgress = () => {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
  } catch {
    return 0;
  }
};

const writeProgress = (value: number) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {}
};

type Geometry = { left: number; top: number; width: number; height: number; margin: number };

export default function NoLongerHumanOne() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLSpanElement>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const progressRef = useRef<number | null>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    time: number;
    horizontal: boolean | null;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Scattered pages, by page index; an untouched page has no scene and shows the typeset text.
  const scenesRef = useRef(new Map<number, Scene>());
  const pageRef = useRef(0);
  const widthRef = useRef(0);
  // Horizontal drag offset, written straight to the flow's transform (no React render per move).
  const dragOffsetRef = useRef(0);
  const geometryRef = useRef<Geometry | null>(null);
  const activeUntilRef = useRef(0);
  const touchingRef = useRef(false);
  const wakeRef = useRef<() => void>(() => {});
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  // Pages read and rasterised ahead of the first stroke, so it starts without a stall.
  const preparedRef = useRef(new Map<number, Scene>());

  const [layout, setLayout] = useState<Layout>({ width: 0, pages: 1, chapterStarts: [] });
  const [page, setPage] = useState(0);
  const [chrome, setChrome] = useState(false);

  const placeFlow = useCallback((offset: number) => {
    const flow = flowRef.current;
    if (!flow) return;
    dragOffsetRef.current = offset;
    flow.toggleAttribute("data-dragging", offset !== 0);
    flow.style.transform = `translate3d(${offset - pageRef.current * widthRef.current}px, 0, 0)`;
  }, []);

  // Columns are one page wide; every page is the full viewport width apart.
  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const flow = flowRef.current;
    const end = endRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !flow || !end || !canvas) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const viewportRect = viewport.getBoundingClientRect();
    const margin = flow.offsetLeft;
    const origin = flow.getBoundingClientRect().left;
    const pageOf = (element: Element) => Math.max(0, Math.floor((element.getBoundingClientRect().left - origin + 1) / width));
    const pages = pageOf(end) + 1;
    const chapterStarts = headingRefs.current.map((heading) => (heading ? pageOf(heading) : 0));
    geometryRef.current = { left: viewportRect.left, top: viewportRect.top, width, height, margin };
    widthRef.current = width;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    // Reflow moves every letter, so scattered pages are set again in type.
    scenesRef.current.clear();
    preparedRef.current.clear();
    wakeRef.current();
    setLayout({ width, pages, chapterStarts });
    const progress = progressRef.current ?? readProgress();
    setPage(Math.round(progress * (pages - 1)));
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    document.fonts?.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measure]);

  useLayoutEffect(() => {
    pageRef.current = page;
    widthRef.current = layout.width;
    placeFlow(0);
    activeUntilRef.current = performance.now() + 450;
    wakeRef.current();
  }, [page, layout.width, placeFlow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    const flow = flowRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !viewport || !flow || !context) return;
    const style = getComputedStyle(viewport);
    const renderer = createRenderer(
      style.getPropertyValue("--paper").trim() || "#fbf9f4",
      style.getPropertyValue("--ink").trim() || "#23201c",
    );
    rendererRef.current = renderer;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastFrame = 0;
    let lastStep = 0;
    let painted = false;

    const tick = (now: number) => {
      frame = 0;
      const geometry = geometryRef.current;
      if (!geometry) return;
      const scenes = scenesRef.current;
      const current = pageRef.current;
      const scene = scenes.get(current);
      const previous = scenes.get(current - 1);
      const next = scenes.get(current + 1);
      const touching = touchingRef.current;
      const sliding = now < activeUntilRef.current;

      if (!scene && !previous && !next) {
        if (painted) context.clearRect(0, 0, geometry.width, geometry.height);
        painted = false;
        lastStep = 0;
        return;
      }
      if (!touching && !sliding && !scene?.lively && now - lastFrame < IDLE_FRAME - 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      lastFrame = now;
      const steps = lastStep ? Math.min(Math.max(Math.round((now - lastStep) / STEP), 1), 4) : 1;
      lastStep = now;
      if (scene) for (let index = 0; index < steps; index += 1) step(scene, !reduced.matches);

      // Only a sliding page needs its animated position read back from layout.
      const shift =
        sliding && !touching
          ? flow.getBoundingClientRect().left - geometry.left - geometry.margin
          : dragOffsetRef.current - current * geometry.width;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, geometry.width, geometry.height);
      if (previous) renderer.draw(context, previous, shift + (current - 1) * geometry.width);
      if (scene) renderer.draw(context, scene, shift + current * geometry.width);
      if (next) renderer.draw(context, next, shift + (current + 1) * geometry.width);
      painted = true;

      if (touching || sliding || scene?.awake) frame = requestAnimationFrame(tick);
      else lastStep = 0;
    };

    wakeRef.current = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    wakeRef.current();
    return () => {
      cancelAnimationFrame(frame);
      wakeRef.current = () => {};
      rendererRef.current = null;
      renderer.dispose();
    };
  }, []);

  const readPage = useCallback((index: number) => {
    const flow = flowRef.current;
    const geometry = geometryRef.current;
    if (!flow || !geometry) return null;
    const pageLeft = flow.getBoundingClientRect().left - geometry.margin + index * geometry.width;
    const scene = collectGlyphs(flow, pageLeft, geometry.top, geometry.width, geometry.height);
    rendererRef.current?.prepare(scene);
    return scene;
  }, []);

  // Once a page has settled, read its letters during the pause before any stroke.
  useEffect(() => {
    if (page === 0 || layout.width === 0) return;
    const timer = window.setTimeout(() => {
      if (scenesRef.current.has(page) || preparedRef.current.has(page)) return;
      const scene = readPage(page);
      if (scene) preparedRef.current.set(page, scene);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [page, layout.width, readPage]);

  // Vertical strokes skate the letters of the current page (never the cover).
  const skateTo = (clientX: number, clientY: number) => {
    const start = dragRef.current;
    const flow = flowRef.current;
    const geometry = geometryRef.current;
    if (!start || !flow || !geometry || page === 0) return;
    const scenes = scenesRef.current;
    let scene = scenes.get(page);
    const left = geometry.left;
    const top = geometry.top;
    if (!scene) {
      scene = preparedRef.current.get(page) ?? readPage(page) ?? undefined;
      if (!scene) return;
      preparedRef.current.delete(page);
      scenes.set(page, scene);
    }
    skate(scene, start.lastX - left, start.lastY - top, clientX - left, clientY - top);
    start.lastX = clientX;
    start.lastY = clientY;
    wakeRef.current();
  };

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), layout.pages - 1);
      const progress = layout.pages > 1 ? clamped / (layout.pages - 1) : 0;
      progressRef.current = progress;
      writeProgress(progress);
      setPage(clamped);
    },
    [layout.pages],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") goTo(page + 1);
      else if (event.key === "ArrowLeft" || event.key === "PageUp") goTo(page - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, page]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      time: event.timeStamp,
      horizontal: null,
    };
    touchingRef.current = true;
    wakeRef.current();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (start.horizontal === null && Math.hypot(dx, dy) > 8) start.horizontal = Math.abs(dx) > Math.abs(dy);
    if (start.horizontal === false) skateTo(event.clientX, event.clientY);
    if (!start.horizontal) return;
    // The first and last pages resist being pulled past the book's edge.
    const atEdge = (page === 0 && dx > 0) || (page === layout.pages - 1 && dx < 0);
    placeFlow(atEdge ? dx / 3 : dx);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start || start.id !== event.pointerId) return;
    dragRef.current = null;
    touchingRef.current = false;
    activeUntilRef.current = performance.now() + 450;
    const dx = event.clientX - start.x;
    placeFlow(0);
    if (start.horizontal) {
      const fast = Math.abs(dx) / Math.max(event.timeStamp - start.time, 1) > 0.4;
      if (Math.abs(dx) > layout.width * SWIPE || (fast && Math.abs(dx) > 24)) goTo(page + (dx < 0 ? 1 : -1));
      return;
    }
    if (start.horizontal === false) return;
    const x = event.clientX / window.innerWidth;
    if (chrome) setChrome(false);
    else if (x < EDGE) goTo(page - 1);
    else if (x > 1 - EDGE) goTo(page + 1);
    else setChrome(true);
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    touchingRef.current = false;
    placeFlow(0);
  };

  let chapter = -1;
  layout.chapterStarts.forEach((start, index) => {
    if (page >= start) chapter = index;
  });
  const isChapterOpening = layout.chapterStarts.includes(page);
  const runningHead = page === 0 ? "" : chapter >= 0 && !isChapterOpening ? CHAPTERS[chapter].title : BOOK.title;
  const remaining = chapter >= 0 ? (layout.chapterStarts[chapter + 1] ?? layout.pages) - page - 1 : 0;

  return (
    <main className={`${styles.reader} ${myeongjo.variable}`}>
      <header className={styles.head}>
        <span className={styles.meta}>{page === 0 ? "" : runningHead}</span>
      </header>

      <div
        ref={viewportRef}
        className={styles.viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div ref={flowRef} className={styles.flow}>
          <Book headingRefs={headingRefs} />
          <span ref={endRef} className={styles.end} aria-hidden />
        </div>
        <canvas ref={canvasRef} className={styles.letters} aria-hidden />
      </div>

      <footer className={styles.foot}>
        <span className={styles.meta}>{page === 0 ? "" : chrome ? `${page + 1} / ${layout.pages}` : `${page + 1}`}</span>
      </footer>

      <div className={styles.bars} data-open={chrome || undefined} aria-hidden={!chrome}>
        <div className={styles.topBar}>
          <span className={styles.barTitle}>{BOOK.title}</span>
          <span className={styles.barAuthor}>{BOOK.author}</span>
        </div>
        <div className={styles.bottomBar}>
          <input
            className={styles.scrubber}
            type="range"
            min={0}
            max={Math.max(layout.pages - 1, 0)}
            step={1}
            value={page}
            onChange={(event) => goTo(Number(event.target.value))}
            aria-label="쪽 이동"
            tabIndex={chrome ? 0 : -1}
          />
          <div className={styles.barMeta}>
            <span>{chapter >= 0 ? CHAPTERS[chapter].title : BOOK.title}</span>
            <span>{chapter >= 0 && remaining > 0 ? `이 장에서 ${remaining}쪽 남음` : `${page + 1} / ${layout.pages}`}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

// The typeset text never changes, so page turns and bar toggles skip it.
const Book = memo(function Book({ headingRefs }: { headingRefs: RefObject<(HTMLHeadingElement | null)[]> }) {
  return (
    <>
      <section className={styles.cover}>
        <h1 className={styles.title}>{BOOK.title}</h1>
        <p className={styles.author}>{BOOK.author}</p>
      </section>
      {CHAPTERS.map((section, index) => (
        <section key={section.id} className={styles.chapter}>
          <h2
            ref={(node) => {
              headingRefs.current[index] = node;
            }}
            className={styles.chapterTitle}
          >
            {section.title}
          </h2>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={`${section.id}-${paragraphIndex}`} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </>
  );
});
