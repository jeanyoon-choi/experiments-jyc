import { CLOSE, CLOSE_PLAIN, EXTREME } from "./extreme";
import { PHOTOS, type Photo, type PhotoGroup } from "./photos";
import { pressOf } from "./press";
import { G1 } from "./topics/g1";
import { G2 } from "./topics/g2";
import { G3 } from "./topics/g3";
import { G4 } from "./topics/g4";
import { G5 } from "./topics/g5";
import { G6 } from "./topics/g6";
import { G7 } from "./topics/g7";
import type { Cell, TopicData } from "./topics/types";
import { TIERS, type Article, type Section, type Side, type Slant, type Tier } from "./types";

// Every piece the screen can show, generated once from the stories in
// topics/. A headline joins one front clause and one back clause ("a…b").
// - Level: 10 straight reports a story.
// - 온건, 강경, 극단: 15 of each cell's 30 pairings, so no pairing repeats.
// - 선동, 광란: 15 pairings of the side's frames (extreme.ts) around the
//   story's name; the story's turn in the list shifts which frames meet.
// That is 10 + 2 sides × 5 tiers × 15 = 160 pieces a story. Outlet, reporter,
// photograph and counts come from a seeded generator so a piece is the same
// every time it returns.

export const TOPICS: readonly TopicData[] = [...G1, ...G2, ...G3, ...G4, ...G5, ...G6, ...G7];

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
  kbs: ["kbs"],
  equality: ["equality"],
  jongmyo: ["jongmyo"],
  nuke: ["nuke"],
  coupang: ["coupang"],
  chip52: ["chip"],
};
/** Each side's own rally photographs, used more the harder the piece. */
const RALLY: Record<Side, PhotoGroup> = { left: "lrally", right: "rrally" };
const RALLY_SHARE = [0, 0.25, 0.7, 0.85, 1] as const;

/** Bracket tags by tier: 강경 is opinion, 극단 the grammar of fandom media, past that the alarm. */
const TAGS: readonly (readonly string[])[] = [
  ["", "", "", "", "[종합] ", "[포토] "],
  ["[사설] ", "[칼럼] ", "[시론] ", "[기자수첩] ", "[데스크 시각] ", "[논설실에서] "],
  ["[단독] ", "[현장] ", "[영상] ", "[속보] ", "[라이브] ", "[긴급] "],
  ["[긴급] ", "[충격] ", "[폭로] ", "[분노] ", "[특보] ", "[경악] "],
  ["", "🔴LIVE ", "[총동원령] ", "", "‼️", "[전원 필독] "],
];
/** Louder pieces draw more comments. */
const LOUD = [1, 2.6, 4.2, 12, 40] as const;

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
const place = (topic: string, slant: Slant, tier: Tier, index: number) => `${topic}-${slant}-${tier}-${index}`;

function build() {
  const random = seeded(20261123);
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
  TOPICS.forEach((topic, turn) => {
    const listed = (SHOTS[topic.id] ?? ["seoul"]).filter((group) => PHOTOS[group].length);
    const groups: readonly PhotoGroup[] = listed.length ? listed : ["assembly"];
    const sections: readonly Section[] = [topic.section, ...(topic.also ?? [])];
    const add = (slant: Slant, tier: Tier, front: string, back: string, index: number, body: readonly string[]) => {
      // A side with only a few rally photographs shows them less, so they do not fill the list.
      const rallies = slant === "none" ? null : RALLY[slant];
      const share = rallies ? RALLY_SHARE[tier] * Math.min(1, PHOTOS[rallies].length / 12) : 0;
      const photo = shot(rallies && random() < share ? rallies : pick(groups));
      const id = place(topic.id, slant, tier, index);
      const tag = slant === "none" ? "" : TAGS[tier][index % TAGS[tier].length];
      const article: Article = {
        id, slant, tier, topic: topic.id, sections, index,
        title: `${tag}${front}…${back}`,
        press: pick(pressOf(slant, tier)),
        reporter: `${pick(SURNAMES)}${pick(GIVEN)}`,
        photo: photo.key,
        caption: photo.caption,
        cluster: 6 + Math.floor(random() * 110),
        comments: Math.floor((40 + random() * 900) * LOUD[tier]),
      };
      all.push(article);
      BODY.set(id, body);
    };
    // Straight reports: ten of the sixteen pairings. The body gives the fact,
    // then what each side says at its mildest, in turn.
    let plain = 0;
    for (let round = 0; round < 3 && plain < 10; round += 1) {
      for (let index = 0; index < topic.plain.a.length && plain < 10; index += 1) {
        const first: Side = plain % 2 ? "right" : "left";
        const second: Side = first === "left" ? "right" : "left";
        add("none", 0, topic.plain.a[index], topic.plain.b[(index + round) % topic.plain.b.length], plain, [
          topic.fact,
          topic[first][0].say[plain % 2],
          topic[second][0].say[plain % 2],
          topic[first][0].say[(plain + 1) % 2],
          topic[second][0].say[(plain + 1) % 2],
          CLOSE_PLAIN[plain % CLOSE_PLAIN.length],
        ]);
        plain += 1;
      }
    }
    for (const side of ["left", "right"] as const) {
      ([0, 1, 2] as const).forEach((tier) => {
        const cell = topic[side][tier];
        pairings(cell).forEach(([front, back], index) => {
          const [one, two] = index % 2 ? [cell.say[1], cell.say[0]] : [cell.say[0], cell.say[1]];
          const close = CLOSE[side][tier][index % 2];
          // A report states the fact first. A 사설 or 칼럼 argues first and
          // states it after. A fandom piece carries the 사설's argument along.
          const body = tier === 0 ? [topic.fact, one, two, close]
            : tier === 1 ? [one, topic.fact, two, topic[side][0].say[index % 2], close]
              : [one, topic.fact, two, topic[side][1].say[index % 2], topic[side][1].say[(index + 1) % 2], close];
          add(side, tier, front, back, index, body);
        });
      });
      // Past 극단 the story is only a name inside the side's frames.
      ([3, 4] as const).forEach((tier) => {
        const frames = EXTREME[side][tier - 3];
        const name = (text: string) => text.replaceAll("{s}", topic.subject);
        const loudest = topic[side][2].say;
        for (let index = 0; index < 15; index += 1) {
          const front = frames.a[(index + turn) % frames.a.length];
          const back = frames.b[(index + Math.floor(index / frames.a.length) * 3 + turn * 5) % frames.b.length];
          const rant = frames.rant;
          const middle = [rant[1 + (index % 3)], rant[1 + ((index + 1) % 3)]];
          const body = tier === 3
            // 선동: the frame, the fandom piece inside it, and the fact as "what they only say".
            ? [name(rant[0]), loudest[index % 2], middle[0], loudest[(index + 1) % 2], middle[1], `기성 언론이 전한 것은 여기까지다. ${topic.fact}`, rant[4], rant[5]]
            // 광란: no fact at all.
            : [name(rant[0]), rant[1], loudest[index % 2], rant[2], rant[3], rant[4], rant[5]];
          add(side, tier, name(front), back, index, body);
        }
      });
    }
  });
  return all;
}

const ALL = build();

/** The text under a headline. */
export const bodyOf = (article: Article): readonly string[] => BODY.get(article.id) ?? [];

export const inSection = (section: Section) => (article: Article) => article.sections.includes(section);

/** The level screen's straight reports. */
export const EVERYDAY: readonly Article[] = ALL.filter((article) => article.slant === "none");
const of = (side: Side, tier: Tier) => ALL.filter((article) => article.slant === side && article.tier === tier);
/** Each side's pieces, by tier. */
export const ARTICLES: Record<Side, readonly (readonly Article[])[]> = {
  left: TIERS.map((tier) => of("left", tier)),
  right: TIERS.map((tier) => of("right", tier)),
};
export const COUNT = ALL.length;
