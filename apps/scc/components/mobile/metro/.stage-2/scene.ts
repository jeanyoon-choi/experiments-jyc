import { type Disc, type Kind, type Label, badges, edges, lineById, stations } from "./model";
import { type Network, networkBuilder } from "./physics";

// The official map as a physical network, in map units. Every station is a
// node; every line's run between two stations is a cord of small nodes laid
// along the map's own path (bends, 2호선's circle). Everything drawn hangs on
// those nodes, so moving one station moves exactly the points and lines tied
// to it. The ground — Seoul, the 한강 — belongs to the paper and stays.

// Cord stiffness (stretch), bending stiffness (two nodes apart, and through a
// station along one line), pull home per frame for stations and cord nodes,
// and cord node spacing in map units.
const STRETCH = 0.5;
const BEND = 0.2;
const STATION_HOME = 0.04;
const CORD_HOME = 0.02;
const CORD_SPACING = 5;

export type Run = {
  line: string;
  kind: Kind;
  colour: string;
  /** Cord nodes from station a to station b. */
  ids: number[];
  /** Offsets of this line's disc at each end (zero for plain stations). */
  ax: number;
  ay: number;
  bx: number;
  by: number;
};

export type Mark = {
  id: string;
  node: number;
  name: string;
  en: string | null;
  discs: Disc[] | null;
  /** Line of a plain station, for its dot. */
  line: string | null;
  label: Label;
  transfer: boolean;
  branch: boolean;
};

export type BadgeMark = { line: string; node: number; dx: number; dy: number };

export type Scene = {
  net: Network;
  runs: Run[];
  /** Runs per line, drawn as one path each. */
  byLine: Map<string, Run[]>;
  marks: Mark[];
  badges: BadgeMark[];
};

export function buildScene(): Scene {
  const builder = networkBuilder();
  const nodeOf = new Map<string, number>();
  const marks: Mark[] = [];
  for (const s of stations) {
    const node = builder.node(s.x, s.y, STATION_HOME);
    nodeOf.set(s.id, node);
    marks.push({
      id: s.id,
      node,
      name: s.name,
      en: s.en,
      discs: s.discs,
      line: s.discs ? null : s.lines[0],
      label: s.label,
      transfer: Boolean(s.discs),
      branch: s.branch,
    });
  }
  const stationAt = new Map(stations.map((s) => [s.id, s]));
  const discOffset = (id: string, line: string) => {
    const d = stationAt.get(id)?.discs?.find((x) => x.line === line);
    return d ? [d.dx, d.dy] : [0, 0];
  };

  const runs: Run[] = [];
  // Per station, the cord node next to it on each run, with that run's line.
  const nextTo = new Map<number, { node: number; line: string }[]>();
  for (const e of edges) {
    const line = lineById.get(e.line)!;
    const a = nodeOf.get(e.a)!;
    const b = nodeOf.get(e.b)!;
    const p = e.points;
    const ids = [a];
    for (let i = 2; i < p.length; i += 2) {
      const px = p[i - 2];
      const py = p[i - 1];
      const qx = p[i];
      const qy = p[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(qx - px, qy - py) / CORD_SPACING));
      for (let s = 1; s <= n; s += 1) {
        if (i === p.length - 2 && s === n) ids.push(b);
        else ids.push(builder.node(px + ((qx - px) * s) / n, py + ((qy - py) * s) / n, CORD_HOME));
      }
    }
    if (ids.length === 1) ids.push(b);
    for (let i = 1; i < ids.length; i += 1) builder.link(ids[i - 1], ids[i], STRETCH);
    for (let i = 2; i < ids.length; i += 1) builder.link(ids[i - 2], ids[i], BEND);
    const [ax, ay] = discOffset(e.a, e.line);
    const [bx, by] = discOffset(e.b, e.line);
    runs.push({ line: e.line, kind: line.kind, colour: line.colour, ids, ax, ay, bx, by });
    if (ids.length > 2) {
      nextTo.set(a, [...(nextTo.get(a) ?? []), { node: ids[1], line: e.line }]);
      nextTo.set(b, [...(nextTo.get(b) ?? []), { node: ids[ids.length - 2], line: e.line }]);
    }
  }
  // A line running through a station bends there like anywhere else on it.
  for (const list of nextTo.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (list[i].line === list[j].line) builder.link(list[i].node, list[j].node, BEND);
      }
    }
  }
  const byLine = new Map<string, Run[]>();
  for (const r of runs) byLine.set(r.line, [...(byLine.get(r.line) ?? []), r]);

  // Badges ride with the station nearest to them.
  const badgeMarks: BadgeMark[] = badges.map((b) => {
    let best = stations[0];
    let bestD = Infinity;
    for (const s of stations) {
      if (!s.lines.includes(b.line)) continue;
      const d = Math.hypot(s.x - b.x, s.y - b.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return { line: b.line, node: nodeOf.get(best.id)!, dx: b.x - best.x, dy: b.y - best.y };
  });

  return { net: builder.build(), runs, byLine, marks, badges: badgeMarks };
}
