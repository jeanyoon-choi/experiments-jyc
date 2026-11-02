import data from "./network.json";

// 수도권 전철 as of OpenStreetMap on 2026-11-02, laid out by ../../extract.
// Coordinates are schematic map units (one unit ≈ the shortest station
// spacing), already turned 90° clockwise: west at the top, north to the right.

export type Point = readonly [number, number];

export type Station = {
  id: string;
  name: string;
  en: string | null;
  x: number;
  y: number;
};

export type Line = {
  id: string;
  name: string;
  badge: string;
  colour: string;
};

/** One station-to-station link, shared by every line that runs it. */
export type Segment = {
  id: string;
  /** Oriented so the drawing's left side is the same along a straight run. */
  from: string;
  to: string;
  /** Polyline from `from` to `to`: an octilinear bend or 2호선's arc. */
  points: Point[];
  /** Line ids in map order; index sets the parallel offset. */
  lines: string[];
};

export type Terminus = {
  line: string;
  station: string;
  /** Unit vector pointing out of the line, away from its last link. */
  out: Point;
};

type RawLine = Line & { edges: (string | number[])[][] };
type Frame = { x: number; y: number; w: number; h: number };
type RawNetwork = { source: string; frame?: Frame; river: number[][]; stations: Station[]; lines: RawLine[] };

const raw = data as unknown as RawNetwork;

export const stations: Station[] = raw.stations;
export const lines: Line[] = raw.lines.map(({ id, name, badge, colour }) => ({ id, name, badge, colour }));
export const stationById = new Map(stations.map((s) => [s.id, s]));
export const lineById = new Map(lines.map((l) => [l.id, l]));
const lineOrder = new Map(lines.map((l, i) => [l.id, i]));

function orient(a: Station, b: Station) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx > 1e-6 || (Math.abs(dx) <= 1e-6 && dy > 0);
}

const segmentMap = new Map<string, Segment>();
for (const line of raw.lines) {
  for (const edge of line.edges) {
    const [a, b, via] = edge as [string, string, number[][] | undefined];
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    let segment = segmentMap.get(key);
    if (!segment) {
      const sa = stationById.get(a)!;
      const sb = stationById.get(b)!;
      const forward = orient(sa, sb);
      const [from, to] = forward ? [sa, sb] : [sb, sa];
      const mid = (via ?? []).map(([x, y]) => [x, y] as const);
      const points: Point[] = [[from.x, from.y], ...(forward ? mid : mid.reverse()), [to.x, to.y]];
      segment = { id: key, from: from.id, to: to.id, points, lines: [] };
      segmentMap.set(key, segment);
    }
    segment.lines.push(line.id);
  }
}
export const segments: Segment[] = [...segmentMap.values()];
for (const segment of segments) {
  segment.lines.sort((a, b) => lineOrder.get(a)! - lineOrder.get(b)!);
}

/** Lines serving each station, in map order. */
export const linesAt = new Map<string, string[]>();
/** Most lines running side by side on any link at the station. */
export const widestAt = new Map<string, number>();
for (const segment of segments) {
  for (const id of [segment.from, segment.to]) {
    const set = new Set(linesAt.get(id) ?? []);
    segment.lines.forEach((l) => set.add(l));
    linesAt.set(id, [...set].sort((a, b) => lineOrder.get(a)! - lineOrder.get(b)!));
    widestAt.set(id, Math.max(widestAt.get(id) ?? 1, segment.lines.length));
  }
}

export const termini: Terminus[] = [];
for (const line of lines) {
  const incident = new Map<string, Segment[]>();
  for (const segment of segments) {
    if (!segment.lines.includes(line.id)) continue;
    for (const id of [segment.from, segment.to]) {
      incident.set(id, [...(incident.get(id) ?? []), segment]);
    }
  }
  for (const [station, list] of incident) {
    if (list.length !== 1) continue;
    const segment = list[0];
    const pts = segment.from === station ? segment.points : [...segment.points].reverse();
    const [sx, sy] = pts[0];
    const [nx, ny] = pts[1];
    const len = Math.hypot(sx - nx, sy - ny) || 1;
    termini.push({ line: line.id, station, out: [(sx - nx) / len, (sy - ny) / len] });
  }
}

export const bounds = (() => {
  const xs = stations.map((s) => s.x);
  const ys = stations.map((s) => s.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
})();

/** The portrait frame the map is composed for, 2호선's circle at its centre. */
export const frame: Frame = raw.frame ?? {
  x: bounds.minX,
  y: bounds.minY,
  w: bounds.maxX - bounds.minX,
  h: bounds.maxY - bounds.minY,
};

export const source = raw.source;

/** 한강, west to east, through the middle of every link that bridges it. */
export const river: Point[] = raw.river.map(([x, y]) => [x, y] as const);
