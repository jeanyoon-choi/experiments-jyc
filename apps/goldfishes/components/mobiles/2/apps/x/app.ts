// X as a phone uses it: the hype as a rant, a ratio or a quote-post, mostly
// dark; its notification someone's take.

import { caption, headline, reaction } from "../../content/voice";
import type { AppDef } from "../types";
import type { XPost } from "./paint";

export const x: AppDef = {
  id: "x",
  name: "X",
  kind: "feed",
  mode: (persona) => (persona.seed % 5 === 0 ? "light" : "dark"),
  bg: (mode) => (mode === "dark" ? "#000000" : "#ffffff"),
  top: 142,
  bottom: 83,
  chrome: (ctx) => ({ face: ctx.face() }),
  item(ctx) {
    const { rng } = ctx;
    const who = ctx.person();
    const ad = !ctx.fresh && rng.chance(0.12);
    const quoted = !ad && rng.chance(0.3);
    const body = ad
      ? `${headline(ctx.lang, ctx.event, ctx.label, rng)} ${rng.pick(["Join the waitlist →", "Get early access.", "Don't miss out.", "Limited spots."])}`
      : quoted
        ? reaction(ctx.lang, ctx.label, rng)
        : rng.chance(0.5)
          ? caption(ctx.lang, ctx.event, ctx.label, rng)
          : `${reaction(ctx.lang, ctx.label, rng)}\n\n${headline(ctx.lang, ctx.event, ctx.label, rng)}`;
    const other = ctx.person();
    const data: XPost = {
      name: ad ? ctx.event.org : who.name,
      handle: ad ? ctx.event.org.replace(/\W+/g, "") : who.handle,
      face: ctx.face(),
      body,
      photo: ad || rng.chance(0.45) ? ctx.photo(ad ? "object" : "any") : "",
      replies: rng.int(30_000),
      reposts: rng.int(80_000),
      likes: rng.int(400_000),
      views: rng.int(9_000_000),
      minutes: ctx.fresh ? 0 : rng.range(1, 300),
      verified: ad || rng.chance(0.55),
      quote: quoted ? { name: other.name, handle: other.handle, body: headline(ctx.lang, ctx.event, ctx.label, rng) } : null,
      ad,
    };
    return { painter: "x.post", data };
  },
  notify(ctx) {
    const who = ctx.person();
    return { title: who.name, body: caption(ctx.lang, ctx.event, ctx.label, ctx.rng) };
  },
};
