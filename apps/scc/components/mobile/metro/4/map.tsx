"use client";

import { useEffect, useRef, useState } from "react";
import { alrim } from "./fonts";
import { LabelCache } from "./labels";
import { drawMinimap } from "./minimap";
import { size } from "./model";
import { drop, hold, step } from "./physics";
import { type Camera, draw } from "./render";
import { drawRides } from "./rides";
import type { Scene } from "./scene";
import { minutesPrinted } from "./travel";
import styles from "./metro.module.css";

// A touch this close (CSS px) to a station takes hold of it.
const GRAB_DISTANCE = 24;
// The loop sleeps once no node moves more than this (CSS px per frame).
const REST_PX = 0.05;
const DPR_CAP = 3;
// Zoom: the whole map's width at the least; names at 4.5× their map size at the most.
const MAX_SCALE = 4.5;
// Names are re-rasterised for a new zoom once it has held still this long.
const ZOOM_SETTLE_MS = 160;
// Opening view: wider than /2's, with the centre of 2호선's circle (fitted on the map) at the centre.
const OPEN_SCALE = 0.45;
// The overview in the corner (CSS px), and how much one press of + or − zooms.
const MINIMAP_PX = 88;
// The overview is kept but not shown for now (user, 2026-11-23); set to true to bring it back under + and −.
const SHOW_MINIMAP: boolean = false;
const ZOOM_STEP = 1.6;
const OPEN_AT = { x: 1269.7, y: 1343.3 };

type Holder = { kind: "station"; node: number; ox: number; oy: number; x: number; y: number };
type Panner = { kind: "pan"; x: number; y: number };

/**
 * The 노선도 tab: /3's map, on a scene the tabs share.
 * The 2026 서울 지하철 노선도 as it is printed — positions, paths, colours,
 * 서울알림체 — made of cords: pinch and drag the paper to read it; take hold
 * of a station and put it somewhere else, and its lines stretch and pull the
 * next stations, line by line, in real time. A released station stays where
 * it was put and the rest settles around it.
 */
export function MetroMap({
  scene,
  hidden,
  rideTo,
  onRides,
}: {
  scene: Scene;
  hidden: boolean;
  /** 소요시간: the station rides are shown to, or null. */
  rideTo: string | null;
  /** Called with each frame drawn while rides are shown: the chosen station's node and the rides to it as printed. */
  onRides?: (origin: number, printed: Map<number, number>) => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<(ratio: number) => void>(() => {});
  const wakeRef = useRef<() => void>(() => {});
  const rideRef = useRef<{ origin: number; printed: Map<number, number> } | null>(null);
  const onRidesRef = useRef(onRides);
  useEffect(() => {
    onRidesRef.current = onRides;
  }, [onRides]);

  // The rides as printed are worked out once per chosen station; the frame scales them by the map as it lies.
  useEffect(() => {
    const origin = rideTo === null ? undefined : scene.marks.find((m) => m.name === rideTo);
    rideRef.current = origin ? { origin: origin.node, printed: minutesPrinted(scene, origin.node) } : null;
    wakeRef.current();
  }, [scene, rideTo]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const page = pageRef.current;
    const canvas = canvasRef.current;
    if (!page || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const mini = miniRef.current;
    const miniCtx = mini?.getContext("2d", { alpha: false }) ?? null;

    const family = getComputedStyle(page).fontFamily;
    const labels = new LabelCache({ family });
    const cam: Camera = { s: OPEN_SCALE, tx: 0, ty: 0 };
    const view = { width: 0, height: 0, dpr: 1 };
    const pointers = new Map<number, Holder | Panner>();
    let pending = 0;
    let moving = false;
    let opened = false;
    let alive = true;
    // Nothing is drawn until the typeface is in and every name is rasterised.
    let fonts = false;
    let whole = false;
    let zoomedAt = -Infinity;
    let lastScale = cam.s;
    let settleTimer = 0;

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
      const now = performance.now();
      if (cam.s !== lastScale) {
        lastScale = cam.s;
        zoomedAt = now;
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => wake(), ZOOM_SETTLE_MS + 10);
      }
      labels.frozen = now - zoomedAt < ZOOM_SETTLE_MS;
      const unfinished = draw(ctx, scene, labels, cam, view) && !labels.frozen;
      const ride = rideRef.current;
      if (ride) {
        drawRides(ctx, scene, cam, view, ride.origin, ride.printed);
        onRidesRef.current?.(ride.origin, ride.printed);
      }
      if (mini && miniCtx) {
        const side = Math.round(MINIMAP_PX * view.dpr);
        if (mini.width !== side) {
          mini.width = side;
          mini.height = side;
        }
        drawMinimap(miniCtx, scene, cam, view, MINIMAP_PX, view.dpr);
      }
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
      if (!whole) return;
      if (!pending) pending = requestAnimationFrame(frame);
    };

    const resize = () => {
      const width = page.clientWidth;
      const height = page.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      if (width === view.width && height === view.height && dpr === view.dpr) return;
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
        cam.tx = width / 2 - OPEN_AT.x * cam.s;
        cam.ty = height / 2 - OPEN_AT.y * cam.s;
      } else if (centre) {
        cam.tx = width / 2 - centre.x * cam.s;
        cam.ty = height / 2 - centre.y * cam.s;
      }
      clamp();
      labels.clear();
      if (whole) wake();
      else open();
    };
    // The opening frame, drawn once and complete: all names of the opening scale at once.
    const open = () => {
      if (whole || !fonts || !view.width) return;
      labels.prepare(scene.marks, cam.s * view.dpr);
      whole = true;
      frame();
      setReady(true);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(page);
    resize();
    // Both weights of 서울알림체 at once; a failed load opens the map in the fallback face.
    Promise.all([document.fonts.load(`800 12px ${family}`), document.fonts.load(`700 12px ${family}`)])
      .catch(() => undefined)
      .then(() => {
        if (!alive) return;
        fonts = true;
        open();
      });

    const local = (e: PointerEvent | WheelEvent) => {
      const r = page.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const panners = () => [...pointers.values()].filter((p): p is Panner => p.kind === "pan");

    wakeRef.current = () => wake();
    // + and −: zoom about the middle of the screen.
    zoomRef.current = (ratio) => {
      const s = Math.min(MAX_SCALE, Math.max(minScale(), cam.s * ratio));
      const mx = (view.width / 2 - cam.tx) / cam.s;
      const my = (view.height / 2 - cam.ty) / cam.s;
      cam.s = s;
      cam.tx = view.width / 2 - mx * s;
      cam.ty = view.height / 2 - my * s;
      clamp();
      wake();
    };
    const onControls = (e: Event) => e.target instanceof Element && e.target.closest("[data-controls]") !== null;

    const onDown = (e: PointerEvent) => {
      if (onControls(e)) return;
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
      window.clearTimeout(settleTimer);
      page.removeEventListener("pointerdown", onDown);
      page.removeEventListener("pointermove", onMove);
      page.removeEventListener("pointerup", onUp);
      page.removeEventListener("pointercancel", onUp);
      page.removeEventListener("wheel", onWheel);
      labels.clear();
    };
  }, [scene]);

  return (
    <div ref={pageRef} className={`${styles.page} ${alrim.className}`} hidden={hidden}>
      <canvas
        ref={canvasRef}
        className={styles.map}
        role="img"
        aria-label="서울 지하철 노선도. 두 손가락으로 확대하고 끌어 옮기며, 역을 잡아 옮기면 이어진 선과 역이 따라 움직입니다"
      />
      <div className={styles.controls} data-controls>
        <div className={styles.zoom}>
          <button type="button" aria-label="확대" onClick={() => zoomRef.current(ZOOM_STEP)}>
            +
          </button>
          <button type="button" aria-label="축소" onClick={() => zoomRef.current(1 / ZOOM_STEP)}>
            −
          </button>
        </div>
        {SHOW_MINIMAP && <canvas ref={miniRef} className={styles.minimap} role="img" aria-label="전체 노선도에서 지금 보고 있는 곳" />}
      </div>
      {!ready && (
        <div className={styles.loading} aria-hidden="true">
          <svg viewBox="-29.42 -55.16 126.26 116.96">
            <path
              transform="scale(1 -1)"
              fill="#172a88"
              d="M0 0 1.681 4.631C6.207 17.526 14.851 30.3 33.707 30.3H80.729L76.526 18.82H39.303c-7.67 0-11.755-4.245-15.549-11.795L95.852 7.021c-5.271 27.365-31.093 48.138-62.145 48.138-34.861 0-63.127-26.181-63.127-58.478 0-1.06.033-2.109.094-3.152l96.746.007-1.678-4.628C61.21-23.989 52.555-36.761 33.707-36.761h-47.02l4.186 11.48h37.238c7.668 0 11.753 4.238 15.545 11.79h-72.121c5.195-27.452 31.052-48.31 62.172-48.31 34.862 0 63.129 26.177 63.129 58.482 0 1.116-.039 2.224-.104 3.323z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
