import type { SelectedCell } from "../model";
import {
  MEDIA_ATLAS_COLUMNS,
  MEDIA_ATLAS_TILE_SIZE,
  MEDIA_IMAGE_COUNTS,
  loadMediaAtlas,
  type AttentionSurface,
  type MediaSurface,
} from "./media-atlas";

export type MediaGridMark = "dot" | "cross";

type CellPlayback = {
  current: number;
  nextChangeAt: number;
  randomState: number;
};

const MAX_CELL_DRAWS_PER_SECOND = 960;
const retainedAtlases = new Map<MediaSurface, HTMLCanvasElement>();
const retainedAtlasLoads = new Map<
  MediaSurface,
  Promise<HTMLCanvasElement>
>();

function loadRetainedAtlas(surface: MediaSurface) {
  const retained = retainedAtlases.get(surface);
  if (retained) return Promise.resolve(retained);

  let pending = retainedAtlasLoads.get(surface);
  if (!pending) {
    pending = loadMediaAtlas(surface)
      .then((atlas) => {
        retainedAtlases.set(surface, atlas);
        return atlas;
      })
      .finally(() => {
        retainedAtlasLoads.delete(surface);
      });
    retainedAtlasLoads.set(surface, pending);
  }
  return pending;
}

function nextRandom(playback: CellPlayback) {
  playback.randomState =
    (Math.imul(playback.randomState, 1664525) + 1013904223) >>> 0;
  return playback.randomState / 0xffffffff;
}

function getChangeInterval(
  playback: CellPlayback,
  selectedCellCount: number,
  requestedSpeed: number,
) {
  if (requestedSpeed === 0) return Number.POSITIVE_INFINITY;
  const diversity = 0.72;
  const factor = 1 + (nextRandom(playback) * 2 - 1) * diversity;
  const speed = Math.min(
    requestedSpeed * Math.max(0.05, factor),
    MAX_CELL_DRAWS_PER_SECOND / Math.max(1, selectedCellCount),
  );
  return 1000 / speed;
}

function getOtherIndex(playback: CellPlayback, imageCount: number) {
  const candidate = Math.floor(nextRandom(playback) * (imageCount - 1));
  return candidate >= playback.current ? candidate + 1 : candidate;
}

function createPlayback(
  cell: SelectedCell,
  surface: MediaSurface,
): CellPlayback {
  const surfaceSeed = {
    cat: 0x2c9277b5,
    kiss: 0x165667b1,
    politician: 0x7f4a7c15,
  }[surface];
  const playback: CellPlayback = {
    current: 0,
    nextChangeAt: 0,
    randomState:
      (
        Math.imul(cell.column + 1, 0x45d9f3b) ^
        Math.imul(cell.row + 1, 0x119de1f3) ^
        surfaceSeed
      ) >>> 0,
  };
  playback.current = Math.floor(
    nextRandom(playback) * MEDIA_IMAGE_COUNTS[surface],
  );
  return playback;
}

export class MediaCellLayer {
  private readonly context: CanvasRenderingContext2D;
  private readonly playbackByCell = new Map<string, CellPlayback>();
  private cells: SelectedCell[] = [];
  private playback: CellPlayback[] = [];
  private surface: AttentionSurface = "white";
  private gridMark: MediaGridMark = "dot";
  private gridColor = "rgba(236, 238, 232, 0.52)";
  private speed = 24;
  private width = 1;
  private height = 1;
  private needsFullRedraw = false;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create the media cell layer.");
    this.context = context;
  }

  setSize(width: number, height: number, pixelRatio: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.needsFullRedraw = true;
  }

  setAppearance(gridMark: MediaGridMark, gridColor: string) {
    this.gridMark = gridMark;
    this.gridColor = gridColor;
    this.needsFullRedraw = true;
  }

  setSpeed(speed: number) {
    this.speed = Math.max(0, Math.min(40, speed));
    for (const playback of this.playback) {
      playback.nextChangeAt = 0;
    }
  }

  setSurface(surface: AttentionSurface) {
    if (this.surface === surface) return;
    this.surface = surface;
    this.syncPlayback();
    this.clear();

    if (surface !== "white" && this.cells.length > 0) {
      this.prepareAtlas(surface);
    }
  }

  setCells(cells: readonly SelectedCell[]) {
    this.cells = [...cells];
    this.syncPlayback();
    for (const playback of this.playback) {
      playback.nextChangeAt = 0;
    }
    this.needsFullRedraw = true;

    if (this.cells.length === 0 || this.surface === "white") {
      this.clear();
      return;
    }
    this.prepareAtlas(this.surface);
  }

  private syncPlayback() {
    if (this.surface === "white") {
      this.playback = [];
      return;
    }
    const surface = this.surface;

    this.playback = this.cells.map((cell) => {
      const key = `${surface}:${cell.column}:${cell.row}`;
      let playback = this.playbackByCell.get(key);
      if (!playback) {
        playback = createPlayback(cell, surface);
        this.playbackByCell.set(key, playback);
      }
      return playback;
    });
  }

  private prepareAtlas(surface: MediaSurface) {
    if (retainedAtlases.has(surface)) {
      this.needsFullRedraw = true;
      return;
    }

    void loadRetainedAtlas(surface).then(() => {
      if (!this.disposed && this.surface === surface) {
        this.needsFullRedraw = true;
      }
    });
  }

  private clear() {
    this.context.clearRect(0, 0, this.width, this.height);
    this.needsFullRedraw = false;
  }

  private advancePlayback(
    playback: CellPlayback,
    surface: MediaSurface,
    time: number,
  ) {
    if (playback.nextChangeAt === 0) {
      playback.nextChangeAt =
        time +
        getChangeInterval(
          playback,
          this.cells.length,
          this.speed,
        );
      return false;
    }

    let changed = false;
    while (time >= playback.nextChangeAt) {
      playback.current = getOtherIndex(
        playback,
        MEDIA_IMAGE_COUNTS[surface],
      );
      playback.nextChangeAt += getChangeInterval(
        playback,
        this.cells.length,
        this.speed,
      );
      changed = true;
    }
    return changed;
  }

  private drawGridMark(x: number, y: number) {
    const context = this.context;
    if (this.gridMark === "dot") {
      context.fillStyle = this.gridColor;
      context.fillRect(Math.round(x), Math.round(y), 1, 1);
      return;
    }

    const alignedX = Math.round(x) + 0.5;
    const alignedY = Math.round(y) + 0.5;
    context.moveTo(alignedX - 2.25, alignedY);
    context.lineTo(alignedX + 2.25, alignedY);
    context.moveTo(alignedX, alignedY - 2.25);
    context.lineTo(alignedX, alignedY + 2.25);
  }

  private drawCell(
    atlas: HTMLCanvasElement,
    cell: SelectedCell,
    playback: CellPlayback,
  ) {
    const sourceColumn = playback.current % MEDIA_ATLAS_COLUMNS;
    const sourceRow = Math.floor(
      playback.current / MEDIA_ATLAS_COLUMNS,
    );
    this.context.clearRect(
      cell.x,
      cell.y,
      cell.width,
      cell.height,
    );
    this.context.drawImage(
      atlas,
      sourceColumn * MEDIA_ATLAS_TILE_SIZE,
      sourceRow * MEDIA_ATLAS_TILE_SIZE,
      MEDIA_ATLAS_TILE_SIZE,
      MEDIA_ATLAS_TILE_SIZE,
      cell.x,
      cell.y,
      cell.width,
      cell.height,
    );

    if (this.gridMark === "dot") {
      this.drawGridMark(cell.x, cell.y);
      this.drawGridMark(cell.x + cell.width, cell.y);
      this.drawGridMark(cell.x, cell.y + cell.height);
      this.drawGridMark(
        cell.x + cell.width,
        cell.y + cell.height,
      );
      return;
    }

    this.context.strokeStyle = this.gridColor;
    this.context.lineWidth = 1;
    this.context.beginPath();
    this.drawGridMark(cell.x, cell.y);
    this.drawGridMark(cell.x + cell.width, cell.y);
    this.drawGridMark(cell.x, cell.y + cell.height);
    this.drawGridMark(
      cell.x + cell.width,
      cell.y + cell.height,
    );
    this.context.stroke();
  }

  render(time: number, animate: boolean) {
    if (this.surface === "white" || this.cells.length === 0) return;
    const atlas = retainedAtlases.get(this.surface);
    if (!atlas) return;

    if (this.needsFullRedraw) {
      this.clear();
      for (let index = 0; index < this.cells.length; index += 1) {
        const playback = this.playback[index];
        if (animate) {
          this.advancePlayback(playback, this.surface, time);
        }
        this.drawCell(atlas, this.cells[index], playback);
      }
      return;
    }

    if (!animate) return;
    for (let index = 0; index < this.cells.length; index += 1) {
      const playback = this.playback[index];
      if (!this.advancePlayback(playback, this.surface, time)) continue;
      this.drawCell(atlas, this.cells[index], playback);
    }
  }

  dispose() {
    this.disposed = true;
    this.clear();
  }
}
