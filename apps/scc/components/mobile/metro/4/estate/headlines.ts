// Headlines for the 부동산 tab. A headline is `a…b`: a front clause that
// states the ride as the map now gives it, and a back clause in the idiom of
// Korean property reporting. Which pool is drawn from depends only on which
// way the ride went and by how much; nothing here goes past a sober report.
// The only numbers are the work's own minutes: no prices, no percentages, no
// named apartment. The back clauses are composed from stock phrases of such
// reports, not taken from any one article.

export type Move = {
  /** Station name without 역. */
  station: string;
  /** 강남, 시청 or 여의도. */
  centre: string;
  before: number;
  now: number;
};

/** 이/가, 은/는, 을/를 after a Hangul word, by its final consonant. */
const particle = (word: string, closed: string, open: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? closed : open;
};

type Pool = { a: readonly string[]; b: readonly (readonly string[])[] };

// {s} station+역, {c} centre, {p} minutes before, {n} minutes now, {d} minutes gained or lost, {ci} centre + 이/가.
const NEARER: Pool = {
  a: ["{s}, {c}까지 {p}분→{n}분", "{s}~{c} {d}분 단축", "{c} {n}분 생활권 된 {s}", "{s}서 {c}까지 {n}분"],
  b: [
    ["인근 중개업소 문의 늘어", "역세권 단지 관심", "주민들 “체감은 아직”", "출퇴근 시간 변화 주목"],
    ["매수 문의 이어져", "호가 오름세", "집주인들 매물 거둬들여", "‘신 역세권’ 기대감"],
    ["신고가 거래 나와", "“{c} 생활권” 분양 광고 등장", "전세 매물 품귀", "인근 단지 호가 일제히 올라"],
  ],
};
const FARTHER: Pool = {
  a: ["{s}, {c}까지 {p}분→{n}분", "{s}~{c} {d}분 더 걸린다", "{c}에서 멀어진 {s}", "{s}서 {c}까지 {n}분"],
  b: [
    ["주민들 “큰 차이 없어”", "출퇴근 불편 호소", "중개업소 “지켜보는 중”", "전월세 문의 주춤"],
    ["매수 문의 끊겨", "호가 조정 움직임", "급매물 늘어", "‘역세권’ 문구 뺀 매물 광고"],
    ["급매 속출", "“역세권이라더니” 입주민 반발", "전세가 약세", "분양 일정 미뤄져"],
  ],
};
const ARRIVED: Pool = {
  a: ["{s}, {c}까지 {n}분", "{c} 옆에 선 {s}"],
  b: [["“사실상 {c}”", "‘{c} 생활권’ 간판 내건 중개업소", "매물 자취 감춰"]],
};
// Before anything is moved: the ride as printed.
const STEADY: Pool = {
  a: ["{s}, {c}까지 {n}분", "{c} {n}분 거리 {s}"],
  b: [["역세권 단지 꾸준한 관심", "출퇴근 수요 여전", "실수요 문의 이어져", "전월세 수요 꾸준", "{ci} 일터인 주민 많아"]],
};

const pick = <T,>(list: readonly T[], random: () => number) => list[Math.floor(random() * list.length)];

export function headline(move: Move, random: () => number) {
  const change = move.now - move.before;
  const size = Math.abs(change);
  const pool = change === 0 ? STEADY : change < 0 && move.now <= 3 ? ARRIVED : change < 0 ? NEARER : FARTHER;
  const band = pool.b[Math.min(pool.b.length - 1, size < 5 ? 0 : size < 15 ? 1 : 2)];
  return `${pick(pool.a, random)}…${pick(band, random)}`
    .replaceAll("{s}", `${move.station}역`)
    .replaceAll("{ci}", `${move.centre}${particle(move.centre, "이", "가")}`)
    .replaceAll("{c}", move.centre)
    .replaceAll("{p}", String(move.before))
    .replaceAll("{n}", String(move.now))
    .replaceAll("{d}", String(size));
}

// The body under a headline: the ride as a sentence, what the neighbourhood is
// said to be doing about it (by direction and size, as the headline), one
// quoted voice, and a closing line. Same limits as the headlines.
const fill = (text: string, move: Move) =>
  text
    .replaceAll("{s}", `${move.station}역`)
    .replaceAll("{ci}", `${move.centre}${particle(move.centre, "이", "가")}`)
    .replaceAll("{c}", move.centre)
    .replaceAll("{p}", String(move.before))
    .replaceAll("{n}", String(move.now))
    .replaceAll("{d}", String(Math.abs(move.now - move.before)));

const MARKET = {
  nearer: [
    "변화 폭이 크지 않아 시장 반응은 제한적이다. 인근 중개업소에는 문의 전화가 평소보다 조금 늘었다.",
    "역 주변 단지를 중심으로 매수 문의가 이어지고 있다. 일부 집주인은 내놓았던 매물을 거둬들였다.",
    "역 주변 단지에서는 호가가 일제히 올랐고 전세 매물은 찾기 어려워졌다. 분양 광고에는 ‘{c} 생활권’이라는 문구가 등장했다.",
  ],
  farther: [
    "변화 폭이 크지 않아 주민들은 큰 차이를 느끼지 못한다는 반응이다. 중개업소도 당분간 지켜보겠다는 분위기다.",
    "역 주변 단지에서는 매수 문의가 줄었고 호가를 낮춘 매물이 나오고 있다. 매물 광고에서 ‘역세권’이라는 문구를 뺀 곳도 있다.",
    "역 주변 단지에서는 급매물이 잇따라 나왔고 전세가도 약세를 보였다. 입주민 사이에서는 “역세권이라더니”라는 불만이 나온다.",
  ],
  arrived: "{s} 일대 중개업소는 ‘{c} 생활권’이라는 간판을 내걸었다. 나와 있던 매물은 자취를 감췄다.",
  steady: "역 주변 단지에는 출퇴근 수요를 중심으로 실수요 문의가 꾸준하다. 전월세 수요에도 큰 변화는 없다.",
} as const;
const VOICE = {
  nearer: ["인근 중개업소 관계자는 “손님들이 {c}까지 몇 분이냐부터 묻는다”고 말했다.", "한 주민은 “집은 그대로인데 {ci} 가까워졌다”고 말했다."],
  farther: ["한 주민은 “집은 그대로인데 역이 멀어졌다”고 말했다.", "인근 중개업소 관계자는 “{c}까지 몇 분이냐를 듣고 돌아서는 손님이 있다”고 말했다."],
  steady: ["중개업소 관계자는 “결국 {c}까지 몇 분이냐가 값을 정한다”고 말했다.", "한 주민은 “{c}까지 {n}분이라는 말에 이사를 왔다”고 말했다."],
} as const;
const CLOSE = "시장에서는 당분간 {s} 일대의 움직임을 지켜봐야 한다는 관측이 나온다.";

export function body(move: Move, random: () => number): string[] {
  const change = move.now - move.before;
  const size = Math.abs(change);
  const band = size < 5 ? 0 : size < 15 ? 1 : 2;
  const way = change === 0 ? "steady" : change < 0 ? "nearer" : "farther";
  const lead =
    way === "steady"
      ? "{s}에서 {c}까지는 {n}분이 걸린다."
      : `{s}에서 {c}까지 걸리는 시간이 {p}분에서 {n}분으로 ${way === "nearer" ? "줄었다" : "늘었다"}. 종전보다 {d}분 ${way === "nearer" ? "짧아진" : "길어진"} 것이다.`;
  const market = way === "steady" ? MARKET.steady : way === "nearer" && move.now <= 3 ? MARKET.arrived : MARKET[way][band];
  return [lead, market, pick(VOICE[way], random), CLOSE].map((text) => fill(text, move));
}

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const GIVEN = ["민준", "서연", "지호", "하은", "도윤", "수빈", "예준", "지우", "현우", "유진", "성민", "혜원"];
export const reporter = (random: () => number) => pick(SURNAMES, random) + pick(GIVEN, random);

// Outlets: real names bent slightly, as in left-right/naver-news — placed at once, and no headline here can be taken for that outlet's own.
export const PRESS: readonly string[] = ["연립뉴스", "뉴스시", "뉴스2", "머니투모로", "저데일리", "헤롤드경제", "아세아경제", "매달경제", "두국경제"];
