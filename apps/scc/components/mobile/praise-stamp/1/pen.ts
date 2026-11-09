import { FONTS, GAEGU_WEIGHT, type FontKey } from "./fonts";
import { TRACED, type TracedKey } from "./traced";

// Everything a stamp face carries, drawn as solid rubber in a 1000-unit
// square centred on (500, 500). Ink is opaque; `erase` cuts back to paper.

const TAU = Math.PI * 2;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Line weight of the cut rubber: about 0.4 mm on a 20 mm stamp. */
export const LW = 18;

export type FaceHair = "boy" | "girl" | "cap" | "pigtails" | "bald" | "curly";
export type FaceEyes = "dot" | "happy" | "wink";
export type FaceMouth = "smile" | "open" | "grin";

export type FaceOptions = {
  hair?: FaceHair;
  eyes?: FaceEyes;
  mouth?: FaceMouth;
  cheeks?: boolean;
  bow?: boolean;
  crown?: boolean;
};

export class Pen {
  readonly ctx: CanvasRenderingContext2D;
  /** Called with every run of letters, so their glyphs can be loaded first. */
  private readonly record?: (key: FontKey, text: string) => void;

  constructor(ctx: CanvasRenderingContext2D, record?: (key: FontKey, text: string) => void) {
    this.ctx = ctx;
    this.record = record;
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = LW;
  }

  // --- state -------------------------------------------------------------

  /** Run `draw` with paper instead of ink. */
  erase(draw: () => void) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    draw();
    ctx.restore();
  }

  at(x: number, y: number, angleDeg: number, scale: number, draw: () => void) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad(angleDeg));
    ctx.scale(scale, scale);
    draw();
    ctx.restore();
  }

  private stroke(w = LW) {
    this.ctx.lineWidth = w;
    this.ctx.stroke();
  }

  // --- frames -------------------------------------------------------------

  ring(r: number, w = LW, cx = 500, cy = 500) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    this.stroke(w);
  }

  disc(r: number, cx = 500, cy = 500) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
  }

  dots(r: number, n: number, dotR: number, from = 0, to = 360) {
    const { ctx } = this;
    const full = to - from >= 360;
    const steps = full ? n : n - 1;
    for (let i = 0; i < n; i += 1) {
      const a = rad(from + ((to - from) * i) / steps - 90);
      ctx.beginPath();
      ctx.arc(500 + Math.cos(a) * r, 500 + Math.sin(a) * r, dotR, 0, TAU);
      ctx.fill();
    }
  }

  /** A wavy, cloud-like rim: `n` bumps of height `amp`. */
  scallop(r: number, n: number, amp: number, w = LW) {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i <= 720; i += 1) {
      const a = (i / 720) * TAU;
      const rr = r + amp * Math.abs(Math.sin((a * n) / 2));
      const x = 500 + Math.cos(a) * rr;
      const y = 500 + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    this.stroke(w);
  }

  /** A sawtooth seal edge, as on certificate stamps. */
  zigzag(r: number, n: number, amp: number, w = LW) {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i += 1) {
      const a = (i / (n * 2)) * TAU - Math.PI / 2;
      const rr = i % 2 === 0 ? r + amp : r;
      const x = 500 + Math.cos(a) * rr;
      const y = 500 + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    this.stroke(w);
  }

  poly(n: number, r: number, w = LW, rotDeg = -90, round = 0) {
    const { ctx } = this;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i += 1) {
      const a = rad(rotDeg + (360 * i) / n);
      pts.push([500 + Math.cos(a) * r, 500 + Math.sin(a) * r]);
    }
    ctx.beginPath();
    if (round > 0) {
      const last = pts[n - 1];
      const first = pts[0];
      ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
      for (let i = 0; i < n; i += 1) {
        const p = pts[i];
        const q = pts[(i + 1) % n];
        ctx.arcTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, round);
      }
    } else {
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    }
    ctx.closePath();
    this.stroke(w);
  }

  rect(w: number, h: number, round: number, lw = LW, cx = 500, cy = 500) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, round);
    this.stroke(lw);
  }

  ellipse(rx: number, ry: number, lw = LW, cx = 500, cy = 500) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    this.stroke(lw);
  }

  /** Heater shield, flat top. */
  shield(w: number, h: number, lw = LW) {
    const { ctx } = this;
    const x0 = 500 - w / 2;
    const x1 = 500 + w / 2;
    const y0 = 500 - h / 2;
    const y1 = 500 + h / 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + h * 0.06);
    ctx.quadraticCurveTo(500, y0 - h * 0.04, x1, y0 + h * 0.06);
    ctx.lineTo(x1, y0 + h * 0.45);
    ctx.bezierCurveTo(x1, y0 + h * 0.78, 500 + w * 0.2, y1 - h * 0.08, 500, y1);
    ctx.bezierCurveTo(500 - w * 0.2, y1 - h * 0.08, x0, y0 + h * 0.78, x0, y0 + h * 0.45);
    ctx.closePath();
    this.stroke(lw);
  }

  // --- lettering ------------------------------------------------------------

  private font(key: FontKey, size: number, text: string) {
    this.record?.(key, text);
    const weight = key === "gaegu" ? `${GAEGU_WEIGHT} ` : "";
    this.ctx.font = `${weight}${size}px ${FONTS[key]}`;
  }

  text(text: string, x: number, y: number, key: FontKey, size: number, opts: { tracking?: number; rotate?: number; outline?: number } = {}) {
    const { ctx } = this;
    this.font(key, size, text);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tracking = opts.tracking ?? 0;
    const glyphs = [...text];
    const widths = glyphs.map((g) => ctx.measureText(g).width);
    const total = widths.reduce((s, w) => s + w, 0) + tracking * (glyphs.length - 1);
    ctx.save();
    ctx.translate(x, y);
    if (opts.rotate) ctx.rotate(rad(opts.rotate));
    let cursor = -total / 2;
    glyphs.forEach((g, i) => {
      const gx = cursor + widths[i] / 2;
      if (opts.outline) {
        ctx.lineWidth = opts.outline;
        ctx.strokeText(g, gx, 0);
      } else {
        ctx.fillText(g, gx, 0);
      }
      cursor += widths[i] + tracking;
    });
    ctx.restore();
  }

  /**
   * Letters set on a circle of radius `r` (glyph centres). `top` reads
   * clockwise over the crown; `bottom` reads left to right under the base
   * with feet outward. `at` shifts the centre of the run in degrees.
   */
  arcText(text: string, r: number, key: FontKey, size: number, side: "top" | "bottom", opts: { tracking?: number; at?: number } = {}) {
    const { ctx } = this;
    this.font(key, size, text);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tracking = opts.tracking ?? 0;
    const glyphs = [...text];
    const widths = glyphs.map((g) => (g === " " ? size * 0.32 : ctx.measureText(g).width));
    const total = widths.reduce((s, w) => s + w, 0) + tracking * (glyphs.length - 1);
    const span = total / r;
    const centre = side === "top" ? -Math.PI / 2 : Math.PI / 2;
    const shift = rad(opts.at ?? 0);
    let cursor = 0;
    glyphs.forEach((g, i) => {
      const mid = (cursor + widths[i] / 2) / r;
      cursor += widths[i] + tracking;
      if (g === " ") return;
      const a = side === "top" ? centre + shift - span / 2 + mid : centre + shift + span / 2 - mid;
      ctx.save();
      ctx.translate(500 + Math.cos(a) * r, 500 + Math.sin(a) * r);
      ctx.rotate(side === "top" ? a + Math.PI / 2 : a - Math.PI / 2);
      ctx.fillText(g, 0, 0);
      ctx.restore();
    });
  }

  // --- small marks ---------------------------------------------------------

  star(x: number, y: number, r: number, filled = true, rotDeg = 0, w = LW * 0.8) {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = rad(rotDeg - 90 + i * 36);
      const rr = i % 2 === 0 ? r : r * 0.45;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) ctx.fill();
    else this.stroke(w);
  }

  /** `n` stars on a circle between two angles (0° = top, clockwise). */
  starArc(n: number, r: number, size: number, from: number, to: number, filled = true) {
    for (let i = 0; i < n; i += 1) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const a = rad(from + (to - from) * t - 90);
      const deg = from + (to - from) * t;
      this.star(500 + Math.cos(a) * r, 500 + Math.sin(a) * r, size, filled, deg > 90 && deg < 270 ? deg - 180 : deg);
    }
  }

  starRow(n: number, y: number, gap: number, size: number, sag = 0, filled = true) {
    for (let i = 0; i < n; i += 1) {
      const t = i - (n - 1) / 2;
      this.star(500 + t * gap, y - sag * (1 - (t * t) / Math.max(1, ((n - 1) / 2) ** 2)), size, filled);
    }
  }

  heart(x: number, y: number, s: number, filled = true, w = LW) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.25, y + s * 0.05, x - s * 0.95, y - s * 0.95, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s * 0.95, y - s * 0.95, x + s * 1.25, y + s * 0.05, x, y + s * 0.9);
    ctx.closePath();
    if (filled) ctx.fill();
    else this.stroke(w);
  }

  check(x: number, y: number, s: number, w = LW * 1.8) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.55, y);
    ctx.lineTo(x - s * 0.15, y + s * 0.42);
    ctx.lineTo(x + s * 0.6, y - s * 0.5);
    this.stroke(w);
  }

  /** Short strokes radiating from (x, y) between two angles: shine, effort, surprise. */
  sparks(x: number, y: number, r0: number, r1: number, from: number, to: number, n: number, w = LW * 0.9) {
    const { ctx } = this;
    for (let i = 0; i < n; i += 1) {
      const a = rad(from + ((to - from) * i) / Math.max(1, n - 1) - 90);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      this.stroke(w);
    }
  }

  /** The red-pen double underline under a score. */
  underline2(x: number, y: number, w: number, lw = LW * 1.2) {
    const { ctx } = this;
    for (const dy of [0, lw * 2.2]) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + dy + 6);
      ctx.quadraticCurveTo(x, y + dy - 10, x + w / 2, y + dy);
      this.stroke(lw);
    }
  }

  // --- traced stamps --------------------------------------------------------

  traced(key: TracedKey) {
    const { ctx } = this;
    const { d, t } = TRACED[key];
    ctx.save();
    ctx.transform(t[0], 0, 0, t[1], t[2], t[3]);
    ctx.fill(new Path2D(d));
    ctx.restore();
  }

  // --- figures (local units: about 100 across, centred on 0, 0) ---------------

  /** A child's face; `r` is the head radius. */
  face(x: number, y: number, r: number, o: FaceOptions = {}) {
    const { ctx } = this;
    const lw = Math.max(LW * 0.8, r * 0.085);
    const hair = o.hair ?? "boy";

    // Hair masses are solid rubber; the face is cut back out of them.
    if (hair === "girl" || hair === "pigtails" || hair === "curly") {
      ctx.beginPath();
      if (hair === "curly") {
        for (let i = 0; i <= 14; i += 1) {
          const a = rad(150 + (240 * i) / 14);
          ctx.arc(x + Math.cos(a) * r * 0.98, y + Math.sin(a) * r * 0.98 - r * 0.05, r * 0.24, 0, TAU);
        }
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y - r * 0.05, r * 1.02, rad(160), rad(20));
        ctx.fill();
      } else {
        ctx.moveTo(x - r * 1.08, y + r * 0.72);
        ctx.bezierCurveTo(x - r * 1.22, y - r * 0.4, x - r * 0.8, y - r * 1.16, x, y - r * 1.16);
        ctx.bezierCurveTo(x + r * 0.8, y - r * 1.16, x + r * 1.22, y - r * 0.4, x + r * 1.08, y + r * 0.72);
        ctx.lineTo(x + r * 0.7, y + r * 0.72);
        ctx.lineTo(x - r * 0.7, y + r * 0.72);
        ctx.closePath();
        ctx.fill();
      }
      if (hair === "pigtails") {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(x + s * r * 1.22, y + r * 0.05, r * 0.26, r * 0.36, s * 0.4, 0, TAU);
          ctx.fill();
        }
      }
      // Face: under a straight fringe.
      this.erase(() => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - r * 2, y - r * (hair === "curly" ? 0.42 : 0.3), r * 4, r * 3);
        ctx.clip();
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.02, r * 0.9, r * 0.92, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
      ctx.beginPath();
      ctx.arc(x, y + r * 0.02, r * 0.9 + lw / 2, rad(12), rad(168));
      this.stroke(lw);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      this.stroke(lw);
    }

    if (hair === "boy") {
      ctx.beginPath();
      ctx.arc(x, y, r + lw * 0.3, rad(172), rad(368));
      ctx.quadraticCurveTo(x + r * 0.78, y - r * 0.3, x + r * 0.55, y - r * 0.28);
      ctx.quadraticCurveTo(x + r * 0.42, y - r * 0.48, x + r * 0.22, y - r * 0.5);
      ctx.quadraticCurveTo(x + r * 0.05, y - r * 0.28, x - r * 0.18, y - r * 0.3);
      ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.5, x - r * 0.62, y - r * 0.32);
      ctx.quadraticCurveTo(x - r * 0.88, y - r * 0.2, x - r * 1.0, y + r * 0.1);
      ctx.closePath();
      ctx.fill();
    } else if (hair === "cap") {
      ctx.beginPath();
      ctx.arc(x, y, r + lw * 0.35, rad(186), rad(354));
      ctx.lineTo(x + r * 0.98, y - r * 0.22);
      ctx.quadraticCurveTo(x, y - r * 0.4, x - r * 0.98, y - r * 0.12);
      ctx.closePath();
      ctx.fill();
      // Brim reaching forward and a seam over the crown.
      ctx.beginPath();
      ctx.ellipse(x + r * 0.78, y - r * 0.2, r * 0.62, r * 0.14, -0.12, 0, TAU);
      ctx.fill();
      this.erase(() => {
        ctx.beginPath();
        ctx.moveTo(x + r * 0.2, y - r * 1.0);
        ctx.quadraticCurveTo(x + r * 0.45, y - r * 0.62, x + r * 0.36, y - r * 0.32);
        this.stroke(lw * 0.55);
        ctx.beginPath();
        ctx.moveTo(x + r * 0.15, y - r * 0.27);
        ctx.quadraticCurveTo(x + r * 0.7, y - r * 0.36, x + r * 1.15, y - r * 0.3);
        this.stroke(lw * 0.5);
      });
      ctx.beginPath();
      ctx.arc(x + r * 0.1, y - r * 1.05, r * 0.09, 0, TAU);
      ctx.fill();
      // A few strands under the cap.
      ctx.beginPath();
      ctx.moveTo(x - r * 0.72, y - r * 0.16);
      ctx.lineTo(x - r * 0.62, y + r * 0.02);
      ctx.moveTo(x - r * 0.52, y - r * 0.2);
      ctx.lineTo(x - r * 0.46, y - r * 0.04);
      this.stroke(lw * 0.7);
    }

    if (o.bow) {
      const bx = x + r * 0.62;
      const by = y - r * 0.92;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - r * 0.42, by - r * 0.26);
      ctx.lineTo(bx - r * 0.36, by + r * 0.24);
      ctx.closePath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + r * 0.4, by - r * 0.3);
      ctx.lineTo(bx + r * 0.42, by + r * 0.2);
      ctx.closePath();
      ctx.fill();
      this.erase(() => {
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.1, 0, TAU);
        this.stroke(lw * 0.5);
      });
    }

    if (o.crown) this.crown(x, y - r * 1.28, r * 0.85, false, lw * 0.85);

    // Eyes.
    const ey = y + r * 0.08;
    const ex = r * 0.34;
    const eyes = o.eyes ?? "dot";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (eyes === "happy" || (eyes === "wink" && s === 1)) {
        ctx.arc(x + s * ex, ey + r * 0.06, r * 0.13, rad(200), rad(340));
        this.stroke(lw * 0.85);
      } else {
        ctx.ellipse(x + s * ex, ey, r * 0.075, r * 0.11, 0, 0, TAU);
        ctx.fill();
      }
    }

    // Mouth.
    const mouth = o.mouth ?? "smile";
    const my = y + r * 0.36;
    ctx.beginPath();
    if (mouth === "smile") {
      ctx.arc(x, my - r * 0.12, r * 0.26, rad(25), rad(155));
      this.stroke(lw * 0.85);
    } else {
      ctx.moveTo(x - r * 0.3, my - r * 0.04);
      ctx.quadraticCurveTo(x, my - r * 0.1, x + r * 0.3, my - r * 0.04);
      ctx.quadraticCurveTo(x + r * 0.26, my + r * 0.36, x, my + r * 0.38);
      ctx.quadraticCurveTo(x - r * 0.26, my + r * 0.36, x - r * 0.3, my - r * 0.04);
      ctx.closePath();
      if (mouth === "open") {
        ctx.fill();
        this.erase(() => {
          ctx.beginPath();
          ctx.ellipse(x, my + r * 0.24, r * 0.12, r * 0.06, 0, 0, TAU);
          ctx.fill();
        });
      } else {
        this.stroke(lw * 0.8);
        ctx.beginPath();
        ctx.moveTo(x - r * 0.26, my + r * 0.07);
        ctx.lineTo(x + r * 0.26, my + r * 0.07);
        this.stroke(lw * 0.6);
      }
    }

    if (o.cheeks) {
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k += 1) {
          ctx.beginPath();
          const cx = x + s * r * 0.6 + (k - 1) * r * 0.09;
          ctx.moveTo(cx + r * 0.04, my - r * 0.18);
          ctx.lineTo(cx - r * 0.04, my - r * 0.04);
          this.stroke(lw * 0.5);
        }
      }
    }
  }

  crown(x: number, y: number, w: number, filled = true, lw = LW) {
    const { ctx } = this;
    const h = w * 0.62;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x - w / 2, y - h * 0.3);
    ctx.lineTo(x - w * 0.24, y + h * 0.05);
    ctx.lineTo(x, y - h / 2);
    ctx.lineTo(x + w * 0.24, y + h * 0.05);
    ctx.lineTo(x + w / 2, y - h * 0.3);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.closePath();
    if (filled) ctx.fill();
    else this.stroke(lw);
    for (const [px, py] of [[x - w / 2, y - h * 0.3], [x, y - h / 2], [x + w / 2, y - h * 0.3]]) {
      ctx.beginPath();
      ctx.arc(px, py - w * 0.07, w * 0.075, 0, TAU);
      ctx.fill();
    }
    if (filled) {
      this.erase(() => {
        ctx.beginPath();
        ctx.moveTo(x - w * 0.42, y + h * 0.3);
        ctx.lineTo(x + w * 0.42, y + h * 0.3);
        this.stroke(lw * 0.55);
      });
    }
  }

  /** Thumbs-up fist; `s` is its height. */
  thumb(x: number, y: number, s: number, lw = LW, mirror = false) {
    const { ctx } = this;
    const k = s / 100;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(mirror ? -k : k, k);
    const w = lw / k;
    // Cuff.
    ctx.beginPath();
    ctx.roundRect(-46, -4, 16, 50, 4);
    ctx.lineWidth = w;
    ctx.stroke();
    // Hand.
    ctx.beginPath();
    ctx.moveTo(-30, 44);
    ctx.lineTo(-30, 0);
    ctx.bezierCurveTo(-18, -4, -10, -14, -8, -30);
    ctx.bezierCurveTo(-7, -42, -4, -52, 4, -52);
    ctx.bezierCurveTo(14, -52, 14, -40, 12, -30);
    ctx.bezierCurveTo(10, -20, 8, -12, 8, -6);
    ctx.lineTo(34, -6);
    ctx.bezierCurveTo(46, -6, 46, 10, 34, 10);
    ctx.bezierCurveTo(46, 10, 46, 24, 34, 24);
    ctx.bezierCurveTo(44, 24, 44, 36, 33, 36);
    ctx.bezierCurveTo(42, 36, 41, 47, 31, 47);
    ctx.lineTo(-30, 44);
    ctx.lineWidth = w;
    ctx.stroke();
    // Fingers' seams.
    ctx.beginPath();
    for (const fy of [10, 24, 36]) {
      ctx.moveTo(12, fy);
      ctx.lineTo(32, fy);
    }
    ctx.lineWidth = w * 0.8;
    ctx.stroke();
    ctx.restore();
  }

  flower(x: number, y: number, r: number, petals = 8, withFace = true, lw = LW) {
    const { ctx } = this;
    const pr = r * 0.42;
    ctx.beginPath();
    for (let i = 0; i < petals; i += 1) {
      const a = (i / petals) * TAU - Math.PI / 2;
      const px = x + Math.cos(a) * r * 0.72;
      const py = y + Math.sin(a) * r * 0.72;
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, TAU);
    }
    this.stroke(lw);
    this.erase(() => {
      ctx.beginPath();
      ctx.arc(x, y, r * 0.58, 0, TAU);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, TAU);
    this.stroke(lw);
    if (withFace) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * r * 0.18, y - r * 0.06, r * 0.045, r * 0.07, 0, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y + r * 0.04, r * 0.2, rad(25), rad(155));
      this.stroke(lw * 0.8);
    }
  }

  /** The Japanese-born 'flower circle': a spiral inside a ring of petals. */
  hanamaru(x: number, y: number, r: number, lw = LW * 1.3) {
    const { ctx } = this;
    ctx.beginPath();
    const turns = 2.6;
    for (let i = 0; i <= 400; i += 1) {
      const t = i / 400;
      const a = -Math.PI / 2 + t * turns * TAU;
      const rr = r * (0.12 + 0.42 * t);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    this.stroke(lw);
    ctx.beginPath();
    const petals = 7;
    for (let i = 0; i < petals; i += 1) {
      const a0 = (i / petals) * TAU;
      const a1 = ((i + 1) / petals) * TAU;
      const am = (a0 + a1) / 2;
      const p0 = [x + Math.cos(a0) * r * 0.66, y + Math.sin(a0) * r * 0.66];
      const p1 = [x + Math.cos(a1) * r * 0.66, y + Math.sin(a1) * r * 0.66];
      const c = [x + Math.cos(am) * r * 1.18, y + Math.sin(am) * r * 1.18];
      if (i === 0) ctx.moveTo(p0[0], p0[1]);
      ctx.quadraticCurveTo(c[0], c[1], p1[0], p1[1]);
    }
    ctx.closePath();
    this.stroke(lw);
  }

  owl(x: number, y: number, s: number, lw = LW) {
    const { ctx } = this;
    const k = s / 100;
    // Body.
    ctx.beginPath();
    ctx.moveTo(x - 34 * k, y - 30 * k);
    ctx.bezierCurveTo(x - 50 * k, y + 10 * k, x - 42 * k, y + 50 * k, x, y + 52 * k);
    ctx.bezierCurveTo(x + 42 * k, y + 50 * k, x + 50 * k, y + 10 * k, x + 34 * k, y - 30 * k);
    // Ear tufts and the brow between them.
    ctx.lineTo(x + 40 * k, y - 52 * k);
    ctx.lineTo(x + 18 * k, y - 40 * k);
    ctx.quadraticCurveTo(x, y - 44 * k, x - 18 * k, y - 40 * k);
    ctx.lineTo(x - 40 * k, y - 52 * k);
    ctx.closePath();
    this.stroke(lw);
    // Eyes.
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sx * 17 * k, y - 20 * k, 13 * k, 0, TAU);
      this.stroke(lw * 0.9);
      ctx.beginPath();
      ctx.arc(x + sx * 15 * k, y - 19 * k, 6 * k, 0, TAU);
      ctx.fill();
    }
    // Beak.
    ctx.beginPath();
    ctx.moveTo(x - 6 * k, y - 6 * k);
    ctx.lineTo(x + 6 * k, y - 6 * k);
    ctx.lineTo(x, y + 6 * k);
    ctx.closePath();
    ctx.fill();
    // Wings.
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * 34 * k, y + 2 * k);
      ctx.quadraticCurveTo(x + sx * 22 * k, y + 26 * k, x + sx * 28 * k, y + 42 * k);
      this.stroke(lw * 0.85);
    }
    // Breast feathers.
    ctx.beginPath();
    for (const [fx, fy] of [[-8, 18], [8, 18], [0, 30], [-12, 32], [12, 32]]) {
      ctx.moveTo(x + (fx - 5) * k, y + fy * k);
      ctx.quadraticCurveTo(x + fx * k, y + (fy + 6) * k, x + (fx + 5) * k, y + fy * k);
    }
    this.stroke(lw * 0.7);
    // Feet on a branch.
    ctx.beginPath();
    ctx.moveTo(x - 56 * k, y + 60 * k);
    ctx.lineTo(x + 56 * k, y + 56 * k);
    this.stroke(lw);
    ctx.beginPath();
    for (const fx of [-12, 12]) {
      ctx.moveTo(x + (fx - 6) * k, y + 59 * k);
      ctx.lineTo(x + fx * k, y + 50 * k);
      ctx.lineTo(x + (fx + 6) * k, y + 59 * k);
    }
    this.stroke(lw * 0.8);
  }

  bear(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * r * 0.72, y - r * 0.72, r * 0.32, 0, TAU);
      this.stroke(lw);
      ctx.beginPath();
      ctx.arc(x + s * r * 0.72, y - r * 0.72, r * 0.13, 0, TAU);
      ctx.fill();
    }
    this.erase(() => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    this.stroke(lw);
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.34, r * 0.36, r * 0.27, 0, 0, TAU);
    this.stroke(lw * 0.85);
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.24, r * 0.12, r * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.3);
    ctx.lineTo(x, y + r * 0.42);
    ctx.moveTo(x - r * 0.13, y + r * 0.46);
    ctx.quadraticCurveTo(x, y + r * 0.52, x + r * 0.13, y + r * 0.46);
    this.stroke(lw * 0.7);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * r * 0.38, y - r * 0.1, r * 0.08, 0, TAU);
      ctx.fill();
    }
  }

  rabbit(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * r * 0.38, y - r * 1.2, r * 0.24, r * 0.66, s * 0.14, 0, TAU);
      this.stroke(lw);
      ctx.beginPath();
      ctx.ellipse(x + s * r * 0.38, y - r * 1.12, r * 0.07, r * 0.38, s * 0.14, 0, TAU);
      ctx.fill();
    }
    this.erase(() => {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.05, r * 0.92, 0, 0, TAU);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.05, r * 0.92, 0, 0, TAU);
    this.stroke(lw);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * r * 0.38, y - r * 0.06, r * 0.085, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 0.08, r * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.24);
    ctx.quadraticCurveTo(x - r * 0.04, y + r * 0.42, x - r * 0.18, y + r * 0.38);
    ctx.moveTo(x, y + r * 0.24);
    ctx.quadraticCurveTo(x + r * 0.04, y + r * 0.42, x + r * 0.18, y + r * 0.38);
    this.stroke(lw * 0.7);
  }

  puppy(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    this.stroke(lw);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.55, y - r * 0.82);
      ctx.bezierCurveTo(x + s * r * 1.35, y - r * 0.9, x + s * r * 1.35, y + r * 0.2, x + s * r * 1.02, y + r * 0.42);
      ctx.bezierCurveTo(x + s * r * 0.8, y + r * 0.2, x + s * r * 0.8, y - r * 0.4, x + s * r * 0.55, y - r * 0.82);
      ctx.fill();
    }
    // Patch over one eye.
    ctx.beginPath();
    ctx.ellipse(x + r * 0.36, y - r * 0.1, r * 0.25, r * 0.23, 0, 0, TAU);
    ctx.fill();
    this.erase(() => {
      ctx.beginPath();
      ctx.arc(x + r * 0.36, y - r * 0.08, r * 0.09, 0, TAU);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(x - r * 0.36, y - r * 0.08, r * 0.09, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 0.15, r * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.28);
    ctx.lineTo(x, y + r * 0.4);
    ctx.moveTo(x - r * 0.2, y + r * 0.42);
    ctx.quadraticCurveTo(x - r * 0.1, y + r * 0.52, x, y + r * 0.4);
    ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.52, x + r * 0.2, y + r * 0.42);
    this.stroke(lw * 0.7);
    // Tongue.
    ctx.beginPath();
    ctx.ellipse(x + r * 0.04, y + r * 0.58, r * 0.1, r * 0.13, 0, 0, TAU);
    this.stroke(lw * 0.7);
  }

  cat(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.98, y + r * 0.1);
    ctx.lineTo(x - r * 0.88, y - r * 1.05);
    ctx.lineTo(x - r * 0.38, y - r * 0.78);
    ctx.quadraticCurveTo(x, y - r * 0.9, x + r * 0.38, y - r * 0.78);
    ctx.lineTo(x + r * 0.88, y - r * 1.05);
    ctx.lineTo(x + r * 0.98, y + r * 0.1);
    ctx.bezierCurveTo(x + r * 1.0, y + r * 0.8, x + r * 0.5, y + r * 0.92, x, y + r * 0.92);
    ctx.bezierCurveTo(x - r * 0.5, y + r * 0.92, x - r * 1.0, y + r * 0.8, x - r * 0.98, y + r * 0.1);
    ctx.closePath();
    this.stroke(lw);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * r * 0.38, y - r * 0.02, r * 0.14, rad(200), rad(340));
      this.stroke(lw * 0.85);
      ctx.beginPath();
      for (const dy of [-0.04, 0.12]) {
        ctx.moveTo(x + s * r * 0.55, y + r * (0.28 + dy));
        ctx.lineTo(x + s * r * 1.15, y + r * (0.2 + dy * 1.6));
      }
      this.stroke(lw * 0.6);
    }
    ctx.beginPath();
    ctx.moveTo(x - r * 0.07, y + r * 0.18);
    ctx.lineTo(x + r * 0.07, y + r * 0.18);
    ctx.lineTo(x, y + r * 0.27);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.18, y + r * 0.36);
    ctx.quadraticCurveTo(x - r * 0.09, y + r * 0.44, x, y + r * 0.3);
    ctx.quadraticCurveTo(x + r * 0.09, y + r * 0.44, x + r * 0.18, y + r * 0.36);
    this.stroke(lw * 0.7);
  }

  chick(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.95, 0, 0, TAU);
    this.stroke(lw);
    // Tuft.
    ctx.beginPath();
    ctx.moveTo(x - r * 0.1, y - r * 0.92);
    ctx.quadraticCurveTo(x - r * 0.18, y - r * 1.22, x + r * 0.02, y - r * 1.2);
    ctx.moveTo(x + r * 0.04, y - r * 0.94);
    ctx.quadraticCurveTo(x + r * 0.12, y - r * 1.2, x + r * 0.28, y - r * 1.08);
    this.stroke(lw * 0.8);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * r * 0.34, y - r * 0.2, r * 0.09, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(x - r * 0.16, y + r * 0.02);
    ctx.lineTo(x + r * 0.16, y + r * 0.02);
    ctx.lineTo(x, y + r * 0.2);
    ctx.closePath();
    ctx.fill();
    // Wings.
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.98, y + r * 0.08);
      ctx.quadraticCurveTo(x + s * r * 1.3, y + r * 0.2, x + s * r * 1.22, y - r * 0.12);
      this.stroke(lw * 0.85);
    }
    // Feet.
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(x + s * r * 0.3, y + r * 0.95);
      ctx.lineTo(x + s * r * 0.3, y + r * 1.15);
      ctx.moveTo(x + s * r * 0.18, y + r * 1.2);
      ctx.lineTo(x + s * r * 0.3, y + r * 1.12);
      ctx.lineTo(x + s * r * 0.42, y + r * 1.2);
    }
    this.stroke(lw * 0.75);
  }

  snail(x: number, y: number, s: number, lw = LW) {
    const { ctx } = this;
    const k = s / 100;
    // Shell spiral.
    ctx.beginPath();
    for (let i = 0; i <= 300; i += 1) {
      const t = i / 300;
      const a = Math.PI + t * 2.4 * TAU;
      const rr = 34 * k * (1 - t * 0.88);
      const px = x + 4 * k + Math.cos(a) * rr;
      const py = y - 6 * k + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    this.stroke(lw);
    // Body.
    ctx.beginPath();
    ctx.moveTo(x - 30 * k, y + 28 * k);
    ctx.lineTo(x + 40 * k, y + 28 * k);
    ctx.quadraticCurveTo(x + 52 * k, y + 28 * k, x + 50 * k, y + 14 * k);
    ctx.lineTo(x + 46 * k, y - 14 * k);
    ctx.moveTo(x - 30 * k, y + 28 * k);
    ctx.quadraticCurveTo(x - 46 * k, y + 28 * k, x - 50 * k, y + 20 * k);
    this.stroke(lw);
    // Feelers.
    ctx.beginPath();
    ctx.moveTo(x + 44 * k, y - 12 * k);
    ctx.lineTo(x + 40 * k, y - 34 * k);
    ctx.moveTo(x + 48 * k, y - 12 * k);
    ctx.lineTo(x + 56 * k, y - 32 * k);
    this.stroke(lw * 0.75);
    ctx.beginPath();
    ctx.arc(x + 40 * k, y - 36 * k, 4 * k, 0, TAU);
    ctx.arc(x + 57 * k, y - 34 * k, 4 * k, 0, TAU);
    ctx.fill();
  }

  pencil(x: number, y: number, len: number, angleDeg: number, lw = LW) {
    const { ctx } = this;
    const w = len * 0.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad(angleDeg));
    ctx.beginPath();
    ctx.moveTo(-len / 2, -w / 2);
    ctx.lineTo(len * 0.28, -w / 2);
    ctx.lineTo(len / 2, 0);
    ctx.lineTo(len * 0.28, w / 2);
    ctx.lineTo(-len / 2, w / 2);
    ctx.closePath();
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len * 0.28, -w / 2);
    ctx.lineTo(len * 0.28, w / 2);
    ctx.moveTo(-len * 0.34, -w / 2);
    ctx.lineTo(-len * 0.34, w / 2);
    ctx.moveTo(-len * 0.5, 0);
    ctx.lineTo(len * 0.28, 0);
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len * 0.42, -w * 0.14);
    ctx.lineTo(len / 2, 0);
    ctx.lineTo(len * 0.42, w * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  book(x: number, y: number, w: number, lw = LW) {
    const { ctx } = this;
    const h = w * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.38);
    ctx.quadraticCurveTo(x - w * 0.25, y - h * 0.58, x - w / 2, y - h * 0.42);
    ctx.lineTo(x - w / 2, y + h * 0.5);
    ctx.quadraticCurveTo(x - w * 0.25, y + h * 0.34, x, y + h * 0.52);
    ctx.quadraticCurveTo(x + w * 0.25, y + h * 0.34, x + w / 2, y + h * 0.5);
    ctx.lineTo(x + w / 2, y - h * 0.42);
    ctx.quadraticCurveTo(x + w * 0.25, y - h * 0.58, x, y - h * 0.38);
    ctx.lineTo(x, y + h * 0.52);
    this.stroke(lw);
    ctx.beginPath();
    for (const s of [-1, 1]) {
      for (const t of [0, 1, 2]) {
        const yy = y - h * 0.18 + t * h * 0.2;
        ctx.moveTo(x + s * w * 0.1, yy);
        ctx.quadraticCurveTo(x + s * w * 0.25, yy - h * 0.08, x + s * w * 0.4, yy - h * 0.02);
      }
    }
    this.stroke(lw * 0.6);
  }

  trophy(x: number, y: number, s: number, lw = LW) {
    const { ctx } = this;
    const k = s / 100;
    ctx.beginPath();
    ctx.moveTo(x - 30 * k, y - 46 * k);
    ctx.lineTo(x + 30 * k, y - 46 * k);
    ctx.bezierCurveTo(x + 30 * k, y - 2 * k, x + 14 * k, y + 8 * k, x + 6 * k, y + 10 * k);
    ctx.lineTo(x + 6 * k, y + 28 * k);
    ctx.lineTo(x + 22 * k, y + 32 * k);
    ctx.lineTo(x + 22 * k, y + 44 * k);
    ctx.lineTo(x - 22 * k, y + 44 * k);
    ctx.lineTo(x - 22 * k, y + 32 * k);
    ctx.lineTo(x - 6 * k, y + 28 * k);
    ctx.lineTo(x - 6 * k, y + 10 * k);
    ctx.bezierCurveTo(x - 14 * k, y + 8 * k, x - 30 * k, y - 2 * k, x - 30 * k, y - 46 * k);
    ctx.closePath();
    this.stroke(lw);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * 29 * k, y - 38 * k);
      ctx.bezierCurveTo(x + sx * 50 * k, y - 40 * k, x + sx * 48 * k, y - 10 * k, x + sx * 22 * k, y - 8 * k);
      this.stroke(lw * 0.85);
    }
    this.star(x, y - 22 * k, 12 * k, true);
  }

  medal(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y - r * 2.1);
    ctx.lineTo(x - r * 0.15, y - r * 0.9);
    ctx.moveTo(x + r * 0.7, y - r * 2.1);
    ctx.lineTo(x + r * 0.15, y - r * 0.9);
    ctx.moveTo(x - r * 0.25, y - r * 2.1);
    ctx.lineTo(x + r * 0.15, y - r * 1.2);
    this.stroke(lw);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    this.stroke(lw);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, 0, TAU);
    this.stroke(lw * 0.6);
    this.star(x, y, r * 0.5, true);
  }

  laurel(r: number, from = 205, to = 335, leaves = 9, size = 1, lw = LW) {
    const { ctx } = this;
    for (const side of [-1, 1]) {
      // Stem.
      ctx.beginPath();
      for (let i = 0; i <= 60; i += 1) {
        const deg = from + ((to - from) * i) / 60;
        const a = rad(side === 1 ? deg : 180 - deg);
        const px = 500 + Math.cos(a) * r;
        const py = 500 - Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      this.stroke(lw * 0.7);
      for (let i = 0; i < leaves; i += 1) {
        const deg = from + ((to - from) * (i + 0.5)) / leaves;
        const a = rad(side === 1 ? deg : 180 - deg);
        const px = 500 + Math.cos(a) * r;
        const py = 500 - Math.sin(a) * r;
        // Tangent pointing up the branch (towards its tip).
        const tx = -Math.sin(a) * side;
        const ty = -Math.cos(a) * side;
        const ang = Math.atan2(ty, tx);
        const len = 46 * size * (1 - (i / leaves) * 0.25);
        for (const out of [1, -1]) {
          const nx = Math.cos(a) * out;
          const ny = -Math.sin(a) * out;
          ctx.save();
          ctx.translate(px + nx * len * 0.42, py + ny * len * 0.42);
          ctx.rotate(ang + (out * side * -0.55));
          ctx.beginPath();
          ctx.ellipse(len * 0.25, 0, len * 0.55, len * 0.2, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  ribbonBanner(y: number, w: number, h: number, lw = LW) {
    const { ctx } = this;
    const x0 = 500 - w / 2;
    const x1 = 500 + w / 2;
    // Tails behind the band.
    for (const s of [-1, 1]) {
      const xe = s === -1 ? x0 : x1;
      ctx.beginPath();
      ctx.moveTo(xe + s * -h * 0.1, y - h * 0.2);
      ctx.lineTo(xe + s * h * 0.95, y - h * 0.2);
      ctx.lineTo(xe + s * h * 0.6, y + h * 0.3);
      ctx.lineTo(xe + s * h * 0.95, y + h * 0.8);
      ctx.lineTo(xe + s * -h * 0.1, y + h * 0.8);
      ctx.closePath();
      this.stroke(lw);
    }
    this.erase(() => {
      ctx.beginPath();
      ctx.moveTo(x0, y - h / 2);
      ctx.quadraticCurveTo(500, y - h / 2 - h * 0.35, x1, y - h / 2);
      ctx.lineTo(x1, y + h / 2);
      ctx.quadraticCurveTo(500, y + h / 2 - h * 0.35, x0, y + h / 2);
      ctx.closePath();
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(x0, y - h / 2);
    ctx.quadraticCurveTo(500, y - h / 2 - h * 0.35, x1, y - h / 2);
    ctx.lineTo(x1, y + h / 2);
    ctx.quadraticCurveTo(500, y + h / 2 - h * 0.35, x0, y + h / 2);
    ctx.closePath();
    this.stroke(lw);
  }

  sun(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU;
      const r0 = r * 1.22;
      const r1 = r * (i % 2 === 0 ? 1.6 : 1.45);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      this.stroke(lw);
    }
    this.face(x, y, r, { hair: "bald", eyes: "happy", mouth: "open", cheeks: true });
  }

  /** A face inside a fat outlined star. */
  starFace(x: number, y: number, r: number, lw = LW) {
    this.star(x, y, r, false, 0, lw);
    const { ctx } = this;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * r * 0.15, y + r * 0.02, r * 0.045, r * 0.07, 0, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y + r * 0.1, r * 0.13, rad(25), rad(155));
    this.stroke(lw * 0.8);
  }

  pompom(x: number, y: number, r: number, lw = LW * 0.8) {
    const { ctx } = this;
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * TAU;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      this.stroke(lw);
    }
  }

  magnifier(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    this.stroke(lw * 1.2);
    ctx.beginPath();
    ctx.moveTo(x + r * 0.72, y + r * 0.72);
    ctx.lineTo(x + r * 1.55, y + r * 1.55);
    this.stroke(lw * 2.2);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, rad(200), rad(260));
    this.stroke(lw * 0.7);
  }

  /** A raised arm with an open hand beside a face at (x, y) of radius r. */
  raisedHand(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    const hx = x + r * 1.15;
    const hy = y - r * 1.15;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.78, y + r * 0.85);
    ctx.quadraticCurveTo(x + r * 1.3, y + r * 0.2, hx, hy + r * 0.32);
    this.stroke(lw * 1.1);
    ctx.beginPath();
    ctx.ellipse(hx, hy, r * 0.24, r * 0.3, 0.2, 0, TAU);
    this.stroke(lw * 0.9);
    for (const a of [-130, -100, -70, -40]) {
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(rad(a)) * r * 0.26, hy + Math.sin(rad(a)) * r * 0.3);
      ctx.lineTo(hx + Math.cos(rad(a)) * r * 0.46, hy + Math.sin(rad(a)) * r * 0.52);
      this.stroke(lw * 0.75);
    }
  }

  clover(x: number, y: number, r: number, lw = LW) {
    const { ctx } = this;
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + Math.PI / 4;
      // Each leaf is a heart with its point at the centre.
      ctx.save();
      ctx.translate(x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48);
      ctx.rotate(a + Math.PI / 2);
      this.heart(0, 0, r * 0.5, false, lw);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + r * 0.2, y + r * 0.9, x + r * 0.5, y + r * 1.25);
    this.stroke(lw);
  }
}
