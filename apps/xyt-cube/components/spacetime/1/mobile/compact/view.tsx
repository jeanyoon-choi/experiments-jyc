import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { compactScale } from "../../model";
import { useMobileLanguage } from "../language";
import styles from "../mobile.module.css";
import MobileStage from "../stage";

const copy = {
  ko: {
    title: "O1 공간 말기",
    lede: "위로 끌면 공간이 작은 원으로 말립니다. 같은 장면이 옆으로 반복되고, 멀리 있는 복제일수록 더 과거의 모습입니다.",
    prompt: "↑ 말기 · ↓ 펴기",
  },
  en: {
    title: "O1 Compact space",
    lede: "Drag up to curl space into a small circle. The scene repeats around you, and each farther copy is older.",
    prompt: "↑ curl · ↓ unroll",
  },
} as const;

export default function CompactView({
  canvasRef,
  compactness,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onStep,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  compactness: number;
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerEnd: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onStep: (direction: 1 | -1) => void;
}) {
  const text = copy[useMobileLanguage()];
  // The circle's circumference is the compact space.
  const radius = 34 * compactScale(compactness);

  return (
    <MobileStage title={text.title} lede={text.lede} canvasRef={canvasRef}>
      <svg
        className={styles.field}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        role="slider"
        tabIndex={0}
        aria-label={text.title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(compactness * 100)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") onStep(1);
          if (event.key === "ArrowDown") onStep(-1);
        }}
      >
        <circle cx={50} cy={46} r={radius} fill="none" stroke="#fff" strokeWidth={0.8} />
      </svg>
      <p className={styles.prompt}>{text.prompt}</p>
    </MobileStage>
  );
}
