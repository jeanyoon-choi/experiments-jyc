"use client";

// A pc's feed: from the main screen through the relay (`source: "socket"`) or
// from the in-browser stand-in screen (`"demo"`), same state either way. The
// screen keeps the slots; a pc follows one screen (the first it hears a
// snapshot from, until that screen goes) and only draws. Pushes arriving within
// 16 ms are applied together — on a timer, not requestAnimationFrame, which
// stops in a hidden or covered window and would hold every update back.

import { useEffect, useState } from "react";
import { events } from "@/socket/experiments/feed/1/protocol.mjs";
import { connectFeed, type FeedStatus } from "./connection";
import { FeedDemo } from "./demo";
import { feedCounter, feedLog } from "./log";
import { applyPush, EMPTY_FEED } from "./state";
import type { FeedKeyword, FeedPush, FeedState } from "./types";

export type FeedSource = "socket" | "demo";

/** `source` null: not yet decided, nothing connects. */
export function useFeed(source: FeedSource | null, demoVocabulary: FeedKeyword[]) {
  const [state, setState] = useState<FeedState>(EMPTY_FEED);
  const [status, setStatus] = useState<FeedStatus>("connecting");

  useEffect(() => {
    let queued: FeedPush[] = [];
    let frame: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      frame = null;
      const pushes = queued;
      queued = [];
      setState((current) => {
        const next = pushes.reduce(applyPush, current);
        occupied = next.slots.filter((slot) => slot.fish !== null).length;
        lit = next.slots.filter((slot) => slot.attached).length;
        return next;
      });
    };
    let occupied = 0;
    let lit = 0;
    const counter = feedCounter("pc", ["pushes", "items", "released", "dark"] as const, () => `${occupied} slots followed, ${lit} lit`);
    const enqueue = (push: FeedPush) => {
      counter.add("pushes");
      counter.add("items", push.items.length);
      counter.add("released", push.released.length);
      counter.add("dark", push.idle?.length ?? 0);
      queued.push(push);
      if (frame === null) frame = setTimeout(flush, 16);
    };

    if (source === null) {
      counter.stop();
      return;
    }
    if (source === "demo") {
      const demo = new FeedDemo(demoVocabulary, enqueue);
      queueMicrotask(() => {
        setState(demo.snapshot());
        setStatus("live");
      });
      feedLog("pc", "source demo (in-browser stand-in screen)");
      return () => {
        if (frame !== null) clearTimeout(frame);
        counter.stop();
        demo.close();
      };
    }

    // The screen followed; pushes from any other are not this pc's.
    let screen: string | null = null;
    const connection = connectFeed("pc", (next, error) => {
      feedLog("pc", `status ${next}`, error ?? "");
      setStatus(next);
    });
    const { socket } = connection;
    socket.on(events.presence, (presence: { screens: number; pcs: number }) => {
      feedLog("pc", `presence: ${presence.screens} screens, ${presence.pcs} pcs${presence.screens === 0 ? " — NO SCREEN: open /screen/bubble/7 in its own visible window" : ""}`);
    });
    socket.on(events.snapshotOut, (snapshot: FeedState & { screen: string }) => {
      if (screen !== null && snapshot.screen !== screen) return;
      if (screen === null) feedLog("pc", `following screen ${snapshot.screen}`);
      screen = snapshot.screen;
      occupied = snapshot.slots.filter((slot) => slot.fish !== null).length;
      lit = snapshot.slots.filter((slot) => slot.attached).length;
      feedLog("pc", `snapshot: vocabulary ${snapshot.vocabulary.length}, ${occupied} slots followed, ${lit} lit`);
      queued = [];
      setState({ vocabulary: snapshot.vocabulary, slots: snapshot.slots });
    });
    socket.on(events.pushOut, (push: FeedPush & { screen: string }) => {
      if (push.screen === screen) enqueue(push);
    });
    socket.on(events.screenGone, ({ screen: gone }: { screen: string }) => {
      if (gone !== screen) return;
      feedLog("pc", `screen ${gone} has gone: phones dark until a screen sends its slots`);
      screen = null;
      queued = [];
      setState((current) => ({ ...current, slots: current.slots.map((slot) => ({ ...slot, fish: null, attached: false })) }));
    });
    // A reconnect may meet a new screen: follow whichever snapshot comes first.
    socket.on("disconnect", () => {
      screen = null;
    });
    return () => {
      if (frame !== null) clearTimeout(frame);
      counter.stop();
      connection.close();
    };
    // The demo's vocabulary is read once per source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  return { state, status };
}
