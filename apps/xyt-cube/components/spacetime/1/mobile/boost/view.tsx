import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { MAX_BETA } from "../../model";
import { useMobileLanguage } from "../language";
import styles from "../mobile.module.css";
import MobileStage from "../stage";
import type { MotionPermission, Velocity } from "./index";

const copy = {
  ko: {
    title: "O2 관측자 속도",
    lede: "폰을 기울이거나 원 안의 점을 끌면 당신이 빠르게 움직이는 관측자가 됩니다. 당신의 '지금'이 기울어 화면의 왼쪽과 오른쪽이 서로 다른 시각을 보여주고, 장면이 수축합니다.",
    action: "기울기로 조종하기",
    denied: "모션이 거부되었습니다. 점을 끌어 주세요.",
    unavailable: "모션이 없는 기기입니다. 점을 끌어 주세요.",
    idle: "점을 끌거나 기울기를 켜세요. 바깥 원이 빛의 속도입니다.",
    listening: "기울여 보세요. 바깥 원이 빛의 속도입니다.",
  },
  en: {
    title: "O2 Observer speed",
    lede: "Tilt the phone or drag the dot to become a fast-moving observer. Your 'now' tilts, so the left and right of the screen show different moments, and the scene contracts.",
    action: "Steer by tilting",
    denied: "Motion was denied. Drag the dot instead.",
    unavailable: "No motion on this device. Drag the dot.",
    idle: "Drag the dot or enable tilt. The outer circle is light speed.",
    listening: "Tilt the phone. The outer circle is light speed.",
  },
} as const;

/** Light-cone radius in the 100 × 100 view: |β| = 1. */
const CONE = 36;

export default function BoostView({
  canvasRef,
  permission,
  velocity,
  onEnableMotion,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  permission: MotionPermission;
  velocity: Velocity;
  onEnableMotion: () => void | Promise<void>;
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerEnd: (event: ReactPointerEvent<SVGSVGElement>) => void;
}) {
  const text = copy[useMobileLanguage()];
  const x = 50 + velocity.bx * CONE;
  const y = 46 + velocity.by * CONE;
  const prompt = text[permission === "listening" ? "listening" : permission];

  return (
    <MobileStage title={text.title} lede={text.lede} canvasRef={canvasRef}>
      <svg
        className={styles.field}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-label={prompt}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <circle cx={50} cy={46} r={CONE} fill="none" stroke="#fff" strokeWidth={0.6} />
        <circle
          cx={50}
          cy={46}
          r={CONE * MAX_BETA}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.35}
          strokeWidth={0.4}
          strokeDasharray="1.5 1.5"
        />
        <line x1={50} y1={46} x2={x} y2={y} stroke="#fff" strokeWidth={0.6} />
        <circle cx={x} cy={y} r={3} fill="#fff" />
      </svg>
      {permission === "idle" && (
        <button type="button" className={styles.action} onClick={onEnableMotion}>
          {text.action}
        </button>
      )}
      <p className={styles.prompt}>{prompt}</p>
    </MobileStage>
  );
}
