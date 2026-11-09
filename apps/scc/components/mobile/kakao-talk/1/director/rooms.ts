import { MORE_ROOMS } from "./more-rooms";
import type { Member, Room, Voice } from "./types";

// The participant's KakaoTalk. Room types and who leans which way follow the
// research notes (가족방 with a forwarding father, mixed 동창방, a quiet
// company room, an apartment room that turns on 보유세, church and 산악회
// rooms of elders, one supporters' open chat per side). All people are
// fictional; portraits are the archive's pravatar set from face-voronoi.
// lean: −2 strong left … +2 strong right; 0 wants no politics.

const m = (id: string, name: string, avatar: number | null, lean: number, voice: Voice): Member => ({ id, name, avatar, lean, voice });

const DAD = m("dad", "아빠", 55, 2, "elder");
const MOM = m("mom", "엄마", 41, 0, "elder");
const SISTER = m("sister", "언니", 22, -2, "young");
const BROTHER = m("brother", "동생", 9, 1, "young");
const AUNT = m("aunt", "큰고모", 44, -2, "elder");
const JIHYUN = m("jihyun", "지현", 5, 0, "young");
const BOSS = m("boss", "김성훈 팀장님", 52, 1, "office");
const SENIOR = m("senior", "박지은 과장", 3, -1, "office");
const SANGWOO = m("sangwoo", "상우", 36, 2, "young");

const MAIN_ROOMS: readonly Room[] = [
  {
    id: "family", name: "우리 가족 🏠", kind: "group", size: 5,
    members: [DAD, MOM, SISTER, BROTHER], base: 0.5, politics: 0.95,
    idle: ["밥은 먹었니", "이번 주말에 큰집 간다", "김장 언제 하냐", "엄마 오늘 병원 다녀왔어", "ㅋㅋㅋ", "다들 감기 조심해라", "사진 잘 나왔네", "주말에 다 올 수 있지?"],
    seed: [[0, "[사진]", 300], [1, "주말에 다 올 수 있지?", 296], [2, "난 토요일 저녁에 갈게", 290], [3, "ㅇㅋ", 289]],
  },
  {
    id: "partner", name: "자기 💛", kind: "dm",
    members: [m("partner", "자기 💛", 12, -1, "young")], base: 0.8, politics: 0.35,
    idle: ["오늘 몇 시에 끝나?", "저녁 뭐 먹지", "보고 싶다", "끝나면 연락해", "주말에 영화 볼래?", "ㅋㅋㅋ 귀여워", "퇴근!"],
    seed: [[0, "오늘 몇 시에 끝나?", 40], [-1, "7시쯤?", 38], [0, "끝나면 바로 연락해", 38]],
  },
  {
    id: "dad", name: "아빠", kind: "dm",
    members: [DAD], base: 0.12, politics: 0.9,
    idle: ["[사진]", "엄마한테 전화 좀 해라", "밥 잘 챙겨 먹어라", "추워졌다 옷 따뜻하게 입어라", "좋은 하루 되거라~~"],
    seed: [[0, "[사진]", 4000], [0, "엄마한테 전화 좀 해라", 3990]],
  },
  {
    id: "mom", name: "엄마", kind: "dm",
    members: [m("mom", "엄마", 41, 1, "elder")], base: 0.4, politics: 0.4,
    idle: ["밥은 먹었니", "뭐 먹었는데", "김치 보낼게", "아빠 또 유튜브 본다", "주말에 오니?", "감기 조심해~~"],
    seed: [[0, "밥은 먹었니", 190], [-1, "응 먹었어", 186], [0, "김치 보낼게", 185]],
  },
  {
    id: "bigfamily", name: "큰집 식구들 🎑", kind: "group", size: 11,
    members: [m("uncle", "큰아버지", 57, 2, "elder"), AUNT, m("cousin1", "사촌오빠 민혁", 47, 1, "young"), m("cousin2", "사촌동생 하은", 16, -1, "young"), DAD, MOM],
    base: 0.25, politics: 1,
    idle: ["설에 다들 몇 시에 오냐", "산소 벌초 날짜 정하자", "[사진]", "다들 건강하시죠~~", "할머니 생신 다음 달이다"],
    seed: [[0, "[동영상]", 1500], [0, "이거 꼭 끝까지 보거라", 1499], [1, "오빠 그런 거 퍼오지 마요", 1440], [5, "가족끼리 정치 이야기 하지 말자", 1430]],
  },
  {
    id: "friends", name: "대학 동기들 ㅋㅋ", kind: "group", size: 6,
    members: [m("gyuri", "규리", 7, -2, "young"), m("donghoon", "동훈", 47, 1, "young"), m("yerin", "예린", 29, -1, "young"), JIHYUN],
    base: 0.8, politics: 0.7,
    idle: ["단톡 왜 이렇게 조용해", "다 일하지", "ㅋㅋㅋ 나 오늘 반차", "연말에 한번 보자", "날짜 투표 올림", "ㅋㅋㅋㅋㅋ 미쳤다", "퇴근하고 싶다"],
    seed: [[0, "단톡 왜 이렇게 조용해", 50], [1, "다 일하지", 49], [2, "ㅋㅋㅋ 나 오늘 반차", 45]],
  },
  {
    id: "school", name: "고3 7반 💙", kind: "group", size: 31,
    members: [m("minji", "민지", 1, -1, "young"), SANGWOO, m("nayeon", "나연", 16, 0, "young"), m("jaewon", "재원", null, 1, "young")],
    base: 0.35, politics: 0.65,
    idle: ["동창회 날짜 투표 올렸어", "재원이 결혼한대", "[사진]", "다들 잘 사냐", "ㅋㅋㅋ 옛날 사진 봐"],
    seed: [[0, "동창회 날짜 투표 올렸어", 3000], [1, "얼굴 다들 많이 변했겠다ㅋㅋ", 2990]],
  },
  {
    id: "army", name: "수색대 동기 💪", kind: "group", size: 9,
    members: [m("a1", "태식", 33, 2, "young"), m("a2", "정훈", 31, 1, "young"), m("a3", "병철", null, 1, "young"), m("a4", "준영", 38, -1, "young")],
    base: 0.3, politics: 0.8,
    idle: ["ㅋㅋㅋㅋ", "전역 10주년 모임 함?", "헬스 가냐", "[사진]", "주식 다 물렸다", "ㄹㅇ"],
    seed: [[0, "전역 10주년 모임 함?", 900], [1, "ㄱㄱ", 899], [2, "날짜 잡아라", 880]],
  },
  {
    id: "teamroom", name: "마케팅2팀", kind: "group", size: 8, work: true,
    members: [BOSS, SENIOR, m("doyoon", "이도윤", 18, 0, "office"), m("yuna", "최유나", 26, -1, "office"), m("minjae", "정민재 대리", null, 1, "office")],
    base: 0.6, politics: 0.3,
    idle: ["3시 회의실 B 예약했습니다", "다들 참석 부탁해요", "넵", "넵 알겠습니다", "확인했습니다", "자료 공유드립니다", "점심 메뉴 추천 받습니다"],
    seed: [[1, "3시 회의실 B 예약했습니다", 140], [0, "다들 참석 부탁해요", 138], [2, "넵", 137], [3, "넵 알겠습니다", 137]],
  },
  {
    id: "peers", name: "2024 공채 동기", kind: "group", size: 23, work: true,
    members: [m("p1", "김태현", 8, 1, "young"), m("p2", "윤서아", 24, -1, "young"), m("p3", "한지호", 33, 2, "young"), m("p4", "오하은", null, -2, "young")],
    base: 0.7, politics: 0.55,
    idle: ["성과급 나왔냐", "ㅋㅋㅋ 그게 뭔데", "오늘 회식 감?", "퇴사하고 싶다", "금요일 언제 와", "점심 ㄱ?"],
    seed: [[0, "성과급 나왔냐", 400], [1, "ㅋㅋㅋ 그게 뭔데", 398]],
  },
  {
    id: "senior", name: "박지은 과장님", kind: "dm", work: true,
    members: [SENIOR], base: 0.15, politics: 0.3,
    idle: ["아까 회의 자료 고마워요", "내일 외근 같이 가요", "커피 한잔 할래요?", "팀장님 오늘 기분 안 좋으심"],
    seed: [[0, "아까 회의 자료 고마워요", 70]],
  },
  {
    id: "apartment", name: "래미안 입주민 소통방", kind: "group", size: 184,
    members: [m("ap1", "101동 1203호", null, 2, "anon"), m("ap2", "103동 주민", null, -1, "anon"), m("ap3", "관리사무소", null, 0, "office"), m("ap4", "102동 805", null, 1, "anon")],
    base: 0.4, politics: 0.6,
    idle: ["금일 15시 엘리베이터 점검 예정입니다", "택배 잘못 온 거 있으신 분", "주차 좀 똑바로 해주세요", "놀이터 소음 자제 부탁드려요", "분리수거는 목요일입니다"],
    seed: [[2, "금일 15시 엘리베이터 점검 예정입니다", 500], [0, "보유세 고지서 보셨어요?", 120]],
  },
  {
    id: "parents", name: "해바라기반 학부모", kind: "group", size: 27,
    members: [m("pa1", "서윤맘", null, -1, "parent"), m("pa2", "도현 아버님", null, 1, "parent"), m("pa3", "하린엄마", 20, 0, "parent")],
    base: 0.35, politics: 0.45,
    idle: ["내일 준비물 색종이랑 풀입니다~", "감사합니다 🙏", "체험학습 신청서 오늘까지래요", "독감 돌아요 조심하세요", "넵 감사해요~"],
    seed: [[0, "내일 준비물 색종이랑 풀입니다~", 800], [2, "감사합니다 🙏", 790]],
  },
  {
    id: "church", name: "새벽기도 3구역", kind: "group", size: 14,
    members: [m("ch1", "김정호 장로님", 57, 2, "elder"), m("ch2", "이순자 권사님", 44, 2, "elder"), m("ch3", "박미경 집사", 20, 0, "parent"), m("ch4", "청년 다니엘", 31, -1, "young")],
    base: 0.3, politics: 0.85,
    idle: ["오늘도 승리하세요🙏", "기도제목 나눠주세요", "샬롬~~", "수요예배 7시 반입니다", "아멘🙏"],
    seed: [[0, "샬롬~~ 좋은 아침입니다🌸", 600], [1, "아멘🙏", 590]],
  },
  {
    id: "hiking", name: "북한산 사랑 산악회 🏔", kind: "group", size: 38,
    members: [m("h1", "회장 김덕수", 55, 2, "elder"), m("h2", "총무 정미숙", 41, 0, "elder"), m("h3", "박영철", null, 1, "elder"), m("h4", "최순옥", 44, -1, "elder")],
    base: 0.35, politics: 0.9,
    idle: ["이번 주 토요일 9시 구파발역 2번 출구입니다~~", "좋은 아침입니다🌸🌸", "[사진]", "회비 입금 부탁드립니다", "날씨 좋습니다👍"],
    seed: [[1, "이번 주 토요일 9시 구파발역 2번 출구입니다~~", 700], [0, "[사진]", 650]],
  },
  {
    id: "rightopen", name: "자유대한민국 수호 애국방 🇰🇷", kind: "group", open: true, size: 287,
    members: [m("r1", "멸공없이못살아", null, 2, "anon"), m("r2", "태극기할매", null, 2, "elder"), m("r3", "자유수호", null, 2, "anon"), m("r4", "청년우파", null, 2, "young"), m("r5", "지나가던사람", null, -2, "anon")],
    base: 0.5, politics: 1,
    idle: ["좋은 아침입니다🇰🇷", "새로 오신 분 인사하세요", "공지 꼭 읽어주세요", "오늘도 힘냅시다!!"],
    seed: [[0, "자유민주주의를 지키려 하는 여러분 반갑습니다", 30], [2, "입장 10분 내로 답변 없으면 강퇴합니다", 29]],
  },
  {
    id: "leftopen", name: "민주시민 촛불방 (당원)", kind: "group", open: true, size: 412,
    members: [m("l1", "촛불시민", null, -2, "anon"), m("l2", "응원봉든직장인", null, -2, "young"), m("l3", "깨어있는시민", null, -2, "anon"), m("l4", "밭가는농부", null, -2, "elder"), m("l5", "중도인데요", null, 2, "anon")],
    base: 0.5, politics: 1,
    idle: ["새로 오신 분 반갑습니다", "공지 확인 부탁드려요", "오늘도 수고 많으셨습니다", "겸공 보셨어요?"],
    seed: [[0, "청원 링크 공지에 올렸습니다", 25], [1, "동의 완료!", 24]],
  },
  {
    id: "aunt", name: "큰고모", kind: "dm",
    members: [AUNT], base: 0.12, politics: 0.85,
    idle: ["잘 지내지?", "주말에 보자", "엄마한테 안부 전해라", "밥 잘 챙겨 먹고~"],
    seed: [[0, "주말에 보자", 2400], [0, "뉴스공장 꼭 봐라 요즘", 2399]],
  },
  {
    id: "sangwoo", name: "상우", kind: "dm",
    members: [SANGWOO], base: 0.15, politics: 0.8,
    idle: ["야 살아있냐", "이번 주 술 ㄱ?", "ㅋㅋㅋㅋ", "동창회 오냐"],
    seed: [[0, "야 살아있냐", 2000], [-1, "ㅇㅇ 바빠", 1990]],
  },
  {
    id: "jihyun", name: "지현", kind: "dm",
    members: [JIHYUN], base: 0.5, politics: 0.3,
    idle: ["야 오늘 저녁 됨?", "7시 성수", "ㅋㅋㅋㅋ 미쳤다", "나 퇴사할까", "넷플 뭐 봄?"],
    seed: [[0, "야 오늘 저녁 됨?", 90], [-1, "ㅇㅇ 몇 시", 88], [0, "7시 성수", 88]],
  },
  {
    id: "boss", name: "김성훈 팀장님", kind: "dm", work: true,
    members: [BOSS], base: 0.2, politics: 0.25,
    idle: ["내일 오전까지 보고서 수정본 부탁해요", "오늘 회식 참석 가능해요?", "고생 많았어요", "자료 확인했습니다"],
    seed: [[0, "내일 오전까지 보고서 수정본 부탁해요", 75], [-1, "네 팀장님 알겠습니다", 74]],
  },
];

export const ROOMS: readonly Room[] = [...MAIN_ROOMS, ...MORE_ROOMS];

export const ROOM_BY_ID = new Map(ROOMS.map((room) => [room.id, room]));
