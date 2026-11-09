"use client";

import { useEffect, useRef } from "react";
import { alrim } from "./fonts";
import { drop, hold, step } from "./physics";
import { Painter } from "./render";
import { type Scene, buildScene } from "./scene";
import styles from "./metro.module.css";

// A touch this close (CSS px) to a station takes hold of it.
const GRAB_DISTANCE = 28;
// The loop sleeps once no node moves more than this (px per frame).
const REST = 0.02;
const DPR_CAP = 3;
// While moving, a node is redrawn once it drifts this far (device px) from where it was drawn.
const DRIFT = 0.35;

type Finger = {
  node: number;
  /** Station minus finger at touch-down, so the station keeps its grip. */
  ox: number;
  oy: number;
  x: number;
  y: number;
};

/**
 * /1's 노선도 as a physical network, drawn at the device's own resolution
 * in 서울알림체: take hold of a station and put it somewhere else. Its links
 * stretch like cords and pull the next stations, line by line and station by
 * station, in real time; the connections never change. A released station
 * stays where it was put and the rest settles around it. Each frame repaints
 * only the tiles where something moved.
 */
export default function MetroThree() {
  const pageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    const canvas = canvasRef.current;
    if (!page || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let scene: Scene | null = null;
    let painter: Painter | null = null;
    let generation = 0;
    let pending = 0;
    let disposed = false;
    const fingers = new Map<number, Finger>();
    const family = alrim.style.fontFamily;

    const insets = () => {
      const style = getComputedStyle(page);
      const read = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
      return { top: read("--safe-top"), bottom: read("--safe-bottom"), left: read("--safe-left"), right: read("--safe-right") };
    };
    const closeAtlas = () => {
      for (const page of painter?.atlas ?? []) if ("close" in page) (page as ImageBitmap).close();
    };

    const tick = () => {
      pending = 0;
      if (!scene || !painter) return;
      for (const f of fingers.values()) hold(scene.net, f.node, f.x + f.ox, f.y + f.oy);
      const moved = step(scene.net);
      if (fingers.size > 0 || moved > REST) {
        painter.update(DRIFT / scene.dpr);
        pending = requestAnimationFrame(tick);
      } else {
        // At rest: every node exactly where it is.
        painter.update(1e-4);
      }
    };
    const wake = () => {
      if (!pending) pending = requestAnimationFrame(tick);
    };

    const rebuild = () => {
      const width = page.clientWidth;
      const height = page.clientHeight;
      if (!width || !height || disposed) return;
      const mine = (generation += 1);
      fingers.clear();
      cancelAnimationFrame(pending);
      pending = 0;
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      const built = buildScene(width, height, insets(), dpr, family);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      closeAtlas();
      scene = built;
      painter = new Painter(ctx, built, built.atlas);
      painter.full();
      // Immutable bitmaps: Safari re-copies a canvas source on every draw.
      if ("createImageBitmap" in window) {
        const own = painter;
        Promise.all(built.atlas.map((page) => createImageBitmap(page))).then((bitmaps) => {
          if (mine !== generation || own !== painter) {
            bitmaps.forEach((b) => b.close());
            return;
          }
          own.atlas = bitmaps;
          built.atlas.forEach((page) => (page.width = 0));
        });
      }
    };

    let resizeTimer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuild, 120);
    });
    // Names are measured and rasterised once: wait for 서울알림체.
    Promise.all(["500", "700", "800"].map((w) => document.fonts.load(`${w} 16px ${family}`, "가A1")))
      .catch(() => undefined)
      .then(() => {
        if (disposed) return;
        observer.observe(page);
        rebuild();
      });

    const local = (e: PointerEvent) => {
      const r = page.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      if (!scene) return;
      const { x, y } = local(e);
      const pos = scene.net.pos;
      let best = -1;
      let bestD = GRAB_DISTANCE * GRAB_DISTANCE;
      for (const node of scene.stationNodes) {
        let taken = false;
        for (const f of fingers.values()) if (f.node === node) taken = true;
        if (taken) continue;
        const dx = pos[node * 2] - x;
        const dy = pos[node * 2 + 1] - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = node;
        }
      }
      if (best < 0) return;
      page.setPointerCapture(e.pointerId);
      fingers.set(e.pointerId, { node: best, ox: pos[best * 2] - x, oy: pos[best * 2 + 1] - y, x, y });
      wake();
    };
    const onMove = (e: PointerEvent) => {
      const f = fingers.get(e.pointerId);
      if (!f) return;
      const { x, y } = local(e);
      f.x = x;
      f.y = y;
      wake();
    };
    const onUp = (e: PointerEvent) => {
      const f = fingers.get(e.pointerId);
      if (!f || !scene) return;
      hold(scene.net, f.node, f.x + f.ox, f.y + f.oy);
      drop(scene.net, f.node);
      fingers.delete(e.pointerId);
      wake();
    };

    page.addEventListener("pointerdown", onDown);
    page.addEventListener("pointermove", onMove);
    page.addEventListener("pointerup", onUp);
    page.addEventListener("pointercancel", onUp);
    return () => {
      disposed = true;
      generation += 1;
      observer.disconnect();
      cancelAnimationFrame(pending);
      window.clearTimeout(resizeTimer);
      page.removeEventListener("pointerdown", onDown);
      page.removeEventListener("pointermove", onMove);
      page.removeEventListener("pointerup", onUp);
      page.removeEventListener("pointercancel", onUp);
      closeAtlas();
    };
  }, []);

  return (
    <main ref={pageRef} className={`${styles.page} ${alrim.className}`}>
      <canvas ref={canvasRef} className={styles.map} role="img" aria-label="수도권 전철 노선도. 역을 잡아 옮기면 이어진 선과 역이 따라 움직입니다" />
    </main>
  );
}
