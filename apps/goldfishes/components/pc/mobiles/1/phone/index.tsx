"use client";

// One phone: the iOS frame around one app clone, fed by several goldfish
// (the school spread over the slots: transport/feed/1/slots.mjs). It is
// someone's phone in constant use, part of the phone economy's spectacle:
// feeds that never stop flowing, notifications raining in, apps opened from
// them (user, 2026-10-28).
//
// One rule makes it continuous (user, 2026-10-28: no blink, jump or flash,
// ever): nothing appears or disappears inside the glass. Every change is
// mounted complete and opaque outside the view or beneath what is shown,
// and only motion brings it in:
//
// - Feeds: a post is put on below the view every so often (the newest item
//   its goldfish brought, or the feed feeding on itself), the oldest taken off
//   above it, and the reader scrolls on into them (scroller.ts).
// - Tinder and Netflix: the next card lies beneath; the shown one is swiped
//   off it.
// - Notifications: banners slide in from above the glass.
// - Some are tapped: the app they came from opens out of the banner, over the
//   app before, which stays opaque beneath.
// - The first item: the lock screen slides up off the app beneath it.
//
// The phone is drawn at native points (404 × 858, glass 390 × 844) and
// zoomed as one unit — CSS zoom, not a scale transform, so its layers (each
// feed is one, moved by the compositor) rasterize at the size shown, not at
// full size (with transform: scale, 32 phones ran at 10 fps); `--glass-width` / `--glass-height` stand in for the viewport.

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { FeedItem, FeedKeyword, FeedSlot } from "@/components/transport/feed/1";
import type { AppDefinition, AppId } from "../apps/types";
import { APPS, appOfItem } from "../apps/registry";
import { gapsOf, type HopStyle, type PcTuning } from "../model/tuning";
import { postsOf } from "../content/posts";
import { attachScroller } from "./scroller";
import styles from "./phone.module.css";

/** How each app moves on: a feed scrolls; Tinder's card is swiped aside; Netflix's clip is swiped up. */
const MOTION: Record<AppId, "feed" | "aside" | "up"> = {
  tinder: "aside",
  netflix: "up",
  yelp: "feed",
  linkedin: "feed",
  x: "feed",
  facebook: "feed",
  instagram: "feed",
  news: "feed",
};

/**
 * Posts a phone keeps. A feed takes its oldest off only once the reader has
 * scrolled wholly past it (scroller.ts `above`), so a post in view never
 * vanishes; `STREAM_MAX` bounds the DOM if the reader falls behind.
 */
const STREAM = 7;
const STREAM_MAX = 14;

/** How many of the oldest posts a phone may take off now: for a feed, those above the view; otherwise down to `STREAM`. */
type Trim = { current: (() => number) | null };

function mix(seed: number, salt: number) {
  let value = Math.imul((seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0, 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

type Stream = { entries: readonly FeedItem[]; put: number; newest: number | null };

/**
 * The phone's feed as a stream, oldest first: every `gapMs` (jittered by
 * seat) one post is put on, the newest item that arrived meanwhile or, when
 * none did, a repost of one of its recent items — the feed feeding on itself,
 * leaning where the goldfish have been. One mount per step (~120 mounts/s
 * saturated the dev server with 64 phones). An echo's id is the seat's own
 * counter, so its key is stable.
 */
function useStream(slot: FeedSlot | undefined, gapMs: number, seat: number, trimRef: Trim) {
  const [stream, setStream] = useState<Stream>(() => {
    const history = slot?.history ?? [];
    return { entries: history.slice(-STREAM), put: 0, newest: history.at(-1)?.id ?? null };
  });
  const source = useRef(slot);
  useEffect(() => {
    source.current = slot;
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let turn = 0;
    const step = () => {
      const history = source.current?.history ?? [];
      setStream((current) => {
        const newest = history.at(-1);
        if (!newest) return current;
        let next: FeedItem;
        if (newest.id !== current.newest) next = newest;
        else {
          const from = history[history.length - 1 - (mix(seat, current.put) % Math.min(4, history.length))]!;
          next = { ...from, id: -(seat * 100_000_000 + current.put + 1), seed: mix(from.seed, current.put), rank: from.rank * 0.8 };
        }
        const entries = [...current.entries, next];
        const over = entries.length - STREAM;
        const off = over <= 0 ? 0 : trimRef.current ? Math.min(over, trimRef.current()) : over;
        return { entries: entries.slice(Math.max(off, entries.length - STREAM_MAX)), put: current.put + 1, newest: newest.id };
      });
      turn += 1;
      timer = setTimeout(step, gapMs * (0.7 + ((seat * 0.618 + turn * 0.381) % 1) * 0.6));
    };
    timer = setTimeout(step, gapMs * ((seat * 0.618) % 1));
    return () => clearTimeout(timer);
  }, [gapMs, seat, trimRef]);
  return stream.entries;
}

type Banner = { id: number; item: FeedItem; app: AppDefinition; tap: boolean };
type Session = {
  app: AppDefinition;
  hops: number;
  kind: Exclude<HopStyle, "mix">;
  hopAt: number;
  banner: Banner | null;
  /** Banners on their way out: back up (dismissed) or into their app (tapped). */
  leaving: readonly (Banner & { into: boolean })[];
};

/**
 * The app opened next: the one the newest item comes from, or, when that is
 * open already, the next app on.
 */
function nextApp(current: AppDefinition, seed: number, turn: number) {
  const from = appOfItem(seed);
  if (from !== current) return from;
  const index = APPS.indexOf(current);
  return APPS[(index + 1 + (turn % (APPS.length - 1))) % APPS.length]!;
}

/** "mix" without a notification: iOS's other ways of changing app (a cube flip is no phone's). */
const MIX_DIRECT: readonly Exclude<HopStyle, "mix" | "open">[] = ["slide", "slide", "switcher"];

/**
 * The app open now, and notifications. The phone changes app on its own
 * clock, about once per `hopGapMs` (jittered and spread by seat, so the grid
 * keeps changing and never all at once): tapping a notification from the
 * next app (a share `hop` of changes, under "mix"), the swipe along the home
 * bar, or the app switcher. Between, at most one banner per `bannerGapMs`
 * from the newest item, back up after `bannerMs`.
 */
function useSession(slot: FeedSlot | undefined, home: AppDefinition, tuning: PcTuning, phones: number) {
  const { bannerGapMs, hopGapMs } = gapsOf(tuning, phones);
  const seat = slot?.slot ?? 0;
  const [session, setSession] = useState<Session>(() => ({ app: home, hops: 0, kind: "open", hopAt: 0, banner: null, leaving: [] }));
  const shownAt = useRef(0);
  const newest = slot?.history.at(-1);
  const newestRef = useRef(newest);
  useEffect(() => {
    newestRef.current = newest;
  });

  // The phone's own clock of app changes.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let turn = 0;
    const change = () => {
      turn += 1;
      const item = newestRef.current;
      if (item) {
        const at = performance.now();
        setSession((current) => {
          const app = nextApp(current.app, item.seed + turn, turn);
          const roll = ((seat * 0.618 + turn * 0.754) % 1);
          const viaBanner = tuning.hopStyle === "open" || (tuning.hopStyle === "mix" && roll < tuning.hop);
          if (viaBanner) {
            const leaving = current.banner ? [...current.leaving, { ...current.banner, into: false }].slice(-2) : current.leaving;
            return { ...current, banner: { id: -(seat * 1_000_000 + turn), item, app, tap: true }, leaving };
          }
          const kind = tuning.hopStyle === "mix" ? MIX_DIRECT[turn % MIX_DIRECT.length]! : tuning.hopStyle;
          return { ...current, app, hops: current.hops + 1, kind, hopAt: at };
        });
      }
      timer = setTimeout(change, hopGapMs * (0.6 + ((seat * 0.381 + turn * 0.618) % 1) * 0.8));
    };
    timer = setTimeout(change, hopGapMs * ((seat * 0.618) % 1));
    return () => clearTimeout(timer);
  }, [hopGapMs, seat, tuning.hop, tuning.hopStyle]);

  // A new item: its banner, paced; never over one about to be tapped.
  useEffect(() => {
    if (!newest || newest.id === session.banner?.id || session.banner?.tap) return;
    const wait = Math.max(0, shownAt.current + bannerGapMs - performance.now());
    if (!Number.isFinite(wait)) return;
    const timer = setTimeout(() => {
      shownAt.current = performance.now();
      setSession((current) => {
        if (current.banner?.tap) return current;
        const leaving = current.banner ? [...current.leaving, { ...current.banner, into: false }].slice(-2) : current.leaving;
        return { ...current, banner: { id: newest.id, item: newest, app: appOfItem(newest.seed), tap: false }, leaving };
      });
    }, wait);
    return () => clearTimeout(timer);
  }, [newest, session.banner?.id, session.banner?.tap, bannerGapMs]);

  // The banner shown: tapped after a moment (its app opens out of it), or back up after `bannerMs`.
  const banner = session.banner;
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(
      () => {
        const at = performance.now();
        setSession((current) => {
          if (current.banner?.id !== banner.id) return current;
          const leaving = [...current.leaving, { ...banner, into: banner.tap }].slice(-2);
          if (!banner.tap) return { ...current, banner: null, leaving };
          return { ...current, banner: null, leaving, app: banner.app, hops: current.hops + 1, kind: "open", hopAt: at };
        });
      },
      banner.tap ? Math.min(tuning.bannerMs, 600) : tuning.bannerMs,
    );
    return () => clearTimeout(timer);
  }, [banner, tuning.bannerMs]);

  const settle = (id: number) => setSession((current) => ({ ...current, leaving: current.leaving.filter((entry) => entry.id !== id) }));
  return { session, settle };
}

/**
 * Card apps: the next screen lies beneath, complete; the one shown is
 * swiped off it. Only the leaving layer moves, so the glass never shows
 * through.
 */
function Swipe({ id, motion, children }: { id: number; motion: "aside" | "up"; children: ReactNode }) {
  const [current, setCurrent] = useState({ id, node: children });
  const [leaving, setLeaving] = useState<{ id: number; node: ReactNode } | null>(null);
  if (current.id !== id) {
    setLeaving(current);
    setCurrent({ id, node: children });
  }
  const node = current.id === id ? children : current.node;
  // Keyed by id, so the shown layer keeps its DOM when it starts to leave.
  return (
    <>
      <div key={id} className={styles.swipeLayer}>
        {node}
      </div>
      {leaving && (
        <div
          key={leaving.id}
          className={styles.swipeLayer}
          data-motion={motion}
          data-phase="out"
          data-side={leaving.id % 3 === 0 ? "right" : "left"}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setLeaving(null);
          }}
        >
          {leaving.node}
        </div>
      )}
    </>
  );
}

/**
 * The app open now, over the one it was opened from while the hop plays.
 * The old app stays opaque beneath until the new one covers it. "open" is a
 * tapped notification: the app opens out of the banner's place; "slide" is
 * the swipe along the home bar to the next app.
 */
function Hop({ id, kind, children }: { id: string; kind: Exclude<HopStyle, "mix">; children: ReactNode }) {
  const [current, setCurrent] = useState({ id, node: children });
  const [leaving, setLeaving] = useState<{ id: string; node: ReactNode; kind: string } | null>(null);
  if (current.id !== id) {
    setLeaving({ ...current, kind });
    setCurrent({ id, node: children });
  }
  const node = current.id === id ? children : current.node;
  // Keyed by id, so the app keeps its DOM (and its scroll) as it goes beneath.
  // The new app comes first in the DOM, where the scroller finds its feed; CSS stacks it on top.
  return (
    <>
      <div
        key={id}
        className={styles.hopLayer}
        data-hop={leaving ? leaving.kind : undefined}
        data-phase="in"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setLeaving(null);
        }}
      >
        {node}
      </div>
      {leaving && (
        <div key={leaving.id} className={styles.hopLayer} data-hop={leaving.kind} data-phase="out">
          {leaving.node}
        </div>
      )}
    </>
  );
}

type Props = {
  slot: FeedSlot | undefined;
  app: AppDefinition;
  vocabulary: readonly FeedKeyword[];
  clock: string;
  date: string;
  scale: number;
  tuning: PcTuning;
  /** Phones on screen: the grid's budgets are shared among them. */
  phones: number;
};

type BodyProps = {
  entries: readonly FeedItem[];
  app: AppDefinition;
  hopId: string;
  hopKind: Exclude<HopStyle, "mix">;
  seat: number;
  trimRef: Trim;
  vocabulary: readonly FeedKeyword[];
  clock: string;
  date: string;
};

function PhoneView({ entries, app, hopId, hopKind, seat, trimRef, vocabulary, clock, date }: BodyProps) {
  // postsOf gives newest first, as Tinder and Netflix stack their cards; a feed runs oldest first, the newest below.
  const newestFirst = useMemo(() => postsOf(entries, vocabulary), [entries, vocabulary]);
  const motion = MOTION[app.id];
  const posts = useMemo(() => (motion === "feed" ? [...newestFirst].reverse() : newestFirst), [motion, newestFirst]);
  const open = posts.length > 0;

  // Feeds: the shared scroller moves this phone's [data-feed].
  const glass = useRef<HTMLDivElement>(null);
  const scroller = useRef<ReturnType<typeof attachScroller> | null>(null);
  useEffect(() => {
    if (!open || motion !== "feed" || !glass.current) return;
    const attached = attachScroller(glass.current, seat * 7_919 + 1);
    scroller.current = attached;
    trimRef.current = attached.above;
    return () => {
      attached.detach();
      scroller.current = null;
      trimRef.current = null;
    };
  }, [open, motion, seat, hopId, trimRef]);
  // Before paint: the scroller re-anchors on its next frame, ahead of the paint that shows the change.
  useLayoutEffect(() => {
    scroller.current?.changed();
  }, [entries]);

  // The lock screen until the first item, then slid up off the app.
  const [lock, setLock] = useState<"shown" | "leaving" | "gone">(open ? "gone" : "shown");
  if (open && lock === "shown") setLock("leaving");

  const { Screen } = app;
  const tone = open && lock === "gone" ? app.statusTone : "light";

  return (
    <div ref={glass} className={styles.glass}>
      {open && (
        <div className={styles.screen}>
          <Hop id={hopId} kind={hopKind}>
            {motion === "feed" ? (
              <Screen posts={posts} />
            ) : (
              <Swipe id={entries.at(-1)?.id ?? 0} motion={motion}>
                <Screen posts={posts} />
              </Swipe>
            )}
          </Hop>
        </div>
      )}
      {lock !== "gone" && (
        <div
          className={styles.lock}
          data-phase={lock === "leaving" ? "out" : undefined}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setLock("gone");
          }}
        >
          <span className={styles.lockDate}>{date}</span>
          <span className={styles.lockClock}>{clock}</span>
        </div>
      )}
      <div className={styles.statusBar} data-tone={tone} aria-hidden="true">
        <span className={styles.statusTime}>{clock}</span>
        <span />
        <span className={styles.statusRight}>
          <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="0.8" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
            <rect x="10" y="3" width="3" height="9" rx="0.8" />
            <rect x="15" y="0" width="3" height="12" rx="0.8" />
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
            <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8 .5C5.2.5 2.6 1.6.6 3.5l1.2 1.2A8.7 8.7 0 0 1 8 2.2z" />
            <path d="M8 5.6c1.5 0 2.8.6 3.8 1.5L13 5.9A7 7 0 0 0 8 3.9a7 7 0 0 0-5 2l1.2 1.2c1-.9 2.3-1.5 3.8-1.5z" />
            <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.5 6.5 9.6c.4-.4.9-.6 1.5-.6z" />
          </svg>
          <span className={styles.battery}>
            <span className={styles.batteryLevel} />
          </span>
        </span>
      </div>
      <span className={styles.island} aria-hidden="true" />
      <span className={styles.homeIndicator} data-tone={tone} aria-hidden="true" />
    </div>
  );
}

const PhoneBody = memo(PhoneView);

/** One iOS banner, as it would arrive over any app. */
const BannerCard = memo(function BannerCard({ banner, vocabulary }: { banner: Banner; vocabulary: readonly FeedKeyword[] }) {
  const { app } = banner;
  const notice = useMemo(() => app.notify(postsOf([banner.item], vocabulary)[0]!), [app, banner.item, vocabulary]);
  const { Icon } = app;
  return (
    <>
      <span className={styles.bannerIcon}>
        <Icon size={38} />
      </span>
      <span className={styles.bannerText}>
        <span className={styles.bannerHead}>
          <b>{notice.title}</b>
          <small>now</small>
        </span>
        <span className={styles.bannerBody}>{notice.body}</span>
      </span>
    </>
  );
});

function Banners({ session, settle, vocabulary }: { session: Session; settle: (id: number) => void; vocabulary: readonly FeedKeyword[] }) {
  return (
    <div className={styles.banners} aria-hidden="true">
      {session.leaving.map((banner) => (
        <div
          key={banner.id}
          className={styles.banner}
          data-phase={banner.into ? "into" : "out"}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) settle(banner.id);
          }}
        >
          <BannerCard banner={banner} vocabulary={vocabulary} />
        </div>
      ))}
      {session.banner && (
        <div key={session.banner.id} className={styles.banner} data-phase="in">
          <BannerCard banner={session.banner} vocabulary={vocabulary} />
        </div>
      )}
    </div>
  );
}

/** Paces the phone (its stream, its banners, its app); the body renders only when its stream or app changes. */
export const Phone = memo(function PacedPhone({ slot, app: home, vocabulary, clock, date, scale, tuning, phones }: Props) {
  const seat = slot?.slot ?? 0;
  const trimRef = useRef<Trim["current"]>(null);
  const entries = useStream(slot, gapsOf(tuning, phones).updateMs, seat, trimRef);
  const { session, settle } = useSession(slot, home, tuning, phones);
  return (
    <div className={styles.phone} style={{ zoom: scale, "--hop-ms": `${tuning.hopMs}ms` } as CSSProperties}>
      <PhoneBody
        entries={entries}
        app={session.app}
        hopId={`${session.app.id}:${session.hops}`}
        hopKind={session.kind}
        seat={seat}
        trimRef={trimRef}
        vocabulary={vocabulary}
        clock={clock}
        date={date}
      />
      <Banners session={session} settle={settle} vocabulary={vocabulary} />
    </div>
  );
});
