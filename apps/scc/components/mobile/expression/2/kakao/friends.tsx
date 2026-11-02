import { ROOMS } from "../director/rooms";
import { Face } from "./avatar";
import { GearIcon, PersonIcon, SearchIcon } from "./icons";
import styles from "./kakao.module.css";

const STATUS: Record<string, string> = {
  mom: "우리 딸 아들 화이팅", partner: "💛", boss: "Customer First", crush: "🌙", friend: "성수 맛집 탐방 중",
  surgery: "상담 예약 DM 주세요", pt: "바디프로필 전문", aunt: "", junior: "열심히 하겠습니다!", t1: "",
  dad: "", ex: "", mm: "", dg: "",
};

const FRIENDS = ROOMS.filter((room) => room.kind === "dm")
  .map((room) => ({ roomId: room.id, member: room.members[0], name: room.name }))
  .sort((a, b) => a.name.localeCompare(b.name, "ko"));

export function Friends({ onOpen }: { onOpen: (roomId: string) => void }) {
  return (
    <section className={styles.tabScreen}>
      <header className={styles.tabHeader}>
        <h1>친구</h1>
        <div className={styles.headerActions}>
          <button type="button" aria-label="검색"><SearchIcon /></button>
          <button type="button" aria-label="친구 추가"><PersonIcon size={24} /></button>
          <button type="button" aria-label="설정"><GearIcon /></button>
        </div>
      </header>
      <div className={styles.friendMe}>
        <Face member={{ avatar: null }} size={58} />
        <span>
          <strong>나</strong>
          <small>오늘도 웃는 얼굴로 :)</small>
        </span>
      </div>
      <p className={styles.friendSection}>친구 {FRIENDS.length}</p>
      <ul className={styles.friendList}>
        {FRIENDS.map((friend) => (
          <li key={friend.roomId}>
            <button type="button" onClick={() => onOpen(friend.roomId)}>
              <Face member={friend.member} size={44} />
              <span>
                <strong>{friend.name}</strong>
                {STATUS[friend.member.id] && <small>{STATUS[friend.member.id]}</small>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
