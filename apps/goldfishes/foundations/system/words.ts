import { both } from "./model/text.ts";
import type { Confidence, HypothesisState, Status, Text } from "./model/index.ts";

// The page's own words, in both languages.

export const STATUS: Record<Status, Text> = {
  working: both("작동", "Working"),
  partial: both("일부", "Partial"),
  none: both("노트에만", "In the notes only"),
  undecided: both("미정", "Undecided"),
};

export const STATE: Record<HypothesisState, Text> = {
  open: both("열림", "Open"),
  testing: both("시험 중", "Testing"),
  awaiting: both("판정 대기", "Awaiting the artist"),
  supported: both("지지", "Supported"),
  rejected: both("기각", "Rejected"),
};

export const CONFIDENCE: Record<Confidence, Text> = {
  own: both("작가의 글", "The artist's own text"),
  transcribed: both("손글씨 판독, 부정확", "Read from handwriting, unreliable"),
  agent: both("에이전트의 해석", "An agent's reading"),
};

export const WORDS = {
  relations: both("관계", "Relations"),
  built: both("구현", "Built"),
  questions: both("질문", "Questions"),
  notes: both("노트", "Notes"),
  code: both("지금의 코드", "The code today"),
  open: both("열린 질문", "Open questions"),
  elsewhere: both("다른 버전에서", "In other versions"),
  about: both("무엇에 대한 질문인가", "What it is about"),
  seen: both("지금까지 본 것", "Seen so far"),
  next: both("다음 실험", "Next experiment"),
  carries: both("무엇이 지나가는가", "What passes"),
  log: both("기록", "Log"),
  references: both("참고 (따라 할 것이 아니라 볼 것)", "References (to look at, not to follow)"),
  changed: both("에서 바뀐 것", ": what changed since"),
  now: both("지금", "now"),
  question: both("질문", "Question"),
  human: both("사람을 거치는 관계", "Through a person"),
  computed: both("시스템이 하는 관계", "Done by the system"),
  versions: both("버전", "Versions"),
  view: both("보기", "View"),
  white: both("흰 배경", "White"),
  black: both("검은 배경", "Black"),
} satisfies Record<string, Text>;
