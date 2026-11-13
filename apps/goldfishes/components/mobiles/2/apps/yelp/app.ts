// Yelp as a phone uses it (Gluttony, NOTES 1017): the hype as somewhere to
// eat it — a venue named after the keyword, five red stars, "Open now", a
// reviewer who came back three times this week; a fifth Sponsored. Its
// notification is a craving: something trending near you.

import { caption } from "../../content/voice";
import type { Lang } from "../../paint/types";
import type { AppDef } from "../types";
import type { YelpReview, YelpVenue } from "./paint";

const VENUES = ["{k} Bar", "The {k} Kitchen", "Crispy {k}", "{k} & Co. Eatery", "Big {k} Burger", "{k} Omakase", "Golden {k} Noodle House", "{k} Brunch Club", "Midnight {k}"];

const CATEGORIES: Record<Lang, readonly string[]> = {
  en: ["New American", "Burgers", "Ramen", "Korean BBQ", "Brunch", "Desserts", "Cocktail Bars", "Fusion"],
  ko: ["뉴 아메리칸", "버거", "라멘", "고깃집", "브런치", "디저트", "칵테일 바", "퓨전"],
  ja: ["ニューアメリカン", "バーガー", "ラーメン", "焼肉", "ブランチ", "デザート", "カクテルバー", "フュージョン"],
  es: ["Nueva cocina americana", "Hamburguesas", "Ramen", "Barbacoa coreana", "Brunch", "Postres", "Coctelerías", "Fusión"],
};

const QUOTES: Record<Lang, readonly string[]> = {
  en: ["Waited 2 hours for the {k} tasting menu. Would wait 3.", "Ordered the {k} special. Then ordered it again. Then a third for the road.", "The {k} platter is the size of my apartment and I finished it.", "Came for {k}, stayed for {k}, left with {k} to go."],
  ko: ["{k} 코스 먹으려고 2시간 기다림. 3시간도 기다릴 수 있음.", "{k} 스페셜 시키고 또 시키고 포장까지 함.", "{k} 플래터 크기가 우리 집만 한데 다 먹음."],
  ja: ["{k}コースのために2時間待った。3時間でも待つ。", "{k}スペシャルを頼んで、おかわりして、持ち帰りもした。", "{k}プレートが部屋くらい大きいのに完食。"],
  es: ["Esperé 2 horas por el menú degustación de {k}. Esperaría 3.", "Pedí el especial de {k}. Y otra vez. Y uno para llevar.", "El plato de {k} es del tamaño de mi piso y me lo acabé."],
};

const REVIEWS: Record<Lang, readonly string[]> = {
  en: [
    "Third visit this week. I came in for the {k} tasting menu ({fig}) and honestly I don't remember the drive home. The server said the {k} is 'sourced'. From where, she didn't say. 5 stars, would eat my feelings here again.",
    "Okay so everyone on my feed has been here. The {k} bowl is exactly what the photos promised, which is suspicious. Line was {fig2}. Got two. Ate both in the car before I even parked.",
    "I don't usually write reviews but the {k} combo changed something in me. Portions are absurd. I asked for a box; they brought a second plate.",
  ],
  ko: [
    "이번 주에만 세 번째 방문. {k} 코스({fig}) 먹으러 왔는데 솔직히 집에 어떻게 갔는지 기억 안 남. 직원분이 {k}는 '직접 공수'한 거래요. 어디서인지는 말 안 해줌. 별 다섯 개.",
    "피드에 다들 여기 왔길래 와봤어요. {k} 볼이 사진이랑 똑같아서 오히려 수상함. 웨이팅 {fig2}. 두 개 시켜서 주차하기 전에 차에서 다 먹음.",
  ],
  ja: [
    "今週3回目。{k}コース（{fig}）を食べに来たけど、帰り道の記憶がない。店員さんいわく{k}は「こだわりの仕入れ」。どこからかは教えてくれない。星5つ。",
    "タイムラインのみんなが来てたので。{k}丼は写真の通りで逆に怪しい。行列{fig2}。2つ頼んで駐車前に車で完食。",
  ],
  es: [
    "Tercera visita esta semana. Vine por el menú de {k} ({fig}) y no recuerdo el camino a casa. La camarera dijo que el {k} es 'de origen'. No dijo de dónde. 5 estrellas.",
    "Todo mi feed ha venido aquí. El bowl de {k} es igual que en las fotos, lo cual es sospechoso. Cola: {fig2}. Pedí dos. Me los comí en el coche antes de aparcar.",
  ],
};

const SECTION: Record<Lang, { title: string; sub: string }> = {
  en: { title: "Hot and New", sub: "Trending near you right now" },
  ko: { title: "핫하고 새로운 곳", sub: "지금 주변에서 뜨는 곳" },
  ja: { title: "話題の新店", sub: "いま近くで人気" },
  es: { title: "Lo nuevo y popular", sub: "Tendencia cerca de ti ahora" },
};

const CTAS: Record<Lang, readonly string[]> = {
  en: ["Order now", "Reserve a table", "Start order"],
  ko: ["지금 주문", "테이블 예약", "주문 시작"],
  ja: ["今すぐ注文", "席を予約", "注文する"],
  es: ["Pedir ahora", "Reservar mesa", "Empezar pedido"],
};

const CLOSES: Record<Lang, readonly string[]> = { en: ["11:00 PM", "2:00 AM", "Midnight", "4:00 AM"], ko: ["오후 11:00", "오전 2:00", "자정", "오전 4:00"], ja: ["23:00", "2:00", "24:00", "4:00"], es: ["23:00", "2:00", "medianoche", "4:00"] };

export const yelp: AppDef = {
  id: "yelp",
  name: "Yelp",
  kind: "feed",
  mode: (persona) => persona.mode,
  bg: (mode) => (mode === "dark" ? "#121212" : "#ffffff"),
  top: 160,
  bottom: 83,
  opening(ctx) {
    return [{ painter: "yelp.section", data: SECTION[ctx.lang] }];
  },
  item(ctx) {
    const { rng, lang, event, label } = ctx;
    const fill = (template: string) => template.replace(/\{k\}/g, label).replace("{fig2}", event.figures[1] ?? event.figures[0] ?? "").replace("{fig}", event.figures[0] ?? "");
    const venueName = fill(rng.pick(VENUES));
    if (!ctx.fresh && rng.chance(0.35)) {
      const who = ctx.person();
      const data: YelpReview = {
        name: lang === "en" || lang === "es" ? `${who.name.split(" ")[0]} ${who.name.split(" ")[1]?.[0] ?? ""}.` : who.name,
        face: ctx.face(),
        friends: rng.int(800),
        reviews: 40 + rng.int(2_000),
        photosCount: rng.int(9_000),
        elite: rng.chance(0.6),
        venue: venueName,
        rating: rng.chance(0.8) ? 5 : 4,
        days: 1 + rng.int(6),
        body: fill(rng.pick(REVIEWS[lang])),
        photos: rng.chance(0.75) ? Array.from({ length: 2 + rng.int(2) }, () => ctx.photo(rng.chance(0.5) ? "photo" : "any")) : [],
        helpful: rng.int(120),
      };
      return { painter: "yelp.review", data };
    }
    const sponsored = !ctx.fresh && rng.chance(0.25);
    const quoter = ctx.person();
    const data: YelpVenue = {
      rank: 1 + rng.int(12),
      name: sponsored ? event.org : venueName,
      photos: [ctx.photo(sponsored ? "object" : "any"), ctx.photo("photo"), ctx.photo("any")],
      rating: Math.round(rng.range(4, 5) * 2) / 2,
      reviews: Math.round(rng.range(40, 9_000) * (ctx.fresh ? 1 : rng.range(0.3, 1))),
      price: rng.pick(["$", "$$", "$$", "$$$", "$$$$"]),
      category: rng.pick(CATEGORIES[lang]),
      distance: lang === "en" ? `${(rng.range(0.1, 3)).toFixed(1)} mi` : `${(rng.range(0.2, 5)).toFixed(1)} km`,
      closes: rng.pick(CLOSES[lang]),
      quote: ctx.fresh ? caption(lang, event, label, rng) : fill(rng.pick(QUOTES[lang])),
      quoter: quoter.name,
      quoterFace: ctx.face(),
      sponsored,
      cta: sponsored ? rng.pick(CTAS[lang]) : "",
    };
    return { painter: "yelp.venue", data };
  },
  notify(ctx) {
    const venue = VENUES[ctx.rng.int(VENUES.length)]!.replace(/\{k\}/g, ctx.label);
    const people = 40 + ctx.rng.int(900);
    const bodies: Record<Lang, string> = {
      en: `${venue} is trending near you 🔥 ${people} people checked in today. Open now.`,
      ko: `${venue}이(가) 주변에서 뜨고 있어요 🔥 오늘 ${people}명이 체크인했어요. 지금 영업 중.`,
      ja: `${venue}が近くで話題です🔥 今日${people}人がチェックイン。営業中。`,
      es: `${venue} es tendencia cerca de ti 🔥 ${people} personas hicieron check-in hoy. Abierto ahora.`,
    };
    return { title: "Yelp", body: bodies[ctx.lang] };
  },
};
