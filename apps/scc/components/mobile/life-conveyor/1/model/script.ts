// The scripted Korean life course: what each person is told, at what age, on the way to a hospital single room.
// Lines are this experiment's own; the conveyor itself is the critique — everyone hears the same line at the same place.

export type Sex = "m" | "f";

export type Situation = {
  sex: Sex;
  married: boolean;
  children: number;
  random: () => number;
};

export type Cue = { age: number; line: (situation: Situation) => string | null };

const always = (text: string) => () => text;

export const script: readonly Cue[] = [
  { age: 1, line: ({ random }) => (random() < 0.7 ? "돌잡이: 청진기" : "돌잡이: 판사봉") },
  { age: 4, line: always("영어유치원 대기 37번") },
  { age: 7, line: always("학원 네 군데") },
  { age: 9, line: always("초등 의대반 레벨테스트") },
  { age: 12, line: always("고등 수학 선행 끝") },
  { age: 15, line: always("자사고 입시 컨설팅") },
  { age: 17, line: always("내신 1.3등급") },
  { age: 18, line: always("수능") },
  { age: 19, line: ({ random }) => (random() < 0.55 ? "인서울" : "재수") },
  { age: 20.5, line: ({ sex }) => (sex === "m" ? "입대" : null) },
  { age: 23, line: always("토익 905 · 자격증 3") },
  { age: 25, line: always("자소서 41번째") },
  { age: 27, line: ({ random }) => (random() < 0.8 ? "취업" : "공시 3수") },
  { age: 30, line: ({ married }) => (married ? null : "결혼은 언제 하니?") },
  { age: 31, line: ({ married }) => (married ? "전세대출 승인" : null) },
  { age: 34, line: ({ married, children }) => (!married ? null : children > 0 ? "육아휴직은 눈치껏" : "애는 언제 낳니?") },
  { age: 36, line: always("청약 탈락 14번째") },
  { age: 38, line: ({ children }) => (children > 0 ? "애 학원비 월 210" : null) },
  { age: 40, line: always("승진: 과장") },
  { age: 45, line: always("부장 승진 누락") },
  { age: 49, line: always("희망퇴직 권유") },
  { age: 51, line: always("치킨집 창업") },
  { age: 54, line: always("치킨집 폐업") },
  { age: 58, line: always("노후 준비") },
  { age: 60, line: always("은퇴") },
  { age: 63, line: always("국민연금 월 62만원") },
  { age: 66, line: ({ children }) => (children > 0 ? "손주 등하원" : null) },
  { age: 70, line: always("실손보험 갱신") },
  { age: 74, line: always("건강검진 재검") },
  { age: 78, line: always("요양병원 상담") },
  { age: 83, line: always("1인실 대기") },
];

export const marriageLine = "결혼 · 예식 40분";
export const birthLine = (sex: Sex) => (sex === "m" ? "아들입니다" : "딸입니다");
export const widowLine = "사별";
export const deathLine = (age: number) => (age >= 60 ? "대학병원 1인실, 준비 완료" : "아직 대출이 남았는데");
export const centuryLine = "준비만 하다 끝났네";
