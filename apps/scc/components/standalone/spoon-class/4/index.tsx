"use client";

import { useEffect, useRef, useState } from "react";
import { createRaceAudio } from "./audio";
import {
  GAME_HEIGHT,
  RACER_COUNT,
  createRace,
  endJump,
  resizeRace,
  setSpeedDrop,
  startJump,
  stepRace,
  type Race,
} from "./race";
import { createRenderer, type View } from "./render";
import { loadSprites, type SpriteSet } from "./sprites";
import styles from "./spoon-class.module.css";

// All eight runners on one screen, one per row, as the /3 stack.
const VISIBLE_ROWS = RACER_COUNT;
const MIN_FRAME_WIDTH = 480;
const MAX_PIXEL_RATIO = 2;
const PERFORMANCE_INTERVAL = 500;
const JUMP_KEYS = new Set([32, 38]);
const DUCK_KEY = 40;

type Viewport = { width: number; height: number };

function getView(viewport: Viewport): View {
  const rowHeight = viewport.height / VISIBLE_ROWS;
  const scale = Math.min(
    rowHeight / GAME_HEIGHT,
    viewport.width / MIN_FRAME_WIDTH,
  );
  return {
    width: viewport.width,
    height: viewport.height,
    pixelRatio: Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1),
    rowHeight,
    scale,
    gameOffset: (rowHeight - GAME_HEIGHT * scale) / 2,
  };
}

export default function SpoonClassFour() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const performanceRef = useRef<HTMLParagraphElement>(null);
  const raceRef = useRef<Race | null>(null);
  const viewportRef = useRef<Viewport>({ width: 0, height: 0 });
  const audioRef = useRef<ReturnType<typeof createRaceAudio>>(null);
  const pressesRef = useRef(new Set<number>());
  const [started, setStarted] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [performanceVisible, setPerformanceVisible] = useState(false);
  const performanceVisibleRef = useRef(false);

  useEffect(() => {
    performanceVisibleRef.current = performanceVisible;
  }, [performanceVisible]);

  const press = () => {
    audioRef.current?.unlock();
    const race = raceRef.current;
    if (!race) return;
    if (!race.started) {
      race.started = true;
      setStarted(true);
    }
    let jumped = false;
    for (const racer of race.racers) jumped = startJump(racer) || jumped;
    if (jumped) audioRef.current?.play("press", 0.6);
  };

  const release = () => {
    const race = raceRef.current;
    if (!race) return;
    for (const racer of race.racers) endJump(racer);
  };

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!root || !canvas || !context) return;

    audioRef.current = createRaceAudio();
    const draw = createRenderer();
    const sprites: Partial<Record<1 | 2, SpriteSet>> = {};
    loadSprites(1).then((set) => (sprites[1] = set));
    loadSprites(2).then((set) => (sprites[2] = set));

    const measure = () => {
      const { width, height } = root.getBoundingClientRect();
      viewportRef.current = { width, height };
      const view = getView(viewportRef.current);
      canvas.width = Math.round(width * view.pixelRatio);
      canvas.height = Math.round(height * view.pixelRatio);
      const worldWidth = Math.ceil(width / view.scale);
      if (!raceRef.current) raceRef.current = createRace(worldWidth);
      else resizeRace(raceRef.current, worldWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);

    let frame = 0;
    let previous = performance.now();
    let windowStart = previous;
    let frames = 0;
    let worst = 0;
    const tick = (time: number) => {
      const deltaTime = time - previous;
      previous = time;
      const race = raceRef.current;
      const viewport = viewportRef.current;
      const view = getView(viewport);
      if (race) {
        const hits = stepRace(race, deltaTime);
        if (hits.length > 0) audioRef.current?.play("hit", 0.7);
        const set =
          sprites[view.pixelRatio * view.scale > 1 ? 2 : 1] ?? sprites[1];
        if (set) draw(context, race, set, view, time);
      }

      frames += 1;
      worst = Math.max(worst, deltaTime);
      const elapsed = time - windowStart;
      if (elapsed >= PERFORMANCE_INTERVAL) {
        const readout = performanceRef.current;
        if (performanceVisibleRef.current && readout) {
          readout.textContent = `${Math.round((frames * 1000) / elapsed)} fps  ${(elapsed / frames).toFixed(1)} ms  최대 ${Math.round(worst)} ms  ${RACER_COUNT}명  ${view.pixelRatio}x`;
        }
        windowStart = time;
        frames = 0;
        worst = 0;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.isTrusted) return;
      const race = raceRef.current;
      if (JUMP_KEYS.has(event.keyCode)) {
        event.preventDefault();
        if (event.type === "keydown") press();
        else release();
      } else if (event.keyCode === DUCK_KEY && race) {
        event.preventDefault();
        for (const racer of race.racers)
          setSpeedDrop(racer, event.type === "keydown");
      }
    };
    const onPointerEnd = (event: PointerEvent) => {
      const presses = pressesRef.current;
      if (!presses.delete(event.pointerId)) return;
      if (presses.size === 0) release();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, []);

  const restart = () => {
    pressesRef.current.clear();
    raceRef.current = createRace(raceRef.current?.width ?? 600);
    setStarted(false);
  };

  return (
    <>
      <main
        ref={rootRef}
        className={styles.race}
      >
        <canvas
          ref={canvasRef}
          className={styles.field}
          aria-label="spoon-class 8-runner race"
          onPointerDown={(event) => {
            event.preventDefault();
            pressesRef.current.add(event.pointerId);
            press();
          }}
        />
      </main>
      {!started && (
        <button
          type="button"
          className={styles.play}
          aria-label="시작"
          onPointerDown={(event) => {
            event.preventDefault();
            // The button unmounts on this press; its release ends the jump
            // through the window listener like any field press.
            pressesRef.current.add(event.pointerId);
            press();
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
          >
            측정 중
          </p>
        )}
        <div className={styles.controlRow}>
          {optionsOpen && (
            <>
              <button
                type="button"
                className={styles.control}
                onClick={(event) => {
                  event.currentTarget.blur();
                  restart();
                }}
              >
                다시
              </button>
              <button
                type="button"
                className={styles.control}
                aria-pressed={performanceVisible}
                onClick={(event) => {
                  event.currentTarget.blur();
                  setPerformanceVisible((value) => !value);
                }}
              >
                성능
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.control}
            aria-expanded={optionsOpen}
            onClick={(event) => {
              event.currentTarget.blur();
              setOptionsOpen((value) => !value);
            }}
          >
            {optionsOpen ? "닫기" : "옵션"}
          </button>
        </div>
      </div>
    </>
  );
}
