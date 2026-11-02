import { useState } from "react";
import type { ChatStore } from "../director/chat";
import { RoomFace } from "./avatar";
import { badge, listTime } from "./format";
import { GearIcon, MutedIcon, NewChatIcon, PinIcon, SearchIcon } from "./icons";
import styles from "./kakao.module.css";

const FOLDERS = [
  { id: "all", label: "전체" },
  { id: "unread", label: "안읽음" },
  { id: "work", label: "업무" },
] as const;
const WORK = new Set(["boss", "teamroom", "notice", "peers", "junior", "senior"]);

export function ChatList({ store, now, onOpen }: { store: ChatStore; now: number; onOpen: (id: string) => void }) {
  const [folder, setFolder] = useState<(typeof FOLDERS)[number]["id"]>("all");
  const total = store.totalUnread();
  const views = store.ordered().filter((view) => (
    folder === "all" || (folder === "unread" ? view.unread > 0 : WORK.has(view.room.id))
  ));

  return (
    <section className={styles.tabScreen}>
      <header className={styles.tabHeader}>
        <h1>채팅</h1>
        <div className={styles.headerActions}>
          <button type="button" aria-label="검색"><SearchIcon /></button>
          <button type="button" aria-label="새로운 채팅"><NewChatIcon /></button>
          <button type="button" aria-label="채팅 설정"><GearIcon /></button>
        </div>
      </header>
      <nav className={styles.folders} aria-label="채팅 폴더">
        {FOLDERS.map((entry) => (
          <button key={entry.id} type="button" data-active={folder === entry.id} onClick={() => setFolder(entry.id)}>
            {entry.label}
            {entry.id === "all" && total > 0 && <span className={styles.chipCount}>{badge(total)}</span>}
          </button>
        ))}
      </nav>
      <ul className={styles.rooms}>
        {views.map((view) => (
          <li key={view.room.id}>
            <button type="button" className={styles.roomRow} onClick={() => onOpen(view.room.id)}>
              <RoomFace room={view.room} size={46} />
              <span className={styles.roomText}>
                <span className={styles.roomName}>
                  <span className={styles.roomTitle}>{view.room.name}</span>
                  {view.room.kind === "group" && <span className={styles.roomCount}>{view.room.size}</span>}
                  {view.room.pinned && <span className={styles.roomMark}><PinIcon /></span>}
                  {view.room.muted && <span className={styles.roomMark}><MutedIcon /></span>}
                </span>
                <span className={styles.roomLast}>{view.lastText}</span>
              </span>
              <span className={styles.roomMeta}>
                <span className={styles.roomTime}>{listTime(view.lastAt, now)}</span>
                {view.unread > 0 && <span className={styles.unread} data-muted={view.room.muted ? "true" : undefined}>{badge(view.unread)}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
