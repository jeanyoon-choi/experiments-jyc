import { PHOTOS, type Photo, type PhotoGroup } from "./photos";
import { pressOf } from "./press";
import { G1 } from "./topics/g1";
import { G2 } from "./topics/g2";
import { G3 } from "./topics/g3";
import { G4 } from "./topics/g4";
import { G5 } from "./topics/g5";
import type { Cell, TopicData } from "./topics/types";
import type { Article, Side, Slant, Tier } from "./types";

// Every piece the screen can show, generated once from the twenty stories in
// topics/. A headline joins one front clause and one back clause of a cell
// ("a…b"); 15 of each cell's 30 pairings are used, so no pairing repeats and
// every clause appears about three times. That gives 20 stories × 2 sides ×
// 3 tiers × 15 = 1,800 pieces with a side, and 10 straight reports a story
// for the level screen. Outlet, reporter, photograph and counts come from a
// seeded generator so a piece is the same every time it returns.

export const TOPICS: readonly TopicData[] = [...G1, ...G2, ...G3, ...G4, ...G5];

/** Photograph groups a story draws on (photos.ts). */
const SHOTS: Record<string, readonly PhotoGroup[]> = {
  trial: ["court", "hearing", "yoon"],
  judiciary: ["court", "assembly"],
  special: ["assembly", "lee"],
  martial: ["hearing", "assembly", "yoon"],
  estate: ["apt"],
  economy: ["finance", "market"],
  tariff: ["port", "finance", "lee"],
  budget: ["market", "sejong", "assembly"],
  election: ["vote"],
  ppp: ["ppp", "assembly"],
  poll: ["lee", "bluehouse", "gwanghwamun"],
  myung: ["court", "yoon"],
  china: ["myeongdong", "airport"],
  hormuz: ["navy"],
  north: ["dmz"],
  katalk: ["kakao", "seoul"],
  prosecution: ["prosecutors", "court"],
  kimkh: ["kimkh", "court"],
  medical: ["hospital"],
  tongil: ["church", "assembly"],
};
/** Each side's own rally photographs, used more the harder the piece. */
const RALLY: Record<Side, PhotoGroup> = { left: "lrally", right: "rrally" };
const RALLY_SHARE = [0, 0.25, 0.7] as const;

/** Bracket tags by tier: 강경 is opinion, 극단 the grammar of fandom media. */
const TAGS: readonly (readonly string[])[] = [
  ["", "", "", "", "[종합] ", "[포토] "],
  ["[사설] ", "[칼럼] ", "[시론] ", "[기자수첩] ", "[데스크 시각] ", "[논설실에서] "],
  ["[단독] ", "[현장] ", "[영상] ", "[속보] ", "[라이브] ", "[긴급] "],
];

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황"];
const GIVEN = ["지현", "민수", "서연", "태호", "유진", "성훈", "하늘", "준영", "소영", "동욱", "은지", "재석", "수빈", "현우", "다은", "경민", "보람", "상민"];

// Small seeded generator (mulberry32).
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

/** Fifteen distinct pairings of five front and six back clauses. */
const pairings = (cell: Pick<Cell, "a" | "b">) => {
  const pairs: [string, string][] = [];
  for (let round = 0; round < 3; round += 1) {
    cell.a.forEach((front, index) => pairs.push([front, cell.b[(index + round * 2) % cell.b.length]]));
  }
  return pairs;
};

const BODY = new Map<string, readonly string[]>();

function build() {
  const random = seeded(20261116);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  // Photographs are dealt in turn within a group, so one does not come up twice in a row.
  const dealt = new Map<PhotoGroup, number>();
  const shot = (wanted: PhotoGroup) => {
    // A group with no photograph yet borrows the National Assembly's.
    const group: PhotoGroup = PHOTOS[wanted].length ? wanted : "assembly";
    const photos: readonly Photo[] = PHOTOS[group];
    const index = dealt.get(group) ?? Math.floor(random() * photos.length);
    dealt.set(group, index + 1);
    return photos[index % photos.length];
  };
  const all: Article[] = [];
  for (const topic of TOPICS) {
    const listed = (SHOTS[topic.id] ?? ["seoul"]).filter((group) => PHOTOS[group].length);
    const groups: readonly PhotoGroup[] = listed.length ? listed : ["assembly"];
    const add = (slant: Slant, tier: Tier, front: string, back: string, index: number, say: readonly string[]) => {
      const rally = slant !== "none" && random() < RALLY_SHARE[tier];
      const photo = shot(rally && (slant === "left" || slant === "right") ? RALLY[slant] : pick(groups));
      // Louder pieces draw more comments.
      const loud = slant === "none" ? 1 : 1 + tier * 1.6;
      const id = `${topic.id}-${slant}-${tier}-${index}`;
      const tag = slant === "none" ? "" : TAGS[tier][index % TAGS[tier].length];
      all.push({
        id, slant, tier, topic: topic.id,
        title: `${tag}${front}…${back}`,
        press: pick(pressOf(slant, tier)),
        reporter: `${pick(SURNAMES)}${pick(GIVEN)}`,
        photo: photo.key,
        caption: photo.caption,
        cluster: 6 + Math.floor(random() * 110),
        comments: Math.floor((40 + random() * 900) * loud),
      });
      // A 사설 or 칼럼 argues first and states the fact after; a report does the reverse.
      const reading = say.length ? say[index % say.length] : null;
      BODY.set(id, !reading ? [topic.fact] : tier === 1 ? [reading, topic.fact] : [topic.fact, reading]);
    };
    // Straight reports: ten of the sixteen pairings.
    let plain = 0;
    for (let round = 0; round < 3 && plain < 10; round += 1) {
      for (let index = 0; index < topic.plain.a.length && plain < 10; index += 1) {
        add("none", 0, topic.plain.a[index], topic.plain.b[(index + round) % topic.plain.b.length], plain, []);
        plain += 1;
      }
    }
    for (const side of ["left", "right"] as const) {
      ([0, 1, 2] as const).forEach((tier) => {
        const cell = topic[side][tier];
        pairings(cell).forEach(([front, back], index) => add(side, tier, front, back, index, cell.say));
      });
    }
  }
  return all;
}

const ALL = build();

/** The text under a headline: the story's verified fact and, for a piece with a side, that side's reading. */
export const bodyOf = (article: Article): readonly string[] => BODY.get(article.id) ?? [];

/** The level screen's straight reports. */
export const EVERYDAY: readonly Article[] = ALL.filter((article) => article.slant === "none");
const of = (side: Side, tier: Tier) => ALL.filter((article) => article.slant === side && article.tier === tier);
/** Each side's pieces, by tier. */
export const ARTICLES: Record<Side, readonly [readonly Article[], readonly Article[], readonly Article[]]> = {
  left: [of("left", 0), of("left", 1), of("left", 2)],
  right: [of("right", 0), of("right", 1), of("right", 2)],
};
export const COUNT = ALL.length;
