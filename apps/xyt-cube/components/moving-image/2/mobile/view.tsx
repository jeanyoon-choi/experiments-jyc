import type { PointerEvent, RefObject } from "react";
import { useMobileLanguage } from "./language";
import styles from "./mobile.module.css";

export type MotionPermission = "idle" | "listening" | "denied" | "unavailable";

const copy = {
  ko: {
    title: "휘는 큐브",
    lede: "영상은 프레임이 시간 순서로 쌓인 덩어리입니다. 큰 화면은 늘 같은 평평한 면으로 그 덩어리를 자릅니다. 누른 채로 폰을 기울이면 덩어리 자체가 휘고, 같은 면에 다른 단면이 나타납니다.",
    action: "기울기 켜기",
    face: "평평하게",
    idle: "끌어서 휘거나 기울기를 켜세요.",
    listening: "누른 채로 폰을 기울이세요.",
    holding: "기울인 만큼 큐브가 휩니다.",
    denied: "모션이 거부되었습니다. 끌어서 휘세요.",
    unavailable: "모션이 없는 기기입니다. 끌어서 휘세요.",
    canvas: "휘어진 영상 큐브와 평평한 현재 면",
  },
  en: {
    title: "The bent block",
    lede: "A video is a block of frames stacked in time. The big screen always cuts it with the same flat plane. Press and tilt the phone: the block itself bends, and the same plane shows a different cut.",
    action: "Enable tilt",
    face: "Flatten",
    idle: "Drag to bend, or enable tilt.",
    listening: "Press and tilt the phone.",
    holding: "The block bends as you tilt.",
    denied: "Motion was denied. Drag to bend.",
    unavailable: "No motion on this device. Drag to bend.",
    canvas: "The bent video cube and the flat present",
  },
} as const;

export default function CubismBendMobileView({
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
