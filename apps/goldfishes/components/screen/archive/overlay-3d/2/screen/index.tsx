"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createSocialStorySystem,
  maintainSocialStoryActivity,
  resizeSocialStorySystem,
  stepSocialStorySystem,
} from "../model/social-stories";
import { loadSocialStorySystem, saveSocialStorySystem } from "../model/session";
import { AttentionSchool, type FieldLayout } from "../model/attention-school";
import { techKeywordAt } from "../model/tech-keywords";
import type { FishColourPaletteId, GoldfishScene } from "../rendering/goldfish-scene";
import type { StoryInfluence } from "../model/types";
import styles from "./story-tray.module.css";

const REFERENCE_STORY_SIZE = 93;
const DEFAULT_ICON_SIZE = 50;
const MIN_ICON_SIZE = 28;
const MAX_ICON_SIZE = REFERENCE_STORY_SIZE;
const DEFAULT_STORY_GAP = 30;
const EDGE_SCALE_REFERENCE_SIZE = 40;
const LINE_EDGE_WIDTH = 2.15;
const DIRECTED_EDGE_WIDTH = 2.3;
const MAX_STORY_GAP = 80;
const STORY_LABEL_HEIGHT = 28;
const SIMULATION_STEP_MILLISECONDS = 210;
const SESSION_STORAGE_KEY = "goldfishes:0908:overlay-2:stories:v1";

type GridSize = {
  columns: number;
  rows: number;
};

type StageSize = {
  width: number;
  height: number;
};

type StorySurface = "empty" | "white" | "face" | "numbers" | "colour" | "techMono" | "tech";
type EdgePresentation = "line" | "directed";

type StoryRingPalette = Readonly<{
  id: "instagram" | "rose" | "sunset" | "lilac" | "ocean" | "forest" | "citrus" | "ember" | "dusk" | "monochrome";
  name: string;
  gradient: string;
  edgeStart: string;
  edgeMiddle: string;
  edgeEnd: string;
}>;

type FishColourPalette = Readonly<{
  id: FishColourPaletteId;
  name: string;
  gradient: string;
}>;

type TechPaletteGroup = Readonly<{
  paletteId: StoryRingPalette["id"];
  terms: readonly string[];
}>;

type InfluenceGeometry = {
  id: string;
  source: number;
  target: number;
  path: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

const surfaceOptions: readonly { label: string; value: StorySurface }[] = [
  { label: "empty", value: "empty" },
  { label: "white", value: "white" },
  { label: "face", value: "face" },
  { label: "numbers", value: "numbers" },
  { label: "colour", value: "colour" },
  { label: "tech mono", value: "techMono" },
  { label: "tech", value: "tech" },
];
const humanFaceImages = Array.from(
  { length: 60 },
  (_, index) => `/images/grid-2/politicians/${String(index + 1).padStart(3, "0")}.jpg`,
);
const politicianLean = [
  1, -0.65, -0.45, -0.2, 0, -0.9, -0.75, -0.45, -0.75, -0.8,
  -0.2, 0.6, 0.25, -0.55, 0.6, 0.35, 0, -0.55, 0.1, 0.35,
  -0.45, -0.9, -0.75, 0.9, 0, -0.45, 0.95, 0.45, 0.45, -0.75,
  0.4, -0.65, 0.4, -0.55, -0.35, 0, -0.2, 0.15, -0.45, 0.35,
  0, 0.1, 0.35, -0.75, -0.55, -0.55, -0.65, -0.85, 0, -0.2,
  -0.15, 0.65, 0.85, 0, -0.35, -0.45, -0.9, 0.55, -0.85, 0.25,
] as const;
const numberGlyphs = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function politicianTint(index: number) {
  const lean = politicianLean[index % politicianLean.length]!;
  const from = lean < 0 ? [42, 105, 255] : [139, 94, 164];
  const to = lean < 0 ? [139, 94, 164] : [244, 61, 74];
  const amount = Math.abs(lean);
  return `rgb(${from.map((channel, channelIndex) => Math.round(channel + (to[channelIndex]! - channel) * amount)).join(" ")})`;
}
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
const fishColourPalettes: readonly FishColourPalette[] = [
  { id: "classic", name: "Classic goldfish", gradient: "conic-gradient(from 205deg, #f0c16d, #cf741c 38%, #9e4f14 68%, #e7b365 84%, #f0c16d)" },
  { id: "instagram", name: "Instagram", gradient: "conic-gradient(from 205deg, #fed044, #ff264f 30%, #ed0e9b 58%, #ff5e29 80%, #fed044)" },
  { id: "rose", name: "Rose", gradient: "conic-gradient(from 205deg, #ffc990, #f45b99 30%, #bd4ab9 58%, #ee8a74 80%, #ffc990)" },
  { id: "sunset", name: "Sunset", gradient: "conic-gradient(from 205deg, #ffe179, #ff993f 30%, #ef5551 58%, #bb4e8a 80%, #ffe179)" },
  { id: "poppy", name: "Poppy red", gradient: "conic-gradient(from 205deg, #f8a15d, #e83c42 38%, #b8242d 68%, #f15d45 84%, #f8a15d)" },
  { id: "pink", name: "Natural pink", gradient: "conic-gradient(from 205deg, #f6c0a4, #e57687 38%, #b94d66 68%, #ef8d98 84%, #f6c0a4)" },
];
const techPaletteGroups: readonly TechPaletteGroup[] = [
  { paletteId: "instagram", terms: ["AGI", "GPT", "LLM", "RAG"] },
  { paletteId: "lilac", terms: ["AI", "ML", "DL", "NLP"] },
  { paletteId: "ember", terms: ["CPU", "GPU", "NPU", "RAM"] },
  { paletteId: "ocean", terms: ["IoT", "AR", "VR", "XR", "CDN", "DNS", "URL", "VPN"] },
  { paletteId: "forest", terms: ["API", "SDK", "IDE", "OOP", "QA", "DB", "SQL"] },
  { paletteId: "citrus", terms: ["UI", "UX", "HCI", "MVP"] },
  { paletteId: "sunset", terms: ["NFT", "DAO"] },
  { paletteId: "monochrome", terms: ["OS", "PC", "VM"] },
];

function getGridSize(
  width: number,
  height: number,
  storySize: number,
  storyRowHeight: number,
  storyGap: number,
): GridSize {
  return {
    columns: Math.max(1, Math.floor((width + storyGap) / (storySize + storyGap))),
    rows: Math.max(1, Math.floor((height + storyGap) / (storyRowHeight + storyGap))),
  };
}

function storyRingPaletteById(id: StoryRingPalette["id"]) {
  return storyRingPalettes.find((palette) => palette.id === id) ?? storyRingPalettes[0]!;
}

function techPaletteForTerm(term: string) {
  const group = techPaletteGroups.find((candidate) => candidate.terms.includes(term));
  return storyRingPaletteById(group?.paletteId ?? "instagram");
}

function techPaletteForIndex(index: number) {
  return techPaletteForTerm(techKeywordAt(index).abbreviation);
}

function colourUnit(index: number, seed: number, salt: number) {
  const value = Math.sin((index + 1) * (seed + salt * 19.73)) * 43758.5453123;
  return value - Math.floor(value);
}

function colourFor(index: number, seed: number) {
  const hue = Math.round(colourUnit(index, seed, 1) * 360);
  const saturation = Math.round(52 + colourUnit(index, seed, 2) * 43);
  const lightness = Math.round(33 + colourUnit(index, seed, 3) * 42);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function getSurfaceStyle(surface: StorySurface, index: number, colourSeed: number): CSSProperties {
  if (surface === "empty" || surface === "numbers" || surface === "techMono" || surface === "tech") return { backgroundColor: "#242a2f" };
  if (surface === "face") {
    const tint = politicianTint(index);
    return { backgroundImage: `linear-gradient(${tint}, ${tint}), url("${humanFaceImages[index % humanFaceImages.length]}")`, backgroundBlendMode: "color, normal", backgroundSize: "cover" };
  }
  if (surface === "colour") return { backgroundColor: colourFor(index, colourSeed) };
  return { backgroundColor: "#fff" };
}

function TechMark({ term }: { term: string }) {
  return (
    <svg aria-hidden="true" className={styles.techMark} viewBox="0 0 100 100">
      <text className={term.length === 3 ? styles.techMarkThree : undefined} dominantBaseline="central" textAnchor="middle" x="50" y="50">{term}</text>
    </svg>
  );
}

function NumberMark({ glyph }: { glyph: string }) {
  return <svg aria-hidden="true" className={styles.numberMark} viewBox="0 0 100 100"><text dominantBaseline="central" textAnchor="middle" x="50" y="50">{glyph}</text></svg>;
}

function storyCenter(
  index: number,
  stage: StageSize,
  grid: GridSize,
  storySize: number,
  storyRowHeight: number,
  storyGap: number,
) {
  const gridWidth = grid.columns * storySize + (grid.columns - 1) * storyGap;
  const gridHeight = grid.rows * storyRowHeight + (grid.rows - 1) * storyGap;
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);

  return {
    x: (stage.width - gridWidth) / 2 + storySize / 2 + column * (storySize + storyGap),
    y: (stage.height - gridHeight) / 2 + storySize / 2 + row * (storyRowHeight + storyGap),
  };
}

function getInfluenceGeometry(
  influence: StoryInfluence,
  stage: StageSize,
  grid: GridSize,
  storySize: number,
  storyRowHeight: number,
  storyGap: number,
): InfluenceGeometry | null {
  const source = storyCenter(influence.source, stage, grid, storySize, storyRowHeight, storyGap);
  const target = storyCenter(influence.target, stage, grid, storySize, storyRowHeight, storyGap);
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < 1) return null;

  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const edgeOffset = Math.min(storySize * 0.48, distance * 0.28);
  const startX = source.x + unitX * edgeOffset;
  const startY = source.y + unitY * edgeOffset;
  const endX = target.x - unitX * edgeOffset;
  const endY = target.y - unitY * edgeOffset;
  const bendDirection = (influence.source * 17 + influence.target * 13) % 2 === 0 ? 1 : -1;
  const bend = Math.min(18, distance * 0.16) * bendDirection;
  const controlX = (startX + endX) / 2 - unitY * bend;
  const controlY = (startY + endY) / 2 + unitX * bend;

  return {
    id: influence.id,
    source: influence.source,
    target: influence.target,
    path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    startX,
    startY,
    endX,
    endY,
  };
}

export function InstagramSocialStoryTray() {
  const gridRef = useRef<HTMLUListElement>(null);
  const traceCanvasRef = useRef<HTMLCanvasElement>(null);
  const fishCanvasRef = useRef<HTMLCanvasElement>(null);
  const schoolRef = useRef<AttentionSchool | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>({ columns: 1, rows: 1 });
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [testSurface, setTestSurface] = useState<StorySurface>("techMono");
  const [edgePresentation, setEdgePresentation] = useState<EdgePresentation>("line");
  const [iconSize, setIconSize] = useState(DEFAULT_ICON_SIZE);
  const [storyGap, setStoryGap] = useState(DEFAULT_STORY_GAP);
  const [showLabels, setShowLabels] = useState(false);
  const [showTraces, setShowTraces] = useState(false);
  const showTracesRef = useRef(false);
  const [fishPaletteId, setFishPaletteId] = useState<FishColourPaletteId>("classic");
  const fishPaletteIdRef = useRef<FishColourPaletteId>("classic");
  const [isFishPaletteOpen, setIsFishPaletteOpen] = useState(false);
  const [jakarta, setJakarta] = useState(false);
  const [jakartaAmount, setJakartaAmount] = useState(100);
  const [colourSeed] = useState(() => Math.random() * 100000);
  const [ringPaletteId, setRingPaletteId] = useState<StoryRingPalette["id"]>("monochrome");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [system, setSystem] = useState(() => createSocialStorySystem(1, 1));
  const systemRef = useRef(system);
  const simulationTimeRef = useRef(0);
  const [gridReady, setGridReady] = useState(false);
  const fishLayoutRef = useRef<FieldLayout>({ width: 1, height: 1, columns: 1, rows: 1, iconSize: DEFAULT_ICON_SIZE, gap: DEFAULT_STORY_GAP, showLabels: false });
  const storyRowHeight = iconSize + (showLabels ? STORY_LABEL_HEIGHT : 0);
  const selectedRingPalette = storyRingPalettes.find((palette) => palette.id === ringPaletteId) ?? storyRingPalettes[0]!;
  const selectedFishPalette = fishColourPalettes.find((palette) => palette.id === fishPaletteId) ?? fishColourPalettes[0]!;
  const edgeWidth = (edgePresentation === "directed" ? DIRECTED_EDGE_WIDTH : LINE_EDGE_WIDTH) * iconSize / EDGE_SCALE_REFERENCE_SIZE;

  useEffect(() => {
    systemRef.current = system;
    fishLayoutRef.current = { width: stageSize.width || 1, height: stageSize.height || 1, columns: gridSize.columns, rows: gridSize.rows, iconSize, gap: storyGap, showLabels };
  }, [gridSize, iconSize, showLabels, stageSize, storyGap, system]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridSize = () => {
      const nextStage = { width: grid.clientWidth, height: grid.clientHeight };
      const nextGrid = getGridSize(
        nextStage.width,
        nextStage.height,
        iconSize,
        storyRowHeight,
        storyGap,
      );
      setStageSize((current) => (
        current.width === nextStage.width && current.height === nextStage.height ? current : nextStage
      ));
      setGridSize((current) => (
        current.columns === nextGrid.columns && current.rows === nextGrid.rows ? current : nextGrid
      ));
      setGridReady(true);
    };

    updateGridSize();
    const observer = new ResizeObserver(updateGridSize);
    observer.observe(grid);

    return () => observer.disconnect();
  }, [iconSize, storyGap, storyRowHeight]);

  useEffect(() => {
    const stored = loadSocialStorySystem(SESSION_STORAGE_KEY);
    if (!stored) return;
    systemRef.current = stored.system;
    simulationTimeRef.current = stored.time;
    setSystem(stored.system);
  }, []);

  useEffect(() => {
    if (!gridReady) return;
    const nextSystem = resizeSocialStorySystem(
      systemRef.current,
      gridSize.columns,
      gridSize.rows,
      simulationTimeRef.current,
    );
    if (nextSystem === systemRef.current) return;
    systemRef.current = nextSystem;
    setSystem(nextSystem);
    saveSocialStorySystem(SESSION_STORAGE_KEY, simulationTimeRef.current, nextSystem);
  }, [gridReady, gridSize]);

  useEffect(() => {
    let timer: number;
    let active = true;
    let previous = performance.now();
    let lastSaved = previous;

    const persist = () => {
      saveSocialStorySystem(SESSION_STORAGE_KEY, simulationTimeRef.current, systemRef.current);
    };
    const resetClock = () => { previous = performance.now(); };

    const scheduleStep = () => {
      timer = window.setTimeout(() => {
        if (!active) return;
        const current = performance.now();
        if (document.visibilityState !== "hidden") {
          simulationTimeRef.current += Math.min(
            SIMULATION_STEP_MILLISECONDS,
            Math.max(0, current - previous),
          );
          let nextSystem = stepSocialStorySystem(systemRef.current, simulationTimeRef.current, schoolRef.current?.drainAttention());
          nextSystem = maintainSocialStoryActivity(nextSystem, simulationTimeRef.current);
          systemRef.current = nextSystem;
          setSystem(nextSystem);
          if (current - lastSaved >= 1000) {
            persist();
            lastSaved = current;
          }
        }
        previous = current;
        scheduleStep();
      }, SIMULATION_STEP_MILLISECONDS);
    };

    document.addEventListener("visibilitychange", resetClock);
    window.addEventListener("pagehide", persist);
    scheduleStep();
    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resetClock);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, []);

  useEffect(() => {
    const canvas = fishCanvasRef.current;
    const traceCanvas = traceCanvasRef.current;
    if (!canvas || !traceCanvas) return;
    let disposed = false;
    let scene: GoldfishScene | undefined;
    let school: AttentionSchool | undefined;
    let timer: number | undefined;
    let previous = performance.now();
    let layoutKey = "";
    let targetSystem: typeof systemRef.current | undefined = systemRef.current;
    let elapsedSeconds = 0;
    let tracesVisible = false;
    let renderedFishPaletteId: FishColourPaletteId = "classic";
    let failed = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fail = (reason: unknown) => {
      if (disposed || failed) return;
      failed = true;
      window.clearTimeout(timer);
      console.error("Goldfishes 0908 overlay-2 renderer:", reason);
    };
    const syncTargets = () => {
      if (!school || targetSystem === systemRef.current) return false;
      school.updateTargets(systemRef.current);
      targetSystem = systemRef.current;
      return true;
    };
    const applyLayout = () => {
      const layout = fishLayoutRef.current;
      const nextKey = `${layout.width}:${layout.height}:${layout.columns}:${layout.rows}:${layout.iconSize}:${layout.gap}:${layout.showLabels}`;
      if (nextKey === layoutKey) return false;
      layoutKey = nextKey;
      if (school) school.resize(layout); else school = new AttentionSchool(layout, 120);
      schoolRef.current = school;
      targetSystem = undefined;
      syncTargets();
      return true;
    };
    const resize = () => {
      if (!scene) return;
      scene.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
      applyLayout();
      if (school) scene.render(school.fish, elapsedSeconds, 0, showTracesRef.current, fishPaletteIdRef.current);
    };
    const draw = () => {
      if (disposed || failed || !scene || !school) return;
      const started = performance.now();
      const layoutChanged = applyLayout();
      const targetsChanged = syncTargets();
      const traceChanged = tracesVisible !== showTracesRef.current;
      tracesVisible = showTracesRef.current;
      const fishPaletteChanged = renderedFishPaletteId !== fishPaletteIdRef.current;
      renderedFishPaletteId = fishPaletteIdRef.current;
      if (!document.hidden && !motion.matches) {
        const now = simulationTimeRef.current;
        const delta = Math.min(1000 / 24, Math.max(0, started - previous));
        elapsedSeconds += delta / 1000;
        school.step(delta / 1000, now);
        scene.render(school.fish, elapsedSeconds, delta / 1000, showTracesRef.current, fishPaletteIdRef.current);
      } else if (layoutChanged || targetsChanged || traceChanged || fishPaletteChanged) {
        scene.render(school.fish, elapsedSeconds, 0, showTracesRef.current, fishPaletteIdRef.current);
      }
      previous = started;
      timer = window.setTimeout(draw, Math.max(1000 / 24, 1000 / 24 - (performance.now() - started)));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibility = () => { previous = performance.now(); };
    const contextLost = (event: Event) => { event.preventDefault(); fail(new Error("WebGL context lost")); };
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", visibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    void import("../rendering/goldfish-scene").then(({ GoldfishScene: Scene }) => {
      if (disposed) return;
      scene = new Scene(canvas, traceCanvas, 120);
      resize(); // Establish a static frame before autonomous animation.
      timer = window.setTimeout(draw, 1000 / 24);
    }).catch(fail);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      scene?.dispose();
      if (schoolRef.current === school) schoolRef.current = null;
    };
  }, []);

  const gridStyle = {
    "--grid-columns": gridSize.columns,
    "--grid-rows": gridSize.rows,
    "--story-size": `${iconSize}px`,
    "--story-row-height": `${storyRowHeight}px`,
    "--story-gap": `${storyGap}px`,
    "--story-ring-padding": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
    "--story-separator": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
    "--story-ring-gradient": selectedRingPalette.gradient,
  } as CSSProperties;
  const influenceGeometry = useMemo(() => system.influences.map((influence) => (
    getInfluenceGeometry(influence, stageSize, gridSize, iconSize, storyRowHeight, storyGap)
  )).filter((influence): influence is InfluenceGeometry => influence !== null), [
    gridSize,
    iconSize,
    stageSize,
    storyGap,
    storyRowHeight,
    system.influences,
  ]);

  return (
    <main aria-label="Instagram stories influenced by nearby stories" className={styles.screen}
      style={jakarta ? { filter: `contrast(${1 + jakartaAmount * 0.0028}) brightness(${1 + jakartaAmount * 0.0004}) saturate(${1 - jakartaAmount * 0.001}) hue-rotate(${jakartaAmount * 0.06}deg)` } : undefined}>
      <section className={styles.gridStage}>
        <canvas aria-hidden="true" className={styles.traceOverlay} ref={traceCanvasRef} />
        {stageSize.width > 0 && stageSize.height > 0 ? (
          <svg aria-hidden="true" className={styles.influenceLayer} viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}>
            <defs>
              {influenceGeometry.map((influence) => {
                const sourcePalette = testSurface === "tech" ? techPaletteForIndex(influence.source) : selectedRingPalette;
                const targetPalette = testSurface === "tech" ? techPaletteForIndex(influence.target) : selectedRingPalette;

                return (
                  <linearGradient gradientUnits="userSpaceOnUse" id={`influence-${influence.id}`} key={influence.id} x1={influence.startX} x2={influence.endX} y1={influence.startY} y2={influence.endY}>
                    <stop offset="0%" stopColor={testSurface === "tech" ? sourcePalette.edgeMiddle : selectedRingPalette.edgeStart} stopOpacity="0.16" />
                    <stop offset="62%" stopColor={testSurface === "tech" ? targetPalette.edgeMiddle : selectedRingPalette.edgeMiddle} stopOpacity="0.76" />
                    <stop offset="100%" stopColor={testSurface === "tech" ? targetPalette.edgeMiddle : selectedRingPalette.edgeEnd} stopOpacity="1" />
                  </linearGradient>
                );
              })}
              {edgePresentation === "directed" ? influenceGeometry.map((influence) => {
                const targetPalette = testSurface === "tech" ? techPaletteForIndex(influence.target) : selectedRingPalette;

                return (
                  <marker id={`influence-arrow-${influence.id}`} key={`influence-arrow-${influence.id}`} markerHeight="8" markerUnits="userSpaceOnUse" markerWidth="8" orient="auto" refX="7" refY="4" viewBox="0 0 8 8">
                    <path className={styles.influenceArrow} d="M 0 0 L 8 4 L 0 8 z" fill={targetPalette.edgeMiddle} />
                  </marker>
                );
              }) : null}
            </defs>
            {influenceGeometry.map((influence) => (
              <g className={styles.influence} key={influence.id}>
                <path className={`${styles.influencePath} ${edgePresentation === "directed" ? styles.influencePathDirected : ""}`} d={influence.path} markerEnd={edgePresentation === "directed" ? `url(#influence-arrow-${influence.id})` : undefined} pathLength="1" stroke={`url(#influence-${influence.id})`} style={{ strokeWidth: edgeWidth }} />
                <circle className={styles.influenceTarget} cx={influence.endX} cy={influence.endY} r="2.25" />
              </g>
            ))}
          </svg>
        ) : null}
        <canvas aria-hidden="true" className={styles.fishOverlay} ref={fishCanvasRef} />
        <ul className={styles.storyGrid} ref={gridRef} style={gridStyle}>
          {system.nodes.map((story) => {
            const storyState = system.states[story.index];
            const techKeyword = techKeywordAt(story.index);
            const isEmpty = storyState?.status === "empty";
            const isNew = storyState?.status === "new";
            const isViewing = storyState?.status === "viewing";
            const isLeaving = storyState?.status === "leaving";

            return (
              <li className={styles.gridItem} key={story.id}>
                <span className={`${styles.story} ${isEmpty ? styles.storyEmpty : isLeaving ? styles.storyLeaving : ""}`}>
                  <span className={`${styles.storyRing} ${isNew ? styles.storyRingNew : isViewing ? styles.storyRingViewing : styles.storyRingPlain}`} style={testSurface === "tech" ? { "--story-ring-gradient": techPaletteForIndex(story.index).gradient } as CSSProperties : undefined}>
                    <span
                      aria-hidden="true"
                      className={`${styles.logoSurface} ${testSurface === "numbers" || testSurface === "techMono" || testSurface === "tech" ? styles.centeredSurface : ""} ${testSurface === "face" ? styles.monochromeFace : ""}`}
                      style={getSurfaceStyle(testSurface, story.index, colourSeed)}
                    >
                      {testSurface === "numbers" ? <NumberMark glyph={numberGlyphs[story.index % numberGlyphs.length]!} /> : null}
                      {testSurface === "techMono" || testSurface === "tech" ? <TechMark term={techKeyword.abbreviation} /> : null}
                    </span>
                  </span>
                  {showLabels ? <span className={styles.storyLabel}>{techKeyword.text}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Story surface test" className={styles.controls}>
        <div className={styles.controlActions}>
          <div className={styles.controlScroll}>
            <div className={styles.actions}>
              <button aria-pressed={jakarta} title="Apply the overlay-2d-4 deep-black backboard colour treatment." onClick={() => setJakarta(!jakarta)} type="button">Backboard</button>
              <button aria-pressed={showTraces} onClick={() => setShowTraces((current) => { const next = !current; showTracesRef.current = next; return next; })} type="button">trace {showTraces ? "active" : "inactive"}</button>
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
            <label className={styles.sizeControl} aria-disabled={!jakarta}>
              <span>filter</span>
              <input aria-label="Backboard intensity" disabled={!jakarta} min="0" max="100" step="1" type="range" value={jakartaAmount} onChange={(event) => setJakartaAmount(Number(event.currentTarget.value))} />
              <output>{jakartaAmount}%</output>
            </label>
            <label className={styles.sizeControl}>
              <span>margin</span>
              <input aria-label="Space between story icons" max={MAX_STORY_GAP} min="0" onChange={(event) => setStoryGap(Number(event.currentTarget.value))} step="1" type="range" value={storyGap} />
              <output>{storyGap}px</output>
            </label>
          </div>
          <div className={styles.paletteControl}>
            <button aria-expanded={isFishPaletteOpen} aria-label="Choose goldfish colors" className={styles.paletteTrigger} onClick={() => setIsFishPaletteOpen((current) => !current)} type="button">
              <span aria-hidden="true" className={styles.palettePreview} style={{ background: selectedFishPalette.gradient }} />
            </button>
            {isFishPaletteOpen ? (
              <div aria-label="Goldfish color palettes" className={styles.palettePopover} role="group">
                {fishColourPalettes.map((palette) => (
                  <button aria-label={palette.name} aria-pressed={palette.id === fishPaletteId} className={styles.paletteOption} key={palette.id} onClick={() => { fishPaletteIdRef.current = palette.id; setFishPaletteId(palette.id); setIsFishPaletteOpen(false); }} type="button">
                    <span aria-hidden="true" className={styles.palettePreview} style={{ background: palette.gradient }} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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
