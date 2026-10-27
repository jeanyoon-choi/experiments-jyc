"use client";

// pc/mobiles/1 (user, 2026-10-27): the goldfishes' phones (NOTES 1023, the
// second of three screens). Each phone follows one goldfish of the main
// screen; when its goldfish reaches a bubble, the phone shows that bubble's
// keyword as a post in a hyper-real clone of one of eight apps — the same hype
// event, wrapped eight ways (NOTES 1017). Feed: socket feed/1 from
// screen/bubble/N, or `?source=demo` for an in-browser stand-in screen.
// Contract: docs/pc/mobiles/1.md

import { useEffect, useMemo, useRef, useState } from "react";
import { FEED_TUNING, useFeed, type FeedSource } from "@/components/transport/feed/1";
import { appForSlot } from "./apps/registry";
import { preloadPortraits } from "./content/images";
import { KEYWORDS } from "./content/keywords";
import { fitPhoneGrid } from "./model/layout";
import { Controls } from "./controls";
import { HOP_STYLES, PC_TUNING_DEFAULTS, type PcTuning } from "./model/tuning";
import { Phone } from "./phone";
import { setScrollTuning } from "./phone/scroller";
import styles from "./pc-mobiles.module.css";

const DEFAULT_PHONES = PC_TUNING_DEFAULTS.phones;

/** Seat → slot. The relay fills the lowest slots first; scattering them keeps the grid evenly lit. */
function scatteredSlots(count: number) {
  const order = Array.from({ length: count }, (_, index) => index);
  let state = 0x9e3779b9;
  for (let index = count - 1; index > 0; index -= 1) {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    const other = state % (index + 1);
    [order[index], order[other]] = [order[other]!, order[index]!];
  }
  return order;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);
  return {
    clock: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }),
    date: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
  };
}

export default function PcMobilesOne() {
  // The query decides the feed's source and the phone count. Nothing that depends
  // on it is drawn before the first measurement, so the server's null is safe.
  const [query] = useState<{ source: FeedSource; phones: number } | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get("source") === "demo" ? "demo" : "socket",
      phones: Math.min(FEED_TUNING.slots, Math.max(1, Math.round(Number(params.get("phones"))) || DEFAULT_PHONES)),
    };
  });
  // The option menu's parameters; `?phones=` sets the first phone count.
  // Any parameter can also start from the query (`?hop=0&bannersPerSec=80`), for a shared preset.
  const [tuning, setTuning] = useState<PcTuning>(() => {
    const start: PcTuning = { ...PC_TUNING_DEFAULTS, phones: query?.phones ?? DEFAULT_PHONES };
    if (typeof window === "undefined") return start;
    const params = new URLSearchParams(window.location.search);
    for (const key of Object.keys(start) as (keyof PcTuning)[]) {
      const value = params.get(key);
      if (value === null || key === "phones") continue;
      if (key === "hopStyle") start.hopStyle = HOP_STYLES.some((style) => style.id === value) ? (value as PcTuning["hopStyle"]) : start.hopStyle;
      else if (Number.isFinite(Number(value))) start[key] = Number(value);
    }
    return start;
  });
  const phones = Math.min(FEED_TUNING.slots, Math.max(1, Math.round(tuning.phones)));
  useEffect(() => setScrollTuning({ pace: tuning.scrollPace, pause: tuning.scrollPause, cruise: tuning.cruise }), [tuning.scrollPace, tuning.scrollPause, tuning.cruise]);
  useEffect(() => preloadPortraits(), []);
  const { state, status } = useFeed(query?.source ?? null, KEYWORDS);
  const { clock, date } = useClock();
  const container = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry!.contentRect.width, height: entry!.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout = fitPhoneGrid(viewport.width, viewport.height, phones);
  const vocabulary = state.vocabulary.length > 0 ? state.vocabulary : KEYWORDS;
  const seats = useMemo(() => scatteredSlots(phones), [phones]);

  return (
    <main ref={container} className={styles.field} data-status={status}>
      {layout.width > 0 && (
        <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`, gridAutoRows: `${layout.height}px`, gap: layout.gap }}>
          {seats.map((slot) => (
            <div key={slot} className={styles.seat}>
              <Phone slot={state.slots[slot]} app={appForSlot(slot)} vocabulary={vocabulary} clock={clock} date={date} scale={layout.width / 404} tuning={tuning} phones={phones} />
            </div>
          ))}
        </div>
      )}
      <Controls tuning={tuning} setTuning={setTuning} />
    </main>
  );
}
