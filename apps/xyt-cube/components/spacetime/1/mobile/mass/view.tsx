import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useMobileLanguage } from "../language";
import styles from "../mobile.module.css";
import MobileStage from "../stage";

const copy = {
  ko: {
    title: "O3 질량",
    lede: "위 영상의 한 곳을 꾹 누르세요. 그 자리에 질량이 생겨 누르는 동안 자라고, 주변의 시계가 느려집니다. 지연은 쌓이기만 하고 사라지지 않습니다.",
    holding: "질량이 자라는 중",
    count: (n: number) => `놓인 질량 ${n}개`,
  },
  en: {
    title: "O3 Mass",
    lede: "Press and hold a spot in the picture above. A mass appears there and grows while you hold; clocks around it slow down. The lag only accumulates.",
    holding: "Mass growing",
    count: (n: number) => `${n} mass${n === 1 ? "" : "es"} placed`,
  },
} as const;

export default function MassView({
  canvasRef,
  massCount,
  holding,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  massCount: number;
  holding: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerEnd: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
}) {
  const text = copy[useMobileLanguage()];

  return (
    <MobileStage
      title={text.title}
      lede={text.lede}
      canvasRef={canvasRef}
      onPreviewPointerDown={onPointerDown}
      onPreviewPointerMove={onPointerMove}
      onPreviewPointerEnd={onPointerEnd}
    >
      <p className={styles.prompt}>{holding ? text.holding : text.count(massCount)}</p>
    </MobileStage>
  );
}
