import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HEADLINES, type Feed } from "../feed/feed";
import type { Slot } from "../feed/types";
import { ArticleView } from "./article";
import { Header } from "./header";
import { ChevronDown, InfoIcon } from "./icons";
import styles from "./naver.module.css";
import { Row } from "./row";

const POP_MS = 300;

/** Naver News's 정치 section and the article page that opens over it. */
export function NaverNews({ feed }: { feed: Feed }) {
  useSyncExternalStore(feed.subscribe, feed.getVersion, feed.getVersion);
  const slots = feed.slots();
  const [open, setOpen] = useState<Slot | null>(null);
  const [closing, setClosing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

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
          <ul className={styles.list}>
            {slots.slice(0, HEADLINES).map((slot) => <Row key={slot.key} slot={slot} now={now} latest={false} onOpen={read} />)}
          </ul>
        </div>
        <div className={styles.more}>헤드라인 더보기<ChevronDown /></div>
        <div className={styles.section}>
          <ul className={styles.list}>
            {slots.slice(HEADLINES).map((slot) => <Row key={slot.key} slot={slot} now={now} latest onOpen={read} />)}
          </ul>
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
