// The rules as questions. Each place where simulation/2 leaves bubble/9 is one question; the first answer is always
// bubble/9's way. A version is one answer to every question, so going between versions is choosing a row, and any
// mix is a row with one answer changed. The 시스템 panel is drawn from these tables; loop/frame-loop.ts reads the
// answers (`System`) each frame. To add an answer: its label here and its case where the question is read.

/** The answers in use: per question the index of its answer (0: bubble/9's), and the amounts. */
export type System = {
  /** Whether a bubble's quality wanders by itself (raft.ts `own.drift`). */
  drift: number;
  /** Whether bubbles come by themselves (raft.ts `own.arrivals`). 1: a finger drawn across the field lays them. */
  arrivals: number;
  /** What a watched bubble changes to (rules/bubbles.ts). */
  adopt: number;
  /** What a goldfish tires of (fish/attention.ts). */
  tire: number;
  /**
   * With `drift` 1, what moves the raft in the dice's place is bubble/6's own cycle — a bubble that holds too much
   * tires, bursts and recovers — and the goldfish. Its three amounts, all bubble/9's own controls, set here because
   * bubble/9's values for them (80, 10 s, 0) were tuned with the dice on and still the raft without it
   * (simulation/docs/2.md): `burstAt` a bubble tires above this many fair shares (네트워크 → 터지는 크기);
   * `recovery` seconds over which it recovers (회복); `perFish` how far each goldfish's watching counts by itself
   * (금붕어 → 무리 크기 반영).
   */
  burstAt: number;
  recovery: number;
  perFish: number;
  /** How much a goldfish's own disposition counts in what it goes to; 0: not at all (bubble/9). */
  taste: number;
  /** A stroke's bubble comes in this many fair shares large, and with this much appeal (log quality; 전파's newcomers had 1.5). */
  strokeSize: number;
  strokeQuality: number;
};

type Choice = "drift" | "arrivals" | "adopt" | "tire";
export type Question = { key: Choice; section: "bubble" | "fish" | "stroke"; label: string; answers: readonly string[] };

export const SECTIONS = [
  { id: "bubble", title: "버블" },
  { id: "fish", title: "금붕어" },
  { id: "stroke", title: "관객의 획" },
] as const;

export const QUESTIONS: readonly Question[] = [
  { key: "drift", section: "bubble", label: "버블의 품질", answers: ["혼자 요동 (주사위)", "금붕어가 볼 때만 오름"] },
  { key: "adopt", section: "bubble", label: "버블이 바뀔 때 무엇으로", answers: ["제 다음 오브제", "방울을 가장 많이 보내는 이웃의 기질과 오브제"] },
  { key: "tire", section: "fish", label: "금붕어가 질리는 것", answers: ["본 버블 하나", "본 기질 (같은 기질의 버블 전부)"] },
  { key: "arrivals", section: "stroke", label: "새 버블", answers: ["저절로도 생김", "획에서만"] },
];

const BUBBLE_NINE: System = { drift: 0, arrivals: 0, adopt: 0, tire: 0, taste: 0, burstAt: 50, recovery: 30, perFish: 1, strokeSize: 1, strokeQuality: 2 };
/** 2026-11-25 (simulation/docs/2.md): the circulation is bubble/9's; dispositions decide where it goes. */
const DISPOSITIONS: System = { drift: 1, arrivals: 1, adopt: 1, tire: 1, taste: 1, burstAt: 50, recovery: 30, perFish: 1, strokeSize: 1, strokeQuality: 2 };

export const VERSIONS: readonly { id: string; label: string; system: System }[] = [
  { id: "bubble-9", label: "bubble/9", system: BUBBLE_NINE },
  { id: "dispositions", label: "기질", system: DISPOSITIONS },
];

/** What the route opens on. */
export const SYSTEM_OPENING: System = DISPOSITIONS;

/** Whether `system` answers every question, and has the taste, of `version`. */
export function sameSystem(system: System, version: System) {
  for (const question of QUESTIONS) if (Math.round(system[question.key]) !== version[question.key]) return false;
  return system.taste > 0 === version.taste > 0;
}
