// 테크 로고 (user, 2026-11-03): the industry's symbol marks as objects. Each is
// an SVG mark in a 24 × 24 box (simple-icons 16.25, CC0 data — the marks remain
// their owners'), filled with the non-zero rule as SVG fills it and blown up
// as one balloon (fields.ts fieldOfMark): ∇²u = −1 inside, u = 0 on the
// outline, height 2√u — exactly a sphere over a disc, so a mark's strokes and
// lobes swell into round tubes and pillows, as SNS's heart does. SCC bubble/3
// (기술) had them as flat marks on balls of their brand colour; OpenAI and
// Windows are the paths it used (OpenAI's is Goldfishes' company-logos
// openai.svg; Windows the four panes), the rest as simple-icons ships them.
// Wordmarks are left out: a mark must read as a shape.

import {
  siAndroid,
  siApple,
  siBitcoin,
  siClaude,
  siDeepseek,
  siGooglegemini,
  siInstagram,
  siMeta,
  siNvidia,
  siTesla,
  siTiktok,
  siX,
} from "simple-icons";
import type { LogoKind } from "./groups";

const OPENAI_PATH =
  "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z";
const WINDOWS_PATH = "M0 0h11.377v11.372H0Zm12.623 0H24v11.372H12.623ZM0 12.623h11.377V24H0Zm12.623 0H24V24H12.623";

/** A mark: its path in a 24 × 24 box and its brand colour (hex, no #). */
export type Mark = { path: string; hex: string };

export const MARKS: Record<LogoKind, Mark> = {
  claude: siClaude,
  openai: { path: OPENAI_PATH, hex: "000000" },
  gemini: siGooglegemini,
  deepseek: siDeepseek,
  apple: siApple,
  meta: siMeta,
  nvidia: siNvidia,
  x: siX,
  tesla: siTesla,
  windows: { path: WINDOWS_PATH, hex: "0078D4" },
  instagram: siInstagram,
  tiktok: siTiktok,
  bitcoin: siBitcoin,
  android: siAndroid,
};

/** A mark's brand colour, 0–1. */
export function brandOf(kind: LogoKind): [number, number, number] {
  const value = Number.parseInt(MARKS[kind].hex, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

type Point = [number, number];

/** The path flattened into closed polygons (curves and arcs as short segments). */
export function polygonsOf(path: string): Point[][] {
  const polygons: Point[][] = [];
  let current: Point[] = [];
  let at = 0;
  const skip = () => {
    while (at < path.length && /[\s,]/.test(path[at]!)) at += 1;
  };
  const number = () => {
    skip();
    const match = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(path.slice(at, at + 40));
    if (!match) throw new Error(`mark path: number expected at ${at}`);
    at += match[0].length;
    return Number(match[0]);
  };
  // An arc's flags may be written without separators ("0 011.5 2").
  const flag = () => {
    skip();
    const value = path[at] === "1" ? 1 : 0;
    at += 1;
    return value;
  };
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  // The last control point, for S and T.
  let controlX = 0;
  let controlY = 0;
  let last = "";
  const close = () => {
    if (current.length > 2) polygons.push(current);
    current = [];
  };
  const lineTo = (nx: number, ny: number) => {
    current.push([nx, ny]);
    x = nx;
    y = ny;
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const steps = 12;
    const [x0, y0] = [x, y];
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const s = 1 - t;
      lineTo(s * s * s * x0 + 3 * s * s * t * x1 + 3 * s * t * t * x2 + t * t * t * x3, s * s * s * y0 + 3 * s * s * t * y1 + 3 * s * t * t * y2 + t * t * t * y3);
    }
    controlX = x2;
    controlY = y2;
  };
  const quadratic = (x1: number, y1: number, x2: number, y2: number) => {
    cubic(x + (2 / 3) * (x1 - x), y + (2 / 3) * (y1 - y), x2 + (2 / 3) * (x1 - x2), y2 + (2 / 3) * (y1 - y2), x2, y2);
    controlX = x1;
    controlY = y1;
  };
  // SVG's endpoint arc, through its centre (SVG 1.1 F.6.5).
  const arc = (rx: number, ry: number, rotation: number, large: number, sweep: number, x2: number, y2: number) => {
    if (rx === 0 || ry === 0) return lineTo(x2, y2);
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    const phi = (rotation * Math.PI) / 180;
    const cos = Math.cos(phi);
    const sin = Math.sin(phi);
    const dx = (x - x2) / 2;
    const dy = (y - y2) / 2;
    const px = cos * dx + sin * dy;
    const py = -sin * dx + cos * dy;
    const scale = (px * px) / (rx * rx) + (py * py) / (ry * ry);
    if (scale > 1) {
      rx *= Math.sqrt(scale);
      ry *= Math.sqrt(scale);
    }
    const sign = large === sweep ? -1 : 1;
    const numerator = Math.max(0, rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px);
    const factor = sign * Math.sqrt(numerator / (rx * rx * py * py + ry * ry * px * px || 1));
    const cx = (factor * rx * py) / ry;
    const cy = (-factor * ry * px) / rx;
    const angle = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const start = angle(1, 0, (px - cx) / rx, (py - cy) / ry);
    let delta = angle((px - cx) / rx, (py - cy) / ry, (-px - cx) / rx, (-py - cy) / ry);
    if (!sweep && delta > 0) delta -= Math.PI * 2;
    if (sweep && delta < 0) delta += Math.PI * 2;
    const centreX = cos * cx - sin * cy + (x + x2) / 2;
    const centreY = sin * cx + cos * cy + (y + y2) / 2;
    const steps = Math.max(4, Math.ceil(Math.abs(delta) / (Math.PI / 16)));
    for (let step = 1; step <= steps; step += 1) {
      const theta = start + (delta * step) / steps;
      const ex = rx * Math.cos(theta);
      const ey = ry * Math.sin(theta);
      lineTo(step === steps ? x2 : centreX + cos * ex - sin * ey, step === steps ? y2 : centreY + sin * ex + cos * ey);
    }
  };

  while (true) {
    skip();
    if (at >= path.length) break;
    let command = path[at]!;
    if (/[a-zA-Z]/.test(command)) at += 1;
    else if (last) command = last === "M" ? "L" : last === "m" ? "l" : last;
    else throw new Error(`mark path: command expected at ${at}`);
    const relative = command === command.toLowerCase();
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;
    const upper = command.toUpperCase();
    if (upper !== "S" && upper !== "T" && upper !== "C" && upper !== "Q") {
      controlX = x;
      controlY = y;
    }
    switch (upper) {
      case "M": {
        close();
        const nx = ox + number();
        const ny = oy + number();
        x = startX = nx;
        y = startY = ny;
        current.push([nx, ny]);
        break;
      }
      case "L":
        lineTo(ox + number(), oy + number());
        break;
      case "H":
        lineTo(ox + number(), y);
        break;
      case "V":
        lineTo(x, oy + number());
        break;
      case "C": {
        const [x1, y1, x2, y2, x3, y3] = [ox + number(), oy + number(), ox + number(), oy + number(), ox + number(), oy + number()];
        cubic(x1, y1, x2, y2, x3, y3);
        break;
      }
      case "S": {
        const reflected = /[CcSs]/.test(last);
        const [x1, y1] = reflected ? [2 * x - controlX, 2 * y - controlY] : [x, y];
        const [x2, y2, x3, y3] = [ox + number(), oy + number(), ox + number(), oy + number()];
        cubic(x1, y1, x2, y2, x3, y3);
        break;
      }
      case "Q": {
        const [x1, y1, x2, y2] = [ox + number(), oy + number(), ox + number(), oy + number()];
        quadratic(x1, y1, x2, y2);
        break;
      }
      case "T": {
        const reflected = /[QqTt]/.test(last);
        const [x1, y1] = reflected ? [2 * x - controlX, 2 * y - controlY] : [x, y];
        quadratic(x1, y1, ox + number(), oy + number());
        break;
      }
      case "A": {
        const rx = number();
        const ry = number();
        const rotation = number();
        const large = flag();
        const sweep = flag();
        arc(rx, ry, rotation, large, sweep, ox + number(), oy + number());
        break;
      }
      case "Z":
        x = startX;
        y = startY;
        close();
        current = [[x, y]];
        break;
      default:
        throw new Error(`mark path: unknown command ${command}`);
    }
    // Arguments may repeat without the letter (an implicit repeat), taken as `last` above.
    last = command;
  }
  close();
  return polygons;
}

/** How far the mark's furthest point reaches past the disc (as shapes.ts FILL: about as much screen as the bubble). */
export const MARK_FILL = 1.18;

/**
 * A path (a mark's, or a glyph's: currency.ts) filled (non-zero winding) on a `size` × `size` grid over
 * [−extent, extent]², centred on its bounding box and scaled so its furthest point reaches `fill`: 1 inside,
 * 0 outside, per texel centre.
 */
export function coverageOf(path: string, size: number, extent: number, fill = MARK_FILL) {
  const polygons = polygonsOf(path);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of polygons) {
    for (const [px, py] of polygon) {
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let far = 1e-6;
  for (const polygon of polygons) for (const [px, py] of polygon) far = Math.max(far, Math.hypot(px - cx, py - cy));
  const scale = fill / far;
  // Edges in grid units.
  const toGrid = (value: number, centre: number) => (((value - centre) * scale) / extent * 0.5 + 0.5) * size - 0.5;
  const edges: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const polygon of polygons) {
    for (let index = 0; index < polygon.length; index += 1) {
      const [ax, ay] = polygon[index]!;
      const [bx, by] = polygon[(index + 1) % polygon.length]!;
      if (ay === by) continue;
      edges.push({ x0: toGrid(ax, cx), y0: toGrid(ay, cy), x1: toGrid(bx, cx), y1: toGrid(by, cy) });
    }
  }
  const covered = new Uint8Array(size * size);
  const crossings: { x: number; winding: number }[] = [];
  for (let row = 0; row < size; row += 1) {
    crossings.length = 0;
    for (const edge of edges) {
      const up = edge.y1 > edge.y0;
      const low = up ? edge.y0 : edge.y1;
      const high = up ? edge.y1 : edge.y0;
      if (row < low || row >= high) continue;
      const t = (row - edge.y0) / (edge.y1 - edge.y0);
      crossings.push({ x: edge.x0 + t * (edge.x1 - edge.x0), winding: up ? 1 : -1 });
    }
    crossings.sort((a, b) => a.x - b.x);
    let winding = 0;
    for (let index = 0; index < crossings.length - 1; index += 1) {
      winding += crossings[index]!.winding;
      if (winding === 0) continue;
      const from = Math.max(0, Math.ceil(crossings[index]!.x));
      const to = Math.min(size - 1, Math.floor(crossings[index + 1]!.x));
      covered.fill(1, row * size + from, row * size + to + 1);
    }
  }
  return covered;
}
