// Messages as a phone uses it: the group chats where hype circulates (NOTES
// "50개 오픈채팅방") — a link dropped, a photo, a hundred reactions, a heart
// tapped on; its notification the sender and what they said.

import { caption, headline, reaction } from "../../content/voice";
import type { Lang } from "../../paint/types";
import type { AppDef } from "../types";
import type { MessageBubble } from "./paint";

const GROUPS: Record<Lang, readonly string[]> = {
  en: ["the group chat 🫧", "alpha only 📈", "fam 🏡", "launch day crew", "do NOT tell mom"],
  ko: ["정보방 🫧", "리딩방 VIP 📈", "가족방 🏡", "동기 단톡", "오픈채팅 50"],
  ja: ["情報共有🫧", "投資部 📈", "家族 🏡", "同期グループ", "オフ会"],
  es: ["el grupo 🫧", "solo alfas 📈", "familia 🏡", "los de siempre", "no le digan a mamá"],
};

export const messages: AppDef = {
  id: "messages",
  name: "Messages",
  kind: "chat",
  mode: (persona) => persona.mode,
  bg: (mode) => (mode === "dark" ? "#000000" : "#ffffff"),
  top: 124,
  bottom: 90,
  chrome: (ctx) => ({ name: ctx.rng.pick(GROUPS[ctx.lang]), faces: [ctx.face(), ctx.face(), ctx.face()], unread: 1 + ctx.rng.int(60) }),
  item(ctx) {
    const { rng } = ctx;
    const mine = rng.chance(0.3);
    const who = ctx.person();
    const kind = ctx.fresh ? (rng.chance(0.6) ? "link" : "photo") : rng.chance(0.08) ? "photo" : rng.chance(0.06) ? "link" : "text";
    const words = kind === "text" ? (rng.chance(mine ? 0.75 : 0.5) ? reaction(ctx.lang, ctx.label, rng) : caption(ctx.lang, ctx.event, ctx.label, rng)) : "";
    const data: MessageBubble = {
      mine,
      sender: mine ? ctx.persona.name : who.name,
      face: mine ? "" : ctx.face(),
      text: words,
      kind,
      photo: kind === "text" ? "" : ctx.photo(kind === "photo" ? "any" : "photo"),
      link: kind === "link" ? { title: headline(ctx.lang, ctx.event, ctx.label, rng), site: `${ctx.event.org.toLowerCase().replace(/[^a-z0-9]+/g, "") || "hypewire"}.com` } : null,
      tapback: rng.chance(0.18) ? (mine ? "theirs" : "mine") : "",
      green: ctx.persona.seed % 7 === 0,
    };
    return { painter: "messages.bubble", data };
  },
  notify(ctx) {
    const who = ctx.person();
    return { title: who.name, body: ctx.rng.chance(0.5) ? reaction(ctx.lang, ctx.label, ctx.rng) : caption(ctx.lang, ctx.event, ctx.label, ctx.rng) };
  },
};
