"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { activateStory, createSocialStorySystem, stepSocialStorySystem } from "../model/social-stories";
import { loadAggregatedStorySnapshot, saveAggregatedStorySnapshot } from "../model/session";
import { AttentionSchool, storyCenter, type FieldLayout } from "../model/attention-school";
import { techKeywordAt } from "../model/tech-keywords";
import type { GoldfishScene } from "../rendering/goldfish-scene";
import type { KeywordField } from "../rendering/keyword-field";
import styles from "./story-tray.module.css";

type StorySurface = "techMono" | "tech";
type EdgePresentation = "line" | "directed";
type StoryRingPalette = Readonly<{
  id: "instagram" | "rose" | "sunset" | "lilac" | "ocean" | "forest" | "citrus" | "ember" | "dusk" | "monochrome";
  name: string; gradient: string; edgeStart: string; edgeMiddle: string; edgeEnd: string;
}>;
const MAX_ICON_SIZE = 93;
const MIN_ICON_SIZE = 28;
const MAX_STORY_GAP = 80;
const surfaceOptions: readonly {label: string; value: StorySurface}[] = [
  { label: "tech mono", value: "techMono" }, { label: "tech", value: "tech" },
];
const storyRingPalettes: readonly StoryRingPalette[] = [
  { id: "instagram", name: "Instagram", gradient: "conic-gradient(from 205deg, #fed044, #ff264f 30%, #ed0e9b 58%, #ff5e29 80%, #fed044)", edgeStart: "#ffbd5b", edgeMiddle: "#fa4aa5", edgeEnd: "#ffd06a" },
  { id: "rose", name: "Rose", gradient: "conic-gradient(from 205deg, #ffc990, #f45b99 30%, #bd4ab9 58%, #ee8a74 80%, #ffc990)", edgeStart: "#ffc49a", edgeMiddle: "#e95f9d", edgeEnd: "#ef9dbe" },
  { id: "sunset", name: "Sunset", gradient: "conic-gradient(from 205deg, #ffe179, #ff993f 30%, #ef5551 58%, #bb4e8a 80%, #ffe179)", edgeStart: "#ffd66f", edgeMiddle: "#f46a4f", edgeEnd: "#ca5793" },
  { id: "lilac", name: "Lilac", gradient: "conic-gradient(from 205deg, #f3b7ff, #c952e8 30%, #7355df 58%, #648de8 80%, #f3b7ff)", edgeStart: "#e6b4ff", edgeMiddle: "#a653e2", edgeEnd: "#6d8ff0" },
  { id: "ocean", name: "Ocean", gradient: "conic-gradient(from 205deg, #87efd5, #2eb7d4 30%, #3f72e4 58%, #776ce7 80%, #87efd5)", edgeStart: "#87efd5", edgeMiddle: "#32a8d6", edgeEnd: "#7473ec" },
  { id: "forest", name: "Forest", gradient: "conic-gradient(from 205deg, #d9ef73, #75c76b 30%, #168c76 58%, #2eaa92 80%, #d9ef73)", edgeStart: "#d1e97c", edgeMiddle: "#54bd7a", edgeEnd: "#2aa991" },
  { id: "citrus", name: "Citrus", gradient: "conic-gradient(from 205deg, #fff36d, #c9e64b 30%, #56bc76 58%, #f2bd43 80%, #fff36d)", edgeStart: "#fff06a", edgeMiddle: "#91d05f", edgeEnd: "#f6c24e" },
  { id: "ember", name: "Ember", gradient: "conic-gradient(from 205deg, #ffc45a, #f86e35 30%, #d94545 58%, #a94d71 80%, #ffc45a)", edgeStart: "#ffbf59", edgeMiddle: "#ed593f", edgeEnd: "#b55075" },
  { id: "dusk", name: "Dusk", gradient: "conic-gradient(from 205deg, #edbb85, #cb688a 30%, #704da7 58%, #426eae 80%, #edbb85)", edgeStart: "#e9b78c", edgeMiddle: "#a8589e", edgeEnd: "#4e72b2" },
  { id: "monochrome", name: "Monochrome", gradient: "conic-gradient(from 205deg, #f3f5f6, #9199a0 30%, #4c555e 58%, #aeb5bb 80%, #f3f5f6)", edgeStart: "#d8dde0", edgeMiddle: "#8b949b", edgeEnd: "#f3f5f6" },
];

type Settings = { iconSize: number; gap: number; showLabels: boolean; surface: StorySurface;
  paletteId: string; directed: boolean; paused: boolean };
type Controller = { configure(settings: Settings): void; view(tilt: number): void; activate(index: number): void };
const FRAME_MS = 1000 / 24;
const STORY_STEP_MS = 210;
const MAX_STORIES = 2048;
const SESSION_STORAGE_KEY = "goldfishes:0908:aggregated:stories:v1";

export default function AggregatedGoldfishes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const [testSurface, setTestSurface] = useState<StorySurface>("techMono");
  const [edgePresentation, setEdgePresentation] = useState<EdgePresentation>("line");
  const [iconSize, setIconSize] = useState(40);
  const [storyGap, setStoryGap] = useState(26);
  const [showLabels, setShowLabels] = useState(false);
  const [ringPaletteId, setRingPaletteId] = useState<StoryRingPalette["id"]>("instagram");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedRingPalette = storyRingPalettes.find((palette) => palette.id === ringPaletteId)!;
  const settings = useMemo<Settings>(() => ({ iconSize, gap: storyGap, showLabels,
    surface: testSurface, paletteId: ringPaletteId, directed: edgePresentation === "directed", paused }),
    [iconSize, storyGap, showLabels, testSurface, ringPaletteId, edgePresentation, paused]);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    controllerRef.current?.configure(settings);
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let failed = false;
    let scene: GoldfishScene | undefined;
    let field: KeywordField | undefined;
    let school: AttentionSchool | undefined;
    let timer: number | undefined;
    let config = settingsRef.current;
    const stored = loadAggregatedStorySnapshot(SESSION_STORAGE_KEY);
    let now = stored?.time ?? 0;
    let previous = performance.now();
    let lastSaved = previous;
    let lastStoryStep = 0;
    let layout: FieldLayout = { width: 1, height: 1, columns: 1, rows: 1,
      iconSize: config.iconSize, gap: config.gap, showLabels: config.showLabels };
    let system = createSocialStorySystem(1, 1, now);
    if (stored) {
      system = {
        ...system,
        randomSeed: stored.randomSeed,
        states: system.states.map((state, index) => stored.states[index] ?? state),
      };
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function fail(reason: unknown) {
      if (disposed || failed) return;
      failed = true;
      window.clearTimeout(timer);
      console.error("Goldfishes 0908 renderer:", reason);
      setError("The 3D scene could not be rendered. Reload to try again.");
    }
    function persist() {
      saveAggregatedStorySnapshot(SESSION_STORAGE_KEY, now, system.randomSeed, system.states);
    }
    function draw() {
      if (!scene || !field || !school || disposed || failed) return;
      try {
        field.update(system, config, now);
        scene.render(school.fish, now / 1000);
      } catch (reason) { fail(reason); }
    }
    function resize() {
      const width = Math.max(1, canvas!.clientWidth);
      const height = Math.max(1, canvas!.clientHeight);
      const columns = Math.min(MAX_STORIES, Math.max(1, Math.floor((width + config.gap) / (config.iconSize + config.gap))));
      const rowHeight = config.iconSize + (config.showLabels ? 28 : 0);
      const rows = Math.min(Math.floor(MAX_STORIES / columns), Math.max(1, Math.floor((height + config.gap) / (rowHeight + config.gap))));
      const changedGrid = columns !== layout.columns || rows !== layout.rows;
      layout = { width, height, columns, rows, iconSize: config.iconSize, gap: config.gap, showLabels: config.showLabels };
      if (changedGrid) {
        // Keep occurrences/identities for retained cells; resize does not renew their novelty.
        const next = createSocialStorySystem(columns, rows, now);
        system = { ...next, randomSeed: system.randomSeed,
          states: next.states.map((state, index) => system.states[index] ?? state) };
      }
      setNodeCount(columns * rows);
      setSelectedIndex((index) => Math.min(index, columns * rows - 1));
      scene?.setSize(width, height);
      field?.setLayout(layout);
      if (school) school.resize(layout); else school = new AttentionSchool(layout);
      school.updateTargets(system);
      draw();
    }
    function activate(index: number) {
      system = activateStory(system, index, now);
      school?.updateTargets(system);
      setSelectedIndex(index);
      draw();
    }
    function tick() {
      if (disposed || failed) return;
      const started = performance.now();
      const delta = Math.min(FRAME_MS, Math.max(0, started - previous));
      previous = started;
      if (!document.hidden && !motion.matches && !config.paused && scene && school) {
        now += delta;
        if (now - lastStoryStep >= STORY_STEP_MS) {
          system = stepSocialStorySystem(system, now);
          // The archived cascade has an absorbing empty state. Seed only after it fully clears.
          if (system.states.every((state) => state.status === "empty")) {
            system = activateStory(system, Math.floor((system.randomSeed / 0x100000000) * system.nodes.length), now);
          }
          school.updateTargets(system);
          lastStoryStep = now;
          if (started - lastSaved >= 1000) {
            persist();
            lastSaved = started;
          }
        }
        school.step(delta / 1000, now);
        draw();
      }
      if (!failed) timer = window.setTimeout(tick, Math.max(FRAME_MS, FRAME_MS - (performance.now() - started)));
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const controller: Controller = {
      configure(next) {
        const relayout = config.iconSize !== next.iconSize || config.gap !== next.gap || config.showLabels !== next.showLabels;
        config = next;
        if (relayout) resize(); else draw();
      },
      view(tilt) { scene?.resetCamera(); scene?.setView(tilt); draw(); },
      activate,
    };
    controllerRef.current = controller;
    let gesture: { id: number; x: number; y: number; startX: number; startY: number; orbit: boolean } | null = null;
    const pointerDown = (event: PointerEvent) => {
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY,
        startX: event.clientX, startY: event.clientY, orbit: event.altKey || event.button === 2 };
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      if (gesture.orbit) { scene?.orbit(event.clientX - gesture.x, event.clientY - gesture.y); draw(); }
      gesture.x = event.clientX; gesture.y = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      if (!gesture.orbit && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 5) {
        const rect = canvas.getBoundingClientRect();
        const point = scene?.screenToField(event.clientX - rect.left, event.clientY - rect.top);
        if (point) {
          let closest = -1, distance = Infinity;
          for (let index = 0; index < system.nodes.length; index++) {
            const center = storyCenter(index, layout);
            const d = Math.hypot(center.x - point.x, center.y - point.y);
            if (d < distance) { closest = index; distance = d; }
          }
          if (closest >= 0 && distance <= layout.iconSize / 2) activate(closest);
        }
      }
      gesture = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const cancel = () => { gesture = null; };
    const contextMenu = (event: Event) => event.preventDefault();
    const wheel = (event: WheelEvent) => { event.preventDefault(); scene?.zoom(event.deltaY); draw(); };
    const visibility = () => { previous = performance.now(); };
    const contextLost = (event: Event) => { event.preventDefault(); fail(new Error("Graphics context lost")); };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("contextmenu", contextMenu);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("webglcontextlost", contextLost);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", persist);
    motion.addEventListener("change", visibility);
    void (async () => {
      try {
        const [{ GoldfishScene: Scene }, { KeywordField: Field }] = await Promise.all([
          import("../rendering/goldfish-scene"), import("../rendering/keyword-field"),
        ]);
        if (disposed) return;
        const created = await Scene.create(canvas, 100);
        if (disposed) { created.dispose(); return; }
        scene = created;
        scene.setDeviceLostHandler(() => fail(new Error("WebGPU device lost")));
        field = new Field();
        scene.addField(field.group);
        resize(); // Static first frame, including reduced-motion users.
        previous = performance.now();
        timer = window.setTimeout(tick, FRAME_MS);
      } catch (reason) { fail(reason); }
    })();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
      if (controllerRef.current === controller) controllerRef.current = null;
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("contextmenu", contextMenu);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("webglcontextlost", contextLost);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", persist);
      persist();
      motion.removeEventListener("change", visibility);
      field?.dispose();
      scene?.dispose();
    };
  }, []);

  return (
    <main aria-label="Goldfishes attending a field of technology keywords" className={styles.screen}>
      <section className={styles.gridStage}>
        <canvas aria-label="3D keyword field. Click a keyword to renew it. Alt-drag or right-drag to orbit; scroll to zoom." className={styles.sceneCanvas} ref={canvasRef} />
        {error ? <p className={styles.renderError} role="alert">{error}</p> : null}
      </section>
      <form className={styles.keyboardControls} onSubmit={(event) => { event.preventDefault(); controllerRef.current?.activate(selectedIndex); }}>
        <label>Keyword<select value={selectedIndex} onChange={(event) => setSelectedIndex(Number(event.target.value))}>
          {Array.from({length: nodeCount}, (_, index) => <option key={`story-${index + 1}`} value={index}>{techKeywordAt(index).abbreviation} · {index + 1}</option>)}
        </select></label>
        <button type="submit">Renew keyword</button>
        <span>Alt-drag or right-drag to orbit. Scroll to zoom.</span>
      </form>
      <section aria-label="Story surface test" className={styles.controls}>
        <div className={styles.controlActions}>
          <div className={styles.actions}>
            <button onClick={() => controllerRef.current?.view(0)} type="button">top</button>
            <button onClick={() => controllerRef.current?.view(55)} type="button">oblique</button>
            <button aria-pressed={paused} onClick={() => setPaused((value) => !value)} type="button">{paused ? "resume" : "pause"}</button>
            {surfaceOptions.map((option) => (
              <button aria-pressed={testSurface === option.value} key={option.value} onClick={() => setTestSurface(option.value)} type="button">
                {option.label}
              </button>
            ))}
            <button aria-pressed={edgePresentation === "line"} onClick={() => setEdgePresentation("line")} type="button">
              edge
            </button>
            <button aria-pressed={edgePresentation === "directed"} onClick={() => setEdgePresentation("directed")} type="button">
              directed edge
            </button>
            <button aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)} type="button">
              text {showLabels ? "active" : "inactive"}
            </button>
          </div>
          <label className={styles.sizeControl}>
            <span>size</span>
            <input aria-label="Story icon size" max={MAX_ICON_SIZE} min={MIN_ICON_SIZE} onChange={(event) => setIconSize(Number(event.currentTarget.value))} step="1" type="range" value={iconSize} />
            <output>{iconSize}px</output>
          </label>
          <label className={styles.sizeControl}>
            <span>margin</span>
            <input aria-label="Space between story icons" max={MAX_STORY_GAP} min="0" onChange={(event) => setStoryGap(Number(event.currentTarget.value))} step="1" type="range" value={storyGap} />
            <output>{storyGap}px</output>
          </label>
          <div className={styles.paletteControl}>
            <button aria-expanded={isPaletteOpen} aria-label="Choose story ring colors" className={styles.paletteTrigger} onClick={() => setIsPaletteOpen((current) => !current)} type="button">
              <span aria-hidden="true" className={styles.palettePreview} style={{ background: selectedRingPalette.gradient }} />
            </button>
            {isPaletteOpen ? (
              <div aria-label="Story ring color palettes" className={styles.palettePopover} role="group">
                {storyRingPalettes.map((palette) => (
                  <button aria-label={palette.name} aria-pressed={palette.id === ringPaletteId} className={styles.paletteOption} key={palette.id} onClick={() => { setRingPaletteId(palette.id); setIsPaletteOpen(false); }} type="button">
                    <span aria-hidden="true" className={styles.palettePreview} style={{ background: palette.gradient }} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
