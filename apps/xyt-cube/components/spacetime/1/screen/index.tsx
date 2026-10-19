"use client";

// spacetime/1 screen: the projector. It shows one slice of the clip's (x, y, t)
// cube under a fixed rule; phones change only the cube's geometry.
// Contract: apps/xyt-cube/docs/spacetime/1.md

import { useRef, useState } from "react";
import type { SpacetimeSnapshot } from "../model";
import { defaultSpacetimeClipId, spacetimeClips } from "../media";
import { useSpacetimeCanvas } from "../render/use-spacetime-canvas";
import { useSpacetimeSocket } from "../transport";
import { Chip, Chips, Note, Panel, Reset } from "./controls";
import { defaultSpacetimeOperations, type SpacetimeOperations } from "./settings";
import styles from "./screen.module.css";

/** The projector needs no more than CSS resolution. */
const MAX_DEVICE_PIXEL_RATIO = 1;

const OPERATION_CHIPS: readonly { id: keyof SpacetimeOperations; label: string }[] = [
  { id: "compact", label: "O1 압축" },
  { id: "boost", label: "O2 부스트" },
  { id: "mass", label: "O3 질량" },
  { id: "lens", label: "렌즈" },
];

export default function SpacetimeScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<SpacetimeSnapshot | null>(null);
  const [operations, setOperations] = useState<SpacetimeOperations>(defaultSpacetimeOperations);
  const [clipId, setClipId] = useState(defaultSpacetimeClipId);
  const [panelOpen, setPanelOpen] = useState(false);
  const { presence, state, resetSystem } = useSpacetimeSocket({
    role: "screen",
    onState: (next) => {
      snapshotRef.current = next;
    },
  });
  const { failure, clearLag } = useSpacetimeCanvas({
    canvasRef,
    snapshotRef,
    operations,
    clipId,
    maxPixelRatio: MAX_DEVICE_PIXEL_RATIO,
  });

  const observers = state?.observers.length ?? 0;
  const masses = state?.masses.length ?? 0;

  return (
    <main className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} aria-describedby="spacetime-summary" />
      <p id="spacetime-summary" className={styles.screenReaderOnly}>
        {`관측자 ${observers}명, 질량 ${masses}개, 공간 압축 ${Math.round((state?.compactness ?? 0) * 100)}%`}
      </p>

      <div className={styles.control}>
        {panelOpen && (
          <Panel id="spacetime-options" label="연산">
            <Chips label="연산">
              {OPERATION_CHIPS.map((chip) => (
                <Chip
                  key={chip.id}
                  pressed={operations[chip.id]}
                  onClick={() =>
                    setOperations((current) => ({ ...current, [chip.id]: !current[chip.id] }))
                  }
                >
                  {chip.label}
                </Chip>
              ))}
            </Chips>
            <Chips label="영상">
              {spacetimeClips.map((clip) => (
                <Chip key={clip.id} pressed={clip.id === clipId} onClick={() => setClipId(clip.id)}>
                  {clip.label}
                </Chip>
              ))}
            </Chips>
            <Reset
              onClick={() => {
                resetSystem();
                clearLag();
              }}
            >
              압축·질량 초기화
            </Reset>
            <Note>
              {failure ?? `휴대폰 ${presence?.mobiles ?? 0}대 · 관측자 ${observers} · 질량 ${masses}`}
            </Note>
          </Panel>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="연산 옵션"
          aria-expanded={panelOpen}
          aria-controls="spacetime-options"
          onClick={() => setPanelOpen((open) => !open)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path
              d="M4 7l6-3 6 3v7l-6 3-6-3zM4 7l6 3 6-3M10 10v7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </main>
  );
}
