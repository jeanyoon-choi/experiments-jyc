"use client";

import { useRef, useState } from "react";
import type { Scene } from "../scene";
import { type Archive, type Item, update } from "./archive";
import { Article } from "./article";
import { News } from "./news";
import { Prices } from "./prices";
import styles from "./estate.module.css";

// One scroll (user, 2026-11-23): the assessed prices first — the three
// centres, then the prices that changed — and under them the archive of
// reports. Two tabs stay at the top and jump between the two; the open one
// follows the scroll.
const PARTS = [
  { id: "prices", label: "공시가격" },
  { id: "news", label: "기사" },
] as const;
type Part = (typeof PARTS)[number]["id"];
export function Estate({ scene, archive }: { scene: Scene; archive: Archive }) {
  // Opening the tab brings the archive up to the map as it now lies.
  const [{ items, now }] = useState(() => {
    const time = Date.now();
    return { items: [...update(archive, scene, time)], now: time };
  });

  const [open, setOpen] = useState<Item | null>(null);
  const [part, setPart] = useState<Part>("prices");
  const scrollRef = useRef<HTMLDivElement>(null);
  const newsRef = useRef<HTMLDivElement>(null);
  // Where the reports begin, measured from the top of the scroll.
  const newsTop = () => newsRef.current?.offsetTop ?? 0;
  const go = (to: Part) => {
    setPart(to);
    scrollRef.current?.scrollTo({ top: to === "news" ? newsTop() : 0, behavior: "smooth" });
  };
  const onScroll = () => {
    const now: Part = (scrollRef.current?.scrollTop ?? 0) >= newsTop() - 4 ? "news" : "prices";
    setPart((was) => (was === now ? was : now));
  };

  if (open) return <Article item={open} onClose={() => setOpen(null)} />;
  return (
    <section className={styles.estate}>
      <div className={styles.parts} role="tablist">
        {PARTS.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={p.id === part} className={styles.part} onClick={() => go(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
        <Prices scene={scene} />
        <div ref={newsRef} className={styles.below}>
          <News items={items} now={now} onOpen={setOpen} />
        </div>
      </div>
    </section>
  );
}
