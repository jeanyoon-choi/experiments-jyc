"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { button, folder, LevaPanel, useControls, useCreateStore } from "leva";
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
  type AttentionZoneBehavior,
  type CellAnchor,
  type CursorAgent,
  type Grid,
} from "../model";
import {
  GoldfishScene,
  type AttentionSurface,
  type CameraProjection,
  type FishModelStyle,
  type GoldfishRenderSettings,
} from "../rendering/goldfish-scene";
import styles from "./goldfishes.module.css";

type FieldTheme = "light" | "dark";
type GridMark = "dot" | "cross";
type TracePoint = { x: number; y: number };
type CameraGesture = {
  pointerId: number;
  x: number;
  y: number;
};

type FieldPalette = {
  paper: string;
  ink: string;
  selectedCell: string;
  grid: string;
  goldfish: string;
};

const FIELD_PALETTES: Record<FieldTheme, FieldPalette> = {
  light: {
    paper: "#f4f4f1",
    ink: "#11110f",
    selectedCell: "#11110f",
    grid: "rgba(17, 17, 15, 0.58)",
    goldfish: "#a97824",
  },
  dark: {
    paper: "#0d0e0d",
    ink: "#eceee8",
    selectedCell: "#eceee8",
    grid: "rgba(236, 238, 232, 0.52)",
    goldfish: "#d8a849",
  },
};

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
  context.fillStyle = palette.selectedCell;
  for (const selectedCell of selectedCells) {
    context.fillRect(
      selectedCell.x,
      selectedCell.y,
      selectedCell.width,
      selectedCell.height,
    );
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

type Goldfishes3DProps = {
  attentionZoneBehavior?: AttentionZoneBehavior;
  cameraProjection?: CameraProjection;
  initialAgentScale?: number;
  minimumAgentScale?: number;
  maximumAgentScale?: number;
  initialCount?: number;
  minimumCount?: number;
  maximumCount?: number;
  fishModelStyle?: FishModelStyle;
  initialFishColor?: string;
  allowFishModelToggle?: boolean;
};

export default function Goldfishes3D({
  attentionZoneBehavior = "open-perimeter",
  cameraProjection = "perspective",
  initialAgentScale = 1,
  minimumAgentScale = 0.5,
  maximumAgentScale = 2,
  initialCount = 200,
  minimumCount = 50,
  maximumCount = 1000,
  fishModelStyle = "minimal",
  initialFishColor = FIELD_PALETTES.dark.goldfish,
  allowFishModelToggle = false,
}: Goldfishes3DProps) {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GoldfishScene | null>(null);
  const frameRef = useRef<number | null>(null);
  const agentsRef = useRef<CursorAgent[]>([]);
  const gridRef = useRef<Grid | null>(null);
  const selectionRef = useRef<CellAnchor[]>([]);
  const tracePointRef = useRef<TracePoint | null>(null);
  const cameraGestureRef = useRef<CameraGesture | null>(null);
  const cameraInputRef = useRef(true);
  const collisionPreventionRef = useRef(false);
  const themeRef = useRef<FieldTheme>("dark");
  const gridMarkRef = useRef<GridMark>("dot");
  const attentionSurfaceRef = useRef<AttentionSurface>("white");
  const mediaSpeedRef = useRef(24);
  const renderSettingsRef = useRef<GoldfishRenderSettings>({
    agentScale: initialAgentScale,
    depth: 64,
    tailMotion: 0.38,
  });
  const constraintSettingsRef = useRef(
    scaleCursorFieldSettings(
      GOLDFISHES_2D_ONE_SETTINGS,
      initialAgentScale,
    ),
  );
  const controlStore = useCreateStore();
  const [activeCount, setActiveCount] = useState(initialCount);
  const activeCountRef = useRef(initialCount);
  const [theme, setTheme] = useState<FieldTheme>("dark");
  const [gridMark, setGridMark] = useState<GridMark>("dot");

  const redrawField = useCallback(() => {
    const backgroundCanvas = backgroundCanvasRef.current;
    const interactionCanvas = interactionCanvasRef.current;
    const grid = gridRef.current;
    const context = backgroundCanvas?.getContext("2d");
    if (!backgroundCanvas || !interactionCanvas || !grid || !context) return;
    const palette = FIELD_PALETTES[themeRef.current];
    const fieldPalette =
      attentionSurfaceRef.current === "white"
        ? palette
        : {
            ...palette,
            selectedCell: palette.paper,
          };
    drawField(
      context,
      interactionCanvas.clientWidth,
      interactionCanvas.clientHeight,
      grid,
      selectionRef.current,
      fieldPalette,
      gridMarkRef.current,
    );
    sceneRef.current?.setAttentionCells(
      getAnchoredCells(
        selectionRef.current,
        grid,
        interactionCanvas.clientWidth,
        interactionCanvas.clientHeight,
      ),
    );
    sceneRef.current?.updateField();
  }, []);

  useControls(
    () => ({
      Agents: folder({
        count: {
          value: initialCount,
          min: minimumCount,
          max: maximumCount,
          step: 50,
          onChange: (value: number) => {
            activeCountRef.current = value;
            setActiveCount(value);
          },
        },
        "avoid overlap": {
          value: false,
          onChange: (enabled: boolean) => {
            collisionPreventionRef.current = enabled;
          },
        },
        scale: {
          value: initialAgentScale,
          min: minimumAgentScale,
          max: maximumAgentScale,
          step: 0.05,
          onChange: (value: number) => {
            renderSettingsRef.current.agentScale = value;
            constraintSettingsRef.current = scaleCursorFieldSettings(
              GOLDFISHES_2D_ONE_SETTINGS,
              value,
            );
          },
        },
      }),
      Motion: folder({
        depth: {
          value: 64,
          min: 0,
          max: 140,
          step: 2,
          onChange: (value: number) => {
            renderSettingsRef.current.depth = value;
          },
        },
        "tail motion": {
          value: 0.38,
          min: 0,
          max: 0.7,
          step: 0.01,
          onChange: (value: number) => {
            renderSettingsRef.current.tailMotion = value;
          },
        },
      }),
      Camera: folder({
        input: {
          value: true,
          onChange: (enabled: boolean) => {
            cameraInputRef.current = enabled;
          },
        },
        "reset view": button(() => {
          sceneRef.current?.resetCamera();
        }),
      }),
      Field: folder({
        blocks: {
          value: "white" as AttentionSurface,
          options: {
            COMPANY: "company",
            WHITE: "white",
            CAT: "cat",
            KISS: "kiss",
            POLITICIAN: "politician",
          },
          onChange: (surface: AttentionSurface) => {
            attentionSurfaceRef.current = surface;
            sceneRef.current?.setAttentionSurface(surface);
            redrawField();
          },
        },
        "image speed": {
          value: 24,
          min: 0,
          max: 40,
          step: 1,
          onChange: (speed: number) => {
            mediaSpeedRef.current = speed;
            sceneRef.current?.setMediaSpeed(speed);
          },
        },
        "corner +": {
          value: false,
          onChange: (enabled: boolean) => {
            const nextMark: GridMark = enabled ? "cross" : "dot";
            gridMarkRef.current = nextMark;
            setGridMark(nextMark);
          },
        },
      }),
      Appearance: folder({
        "fish colour": {
          value: initialFishColor,
          onChange: (color: string) => sceneRef.current?.setColor(color),
        },
        "fin opacity": {
          value: 0.76,
          min: 0.2,
          max: 1,
          step: 0.02,
          onChange: (value: number) => {
            sceneRef.current?.setFinOpacity(value);
          },
        },
        ...(allowFishModelToggle
          ? {
              "natural model": {
                value: fishModelStyle === "naturalistic",
                onChange: (enabled: boolean) => {
                  sceneRef.current?.setFishModelStyle(
                    enabled ? "naturalistic" : "minimal",
                  );
                },
              },
            }
          : {}),
        "dark mode": {
          value: true,
          onChange: (darkMode: boolean) => {
            const nextTheme: FieldTheme = darkMode ? "dark" : "light";
            themeRef.current = nextTheme;
            setTheme(nextTheme);
            sceneRef.current?.setPaperColor(FIELD_PALETTES[nextTheme].paper);
          },
        },
      }),
    }),
    { store: controlStore },
    [
      controlStore,
      allowFishModelToggle,
      fishModelStyle,
      initialAgentScale,
      initialCount,
      initialFishColor,
      maximumAgentScale,
      maximumCount,
      minimumAgentScale,
      minimumCount,
    ],
  );

  const selectTrace = useCallback(
    (points: readonly TracePoint[]) => {
      const canvas = interactionCanvasRef.current;
      const grid = gridRef.current;
      if (
        !canvas ||
        !grid ||
        canvas.clientWidth === 0 ||
        canvas.clientHeight === 0
      ) {
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
      agentsRef.current = settleCursorField(
        agentsRef.current,
        canvas.clientWidth,
        canvas.clientHeight,
        selectedCells,
        constraintSettingsRef.current,
        collisionPreventionRef.current,
        attentionZoneBehavior,
      );
      redrawField();
    },
    [attentionZoneBehavior, redrawField],
  );

  useEffect(() => {
    sceneRef.current?.setCount(activeCount);
    const canvas = interactionCanvasRef.current;
    const grid = gridRef.current;
    if (!canvas || !grid) return;
    agentsRef.current = createCursorField(
      activeCount,
      canvas.clientWidth,
      canvas.clientHeight,
      constraintSettingsRef.current,
    );
    agentsRef.current = settleCursorField(
      agentsRef.current,
      canvas.clientWidth,
      canvas.clientHeight,
      getAnchoredCells(
        selectionRef.current,
        grid,
        canvas.clientWidth,
        canvas.clientHeight,
      ),
      constraintSettingsRef.current,
      collisionPreventionRef.current,
      attentionZoneBehavior,
    );
  }, [activeCount, attentionZoneBehavior]);

  useEffect(() => {
    const backgroundCanvas = backgroundCanvasRef.current;
    const threeCanvas = threeCanvasRef.current;
    const interactionCanvas = interactionCanvasRef.current;
    if (!backgroundCanvas || !threeCanvas || !interactionCanvas) return;

    const backgroundContext = backgroundCanvas.getContext("2d");
    if (!backgroundContext) return;

    const scene = new GoldfishScene({
      canvas: threeCanvas,
      fieldCanvas: backgroundCanvas,
      count: initialCount,
      color: initialFishColor,
      paperColor: FIELD_PALETTES.dark.paper,
      cameraProjection,
      fishModelStyle,
    });
    sceneRef.current = scene;
    scene.setMediaSpeed(mediaSpeedRef.current);
    scene.setAttentionSurface(attentionSurfaceRef.current);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let elapsedSeconds = 0;
    const collectPerformanceMetrics =
      process.env.NODE_ENV === "development";
    let metricStartedAt = previousTime;
    let metricFrames = 0;
    let metricCpuMilliseconds = 0;
    let metricMaxFrameMilliseconds = 0;

    const sizeCanvases = () => {
      const bounds = interactionCanvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const grid = createGrid(
        bounds.width,
        bounds.height,
        GOLDFISHES_2D_ONE_SETTINGS,
        GOLDFISHES_PRIMARY_GRID_SCALE,
      );

      backgroundCanvas.width = Math.round(bounds.width * pixelRatio);
      backgroundCanvas.height = Math.round(bounds.height * pixelRatio);
      interactionCanvas.width = Math.round(bounds.width * pixelRatio);
      interactionCanvas.height = Math.round(bounds.height * pixelRatio);
      backgroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      scene.setSize(bounds.width, bounds.height);

      gridRef.current = grid;
      agentsRef.current = createCursorField(
        activeCountRef.current,
        bounds.width,
        bounds.height,
        constraintSettingsRef.current,
      );
      agentsRef.current = settleCursorField(
        agentsRef.current,
        bounds.width,
        bounds.height,
        getAnchoredCells(
          selectionRef.current,
          grid,
          bounds.width,
          bounds.height,
        ),
        constraintSettingsRef.current,
        collisionPreventionRef.current,
        attentionZoneBehavior,
      );
      redrawField();
    };

    const render = (time: number) => {
      const cpuStartedAt = collectPerformanceMetrics
        ? performance.now()
        : 0;
      const width = interactionCanvas.clientWidth;
      const height = interactionCanvas.clientHeight;
      const frameMilliseconds = time - previousTime;
      const deltaSeconds = Math.min(frameMilliseconds / 1000, 0.032);
      previousTime = time;
      const grid = gridRef.current;

      if (!reduceMotion.matches && grid) {
        elapsedSeconds += deltaSeconds;
        agentsRef.current = stepCursorField(
          agentsRef.current,
          width,
          height,
          deltaSeconds,
          elapsedSeconds,
          getAnchoredCells(
            selectionRef.current,
            grid,
            width,
            height,
          ),
          constraintSettingsRef.current,
          collisionPreventionRef.current,
          renderSettingsRef.current.agentScale,
          attentionZoneBehavior,
        );
      }

      scene.render(agentsRef.current, elapsedSeconds, renderSettingsRef.current);

      if (collectPerformanceMetrics) {
        metricFrames += 1;
        metricCpuMilliseconds += performance.now() - cpuStartedAt;
        metricMaxFrameMilliseconds = Math.max(
          metricMaxFrameMilliseconds,
          frameMilliseconds,
        );

        const metricDuration = time - metricStartedAt;
        if (metricDuration >= 2000) {
          const rendererInfo = scene.getPerformanceInfo();
          interactionCanvas.dataset.performanceFps = (
            (metricFrames * 1000) /
            metricDuration
          ).toFixed(1);
          interactionCanvas.dataset.performanceMeanCpuMs = (
            metricCpuMilliseconds / metricFrames
          ).toFixed(3);
          interactionCanvas.dataset.performanceMaxFrameMs =
            metricMaxFrameMilliseconds.toFixed(1);
          interactionCanvas.dataset.performanceDrawCalls =
            String(rendererInfo.drawCalls);
          interactionCanvas.dataset.performanceTextures =
            String(rendererInfo.textures);
          interactionCanvas.dataset.performanceTriangles =
            String(rendererInfo.triangles);
          interactionCanvas.dataset.performanceAttentionSurface =
            attentionSurfaceRef.current;
          interactionCanvas.dataset.performanceSelectedCells = String(
            selectionRef.current.length,
          );

          metricStartedAt = time;
          metricFrames = 0;
          metricCpuMilliseconds = 0;
          metricMaxFrameMilliseconds = 0;
        }
      }

      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvases();
    const resizeObserver = new ResizeObserver(sizeCanvases);
    resizeObserver.observe(interactionCanvas);
    frameRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [
    attentionZoneBehavior,
    cameraProjection,
    fishModelStyle,
    initialCount,
    initialFishColor,
    redrawField,
  ]);

  useEffect(() => {
    redrawField();
  }, [theme, gridMark, redrawField]);

  const finishTrace = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    tracePointRef.current = null;
    cameraGestureRef.current = null;
  };

  return (
    <main className={styles.page} data-theme={theme}>
      <canvas
        ref={backgroundCanvasRef}
        className={styles.backgroundCanvas}
        aria-hidden="true"
      />
      <canvas
        ref={threeCanvasRef}
        className={styles.threeCanvas}
        aria-hidden="true"
      />
      <canvas
        ref={interactionCanvasRef}
        className={styles.interactionCanvas}
        aria-label="A perspective field of moving goldfish. Click or drag across cells to gather fish, Alt-drag or right-drag to rotate the camera through a full orbit, and use the wheel to zoom."
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            cameraInputRef.current &&
            (event.altKey || event.button === 2)
          ) {
            event.preventDefault();
            tracePointRef.current = null;
            cameraGestureRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            return;
          }
          const point = sceneRef.current?.screenToField(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
          );
          if (!point) return;
          tracePointRef.current = point;
          selectTrace([point]);
        }}
        onPointerMove={(event) => {
          const cameraGesture = cameraGestureRef.current;
          if (
            cameraGesture &&
            cameraGesture.pointerId === event.pointerId &&
            event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            sceneRef.current?.orbit(
              event.clientX - cameraGesture.x,
              event.clientY - cameraGesture.y,
            );
            cameraGestureRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            return;
          }
          const previousPoint = tracePointRef.current;
          if (
            !previousPoint ||
            !event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          const nextPoint = sceneRef.current?.screenToField(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
          );
          if (!nextPoint) return;
          selectTrace(
            getTracePoints(
              previousPoint,
              nextPoint,
              gridRef.current?.cellSize ??
                GOLDFISHES_2D_ONE_SETTINGS.cellMin,
            ),
          );
          tracePointRef.current = nextPoint;
        }}
        onPointerUp={finishTrace}
        onPointerCancel={finishTrace}
        onLostPointerCapture={() => {
          tracePointRef.current = null;
          cameraGestureRef.current = null;
        }}
        onContextMenu={(event) => {
          if (cameraInputRef.current) event.preventDefault();
        }}
        onWheel={(event) => {
          if (!cameraInputRef.current) return;
          event.preventDefault();
          sceneRef.current?.zoom(event.deltaY);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            selectionRef.current = [];
            redrawField();
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selectTrace([
            sceneRef.current?.screenToField(
              event.currentTarget.clientWidth / 2,
              event.currentTarget.clientHeight / 2,
            ) ?? {
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
            radii: { xs: "0px", sm: "0px", lg: "0px" },
            fonts: {
              mono: "Arial, Helvetica, sans-serif",
              sans: "Arial, Helvetica, sans-serif",
            },
            fontSizes: { root: "12px" },
            sizes: {
              rootWidth: "min(280px, calc(100vw - 24px))",
              controlWidth: "142px",
              rowHeight: "28px",
              folderTitleHeight: "26px",
              checkboxSize: "18px",
              titleBarHeight: "42px",
            },
            shadows: { level1: "none", level2: "none" },
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
          titleBar={{ title: "Parameters", drag: false, filter: false }}
        />
      </aside>
    </main>
  );
}
