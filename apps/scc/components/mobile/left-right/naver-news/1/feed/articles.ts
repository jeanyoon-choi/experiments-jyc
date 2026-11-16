import { HEADLINES } from "./headlines";
import { TOPICS } from "./topics";
import type { Article, Side, Slant, Tier } from "./types";

// Every piece the screen can show, assembled once: a topic's headline pairs
// become articles with an outlet, a reporter, a photo and counts. Outlets and
// reporters are invented; the counts come from a seeded generator so a piece
// looks the same every time it returns.

/** Invented outlets, by whose reading they carry and how hard. */
const PRESS: Record<Slant, readonly (readonly string[])[]> = {
  none: [["누리통신", "가온뉴스", "KNB", "뉴스온"]],
  left: [["한빛신문", "새날일보", "다온뉴스"], ["새날일보", "열린내일", "한빛신문"], ["촛불라이브", "깨어있는TV", "밭갈이뉴스"]],
  right: [["한울일보", "미래경제", "나라일보"], ["나라일보", "정론타임즈", "한울일보"], ["태극라이브", "자유수호TV", "애국시민뉴스"]],
};

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"];
const GIVEN = ["지현", "민수", "서연", "태호", "유진", "성훈", "하늘", "준영", "소영", "동욱", "은지", "재석"];

/** What each photo shows, as its caption. */
export const CAPTIONS: Record<string, string> = {
  assembly1: "서울 여의도 국회의사당 앞.",
  assembly2: "서울 여의도 국회의사당 전경.",
  plenary: "국회 회의 모습. 자료사진.",
  "court-const": "서울 종로구 헌법재판소.",
  "court-supreme": "서울 서초구 대법원 청사.",
  judgment: "헌법재판소 대심판정. 자료사진.",
  "yoon-hearing": "2025년 2월 헌법재판소 탄핵심판 변론에 출석한 윤석열 전 대통령. 자료사진.",
  lee: "이재명 대통령. 자료사진.",
  candle1: "2024년 12월 4일 국회 본청 앞 계단에서 열린 집회. 자료사진.",
  candle2: "2024년 12월 4일 국회 본청 앞 집회 참가자들. 자료사진.",
  gwang1: "2025년 3월 서울 광화문 일대 농성장. 자료사진.",
  gwang2: "2025년 3월 15일 서울 광화문 집회. 자료사진.",
  gwang3: "2025년 1월 4일 서울 광화문 집회. 자료사진.",
  taeguk1: "2017년 3월 1일 서울 도심에서 열린 태극기 집회. 자료사진.",
  taeguk2: "2019년 서울 도심 태극기 집회. 자료사진.",
  apt1: "서울 강남구 대치동의 아파트 단지.",
  apt2: "서울 강남구 대치동 아파트 단지 전경.",
  apt3: "서울 강남구 개포동의 아파트 단지.",
  ballot1: "2025년 6월 3일 대통령선거 투표소의 투표함. 자료사진.",
  booth1: "2025년 6월 3일 대통령선거 투표소의 기표소. 자료사진.",
  booth2: "투표소에 마련된 기표소. 자료사진.",
  krx: "서울 여의도 한국거래소.",
  kospi: "코스피·코스닥 지수와 원·달러 환율이 표시된 전광판. 자료사진.",
  bok: "서울 중구 한국은행.",
  won: "5만 원권. 자료사진.",
  navy1: "청해부대로 파견됐던 문무대왕함. 자료사진.",
  navy2: "해군 구축함 문무대왕함. 자료사진.",
  myeongdong: "서울 중구 명동 거리. 자료사진.",
  airport: "인천국제공항 제1여객터미널 입국장. 자료사진.",
  prosecutors: "서울 서초구 옛 대검찰청 청사에 걸린 공소청 현판.",
  wreaths: "2020년 12월 대검찰청 앞에 놓인 화환. 자료사진.",
  han: "2024년 12월 4일 국회에서 기자회견을 하는 한동훈 전 대표. 자료사진.",
};

// Small seeded generator (mulberry32) so counts and bylines are stable.
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build() {
  const random = seeded(20261116);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const all: Article[] = [];
  for (const topic of TOPICS) {
    const lines = HEADLINES[topic.id];
    const make = (slant: Slant, tier: Tier, pairs: readonly (readonly [string, string])[]) => {
      const photos = slant === "none" ? topic.photos : [...topic.photos, ...(topic.only?.[slant] ?? [])];
      pairs.forEach(([title, lede], index) => {
        // 극단 pieces run the rally photos their side owns when the topic has them.
        const own = slant !== "none" && tier === 2 ? topic.only?.[slant] : undefined;
        // A side's second 극단 piece falls back to the shared photos rather than repeat its one rally.
        const photo = own && index < own.length ? own[index] : photos[(index + tier) % photos.length];
        // Louder pieces draw more comments; straight reports the most related pieces.
        const loud = slant === "none" ? 1 : 1 + tier * 1.6;
        all.push({
          id: `${topic.id}-${slant}-${tier}-${index}`,
          slant, tier, topic: topic.id, title, lede,
          press: pick(PRESS[slant][slant === "none" ? 0 : tier]),
          reporter: `${pick(SURNAMES)}${pick(GIVEN)}`,
          photo,
          caption: CAPTIONS[photo] ?? "",
          cluster: 6 + Math.floor(random() * 110),
          comments: Math.floor((40 + random() * 900) * loud),
        });
      });
    };
    make("none", 0, lines.plain);
    for (const side of ["left", "right"] as const) {
      ([0, 1, 2] as const).forEach((tier) => make(side, tier, lines[side][tier]));
    }
  }
  return all;
}

const ALL = build();

export const ARTICLE_BY_ID = new Map(ALL.map((article) => [article.id, article]));
/** The level screen's straight reports. */
export const EVERYDAY: readonly Article[] = ALL.filter((article) => article.slant === "none");
const of = (side: Side, tier: Tier) => ALL.filter((article) => article.slant === side && article.tier === tier);
/** Each side's pieces, by tier. */
export const ARTICLES: Record<Side, readonly [readonly Article[], readonly Article[], readonly Article[]]> = {
  left: [of("left", 0), of("left", 1), of("left", 2)],
  right: [of("right", 0), of("right", 1), of("right", 2)],
};
