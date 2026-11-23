// The same table as a drawing: white line on black, nothing else. Every ball is a circle with its
// company's ticker where the table shows a face, and every tie of money between two of them is a
// line between their middles, laid through the circles, running the way the money runs. The ties are always there, faintly;
// one comes forward as its two balls come together, and for a moment after they strike, and is
// then written out in the ledger. Nothing here moves by itself: the balls are where the table has
// them, so what is read off the drawing is whatever the hand has just thrown together.

import { BALL_R, PLAY_W } from "../model/physics";
import type { Table } from "../model/physics";
import { CODES, RELATIONS } from "../model/relations";
import type { Kind } from "../model/relations";

/** Where a point of the table falls on the page: the table's own camera, so both tabs agree. */
type View = { project(x: number, y: number, z: number, out: { x: number; y: number }): { x: number; y: number } };

const INK = "#fff";
const GROUND = "#000";
const TYPE = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
/** Drawn pixels per CSS pixel are capped: hairlines gain nothing past this. */
const MAX_RATIO = 2;
/** A tie is faint until its balls are closer than this (m between their surfaces). */
const REACH = 0.5;
const FAINT = 0.3;
/** A strike keeps its tie forward for this long (s). */
const HEAT = 2.6;
/** How fast the dashes travel along a tie, payer to payee (CSS px/s). */
const FLOW = 42;
/** Ties this far forward are written in the ledger, at most this many. */
const WRITTEN = 0.42;
const LINES = 7;
/** Equity is a long stroke, a purchase a short one, the state a dot. */
const DASH: Record<Kind, number[]> = { invest: [16, 4], buy: [5, 5], state: [0.1, 5] };
/** The plumb line's length for a table stood on its edge, as a share of the table's width. */
const PLUMB = 0.3;
/** Where pool/1 has its sights, as shares of the half width and half length. */
const SIGHTS_END = [-0.5, 0, 0.5];
const SIGHTS_SIDE = [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75];

// Money that goes both ways between two balls is drawn as two bows, one each way: a closed loop.
const bowed = RELATIONS.map((r) => RELATIONS.some((o) => o.from === r.to && o.to === r.from));

export function createDiagram(canvas: HTMLCanvasElement) {
  const g = canvas.getContext("2d")!;
  let width = 1;
  let height = 1;
  let top = 0;
  const at = CODES.map(() => ({ x: 0, y: 0 }));
  const a = { x: 0, y: 0 };
  const b = { x: 0, y: 0 };
  const heat = new Float32Array(RELATIONS.length);
  const forward = new Float32Array(RELATIONS.length);
  const order = RELATIONS.map((_, i) => i);
  let travelled = 0;

  /** `ledgerTop` is where the ledger may begin (CSS px), under whatever sits at the top of the page. */
  const fit = (w: number, h: number, ledgerTop: number) => {
    width = w;
    height = h;
    top = ledgerTop;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  /** Two balls have struck: any tie between them comes forward. */
  const strike = (first: number, second: number) => {
    for (let i = 0; i < RELATIONS.length; i += 1) {
      const r = RELATIONS[i];
      if ((r.from === first && r.to === second) || (r.from === second && r.to === first)) heat[i] = HEAT;
    }
  };

  /** Draws the table as it stands, `seconds` after the last drawing. Returns true while a strike is still fading. */
  const render = (table: Table, view: View, seconds: number) => {
    const hw = PLAY_W / 2;
    const hl = table.length / 2;
    travelled = (travelled + seconds * FLOW) % 1000;
    g.globalAlpha = 1;
    g.setLineDash([]);
    g.fillStyle = GROUND;
    g.fillRect(0, 0, width, height);
    g.strokeStyle = INK;
    g.fillStyle = INK;
    g.lineCap = "butt";

    // The rails, where a ball's middle meets them, with their sights as a scale.
    const corners = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]];
    g.lineWidth = 1;
    g.beginPath();
    corners.forEach(([x, y], i) => {
      view.project(x, y, BALL_R, a);
      if (i === 0) g.moveTo(a.x, a.y);
      else g.lineTo(a.x, a.y);
    });
    g.closePath();
    g.stroke();
    const tick = 0.035;
    g.beginPath();
    for (const s of [-1, 1]) {
      for (const k of SIGHTS_END) {
        view.project(k * hw, s * hl, BALL_R, a);
        view.project(k * hw, s * (hl + tick), BALL_R, b);
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
      }
      for (const k of SIGHTS_SIDE) {
        view.project(s * hw, k * hl, BALL_R, a);
        view.project(s * (hw + tick), k * hl, BALL_R, b);
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
      }
    }
    g.stroke();

    // The plumb line: which way is down for the balls, and how steeply.
    view.project(0, 0, BALL_R, a);
    const reach = PLAY_W * PLUMB;
    const pull = Math.hypot(table.gx, table.gy);
    const whole = Math.hypot(pull, table.gn) || 1;
    view.project((table.gx / whole) * reach, (table.gy / whole) * reach, BALL_R, b);
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(a.x - 7, a.y);
    g.lineTo(a.x + 7, a.y);
    g.moveTo(a.x, a.y - 7);
    g.lineTo(a.x, a.y + 7);
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    g.beginPath();
    g.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    g.fillStyle = GROUND;
    g.fill();
    g.stroke();
    g.fillStyle = INK;
    g.font = `500 9px ${TYPE}`;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(`${Math.round((Math.atan2(pull, table.gn) * 180) / Math.PI)}°`, b.x + 8, b.y);

    // Each ball's middle, and how large a ball is drawn.
    for (const ball of table.balls) view.project(ball.x, ball.y, BALL_R, at[ball.id]);
    view.project(0, 0, BALL_R, a);
    view.project(BALL_R, 0, BALL_R, b);
    const radius = Math.hypot(b.x - a.x, b.y - a.y);

    // The ties.
    let live = false;
    g.lineCap = "round";
    for (let i = 0; i < RELATIONS.length; i += 1) {
      const r = RELATIONS[i];
      const from = table.balls[r.from];
      const to = table.balls[r.to];
      const gap = Math.hypot(to.x - from.x, to.y - from.y) - BALL_R * 2;
      const near = Math.min(1, Math.max(0, 1 - gap / REACH));
      if (heat[i] > 0) {
        heat[i] = Math.max(0, heat[i] - seconds);
        live = live || heat[i] > 0;
      }
      const hot = Math.min(1, heat[i] / (HEAT * 0.6));
      const amount = Math.max(near * near, hot);
      forward[i] = amount;

      // Middle to middle, straight through the circles: two balls lying together still show their tie.
      const p = at[r.from];
      const q = at[r.to];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const size = Math.hypot(dx, dy) || 1;
      const ux = dx / size;
      const uy = dy / size;
      // A bow leans to its own left, so the two of a pair lean apart and close a loop.
      const lean = bowed[i] ? Math.min(30, size * 0.24) : 0;
      const cx = (p.x + q.x) / 2 + uy * lean;
      const cy = (p.y + q.y) / 2 - ux * lean;
      g.globalAlpha = FAINT + (1 - FAINT) * amount;
      g.lineWidth = 0.75 + amount * 0.55 * r.weight;
      g.setLineDash(DASH[r.kind]);
      g.lineDashOffset = -travelled;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.quadraticCurveTo(cx, cy, q.x, q.y);
      g.stroke();
      // The head, past the middle, pointing at the payee.
      const t = 0.62;
      const mx = (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * cx + t * t * q.x;
      const my = (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * cy + t * t * q.y;
      const hx = (1 - t) * (cx - p.x) + t * (q.x - cx);
      const hy = (1 - t) * (cy - p.y) + t * (q.y - cy);
      const hs = Math.hypot(hx, hy) || 1;
      const head = 3.5 + amount * 3;
      const tx = hx / hs;
      const ty = hy / hs;
      g.setLineDash([]);
      g.beginPath();
      g.moveTo(mx - tx * head - ty * head * 0.55, my - ty * head + tx * head * 0.55);
      g.lineTo(mx, my);
      g.lineTo(mx - tx * head + ty * head * 0.55, my - ty * head - tx * head * 0.55);
      g.stroke();
    }

    // The balls, laid over the ties: a circle, the way it is heading, and its ticker upright.
    g.setLineDash([]);
    g.lineCap = "butt";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const scale = Math.min(1, radius / 22);
    for (const ball of table.balls) {
      const p = at[ball.id];
      const speed = Math.hypot(ball.vx, ball.vy);
      g.globalAlpha = 1;
      g.lineWidth = 1;
      if (speed > 0.02) {
        // A tenth of a second of travel, out from the rim.
        view.project(ball.x + ball.vx * 0.1, ball.y + ball.vy * 0.1, BALL_R, a);
        const vx = a.x - p.x;
        const vy = a.y - p.y;
        const vs = Math.hypot(vx, vy) || 1;
        g.beginPath();
        g.moveTo(p.x + (vx / vs) * radius, p.y + (vy / vs) * radius);
        g.lineTo(p.x + (vx / vs) * (radius + vs), p.y + (vy / vs) * (radius + vs));
        g.stroke();
      }
      g.beginPath();
      g.arc(p.x, p.y, radius, 0, Math.PI * 2);
      g.stroke();
      if (ball.id === 0) {
        // The one that is not a company.
        g.beginPath();
        g.arc(p.x, p.y, radius - 3.5, 0, Math.PI * 2);
        g.stroke();
      }
      const code = CODES[ball.id];
      const type = (code.length > 5 ? 7.5 : code.length > 4 ? 8.5 : 9.5) * scale;
      g.font = `600 ${type}px ${TYPE}`;
      // The ticker is cut clear of the lines that run under it.
      const wide = g.measureText(code).width + 5;
      g.fillStyle = GROUND;
      g.fillRect(p.x - wide / 2, p.y - type * 0.75, wide, type * 1.5);
      g.fillStyle = INK;
      g.fillText(code, p.x, p.y + 0.5);
    }

    // The ledger: the ties now forward, the furthest forward first, payer to payee.
    order.sort((i, j) => forward[j] - forward[i]);
    g.textAlign = "left";
    g.textBaseline = "top";
    g.font = `500 10px ${TYPE}`;
    const left = 14;
    for (let n = 0; n < LINES; n += 1) {
      const i = order[n];
      if (forward[i] < WRITTEN) break;
      const r = RELATIONS[i];
      const text = `${CODES[r.from]} → ${CODES[r.to]}  ${r.label}`;
      const y = top + n * 15;
      // Written over whatever lies there, with only its own letters cut clear.
      g.globalAlpha = 1;
      g.lineWidth = 3;
      g.lineJoin = "round";
      g.strokeStyle = GROUND;
      g.strokeText(text, left, y);
      g.globalAlpha = 0.5 + 0.5 * Math.min(1, (forward[i] - WRITTEN) / (1 - WRITTEN) + 0.2);
      g.fillStyle = INK;
      g.fillText(text, left, y);
    }
    g.globalAlpha = 1;
    g.strokeStyle = INK;
    return live;
  };

  return { fit, strike, render };
}
