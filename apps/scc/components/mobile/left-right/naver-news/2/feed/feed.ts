import { ARTICLES, EVERYDAY, inSection } from "./articles";
import { SIDES, TIERS, TOP, type Article, type Section, type Side, type Slot, type Tier } from "./types";

// The mobile's roll is the only input. `lean` runs −1 (left) … +1 (right).
//
// The screen is a list: ten headlines, then the latest list, of the section
// tab that is open. A level mobile shows straight reports and nothing moves.
// Leaned, pieces of the side it leans to pour in at the top, RATE · |lean|^1.5
// a second (25/s at full tilt, about 8.8/s at half, 3.1/s at a quarter), and
// every row below is pushed down, the last one off the end.
//
// How far out the arriving pieces stand follows the angle, at once:
//   reach = |lean| · REACH + hold,  tier = ⌊reach⌋ (0 온건 … 4 광란)
// so a slight lean brings slanted reports, a third of the way 사설, half
// 극단, three quarters 선동 and the full tilt 광란, and easing back brings the
// milder pieces again. (In naver-news/1 the tier came only from how long the
// mobile had been held: however far it leaned, the first 4.5 s were 온건.)
// `hold` is what is left of that: each side gains 0.1/s · |lean| while the
// mobile leans its way, never more than the lean itself (one step at full
// tilt), and loses 0.5/s once the mobile eases back below it, so a mobile
// held at a middling angle drifts one step further out and no more.
//
// An article that is open stays the piece that was tapped, whatever the
// mobile does after; only the headline rows under it keep turning.

const RATE = 25;
const LEVEL = 0.03;
const REACH = 4.2;
const HOLD_RISE = 0.1;
const HOLD_FALL = 0.5;
export const HEADLINES = 10;
const START = 22;
const MORE = 10;
const MOST = 80;
/** A piece does not return while it is among this many rows at either end of the list. */
const NEAR = 14;

const sideOf = (lean: number): Side => (lean < 0 ? "left" : "right");

export const SECTIONS: readonly { id: Section; label: string }[] = [
  { id: "politics", label: "정치" },
  { id: "economy", label: "경제" },
  { id: "society", label: "사회" },
  { id: "culture", label: "생활/문화" },
  { id: "tech", label: "IT/과학" },
  { id: "world", label: "세계" },
];

/** Each tab's pieces: the straight reports, and each side's by tier. */
const POOLS = new Map(SECTIONS.map(({ id }) => [id, {
  everyday: EVERYDAY.filter(inSection(id)),
  sided: {
    left: TIERS.map((tier) => ARTICLES.left[tier].filter(inSection(id))),
    right: TIERS.map((tier) => ARTICLES.right[tier].filter(inSection(id))),
  } satisfies Record<Side, readonly (readonly Article[])[]>,
}]));

export type Feed = ReturnType<typeof createFeed>;

export function createFeed(random: () => number = Math.random) {
  const hold: Record<Side, number> = { left: 0, right: 0 };
  let lean = 0;
  let lastStep = 0;
  let tokens = 0;
  let version = 0;
  let nextKey = 1;
  let arrived = 0;
  let section: Section = "politics";
  let pool = POOLS.get(section)!;
  /** The article being read, if one is open: the piece as it was when tapped. */
  let reading: Slot | null = null;
  /** The side and tier the last step stood at; null while level. */
  let stand: { side: Side; tier: Tier } | null = null;
  const listeners = new Set<() => void>();
  /** When each article was last put on screen, so repeats come round as late as possible. */
  const shown = new Map<string, number>();
  let clock = 0;
  let slots: Slot[] = [];

  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const near = () => new Set([...slots.slice(0, NEAR), ...slots.slice(-NEAR)].map((slot) => slot.article.id));

  /** The least recently shown of the candidates that are not near either end of the list. */
  const freshest = (candidates: readonly Article[], beside: Article | undefined) => {
    const here = near();
    const free = candidates.filter((article) => !here.has(article.id));
    if (!free.length) return null;
    const oldest = Math.min(...free.map((article) => shown.get(article.id) ?? 0));
    const due = free.filter((article) => (shown.get(article.id) ?? 0) === oldest);
    // Not the story or the photograph of the row it lands beside, when there is a choice.
    const other = beside ? due.filter((article) => article.topic !== beside.topic && article.photo !== beside.photo) : due;
    return pick(other.length ? other : due);
  };

  const place = (article: Article, wall: number): Slot => {
    clock += 1;
    shown.set(article.id, clock);
    return { key: nextKey++, article, since: wall };
  };

  const tierAt = (side: Side, amount: number): Tier => Math.min(TOP, Math.floor(amount * REACH + hold[side])) as Tier;

  /** A piece for the side at the tier it stands at, or the nearest tier below that has one to give. */
  const draw = (side: Side, tier: Tier, beside: Article | undefined) => {
    for (let level = tier; level >= 0; level -= 1) {
      const found = freshest(pool.sided[side][level], beside);
      if (found) return found;
    }
    return null;
  };

  /** The open tab's first rows: straight reports level, the side's pieces leaned; staggered over the last hours. */
  const fill = (wall: number) => {
    slots = [];
    for (let index = 0; index < START; index += 1) {
      const beside = slots[slots.length - 1]?.article;
      const article = stand ? draw(stand.side, stand.tier, beside) : freshest(pool.everyday, beside);
      if (!article) break;
      slots.push(place(article, wall - (4 + index * 7 + Math.floor(random() * 6)) * 60_000));
    }
  };
  fill(Date.now());

  const emit = () => {
    version += 1;
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getVersion: () => version,
    slots: () => slots as readonly Slot[],
    section: () => section,
    reading: () => reading,

    /** Another tab: its own rows, as the mobile stands now. */
    open(next: Section, wall: number) {
      if (next === section) return;
      section = next;
      pool = POOLS.get(section)!;
      tokens = 0;
      fill(wall);
      emit();
    },

    /** A row was tapped; null closes the article. */
    read(slot: Slot | null) {
      reading = slot ? { ...slot } : null;
      emit();
    },

    /** `target` is the measured lean (−1 … +1); the feed eases toward it. */
    step(target: number, now: number, wall: number) {
      const elapsed = lastStep ? Math.min(250, now - lastStep) : 100;
      lastStep = now;
      const seconds = elapsed / 1000;
      lean += (target - lean) * Math.min(1, seconds * 6);
      const amount = Math.min(1, Math.abs(lean));
      for (const side of SIDES) {
        const toward = Math.max(0, side === "left" ? -lean : lean);
        // Never more than the lean itself: easing back lets go of it.
        hold[side] = hold[side] > toward ? Math.max(toward, hold[side] - HOLD_FALL * seconds) : Math.min(toward, hold[side] + HOLD_RISE * toward * seconds);
      }
      if (amount < LEVEL) {
        tokens = 0;
        stand = null;
        return;
      }
      const side = sideOf(lean);
      const tier = tierAt(side, amount);
      let changed = false;
      if (stand?.side !== side || stand.tier !== tier) stand = { side, tier };
      tokens = Math.min(8, tokens + RATE * amount ** 1.5 * seconds);
      for (let guard = 0; tokens >= 1 && guard < 8; guard += 1) {
        tokens -= 1;
        const article = draw(side, tier, slots[0]?.article);
        if (!article) continue;
        // In at the top; everything else moves down one and the last row leaves
        // (a tab that opened short of rows fills up first).
        const rows = Math.max(START, slots.length);
        slots.unshift(place(article, wall));
        if (slots.length > rows) slots.pop();
        arrived += 1;
        changed = true;
      }
      if (changed) emit();
    },

    /** The reader reached the end of the list: more rows, of the side the mobile leans to. */
    more(wall: number) {
      if (slots.length >= MOST || !slots.length) return;
      let added = false;
      for (let index = 0; index < MORE && slots.length < MOST; index += 1) {
        const last = slots[slots.length - 1];
        const article = stand ? draw(stand.side, stand.tier, last.article) : freshest(pool.everyday, last.article);
        if (!article) break;
        slots.push(place(article, Math.min(wall, last.since) - (3 + Math.floor(random() * 9)) * 60_000));
        added = true;
      }
      if (added) emit();
    },

    stats: () => ({
      lean,
      /** The tier the mobile stands at now; 0 while level. */
      tier: stand?.tier ?? 0,
      hold: { ...hold },
      section,
      arrived,
      rows: slots.length,
      onSide: { left: slots.filter((slot) => slot.article.slant === "left").length, right: slots.filter((slot) => slot.article.slant === "right").length },
      tiers: TIERS.map((tier) => slots.filter((slot) => slot.article.slant !== "none" && slot.article.tier === tier).length),
    }),
  };
}
