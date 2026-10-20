"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { folder, LevaPanel, useControls, useCreateStore } from "leva";
import styles from "./goldfishes.module.css";
import {
  drawCollageGoldfish,
  getCollageAssetIndex,
  loadCollageGoldfishAssets,
  type CollageEyeShape,
  type CollageGoldfishAssets,
} from "./rendering/collage-goldfish";
import type { MediaCellLayer } from "./rendering/media-cell-layer";
import type { AttentionSurface } from "./rendering/media-atlas";
import {
  createCursorField,
  createGrid,
  getAnchoredCells,
  getCellAtPoint,
  scaleCursorFieldSettings,
  settleCursorField,
  stepCursorField,
  GOLDFISHES_2D_ONE_SETTINGS,
  GOLDFISHES_PRIMARY_GRID_SCALE,
  type CellAnchor,
  type CursorAgent,
  type CursorFieldSettings,
  type Grid,
} from "./model";

type CursorSwarmProps = {
  cursorCount: number;
  cursorScale: number;
  settings: CursorFieldSettings;
  initialCollisionPrevention?: boolean;
  initialGoldfish?: boolean;
  glyphSet?: "legacy" | "collage";
  gridScale?: number;
  controls?: {
    minCursorCount: number;
    maxCursorCount: number;
    cursorCountStep: number;
  };
};

type TracePoint = {
  x: number;
  y: number;
};

type FieldTheme = "light" | "dark";
type AgentGlyph =
  | "cursor"
  | "goldfish1"
  | "goldfish2"
  | "goldfish3"
  | "goldfish4"
  | "goldfish5"
  | "goldfishCircle"
  | "goldfishRectangle";
type GridMark = "dot" | "cross";

type FieldPalette = {
  paper: string;
  ink: string;
  selectedCell: string;
  grid: string;
  goldfish: string;
};

const CURSOR_TIP_ANGLE = Math.atan2(-8.4, -5.2);
const GOLDFISH_SILHOUETTE_SRC =
  "/images/goldfishes/common-goldfish-silhouette.svg";
const GOLDFISH_SILHOUETTE_WIDTH = 24;
const GOLDFISH_SILHOUETTE_HEIGHT =
  GOLDFISH_SILHOUETTE_WIDTH * (1480 / 2644);
const FIELD_PALETTES: Record<FieldTheme, FieldPalette> = {
  light: {
    paper: "#f4f4f1",
    ink: "#11110f",
    selectedCell: "#11110f",
    grid: "rgba(17, 17, 15, 0.58)",
    goldfish: "#9e782e",
  },
  dark: {
    paper: "#0d0e0d",
    ink: "#eceee8",
    selectedCell: "#eceee8",
    grid: "rgba(236, 238, 232, 0.52)",
    goldfish: "#d8b66a",
  },
};

function drawCursor(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
) {
  const angle = Math.atan2(cursor.vy, cursor.vx) - CURSOR_TIP_ANGLE;

  context.save();
  context.translate(cursor.x, cursor.y);
  context.rotate(angle);
  context.scale(cursorScale, cursorScale);
  context.beginPath();
  context.moveTo(-5.2, -8.4);
  context.lineTo(5.5, 0.3);
  context.lineTo(1.1, 1.5);
  context.lineTo(4.4, 7.2);
  context.lineTo(2.2, 8.5);
  context.lineTo(-1.2, 2.9);
  context.lineTo(-4.1, 5.7);
  context.closePath();
  context.fill();
  context.restore();
}

function drawLegacyGoldfish(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
  color: string,
  paperColor: string,
) {
  const angle = Math.atan2(cursor.vy, cursor.vx);

  context.save();
  context.translate(cursor.x, cursor.y);
  context.rotate(angle);
  context.scale(cursorScale, cursorScale);
  context.fillStyle = color;

  context.beginPath();
  context.moveTo(6.4, 0);
  context.bezierCurveTo(4.1, -3.9, -1.9, -4.45, -5.45, -1.7);
  context.quadraticCurveTo(-6.25, 0, -5.45, 1.7);
  context.bezierCurveTo(-1.9, 4.45, 4.1, 3.9, 6.4, 0);
  context.fill();

  context.beginPath();
  context.moveTo(-5.15, -1.62);
  context.lineTo(-10.3, -5.15);
  context.lineTo(-8.55, 0);
  context.lineTo(-10.3, 5.15);
  context.lineTo(-5.15, 1.62);
  context.closePath();
  context.fill();

  context.fillStyle = paperColor;
  context.beginPath();
  context.arc(4.05, -1.05, 0.58, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawSilhouetteGoldfish(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
  silhouette: CanvasImageSource,
) {
  const angle = Math.atan2(cursor.vy, cursor.vx);
  const width = GOLDFISH_SILHOUETTE_WIDTH * cursorScale;
  const height = GOLDFISH_SILHOUETTE_HEIGHT * cursorScale;

  context.save();
  context.translate(cursor.x, cursor.y);
  context.rotate(angle);
  context.scale(-1, 1);
  context.drawImage(silhouette, -width / 2, -height / 2, width, height);
  context.restore();
}

function beginGoldfish(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
  color: string,
) {
  context.save();
  context.translate(cursor.x, cursor.y);
  context.rotate(Math.atan2(cursor.vy, cursor.vx));
  context.scale(cursorScale, cursorScale);
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineCap = "round";
  context.lineJoin = "round";
}

function drawGoldfishEye(
  context: CanvasRenderingContext2D,
  paperColor: string,
  x: number,
  y: number,
  radius = 0.58,
) {
  context.fillStyle = paperColor;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawHighBackGoldfish(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
  color: string,
  paperColor: string,
) {
  beginGoldfish(context, cursor, cursorScale, color);

  context.beginPath();
  context.moveTo(6.65, 0);
  context.bezierCurveTo(5.5, -2.7, 2.1, -4.35, -1.15, -4.15);
  context.bezierCurveTo(-3.55, -4, -5.05, -2.45, -5.45, -1.35);
  context.quadraticCurveTo(-6.05, 0, -5.35, 1.65);
  context.bezierCurveTo(-3.55, 4.75, 1.5, 4.8, 4.65, 2.65);
  context.quadraticCurveTo(6.05, 1.55, 6.65, 0);
  context.fill();

  context.beginPath();
  context.moveTo(-5.15, -1.45);
  context.bezierCurveTo(-7.2, -3.65, -9.95, -5.35, -11.65, -4.65);
  context.bezierCurveTo(-11.25, -2.45, -9.6, -0.85, -7.45, 0);
  context.bezierCurveTo(-9.6, 0.85, -11.25, 2.45, -11.65, 4.65);
  context.bezierCurveTo(-9.95, 5.35, -7.2, 3.65, -5.15, 1.45);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(-1.15, -4.1);
  context.quadraticCurveTo(0.45, -6.05, 2.2, -3.7);
  context.closePath();
  context.fill();

  drawGoldfishEye(context, paperColor, 4.45, -0.95, 0.6);
  context.restore();
}

function drawVeilGoldfish(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
  color: string,
  paperColor: string,
) {
  beginGoldfish(context, cursor, cursorScale, color);

  context.beginPath();
  context.moveTo(6.5, 0);
  context.bezierCurveTo(5.05, -3.05, 1.7, -4.6, -1.75, -4.25);
  context.bezierCurveTo(-4.15, -3.95, -5.45, -2.15, -5.4, -0.8);
  context.bezierCurveTo(-5.25, 2.35, -2.55, 4.75, 0.8, 4.55);
  context.bezierCurveTo(3.8, 4.35, 5.75, 2.2, 6.5, 0);
  context.fill();

  context.beginPath();
  context.moveTo(-5.1, -1.45);
  context.bezierCurveTo(-7.45, -4.2, -10.1, -6.25, -11.8, -5.35);
  context.bezierCurveTo(-12.15, -3.2, -10.3, -1.1, -7.55, -0.1);
  context.bezierCurveTo(-10.55, 0.8, -12.8, 3.35, -12.45, 6.35);
  context.bezierCurveTo(-9.7, 6.8, -6.65, 3.75, -5, 1.4);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(-1.45, -4.2);
  context.bezierCurveTo(-0.55, -6.1, 1.55, -6.35, 2.55, -4);
  context.closePath();
  context.fill();

  drawGoldfishEye(context, paperColor, 4.3, -1.05, 0.61);
  context.restore();
}

function drawFlowingGoldfish(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
  color: string,
  paperColor: string,
) {
  beginGoldfish(context, cursor, cursorScale, color);

  context.beginPath();
  context.moveTo(6.8, 0);
  context.bezierCurveTo(5.25, -2.85, 1.6, -4.15, -1.85, -3.65);
  context.bezierCurveTo(-4.15, -3.3, -5.25, -1.85, -5.5, -0.75);
  context.bezierCurveTo(-5.15, 2.65, -1.9, 4.35, 1.3, 3.95);
  context.bezierCurveTo(4.05, 3.6, 5.9, 1.85, 6.8, 0);
  context.fill();

  context.beginPath();
  context.moveTo(-5.15, -1.2);
  context.bezierCurveTo(-8.15, -2.6, -11.75, -4.65, -14.15, -4.3);
  context.bezierCurveTo(-13.35, -2.15, -11.15, -0.65, -8.25, 0);
  context.bezierCurveTo(-11.15, 0.65, -13.35, 2.15, -14.15, 4.3);
  context.bezierCurveTo(-11.75, 4.65, -8.15, 2.6, -5.05, 1.25);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(-0.85, -3.8);
  context.quadraticCurveTo(0.6, -5.35, 2.2, -3.55);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(-0.1, 3.95);
  context.quadraticCurveTo(1.3, 5.35, 2.45, 3.55);
  context.closePath();
  context.fill();

  drawGoldfishEye(context, paperColor, 4.55, -0.85, 0.58);
  context.restore();
}

function drawField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: Grid,
  anchors: readonly CellAnchor[],
  palette: FieldPalette,
  gridMark: GridMark,
) {
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, width, height);

  const selectedCells = getAnchoredCells(anchors, grid, width, height);
  if (selectedCells.length > 0) {
    context.fillStyle = palette.selectedCell;
    for (const selectedCell of selectedCells) {
      context.fillRect(
        selectedCell.x,
        selectedCell.y,
        selectedCell.width,
        selectedCell.height,
      );
    }
  }

  if (gridMark === "dot") {
    context.fillStyle = palette.grid;

    for (let column = 0; column <= grid.columns; column += 1) {
      const x = Math.round(grid.originX + column * grid.cellSize);

      for (let row = 0; row <= grid.rows; row += 1) {
        const y = Math.round(grid.originY + row * grid.cellSize);
        context.fillRect(x, y, 1, 1);
      }
    }

    return;
  }

  context.strokeStyle = palette.grid;
  context.lineWidth = 1;
  context.beginPath();

  for (let column = 0; column <= grid.columns; column += 1) {
    const x = Math.round(grid.originX + column * grid.cellSize) + 0.5;

    for (let row = 0; row <= grid.rows; row += 1) {
      const y = Math.round(grid.originY + row * grid.cellSize) + 0.5;
      context.moveTo(x - 2.25, y);
      context.lineTo(x + 2.25, y);
      context.moveTo(x, y - 2.25);
      context.lineTo(x, y + 2.25);
    }
  }

  context.stroke();
}

function getTracePoints(
  previousPoint: TracePoint,
  nextPoint: TracePoint,
  cellSize: number,
) {
  const distance = Math.hypot(
    nextPoint.x - previousPoint.x,
    nextPoint.y - previousPoint.y,
  );
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, cellSize / 3)));

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    return {
      x: previousPoint.x + (nextPoint.x - previousPoint.x) * progress,
      y: previousPoint.y + (nextPoint.y - previousPoint.y) * progress,
    };
  });
}

function getCellKey(column: number, row: number) {
  return `${column}:${row}`;
}

export function CursorSwarm({
  cursorCount,
  cursorScale,
  settings,
  initialCollisionPrevention = true,
  initialGoldfish = false,
  glyphSet = "legacy",
  gridScale = 1,
  controls,
}: CursorSwarmProps) {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaLayerRef = useRef<MediaCellLayer | null>(null);
  const controlStore = useCreateStore();
  const frameRef = useRef<number | null>(null);
  const cursorsRef = useRef<CursorAgent[]>([]);
  const gridRef = useRef<Grid | null>(null);
  const selectionRef = useRef<CellAnchor[]>([]);
  const tracePointRef = useRef<TracePoint | null>(null);
  const collisionPreventionRef = useRef(initialCollisionPrevention);
  const themeRef = useRef<FieldTheme>("dark");
  const agentGlyphRef = useRef<AgentGlyph>(
    initialGoldfish ? "goldfish1" : "cursor",
  );
  const goldfishColorRef = useRef(FIELD_PALETTES.dark.goldfish);
  const goldfishSilhouetteRef = useRef<HTMLCanvasElement | null>(null);
  const collageGoldfishAssetsRef = useRef<
    Partial<Record<CollageEyeShape, CollageGoldfishAssets>>
  >({});
  const gridMarkRef = useRef<GridMark>("dot");
  const attentionSurfaceRef = useRef<AttentionSurface>("white");
  const mediaSpeedRef = useRef(24);
  const agentScaleRef = useRef(1);
  const constraintSettingsRef = useRef(scaleCursorFieldSettings(settings, 1));
  const [activeCursorCount, setActiveCursorCount] = useState(cursorCount);
  const [theme, setTheme] = useState<FieldTheme>("dark");
  const [goldfishColor, setGoldfishColor] = useState(
    FIELD_PALETTES.dark.goldfish,
  );
  const [gridMark, setGridMark] = useState<GridMark>("dot");

  const updateCollisionPrevention = (enabled: boolean) => {
    collisionPreventionRef.current = enabled;
  };

  const updateTheme = (darkMode: boolean) => {
    const nextTheme: FieldTheme = darkMode ? "dark" : "light";
    themeRef.current = nextTheme;
    setTheme(nextTheme);
  };

  const updateAgentGlyph = (nextGlyph: AgentGlyph) => {
    agentGlyphRef.current = nextGlyph;
  };

  const updateGoldfishColor = (color: string) => {
    goldfishColorRef.current = color;
    setGoldfishColor(color);
  };

  const updateAgentScale = (nextScale: number) => {
    agentScaleRef.current = nextScale;
    constraintSettingsRef.current = scaleCursorFieldSettings(settings, nextScale);
  };

  const updateGridMark = (crossMark: boolean) => {
    const nextMark: GridMark = crossMark ? "cross" : "dot";
    gridMarkRef.current = nextMark;
    setGridMark(nextMark);
  };

  useControls(
    () => ({
      Agents: folder({
        ...(controls
          ? {
              count: {
                value: cursorCount,
                min: controls.minCursorCount,
                max: controls.maxCursorCount,
                step: controls.cursorCountStep,
                onChange: (value: number) => setActiveCursorCount(value),
              },
              "avoid overlap": {
                value: initialCollisionPrevention,
                onChange: updateCollisionPrevention,
              },
            }
          : {}),
        scale: {
          value: 1,
          min: 0.5,
          max: 2,
          step: 0.05,
          onChange: updateAgentScale,
        },
      }),
      Field: folder({
        ...(glyphSet === "collage"
          ? {
              blocks: {
                value: "white" as AttentionSurface,
                options: {
                  WHITE: "white",
                  CAT: "cat",
                  KISS: "kiss",
                  POLITICIAN: "politician",
                },
                onChange: (surface: AttentionSurface) => {
                  attentionSurfaceRef.current = surface;
                  mediaLayerRef.current?.setSurface(surface);
                },
              },
              "image speed": {
                value: 24,
                min: 0,
                max: 40,
                step: 1,
                onChange: (speed: number) => {
                  mediaSpeedRef.current = speed;
                  mediaLayerRef.current?.setSpeed(speed);
                },
              },
            }
          : {}),
        "corner +": {
          value: false,
          onChange: updateGridMark,
        },
      }),
      Appearance: folder({
        glyph: {
          value: initialGoldfish ? "goldfish1" : "cursor",
          options:
            glyphSet === "collage"
              ? {
                  Cursor: "cursor",
                  "Goldfish 1": "goldfish1",
                  "Goldfish 2": "goldfish2",
                  "Circle eye": "goldfishCircle",
                  "Rectangle eye": "goldfishRectangle",
                }
              : {
                  Cursor: "cursor",
                  "Goldfish 1": "goldfish1",
                  "Goldfish 2": "goldfish2",
                  "Goldfish 3": "goldfish3",
                  "Goldfish 4": "goldfish4",
                  "Goldfish 5": "goldfish5",
                },
          onChange: (value: AgentGlyph) => updateAgentGlyph(value),
        },
        "fish colour": {
          value: FIELD_PALETTES.dark.goldfish,
          render: (get) => {
            const glyph = get("Appearance.glyph");
            return (
              glyph !== "cursor" &&
              glyph !== "goldfishCircle" &&
              glyph !== "goldfishRectangle"
            );
          },
          onChange: updateGoldfishColor,
        },
        "dark mode": {
          value: true,
          onChange: updateTheme,
        },
      }),
    }),
    { store: controlStore },
    [
      controlStore,
      controls,
      cursorCount,
      glyphSet,
      initialCollisionPrevention,
      initialGoldfish,
      settings,
    ],
  );

  const selectTrace = useCallback(
    (points: readonly TracePoint[]) => {
      const canvas = cursorCanvasRef.current;
      const grid = gridRef.current;
      if (!canvas || !grid || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        return;
      }

      const currentSelections = selectionRef.current;
      const existingCellKeys = new Set(
        getAnchoredCells(
          currentSelections,
          grid,
          canvas.clientWidth,
          canvas.clientHeight,
        ).map((cell) => getCellKey(cell.column, cell.row)),
      );
      const nextSelections = [...currentSelections];

      for (const point of points) {
        const cell = getCellAtPoint(point.x, point.y, grid);
        const cellKey = getCellKey(cell.column, cell.row);
        if (existingCellKeys.has(cellKey)) continue;

        existingCellKeys.add(cellKey);
        nextSelections.push({
          xRatio: cell.centerX / canvas.clientWidth,
          yRatio: cell.centerY / canvas.clientHeight,
        });
      }

      if (nextSelections.length === currentSelections.length) return;

      selectionRef.current = nextSelections;
      const selectedCells = getAnchoredCells(
        nextSelections,
        grid,
        canvas.clientWidth,
        canvas.clientHeight,
      );
      cursorsRef.current = settleCursorField(
        cursorsRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
        selectedCells,
        constraintSettingsRef.current,
        collisionPreventionRef.current,
      );
      mediaLayerRef.current?.setCells(selectedCells);

      const backgroundCanvas = backgroundCanvasRef.current;
      const backgroundContext = backgroundCanvas?.getContext("2d");
      if (backgroundContext) {
        drawField(
          backgroundContext,
          canvas.clientWidth,
          canvas.clientHeight,
          grid,
          nextSelections,
          FIELD_PALETTES[themeRef.current],
          gridMarkRef.current,
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (glyphSet !== "collage") return;

    collageGoldfishAssetsRef.current = {
      circle: loadCollageGoldfishAssets("circle"),
      rectangle: loadCollageGoldfishAssets("rectangle"),
    };
  }, [glyphSet]);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;

      const silhouette = document.createElement("canvas");
      silhouette.width = 528;
      silhouette.height = 296;
      const context = silhouette.getContext("2d");
      if (!context) return;

      context.drawImage(image, 0, 0, silhouette.width, silhouette.height);
      context.globalCompositeOperation = "source-in";
      context.fillStyle = goldfishColor;
      context.fillRect(0, 0, silhouette.width, silhouette.height);
      goldfishSilhouetteRef.current = silhouette;
    };

    image.src = GOLDFISH_SILHOUETTE_SRC;
    return () => {
      cancelled = true;
    };
  }, [goldfishColor]);

  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;
    const mediaCanvas = mediaCanvasRef.current;
    if (!canvas || !backgroundCanvas) return;

    const context = canvas.getContext("2d");
    const backgroundContext = backgroundCanvas.getContext("2d");
    if (!context || !backgroundContext) return;
    let mediaLayer: MediaCellLayer | null = null;
    let mediaLayerCancelled = false;

    if (mediaCanvas) {
      void import("./rendering/media-cell-layer").then(
        ({ MediaCellLayer: MediaCellLayerConstructor }) => {
          if (mediaLayerCancelled) return;
          mediaLayer = new MediaCellLayerConstructor(mediaCanvas);
          mediaLayerRef.current = mediaLayer;
          const bounds = canvas.getBoundingClientRect();
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          mediaLayer.setSize(bounds.width, bounds.height, pixelRatio);
          mediaLayer.setAppearance(
            gridMarkRef.current,
            FIELD_PALETTES[themeRef.current].grid,
          );
          mediaLayer.setSpeed(mediaSpeedRef.current);
          mediaLayer.setSurface(attentionSurfaceRef.current);
          const grid = gridRef.current;
          if (grid) {
            mediaLayer.setCells(
              getAnchoredCells(
                selectionRef.current,
                grid,
                bounds.width,
                bounds.height,
              ),
            );
          }
        },
      );
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let elapsedSeconds = 0;

    const sizeCanvases = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const grid = createGrid(
        bounds.width,
        bounds.height,
        settings,
        gridScale,
      );

      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      backgroundCanvas.width = Math.round(bounds.width * pixelRatio);
      backgroundCanvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      backgroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      mediaLayer?.setSize(bounds.width, bounds.height, pixelRatio);

      gridRef.current = grid;
      cursorsRef.current = createCursorField(
        activeCursorCount,
        bounds.width,
        bounds.height,
        constraintSettingsRef.current,
      );
      const selectedCells = getAnchoredCells(
        selectionRef.current,
        grid,
        bounds.width,
        bounds.height,
      );

      cursorsRef.current = settleCursorField(
        cursorsRef.current,
        bounds.width,
        bounds.height,
        selectedCells,
        constraintSettingsRef.current,
        collisionPreventionRef.current,
      );
      mediaLayer?.setCells(selectedCells);

      drawField(
        backgroundContext,
        bounds.width,
        bounds.height,
        grid,
        selectionRef.current,
        FIELD_PALETTES[themeRef.current],
        gridMarkRef.current,
      );
    };

    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.032);
      previousTime = time;
      const grid = gridRef.current;

      if (!reduceMotion.matches && grid) {
        elapsedSeconds += deltaSeconds;
        const selectedCells = getAnchoredCells(
          selectionRef.current,
          grid,
          width,
          height,
        );
        cursorsRef.current = stepCursorField(
          cursorsRef.current,
          width,
          height,
          deltaSeconds,
          elapsedSeconds,
          selectedCells,
          constraintSettingsRef.current,
          collisionPreventionRef.current,
          agentScaleRef.current,
        );
      }

      mediaLayer?.render(time, !reduceMotion.matches);
      context.clearRect(0, 0, width, height);
      const palette = FIELD_PALETTES[themeRef.current];
      const effectiveCursorScale = cursorScale * agentScaleRef.current;
      context.fillStyle = palette.ink;
      for (const cursor of cursorsRef.current) {
        switch (agentGlyphRef.current) {
          case "goldfish1":
            drawLegacyGoldfish(
              context,
              cursor,
              effectiveCursorScale,
              goldfishColorRef.current,
              palette.paper,
            );
            break;
          case "goldfish2":
            if (goldfishSilhouetteRef.current) {
              drawSilhouetteGoldfish(
                context,
                cursor,
                effectiveCursorScale,
                goldfishSilhouetteRef.current,
              );
            } else {
              drawLegacyGoldfish(
                context,
                cursor,
                effectiveCursorScale,
                goldfishColorRef.current,
                palette.paper,
              );
            }
            break;
          case "goldfish3":
            drawHighBackGoldfish(
              context,
              cursor,
              effectiveCursorScale,
              goldfishColorRef.current,
              palette.paper,
            );
            break;
          case "goldfish4":
            drawVeilGoldfish(
              context,
              cursor,
              effectiveCursorScale,
              goldfishColorRef.current,
              palette.paper,
            );
            break;
          case "goldfish5":
            drawFlowingGoldfish(
              context,
              cursor,
              effectiveCursorScale,
              goldfishColorRef.current,
              palette.paper,
            );
            break;
          case "goldfishCircle":
          case "goldfishRectangle": {
            const shape: CollageEyeShape =
              agentGlyphRef.current === "goldfishCircle"
                ? "circle"
                : "rectangle";
            const asset =
              collageGoldfishAssetsRef.current[shape]?.[
                getCollageAssetIndex(cursor.id)
              ];

            if (asset) {
              drawCollageGoldfish(
                context,
                cursor,
                effectiveCursorScale,
                asset,
              );
            } else {
              drawLegacyGoldfish(
                context,
                cursor,
                effectiveCursorScale,
                goldfishColorRef.current,
                palette.paper,
              );
            }
            break;
          }
          default:
            drawCursor(context, cursor, effectiveCursorScale);
        }
      }

      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvases();
    const resizeObserver = new ResizeObserver(sizeCanvases);
    resizeObserver.observe(canvas);
    frameRef.current = requestAnimationFrame(render);

    return () => {
      mediaLayerCancelled = true;
      resizeObserver.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      mediaLayer?.dispose();
      if (mediaLayerRef.current === mediaLayer) {
        mediaLayerRef.current = null;
      }
    };
  }, [
    activeCursorCount,
    cursorScale,
    gridScale,
    settings,
  ]);

  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;
    const grid = gridRef.current;
    const backgroundContext = backgroundCanvas?.getContext("2d");
    if (!canvas || !grid || !backgroundContext) return;

    drawField(
      backgroundContext,
      canvas.clientWidth,
      canvas.clientHeight,
      grid,
      selectionRef.current,
      FIELD_PALETTES[theme],
      gridMark,
    );
    mediaLayerRef.current?.setAppearance(
      gridMark,
      FIELD_PALETTES[theme].grid,
    );
  }, [theme, gridMark]);

  const finishTrace = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    tracePointRef.current = null;
  };

  return (
    <main className={styles.page} data-theme={theme}>
      <canvas
        ref={backgroundCanvasRef}
        className={styles.backgroundCanvas}
        aria-hidden="true"
      />
      {glyphSet === "collage" ? (
        <canvas
          ref={mediaCanvasRef}
          className={styles.mediaCanvas}
          aria-hidden="true"
        />
      ) : null}
      <canvas
        ref={cursorCanvasRef}
        className={styles.cursorCanvas}
        aria-label="A field of moving cursors and goldfish. Click or drag across cells to make a continuous trace and gather agent groups around every selected cell."
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          const point = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          tracePointRef.current = point;
          selectTrace([point]);
        }}
        onPointerMove={(event) => {
          const previousPoint = tracePointRef.current;
          if (!previousPoint || !event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }

          const bounds = event.currentTarget.getBoundingClientRect();
          const nextPoint = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          selectTrace(
            getTracePoints(
              previousPoint,
              nextPoint,
              gridRef.current?.cellSize ?? settings.cellMin,
            ),
          );
          tracePointRef.current = nextPoint;
        }}
        onPointerUp={finishTrace}
        onPointerCancel={finishTrace}
        onLostPointerCapture={() => {
          tracePointRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            selectionRef.current = [];
            mediaLayerRef.current?.setCells([]);
            const backgroundCanvas = backgroundCanvasRef.current;
            const grid = gridRef.current;
            const backgroundContext = backgroundCanvas?.getContext("2d");
            if (backgroundCanvas && grid && backgroundContext) {
              drawField(
                backgroundContext,
                event.currentTarget.clientWidth,
                event.currentTarget.clientHeight,
                grid,
                [],
                FIELD_PALETTES[themeRef.current],
                gridMarkRef.current,
              );
            }
            return;
          }

          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selectTrace([
            {
              x: event.currentTarget.clientWidth / 2,
              y: event.currentTarget.clientHeight / 2,
            },
          ]);
        }}
      />
      <aside className={styles.parameterPanel} aria-label="Field parameters">
        <LevaPanel
          collapsed
          flat
          hideCopyButton
          store={controlStore}
          theme={{
            colors: {
              elevation1: FIELD_PALETTES[theme].paper,
              elevation2: FIELD_PALETTES[theme].paper,
              elevation3: theme === "dark" ? "#272925" : "#dfdfda",
              accent1: FIELD_PALETTES[theme].ink,
              accent2: FIELD_PALETTES[theme].ink,
              accent3: FIELD_PALETTES[theme].ink,
              highlight1: FIELD_PALETTES[theme].ink,
              highlight2: FIELD_PALETTES[theme].ink,
              highlight3: FIELD_PALETTES[theme].ink,
              folderWidgetColor: FIELD_PALETTES[theme].ink,
              folderTextColor: FIELD_PALETTES[theme].ink,
            },
            radii: {
              xs: "0px",
              sm: "0px",
              lg: "0px",
            },
            fonts: {
              mono: "Arial, Helvetica, sans-serif",
              sans: "Arial, Helvetica, sans-serif",
            },
            fontSizes: {
              root: "12px",
            },
            sizes: {
              rootWidth: "min(280px, calc(100vw - 24px))",
              controlWidth: "142px",
              rowHeight: "28px",
              folderTitleHeight: "26px",
              checkboxSize: "18px",
              titleBarHeight: "42px",
            },
            shadows: {
              level1: "none",
              level2: "none",
            },
            borderWidths: {
              root: "1px",
              input: "1px",
              focus: "2px",
              hover: "1px",
              active: "2px",
              folder: "1px",
            },
            fontWeights: {
              label: "500",
              folder: "600",
              button: "500",
            },
          }}
          titleBar={{
            title: "Parameters",
            drag: false,
            filter: false,
          }}
        />
      </aside>
    </main>
  );
}

export default function Goldfishes2DOne() {
  return (
    <CursorSwarm
      cursorCount={200}
      cursorScale={1}
      settings={GOLDFISHES_2D_ONE_SETTINGS}
      initialCollisionPrevention={false}
      initialGoldfish
      glyphSet="collage"
      gridScale={GOLDFISHES_PRIMARY_GRID_SCALE}
      controls={{
        minCursorCount: 50,
        maxCursorCount: 1000,
        cursorCountStep: 50,
      }}
    />
  );
}
