// LinkedIn as a phone uses it (Greed, NOTES 1017): the hype as a career
// move — "I'm thrilled to announce…", a ten-page carousel of lessons, a
// photo with a lanyard; a sixth of it Promoted. Its notification is someone
// viewing your profile, or a new humblebrag.

import { headline } from "../../content/voice";
import { count } from "../../paint/kit";
import type { HypeEvent } from "../../content/events";
import type { Random } from "../../model/random";
import type { Lang } from "../../paint/types";
import type { AppDef } from "../types";
import type { LinkedInPost } from "./paint";

type Fill = { k: string; org: string; fig: string; fig2: string };

const BRAGS: Record<Lang, readonly string[]> = {
  en: [
    "I'm thrilled to announce that I've joined {org} as Chief {k} Officer. 🚀\n\nThree years ago I didn't know what {k} was. Today: {fig}.\n\nGrateful. Humbled. Hiring.",
    "I was rejected 47 times before {k}.\n\nThen I stopped sleeping.\n\n{fig}. Here's what I learned 🧵👇",
    "My 4-year-old asked me what {k} is.\n\nI told her: \"It's {fig2}, sweetie.\"\n\nShe cried. So did I. That's leadership.",
    "Unpopular opinion: if your team isn't doing {k} by Q3, you don't have a team.\n\nAgree? ♻️ Repost to help someone in your network.",
    "Today I closed {fig} for {org}. On a Sunday. From my kid's recital.\n\nWork-life balance is a mindset. #{k} #Hustle",
  ],
  ko: [
    "{org}에 Chief {k} Officer로 합류하게 되었음을 기쁜 마음으로 알려드립니다. 🚀\n\n3년 전엔 {k}가 뭔지도 몰랐습니다. 지금은 {fig}.\n\n감사합니다. 겸손하게. 채용 중입니다.",
    "{k} 전에 47번 거절당했습니다.\n\n그리고 잠을 끊었습니다.\n\n{fig}. 제가 배운 것들 🧵👇",
    "인기 없는 의견: 3분기까지 {k} 안 하는 팀은 팀이 아닙니다.\n\n동의하시나요? ♻️ 인맥에게 공유해 주세요.",
  ],
  ja: [
    "このたび{org}にChief {k} Officerとして入社したことをご報告します。🚀\n\n3年前は{k}が何かも知りませんでした。今は{fig}。\n\n感謝。謙虚に。採用中です。",
    "{k}の前に47回不採用でした。\n\nそして睡眠をやめました。\n\n{fig}。学んだことをシェアします🧵👇",
    "賛否両論ですが：Q3までに{k}をやっていないチームはチームではありません。\n\n共感したら♻️リポストを。",
  ],
  es: [
    "Me emociona anunciar que me uno a {org} como Chief {k} Officer. 🚀\n\nHace tres años no sabía qué era {k}. Hoy: {fig}.\n\nAgradecido. Humilde. Contratando.",
    "Me rechazaron 47 veces antes de {k}.\n\nLuego dejé de dormir.\n\n{fig}. Esto es lo que aprendí 🧵👇",
    "Opinión impopular: si tu equipo no hace {k} antes del Q3, no tienes equipo.\n\n¿De acuerdo? ♻️ Comparte con tu red.",
  ],
};

const TITLES: readonly string[] = [
  "Founder @ {org} | Ex-Big Tech | Building the future of {k} 🚀",
  "{k} Evangelist | Keynote Speaker | Top Voice | Angel Investor",
  "Chief {k} Officer at {org} | Forbes 30 Under 30 (nominee)",
  "Helping CEOs 10x with {k} | DM me \"{k}\" for my free guide",
  "Serial Entrepreneur | {k} Thought Leader | Dad | Ironman (×3)",
];

const DOCS: Record<Lang, readonly string[]> = {
  en: ["10 {k} lessons nobody tells you", "The {k} playbook ({fig})", "How I built {fig} with {k}", "{k} in 2026: a framework"],
  ko: ["아무도 알려주지 않는 {k} 교훈 10가지", "{k} 플레이북 ({fig})", "{k}로 {fig} 만든 방법"],
  ja: ["誰も教えない{k}の教訓10選", "{k}プレイブック（{fig}）", "{k}で{fig}を作った方法"],
  es: ["10 lecciones de {k} que nadie te cuenta", "El playbook de {k} ({fig})", "Cómo logré {fig} con {k}"],
};

const CONTEXTS: Record<Lang, readonly string[]> = {
  en: ["{n} likes this", "{n} celebrates this", "{n} commented on this", "{n} finds this insightful"],
  ko: ["{n}님이 좋아합니다", "{n}님이 축하합니다", "{n}님이 댓글을 남겼습니다", "{n}님이 통찰력 있다고 생각합니다"],
  ja: ["{n}さんがいいねしました", "{n}さんがお祝いしました", "{n}さんがコメントしました"],
  es: ["A {n} le gusta esto", "{n} lo celebra", "{n} comentó esto", "A {n} le parece interesante"],
};

const CTAS: Record<Lang, readonly string[]> = {
  en: ["Learn more", "Apply", "Register", "Download"],
  ko: ["더 알아보기", "지원하기", "등록하기", "다운로드"],
  ja: ["詳細を見る", "応募する", "登録する", "ダウンロード"],
  es: ["Más información", "Solicitar", "Registrarse", "Descargar"],
};

const FOLLOWERS: Record<Lang, string> = { en: "{n} followers", ko: "팔로워 {n}명", ja: "フォロワー{n}人", es: "{n} seguidores" };

const DEGREES: Record<Lang, readonly string[]> = { en: ["1st", "2nd", "3rd+"], ko: ["1촌", "2촌", "3촌+"], ja: ["1次", "2次", "3次+"], es: ["1.º", "2.º", "3.º+"] };

function fill(template: string, event: HypeEvent, label: string) {
  const values: Fill = { k: label, org: event.org, fig: event.figures[0] ?? "", fig2: event.figures[1] ?? event.figures[0] ?? "" };
  return template.replace(/\{(k|org|fig|fig2)\}/g, (_, key: keyof Fill) => values[key]);
}

function brag(lang: Lang, event: HypeEvent, label: string, rng: Random) {
  return fill(rng.pick(BRAGS[lang]), event, label);
}

export const linkedin: AppDef = {
  id: "linkedin",
  name: "LinkedIn",
  kind: "feed",
  mode: (persona) => persona.mode,
  bg: (mode) => (mode === "dark" ? "#000000" : "#f4f2ee"),
  top: 104,
  bottom: 83,
  chrome: (ctx) => ({ face: ctx.face() }),
  item(ctx) {
    const { rng, lang, event, label } = ctx;
    const who = ctx.person();
    const promoted = !ctx.fresh && rng.chance(0.18);
    const kind: LinkedInPost["kind"] = promoted ? "photo" : rng.pick(["text", "photo", "photo", "document"] as const);
    const faces = [0, 1, 2, 3, 4].sort(() => rng() - 0.5).slice(0, 1 + rng.int(3));
    if (!faces.includes(0)) faces[0] = 0;
    const data: LinkedInPost = {
      kind,
      context: !promoted && !ctx.fresh && rng.chance(0.4) ? rng.pick(CONTEXTS[lang]).replace("{n}", ctx.person().name) : "",
      name: promoted ? event.org : who.name,
      face: ctx.face(),
      title: promoted ? FOLLOWERS[lang].replace("{n}", count(rng.int(900_000) + 4_000, lang)) : fill(rng.pick(TITLES), event, label),
      degree: promoted ? "" : rng.pick(DEGREES[lang]),
      minutes: ctx.fresh ? 0 : rng.range(30, 9000),
      body: promoted ? `${event.dek} ${rng.pick(["👉", "🚀", "📈"])}` : brag(lang, event, label, rng),
      photo: kind === "photo" ? ctx.photo(promoted ? "object" : "any") : "",
      document: kind === "document" ? { title: fill(rng.pick(DOCS[lang]), event, label), pages: 6 + rng.int(14), hue: rng.int(360) } : null,
      promoted: promoted ? { cta: rng.pick(CTAS[lang]), headline: headline(lang, event, label, rng) } : null,
      reactions: Math.round(rng.range(12, 24_000) * (ctx.fresh ? 1 : rng.range(0.2, 1))),
      comments: rng.int(1_800),
      reposts: rng.int(600),
      faces,
    };
    return { painter: "linkedin.post", data };
  },
  notify(ctx) {
    const who = ctx.person();
    const views = 12 + ctx.rng.int(180);
    const line = brag(ctx.lang, ctx.event, ctx.label, ctx.rng).split("\n")[0]!;
    const bodies: Record<Lang, readonly string[]> = {
      en: [`${who.name} just posted: "${line}"`, `You appeared in ${views} searches this week. ${ctx.label} is trending in your network.`, `${who.name} and 3 others viewed your profile`],
      ko: [`${who.name}님이 새 게시물을 올렸습니다: "${line}"`, `이번 주 검색에 ${views}회 노출되었습니다. 인맥 사이에서 ${ctx.label}이(가) 화제입니다.`, `${who.name}님 외 3명이 회원님의 프로필을 조회했습니다`],
      ja: [`${who.name}さんが投稿しました：「${line}」`, `今週${views}回検索に表示されました。ネットワークで${ctx.label}が話題です。`, `${who.name}さん他3人があなたのプロフィールを閲覧しました`],
      es: [`${who.name} acaba de publicar: "${line}"`, `Apareciste en ${views} búsquedas esta semana. ${ctx.label} es tendencia en tu red.`, `${who.name} y 3 personas más vieron tu perfil`],
    };
    return { title: "LinkedIn", body: ctx.rng.pick(bodies[ctx.lang]) };
  },
};
