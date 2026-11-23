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

// Outlets: real names bent slightly, as in left-right/naver-news — placed at once, and no headline here can be taken for that outlet's own.
export const PRESS: readonly string[] = ["연립뉴스", "뉴스시", "뉴스2", "머니투모로", "저데일리", "헤롤드경제", "아세아경제", "매달경제", "두국경제"];
