// The consultations the academy interrupts with. `pitch` is the academy's own
// way of putting it, cheating in the language of an education-innovation
// brochure (invented copy). `fact` is one measure the government announced on
// 2026-11-17 for the 2027학년도 수능, or one thing reported from the exam on
// 2026-11-19, stated as it was reported (sources in the experiment note): it
// names what is checked, not a way round it.

export type Counsel = { pitch: string; topic: string; fact: string };

/** Sittings bought between one pop-up and the next. */
export const EVERY = 40;

export const COUNSELS: readonly Counsel[] = [
  {
    pitch: "4차 산업혁명의 혁신적 방식으로 수능을 봅니다",
    topic: "단추 스티커 대비반",
    fact: "수능 당일 옷의 모든 단추에 스티커를 붙입니다",
  },
  {
    pitch: "자기주도 학습을 넘어, AI주도 학습으로",
    topic: "안경 전수 점검 대비반",
    fact: "1교시 전 안경을 책상에 내려놓고, 매 교시 다시 검사합니다",
  },
  {
    pitch: "미래형 인재는 외우지 않습니다. 연결합니다",
    topic: "위급재난문자 대비반",
    fact: "08:30 · 14:21 · 14:57, 수신 거부가 안 되는 문자가 세 번 울립니다",
  },
  {
    pitch: "초연결 시대의 시험장은 교실 밖에 있습니다",
    topic: "신호 탐지 대비반",
    fact: "와이파이·블루투스 신호 탐지 감독관이 시험장을 돕니다",
  },
  {
    pitch: "웨어러블 에듀테크로 완성하는 실전 감각",
    topic: "소매·옷깃 검사 대비반",
    fact: "시계를 볼 때 양 소매를 걷고 옷깃과 단추까지 확인합니다",
  },
  {
    pitch: "디지털 대전환, 손으로 푸는 수험생만 남겨집니다",
    topic: "화장실 동선 컨설팅",
    fact: "복도감독관이 화장실 가는 수험생을 휴대용 스캐너로 검사합니다",
  },
];

/**
 * What 신청하기 sells, one after another: each press bills its tier and the
 * button becomes the next. The last stays for as long as it is pressed. Fees
 * are ones reported for 대치·강남 admissions consulting.
 */
export const TIERS = [
  { name: "기본", unit: "80분", price: 400_000, upsell: "지금 신청하면 자리가 있습니다" },
  { name: "심화", unit: "1회", price: 550_000, upsell: "기본만으로는 불안하시죠" },
  { name: "프리미엄", unit: "10회", price: 2_200_000, upsell: "상위 1%는 여기서부터 시작합니다" },
  { name: "VVIP", unit: "10시간", price: 3_000_000, upsell: "마지막 한 자리 남았습니다" },
] as const;
