"use client";

// moving-image/2's sole browser transport boundary. While the relay is unreachable
// the same model runs locally, so the screen can still be bent by hand.
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  bend as bendLocal,
  createBendRuntime,
  flatten as flattenLocal,
  setClip,
  setOperation,
  setRate,
  snapshotBend,
  type BendAmount,
  type BendOperation,
  type BendReceived,
  type BendSnapshot,
} from "../model";

export type CubismRole = "mobile" | "screen";

export type CubismPresence = {
  experimentId: "moving-image";
  version: "2";
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
  join: "moving-image-2:join",
  hello: "moving-image-2:hello",
  presence: "moving-image-2:presence",
  stateOut: "moving-image-2:state",
  bendIn: "moving-image-2:bend:in",
  flattenIn: "moving-image-2:flatten:in",
  operationIn: "moving-image-2:operation:in",
  rateIn: "moving-image-2:rate:in",
  clipIn: "moving-image-2:clip:in",
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

export function useBendSocket({ role }: { role: CubismRole }) {
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);
  const localRef = useRef(createBendRuntime(0));
  const receivedRef = useRef<BendReceived | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<CubismPresence | null>(null);
  const [rate, setRateState] = useState(1);
  const [clip, setClipState] = useState<string | null>(null);
  const [operation, setOperationState] = useState<BendOperation>("shear");
  const [amounts, setAmountsState] = useState<BendSnapshot["amounts"] | null>(null);

  const receive = useCallback((snapshot: BendSnapshot) => {
    receivedRef.current = { snapshot, receivedAt: performance.now() };
    setRateState(snapshot.rate);
    setClipState(snapshot.clip);
    setOperationState(snapshot.operation);
    setAmountsState(snapshot.amounts);
  }, []);

  /** Offline: the local runtime answers instead of the relay. */
  const receiveLocal = useCallback(() => {
    receive(snapshotBend(localRef.current, performance.now()) as BendSnapshot);
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
        { version: "2", role },
        (result?: { ok?: boolean; error?: string }) => {
          if (result?.ok === false) {
            setConnectionError(result.error ?? "moving-image/2 relay access was denied");
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
      ({ state, presence: nextPresence }: { state: BendSnapshot; presence: CubismPresence }) => {
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
    local.operation = last.snapshot.operation;
    local.amounts = Object.fromEntries(
      Object.entries(last.snapshot.amounts).map(([key, value]) => [key, [...value]]),
    ) as typeof local.amounts;
    local.playhead = last.snapshot.playhead + (last.snapshot.rate * (now - last.receivedAt)) / 1000;
    local.rate = last.snapshot.rate;
    local.clip = last.snapshot.clip;
    local.anchoredAt = now;
  }, []);

  const bend = useCallback(
    (delta: BendAmount) => {
      if (joinedRef.current) {
        socketRef.current?.emit(events.bendIn, { delta });
        return;
      }
      syncLocal();
      if (bendLocal(localRef.current, delta)) receiveLocal();
    },
    [receiveLocal, syncLocal],
  );

  const flatten = useCallback(() => {
    if (joinedRef.current) {
      socketRef.current?.emit(events.flattenIn);
      return;
    }
    syncLocal();
    if (flattenLocal(localRef.current)) receiveLocal();
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

  const changeOperation = useCallback(
    (next: BendOperation) => {
      if (joinedRef.current) {
        socketRef.current?.emit(events.operationIn, { operation: next });
        return;
      }
      syncLocal();
      if (setOperation(localRef.current, next)) receiveLocal();
    },
    [receiveLocal, syncLocal],
  );

  return {
    connected,
    connectionError,
    presence,
    rate,
    clip,
    operation,
    amounts,
    receivedRef,
    bend,
    flatten,
    changeRate,
    changeClip,
    changeOperation,
  };
}
