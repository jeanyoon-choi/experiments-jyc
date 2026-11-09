"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { FONTS, GAEGU_WEIGHT, fontClassNames, type FontKey } from "./fonts";
import { INKS, STAMPS, type Stamp } from "./stamps";
import { impress, mulberry32 } from "./ink";
import { Pen } from "./pen";
import styles from "./screen.module.css";

const subscribe = () => () => {};

export default function PraiseStampOne() {
  // Impressions are random, so the sheet only exists on the client.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return <main className={`${styles.page} ${fontClassNames}`}>{mounted ? <Sheet /> : null}</main>;
}

type Impression = { seed: number };

function Sheet() {
  const canvases = useRef(new Map<string, HTMLCanvasElement>());
  const impressions = useRef(new Map<string, Impression>());
  const pressRef = useRef<((stamp: Stamp, fresh: boolean) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const maskCanvas = document.createElement("canvas");
    const mask = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!mask) return;

    const press = (stamp: Stamp, fresh: boolean) => {
      const canvas = canvases.current.get(stamp.id);
      if (!canvas) return;
      const css = canvas.clientWidth;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const n = Math.max(64, Math.round(css * dpr));
      let impression = impressions.current.get(stamp.id);
      if (!impression || fresh) {
        impression = { seed: (Math.random() * 2 ** 31) | 0 };
        impressions.current.set(stamp.id, impression);
      }
      const random = mulberry32(impression.seed);
      if (maskCanvas.width !== n) {
        maskCanvas.width = n;
        maskCanvas.height = n;
      }
      mask.setTransform(1, 0, 0, 1, 0, 0);
      mask.clearRect(0, 0, n, n);
      // A hand never lands a stamp square or dead centre.
      const turn = (random() - 0.5) * 0.24;
      const ox = (random() - 0.5) * n * 0.05;
      const oy = (random() - 0.5) * n * 0.05;
      const scale = (n / 1000) * stamp.size * 0.94;
      mask.translate(n / 2 + ox, n / 2 + oy);
      mask.rotate(turn);
      mask.scale(scale, scale);
      mask.translate(-500, -500);
      stamp.draw(new Pen(mask));
      const shape = mask.getImageData(0, 0, n, n);
      if (canvas.width !== n) {
        canvas.width = n;
        canvas.height = n;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const out = ctx.createImageData(n, n);
      impress(shape.data, n, INKS[stamp.ink], impression.seed ^ 0x5bd1e995, out);
      ctx.putImageData(out, 0, 0);
    };
    pressRef.current = press;

    const pressAll = (fresh: boolean) => {
      cancelAnimationFrame(frame);
      let i = 0;
      const step = () => {
        if (cancelled) return;
        const start = performance.now();
        while (i < STAMPS.length && performance.now() - start < 10) {
          press(STAMPS[i], fresh);
          i += 1;
        }
        if (i < STAMPS.length) frame = requestAnimationFrame(step);
      };
      step();
    };

    // Draw every face once off-screen to learn which glyphs each face needs.
    const glyphs = new Map<FontKey, Set<string>>();
    const probe = document.createElement("canvas").getContext("2d");
    if (probe) {
      const pen = new Pen(probe, (key, text) => {
        const set = glyphs.get(key) ?? new Set<string>();
        for (const g of text) set.add(g);
        glyphs.set(key, set);
      });
      for (const stamp of STAMPS) stamp.draw(pen);
    }
    const loads = [...glyphs].map(([key, set]) =>
      document.fonts.load(`${key === "gaegu" ? `${GAEGU_WEIGHT} ` : ""}40px ${FONTS[key]}`, [...set].join("")),
    );
    Promise.allSettled(loads).then(() => {
      if (!cancelled) pressAll(true);
    });

    let width = 0;
    const observer = new ResizeObserver(() => {
      const first = canvases.current.values().next().value;
      const next = first?.clientWidth ?? 0;
      if (width && Math.abs(next - width) > 2) pressAll(false);
      width = next;
    });
    const first = canvases.current.values().next().value;
    if (first) observer.observe(first);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      pressRef.current = null;
    };
  }, []);

  return (
    <div className={styles.sheet}>
      {STAMPS.map((stamp) => (
        <canvas
          key={stamp.id}
          className={styles.stamp}
          ref={(node) => {
            if (node) canvases.current.set(stamp.id, node);
            else canvases.current.delete(stamp.id);
          }}
          onPointerDown={() => pressRef.current?.(stamp, true)}
        />
      ))}
    </div>
  );
}
