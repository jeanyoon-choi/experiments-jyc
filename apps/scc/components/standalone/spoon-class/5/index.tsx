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
import { SIGNS, STAGES } from "./signs";

const RUNNER_KEY_CODES = new Set([32, 38, 40, 13]);

// One game per row, always full width, seven rows (five and six were tried;
// ROWS is the only setting). The game size follows the row count, so fewer
// rows mean larger games and signs.
const ROWS = 7;
// The runway never narrows below this many document pixels. It also caps the
// game size on narrow screens; at 340 even a 390px-wide phone keeps the full
// row size at five to seven rows (at 480 it stayed at 0.81× whatever the
// row count).
const MIN_FRAME_WIDTH = 340;
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
  rows: ROWS,
  frameWidth: 600,
  scale: 1,
  offset: 0,
  clockTop: 0,
  autoPixelRatio: 1,
};

function getStackLayout(
  width: number,
  height: number,
  devicePixelRatio: number,
): StackLayout {
  const rows = ROWS;
  const rowHeight = height / rows;
  // Each game fills its row (seven rows to the screen).
  const scale = Math.min(
    height / ROWS / NATIVE_GAME_HEIGHT,
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
  growth: boolean,
) {
  return html.replace(
    "<title>",
    `<script data-spoon-class-settings>Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: function () { return ${pixelRatio}; } }); window.spoonClassClockTop = ${clockTop}; window.spoonClassJumpCeiling = ${clockTop}; window.spoonClassGrowth = ${growth};</script>\n<title>`,
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

type LoadedSign = {
  image: HTMLImageElement;
  width: number;
  height: number;
  kind: (typeof SIGNS)[number]["kind"];
  stages: readonly string[];
};

// Read by every game document as window.parent.spoonClassSigns/Stages.
type SignWindow = Window & {
  spoonClassSigns?: LoadedSign[];
  spoonClassStages?: typeof STAGES;
};

// Every game document paints its obstacle sprites from these images, read
// from the page as window.spoonClassSigns when the document starts. Loading
// and decoding them once here, before any game exists, replaces carrying a
// copy of every photograph inside each game document.
function useSigns() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const loaded = SIGNS.map(({ image, kind, stages }) => {
      const element = new Image();
      element.decoding = "async";
      element.src = image.src;
      return { image: element, width: image.width, height: image.height, kind, stages };
    });
    Promise.all(
      loaded.map(({ image }) => image.decode().catch(() => undefined)),
    ).then(() => {
      if (cancelled) return;
      const host = window as SignWindow;
      host.spoonClassSigns = loaded.filter(({ image }) => image.naturalWidth > 0);
      // Life stages and the age (years) each begins; see signs.ts.
      host.spoonClassStages = STAGES;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

export default function SpoonClassFive() {
  const stackRef = useRef<HTMLElement>(null);
  const framesRef = useRef(new Map<string, HTMLIFrameElement>());
  const signsReady = useSigns();
  useGameAudio(framesRef, source.html);
  const performanceRef = useRef<HTMLParagraphElement>(null);
  const [layout, setLayout] = useState<StackLayout>(INITIAL_LAYOUT);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [performanceVisible, setPerformanceVisible] = useState(false);
  const [resolution, setResolution] = useState<Resolution>("auto");
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
  }, []);

  const pixelRatio = resolution === "auto" ? layout.autoPixelRatio : resolution;
  const html = useMemo(
    () =>
      withDocumentSettings(
        source.html,
        pixelRatio,
        layout.clockTop,
        growth,
      ),
    [pixelRatio, layout.clockTop, growth],
  );
  const session = `rows-${layout.rows}-ratio-${pixelRatio}-${growth ? "growth" : "baby"}`;

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

  // Games start only once the sign photographs are decoded.
  const rows = Array.from({ length: signsReady ? layout.rows : 0 }, (_, row) => ({
    id: `${session}-row-${row}`,
    row,
  }));
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
