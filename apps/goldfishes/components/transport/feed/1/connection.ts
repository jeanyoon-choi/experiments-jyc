// Browser side of socket feed/1: one Socket.IO connection that joins the
// protocol's room in a role, rejoins on every reconnect, and reports its status.
// Shared by every screen and pc version that speaks feed/1 (the one sanctioned
// cross-experiment import in Goldfishes, like desktop/native-windows/shared):
// a version picks the protocol by importing `@/components/transport/feed/1`.

import { io, type Socket } from "socket.io-client";
import { events, version } from "@/socket/experiments/feed/1/protocol.mjs";

export type FeedRole = "screen" | "pc";
export type FeedStatus = "connecting" | "live" | "offline" | "rejected";

export function socketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  const port = process.env.NEXT_PUBLIC_SOCKET_PORT || "4000";
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    return `${protocol}://${window.location.hostname}:${port}`;
  }
  return `https://localhost:${port}`;
}

export type FeedConnection = {
  socket: Socket;
  close: () => void;
};

/** Connects and joins as `role`; `onStatus` hears every change. Never throws. */
export function connectFeed(role: FeedRole, onStatus: (status: FeedStatus, error?: string) => void, onJoined?: () => void): FeedConnection {
  const socket = io(socketOrigin(), {
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionDelay: 300,
    reconnectionDelayMax: 1_500,
    timeout: 6_000,
  });
  onStatus("connecting");
  socket.on("connect", () => {
    socket.emit(events.join, { role, version }, (reply: { ok: boolean; error?: string } | undefined) => {
      if (reply?.ok) {
        onStatus("live");
        onJoined?.();
        return;
      }
      onStatus("rejected", reply?.error);
      socket.disconnect();
    });
  });
  socket.on("disconnect", () => onStatus("offline"));
  socket.on("connect_error", () => onStatus("offline"));
  return {
    socket,
    close: () => {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
