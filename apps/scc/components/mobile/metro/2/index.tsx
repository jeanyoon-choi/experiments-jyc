"use client";

import { useEffect, useRef } from "react";
import { draw } from "./render";
import { type Scene, buildScene, flow, refine, restore, settle } from "./scene";
import styles from "./metro.module.css";

// Finger reach, as a share of the screen's width: a grabbed station carries a
// wide neighbourhood, a stroke over open map a narrower one.
const GRAB_REACH = 0.34;
const SKATE_REACH = 0.2;
// A touch this close (CSS px) to a station takes hold of it.
const GRAB_DISTANCE = 26;
// The sharp, full-resolution frame follows once the fingers rest this long.
const SETTLE_MS = 140;
const SHARP_DPR_CAP = 2;

type Finger = {
  x: number;
  y: number;
  /** Grabbed station's point, or -1 for open map. */
  point: number;
  /** Station minus finger at touch-down, so the station keeps its grip. */
  ox: number;
  oy: number;
  /** Where this finger's drag starts, in the reference state. */
  x0: number;
  y0: number;
};

/**
 * /1's 노선도 as a rubber sheet: drag a station — 사당, say — and it goes where
 * the finger puts it while the plane around it stretches and folds in without
 * tearing; lines, stations and every letter follow the same deformation.
 */
export default function MetroTwo() {
  const pageRef = useRef<HTMLElement>(null);
  const sharpRef = useRef<HTMLCanvasElement>(null);
  const motionRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    const sharp = sharpRef.current;
    const motion = motionRef.current;
    if (!page || !sharp || !motion) return;
    const sharpCtx = sharp.getContext("2d");
    const motionCtx = motion.getContext("2d", { alpha: false });
    if (!sharpCtx || !motionCtx) return;

    let scene: Scene | null = null;
    let atlas: CanvasImageSource | null = null;
    let generation = 0;
    let pending = 0;
    let settleTimer = 0;
    let dirty = false;
    const fingers = new Map<number, Finger>();

    const insets = () => {
      const style = getComputedStyle(page);
      const read = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
      return { top: read("--safe-top"), bottom: read("--safe-bottom"), left: read("--safe-left"), right: read("--safe-right") };
    };

    const size = (canvas: HTMLCanvasElement, w: number, h: number, dpr: number) => {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    const sharpDpr = () => Math.min(SHARP_DPR_CAP, window.devicePixelRatio || 1);

    const showSharp = () => {
      settleTimer = 0;
      if (!scene || !atlas) return;
      draw(sharpCtx, scene, atlas, sharpDpr());
      sharp.style.visibility = "visible";
      motion.style.visibility = "hidden";
    };

    const tick = () => {
      pending = 0;
      if (!scene || !atlas) return;
      if (dirty) {
        dirty = false;
        // Every frame starts again from the reference state, so each finger's
        // deformation depends only on where it started and where it is.
        const deformed = scene;
        const apply = () => {
          restore(deformed);
          for (const f of fingers.values()) {
            const reach = deformed.width * (f.point >= 0 ? GRAB_REACH : SKATE_REACH);
            flow(deformed, f.x0, f.y0, f.x + f.ox, f.y + f.oy, reach);
          }
        };
        apply();
        // New samples where lines stretched; flow again so they sit exactly.
        if (refine(deformed) > 0) apply();
        // Moving: the DPR 1 canvas, inside the particle budget.
        draw(motionCtx, scene, atlas, 1);
        motion.style.visibility = "visible";
        sharp.style.visibility = "hidden";
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(showSharp, SETTLE_MS);
      }
    };
    /** Draws any movement not yet drawn, now rather than next frame. */
    const flush = () => {
      if (!dirty) return;
      cancelAnimationFrame(pending);
      tick();
    };
    /** Bakes the current deformation; every finger restarts from where it is. */
    const rebase = () => {
      if (!scene) return;
      settle(scene);
      for (const f of fingers.values()) {
        f.x0 = f.x + f.ox;
        f.y0 = f.y + f.oy;
      }
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(tick);
    };

    const rebuild = () => {
      const width = page.clientWidth;
      const height = page.clientHeight;
      if (!width || !height) return;
      const mine = (generation += 1);
      fingers.clear();
      scene = buildScene(width, height, insets());
      size(sharp, width, height, sharpDpr());
      size(motion, width, height, 1);
      const built = scene;
      if (atlas && "close" in atlas) (atlas as ImageBitmap).close();
      atlas = built.atlas;
      showSharp();
      // An immutable bitmap: Safari re-copies a canvas source on every draw.
      if ("createImageBitmap" in window) {
        createImageBitmap(built.atlas).then((bitmap) => {
          if (mine !== generation) {
            bitmap.close();
            return;
          }
          atlas = bitmap;
          built.atlas.width = 0;
        });
      }
    };

    let resizeTimer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuild, 120);
    });
    observer.observe(page);
    rebuild();

    const local = (e: PointerEvent) => {
      const r = page.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      if (!scene) return;
      page.setPointerCapture(e.pointerId);
      const { x, y } = local(e);
      let best = -1;
      let bestD = GRAB_DISTANCE * GRAB_DISTANCE;
      for (const point of scene.stationPoint.values()) {
        const dx = scene.points[point * 2] - x;
        const dy = scene.points[point * 2 + 1] - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = point;
        }
      }
      const ox = best >= 0 ? scene.points[best * 2] - x : 0;
      const oy = best >= 0 ? scene.points[best * 2 + 1] - y : 0;
      flush();
      rebase();
      fingers.set(e.pointerId, { x, y, point: best, ox, oy, x0: x + ox, y0: y + oy });
    };
    const onMove = (e: PointerEvent) => {
      const f = fingers.get(e.pointerId);
      if (!f) return;
      const { x, y } = local(e);
      f.x = x;
      f.y = y;
      dirty = true;
      schedule();
    };
    const onUp = (e: PointerEvent) => {
      if (!fingers.has(e.pointerId)) return;
      // Bring the drawn state up to this finger's last position, then keep it.
      flush();
      fingers.delete(e.pointerId);
      rebase();
    };

    page.addEventListener("pointerdown", onDown);
    page.addEventListener("pointermove", onMove);
    page.addEventListener("pointerup", onUp);
    page.addEventListener("pointercancel", onUp);
    return () => {
      generation += 1;
      observer.disconnect();
      cancelAnimationFrame(pending);
      window.clearTimeout(settleTimer);
      window.clearTimeout(resizeTimer);
      page.removeEventListener("pointerdown", onDown);
      page.removeEventListener("pointermove", onMove);
      page.removeEventListener("pointerup", onUp);
      page.removeEventListener("pointercancel", onUp);
      if (atlas && "close" in atlas) (atlas as ImageBitmap).close();
    };
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      <canvas ref={sharpRef} className={styles.map} role="img" aria-label="수도권 전철 노선도. 역을 끌면 노선도가 위상을 유지한 채 휘어집니다" />
      <canvas ref={motionRef} className={styles.map} aria-hidden="true" />
    </main>
  );
}
