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

// The /1 노선도 (서울시 2023 grammar) resolved once into a display list whose
// every coordinate is a point in one Float32Array, so a deformation of the
// plane is a pass over that array. Lines are sampled densely enough to bend;
// each glyph carries two probe points that give the local Jacobian, so text
// turns, shears and squeezes with the space it sits in.

export const FONT = '"Seoul Alrim", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';
export const GROUND = "#FCFCFC";
export const RIVER = "#E3F3FF";
const RIVER_TEXT = "#9CC6E6";
const INK = "#141414";
const INK_SOFT = "#3A3A3A";
const MUTED = "#6E6E6E";
export const CAPSULE = "#222222";

/** Distance of a glyph's probe points from its centre (CSS px). */
export const PROBE = 4;
/** Longest straight piece of a sampled line (CSS px). */
const SAMPLE = 5;
/** Glyph atlas resolution. */
export const ATLAS_DPR = 2;

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
/** A sampled link: its centreline's points, in order, and the lines on it side by side. */
export type Run = { ids: number[]; lines: number[]; offsets: number[] };
export type Dot = { point: number; radius: number; ring: string | null };
export type Capsule = { point: number; probe: number; colours: string[]; r: number; step: number; pad: number; ring: number };
/** An atlas cell drawn centred on `point`, its axes along the two probes. */
export type Sprite = { point: number; px: number; py: number; sx: number; sy: number; sw: number; sh: number };

export type Scene = {
  width: number;
  height: number;
  /** x, y pairs in CSS px: the drawn positions; grows as lines refine. */
  points: Float32Array;
  /** The same points as they stood when the current touches began. */
  rest: Float32Array;
  count: number;
  W: number;
  styles: LineStyle[];
  runs: Run[];
  /** Runs carrying each style, for one batched path per line. */
  runsOf: number[][];
  river: { ids: number[]; width: number };
  dots: Dot[];
  capsules: Capsule[];
  /** Station id → its point, for grabbing. */
  stationPoint: Map<string, number>;
  badges: Sprite[];
  glyphs: Sprite[];
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

/** Glyph and badge images, each drawn once. */
class Atlas {
  canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private cells = new Map<string, { sx: number; sy: number; sw: number; sh: number }>();
  private x = 0;
  private y = 0;
  private row = 0;
  private readonly size = 2048;
  constructor() {
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext("2d")!;
  }
  /** Reserves a w × h (CSS px) cell and draws into it, centred, with `paint`. */
  cell(key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const found = this.cells.get(key);
    if (found) return found;
    const sw = Math.ceil(w * ATLAS_DPR) + 2;
    const sh = Math.ceil(h * ATLAS_DPR) + 2;
    if (this.x + sw > this.size) {
      this.x = 0;
      this.y += this.row;
      this.row = 0;
    }
    if (this.y + sh > this.size) throw new Error("glyph atlas full");
    const c = { sx: this.x, sy: this.y, sw, sh };
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.x + sw / 2, this.y + sh / 2);
    ctx.scale(ATLAS_DPR, ATLAS_DPR);
    paint(ctx);
    ctx.restore();
    this.cells.set(key, c);
    this.x += sw;
    this.row = Math.max(this.row, sh);
    return c;
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

  const xs: number[] = [];
  const add = (x: number, y: number) => {
    xs.push(x, y);
    return xs.length / 2 - 1;
  };
  const occupancy = new Occupancy(8);
  const atlas = new Atlas();
  const measure = atlas.canvas.getContext("2d")!;

  // 한강, sampled.
  const riverPts = soften(river.map(toScreen), 3);
  const sample = (pts: Point[]) => {
    const ids = [add(pts[0][0], pts[0][1])];
    for (let i = 1; i < pts.length; i += 1) {
      const [ax, ay] = pts[i];
      const [px, py] = pts[i - 1];
      const n = Math.max(1, Math.ceil(Math.hypot(ax - px, ay - py) / SAMPLE));
      for (let s = 1; s <= n; s += 1) ids.push(add(px + ((ax - px) * s) / n, py + ((ay - py) * s) / n));
    }
    return ids;
  };
  const riverInfo = { ids: sample(riverPts), width: W * 4.2 };

  // Lines.
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
  for (const segment of segments) {
    const pts = segment.points.map(toScreen);
    const ids = sample(pts);
    const offs = offsets(segment.lines, W);
    runs.push({ ids, lines: segment.lines.map(styleOf), offsets: offs });
    const half = (offs.length ? Math.abs(offs[0]) : 0) + W / 2;
    for (let j = 1; j < pts.length; j += 1) occupancy.markLine(pts[j - 1], pts[j], half);
  }
  const runsOf = styles.map((_, i) => runs.flatMap((r, ri) => (r.lines.includes(i) ? [ri] : [])));

  // Stations.
  const dots: Dot[] = [];
  const capsules: Capsule[] = [];
  const stationPoint = new Map<string, number>();
  const markers = new Map<string, Rect>();
  for (const s of stations) {
    const [x, y] = toScreen([s.x, s.y]);
    const point = add(x, y);
    stationPoint.set(s.id, point);
    const served = linesAt.get(s.id) ?? [];
    if (served.length > 1) {
      const incident = segmentsAt.get(s.id) ?? [];
      const main = incident.reduce((a, b) => (b.lines.length > a.lines.length ? b : a), incident[0]);
      const [p0, p1] =
        main.from === s.id
          ? [main.points[0], main.points[1]]
          : [main.points[main.points.length - 1], main.points[main.points.length - 2]];
      const sign = main.from === s.id ? 1 : -1;
      let dx = (p1[0] - p0[0]) * sign;
      let dy = (p1[1] - p0[1]) * sign;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const ux = -dy;
      const uy = dx;
      const order = [...main.lines, ...served.filter((l) => !main.lines.includes(l))];
      const r = W * 0.52;
      const step = 2 * r + W * 0.14;
      const pad = W * 0.2;
      const span = (order.length - 1) * step;
      const probe = add(x + ux * PROBE, y + uy * PROBE);
      capsules.push({ point, probe, colours: order.map((id) => lineById.get(id)!.colour), r, step, pad, ring: Math.max(1, W * 0.17) });
      const hx = Math.abs(ux) * (span / 2 + r + pad) + Math.abs(uy) * (r + pad);
      const hy = Math.abs(uy) * (span / 2 + r + pad) + Math.abs(ux) * (r + pad);
      const box = { x: x - hx, y: y - hy, w: 2 * hx, h: 2 * hy };
      markers.set(s.id, box);
      occupancy.add(box);
    } else {
      const kind = kindOf(served[0]);
      const r = kind === "metro" ? W * 0.24 : W * 0.32;
      dots.push({ point, radius: r, ring: kind === "metro" ? null : lineById.get(served[0])!.colour });
      const box = { x: x - r, y: y - r, w: 2 * r, h: 2 * r };
      markers.set(s.id, box);
      occupancy.add(box);
    }
  }

  // Badges.
  const badgeR = Math.max(6.5, W * 1.3);
  const badges: Sprite[] = [];
  for (const t of termini) {
    const s = stationById.get(t.station)!;
    const [x, y] = toScreen([s.x, s.y]);
    const line = lineById.get(t.line)!;
    const marker = markers.get(s.id);
    const reach = marker ? Math.abs(t.out[0]) * (marker.w / 2) + Math.abs(t.out[1]) * (marker.h / 2) : W;
    let cx = 0;
    let cy = 0;
    for (const extra of [0, 1.2, 2.4, 3.6]) {
      cx = x + t.out[0] * (reach + W * 0.6 + badgeR * (1 + extra));
      cy = y + t.out[1] * (reach + W * 0.6 + badgeR * (1 + extra));
      if (!occupancy.hits({ x: cx - badgeR, y: cy - badgeR, w: 2 * badgeR, h: 2 * badgeR })) break;
    }
    occupancy.add({ x: cx - badgeR, y: cy - badgeR, w: 2 * badgeR, h: 2 * badgeR });
    const cell = atlas.cell(`badge|${line.id}|${badgeR}`, 2 * badgeR, 2 * badgeR, (ctx) => {
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
    const point = add(cx, cy);
    badges.push({ point, px: add(cx + PROBE, cy), py: add(cx, cy + PROBE), ...cell });
  }

  // Text, one sprite per glyph laid along a baseline (ex) with its up (ey).
  const glyphs: Sprite[] = [];
  const HALO = 1.25;
  const setText = (
    text: string,
    font: string,
    size: number,
    colour: string,
    halo: string | null,
    originX: number,
    originY: number,
    ex: Point,
  ) => {
    measure.font = font;
    const ey: Point = [-ex[1], ex[0]];
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === " ") continue;
      const before = measure.measureText(text.slice(0, i)).width;
      const w = measure.measureText(ch).width;
      const cw = w + 2 * HALO + 1;
      const chh = size * 1.3 + 2 * HALO;
      const cell = atlas.cell(`${font}|${colour}|${halo ?? ""}|${ch}`, cw, chh, (ctx) => {
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (halo) {
          ctx.lineJoin = "round";
          ctx.lineWidth = HALO * 2;
          ctx.strokeStyle = halo;
          ctx.strokeText(ch, 0, 0);
        }
        ctx.fillStyle = colour;
        ctx.fillText(ch, 0, 0);
      });
      // Glyph centre: along the baseline by its advance, down by half a line.
      const along = before + w / 2;
      const down = size * 0.56;
      const gx = originX + ex[0] * along + ey[0] * down;
      const gy = originY + ex[1] * along + ey[1] * down;
      const point = add(gx, gy);
      glyphs.push({ point, px: add(gx + ex[0] * PROBE, gy + ex[1] * PROBE), py: add(gx + ey[0] * PROBE, gy + ey[1] * PROBE), ...cell });
    }
    return measure.measureText(text).width;
  };

  const fsN = Math.min(14, Math.max(8, k * 1.25));
  const fsT = fsN * 1.16;

  // 한강 Han River along its longest reach.
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
      const ex: Point = [Math.cos(angle), Math.sin(angle)];
      const font = `500 ${fsN}px ${FONT}`;
      measure.font = font;
      const total = measure.measureText("한강 Han River").width;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      // Origin is the text box's top-left on the rotated baseline.
      const ox = mx - ex[0] * (total / 2) - -ex[1] * (fsN * 0.56);
      const oy = my - ex[1] * (total / 2) - ex[0] * (fsN * 0.56);
      setText("한강 Han River", font, fsN, RIVER_TEXT, null, ox, oy, ex);
    }
  }

  // Station names, placed exactly as /1 places them.
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
    const lineStart = (lw: number) => (align === "right" ? box.x + w - lw : align === "left" ? box.x : box.x + (w - lw) / 2);
    setText(s.name, font, fs, transfer ? INK : INK_SOFT, GROUND, lineStart(nameW), box.y, [1, 0]);
    if (en) setText(en, enFont, enFs, MUTED, GROUND, lineStart(enW), box.y + fs * 1.12, [1, 0]);
  }

  return {
    width,
    height,
    points: (() => {
      const buffer = new Float32Array(xs.length * 2);
      buffer.set(xs);
      return buffer;
    })(),
    rest: (() => {
      const buffer = new Float32Array(xs.length * 2);
      buffer.set(xs);
      return buffer;
    })(),
    count: xs.length / 2,
    W,
    styles,
    runs,
    runsOf,
    river: riverInfo,
    dots,
    capsules,
    stationPoint,
    badges,
    glyphs,
    atlas: atlas.canvas,
  };
}

// A touch drags the plane from where it went down (c0) to where the finger
// is (c1). The move is a flow along the straight path c0 → c1: in each of a
// few sub-steps every point within R is carried by (1 − r²/R²)² of the step,
// the moving centre by all of it, so a grabbed station stays under the
// finger. Sub-steps move less than STEP·R, far below the 0.65 R at which this
// kernel could fold, so each is a homeomorphism and so is the whole: no line
// crosses another and no name crosses a line, however far a station goes.
// R grows with the drag (KAPPA · |c1 − c0|): the deformation of a long drag
// is a scaled copy of a short one, so its distortion stays bounded (measured
// stretch ≤ 3.3×, area ≥ 0.28×) instead of piling the map into slivers ahead
// of the finger.
const KAPPA = 1.2;
const STEP = 0.1;

/** Copies the reference state (`rest`) into the drawn state. */
export function restore(scene: Scene) {
  scene.points.set(scene.rest.subarray(0, scene.count * 2));
}

/** Makes the drawn state the new reference, when a finger lifts or lands. */
export function settle(scene: Scene) {
  scene.rest.set(scene.points.subarray(0, scene.count * 2));
}

export function flow(scene: Scene, c0x: number, c0y: number, c1x: number, c1y: number, reach: number) {
  const distance = Math.hypot(c1x - c0x, c1y - c0y);
  if (distance < 1e-3) return;
  const radius = Math.max(reach, KAPPA * distance);
  const steps = Math.max(1, Math.ceil(distance / (STEP * radius)));
  const sx = (c1x - c0x) / steps;
  const sy = (c1y - c0y) / steps;
  const r2 = radius * radius;
  const inv = 1 / r2;
  const p = scene.points;
  const n = scene.count * 2;
  let x = c0x;
  let y = c0y;
  for (let s = 0; s < steps; s += 1) {
    for (let i = 0; i < n; i += 2) {
      const ex = p[i] - x;
      if (ex > radius || ex < -radius) continue;
      const ey = p[i + 1] - y;
      if (ey > radius || ey < -radius) continue;
      const d2 = ex * ex + ey * ey;
      if (d2 >= r2) continue;
      const q = 1 - d2 * inv;
      const f = q * q;
      p[i] += sx * f;
      p[i + 1] += sy * f;
    }
    x += sx;
    y += sy;
  }
}

/** Longest gap (CSS px) left between neighbouring samples of a line. */
const MAX_GAP = 8;
const MAX_INSERTS = 4000;

function grow(scene: Scene) {
  const points = new Float32Array(scene.points.length * 2);
  points.set(scene.points);
  scene.points = points;
  const rest = new Float32Array(scene.rest.length * 2);
  rest.set(scene.rest);
  scene.rest = rest;
}

/**
 * Where a deformation stretched a line, its straight chords would cut
 * corners. Each gap wider than MAX_GAP gets a new sample at the midpoint of
 * its two neighbours in the reference state — on the line as drawn before
 * the touch — and the caller flows the frame again so the new sample lands
 * exactly where the deformation puts it. Returns the number inserted.
 */
export function refine(scene: Scene) {
  let inserted = 0;
  const lists = [scene.river.ids, ...scene.runs.map((r) => r.ids)];
  for (const ids of lists) {
    for (let i = 0; i < ids.length - 1 && inserted < MAX_INSERTS; i += 1) {
      const p = scene.points;
      const a = ids[i] * 2;
      const b = ids[i + 1] * 2;
      const dx = p[b] - p[a];
      const dy = p[b + 1] - p[a + 1];
      if (dx * dx + dy * dy <= MAX_GAP * MAX_GAP) continue;
      const r = scene.rest;
      // Already as fine as the reference allows: leave it.
      if (Math.abs(r[b] - r[a]) + Math.abs(r[b + 1] - r[a + 1]) < 0.05) continue;
      if ((scene.count + 1) * 2 > scene.points.length) grow(scene);
      const id = scene.count;
      const { points, rest } = scene;
      rest[id * 2] = (rest[a] + rest[b]) / 2;
      rest[id * 2 + 1] = (rest[a + 1] + rest[b + 1]) / 2;
      points[id * 2] = (points[a] + points[b]) / 2;
      points[id * 2 + 1] = (points[a + 1] + points[b + 1]) / 2;
      scene.count += 1;
      ids.splice(i + 1, 0, id);
      inserted += 1;
      i -= 1;
    }
  }
  return inserted;
}
