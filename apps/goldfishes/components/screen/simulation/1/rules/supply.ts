// Question: every beat a bubble sends on only `damping` (0.85) of its size along its relations. Where does the rest go?
//
//   everywhere — over every bubble, evenly (bubble/9: PageRank's teleport; nobody's act)
//   touching   — to the bubbles it touches, evenly
//   none       — nowhere: nothing is lost, all of it goes along the relations
//   watched    — to the bubbles the goldfish are watching, by how many watch each: a bubble's size comes from its
//                audience. With nobody watching anything, nothing is lost.
//
// Read by web/iteration.ts (`iterate`, `transit`), which keeps the arithmetic.

export const SUPPLY = ["everywhere", "touching", "none", "watched"] as const;
export type Supply = (typeof SUPPLY)[number];

/** What supply needs of the web: its damping, the answer in use, and for `watched` the fish at each bubble and their sum. */
export type Supplied = { readonly damping: number; supply?: Supply; watched?: ArrayLike<number>; looking?: number };

/** The share of its size a bubble sends along its relations this beat (the rest is what `supply` places). */
export function sentShare(web: Supplied) {
  const supply = web.supply ?? "everywhere";
  if (supply === "none") return 1;
  if (supply === "watched" && !((web.looking ?? 0) > 0 && web.watched)) return 1;
  return web.damping;
}
