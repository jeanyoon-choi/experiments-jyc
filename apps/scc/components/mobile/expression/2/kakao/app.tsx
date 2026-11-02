import { useEffect, useState, useSyncExternalStore } from "react";
import type { ChatMessage, ChatStore } from "../director/chat";
import { ROOM_BY_ID } from "../director/rooms";
import { Face } from "./avatar";
import { ChatList } from "./chat-list";
import { ChatRoom } from "./chat-room";
import { badge } from "./format";
import { Friends } from "./friends";
import { ChatIcon, MoreIcon, NowIcon, PersonIcon, ShopIcon } from "./icons";
import styles from "./kakao.module.css";

type Tab = "friends" | "chats";

const BANNER_MS = 2200;

export function KakaoApp({ store, onSend }: { store: ChatStore; onSend: (roomId: string, text: string) => void }) {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  const [tab, setTab] = useState<Tab>("chats");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openedAt, setOpenedAt] = useState(0);
  const [expiredId, setExpiredId] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const latest = store.latest;
  // Inside a room, other rooms arrive as a banner over the header.
  const banner: ChatMessage | null = latest && openId && latest.roomId !== openId && latest.at >= openedAt && latest.id !== expiredId ? latest : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const bannerId = banner?.id ?? 0;
  useEffect(() => {
    if (!bannerId) return;
    const timer = window.setTimeout(() => setExpiredId(bannerId), BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [bannerId]);

  const open = (id: string | null) => {
    setOpenId(id);
    setOpenedAt(Date.now());
    store.open(id);
  };

  const total = store.totalUnread();
  const bannerRoom = banner ? ROOM_BY_ID.get(banner.roomId) : null;
  const bannerMember = bannerRoom?.members.find((member) => member.id === banner?.sender) ?? bannerRoom?.members[0];

  return (
    <div className={styles.app}>
      <div className={styles.tabs} aria-hidden={openId ? true : undefined}>
        {tab === "chats" ? <ChatList store={store} now={now} onOpen={open} /> : <Friends onOpen={open} />}
        <nav className={styles.tabBar} aria-label="카카오톡 탭">
          <button type="button" aria-label="친구" data-active={tab === "friends"} onClick={() => setTab("friends")}>
            <PersonIcon filled={tab === "friends"} />
          </button>
          <button type="button" aria-label="채팅" data-active={tab === "chats"} onClick={() => setTab("chats")}>
            <ChatIcon filled={tab === "chats"} />
            {total > 0 && <span className={styles.tabBadge}>{badge(total)}</span>}
          </button>
          <button type="button" aria-label="지금" disabled><NowIcon /></button>
          <button type="button" aria-label="쇼핑" disabled><ShopIcon /></button>
          <button type="button" aria-label="더보기" disabled><MoreIcon /></button>
        </nav>
      </div>
      {openId && (
        <ChatRoom
          key={openId}
          store={store}
          roomId={openId}
          onBack={() => open(null)}
          onSend={(text) => onSend(openId, text)}
        />
      )}
      {banner && bannerRoom && bannerMember && (
        <button type="button" className={styles.banner} onClick={() => open(banner.roomId)}>
          <Face member={bannerMember} size={36} />
          <span>
            <strong>{bannerRoom.kind === "group" ? `${bannerRoom.name} · ${bannerMember.name}` : bannerRoom.name}</strong>
            <span>{banner.text}</span>
          </span>
        </button>
      )}
    </div>
  );
}
