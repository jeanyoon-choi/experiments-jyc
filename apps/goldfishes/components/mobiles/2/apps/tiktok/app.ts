// TikTok as a phone uses it: the endless short-video Sloth (NOTES 1017), one
// full-screen clip after another about the hype — some a sound sped up, some
// a POV sticker, about one in seven Sponsored, now and then LIVE.

import { caption, hashtags, headline, reaction } from "../../content/voice";
import type { AppDef } from "../types";
import type { TikTokClip } from "./paint";

const POV = { en: "POV: ", ko: "POV: ", ja: "POV：", es: "POV: " } as const;

export const tiktok: AppDef = {
  id: "tiktok",
  name: "TikTok",
  kind: "pager",
  mode: () => "dark",
  bg: () => "#000000",
  top: 0,
  bottom: 83,
  item(ctx) {
    const { rng } = ctx;
    const who = ctx.person();
    const ad = !ctx.fresh && rng.chance(0.15);
    const live = !ad && rng.chance(ctx.fresh ? 0.5 : 0.08);
    const brand = ctx.event.org.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const handle = ad ? brand : who.handle;
    const scale = ctx.fresh ? 1 : rng.range(0.05, 1);
    const data: TikTokClip = {
      handle,
      face: ctx.face(),
      photo: ctx.photo(ad ? "object" : "any"),
      caption: `${caption(ctx.lang, ctx.event, ctx.label, rng)} ${hashtags(ctx.event, ctx.label, rng)}${ad ? "" : " #fyp"}`,
      sound: rng.chance(0.4) ? `${ctx.label} (sped up) - ${ctx.event.org}` : handle,
      likes: Math.round(rng.range(400, 3_800_000) * scale),
      comments: Math.round(rng.range(20, 60_000) * scale),
      saves: Math.round(rng.range(10, 400_000) * scale),
      shares: Math.round(rng.range(10, 200_000) * scale),
      minutes: ctx.fresh ? 0 : rng.range(3, 4_000),
      verified: ad || rng.chance(0.2),
      ad,
      live,
      overlay: !ad && rng.chance(0.4) ? (rng.chance(0.5) ? `${POV[ctx.lang]}${headline(ctx.lang, ctx.event, ctx.label, rng)}` : reaction(ctx.lang, ctx.label, rng)) : "",
      letterbox: rng.chance(0.25),
      progress: rng.range(0.05, 0.9),
    };
    return { painter: "tiktok.clip", w: 390, h: 844, data };
  },
  notify(ctx) {
    const who = ctx.person();
    const titles = {
      en: `${who.name} posted a video`,
      ko: `${who.name}님이 동영상을 게시했습니다`,
      ja: `${who.name}さんが動画を投稿しました`,
      es: `${who.name} publicó un video`,
    };
    return { title: "TikTok", body: `${titles[ctx.lang]}: ${caption(ctx.lang, ctx.event, ctx.label, ctx.rng)}` };
  },
};
