// 인쇄물's sheets: the layouts, by 방향 (한국 · 뉴욕 · 빅테크) and kind (신문 · 잡지 · 전단), each then put through its
// press (print-press.ts). Runs in the painter's thread. Every name, masthead, price, number and line of copy is
// invented for this work; no real publication, brand or person is drawn, and photographs of people are not used.
//
// Second pass (user, 2026-11-12, on the first: "전혀 hyperreal 하지 않은 ai 가 대충 만든 텍스쳐"): the first sheets were
// 512 px drawings — blobs for photographs, cartoon bursts, a few lines of type. What changed: real photographs,
// screened as a press screens them; type at a page's real density and hierarchy, squeezed and justified as set
// type is; the page's own furniture (folios, rules, datelines, bar codes, fine print, tear-off tabs); and each
// kind on its own stock through its own press. A sheet is a crop of a page, not a whole page shrunk.
//
// To dig further (user, 2026-11-11: a more hyper-real 싼마이 print later): add a painter to a kind's list in
// SHEETS, or draw a scan there with `photograph`; nothing else changes.

import { SHEET_COUNT, SHEET_SIZE } from "./print-layout.ts";
import { barcode, box, css, matrixCode, photograph, pick, press, rule, setKorean, setLatin, type, type Job, type Press } from "./print-press.ts";

const S = SHEET_SIZE;
const KO = `"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
const KO_SERIF = `"AppleMyungjo", "Nanum Myeongjo", "Noto Serif KR", "Batang", serif`;
const SERIF = `"Times New Roman", Times, serif`;
const DISPLAY = `Didot, "Bodoni 72", "Times New Roman", serif`;
const SANS = `"Helvetica Neue", Helvetica, Arial, sans-serif`;
const HEAVY = `Impact, "Arial Black", sans-serif`;
const SLAB = `Rockwell, "Courier New", serif`;
const UI = `system-ui, -apple-system, "Helvetica Neue", sans-serif`;
const MONO = `"Courier New", Courier, monospace`;
const INK = "#1c1b1a";

const KO_BODY =
  "화면을 넘기는 손가락은 멈추지 않는다. 새로운 것이 올라오면 무리는 그쪽으로 몰려가고 조금 전까지 모두가 보던 것은 조용히 가라앉는다. " +
  "커지는 것은 더 많은 눈을 부르고 더 많은 눈은 그것을 더 크게 만든다. 그러다 어느 순간 터진다. 터진 자리에는 금세 다른 것이 부풀어 오른다. " +
  "업계 관계자는 “이번에는 다르다”고 말했다. 지난번에도 그렇게 말했다. 시장은 환호했고 다음 날 아침에는 아무도 그 이름을 기억하지 못했다. " +
  "주의는 유한하다. 그러나 그것을 원하는 것들은 끝없이 늘어난다. 전문가들은 하루 평균 화면을 넘기는 횟수가 지난해보다 크게 늘었다고 분석했다. " +
  "한 이용자는 “무엇을 봤는지는 기억나지 않지만 계속 보게 된다”고 했다. 당국은 대책을 검토 중이라고 밝혔으나 구체적인 일정은 내놓지 않았다. ";
const EN_BODY = (
  "The thumb does not stop. When something new surfaces the crowd turns toward it, and whatever everyone was watching a moment ago sinks without a sound. " +
  "What grows draws more eyes, and more eyes make it larger, until it bursts. Something else is already swelling where it was. " +
  "Analysts said this time was different. They said so the last time. Markets rallied, and by morning nobody could recall the name. " +
  "Attention is finite, officials noted, while the things that want it multiply without limit. A spokesperson declined to comment on the timeline. " +
  "People familiar with the matter said the figures were preliminary. Residents described a feeling of having seen all of it before and none of it at all."
).split(" ");
const TECH_BODY = (
  "Today we are introducing our most capable system yet. It is faster, more helpful and available to everyone starting this week. " +
  "Built on a new architecture, it delivers up to three times the performance while using less energy than the previous generation. " +
  "We believe this is the beginning of a new era, and we are committed to rolling it out responsibly. Features may vary by region. " +
  "Results are based on internal testing and may not reflect real world use. Battery life depends on configuration and usage. " +
  "By continuing you agree to the terms, including the arbitration provision, and acknowledge the privacy notice. Some features require a subscription."
).split(" ");

const KO_HEADS = ["거품인가 혁명인가", "모두가 본다 아무도 기억 못 한다", "3초의 주목, 하루 일만 번", "다음 유행은 이미 지나갔다", "조회수 폭등 관심은 폭락", "터지기 직전 가장 크게 부푼다", "알고리즘이 고른 오늘", "새 기술 공개… 열광 그리고 망각"];
const KO_DECKS = ["전문가 “이번엔 다르다”… 지난번에도 그랬다", "하루 평균 화면 넘김 역대 최다", "당국 “대책 검토 중” 일정은 미정", "이용자 열에 아홉 “뭘 봤는지 모르겠다”", "시장은 환호, 다음 날엔 망각"];
const KO_NAMES = ["금붕어일보", "주목신문", "매일버블", "어항경제"];
const EN_HEADS = ["Bubble or Breakthrough?", "Everyone Is Watching. No One Remembers.", "Three Seconds, Ten Thousand Times a Day", "The Next Big Thing Has Already Passed", "Views Soar as Attention Collapses", "It Swells Most Just Before It Bursts"];
const EN_DECKS = ["Analysts Say This Time Is Different, as They Did Last Time", "Officials Weigh Response; No Timeline Is Given", "A Record Day for Scrolling, and Little Recall of It"];
const TECH_HEADS = ["Introducing our most capable model yet", "The next chapter starts today", "Faster. Smarter. Everywhere.", "A new era of helpful", "Built for what comes next"];
const GOODS_KO = ["그래픽카드", "휴머노이드", "로켓 발사권", "로봇개", "전기 로드스터", "VR 헤드셋", "클라우드 1TB", "웨이퍼 한 판", "버블티", "야경 이용권", "배달 스쿠터", "하트 풍선"];

const won = (job: Job) => pick(job.random, ["9,900", "1,000", "19,800", "4,980", "990", "29,900", "5,000", "12,900", "3,300", "59,000"]);
const usd = (job: Job) => pick(job.random, ["0.99", "4.99", "9.99", "19.99", "2.49", "7.50", "12.00", "1.25", "29.95"]);
const digits = (job: Job, n: number) => Array.from({ length: n }, () => Math.floor(job.random() * 10)).join("");

// ── 한국 ────────────────────────────────────────────────────────────────────────────────────────────────

/** A national daily's front page, upper part: masthead, a squeezed banner headline, the lead photograph, columns. */
function koDaily(job: Job) {
  const m = 26;
  const spot = pick(job.random, ["#c4161c", "#0b3d91"]);
  type(job, pick(job.random, KO_NAMES), m, 86, { size: 78, family: KO_SERIF, weight: 900, colour: spot === "#c4161c" ? INK : spot, squeeze: 0.9 });
  box(job, 352, 30, 60, 60, spot);
  type(job, "창간", 382, 56, { size: 20, family: KO, weight: 800, colour: "#fff", align: "center" });
  type(job, `${40 + Math.floor(job.random() * 60)}주년`, 382, 80, { size: 18, family: KO, weight: 800, colour: "#fff", align: "center" });
  type(job, `2026년 11월 12일 목요일`, S - m, 52, { size: 17, family: KO, weight: 500, align: "right" });
  type(job, `제${digits(job, 5)}호  ·  1판  ·  대표전화 0000-0000`, S - m, 78, { size: 14, family: KO, align: "right", colour: "#444" });
  rule(job, m, 100, S - 2 * m, 4);
  rule(job, m, 107, S - 2 * m, 1);
  // Teasers along the head.
  for (let i = 0; i < 3; i += 1) {
    const x = m + i * ((S - 2 * m) / 3);
    photograph(job, x, 118, 96, 64);
    type(job, pick(job.random, KO_DECKS), x + 106, 140, { size: 17, family: KO, weight: 800, width: 210 });
    type(job, `${pick(job.random, ["경제", "문화", "사회", "국제"])} ${10 + Math.floor(job.random() * 20)}면`, x + 106, 166, { size: 14, family: KO, colour: spot });
  }
  rule(job, m, 192, S - 2 * m, 1);
  // The banner, squeezed to the measure as a headline is.
  const head = pick(job.random, KO_HEADS);
  type(job, head, m, 300, { size: 104, family: KO, weight: 900, width: S - 2 * m, squeeze: 0.86 });
  type(job, pick(job.random, KO_DECKS), m, 352, { size: 36, family: KO_SERIF, weight: 700, width: S - 2 * m, colour: "#222" });
  rule(job, m, 372, S - 2 * m, 1);
  // Lead photograph over four of six columns; text round it.
  const gap = 18;
  const cols = 6;
  const colW = (S - 2 * m - gap * (cols - 1)) / cols;
  const photoW = colW * 4 + gap * 3;
  photograph(job, m, 386, photoW, 372);
  type(job, `▲ ${pick(job.random, KO_DECKS)}  /사진=공동취재단`, m, 778, { size: 14, family: KO, colour: "#333", width: photoW });
  for (let i = 0; i < cols; i += 1) {
    const x = m + i * (colW + gap);
    const top = i < 4 ? 800 : 386;
    if (i === 4) {
      type(job, pick(job.random, KO_HEADS), x, 420, { size: 34, family: KO, weight: 800, width: colW * 2 + gap, squeeze: 0.9 });
      type(job, `${pick(job.random, ["김", "이", "박", "최"])}○○ 기자`, x, 446, { size: 13, family: KO, colour: "#555" });
    }
    setKorean(job, KO_BODY, x, i >= 4 ? 462 : top, colW, S - (i >= 4 ? 462 : top) - 14, 15.5, KO_SERIF);
    if (i > 0) rule(job, x - gap / 2, top, 0.6, S - top, "#8a857a");
  }
}

/** A free classified weekly (생활정보지): a grid of tiny boxed notices, shouting first lines, yellow and red spot colour. */
function koClassified(job: Job) {
  const yellow = "#ffe600";
  box(job, 0, 0, S, 92, "#d8141c");
  type(job, pick(job.random, ["알뜰장터", "오늘의 벼룩", "동네교차로"]), 22, 68, { size: 64, family: KO, weight: 900, colour: yellow, stroke: INK, strokeWidth: 6 });
  type(job, "구인 · 부동산 · 중고 · 대출 · 폐업정리", S - 20, 44, { size: 22, family: KO, weight: 800, colour: "#fff", align: "right" });
  type(job, `매주 목요일 발행 · 무료 · 제${digits(job, 4)}호`, S - 20, 74, { size: 16, family: KO, colour: "#fff", align: "right" });
  const cries = ["급구", "월세", "알바", "매매", "폐업", "당일지급", "무보증", "즉시입주", "초보환영", "야간", "주말", "직영", "급매", "양도", "신축"];
  const cols = 5;
  const w = S / cols;
  let col = 0;
  let y = 96;
  while (col < cols) {
    const h = 46 + Math.floor(job.random() * 4) * 22;
    const x = col * w;
    const loud = job.random();
    if (loud < 0.16) box(job, x + 2, y + 2, w - 4, h - 4, yellow);
    else if (loud < 0.24) box(job, x + 2, y + 2, w - 4, h - 4, INK);
    const ink = loud >= 0.16 && loud < 0.24 ? "#fff" : INK;
    job.ctx.strokeStyle = INK;
    job.ctx.lineWidth = 1;
    job.ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    type(job, `${pick(job.random, cries)} ${pick(job.random, cries)}`, x + 8, y + 25, { size: 21, family: KO, weight: 900, colour: loud < 0.4 && ink === INK ? "#d8141c" : ink, width: w - 16, squeeze: 0.92 });
    setKorean(job, "역세권 도보3분 풀옵션 보증금 조정가능 시급 협의 숙식제공 경력무관 주5일 4대보험 당일면접 남녀무관 차량소지자 우대 권리금 없음 급전 필요시 ", x + 8, y + 31, w - 16, h - 54, 12.5, KO, ink);
    type(job, `☎ 010-${digits(job, 4)}-${digits(job, 4)}`, x + 8, y + h - 9, { size: 15, family: KO, weight: 800, colour: ink, width: w - 16 });
    y += h;
    if (y > S - 40) {
      col += 1;
      y = 96;
    }
  }
}

/** A sports daily's front: a photograph edge to edge, a headline in white and yellow with black shadow, red bands. */
function koSports(job: Job) {
  photograph(job, 0, 0, S, S);
  box(job, 0, 0, S, 84, "#d8141c");
  type(job, pick(job.random, ["스포츠버블", "일간주목", "연예피드"]), 20, 64, { size: 62, family: KO, weight: 900, colour: "#fff", squeeze: 0.9 });
  type(job, `2026.11.12 (목) · 제${digits(job, 4)}호 · 1,000원`, S - 18, 54, { size: 18, family: KO, colour: "#fff", align: "right" });
  const head = pick(job.random, KO_HEADS).split(/[ ,…]+/);
  let y = 250;
  head.slice(0, 3).forEach((word, i) => {
    job.ctx.save();
    job.ctx.shadowColor = "rgba(0,0,0,0.85)";
    job.ctx.shadowOffsetX = 7;
    job.ctx.shadowOffsetY = 7;
    type(job, word, 30, y, { size: 168, family: KO, weight: 900, colour: i === 1 ? "#ffe600" : "#fff", stroke: INK, strokeWidth: 12, width: S - 60, squeeze: 0.82 });
    job.ctx.restore();
    y += 168;
  });
  box(job, 0, S - 190, S, 64, "#ffe600");
  type(job, pick(job.random, KO_DECKS), 20, S - 146, { size: 42, family: KO, weight: 900, colour: "#d8141c", width: S - 40, squeeze: 0.9 });
  box(job, 0, S - 126, S, 126, "rgba(0,0,0,0.78)");
  setKorean(job, KO_BODY, 22, S - 112, S - 44, 100, 19, KO, "#fff", 500);
}

/** A weekly's cover: a photograph edge to edge under a wide masthead and a stack of cover lines in several inks. */
function koWeekly(job: Job) {
  photograph(job, 0, 0, S, S, false);
  const shade = job.ctx.createLinearGradient(0, 0, 0, S);
  shade.addColorStop(0, "rgba(0,0,0,0.45)");
  shade.addColorStop(0.3, "rgba(0,0,0,0)");
  shade.addColorStop(0.65, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.6)");
  box(job, 0, 0, S, S, shade as unknown as string);
  const inkA = pick(job.random, ["#ffe600", "#ffffff", "#ff2d55"]);
  type(job, pick(job.random, ["주간 주목", "월간 버블", "여성 피드", "트렌드 21"]), S / 2, 200, { size: 210, family: KO, weight: 900, colour: inkA, align: "center", width: S - 40, squeeze: 0.84, stroke: "rgba(0,0,0,0.55)", strokeWidth: 4 });
  type(job, `2026 · 11 · 제${digits(job, 3)}호  |  값 ${won(job)}원`, S / 2, 236, { size: 22, family: KO, weight: 600, colour: "#fff", align: "center" });
  let y = 330;
  const inks = ["#ffffff", "#ffe600", "#7df9ff", "#ff9ecb"];
  for (let i = 0; i < 6 && y < S - 150; i += 1) {
    const size = pick(job.random, [34, 44, 58, 72]);
    const text = pick(job.random, [...KO_HEADS, ...KO_DECKS]);
    if (job.random() < 0.3) {
      box(job, 24, y - size + 6, Math.min(S * 0.6, text.length * size * 0.8) + 20, size + 10, "#d8141c");
      type(job, text, 34, y, { size, family: KO, weight: 900, colour: "#fff", width: S * 0.58, squeeze: 0.88 });
    } else {
      type(job, text, 28, y, { size, family: KO, weight: 900, colour: pick(job.random, inks), width: S * 0.6, squeeze: 0.88, stroke: "rgba(0,0,0,0.7)", strokeWidth: 5 });
    }
    type(job, pick(job.random, KO_DECKS), 30, y + 28, { size: 20, family: KO, weight: 600, colour: "#fff", width: S * 0.56 });
    y += size + 62;
  }
  job.ctx.save();
  job.ctx.translate(S - 170, 420);
  job.ctx.rotate(-0.16);
  box(job, -130, -52, 270, 104, "#ffe600");
  type(job, "별책 부록", 5, -8, { size: 44, family: KO, weight: 900, colour: "#d8141c", align: "center" });
  type(job, "올해의 대유행 100", 5, 32, { size: 26, family: KO, weight: 800, align: "center" });
  job.ctx.restore();
  barcode(job, S - 210, S - 110, 170, 62);
}

/** A supermarket flyer: a date band, goods photographed in a grid, each price in heavy red figures. */
function koMart(job: Job) {
  const red = "#e60012";
  box(job, 0, 0, S, 150, red);
  type(job, pick(job.random, ["금붕어마트", "버블마트", "주목할인점"]), 24, 78, { size: 70, family: KO, weight: 900, colour: "#fff", squeeze: 0.9 });
  type(job, "전단 행사", 24, 130, { size: 38, family: KO, weight: 900, colour: "#ffe600" });
  type(job, pick(job.random, ["창고대방출", "초특가 대잔치", "폐업 정리전", "통큰 세일"]), S - 22, 96, { size: 108, family: KO, weight: 900, colour: "#ffe600", align: "right", stroke: INK, strokeWidth: 10, width: 560, squeeze: 0.84 });
  type(job, "11.12(목) ~ 11.18(수) · 7일간 · 한정수량 소진 시 조기종료", S - 22, 138, { size: 20, family: KO, weight: 700, colour: "#fff", align: "right" });
  const cols = 3;
  const rows = 3;
  const w = S / cols;
  const h = (S - 150 - 44) / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = c * w;
      const y = 150 + r * h;
      job.ctx.strokeStyle = "#bdbdbd";
      job.ctx.lineWidth = 1;
      job.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
      photograph(job, x + 14, y + 12, w - 28, h * 0.56);
      const name = pick(job.random, GOODS_KO);
      type(job, name, x + 14, y + h * 0.56 + 42, { size: 26, family: KO, weight: 800, width: w - 28 });
      type(job, pick(job.random, ["1팩 / 국내산", "1개 / 수입", "100g당", "1박스 한정", "1인 2개 한정"]), x + 14, y + h * 0.56 + 66, { size: 15, family: KO, colour: "#555" });
      const was = won(job);
      type(job, `${was}원`, x + 14, y + h - 16, { size: 17, family: KO, colour: "#777" });
      rule(job, x + 12, y + h - 23, 74, 1.5, "#777");
      const price = won(job);
      const pw = type(job, price, x + w - 40, y + h - 14, { size: 76, family: HEAVY, colour: red, align: "right", width: w * 0.62, squeeze: 0.86 });
      void pw;
      type(job, "원", x + w - 14, y + h - 16, { size: 24, family: KO, weight: 900, colour: red, align: "right" });
      if (job.random() < 0.45) {
        job.ctx.fillStyle = "#ffe600";
        job.ctx.beginPath();
        job.ctx.arc(x + w - 52, y + 50, 40, 0, Math.PI * 2);
        job.ctx.fill();
        type(job, pick(job.random, ["1+1", "반값", "50%", "특가", "덤"]), x + w - 52, y + 62, { size: 32, family: KO, weight: 900, colour: red, align: "center" });
      }
    }
  }
  box(job, 0, S - 44, S, 44, "#222");
  type(job, "※ 사진은 실제와 다를 수 있습니다 · 행사카드 결제 시 · 일부 품목 제외 · 점포별 상이 · 고객센터 0000-0000", S / 2, S - 16, { size: 15, family: KO, colour: "#ddd", align: "center", width: S - 30 });
}

/** A delivery menu left on a door: a dense price list in two columns, a phone number larger than anything else. */
function koMenu(job: Job) {
  const ground = pick(job.random, ["#fff200", "#ffffff", "#ffe1e1"]);
  box(job, 0, 0, S, S, ground);
  box(job, 0, 0, S, 170, "#d8141c");
  type(job, pick(job.random, ["황금반점", "버블치킨", "24시 야식"]), 26, 110, { size: 110, family: KO, weight: 900, colour: "#ffe600", stroke: INK, strokeWidth: 10, squeeze: 0.88 });
  type(job, "신속배달 · 카드결제 환영", S - 24, 60, { size: 26, family: KO, weight: 800, colour: "#fff", align: "right" });
  type(job, `☎ ${digits(job, 3)}-${digits(job, 4)}`, S - 24, 140, { size: 84, family: HEAVY, colour: "#fff", align: "right", stroke: INK, strokeWidth: 8 });
  const dishes = ["짜장면", "짬뽕", "볶음밥", "탕수육 (소)", "탕수육 (대)", "군만두", "양장피", "깐풍기", "후라이드", "양념치킨", "반반치킨", "간장치킨", "떡볶이", "순대", "족발 (중)", "보쌈", "김치찌개", "제육덮밥", "잡채밥", "울면", "쟁반짜장", "유산슬", "팔보채", "고추잡채"];
  const sets = ["식사부", "요리부", "세트메뉴", "치킨", "야식", "주류 · 음료"];
  for (let col = 0; col < 2; col += 1) {
    const x = 26 + col * (S / 2);
    let y = 196;
    for (let part = 0; part < 3; part += 1) {
      box(job, x, y, S / 2 - 52, 38, INK);
      type(job, pick(job.random, sets), x + 12, y + 28, { size: 25, family: KO, weight: 900, colour: "#ffe600" });
      y += 44;
      const n = 5 + Math.floor(job.random() * 3);
      for (let i = 0; i < n; i += 1) {
        type(job, pick(job.random, dishes), x + 6, y + 26, { size: 25, family: KO, weight: 700, width: S / 2 - 190 });
        job.ctx.setLineDash([2, 5]);
        job.ctx.strokeStyle = "#777";
        job.ctx.beginPath();
        job.ctx.moveTo(x + 190, y + 20);
        job.ctx.lineTo(x + S / 2 - 150, y + 20);
        job.ctx.stroke();
        job.ctx.setLineDash([]);
        type(job, `${5 + Math.floor(job.random() * 25)},${pick(job.random, ["000", "500", "900"])}`, x + S / 2 - 56, y + 27, { size: 28, family: HEAVY, colour: "#d8141c", align: "right" });
        y += 34;
      }
      y += 12;
      if (y > S - 150) break;
    }
  }
  photograph(job, S - 250, S - 190, 226, 150);
  box(job, 0, S - 34, S, 34, "#d8141c");
  type(job, "쿠폰 10장 = 탕수육 서비스 · 연중무휴 · 오전 11시 ~ 새벽 2시", S / 2, S - 10, { size: 18, family: KO, weight: 700, colour: "#fff", align: "center" });
}

// ── 뉴욕 ────────────────────────────────────────────────────────────────────────────────────────────────

/** A broadsheet's front, upper part: a centred nameplate between ear boxes, decks in italic, six justified columns. */
function nyBroadsheet(job: Job) {
  const m = 30;
  type(job, pick(job.random, ["The Daily Bubble", "The Evening Feed", "New York Attention"]), S / 2, 92, { size: 88, family: `Luminari, ${DISPLAY}`, weight: 700, align: "center", width: S - 330 });
  job.ctx.strokeStyle = INK;
  job.ctx.lineWidth = 1;
  job.ctx.strokeRect(m + 0.5, 30.5, 132, 72);
  type(job, "“Everything", m + 66, 58, { size: 15, family: SERIF, italic: true, align: "center" });
  type(job, "You Scrolled Past”", m + 66, 78, { size: 15, family: SERIF, italic: true, align: "center" });
  job.ctx.strokeRect(S - m - 132.5, 30.5, 132, 72);
  type(job, "Late Edition", S - m - 66, 54, { size: 16, family: SERIF, weight: 700, align: "center" });
  type(job, "Today, clouds, high 52.", S - m - 66, 74, { size: 12, family: SERIF, align: "center" });
  type(job, "Tonight, feeds, low 41.", S - m - 66, 90, { size: 12, family: SERIF, align: "center" });
  rule(job, m, 116, S - 2 * m, 1);
  type(job, `VOL. CLXX . . . No. ${digits(job, 2)},${digits(job, 3)}`, m, 136, { size: 13, family: SERIF });
  type(job, "NEW YORK, THURSDAY, NOVEMBER 12, 2026", S / 2, 136, { size: 13, family: SERIF, weight: 700, align: "center", spacing: 1 });
  type(job, "$4.00", S - m, 136, { size: 13, family: SERIF, weight: 700, align: "right" });
  rule(job, m, 144, S - 2 * m, 3);
  const gap = 20;
  const cols = 6;
  const colW = (S - 2 * m - gap * (cols - 1)) / cols;
  const colX = (i: number) => m + i * (colW + gap);
  // Lead story on the right, two columns; the photograph across the middle three.
  const story = (i: number, span: number, top: number, bottom: number, size: number) => {
    const w = colW * span + gap * (span - 1);
    const head = pick(job.random, EN_HEADS).split(" ");
    let y = top + size;
    let line = "";
    job.ctx.font = `700 ${size}px ${SERIF}`;
    const lines: string[] = [];
    for (const word of head) {
      if (job.ctx.measureText(`${line} ${word}`).width > w && line) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
    for (const text of lines.slice(0, 4)) {
      type(job, text, colX(i), y, { size, family: SERIF, weight: 700, width: w, squeeze: 0.92 });
      y += size * 1.04;
    }
    rule(job, colX(i) + w * 0.3, y - size * 0.55, w * 0.4, 1);
    type(job, pick(job.random, EN_DECKS), colX(i), y + 2, { size: size * 0.5, family: SERIF, italic: true, width: w });
    y += size * 0.5 + 14;
    type(job, `By ${pick(job.random, ["A. N. OTHER", "J. DOE", "R. ROE", "STAFF"])}`, colX(i), y, { size: 11, family: SERIF, weight: 700, spacing: 0.6 });
    y += 10;
    for (let k = 0; k < span; k += 1) setLatin(job, EN_BODY, colX(i + k), y, colW, bottom - y, 14.5, SERIF);
    return y;
  };
  story(4, 2, 156, S - 16, 46);
  photograph(job, colX(1), 160, colW * 3 + gap * 2, 396);
  type(job, "PHOTOGRAPH FOR THE DAILY BUBBLE", colX(4) - gap, 570, { size: 9, family: SANS, align: "right", colour: "#555", spacing: 0.4 });
  setLatin(job, EN_BODY, colX(1), 576, colW * 3 + gap * 2, 34, 13, SERIF, "#333", 400, false);
  story(0, 1, 156, 610, 30);
  rule(job, m, 622, colW * 4 + gap * 3, 1);
  story(0, 2, 630, S - 16, 34);
  story(2, 2, 630, S - 16, 28);
  for (let i = 1; i < cols; i += 1) if (i !== 5) rule(job, colX(i) - gap / 2, i < 4 && i > 1 ? 630 : 156, 0.6, S, "#77736a");
}

/** A tabloid's front: a wood-type headline in white on black, a photograph beneath, a red nameplate. */
function nyTabloid(job: Job) {
  box(job, 0, 0, S, S, "#0d0d0d");
  box(job, 0, 0, S, 120, "#d6001c");
  type(job, pick(job.random, ["DAILY FEED", "N.Y. BUBBLE", "THE SCROLL"]), 22, 98, { size: 112, family: HEAVY, colour: "#fff", italic: true, width: 640 });
  type(job, "Thursday, November 12, 2026", S - 20, 50, { size: 20, family: SANS, weight: 700, colour: "#fff", align: "right" });
  type(job, "LATE CITY FINAL · $3.00", S - 20, 84, { size: 22, family: SANS, weight: 800, colour: "#ffe600", align: "right" });
  const words = pick(job.random, ["IT'S A BUBBLE!", "GONE IN 3 SEC.", "WHO SAW THAT?", "POP GOES THE HYPE", "SCROLL OF SHAME"]).split(" ");
  let y = 300;
  const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : words;
  for (const line of lines) {
    type(job, line, S / 2, y, { size: 210, family: HEAVY, colour: "#fff", align: "center", width: S - 40 });
    y += 186;
  }
  photograph(job, 20, y - 150, S - 40, S - (y - 150) - 150);
  box(job, 20, S - 132, S - 40, 112, "#ffe600");
  type(job, pick(job.random, EN_DECKS).toUpperCase(), S / 2, S - 84, { size: 36, family: HEAVY, align: "center", width: S - 80, colour: "#0d0d0d" });
  type(job, "EXCLUSIVE · SEE PAGES 4 – 5", S / 2, S - 42, { size: 26, family: SANS, weight: 800, align: "center", colour: "#d6001c" });
}

/** A markets page: agate tables of invented symbols and figures, eight columns of them. */
function nyAgate(job: Job) {
  const m = 24;
  type(job, "BUSINESS DAY", m, 56, { size: 50, family: SERIF, weight: 700, spacing: 2 });
  type(job, "B7", S - m, 56, { size: 34, family: SERIF, weight: 700, align: "right" });
  rule(job, m, 68, S - 2 * m, 3);
  type(job, "MOST ACTIVE, GAINERS AND LOSERS · PRICES AS OF 4 P.M. · VOLUME IN HUNDREDS", m, 88, { size: 12, family: SANS, weight: 700, spacing: 0.5 });
  const cols = 6;
  const gap = 12;
  const w = (S - 2 * m - gap * (cols - 1)) / cols;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let c = 0; c < cols; c += 1) {
    const x = m + c * (w + gap);
    let y = 104;
    while (y < S - 20) {
      if (job.random() < 0.06) {
        box(job, x, y, w, 16, INK);
        type(job, pick(job.random, ["ATTENTION INDEX", "FEED 500", "HYPE COMPOSITE", "BUBBLE 100", "SCROLL AVG."]), x + 4, y + 12, { size: 11, family: SANS, weight: 800, colour: "#f0ede4" });
        y += 19;
        continue;
      }
      const symbol = Array.from({ length: 3 + Math.floor(job.random() * 3) }, () => letters[Math.floor(job.random() * 26)]).join("");
      const up = job.random() < 0.5;
      const bold = job.random() < 0.12;
      type(job, symbol, x, y + 10, { size: 11.5, family: SANS, weight: bold ? 800 : 400 });
      type(job, `${Math.floor(job.random() * 900)}.${digits(job, 2)}`, x + w * 0.62, y + 10, { size: 11.5, family: SANS, align: "right", weight: bold ? 800 : 400 });
      type(job, `${up ? "+" : "–"}${Math.floor(job.random() * 9)}.${digits(job, 2)}`, x + w, y + 10, { size: 11.5, family: SANS, align: "right", weight: bold ? 800 : 400 });
      y += 13.5;
    }
    if (c > 0) rule(job, x - gap / 2, 100, 0.6, S, "#77736a");
  }
}

/** A city weekly's cover: a didone nameplate, a photograph edge to edge, a few lines set small and sure. */
function nyWeekly(job: Job) {
  photograph(job, 0, 0, S, S, false);
  const ink = pick(job.random, ["#ffffff", "#ffffff", "#f5e663", "#ff3b30"]);
  type(job, pick(job.random, ["BUBBLE", "FEED", "THE SCROLL", "ATTENTION"]), S / 2, 236, { size: 270, family: DISPLAY, weight: 700, colour: ink, align: "center", width: S - 50 });
  type(job, `NOVEMBER 12–18, 2026`, 30, 34, { size: 18, family: SANS, weight: 700, colour: "#fff", spacing: 2 });
  type(job, `$${usd(job)}`, S - 30, 34, { size: 18, family: SANS, weight: 700, colour: "#fff", align: "right" });
  const shade = job.ctx.createLinearGradient(0, S * 0.55, 0, S);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.7)");
  box(job, 0, S * 0.55, S, S * 0.45, shade as unknown as string);
  type(job, pick(job.random, EN_HEADS), 34, S - 190, { size: 76, family: DISPLAY, weight: 700, colour: "#fff", width: S - 68, italic: job.random() < 0.5 });
  type(job, pick(job.random, EN_DECKS), 36, S - 138, { size: 26, family: SANS, weight: 500, colour: "#fff", width: S - 280 });
  type(job, `By ${pick(job.random, ["A. N. Other", "J. Doe", "R. Roe"])}`, 36, S - 104, { size: 20, family: SANS, weight: 700, colour: ink, spacing: 1 });
  type(job, `PLUS: ${pick(job.random, EN_HEADS)}  /  ${pick(job.random, EN_HEADS)}`, 36, S - 44, { size: 18, family: SANS, weight: 700, colour: "#fff", width: S - 280, spacing: 0.6 });
  barcode(job, S - 204, S - 106, 164, 56);
}

/** A photocopied notice with tear-off tabs: grotesque capitals, one photograph gone to toner, a fringe of numbers. */
function nyTearOff(job: Job) {
  const what = pick(job.random, ["ROOMMATE WANTED", "LOST ATTENTION", "GUITAR LESSONS", "HAVE YOU SEEN THIS?", "MOVING SALE", "DOG WALKER"]);
  type(job, what, S / 2, 150, { size: 132, family: SANS, weight: 900, align: "center", width: S - 80, colour: "#000" });
  photograph(job, 150, 190, S - 300, 380, false);
  job.ctx.strokeStyle = "#000";
  job.ctx.lineWidth = 6;
  job.ctx.strokeRect(150, 190, S - 300, 380);
  type(job, pick(job.random, ["LAST SEEN THURSDAY NEAR THE L TRAIN", "SUNNY ROOM · NO BROKERS · AVAIL. NOW", "ALL LEVELS · FIRST LESSON FREE", "EVERYTHING MUST GO · SAT & SUN 10–4"]), S / 2, 640, { size: 44, family: SANS, weight: 800, align: "center", width: S - 100, colour: "#000" });
  setLatin(job, EN_BODY, 110, 670, S - 220, 90, 26, MONO, "#000", 700, false);
  type(job, "REWARD · CASH · NO QUESTIONS ASKED", S / 2, 800, { size: 38, family: SANS, weight: 900, align: "center", width: S - 120, colour: "#000" });
  const tabs = 11;
  const w = S / tabs;
  job.ctx.setLineDash([10, 7]);
  job.ctx.lineWidth = 2;
  job.ctx.beginPath();
  job.ctx.moveTo(0, 826);
  job.ctx.lineTo(S, 826);
  for (let i = 1; i < tabs; i += 1) {
    job.ctx.moveTo(i * w, 826);
    job.ctx.lineTo(i * w, S);
  }
  job.ctx.stroke();
  job.ctx.setLineDash([]);
  const number = `(212) 555-01${digits(job, 2)}`;
  for (let i = 0; i < tabs; i += 1) {
    job.ctx.save();
    job.ctx.translate(i * w + w / 2, S - 12);
    job.ctx.rotate(-Math.PI / 2);
    type(job, what.split(" ")[0]!, 0, -12, { size: 24, family: SANS, weight: 900, colour: "#000" });
    type(job, number, 0, 18, { size: 22, family: MONO, weight: 700, colour: "#000" });
    job.ctx.restore();
  }
}

/** A take-out menu: red and green on white, numbered dishes in tight columns, FREE DELIVERY larger than the name. */
function nyTakeout(job: Job) {
  const red = "#d6001c";
  const green = "#0a7a3b";
  box(job, 0, 0, S, 190, red);
  type(job, pick(job.random, ["GOLDEN FISH", "LUCKY BUBBLE", "No. 1 FEED", "BROADWAY PIZZA"]), S / 2, 96, { size: 108, family: SLAB, weight: 800, colour: "#fff", align: "center", width: S - 60 });
  type(job, "KITCHEN · TAKE OUT · CATERING", S / 2, 138, { size: 30, family: SANS, weight: 800, colour: "#ffe600", align: "center", spacing: 3 });
  type(job, `${100 + Math.floor(job.random() * 800)} ${pick(job.random, ["BROADWAY", "CANAL ST.", "AVENUE A", "9TH AVE."])} · (212) 555-01${digits(job, 2)}`, S / 2, 174, { size: 24, family: SANS, weight: 700, colour: "#fff", align: "center" });
  box(job, 0, 190, S, 60, green);
  type(job, "FREE DELIVERY ★ OPEN 7 DAYS ★ MIN. ORDER $10", S / 2, 232, { size: 36, family: HEAVY, colour: "#fff", align: "center", width: S - 40 });
  const dishes = ["Egg Roll", "Wonton Soup", "Fried Rice", "Lo Mein", "General's Chicken", "Sesame Chicken", "Beef w. Broccoli", "Dumplings (8)", "Hot & Sour Soup", "Plain Slice", "Pepperoni Slice", "Garlic Knots (6)", "Chicken Parm Hero", "Baked Ziti", "Greek Salad", "Bubble Tea", "Fried Dumplings", "Shrimp Toast", "Moo Shu Pork", "Chow Fun", "Sweet & Sour Pork", "Mozzarella Sticks", "Calzone", "Spare Ribs"];
  const heads = ["APPETIZERS", "SOUP", "FRIED RICE", "LO MEIN", "CHEF'S SPECIALS", "PIZZA", "HEROS", "LUNCH SPECIAL", "COMBINATION PLATTERS"];
  const cols = 3;
  const w = (S - 40) / cols;
  let n = 1;
  for (let c = 0; c < cols; c += 1) {
    const x = 20 + c * w;
    let y = 270;
    while (y < S - 60) {
      type(job, pick(job.random, heads), x + 4, y + 22, { size: 24, family: SLAB, weight: 800, colour: red, width: w - 16 });
      rule(job, x + 4, y + 28, w - 16, 2, green);
      y += 36;
      const count = 5 + Math.floor(job.random() * 5);
      for (let i = 0; i < count && y < S - 50; i += 1) {
        type(job, `${n}. ${pick(job.random, dishes)}`, x + 4, y + 16, { size: 17, family: SANS, weight: 600, width: w - 110 });
        if (job.random() < 0.2) type(job, "🌶", x + w - 108, y + 16, { size: 13, family: SANS, colour: red });
        type(job, usd(job), x + w - 60, y + 16, { size: 17, family: SANS, weight: 700, align: "right" });
        type(job, usd(job), x + w - 12, y + 16, { size: 17, family: SANS, weight: 700, align: "right" });
        n += 1;
        y += 21;
      }
      y += 12;
    }
  }
  photograph(job, S - 230, S - 196, 206, 150);
  box(job, 0, S - 36, S, 36, red);
  type(job, "PRICES SUBJECT TO CHANGE WITHOUT NOTICE · WE DO NOT USE M.S.G.", S / 2, S - 11, { size: 17, family: SANS, weight: 700, colour: "#fff", align: "center" });
}

/** A wheat-pasted gig poster: wood-type lines of different widths filling the sheet over a split-fountain ground. */
function nyGig(job: Job) {
  const [a, b] = pick(job.random, [["#ff4f9a", "#ffd200"], ["#00b4ff", "#b6ff3c"], ["#ff5a1f", "#ffe14d"], ["#9b5cff", "#ff7ad9"]] as const);
  const ground = job.ctx.createLinearGradient(0, 0, 0, S);
  ground.addColorStop(0, a);
  ground.addColorStop(1, b);
  box(job, 0, 0, S, S, ground as unknown as string);
  const lines = [
    ["ONE NIGHT ONLY", HEAVY, 92],
    [pick(job.random, ["THE GOLDFISH", "BUBBLE RAFT", "ATTENTION SPAN", "THE FEED"]), HEAVY, 230],
    ["with", SERIF, 44],
    [pick(job.random, ["THE THREE SECONDS", "SCROLL & THE THUMBS", "HYPE CYCLE", "LOST TABS"]), SLAB, 120],
    [pick(job.random, ["LIVE! IN PERSON", "ALL AGES", "DOORS 8 PM"]), HEAVY, 140],
    [`THURS. NOV. 12 · $${10 + Math.floor(job.random() * 20)} ADV. · $${30 + Math.floor(job.random() * 10)} DOOR`, SANS, 54],
    [pick(job.random, ["BOWERY HALL", "CANAL ST. BASEMENT", "AVENUE A SOCIAL"]), SLAB, 110],
  ] as const;
  let y = 30;
  for (const [text, family, size] of lines) {
    y += size * 0.92;
    type(job, text, S / 2, y, { size, family, weight: 800, align: "center", width: S - 56, colour: "#0d0d0d" });
    y += size * 0.16;
    if (size > 100) {
      rule(job, 28, y, S - 56, 6, "#0d0d0d");
      y += 10;
    }
  }
  photograph(job, 28, y + 8, S - 56, Math.max(60, S - y - 70), false);
  box(job, 28, y + 8, S - 56, Math.max(60, S - y - 70), "rgba(255,80,160,0.25)");
  type(job, "POST NO BILLS", S / 2, S - 20, { size: 30, family: HEAVY, align: "center", colour: "#0d0d0d", spacing: 6 });
}

// ── 빅테크 ──────────────────────────────────────────────────────────────────────────────────────────────

/** A company newsroom post, printed: a quiet sans headline, a wide product photograph, two columns, footnotes. */
function techNewsroom(job: Job) {
  const m = 64;
  job.ctx.fillStyle = INK;
  job.ctx.beginPath();
  job.ctx.arc(m + 14, 58, 14, 0, Math.PI * 2);
  job.ctx.fill();
  type(job, "Newsroom", m + 40, 66, { size: 26, family: UI, weight: 600 });
  type(job, "Products    Research    Company    Safety    Careers", S - m, 64, { size: 15, family: UI, colour: "#6e6e73", align: "right" });
  rule(job, 0, 96, S, 1, "#d2d2d7");
  type(job, pick(job.random, ["PRESS RELEASE", "UPDATE", "ANNOUNCEMENT"]), m, 146, { size: 14, family: UI, weight: 700, colour: "#6e6e73", spacing: 1.6 });
  type(job, "November 12, 2026", m + 170, 146, { size: 14, family: UI, colour: "#6e6e73" });
  const head = pick(job.random, TECH_HEADS);
  type(job, head, m, 216, { size: 62, family: UI, weight: 700, width: S - 2 * m, spacing: -1.4 });
  type(job, "Available to everyone starting this week, with more features rolling out over the coming months.", m, 258, { size: 21, family: UI, colour: "#424245", width: S - 2 * m });
  job.ctx.save();
  job.ctx.beginPath();
  job.ctx.roundRect(m, 290, S - 2 * m, 380, 22);
  job.ctx.clip();
  photograph(job, m, 290, S - 2 * m, 380, false);
  job.ctx.restore();
  const w = (S - 2 * m - 40) / 2;
  setLatin(job, TECH_BODY, m, 700, w, 220, 17, UI, "#1d1d1f", 400, false);
  setLatin(job, TECH_BODY, m + w + 40, 700, w, 150, 17, UI, "#1d1d1f", 400, false);
  box(job, m + w + 40, 866, w, 60, "#f5f5f7", 14);
  type(job, "“This is just the beginning.”", m + w + 60, 904, { size: 22, family: UI, weight: 600, width: w - 40 });
  rule(job, m, 944, S - 2 * m, 1, "#d2d2d7");
  setLatin(job, TECH_BODY, m, 954, S - 2 * m, 60, 10.5, UI, "#86868b", 400, false);
}

/** A benchmark slide, printed: three big figures, bars that only go up, the footnotes nobody reads. */
function techCharts(job: Job) {
  box(job, 0, 0, S, S, "#000000");
  const accent = pick(job.random, ["#0a84ff", "#30d158", "#bf5af2", "#ff9f0a"]);
  type(job, pick(job.random, ["Performance", "Growth", "Scale", "Efficiency"]), 60, 110, { size: 72, family: UI, weight: 700, colour: "#f5f5f7", spacing: -1.6 });
  type(job, "Compared with the previous generation¹", 62, 148, { size: 20, family: UI, colour: "#86868b" });
  for (let i = 0; i < 3; i += 1) {
    const x = 60 + i * 310;
    box(job, x, 190, 284, 220, "#1c1c1e", 26);
    type(job, pick(job.random, ["3.2x", "10x", "94%", "2.5x", "40%", "1B+", "18 hrs", "$94.8B"]), x + 24, 300, { size: 92, family: UI, weight: 700, colour: i === 1 ? accent : "#f5f5f7", width: 240, spacing: -2 });
    type(job, pick(job.random, ["faster responses", "weekly users", "less energy", "more context", "higher accuracy", "battery life", "quarterly revenue"]), x + 26, 348, { size: 21, family: UI, colour: "#aeaeb2" });
    type(job, "Up to", x + 26, 226, { size: 17, family: UI, colour: "#86868b" });
  }
  box(job, 60, 440, S - 120, 440, "#1c1c1e", 26);
  type(job, "Benchmark score, higher is better", 88, 486, { size: 20, family: UI, weight: 600, colour: "#f5f5f7" });
  const bars = 9;
  for (let i = 0; i < bars; i += 1) {
    const h = 30 + (i / (bars - 1)) ** 1.9 * 290 + job.random() * 14;
    const x = 100 + i * ((S - 200) / bars);
    box(job, x, 840 - h, (S - 200) / bars - 22, h, i === bars - 1 ? accent : "#48484a", 8);
    type(job, i === bars - 1 ? "New" : `Gen ${i + 1}`, x + ((S - 200) / bars - 22) / 2, 864, { size: 14, family: UI, colour: "#aeaeb2", align: "center" });
  }
  setLatin(job, TECH_BODY, 62, 906, S - 124, 100, 11, UI, "#636366", 400, false);
}

/** Terms of service, printed: a wall of small type, numbered clauses in capitals, a button at the foot. */
function techTerms(job: Job) {
  const m = 70;
  type(job, pick(job.random, ["Terms of Service", "Privacy Policy", "Acceptable Use Policy", "End User License Agreement"]), m, 110, { size: 54, family: UI, weight: 700, spacing: -1 });
  type(job, "Last updated November 12, 2026 · Effective immediately", m, 144, { size: 16, family: UI, colour: "#6e6e73" });
  rule(job, m, 164, S - 2 * m, 1, "#d2d2d7");
  let y = 184;
  const clauses = ["ACCEPTANCE OF TERMS", "YOUR CONTENT", "LICENSE YOU GRANT US", "DATA WE COLLECT", "HOW WE USE YOUR ATTENTION", "ARBITRATION AND CLASS ACTION WAIVER", "LIMITATION OF LIABILITY", "CHANGES TO THESE TERMS", "TERMINATION"];
  let n = 1;
  while (y < S - 190) {
    type(job, `${n}. ${pick(job.random, clauses)}`, m, y + 16, { size: 15, family: UI, weight: 700 });
    const h = 70 + Math.floor(job.random() * 5) * 16;
    setLatin(job, TECH_BODY, m, y + 26, S - 2 * m, h, 12.5, UI, "#3a3a3c", 400, false);
    y += h + 38;
    n += 1;
  }
  const fade = job.ctx.createLinearGradient(0, S - 250, 0, S - 150);
  fade.addColorStop(0, "rgba(255,255,255,0)");
  fade.addColorStop(1, "rgba(255,255,255,1)");
  box(job, 0, S - 250, S, 110, fade as unknown as string);
  box(job, 0, S - 150, S, 150, "#ffffff");
  job.ctx.strokeStyle = "#0a84ff";
  job.ctx.lineWidth = 2;
  job.ctx.strokeRect(m, S - 130, 22, 22);
  type(job, "I have read and agree to the Terms and the Privacy Policy.", m + 36, S - 112, { size: 19, family: UI });
  box(job, m, S - 86, 250, 56, "#0a84ff", 28);
  type(job, "Agree and continue", m + 125, S - 51, { size: 21, family: UI, weight: 600, colour: "#fff", align: "center" });
  type(job, "Decline", m + 300, S - 51, { size: 21, family: UI, colour: "#0a84ff" });
}

/** A keynote's hero slide: a product photograph out of black, one thin word across it. */
function techHero(job: Job) {
  box(job, 0, 0, S, S, "#000000");
  job.ctx.save();
  job.ctx.beginPath();
  job.ctx.roundRect(110, 300, S - 220, 520, 40);
  job.ctx.clip();
  photograph(job, 110, 300, S - 220, 520, false);
  job.ctx.restore();
  const vignette = job.ctx.createRadialGradient(S / 2, 560, 200, S / 2, 560, 620);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.95)");
  box(job, 0, 0, S, S, vignette as unknown as string);
  const glow = job.ctx.createLinearGradient(200, 0, S - 200, 0);
  const tones = pick(job.random, [["#64d2ff", "#bf5af2", "#ff375f"], ["#ffd60a", "#ff9f0a", "#ff375f"], ["#30d158", "#64d2ff", "#0a84ff"]] as const);
  tones.forEach((tone, i) => glow.addColorStop(i / 2, tone));
  type(job, pick(job.random, ["Introducing", "Say hello to", "Meet"]), S / 2, 120, { size: 34, family: UI, weight: 500, colour: "#a1a1a6", align: "center" });
  type(job, pick(job.random, ["Bubble Pro", "Goldfish 5", "Attention Max", "Feed Ultra"]), S / 2, 238, { size: 148, family: UI, weight: 700, colour: glow as unknown as string, align: "center", width: S - 120, spacing: -4 });
  type(job, pick(job.random, TECH_HEADS), S / 2, 884, { size: 40, family: UI, weight: 600, colour: "#f5f5f7", align: "center", width: S - 160 });
  type(job, `From $${pick(job.random, ["999", "20/mo.", "1,299", "0.01 per scroll"])}  ·  Pre-order Friday`, S / 2, 932, { size: 24, family: UI, colour: "#a1a1a6", align: "center" });
  type(job, "¹ Trade-in values vary. Subscription required for some features.", S / 2, 990, { size: 12, family: UI, colour: "#636366", align: "center" });
}

/** A feature grid ("bento"): rounded cards, each one figure or one photograph. */
function techBento(job: Job) {
  box(job, 0, 0, S, S, "#f5f5f7");
  type(job, pick(job.random, ["Get the highlights.", "Everything, everywhere.", "Take a closer look."]), 48, 96, { size: 62, family: UI, weight: 700, spacing: -1.4, width: S - 96 });
  const cards: [number, number, number, number, number][] = [[48, 130, 500, 300, 0], [564, 130, 412, 300, 1], [48, 446, 300, 260, 1], [364, 446, 300, 260, 2], [680, 446, 296, 260, 1], [48, 722, 412, 254, 2], [476, 722, 500, 254, 0]];
  const tints = ["#ffffff", "#000000", "#0a84ff", "#ffffff", "#1c1c1e", "#ffffff"];
  for (const [x, y, w, h, kind] of cards) {
    const tint = pick(job.random, tints);
    const dark = tint !== "#ffffff";
    box(job, x, y, w, h, tint, 30);
    if (kind === 0) {
      job.ctx.save();
      job.ctx.beginPath();
      job.ctx.roundRect(x, y, w, h, 30);
      job.ctx.clip();
      photograph(job, x, y, w, h, false);
      job.ctx.restore();
      type(job, pick(job.random, ["All-day attention.", "Pro camera system.", "Built to last."]), x + 24, y + h - 26, { size: 26, family: UI, weight: 700, colour: "#fff", width: w - 48 });
    } else if (kind === 1) {
      type(job, pick(job.random, ["Up to", "Over", "As low as"]), x + 24, y + 54, { size: 20, family: UI, colour: dark ? "#aeaeb2" : "#6e6e73" });
      type(job, pick(job.random, ["40-core", "18 hrs", "3x", "120Hz", "1B+", "99.9%"]), x + 22, y + h / 2 + 34, { size: 88, family: UI, weight: 700, colour: dark ? "#fff" : INK, width: w - 44, spacing: -2 });
      type(job, pick(job.random, ["neural engine", "battery life", "faster than before", "smoother scrolling", "weekly users", "uptime"]), x + 24, y + h - 34, { size: 21, family: UI, colour: dark ? "#aeaeb2" : "#6e6e73", width: w - 48 });
    } else {
      type(job, pick(job.random, ["Private by design.", "Works like magic.", "Now with AI.", "Always on."]), x + 24, y + 62, { size: 30, family: UI, weight: 700, colour: dark ? "#fff" : INK, width: w - 48 });
      for (let i = 0; i < 4; i += 1) {
        box(job, x + 24, y + 92 + i * 36, w - 48, 26, dark ? "rgba(255,255,255,0.14)" : "#e8e8ed", 13);
        box(job, x + 24, y + 92 + i * 36, (w - 48) * (0.3 + 0.7 * job.random()), 26, dark ? "#ffffff" : "#0a84ff", 13);
      }
    }
  }
}

/** A pricing page: three plans as cards, the middle one marked, ticks down each, small print beneath. */
function techPricing(job: Job) {
  box(job, 0, 0, S, S, "#ffffff");
  type(job, "Choose your plan", S / 2, 104, { size: 64, family: UI, weight: 700, align: "center", spacing: -1.4 });
  type(job, "Cancel anytime. Prices shown before tax.", S / 2, 142, { size: 20, family: UI, colour: "#6e6e73", align: "center" });
  const plans = [["Free", "$0"], ["Pro", "$20"], ["Max", "$200"]] as const;
  plans.forEach(([name, price], i) => {
    const x = 44 + i * 318;
    const w = 300;
    const best = i === 1;
    box(job, x, 186, w, 700, best ? "#000000" : "#f5f5f7", 32);
    const fg = best ? "#ffffff" : INK;
    const dim = best ? "#aeaeb2" : "#6e6e73";
    if (best) {
      box(job, x + 150, 204, 132, 34, "#0a84ff", 17);
      type(job, "Most popular", x + 216, 227, { size: 15, family: UI, weight: 700, colour: "#fff", align: "center" });
    }
    type(job, name, x + 26, 250, { size: 36, family: UI, weight: 700, colour: fg });
    type(job, price, x + 24, 350, { size: 88, family: UI, weight: 700, colour: fg, spacing: -3 });
    type(job, "/ month", x + 30 + price.length * 50, 350, { size: 20, family: UI, colour: dim });
    box(job, x + 26, 386, w - 52, 56, best ? "#ffffff" : "#000000", 28);
    type(job, i === 0 ? "Get started" : `Get ${name}`, x + w / 2, 421, { size: 21, family: UI, weight: 600, colour: best ? "#000" : "#fff", align: "center" });
    const perks = ["Limited access", "Standard speed", "Everything in Free", "5x more usage", "Priority access", "Early features", "Memory across chats", "Unlimited projects", "20x more usage", "Dedicated support", "Advanced research", "Longer context"];
    for (let k = 0; k < 8 + i * 2; k += 1) {
      const y = 492 + k * 38;
      if (y > 860) break;
      type(job, "✓", x + 28, y, { size: 20, family: UI, weight: 700, colour: best ? "#30d158" : "#0a84ff" });
      type(job, pick(job.random, perks), x + 58, y, { size: 19, family: UI, colour: fg, width: w - 84 });
    }
  });
  setLatin(job, TECH_BODY, 60, 910, S - 120, 100, 11.5, UI, "#86868b", 400, false);
}

/** A consent dialog over a picture test: "select all squares with…", real photographs in a grid, two buttons. */
function techConsent(job: Job) {
  box(job, 0, 0, S, S, "#e9e9ee");
  box(job, 150, 40, S - 300, 660, "#ffffff", 8);
  box(job, 166, 56, S - 332, 150, "#1a73e8");
  type(job, "Select all squares with", 190, 104, { size: 26, family: UI, colour: "#fff" });
  type(job, pick(job.random, ["attention", "a bubble", "the future", "something new", "hype"]), 190, 158, { size: 50, family: UI, weight: 700, colour: "#fff" });
  type(job, "If there are none, click skip", 190, 192, { size: 18, family: UI, colour: "#fff" });
  const cell = (S - 332 - 12) / 3;
  for (let j = 0; j < 3; j += 1) {
    for (let i = 0; i < 3; i += 1) {
      const x = 166 + i * (cell + 6);
      const y = 214 + j * (136 + 6);
      photograph(job, x, y, cell, 136, false);
      if (job.random() < 0.3) {
        job.ctx.fillStyle = "#1a73e8";
        job.ctx.beginPath();
        job.ctx.arc(x + 22, y + 22, 16, 0, Math.PI * 2);
        job.ctx.fill();
        type(job, "✓", x + 22, y + 30, { size: 22, family: UI, weight: 700, colour: "#fff", align: "center" });
      }
    }
  }
  box(job, S - 316, 646, 150, 44, "#1a73e8", 3);
  type(job, "VERIFY", S - 241, 676, { size: 20, family: UI, weight: 700, colour: "#fff", align: "center" });
  type(job, "↻   🎧   ⓘ", 176, 678, { size: 26, family: UI, colour: "#5f6368" });
  box(job, 40, 730, S - 80, 264, "#ffffff", 20);
  type(job, "We value your privacy", 76, 792, { size: 36, family: UI, weight: 700 });
  setLatin(job, TECH_BODY, 76, 812, S - 152, 84, 16.5, UI, "#3a3a3c", 400, false);
  box(job, 76, 916, 300, 54, "#000000", 27);
  type(job, "Accept all", 226, 950, { size: 21, family: UI, weight: 600, colour: "#fff", align: "center" });
  job.ctx.strokeStyle = "#000";
  job.ctx.lineWidth = 2;
  job.ctx.beginPath();
  job.ctx.roundRect(396, 916, 300, 54, 27);
  job.ctx.stroke();
  type(job, "Manage 1,284 partners", 546, 950, { size: 20, family: UI, weight: 600, align: "center" });
  type(job, "Reject", 760, 950, { size: 19, family: UI, colour: "#86868b" });
}

/** A "get the app" poster: a square code, star ratings, store badges, a notification stack. */
function techApp(job: Job) {
  const tone = pick(job.random, ["#0a84ff", "#5e5ce6", "#ff375f", "#30d158"]);
  box(job, 0, 0, S, S, tone);
  type(job, "Get the app.", 60, 150, { size: 124, family: UI, weight: 800, colour: "#fff", spacing: -3 });
  type(job, pick(job.random, ["Never miss a thing.", "Everything you love, faster.", "Scroll smarter."]), 64, 206, { size: 34, family: UI, colour: "rgba(255,255,255,0.9)" });
  matrixCode(job, 90, 290, 330);
  type(job, "Scan to download", 255, 672, { size: 24, family: UI, weight: 600, colour: "#fff", align: "center" });
  type(job, "★★★★★", 255, 730, { size: 44, family: UI, colour: "#ffd60a", align: "center" });
  type(job, `4.9 · ${1 + Math.floor(job.random() * 9)}.${digits(job, 1)}M ratings`, 255, 766, { size: 22, family: UI, colour: "#fff", align: "center" });
  for (let i = 0; i < 5; i += 1) {
    const y = 290 + i * 104;
    box(job, 500, y, 470, 90, "rgba(255,255,255,0.94)", 24);
    job.ctx.save();
    job.ctx.beginPath();
    job.ctx.roundRect(516, y + 15, 60, 60, 14);
    job.ctx.clip();
    photograph(job, 516, y + 15, 60, 60, false);
    job.ctx.restore();
    type(job, pick(job.random, ["Trending now", "Someone liked your post", "You have 12 new updates", "Don't miss out", "Your weekly report", "Back in stock"]), 592, y + 40, { size: 21, family: UI, weight: 700, width: 300 });
    type(job, pick(job.random, ["Tap to see what everyone is watching.", "See who's talking about it.", "Screen time is up 34% this week.", "Only 2 left at this price."]), 592, y + 68, { size: 17, family: UI, colour: "#3a3a3c", width: 360 });
    type(job, pick(job.random, ["now", "2m", "9m", "1h"]), 952, y + 38, { size: 15, family: UI, colour: "#8e8e93", align: "right" });
  }
  for (let i = 0; i < 2; i += 1) {
    box(job, 90 + i * 250, 850, 230, 76, "#000000", 14);
    type(job, i === 0 ? "Download on the" : "GET IT ON", 110 + i * 250, 880, { size: 14, family: UI, colour: "#fff" });
    type(job, i === 0 ? "App Shop" : "Play Market", 110 + i * 250, 910, { size: 28, family: UI, weight: 600, colour: "#fff" });
  }
  type(job, "Requires an account. Data rates may apply. Notifications can be turned off in Settings, eventually.", S / 2, 986, { size: 14, family: UI, colour: "rgba(255,255,255,0.8)", align: "center", width: S - 80 });
}

// ── The sheets ──────────────────────────────────────────────────────────────────────────────────────────

type Sheet = { paint: (job: Job) => void; press: Press; paper: readonly [number, number, number] | readonly (readonly [number, number, number])[] };

const NEWSPRINT = [233, 228, 214] as const;
const WHITE = [255, 255, 255] as const;
const COPY_STOCK = [[255, 238, 60], [255, 150, 200], [150, 240, 150], [250, 250, 245], [255, 170, 80]] as const;

/** By 방향, in the order of the layers: four 신문, four 잡지, four 전단 (PRINT_KINDS). */
const SHEETS: readonly (readonly Sheet[])[] = [
  [
    { paint: koDaily, press: "news", paper: NEWSPRINT },
    { paint: koClassified, press: "news", paper: [238, 232, 216] },
    { paint: koDaily, press: "news", paper: NEWSPRINT },
    { paint: koSports, press: "news", paper: [236, 232, 222] },
    { paint: koWeekly, press: "gloss", paper: WHITE },
    { paint: koWeekly, press: "gloss", paper: WHITE },
    { paint: koWeekly, press: "gloss", paper: WHITE },
    { paint: koWeekly, press: "gloss", paper: WHITE },
    { paint: koMart, press: "cheap", paper: [252, 252, 248] },
    { paint: koMenu, press: "cheap", paper: [252, 252, 248] },
    { paint: koMart, press: "cheap", paper: [252, 252, 248] },
    { paint: koMenu, press: "cheap", paper: [252, 252, 248] },
  ],
  [
    { paint: nyBroadsheet, press: "news", paper: [236, 232, 220] },
    { paint: nyTabloid, press: "news", paper: [236, 232, 222] },
    { paint: nyBroadsheet, press: "news", paper: [236, 232, 220] },
    { paint: nyAgate, press: "news", paper: [236, 232, 220] },
    { paint: nyWeekly, press: "gloss", paper: WHITE },
    { paint: nyWeekly, press: "gloss", paper: WHITE },
    { paint: nyWeekly, press: "gloss", paper: WHITE },
    { paint: nyWeekly, press: "gloss", paper: WHITE },
    { paint: nyTearOff, press: "xerox", paper: COPY_STOCK },
    { paint: nyTakeout, press: "cheap", paper: [252, 252, 248] },
    { paint: nyGig, press: "cheap", paper: [250, 248, 240] },
    { paint: nyTearOff, press: "xerox", paper: COPY_STOCK },
  ],
  [
    { paint: techNewsroom, press: "laser", paper: WHITE },
    { paint: techTerms, press: "laser", paper: WHITE },
    { paint: techCharts, press: "laser", paper: WHITE },
    { paint: techTerms, press: "laser", paper: WHITE },
    { paint: techHero, press: "gloss", paper: WHITE },
    { paint: techBento, press: "gloss", paper: WHITE },
    { paint: techHero, press: "gloss", paper: WHITE },
    { paint: techBento, press: "gloss", paper: WHITE },
    { paint: techPricing, press: "gloss", paper: WHITE },
    { paint: techConsent, press: "gloss", paper: WHITE },
    { paint: techApp, press: "gloss", paper: WHITE },
    { paint: techPricing, press: "gloss", paper: WHITE },
  ],
];

/** One sheet of a 방향, painted and pressed on `canvas`. */
export function paintSheet(canvas: OffscreenCanvas, region: number, layer: number, photos: readonly ImageBitmap[], random: () => number) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const sheet = SHEETS[Math.min(SHEETS.length - 1, Math.max(0, region))]![layer % SHEET_COUNT]!;
  const paper = (typeof sheet.paper[0] === "number" ? sheet.paper : pick(random, sheet.paper as readonly (readonly [number, number, number])[])) as readonly [number, number, number];
  let next = Math.floor(random() * photos.length);
  const job: Job = {
    ctx,
    size: S,
    random,
    photo: () => photos[(next += 1 + Math.floor(random() * 3)) % photos.length]!,
    screens: [],
    press: sheet.press,
    paper,
  };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.shadowColor = "transparent";
  ctx.fillStyle = sheet.press === "xerox" ? "#ffffff" : css(paper);
  ctx.fillRect(0, 0, S, S);
  sheet.paint(job);
  press(job);
}

