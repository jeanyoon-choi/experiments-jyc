import { both } from "./text.ts";
import type { SystemNode } from "./types.ts";

const EAAS = "eaas-proposal";
const N1020 = "notes-2026-10-20-goldfishes";
const N1023 = "notes-2026-10-23-goldfishes";
const N1115 = "notes-2026-11-15-heterogenous-simulation";
const N1118 = "notes-2026-11-18-algorithm-pop-art";
const N1123 = "notes-2026-11-23-how-to-create-a-bubble";

// The devices and the people. A node keeps its id through every version it is
// in, so the page can show what a part used to be called.
export const NODES: SystemNode[] = [
  {
    id: "audience",
    kind: "audience",
    label: "Audiences",
    role: both(
      "버블을 만드는 사람들. 플랫폼·알고리즘의 주인 자리에 있지만 전체를 통제하지 못한다.",
      "The people who make bubbles. They sit where a platform's or an algorithm's owner sits, and do not control the whole.",
    ),
    claims: [
      {
        text: "(Algorithm / Platform Owner? — But DOES NOT fully Control Platforms)",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
      {
        text: "나는 금붕어에게 먹이를 주는 줄 알았는데.. 먹이를 주다보니, 나도 결국 '금붕어'가 되어 있었다!",
        note: N1023,
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "audience-input",
    kind: "mobile",
    label: both("[0] 입력 장치 — Mobile? More-than-Screen?", "[0] Input device — Mobile? More-than-Screen?"),
    role: both(
      "관객이 새 버블을 만드는 손. 새것은 여기서만 들어온다.",
      "The hand with which the audience makes a new bubble. Anything new enters here and nowhere else.",
    ),
    claims: [
      {
        text: "Audience + [?] → Bubble : Through Whatever Device... (BCI? Mobile?)",
        note: N1123,
        where: "다이어그램 2",
        confidence: "transcribed",
      },
      {
        text: "Mobile / More-than-Screen. 두 옵션을 동시에 고려하고 있어야..",
        note: N1123,
        where: "Finger Skating",
        confidence: "transcribed",
      },
      {
        text: "(M) — What will be Mobile Interface & Interaction? ↳ 금붕어에게 먹이주는 방법? 버블을 만들어내는 방법!",
        note: N1118,
        where: "다이어그램 3",
        confidence: "transcribed",
      },
      {
        text: "버블은. 500개 정도 만들 수 있어야 한다.",
        note: N1118,
        where: "Bubble을 어떻게 새로 만드는가?",
        confidence: "transcribed",
      },
    ],
    status: "none",
    built: [
      {
        text: both(
          "관객용 라우트가 없다. components/mobile/ (keyword-grid 1–2)은 2026-11-13에 지워졌다.",
          "There is no route for the audience. components/mobile/ (keyword-grid 1–2) was removed on 2026-11-13.",
        ),
        file: "docs/README.md",
      },
      {
        text: both(
          "simulation/0에서는 메인 화면 위에 손가락으로 긋는 획이 이 입력을 대신한다. 획 하나가 키워드 하나.",
          "In simulation/0 a finger drawn across the main screen stands in for this input. One stroke is one keyword.",
        ),
        route: "screen/simulation/0",
      },
    ],
  },
  {
    id: "gb-screen",
    kind: "gb-screen",
    label: "[1] G-B Dynamics",
    role: both(
      "메인 스크린. 금붕어(G)와 버블(B)이 각자 눈앞만 보고 움직이는 곳. 나머지 장치는 모두 여기에 이어진다.",
      "The main screen. Goldfish (G) and bubbles (B) each act on what is in front of them. Every other device is tied to this one.",
    ),
    claims: [
      {
        text: "[1] G-B Dynamics",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
      {
        text: "두개의 에이전트 (버블, 금붕어) 가 거시적인 목표 없이, 눈 앞의 (도파민, 이익)을 쫓으며 myopic/local optimisation. 이 에이전트들 간의 Feedback Loop 로 부터 창발성, Complex System",
        note: "notes-2026-11-06-goldfishes",
        where: "핵심 정리",
        confidence: "own",
      },
      {
        text: "앞선 Bubble/9 계열의 실험들은 그냥 Pagerank 알고리즘 기반이었음. 이게 아니라 우리의 로직, Agent-based Modeling으로",
        note: "notes-2026-11-11-filter-bubble",
        where: "핵심 정리",
        confidence: "own",
      },
    ],
    status: "partial",
    built: [
      {
        text: both(
          "몸: 재질, 오브제, 액체 모핑, 금붕어 1,000마리와 죽음. 밑의 로직은 일부러 PageRank.",
          "The body: materials, objects, the liquid morph, 1,000 goldfish and their deaths. The logic under it is PageRank on purpose.",
        ),
        route: "screen/bubble/9",
      },
      {
        text: both(
          "규칙: 근시안 에이전트 둘 (M9). 그림 없이도 돌고, 수치로 잰다.",
          "The rules: two myopic agents (M9). They run without a picture and are measured in numbers.",
        ),
        route: "screen/simulation/0",
      },
      {
        text: both(
          "둘은 아직 한 화면이 아니다. M1–M9.1 가운데 작가가 받아들인 것은 없다.",
          "The two are not yet one screen. Of M1–M9.1 the artist accepted none.",
        ),
        file: "docs/direction.md",
      },
    ],
  },
  {
    id: "goldfish-mobiles",
    kind: "mobiles",
    label: "[2] Goldfish Mobiles",
    role: both(
      "금붕어 한 마리에 모바일 한 대. 금붕어가 지금 보고 있는 화면. (Ready-Made A)",
      "One mobile for each goldfish: the screen that fish is looking at now. (Ready-Made A)",
    ),
    claims: [
      {
        text: "(Ready Made A) Mobile Interface. \"New\" Mobile Media — Meme, Post, Story, Reels, Shorts, SNS, KakaoTalk, Slack, Email, LinkedIn, M-Stock, Apple Stock, ChatGPT, Anthropic.",
        note: N1118,
        where: "다이어그램 4",
        confidence: "transcribed",
      },
      {
        text: "Mobile: Phone Farming (= # of Goldfishes in the Stage)",
        note: N1118,
        where: "다이어그램 3",
        confidence: "transcribed",
      },
      {
        text: "Goldfish = 1 Mobile. Each (G, k) Combination 대해 금붕어들이 실제로 보게 되는 모바일 화면 제시",
        note: N1023,
        where: "3 Screens / 2 Mobiles",
        confidence: "transcribed",
      },
    ],
    status: "working",
    built: [
      {
        text: both(
          "모바일 64대, 앱 클론 13종, 한 번의 인스턴스 드로우.",
          "64 mobiles, thirteen app clones, one instanced draw.",
        ),
        route: "pc/2d-mobiles/2",
      },
      {
        text: both(
          "금붕어 100마리가 각자 모바일을 들고 들여다본다. 화면은 2d-mobiles/2의 엔진.",
          "100 goldfish, each holding a mobile and looking into it. The glass runs 2d-mobiles/2's engine.",
        ),
        route: "pc/3d-mobiles/2",
      },
    ],
  },
  {
    id: "mobile-single",
    kind: "mobile",
    label: "[2a] Mobile",
    role: both(
      "Goldfish Mobiles 가운데 한 대. 사람이 직접 들어갈 수 있는 금붕어의 화면.",
      "One of the Goldfish Mobiles: a goldfish's screen that a person can enter.",
    ),
    claims: [
      {
        text: "[2] Goldfish Mobiles - - [2a] Mobile [핸드폰 한 대, 그 안의 금붕어들]",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
      {
        text: "Mobile (G) / Mobile SNS → Goldfish Mobiles 中 하나의 Mobile과 같은 화면 (= Single-Accessible Goldfish). 일반 Web Surfer도 접속 가능.",
        note: N1023,
        where: "3 Screens / 2 Mobiles",
        confidence: "transcribed",
      },
    ],
    status: "partial",
    built: [
      {
        text: both(
          "2d-mobiles/2의 한 대(?mode=focus)와 손(?mode=hand): 같은 엔진으로 한 대만, 방문자의 손이 금붕어가 된다. 실제 모바일의 터치는 확인되지 않았다.",
          "2d-mobiles/2's 한 대 (?mode=focus) and 손 (?mode=hand): the same engine with one mobile, the visitor's hand as the goldfish. Touch on a real mobile is not checked.",
        ),
        route: "pc/2d-mobiles/2",
      },
    ],
  },
  {
    id: "legacy-output",
    kind: "screens",
    label: "[3] Output Screens — Legacy Media",
    role: both(
      "메인 스크린의 결과를 내려다보는 화면들: 뉴스, 증권, 논문. (Ready-Made B)",
      "The screens that look over what the main screen results in: news, the stock market, papers. (Ready-Made B)",
    ),
    claims: [
      {
        text: "Everyday Parametric Interfaces. (Ready-Made B) 기성 세대 / Legacy Media / 신자유주의적 상징. 사회 - 상부구조 (신뢰가 있는 — 그러나 이제 사실상 해체, 없는)",
        note: N1118,
        where: "다이어그램 4",
        confidence: "transcribed",
      },
      {
        text: "특정 키워드 분포 / Density가 Threshold 이상 넘으면. → 그걸 조망하는 Everyday Interface",
        note: N1118,
        where: "다이어그램 1",
        confidence: "transcribed",
      },
      {
        text: "Output - Legacy Media - Parametric Interface.",
        note: N1123,
        where: "다이어그램 2",
        confidence: "transcribed",
      },
    ],
    status: "none",
    built: [
      {
        text: both(
          "지금 형태로는 없다. 이전 pc 시도(pc/archive의 news-phones, image-search, native-windows)가 이 자리의 것인지는 확인되지 않았다.",
          "Not there in this form. Whether the earlier pc trials (news-phones, image-search and native-windows in pc/archive) belong to this place is not confirmed.",
        ),
        file: "docs/README.md",
      },
    ],
  },

  // Inside G-B Dynamics: what each agent carries (1115, 1118 diagram 5).
  {
    id: "g-vector",
    kind: "box",
    label: "G — Vector",
    role: both(
      "금붕어의 수치 기질. 빠르다: 그 자리에서 계산된다.",
      "A goldfish's disposition in numbers. Fast: worked out on the spot.",
    ),
    claims: [
      {
        text: "G → Vectorised Value / Characteristic / Param (v)",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
      {
        text: "Numerical/Vector value 로 Short term Alignment & Positioning",
        note: N1115,
        where: "핵심 정리",
        confidence: "own",
      },
    ],
    status: "partial",
    built: [
      {
        text: both(
          "M9의 금붕어는 수치 규칙뿐이고, 금붕어마다 다른 값은 익숙함 하나다. 기질은 아직 없다.",
          "M9's goldfish are numerical rules only, and the one value that differs from fish to fish is familiarity. There is no disposition yet.",
        ),
        route: "screen/simulation/0",
      },
    ],
  },
  {
    id: "g-semantic",
    kind: "box",
    label: "G — Semantic (L)",
    role: both(
      "금붕어의 말로 된 기질. 느리다: 인터랙션하면서 바뀐다.",
      "A goldfish's disposition in language. Slow: it changes as the fish interacts.",
    ),
    claims: [
      {
        text: "그 웹사이트 상에서 인터랙션 하면서 Interaction, Semantic Preference (for both Goldfish and Bubble) updates → This cycalically affects numerical/vector value → Reppositioning → Again.. repeats",
        note: N1115,
        where: "핵심 정리",
        confidence: "own",
      },
    ],
    status: "none",
    built: [
      {
        text: both(
          "런타임 LLM 호출은 아직 없다: 예산이 없고 시스템이 정해지지 않았다.",
          "No runtime LLM calls yet: there is no budget for them and the system is not settled.",
        ),
        file: "docs/direction.md",
      },
    ],
  },
  {
    id: "b-vector",
    kind: "box",
    label: "B — Vector",
    role: both("버블의 수치 기질. 어떤 플랫폼인가.", "A bubble's disposition in numbers. Which platform it is."),
    claims: [
      {
        text: "[B] Vectorised Attribute [어떤 Platform?]",
        note: N1115,
        where: "다이어그램 3",
        confidence: "transcribed",
      },
    ],
    status: "partial",
    built: [
      {
        text: both(
          "M9의 버블은 열기와 금붕어 수뿐이다. 버블마다 다른 기질은 없다.",
          "M9's bubbles have heat and a count of fish, nothing else. No disposition differs from bubble to bubble.",
        ),
        route: "screen/simulation/0",
      },
    ],
  },
  {
    id: "b-semantic",
    kind: "box",
    label: "B — Semantic",
    role: both(
      "버블의 말로 된 기질. 어떤 특성이 금붕어를 끄는가.",
      "A bubble's disposition in language. Which trait draws the goldfish.",
    ),
    claims: [
      {
        text: "Semantic Attribute. └ 어떤 특성? 이것이 Goldfish Attract.. Updates Parameter According to How User Interact.",
        note: N1115,
        where: "다이어그램 3",
        confidence: "transcribed",
      },
    ],
    status: "none",
  },

  // Parts of past versions only.
  {
    id: "surrounding-pcs",
    kind: "screens",
    label: "Surrounding PCs",
    role: both(
      "메인 스크린을 둘러싼 PC 여덟 대쯤. 일상의 미디어 UI: 뉴스, 증권, 커뮤니티, Slack, LinkedIn.",
      "About eight PCs round the main screen, showing everyday media UIs: news, stocks, forums, Slack, LinkedIn.",
    ),
    claims: [
      {
        text: "Around the aquarium, the PCs display different media UIs that we encounter in everyday life: online news, stock market platforms, community forums, Slack channels, startup websites, research pages, LinkedIn posts, and other techno-social feeds.",
        note: EAAS,
        where: "II. Artwork Experience Design",
        confidence: "own",
      },
    ],
  },
  {
    id: "website-screens",
    kind: "screens",
    label: "Screens — Website",
    role: both(
      "G와 K가 부딪히면 새 웹사이트가 열리는 화면들.",
      "The screens on which a new website opens when G and K collide.",
    ),
    claims: [
      {
        text: "Screens: Website, Website → New Website Opens / Appears when G ←→ K collides",
        note: N1020,
        where: "다이어그램 1",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "profile",
    kind: "box",
    label: "Goldfishes Profile",
    role: both(
      "금붕어마다의 수명, 지금의 키워드, 좋아요를 격자로 보여 주는 화면.",
      "A grid of every goldfish: its lifespan, its keyword now, its likes.",
    ),
    claims: [
      {
        text: "③ Goldfishes Profile (격자 형태로 각 금붕어 수명 / 현재 키워드 / 좋아요 등) → 일종의 Dashboard",
        note: N1023,
        where: "3 Screens / 2 Mobiles",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "ranking",
    kind: "box",
    label: "External Screen: Ranking",
    role: both("금붕어들의 순위.", "The goldfish, ranked."),
    claims: [
      {
        text: "External Screen: Goldfishes Ranking",
        note: N1023,
        where: "3 Screens / 2 Mobiles",
        confidence: "transcribed",
      },
    ],
  },
];
