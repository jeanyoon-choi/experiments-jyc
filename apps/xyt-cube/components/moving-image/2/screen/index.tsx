"use client";

// moving-image/2 screen: the projection plane stays put (the ordinary flat present
// sweeping through the clip); the video cube itself is bent. Phones (or a drag
// here) change how much; the screen chooses which geometry.
// Contract: apps/xyt-cube/docs/moving-image/2.md

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cubismClipId, cubismClips } from "../media";
import { OPERATION_SPECS, OPERATIONS, type BendOperation } from "../model";
import { dragAmount, solidCamera, useBendCanvas, type CubismLayout } from "../render/use-bend-canvas";
import { useBendSocket } from "../transport";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";
import styles from "./screen.module.css";

/** Up to 2× so a 1920 px clip keeps its pixels on high-density displays. */
const MAX_DEVICE_PIXEL_RATIO = 2;
/** The solid view: its share of the screen's height. */
const INSET_SHARE = 0.44;
/** One arrow key press: this share of a full-screen drag. */
const KEY_SHARE = 0.02;

const RATE_CHIPS: readonly { rate: number; label: string }[] = [
  { rate: 1, label: "재생" },
  { rate: 0, label: "정지" },
  { rate: -1, label: "역재생" },
];

const OPERATION_LABELS: Record<BendOperation, string> = {
  shear: "비직교 축",
  cylinder: "원통 좌표",
  sphere: "구면 좌표",
  curvature: "상수 곡률 K",
  torus: "클리퍼드 토러스",
  flux: "뫼비우스 플럭스",
};

/** What each amount means, per geometry (author panel only). */
const AMOUNT_LABELS: Record<BendOperation, readonly [string, string | null]> = {
  shear: ["x 기울기", "y 기울기"],
  cylinder: ["x 굽힘", "y 굽힘"],
  sphere: ["1/반지름", null],
  curvature: ["K", null],
  torus: ["회전 e1·e3", "회전 e2·e4"],
  flux: ["부스트", "방향"],
};

const KEY_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

export default function CubismBendScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [showSolid, setShowSolid] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const {
    connected,
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
  } = useBendSocket({ role: "screen" });
  const amount = amounts?.[operation] ?? [0, 0];
  const spec = OPERATION_SPECS[operation];
  /**
   * A slider moves one amount to `value`. It is sent as a change, like any
   * device's; changes already sent but not yet echoed are counted, so a fast
   * drag does not overshoot.
   */
  const sentRef = useRef<{ operation: BendOperation; amount: [number, number] } | null>(null);
  const setAmount = (index: 0 | 1, value: number) => {
    const latest = receivedRef.current?.snapshot.amounts[operation] ?? amount;
    const sent = sentRef.current?.operation === operation ? sentRef.current.amount : [...latest];
    const delta: [number, number] = [0, 0];
    delta[index] = value - sent[index];
    sent[index] = value;
    sentRef.current = { operation, amount: [sent[0], sent[1]] };
    bend(delta);
  };
  const releaseSlider = () => {
    sentRef.current = null;
  };
  const clipId = cubismClipId(clip);

  const layout = useCallback<CubismLayout>(
    (width, height, half) => {
      const passes: ReturnType<CubismLayout> = [{ kind: "slice", viewport: [0, 0, width, height] }];
      if (showSolid) {
        const size = Math.round(height * INSET_SHARE);
        const margin = Math.round(height * 0.03);
        passes.push({ kind: "solid", viewport: [margin, margin, size, size], camera: solidCamera(half, 1, 1.05) });
      }
      return passes;
    },
    [showSolid],
  );

  const { failure } = useBendCanvas({
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
    bend(dragAmount(operation, event.clientX - drag.x, event.clientY - drag.y, Math.min(box.width, box.height)));
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const onPointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const direction = KEY_DIRECTIONS[event.key];
    if (direction) {
      event.preventDefault();
      const gain = OPERATION_SPECS[operation].gain;
      const one = gain[1] === 0;
      bend([
        KEY_SHARE * gain[0] * (one ? direction[0] + direction[1] : direction[0]),
        KEY_SHARE * gain[1] * direction[1],
      ]);
    } else if (event.key === "Home" || event.key === "0") {
      event.preventDefault();
      flatten();
    }
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="휘어진 영상 큐브의 평평한 단면. 끌거나 방향키로 큐브를 휩니다. 0 키는 평평하게."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      />

      <div className={styles.control}>
        {panelOpen && (
          <Panel id="cubism-bend-options" label="휘기">
            <Chips label="기하">
              {(OPERATIONS as readonly BendOperation[]).map((key) => (
                <Chip key={key} pressed={key === operation} onClick={() => changeOperation(key)}>
                  {OPERATION_LABELS[key]}
                </Chip>
              ))}
            </Chips>
            {([0, 1] as const).map((index) => {
              const label = AMOUNT_LABELS[operation][index];
              if (!label) return null;
              return (
                <Slider
                  key={`${operation}-${index}`}
                  label={label}
                  value={amount[index]}
                  min={spec.min[index]}
                  max={spec.max[index]}
                  onChange={(value) => setAmount(index, value)}
                  onRelease={releaseSlider}
                />
              );
            })}
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
            <Chips label="보기">
              <Chip pressed={showSolid} onClick={() => setShowSolid((current) => !current)}>
                큐브 보기
              </Chip>
            </Chips>
            <Reset onClick={flatten}>평평하게</Reset>
            <Note>
              {failure ??
                (connected ? `휴대폰 ${presence?.mobiles ?? 0}대` : "릴레이 없음 · 이 화면에서만 돌아갑니다")}
            </Note>
          </Panel>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="휘기 옵션"
          aria-expanded={panelOpen}
          aria-controls="cubism-bend-options"
          onClick={() => setPanelOpen((open) => !open)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path
              d="M4 7c3-2 9-2 12 0v7c-3 2-9 2-12 0zM4 7c3 2 9 2 12 0M10 9v8"
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
