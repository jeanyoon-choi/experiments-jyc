"use client";

import { useEffect, useRef, useState } from "react";
import { createChatStore } from "./director/chat";
import { createDirector } from "./director/director";
import { ROOM_BY_ID } from "./director/rooms";
import { KakaoApp } from "./kakao/app";
import { createNotifier } from "./kakao/sound";
import styles from "./screen.module.css";

const STEP_MS = 100;
/** Degrees of roll ignored around level, and the roll that counts as all the way. */
const DEAD_ZONE = 4;
const FULL_TILT = 32;

type MotionState = "waiting" | "ask" | "on" | "denied";
type PermissionRequest = () => Promise<"granted" | "denied">;

const permissionRequest = () => (
  typeof DeviceOrientationEvent !== "undefined"
    ? (DeviceOrientationEvent as unknown as { requestPermission?: PermissionRequest }).requestPermission
    : undefined
);

/** Left–right roll as the participant sees it, whatever way the screen is turned. */
function rollOf(event: DeviceOrientationEvent) {
  const angle = screen.orientation?.angle ?? 0;
  const beta = event.beta ?? 0;
  const gamma = event.gamma ?? 0;
  if (angle === 90) return beta;
  if (angle === 270 || angle === -90) return -beta;
  if (angle === 180) return -gamma;
  return gamma;
}

/** Raw sensor state the readout shows. */
type Sensor = { source: "대기" | "자이로" | "키보드"; gamma: number; beta: number; angle: number; roll: number; target: number };

const signed = (value: number, digits: number) => `${value < 0 ? "−" : value > 0 ? "+" : " "}${Math.abs(value).toFixed(digits)}`;
const TIER = ["온건", "강경", "극단"] as const;

const toLean = (roll: number) => {
  const magnitude = Math.max(0, Math.abs(roll) - DEAD_ZONE) / (FULL_TILT - DEAD_ZONE);
  return Math.sign(roll) * Math.min(1, magnitude);
};

export default function KakaoTalkOne() {
  const [store] = useState(() => createChatStore());
  const [director] = useState(() => createDirector(store));
  const targetRef = useRef(0);
  const sensedRef = useRef(false);
  const sensorRef = useRef<Sensor>({ source: "대기", gamma: 0, beta: 0, angle: 0, roll: 0, target: 0 });
  const readoutRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const [motion, setMotion] = useState<MotionState>("waiting");

  const listen = () => {
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null && event.beta === null) return;
      sensedRef.current = true;
      const roll = rollOf(event);
      targetRef.current = toLean(roll);
      sensorRef.current = { source: "자이로", gamma: event.gamma ?? 0, beta: event.beta ?? 0, angle: screen.orientation?.angle ?? 0, roll, target: targetRef.current };
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  };

  const unlistenRef = useRef<(() => void) | null>(null);

  const [notifier] = useState(() => createNotifier());

  const enable = async () => {
    notifier.unlock();
    const request = permissionRequest();
    try {
      if (request && (await request()) !== "granted") {
        setMotion("denied");
        return;
      }
    } catch {
      setMotion("denied");
      return;
    }
    unlistenRef.current?.();
    unlistenRef.current = listen();
    setMotion("on");
  };

  useEffect(() => {
    // iOS asks for motion access on a tap; elsewhere the roll arrives on its
    // own. A desktop has no gyroscope to ask for: it uses the arrow keys.
    const kickoff = window.setTimeout(() => {
      if (permissionRequest() && window.matchMedia("(pointer: coarse)").matches) setMotion("ask");
      else {
        unlistenRef.current = listen();
        setMotion("on");
      }
    }, 0);

    // Without a gyroscope, hold ← or → to lean.
    const held = new Set<string>();
    const typing = (target: EventTarget | null) => target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;
    const keyLean = () => (held.has("ArrowRight") ? 1 : 0) - (held.has("ArrowLeft") ? 1 : 0);
    const down = (event: KeyboardEvent) => {
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || typing(event.target)) return;
      held.add(event.key);
      targetRef.current = keyLean();
      if (!sensedRef.current) sensorRef.current = { ...sensorRef.current, source: "키보드", target: targetRef.current };
    };
    const up = (event: KeyboardEvent) => {
      if (!held.delete(event.key)) return;
      if (!sensedRef.current) {
        targetRef.current = keyLean();
        sensorRef.current = { ...sensorRef.current, source: "키보드", target: targetRef.current };
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    // The message sound: other rooms only, never a room with 알림 off, as the
    // app plays it while running.
    const unlock = () => notifier.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    let heard = 0;
    const unsubscribe = store.subscribe(() => {
      const latest = store.latest;
      if (!latest || latest.id === heard) return;
      heard = latest.id;
      if (latest.roomId === store.openId || ROOM_BY_ID.get(latest.roomId)?.muted) return;
      notifier.play();
    });

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      director.step(targetRef.current, performance.now(), Date.now());
      // The readout: what the sensor reports, how it becomes a lean, and
      // what the lean is doing to the rooms.
      const stats = director.stats();
      // Background follows the tilt: party colour, deeper with the lean.
      const stage = stageRef.current;
      if (stage) {
        const amount = Math.min(1, Math.abs(stats.lean));
        stage.style.setProperty("--party", stats.lean < 0 ? "#004ea2" : "#e61e2b");
        stage.style.setProperty("--tint", amount < 0.03 ? "0" : amount.toFixed(3));
      }
      const readout = readoutRef.current;
      if (!readout) return;
      const sensor = sensorRef.current;
      const arrow = stats.lean < -0.02 ? "◀ 왼쪽" : stats.lean > 0.02 ? "오른쪽 ▶" : "수평";
      const lines = [
        sensor.source === "자이로"
          ? `자이로  γ ${signed(sensor.gamma, 1)}°  β ${signed(sensor.beta, 1)}°  화면 ${sensor.angle}°`
          : sensor.source === "키보드" ? "키보드  ← / → 누르는 동안 기울기 ±1" : "센서 대기 중  (데스크톱: ← / →)",
        `roll ${signed(sensor.roll, 1)}° → 목표 ${signed(sensor.target, 2)} → 기울기 ${signed(stats.lean, 2)} ${arrow}  (불감 ±${DEAD_ZONE}° · 최대 ±${FULL_TILT}°)`,
        `진보 ${stats.heat.left.toFixed(2)} ${TIER[stats.tier.left]} · 보수 ${stats.heat.right.toFixed(2)} ${TIER[stats.tier.right]} · ${stats.perSecond}건/s (목표 ${stats.rate.toFixed(1)}) · 방 ${stats.opened}/${stats.rooms}`,
      ];
      lines.forEach((line, index) => {
        const row = readout.children[index];
        if (row && row.textContent !== line) row.textContent = line;
      });
    }, STEP_MS);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      unsubscribe();
      notifier.close();
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [director, notifier, store]);

  return (
    <main ref={stageRef} className={styles.stage}>
      <KakaoApp store={store} onSend={(roomId, text) => director.reply(roomId, text, performance.now(), Date.now())} />
      <div ref={readoutRef} className={styles.readout} aria-live="off">
        <div />
        <div />
        <div />
      </div>
      {(motion === "ask" || motion === "denied") && (
        <div className={styles.sheet} role="dialog" aria-label="기울기">
          {motion === "denied" && <p>설정에서 동작 및 방향 접근을 허용해 주세요.</p>}
          <button type="button" onClick={() => { void enable(); }}>기울기 켜기</button>
        </div>
      )}
    </main>
  );
}
