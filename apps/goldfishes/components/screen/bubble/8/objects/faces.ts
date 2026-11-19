// 유명인 얼굴 (user, 2026-11-03): sixteen faces of the tech industry as 3D
// heads (두상) that roam the raft as the other objects do. Each head is a
// field like every other kind (fields.ts fieldOfHead), drawn in whatever
// material is chosen, and, like a 3D scan, coloured by its own photograph
// (headAlbedo; object-pass.ts, 오브제 · 얼굴 사진 색).
//
// The first trial (one egg for every head, the photo's luminance engraved on
// it) read as sixteen identical death masks (user: "다 똑같은 두상에 얼굴만 대충
// 하지 말고, 다 각기 다른 유명인들의 3d scan 두상이 명확히 들어나도록 제대로").
// Now a head is, per person:
//   its silhouette — the portrait's own head (hair, ears, face, the neck down
//     to the collar; no shoulders, no background), a matte in heads/<id>.png
//     beside the portraits. Each was traced by eye on a 10 px grid and the edge
//     then snapped to the photo's colours (a k-means colour model of face and
//     background, sampled from the face box and the photo's border, decides a
//     4 px band either side of the tracing; opened, closed, holes filled,
//     blurred), checked one by one on a contact sheet (2026-11-03);
//   its volume — the silhouette blown up as a membrane (∇²u = −1 inside, height
//     2√u), sunk under the jaw to a lower membrane of the neck alone, so the
//     jaw stands over the neck; on it a sculpted face (formAt: brow, sockets, nose, lips, chin,
//     cheekbones) at the face box's proportions;
//   its detail — the photograph's luminance band-passed fine (pores of the
//     hair, the rims of glasses, the lips' line), a thin layer only;
//   its colour — the photograph itself, cropped to the field's frame.
// A head is 3D first and textured second, as a scan is. A per-person depth map
// (heads/<id>-depth.png, brighter nearer, the same frame as the portrait) can
// be dropped in later through FaceEntry.depth: it then replaces the sculpted
// face and the luminance relief.
//
// The portraits are public/images/0908/tech-power-faces (Commons, see
// attribution.json there). Their face boxes were measured by eye (eyes, mouth
// and chin on a pixel grid; the face's height taken as the eyes-to-chin
// distance over 0.58, its centre 0.08 of it below the eyes). 013 Mira Murati
// (a profile behind a hand) and 016 Safra Catz (a small full-length figure)
// were replaced by 017 Mustafa Suleyman and 078 Bill Gates; 002 Zuckerberg is
// the only portrait of him in the set and stays turned.

import type { FaceKind } from "./groups.ts";

/** A face in its portrait: centre x, y and height chin to hairline, image pixels; `turn`, where its nose points when the face is turned, face heights right of the centre. */
export type FaceBox = { readonly x: number; readonly y: number; readonly h: number; readonly turn?: number };

/** A face: its name, its portrait, the head's matte beside it, a depth map if one is ever added, and its face box. */
export type FaceEntry = { readonly name: string; readonly file: string; readonly mask: string; readonly depth?: string; readonly box: FaceBox };

const FOLDER = "/images/0908/tech-power-faces/";
const entry = (name: string, id: string, box: FaceBox): FaceEntry => ({ name, file: `${FOLDER}${id}.jpg`, mask: `${FOLDER}heads/${id}.png`, box });

/** Measured by eye on 2026-11-03 (see the header). */
export const FACES: Record<FaceKind, FaceEntry> = {
  altman: entry("Sam Altman", "001", { x: 114, y: 120, h: 136 }),
  zuckerberg: entry("Mark Zuckerberg", "002", { x: 85, y: 123, h: 146, turn: -0.16 }),
  huang: entry("Jensen Huang", "003", { x: 102, y: 157, h: 157 }),
  pichai: entry("Sundar Pichai", "004", { x: 105, y: 126, h: 156 }),
  amodei: entry("Dario Amodei", "005", { x: 96, y: 137, h: 154, turn: -0.03 }),
  nadella: entry("Satya Nadella", "006", { x: 118, y: 131, h: 112 }),
  cook: entry("Tim Cook", "007", { x: 116, y: 126, h: 123 }),
  musk: entry("Elon Musk", "008", { x: 124, y: 112, h: 134 }),
  hassabis: entry("Demis Hassabis", "009", { x: 116, y: 125, h: 150 }),
  jassy: entry("Andy Jassy", "010", { x: 154, y: 118, h: 128 }),
  su: entry("Lisa Su", "011", { x: 125, y: 120, h: 113 }),
  chew: entry("Shou Zi Chew", "012", { x: 92, y: 122, h: 140 }),
  suleyman: entry("Mustafa Suleyman", "017", { x: 116, y: 116, h: 131 }),
  chesky: entry("Brian Chesky", "014", { x: 118, y: 86, h: 89 }),
  ma: entry("Pony Ma", "015", { x: 126, y: 94, h: 97 }),
  gates: entry("Bill Gates", "078", { x: 119, y: 99, h: 121 }),
};

/**
 * A decoded portrait: its luminance (0–1, row by row from the top), its colours (RGBA, sRGB), its head's matte
 * (0–1; null: an oval from the face box stands in) and its depth map (0–1, brighter nearer) if it has one.
 */
export type Portrait = {
  readonly width: number;
  readonly height: number;
  readonly luminance: Float32Array;
  readonly colour?: Uint8ClampedArray | null;
  readonly mask?: Float32Array | null;
  readonly depth?: Float32Array | null;
};

/** How far the head reaches from the centre at most, as the other kinds fill about 1.15 of the disc. */
export const HEAD_REACH = 1.15;

/** The volume's depth, times the membrane's. */
const DEPTH = 1.1;
/** The neck's membrane, times the skull's: it stands back under the jaw. */
const NECK = 0.62;
/** The jaw (in face heights, the face's centre at the origin): the lower half of an ellipse, centre y, half width, half height. */
const JAW_Y = 0.06;
const JAW_A = 0.42;
const JAW_B = 0.46;
/** How much of the sculpted face (formAt) lies on the volume. */
const FORM = 1;
/** The fine relief: the band kept (face heights), its depth per standard deviation and where it saturates. */
const FINE_NARROW = 0.008;
const FINE_WIDE = 0.035;
const FINE = 0.006;
const FINE_LIMIT = 2;
/** A depth map's depth, face heights from its darkest to its brightest. */
const DEPTH_MAP = 0.35;

/** The grid the head is built on before it is read at the field's resolution: cells per side over the reach. */
const GRID = 256;

/** A bump: amplitude at x0, y0 with spreads sx, sy (face heights). */
function bump(x: number, y: number, x0: number, y0: number, sx: number, sy: number, amplitude: number) {
  return amplitude * Math.exp(-0.5 * (((x - x0) / sx) ** 2 + ((y - y0) / sy) ** 2));
}

/**
 * A sculptor's face, height in face heights at x, y (face heights, the face's centre at the origin, the eyes
 * 0.08 above it): the nose and what is between brow and chin moved `turn` sideways.
 */
export function formAt(x: number, y: number, turn = 0) {
  const nose = x - turn;
  const middle = x - turn * 0.6;
  let h = 0;
  // The face's mass stands forward of the skull; the temples fall away beside it.
  h += bump(middle, y, 0, 0.04, 0.26, 0.36, 0.07);
  h += bump(x, y, -0.36, -0.16, 0.08, 0.14, -0.025) + bump(x, y, 0.36, -0.16, 0.08, 0.14, -0.025);
  // Brow ridge and forehead, the eye sockets under it, the eyes in them.
  h += bump(middle, y, 0, -0.16, 0.3, 0.06, 0.025);
  h += bump(middle, y, -0.155, -0.075, 0.085, 0.05, -0.06) + bump(middle, y, 0.155, -0.075, 0.085, 0.05, -0.06);
  h += bump(middle, y, -0.155, -0.075, 0.045, 0.026, 0.022) + bump(middle, y, 0.155, -0.075, 0.045, 0.026, 0.022);
  // The nose: a ridge from between the brows growing to its tip, its wings either side, falling under the tip.
  const along = Math.max(0, Math.min(1, (y + 0.1) / 0.27));
  const fall = y < 0.17 ? 1 : Math.exp(-(((y - 0.17) / 0.035) ** 2));
  h += bump(nose, y, 0, 0.05, 0.03 + 0.03 * along, 0.16, 0.035 + 0.09 * along * along) * fall;
  h += bump(nose, y, -0.06, 0.165, 0.035, 0.03, 0.02) + bump(nose, y, 0.06, 0.165, 0.035, 0.03, 0.02);
  // Cheekbones, and the hollows under them.
  h += bump(middle, y, -0.22, 0.03, 0.08, 0.07, 0.025) + bump(middle, y, 0.22, 0.03, 0.08, 0.07, 0.025);
  h += bump(middle, y, -0.25, 0.22, 0.07, 0.08, -0.015) + bump(middle, y, 0.25, 0.22, 0.07, 0.08, -0.015);
  // The lips: upper and lower, the line between, the groove under them, the chin.
  h += bump(middle, y, 0, 0.27, 0.1, 0.03, 0.03);
  h += bump(middle, y, 0, 0.325, 0.085, 0.028, 0.022);
  h += bump(middle, y, 0, 0.297, 0.1, 0.008, -0.012);
  h += bump(middle, y, 0, 0.37, 0.07, 0.022, -0.012);
  h += bump(middle, y, 0, 0.44, 0.1, 0.05, 0.03);
  return h;
}

/** How far a point (face heights) is under the jaw, 0 on the face … 1 on the neck: a soft edge, so the jaw stands over the neck without a seam. */
function underJaw(x: number, y: number, turn: number) {
  const r = Math.hypot((x - turn * 0.5) / JAW_A, (y - JAW_Y) / JAW_B);
  const out = Math.max(0, Math.min(1, (r - 1) / 0.14));
  const below = Math.max(0, Math.min(1, (y - JAW_Y) / 0.16));
  return out * out * (3 - 2 * out) * below * below * (3 - 2 * below);
}

/** The matte's value at image x, y (bilinear; 0 outside the image), or, without a matte, an oval head from the face box. */
function maskAt(portrait: Portrait, box: FaceBox, x: number, y: number) {
  if (portrait.mask) return sample(portrait.mask, portrait.width, portrait.height, x, y, 0);
  const u = (x - box.x) / box.h;
  const v = (y - box.y) / box.h;
  const skull = Math.hypot(u / 0.46, (v + 0.12) / 0.66) < 1;
  const neck = Math.abs(u) < 0.24 && v > 0 && v < 0.75;
  return skull || neck ? 1 : 0;
}

/** A grid's value at image x, y, bilinear; `outside` beyond its edges (null: clamped). */
function sample(values: Float32Array, width: number, height: number, x: number, y: number, outside: number | null) {
  const fx = x - 0.5;
  const fy = y - 0.5;
  if (outside !== null && (fx < -1 || fy < -1 || fx > width || fy > height)) return outside;
  const cx = Math.max(0, Math.min(width - 1.001, fx));
  const cy = Math.max(0, Math.min(height - 1.001, fy));
  const ix = Math.floor(cx);
  const iy = Math.floor(cy);
  const tx = cx - ix;
  const ty = cy - iy;
  const at = iy * width + ix;
  return (values[at]! * (1 - tx) + values[at + 1]! * tx) * (1 - ty) + (values[at + width]! * (1 - tx) + values[at + width + 1]! * tx) * ty;
}

/**
 * Where the head sits in the object's frame: object units per face height, and the point (face heights from the
 * face's centre) at the frame's centre — the middle of the head's extent, so it sits in its disc, and scaled so it
 * reaches HEAD_REACH at most.
 */
export function headFrame(portrait: Portrait, box: FaceBox) {
  // Over the face box's neighbourhood, in face heights.
  const n = 200;
  const span = 1.6;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const inside: [number, number][] = [];
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const u = -span + (2 * span * (i + 0.5)) / n;
      const v = -span + (2 * span * (j + 0.5)) / n;
      if (maskAt(portrait, box, box.x + u * box.h, box.y + v * box.h) < 0.5) continue;
      inside.push([u, v]);
      minX = Math.min(minX, u);
      maxX = Math.max(maxX, u);
      minY = Math.min(minY, v);
      maxY = Math.max(maxY, v);
    }
  }
  if (inside.length === 0) return { scale: 1, centreX: 0, centreY: 0 };
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  let furthest = 0;
  for (const [u, v] of inside) furthest = Math.max(furthest, Math.hypot(u - centreX, v - centreY));
  return { scale: HEAD_REACH / (furthest + span / n), centreX, centreY };
}

/** Separable Gaussian blur of a `size`² grid, sigma in cells, edges clamped. */
function blur(values: Float32Array, size: number, sigma: number) {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let k = -radius; k <= radius; k += 1) sum += kernel[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma));
  for (let k = 0; k < kernel.length; k += 1) kernel[k] = kernel[k]! / sum;
  const across = new Float32Array(values.length);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      for (let k = -radius; k <= radius; k += 1) value += kernel[k + radius]! * values[y * size + Math.max(0, Math.min(size - 1, x + k))]!;
      across[y * size + x] = value;
    }
  }
  const out = new Float32Array(values.length);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      for (let k = -radius; k <= radius; k += 1) value += kernel[k + radius]! * across[Math.max(0, Math.min(size - 1, y + k)) * size + x]!;
      out[y * size + x] = value;
    }
  }
  return out;
}

/** ∇²u = −1 where `inside`, 0 elsewhere, on a `size`² grid of cell `step`, by over-relaxed Gauss–Seidel. */
function membrane(inside: Uint8Array, size: number, step: number) {
  const u = new Float64Array(size * size);
  const relax = 2 / (1 + Math.sin(Math.PI / size));
  for (let sweep = 0; sweep < size * 3; sweep += 1) {
    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const at = y * size + x;
        if (!inside[at]) continue;
        const next = (u[at - 1]! + u[at + 1]! + u[at - size]! + u[at + size]! + step * step) / 4;
        u[at] = u[at]! + relax * (next - u[at]!);
      }
    }
  }
  return u;
}

/** Catmull–Rom weights for a fraction t. */
function cubic(t: number, w: Float64Array) {
  const t2 = t * t;
  const t3 = t2 * t;
  w[0] = 0.5 * (-t3 + 2 * t2 - t);
  w[1] = 0.5 * (3 * t3 - 5 * t2 + 2);
  w[2] = 0.5 * (-3 * t3 + 4 * t2 + t);
  w[3] = 0.5 * (t3 - t2);
}

/**
 * The head's height over the object's frame on a `size`² grid over [−extent, extent]²: −∞ outside its
 * silhouette, and its normal's x, y per texel (the height's slope; z is the rest of a unit vector).
 */
export function headSurface(portrait: Portrait, box: FaceBox, size: number, extent: number) {
  const { scale, centreX, centreY } = headFrame(portrait, box);
  const turn = box.turn ?? 0;
  // The grid: cells over [−reach, reach]² of the object's frame, a margin beyond the silhouette.
  const reach = HEAD_REACH * 1.05;
  const cell = (reach * 2) / GRID;
  const faceOf = (px: number, py: number) => [px / scale + centreX, py / scale + centreY] as const;
  const skull = new Uint8Array(GRID * GRID);
  const neck = new Uint8Array(GRID * GRID);
  const jaw = new Float32Array(GRID * GRID);
  const luminance = new Float32Array(GRID * GRID);
  const depthMap = portrait.depth ? new Float32Array(GRID * GRID) : null;
  for (let j = 0; j < GRID; j += 1) {
    for (let i = 0; i < GRID; i += 1) {
      const at = j * GRID + i;
      const [fx, fy] = faceOf(-reach + (i + 0.5) * cell, -reach + (j + 0.5) * cell);
      const ix = box.x + fx * box.h;
      const iy = box.y + fy * box.h;
      const inside = maskAt(portrait, box, ix, iy) >= 0.5;
      // The neck runs up behind the jaw, so it has no rim there.
      skull[at] = inside ? 1 : 0;
      jaw[at] = underJaw(fx, fy, turn);
      neck[at] = inside && fy > JAW_Y ? 1 : 0;
      luminance[at] = sample(portrait.luminance, portrait.width, portrait.height, ix, iy, null);
      if (depthMap) depthMap[at] = sample(portrait.depth!, portrait.width, portrait.height, ix, iy, null);
    }
  }
  // The fine relief: a narrow band of the luminance, normalised over the face.
  const faceCells = scale / cell;
  const narrow = blur(luminance, GRID, Math.max(0.6, FINE_NARROW * faceCells));
  const wide = blur(luminance, GRID, FINE_WIDE * faceCells);
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let at = 0; at < luminance.length; at += 1) {
    if (!skull[at]) continue;
    const value = narrow[at]! - wide[at]!;
    sum += value;
    sumSquares += value * value;
    count += 1;
  }
  const mean = count ? sum / count : 0;
  const deviation = Math.sqrt(Math.max(1e-12, count ? sumSquares / count - mean * mean : 0));
  let depthLow = Infinity;
  let depthHigh = -Infinity;
  if (depthMap) {
    for (let at = 0; at < depthMap.length; at += 1) {
      if (!skull[at]) continue;
      depthLow = Math.min(depthLow, depthMap[at]!);
      depthHigh = Math.max(depthHigh, depthMap[at]!);
    }
  }
  // The volume: the skull's membrane, the neck's lower; where the skull's is deep, the face on it.
  const head = membrane(skull, GRID, cell);
  const column = membrane(neck, GRID, cell);
  let deepest = 0;
  for (let at = 0; at < head.length; at += 1) deepest = Math.max(deepest, head[at]!);
  const heights = new Float32Array(GRID * GRID);
  for (let j = 0; j < GRID; j += 1) {
    for (let i = 0; i < GRID; i += 1) {
      const at = j * GRID + i;
      const whole = 2 * Math.sqrt(Math.max(0, head[at]!));
      const volume = whole + (Math.min(whole, NECK * 2 * Math.sqrt(Math.max(0, column[at]!))) - whole) * jaw[at]!;
      // The detail fades in from the outline: none on the edge, full a little way in.
      const depth = Math.max(0, Math.min(1, head[at]! / deepest / 0.25)) * (1 - jaw[at]!);
      const fade = depth * depth * (3 - 2 * depth);
      const [fx, fy] = faceOf(-reach + (i + 0.5) * cell, -reach + (j + 0.5) * cell);
      let detail: number;
      if (depthMap && depthHigh > depthLow) {
        detail = (DEPTH_MAP * (depthMap[at]! - depthLow)) / (depthHigh - depthLow);
      } else {
        const deviations = (narrow[at]! - wide[at]! - mean) / deviation;
        detail = FORM * formAt(fx, fy, turn) + FINE * FINE_LIMIT * Math.tanh(deviations / FINE_LIMIT);
      }
      heights[at] = DEPTH * volume + scale * detail * fade;
    }
  }
  // Read at the field's grid, bicubically (smooth slopes), inside the matte's exact edge.
  const height = new Float32Array(size * size).fill(-Infinity);
  const normal = new Float32Array(size * size * 2);
  const unit = (extent * 2) / size;
  const wx = new Float64Array(4);
  const wy = new Float64Array(4);
  const read = (px: number, py: number) => {
    const gx = (px + reach) / cell - 0.5;
    const gy = (py + reach) / cell - 0.5;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    cubic(gx - ix, wx);
    cubic(gy - iy, wy);
    let value = 0;
    for (let b = 0; b < 4; b += 1) {
      const row = Math.max(0, Math.min(GRID - 1, iy - 1 + b)) * GRID;
      let line = 0;
      for (let a = 0; a < 4; a += 1) line += wx[a]! * heights[row + Math.max(0, Math.min(GRID - 1, ix - 1 + a))]!;
      value += wy[b]! * line;
    }
    return Math.max(0, value);
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) * unit - extent;
      const py = (y + 0.5) * unit - extent;
      if (Math.abs(px) > reach || Math.abs(py) > reach) continue;
      const [fx, fy] = faceOf(px, py);
      if (maskAt(portrait, box, box.x + fx * box.h, box.y + fy * box.h) < 0.5) continue;
      const at = y * size + x;
      height[at] = read(px, py);
      const hx = (read(px + unit, py) - read(px - unit, py)) / (2 * unit);
      const hy = (read(px, py + unit) - read(px, py - unit)) / (2 * unit);
      const length = Math.hypot(hx, hy, 1);
      normal[at * 2] = -hx / length;
      normal[at * 2 + 1] = -hy / length;
    }
  }
  return { height, normal };
}

/** Texels per side of a face's colour (its albedo) over the field's frame. */
export const ALBEDO_SIZE = 256;

/**
 * The portrait's colours over the field's frame ([−extent, extent]², as headSurface lays the head), RGBA sRGB,
 * `size`² texels from the top: alpha the matte; outside it, the nearest colour inside carried out, so a blurred or
 * mipmapped read at the edge never takes the background's.
 */
export function headAlbedo(portrait: Portrait, box: FaceBox, size: number, extent: number) {
  const { scale, centreX, centreY } = headFrame(portrait, box);
  const out = new Uint8ClampedArray(size * size * 4);
  const colour = portrait.colour;
  const unit = (extent * 2) / size;
  const filled = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fx = ((x + 0.5) * unit - extent) / scale + centreX;
      const fy = ((y + 0.5) * unit - extent) / scale + centreY;
      const ix = box.x + fx * box.h;
      const iy = box.y + fy * box.h;
      const at = (y * size + x) * 4;
      const alpha = maskAt(portrait, box, ix, iy);
      out[at + 3] = Math.round(alpha * 255);
      if (alpha <= 0.02) continue;
      filled[y * size + x] = 1;
      if (!colour) {
        const l = sample(portrait.luminance, portrait.width, portrait.height, ix, iy, null) * 255;
        out[at] = out[at + 1] = out[at + 2] = l;
        continue;
      }
      // Bilinear over the RGBA bytes.
      const cx = Math.max(0, Math.min(portrait.width - 1.001, ix - 0.5));
      const cy = Math.max(0, Math.min(portrait.height - 1.001, iy - 0.5));
      const x0 = Math.floor(cx);
      const y0 = Math.floor(cy);
      const tx = cx - x0;
      const ty = cy - y0;
      for (let c = 0; c < 3; c += 1) {
        const p = (y0 * portrait.width + x0) * 4 + c;
        const q = p + portrait.width * 4;
        out[at + c] = (colour[p]! * (1 - tx) + colour[p + 4]! * tx) * (1 - ty) + (colour[q]! * (1 - tx) + colour[q + 4]! * tx) * ty;
      }
    }
  }
  // Carry the colours out, ring by ring, as the average of the filled neighbours.
  for (let pass = 0; pass < size; pass += 1) {
    const next: number[] = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (filled[y * size + x]) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= size || yy >= size || !filled[yy * size + xx]) continue;
            const at = (yy * size + xx) * 4;
            r += out[at]!;
            g += out[at + 1]!;
            b += out[at + 2]!;
            n += 1;
          }
        }
        if (n > 0) next.push(y * size + x, r / n, g / n, b / n);
      }
    }
    if (next.length === 0) break;
    for (let k = 0; k < next.length; k += 4) {
      const at = next[k]!;
      out[at * 4] = next[k + 1]!;
      out[at * 4 + 1] = next[k + 2]!;
      out[at * 4 + 2] = next[k + 3]!;
      filled[at] = 1;
    }
  }
  return out;
}

/** An image's RGBA pixels, fetched and decoded off the main thread (a worker has fetch, createImageBitmap and OffscreenCanvas). */
async function pixelsOf(file: string) {
  const response = await fetch(file);
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("no 2d context");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { width, height, pixels: context.getImageData(0, 0, width, height).data };
}

/** One channel of an image the portrait's size, 0–1 (null if it cannot be read or does not match). */
async function channelOf(file: string | undefined, width: number, height: number) {
  if (!file) return null;
  const image = await pixelsOf(file).catch(() => null);
  if (!image || image.width !== width || image.height !== height) return null;
  const values = new Float32Array(width * height);
  for (let at = 0; at < values.length; at += 1) values[at] = image.pixels[at * 4]! / 255;
  return values;
}

/** A face's portrait decoded: its colours and luminance, its head's matte and, if it has one, its depth map. */
export async function loadPortrait(face: FaceEntry): Promise<Portrait> {
  const { width, height, pixels } = await pixelsOf(face.file);
  const luminance = new Float32Array(width * height);
  for (let at = 0; at < luminance.length; at += 1) {
    luminance[at] = (0.2126 * pixels[at * 4]! + 0.7152 * pixels[at * 4 + 1]! + 0.0722 * pixels[at * 4 + 2]!) / 255;
  }
  const [mask, depth] = await Promise.all([channelOf(face.mask, width, height), channelOf(face.depth, width, height)]);
  return { width, height, luminance, colour: pixels, mask, depth };
}
