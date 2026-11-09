import {
  type Point,
  type Segment,
  frame,
  lineById,
  linesAt,
  river,
  segments,
  stationById,
  stations,
  termini,
} from "./model";
import { type Network, networkBuilder } from "./physics";

// /1's 노선도 (서울시 2023 grammar), laid out once for the screen and turned
// into a physical network: each station a node, each link a cord of small
// nodes. Everything drawn hangs on those nodes — line paths through them,
// station dots and capsules on them, names and badges carried by their
// stations — so moving one station moves exactly the points and lines it is
// connected to. Only the 한강 belongs to the paper and stays.

export const FONT = '"Seoul Alrim", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';
export const GROUND = "#FCFCFC";
export const RIVER = "#E3F3FF";
const RIVER_TEXT = "#9CC6E6";
const INK = "#141414";
const INK_SOFT = "#3A3A3A";
const MUTED = "#6E6E6E";
export const CAPSULE = "#222222";
export const ATLAS_DPR = 2;

// Physics: cord stiffness (stretch), bending stiffness (two nodes apart, and
// through a station along one line), pull home per frame for stations and for
// cord nodes, and cord node spacing (CSS px).
const STRETCH = 0.5;
const BEND = 0.2;
const STATION_HOME = 0.04;
const CORD_HOME = 0.02;
const CORD_SPACING = 10;

export type Kind = "metro" | "double" | "dashed" | "thin";
const KIND: Record<string, Kind> = {
  "suin-bundang": "double",
  shinbundang: "double",
  "gyeongui-jungang": "double",
  airport: "double",
  "incheon-1": "double",
  "gtx-a": "double",
  gyeongchun: "dashed",
  gyeonggang: "dashed",
  seohae: "dashed",
  uijeongbu: "thin",
  "ui-sinseol": "thin",
  "gimpo-gold": "thin",
  "incheon-2": "thin",
  everline: "thin",
  sillim: "thin",
};
const kindOf = (id: string): Kind => KIND[id] ?? "metro";
const WEIGHT: Record<Kind, number> = { metro: 1, double: 0.78, dashed: 0.78, thin: 0.5 };

const BADGE_ROWS: Record<string, string[]> = {
  "suin-bundang": ["수인", "분당"],
  shinbundang: ["신분당"],
  "gyeongui-jungang": ["경의", "중앙"],
  gyeongchun: ["경춘"],
  airport: ["공항", "철도"],
  gyeonggang: ["경강"],
  seohae: ["서해"],
  "gtx-a": ["GTX", "A"],
  "incheon-1": ["인천", "1"],
  "incheon-2": ["인천", "2"],
  uijeongbu: ["의정부"],
  everline: ["용인", "에버"],
  "ui-sinseol": ["우이", "신설"],
  "gimpo-gold": ["김포", "골드"],
  sillim: ["신림"],
};

export type LineStyle = { id: string; kind: Kind; colour: string; width: number };
/** A link: the nodes of its cord from one station to the other, and its lines side by side. */
export type Run = { ids: number[]; lines: number[]; offsets: number[] };
export type Cell = { sx: number; sy: number; sw: number; sh: number };
export type Dot = { node: number; radius: number; ring: string | null };
/** A capsule lies across the cord leaving its station toward `toward`. */
export type Capsule = { node: number; toward: number; colours: string[]; r: number; step: number; pad: number; ring: number };
/** A name, carried by its station at a fixed offset. */
export type Label = Cell & { node: number; dx: number; dy: number };
/** A badge, beyond its terminus along the cord's last direction. */
export type Badge = Cell & { node: number; toward: number; reach: number };

export type Scene = {
  width: number;
  height: number;
  net: Network;
  W: number;
  styles: LineStyle[];
  runs: Run[];
  /** Runs carrying each style, for one batched path per line. */
  runsOf: number[][];
  river: { points: Float32Array; width: number };
  riverText: (Cell & { x: number; y: number; angle: number }) | null;
  dots: Dot[];
  capsules: Capsule[];
  /** Station nodes, for grabbing. */
  stationNodes: number[];
  badges: Badge[];
  labels: Label[];
  atlas: HTMLCanvasElement;
};

type Rect = { x: number; y: number; w: number; h: number };

class Occupancy {
  private cells = new Map<number, Rect[]>();
  private lineCells = new Set<number>();
  constructor(private size: number) {}
  private key(cx: number, cy: number) {
    return cx * 100003 + cy;
  }
  private span(r: Rect, f: (cx: number, cy: number) => boolean | void) {
    const s = this.size;
    for (let cx = Math.floor(r.x / s); cx <= Math.floor((r.x + r.w) / s); cx += 1) {
      for (let cy = Math.floor(r.y / s); cy <= Math.floor((r.y + r.h) / s); cy += 1) {
        if (f(cx, cy)) return true;
      }
    }
    return false;
  }
  add(r: Rect) {
    this.span(r, (cx, cy) => {
      const k = this.key(cx, cy);
      const list = this.cells.get(k);
      if (list) list.push(r);
      else this.cells.set(k, [r]);
    });
  }
  hits(r: Rect) {
    return this.span(r, (cx, cy) =>
      (this.cells.get(this.key(cx, cy)) ?? []).some(
        (o) => r.x < o.x + o.w && o.x < r.x + r.w && r.y < o.y + o.h && o.y < r.y + r.h,
      ),
    );
  }
  markLine(a: Point, b: Point, half: number) {
    const s = this.size;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(len / (s * 0.5)));
    for (let i = 0; i <= steps; i += 1) {
      const x = a[0] + ((b[0] - a[0]) * i) / steps;
      const y = a[1] + ((b[1] - a[1]) * i) / steps;
      this.span({ x: x - half, y: y - half, w: 2 * half, h: 2 * half }, (cx, cy) => {
        this.lineCells.add(this.key(cx, cy));
      });
    }
  }
  lineCost(r: Rect) {
    let n = 0;
    this.span(r, (cx, cy) => {
      if (this.lineCells.has(this.key(cx, cy))) n += 1;
    });
    return n;
  }
}

function soften(points: Point[], rounds: number): Point[] {
  let pts = points;
  for (let r = 0; r < rounds; r += 1) {
    const next: Point[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

function offsets(lines: string[], W: number) {
  const widths = lines.map((id) => W * WEIGHT[kindOf(id)]);
  const gap = W * 0.22;
  const total = widths.reduce((s, w) => s + w, 0) + gap * (lines.length - 1);
  let at = -total / 2;
  return widths.map((w) => {
    const centre = at + w / 2;
    at += w + gap;
    return centre;
  });
}

/** Names and badges, each drawn once into one canvas. */
class Atlas {
  canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private x = 0;
  private y = 0;
  private row = 0;
  private readonly size = 2048;
  constructor() {
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext("2d")!;
  }
  /** A w × h (CSS px) cell; `paint` draws with the origin at the cell's centre. */
  cell(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): Cell {
    const sw = Math.ceil(w * ATLAS_DPR) + 2;
    const sh = Math.ceil(h * ATLAS_DPR) + 2;
    if (this.x + sw > this.size) {
      this.x = 0;
      this.y += this.row;
      this.row = 0;
    }
    if (this.y + sh > this.size) throw new Error("atlas full");
    const cell = { sx: this.x, sy: this.y, sw, sh };
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.x + sw / 2, this.y + sh / 2);
    ctx.scale(ATLAS_DPR, ATLAS_DPR);
    paint(ctx);
    ctx.restore();
    this.x += sw;
    this.row = Math.max(this.row, sh);
    return cell;
  }
}

const terminusSet = new Set(termini.map((t) => t.station));
const labelOrder = [...stations].sort((a, b) => {
  const la = linesAt.get(a.id)?.length ?? 1;
  const lb = linesAt.get(b.id)?.length ?? 1;
  if (la !== lb) return lb - la;
  return (terminusSet.has(b.id) ? 1 : 0) - (terminusSet.has(a.id) ? 1 : 0);
});
const segmentsAt = new Map<string, Segment[]>();
for (const segment of segments) {
  for (const id of [segment.from, segment.to]) segmentsAt.set(id, [...(segmentsAt.get(id) ?? []), segment]);
}

/** Lays the map out for a width × height screen with the given insets. */
export function buildScene(width: number, height: number, inset: { top: number; bottom: number; left: number; right: number }): Scene {
  const SIDE = 16;
  const availW = width - 2 * SIDE - inset.left - inset.right;
  const availH = height - 2 * SIDE - inset.top - inset.bottom;
  const k = Math.min(availW / frame.w, availH / frame.h);
  const tx = inset.left + SIDE + (availW - frame.w * k) / 2 - frame.x * k;
  const ty = inset.top + SIDE + (availH - frame.h * k) / 2 - frame.y * k;
  const toScreen = (p: Point): Point => [p[0] * k + tx, p[1] * k + ty];
  const W = Math.min(12, Math.max(2, k * 0.34));
  const occupancy = new Occupancy(8);
  const atlas = new Atlas();
  const measure = atlas.canvas.getContext("2d")!;
  const builder = networkBuilder();

  // Stations first: node index = station index.
  const nodeOf = new Map<string, number>();
  const stationNodes: number[] = [];
  for (const s of stations) {
    const [x, y] = toScreen([s.x, s.y]);
    const node = builder.node(x, y, STATION_HOME);
    nodeOf.set(s.id, node);
    stationNodes.push(node);
  }

  // Cords and lines.
  const styleIndex = new Map<string, number>();
  const styles: LineStyle[] = [];
  const styleOf = (id: string) => {
    let i = styleIndex.get(id);
    if (i === undefined) {
      const kind = kindOf(id);
      i = styles.length;
      styles.push({ id, kind, colour: lineById.get(id)!.colour, width: W * WEIGHT[kind] });
      styleIndex.set(id, i);
    }
    return i;
  };
  const runs: Run[] = [];
  // Per station, the cord node next to it on each link, with that link.
  const nextTo = new Map<string, { node: number; segment: Segment }[]>();
  for (const segment of segments) {
    const pts = segment.points.map(toScreen);
    const from = nodeOf.get(segment.from)!;
    const to = nodeOf.get(segment.to)!;
    const ids = [from];
    for (let i = 1; i < pts.length; i += 1) {
      const [ax, ay] = pts[i];
      const [px, py] = pts[i - 1];
      const n = Math.max(1, Math.round(Math.hypot(ax - px, ay - py) / CORD_SPACING));
      for (let s = 1; s <= n; s += 1) {
        if (i === pts.length - 1 && s === n) ids.push(to);
        else ids.push(builder.node(px + ((ax - px) * s) / n, py + ((ay - py) * s) / n, CORD_HOME));
      }
    }
    for (let i = 1; i < ids.length; i += 1) builder.link(ids[i - 1], ids[i], STRETCH);
    for (let i = 2; i < ids.length; i += 1) builder.link(ids[i - 2], ids[i], BEND);
    nextTo.set(segment.from, [...(nextTo.get(segment.from) ?? []), { node: ids[1], segment }]);
    nextTo.set(segment.to, [...(nextTo.get(segment.to) ?? []), { node: ids[ids.length - 2], segment }]);
    const offs = offsets(segment.lines, W);
    runs.push({ ids, lines: segment.lines.map(styleOf), offsets: offs });
    const half = (offs.length ? Math.abs(offs[0]) : 0) + W / 2;
    for (let j = 1; j < pts.length; j += 1) occupancy.markLine(pts[j - 1], pts[j], half);
  }
  // A line running through a station bends there like anywhere else on it.
  for (const list of nextTo.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (list[i].segment.lines.some((l) => list[j].segment.lines.includes(l))) builder.link(list[i].node, list[j].node, BEND);
      }
    }
  }
  const runsOf = styles.map((_, i) => runs.flatMap((r, ri) => (r.lines.includes(i) ? [ri] : [])));

  // 한강, on the paper.
  const riverPts = soften(river.map(toScreen), 3);
  const riverInfo = { points: Float32Array.from(riverPts.flat()), width: W * 4.2 };

  // Station marks.
  const dots: Dot[] = [];
  const capsules: Capsule[] = [];
  const markers = new Map<string, Rect>();
  for (const s of stations) {
    const node = nodeOf.get(s.id)!;
    const [x, y] = toScreen([s.x, s.y]);
    const served = linesAt.get(s.id) ?? [];
    if (served.length > 1) {
      const incident = segmentsAt.get(s.id) ?? [];
      const main = incident.reduce((a, b) => (b.lines.length > a.lines.length ? b : a), incident[0]);
      const toward = nextTo.get(s.id)!.find((n) => n.segment === main)!.node;
      // Dots in the main link's line order, on the side its offsets put them,
      // seen from this station looking along the link.
      const forward = main.from === s.id;
      const lineOrder = forward ? main.lines : [...main.lines].reverse();
      const order = [...lineOrder, ...served.filter((l) => !main.lines.includes(l))];
      const r = W * 0.52;
      const step = 2 * r + W * 0.14;
      const pad = W * 0.2;
      const span = (order.length - 1) * step;
      capsules.push({ node, toward, colours: order.map((id) => lineById.get(id)!.colour), r, step, pad, ring: Math.max(1, W * 0.17) });
      const [p0, p1] = forward ? [main.points[0], main.points[1]] : [main.points[main.points.length - 1], main.points[main.points.length - 2]];
      let dx = p1[0] - p0[0];
      let dy = p1[1] - p0[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const hx = Math.abs(dy) * (span / 2 + r + pad) + Math.abs(dx) * (r + pad);
      const hy = Math.abs(dx) * (span / 2 + r + pad) + Math.abs(dy) * (r + pad);
      const box = { x: x - hx, y: y - hy, w: 2 * hx, h: 2 * hy };
      markers.set(s.id, box);
      occupancy.add(box);
    } else {
      const kind = kindOf(served[0]);
      const r = kind === "metro" ? W * 0.24 : W * 0.32;
      dots.push({ node, radius: r, ring: kind === "metro" ? null : lineById.get(served[0])!.colour });
      const box = { x: x - r, y: y - r, w: 2 * r, h: 2 * r };
      markers.set(s.id, box);
      occupancy.add(box);
    }
  }

  // Badges.
  const badgeR = Math.max(6.5, W * 1.3);
  const badges: Badge[] = [];
  for (const t of termini) {
    const s = stationById.get(t.station)!;
    const [x, y] = toScreen([s.x, s.y]);
    const line = lineById.get(t.line)!;
    const marker = markers.get(s.id);
    const edge = marker ? Math.abs(t.out[0]) * (marker.w / 2) + Math.abs(t.out[1]) * (marker.h / 2) : W;
    let reach = 0;
    for (const extra of [0, 1.2, 2.4, 3.6]) {
      reach = edge + W * 0.6 + badgeR * (1 + extra);
      const cx = x + t.out[0] * reach;
      const cy = y + t.out[1] * reach;
      if (!occupancy.hits({ x: cx - badgeR, y: cy - badgeR, w: 2 * badgeR, h: 2 * badgeR })) break;
    }
    occupancy.add({ x: x + t.out[0] * reach - badgeR, y: y + t.out[1] * reach - badgeR, w: 2 * badgeR, h: 2 * badgeR });
    const toward = nextTo.get(s.id)!.find((n) => n.segment.lines.includes(t.line))!.node;
    const cell = atlas.cell(2 * badgeR, 2 * badgeR, (ctx) => {
      ctx.beginPath();
      ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = line.colour;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const rows = BADGE_ROWS[line.id];
      if (!rows) {
        ctx.font = `700 ${badgeR * 1.2}px ${FONT}`;
        ctx.fillText(line.badge, 0, badgeR * 0.05);
      } else {
        const longest = Math.max(...rows.map((row) => [...row].length));
        const fs = badgeR * (rows.length === 2 ? (longest > 2 ? 0.5 : 0.62) : longest > 2 ? 0.56 : 0.78);
        ctx.font = `700 ${fs}px ${FONT}`;
        rows.forEach((row, i) => ctx.fillText(row, 0, (i - (rows.length - 1) / 2) * fs * 1.02 + fs * 0.04));
      }
    });
    badges.push({ node: nodeOf.get(s.id)!, toward, reach, ...cell });
  }

  const fsN = Math.min(14, Math.max(8, k * 1.25));
  const fsT = fsN * 1.16;
  const HALO = 1.25;

  // 한강 Han River along its longest reach.
  let riverText: Scene["riverText"] = null;
  {
    let best = 0;
    let bi = 0;
    for (let i = 1; i < riverPts.length; i += 1) {
      const l = Math.hypot(riverPts[i][0] - riverPts[i - 1][0], riverPts[i][1] - riverPts[i - 1][1]);
      const [mx, my] = [(riverPts[i][0] + riverPts[i - 1][0]) / 2, (riverPts[i][1] + riverPts[i - 1][1]) / 2];
      if (l > best && mx > 0 && my > 0 && mx < width && my < height) {
        best = l;
        bi = i;
      }
    }
    if (bi) {
      const [ax, ay] = riverPts[bi - 1];
      const [bx, by] = riverPts[bi];
      let angle = Math.atan2(by - ay, bx - ax);
      if (angle > Math.PI / 2) angle -= Math.PI;
      if (angle < -Math.PI / 2) angle += Math.PI;
      const font = `500 ${fsN}px ${FONT}`;
      measure.font = font;
      const w = measure.measureText("한강 Han River").width;
      const cell = atlas.cell(w + 2, fsN * 1.3, (ctx) => {
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = RIVER_TEXT;
        ctx.fillText("한강 Han River", 0, 0);
      });
      riverText = { ...cell, x: (ax + bx) / 2, y: (ay + by) / 2, angle };
    }
  }

  // Station names, placed exactly as /1 places them, then carried by their station.
  const labels: Label[] = [];
  const enFs = fsT * 0.56;
  const showEn = enFs >= 5.5;
  for (const s of labelOrder) {
    const [x, y] = toScreen([s.x, s.y]);
    if (x < 0 || y < 0 || x > width || y > height) continue;
    const transfer = (linesAt.get(s.id)?.length ?? 1) > 1;
    const fs = transfer ? fsT : fsN;
    const font = `${transfer ? 700 : 400} ${fs}px ${FONT}`;
    const enFont = `400 ${enFs}px ${FONT}`;
    const en = transfer && showEn && s.en ? s.en : null;
    measure.font = font;
    const nameW = measure.measureText(s.name).width;
    measure.font = enFont;
    const enW = en ? measure.measureText(en).width : 0;
    const w = Math.max(nameW, enW);
    const h = fs * 1.12 + (en ? enFs * 1.15 : 0);
    const m = markers.get(s.id) ?? { x, y, w: 0, h: 0 };
    const gap = 2;
    const left = m.x - gap;
    const right = m.x + m.w + gap;
    const top = m.y - gap;
    const bottom = m.y + m.h + gap;
    const candidates: [number, number][] = [
      [right, y - h / 2],
      [left - w, y - h / 2],
      [x - w / 2, top - h],
      [x - w / 2, bottom],
      [right, top - h + fs * 0.35],
      [right, bottom - fs * 0.35],
      [left - w, top - h + fs * 0.35],
      [left - w, bottom - fs * 0.35],
    ];
    let best: Rect | null = null;
    let bestScore = Infinity;
    candidates.forEach(([cx, cy], i) => {
      const box = { x: cx, y: cy, w, h };
      if (cx < 2 || cy < 2 || cx + w > width - 2 || cy + h > height - 2) return;
      if (occupancy.hits(box)) return;
      const score = occupancy.lineCost(box) + i * 0.15;
      if (score < bestScore) {
        bestScore = score;
        best = box;
      }
    });
    if (!best) continue;
    const box: Rect = best;
    occupancy.add(box);
    const align = box.x + w <= x ? "right" : box.x >= x ? "left" : "center";
    const cell = atlas.cell(w + 2 * HALO + 1, h + 2 * HALO, (ctx) => {
      ctx.textBaseline = "top";
      ctx.textAlign = align;
      ctx.lineJoin = "round";
      ctx.lineWidth = HALO * 2;
      ctx.strokeStyle = GROUND;
      const ax = align === "right" ? w / 2 : align === "left" ? -w / 2 : 0;
      const top = -h / 2;
      ctx.font = font;
      ctx.strokeText(s.name, ax, top);
      ctx.fillStyle = transfer ? INK : INK_SOFT;
      ctx.fillText(s.name, ax, top);
      if (en) {
        ctx.font = enFont;
        ctx.strokeText(en, ax, top + fs * 1.12);
        ctx.fillStyle = MUTED;
        ctx.fillText(en, ax, top + fs * 1.12);
      }
    });
    labels.push({ node: nodeOf.get(s.id)!, dx: box.x + w / 2 - x, dy: box.y + h / 2 - y, ...cell });
  }

  return {
    width,
    height,
    net: builder.build(),
    W,
    styles,
    runs,
    runsOf,
    river: riverInfo,
    riverText,
    dots,
    capsules,
    stationNodes,
    badges,
    labels,
    atlas: atlas.canvas,
  };
}
