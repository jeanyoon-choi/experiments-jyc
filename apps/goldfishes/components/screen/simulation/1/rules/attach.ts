// Question: when does a goldfish take a bubble?
//
//   always — whenever it looks about it takes the bubble that pulls it most, however little (bubble/9)
//   worth  — only when that pull is more than swimming on. The pull is the score bubble/9 already has (size, newness,
//            its own boredom, the crowd there, the distance); the size in it is the size on the screen, in fish's
//            worths, so a small bubble holds only the fish beside it and a large one draws from far off. A fish that
//            nothing holds swims free: it wanders with the others (`meander`), is not worn down (a life is spent on
//            watching; artist, 2026-11-25), and looks again when its attention next lapses.
//
// Read by fish/attention.ts (lookAbout, lapsed), in the school's worker: so the answer crosses as two numbers of the
// fish's parameters — `worth` (0: always) and `body` (the raft in fish's worths) — and these are plain functions.

/** The distance at which a bubble's pull is half what it is at its edge, px (bubble/9's score: 1 / (80 + gap)). */
export const REACH = 80;

/** How large a bubble looks to a fish: against the mean bubble (bubble/9), or in fish's worths when `body` is given. */
export function apparent(shown: number, mean: number, body: number) {
  return Math.sqrt(body > 0 ? Math.max(shown, 0) * body : Math.max(shown, 0) / mean);
}

/** Whether a pull of `score` holds a fish: 1 is a bubble of one fish's worth, known, empty, at its edge. */
export function holds(score: number, worth: number) {
  return worth <= 0 || score * REACH > worth;
}

/**
 * A free fish's wandering: how hard it turns now, −1.5 … 1.5, slowly changing and its own (`a`–`d` are four numbers
 * of the fish's, 0–1). Without it a fish that holds to nothing goes straight until a wall turns it.
 */
export function meander(time: number, a: number, b: number, c: number, d: number) {
  return Math.sin(time * (0.25 + 0.3 * a) + 6.283 * b) + 0.5 * Math.sin(time * (0.7 + 0.5 * c) + 6.283 * d);
}

/**
 * A free fish's pace against one that a bubble has (artist, 2026-11-25: slow while nothing has its attention, the
 * pace it has now once it has met a bubble, so the two are seen apart).
 */
export const FREE_PACE = 0.35;

// The third answer, `touch` (simulation/docs/conditions.md §4; corrections 9 and 13: an agent sees only what is in
// front of it). As `worth`, but:
//   - a goldfish sees no bubble from afar: only those within TOUCH of it can hold it, so a free fish is held by a
//     bubble it swims into and a held fish goes on only to bubbles at hand;
//   - it does not follow a link by chance: every time its attention lapses it makes the one choice (the best at hand,
//     if that is worth more than swimming on);
//   - what it tires of is the object it watched, not the one bubble (`byObject`), and it forgets over `forget`
//     seconds: so one object holds a fish once, and many objects side by side hold it long.

/** How near a bubble's edge must be for a goldfish to see it, as a share of the field's shorter side. */
export const TOUCH = 0.03;

/**
 * How fast a goldfish tires of an object, against bubble/9's tiring of one bubble. At 1 (the first build) a fish
 * was done with an object in 0.6 s and a stroke was eaten up in ten seconds; the model document's goldfish take
 * some seconds over a keyword (M9: 0.15 a second).
 */
export const OBJECT_PACE = 0.15;
