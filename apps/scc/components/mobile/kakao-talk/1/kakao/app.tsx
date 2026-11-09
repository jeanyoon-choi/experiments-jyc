import { useEffect, useState, useSyncExternalStore } from "react";
import type { ChatMessage, ChatStore } from "../director/chat";
import { ROOM_BY_ID } from "../director/rooms";
import { Face } from "./avatar";
import { ChatList } from "./chat-list";
import { ChatRoom } from "./chat-room";
import styles from "./kakao.module.css";

const BANNER_MS = 2200;
const POP_MS = 300;

export function KakaoApp({ store, onSend }: { store: ChatStore; onSend: (roomId: string, text: string) => void }) {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  const [openId, setOpenId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
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
    setClosing(false);
    setOpenedAt(Date.now());
    store.open(id);
  };

  // iOS pop: the room slides back out before it unmounts.
  const back = () => {
    if (closing) return;
    setClosing(true);
    store.open(null);
    window.setTimeout(() => open(null), POP_MS);
  };

  const bannerRoom = banner ? ROOM_BY_ID.get(banner.roomId) : null;
  const bannerMember = bannerRoom?.members.find((member) => member.id === banner?.sender) ?? bannerRoom?.members[0];

  return (
    <div className={styles.app}>
      <div className={styles.tabs} data-covered={Boolean(openId) && !closing} aria-hidden={openId ? true : undefined}>
        <ChatList store={store} now={now} onOpen={open} />
      </div>
      {openId && (
        <ChatRoom
          key={openId}
          store={store}
          roomId={openId}
          closing={closing}
          onBack={back}
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
