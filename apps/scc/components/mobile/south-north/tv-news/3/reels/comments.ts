import { PANELS } from "../panels";
import { reelOf } from "./feed";
import { people } from "./people";
import { pools } from "./pools";

// The comments under a part of the list: fictional and fixed, like its counts. The shuffle and the fall of the likes
// are scroll-rot/eye/2's (copied); what is said is this work's own (pools.ts).
export type Comment = { id: string; user: string; avatar?: string; body: string; likes: number; age: string };

const SHOWN = 12;
const AGES = ["4m", "26m", "1h", "2h", "3h", "5h", "9h", "14h", "1d", "2d", "4d", "1w"];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(list: readonly T[], rand: () => number) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `part`: the place in PANELS. */
export function commentsOf(part: number): Comment[] {
  const rand = mulberry32((part + 1) * 0x51ed27);
  const own = pools[PANELS[part].id] ?? [];
  const bodies = shuffled([...shuffled(own, rand).slice(0, 8), ...shuffled(pools.any, rand).slice(0, 4)], rand);
  const who = shuffled(people, rand);
  const count = Math.min(SHOWN, bodies.length, reelOf(part).comments);
  // the top comment has a good share of the reel's likes; the rest fall away as they do
  let likes = Math.max(4, Math.round(reelOf(part).likes / (14 + rand() * 22)));
  return bodies.slice(0, count).map((body, i) => {
    const person = who[i % who.length];
    const tagged = who[(i + 5) % who.length];
    const comment = {
      id: `${part}-${i}`,
      user: person.user,
      avatar: person.avatar,
      body: body.replace("{user}", tagged.user),
      likes,
      age: AGES[Math.floor(rand() * AGES.length)],
    };
    likes = Math.floor(likes * (0.3 + rand() * 0.5));
    return comment;
  });
}
