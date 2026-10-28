// How the hype sounds in each language: the platforms' fixed words (Like,
// Follow, Sponsored, 2m), and the posts' own voice — captions, rants,
// reactions — filled with the keyword and the event's figures. English
// carries the events' own sentences (content/events.ts); the others react
// to the same event in their own idiom (the work is not for one country).

import type { HypeEvent } from "./events";
import type { Lang } from "../paint/types";
import type { Random } from "../model/random";

export const UI = {
  en: { like: "Like", comment: "Comment", share: "Share", repost: "Repost", follow: "Follow", following: "Following", sponsored: "Sponsored", ad: "Ad", now: "now", min: "m", hour: "h", newPosts: "New posts", trending: "Trending", breaking: "BREAKING", live: "LIVE", seeMore: "more", views: "views", likedBy: "Liked by", others: "others", forYou: "For you", reply: "Reply", skip: "Skip ad", shopNow: "Shop now", buy: "Buy", match: "It's a Match!", typing: "typing…", limitTitle: "Time Limit", limitBody: "You've reached your limit on", ignore: "Ignore Limit", ok: "OK", sale: "FLASH SALE", ends: "Ends in", sold: "sold", top: "Top Stories", watch: "Watch now", reviews: "reviews", open: "Open now", connect: "Connect", applause: "Celebrate", topTen: "Top 10 Today", pay: "Pay with Face ID", total: "Total" },
  ko: { like: "좋아요", comment: "댓글", share: "공유", repost: "재게시", follow: "팔로우", following: "팔로잉", sponsored: "광고", ad: "광고", now: "지금", min: "분", hour: "시간", newPosts: "새 게시물", trending: "실시간 트렌드", breaking: "속보", live: "LIVE", seeMore: "더 보기", views: "조회", likedBy: "", others: "외 여러 명이 좋아합니다", forYou: "추천", reply: "답글", skip: "광고 건너뛰기", shopNow: "지금 구매", buy: "구매", match: "매치 성공!", typing: "입력 중…", limitTitle: "시간 제한", limitBody: "다음 앱의 사용 한도에 도달했습니다:", ignore: "제한 무시", ok: "확인", sale: "타임 세일", ends: "남은 시간", sold: "개 판매", top: "주요 뉴스", watch: "지금 시청", reviews: "리뷰", open: "영업 중", connect: "1촌 맺기", applause: "축하하기", topTen: "오늘의 TOP 10", pay: "Face ID로 결제", total: "합계" },
  ja: { like: "いいね", comment: "コメント", share: "シェア", repost: "リポスト", follow: "フォロー", following: "フォロー中", sponsored: "広告", ad: "広告", now: "今", min: "分", hour: "時間", newPosts: "新しい投稿", trending: "トレンド", breaking: "速報", live: "LIVE", seeMore: "続きを読む", views: "回視聴", likedBy: "", others: "他が「いいね！」しました", forYou: "おすすめ", reply: "返信", skip: "広告をスキップ", shopNow: "今すぐ購入", buy: "購入", match: "マッチしました！", typing: "入力中…", limitTitle: "時間制限", limitBody: "次の App の制限に達しました:", ignore: "制限を無視", ok: "OK", sale: "タイムセール", ends: "終了まで", sold: "個販売", top: "トップニュース", watch: "今すぐ見る", reviews: "件のレビュー", open: "営業中", connect: "つながる", applause: "お祝い", topTen: "今日のトップ10", pay: "Face IDで支払う", total: "合計" },
  es: { like: "Me gusta", comment: "Comentar", share: "Compartir", repost: "Repostear", follow: "Seguir", following: "Siguiendo", sponsored: "Publicidad", ad: "Anuncio", now: "ahora", min: " min", hour: " h", newPosts: "Nuevas publicaciones", trending: "Tendencias", breaking: "ÚLTIMA HORA", live: "EN VIVO", seeMore: "más", views: "visualizaciones", likedBy: "Les gusta a", others: "otros", forYou: "Para ti", reply: "Responder", skip: "Saltar anuncio", shopNow: "Comprar", buy: "Comprar", match: "¡Es un match!", typing: "escribiendo…", limitTitle: "Límite de tiempo", limitBody: "Has alcanzado tu límite en", ignore: "Ignorar límite", ok: "OK", sale: "OFERTA FLASH", ends: "Termina en", sold: "vendidos", top: "Noticias destacadas", watch: "Ver ahora", reviews: "reseñas", open: "Abierto", connect: "Conectar", applause: "Celebrar", topTen: "Top 10 de hoy", pay: "Pagar con Face ID", total: "Total" },
} as const satisfies Record<Lang, Record<string, string>>;

export type UiWords = (typeof UI)["en"];

export function ui(lang: Lang): UiWords {
  return UI[lang] as unknown as UiWords;
}

/** "2m", "2분", "2分", "2 min". */
export function ago(lang: Lang, minutes: number) {
  const words = ui(lang);
  if (minutes < 1) return words.now;
  if (minutes < 60) return `${Math.round(minutes)}${words.min}`;
  return `${Math.round(minutes / 60)}${words.hour}`;
}

type Fill = { k: string; org: string; fig: string; fig2: string };

const CAPTIONS: Record<Lang, readonly string[]> = {
  en: [], // English uses the event's own sentences.
  ko: [
    "{k} 이거 실화냐… {fig} 찍었대",
    "오늘부터 {k} 안 하면 도태됨 ㅋㅋ",
    "{org} {k} 줄 서서 겨우 샀다 {fig}",
    "솔직히 {k} 거품 아님? 근데 나도 삼",
    "{k} 하나로 인생 바뀐 썰 푼다 🧵",
    "{fig}… {k} 미쳤다 진짜",
    "다들 {k} 얘기만 함. 나만 몰랐던 거야?",
    "{k} 언박싱 🫧 {fig2}",
  ],
  ja: [
    "{k}やばすぎる…{fig}だって",
    "{org}の{k}、ついに買った🫧",
    "{k}知らない人いる？もう遅いよ",
    "正直{k}ってバブルじゃない？でも買う",
    "{k}で人生変わった話🧵",
    "{fig}って何事…{k}すごい",
  ],
  es: [
    "¿Ya viste lo de {k}? {fig} 🤯",
    "Si no estás en {k} en 2026, vas tarde",
    "Hice fila 6 horas por {k} de {org}",
    "{k} es una burbuja… y aun así compré",
    "Cómo {k} cambió mi vida (hilo) 🧵",
    "{fig}. Repito: {fig}. {k} 🫧",
  ],
};

const REACTIONS: Record<Lang, readonly string[]> = {
  en: ["this is so real", "we are so cooked", "ratio", "not the {k} again 💀", "take my money", "who asked", "bubble. calling it.", "first", "the timeline is unwell", "🔥🔥🔥", "obsessed", "fake", "W", "L", "source?", "i need this", "bro what"],
  ko: ["ㅋㅋㅋㅋㅋ 실화냐", "이거 나만 불편함?", "와 미쳤다", "출처?", "{k} 또 시작이네", "광고 아님?", "가즈아", "ㄹㅇ", "저장 각", "이건 좀…", "1빠"],
  ja: ["草", "マジか", "{k}またかよ", "欲しすぎる", "ソースは？", "それな", "これは流行る", "広告乙"],
  es: ["jajaja no puede ser", "estamos fritos", "¿fuente?", "otra vez {k} 💀", "lo necesito", "burbuja", "qué miedo", "primero"],
};

function fill(template: string, values: Fill) {
  return template.replace(/\{(k|org|fig|fig2)\}/g, (_, key: keyof Fill) => values[key]);
}

function values(event: HypeEvent, label: string): Fill {
  return { k: label, org: event.org, fig: event.figures[0] ?? "", fig2: event.figures[1] ?? event.figures[0] ?? "" };
}

/** A post's caption about the event. */
export function caption(lang: Lang, event: HypeEvent, label: string, rng: Random) {
  if (lang === "en") return rng.chance(0.5) ? event.dek : `${event.headline}${rng.chance(0.4) ? ` ${rng.pick(["🫧", "🔥", "📈", "👀", "🤯"])}` : ""}`;
  return fill(rng.pick(CAPTIONS[lang]), values(event, label));
}

/** A headline in the reader's language. */
export function headline(lang: Lang, event: HypeEvent, label: string, rng: Random) {
  if (lang === "en") return event.headline;
  const lines: Record<Exclude<Lang, "en">, readonly string[]> = {
    ko: ["{org}, {k} 열풍에 {fig} 돌파", "\"{k} 없으면 도태\"… 2026년의 새 기준", "{k} 품귀 현상, 웃돈 {fig2}까지", "전문가 \"{k}은 거품\"… 그래도 줄은 길어져"],
    ja: ["{org}、{k}ブームで{fig}突破", "「{k}なしでは生き残れない」2026年の新常識", "{k}品薄、転売{fig2}も", "専門家「{k}はバブル」それでも行列"],
    es: ["{org} supera {fig} con la fiebre de {k}", "\"Sin {k} no hay futuro\": el nuevo estándar de 2026", "Escasez de {k}: reventa hasta {fig2}", "Expertos: \"{k} es una burbuja\". La fila sigue creciendo"],
  };
  return fill(rng.pick(lines[lang]), values(event, label));
}

export function reaction(lang: Lang, label: string, rng: Random) {
  return rng.pick(REACTIONS[lang]).replace("{k}", label);
}

export function hashtags(event: HypeEvent, label: string, rng: Random) {
  const tags = [label.replace(/\s+/g, ""), ...event.tags].slice(0, 2 + rng.int(3));
  return tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
}
