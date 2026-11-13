// Netflix as a phone uses it (Sloth, NOTES 1017): always dark, a billboard
// that opens on the hype as a prestige series, then rows of more of it —
// because you watched it, the Top 10, what's new; its notification a new
// arrival.

import type { Lang } from "../../paint/types";
import type { AppDef, ItemContext } from "../types";
import type { NetflixHero, NetflixRow } from "./paint";

const TITLES: Record<Lang, readonly string[]> = {
  en: ["{k}", "The {k} Files", "Waitlist", "Bubble", "Founder Mode", "{org}", "Early Access", "Unboxed", "The Last {k}", "Before the Crash", "Make It Viral", "Love in the Time of {k}", "{k}: Origins", "Pivot", "Series C"],
  ko: ["{k}", "{k} 전쟁", "웨이팅", "버블", "언박싱", "{org}", "마지막 {k}", "상장 전야", "알고리즘", "{k}의 연인", "도태"],
  ja: ["{k}", "{k}戦争", "ウェイトリスト", "バブル", "{org}", "最後の{k}", "上場前夜", "{k}の恋人", "アルゴリズム"],
  es: ["{k}", "La fiebre del {k}", "Lista de espera", "Burbuja", "{org}", "El último {k}", "Antes del crash", "Amor en tiempos de {k}", "Pivote"],
};

const GENRES: Record<Lang, readonly string[]> = {
  en: ["Satirical", "Ominous", "Tech", "Docuseries", "Binge-worthy", "Dark Comedy", "Suspenseful", "Based on a Viral Thread"],
  ko: ["풍자", "불길한", "테크", "다큐시리즈", "정주행각", "블랙코미디", "긴장감 넘치는", "바이럴 실화"],
  ja: ["風刺", "不穏", "テック", "ドキュメンタリー", "一気見", "ブラックコメディ", "ハラハラ", "バズった実話"],
  es: ["Satírica", "Inquietante", "Tecnología", "Docuserie", "Para maratonear", "Comedia negra", "De suspenso", "Basada en un hilo viral"],
};

const ROWS: Record<Lang, { because: (t: string) => string; fresh: string }> = {
  en: { because: (t) => `Because you watched ${t}`, fresh: "New on Netflix" },
  ko: { because: (t) => `${t} 시청 후 추천 콘텐츠`, fresh: "Netflix 신작" },
  ja: { because: (t) => `「${t}」を観たあなたへ`, fresh: "Netflixの新着" },
  es: { because: (t) => `Porque viste ${t}`, fresh: "Novedades en Netflix" },
};

function title(ctx: ItemContext) {
  return ctx.rng.pick(TITLES[ctx.lang]).replace("{k}", ctx.label).replace("{org}", ctx.event.org);
}

function titles(ctx: ItemContext, n: number, first?: string) {
  const out = first ? [first] : [];
  for (let guard = 0; out.length < n && guard < 40; guard += 1) {
    const next = title(ctx);
    if (!out.includes(next)) out.push(next);
  }
  while (out.length < n) out.push(`${ctx.label} ${out.length + 1}`);
  return out;
}

export const netflix: AppDef = {
  id: "netflix",
  name: "Netflix",
  kind: "feed",
  mode: () => "dark",
  bg: () => "#000000",
  top: 142,
  bottom: 83,
  chrome: (ctx) => ({ name: ctx.persona.name.split(" ")[0] ?? ctx.persona.name, face: ctx.face() }),
  opening(ctx) {
    const { rng } = ctx;
    const genres = GENRES[ctx.lang];
    const tags: string[] = [];
    while (tags.length < 3) {
      const tag = rng.pick(genres);
      if (!tags.includes(tag)) tags.push(tag);
    }
    const data: NetflixHero = { photo: ctx.photo("photo"), title: ctx.rng.chance(0.5) ? ctx.label : title(ctx), series: rng.chance(0.7), tags, rank: rng.chance(0.6) ? 1 + rng.int(3) : 0 };
    return [{ painter: "netflix.hero", data }];
  },
  item(ctx) {
    const { rng } = ctx;
    const kind = ctx.fresh ? "new" : rng.pick(["because", "because", "top10", "new"] as const);
    const names = titles(ctx, 4, ctx.fresh ? ctx.label : undefined);
    const data: NetflixRow = {
      kind,
      title: kind === "because" ? ROWS[ctx.lang].because(title(ctx)) : kind === "new" ? ROWS[ctx.lang].fresh : "",
      start: 1 + rng.int(6),
      posters: names.map((name, index) => ({
        photo: ctx.photo("any"),
        title: name,
        recent: kind !== "top10" && (ctx.fresh ? index === 0 : rng.chance(kind === "new" ? 0.5 : 0.15)),
        top: kind !== "top10" && rng.chance(0.2),
      })),
    };
    return { painter: "netflix.row", data };
  },
  notify(ctx) {
    const name = ctx.rng.chance(0.5) ? ctx.label : title(ctx);
    const bodies: Record<Lang, string> = {
      en: `New Arrival: ${name}. Watch now.`,
      ko: `새로 올라온 콘텐츠: ${name}. 지금 시청하세요.`,
      ja: `新着配信：『${name}』今すぐ観る`,
      es: `Novedad: ${name}. Ya disponible.`,
    };
    return { title: "Netflix", body: bodies[ctx.lang] };
  },
};
