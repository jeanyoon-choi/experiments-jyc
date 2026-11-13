export type CursorAgent = {
  id: number;
  // The model owns a real 3D state. Field x/y map to world X/Z; model z maps
  // to world Y so existing pointer and topology projection contracts remain.
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
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
  centerZ: number;
  radius: number;
};

export type CellAnchor = {
  xRatio: number;
  yRatio: number;
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

function limitVector(x: number, y: number, z: number, maximum: number) {
  const magnitude = Math.hypot(x, y, z);

  if (magnitude <= maximum || magnitude === 0) {
    return { x, y, z };
  }

  const scale = maximum / magnitude;
  return { x: x * scale, y: y * scale, z: z * scale };
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
    centerZ: 0,
    radius: grid.cellSize / 2,
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
  const verticalSpan = Math.max(96, Math.min(width, height) * 0.46);

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const azimuth = seededUnit(index, 3) * Math.PI * 2;
    const verticalDirection = seededUnit(index, 5) * 1.4 - 0.7;
    const horizontalDirection = Math.sqrt(
      Math.max(0, 1 - verticalDirection * verticalDirection),
    );
    const speed = 34 + seededUnit(index, 4) * 26;

    return {
      id: index,
      x: centerX - spreadX / 2 + gapX * (column + 1),
      y: centerY - spreadY / 2 + gapY * (row + 1),
      z: (seededUnit(index, 6) - 0.5) * verticalSpan,
      vx: Math.cos(azimuth) * horizontalDirection * speed,
      vy: Math.sin(azimuth) * horizontalDirection * speed,
      vz: verticalDirection * speed,
    };
  });
}

function getSpatialTarget(
  cell: SelectedCell,
  targetRank: number,
  targetIndex: number,
  elapsedSeconds: number,
  settings: CursorFieldSettings,
  verticalDepth: number,
) {
  const collisionDistance = settings.minDistance + settings.collisionBuffer;
  const shell =
    cell.radius +
    settings.clearance +
    collisionDistance * (1.05 + Math.cbrt(targetRank) * 0.72);
  const direction = targetIndex % 2 === 0 ? 1 : -1;
  const phase =
    seededUnit(targetIndex, 17) * Math.PI * 2 +
    elapsedSeconds * 0.31 * direction;
  const baseVertical = seededUnit(targetIndex, 19) * 1.5 - 0.75;
  const verticalDirection = Math.max(
    -0.88,
    Math.min(
      0.88,
      baseVertical +
        Math.sin(elapsedSeconds * 0.23 + targetIndex * 1.317) * 0.24,
    ),
  );
  const horizontalDirection = Math.sqrt(
    Math.max(0, 1 - verticalDirection * verticalDirection),
  );
  const depthOffset =
    (seededUnit(targetIndex, 23) - 0.5) * verticalDepth * 0.24;

  return {
    x: cell.centerX + Math.cos(phase) * horizontalDirection * shell,
    y: cell.centerY + Math.sin(phase) * horizontalDirection * shell,
    z: cell.centerZ + verticalDirection * shell + depthOffset,
  };
}

function isInsideProtectedCell(
  x: number,
  y: number,
  z: number,
  cell: SelectedCell,
  settings: CursorFieldSettings,
) {
  const radius = cell.radius + settings.clearance;
  return (
    (x - cell.centerX) ** 2 +
      (y - cell.centerY) ** 2 +
      (z - cell.centerZ) ** 2 <
    radius * radius
  );
}

type ConstraintCandidate = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

function keepOutsideCells(
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  cells: readonly SelectedCell[],
  settings: CursorFieldSettings,
) {
  const constrained: ConstraintCandidate = { x, y, z, vx, vy, vz };

  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;

    for (const cell of cells) {
      if (
        !isInsideProtectedCell(
          constrained.x,
          constrained.y,
          constrained.z,
          cell,
          settings,
        )
      ) {
        continue;
      }

      let dx = constrained.x - cell.centerX;
      let dy = constrained.y - cell.centerY;
      let dz = constrained.z - cell.centerZ;
      let distance = Math.hypot(dx, dy, dz);
      if (distance < 0.0001) {
        const azimuth = seededUnit(cell.column + 1, 31) * Math.PI * 2;
        dz = seededUnit(cell.column + 1, 37) * 2 - 1;
        const horizontal = Math.sqrt(Math.max(0, 1 - dz * dz));
        dx = Math.cos(azimuth) * horizontal;
        dy = Math.sin(azimuth) * horizontal;
        distance = 1;
      }

      const directionX = dx / distance;
      const directionY = dy / distance;
      const directionZ = dz / distance;
      const radius = cell.radius + settings.clearance + 0.01;
      constrained.x = cell.centerX + directionX * radius;
      constrained.y = cell.centerY + directionY * radius;
      constrained.z = cell.centerZ + directionZ * radius;

      const inwardVelocity =
        constrained.vx * directionX +
        constrained.vy * directionY +
        constrained.vz * directionZ;
      if (inwardVelocity < 0) {
        const reflected = inwardVelocity * 1.42;
        constrained.vx -= directionX * reflected;
        constrained.vy -= directionY * reflected;
        constrained.vz -= directionZ * reflected;
      }
      changed = true;
    }

    if (!changed) break;
  }

  return constrained;
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
      cursor.z,
      cursor.vx,
      cursor.vy,
      cursor.vz,
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
  protectCells: boolean,
) {
  let resolved = cursors.map((cursor) => ({ ...cursor }));
  const collisionDistance = settings.minDistance + settings.collisionBuffer;
  const bucketSize = collisionDistance;
  const minDistanceSquared = collisionDistance * collisionDistance;
  const verticalPadding = Math.max(72, Math.min(width, height) * 0.14);
  const minimumTargetZ =
    selectedCells.length > 0
      ? Math.min(...selectedCells.map((cell) => cell.centerZ))
      : -verticalPadding;
  const maximumTargetZ =
    selectedCells.length > 0
      ? Math.max(...selectedCells.map((cell) => cell.centerZ))
      : verticalPadding;
  const minimumZ = minimumTargetZ - verticalPadding;
  const maximumZ = maximumTargetZ + verticalPadding;

  for (let pass = 0; pass < settings.collisionPasses; pass += 1) {
    const spatialGrid = new Map<string, number[]>();

    for (let index = 0; index < resolved.length; index += 1) {
      const cursor = resolved[index];
      const column = Math.floor(cursor.x / bucketSize);
      const row = Math.floor(cursor.y / bucketSize);
      const layer = Math.floor(cursor.z / bucketSize);
      const key = `${column}:${row}:${layer}`;
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
      const layer = Math.floor(cursor.z / bucketSize);

      for (let layerOffset = -1; layerOffset <= 1; layerOffset += 1) {
        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
          for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
            const key = `${column + columnOffset}:${row + rowOffset}:${layer + layerOffset}`;
            const nearbyIndices = spatialGrid.get(key);
            if (!nearbyIndices) continue;

            for (const otherIndex of nearbyIndices) {
              if (otherIndex <= index) continue;
              const other = resolved[otherIndex];
              let dx = other.x - cursor.x;
              let dy = other.y - cursor.y;
              let dz = other.z - cursor.z;
              let distanceSquared = dx * dx + dy * dy + dz * dz;

              if (distanceSquared >= minDistanceSquared) continue;

              if (distanceSquared < 0.0001) {
                const azimuth =
                  seededUnit(cursor.id + other.id, pass + 9) * Math.PI * 2;
                dz = seededUnit(cursor.id + other.id, pass + 15) * 2 - 1;
                const horizontal = Math.sqrt(Math.max(0, 1 - dz * dz));
                dx = Math.cos(azimuth) * horizontal;
                dy = Math.sin(azimuth) * horizontal;
                distanceSquared = 1;
              }

              const distance = Math.sqrt(distanceSquared);
              const directionX = dx / distance;
              const directionY = dy / distance;
              const directionZ = dz / distance;
              const overlap = (collisionDistance - distance) / 2 + 0.01;

              cursor.x -= directionX * overlap;
              cursor.y -= directionY * overlap;
              cursor.z -= directionZ * overlap;
              other.x += directionX * overlap;
              other.y += directionY * overlap;
              other.z += directionZ * overlap;

              const impulse = overlap * 9;
              cursor.vx -= directionX * impulse;
              cursor.vy -= directionY * impulse;
              cursor.vz -= directionZ * impulse;
              other.vx += directionX * impulse;
              other.vy += directionY * impulse;
              other.vz += directionZ * impulse;
            }
          }
        }
      }
    }

    resolved = resolved.map((cursor) => {
      const constrained = keepOutsideCells(
        Math.min(width, Math.max(0, cursor.x)),
        Math.min(height, Math.max(0, cursor.y)),
        Math.min(maximumZ, Math.max(minimumZ, cursor.z)),
        cursor.vx,
        cursor.vy,
        cursor.vz,
        protectCells ? selectedCells : [],
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
    selectedCells,
    settings,
    attentionZoneBehavior === "protected-perimeter",
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
  verticalDepth = 64,
) {
  const perceptionSquared = PERCEPTION_RADIUS * PERCEPTION_RADIUS;
  const separationRadius = SEPARATION_RADIUS * agentScale;
  const separationSquared = separationRadius * separationRadius;
  const spatialGrid = new Map<string, CursorAgent[]>();
  const verticalPadding = Math.max(72, Math.min(width, height) * 0.14);
  const minimumTargetZ =
    selectedCells.length > 0
      ? Math.min(...selectedCells.map((cell) => cell.centerZ))
      : -verticalPadding;
  const maximumTargetZ =
    selectedCells.length > 0
      ? Math.max(...selectedCells.map((cell) => cell.centerZ))
      : verticalPadding;
  const minimumZ = minimumTargetZ - verticalPadding;
  const maximumZ = maximumTargetZ + verticalPadding;

  for (const cursor of cursors) {
    const column = Math.floor(cursor.x / PERCEPTION_RADIUS);
    const row = Math.floor(cursor.y / PERCEPTION_RADIUS);
    const layer = Math.floor(cursor.z / PERCEPTION_RADIUS);
    const key = `${column}:${row}:${layer}`;
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
    let alignmentZ = 0;
    let centerX = 0;
    let centerY = 0;
    let centerZ = 0;
    let separationX = 0;
    let separationY = 0;
    let separationZ = 0;
    const cursorColumn = Math.floor(cursor.x / PERCEPTION_RADIUS);
    const cursorRow = Math.floor(cursor.y / PERCEPTION_RADIUS);
    const cursorLayer = Math.floor(cursor.z / PERCEPTION_RADIUS);

    for (let layerOffset = -1; layerOffset <= 1; layerOffset += 1) {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const key = `${cursorColumn + columnOffset}:${cursorRow + rowOffset}:${cursorLayer + layerOffset}`;
          const nearbyCursors = spatialGrid.get(key);
          if (!nearbyCursors) continue;

          for (const other of nearbyCursors) {
            if (other.id === cursor.id) continue;

            const dx = other.x - cursor.x;
            const dy = other.y - cursor.y;
            const dz = other.z - cursor.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            if (distanceSquared >= perceptionSquared) continue;

            neighborCount += 1;
            alignmentX += other.vx;
            alignmentY += other.vy;
            alignmentZ += other.vz;
            centerX += other.x;
            centerY += other.y;
            centerZ += other.z;

            if (
              distanceSquared < separationSquared &&
              distanceSquared > 0.01
            ) {
              separationX -= dx / distanceSquared;
              separationY -= dy / distanceSquared;
              separationZ -= dz / distanceSquared;
            }
          }
        }
      }
    }

    let accelerationX = separationX * 1.15 * 560;
    let accelerationY = separationY * 1.15 * 560;
    let accelerationZ = separationZ * 1.15 * 560;

    if (neighborCount > 0) {
      const inverseCount = 1 / neighborCount;
      accelerationX +=
        (alignmentX * inverseCount - cursor.vx) * 0.82 * 0.72;
      accelerationY +=
        (alignmentY * inverseCount - cursor.vy) * 0.82 * 0.72;
      accelerationZ +=
        (alignmentZ * inverseCount - cursor.vz) * 0.82 * 0.72;
      accelerationX +=
        (centerX * inverseCount - cursor.x) * 0.72 * 0.44;
      accelerationY +=
        (centerY * inverseCount - cursor.y) * 0.72 * 0.44;
      accelerationZ +=
        (centerZ * inverseCount - cursor.z) * 0.72 * 0.44;
    }

    const attentionCell =
      selectedCells.length > 0
        ? selectedCells[cursor.id % selectedCells.length]
        : null;

    if (attentionCell) {
      const targetRank = Math.floor(cursor.id / selectedCells.length);
      const targetIndex = cursor.id % selectedCells.length;
      const orbitPoint = getSpatialTarget(
        attentionCell,
        targetRank,
        targetIndex,
        elapsedSeconds,
        settings,
        verticalDepth,
      );
      const dx = orbitPoint.x - cursor.x;
      const dy = orbitPoint.y - cursor.y;
      const dz = orbitPoint.z - cursor.z;
      const distance = Math.hypot(dx, dy, dz);

      if (distance > 0.001) {
        const arrival = Math.max(0.34, Math.min(1, distance / 150));
        const desiredVx = (dx / distance) * MAX_SPEED * arrival;
        const desiredVy = (dy / distance) * MAX_SPEED * arrival;
        const desiredVz = (dz / distance) * MAX_SPEED * arrival;
        accelerationX += (desiredVx - cursor.vx) * 0.72;
        accelerationY += (desiredVy - cursor.vy) * 0.72;
        accelerationZ += (desiredVz - cursor.vz) * 0.72;
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
    if (cursor.z < minimumZ) {
      accelerationZ += (minimumZ - cursor.z) * 1.8;
    }
    if (cursor.z > maximumZ) {
      accelerationZ -= (cursor.z - maximumZ) * 1.8;
    }

    const acceleration = limitVector(
      accelerationX,
      accelerationY,
      accelerationZ,
      72,
    );
    let vx = cursor.vx + acceleration.x * deltaSeconds;
    let vy = cursor.vy + acceleration.y * deltaSeconds;
    let vz = cursor.vz + acceleration.z * deltaSeconds;
    const speed = Math.hypot(vx, vy, vz);

    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      vx *= scale;
      vy *= scale;
      vz *= scale;
    } else if (speed < MIN_SPEED && speed > 0) {
      const scale = MIN_SPEED / speed;
      vx *= scale;
      vy *= scale;
      vz *= scale;
    }

    const nextX = Math.min(
      width,
      Math.max(0, cursor.x + vx * deltaSeconds),
    );
    const nextY = Math.min(
      height,
      Math.max(0, cursor.y + vy * deltaSeconds),
    );
    const nextZ = Math.min(
      maximumZ,
      Math.max(minimumZ, cursor.z + vz * deltaSeconds),
    );

    if (attentionZoneBehavior === "open-perimeter") {
      return { ...cursor, x: nextX, y: nextY, z: nextZ, vx, vy, vz };
    }

    const constrained = keepOutsideCells(
      nextX,
      nextY,
      nextZ,
      vx,
      vy,
      vz,
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
    selectedCells,
    settings,
    attentionZoneBehavior === "protected-perimeter",
  );
}
