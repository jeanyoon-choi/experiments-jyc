import { both } from "./text.ts";
import type { Hypothesis } from "./types.ts";

const EAAS = "eaas-proposal";
const N1115 = "notes-2026-11-15-heterogenous-simulation";
const N1118 = "notes-2026-11-18-algorithm-pop-art";
const N1123 = "notes-2026-11-23-how-to-create-a-bubble";

// What is not yet known about the system. Each is tied to the parts it is
// about. An agent may add evidence and move a state as far as "awaiting";
// "supported" and "rejected" are the artist's, with the date they said it.
export const HYPOTHESES: Hypothesis[] = [
  {
    id: "input-device",
    question: both("관객은 무엇으로 버블을 만드는가: 모바일인가, 화면 밖의 몸짓인가?", "With what does the audience make a bubble: a mobile, or a gesture beyond the screen?"),
    state: "open",
    about: ["audience-input", "hold", "input"],
    claims: [
      {
        text: "(Mobile)이 Best? Pros: Semantic, Conceptually 딱 맞게 (CRM Application?: Platform / Algorithm Owner니). Cons: Less Fun. Less Sci-Fi Like",
        note: N1123,
        where: "다이어그램 2",
        confidence: "transcribed",
      },
      {
        text: "Bubble Shot. Finger Skating?! Create a Map.",
        note: N1123,
        where: "다이어그램 3",
        confidence: "transcribed",
      },
      {
        text: "Mobile → [Corporate App] Salesforce? CRM? [Management] → [New Campaign]",
        note: N1118,
        where: "①",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "feedback-content",
    question: both("Goldfish Mobiles에서 메인 스크린으로 무엇이 돌아오는가?", "What comes back from the Goldfish Mobiles to the main screen?"),
    state: "open",
    about: ["feedback", "goldfish-mobiles"],
    claims: [
      {
        text: "Goldfish Either → Creates New Website / Navigates Within Website ⇅ (Not Pure Free Will) ⇅ Feedback.",
        note: "notes-2026-11-06-goldfishes",
        where: "Agent",
        confidence: "transcribed",
      },
      {
        text: "② Feedback loop 어떻게 설계?",
        note: "notes-2026-11-06-goldfishes",
        where: "다이어그램 3",
        confidence: "transcribed",
      },
    ],
    next: both("양방향 프로토콜 (feed/2). 무엇을 돌려보낼지가 먼저 정해져야 한다.", "A two-way protocol (feed/2). What is sent back has to be settled first."),
  },
  {
    id: "result-threshold",
    question: both("무엇이 Legacy Media에 드러나는가: F는 무엇이고, 문턱은 어디인가?", "What shows on the Legacy Media: what is F, and where is the threshold?"),
    state: "open",
    about: ["result", "legacy-output"],
    claims: [
      {
        text: "특정 키워드 분포 / Density가 Threshold 이상 넘으면. → 그걸 조망하는 Everyday Interface",
        note: N1118,
        where: "다이어그램 1",
        confidence: "transcribed",
      },
      {
        text: "전체 Bubble + Goldfish System 이 어떤 State에 있는지도 중요 — Steady / 뒤죽박죽 / 대세가 바뀌는 中 / 지각 변동. → 이 역시 굉장히 중요한 [아웃풋 평가 변수]",
        note: N1115,
        where: "Social Science / Social Study",
        confidence: "transcribed",
      },
    ],
    evidence: [
      {
        text: both("화면의 상태를 수치로 가르는 것은 이미 있다: 안정 · 전환 · 난리 · 흔들림. 문턱은 첫 짐작 그대로다.", "Telling the screen's state apart by numbers already exists: 안정 · 전환 · 난리 · 흔들림. Its thresholds are still first guesses."),
        file: "components/screen/simulation/0/measure.ts",
      },
    ],
  },
  {
    id: "cognitive-legible",
    question: both("관객이 결과 화면을 보고 자기 손짓의 결과임을 곧바로 알 수 있는가?", "Can the audience see at once, on the result screens, that this came of their own gesture?"),
    state: "open",
    about: ["cognitive", "legacy-output", "audience"],
    claims: [
      {
        text: "FEEDBACK (인지적). ⇒ 이게 직관적으로 되기 위해서?",
        note: N1123,
        where: "다이어그램 2",
        confidence: "transcribed",
      },
      {
        text: "Dynamic-Dynamic, Complex System, Self-Evolving [Yet] 어느정도 직관적, Interaction 자체의 (Semantic & Phenomenological) 재미. 어느정도 Controllability.",
        note: N1118,
        where: "플랫폼 경제의 형태로 Metaphor",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "rules-or-drawing",
    question: both("M9가 지루한 것은 규칙 때문인가, 그려진 방식 때문인가?", "Is M9 dull because of its rules, or because of how it was drawn?"),
    state: "open",
    about: ["gb-screen"],
    claims: [
      {
        text: "The question: is the dullness in the rules or in how they were drawn?",
        note: "simulation-0",
        where: "Next 1",
        confidence: "agent",
      },
    ],
    evidence: [
      {
        text: both("M8.2부터는 거의 같은 크기의 버블 60–75개다. bubble/9는 아주 큰 오브제 몇에 작은 것 수백이고 입력 없이도 5–10초마다 다시 짜인다. 관찰이지 원인은 아니다.", "From M8.2 on there are 60–75 bubbles of nearly one size. bubble/9 has a few very large objects among hundreds of small ones and recomposes itself every 5–10 s with no input. An observation, not a cause."),
        route: "screen/simulation/0",
      },
    ],
    next: both("simulation/1: 같은 규칙을 bubble의 몸 아래에.", "simulation/1: the same rules under bubble's body."),
  },
  {
    id: "rest-without-input",
    question: both("입력이 없으면 메인 스크린은 쉬어야 하는가?", "With no input, should the main screen rest?"),
    state: "open",
    about: ["gb-screen", "input"],
    claims: [
      {
        text: "With no input the screen rests; an input changes the flow.",
        note: "direction",
        where: "Principles",
        confidence: "own",
      },
      {
        text: "Undecided, the artist's to settle: whether \"with no input the screen rests\" holds for this family too (bubble/9 never rests, and that is part of why it looks better).",
        note: "simulation-0",
        where: "Next",
        confidence: "agent",
      },
    ],
    evidence: [
      {
        text: both("M9는 입력 없이 3분 동안 91–96% 가만히 있고, 금붕어는 150마리에서 23–26마리로 준다.", "M9 is still for 91–96% of three minutes without input, and its fish fall from 150 to 23–26."),
        route: "screen/simulation/0",
      },
    ],
  },
  {
    id: "differing-agents",
    question: both("금붕어가 서로 다르기만 해도 여러 키워드가 나란히 사는가?", "Is it enough that goldfish differ for several keywords to live side by side?"),
    state: "open",
    about: ["g-vector", "rapid", "gb-screen"],
    claims: [
      {
        text: "우리가 해야하는것: Heterogenous, 각 Goldfish/Bubble 에 일종의 기질이 있어서",
        note: N1115,
        where: "핵심 정리",
        confidence: "own",
      },
      {
        text: "whether \"agents that differ\" is read rightly as different values entering the same single objective, not more rules (correction 3: \"기질 시스템을 덧붙이지 않는다\").",
        note: "simulation-0",
        where: "Next",
        confidence: "agent",
      },
    ],
    evidence: [
      {
        text: both("베끼기만으로는 조용한 공존이 0–2%였다 (voter model).", "With copying alone, quiet coexistence was 0–2% of the time (the voter model)."),
        file: "docs/direction.md",
      },
    ],
    next: both("simulation/1 다음: 금붕어부터, 기질이 하나뿐인 목적 안으로 들어가는 방식으로.", "After simulation/1: fish first, with the disposition entering the one objective."),
  },
  {
    id: "semantic-rate",
    question: both("느린 Semantic 층은 결정에 얼마나, 얼마나 천천히 스며드는가?", "How much, and how slowly, does the slow Semantic layer enter a decision?"),
    state: "open",
    about: ["g-semantic", "b-semantic", "semantic-interaction", "g-loop", "b-loop"],
    claims: [
      {
        text: "나중에 AI-in-the-Loop 로 [Involve 해야]. ↓ Decision에 얼마나 반영? 얼마나 천천히 Propagate?",
        note: N1115,
        where: "총체적인 재고려",
        confidence: "transcribed",
      },
      {
        text: "Algorithmic Level: Fast, 즉각적 — 이것만 디자인하면 진정한 Agentic & Dynamic 만들 수 없어. Semantic Level: Slow.",
        note: N1115,
        where: "Algorithmic Level / Semantic Level",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "coordinates",
    question: both("메인 스크린 안의 좌표에 의미가 있는가?", "Does a position on the main screen mean anything?"),
    state: "open",
    about: ["gb-screen", "legacy-output"],
    claims: [
      {
        text: "또한 주어진 화면 내의 좌표? 에 의미가 있는가? 아직 의미 있는지, 없는지는 불명확, TBD",
        note: N1115,
        where: "핵심 정리",
        confidence: "own",
      },
    ],
  },
  {
    id: "extreme",
    question: both("끝은 어디로 가는가: 상전이, 터짐, 탈출은 지금의 구조 어디에 있는가?", "Where does it end: where in the present structure are the phase transition, the bursting, the escape?"),
    state: "open",
    about: ["gb-screen", "audience"],
    claims: [
      {
        text: "when this acceleration continues and the flux of information passes beyond a certain threshold, a phase transition occurs. … Eventually, the goldfishes escape this distorted aquarium",
        note: EAAS,
        where: "II. Artwork Experience Design",
        confidence: "own",
      },
      {
        text: "Take it to the Extreme. ① 버블들이 다 터진다던지 ② 버블이 완전 커져서 화면 전체를 채우고, 숨 쉴 공간 없는 금붕어는 질식한다던지 ③ 금붕어들이 각성",
        note: N1115,
        where: "Social Science / Social Study",
        confidence: "transcribed",
      },
      {
        text: "Black Swan에 취약, [굉장히 Fragile 함]. 이 Fragility가 (Emergence) 상전이를 통해 모델링.",
        note: N1123,
        where: "다이어그램 1",
        confidence: "transcribed",
      },
    ],
  },
];
