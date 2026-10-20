"use client";

// clock/2 screen: moving-image/2's operation on clock/1's clock. The screen
// stays the flat present sweeping the block of one span; the clock's
// (x, y, t) cube itself is bent by one of six geometries. Flat, the screen is
// the running clock at the local time. Screen only.
// Contract: apps/xyt-cube/docs/clock/2.md

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  addAmount,
  DEFAULT_SPAN,
  formatClock,
  OPERATION_SPECS,
  OPERATIONS,
  SPANS,
  type BendAmount,
  type BendOperation,
  type Span,
  type Stimulus,
} from "../model";
import {
  dragAmount,
  solidCamera,
  useClockCanvas,
  type ClockLayout,
  type ClockReadout,
  type ClockSettings,
} from "../render/use-clock-canvas";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";
import styles from "./screen.module.css";

/** 2× keeps the hands' edges exact on high-density displays. */
const MAX_DEVICE_PIXEL_RATIO = 2;

/** One arrow key press: this share of a full drag. */
const KEY_SHARE = 0.02;

const OPERATION_LABELS: Record<BendOperation, string> = {
  shear: "비직교 축",
  cylinder: "원통 좌표",
  sphere: "구면 좌표",
  curvature: "상수 곡률 K",
  torus: "클리퍼드 토러스",
  mobius: "뫼비우스",
};

/** What each amount means, per geometry (author panel only). */
const AMOUNT_LABELS: Record<BendOperation, readonly [string, string | null]> = {
  shear: ["x 기울기", "y 기울기"],
  cylinder: ["x 굽힘", "y 굽힘"],
  sphere: ["1/반지름", null],
  curvature: ["K", null],
  torus: ["회전 e1·e3", "회전 e2·e4"],
  mobius: ["꼬임 (1 = 반 바퀴)", null],
};

const SPAN_LABELS: Record<Span, string> = { 60: "1분", 3600: "1시간", 43200: "12시간" };

const RATE_CHIPS: readonly { rate: number; label: string }[] = [
  { rate: 0, label: "정지" },
  { rate: 1, label: "실시간" },
  { rate: 60, label: "60배" },
  { rate: 720, label: "720배" },
];

const STIMULUS_CHIPS: readonly { stimulus: Stimulus; label: string }[] = [
  { stimulus: "analogue", label: "바늘 시계" },
  { stimulus: "digital", label: "숫자 시계" },
  { stimulus: "fractal", label: "프랙탈 시계" },
];

const KEY_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

/** L in screen units: a point's time thickness is the time spanned by L along the cut (clock/1). */
const DEFAULT_THICKNESS = 0;
const MAX_THICKNESS = 0.3;

/** The page opens on spherical coordinates, centre ahead of the front face (1/radius = −1.82). */
const OPENING_SPHERE = -1.82;

function flatAmounts() {
  return Object.fromEntries((OPERATIONS as readonly BendOperation[]).map((key) => [key, [0, 0]])) as Record<
    BendOperation,
    BendAmount
  >;
}

export default function ClockBendScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [settings, setSettings] = useState<ClockSettings>({
    operation: "sphere",
    amounts: { ...flatAmounts(), sphere: [OPENING_SPHERE, 0] },
    span: DEFAULT_SPAN,
    stimulus: "fractal",
    thickness: DEFAULT_THICKNESS,
    rate: 1,
  });
  const settingsRef = useRef(settings);
  const offsetRef = useRef(0);
  /** The 3D cube view, popped out to fill the screen by the bottom-left button. */
  const [solidView, setSolidView] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [readout, setReadout] = useState<ClockReadout | null>(null);

  const update = useCallback((change: Partial<ClockSettings>) => {
    const next = { ...settingsRef.current, ...change };
    settingsRef.current = next;
    setSettings(next);
  }, []);

  /** Adds a change to the current geometry's amount (drag, keys). */
  const bend = useCallback(
    (delta: BendAmount) => {
      const current = settingsRef.current;
      const amount = addAmount(current.operation, current.amounts[current.operation], delta) as BendAmount;
      update({ amounts: { ...current.amounts, [current.operation]: amount } });
    },
    [update],
  );

  /** Sets one amount of the current geometry (sliders). */
  const setAmount = (index: 0 | 1, value: number) => {
    const current = settingsRef.current;
    const next: BendAmount = [...current.amounts[current.operation]];
    next[index] = value;
    update({ amounts: { ...current.amounts, [current.operation]: next } });
  };

  const flatten = () => {
    const current = settingsRef.current;
    update({ amounts: { ...current.amounts, [current.operation]: [0, 0] } });
  };

  const layout = useCallback<ClockLayout>(
    (width, height, half) => {
      const full = [0, 0, width, height] as const;
      return solidView
        ? [{ kind: "solid", viewport: full, camera: solidCamera(half, width / height) }]
        : [{ kind: "slice", viewport: full }];
    },
    [solidView],
  );

  const { failure } = useClockCanvas({
    canvasRef,
    settingsRef,
    offsetRef,
    layout,
    maxPixelRatio: MAX_DEVICE_PIXEL_RATIO,
    onReadout: setReadout,
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
    bend(dragAmount(settingsRef.current.operation, event.clientX - drag.x, event.clientY - drag.y, Math.min(box.width, box.height)));
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
      const gain = OPERATION_SPECS[settingsRef.current.operation].gain;
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

  const { operation } = settings;
  const amount = settings.amounts[operation];
  const spec = OPERATION_SPECS[operation];

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="휘어진 시계 큐브의 평평한 단면. 끌거나 방향키로 큐브를 휩니다. 0 키는 평평하게."
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
          <Panel id="clock-bend-options" label="시계 큐브 휘기">
            <Chips label="기하">
              {(OPERATIONS as readonly BendOperation[]).map((key) => (
                <Chip key={key} pressed={key === operation} onClick={() => update({ operation: key })}>
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
                />
              );
            })}
            <Slider
              label="시간 두께 L"
              value={settings.thickness}
              min={0}
              max={MAX_THICKNESS}
              onChange={(value) => update({ thickness: value })}
            />
            <Chips label="큐브 깊이">
              {SPANS.map((span) => (
                <Chip key={span} pressed={span === settings.span} onClick={() => update({ span })}>
                  {SPAN_LABELS[span]}
                </Chip>
              ))}
            </Chips>
            <Chips label="시계 속도">
              {RATE_CHIPS.map((chip) => (
                <Chip key={chip.rate} pressed={chip.rate === settings.rate} onClick={() => update({ rate: chip.rate })}>
                  {chip.label}
                </Chip>
              ))}
            </Chips>
            <Chips label="시계">
              {STIMULUS_CHIPS.map((chip) => (
                <Chip
                  key={chip.stimulus}
                  pressed={chip.stimulus === settings.stimulus}
                  onClick={() => update({ stimulus: chip.stimulus })}
                >
                  {chip.label}
                </Chip>
              ))}
            </Chips>
            <div className={styles.resets}>
              <Reset onClick={flatten}>평평하게</Reset>
              <Reset
                onClick={() => {
                  offsetRef.current = 0;
                }}
              >
                지금 시각으로
              </Reset>
            </div>
            <Note>
              {failure ??
                (readout
                  ? `지금 ${formatClock(readout.present)} · 큐브 ${formatClock(readout.start)}–${formatClock(readout.end)}`
                  : "")}
            </Note>
          </Panel>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="시계 큐브 휘기 옵션"
          aria-expanded={panelOpen}
          aria-controls="clock-bend-options"
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
