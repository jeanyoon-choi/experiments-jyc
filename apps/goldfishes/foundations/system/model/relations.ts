import { both } from "./text.ts";
import type { Relation } from "./types.ts";

const EAAS = "eaas-proposal";
const N1020 = "notes-2026-10-20-goldfishes";
const N1023 = "notes-2026-10-23-goldfishes";
const N1115 = "notes-2026-11-15-heterogenous-simulation";
const N1118 = "notes-2026-11-18-algorithm-pop-art";
const N1123 = "notes-2026-11-23-how-to-create-a-bubble";

// What passes between the devices. This is the part of the map that matters
// most (user, 2026-11-24): the structure, the relations, device to device.
export const RELATIONS: Relation[] = [
  {
    id: "hold",
    from: "audience",
    to: "audience-input",
    label: "Through Whatever Device",
    carries: both("관객의 손짓", "The audience's gesture."),
    by: "human",
    claims: [
      {
        text: "Audience + [?] : Through Whatever Device... (BCI? Mobile?)",
        note: N1123,
        where: "다이어그램 2",
        confidence: "transcribed",
      },
    ],
    status: "undecided",
  },
  {
    id: "input",
    from: "audience-input",
    to: "gb-screen",
    label: both("새로운 Bubble의 추가", "Adding a new Bubble"),
    carries: both("새 버블, 새 키워드. 새것이 들어오는 유일한 길.", "A new bubble, a new keyword. The only way anything new comes in."),
    by: "computed",
    claims: [
      {
        text: "M — 관람객 : 새로운 버블의 (?), 새로운 Bubble의 추가.",
        note: N1118,
        where: "다이어그램 4",
        confidence: "transcribed",
      },
      {
        text: "[0] Audience Mobile → [1] G-B Dynamics",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
      {
        text: "New things come only from the audience. With no input the screen rests; an input changes the flow.",
        note: "direction",
        where: "Principles",
        confidence: "own",
      },
    ],
    status: "none",
    built: [
      {
        text: both("장치 사이의 연결은 없다. simulation/0은 같은 화면 위의 획으로 대신한다.", "There is no link between devices. simulation/0 stands in for it with a stroke on the same screen."),
        route: "screen/simulation/0",
      },
    ],
  },
  {
    id: "keyword",
    from: "gb-screen",
    to: "goldfish-mobiles",
    label: "Keyword",
    carries: both("금붕어가 닿은 버블의 키워드. 금붕어 한 마리의 접촉이 그 모바일의 화면을 바꾼다.", "The keyword of the bubble a goldfish touched. One fish's contact changes what its mobile shows."),
    by: "computed",
    claims: [
      {
        text: "[화면: G와 B들] → [핸드폰 판] : Keyword",
        note: N1118,
        where: "다이어그램 4",
        confidence: "transcribed",
      },
      {
        text: "[화면: Bubble] ⇅ Goldfish Mobiles : FEEDBACK (Automatic - Computational)",
        note: N1123,
        where: "다이어그램 2",
        confidence: "transcribed",
      },
    ],
    status: "working",
    built: [
      {
        text: both("socket feed/1: 메인 스크린이 슬롯 64개를 굴리고 바뀐 것만 보낸다 (push, snapshot). 릴레이는 전달만 한다.", "socket feed/1: the main screen steps 64 slots and sends only what changed (push, snapshot). The relay only forwards."),
        file: "socket/experiments/feed/1/README.md",
      },
      { text: "보내는 쪽", route: "screen/bubble/9" },
      { text: "받는 쪽", route: "pc/2d-mobiles/2" },
      {
        text: both("3d-mobiles/2는 스위치만 있고 메인 스크린과의 연결은 확인되지 않았다. bubble/9의 어휘와 맞춰 보지도 않았다.", "3d-mobiles/2 has the switch only; its link to the main screen is not checked, and its keywords were not compared with bubble/9's vocabulary."),
        route: "pc/3d-mobiles/2",
      },
    ],
  },
  {
    id: "feedback",
    from: "goldfish-mobiles",
    to: "gb-screen",
    label: "Feedback Interaction",
    carries: both("모바일 안에서 일어난 일이 메인 스크린으로 돌아온다. 무엇이 돌아오는지는 노트에 없다.", "What happens inside a mobile comes back to the main screen. The notes do not say what comes back."),
    by: "computed",
    claims: [
      {
        text: "[핸드폰 판] → [화면: G와 B들] : Feedback Interaction",
        note: N1118,
        where: "다이어그램 4",
        confidence: "transcribed",
      },
      {
        text: "Goldfish Mobile이 이 Hyperlink (= keyword)로 움직이면, B-k Screen Bubble 속에도 Corresponding Bubble로 움직일? Screen-Mobile 간 Feedback 관계 설계해야",
        note: N1023,
        where: "Screen-Mobile 간 Feedback",
        confidence: "transcribed",
      },
    ],
    status: "none",
    built: [
      {
        text: both("feed/1은 screen → pc 한 방향이다. 돌아오는 이벤트가 없다.", "feed/1 runs one way, screen → pc. No event comes back."),
        file: "socket/experiments/feed/1/README.md",
      },
    ],
  },
  {
    id: "result",
    from: "gb-screen",
    to: "legacy-output",
    label: "RESULT",
    carries: both("메인 스크린의 상태 F와 그 변화. 키워드의 분포와 밀도가 문턱을 넘으면 드러난다.", "The main screen's state F and how it changes. It shows once the spread and density of a keyword pass a threshold."),
    by: "computed",
    claims: [
      {
        text: "[1] G-B Dynamics → [3] Legacy Media : RESULT",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
      {
        text: "(F) → ω(∂F/∂t) → Legacy Media (of 21st C.). (F) — [여론 시스템 형성]. [OUTPUT] : (Reaction). (Intuitive & Fun)",
        note: N1118,
        where: "다이어그램 3",
        confidence: "transcribed",
      },
    ],
    status: "none",
  },
  {
    id: "cognitive",
    from: "legacy-output",
    to: "audience",
    label: "Cognitively Affect",
    carries: both("관객이 결과를 보고 다음 손짓을 고친다. 사람의 눈을 거치는 유일한 관계.", "The audience sees the result and changes the next gesture. The only relation that passes through a person's eyes."),
    by: "human",
    claims: [
      {
        text: "[3] Legacy Media → Audiences [눈] : Cognitively Affect",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
      {
        text: "FEEDBACK (인지적). ⇒ 이게 직관적으로 되기 위해서?",
        note: N1123,
        where: "다이어그램 2",
        confidence: "transcribed",
      },
    ],
    status: "none",
  },
  {
    id: "one-of",
    from: "goldfish-mobiles",
    to: "mobile-single",
    label: both("中 하나", "one of them"),
    carries: both("같은 화면, 한 대만.", "The same screen, one mobile only."),
    by: "computed",
    plain: true,
    claims: [
      {
        text: "[2] Goldfish Mobiles - - [2a] Mobile",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
    ],
    status: "partial",
    built: [{ text: "?mode=focus, ?mode=hand", route: "pc/2d-mobiles/2" }],
  },

  // Inside G-B Dynamics.
  {
    id: "rapid",
    from: "g-vector",
    to: "b-vector",
    label: "Rapid Calculation",
    carries: both("누가 어디로 갈지. 그 자리에서 계산된다.", "Who goes where. Worked out on the spot."),
    by: "computed",
    both: true,
    claims: [
      {
        text: "G의 Vector ⇄ B의 Vector : Rapid Calculation",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
      {
        text: "Vector Immediately Calculates the G-B Landscape and how it favours, And this prompts the Content (what) Each Goldfish sees → thus Affects Semantic.",
        note: N1115,
        where: "다이어그램 2",
        confidence: "transcribed",
      },
    ],
    status: "partial",
    built: [
      {
        text: both(
          "M9: 금붕어는 맞닿은 버블 가운데 덜 익숙하고 붐비는 곳으로, 버블은 금붕어가 더 많은 옆 버블의 기호를 베낀다.",
          "M9: a fish moves to the less familiar, busier bubble among those it touches; a bubble copies the sign of a neighbour with more fish.",
        ),
        route: "screen/simulation/0",
      },
    ],
  },
  {
    id: "semantic-interaction",
    from: "g-semantic",
    to: "b-semantic",
    label: "Semantic Interaction → Update",
    carries: both("말로 된 인터랙션. 댓글, 포스트.", "Interaction in language: comments, posts."),
    by: "computed",
    both: true,
    claims: [
      {
        text: "G의 Semantic ⇄ B의 Semantic : Semantic Interaction → Update",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
    ],
    status: "none",
  },
  {
    id: "g-loop",
    from: "g-vector",
    to: "g-semantic",
    label: "",
    carries: both("빠른 층이 보여 줄 것을 정하고, 느린 층이 기질을 고친다.", "The fast layer decides what is shown; the slow layer revises the disposition."),
    by: "computed",
    both: true,
    claims: [
      {
        text: "G → Vectorised Value / Characteristic / Param (v) ⇅ Semantic (L)",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
    ],
    status: "none",
  },
  {
    id: "b-loop",
    from: "b-vector",
    to: "b-semantic",
    label: "",
    carries: both("빠른 층이 보여 줄 것을 정하고, 느린 층이 기질을 고친다.", "The fast layer decides what is shown; the slow layer revises the disposition."),
    by: "computed",
    both: true,
    claims: [
      {
        text: "B → Vector ⇅ Semantic",
        note: N1118,
        where: "다이어그램 5",
        confidence: "transcribed",
      },
    ],
    status: "none",
  },

  // Relations of past versions only.
  {
    id: "feedback-loop",
    from: "gb-screen",
    to: "goldfish-mobiles",
    label: "Feedback Loop",
    carries: both("아직 나뉘지 않은 양방향.", "Both directions, not yet told apart."),
    by: "computed",
    both: true,
    claims: [
      {
        text: "[ Main Screen ] <---- Feedback Loop ----> [ Goldfishes Mobiles ] = [ SNS-Mobile ]",
        note: N1023,
        where: "3 Screens / 2 Mobiles",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "access",
    from: "audience",
    to: "mobile-single",
    label: both("접속", "enters"),
    carries: both("관객도, 전시장 밖의 Web Surfer도.", "The audience, and a web surfer outside the exhibition too."),
    by: "human",
    claims: [
      {
        text: "이 각 Mobile Site: 관람객도 각각 접속 가능 + 일반 Web Surfer도 접속 가능",
        note: N1023,
        where: "3 Screens / 2 Mobiles",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "register",
    from: "mobile-single",
    to: "profile",
    label: both("User Profile로 등록", "registered as a User Profile"),
    carries: both("들어온 사람이 금붕어 가운데 하나가 된다.", "Whoever comes in becomes one of the goldfish."),
    by: "computed",
    claims: [
      {
        text: "Human User가 Mobile (G) 들어오면, 이 User Profile로 여기에 등록 (One of the Goldfishes!)",
        note: N1023,
        where: "3 Screens / 2 Mobiles",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "collide",
    from: "gb-screen",
    to: "website-screens",
    label: "G ⟷ K collides",
    carries: both("부딪힐 때마다 새 웹사이트.", "A new website at every collision."),
    by: "computed",
    claims: [
      {
        text: "New Website Opens / Appears when G ←→ K collides",
        note: N1020,
        where: "다이어그램 1",
        confidence: "transcribed",
      },
    ],
  },
  {
    id: "hype",
    from: "gb-screen",
    to: "surrounding-pcs",
    label: "hype",
    carries: both("키워드에 금붕어가 몰릴수록 그 hype의 콘텐츠가 늘어난다.", "The more goldfish gather at a keyword, the more content of that hype appears."),
    by: "computed",
    claims: [
      {
        text: "more goldfishes begin to gather around it. At the same time, the surrounding PC screens generate more real-time media content around that hype.",
        note: EAAS,
        where: "II. Artwork Experience Design",
        confidence: "own",
      },
    ],
  },
  {
    id: "agents-respond",
    from: "surrounding-pcs",
    to: "gb-screen",
    label: "agents respond",
    carries: both("금붕어 에이전트가 PC의 콘텐츠에 댓글을 달고 새로 만든다. 그것이 금붕어를 더 부른다.", "Goldfish agents comment on the PCs' content and make more of it, which draws more goldfish."),
    by: "computed",
    claims: [
      {
        text: "as simulated agents, they also respond to content on the surrounding PCs, generating new content or comments about the keyword depending on their level of attention. This new content may attract even more goldfish, creating a feedback loop",
        note: EAAS,
        where: "II. Artwork Experience Design",
        confidence: "own",
      },
    ],
  },
  {
    id: "derive",
    from: "audience-input",
    to: "surrounding-pcs",
    label: both("파생 콘텐츠", "derivative content"),
    carries: both("관객이 GPT로 hype의 파생 콘텐츠를 계속 만든다.", "The audience keeps producing derivative content of the hype with GPT."),
    by: "computed",
    claims: [
      {
        text: "Through a GPT API-assisted interface, audiences can keep producing hype-related derivative content, which feeds back into the surrounding screens",
        note: EAAS,
        where: "II. Artwork Experience Design",
        confidence: "own",
      },
    ],
  },
  {
    id: "become",
    from: "audience",
    to: "gb-screen",
    label: both("떠나면 금붕어가 된다", "leaves, and becomes a goldfish"),
    carries: both("관객의 눈, 코, 입.", "The audience member's eyes, nose and mouth."),
    by: "human",
    claims: [
      {
        text: "If an audience leaves before reaching this post-transition state, … their face is captured through the camera with explicit consent, and fragments of their eyes, nose, and mouth are collaged into a new goldfish.",
        note: EAAS,
        where: "II. Artwork Experience Design",
        confidence: "own",
      },
    ],
  },
];
