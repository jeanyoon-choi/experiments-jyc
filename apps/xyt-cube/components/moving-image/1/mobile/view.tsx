import type { PointerEvent, RefObject } from "react";
import { useMobileLanguage } from "./language";
import styles from "./mobile.module.css";

export type MotionPermission = "idle" | "listening" | "denied" | "unavailable";

const copy = {
  ko: {
    title: "단면",
    lede: "영상은 프레임이 시간 순서로 쌓인 덩어리입니다. 큰 화면은 그 덩어리를 자른 한 면입니다. 폰을 화면과 나란히 들고 누르고 있는 동안, 폰이 그 자르는 면이 됩니다.",
    action: "기울기 켜기",
    face: "정면으로",
    idle: "끌어서 돌리거나 기울기를 켜세요.",
    listening: "누른 채로 폰을 돌리세요.",
    holding: "폰이 단면입니다.",
    denied: "모션이 거부되었습니다. 끌어서 돌리세요.",
    unavailable: "모션이 없는 기기입니다. 끌어서 돌리세요.",
    canvas: "영상 큐브와 지금의 단면",
  },
  en: {
    title: "The cut",
    lede: "A video is a block of frames stacked in time. The big screen shows one cut through that block. Hold the phone parallel to the screen; while you press, the phone is the cutting plane.",
    action: "Enable tilt",
    face: "Face front",
    idle: "Drag to turn, or enable tilt.",
    listening: "Press and turn the phone.",
    holding: "The phone is the cut.",
    denied: "Motion was denied. Drag to turn.",
    unavailable: "No motion on this device. Drag to turn.",
    canvas: "The video cube and its current cut",
  },
} as const;

export default function CubismMobileView({
  canvasRef,
  permission,
  holding,
  failure,
  onEnableMotion,
  onFace,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  permission: MotionPermission;
  holding: boolean;
  failure: string | null;
  onEnableMotion: () => void | Promise<void>;
  onFace: () => void;
  onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLCanvasElement>) => void;
}) {
  const text = copy[useMobileLanguage()];
  const prompt = failure ?? (holding ? text.holding : text[permission]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{text.title}</h1>
        <p className={styles.lede}>{text.lede}</p>
      </header>
      <canvas
        ref={canvasRef}
        className={styles.field}
        aria-label={text.canvas}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      />
      <footer className={styles.footer}>
        <p className={styles.prompt}>{prompt}</p>
        <div className={styles.actions}>
          {permission === "idle" && (
            <button type="button" className={styles.action} onClick={onEnableMotion}>
              {text.action}
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={onFace}>
            {text.face}
          </button>
        </div>
      </footer>
    </main>
  );
}
