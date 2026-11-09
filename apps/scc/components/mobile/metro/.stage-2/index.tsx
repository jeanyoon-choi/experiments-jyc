"use client";

import { useEffect, useRef } from "react";
import { alrim } from "./fonts";
import { LabelCache } from "./labels";
import { size, stationById } from "./model";
import { drop, hold, step } from "./physics";
import { type Camera, draw } from "./render";
import { type Scene, buildScene } from "./scene";
import styles from "./metro.module.css";

// A touch this close (CSS px) to a station takes hold of it.
const GRAB_DISTANCE = 24;
// The loop sleeps once no node moves more than this (CSS px per frame).
const REST_PX = 0.05;
const DPR_CAP = 3;
// Zoom: the whole map's width at the least; names at 4.5× their map size at the most.
const MAX_SCALE = 4.5;
// Opening view: 시청 at the centre, plain names about 9 CSS px tall.
const OPEN_SCALE = 0.9;
const OPEN_AT = "시청";

type Holder = { kind: "station"; node: number; ox: number; oy: number; x: number; y: number };
type Panner = { kind: "pan"; x: number; y: number };

/**
 * The 2026 서울 지하철 노선도 as it is printed — positions, paths, colours,
 * 서울알림체 — made of cords: pinch and drag the paper to read it; take hold
 * of a station and put it somewhere else, and its lines stretch and pull the
 * next stations, line by line, in real time. A released station stays where
 * it was put and the rest settles around it.
 */
export default function MetroTwo() {
  const pageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    const canvas = canvasRef.current;
    if (!page || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const scene: Scene = buildScene();
    const family = getComputedStyle(page).fontFamily;
    const labels = new LabelCache({ family });
    const cam: Camera = { s: OPEN_SCALE, tx: 0, ty: 0 };
    const view = { width: 0, height: 0, dpr: 1 };
    const pointers = new Map<number, Holder | Panner>();
    let pending = 0;
    let moving = false;
    let opened = false;
    let alive = true;

    const minScale = () => Math.min(view.width / size[0], view.height / size[1]);
    const clamp = () => {
      cam.s = Math.min(MAX_SCALE, Math.max(minScale(), cam.s));
      const w = size[0] * cam.s;
      const h = size[1] * cam.s;
      cam.tx = w <= view.width ? (view.width - w) / 2 : Math.min(0, Math.max(view.width - w, cam.tx));
      cam.ty = h <= view.height ? (view.height - h) / 2 : Math.min(0, Math.max(view.height - h, cam.ty));
    };

    const frame = () => {
      pending = 0;
      if (!alive) return;
      for (const p of pointers.values()) if (p.kind === "station") hold(scene.net, p.node, (p.x - cam.tx) / cam.s + p.ox, (p.y - cam.ty) / cam.s + p.oy);
      const moved = moving ? step(scene.net) : 0;
      const unfinished = draw(ctx, scene, labels, cam, view);
      const holding = [...pointers.values()].some((p) => p.kind === "station");
      if (holding || moved * cam.s > REST_PX || unfinished) {
        moving = holding || moved * cam.s > REST_PX;
        pending = requestAnimationFrame(frame);
      } else {
        moving = false;
      }
    };
    const wake = (physics = false) => {
      if (physics) moving = true;
      if (!pending) pending = requestAnimationFrame(frame);
    };

    const resize = () => {
      const width = page.clientWidth;
      const height = page.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      const centre = view.width ? { x: (view.width / 2 - cam.tx) / cam.s, y: (view.height / 2 - cam.ty) / cam.s } : null;
      view.width = width;
      view.height = height;
      view.dpr = dpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (!opened) {
        opened = true;
        const at = [...stationById.values()].find((s) => s.name === OPEN_AT);
        const cx = at ? at.x : size[0] / 2;
        const cy = at ? at.y : size[1] / 2;
        cam.tx = width / 2 - cx * cam.s;
        cam.ty = height / 2 - cy * cam.s;
      } else if (centre) {
        cam.tx = width / 2 - centre.x * cam.s;
        cam.ty = height / 2 - centre.y * cam.s;
      }
      clamp();
      labels.clear();
      wake();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(page);
    resize();
    // Names wait for 서울알림체; until then the frame shows lines and stations only.
    document.fonts
      .load(`800 12px ${family}`)
      .then(() => Promise.all([document.fonts.load(`700 12px ${family}`), document.fonts.load(`500 12px ${family}`)]))
      .then(() => {
        if (!alive) return;
        labels.clear();
        wake();
      });

    const local = (e: PointerEvent | WheelEvent) => {
      const r = page.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const panners = () => [...pointers.values()].filter((p): p is Panner => p.kind === "pan");

    const onDown = (e: PointerEvent) => {
      const { x, y } = local(e);
      page.setPointerCapture(e.pointerId);
      // A station under the finger is taken hold of unless a pinch is under way.
      if (panners().length < 2) {
        const pos = scene.net.pos;
        const mx = (x - cam.tx) / cam.s;
        const my = (y - cam.ty) / cam.s;
        let best = -1;
        let bestD = (GRAB_DISTANCE / cam.s) ** 2;
        for (const m of scene.marks) {
          if ([...pointers.values()].some((p) => p.kind === "station" && p.node === m.node)) continue;
          const dx = pos[m.node * 2] - mx;
          const dy = pos[m.node * 2 + 1] - my;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = m.node;
          }
        }
        if (best >= 0 && panners().length === 0) {
          pointers.set(e.pointerId, { kind: "station", node: best, ox: pos[best * 2] - mx, oy: pos[best * 2 + 1] - my, x, y });
          wake(true);
          return;
        }
      }
      pointers.set(e.pointerId, { kind: "pan", x, y });
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const { x, y } = local(e);
      if (p.kind === "station") {
        p.x = x;
        p.y = y;
        wake(true);
        return;
      }
      const pans = panners();
      if (pans.length >= 2 && (pans[0] === p || pans[1] === p)) {
        const [a, b] = pans;
        const other = a === p ? b : a;
        const before = Math.hypot(p.x - other.x, p.y - other.y);
        const after = Math.hypot(x - other.x, y - other.y);
        const mid0 = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
        const mid1 = { x: (x + other.x) / 2, y: (y + other.y) / 2 };
        const ratio = before > 0 ? after / before : 1;
        const s = Math.min(MAX_SCALE, Math.max(minScale(), cam.s * ratio));
        const mx = (mid0.x - cam.tx) / cam.s;
        const my = (mid0.y - cam.ty) / cam.s;
        cam.s = s;
        cam.tx = mid1.x - mx * s;
        cam.ty = mid1.y - my * s;
      } else if (pans.length === 1) {
        cam.tx += x - p.x;
        cam.ty += y - p.y;
      }
      p.x = x;
      p.y = y;
      clamp();
      wake();
    };
    const onUp = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (p.kind === "station") {
        hold(scene.net, p.node, (p.x - cam.tx) / cam.s + p.ox, (p.y - cam.ty) / cam.s + p.oy);
        drop(scene.net, p.node);
      }
      pointers.delete(e.pointerId);
      wake(p.kind === "station");
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = local(e);
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 40) {
        const ratio = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
        const s = Math.min(MAX_SCALE, Math.max(minScale(), cam.s * ratio));
        const mx = (x - cam.tx) / cam.s;
        const my = (y - cam.ty) / cam.s;
        cam.s = s;
        cam.tx = x - mx * s;
        cam.ty = y - my * s;
      } else {
        cam.tx -= e.deltaX;
        cam.ty -= e.deltaY;
      }
      clamp();
      wake();
    };

    page.addEventListener("pointerdown", onDown);
    page.addEventListener("pointermove", onMove);
    page.addEventListener("pointerup", onUp);
    page.addEventListener("pointercancel", onUp);
    page.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      alive = false;
      observer.disconnect();
      cancelAnimationFrame(pending);
      page.removeEventListener("pointerdown", onDown);
      page.removeEventListener("pointermove", onMove);
      page.removeEventListener("pointerup", onUp);
      page.removeEventListener("pointercancel", onUp);
      page.removeEventListener("wheel", onWheel);
      labels.clear();
    };
  }, []);

  return (
    <main ref={pageRef} className={`${styles.page} ${alrim.className}`}>
      <canvas
        ref={canvasRef}
        className={styles.map}
        role="img"
        aria-label="서울 지하철 노선도. 두 손가락으로 확대하고 끌어 옮기며, 역을 잡아 옮기면 이어진 선과 역이 따라 움직입니다"
      />
    </main>
  );
}
