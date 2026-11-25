// Question: how large is the whole raft?
//
//   fixed — always the same share of the screen, however many bubbles (bubble/9)
//   held  — as large as the watching it has had: every fish held by a bubble adds to the raft, slowly, and what is
//           no longer watched goes as slowly (`grow`), so the raft is the watching that has built up and not
//           the head count of the moment. All of the school held for long is bubble/9's raft; a raft nobody watches
//           comes down to one fish's worth (a bubble that is there has a body). A bubble laid by a stroke brings its
//           own size, some fish's worths (`lay`): laying it takes nothing from the others.
//
// `Held` is also what supply.ts's `watched` reads: how many fish are at each bubble.

import { MAX_PAGES as MAX_ENTITIES } from "../web/model.ts";

/**
 * Who is at which bubble follows the school with this time constant, s (for supply.ts's `watched`). The shares
 * themselves move slowly (only 15% a beat is placed by it), so this only evens out one fish's coming and going.
 */
const FOLLOW_SECONDS = 2;

type Watcher = { readonly target: number; readonly life: { readonly dying: boolean } };

export class Held {
  /** Per bubble: the goldfish holding to it, smoothed. */
  readonly watched = new Float64Array(MAX_ENTITIES);
  /** Their sum. */
  looking = 0;
  /** The raft's share of its full size (1: bubble/9's). */
  share = 1;
  /** The raft in fish's worths (`share` × the school). */
  units = 1;
  private readonly counted = new Float64Array(MAX_ENTITIES);
  /** Whether the school has been seen since the world started: until then a raft whose size is the school's is one fish's worth, not bubble/9's. */
  private seen = false;
  /**
   * The raft's size follows the fish it holds with this time constant, s (시스템 → 자라는 시간). At 1.5 a stroke's
   * newness drew most of the school and the raft filled the screen within seconds; at 30 with small strokes nothing
   * was seen to happen (artist, 2026-11-25, both). 7 is what losing 15% a beat comes to (a beat is 1.1 s).
   */
  grow = 7;

  /** The raft's share of its full size under `scale`, for a school of `school`. */
  shareFor(scale: number, school: number) {
    if (scale < 0.5) return 1;
    return this.seen ? this.share : 1 / Math.max(1, school);
  }

  /** The school as it is this frame, of `asked` fish: who is held by which bubble. `scale`: the answer in use (0 fixed, 1 held). Returns the living. */
  observe(school: readonly Watcher[], asked: number, bubbles: number, scale: number, seconds: number) {
    const { counted, watched } = this;
    counted.fill(0, 0, bubbles);
    let alive = 0;
    for (const fish of school) {
      if (fish.life.dying) continue;
      alive += 1;
      if (fish.target >= 0 && fish.target < bubbles) counted[fish.target] = counted[fish.target]! + 1;
    }
    const follow = Math.min(1, seconds / FOLLOW_SECONDS);
    let looking = 0;
    for (let bubble = 0; bubble < bubbles; bubble += 1) {
      watched[bubble] = watched[bubble]! + (counted[bubble]! - watched[bubble]!) * follow;
      looking += watched[bubble]!;
    }
    this.looking = looking;
    // Against the school as asked for, not as counted: the count is 0 until the school's first step comes back, and
    // a raft measured against it was bubble/9's size for that moment (it crushed the fish coming in).
    const size = Math.max(1, asked);
    if (scale >= 0.5) {
      this.units = Math.min(size, Math.max(1, this.units + (looking - this.units) * Math.min(1, seconds / Math.max(0.5, this.grow))));
      this.share = this.units / size;
    } else {
      this.share = 1;
      this.units = size;
    }
    this.seen = true;
    return alive;
  }

  /** Strokes laid bubbles of `count` fish's worths in all. */
  lay(count: number) {
    this.units += count;
  }

  /** The world started over, or the school is gone. */
  reset() {
    this.watched.fill(0);
    this.looking = 0;
    this.share = 1;
    this.units = 1;
    this.seen = false;
  }
}
