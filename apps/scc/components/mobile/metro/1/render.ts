import {
  type Point,
  type Segment,
  lineById,
  linesAt,
  river,
  segments,
  stationById,
  stations,
  termini,
} from "./model";

// Drawing grammar of 서울시's 2023 서울 지하철 노선도: off-white ground, a
// pale 한강 band, 1–9호선 as full-weight lines, 광역철도 as hollow double
// lines, 경춘·경강·서해 with a dashed core, 경전철 as thin lines, ordinary
// stations as white dots, interchanges as a "traffic light" — one dot per
// line in a dark capsule — and round line badges at the ends.

/** screen = world · k + (tx, ty), in CSS pixels. */
export type View = { k: number; tx: number; ty: number };

const FONT = '"Seoul Alrim", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';
const GROUND = "#FCFCFC";
const RIVER = "#E3F3FF";
const RIVER_TEXT = "#9CC6E6";
const INK = "#141414";
const INK_SOFT = "#3A3A3A";
const MUTED = "#6E6E6E";
const CAPSULE = "#222222";

type Kind = "metro" | "double" | "dashed" | "thin";
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

// Badge text, split into the two stacked rows the official badges use.
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

type Rect = { x: number; y: number; w: number; h: number };

const terminusSet = new Set(termini.map((t) => t.station));
// Labels claim space in this order: big interchanges, line ends, the rest.
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

function offsetPolyline(points: Point[], d: number): Point[] {
  if (d === 0) return points;
  const normals: (readonly [number, number])[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const len = Math.hypot(dx, dy) || 1;
    normals.push([-dy / len, dx / len]);
  }
  return points.map((p, i) => {
    const before = normals[Math.max(0, i - 1)];
    const after = normals[Math.min(normals.length - 1, i)];
    let nx = before[0] + after[0];
    let ny = before[1] + after[1];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const cos = nx * after[0] + ny * after[1];
    const m = d / Math.max(0.5, cos);
    return [p[0] + nx * m, p[1] + ny * m] as const;
  });
}

/** Parallel offsets of the lines on a link, outer edges touching with a gap. */
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

/** Chaikin corner cutting: the river's octilinear corners turn soft. */
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

const widthCache = new Map<string, number>();
function textWidth(ctx: CanvasRenderingContext2D, font: string, text: string) {
  const key = `${font}|${text}`;
  let w = widthCache.get(key);
  if (w === undefined) {
    ctx.font = font;
    w = ctx.measureText(text).width;
    widthCache.set(key, w);
  }
  return w;
}

function strokePath(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let j = 1; j < pts.length; j += 1) ctx.lineTo(pts[j][0], pts[j][1]);
  ctx.stroke();
}

export function draw(ctx: CanvasRenderingContext2D, width: number, height: number, view: View) {
  const { k, tx, ty } = view;
  const toScreen = (p: Point): Point => [p[0] * k + tx, p[1] * k + ty];
  // Full line weight for 1–9호선; everything else is a fraction of it.
  const W = Math.min(12, Math.max(2, k * 0.34));
  const occupancy = new Occupancy(8);

  ctx.setLineDash([]);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, width, height);

  // 한강.
  const riverPts = soften(river.map(toScreen), 3);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = RIVER;
  ctx.lineWidth = W * 4.2;
  strokePath(ctx, riverPts);

  // Lines, each in its hierarchy's form.
  for (const segment of segments) {
    const pts = segment.points.map(toScreen);
    const offs = offsets(segment.lines, W);
    segment.lines.forEach((id, i) => {
      const kind = kindOf(id);
      const w = W * WEIGHT[kind];
      const path = offsetPolyline(pts, offs[i]);
      const colour = lineById.get(id)!.colour;
      ctx.lineCap = "round";
      ctx.setLineDash([]);
      ctx.strokeStyle = colour;
      ctx.lineWidth = w;
      strokePath(ctx, path);
      if (kind === "double") {
        ctx.strokeStyle = GROUND;
        ctx.lineWidth = w * 0.44;
        strokePath(ctx, path);
      } else if (kind === "dashed") {
        ctx.lineCap = "butt";
        ctx.strokeStyle = GROUND;
        ctx.lineWidth = w * 0.3;
        ctx.setLineDash([w * 1.3, w * 1.3]);
        strokePath(ctx, path);
        ctx.setLineDash([]);
      }
    });
    const half = (offs.length ? Math.abs(offs[0]) : 0) + W / 2;
    for (let j = 1; j < pts.length; j += 1) occupancy.markLine(pts[j - 1], pts[j], half);
  }

  // Stations.
  const markers = new Map<string, Rect>();
  for (const s of stations) {
    const [x, y] = toScreen([s.x, s.y]);
    const served = linesAt.get(s.id) ?? [];
    if (served.length > 1) {
      // Traffic light: the dots lie across the busiest link through the
      // station, in that link's line order, so each dot sits on its line.
      const incident = segmentsAt.get(s.id) ?? [];
      const main = incident.reduce((a, b) => (b.lines.length > a.lines.length ? b : a), incident[0]);
      const [p0, p1] = main.from === s.id ? [main.points[0], main.points[1]] : [main.points[main.points.length - 1], main.points[main.points.length - 2]];
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
      const angle = Math.atan2(uy, ux);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.roundRect(-span / 2 - r - pad, -r - pad, span + 2 * (r + pad), 2 * (r + pad), r + pad);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = Math.max(1, W * 0.17);
      ctx.strokeStyle = CAPSULE;
      ctx.stroke();
      order.forEach((id, i) => {
        ctx.beginPath();
        ctx.arc(-span / 2 + i * step, 0, r * 0.86, 0, Math.PI * 2);
        ctx.fillStyle = lineById.get(id)!.colour;
        ctx.fill();
      });
      ctx.restore();
      const hx = Math.abs(ux) * (span / 2 + r + pad) + Math.abs(uy) * (r + pad);
      const hy = Math.abs(uy) * (span / 2 + r + pad) + Math.abs(ux) * (r + pad);
      const box = { x: x - hx, y: y - hy, w: 2 * hx, h: 2 * hy };
      markers.set(s.id, box);
      occupancy.add(box);
    } else {
      const id = served[0];
      const kind = kindOf(id);
      const r = kind === "metro" ? W * 0.24 : W * 0.32;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      if (kind !== "metro") {
        ctx.lineWidth = Math.max(0.8, W * 0.13);
        ctx.strokeStyle = lineById.get(id)!.colour;
        ctx.stroke();
      }
      const box = { x: x - r, y: y - r, w: 2 * r, h: 2 * r };
      markers.set(s.id, box);
      occupancy.add(box);
    }
  }

  // Round line badges beyond each terminus.
  const badgeR = Math.max(6.5, W * 1.3);
  for (const t of termini) {
    const s = stationById.get(t.station)!;
    const [x, y] = toScreen([s.x, s.y]);
    const line = lineById.get(t.line)!;
    const marker = markers.get(s.id);
    const reach = marker ? Math.abs(t.out[0]) * (marker.w / 2) + Math.abs(t.out[1]) * (marker.h / 2) : W;
    const cx = x + t.out[0] * (reach + W * 0.6 + badgeR);
    const cy = y + t.out[1] * (reach + W * 0.6 + badgeR);
    ctx.beginPath();
    ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = line.colour;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const rows = BADGE_ROWS[line.id];
    if (!rows) {
      ctx.font = `700 ${badgeR * 1.2}px ${FONT}`;
      ctx.fillText(line.badge, cx, cy + badgeR * 0.05);
    } else {
      const longest = Math.max(...rows.map((row) => [...row].length));
      const fs = badgeR * (rows.length === 2 ? (longest > 2 ? 0.5 : 0.62) : longest > 2 ? 0.56 : 0.78);
      ctx.font = `700 ${fs}px ${FONT}`;
      rows.forEach((row, i) => ctx.fillText(row, cx, cy + (i - (rows.length - 1) / 2) * fs * 1.02 + fs * 0.04));
    }
    occupancy.add({ x: cx - badgeR, y: cy - badgeR, w: 2 * badgeR, h: 2 * badgeR });
  }

  // 한강 Han River, set along the river's longest straight reach.
  const fsN = Math.min(14, Math.max(8, k * 1.25));
  const fsT = fsN * 1.16;
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
      ctx.save();
      ctx.translate((ax + bx) / 2, (ay + by) / 2);
      ctx.rotate(angle);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = RIVER_TEXT;
      ctx.font = `500 ${fsN}px ${FONT}`;
      ctx.fillText("한강 Han River", 0, 0);
      ctx.restore();
    }
  }

  // Station names, upright for a phone held upright: interchanges bold with
  // English beneath, ordinary stations regular in Korean only. Each is placed
  // around its marker where it clears names, markers and badges and crosses
  // the least line.
  const enFs = fsT * 0.56;
  const showEn = enFs >= 5.5;
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  for (const s of labelOrder) {
    const [x, y] = toScreen([s.x, s.y]);
    if (x < 0 || y < 0 || x > width || y > height) continue;
    const transfer = (linesAt.get(s.id)?.length ?? 1) > 1;
    const fs = transfer ? fsT : fsN;
    const font = `${transfer ? 700 : 400} ${fs}px ${FONT}`;
    const enFont = `400 ${enFs}px ${FONT}`;
    const en = transfer && showEn && s.en ? s.en : null;
    const w = Math.max(textWidth(ctx, font, s.name), en ? textWidth(ctx, enFont, en) : 0);
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
    const ax = align === "right" ? box.x + w : align === "left" ? box.x : box.x + w / 2;
    ctx.textAlign = align;
    ctx.font = font;
    ctx.strokeStyle = GROUND;
    ctx.lineWidth = 2.5;
    ctx.strokeText(s.name, ax, box.y);
    ctx.fillStyle = transfer ? INK : INK_SOFT;
    ctx.fillText(s.name, ax, box.y);
    if (en) {
      ctx.font = enFont;
      ctx.strokeText(en, ax, box.y + fs * 1.12);
      ctx.fillStyle = MUTED;
      ctx.fillText(en, ax, box.y + fs * 1.12);
    }
  }
}
