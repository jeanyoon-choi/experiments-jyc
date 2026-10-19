"use client";

// spacetime/1's sole browser transport boundary.
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { SpacetimeSnapshot } from "../model";

export type SpacetimeRole = "mobile" | "screen";

export type SpacetimePresence = {
  experimentId: "spacetime";
  version: "1";
  total: number;
  mobiles: number;
  screens: number;
  clients: Array<{
    id: string;
    role: SpacetimeRole | "unknown";
    connectedAt: number;
  }>;
  serverTime: number;
};

const events = {
  join: "spacetime-1:join",
  hello: "spacetime-1:hello",
  presence: "spacetime-1:presence",
  stateOut: "spacetime-1:state",
  compactIn: "spacetime-1:compact:in",
  boostIn: "spacetime-1:boost:in",
  boostLeaveIn: "spacetime-1:boost-leave:in",
  massPressIn: "spacetime-1:mass-press:in",
  massMoveIn: "spacetime-1:mass-move:in",
  massReleaseIn: "spacetime-1:mass-release:in",
  resetIn: "spacetime-1:reset:in",
} as const;

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const port = process.env.NEXT_PUBLIC_SOCKET_PORT || "4000";
    return `${protocol}://${window.location.hostname}:${port}`;
  }
  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function useSpacetimeSocket({
  role,
  onState,
  retainState = true,
}: {
  role: SpacetimeRole;
  onState?: (state: SpacetimeSnapshot) => void;
  retainState?: boolean;
}) {
  const socketRef = useRef<Socket | null>(null);
  const onStateRef = useRef(onState);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<SpacetimePresence | null>(null);
  const [state, setState] = useState<SpacetimeSnapshot | null>(null);

  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  useEffect(() => {
    const socket = io(getSocketOrigin(), {
      path: "/socket.io",
      rejectUnauthorized: false,
      transports: ["polling", "websocket"],
      upgrade: true,
      tryAllTransports: true,
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1500,
      timeout: 6000,
    });
    socketRef.current = socket;

    const receiveState = (nextState: SpacetimeSnapshot) => {
      if (retainState) setState(nextState);
      onStateRef.current?.(nextState);
    };

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(null);
      socket.emit(
        events.join,
        { version: "1", role },
        (result?: { ok?: boolean; error?: string }) => {
          if (result?.ok === false) {
            setConnectionError(result.error ?? "spacetime relay access was denied");
            setConnected(false);
            socket.disconnect();
          }
        },
      );
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    socket.on(
      events.hello,
      ({ state: nextState, presence: nextPresence }: {
        state: SpacetimeSnapshot;
        presence: SpacetimePresence;
      }) => {
        receiveState(nextState);
        setPresence(nextPresence);
      },
    );
    socket.on(events.presence, setPresence);
    socket.on(events.stateOut, receiveState);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [retainState, role]);

  const sendCompactness = useCallback((compactness: number) => {
    socketRef.current?.emit(events.compactIn, { compactness });
  }, []);

  const sendBoost = useCallback((bx: number, by: number) => {
    socketRef.current?.emit(events.boostIn, { bx, by });
  }, []);

  const leaveBoost = useCallback(() => {
    socketRef.current?.emit(events.boostLeaveIn);
  }, []);

  const pressMass = useCallback((u: number, v: number) => {
    socketRef.current?.emit(events.massPressIn, { u, v });
  }, []);

  const moveMass = useCallback((u: number, v: number) => {
    socketRef.current?.emit(events.massMoveIn, { u, v });
  }, []);

  const releaseMass = useCallback(() => {
    socketRef.current?.emit(events.massReleaseIn);
  }, []);

  const resetSystem = useCallback(() => {
    socketRef.current?.emit(events.resetIn);
  }, []);

  return {
    connected,
    connectionError,
    presence,
    state,
    sendCompactness,
    sendBoost,
    leaveBoost,
    pressMass,
    moveMass,
    releaseMass,
    resetSystem,
  };
}
