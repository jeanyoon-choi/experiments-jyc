import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { HEADLINES, type Feed } from "../feed/feed";
import type { Slot } from "../feed/types";
import { ArticleView } from "./article";
import { Header } from "./header";
import { ChevronDown, InfoIcon } from "./icons";
import styles from "./naver.module.css";
import { Row } from "./row";

const POP_MS = 300;
/** Rows kept under the headline list's edge, and the furthest the belt may fall behind. */
const SPARE = 8;
/** A row's height: 75 px of content, 11 px above and below, and its hairline. */
const ROW = 98;

/** Naver News's 정치 section and the article page that opens over it. */
export function NaverNews({ feed }: { feed: Feed }) {
  useSyncExternalStore(feed.subscribe, feed.getVersion, feed.getVersion);
  const slots = feed.slots();
  const [open, setOpen] = useState<Slot | null>(null);
  const [closing, setClosing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // The lists move as one belt. Pieces arriving at the top push the rows down
  // by a row each; the belt holds the rows back by that much and lets them run
  // down to rest, faster the further behind it is, so a lone arrival slides
  // in and a stream of them flows at the speed they come.
  const beltRefs = useRef<(HTMLUListElement | null)[]>([null, null]);
  const offset = useRef(0);
  const firstKey = useRef(0);
  const running = useRef(0);

  useLayoutEffect(() => {
    const before = firstKey.current;
    firstKey.current = slots[0]?.key ?? 0;
    if (!before) return;
    const arrived = slots.findIndex((slot) => slot.key === before);
    if (arrived <= 0 && slots[0]?.key === before) return;
    // Everything on screen is new when more arrived than the list holds.
    const rows = arrived < 0 ? SPARE : arrived;
    offset.current = Math.max(-SPARE * ROW, offset.current - rows * ROW);
    const draw = () => {
      for (const belt of beltRefs.current) if (belt) belt.style.transform = offset.current ? `translate3d(0, ${offset.current.toFixed(1)}px, 0)` : "";
    };
    draw();
    if (running.current) return;
    let last = performance.now();
    const run = (time: number) => {
      const seconds = Math.min(0.05, (time - last) / 1000);
      last = time;
      // Catch up 16 times a second of what is left, never slower than 420 px/s.
      offset.current = Math.min(0, offset.current + Math.max(-offset.current * 16, 420) * seconds);
      draw();
      running.current = offset.current ? requestAnimationFrame(run) : 0;
    };
    running.current = requestAnimationFrame(run);
  });

  useEffect(() => () => cancelAnimationFrame(running.current), []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  // The end of the latest list asks for more rows.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) feed.more(Date.now());
    }, { rootMargin: "240px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed]);

  const closingRef = useRef(false);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => {
      closingRef.current = false;
      setOpen(null);
      setClosing(false);
    }, POP_MS);
  }, []);

  // The browser's back button leaves the article, as on the real site.
  useEffect(() => {
    const onPop = () => close();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [close]);

  const read = (slot: Slot) => {
    // The article is the piece as it was when tapped; its row may turn on.
    if (!open) window.history.pushState({ article: slot.article.id }, "");
    setOpen({ ...slot });
    setClosing(false);
    endRef.current?.scrollTo({ top: 0 });
  };

  const home = () => {
    if (open && !closing) window.history.back();
  };

  return (
    <div className={styles.app}>
      <div className={styles.page} data-covered={Boolean(open) && !closing} aria-hidden={open ? true : undefined}>
        <Header active onHome={() => undefined} />
        <div className={styles.section} data-first="true">
          <div className={styles.head}>
            <span className={styles.headLink}>헤드라인 뉴스<InfoIcon /></span>
          </div>
          {/* Ten rows show; the next few wait under the edge so the list stays full while it slides. */}
          <div className={styles.list} data-headlines="true">
            <ul ref={(belt) => { beltRefs.current[0] = belt; }}>
              {slots.slice(0, HEADLINES + SPARE).map((slot) => <Row key={slot.key} slot={slot} now={now} latest={false} onOpen={read} />)}
            </ul>
          </div>
        </div>
        <div className={styles.more}>헤드라인 더보기<ChevronDown /></div>
        <div className={styles.section}>
          <div className={styles.list}>
            <ul ref={(belt) => { beltRefs.current[1] = belt; }}>
              {slots.slice(HEADLINES).map((slot) => <Row key={slot.key} slot={slot} now={now} latest onOpen={read} />)}
            </ul>
          </div>
        </div>
        <div ref={sentinelRef} className={styles.sentinel} />
      </div>
      {open && (
        <div ref={endRef} className={styles.endScroll} data-closing={closing}>
          <ArticleView
            slot={open}
            more={slots.filter((slot) => slot.article.id !== open.article.id).slice(0, 6)}
            now={now}
            closing={closing}
            onHome={home}
            onOpen={read}
          />
        </div>
      )}
    </div>
  );
}
