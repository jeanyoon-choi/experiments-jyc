"use client";

import { useEffect, useRef } from "react";
import { frame } from "./model";
import { type View, draw } from "./render";
import styles from "./metro.module.css";

const SIDE = 16;

/**
 * The 수도권 전철 노선도 turned 90° to stand in a phone, 2호선's circle at the
 * centre of the screen. The map is fixed to the screen: no zoom or pan, so
 * names are placed once per screen size.
 */
export default function MetroOne() {
  const pageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    const canvas = canvasRef.current;
    if (!page || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let pending = 0;

    const insets = () => {
      const style = getComputedStyle(page);
      const read = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
      return { top: read("--safe-top"), bottom: read("--safe-bottom"), left: read("--safe-left"), right: read("--safe-right") };
    };

    const fit = (width: number, height: number): View => {
      const inset = insets();
      const mapW = frame.w;
      const mapH = frame.h;
      const availW = width - 2 * SIDE - inset.left - inset.right;
      const availH = height - 2 * SIDE - inset.top - inset.bottom;
      const k = Math.min(availW / mapW, availH / mapH);
      return {
        k,
        tx: inset.left + SIDE + (availW - mapW * k) / 2 - frame.x * k,
        ty: inset.top + SIDE + (availH - mapH * k) / 2 - frame.y * k,
      };
    };

    const render = () => {
      pending = 0;
      const dpr = window.devicePixelRatio || 1;
      const width = page.clientWidth;
      const height = page.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, width, height, fit(width, height));
    };

    const observer = new ResizeObserver(() => {
      if (!pending) pending = requestAnimationFrame(render);
    });
    observer.observe(page);
    render();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(pending);
    };
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.map}
        role="img"
        aria-label="수도권 전철 노선도, 서쪽이 위로 오도록 90도 돌린 지도"
      />
    </main>
  );
}
