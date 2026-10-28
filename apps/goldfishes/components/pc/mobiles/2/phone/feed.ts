// The strikes, as they come: socket feed/1 from the main screen (bubble/7),
// or `?source=demo`, the in-browser stand-in screen. Unlike pc/mobiles/1 this
// keeps no copy of the slots' state: every item is handed on at once, as an
// interrupt (the phones do the rest).

import { connectFeed, type FeedItem, type FeedKeyword, type FeedPush, type FeedStatus } from "@/components/transport/feed/1";
import { FeedDemo } from "@/components/transport/feed/1/demo";
import { feedLog } from "@/components/transport/feed/1/log";
import { events } from "@/socket/experiments/feed/1/protocol.mjs";

export type FeedSource = "socket" | "demo";

export type FeedHandlers = {
  items(items: FeedItem[]): void;
  vocabulary(vocabulary: FeedKeyword[]): void;
  status(status: FeedStatus): void;
};

export function subscribe(source: FeedSource, demoVocabulary: FeedKeyword[], on: FeedHandlers) {
  if (source === "demo") {
    const demo = new FeedDemo(demoVocabulary, (push: FeedPush) => on.items(push.items));
    queueMicrotask(() => {
      on.vocabulary(demoVocabulary);
      on.status("live");
    });
    feedLog("pc", "pc/mobiles/2: source demo (in-browser stand-in screen)");
    return () => demo.close();
  }
  // The screen followed: the first heard from, until another is the one actually
  // sending (a screen left in a hidden window stays connected and silent).
  let screen: string | null = null;
  let lastPush = 0;
  const connection = connectFeed("pc", (status, error) => {
    feedLog("pc", `pc/mobiles/2: status ${status}`, error ?? "");
    on.status(status);
  });
  const { socket } = connection;
  socket.on(events.presence, (presence: { screens: number }) => {
    if (presence.screens === 0) feedLog("pc", "pc/mobiles/2: NO SCREEN — open /screen/bubble/7 in its own visible window");
  });
  socket.on(events.snapshotOut, (snapshot: { screen: string; vocabulary: FeedKeyword[] }) => {
    if (screen !== null && snapshot.screen !== screen) return;
    screen = snapshot.screen;
    on.vocabulary(snapshot.vocabulary);
  });
  socket.on(events.pushOut, (push: FeedPush & { screen: string }) => {
    const now = Date.now();
    if (screen === null || (push.screen !== screen && now - lastPush > 3_000)) {
      if (screen !== push.screen) feedLog("pc", `pc/mobiles/2: following screen ${push.screen} (the one sending)`);
      screen = push.screen;
    }
    if (push.screen !== screen) return;
    lastPush = now;
    on.items(push.items);
  });
  socket.on(events.screenGone, ({ screen: gone }: { screen: string }) => {
    if (gone === screen) screen = null;
  });
  socket.on("disconnect", () => {
    screen = null;
  });
  return () => connection.close();
}
