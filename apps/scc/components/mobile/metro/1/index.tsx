"use client";

import { useEffect, useRef } from "react";
import { drop, hold, step } from "./physics";
import { draw } from "./render";
import { type Scene, buildScene } from "./scene";
import styles from "./metro.module.css";

// A touch this close (CSS px) to a station takes hold of it.
const GRAB_DISTANCE = 28;
// The loop sleeps once no node moves more than this (px per frame).
const REST = 0.02;
// The sharp, full-resolution frame follows once the network rests this long.
const SETTLE_MS = 120;
const SHARP_DPR_CAP = 2;

type Finger = {
  node: number;
  /** Station minus finger at touch-down, so the station keeps its grip. */
  ox: number;
  oy: number;
  x: number;
  y: number;
};

/**
 * /1's 노선도 as a physical network: take hold of a station — 사당, say — and
 * put it somewhere else. Its links stretch like cords and pull the next
 * stations, which pull theirs, line by line and station by station, in real
 * time; the connections never change. A released station stays where it was
 * put and the rest settles around it.
 */
export default function MetroOne() {
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
      for (const f of fingers.values()) hold(scene.net, f.node, f.x + f.ox, f.y + f.oy);
      const moved = step(scene.net);
      // Moving: the DPR 1 canvas, inside the particle budget.
      draw(motionCtx, scene, atlas, 1);
      motion.style.visibility = "visible";
      sharp.style.visibility = "hidden";
      window.clearTimeout(settleTimer);
      if (fingers.size > 0 || moved > REST) {
        pending = requestAnimationFrame(tick);
      } else {
        settleTimer = window.setTimeout(showSharp, SETTLE_MS);
      }
    };
    const wake = () => {
      if (!pending) pending = requestAnimationFrame(tick);
    };

    const rebuild = () => {
      const width = page.clientWidth;
      const height = page.clientHeight;
      if (!width || !height) return;
      const mine = (generation += 1);
      fingers.clear();
      cancelAnimationFrame(pending);
      pending = 0;
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
      <canvas ref={sharpRef} className={styles.map} role="img" aria-label="수도권 전철 노선도. 역을 잡아 옮기면 이어진 선과 역이 따라 움직입니다" />
      <canvas ref={motionRef} className={styles.map} aria-hidden="true" />
    </main>
  );
}
