// 인쇄물's press: what a painted layout goes through to become printed matter. Runs in the painter's thread
// (print-worker.ts) on an OffscreenCanvas; nothing here is drawn by hand — it is the process that makes print
// look like print:
//   - photographs are real photographs (the app's own Commons-licensed stock, public/assets/goldfishes/
//     pc-mobiles-2/stock, credits.json beside them), never drawn stand-ins;
//   - 신문: each photograph is separated into cyan, magenta, yellow and black and screened as round dots, a plate
//     an angle (15°, 75°, 0°, 45°), the dot's size taken at its own middle as a real screen's is, the colour plates
//     a little out of register; the sheet is newsprint with its fibre;
//   - 전단: the same screen, finer, on cheap bright stock, the whole sheet's magenta and yellow out of register;
//   - 복사: a photocopy — everything thresholded to toner on coloured paper, with the copier's speckle and streaks;
//   - 잡지 and 레이저: fine enough that no screen shows.

export type Ctx = OffscreenCanvasRenderingContext2D;
export type Rect = readonly [number, number, number, number];
export type Press = "news" | "cheap" | "xerox" | "gloss" | "laser";

export type Job = {
  ctx: Ctx;
  size: number;
  random: () => number;
  /** The next photograph (they come round in a shuffled order). */
  photo: () => ImageBitmap;
  /** Where screened photographs lie. */
  screens: Rect[];
  press: Press;
  /** The stock's colour, 0–255. */
  paper: readonly [number, number, number];
};

export function mulberry(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)]!;
export const css = (c: readonly [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;

/** A photograph filling a box (cropped to it), marked for the screen. `tone` multiplies it (a duotone's ink). */
export function photograph(job: Job, x: number, y: number, w: number, h: number, screened = true) {
  const image = job.photo();
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  job.ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
  // Screened at once, so that type set over a photograph afterwards stays solid ink, as on a real plate.
  if (!screened || (job.press !== "news" && job.press !== "cheap")) return;
  const news = job.press === "news";
  const rect: Rect = [Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), Math.round(w), Math.round(h)];
  const pixels = job.ctx.getImageData(0, 0, job.size, job.size);
  screen(pixels.data, job.size, rect, news ? 4.4 : 3.1, job.paper, news ? 1.1 : 0.9, job.random);
  job.ctx.putImageData(pixels, 0, 0, rect[0], rect[1], rect[2], rect[3]);
  job.screens.push(rect);
}

type TextStyle = {
  size: number;
  family: string;
  weight?: number | string;
  colour?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** Never wider than this: the line is squeezed to fit (장평), as a headline writer's is. */
  width?: number;
  /** Horizontal scale of the glyphs (condensed display type). */
  squeeze?: number;
  italic?: boolean;
  spacing?: number;
  stroke?: string;
  strokeWidth?: number;
};

/** One line of type. Returns its drawn width. */
export function type(job: Job, text: string, x: number, y: number, style: TextStyle) {
  const { ctx } = job;
  const squeeze = style.squeeze ?? 1;
  ctx.save();
  ctx.font = `${style.italic ? "italic " : ""}${style.weight ?? 400} ${style.size}px ${style.family}`;
  ctx.textAlign = style.align ?? "left";
  ctx.textBaseline = style.baseline ?? "alphabetic";
  ctx.letterSpacing = `${style.spacing ?? 0}px`;
  ctx.translate(x, y);
  ctx.scale(squeeze, 1);
  const natural = ctx.measureText(text).width;
  const most = style.width === undefined ? undefined : style.width / squeeze;
  if (style.stroke) {
    ctx.lineJoin = "round";
    ctx.lineWidth = style.strokeWidth ?? style.size * 0.14;
    ctx.strokeStyle = style.stroke;
    ctx.strokeText(text, 0, 0, most);
  }
  ctx.fillStyle = style.colour ?? "#1c1b1a";
  ctx.fillText(text, 0, 0, most);
  ctx.restore();
  return Math.min(natural, most ?? natural) * squeeze;
}

/** Korean body text set solid in a column: every line squeezed to the measure, so both edges are straight. */
export function setKorean(job: Job, corpus: string, x: number, y: number, w: number, h: number, size: number, family: string, colour = "#1c1b1a", weight = 400) {
  const { ctx } = job;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = colour;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.letterSpacing = "0px";
  const perLine = Math.max(3, Math.round((w / size) * 1.08));
  let at = Math.floor(job.random() * corpus.length);
  const leading = Math.round(size * 1.38);
  for (let line = y; line + size <= y + h; line += leading) {
    let text = "";
    while (text.length < perLine) {
      const ch = corpus[at % corpus.length]!;
      at += 1;
      if (ch !== " " || text.length > 0) text += ch;
    }
    ctx.fillText(text, x, line, w);
  }
}

/** Latin body text, wrapped and justified by word spacing (the last line of a paragraph left ragged). */
export function setLatin(job: Job, corpus: readonly string[], x: number, y: number, w: number, h: number, size: number, family: string, colour = "#1c1b1a", weight: number | string = 400, justify = true) {
  const { ctx } = job;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = colour;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.letterSpacing = "0px";
  const leading = Math.round(size * 1.25);
  let at = Math.floor(job.random() * corpus.length);
  for (let line = y; line + size <= y + h; line += leading) {
    const words: string[] = [];
    let width = 0;
    ctx.wordSpacing = "0px";
    for (;;) {
      const word = corpus[at % corpus.length]!;
      const next = ctx.measureText(words.length ? ` ${word}` : word).width;
      if (width + next > w && words.length > 0) break;
      words.push(word);
      width += next;
      at += 1;
      if (word.endsWith(".") && job.random() < 0.18) break;
    }
    const gaps = words.length - 1;
    const slack = w - width;
    ctx.wordSpacing = justify && gaps > 0 && slack < w * 0.25 ? `${slack / gaps}px` : "0px";
    ctx.fillText(words.join(" "), x, line);
  }
  ctx.wordSpacing = "0px";
}

export function rule(job: Job, x: number, y: number, w: number, h: number, colour = "#1c1b1a") {
  job.ctx.fillStyle = colour;
  job.ctx.fillRect(x, y, w, h);
}

export function box(job: Job, x: number, y: number, w: number, h: number, colour: string, radius = 0) {
  const { ctx } = job;
  ctx.fillStyle = colour;
  if (radius <= 0) {
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

/** A bar code: bars of four widths, as an EAN's. */
export function barcode(job: Job, x: number, y: number, w: number, h: number) {
  box(job, x - 6, y - 5, w + 12, h + 18, "#ffffff");
  job.ctx.fillStyle = "#111111";
  for (let at = x; at < x + w; ) {
    const bar = 1 + Math.floor(job.random() * 3);
    job.ctx.fillRect(at, y, bar, h);
    at += bar + 1 + Math.floor(job.random() * 3);
  }
  type(job, `${Math.floor(job.random() * 9)} ${String(Math.floor(job.random() * 899999) + 100000)} ${String(Math.floor(job.random() * 899999) + 100000)}`, x + w / 2, y + h + 10, { size: 9, family: "Courier, monospace", align: "center", colour: "#111111" });
}

/** A QR-like matrix (finder squares and noise modules; it encodes nothing). */
export function matrixCode(job: Job, x: number, y: number, side: number, ink = "#111111") {
  const n = 25;
  const cell = side / n;
  box(job, x - cell * 2, y - cell * 2, side + cell * 4, side + cell * 4, "#ffffff");
  job.ctx.fillStyle = ink;
  const finder = (i: number, j: number) => (i < 7 && j < 7) || (i >= n - 7 && j < 7) || (i < 7 && j >= n - 7);
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      let on = job.random() < 0.48;
      if (finder(i, j)) {
        const a = i < 7 ? i : i - (n - 7);
        const b = j < 7 ? j : j - (n - 7);
        const ring = Math.max(Math.abs(a - 3), Math.abs(b - 3));
        on = ring !== 2;
      }
      if (on) job.ctx.fillRect(x + i * cell, y + j * cell, cell + 0.4, cell + 0.4);
    }
  }
}

const PLATES = [
  { angle: (15 * Math.PI) / 180 }, // cyan
  { angle: (75 * Math.PI) / 180 }, // magenta
  { angle: 0 }, // yellow
  { angle: (45 * Math.PI) / 180 }, // black
] as const;

/** Screens one photograph in place: four plates of round dots, each dot's size read at its own middle. */
function screen(data: Uint8ClampedArray, size: number, [x0, y0, w, h]: Rect, pitch: number, paper: readonly [number, number, number], slip: number, random: () => number) {
  const x1 = Math.min(size, x0 + w);
  const y1 = Math.min(size, y0 + h);
  const sx = Math.max(0, x0);
  const sy = Math.max(0, y0);
  const source = new Uint8ClampedArray((x1 - sx) * (y1 - sy) * 3);
  const sw = x1 - sx;
  for (let y = sy; y < y1; y += 1) {
    for (let x = sx; x < x1; x += 1) {
      const from = (y * size + x) * 4;
      const to = ((y - sy) * sw + (x - sx)) * 3;
      source[to] = data[from]!;
      source[to + 1] = data[from + 1]!;
      source[to + 2] = data[from + 2]!;
    }
  }
  // Each colour plate a fraction of a pixel out of register.
  const offsets = PLATES.map((plate, index) => (index === 3 ? [0, 0] : [(random() - 0.5) * 2 * slip, (random() - 0.5) * 2 * slip]) as [number, number]);
  const trig = PLATES.map((plate) => [Math.cos(plate.angle), Math.sin(plate.angle)] as const);
  const cover = [0, 0, 0, 0];
  for (let y = sy; y < y1; y += 1) {
    for (let x = sx; x < x1; x += 1) {
      for (let p = 0; p < 4; p += 1) {
        const [cos, sin] = trig[p]!;
        const px = x - offsets[p]![0];
        const py = y - offsets[p]![1];
        const u = px * cos + py * sin;
        const v = -px * sin + py * cos;
        const cu = (Math.floor(u / pitch) + 0.5) * pitch;
        const cv = (Math.floor(v / pitch) + 0.5) * pitch;
        // The dot's middle, back on the sheet: the photograph there says how large the dot is.
        const mx = Math.min(x1 - 1, Math.max(sx, Math.round(cu * cos - cv * sin + offsets[p]![0])));
        const my = Math.min(y1 - 1, Math.max(sy, Math.round(cu * sin + cv * cos + offsets[p]![1])));
        const at = ((my - sy) * sw + (mx - sx)) * 3;
        const c = 1 - source[at]! / 255;
        const m = 1 - source[at + 1]! / 255;
        const yl = 1 - source[at + 2]! / 255;
        const k = Math.min(c, m, yl) * 0.8;
        const ink = p === 0 ? (c - k) / (1 - k + 1e-3) : p === 1 ? (m - k) / (1 - k + 1e-3) : p === 2 ? (yl - k) / (1 - k + 1e-3) : k;
        const radius = pitch * 0.74 * Math.sqrt(Math.max(0, ink) * 1.08);
        const distance = Math.hypot(u - cu, v - cv);
        cover[p] = Math.min(1, Math.max(0, radius - distance + 0.5));
      }
      const to = (y * size + x) * 4;
      const black = 1 - 0.93 * cover[3]!;
      data[to] = paper[0] * (1 - 0.94 * cover[0]!) * (1 - 0.06 * cover[1]!) * black;
      data[to + 1] = paper[1] * (1 - 0.22 * cover[0]!) * (1 - 0.9 * cover[1]!) * (1 - 0.04 * cover[2]!) * black;
      data[to + 2] = paper[2] * (1 - 0.1 * cover[0]!) * (1 - 0.3 * cover[1]!) * (1 - 0.92 * cover[2]!) * black;
    }
  }
}

/** The sheet through its press. */
export function press(job: Job) {
  const { ctx, size, random } = job;
  if (job.press === "gloss" || job.press === "laser") return;
  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  if (job.press === "xerox") {
    // Toner on coloured stock: everything darker than a threshold that wanders with the copier's unevenness.
    const streak = new Float32Array(size);
    let drift = 0;
    for (let x = 0; x < size; x += 1) {
      drift = drift * 0.985 + (random() - 0.5) * 3;
      streak[x] = drift + (random() < 0.004 ? 60 : 0);
    }
    for (let y = 0; y < size; y += 1) {
      const band = 14 * Math.sin(y * 0.011) + 8 * Math.sin(y * 0.047 + 1.3);
      for (let x = 0; x < size; x += 1) {
        const at = (y * size + x) * 4;
        const luma = 0.299 * data[at]! + 0.587 * data[at + 1]! + 0.114 * data[at + 2]!;
        const noise = (random() - 0.5) * 70;
        const toner = luma + noise + band + streak[x]! < 128 || random() < 0.0016;
        const ink = toner ? 0.1 + 0.08 * random() : 1;
        data[at] = job.paper[0] * ink;
        data[at + 1] = job.paper[1] * ink;
        data[at + 2] = job.paper[2] * ink;
      }
    }
    ctx.putImageData(image, 0, 0);
    return;
  }
  const news = job.press === "news";
  if (news) {
    // Newsprint: fibre, and ink that never quite reaches black.
    for (let at = 0; at < data.length; at += 4) {
      const fibre = 1 - 0.07 * random() * random();
      data[at] = (18 + data[at]! * 0.93) * fibre;
      data[at + 1] = (17 + data[at + 1]! * 0.93) * fibre;
      data[at + 2] = (16 + data[at + 2]! * 0.93) * fibre;
    }
  } else {
    // Cheap four-colour: magenta a pixel to the right, yellow a pixel down, over the whole sheet.
    const copy = new Uint8ClampedArray(data);
    const dx = random() < 0.5 ? 1 : 2;
    for (let y = 1; y < size; y += 1) {
      for (let x = dx; x < size; x += 1) {
        const at = (y * size + x) * 4;
        data[at + 1] = copy[(y * size + x - dx) * 4 + 1]!;
        data[at + 2] = copy[((y - 1) * size + x) * 4 + 2]!;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}
