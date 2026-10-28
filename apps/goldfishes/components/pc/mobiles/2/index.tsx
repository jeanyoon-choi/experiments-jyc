"use client";

// pc/mobiles/2 (user, 2026-10-28): the goldfishes' phones, from zero after
// pc/mobiles/1 failed. One phone per goldfish of the main screen
// (screen/bubble/7, over socket feed/1; `?source=demo` for a stand-in): the
// capitalist spectacle of a phone economy — feeds that never stop, banners,
// app hops, ads, checkouts — with the goldfish trapped on each glass as its
// thumb. Every phone is drawn by one WebGL2 compositor from tiles painted
// off-thread (paint/, gl/), so every phone can move every moment.
// Modes (bottom left): 필드, every phone; 한 대, one phone to drive with the
// mouse; 손, the page is the phone (default on a phone's browser).
// Contract: docs/pc/mobiles/2.md

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { APP_IDS } from "./apps/registry";
import type { AppId, Persona } from "./apps/types";
import { Controls } from "./controls";
import { ModeControl, type ModeState } from "./controls/mode";
import { tuningFromQuery, TUNING_DEFAULTS, type Tuning } from "./model/tuning";
import { renderObjects } from "./objects/render";
import type { Lang } from "./paint/types";
import { Engine, type FieldMode } from "./phone/engine";
import styles from "./pc-mobiles.module.css";

const MODES: readonly FieldMode[] = ["field", "focus", "hand"];

/** A phone's own browser: a coarse pointer on a small screen. */
function onAPhone() {
  return window.matchMedia("(pointer: coarse)").matches && Math.min(window.screen.width, window.screen.height) < 700;
}

function modeFromQuery(): ModeState {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const app = params.get("app");
  return {
    mode: MODES.includes(mode as FieldMode) ? (mode as FieldMode) : onAPhone() ? "hand" : "field",
    seat: Math.max(0, Math.min(63, Math.round(Number(params.get("seat")) || 0))),
    keyword: params.get("keyword") ?? "",
    app: APP_IDS.includes(app as AppId) ? (app as AppId) : "",
  };
}

/** In a visitor's hand the phone is theirs: their language, light or dark, iPhone or not. */
function visitorPersona(): Partial<Persona> {
  const language = navigator.language.slice(0, 2);
  const lang: Lang = language === "ko" || language === "ja" || language === "es" ? language : "en";
  return { lang, mode: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light", os: /android/i.test(navigator.userAgent) ? "android" : "ios" };
}

const never = () => () => {};

export default function PcMobilesTwo() {
  // The mode comes from the address and the device, which the server cannot know:
  // anything that depends on it is drawn only once hydrated.
  const hydrated = useSyncExternalStore(never, () => true, () => false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const [tuning, setTuning] = useState<Tuning>(() => (typeof window === "undefined" ? TUNING_DEFAULTS : tuningFromQuery(window.location.search)));
  const [mode, setMode] = useState<ModeState | null>(() => (typeof window === "undefined" ? null : modeFromQuery()));
  const [phone] = useState(() => typeof window !== "undefined" && onAPhone());
  const tuningRef = useRef(tuning);

  useEffect(() => {
    tuningRef.current = tuning;
    engine.current?.retune();
  }, [tuning]);

  // The mode is part of the address, so a view can be shared (`?mode=focus&seat=12&keyword=gpu`).
  useEffect(() => {
    if (!mode) return;
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries({ mode: mode.mode === "field" ? "" : mode.mode, seat: mode.mode === "field" ? "" : String(mode.seat), keyword: mode.keyword, app: mode.app })) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [mode]);

  useEffect(() => {
    const element = canvas.current;
    if (!element || !mode) return;
    const source = new URLSearchParams(window.location.search).get("source") === "demo" ? "demo" : "socket";
    const field = new Engine(element, () => tuningRef.current, source, {
      mode: mode.mode,
      seat: mode.seat,
      keyword: mode.keyword || undefined,
      app: mode.app || undefined,
      persona: mode.mode === "hand" && phone ? visitorPersona() : undefined,
    });
    engine.current = field;
    const observer = new ResizeObserver(([entry]) => field.layout(entry!.contentRect.width, entry!.contentRect.height));
    observer.observe(element);
    const rect = element.getBoundingClientRect();
    field.layout(rect.width, rect.height);
    field.start();
    const stopRenders = renderObjects();
    (window as unknown as { __pcMobiles2?: Engine }).__pcMobiles2 = field;

    // One phone: the visitor's pointer is its thumb.
    const at = (event: PointerEvent | WheelEvent) => {
      const box = element.getBoundingClientRect();
      return [event.clientX - box.left, event.clientY - box.top] as const;
    };
    const down = (event: PointerEvent) => {
      element.setPointerCapture(event.pointerId);
      field.pointer("down", ...at(event));
    };
    const move = (event: PointerEvent) => field.pointer(event.buttons || event.pointerType === "touch" ? "move" : "hover", ...at(event));
    const up = (event: PointerEvent) => field.pointer("up", ...at(event));
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      field.wheel(event.deltaY);
    };
    if (mode.mode !== "field") {
      element.addEventListener("pointerdown", down);
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", up);
      element.addEventListener("pointercancel", up);
      element.addEventListener("wheel", wheel, { passive: false });
    }
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("wheel", wheel);
      stopRenders();
      observer.disconnect();
      field.dispose();
      engine.current = null;
    };
  }, [mode, phone]);

  return (
    <main className={styles.field} data-mode={hydrated ? mode?.mode : undefined}>
      <canvas ref={canvas} className={styles.canvas} />
      {/* On a phone the page is the phone: no authoring chrome. */}
      {hydrated && mode && !phone && <ModeControl state={mode} onChange={setMode} />}
      {hydrated && !phone && <Controls tuning={tuning} setTuning={setTuning} />}
    </main>
  );
}
