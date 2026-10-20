import type { Grid } from ".";

export type CompositionalCell = {
  id: number;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  pillarExtent: number;
};

export type CompositionalGridSettings = {
  density: number;
  maximumSpan: number;
  minimumLifetimeMilliseconds: number;
  maximumLifetimeMilliseconds: number;
};

export type CompositionalGridState = {
  cells: CompositionalCell[];
  expiresAtById: Map<number, number>;
  nextId: number;
  randomState: number;
};

const MINIMUM_SPAN = 2;
const MAXIMUM_SPAN = 2;
const MAXIMUM_CELL_COUNT = 72;

function nextRandom(state: CompositionalGridState) {
  state.randomState =
    (Math.imul(state.randomState, 1664525) + 1013904223) >>> 0;
  return state.randomState / 0xffffffff;
}

function clampSettings(settings: CompositionalGridSettings) {
  const maximumSpan = Math.max(
    MINIMUM_SPAN,
    Math.min(MAXIMUM_SPAN, Math.floor(settings.maximumSpan)),
  );
  const minimumLifetimeMilliseconds = Math.max(
    0,
    settings.minimumLifetimeMilliseconds,
  );

  return {
    density: Math.max(0, Math.min(MAXIMUM_CELL_COUNT, Math.floor(settings.density))),
    maximumSpan,
    minimumLifetimeMilliseconds,
    maximumLifetimeMilliseconds: Math.max(
      minimumLifetimeMilliseconds,
      settings.maximumLifetimeMilliseconds,
    ),
  };
}

function getLifetime(
  state: CompositionalGridState,
  settings: ReturnType<typeof clampSettings>,
) {
  return (
    settings.minimumLifetimeMilliseconds +
    nextRandom(state) *
      (settings.maximumLifetimeMilliseconds - settings.minimumLifetimeMilliseconds)
  );
}

function getCellKey(column: number, row: number) {
  return `${column}:${row}`;
}

function canPlace(
  occupied: Set<string>,
  column: number,
  row: number,
  columnSpan: number,
  rowSpan: number,
  grid: Grid,
) {
  if (column + columnSpan > grid.columns || row + rowSpan > grid.rows) {
    return false;
  }

  for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
    for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
      if (occupied.has(getCellKey(column + columnOffset, row + rowOffset))) {
        return false;
      }
    }
  }

  return true;
}

function occupy(
  occupied: Set<string>,
  cell: Pick<CompositionalCell, "column" | "row" | "columnSpan" | "rowSpan">,
) {
  for (let columnOffset = 0; columnOffset < cell.columnSpan; columnOffset += 1) {
    for (let rowOffset = 0; rowOffset < cell.rowSpan; rowOffset += 1) {
      occupied.add(getCellKey(cell.column + columnOffset, cell.row + rowOffset));
    }
  }
}

function createCell(
  state: CompositionalGridState,
  grid: Grid,
  settings: ReturnType<typeof clampSettings>,
  occupied: Set<string>,
) {
  const columnSpan =
    MINIMUM_SPAN +
    Math.floor(nextRandom(state) * (settings.maximumSpan - MINIMUM_SPAN + 1));
  const rowSpan =
    MINIMUM_SPAN +
    Math.floor(nextRandom(state) * (settings.maximumSpan - MINIMUM_SPAN + 1));
  const attempts = Math.max(24, grid.columns * grid.rows * 2);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const column = Math.floor(nextRandom(state) * Math.max(1, grid.columns - columnSpan + 1));
    const row = Math.floor(nextRandom(state) * Math.max(1, grid.rows - rowSpan + 1));
    if (!canPlace(occupied, column, row, columnSpan, rowSpan, grid)) continue;

    const width = grid.cellSize * columnSpan;
    const height = grid.cellSize * rowSpan;
    const cell: CompositionalCell = {
      id: state.nextId,
      column,
      row,
      columnSpan,
      rowSpan,
      x: grid.originX + column * grid.cellSize,
      y: grid.originY + row * grid.cellSize,
      width,
      height,
      centerX: grid.originX + (column + columnSpan / 2) * grid.cellSize,
      centerY: grid.originY + (row + rowSpan / 2) * grid.cellSize,
      pillarExtent: 18 + nextRandom(state) * 86,
    };
    state.nextId += 1;
    occupy(occupied, cell);
    return cell;
  }

  return null;
}

function fillGrid(
  state: CompositionalGridState,
  grid: Grid,
  settings: ReturnType<typeof clampSettings>,
  now: number,
) {
  const occupied = new Set<string>();
  for (const cell of state.cells) occupy(occupied, cell);

  while (state.cells.length < settings.density) {
    const cell = createCell(state, grid, settings, occupied);
    if (!cell) break;
    state.cells.push(cell);
    state.expiresAtById.set(cell.id, now + getLifetime(state, settings));
  }
}

export function createCompositionalGrid(
  grid: Grid,
  _settings: CompositionalGridSettings,
  now: number,
) {
  return {
    cells: [],
    expiresAtById: new Map(),
    nextId: 1,
    randomState: (Math.floor(now) ^ (grid.columns << 8) ^ grid.rows) >>> 0,
  };
}

export function addCompositionalCell(
  state: CompositionalGridState,
  grid: Grid,
  settings: CompositionalGridSettings,
  column: number,
  row: number,
  now: number,
) {
  const normalizedSettings = clampSettings(settings);
  if (normalizedSettings.density === 0) return false;

  const columnSpan =
    MINIMUM_SPAN +
    Math.floor(nextRandom(state) * (normalizedSettings.maximumSpan - MINIMUM_SPAN + 1));
  const rowSpan =
    MINIMUM_SPAN +
    Math.floor(nextRandom(state) * (normalizedSettings.maximumSpan - MINIMUM_SPAN + 1));
  const boundedColumnSpan = Math.min(columnSpan, grid.columns);
  const boundedRowSpan = Math.min(rowSpan, grid.rows);
  const cellColumn = Math.min(
    grid.columns - boundedColumnSpan,
    Math.max(0, column - Math.floor(nextRandom(state) * boundedColumnSpan)),
  );
  const cellRow = Math.min(
    grid.rows - boundedRowSpan,
    Math.max(0, row - Math.floor(nextRandom(state) * boundedRowSpan)),
  );
  const cell: CompositionalCell = {
    id: state.nextId,
    column: cellColumn,
    row: cellRow,
    columnSpan: boundedColumnSpan,
    rowSpan: boundedRowSpan,
    x: grid.originX + cellColumn * grid.cellSize,
    y: grid.originY + cellRow * grid.cellSize,
    width: grid.cellSize * boundedColumnSpan,
    height: grid.cellSize * boundedRowSpan,
    centerX: grid.originX + (cellColumn + boundedColumnSpan / 2) * grid.cellSize,
    centerY: grid.originY + (cellRow + boundedRowSpan / 2) * grid.cellSize,
    pillarExtent: 18 + nextRandom(state) * 86,
  };
  state.nextId += 1;

  while (state.cells.length >= normalizedSettings.density) {
    const removed = state.cells.shift();
    if (removed) state.expiresAtById.delete(removed.id);
  }
  state.cells.push(cell);
  state.expiresAtById.set(
    cell.id,
    now + getLifetime(state, normalizedSettings),
  );
  return true;
}

export function advanceCompositionalGrid(
  state: CompositionalGridState,
  grid: Grid,
  settings: CompositionalGridSettings,
  now: number,
) {
  const normalizedSettings = clampSettings(settings);
  const previousLength = state.cells.length;
  const retainedCells = state.cells.filter((cell) => {
    const expiresAt = state.expiresAtById.get(cell.id) ?? now;
    if (expiresAt > now) return true;
    state.expiresAtById.delete(cell.id);
    return false;
  });

  const discardedCells = retainedCells.slice(normalizedSettings.density);
  for (const cell of discardedCells) {
    state.expiresAtById.delete(cell.id);
  }
  state.cells = retainedCells.slice(0, normalizedSettings.density);
  const changed = state.cells.length !== previousLength;
  fillGrid(state, grid, normalizedSettings, now);

  return changed || state.cells.length !== previousLength;
}
