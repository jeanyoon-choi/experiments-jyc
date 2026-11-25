// The rules as questions. Each place where a decision is made is one question with a few answers; the first answer
// is always bubble/9's way. A version is one answer to every question — a row of VERSIONS — so going between versions
// is choosing a row, and any mix is a row with one answer changed. The 시스템 panel is drawn from these two tables;
// rules/apply.ts hands the answers to the raft. What an answer does is where it is read (noted at each question);
// the three with more than two answers, or that are new, have their own files here (supply.ts, scale.ts, attach.ts).
//
// To add an answer: add its label here and its case where the question is read. To add a version: add a row.

/** The answers in use: per question, the index of its answer (0: bubble/9's). */
export type Choices = {
  /** Where a bubble sends its portions (raft.ts linkContacts; web/model.ts discovery). */
  contacts: number;
  /** The size a bubble's appeal is measured by (web/model.ts `visible`). */
  visible: number;
  /** Where the share every bubble loses each beat goes (supply.ts). */
  spread: number;
  /** Whether quality wanders by itself (web/model.ts volatility). */
  noDrift: number;
  /** Whether bubbles come by themselves (web/model.ts growth). */
  noArrivals: number;
  /** What a watched bubble changes to (loop/frame-loop.ts, raft.ts appealCrosses). */
  adopt: number;
  /** How large the whole raft is (scale.ts). */
  scale: number;
  /** When a goldfish takes a bubble (attach.ts, read in fish/attention.ts). */
  attach: number;
};

export type Question = { key: keyof Choices; section: "bubble" | "fish" | "stroke"; label: string; answers: readonly string[] };

export const SECTIONS = [
  { id: "bubble", title: "버블" },
  { id: "fish", title: "금붕어" },
  { id: "stroke", title: "관객의 획" },
] as const;

export const QUESTIONS: readonly Question[] = [
  { key: "contacts", section: "bubble", label: "방울을 보내는 곳", answers: ["화면 어디든", "맞닿은 버블만"] },
  { key: "visible", section: "bubble", label: "옆 버블의 매력을 재는 크기", answers: ["가라앉은 순위", "지금 보이는 크기"] },
  { key: "spread", section: "bubble", label: "매 박자 잃는 15%가 가는 곳", answers: ["화면 전체에 고르게", "맞닿은 버블에게", "잃지 않음", "금붕어가 보는 버블에게"] },
  { key: "scale", section: "bubble", label: "라프트 전체의 크기", answers: ["늘 같음", "붙은 금붕어 수만큼"] },
  { key: "noDrift", section: "bubble", label: "품질 (요동의 세기는 네트워크 → 품질 요동)", answers: ["혼자 요동", "금붕어가 볼 때만"] },
  { key: "adopt", section: "bubble", label: "버블이 바뀔 때 무엇으로", answers: ["아무 오브제", "이웃의 오브제", "이웃의 오브제와 매력"] },
  { key: "attach", section: "fish", label: "버블에 붙는 때", answers: ["가장 끌리는 것에 늘", "멀리서도 보고, 끌릴 때만 (폐기)", "닿은 것 중 덜 질린 것에, 끌릴 때만"] },
  { key: "noArrivals", section: "stroke", label: "새 버블 (저절로 생기는 속도는 네트워크 → 새 페이지)", answers: ["저절로도 생김", "획에서만"] },
];

const BUBBLE_NINE: Choices = { contacts: 0, visible: 0, spread: 0, noDrift: 0, noArrivals: 0, adopt: 0, scale: 0, attach: 0 };
/** 2026-11-24/25: bubble/9 with its decisions made local (simulation/docs/agent-model-proposal.md). */
const AGENTS_ONE: Choices = { contacts: 1, visible: 1, spread: 1, noDrift: 1, noArrivals: 1, adopt: 2, scale: 0, attach: 0 };
/** 2026-11-25: a bubble's size comes from the goldfish that watch it; a goldfish is held only by what is worth it. */
const AGENTS_TWO: Choices = { ...AGENTS_ONE, spread: 3, scale: 1, attach: 1 };

/**
 * 2026-11-25, agreed with the artist (simulation/docs/conditions.md §4): a goldfish is held only by a bubble it
 * touches and tires of the objects it has watched; a bubble's area is the attention it has been given and not yet lost.
 */
const AGENTS_THREE: Choices = { ...AGENTS_TWO, attach: 2 };

export const VERSIONS: readonly { id: string; label: string; choices: Choices }[] = [
  { id: "bubble-9", label: "bubble/9", choices: BUBBLE_NINE },
  { id: "agents-1", label: "에이전트 1", choices: AGENTS_ONE },
  // Discarded by the artist on 2026-11-25 (simulation/docs/1.md): kept as the record, not to be built on.
  { id: "agents-2", label: "에이전트 2 (폐기)", choices: AGENTS_TWO },
  { id: "agents-3", label: "에이전트 3", choices: AGENTS_THREE },
];

/** What the route opens on. */
export const OPENING_CHOICES: Choices = AGENTS_THREE;

/** Whether `model` answers every question as `choices` does. */
export function sameChoices(model: Choices, choices: Choices) {
  for (const question of QUESTIONS) if (Math.round(model[question.key]) !== choices[question.key]) return false;
  return true;
}
