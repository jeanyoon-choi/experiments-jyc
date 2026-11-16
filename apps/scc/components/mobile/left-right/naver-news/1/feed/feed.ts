import { ARTICLES, EVERYDAY } from "./articles";
import { SIDES, type Article, type Side, type Slot, type Tier } from "./types";

// The mobile's roll is the only input. `lean` runs −1 (left) … +1 (right).
//
// The screen is a list: ten headlines, then the latest list. A level mobile
// shows everyday news and nothing moves. Leaned, pieces of the side it leans
// to pour in at the top, RATE · |lean|^1.5 a second (60/s at full tilt, about
// 21/s at half, 7.5/s at a quarter), and every row below is pushed down, the
// last one off the end, as KakaoTalk's list moves in left-right/kakao-talk.
// The other side's rows and the everyday ones are carried off the bottom
// within a second, and the stream does not stop while the mobile leans.
// Scrolling to the end only lengthens the list.
//
// Each side keeps a heat (0–3), as in left-right/kakao-talk: it rises at
// 0.2/s · |lean| while the mobile leans that way and falls at 0.08/s
// otherwise. Heat sets the tier of what arrives: below 0.9 온건 (slanted
// reports), below 1.9 강경 (사설·칼럼), above 극단 (팬덤 매체).

const RATE = 60;
const LEVEL = 0.03;
const RISE = 0.2;
const FALL = 0.08;
export const HEADLINES = 10;
const START = 22;
const MORE = 10;
const MOST = 80;

const tierOf = (heat: number): Tier => (heat < 0.9 ? 0 : heat < 1.9 ? 1 : 2);
const sideOf = (lean: number): Side => (lean < 0 ? "left" : "right");

export type Feed = ReturnType<typeof createFeed>;

export function createFeed(random: () => number = Math.random) {
  const heat: Record<Side, number> = { left: 0, right: 0 };
  let lean = 0;
  let lastStep = 0;
  let tokens = 0;
  let version = 0;
  let nextKey = 1;
  let arrived = 0;
  const listeners = new Set<() => void>();
  /** When each article was last put on screen, so repeats come round as late as possible. */
  const shown = new Map<string, number>();
  let clock = 0;

  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const onScreen = () => new Set(slots.map((slot) => slot.article.id));

  /** The least recently shown of the candidates that are not on screen now. */
  const freshest = (candidates: readonly Article[]) => {
    const here = onScreen();
    const free = candidates.filter((article) => !here.has(article.id));
    if (!free.length) return null;
    const oldest = Math.min(...free.map((article) => shown.get(article.id) ?? 0));
    const due = free.filter((article) => (shown.get(article.id) ?? 0) === oldest);
    // Not the story or the photograph of the row it lands beside, when there is a choice.
    const beside = slots[0]?.article;
    const other = beside ? due.filter((article) => article.topic !== beside.topic && article.photo !== beside.photo) : due;
    return pick(other.length ? other : due);
  };

  const place = (article: Article, wall: number): Slot => {
    clock += 1;
    shown.set(article.id, clock);
    return { key: nextKey++, article, since: wall };
  };

  /** A piece for the side at the highest tier it has reached that still has one to give. */
  const draw = (side: Side, tier: Tier) => {
    for (let level = tier; level >= 0; level -= 1) {
      const found = freshest(ARTICLES[side][level as Tier]);
      if (found) return found;
    }
    return null;
  };

  // The level screen: everyday news, staggered over the last hours.
  const slots: Slot[] = [];
  const opened = Date.now();
  for (let index = 0; index < START; index += 1) {
    const article = freshest(EVERYDAY) ?? pick(EVERYDAY);
    slots.push(place(article, opened - (4 + index * 7 + Math.floor(random() * 6)) * 60_000));
  }

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

    /** `target` is the measured lean (−1 … +1); the feed eases toward it. */
    step(target: number, now: number, wall: number) {
      const elapsed = lastStep ? Math.min(250, now - lastStep) : 100;
      lastStep = now;
      const seconds = elapsed / 1000;
      lean += (target - lean) * Math.min(1, seconds * 6);
      const amount = Math.min(1, Math.abs(lean));
      for (const side of SIDES) {
        const toward = Math.max(0, side === "left" ? -lean : lean);
        heat[side] = Math.max(0, Math.min(3, heat[side] + (toward > 0.15 ? RISE * toward : -FALL) * seconds));
      }
      if (amount < LEVEL) {
        tokens = 0;
        return;
      }
      const side = sideOf(lean);
      const tier = tierOf(heat[side]);
      tokens = Math.min(8, tokens + RATE * amount ** 1.5 * seconds);
      let changed = false;
      for (let guard = 0; tokens >= 1 && guard < 8; guard += 1) {
        tokens -= 1;
        const article = draw(side, tier);
        if (!article) continue;
        // In at the top; everything else moves down one and the last row leaves.
        slots.unshift(place(article, wall));
        slots.pop();
        arrived += 1;
        changed = true;
      }
      if (changed) emit();
    },

    /** The reader reached the end of the list: more rows, of the side the mobile leans to. */
    more(wall: number) {
      if (slots.length >= MOST) return;
      const side = Math.abs(lean) < LEVEL ? null : sideOf(lean);
      for (let index = 0; index < MORE && slots.length < MOST; index += 1) {
        const article = side ? draw(side, tierOf(heat[side])) : freshest(EVERYDAY);
        if (!article) break;
        const last = slots[slots.length - 1].since;
        slots.push(place(article, Math.min(wall, last) - (3 + Math.floor(random() * 9)) * 60_000));
      }
      emit();
    },

    stats: () => ({
      lean,
      tier: { left: tierOf(heat.left), right: tierOf(heat.right) },
      arrived,
      rows: slots.length,
      onSide: { left: slots.filter((slot) => slot.article.slant === "left").length, right: slots.filter((slot) => slot.article.slant === "right").length },
    }),
  };
}
