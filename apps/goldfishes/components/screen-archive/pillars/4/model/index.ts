export type CursorAgent = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type Grid = {
  cellSize: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
};

export type SelectedCell = {
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type CellAnchor = {
  xRatio: number;
  yRatio: number;
};

export type TemporalAnchor = CellAnchor & {
  createdAt: number;
  endedAt?: number;
  id?: string;
};

export type TemporalCell = SelectedCell & {
  createdAt: number;
  endedAt?: number;
  id: string;
};

export type TemporalCompositionAnchor = TemporalAnchor & {
  columnOffset: number;
  rowOffset: number;
};

export type AttentionZoneBehavior =
  | "protected-perimeter"
  | "open-perimeter";

export type CursorFieldSettings = {
  cellMin: number;
  cellMax: number;
  cellDivisor: number;
  clearance: number;
  minDistance: number;
  collisionBuffer: number;
  collisionPasses: number;
};

export const GOLDFISHES_2D_ONE_SETTINGS: CursorFieldSettings = {
  cellMin: 20,
  cellMax: 30,
  cellDivisor: 30,
  clearance: 6,
  minDistance: 16,
  collisionBuffer: 2,
  collisionPasses: 8,
};

export const GOLDFISHES_PRIMARY_GRID_SCALE = 2;

export function scaleCursorFieldSettings(
  settings: CursorFieldSettings,
  agentScale: number,
): CursorFieldSettings {
  return {
    ...settings,
    clearance: settings.clearance * agentScale,
    minDistance: settings.minDistance * agentScale,
    collisionBuffer: settings.collisionBuffer * agentScale,
  };
}

const PERCEPTION_RADIUS = 72;
const SEPARATION_RADIUS = 24;
const MAX_SPEED = 86;
const MIN_SPEED = 30;
const EDGE_MARGIN = 56;
function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function limitVector(x: number, y: number, maximum: number) {
  const magnitude = Math.hypot(x, y);

  if (magnitude <= maximum || magnitude === 0) {
    return { x, y };
  }

  const scale = maximum / magnitude;
  return { x: x * scale, y: y * scale };
}

export function createGrid(
  width: number,
  height: number,
  settings: CursorFieldSettings,
  gridScale = 1,
): Grid {
  const baseCellSize = Math.max(
    settings.cellMin,
    Math.min(
      settings.cellMax,
      Math.round(Math.min(width, height) / settings.cellDivisor),
    ),
  );
  const cellSize = baseCellSize * Math.max(0.1, gridScale);
  const columns = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;

  return {
    cellSize,
    originX: (width - columns * cellSize) / 2,
    originY: (height - rows * cellSize) / 2,
    columns,
    rows,
  };
}

export function getCellAtPoint(x: number, y: number, grid: Grid): SelectedCell {
  const column = Math.min(
    grid.columns - 1,
    Math.max(0, Math.floor((x - grid.originX) / grid.cellSize)),
  );
  const row = Math.min(
    grid.rows - 1,
    Math.max(0, Math.floor((y - grid.originY) / grid.cellSize)),
  );
  const cellX = grid.originX + column * grid.cellSize;
  const cellY = grid.originY + row * grid.cellSize;

  return {
    column,
    row,
    x: cellX,
    y: cellY,
    width: grid.cellSize,
    height: grid.cellSize,
    centerX: cellX + grid.cellSize / 2,
    centerY: cellY + grid.cellSize / 2,
  };
}

export function getAnchoredCells(
  anchors: readonly CellAnchor[],
  grid: Grid,
  width: number,
  height: number,
) {
  return anchors.map((anchor) =>
    getCellAtPoint(anchor.xRatio * width, anchor.yRatio * height, grid),
  );
}

export function getTemporalCells(
  anchors: readonly TemporalAnchor[],
  grid: Grid,
  width: number,
  height: number,
) {
  return anchors.map((anchor) => ({
    ...getCellAtPoint(anchor.xRatio * width, anchor.yRatio * height, grid),
    createdAt: anchor.createdAt,
    endedAt: anchor.endedAt,
    id: `base:${getTemporalAnchorId(anchor)}`,
  }));
}

function getTemporalAnchorId(anchor: TemporalAnchor) {
  return (
    anchor.id ??
    `${anchor.xRatio.toFixed(6)}:${anchor.yRatio.toFixed(6)}:${anchor.createdAt.toFixed(6)}`
  );
}

export function createTemporalCompositionAnchor(
  anchor: TemporalAnchor,
  cell: SelectedCell,
): TemporalCompositionAnchor {
  const seed =
    (Math.imul(cell.column + 1, 0x45d9f3b) ^
      Math.imul(cell.row + 1, 0x119de1f3) ^
      Math.floor(anchor.createdAt * 1000)) >>>
    0;

  return {
    ...anchor,
    columnOffset: seed & 1,
    rowOffset: (seed >>> 1) & 1,
  };
}

export function getTemporalCompositionCells(
  anchors: readonly TemporalCompositionAnchor[],
  grid: Grid,
  width: number,
  height: number,
) {
  const columnSpan = Math.min(2, grid.columns);
  const rowSpan = Math.min(2, grid.rows);

  return anchors.map((anchor) => {
    const selectedCell = getCellAtPoint(
      anchor.xRatio * width,
      anchor.yRatio * height,
      grid,
    );
    const column = Math.min(
      grid.columns - columnSpan,
      Math.max(0, selectedCell.column - anchor.columnOffset),
    );
    const row = Math.min(
      grid.rows - rowSpan,
      Math.max(0, selectedCell.row - anchor.rowOffset),
    );
    const cellWidth = grid.cellSize * columnSpan;
    const cellHeight = grid.cellSize * rowSpan;

    return {
      column,
      row,
      x: grid.originX + column * grid.cellSize,
      y: grid.originY + row * grid.cellSize,
      width: cellWidth,
      height: cellHeight,
      centerX: grid.originX + (column + columnSpan / 2) * grid.cellSize,
      centerY: grid.originY + (row + rowSpan / 2) * grid.cellSize,
      createdAt: anchor.createdAt,
      endedAt: anchor.endedAt,
      id: `composition:${getTemporalAnchorId(anchor)}`,
    } satisfies TemporalCell;
  });
}

export function createCursorField(
  count: number,
  width: number,
  height: number,
  settings: CursorFieldSettings,
): CursorAgent[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const availableWidth = Math.max(settings.minDistance, width - EDGE_MARGIN * 2);
  const availableHeight = Math.max(settings.minDistance, height - EDGE_MARGIN * 2);
  const maximumColumns = Math.max(
    1,
    Math.floor(availableWidth / settings.minDistance) - 1,
  );
  const maximumRows = Math.max(
    1,
    Math.floor(availableHeight / settings.minDistance) - 1,
  );
  const preferredWidth = Math.min(600, availableWidth);
  const preferredHeight = Math.min(420, availableHeight);
  let columns = Math.min(
    maximumColumns,
    Math.max(1, Math.ceil(Math.sqrt((count * preferredWidth) / preferredHeight))),
  );
  let rows = Math.ceil(count / columns);

  if (rows > maximumRows) {
    columns = Math.min(maximumColumns, Math.ceil(count / maximumRows));
    rows = Math.ceil(count / columns);
  }

  const spreadX = Math.min(
    availableWidth,
    Math.max(preferredWidth, (columns + 1) * settings.minDistance),
  );
  const spreadY = Math.min(
    availableHeight,
    Math.max(preferredHeight, (rows + 1) * settings.minDistance),
  );
  const gapX = spreadX / (columns + 1);
  const gapY = spreadY / (rows + 1);

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const angle = seededUnit(index, 3) * Math.PI * 2;
    const speed = 34 + seededUnit(index, 4) * 26;

    return {
      id: index,
      x: centerX - spreadX / 2 + gapX * (column + 1),
      y: centerY - spreadY / 2 + gapY * (row + 1),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  });
}

function perimeterPoint(cell: SelectedCell, angle: number, padding: number) {
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const halfWidth = cell.width / 2 + padding;
  const halfHeight = cell.height / 2 + padding;
  const distance =
    1 /
    Math.max(
      Math.abs(directionX) / halfWidth,
      Math.abs(directionY) / halfHeight,
    );

  return {
    x: cell.centerX + directionX * distance,
    y: cell.centerY + directionY * distance,
  };
}

function getPerimeterTarget(
  cell: SelectedCell,
  targetRank: number,
  targetIndex: number,
  elapsedSeconds: number,
  settings: CursorFieldSettings,
) {
  let remainingRank = targetRank;
  let band = 0;
  const collisionDistance = settings.minDistance + settings.collisionBuffer;
  let padding = settings.clearance + collisionDistance;

  while (true) {
    const perimeter = 2 * (cell.width + cell.height + padding * 4);
    const capacity = Math.max(8, Math.floor(perimeter / collisionDistance));

    if (remainingRank < capacity) {
      const direction = targetIndex % 2 === 0 ? 1 : -1;
      const phase =
        (remainingRank / capacity) * Math.PI * 2 +
        elapsedSeconds * 0.22 * direction;
      return perimeterPoint(cell, phase, padding);
    }

    remainingRank -= capacity;
    band += 1;
    padding += collisionDistance * (0.82 + (band % 2) * 0.08);
  }
}

function isInsideProtectedCell(
  x: number,
  y: number,
  cell: SelectedCell,
  settings: CursorFieldSettings,
) {
  return (
    x > cell.x - settings.clearance &&
    x < cell.x + cell.width + settings.clearance &&
    y > cell.y - settings.clearance &&
    y < cell.y + cell.height + settings.clearance
  );
}

type ConstraintCandidate = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function keepOutsideCells(
  x: number,
  y: number,
  vx: number,
  vy: number,
  cells: readonly SelectedCell[],
  settings: CursorFieldSettings,
) {
  if (
    !cells.some((cell) => isInsideProtectedCell(x, y, cell, settings))
  ) {
    return { x, y, vx, vy };
  }

  const candidates: ConstraintCandidate[] = [];

  for (const cell of cells) {
    const left = cell.x - settings.clearance;
    const right = cell.x + cell.width + settings.clearance;
    const top = cell.y - settings.clearance;
    const bottom = cell.y + cell.height + settings.clearance;
    const clampedX = Math.min(right, Math.max(left, x));
    const clampedY = Math.min(bottom, Math.max(top, y));

    candidates.push(
      { x: left, y: clampedY, vx: -Math.abs(vx) * 0.62, vy },
      { x: right, y: clampedY, vx: Math.abs(vx) * 0.62, vy },
      { x: clampedX, y: top, vx, vy: -Math.abs(vy) * 0.62 },
      { x: clampedX, y: bottom, vx, vy: Math.abs(vy) * 0.62 },
    );
  }

  const validCandidates = candidates.filter(
    (candidate) =>
      !cells.some((cell) =>
        isInsideProtectedCell(candidate.x, candidate.y, cell, settings),
      ),
  );

  const nearest = validCandidates.reduce((current, candidate) => {
    const currentDistance = (current.x - x) ** 2 + (current.y - y) ** 2;
    const candidateDistance =
      (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
    return candidateDistance < currentDistance ? candidate : current;
  });

  return nearest;
}

export function evacuateSelectedCells(
  cursors: CursorAgent[],
  cells: readonly SelectedCell[],
  settings: CursorFieldSettings,
) {
  return cursors.map((cursor) => {
    const constrained = keepOutsideCells(
      cursor.x,
      cursor.y,
      cursor.vx,
      cursor.vy,
      cells,
      settings,
    );

    return { ...cursor, ...constrained };
  });
}

function resolveCursorCollisions(
  cursors: CursorAgent[],
  width: number,
  height: number,
  selectedCells: readonly SelectedCell[],
  settings: CursorFieldSettings,
) {
  let resolved = cursors.map((cursor) => ({ ...cursor }));
  const collisionDistance = settings.minDistance + settings.collisionBuffer;
  const bucketSize = collisionDistance;
  const minDistanceSquared = collisionDistance * collisionDistance;

  for (let pass = 0; pass < settings.collisionPasses; pass += 1) {
    const columnCount = Math.ceil(width / bucketSize) + 1;
    const spatialGrid = new Map<number, number[]>();

    for (let index = 0; index < resolved.length; index += 1) {
      const cursor = resolved[index];
      const column = Math.floor(cursor.x / bucketSize);
      const row = Math.floor(cursor.y / bucketSize);
      const key = row * columnCount + column;
      const bucket = spatialGrid.get(key);

      if (bucket) {
        bucket.push(index);
      } else {
        spatialGrid.set(key, [index]);
      }
    }

    for (let index = 0; index < resolved.length; index += 1) {
      const cursor = resolved[index];
      const column = Math.floor(cursor.x / bucketSize);
      const row = Math.floor(cursor.y / bucketSize);

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const key =
            (row + rowOffset) * columnCount + column + columnOffset;
          const nearbyIndices = spatialGrid.get(key);
          if (!nearbyIndices) continue;

          for (const otherIndex of nearbyIndices) {
            if (otherIndex <= index) continue;
            const other = resolved[otherIndex];
            let dx = other.x - cursor.x;
            let dy = other.y - cursor.y;
            let distanceSquared = dx * dx + dy * dy;

            if (distanceSquared >= minDistanceSquared) continue;

            if (distanceSquared < 0.0001) {
              const angle =
                seededUnit(cursor.id + other.id, pass + 9) * Math.PI * 2;
              dx = Math.cos(angle);
              dy = Math.sin(angle);
              distanceSquared = 1;
            }

            const distance = Math.sqrt(distanceSquared);
            const directionX = dx / distance;
            const directionY = dy / distance;
            const overlap = (collisionDistance - distance) / 2 + 0.01;

            cursor.x -= directionX * overlap;
            cursor.y -= directionY * overlap;
            other.x += directionX * overlap;
            other.y += directionY * overlap;

            const impulse = overlap * 9;
            cursor.vx -= directionX * impulse;
            cursor.vy -= directionY * impulse;
            other.vx += directionX * impulse;
            other.vy += directionY * impulse;
          }
        }
      }
    }

    resolved = resolved.map((cursor) => {
      const constrained = keepOutsideCells(
        Math.min(width, Math.max(0, cursor.x)),
        Math.min(height, Math.max(0, cursor.y)),
        cursor.vx,
        cursor.vy,
        selectedCells,
        settings,
      );

      return { ...cursor, ...constrained };
    });
  }

  return resolved;
}

export function settleCursorField(
  cursors: CursorAgent[],
  width: number,
  height: number,
  selectedCells: readonly SelectedCell[],
  settings: CursorFieldSettings,
  preventCursorCollisions = true,
  attentionZoneBehavior: AttentionZoneBehavior = "protected-perimeter",
) {
  const constrainedCursors =
    attentionZoneBehavior === "protected-perimeter"
      ? evacuateSelectedCells(cursors, selectedCells, settings)
      : cursors;

  if (!preventCursorCollisions) {
    return constrainedCursors;
  }

  return resolveCursorCollisions(
    constrainedCursors,
    width,
    height,
    attentionZoneBehavior === "protected-perimeter"
      ? selectedCells
      : [],
    settings,
  );
}

export function stepCursorField(
  cursors: CursorAgent[],
  width: number,
  height: number,
  deltaSeconds: number,
  elapsedSeconds: number,
  selectedCells: readonly SelectedCell[],
  settings: CursorFieldSettings,
  preventCursorCollisions = true,
  agentScale = 1,
  attentionZoneBehavior: AttentionZoneBehavior = "protected-perimeter",
) {
  const perceptionSquared = PERCEPTION_RADIUS * PERCEPTION_RADIUS;
  const separationRadius = SEPARATION_RADIUS * agentScale;
  const separationSquared = separationRadius * separationRadius;
  const columnCount = Math.ceil(width / PERCEPTION_RADIUS) + 1;
  const spatialGrid = new Map<number, CursorAgent[]>();

  for (const cursor of cursors) {
    const column = Math.floor(cursor.x / PERCEPTION_RADIUS);
    const row = Math.floor(cursor.y / PERCEPTION_RADIUS);
    const key = row * columnCount + column;
    const bucket = spatialGrid.get(key);

    if (bucket) {
      bucket.push(cursor);
    } else {
      spatialGrid.set(key, [cursor]);
    }
  }

  const movedCursors = cursors.map((cursor) => {
    let neighborCount = 0;
    let alignmentX = 0;
    let alignmentY = 0;
    let centerX = 0;
    let centerY = 0;
    let separationX = 0;
    let separationY = 0;
    const cursorColumn = Math.floor(cursor.x / PERCEPTION_RADIUS);
    const cursorRow = Math.floor(cursor.y / PERCEPTION_RADIUS);

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const key =
          (cursorRow + rowOffset) * columnCount +
          cursorColumn +
          columnOffset;
        const nearbyCursors = spatialGrid.get(key);
        if (!nearbyCursors) continue;

        for (const other of nearbyCursors) {
          if (other.id === cursor.id) continue;

          const dx = other.x - cursor.x;
          const dy = other.y - cursor.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= perceptionSquared) continue;

          neighborCount += 1;
          alignmentX += other.vx;
          alignmentY += other.vy;
          centerX += other.x;
          centerY += other.y;

          if (distanceSquared < separationSquared && distanceSquared > 0.01) {
            separationX -= dx / distanceSquared;
            separationY -= dy / distanceSquared;
          }
        }
      }
    }

    let accelerationX = separationX * 1.15 * 560;
    let accelerationY = separationY * 1.15 * 560;

    if (neighborCount > 0) {
      const inverseCount = 1 / neighborCount;
      accelerationX +=
        (alignmentX * inverseCount - cursor.vx) * 0.82 * 0.72;
      accelerationY +=
        (alignmentY * inverseCount - cursor.vy) * 0.82 * 0.72;
      accelerationX +=
        (centerX * inverseCount - cursor.x) * 0.72 * 0.44;
      accelerationY +=
        (centerY * inverseCount - cursor.y) * 0.72 * 0.44;
    }

    const attentionCell =
      selectedCells.length > 0
        ? selectedCells[cursor.id % selectedCells.length]
        : null;

    if (attentionCell) {
      const targetRank = Math.floor(cursor.id / selectedCells.length);
      const targetIndex = cursor.id % selectedCells.length;
      const orbitPoint = getPerimeterTarget(
        attentionCell,
        targetRank,
        targetIndex,
        elapsedSeconds,
        settings,
      );
      const dx = orbitPoint.x - cursor.x;
      const dy = orbitPoint.y - cursor.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 22) {
        const arrival = Math.min(1, distance / 150);
        const desiredVx = (dx / distance) * MAX_SPEED * arrival;
        const desiredVy = (dy / distance) * MAX_SPEED * arrival;
        accelerationX += (desiredVx - cursor.vx) * 0.72;
        accelerationY += (desiredVy - cursor.vy) * 0.72;
      }
    }

    if (cursor.x < EDGE_MARGIN) accelerationX += (EDGE_MARGIN - cursor.x) * 1.8;
    if (cursor.x > width - EDGE_MARGIN) {
      accelerationX -= (cursor.x - (width - EDGE_MARGIN)) * 1.8;
    }
    if (cursor.y < EDGE_MARGIN) accelerationY += (EDGE_MARGIN - cursor.y) * 1.8;
    if (cursor.y > height - EDGE_MARGIN) {
      accelerationY -= (cursor.y - (height - EDGE_MARGIN)) * 1.8;
    }

    const acceleration = limitVector(accelerationX, accelerationY, 72);
    let vx = cursor.vx + acceleration.x * deltaSeconds;
    let vy = cursor.vy + acceleration.y * deltaSeconds;
    const speed = Math.hypot(vx, vy);

    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      vx *= scale;
      vy *= scale;
    } else if (speed < MIN_SPEED && speed > 0) {
      const scale = MIN_SPEED / speed;
      vx *= scale;
      vy *= scale;
    }

    const nextX = Math.min(
      width,
      Math.max(0, cursor.x + vx * deltaSeconds),
    );
    const nextY = Math.min(
      height,
      Math.max(0, cursor.y + vy * deltaSeconds),
    );

    if (attentionZoneBehavior === "open-perimeter") {
      return { ...cursor, x: nextX, y: nextY, vx, vy };
    }

    const constrained = keepOutsideCells(
      nextX,
      nextY,
      vx,
      vy,
      selectedCells,
      settings,
    );

    return { ...cursor, ...constrained };
  });

  if (!preventCursorCollisions) {
    return movedCursors;
  }

  return resolveCursorCollisions(
    movedCursors,
    width,
    height,
    attentionZoneBehavior === "protected-perimeter"
      ? selectedCells
      : [],
    settings,
  );
}
