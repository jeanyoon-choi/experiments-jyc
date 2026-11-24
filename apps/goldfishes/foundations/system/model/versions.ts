import { both } from "./text.ts";
import type { LogEntry, Version } from "./types.ts";

const INNER_NODES = ["g-vector", "g-semantic", "b-vector", "b-semantic"];
const INNER_RELATIONS = ["rapid", "semantic-interaction", "g-loop", "b-loop"];

// The structure as it stood at each date, oldest first; the last is current.
// Major (v2 → v3): another structure — a node or a relation added, removed, or
// given another meaning. Minor (v2 → v2.1): the same nodes and relations, with
// something in them opened, renamed or qualified. A change of status is
// neither: it goes in LOG.
export const VERSIONS: Version[] = [
  {
    id: "v0",
    date: "2026-06-25",
    title: both("데이터 어항", "The data aquarium"),
    sources: ["eaas-proposal"],
    summary:
      both("메인 스크린 하나, 둘러싼 PC 여덟 대쯤, 관객의 모바일. 관객이 키워드를 키우면 금붕어가 몰리고, PC의 미디어가 그 hype로 채워지고, 금붕어 에이전트가 거기에 반응해 더 몰린다. 자극이 문턱을 넘으면 상전이: 금붕어들이 서로를 따라 무리를 이루고 어항을 벗어난다. 도중에 떠난 관객은 금붕어가 된다.", "One main screen, about eight PCs round it, the audience's mobiles. As the audience grows a keyword the goldfish gather, the PCs' media fill with that hype, and goldfish agents respond to it and gather more. Past a threshold of stimulus there is a phase transition: the goldfish follow each other into a swarm and leave the aquarium. An audience member who leaves before then becomes a goldfish."),
    nodes: ["audience", "audience-input", "gb-screen", "surrounding-pcs"],
    relations: ["hold", "input", "hype", "agents-respond", "derive", "become"],
    labels: {
      "audience-input": "Audience's mobile",
      "gb-screen": "Central screen — data aquarium",
      hold: "QR",
      input: both("keyword를 고르고 키운다", "picks a keyword and grows it"),
    },
    changes: [],
  },
  {
    id: "v1",
    date: "2026-10-23",
    title: "3 Screens / 2 Mobiles",
    sources: ["notes-2026-10-20-goldfishes", "notes-2026-10-23-goldfishes"],
    summary:
      both("버블이 키워드를 싣는다. 금붕어 한 마리에 모바일 한 대가 생기고, 메인 스크린과 Feedback Loop로 묶인다. 관객의 모바일은 둘로 나뉜다: 버블을 만드는 Controller와, 금붕어의 화면에 직접 들어가는 Mobile SNS.", "Bubbles carry keywords. Each goldfish gets a mobile, bound to the main screen by a Feedback Loop. The audience's mobile splits in two: the Controller that makes bubbles, and the Mobile SNS that enters a goldfish's screen."),
    nodes: [
      "audience",
      "audience-input",
      "gb-screen",
      "goldfish-mobiles",
      "mobile-single",
      "profile",
      "ranking",
      "website-screens",
    ],
    relations: ["hold", "input", "feedback-loop", "one-of", "access", "register", "collide"],
    labels: {
      "audience-input": "Mobile-Controller",
      "gb-screen": "Main Screen (Bubble-Keyword + Goldfishes)",
      "goldfish-mobiles": "Goldfishes Mobiles",
      "mobile-single": "Mobile (G) / Mobile SNS",
      hold: "QR",
      input: both("금붕어 먹이주기 = 버블 생성하기", "Feeding the goldfish = making a bubble"),
    },
    changes: [
      both("Surrounding PCs가 사라지고 Goldfishes Mobiles가 생겼다: 금붕어 한 마리에 모바일 한 대.", "The Surrounding PCs went and the Goldfishes Mobiles came: one mobile for each goldfish."),
      both("관객의 모바일이 Controller와 Mobile SNS 둘로 나뉘었다.", "The audience's mobile split into the Controller and the Mobile SNS."),
      both("Goldfishes Profile, Ranking, 부딪히면 열리는 Website 화면이 생겼다.", "The Goldfishes Profile, the Ranking, and the Website screens that open on a collision came."),
      both("상전이와 탈출, 얼굴 콜라주는 구조에서 빠졌다. \"먹이를 주다 보니 나도 금붕어\"는 Profile 등록으로 남았다.", "The phase transition, the escape and the face collage left the structure. \"Feeding them, I became a goldfish too\" stayed as the Profile registration."),
    ],
  },
  {
    id: "v2",
    date: "2026-11-18",
    title: "Audiences / Installation",
    sources: ["notes-2026-11-15-heterogenous-simulation", "notes-2026-11-18-algorithm-pop-art"],
    summary:
      both("네 자리와 그 사이의 고리. 관객의 모바일이 새 버블을 넣고 [0], 메인 스크린에서 금붕어와 버블이 움직이고 [1], 금붕어들의 모바일이 그와 피드백하고 [2], 결과가 Legacy Media 화면에 드러나고 [3], 관객이 그것을 보고 다시 손을 댄다. 금붕어와 버블은 저마다 빠른 Vector와 느린 Semantic을 가진다.", "Four places and the loop between them. The audience's mobile puts in a new bubble [0], goldfish and bubbles move on the main screen [1], the goldfish's mobiles feed back with it [2], the result shows on the Legacy Media screens [3], and the audience, seeing it, acts again. Each goldfish and each bubble carries a fast Vector and a slow Semantic."),
    nodes: [
      "audience",
      "audience-input",
      "gb-screen",
      "goldfish-mobiles",
      "mobile-single",
      "legacy-output",
      ...INNER_NODES,
    ],
    relations: ["hold", "input", "keyword", "feedback", "result", "cognitive", "one-of", ...INNER_RELATIONS],
    labels: {
      "audience-input": "[0] Audience Mobile",
      hold: "",
    },
    changes: [
      both("[3] Output Screens — Legacy Media가 생겼다. 메인 스크린의 RESULT를 받는다.", "[3] Output Screens — Legacy Media came. It takes the main screen's RESULT."),
      both("관객에게 돌아가는 인지적 피드백(Cognitively Affect)이 생겨 고리가 닫혔다.", "The cognitive feedback to the audience (Cognitively Affect) came, and the loop closed."),
      both("Feedback Loop가 내려가는 Keyword와 올라오는 Feedback Interaction으로 나뉘었다.", "The Feedback Loop split into Keyword going down and Feedback Interaction coming up."),
      both("금붕어와 버블 안에 Vector(빠름) ⇄ Semantic(느림) 층이 생겼다.", "Inside the goldfish and the bubble came the layers Vector (fast) ⇄ Semantic (slow)."),
      both("Goldfishes Profile, Ranking, Website 화면이 사라졌다.", "The Goldfishes Profile, the Ranking and the Website screens went."),
    ],
  },
  {
    id: "v2.1",
    date: "2026-11-23",
    title: "How to Create a Bubble",
    sources: ["notes-2026-11-23-how-to-create-a-bubble"],
    summary:
      both("v2의 고리는 그대로다. 열린 것은 [0]: 관객의 입력이 모바일이어야 하는가. Bubble Shot, Finger Skating, Create a Map, 웨어러블까지 후보로 올라왔고, 모바일과 More-than-Screen을 함께 두고 본다.", "v2's loop stands. What opened is [0]: must the audience's input be a mobile? Bubble Shot, Finger Skating, Create a Map and wearables came up as candidates, and Mobile and More-than-Screen are held side by side."),
    nodes: [
      "audience",
      "audience-input",
      "gb-screen",
      "goldfish-mobiles",
      "mobile-single",
      "legacy-output",
      ...INNER_NODES,
    ],
    relations: ["hold", "input", "keyword", "feedback", "result", "cognitive", "one-of", ...INNER_RELATIONS],
    changes: [
      both("[0]이 Audience Mobile에서 \"Through Whatever Device\"로 열렸다.", "[0] opened from Audience Mobile to \"Through Whatever Device\"."),
      both("[1] ⇄ [2]의 피드백에 \"Automatic - Computational\"이, 관객에게 돌아가는 피드백에 \"인지적\"이 붙어 두 고리의 성격이 갈렸다.", "The feedback of [1] ⇄ [2] was named \"Automatic - Computational\" and the one back to the audience \"cognitive\", telling the two loops apart."),
    ],
  },
];

// What happened to the map and to the parts' status, newest first.
export const LOG: LogEntry[] = [
  {
    date: "2026-11-24",
    text: both(
      "1123의 구조를 v3이 아니라 v2.1로 고쳤다: v2와 같은 구조이고 [0]만 열렸다 (작가). 버전은 앞으로 메이저와 마이너로 나눈다.",
      "The structure of note 1123 is v2.1, not v3: the same structure as v2 with only [0] opened (the artist). From now on versions are major and minor.",
    ),
  },
  {
    date: "2026-11-24",
    text: both("지도를 처음 만들었다. v0–v2.1은 제안서와 노트 1020·1023·1115·1118·1123에서, 상태는 코드와 각 실험의 문서에서 옮겼다. 1118과 1123은 핵심 정리가 비어 있어 손글씨 판독에 기대고 있다: 작가의 확인이 필요하다.", "The map was first made. Its versions come from the proposal and notes 1020, 1023, 1115, 1118 and 1123; the statuses from the code and each experiment's document. Notes 1118 and 1123 have an empty 핵심 정리, so they rest on transcribed handwriting and need the artist's check."),
  },
];
