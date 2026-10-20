"use client";

// clock/1-3d screen: clock/1's turning cut plane through the (x, y, t) cube of
// a real 3D clock, ray-traced per pixel at that pixel's own time: unturned,
// the screen is a photographic still of the clock at the local time; turned,
// one picture holds the same clock at many times. Screen only.
// Contract: apps/xyt-cube/docs/clock/1-3d.md

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  DEFAULT_SPAN,
  formatClock,
  formatDuration,
  SPANS,
  type Pivot,
  type Span,
} from "../model";
import {
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

const KEY_STEP = 5;

const PIVOT_CHIPS: readonly { pivot: Pivot; label: string }[] = [
  { pivot: "now", label: "지금을 축으로" },
  { pivot: "cube", label: "큐브 통과 (Fels)" },
];

const SPAN_LABELS: Record<Span, string> = { 60: "1분", 3600: "1시간", 43200: "12시간" };

const RATE_CHIPS: readonly { rate: number; label: string }[] = [
  { rate: 0, label: "정지" },
  { rate: 1, label: "실시간" },
  { rate: 60, label: "60배" },
  { rate: 720, label: "720배" },
];


const KEY_TURNS: Record<string, [number, number]> = {
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
};

function wrapDegrees(value: number) {
  return value - 360 * Math.floor((value + 180) / 360);
}

const degrees = (value: number) => `${Math.round(value)}°`;

/**
 * L in screen units (the shorter side = 1): a turned cut's time thickness is
 * the time spanned by L along it. 0 = an infinitely thin present.
 */
const DEFAULT_THICKNESS = 0;

export default function ClockCubeScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [settings, setSettings] = useState<ClockSettings>({
    pitch: 0,
    yaw: 0,
    pivot: "now",
    span: DEFAULT_SPAN,
    stimulus: "analogue",
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
    next.pitch = wrapDegrees(next.pitch);
    next.yaw = wrapDegrees(next.yaw);
    settingsRef.current = next;
    setSettings(next);
  }, []);

  const layout = useCallback<ClockLayout>(
    (width, height, block) => {
      const full = [0, 0, width, height] as const;
      return solidView
        ? [{ kind: "solid", viewport: full, camera: solidCamera(block, width / height), box: block }]
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
    // A drag across the shorter side turns the plane by 180°.
    const k = 180 / Math.max(1, Math.min(box.width, box.height));
    const current = settingsRef.current;
    update({ yaw: current.yaw + (event.clientX - drag.x) * k, pitch: current.pitch + (event.clientY - drag.y) * k });
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const onPointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  };
  const face = () => update({ pitch: 0, yaw: 0 });
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const turn = KEY_TURNS[event.key];
    if (turn) {
      event.preventDefault();
      const current = settingsRef.current;
      update({ pitch: current.pitch + turn[0] * KEY_STEP, yaw: current.yaw + turn[1] * KEY_STEP });
    } else if (event.key === "Home" || event.key === "0") {
      event.preventDefault();
      face();
    }
  };

  const shownSpan = readout ? readout.max - readout.min : 0;

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="3D 시계의 시공간 큐브의 단면. 끌거나 방향키로 단면을 돌립니다. 0 키는 정면."
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
          <Panel id="clock-cube-options" label="시계 단면">
            <Slider
              label="x축 회전"
              value={settings.pitch}
              min={-180}
              max={180}
              format={degrees}
              onChange={(value) => update({ pitch: value })}
            />
            <Slider
              label="y축 회전"
              value={settings.yaw}
              min={-180}
              max={180}
              format={degrees}
              onChange={(value) => update({ yaw: value })}
            />
            <Chips label="회전축">
              {PIVOT_CHIPS.map((chip) => (
                <Chip key={chip.pivot} pressed={chip.pivot === settings.pivot} onClick={() => update({ pivot: chip.pivot })}>
                  {chip.label}
                </Chip>
              ))}
            </Chips>
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
            <div className={styles.resets}>
              <Reset onClick={face}>정면으로</Reset>
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
                  ? `가운데 ${formatClock(readout.centre)} · 한 화면에 ${shownSpan < 0.5 ? "한 순간" : formatDuration(shownSpan)}`
                  : "")}
            </Note>
          </Panel>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="시계 단면 옵션"
          aria-expanded={panelOpen}
          aria-controls="clock-cube-options"
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
