import * as THREE from "three";

const IVORY = "#f2ede1";
// Solids 1–7 and the 8; stripes 9–15 repeat 1–7.
const COLOURS = ["", "#f3b800", "#17378f", "#cc1d16", "#47297c", "#ee6712", "#0b6a40", "#7a1b1e", "#0b0b0c"];
const SHEET_W = 512;
const SHEET_H = 256;

/** Equirectangular skin of one ball: 0 is the cue ball, 1–7 solids, 8, 9–15 stripes. */
export function ballTexture(id: number, anisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET_W;
  canvas.height = SHEET_H;
  const g = canvas.getContext("2d")!;
  const mid = SHEET_H / 2;
  g.fillStyle = IVORY;
  g.fillRect(0, 0, SHEET_W, SHEET_H);
  if (id === 0) {
    // Six red spots, one on each axis, as on a tournament cue ball: they show the roll.
    g.fillStyle = "#c2201c";
    for (let n = 0; n <= 4; n += 1) {
      g.beginPath();
      g.arc((n * SHEET_W) / 4, mid, 8, 0, Math.PI * 2);
      g.fill();
    }
    g.fillRect(0, 0, SHEET_W, 8);
    g.fillRect(0, SHEET_H - 8, SHEET_W, 8);
  } else {
    const stripe = id > 8;
    g.fillStyle = COLOURS[stripe ? id - 8 : id];
    // A stripe is 1¼ in wide on a 2¼ in ball: 34° either side of the equator.
    if (stripe) g.fillRect(0, mid - 48, SHEET_W, 96);
    else g.fillRect(0, 0, SHEET_W, SHEET_H);
    const label = String(id);
    for (const x of [SHEET_W / 4, (SHEET_W * 3) / 4]) {
      g.fillStyle = IVORY;
      g.beginPath();
      g.arc(x, mid, 23, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
      g.font = `700 ${label.length > 1 ? 25 : 30}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(label, x, mid + 1.5);
      if (id === 6 || id === 9) g.fillRect(x - 7, mid + 13, 14, 2.4);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Worsted cloth has no pattern, only tooth: fibre-scale noise, used as both tint and relief. */
export function clothTexture() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let seed = 20261116;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < size * size; i += 1) {
    const v = 208 + Math.floor(random() * 48);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  // One texel is about 1 mm of cloth.
  texture.repeat.set(1 / 0.26, 1 / 0.26);
  texture.needsUpdate = true;
  return texture;
}

/** The dark a ball leaves on the cloth where it rests, under a wide lamp. */
export function contactTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d")!;
  const fade = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  fade.addColorStop(0, "rgba(0,0,0,0.75)");
  fade.addColorStop(0.45, "rgba(0,0,0,0.5)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
