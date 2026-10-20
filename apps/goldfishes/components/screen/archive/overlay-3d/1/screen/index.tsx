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
import type { GoldfishScene } from "../rendering/goldfish-scene";
import type { StoryInfluence } from "../model/types";
import styles from "./story-tray.module.css";

const REFERENCE_STORY_SIZE = 93;
const DEFAULT_ICON_SIZE = 40;
const MIN_ICON_SIZE = 28;
const MAX_ICON_SIZE = REFERENCE_STORY_SIZE;
const DEFAULT_STORY_GAP = 26;
const MAX_STORY_GAP = 80;
const STORY_LABEL_HEIGHT = 28;
const SIMULATION_STEP_MILLISECONDS = 210;
const SESSION_STORAGE_KEY = "goldfishes:0908:overlay:stories:v1";

type GridSize = {
  columns: number;
  rows: number;
};

type StageSize = {
  width: number;
  height: number;
};

type StorySurface = "techMono" | "tech";
type EdgePresentation = "line" | "directed";

type StoryRingPalette = Readonly<{
  id: "instagram" | "rose" | "sunset" | "lilac" | "ocean" | "forest" | "citrus" | "ember" | "dusk" | "monochrome";
  name: string;
  gradient: string;
  edgeStart: string;
  edgeMiddle: string;
  edgeEnd: string;
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
  { label: "tech mono", value: "techMono" },
  { label: "tech", value: "tech" },
];
const techSurfaceStyle: CSSProperties = { backgroundColor: "#242a2f" };
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
const techPaletteGroups: readonly TechPaletteGroup[] = [
  { paletteId: "instagram", terms: ["AX", "DX", "GD", "NG", "AGI", "GPT", "LLM", "RAG", "VLM"] },
  { paletteId: "lilac", terms: ["AI", "ML", "DL", "RL", "CV", "NL", "GPU", "NLP", "NPU"] },
  { paletteId: "ocean", terms: ["AR", "BI", "DB", "DC", "DM", "DS", "DT", "KB", "MR", "VR", "XR", "API", "CDN", "CLI", "IoT", "SDK"] },
  { paletteId: "forest", terms: ["CD", "CI", "CM", "CR", "QA", "QC", "RD", "RE", "SD", "SE", "SI", "SW", "IDE", "RPA", "SRE"] },
  { paletteId: "citrus", terms: ["FE", "IA", "IC", "ID", "IM", "IS", "IT", "NC", "OA", "OO", "OS", "OT", "PC", "UI", "UX", "KPI", "MVP"] },
  { paletteId: "rose", terms: ["CS", "CX", "EM", "HR", "PR", "PS", "SA", "CRM", "ERP", "ESG"] },
  { paletteId: "sunset", terms: ["OM", "OP", "PL", "PM", "PO", "SM", "SO", "SP", "TA", "TC", "TD", "TM", "TP", "TS", "DAO", "NFT"] },
  { paletteId: "dusk", terms: ["EC", "FI", "FX", "IR", "MA", "PE", "PI", "VC"] },
  { paletteId: "ember", terms: ["BT", "DR", "GC", "IP", "RF", "SC", "SS", "ST", "TF", "VM"] },
  { paletteId: "monochrome", terms: ["KR", "MB", "OK", "RM", "SR"] },
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

function TechMark({ term }: { term: string }) {
  return (
    <svg aria-hidden="true" className={styles.techMark} viewBox="0 0 100 100">
      <text className={term.length === 3 ? styles.techMarkThree : undefined} dominantBaseline="central" textAnchor="middle" x="50" y="50">{term}</text>
    </svg>
  );
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
  const fishCanvasRef = useRef<HTMLCanvasElement>(null);
  const [gridSize, setGridSize] = useState<GridSize>({ columns: 1, rows: 1 });
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [testSurface, setTestSurface] = useState<StorySurface>("techMono");
  const [edgePresentation, setEdgePresentation] = useState<EdgePresentation>("line");
  const [iconSize, setIconSize] = useState(DEFAULT_ICON_SIZE);
  const [storyGap, setStoryGap] = useState(DEFAULT_STORY_GAP);
  const [showLabels, setShowLabels] = useState(false);
  const [ringPaletteId, setRingPaletteId] = useState<StoryRingPalette["id"]>("instagram");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [system, setSystem] = useState(() => createSocialStorySystem(1, 1));
  const systemRef = useRef(system);
  const simulationTimeRef = useRef(0);
  const [gridReady, setGridReady] = useState(false);
  const fishLayoutRef = useRef<FieldLayout>({ width: 1, height: 1, columns: 1, rows: 1, iconSize: DEFAULT_ICON_SIZE, gap: DEFAULT_STORY_GAP, showLabels: false });
  const storyRowHeight = iconSize + (showLabels ? STORY_LABEL_HEIGHT : 0);
  const selectedRingPalette = storyRingPalettes.find((palette) => palette.id === ringPaletteId) ?? storyRingPalettes[0]!;

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
          let nextSystem = stepSocialStorySystem(systemRef.current, simulationTimeRef.current);
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
    if (!canvas) return;
    let disposed = false;
    let scene: GoldfishScene | undefined;
    let school: AttentionSchool | undefined;
    let timer: number | undefined;
    let previous = performance.now();
    let layoutKey = "";
    let targetSystem: typeof systemRef.current | undefined = systemRef.current;
    let elapsedSeconds = 0;
    let failed = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fail = (reason: unknown) => {
      if (disposed || failed) return;
      failed = true;
      window.clearTimeout(timer);
      console.error("Goldfishes 0908 overlay renderer:", reason);
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
      if (school) school.resize(layout); else school = new AttentionSchool(layout, 72);
      targetSystem = undefined;
      syncTargets();
      return true;
    };
    const resize = () => {
      if (!scene) return;
      scene.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
      applyLayout();
      if (school) scene.render(school.fish, elapsedSeconds);
    };
    const draw = () => {
      if (disposed || failed || !scene || !school) return;
      const started = performance.now();
      const layoutChanged = applyLayout();
      const targetsChanged = syncTargets();
      if (!document.hidden && !motion.matches) {
        const now = Date.now();
        const delta = Math.min(1000 / 24, Math.max(0, started - previous));
        elapsedSeconds += delta / 1000;
        school.step(delta / 1000, now);
        scene.render(school.fish, elapsedSeconds, delta / 1000);
      } else if (layoutChanged || targetsChanged) {
        scene.render(school.fish, elapsedSeconds);
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
      scene = new Scene(canvas, 72);
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
    <main aria-label="Instagram stories influenced by nearby stories" className={styles.screen}>
      <section className={styles.gridStage}>
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
                <path className={`${styles.influencePath} ${edgePresentation === "directed" ? styles.influencePathDirected : ""}`} d={influence.path} markerEnd={edgePresentation === "directed" ? `url(#influence-arrow-${influence.id})` : undefined} pathLength="1" stroke={`url(#influence-${influence.id})`} />
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
                      className={`${styles.logoSurface} ${styles.centeredSurface}`}
                      style={techSurfaceStyle}
                    >
                      <TechMark term={techKeyword.abbreviation} />
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
          <div className={styles.actions}>
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
