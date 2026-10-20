import {
  TUBE_LINES,
  TUBE_ROUTES,
  TUBE_STATIONS,
  type CellAnchor,
  type Grid,
  type SelectedCell,
  type TubeLinePath,
  type TubeStation,
  type TubeStationStack,
} from "../model";

export type TubeStationMark = "dot" | "cross";

type ProjectedStation = TubeStation & { x: number; y: number };
type TubeFieldLayout = {
  cells: SelectedCell[];
  stations: ProjectedStation[];
  stationById: Map<string, ProjectedStation>;
};

const MAP_PADDING_RATIO = 0.045;
const HORIZONTAL_SCHEMATIC_STRENGTH = 7;
const VERTICAL_SCHEMATIC_STRENGTH = 9;
const lineById = new Map(TUBE_LINES.map((line) => [line.id, line]));
let cachedLayout: { width: number; height: number; value: TubeFieldLayout } | null =
  null;

function createLayout(width: number, height: number): TubeFieldLayout {
  if (
    cachedLayout &&
    cachedLayout.width === width &&
    cachedLayout.height === height
  ) {
    return cachedLayout.value;
  }

  const minimumLongitude = Math.min(...TUBE_STATIONS.map((station) => station.longitude));
  const maximumLongitude = Math.max(...TUBE_STATIONS.map((station) => station.longitude));
  const minimumLatitude = Math.min(...TUBE_STATIONS.map((station) => station.latitude));
  const maximumLatitude = Math.max(...TUBE_STATIONS.map((station) => station.latitude));
  const padding = Math.min(width, height) * MAP_PADDING_RATIO;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const longitudeCenter = median(
    TUBE_STATIONS.map((station) => station.longitude),
  );
  const latitudeCenter = median(
    TUBE_STATIONS.map((station) => station.latitude),
  );
  const targetSize = Math.max(7, Math.min(13, Math.min(width, height) / 62));
  const projectedById = new Map<string, ProjectedStation>();

  const schematicWarp = (value: number, strength: number) =>
    Math.asinh(value * strength) / Math.asinh(strength);

  for (const station of TUBE_STATIONS) {
    const normalizedX =
      station.longitude < longitudeCenter
        ? (station.longitude - longitudeCenter) /
          (longitudeCenter - minimumLongitude)
        : (station.longitude - longitudeCenter) /
          (maximumLongitude - longitudeCenter);
    const normalizedY =
      station.latitude < latitudeCenter
        ? (station.latitude - latitudeCenter) /
          (latitudeCenter - minimumLatitude)
        : (station.latitude - latitudeCenter) /
          (maximumLatitude - latitudeCenter);
    projectedById.set(station.id, {
      ...station,
      x:
        padding +
        ((schematicWarp(normalizedX, HORIZONTAL_SCHEMATIC_STRENGTH) + 1) /
          2) *
          usableWidth,
      y:
        padding +
        ((1 - schematicWarp(normalizedY, VERTICAL_SCHEMATIC_STRENGTH)) / 2) *
          usableHeight,
    });
  }

  const remainingStations = [...projectedById.values()];
  const spatialOrder: ProjectedStation[] = [];
  const minimumDistanceById = new Map<string, number>();
  const fieldCenterX = width / 2;
  const fieldCenterY = height / 2;
  let nextStation = remainingStations.reduce((closest, station) => {
    const distance =
      (station.x - fieldCenterX) ** 2 + (station.y - fieldCenterY) ** 2;
    const closestDistance =
      (closest.x - fieldCenterX) ** 2 + (closest.y - fieldCenterY) ** 2;
    return distance < closestDistance ? station : closest;
  });

  while (remainingStations.length > 0) {
    spatialOrder.push(nextStation);
    const selectedIndex = remainingStations.findIndex(
      (station) => station.id === nextStation.id,
    );
    remainingStations.splice(selectedIndex, 1);
    for (const station of remainingStations) {
      const distance =
        (station.x - nextStation.x) ** 2 + (station.y - nextStation.y) ** 2;
      minimumDistanceById.set(
        station.id,
        Math.min(minimumDistanceById.get(station.id) ?? Infinity, distance),
      );
    }
    if (remainingStations.length > 0) {
      nextStation = remainingStations.reduce((farthest, station) =>
        (minimumDistanceById.get(station.id) ?? 0) >
        (minimumDistanceById.get(farthest.id) ?? 0)
          ? station
          : farthest,
      );
    }
  }

  const cells = spatialOrder.map((projected, index) => {
    return {
      column: index,
      row: 0,
      x: projected.x - targetSize / 2,
      y: projected.y - targetSize / 2,
      width: targetSize,
      height: targetSize,
      centerX: projected.x,
      centerY: projected.y,
    };
  });
  const value = { cells, stations: spatialOrder, stationById: projectedById };
  cachedLayout = { width, height, value };
  return value;
}

export function getTubeStationCells(
  _anchors: readonly CellAnchor[],
  _grid: Grid,
  width: number,
  height: number,
) {
  return createLayout(width, height).cells;
}

export function getTubeLinePaths(
  width: number,
  height: number,
): TubeLinePath[] {
  const { stationById } = createLayout(width, height);

  return TUBE_ROUTES.flatMap((route) => {
    const line = lineById.get(route.lineId);
    if (!line) return [];
    const points = route.stationIds.flatMap((stationId) => {
      const station = stationById.get(stationId);
      return station ? [{ x: station.x, y: station.y }] : [];
    });
    return points.length >= 2
      ? [{ id: route.id, lineId: route.lineId, color: line.color, points }]
      : [];
  });
}

export function getTubeStationStacks(
  width: number,
  height: number,
): TubeStationStack[] {
  const { stations } = createLayout(width, height);

  return stations.map((station) => ({
    id: station.id,
    lineIds: station.lineIds,
    x: station.x,
    y: station.y,
  }));
}

export function drawTubeField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stationMark: TubeStationMark,
) {
  const { stationById: projectedById } = createLayout(width, height);
  const lineWidth = Math.max(2.2, Math.min(4.6, Math.min(width, height) / 185));

  context.fillStyle = "#05080c";
  context.fillRect(0, 0, width, height);
  context.globalAlpha = 1;
  if (stationMark === "cross") {
    for (const station of TUBE_STATIONS) {
      const projected = projectedById.get(station.id);
      if (!projected) continue;
      const arm = lineWidth * 1.7 + 2.2;
      context.strokeStyle = "rgba(244, 246, 247, 0.72)";
      context.lineWidth = 0.8;
      context.beginPath();
      context.moveTo(projected.x - arm, projected.y);
      context.lineTo(projected.x + arm, projected.y);
      context.moveTo(projected.x, projected.y - arm);
      context.lineTo(projected.x, projected.y + arm);
      context.stroke();
    }
  }
}
