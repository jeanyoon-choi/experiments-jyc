import data from "./official.json";

// 서울시's 2026 서울 지하철 노선도, read off the published 7089-px map by
// ../extract (station dots and interchange discs, line paths, every name row,
// Seoul's field and the water) over /1's OpenStreetMap topology. One map unit
// is one pixel of the 2555 × 2560 web edition of the same image; north is up.

export type Kind = "metro" | "double" | "dashed" | "light";

export type Line = {
  id: string;
  name: string;
  en: string;
  /** Badge text rows, e.g. ["1"] or ["수인", "분당"]. */
  badge: string[];
  colour: string;
  kind: Kind;
};

/** One disc of a station's capsule: a line's colour at this offset from the station. */
export type Disc = { line: string; dx: number; dy: number };

/**
 * One run of text as the map sets it: the text, its pen origin (left end of
 * the baseline) relative to the station, its size in map units and its
 * 서울알림체 weight. A name is a few rows: Korean in one or two lines,
 * sometimes a smaller second name in brackets, English in one to three lines.
 */
export type Row = [text: string, x: number, y: number, size: number, weight: number];

export type Station = {
  id: string;
  name: string;
  en: string | null;
  x: number;
  y: number;
  lines: string[];
  /** Capsule discs in the map's order: interchanges, and the seven single-line stations the map rings (구로, 성수 …). */
  discs: Disc[] | null;
  label: { rows: Row[] };
};

/**
 * One line's run between two stations: map polyline, flat x, y pairs. Its ends
 * are where the line itself passes each station — under a capsule that is
 * rarely the centre of the line's own disc.
 */
export type Edge = { line: string; a: string; b: string; points: number[] };

export type Badge = { line: string; x: number; y: number };

type Raw = {
  source: string;
  size: [number, number];
  /** Closed outlines, filled even-odd: Seoul's white field; the 한강 and the sea. */
  ground: { seoul: number[][]; water: number[][] };
  lines: Line[];
  stations: Station[];
  edges: Edge[];
  badges: Badge[];
};

const raw = data as unknown as Raw;

export const size = raw.size;
export const ground = raw.ground;
export const lines = raw.lines;
export const stations = raw.stations;
export const edges = raw.edges;
export const badges = raw.badges;
export const lineById = new Map(lines.map((l) => [l.id, l]));
export const stationById = new Map(stations.map((s) => [s.id, s]));
