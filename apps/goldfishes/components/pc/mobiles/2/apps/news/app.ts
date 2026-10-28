// News as a phone uses it (the eighth axis, NOTES 1017): the hype as
// reporting — Today's date, "Top Stories", a lead with a photo and a serif
// headline, then rows from fictional mastheads; one in seven an
// Advertisement. The goldfish's own strike lands as BREAKING. Its
// notification is a masthead and a headline.

import { headline } from "../../content/voice";
import type { Lang } from "../../paint/types";
import type { AppDef } from "../types";
import type { Masthead, NewsAd, NewsStory } from "./paint";

const MASTHEADS: Record<Lang, readonly Masthead[]> = {
  en: [
    { name: "The Daily Ledger", style: 0 },
    { name: "Morning Wire", style: 1 },
    { name: "The Overstory", style: 2 },
    { name: "Pacific Courier", style: 0 },
    { name: "Signal Times", style: 3 },
    { name: "Bloomline", style: 1 },
    { name: "Herald & Lamp", style: 2 },
  ],
  ko: [
    { name: "한빛일보", style: 0 },
    { name: "모닝와이어", style: 1 },
    { name: "새벽경제", style: 0 },
    { name: "Signal Korea", style: 3 },
    { name: "오늘의 소리", style: 2 },
  ],
  ja: [
    { name: "朝凪新聞", style: 0 },
    { name: "モーニングワイヤー", style: 1 },
    { name: "東都経済", style: 0 },
    { name: "Signal Japan", style: 3 },
    { name: "夕刊ひかり", style: 2 },
  ],
  es: [
    { name: "Diario Prisma", style: 0 },
    { name: "El Correo del Alba", style: 2 },
    { name: "Señal", style: 1 },
    { name: "La Gaceta Abierta", style: 0 },
    { name: "Hoy Mundo", style: 3 },
  ],
};

const TOP: Record<Lang, string> = { en: "Top Stories", ko: "주요 뉴스", ja: "トップニュース", es: "Noticias destacadas" };

const CTAS: Record<Lang, readonly string[]> = { en: ["Learn more", "Shop", "Get it"], ko: ["더 알아보기", "구매하기", "받기"], ja: ["詳しく", "購入", "入手"], es: ["Más info", "Comprar", "Obtener"] };

export const news: AppDef = {
  id: "news",
  name: "News",
  kind: "feed",
  mode: (persona) => persona.mode,
  bg: (mode) => (mode === "dark" ? "#000000" : "#f2f2f7"),
  top: 120,
  bottom: 83,
  chrome: (ctx) => ({ date: new Date().toLocaleDateString({ en: "en-US", ko: "ko-KR", ja: "ja-JP", es: "es-ES" }[ctx.lang], { weekday: "long", month: "long", day: "numeric" }) }),
  opening(ctx) {
    const data: NewsStory = {
      publisher: ctx.rng.pick(MASTHEADS[ctx.lang]),
      headline: headline(ctx.lang, ctx.event, ctx.label, ctx.rng),
      photo: ctx.photo("photo"),
      minutes: ctx.fresh ? 0 : ctx.rng.range(4, 90),
      flag: ctx.fresh ? "breaking" : ctx.rng.chance(0.3) ? "live" : "",
    };
    return [
      { painter: "news.section", data: { title: TOP[ctx.lang] } },
      { painter: "news.lead", data },
    ];
  },
  item(ctx) {
    const { rng, lang, event, label } = ctx;
    if (!ctx.fresh && rng.chance(0.15)) {
      const data: NewsAd = { org: event.org, line: lang === "en" ? event.dek : headline(lang, event, label, rng), photo: ctx.photo("object"), cta: rng.pick(CTAS[lang]) };
      return { painter: "news.ad", data };
    }
    const data: NewsStory = {
      publisher: rng.pick(MASTHEADS[lang]),
      headline: headline(lang, event, label, rng),
      photo: ctx.photo(rng.chance(0.6) ? "photo" : "any"),
      minutes: ctx.fresh ? 0 : rng.range(5, 720),
      flag: ctx.fresh ? "breaking" : rng.chance(0.08) ? "live" : "",
    };
    return { painter: ctx.fresh || rng.chance(0.12) ? "news.lead" : "news.story", data };
  },
  notify(ctx) {
    const publisher = ctx.rng.pick(MASTHEADS[ctx.lang]);
    const line = headline(ctx.lang, ctx.event, ctx.label, ctx.rng);
    const breaking = { en: "BREAKING", ko: "속보", ja: "速報", es: "ÚLTIMA HORA" }[ctx.lang];
    return { title: publisher.name, body: ctx.fresh ? `${breaking}: ${line}` : line };
  },
};
