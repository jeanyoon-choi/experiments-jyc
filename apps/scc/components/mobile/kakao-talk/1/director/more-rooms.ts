import type { Member, Room, Voice } from "./types";

// The rest of the participant's KakaoTalk: the many rooms a Korean phone
// collects (가족·친척, 동창, 회사, 동네, 취미, 종교, 학부모, 군대, 오픈채팅).
// Room types and their usual lean follow the research notes (Part C); members
// are drawn from a seeded generator so ids, names and leans stay stable.
// bias: mean lean of a room's members (−2 … +2); spread: how mixed it is.

type Kind = "family" | "school" | "work" | "town" | "hobby" | "faith" | "parents" | "army" | "open" | "person";

type Spec = {
  id: string;
  name: string;
  kind: Kind;
  voice: Voice;
  bias: number;
  spread: number;
  politics: number;
  /** Shown member count; 0 for a DM. */
  size: number;
  speakers?: number;
  muted?: boolean;
  open?: boolean;
  work?: boolean;
};

const IDLE: Record<Kind, readonly string[]> = {
  family: ["다들 잘 지내지?", "[사진]", "명절에 몇 시에 모이냐", "할머니 생신 선물 뭐 하지", "김장 날짜 잡자", "ㅋㅋㅋ", "건강 챙겨라"],
  school: ["다들 살아있냐 ㅋㅋ", "모임 날짜 투표 올림", "[사진] 옛날 사진 발견", "결혼 축하한다!!", "ㅋㅋㅋㅋ 미쳤다", "연말에 보자"],
  work: ["확인했습니다", "자료 공유드립니다", "넵", "회의 10분 뒤 시작합니다", "점심 뭐 드실래요", "수고하셨습니다"],
  town: ["택배 잘못 온 거 있으신 분", "주차 좀 부탁드려요", "오늘 분리수거 날이에요", "엘베 점검 2시부터입니다", "감사합니다~"],
  hobby: ["이번 주 토요일 7시 집합입니다", "[사진]", "오늘 고생하셨습니다!", "회비 입금 부탁드려요", "날씨 좋네요👍", "참석 투표 올렸습니다"],
  faith: ["오늘도 승리하세요🙏", "기도제목 나눠주세요", "아멘🙏", "이번 주 모임 7시 반입니다", "평안한 하루 되세요~"],
  parents: ["내일 준비물 안내드려요~", "감사합니다 🙏", "체험학습 신청 오늘까지래요", "독감 돌아요 조심하세요", "넵 감사해요~"],
  army: ["ㅋㅋㅋㅋ", "전역 몇 년 됐냐", "모임 ㄱ?", "ㄹㅇ", "[사진] 이거 기억남?"],
  open: ["새로 오신 분 반갑습니다", "공지 확인 부탁드려요", "안녕하세요", "오늘도 수고 많으셨습니다"],
  person: ["뭐해?", "밥 먹었어?", "주말에 시간 돼?", "ㅋㅋㅋ", "잘 지내지?", "연락 좀 해라"],
};

const SPECS: readonly Spec[] = [
  // 가족·친척
  { id: "g-mother-side", name: "외가 식구들 🌿", kind: "family", voice: "elder", bias: 0.5, spread: 1.6, politics: 0.9, size: 12 },
  { id: "g-cousins", name: "사촌들 (친가)", kind: "family", voice: "young", bias: 0, spread: 1.8, politics: 0.7, size: 8 },
  { id: "g-hometown", name: "시골 큰집 🌾", kind: "family", voice: "elder", bias: 1.6, spread: 0.6, politics: 0.95, size: 9 },
  { id: "g-anniversary", name: "엄마 아빠 결혼 40주년 준비", kind: "family", voice: "young", bias: 0, spread: 1.5, politics: 0.5, size: 4 },
  { id: "g-inlaws", name: "처가 식구들", kind: "family", voice: "parent", bias: -0.6, spread: 1.4, politics: 0.8, size: 7 },
  // 동창
  { id: "g-elem", name: "영동초 6학년 3반", kind: "school", voice: "young", bias: 0.2, spread: 1.8, politics: 0.6, size: 24 },
  { id: "g-middle", name: "신일중 3-7 ㅋㅋ", kind: "school", voice: "young", bias: 0.5, spread: 1.6, politics: 0.65, size: 17 },
  { id: "g-major", name: "경영 14학번 동기", kind: "school", voice: "young", bias: -0.5, spread: 1.6, politics: 0.6, size: 38 },
  { id: "g-club", name: "밴드 동아리 OB", kind: "school", voice: "young", bias: -0.9, spread: 1.3, politics: 0.55, size: 21 },
  { id: "g-lab", name: "대학원 연구실", kind: "school", voice: "office", bias: -0.8, spread: 1.2, politics: 0.4, size: 9, work: true },
  { id: "g-soccer", name: "고등학교 축구부 ⚽", kind: "school", voice: "young", bias: 1.2, spread: 1.1, politics: 0.75, size: 15 },
  { id: "g-hometown-friends", name: "대구 고향 친구들", kind: "school", voice: "young", bias: 1.6, spread: 0.7, politics: 0.85, size: 7 },
  { id: "g-gwangju", name: "광주 고등학교 친구들", kind: "school", voice: "young", bias: -1.6, spread: 0.7, politics: 0.85, size: 8 },
  // 회사
  { id: "g-strategy", name: "전략기획팀", kind: "work", voice: "office", bias: 0.5, spread: 1.3, politics: 0.3, size: 11, work: true },
  { id: "g-tf", name: "신사업 TF", kind: "work", voice: "office", bias: 0, spread: 1.4, politics: 0.25, size: 6, work: true },
  { id: "g-futsal", name: "사내 풋살 동호회", kind: "work", voice: "young", bias: 0.8, spread: 1.3, politics: 0.5, size: 19, work: true },
  { id: "g-lunch", name: "점심 같이 먹는 사람들 🍚", kind: "work", voice: "young", bias: -0.4, spread: 1.5, politics: 0.45, size: 5, work: true },
  { id: "g-prev-job", name: "전 직장 동기들", kind: "work", voice: "young", bias: 0.2, spread: 1.7, politics: 0.6, size: 9 },
  { id: "g-client", name: "한빛물산 × 우리 협업방", kind: "work", voice: "office", bias: 0.7, spread: 1.0, politics: 0.15, size: 8, work: true },
  { id: "g-execs", name: "임원 보고 라인", kind: "work", voice: "office", bias: 1.3, spread: 0.8, politics: 0.35, size: 6, work: true },
  // 동네
  { id: "g-apt-board", name: "3단지 입주자대표회의", kind: "town", voice: "anon", bias: 1.0, spread: 1.2, politics: 0.7, size: 63 },
  { id: "g-mangwon", name: "망원동 주민 소통방", kind: "town", voice: "anon", bias: -1.0, spread: 1.2, politics: 0.6, size: 211 },
  { id: "g-moms", name: "동네 엄마들 (래미안)", kind: "town", voice: "parent", bias: -0.2, spread: 1.5, politics: 0.55, size: 14 },
  { id: "g-morning-soccer", name: "새벽 조기축구회", kind: "town", voice: "elder", bias: 1.5, spread: 0.9, politics: 0.85, size: 41 },
  { id: "g-shops", name: "상가 번영회", kind: "town", voice: "elder", bias: 1.2, spread: 1.0, politics: 0.8, size: 27 },
  { id: "g-dong-103", name: "103동 이웃들", kind: "town", voice: "parent", bias: 0.3, spread: 1.5, politics: 0.5, size: 32 },
  // 취미
  { id: "g-golf", name: "주말 골프 ⛳ 4인방", kind: "hobby", voice: "office", bias: 1.4, spread: 0.8, politics: 0.8, size: 4 },
  { id: "g-running", name: "한강 러닝크루 🏃", kind: "hobby", voice: "young", bias: -1.0, spread: 1.1, politics: 0.45, size: 58 },
  { id: "g-tennis", name: "테니스 동호회", kind: "hobby", voice: "office", bias: 0.4, spread: 1.4, politics: 0.5, size: 26 },
  { id: "g-fishing", name: "낚시 동호회 🎣", kind: "hobby", voice: "elder", bias: 1.5, spread: 0.8, politics: 0.85, size: 33 },
  { id: "g-camping", name: "캠핑 모임", kind: "hobby", voice: "parent", bias: 0.2, spread: 1.5, politics: 0.5, size: 12 },
  { id: "g-books", name: "목요 독서모임 📚", kind: "hobby", voice: "young", bias: -1.4, spread: 0.9, politics: 0.65, size: 11 },
  { id: "g-wine", name: "와인 모임", kind: "hobby", voice: "office", bias: -0.3, spread: 1.4, politics: 0.4, size: 8 },
  { id: "g-bowling", name: "볼링 동호회", kind: "hobby", voice: "parent", bias: 0.8, spread: 1.3, politics: 0.6, size: 22 },
  { id: "g-baseball", name: "직관 메이트 ⚾", kind: "hobby", voice: "young", bias: 0.3, spread: 1.6, politics: 0.5, size: 6 },
  { id: "g-stocks", name: "주식 스터디 (실명)", kind: "hobby", voice: "office", bias: 0.9, spread: 1.2, politics: 0.65, size: 15 },
  // 종교
  { id: "g-catholic", name: "성당 청년회", kind: "faith", voice: "young", bias: -0.6, spread: 1.3, politics: 0.45, size: 23 },
  { id: "g-men-mission", name: "남선교회 2부", kind: "faith", voice: "elder", bias: 1.8, spread: 0.5, politics: 0.95, size: 31 },
  { id: "g-temple", name: "불교 신행회", kind: "faith", voice: "elder", bias: 0.6, spread: 1.3, politics: 0.6, size: 19 },
  // 학부모
  { id: "g-class24", name: "2학년 4반 학부모", kind: "parents", voice: "parent", bias: -0.2, spread: 1.4, politics: 0.4, size: 26 },
  { id: "g-taekwondo", name: "태권도 학부모방", kind: "parents", voice: "parent", bias: 0.4, spread: 1.4, politics: 0.4, size: 18 },
  { id: "g-math", name: "수학학원 중2반 학부모", kind: "parents", voice: "parent", bias: 0.6, spread: 1.3, politics: 0.45, size: 21 },
  { id: "g-daycare", name: "햇살반 어린이집", kind: "parents", voice: "parent", bias: -0.4, spread: 1.3, politics: 0.35, size: 15 },
  // 군대
  { id: "g-marines", name: "해병 1023기 🔴🟡", kind: "army", voice: "young", bias: 1.6, spread: 0.7, politics: 0.85, size: 26 },
  { id: "g-airforce", name: "공군 동기들", kind: "army", voice: "young", bias: 0.7, spread: 1.4, politics: 0.65, size: 12 },
  // 오픈채팅
  { id: "o-realestate", name: "부동산 스터디 (오픈)", kind: "open", voice: "anon", bias: 1.0, spread: 1.0, politics: 0.8, size: 1408, open: true },
  { id: "o-daytrade", name: "주식 단타방 📈", kind: "open", voice: "anon", bias: 0.8, spread: 1.2, politics: 0.6, size: 932, open: true },
  { id: "o-momcafe", name: "마포 맘카페 오픈방", kind: "open", voice: "parent", bias: -0.6, spread: 1.2, politics: 0.6, size: 487, open: true },
  { id: "o-taegeuk", name: "태극기 애국시민 대구방 🇰🇷", kind: "open", voice: "elder", bias: 2, spread: 0.2, politics: 1, size: 214, open: true },
  { id: "o-songpa", name: "윤어게인 송파구 투표용지", kind: "open", voice: "anon", bias: 2, spread: 0.2, politics: 1, size: 176, open: true },
  { id: "o-freeuniv", name: "자유대학 청년방", kind: "open", voice: "young", bias: 2, spread: 0.3, politics: 1, size: 302, open: true },
  { id: "o-lightstick", name: "응원봉 들고 나간 사람들 💡", kind: "open", voice: "young", bias: -2, spread: 0.2, politics: 1, size: 655, open: true },
  { id: "o-reform", name: "검찰개혁 촛불시민 연대", kind: "open", voice: "anon", bias: -2, spread: 0.2, politics: 1, size: 388, open: true },
  { id: "o-members", name: "권리당원 서울 마포갑", kind: "open", voice: "anon", bias: -2, spread: 0.3, politics: 1, size: 241, open: true },
  { id: "o-debate", name: "2030 정치 토론방 (반말)", kind: "open", voice: "young", bias: 0.2, spread: 1.9, politics: 1, size: 1120, open: true },
  // 1:1
  { id: "p-cousin", name: "민혁이 형", kind: "person", voice: "young", bias: 1, spread: 0, politics: 0.6, size: 0 },
  { id: "p-uncle", name: "외삼촌", kind: "person", voice: "elder", bias: 2, spread: 0, politics: 0.9, size: 0 },
  { id: "p-aunt2", name: "이모", kind: "person", voice: "elder", bias: -1, spread: 0, politics: 0.6, size: 0 },
  { id: "p-director", name: "최 부장님", kind: "person", voice: "office", bias: 2, spread: 0, politics: 0.35, size: 0, work: true },
  { id: "p-deputy", name: "윤 대리", kind: "person", voice: "office", bias: -1, spread: 0, politics: 0.3, size: 0, work: true },
  { id: "p-client", name: "한빛물산 김 과장님", kind: "person", voice: "office", bias: 1, spread: 0, politics: 0.2, size: 0, work: true },
  { id: "p-trainer", name: "PT 정우 쌤", kind: "person", voice: "office", bias: 1, spread: 0, politics: 0.25, size: 0 },
  { id: "p-hair", name: "헤어 원장님", kind: "person", voice: "office", bias: 0, spread: 0, politics: 0.2, size: 0 },
  { id: "p-senior", name: "대학 선배 수진", kind: "person", voice: "young", bias: -2, spread: 0, politics: 0.7, size: 0 },
  { id: "p-junior", name: "후배 도현", kind: "person", voice: "young", bias: 1, spread: 0, politics: 0.55, size: 0 },
  { id: "p-ex-colleague", name: "전 직장 하린", kind: "person", voice: "young", bias: -1, spread: 0, politics: 0.45, size: 0 },
  { id: "p-friend-tk", name: "대구 성민", kind: "person", voice: "young", bias: 2, spread: 0, politics: 0.8, size: 0 },
  { id: "p-friend-hn", name: "광주 은지", kind: "person", voice: "young", bias: -2, spread: 0, politics: 0.8, size: 0 },
  { id: "p-date", name: "소개팅 민서", kind: "person", voice: "young", bias: 0, spread: 0, politics: 0.3, size: 0 },
  { id: "p-realtor", name: "공인중개사 박 사장님", kind: "person", voice: "elder", bias: 1, spread: 0, politics: 0.5, size: 0 },
  { id: "p-grandma", name: "할머니", kind: "person", voice: "elder", bias: 2, spread: 0, politics: 0.6, size: 0 },
  { id: "p-neighbor", name: "옆집 형님", kind: "person", voice: "parent", bias: 1, spread: 0, politics: 0.6, size: 0 },
];

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송"];
const GIVEN = [
  "민준", "서준", "도윤", "예준", "시우", "하준", "지호", "준서", "현우", "지훈", "건우", "우진", "민재", "현준", "성민", "태현",
  "서연", "서윤", "지우", "하은", "민서", "지유", "수아", "지민", "채원", "예린", "다은", "소율", "은지", "유진", "하린", "수빈",
  "영수", "정호", "상철", "미숙", "순자", "영희", "경자", "명수", "춘자", "덕수", "광수", "정숙",
];
const NICKS = ["자유인", "깨어있는시민", "새벽별", "지나가던사람", "익명의 회원", "동네주민", "한강러버", "현실주의자", "직장인A", "등산좋아", "푸른하늘", "시민1", "투자자", "팩트체커", "애국시민", "촛불", "솔직한사람", "중도입니다"];
const ELDER_GIVEN = new Set(["영수", "정호", "상철", "미숙", "순자", "영희", "경자", "명수", "춘자", "덕수", "광수", "정숙"]);

// Small seeded generator (mulberry32) so the rooms are the same on every load.
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clampLean = (value: number) => Math.max(-2, Math.min(2, Math.round(value)));

function build(spec: Spec, index: number): Room {
  const random = seeded(9173 + index * 131);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const lean = () => clampLean(spec.bias + (random() * 2 - 1) * spec.spread);
  const face = () => (random() < 0.3 ? null : 1 + Math.floor(random() * 56));
  const idle = IDLE[spec.kind];

  if (spec.kind === "person") {
    const member: Member = { id: `${spec.id}-0`, name: spec.name, avatar: face(), lean: clampLean(spec.bias), voice: spec.voice };
    return {
      id: spec.id, name: spec.name, kind: "dm", members: [member], base: 0.15, politics: spec.politics, idle,
      muted: spec.muted, work: spec.work, seed: [[0, pick(idle), 0]],
    };
  }

  const count = spec.speakers ?? (spec.open ? 5 : Math.min(6, Math.max(3, Math.round(spec.size / 4))));
  const used = new Set<string>();
  const members: Member[] = [];
  for (let slot = 0; slot < count; slot += 1) {
    let name = "";
    for (let attempt = 0; attempt < 8 && (!name || used.has(name)); attempt += 1) {
      if (spec.open) name = pick(NICKS);
      else {
        const given = spec.voice === "elder" ? pick([...ELDER_GIVEN]) : pick(GIVEN.filter((entry) => !ELDER_GIVEN.has(entry)));
        name = spec.kind === "work" || spec.kind === "parents" ? `${pick(SURNAMES)}${given}` : given;
        if (spec.kind === "parents") name = `${given}${random() < 0.5 ? "맘" : " 아버님"}`;
      }
    }
    used.add(name);
    // Elders in a young room, and the reverse, keep the room's own register.
    members.push({ id: `${spec.id}-${slot}`, name, avatar: spec.open ? null : face(), lean: lean(), voice: spec.voice });
  }
  // An open chat of one side keeps one dissenter to shout down.
  if (spec.open && spec.spread < 0.5) members[members.length - 1] = { ...members[members.length - 1], lean: spec.bias > 0 ? -2 : 2 };

  return {
    id: spec.id, name: spec.name, kind: "group", open: spec.open, size: spec.size, members,
    base: spec.open ? 0.4 : 0.25, politics: spec.politics, idle, muted: spec.muted, work: spec.work,
    seed: [[0, pick(idle), 0], [1, pick(idle), 0]],
  };
}

export const MORE_ROOMS: readonly Room[] = SPECS.map(build);
