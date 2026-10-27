// Every phone is someone doom-scrolling an endless feed (user, 2026-10-28: a
// continuous, ever-flowing spectacle; any jump, blink or flash is out). One
// requestAnimationFrame loop drives every phone's feed (the clone's
// `[data-feed]`) with transform only:
//
// - the feed never stops: a steady cruise, with flicks on top that decay as
//   iOS's deceleration does;
// - new posts are put on below (phone/index.tsx), so the reader scrolls into
//   them; the cruise speeds up when much is waiting and eases off near the
//   end, so the flow follows how fast posts arrive and never hits a wall;
// - old posts are taken off the top only once they are wholly out of sight
//   (`above`); the post in view is the anchor, and when content above it
//   changes the feed moves by the same amount, so nothing on screen jumps
//   (the browser's scroll anchoring, by hand).
//
// All of this is animation phase, the browser's own; the feed's content
// comes from the goldfish.

type Scroller = {
  glass: HTMLElement;
  feed: HTMLElement | null;
  y: number;
  /** The flick's speed on top of the cruise, px/s. */
  flick: number;
  /** The cruise as it is now, eased toward its target so it never steps. */
  cruise: number;
  /** Seconds until the next flick. */
  wait: number;
  shown: number;
  /** How far the feed can scroll; measured only after the feed changed. */
  end: number;
  /** The post in view, and where it was: content above it changing moves the feed with it. */
  anchor: HTMLElement | null;
  anchorTop: number;
  anchorBottom: number;
  dirty: boolean;
  /** Posts wholly above the view: the phone may take these off, and only these. */
  above: number;
  random: () => number;
};

const GLASS_HEIGHT = 844;
/** iOS's normal deceleration, per second: velocity × e^(−rate·t). */
const DECELERATION = 3.4;

/** From the option menu (model/tuning.ts): flick speed ×, pause ×, cruise px/s. */
const tuning = { pace: 1.6, pause: 0.45, cruise: 150 };

export function setScrollTuning(next: { pace: number; pause: number; cruise: number }) {
  Object.assign(tuning, next);
}

const scrollers = new Set<Scroller>();
let frame: number | null = null;
let last = 0;

function randomOf(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return state / 4_294_967_296;
  };
}

function feedOf(scroller: Scroller) {
  if (!scroller.feed || !scroller.feed.isConnected) {
    scroller.feed = scroller.glass.querySelector<HTMLElement>("[data-feed]");
    scroller.shown = Number.NaN;
    scroller.anchor = null;
    scroller.dirty = true;
  }
  return scroller.feed;
}

/** The first post whose bottom is below the top of the view, and how many are wholly above it. */
function anchorOf(feed: HTMLElement, y: number) {
  let above = 0;
  for (const post of feed.querySelectorAll<HTMLElement>("[data-post]")) {
    if (post.offsetTop + post.offsetHeight > y) return { post, above };
    above += 1;
  }
  return { post: null, above };
}

/** Reads only: runs for every phone before any phone writes. */
function measure(scroller: Scroller, feed: HTMLElement) {
  if (!scroller.dirty) return;
  scroller.dirty = false;
  const anchor = scroller.anchor;
  if (anchor && anchor.isConnected) {
    const top = anchor.offsetTop;
    scroller.y += top - scroller.anchorTop;
  }
  scroller.end = Math.max(0, feed.scrollHeight - GLASS_HEIGHT);
  scroller.y = Math.min(Math.max(0, scroller.y), scroller.end);
  const found = anchorOf(feed, scroller.y);
  scroller.anchor = found.post;
  scroller.above = found.above;
  scroller.anchorTop = scroller.anchor?.offsetTop ?? 0;
  scroller.anchorBottom = scroller.anchor ? scroller.anchorTop + scroller.anchor.offsetHeight : Number.POSITIVE_INFINITY;
}

function step(scroller: Scroller, dt: number) {
  const feed = scroller.feed;
  if (!feed || Number.isNaN(scroller.end)) return;
  const ahead = scroller.end - scroller.y;
  // Much waiting below: read faster; near the end: slow to a drift, never a stop.
  const target = Math.min(tuning.cruise * 4, Math.max(14, Math.min(tuning.cruise, ahead * 0.5) + Math.max(0, ahead - 1_600) * 0.35));
  scroller.cruise += (target - scroller.cruise) * Math.min(1, dt * 2.5);
  scroller.wait -= dt;
  if (scroller.wait <= 0) {
    scroller.flick += (500 + scroller.random() * 1_400) * Math.min(1, ahead / 900);
    scroller.wait = (0.7 + scroller.random() ** 2 * 2) * tuning.pause * 2;
  }
  // The flick never runs past what is there.
  const flick = Math.min(scroller.flick * tuning.pace, Math.max(0, ahead - 120) * 3);
  scroller.y += (scroller.cruise + flick) * dt;
  scroller.flick *= Math.exp(-DECELERATION * dt);
  if (scroller.y > scroller.end) scroller.y = scroller.end;
  // A new anchor once the old one has gone above the view (no layout read here: this is the write pass).
  if (scroller.y > scroller.anchorBottom) scroller.dirty = true;
  // Not `>=`: `shown` starts as NaN, and every comparison with NaN is false.
  if (!(Math.abs(scroller.y - scroller.shown) < 0.1)) {
    feed.style.transform = `translate3d(0, ${-scroller.y.toFixed(2)}px, 0)`;
    scroller.shown = scroller.y;
  }
}

function loop(time: number) {
  const dt = Math.min(0.05, (time - last) / 1_000);
  last = time;
  // Every read first, then every write: one layout a frame, not one per phone.
  for (const scroller of scrollers) {
    const feed = feedOf(scroller);
    if (feed) measure(scroller, feed);
  }
  for (const scroller of scrollers) step(scroller, dt);
  frame = scrollers.size > 0 ? requestAnimationFrame(loop) : null;
}

export function attachScroller(glass: HTMLElement, seed: number) {
  const random = randomOf(seed);
  const scroller: Scroller = {
    glass,
    feed: null,
    y: 0,
    flick: 0,
    cruise: tuning.cruise,
    wait: random() * 1.5,
    shown: Number.NaN,
    end: Number.NaN,
    anchor: null,
    anchorTop: 0,
    anchorBottom: Number.POSITIVE_INFINITY,
    dirty: true,
    above: 0,
    random,
  };
  scrollers.add(scroller);
  if (frame === null) {
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }
  return {
    /** Posts wholly above the view, as of the last frame: the only ones the phone may take off. */
    above() {
      return scroller.above;
    },
    /** The feed's posts changed: re-anchor and re-measure on the next frame's read. */
    changed() {
      scroller.dirty = true;
    },
    detach() {
      scrollers.delete(scroller);
      if (scrollers.size === 0 && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
  };
}
