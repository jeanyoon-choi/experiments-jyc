import data from "./official.json";

// 서울시's 2026 서울 지하철 노선도, read off the published map image by
// ../extract (station positions, line paths, interchange discs, label
// placements, the 한강 and Seoul's boundary) over /1's OpenStreetMap topology.
// One map unit is one pixel of the 2555 × 2560 published image; north is up.

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

/** Where an interchange shows one line: a disc at this offset from the station. */
export type Disc = { line: string; dx: number; dy: number };

/**
 * A name as the map sets it: pen origins (left end of the baseline) of the
 * Korean and English relative to the station, their sizes (map units) and
 * tracking (em), as matched on the published map. `split` breaks the Korean
 * in two lines at that character, aligned as given.
 */
export type Label = {
  kx: number;
  ky: number;
  ks: number;
  kt: number;
  ex: number;
  ey: number;
  es: number;
  et: number;
  split: [number, "left" | "center" | "right"] | null;
};

export type Station = {
  id: string;
  name: string;
  en: string | null;
  x: number;
  y: number;
  lines: string[];
  /** Interchanges only: one disc per line, in the map's order. */
  discs: Disc[] | null;
  /** Where a line branches: drawn as a ringed dot. */
  branch: boolean;
  label: Label;
};

/** One line's run between two stations: map polyline, flat x, y pairs. */
export type Edge = { line: string; a: string; b: string; points: number[] };

export type Badge = { line: string; x: number; y: number };

type Raw = {
  source: string;
  size: [number, number];
  ground: { seoul: number[][]; river: number[][]; sea: number[][] };
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
