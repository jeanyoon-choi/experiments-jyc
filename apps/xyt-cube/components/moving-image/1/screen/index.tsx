"use client";

// moving-image/1 screen: the projected plane. The clip is a box in (x, y, t); the
// screen shows the cut plane through it head-on. Phones (or a drag here) turn
// the plane; untouched, it is the xy plane advancing along t, i.e. the video.
// Contract: apps/xyt-cube/docs/moving-image/1.md

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cubismClipId, cubismClips } from "../media";
import { fromAxisAngle, type CubismPivot, type Quaternion } from "../model";
import { dragDelta, solidCamera, useCubismCanvas, type CubismLayout } from "../render/use-cubism-canvas";
import { useCubismSocket } from "../transport";
import { Chip, Chips, Note, Panel, Reset } from "./controls";
import styles from "./screen.module.css";

/** Up to 2× so a 1920 px clip keeps its pixels on high-density displays. */
const MAX_DEVICE_PIXEL_RATIO = 2;
/** The optional solid view: its share of the screen's height. */
const INSET_SHARE = 0.34;
const KEY_STEP = Math.PI / 36;

const RATE_CHIPS: readonly { rate: number; label: string }[] = [
  { rate: 1, label: "재생" },
  { rate: 0, label: "정지" },
  { rate: -1, label: "역재생" },
];

const PIVOT_CHIPS: readonly { pivot: CubismPivot; label: string }[] = [
  { pivot: "now", label: "지금을 축으로" },
  { pivot: "cube", label: "큐브 통과 (Fels)" },
];

const KEY_TURNS: Record<string, [number, number, number]> = {
  ArrowLeft: [0, -1, 0],
  ArrowRight: [0, 1, 0],
  ArrowUp: [-1, 0, 0],
  ArrowDown: [1, 0, 0],
};

export default function CubismScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [showSolid, setShowSolid] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const { connected, presence, rate, clip, pivot, receivedRef, turn, face, changeRate, changeClip, changePivot } =
    useCubismSocket({ role: "screen" });
  const clipId = cubismClipId(clip);

  const layout = useCallback<CubismLayout>(
    (width, height, half) => {
      const passes: ReturnType<CubismLayout> = [{ kind: "slice", viewport: [0, 0, width, height] }];
      if (showSolid) {
        const size = Math.round(height * INSET_SHARE);
        const margin = Math.round(height * 0.03);
        passes.push({
          kind: "solid",
          viewport: [margin, margin, size, size],
          camera: solidCamera(half, 1),
        });
      }
      return passes;
    },
    [showSolid],
  );

  const { failure } = useCubismCanvas({
    canvasRef,
    receivedRef,
    clipId,
    level: "full",
    layout,
    maxPixelRatio: MAX_DEVICE_PIXEL_RATIO,
  });

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured; the drag still works.
    }
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    turn(dragDelta(event.clientX - drag.x, event.clientY - drag.y, Math.min(box.width, box.height)));
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const onPointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const axis = KEY_TURNS[event.key];
    if (axis) {
      event.preventDefault();
      turn(fromAxisAngle(axis, KEY_STEP) as Quaternion);
    } else if (event.key === "Home" || event.key === "0") {
      event.preventDefault();
      face();
    }
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="영상 큐브의 단면. 끌거나 방향키로 단면을 돌립니다. 0 키는 정면."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      />

      <div className={styles.control}>
        {panelOpen && (
          <Panel id="cubism-options" label="단면">
            <Chips label="영상">
              {cubismClips.map((item) => (
                <Chip key={item.id} pressed={item.id === clipId} onClick={() => changeClip(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </Chips>
            <Chips label="재생">
              {RATE_CHIPS.map((chip) => (
                <Chip key={chip.rate} pressed={chip.rate === rate} onClick={() => changeRate(chip.rate)}>
                  {chip.label}
                </Chip>
              ))}
            </Chips>
            <Chips label="회전축">
              {PIVOT_CHIPS.map((chip) => (
                <Chip key={chip.pivot} pressed={chip.pivot === pivot} onClick={() => changePivot(chip.pivot)}>
                  {chip.label}
                </Chip>
              ))}
            </Chips>
            <Chips label="보기">
              <Chip pressed={showSolid} onClick={() => setShowSolid((current) => !current)}>
                큐브 보기
              </Chip>
            </Chips>
            <Reset onClick={face}>정면으로</Reset>
            <Note>
              {failure ??
                (connected ? `휴대폰 ${presence?.mobiles ?? 0}대` : "릴레이 없음 · 이 화면에서만 돌아갑니다")}
            </Note>
          </Panel>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="단면 옵션"
          aria-expanded={panelOpen}
          aria-controls="cubism-options"
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
