import type { Slant, Tier } from "./types";

// The outlets. Each is a real outlet's name bent a little (조선일보 → 남조선일보,
// 한겨레 → 두겨레), by request: the reader places it at once and nobody can
// take a headline here for that outlet's own. Grouped by leaning and by how
// hard the outlet pushes: 0 dailies and broadcasters, 1 opinion and online
// papers, 2 fandom media and YouTube channels.

export const PRESS: Record<Slant, readonly (readonly string[])[]> = {
  none: [[
    "연립뉴스", "뉴스시", "뉴스2", "KBX", "YTM", "SBC", "머니투모로", "저데일리", "헤롤드경제", "아세아경제",
  ]],
  left: [
    ["두겨레", "경향신붕", "MVC", "JTBD", "노컷튜스", "한궁일보", "서울심문", "뉴스감자", "모레신문", "시사OUT", "두겨레22"],
    ["오마이갓뉴스", "프레시맨", "미디어내일", "뉴스파타", "민중의목소리", "주간경향신붕", "미디어즈", "시민언론 진달래", "뉴스택시", "굿이브닝충청", "고소뉴스"],
    ["딴죽일보", "뉴스공단", "겸손은어렵다", "닫힌공감TV", "서울의메아리", "더탐정", "매운불쇼", "헌날", "부장남천동", "용민이네TV", "스피커스", "이동식TV"],
  ],
  right: [
    ["남조선일보", "중간일보", "동아리일보", "문하일보", "매달경제", "두국경제", "수도경제", "세게일보", "궁민일보", "TV남조선", "채널B", "MBM"],
    ["데일리언", "올드데일리", "펜앤드스피커", "월간남조선", "주간남조선", "격일신문", "아시아투모로", "미디어와치독", "스카이위클리", "자유이보", "뉴스빌리지"],
    ["신의두수", "가로세로대각선연구소", "봉규네TV", "고성방가TV", "따따부따따", "창경궁TV", "한길뉴스", "그라운드D", "파이낸스예스터데이", "자유만세TV", "애국청년TV"],
  ],
};

export const pressOf = (slant: Slant, tier: Tier) => PRESS[slant][slant === "none" ? 0 : tier];
