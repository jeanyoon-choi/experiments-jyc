import { ROOMS, type Room } from "./rooms";

// Local chat state: messages per room, unread counts, list order. Writes are
// batched; `flush` notifies subscribers once per director step.

export type ChatMessage = {
  id: number;
  roomId: string;
  /** Member id, or "me". */
  sender: string;
  text: string;
  /** Wall-clock ms. */
  at: number;
  /** For the participant's own messages: members who have not read it. */
  unread: number;
};

export type RoomView = {
  room: Room;
  messages: ChatMessage[];
  unread: number;
  lastAt: number;
  lastText: string;
};

const ROOM_HISTORY = 160;

export type ChatStore = ReturnType<typeof createChatStore>;

export function createChatStore(now = Date.now()) {
  let nextId = 1;
  let version = 0;
  let dirty = false;
  let openId: string | null = null;
  let latest: ChatMessage | null = null;
  const listeners = new Set<() => void>();
  const views = new Map<string, RoomView>();

  for (const room of ROOMS) {
    const messages = room.seed.map(([member, text, minutesAgo]): ChatMessage => ({
      id: nextId++,
      roomId: room.id,
      sender: member < 0 ? "me" : room.members[member]?.id ?? room.members[0].id,
      text,
      at: now - minutesAgo * 60_000,
      unread: 0,
    }));
    const last = messages[messages.length - 1];
    const unreadSeed = last && last.sender !== "me" ? Math.max(1, messages.filter((message) => message.sender !== "me").length - 1) : 0;
    views.set(room.id, { room, messages, unread: room.muted ? unreadSeed * 7 : unreadSeed, lastAt: last?.at ?? 0, lastText: last?.text ?? "" });
  }

  const emit = () => {
    if (!dirty) return;
    dirty = false;
    version += 1;
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getVersion: () => version,
    get openId() { return openId; },
    /** The most recent message from anyone else, for the in-app banner. */
    get latest() { return latest; },
    view: (id: string) => views.get(id),
    /** Pinned first, then latest activity, as the chat tab sorts. */
    ordered() {
      return [...views.values()].sort((a, b) => Number(Boolean(b.room.pinned)) - Number(Boolean(a.room.pinned)) || b.lastAt - a.lastAt);
    },
    totalUnread() {
      let total = 0;
      views.forEach((view) => { total += view.unread; });
      return total;
    },
    add(message: Omit<ChatMessage, "id">) {
      const view = views.get(message.roomId);
      if (!view) return null;
      const entry = { ...message, id: nextId++ };
      view.messages.push(entry);
      if (view.messages.length > ROOM_HISTORY) view.messages.splice(0, view.messages.length - ROOM_HISTORY);
      view.lastAt = entry.at;
      view.lastText = entry.text;
      if (entry.sender !== "me" && openId !== view.room.id) view.unread += 1;
      if (entry.sender !== "me") latest = entry;
      // A reply from someone means they read everything before it.
      if (entry.sender !== "me" && view.room.kind === "dm") {
        for (const earlier of view.messages) earlier.unread = 0;
      }
      dirty = true;
      return entry;
    },
    open(id: string | null) {
      openId = id;
      if (id) {
        const view = views.get(id);
        if (view) view.unread = 0;
      }
      dirty = true;
      emit();
    },
    /** Readers catch up with the participant's messages. */
    readMine(elapsed: number, random: () => number) {
      views.forEach((view) => {
        for (let index = view.messages.length - 1, seen = 0; index >= 0 && seen < 12; index -= 1, seen += 1) {
          const message = view.messages[index];
          if (message.sender !== "me" || message.unread <= 0) continue;
          const floor = view.room.kind === "dm" ? 0 : Math.floor((view.room.size ?? 2) * 0.04);
          if (message.unread > floor && random() < elapsed / 450) {
            message.unread = Math.max(floor, message.unread - Math.max(1, Math.ceil(message.unread * 0.25)));
            dirty = true;
          }
        }
      });
    },
    markDirty() { dirty = true; },
    flush: emit,
  };
}
