import type { Member, Room, Scene, Voice } from "./types";

// How each kind of room talks. The line banks are shared; these rules decide
// which lines belong in which room, following the research notes (Part C):
// a company room stays guarded and takes politics to 1:1, a 학부모 or 입주민
// room argues in 존댓말 and stops short of 극단, a family or 동창 room goes
// all the way, and only supporters' open chats use moderation grammar.

/** Highest tier a room's talk reaches (0 온건, 1 강경, 2 극단). */
const CAP: Record<Scene, number> = {
  family: 2, friends: 2, army: 2, hobby: 2, faith: 2, open: 2,
  town: 1, parents: 1, work: 1, acquaintance: 0,
};

/** A company group stays at 온건; its people say more one to one. */
export const capOf = (room: Room) => (room.scene === "work" && room.kind === "group" ? 0 : CAP[room.scene]);

/** Rooms of near-strangers and colleagues: everyone writes 존댓말. */
const FORMAL: ReadonlySet<Scene> = new Set<Scene>(["work", "town", "parents", "acquaintance"]);

/** Scripted exchanges are written in 반말 and community slang: not for formal rooms. */
export const playsThreads = (room: Room) => room.kind === "group" && !FORMAL.has(room.scene);

/** The register a member writes in here: a young parent is polite in the 학부모 room. */
export const voiceIn = (room: Room, member: Member): Voice => (
  FORMAL.has(room.scene) && member.voice !== "elder" ? "office" : member.voice
);

/** Open-chat grammar: kicks, entry checks, roll-calls, 수박 hunts, notices. */
const OPEN_ONLY = /강퇴|분탕|프락치|입장 10분|프리홍콩|프리 홍콩|닉 기억|닉네임|좌표|수박|반명|친명|코어 지지자|탑승|인증|공지|새로 오신|작업팀|당원 게시판|이 방|방 맞죠|방 성격|여러분 반갑|애국시민 여러분|법안 클릭|청원 링크|자료 공유|속보 올라/;
/** Said to a room, never to one person. */
const GROUP_ONLY = /다들|여러분|회원님|뭉칩시다|모여주세요|만납시다|맙시다|공유 부탁|단톡|톡방|올려주세요|남겨주세요/;
/** Said among relatives. */
const FAMILY_ONLY = /가족|엄마|고모|우리 딸|같이 있을 때 뉴스|니가 아직 어려서|이민갈거냐|한국에서 살거면/;
/** An elder talking down to someone younger. */
const ELDER_ONLY = /니가 아직 어려서|너희가 공산당을|이민갈거냐|한국에서 살거면|끝까지 봐라|끝까지 보거라|뉴스 좀 봐라|알아봐라/;

/** Community slang: not from elders, and not in 존댓말 rooms. */
const SLANG = /ㅋㅋ|ㄹㅇ|ㅇㅈ|ㄷㄷ|ㅁㅊ|ㄱㄱ|맞말|실화냐|하노|갓노|오지네|찢|한가발|엠빙신|떨거지|덕질|(됨|함|임|음|듯|각|컷)[\s?.!ㅋㅎ]*$/;
/** 존댓말 endings: not how an elder writes to their own family. */
const POLITE_END = /(세요|니다|시죠|까요|네요|어요|아요|죠)[\s!.~?]*$/;

/** Whether a line belongs in this room, from this speaker. */
export function fits(text: string, room: Room, speaker?: Member) {
  const voice = speaker ? voiceIn(room, speaker) : null;
  if ((voice === "elder" || voice === "office") && SLANG.test(text)) return false;
  if (voice === "elder" && room.scene === "family" && POLITE_END.test(text)) return false;
  if (!room.open && OPEN_ONLY.test(text)) return false;
  if (room.kind === "dm" && GROUP_ONLY.test(text)) return false;
  if (room.scene !== "family" && FAMILY_ONLY.test(text)) return false;
  if (ELDER_ONLY.test(text) && speaker?.voice !== "elder" && speaker?.voice !== "parent") return false;
  return true;
}
