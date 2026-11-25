// Tinder as a phone uses it: Lust (NOTES 1017), one card after another, each
// a fictional stranger whose bio is the hype — a founder building it, someone
// who will talk about it for three hours; its notification a match.

import type { Lang } from "../../paint/types";
import type { AppDef } from "../types";
import type { TinderCard } from "./paint";

const JOBS: Record<Lang, readonly string[]> = {
  en: ["Founder @ {org}", "Head of {k} @ {org}", "{k} Evangelist", "Chief {k} Officer", "Angel investor (mostly {k})", "Ex-{org}, now stealth"],
  ko: ["{org} 창업자", "{org} {k} 리드", "{k} 에반젤리스트", "최고 {k} 책임자", "엔젤 투자자 ({k} 위주)", "전 {org}, 현재 스텔스"],
  ja: ["{org} 創業者", "{org} {k}リード", "{k}エバンジェリスト", "CXO（{k}担当）", "エンジェル投資家（主に{k}）", "元{org}、現在ステルス"],
  es: ["Fundador @ {org}", "Head of {k} @ {org}", "Evangelista de {k}", "Chief {k} Officer", "Inversor ángel (sobre todo {k})", "Ex-{org}, ahora en modo stealth"],
};

const BIOS: Record<Lang, readonly string[]> = {
  en: ["building {k}. will explain it on the first date", "will talk about {k} for 3 hours", "looking for someone to explain {k} to me (again)", "{k} early adopter. emotionally a late adopter", "swipe right if you're pre-revenue too", "my love language is {k}", "{fig}. ask me how"],
  ko: ["{k} 만드는 중. 첫 데이트에 설명해 드림", "{k} 얘기 3시간 가능", "{k} 다시 설명해 줄 사람 구함", "{k} 얼리어답터. 연애는 레이트어답터", "사랑의 언어: {k}", "{fig}. 어떻게 했는지 물어봐요"],
  ja: ["{k}つくってます。初デートで説明します", "{k}の話なら3時間いけます", "{k}をもう一度説明してくれる人", "{k}はアーリーアダプター、恋愛はレイト", "愛の言語は{k}", "{fig}。詳しくはマッチ後に"],
  es: ["construyendo {k}. te lo explico en la primera cita", "puedo hablar de {k} 3 horas", "busco a alguien que me explique {k} (otra vez)", "early adopter de {k}, late adopter del amor", "mi lenguaje del amor es {k}", "{fig}. pregúntame cómo"],
};

const EXTRAS: Record<Lang, readonly string[]> = {
  en: ["Coffee", "Gym", "Hiking", "Startups", "Sushi", "Podcasts"],
  ko: ["커피", "헬스", "등산", "스타트업", "초밥", "팟캐스트"],
  ja: ["カフェ", "ジム", "登山", "スタートアップ", "寿司", "ポッドキャスト"],
  es: ["Café", "Gym", "Senderismo", "Startups", "Sushi", "Pódcasts"],
};

export const tinder: AppDef = {
  id: "tinder",
  name: "Tinder",
  kind: "stack",
  mode: (persona) => persona.mode,
  bg: (mode) => (mode === "dark" ? "#111418" : "#ffffff"),
  top: 104,
  bottom: 150,
  item(ctx) {
    const { rng, lang } = ctx;
    const fill = (template: string) => template.replace(/\{k\}/g, ctx.label).replace(/\{org\}/g, ctx.event.org).replace(/\{fig\}/g, ctx.event.figures[0] ?? "");
    const pages = 3 + rng.int(4);
    const tags = [ctx.label, ...ctx.event.tags.filter((tag) => tag.toLowerCase() !== ctx.label.toLowerCase())].slice(0, 2);
    const data: TinderCard = {
      name: ctx.person().name.split(" ")[0]!,
      age: 22 + rng.int(17),
      photo: ctx.photo("portrait"),
      verified: rng.chance(0.35),
      active: ctx.fresh || rng.chance(0.6),
      fresh: ctx.fresh,
      job: fill(rng.pick(JOBS[lang])),
      bio: fill(rng.pick(BIOS[lang])),
      distance: 1 + rng.int(24),
      chips: [...tags, rng.pick(EXTRAS[lang])],
      pages,
      page: rng.int(pages),
    };
    return { painter: "tinder.card", w: 374, h: 600, data };
  },
  notify(ctx) {
    const match = ctx.fresh || ctx.rng.chance(0.5);
    const bodies = {
      en: match ? "You have a new match! 🔥" : `Someone liked you. They're into ${ctx.label} too 👀`,
      ko: match ? "새로운 매치가 있어요! 🔥" : `누군가 회원님을 좋아해요. ${ctx.label}에 관심 있대요 👀`,
      ja: match ? "新しいマッチがあります！🔥" : `誰かがあなたにLikeしました。${ctx.label}好きみたい 👀`,
      es: match ? "¡Tienes un nuevo match! 🔥" : `Le gustas a alguien. También le va ${ctx.label} 👀`,
    };
    return { title: "Tinder", body: bodies[ctx.lang] };
  },
};
