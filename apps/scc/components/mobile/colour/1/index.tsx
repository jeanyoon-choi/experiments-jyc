"use client";

import { useEffect, useRef } from "react";
import styles from "./screen.module.css";

const STEP_MS = 1000 / 60;
const TAIL_MS = 700;

export default function ColourOne() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const page = ref.current!;
    const held = new Set<number>();
    let until = 0;
    let frame = 0;
    let shown = "";

    const paint = (colour: string) => {
      if (colour === shown) return;
      shown = colour;
      page.style.background = colour;
    };

    const tick = (now: number) => {
      if (held.size === 0 && now >= until) {
        frame = 0;
        paint("#000");
        return;
      }
      paint(Math.floor(now / STEP_MS) % 2 ? "#fff" : "#000");
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const down = (event: PointerEvent) => {
      held.add(event.pointerId);
      until = performance.now() + TAIL_MS;
      start();
    };
    const up = (event: PointerEvent) => {
      if (!held.delete(event.pointerId)) return;
      until = performance.now() + TAIL_MS;
      start();
    };

    page.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(frame);
      page.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return <main ref={ref} className={styles.page} />;
}
