"use client";

import { useEffect, useRef } from "react";
import { BANNERS, LOOK_INDEX } from "./banners";
import { drawSheet } from "./glyphs";
import { link } from "./shader";
import styles from "./screen.module.css";

const MAX_DPR = 3;
const TAP_SLOP = 12;

export default function LedBannerOne() {
  const pageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const page = pageRef.current!;
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return;
    const linked = link(gl);
    if (!linked) return;
    const { program, uniform } = linked;
    gl.useProgram(program);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const maxTexture = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, 8192);

    let index = 0;
    let started = performance.now();
    let aspect = 0;
    let frame = 0;
    let alive = true;

    const load = () => {
      const banner = BANNERS[index];
      const sheet = drawSheet(banner, aspect, maxTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet.canvas);
      gl.uniform1f(uniform("uSheetAspect"), sheet.aspect);
      gl.uniform1f(uniform("uScroll"), banner.scroll ? 1 : 0);
      gl.uniform1i(uniform("uLook"), LOOK_INDEX[banner.look]);
      gl.uniform3fv(uniform("uInk"), banner.ink);
      gl.uniform3fv(uniform("uInk2"), banner.ink2);
      gl.uniform3fv(uniform("uGround"), banner.ground);
      canvas.setAttribute("aria-label", banner.lines.join(" "));
      started = performance.now();
    };

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.max(1, Math.round(page.clientWidth * dpr));
      const height = Math.max(1, Math.round(page.clientHeight * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniform("uRes"), width, height);
      const next = Math.max(width, height) / Math.min(width, height);
      const stale = Math.abs(next - aspect) > 0.01;
      aspect = next;
      // A still banner is fitted to the screen's proportions, so it is redrawn with them.
      if (stale) {
        const kept = started;
        load();
        if (BANNERS[index].scroll) started = kept;
      }
    };

    const draw = (now: number) => {
      frame = 0;
      if (!alive || document.hidden) return;
      gl.uniform1f(uniform("uTime"), (now - started) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(draw);
    };
    const run = () => {
      if (!frame && alive) frame = requestAnimationFrame(draw);
    };

    // A sign held up at a concert must not dim or lock.
    let lock: WakeLockSentinel | null = null;
    const stayAwake = () => {
      if (lock || document.hidden || !("wakeLock" in navigator)) return;
      navigator.wakeLock.request("screen").then(
        (sentinel) => {
          lock = sentinel;
          sentinel.addEventListener("release", () => {
            lock = null;
          });
        },
        () => {},
      );
    };

    const downs = new Map<number, [number, number]>();
    const down = (event: PointerEvent) => {
      downs.set(event.pointerId, [event.clientX, event.clientY]);
      stayAwake();
    };
    const up = (event: PointerEvent) => {
      const from = downs.get(event.pointerId);
      downs.delete(event.pointerId);
      if (!from || Math.hypot(event.clientX - from[0], event.clientY - from[1]) > TAP_SLOP) return;
      index = (index + 1) % BANNERS.length;
      load();
    };
    const cancel = (event: PointerEvent) => downs.delete(event.pointerId);
    const visible = () => {
      if (document.hidden) return;
      stayAwake();
      run();
    };

    const observer = new ResizeObserver(fit);
    observer.observe(page);
    fit();
    run();
    stayAwake();
    page.addEventListener("pointerdown", down);
    page.addEventListener("pointerup", up);
    page.addEventListener("pointercancel", cancel);
    document.addEventListener("visibilitychange", visible);
    // The handset's gothic may still be loading on the first sheet.
    document.fonts?.ready.then(() => alive && load());

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      page.removeEventListener("pointerdown", down);
      page.removeEventListener("pointerup", up);
      page.removeEventListener("pointercancel", cancel);
      document.removeEventListener("visibilitychange", visible);
      lock?.release().catch(() => {});
      gl.deleteTexture(texture);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      <canvas ref={canvasRef} className={styles.sign} role="img" />
    </main>
  );
}
