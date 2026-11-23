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
const DEAD_ZONE = 8;
const FULL_TILT = 78;

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

/** What the angle reads as; the fourth tier is its own name, 극좌 or 극우. */
const TIER = ["온건", "강경", "극단"] as const;

const toLean = (roll: number) => {
  const magnitude = Math.max(0, Math.abs(roll) - DEAD_ZONE) / (FULL_TILT - DEAD_ZONE);
  return Math.sign(roll) * Math.min(1, magnitude);
};

export default function KakaoTalkTwo() {
  const [store] = useState(() => createChatStore());
  const [director] = useState(() => createDirector(store));
  const targetRef = useRef(0);
  const sensedRef = useRef(false);
  /** The measured roll in degrees; null until a gyroscope reports. */
  const rollRef = useRef<number | null>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const [motion, setMotion] = useState<MotionState>("waiting");

  const listen = () => {
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null && event.beta === null) return;
      sensedRef.current = true;
      rollRef.current = rollOf(event);
      targetRef.current = toLean(rollRef.current);
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  };

  const unlistenRef = useRef<(() => void) | null>(null);
  const askingRef = useRef(false);

  const [notifier] = useState(() => createNotifier());

  const enable = async () => {
    if (askingRef.current) return;
    askingRef.current = true;
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
    } finally {
      askingRef.current = false;
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
    };
    const up = (event: KeyboardEvent) => {
      if (!held.delete(event.key)) return;
      if (!sensedRef.current) targetRef.current = keyLean();
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
      const stats = director.stats();
      // Background follows the tilt: party colour, deeper with the lean.
      const stage = stageRef.current;
      if (stage) {
        const amount = Math.min(1, Math.abs(stats.lean));
        stage.style.setProperty("--party", stats.lean < 0 ? "#004ea2" : "#e61e2b");
        stage.style.setProperty("--tint", amount < 0.03 ? "0" : amount.toFixed(3));
      }
      // The readout, one line: which way, how extreme the angle makes it, and the angle.
      const readout = readoutRef.current;
      if (!readout) return;
      const side = stats.lean < -0.02 ? "left" : stats.lean > 0.02 ? "right" : null;
      const degrees = rollRef.current === null ? "" : ` · ${Math.round(Math.abs(rollRef.current))}°`;
      const line = side === "left" ? `◀ ${stats.tier.left < TIER.length ? `진보 · ${TIER[stats.tier.left]}` : "극좌"}${degrees}`
        : side === "right" ? `${stats.tier.right < TIER.length ? `보수 · ${TIER[stats.tier.right]}` : "극우"}${degrees} ▶`
          : rollRef.current === null && !sensedRef.current && window.matchMedia("(pointer: fine)").matches ? "← → 키로 기울이기" : "수평";
      if (readout.textContent !== line) readout.textContent = line;
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
      <p ref={readoutRef} className={styles.readout} aria-live="off" />
      {(motion === "ask" || motion === "denied") && (
        // iOS hands out motion access on a tap: the whole screen takes it.
        <button type="button" className={styles.ask} onClick={() => { void enable(); }}>
          <span className={styles.askCard}>
            <span className={styles.askText}>
              {motion === "denied" ? "설정에서 ‘동작 및 방향 접근’을 허용한 뒤 다시 눌러 주세요" : "좌우로 기울여 보세요"}
            </span>
            <span className={styles.askButton}>{motion === "denied" ? "다시 시도" : "확인"}</span>
          </span>
        </button>
      )}
    </main>
  );
}
