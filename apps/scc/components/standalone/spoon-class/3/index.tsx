"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import source from "./source/document.json";
import SourceFrame, { NATIVE_GAME_HEIGHT } from "./source-frame";
import styles from "./spoon-class.module.css";
import { useGameAudio } from "../game-audio";

const RUNNER_KEY_CODES = new Set([32, 38, 40, 13]);

// One game per row, always full width, eight rows by default.
const DEFAULT_ROWS = 8;
// The row control never resizes a game. Game size is fixed per screen at the
// default eight-row fill; the count changes only how many games.
const ROW_LIMITS = { min: 1, max: 10 };
// On very wide, short screens the runway still never narrows below this.
const MIN_FRAME_WIDTH = 480;
// When a row is shorter than the game, the game is cropped, never shrunk.
// Up to this much empty ground margin goes first (document pixels), then sky
// from the top; the age clock moves down by the cropped sky so it stays shown.
const MAX_BOTTOM_CROP = 8;
// Frame statistics are summarised about twice a second.
const PERFORMANCE_INTERVAL = 500;
// Each game canvas is drawn at the game's own devicePixelRatio. Automatic
// resolution matches the pixels actually shown (screen ratio × row scale),
// capped at 2: a phone at 3× showing games at 0.7× otherwise fills 2.25× the
// needed pixels every frame in every game, and dropped frames make Runner's
// time-based motion jump.
const MAX_AUTO_PIXEL_RATIO = 2;

// Obstacles: the original tests and life blocks (책), or shelves of real
// workbook spines (문제집).
type Obstacles = "books" | "workbooks";
const obstacleChoices: { id: Obstacles; label: string }[] = [
  { id: "books", label: "책" },
  { id: "workbooks", label: "문제집" },
];

// Rows stay where they are (그대로), or rank by lifespan (수명순): the game
// whose human has lived longest on top, ties keeping their order.
type Ordering = "fixed" | "lifespan";
const orderings: { id: Ordering; label: string }[] = [
  { id: "fixed", label: "그대로" },
  { id: "lifespan", label: "수명순" },
];
// Games are checked for a new game over this often.
const RANK_INTERVAL = 200;
// The age clock runs six months a second.
const YEAR_MILLISECONDS = 2000;

type Resolution = "auto" | 1 | 2 | 3;
const resolutions: { id: Resolution; label: string }[] = [
  { id: "auto", label: "자동" },
  { id: 1, label: "1x" },
  { id: 2, label: "2x" },
  { id: 3, label: "3x" },
];

type StackLayout = {
  rows: number;
  frameWidth: number;
  scale: number;
  // Vertical position of the game in its row: centred when the row is taller,
  // negative (sky cropped) when it is shorter.
  offset: number;
  // Document pixels of sky cropped from the top; the clock is drawn below it.
  clockTop: number;
  autoPixelRatio: number;
};

type SynchronizedInput = {
  channel: "spoon-class-input";
  type: "keydown" | "keyup";
  keyCode: number;
};

const INITIAL_LAYOUT: StackLayout = {
  rows: DEFAULT_ROWS,
  frameWidth: 600,
  scale: 1,
  offset: 0,
  clockTop: 0,
  autoPixelRatio: 1,
};

function getStackLayout(
  width: number,
  height: number,
  rowOverride: number | null,
  devicePixelRatio: number,
): StackLayout {
  const rows = rowOverride ?? DEFAULT_ROWS;
  const rowHeight = height / rows;
  // Independent of `rows`: the same game size at every row count.
  const scale = Math.min(
    height / DEFAULT_ROWS / NATIVE_GAME_HEIGHT,
    width / MIN_FRAME_WIDTH,
  );
  const autoPixelRatio = Math.min(
    MAX_AUTO_PIXEL_RATIO,
    Math.max(1, Math.round(devicePixelRatio * scale)),
  );
  const crop = Math.max(0, NATIVE_GAME_HEIGHT - rowHeight / scale);
  const topCrop = crop - Math.min(MAX_BOTTOM_CROP, crop);
  const offset =
    crop > 0 ? -topCrop * scale : (rowHeight - NATIVE_GAME_HEIGHT * scale) / 2;
  return {
    rows,
    frameWidth: Math.ceil(width / scale),
    scale,
    offset,
    clockTop: Math.ceil(topCrop),
    autoPixelRatio,
  };
}

// Set before the engine reads them: Runner picks sprites and canvas backing
// size for this ratio; the age clock draws, and the jump peaks, below the
// cropped sky. The
// packaged document is otherwise unchanged.
function withDocumentSettings(
  html: string,
  pixelRatio: number,
  clockTop: number,
  workbooks: boolean,
  growth: boolean,
) {
  return html.replace(
    "<title>",
    `<script data-spoon-class-settings>Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: function () { return ${pixelRatio}; } }); window.spoonClassClockTop = ${clockTop}; window.spoonClassJumpCeiling = ${clockTop}; window.spoonClassWorkbooks = ${workbooks}; window.spoonClassGrowth = ${growth};</script>\n<title>`,
  );
}

function isSynchronizedInput(value: unknown): value is SynchronizedInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<SynchronizedInput>;
  return (
    input.channel === "spoon-class-input" &&
    (input.type === "keydown" || input.type === "keyup") &&
    typeof input.keyCode === "number" &&
    RUNNER_KEY_CODES.has(input.keyCode)
  );
}

function dispatchToRunner(
  frame: HTMLIFrameElement,
  type: SynchronizedInput["type"],
  keyCode: number,
) {
  const frameDocument = frame.contentDocument;
  if (!frameDocument) return;

  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    keyCode: { value: keyCode },
    which: { value: keyCode },
  });
  frameDocument.dispatchEvent(event);
}

export default function SpoonClassThree() {
  const stackRef = useRef<HTMLElement>(null);
  const framesRef = useRef(new Map<string, HTMLIFrameElement>());
  useGameAudio(framesRef, source.html);
  const performanceRef = useRef<HTMLParagraphElement>(null);
  const [layout, setLayout] = useState<StackLayout>(INITIAL_LAYOUT);
  const [rowOverride, setRowOverride] = useState<number | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [performanceVisible, setPerformanceVisible] = useState(false);
  const [resolution, setResolution] = useState<Resolution>("auto");
  const [obstacles, setObstacles] = useState<Obstacles>("books");
  const [ordering, setOrdering] = useState<Ordering>("fixed");
  // The human grows with age (켬) or stays a baby (끔, the earlier /3).
  const [growth, setGrowth] = useState(true);
  // Row id → displayed position, while ranking by lifespan.
  const [places, setPlaces] = useState<Map<string, number>>(new Map());
  // The game set that has received input; new rows or resolution start fresh.
  const [playedSession, setPlayedSession] = useState<string | null>(null);
  const sessionRef = useRef("");

  const broadcast = useCallback(
    (type: SynchronizedInput["type"], keyCode: number) => {
      if (type === "keydown") setPlayedSession(sessionRef.current);
      for (const frame of framesRef.current.values()) {
        dispatchToRunner(frame, type, keyCode);
      }
    },
    [],
  );

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;

    const measure = () => {
      const { width, height } = stack.getBoundingClientRect();
      const nextLayout = getStackLayout(
        width,
        height,
        rowOverride,
        window.devicePixelRatio || 1,
      );
      setLayout((currentLayout) =>
        currentLayout.rows === nextLayout.rows &&
        currentLayout.frameWidth === nextLayout.frameWidth &&
        currentLayout.scale === nextLayout.scale &&
        currentLayout.offset === nextLayout.offset &&
        currentLayout.clockTop === nextLayout.clockTop &&
        currentLayout.autoPixelRatio === nextLayout.autoPixelRatio
          ? currentLayout
          : nextLayout,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stack);
    return () => observer.disconnect();
  }, [rowOverride]);

  const pixelRatio = resolution === "auto" ? layout.autoPixelRatio : resolution;
  const html = useMemo(
    () =>
      withDocumentSettings(
        source.html,
        pixelRatio,
        layout.clockTop,
        obstacles === "workbooks",
        growth,
      ),
    [pixelRatio, layout.clockTop, obstacles, growth],
  );
  const session = `rows-${layout.rows}-ratio-${pixelRatio}-${obstacles}-${growth ? "growth" : "baby"}`;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (ordering !== "lifespan") return;
    // Rows move by transform, never in the DOM: moving an iframe reloads it.
    // The order changes only when a game ends: a life is ranked once it is
    // over, by whole years lived (6 months a second, so one year is 2s); a
    // game still running counts its years so far. Equal years keep their order.
    let previous: string[] = [];
    let ended = new Set<string>();
    const rank = () => {
      const ids = [...framesRef.current.keys()].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      );
      const state = (id: string) => {
        const view = framesRef.current.get(id)?.contentWindow as
          | {
              spoonClassAge?: number;
              Runner?: { instance_?: { crashed?: boolean } };
            }
          | null
          | undefined;
        const age = typeof view?.spoonClassAge === "number" ? view.spoonClassAge : 0;
        return {
          years: Math.floor(age / YEAR_MILLISECONDS),
          crashed: Boolean(view?.Runner?.instance_?.crashed),
        };
      };
      const states = new Map(ids.map((id) => [id, state(id)]));
      const nowEnded = new Set(ids.filter((id) => states.get(id)?.crashed));
      const newlyEnded = [...nowEnded].some((id) => !ended.has(id));
      ended = nowEnded;
      if (previous.length === ids.length && !newlyEnded) return;
      const base = previous.length === ids.length ? previous : ids;
      const ranked = [...base].sort(
        (a, b) =>
          (states.get(b)?.years ?? 0) - (states.get(a)?.years ?? 0) ||
          base.indexOf(a) - base.indexOf(b),
      );
      previous = ranked;
      setPlaces(new Map(ranked.map((id, index) => [id, index])));
    };
    rank();
    const timer = window.setInterval(rank, RANK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [ordering, session]);

  useEffect(() => {
    const readout = performanceRef.current;
    if (!performanceVisible || !readout) return;

    // The host and its same-origin game documents share one main thread, so
    // the host's frame cadence measures the whole stack.
    let frame = 0;
    let previous = performance.now();
    let windowStart = previous;
    let frames = 0;
    let worst = 0;
    const tick = (time: number) => {
      const delta = time - previous;
      previous = time;
      frames += 1;
      worst = Math.max(worst, delta);
      const elapsed = time - windowStart;
      if (elapsed >= PERFORMANCE_INTERVAL) {
        const games = framesRef.current.size;
        readout.textContent = `${Math.round((frames * 1000) / elapsed)} fps  ${(elapsed / frames).toFixed(1)} ms  최대 ${Math.round(worst)} ms  ${games}게임  ${pixelRatio}x`;
        windowStart = time;
        frames = 0;
        worst = 0;
      }
      frame = requestAnimationFrame(tick);
    };
    readout.textContent = "측정 중";
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [performanceVisible, pixelRatio]);

  useEffect(() => {
    const onHostKey = (event: KeyboardEvent) => {
      if (!event.isTrusted || !RUNNER_KEY_CODES.has(event.keyCode)) return;
      event.preventDefault();
      broadcast(event.type as SynchronizedInput["type"], event.keyCode);
    };

    const onModuleInput = (event: MessageEvent<unknown>) => {
      if (!isSynchronizedInput(event.data)) return;
      const isKnownFrame = [...framesRef.current.values()].some(
        (frame) => frame.contentWindow === event.source,
      );
      if (isKnownFrame) broadcast(event.data.type, event.data.keyCode);
    };

    document.addEventListener("keydown", onHostKey);
    document.addEventListener("keyup", onHostKey);
    window.addEventListener("message", onModuleInput);
    return () => {
      document.removeEventListener("keydown", onHostKey);
      document.removeEventListener("keyup", onHostKey);
      window.removeEventListener("message", onModuleInput);
    };
  }, [broadcast]);

  const rows = Array.from({ length: layout.rows }, (_, row) => ({
    id: `${session}-row-${row}`,
    row,
  }));
  const changeRows = (step: number) => {
    setPlayedSession(null);
    setRowOverride(
      Math.min(ROW_LIMITS.max, Math.max(ROW_LIMITS.min, layout.rows + step)),
    );
  };

  return (
    <>
      <main
        ref={stackRef}
        className={styles.stack}
        style={{ "--spoon-class-rows": layout.rows } as CSSProperties}
      >
        {rows.map(({ id, row }) => (
          <div
            className={styles.row}
            key={id}
            style={{
              transform: `translateY(${((ordering === "lifespan" ? (places.get(id) ?? row) : row) - row) * 100}%)`,
            }}
          >
            <SourceFrame
              ref={(frame) => {
                if (frame) framesRef.current.set(id, frame);
                else framesRef.current.delete(id);
              }}
              html={html}
              width={layout.frameWidth}
              scale={layout.scale}
              offset={layout.offset}
              title={`spoon-class human life game, row ${row + 1}`}
            />
          </div>
        ))}
      </main>
      {playedSession !== session && (
        <button
          type="button"
          className={styles.play}
          aria-label="시작"
          onPointerDown={(event) => {
            event.preventDefault();
            // The button unmounts on this press, so the release is heard on
            // the window: one press is exactly one Space down/up everywhere.
            const release = () => {
              window.removeEventListener("pointerup", release);
              window.removeEventListener("pointercancel", release);
              broadcast("keyup", 32);
            };
            window.addEventListener("pointerup", release);
            window.addEventListener("pointercancel", release);
            broadcast("keydown", 32);
          }}
        >
          <svg
            className={styles.playGlyph}
            viewBox="0 0 80 80"
            aria-hidden="true"
          >
            <circle cx="40" cy="40" r="40" className={styles.playDisc} />
            {/* Shifted right of centre so the triangle reads optically centred. */}
            <path d="M33 26 L57 40 L33 54 Z" className={styles.playMark} />
          </svg>
        </button>
      )}
      <div className={styles.controls}>
        {performanceVisible && (
          <p
            ref={performanceRef}
            className={styles.performance}
            aria-live="off"
          />
        )}
        {optionsOpen && (
          <div className={styles.menu} role="group" aria-label="옵션">
            <div className={styles.menuRow}>
              <span className={styles.menuLabel}>장애물</span>
              {obstacleChoices.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={styles.choice}
                  aria-pressed={obstacles === id}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    setPlayedSession(null);
                    setObstacles(id);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.menuRow}>
              <span className={styles.menuLabel}>성장</span>
              {[
                { id: true, label: "켬" },
                { id: false, label: "끔" },
              ].map(({ id, label }) => (
                <button
                  key={label}
                  type="button"
                  className={styles.choice}
                  aria-pressed={growth === id}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    setPlayedSession(null);
                    setGrowth(id);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.menuRow}>
              <span className={styles.menuLabel}>정렬</span>
              {orderings.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={styles.choice}
                  aria-pressed={ordering === id}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    setOrdering(id);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.menuRow}>
              <span className={styles.menuLabel}>해상도</span>
              {resolutions.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={styles.choice}
                  aria-pressed={resolution === id}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    setPlayedSession(null);
                    setResolution(id);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.menuRow}>
              <span className={styles.menuLabel}>줄</span>
              <button
                type="button"
                className={styles.choice}
                aria-label="줄 줄이기"
                disabled={layout.rows <= ROW_LIMITS.min}
                onClick={(event) => {
                  event.currentTarget.blur();
                  changeRows(-1);
                }}
              >
                −
              </button>
              <span className={styles.count}>{layout.rows}</span>
              <button
                type="button"
                className={styles.choice}
                aria-label="줄 늘리기"
                disabled={layout.rows >= ROW_LIMITS.max}
                onClick={(event) => {
                  event.currentTarget.blur();
                  changeRows(1);
                }}
              >
                +
              </button>
            </div>
            <div className={styles.menuRow}>
              <span className={styles.menuLabel}>성능</span>
              <button
                type="button"
                className={styles.choice}
                aria-pressed={performanceVisible}
                onClick={(event) => {
                  event.currentTarget.blur();
                  setPerformanceVisible((value) => !value);
                }}
              >
                {performanceVisible ? "켜짐" : "꺼짐"}
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={optionsOpen}
          onClick={(event) => {
            // Keyboard play goes back to the stack instead of this button.
            event.currentTarget.blur();
            setOptionsOpen((value) => !value);
          }}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </>
  );
}
