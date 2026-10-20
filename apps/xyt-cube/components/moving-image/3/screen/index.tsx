"use client";

// moving-image/3 screen: moving-image/1 (turn the plane) and moving-image/2 (bend
// the cube, with a true Möbius gluing in place of the flux), composable, over
// a continuous medium — between frames the clip is
// interpolated along its optical flow, so every slice is a picture without
// steps, combs or seams. Screen only, no relay: the author panel and a drag
// here drive it.
// Contract: apps/xyt-cube/docs/moving-image/3.md

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { defaultLiquidClipId, liquidClips } from "../media";
import { addAmount, OPERATION_SPECS, OPERATIONS, TILT_SPEC, type Amount, type Operation } from "../model/geometry";
import { dragAmount, solidCamera, useLiquidCanvas, type LiquidLayout, type LiquidState } from "../render/use-liquid-canvas";
import { Chip, Chips, Panel, Reset, Slider } from "./controls";
import styles from "./screen.module.css";

const MAX_DEVICE_PIXEL_RATIO = 2;
const KEY_SHARE = 0.02;

/** What a drag or the arrow keys change: the plane's tilt or the cube's geometry. */
type Mode = "rotate" | "bend";

const RATE_CHIPS: readonly { rate: number; label: string }[] = [
  { rate: 1, label: "재생" },
  { rate: 2, label: "2배" },
  { rate: 4, label: "4배" },
  { rate: 16, label: "16배" },
  { rate: 60, label: "60배" },
  { rate: 0, label: "정지" },
  { rate: -1, label: "역재생" },
];

const OPERATION_LABELS: Record<Operation, string> = {
  none: "없음",
  shear: "비직교 축",
  cylinder: "원통 좌표",
  sphere: "구면 좌표",
  curvature: "상수 곡률 K",
  torus: "클리퍼드 토러스",
  moebius: "뫼비우스",
};

const AMOUNT_LABELS: Record<Operation, readonly [string | null, string | null]> = {
  none: [null, null],
  shear: ["x 기울기", "y 기울기"],
  cylinder: ["x 굽힘", "y 굽힘"],
  sphere: ["1/반지름", null],
  curvature: ["K", null],
  torus: ["회전 e1·e3", "회전 e2·e4"],
  moebius: ["비틀기", null],
};

const TILT_LABELS = ["y축 회전", "x축 회전"] as const;

const KEY_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

const FLAT = Object.fromEntries(OPERATIONS.map((operation) => [operation, [0, 0]])) as Record<Operation, Amount>;

/** Folds the time played so far into the playhead (or restarts it at `restart`), then changes the rate. */
function retime(state: LiquidState, rate: number, restart: number | null) {
  const now = performance.now();
  state.playhead = restart ?? state.playhead + (state.rate * (now - state.since)) / 1000;
  state.since = now;
  state.rate = rate;
}

export default function LiquidCubeScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  /** The 3D cube view, popped out to fill the screen by the bottom-left button. */
  const [solidView, setSolidView] = useState(false);
  const [mode, setMode] = useState<Mode>("bend");
  const [operation, setOperation] = useState<Operation>("shear");
  const [amounts, setAmounts] = useState<Record<Operation, Amount>>(FLAT);
  const [tilt, setTilt] = useState<Amount>([0, 0]);
  const [rate, setRate] = useState(1);
  const [liquid, setLiquid] = useState(true);
  const [clipId, setClipId] = useState(defaultLiquidClipId);
  const amount = amounts[operation];
  const spec = OPERATION_SPECS[operation];
  const target = mode === "rotate" || operation === "none" ? "tilt" : operation;

  const stateRef = useRef<LiquidState>({ operation, amount, tilt, playhead: 0, since: 0, rate, liquid });
  // Kept in step with the panel; the canvas reads it every frame.
  useEffect(() => {
    const state = stateRef.current;
    state.operation = operation;
    state.amount = amount;
    state.tilt = tilt;
    state.liquid = liquid;
  }, [operation, amount, tilt, liquid]);

  const change = (next: (amount: Amount) => Amount) =>
    setAmounts((all) => ({ ...all, [operation]: next(all[operation]) }));
  const bend = (delta: Amount) =>
    target === "tilt" ? setTilt((value) => addAmount("tilt", value, delta)) : change((value) => addAmount(operation, value, delta));
  const flatten = () => {
    change(() => [0, 0]);
    setTilt([0, 0]);
  };
  const changeRate = (next: number) => {
    retime(stateRef.current, next, null);
    setRate(next);
  };
  const changeClip = (id: string) => {
    retime(stateRef.current, stateRef.current.rate, 0);
    setClipId(id);
  };

  const layout = useCallback<LiquidLayout>(
    (width, height, view, ring) => {
      const full = [0, 0, width, height] as const;
      return solidView
        ? [{ kind: "solid", viewport: full, camera: solidCamera(view, width / height, ring ? 0.8 : 1.05, ring ? 0.75 : 0.36) }]
        : [{ kind: "slice", viewport: full }];
    },
    [solidView],
  );

  const { failure } = useLiquidCanvas({ canvasRef, stateRef, clipId, layout, maxPixelRatio: MAX_DEVICE_PIXEL_RATIO });

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
    bend(dragAmount(target, event.clientX - drag.x, event.clientY - drag.y, Math.min(box.width, box.height)));
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
      const gain = (target === "tilt" ? TILT_SPEC : spec).gain;
      const one = gain[1] === 0;
      bend([KEY_SHARE * gain[0] * (one ? direction[0] + direction[1] : direction[0]), KEY_SHARE * gain[1] * direction[1]]);
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
        aria-label="영상 큐브의 단면. 끌거나 방향키로 면을 돌리거나 큐브를 휩니다. 0 키는 평평하게."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      />

      <div className={styles.viewToggle}>
        <button
          type="button"
          className={styles.trigger}
          aria-label={solidView ? "단면으로 돌아가기" : "3D 큐브 보기"}
          aria-pressed={solidView}
          onClick={() => setSolidView((current) => !current)}
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

      <div className={styles.control}>
        {panelOpen && (
          <Panel id="liquid-cube-options" label="단면">
            <Chips label="방식">
              <Chip pressed={mode === "rotate"} onClick={() => setMode("rotate")}>
                면 돌리기
              </Chip>
              <Chip pressed={mode === "bend"} onClick={() => setMode("bend")}>
                큐브 휘기
              </Chip>
            </Chips>
            {([0, 1] as const).map((index) => (
              <Slider
                key={`tilt-${index}`}
                label={TILT_LABELS[index]}
                value={tilt[index]}
                min={TILT_SPEC.min[index]}
                max={TILT_SPEC.max[index]}
                onChange={(value) => setTilt((current) => (index === 0 ? [value, current[1]] : [current[0], value]))}
              />
            ))}
            <Chips label="기하">
              {OPERATIONS.map((key) => (
                <Chip key={key} pressed={key === operation} onClick={() => setOperation(key)}>
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
                  onChange={(value) => change((current) => (index === 0 ? [value, current[1]] : [current[0], value]))}
                />
              );
            })}
            <Chips label="영상">
              {liquidClips.map((item) => (
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
            <Chips label="프레임 사이">
              <Chip pressed={liquid} onClick={() => setLiquid(true)}>
                흐름 보간
              </Chip>
              <Chip pressed={!liquid} onClick={() => setLiquid(false)}>
                교차 (2번)
              </Chip>
            </Chips>
            <Reset onClick={flatten}>평평하게</Reset>
            {failure && <p className={styles.note}>{failure}</p>}
          </Panel>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="단면 옵션"
          aria-expanded={panelOpen}
          aria-controls="liquid-cube-options"
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
