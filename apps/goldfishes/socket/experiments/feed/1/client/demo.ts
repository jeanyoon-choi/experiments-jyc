// A stand-in screen for pc work without bubble/N running: the screen's own
// slots (slots.mjs), fed by a small imitation school that touches pages,
// swims between them (dark) and dies now and then. Its pushes have the
// screen's exact shape and timing.

import { createSlots, ingest, snapshotSlots, tick, TUNING } from "./slots.mjs";
import type { FeedKeyword, FeedPush, FeedState } from "./types";

type DemoFish = { serial: number; nextTouchAt: number; leavesAt: number; diesAt: number; page: number };

const PAGES = 120;

export class FeedDemo {
  private readonly runtime = createSlots();
  private readonly fish: DemoFish[] = [];
  private serial = 0;
  private random: () => number;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(
    private readonly vocabulary: FeedKeyword[],
    private readonly onPush: (push: FeedPush) => void,
    { fish = 380, seed = 1 }: { fish?: number; seed?: number } = {},
  ) {
    let state = seed >>> 0 || 1;
    this.random = () => {
      state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
      return state / 4_294_967_296;
    };
    const now = Date.now();
    for (let index = 0; index < fish; index += 1) this.fish.push(this.born(now, 0.2 + this.random() * 4));
    this.timer = setInterval(() => this.step(Date.now()), TUNING.sendIntervalMs);
  }

  snapshot(): FeedState {
    return { vocabulary: this.vocabulary, slots: snapshotSlots(this.runtime) } as FeedState;
  }

  private born(now: number, delay: number): DemoFish {
    this.serial += 1;
    return { serial: this.serial, nextTouchAt: now + delay * 1_000, leavesAt: Infinity, diesAt: now + (25 + this.random() * 70) * 1_000, page: Math.floor(this.random() * PAGES) };
  }

  /** A page's keyword drifts slowly, as bubble/N's pages change what they are shown as. */
  private keywordOf(page: number, now: number) {
    const count = this.vocabulary.length;
    if (count === 0) return "bubble";
    const turn = Math.floor(now / 14_000 + ((page * 0.618) % 1));
    return this.vocabulary[Math.floor(((page * 2_654_435_761 + turn * 40_503) >>> 0) % count)]!.id;
  }

  private step(now: number) {
    const contacts = [];
    const detached = [];
    const departures = [];
    for (let index = 0; index < this.fish.length; index += 1) {
      const fish = this.fish[index]!;
      if (now >= fish.diesAt) {
        departures.push(fish.serial);
        this.fish[index] = this.born(now, 2 + this.random() * 4);
        continue;
      }
      if (now >= fish.leavesAt) {
        detached.push(fish.serial);
        fish.leavesAt = Infinity;
      }
      if (now < fish.nextTouchAt) continue;
      // Mostly the next page over (a fish patrols nearby bubbles), now and then a jump.
      fish.page = this.random() < 0.8 ? (fish.page + 1 + Math.floor(this.random() * 3)) % PAGES : Math.floor(this.random() * PAGES);
      const stay = (0.4 + this.random() * 2.5) * 1_000;
      fish.leavesAt = now + stay;
      fish.nextTouchAt = now + stay + (0.2 + this.random() * 1.2) * 1_000;
      contacts.push({ fish: fish.serial, page: fish.page, keyword: this.keywordOf(fish.page, now), rank: this.random() ** 3 });
    }
    ingest(this.runtime, { contacts, detached, departures });
    const pushed = tick(this.runtime, now);
    if (pushed.items.length > 0 || pushed.released.length > 0 || pushed.idle.length > 0) {
      this.onPush(pushed);
    }
  }

  close() {
    clearInterval(this.timer);
  }
}
