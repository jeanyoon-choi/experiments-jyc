"use client";

// moving-image/1's sole browser transport boundary. While the relay is unreachable
// the same model runs locally, so the screen can still be turned by hand.
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  createCubismRuntime,
  facePlane,
  setClip,
  setPivot,
  setRate,
  snapshotCubism,
  turnPlane,
  type CubismPivot,
  type CubismReceived,
  type CubismSnapshot,
  type Quaternion,
} from "../model";

export type CubismRole = "mobile" | "screen";

export type CubismPresence = {
  experimentId: "moving-image";
  version: "1";
  total: number;
  mobiles: number;
  screens: number;
  clients: Array<{
    id: string;
    role: CubismRole | "unknown";
    connectedAt: number;
  }>;
  serverTime: number;
};

const events = {
  join: "moving-image-1:join",
  hello: "moving-image-1:hello",
  presence: "moving-image-1:presence",
  stateOut: "moving-image-1:state",
  turnIn: "moving-image-1:turn:in",
  faceIn: "moving-image-1:face:in",
  rateIn: "moving-image-1:rate:in",
  clipIn: "moving-image-1:clip:in",
  pivotIn: "moving-image-1:pivot:in",
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

export function useCubismSocket({ role }: { role: CubismRole }) {
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);
  const localRef = useRef(createCubismRuntime(0));
  const receivedRef = useRef<CubismReceived | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<CubismPresence | null>(null);
  const [rate, setRateState] = useState(1);
  const [clip, setClipState] = useState<string | null>(null);
  const [pivot, setPivotState] = useState<CubismPivot>("now");

  const receive = useCallback((snapshot: CubismSnapshot) => {
    receivedRef.current = { snapshot, receivedAt: performance.now() };
    setRateState(snapshot.rate);
    setClipState(snapshot.clip);
    setPivotState(snapshot.pivot);
  }, []);

  /** Offline: the local runtime answers instead of the relay. */
  const receiveLocal = useCallback(() => {
    receive(snapshotCubism(localRef.current, performance.now()) as CubismSnapshot);
  }, [receive]);

  useEffect(() => {
    const local = localRef.current;
    local.anchoredAt = performance.now();
    receiveLocal();

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

    socket.on("connect", () => {
      setConnectionError(null);
      socket.emit(
        events.join,
        { version: "1", role },
        (result?: { ok?: boolean; error?: string }) => {
          if (result?.ok === false) {
            setConnectionError(result.error ?? "moving-image/1 relay access was denied");
            socket.disconnect();
          }
        },
      );
    });
    socket.on("disconnect", () => {
      joinedRef.current = false;
      setConnected(false);
    });
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    socket.on(
      events.hello,
      ({ state, presence: nextPresence }: { state: CubismSnapshot; presence: CubismPresence }) => {
        joinedRef.current = true;
        setConnected(true);
        receive(state);
        setPresence(nextPresence);
      },
    );
    socket.on(events.presence, setPresence);
    socket.on(events.stateOut, receive);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, [receive, receiveLocal, role]);

  /** Mirror the last relay state locally so going offline continues from it. */
  const syncLocal = useCallback(() => {
    const last = receivedRef.current;
    if (!last) return;
    const now = performance.now();
    const local = localRef.current;
    local.orientation = [...last.snapshot.orientation];
    local.playhead = last.snapshot.playhead + (last.snapshot.rate * (now - last.receivedAt)) / 1000;
    local.rate = last.snapshot.rate;
    local.clip = last.snapshot.clip;
    local.pivot = last.snapshot.pivot;
    local.anchoredAt = now;
  }, []);

  const turn = useCallback(
    (delta: Quaternion) => {
      if (joinedRef.current) {
        socketRef.current?.emit(events.turnIn, { delta });
        return;
      }
      syncLocal();
      if (turnPlane(localRef.current, delta)) receiveLocal();
    },
    [receiveLocal, syncLocal],
  );

  const face = useCallback(() => {
    if (joinedRef.current) {
      socketRef.current?.emit(events.faceIn);
      return;
    }
    syncLocal();
    facePlane(localRef.current);
    receiveLocal();
  }, [receiveLocal, syncLocal]);

  const changeRate = useCallback(
    (next: number) => {
      if (joinedRef.current) {
        socketRef.current?.emit(events.rateIn, { rate: next });
        return;
      }
      syncLocal();
      if (setRate(localRef.current, next, performance.now())) receiveLocal();
    },
    [receiveLocal, syncLocal],
  );

  const changeClip = useCallback(
    (next: string) => {
      if (joinedRef.current) {
        socketRef.current?.emit(events.clipIn, { clip: next });
        return;
      }
      syncLocal();
      if (setClip(localRef.current, next)) receiveLocal();
    },
    [receiveLocal, syncLocal],
  );

  const changePivot = useCallback(
    (next: CubismPivot) => {
      if (joinedRef.current) {
        socketRef.current?.emit(events.pivotIn, { pivot: next });
        return;
      }
      syncLocal();
      if (setPivot(localRef.current, next)) receiveLocal();
    },
    [receiveLocal, syncLocal],
  );

  return {
    connected,
    connectionError,
    presence,
    rate,
    clip,
    pivot,
    receivedRef,
    turn,
    face,
    changeRate,
    changeClip,
    changePivot,
  };
}
