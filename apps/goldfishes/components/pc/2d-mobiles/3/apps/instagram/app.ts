// Instagram as a phone uses it: a feed under its wordmark, the hype as a
// post (a fifth of them Sponsored: NOTES 1023, the attention economy's ad
// space), its notification a like or a new post.

import { caption, hashtags } from "../../content/voice";
import type { AppDef } from "../types";
import type { InstagramPost } from "./paint";

export const instagram: AppDef = {
  id: "instagram",
  name: "Instagram",
  kind: "feed",
  mode: (persona) => persona.mode,
  bg: (mode) => (mode === "dark" ? "#000000" : "#ffffff"),
  top: 98,
  bottom: 83,
  chrome: (ctx) => ({ face: ctx.face() }),
  opening(ctx) {
    const people = [ctx.person(), ctx.person(), ctx.person(), ctx.person(), ctx.person()];
    return [{ painter: "instagram.stories", data: { faces: people.map(() => ctx.face()), names: people.map((person) => person.handle.split(/[._]/)[0]!), own: ctx.face() } }];
  },
  item(ctx) {
    const { rng } = ctx;
    const who = ctx.person();
    const sponsored = !ctx.fresh && rng.chance(0.2);
    const data: InstagramPost = {
      name: sponsored ? ctx.event.org.toLowerCase().replace(/[^a-z0-9]+/g, "") : who.handle,
      face: ctx.face(),
      photo: ctx.photo(sponsored ? "object" : "any"),
      caption: `${caption(ctx.lang, ctx.event, ctx.label, rng)} ${hashtags(ctx.event, ctx.label, rng)}`,
      likes: Math.round(rng.range(80, 400_000) * (ctx.fresh ? 1 : rng.range(0.2, 1))),
      comments: rng.int(9_000),
      minutes: ctx.fresh ? 0 : rng.range(2, 600),
      verified: sponsored || rng.chance(0.25),
      sponsored,
      location: rng.chance(0.35) ? rng.pick(["Seoul, South Korea", "Los Angeles, California", "Tokyo, Japan", "Madrid, Spain", "Austin, Texas", "Palo Alto, California"]) : "",
      liked: false,
      tall: rng.chance(0.45),
      liker: ctx.person().handle,
    };
    return { painter: "instagram.post", data };
  },
  notify(ctx) {
    const who = ctx.person();
    const titles = {
      en: `${who.handle} shared a post`,
      ko: `${who.handle}님이 게시물을 공유했습니다`,
      ja: `${who.handle}さんが投稿をシェアしました`,
      es: `${who.handle} compartió una publicación`,
    };
    return { title: "Instagram", body: `${titles[ctx.lang]}: ${caption(ctx.lang, ctx.event, ctx.label, ctx.rng)}` };
  },
};
