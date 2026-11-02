import type { Trigger } from "./triggers";

// The participant's KakaoTalk: who is in it, how each relation reads the face,
// and how fast it talks. All people are fictional; portraits are the archive's
// pravatar set reused from face-voronoi.

export type Register = "casual" | "polite";
export type Flavor =
  | "mom" | "dad" | "boss" | "partner" | "crush" | "ex" | "friend" | "surgery" | "matchmaker" | "pt"
  | "danggeun" | "relative" | "senior" | "junior" | "church" | "family" | "team" | "peers" | "school"
  | "friends" | "apartment" | "parents" | "wedding" | "gym" | "notice" | "openchat";

export type Member = { id: string; name: string; avatar: number | null };

export type Room = {
  id: string;
  name: string;
  kind: "dm" | "group";
  flavor: Flavor;
  register: Register;
  members: readonly Member[];
  /** Shown member count for groups (more than the speaking members). */
  size?: number;
  /** Messages per minute with no reaction at all. */
  base: number;
  /** How strongly each situation draws this room in (0–1). */
  sensitivity: Partial<Record<Trigger, number>>;
  /** Chance a message turns into a remark about looks. */
  looks: number;
  muted?: boolean;
  pinned?: boolean;
  /** Earlier conversation: [member index or -1 for me, text, minutes ago]. */
  seed: readonly (readonly [number, string, number])[];
};

const portrait = (n: number) => n;

const m = (id: string, name: string, avatar: number | null): Member => ({ id, name, avatar });

// Shared sensitivity shapes, then adjusted per room.
const WATCHFUL: Partial<Record<Trigger, number>> = {
  smile: 0.5, fake: 0.7, laugh: 0.5, blank: 0.6, frown: 0.7, angry: 0.8, sad: 0.5, disgust: 0.7, smirk: 0.7,
  surprise: 0.4, tilt: 0.5, turn: 0.5, down: 0.4, shut: 0.4, nervous: 0.4, close: 0.4, cute: 0.4, talk: 0.3, gone: 0.6,
};
const shape = (overrides: Partial<Record<Trigger, number>>) => ({ ...WATCHFUL, ...overrides });

export const ROOMS: readonly Room[] = [
  {
    id: "mom", name: "엄마", kind: "dm", flavor: "mom", register: "casual", pinned: true,
    members: [m("mom", "엄마", portrait(41))], base: 0.5, looks: 0.35,
    sensitivity: shape({ blank: 0.9, sad: 0.9, down: 0.8, gone: 1, close: 0.7, shut: 0.7 }),
    seed: [[0, "밥은 먹었니", 190], [-1, "응 먹었어", 186], [0, "뭐 먹었는데", 185], [0, "사진 보내봐", 185]],
  },
  {
    id: "partner", name: "자기 💛", kind: "dm", flavor: "partner", register: "casual", pinned: true,
    members: [m("partner", "자기 💛", portrait(12))], base: 0.8, looks: 0.25,
    sensitivity: shape({ smile: 0.9, turn: 1, gone: 1, blank: 0.8, fake: 0.9, cute: 0.6 }),
    seed: [[0, "오늘 몇 시에 끝나?", 40], [-1, "7시쯤?", 38], [0, "끝나면 바로 연락해", 38], [0, "누구랑 있어", 12]],
  },
  {
    id: "boss", name: "김성훈 팀장님", kind: "dm", flavor: "boss", register: "polite",
    members: [m("boss", "김성훈 팀장님", portrait(52))], base: 0.35, looks: 0.15,
    sensitivity: shape({ smile: 0.8, blank: 0.9, frown: 1, shut: 1, down: 0.9, turn: 0.8, talk: 0.7 }),
    seed: [[0, "내일 오전까지 보고서 수정본 부탁해요", 75], [-1, "네 팀장님 알겠습니다", 74], [0, "그리고 아까 회의 때 표정 관리 좀 합시다", 20]],
  },
  {
    id: "teamroom", name: "마케팅2팀", kind: "group", flavor: "team", register: "polite", size: 8,
    members: [m("boss", "김성훈 팀장님", portrait(52)), m("t1", "박지은 과장", portrait(3)), m("t2", "이도윤", portrait(18)), m("t3", "최유나", portrait(26)), m("t4", "정민재 대리", null)],
    base: 0.6, looks: 0.1,
    sensitivity: shape({ blank: 0.8, frown: 0.9, smile: 0.6, laugh: 0.7, talk: 0.6 }),
    seed: [[1, "3시 회의실 B 예약했습니다", 140], [0, "다들 참석 부탁해요", 138], [2, "넵", 137], [3, "넵 알겠습니다", 137], [4, "확인했습니다", 136]],
  },
  {
    id: "openchat", name: "얼평방 (익명) 솔직하게", kind: "group", flavor: "openchat", register: "casual", size: 1287,
    members: [m("o1", "익명의 복숭아", null), m("o2", "얼굴평가단", null), m("o3", "팩폭러", null), m("o4", "지나가던 사람", null), m("o5", "성형 9년차", null), m("o6", "현실주의자", null)],
    base: 1.2, looks: 0.9,
    sensitivity: shape({ close: 1, smile: 0.8, laugh: 0.8, cute: 1, blank: 0.7, fake: 0.9, down: 0.8 }),
    seed: [[0, "다음 사람 올려봐요", 6], [1, "아까 그분 4점", 5], [2, "냉정하게 3.5", 5], [3, "방금 들어온 분 얼굴 보여주세요", 1]],
  },
  {
    id: "surgery", name: "리본성형외과 박수진 실장", kind: "dm", flavor: "surgery", register: "polite",
    members: [m("surgery", "리본성형외과 박수진 실장", portrait(30))], base: 0.35, looks: 0.85,
    sensitivity: shape({ close: 1, smile: 0.9, laugh: 0.9, smirk: 1, frown: 0.9, surprise: 0.8, down: 0.9, blank: 0.7 }),
    seed: [[0, "고객님 지난번 상담 사진 원장님께 전달드렸어요", 1500], [0, "윤곽이랑 눈 같이 하시면 할인 가능하세요", 1499], [-1, "생각해볼게요", 1300]],
  },
  {
    id: "family", name: "우리 가족 🏠", kind: "group", flavor: "family", register: "casual", size: 4,
    members: [m("mom", "엄마", portrait(41)), m("dad", "아빠", portrait(55)), m("sib", "동생", portrait(9))],
    base: 0.45, looks: 0.4,
    sensitivity: shape({ blank: 0.8, sad: 0.8, close: 0.7, laugh: 0.6 }),
    seed: [[1, "이번 주말에 큰고모 오신다", 300], [0, "다들 얼굴 좀 관리하고 와", 299], [2, "ㅋㅋㅋ", 290]],
  },
  {
    id: "ex", name: "준호", kind: "dm", flavor: "ex", register: "casual", muted: true,
    members: [m("ex", "준호", portrait(14))], base: 0.15, looks: 0.5,
    sensitivity: shape({ smile: 1, laugh: 0.9, sad: 0.9, fake: 0.8, cute: 0.8 }),
    seed: [[0, "잘 지내?", 43200], [0, "프사 바꿨네", 2880]],
  },
  {
    id: "crush", name: "서연", kind: "dm", flavor: "crush", register: "casual",
    members: [m("crush", "서연", portrait(22))], base: 0.3, looks: 0.3,
    sensitivity: shape({ smile: 0.9, blank: 0.9, turn: 0.8, cute: 0.8, fake: 0.7 }),
    seed: [[0, "어제 재밌었어ㅎㅎ", 600], [-1, "나도ㅎㅎ", 590], [0, "근데 사진이랑 좀 다르더라", 580]],
  },
  {
    id: "notice", name: "(주)한빛 전사 공지", kind: "group", flavor: "notice", register: "polite", size: 312, muted: true,
    members: [m("hr", "인사팀", null), m("ceo", "대표이사실", null), m("hr2", "조직문화팀", null)],
    base: 0.2, looks: 0.2,
    sensitivity: shape({ blank: 0.8, frown: 0.8, smile: 0.4, shut: 0.9, gone: 0.8, nervous: 0.6 }),
    seed: [[0, "[공지] 11월 친절 미소 캠페인 안내", 2000], [2, "[조직문화팀] 웃는 얼굴로 하루를 시작합시다", 900]],
  },
  {
    id: "friend", name: "지현", kind: "dm", flavor: "friend", register: "casual",
    members: [m("friend", "지현", portrait(5))], base: 0.5, looks: 0.35,
    sensitivity: shape({ laugh: 0.6, smirk: 0.8, disgust: 0.8 }),
    seed: [[0, "야 오늘 저녁 됨?", 90], [-1, "ㅇㅇ 몇 시", 88], [0, "7시 성수", 88]],
  },
  {
    id: "peers", name: "2024 공채 동기", kind: "group", flavor: "peers", register: "casual", size: 23,
    members: [m("p1", "김태현", portrait(8)), m("p2", "윤서아", portrait(24)), m("p3", "한지호", portrait(33)), m("p4", "오하은", null)],
    base: 0.7, looks: 0.3,
    sensitivity: shape({ smile: 0.6, frown: 0.7, smirk: 0.9, blank: 0.7 }),
    seed: [[0, "성과급 나왔냐", 400], [1, "ㅋㅋㅋ 그게 뭔데", 398], [2, "우리 팀은 표정 평가도 한대", 380]],
  },
  {
    id: "relative", name: "큰고모", kind: "dm", flavor: "relative", register: "casual",
    members: [m("aunt", "큰고모", portrait(44))], base: 0.15, looks: 0.75,
    sensitivity: shape({ blank: 0.8, smile: 0.5, close: 0.9, down: 0.7 }),
    seed: [[0, "주말에 보자", 2400], [0, "얼굴 좀 신경 쓰고 와라", 2399]],
  },
  {
    id: "pt", name: "정우 트레이너", kind: "dm", flavor: "pt", register: "polite",
    members: [m("pt", "정우 트레이너", portrait(51))], base: 0.25, looks: 0.7,
    sensitivity: shape({ close: 0.9, down: 0.9, blank: 0.6, smile: 0.6, cute: 0.7 }),
    seed: [[0, "회원님 오늘 식단 사진 아직이에요", 300], [0, "바디프로필 21일 남았습니다", 299]],
  },
  {
    id: "school", name: "고3 7반 💙", kind: "group", flavor: "school", register: "casual", size: 31, muted: true,
    members: [m("s1", "민지", portrait(1)), m("s2", "상우", portrait(36)), m("s3", "나연", portrait(16)), m("s4", "재원", null)],
    base: 0.35, looks: 0.6,
    sensitivity: shape({ close: 0.8, smile: 0.6, laugh: 0.7 }),
    seed: [[0, "동창회 날짜 투표 올렸어", 3000], [1, "얼굴 다들 많이 변했겠다ㅋㅋ", 2990]],
  },
  {
    id: "apartment", name: "래미안 입주민 소통방", kind: "group", flavor: "apartment", register: "polite", size: 184, muted: true,
    members: [m("a1", "101동 1203호", null), m("a2", "103동 주민", null), m("a3", "관리사무소", null), m("a4", "102동 805", null)],
    base: 0.4, looks: 0.25,
    sensitivity: shape({ blank: 0.7, frown: 0.7, talk: 0.8, gone: 0.4 }),
    seed: [[2, "금일 15시 엘리베이터 점검 예정입니다", 500], [0, "엘베에서 인사 안 하시는 분들 좀...", 120]],
  },
  {
    id: "matchmaker", name: "혜린", kind: "dm", flavor: "matchmaker", register: "casual",
    members: [m("mm", "혜린", portrait(27))], base: 0.2, looks: 0.7,
    sensitivity: shape({ smile: 0.6, blank: 0.7, close: 0.8, fake: 0.8 }),
    seed: [[0, "소개팅 상대가 너 사진 하나 더 보내달래", 700], [-1, "어떤 사진?", 690], [0, "보정 안 한 거", 690]],
  },
  {
    id: "junior", name: "이서준 (신입)", kind: "dm", flavor: "junior", register: "polite",
    members: [m("junior", "이서준", portrait(38))], base: 0.2, looks: 0,
    sensitivity: shape({ frown: 1, angry: 1, blank: 0.9, disgust: 0.9, smirk: 0.9 }),
    seed: [[0, "선배님 자료 정리 끝났습니다!", 160], [-1, "고마워요", 158], [0, "혹시 제가 뭐 실수한 거 있을까요..?", 30]],
  },
  {
    id: "parents", name: "해바라기반 학부모", kind: "group", flavor: "parents", register: "polite", size: 27, muted: true,
    members: [m("pa1", "서윤맘", null), m("pa2", "도현 아버님", null), m("pa3", "하린엄마", portrait(20))],
    base: 0.35, looks: 0.35,
    sensitivity: shape({ blank: 0.7, frown: 0.8, smile: 0.4 }),
    seed: [[0, "내일 준비물 색종이랑 풀입니다~", 800], [2, "감사합니다 🙏", 790]],
  },
  {
    id: "church", name: "청년부 2셀", kind: "group", flavor: "church", register: "polite", size: 9,
    members: [m("c1", "셀리더 은혜", portrait(11)), m("c2", "다니엘 형제", portrait(31)), m("c3", "수아 자매", null)],
    base: 0.25, looks: 0.2,
    sensitivity: shape({ sad: 0.8, blank: 0.8, gone: 0.7, laugh: 0.4 }),
    seed: [[0, "이번 주 기도제목 나눠주세요 🙏", 1300], [1, "취업이요", 1290]],
  },
  {
    id: "dad", name: "아빠", kind: "dm", flavor: "dad", register: "casual",
    members: [m("dad", "아빠", portrait(55))], base: 0.1, looks: 0.3,
    sensitivity: shape({ blank: 0.7, laugh: 0.5, down: 0.6 }),
    seed: [[0, "[사진]", 4000], [0, "엄마한테 전화 좀 해라", 3990]],
  },
  {
    id: "friends", name: "대학 동기들 ㅋㅋ", kind: "group", flavor: "friends", register: "casual", size: 6,
    members: [m("f1", "규리", portrait(7)), m("f2", "동훈", portrait(47)), m("f3", "예린", portrait(29)), m("friend", "지현", portrait(5))],
    base: 0.8, looks: 0.45,
    sensitivity: shape({ laugh: 0.8, smirk: 0.8, cute: 0.9, close: 0.7, smile: 0.6 }),
    seed: [[0, "단톡 왜 이렇게 조용해", 50], [1, "다 일하지", 49], [2, "ㅋㅋㅋ 나 오늘 반차", 45]],
  },
  {
    id: "wedding", name: "지현이 결혼식 🎉 하객방", kind: "group", flavor: "wedding", register: "casual", size: 15,
    members: [m("friend", "지현", portrait(5)), m("w1", "규리", portrait(7)), m("w2", "소희", portrait(19))],
    base: 0.2, looks: 0.55,
    sensitivity: shape({ smile: 0.8, fake: 1, blank: 0.8, close: 0.6 }),
    seed: [[0, "단체사진 원본 올렸어!", 6000], [1, "근데 한 명 표정이...", 5990]],
  },
  {
    id: "gym", name: "바디프로필 30일 챌린지", kind: "group", flavor: "gym", register: "polite", size: 40, muted: true,
    members: [m("pt", "정우 트레이너", portrait(51)), m("g1", "다이어터", null), m("g2", "근손실방지", null)],
    base: 0.3, looks: 0.8,
    sensitivity: shape({ close: 0.9, down: 0.8, smile: 0.5 }),
    seed: [[0, "오늘 공복 몸무게 인증해주세요", 400], [1, "인증합니다 ㅠ", 398]],
  },
  {
    id: "danggeun", name: "당근 · 원목 수납장", kind: "dm", flavor: "danggeun", register: "polite",
    members: [m("dg", "성수동 이웃", null)], base: 0.12, looks: 0.25,
    sensitivity: shape({ blank: 0.5, gone: 0.9, frown: 0.6 }),
    seed: [[0, "아직 거래 가능할까요?", 260], [-1, "네 가능해요", 250], [0, "내일 7시 역 앞에서 뵐게요", 248]],
  },
  {
    id: "senior", name: "박지은 과장님", kind: "dm", flavor: "senior", register: "polite",
    members: [m("t1", "박지은 과장", portrait(3))], base: 0.15, looks: 0.25,
    sensitivity: shape({ smile: 0.6, smirk: 0.8, blank: 0.7, frown: 0.8 }),
    seed: [[0, "아까 팀장님 앞에서 표정 괜찮았어?", 70]],
  },
];

export const ROOM_BY_ID = new Map(ROOMS.map((room) => [room.id, room]));
