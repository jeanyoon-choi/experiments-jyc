// Instagram Reels as a phone uses it: the endless short-video Sloth (NOTES
// 1017) inside Pride's wrapper — the same hype as a full-screen reel, a fifth
// of them Sponsored, its notification someone sharing one.

import { caption, hashtags } from "../../content/voice";
import type { AppDef } from "../types";
import type { ReelsClip } from "./paint";

export const reels: AppDef = {
  id: "reels",
  name: "Reels",
  kind: "pager",
  mode: () => "dark",
  bg: () => "#000000",
  top: 0,
  bottom: 83,
  chrome: (ctx) => ({ face: ctx.face() }),
  item(ctx) {
    const { rng } = ctx;
    const who = ctx.person();
    const ad = !ctx.fresh && rng.chance(0.18);
    const handle = ad ? ctx.event.org.toLowerCase().replace(/[^a-z0-9]+/g, "") : who.handle;
    const scale = ctx.fresh ? 1 : rng.range(0.05, 1);
    const data: ReelsClip = {
      handle,
      face: ctx.face(),
      photo: ctx.photo(ad ? "object" : "any"),
      caption: `${caption(ctx.lang, ctx.event, ctx.label, rng)} ${hashtags(ctx.event, ctx.label, rng)}`,
      sound: rng.chance(0.35) ? `${ctx.event.org} · ${ctx.label} (slowed + reverb)` : "",
      likes: Math.round(rng.range(300, 2_400_000) * scale),
      comments: Math.round(rng.range(10, 30_000) * scale),
      reposts: Math.round(rng.range(5, 90_000) * scale),
      shares: Math.round(rng.range(10, 300_000) * scale),
      verified: ad || rng.chance(0.25),
      ad,
      followed: !ad && rng.chance(0.15),
      progress: rng.range(0.05, 0.9),
    };
    return { painter: "reels.clip", w: 390, h: 844, data };
  },
  notify(ctx) {
    const who = ctx.person();
    const titles = {
      en: `${who.handle} shared a reel`,
      ko: `${who.handle}님이 릴스를 공유했습니다`,
      ja: `${who.handle}さんがリール動画をシェアしました`,
      es: `${who.handle} compartió un reel`,
    };
    return { title: "Instagram", body: `${titles[ctx.lang]}: ${caption(ctx.lang, ctx.event, ctx.label, ctx.rng)}` };
  },
};
