import * as THREE from "three";

export type Rand = () => number;

export function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function texture(c: HTMLCanvasElement, srgb: boolean, anisotropy: number) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  return t;
}

export type Pbr = { map: THREE.Texture; normalMap: THREE.Texture; ormMap: THREE.Texture };

/** Soft light/dark blotches drawn with gradients (no per-pixel loops), wrapped for tiling. */
function blotches(x: CanvasRenderingContext2D, w: number, h: number, r: Rand, count: number, size: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const cx = r() * w;
    const cy = r() * h;
    const rad = size * (0.3 + r());
    const dark = r() < 0.55;
    const c = dark ? "0,0,0" : "255,255,255";
    const a = alpha * (0.4 + r() * 0.6);
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      const g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rad);
      g.addColorStop(0, `rgba(${c},${a})`);
      g.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = g;
      x.fillRect(cx + ox - rad, cy + oy - rad, rad * 2, rad * 2);
    }
  }
}

/** One cleat (4 px across: ridge, falling flank, groove, rising flank); repeat it 128× per metre. */
function cleatNormal() {
  const [c, x] = canvas(4, 4);
  for (const [i, col] of [[0, "rgb(128,128,255)"], [1, "rgb(206,128,206)"], [2, "rgb(128,128,255)"], [3, "rgb(50,128,206)"]] as const) {
    x.fillStyle = col;
    x.fillRect(i, 0, 1, 4);
  }
  const t = texture(c, false, 1);
  t.magFilter = THREE.NearestFilter;
  return t;
}

/**
 * Die-cast aluminium with cleats along the direction of travel (canvas columns,
 * 4 px pitch ≈ 8 mm on a 1 m step) and yellow demarcation inserts given as rects.
 */
function cleated(w: number, h: number, yellow: [number, number, number, number][], r: Rand, anisotropy: number): Pbr {
  const [ca, a] = canvas(w, h);
  a.fillStyle = "#6c6f72";
  a.fillRect(0, 0, w, h);
  for (const [x0, y0, x1, y1] of yellow) {
    a.fillStyle = "#a07818";
    a.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // Ridges (column 0) light, grooves (column 2) dark; yellow keeps its hue via multiply.
  a.globalCompositeOperation = "multiply";
  a.fillStyle = "rgb(70,70,70)";
  for (let x = 2; x < w; x += 4) a.fillRect(x, 0, 1, h);
  a.globalCompositeOperation = "screen";
  a.fillStyle = "rgb(105,105,105)";
  for (let x = 0; x < w; x += 4) a.fillRect(x, 0, 1, h);
  a.globalCompositeOperation = "source-over";
  blotches(a, w, h, r, 40, w * 0.12, 0.12);
  const [co, o] = canvas(64, Math.max(4, Math.round((64 * h) / w)));
  const sx = co.width / w;
  const sy = co.height / h;
  o.fillStyle = "rgb(255,110,255)";
  o.fillRect(0, 0, co.width, co.height);
  o.fillStyle = "rgb(255,150,0)";
  for (const [x0, y0, x1, y1] of yellow) o.fillRect(x0 * sx, y0 * sy, (x1 - x0) * sx, (y1 - y0) * sy);
  const normalMap = cleatNormal();
  normalMap.repeat.set(w / 4, 1);
  return { map: texture(ca, true, anisotropy), normalMap, ormMap: texture(co, false, 1) };
}

/** Step tread: canvas x across the step (u), canvas y along travel (row 0 = uphill edge). */
export function treadTextures(r: Rand, anisotropy: number) {
  return cleated(512, 256, [[0, 0, 20, 256], [492, 0, 512, 256], [0, 0, 512, 18]], r, anisotropy);
}

/** Landing plate: the comb segment at the step edge (v=0, canvas bottom) is yellow. */
export function plateTextures(r: Rand, anisotropy: number) {
  return cleated(512, 512, [[0, 476, 512, 512]], r, anisotropy);
}

/** Brushed stainless, one panel per tile with a joint at u=0. */
export function brushedTextures(r: Rand, anisotropy: number) {
  const w = 512;
  const h = 512;
  const [ca, a] = canvas(w, h);
  const [cr, ro] = canvas(w, h);
  a.fillStyle = "#b4b7ba";
  a.fillRect(0, 0, w, h);
  ro.fillStyle = "rgb(0,92,0)";
  ro.fillRect(0, 0, w, h);
  let walk = 0;
  for (let y = 0; y < h; y++) {
    walk = walk * 0.8 + (r() - 0.5) * 0.5;
    const v = walk * 0.09;
    a.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    a.fillRect(0, y, w, 1);
    ro.fillStyle = `rgb(0,${Math.round(92 + walk * 40)},0)`;
    ro.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 900; i++) {
    const y = r() * h;
    const x = r() * w;
    const l = 40 + r() * 380;
    const dark = r() < 0.5;
    a.fillStyle = dark ? `rgba(0,0,0,${0.04 + r() * 0.06})` : `rgba(255,255,255,${0.04 + r() * 0.08})`;
    a.fillRect(x, y, l, 1);
    a.fillRect(x - w, y, l, 1);
    ro.fillStyle = `rgba(0,${dark ? 140 : 60},0,0.25)`;
    ro.fillRect(x, y, l, 1);
    ro.fillRect(x - w, y, l, 1);
  }
  blotches(a, w, h, r, 14, 160, 0.06);
  a.fillStyle = "rgba(10,10,12,0.85)";
  a.fillRect(0, 0, 2, h);
  a.fillStyle = "rgba(255,255,255,0.35)";
  a.fillRect(2, 0, 1, h);
  ro.fillStyle = "rgb(0,200,0)";
  ro.fillRect(0, 0, 2, h);
  return { map: texture(ca, true, anisotropy), roughnessMap: texture(cr, false, anisotropy) };
}

export function concreteTexture(r: Rand, anisotropy: number) {
  const s = 256;
  const [c, x] = canvas(s, s);
  x.fillStyle = "#8a8782";
  x.fillRect(0, 0, s, s);
  for (let i = 0; i < 700; i++) {
    const cx = r() * s;
    const cy = r() * s;
    const rad = 2 + r() * 26;
    x.fillStyle = r() < 0.5 ? `rgba(40,38,35,${0.02 + r() * 0.04})` : `rgba(255,252,245,${0.02 + r() * 0.04})`;
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
      x.beginPath();
      x.arc(cx + ox, cy + oy, rad, 0, Math.PI * 2);
      x.fill();
    }
  }
  return texture(c, true, anisotropy);
}

/** Polished terrazzo, one tile = 1.5 m. */
export function terrazzoTexture(r: Rand, anisotropy: number) {
  const s = 512;
  const [c, x] = canvas(s, s);
  x.fillStyle = "#c1bcb3";
  x.fillRect(0, 0, s, s);
  blotches(x, s, s, r, 18, 120, 0.05);
  const chips = ["#f1eee8", "#8e8880", "#45423e", "#d7c7a8", "#a3998b", "#ffffff", "#6b6560"];
  for (let i = 0; i < 3200; i++) {
    x.fillStyle = chips[Math.floor(r() * chips.length)];
    x.globalAlpha = 0.7 + r() * 0.3;
    const cx = r() * s;
    const cy = r() * s;
    const rx = 0.6 + r() * r() * 3;
    const ry = rx * (0.5 + r() * 0.6);
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, r() * Math.PI, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  return texture(c, true, anisotropy);
}

/** Handrail rubber: near black with lengthwise sheen and a few hand-worn patches. */
export function handrailTexture(r: Rand, anisotropy: number) {
  const w = 512;
  const h = 16;
  const [c, x] = canvas(w, h);
  x.fillStyle = "#0d0d0e";
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(255,255,255,${0.01 + r() * 0.025})`;
    x.fillRect(r() * w, Math.floor(r() * h), 30 + r() * 200, 1);
  }
  for (let i = 0; i < 9; i++) {
    x.fillStyle = `rgba(70,66,60,${0.15 + r() * 0.2})`;
    x.fillRect(r() * w, 3 + r() * 6, 2 + r() * 14, 2 + r() * 5);
  }
  return texture(c, true, anisotropy);
}
