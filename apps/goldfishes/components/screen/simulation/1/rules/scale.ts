// Question: how large is the whole raft?
//
//   fixed — always the same share of the screen, however many bubbles (bubble/9)
//   held  — as large as the goldfish that are held by a bubble: all of the school held is bubble/9's raft, one fish
//           held is one fish's worth of it. A raft nobody watches is one fish's worth (a bubble that is there has a
//           body).
//
// `Held` is also what supply.ts's `watched` reads: how many fish are at each bubble.

import { MAX_PAGES as MAX_ENTITIES } from "../web/model.ts";

/** The count follows the school with this time constant, s, so the raft breathes and does not jump. */
const FOLLOW_SECONDS = 1.5;

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
    this.share = scale >= 0.5 ? Math.max(1, looking) / size : 1;
    this.units = this.share * size;
    this.seen = true;
    return alive;
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
