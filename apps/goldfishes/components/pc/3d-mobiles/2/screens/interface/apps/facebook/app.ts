// Facebook as a phone uses it (Envy, NOTES 1017): the composer and stories
// above a feed of other people's better lives — the hype as a feeling, a
// shared link, an aunt's coloured status; a fifth of it Sponsored. Its
// notification is someone posting "for the first time in a while".

import { caption, headline, reaction } from "../../content/voice";
import type { Lang } from "../../paint/types";
import type { AppDef } from "../types";
import type { FacebookPost } from "./paint";

const FEELINGS: Record<Lang, readonly string[]> = {
  en: ["is feeling blessed.", "is feeling thankful.", "is feeling proud.", "is feeling excited.", "shared a memory.", "is with 3 others."],
  ko: ["님이 축복받은 기분입니다.", "님이 감사한 기분입니다.", "님이 뿌듯한 기분입니다.", "님이 설레는 기분입니다.", "님이 추억을 공유했습니다."],
  ja: ["さんは幸せな気分です。", "さんは感謝しています。", "さんは誇らしい気分です。", "さんはワクワクしています。"],
  es: ["se siente bendecida.", "se siente agradecido.", "se siente orgulloso.", "se siente emocionada.", "compartió un recuerdo."],
};

const AUNT: Record<Lang, readonly string[]> = {
  en: ["Share if you agree!! 🙏", "My nephew says this is the future. Amen 🙏🙏", "Type AMEN and see what happens ❤️", "Not sure what this is but so proud of everyone 😊"],
  ko: ["공감하시면 공유 부탁드려요!! 🙏", "조카가 이게 미래래요~ 다들 건강하세요 🙏🙏", "좋은 글이라 퍼왔습니다 ❤️", "뭔지 몰라도 다들 대단하네요 😊"],
  ja: ["共感したらシェアしてね！！🙏", "甥っ子がこれが未来だって🙏🙏", "良いお話なのでシェアします❤️"],
  es: ["¡¡Comparte si estás de acuerdo!! 🙏", "Mi sobrino dice que esto es el futuro. Amén 🙏🙏", "Escribe AMÉN y mira lo que pasa ❤️"],
};

const AUNT_SHARE: Record<Lang, string> = { en: "shared a post.", ko: "님이 게시물을 공유했습니다.", ja: "さんが投稿をシェアしました。", es: "compartió una publicación." };

const CTAS: Record<Lang, readonly string[]> = {
  en: ["Shop now", "Sign up", "Learn more", "Get offer"],
  ko: ["지금 구매", "가입하기", "더 알아보기", "혜택 받기"],
  ja: ["購入する", "登録する", "詳しくはこちら", "特典を受け取る"],
  es: ["Comprar", "Registrarte", "Más información", "Obtener oferta"],
};

const DOMAINS = ["dailyledger.news", "trendwire.co", "thebuzzpost.com", "nowdigest.net", "viralmoment.info", "headlinehub.co"];

export const facebook: AppDef = {
  id: "facebook",
  name: "Facebook",
  kind: "feed",
  mode: (persona) => persona.mode,
  bg: (mode) => (mode === "dark" ? "#18191a" : "#c9ccd1"),
  top: 104,
  bottom: 83,
  chrome: (ctx) => ({ face: ctx.face() }),
  opening(ctx) {
    const people = [ctx.person(), ctx.person(), ctx.person()];
    return [
      { painter: "facebook.composer", data: { face: ctx.face() } },
      { painter: "facebook.stories", data: { own: ctx.face(), faces: people.map(() => ctx.face()), photos: people.map(() => ctx.photo("any")), names: people.map((person) => person.name) } },
    ];
  },
  item(ctx) {
    const { rng, lang } = ctx;
    const who = ctx.person();
    const sponsored = !ctx.fresh && rng.chance(0.2);
    const kind: FacebookPost["kind"] = sponsored ? "link" : rng.pick(["photo", "photo", "link", "aunt", "text"] as const);
    const faces = [0, 1, 2, 3, 4].sort(() => rng() - 0.5).slice(0, 1 + rng.int(3));
    if (!faces.includes(0)) faces[0] = 0;
    const doing = sponsored ? "" : kind === "aunt" ? AUNT_SHARE[lang] : kind === "photo" && rng.chance(0.6) ? rng.pick(FEELINGS[lang]) : "";
    const body =
      kind === "aunt"
        ? `${headline(lang, ctx.event, ctx.label, rng)}\n${rng.pick(AUNT[lang])}`
        : kind === "text"
          ? `${caption(lang, ctx.event, ctx.label, rng)}\n\n${reaction(lang, ctx.label, rng)}`
          : kind === "link"
            ? sponsored
              ? `${ctx.event.dek} ${rng.pick(["✨", "👉", "🔥"])}`
              : rng.chance(0.6)
                ? reaction(lang, ctx.label, rng)
                : ""
            : caption(lang, ctx.event, ctx.label, rng);
    const data: FacebookPost = {
      kind,
      name: sponsored ? ctx.event.org : kind === "aunt" ? (lang === "en" ? `Aunt ${who.name.split(" ")[0]}` : who.name) : who.name,
      face: ctx.face(),
      doing,
      minutes: ctx.fresh ? 0 : rng.range(3, 1400),
      body,
      photo: kind === "aunt" || kind === "text" ? "" : ctx.photo(sponsored ? "object" : "any"),
      link: kind === "link" ? { domain: sponsored ? `${ctx.event.org.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com` : rng.pick(DOMAINS), title: headline(lang, ctx.event, ctx.label, rng) } : null,
      sponsored,
      cta: sponsored ? rng.pick(CTAS[lang]) : "",
      reactions: Math.round(rng.range(4, kind === "aunt" ? 60 : 48_000) * (ctx.fresh ? 1 : rng.range(0.3, 1))),
      comments: rng.int(kind === "aunt" ? 40 : 4_000),
      shares: rng.int(kind === "aunt" ? 300 : 9_000),
      faces,
      reactor: ctx.person().name,
      hue: rng.int(360),
    };
    return { painter: "facebook.post", data };
  },
  notify(ctx) {
    const who = ctx.person();
    const said = caption(ctx.lang, ctx.event, ctx.label, ctx.rng);
    const bodies: Record<Lang, string> = {
      en: `${who.name} posted for the first time in a while: "${said}"`,
      ko: `${who.name}님이 오랜만에 게시물을 올렸습니다: "${said}"`,
      ja: `${who.name}さんが久しぶりに投稿しました:「${said}」`,
      es: `${who.name} publicó por primera vez en un tiempo: "${said}"`,
    };
    return { title: "Facebook", body: bodies[ctx.lang] };
  },
};
