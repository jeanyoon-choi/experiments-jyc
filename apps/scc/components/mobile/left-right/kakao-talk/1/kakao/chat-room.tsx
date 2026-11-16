import { useLayoutEffect, useRef, useState } from "react";
import type { ChatMessage, ChatStore } from "../director/chat";
import { Face } from "./avatar";
import { clock, dayLabel, sameDay, sameMinute } from "./format";
import { BackIcon, HashIcon, MenuIcon, PlusIcon, SearchIcon, SendIcon, SmileIcon } from "./icons";
import styles from "./kakao.module.css";

type Props = {
  store: ChatStore;
  roomId: string;
  closing: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
};

export function ChatRoom({ store, roomId, closing, onBack, onSend }: Props) {
  const view = store.view(roomId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const [draft, setDraft] = useState("");
  const [pinned, setPinned] = useState(true);
  const [anchorId, setAnchorId] = useState(0);
  const messages = view?.messages ?? [];
  const last = messages[messages.length - 1];
  // Scrolled up: KakaoTalk previews the newest message above the input.
  const behind: ChatMessage | null = !pinned && last && last.id > anchorId && last.sender !== "me" ? last : null;

  // Messages that arrive while the room is open slide in; earlier ones do not.
  const [enteredAt] = useState(() => last?.id ?? 0);
  const autoRef = useRef(0);
  const shownRef = useRef(false);

  // Follow new messages while at the bottom: a jump on entering, then a
  // smooth scroll per arrival that the scroll handler does not mistake for
  // the participant scrolling up.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !last) return;
    if (!shownRef.current) {
      shownRef.current = true;
      scroller.scrollTop = scroller.scrollHeight;
      return;
    }
    if (pinnedRef.current || last.sender === "me") {
      autoRef.current = performance.now();
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    }
  }, [last]);

  if (!view) return null;
  const { room } = view;
  const memberOf = (id: string) => room.members.find((member) => member.id === id) ?? room.members[0];

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  return (
    <section className={styles.room} data-closing={closing}>
      <header className={styles.roomHeader}>
        <button type="button" className={styles.glassButton} aria-label="뒤로" onClick={onBack}><BackIcon size={24} /></button>
        <h2>
          <span>{room.name}</span>
          {room.kind === "group" && <small>{room.size}</small>}
        </h2>
        <div className={styles.glassPill}>
          <button type="button" aria-label="대화 검색"><SearchIcon size={22} /></button>
          <button type="button" aria-label="채팅방 메뉴"><MenuIcon size={22} /></button>
        </div>
      </header>
      <div
        ref={scrollRef}
        className={styles.thread}
        onScroll={(event) => {
          const element = event.currentTarget;
          const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
          if (!atBottom && performance.now() - autoRef.current < 600) return;
          pinnedRef.current = atBottom;
          if (atBottom !== pinned) {
            setPinned(atBottom);
            if (!atBottom) setAnchorId(last?.id ?? 0);
          }
        }}
      >
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const next = messages[index + 1];
          const newDay = !previous || !sameDay(previous.at, message.at);
          const startsRun = newDay || !previous || previous.sender !== message.sender || !sameMinute(previous.at, message.at);
          const endsRun = !next || next.sender !== message.sender || !sameMinute(next.at, message.at) || !sameDay(next.at, message.at);
          if (message.sender === "system") {
            return (
              <div key={message.id}>
                {newDay && <p className={styles.day}>{dayLabel(message.at)}</p>}
                <p className={styles.notice} data-fresh={message.id > enteredAt || undefined}>{message.text}</p>
              </div>
            );
          }
          const mine = message.sender === "me";
          const member = mine ? null : memberOf(message.sender);
          return (
            <div key={message.id}>
              {newDay && <p className={styles.day}>{dayLabel(message.at)}</p>}
              <div className={styles.line} data-mine={mine} data-start={startsRun} data-fresh={message.id > enteredAt || undefined}>
                {!mine && (
                  <span className={styles.lineFace}>{startsRun && member && <Face member={member} size={38} />}</span>
                )}
                <div className={styles.lineBody}>
                  {!mine && startsRun && member && <span className={styles.sender}>{member.name}</span>}
                  <div className={styles.bubbleRow}>
                    <p className={styles.bubble}>{message.text}</p>
                    <span className={styles.stamp}>
                      {mine && message.unread > 0 && <span className={styles.readCount}>{message.unread}</span>}
                      {endsRun && <span>{clock(message.at)}</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {behind && (
        <button
          type="button"
          className={styles.behind}
          onClick={() => {
            const scroller = scrollRef.current;
            if (scroller) scroller.scrollTop = scroller.scrollHeight;
          }}
        >
          <Face member={memberOf(behind.sender)} size={22} />
          <strong>{memberOf(behind.sender).name}</strong>
          <span>{behind.text}</span>
        </button>
      )}
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <button type="button" className={styles.composerCircle} aria-label="더보기"><PlusIcon size={20} /></button>
        <textarea
          rows={1}
          value={draft}
          placeholder="메시지 입력"
          aria-label="메시지 입력"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button type="button" className={styles.composerIcon} aria-label="이모티콘"><SmileIcon size={22} /></button>
        {draft.trim() ? (
          <button type="submit" className={styles.sendButton} aria-label="전송"><SendIcon /></button>
        ) : (
          <button type="button" className={styles.composerCircle} aria-label="샵검색"><HashIcon size={18} /></button>
        )}
      </form>
    </section>
  );
}
