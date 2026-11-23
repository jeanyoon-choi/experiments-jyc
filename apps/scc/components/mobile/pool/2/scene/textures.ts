import * as THREE from "three";

const IVORY = "#f2ede1";
const SHEET_W = 512;
const SHEET_H = 256;
/** Faces and marks each come as a 4 × 4 atlas of cells this size, in ball order (0 the cue ball). */
const FACE = 256;

// Each ball is two halves and nothing else: the chief executive's face on one, the company's
// mark on the other (the cue ball's other half is bare). Either picture is wrapped over its half
// of the sphere by angle from its middle, so it keeps its proportions round to the side. This
// maps each texel of the sheet to the pixel of the 256 px cell it shows, and says which half.
let wrapped: { cell: Int32Array; back: Uint8Array } | null = null;
function wrappedMap() {
  if (wrapped) return wrapped;
  const cell = new Int32Array(SHEET_W * SHEET_H);
  const back = new Uint8Array(SHEET_W * SHEET_H);
  // Inside the inscribed circle of the cell, shy of its edge.
  const fill = 0.985;
  for (let y = 0; y < SHEET_H; y += 1) {
    const lat = (0.5 - (y + 0.5) / SHEET_H) * Math.PI;
    for (let x = 0; x < SHEET_W; x += 1) {
      // Longitude from the middle of the face, which sits at u = 1/4.
      const lon = ((x + 0.5) / SHEET_W - 0.25) * Math.PI * 2;
      const toward = Math.cos(lat) * Math.cos(lon);
      const behind = toward < 0;
      const angle = Math.acos(Math.min(1, Math.abs(toward)));
      // Seen from behind, east is the other way: the mark must not come out mirrored.
      const east = Math.cos(lat) * Math.sin(lon) * (behind ? -1 : 1);
      const north = Math.sin(lat);
      const flat = Math.hypot(east, north) || 1;
      const r = (angle / (Math.PI / 2)) * fill;
      const fx = Math.min(FACE - 1, Math.floor(((r * east) / flat + 1) * 0.5 * FACE));
      const fy = Math.min(FACE - 1, Math.floor((1 - (r * north) / flat) * 0.5 * FACE));
      cell[y * SHEET_W + x] = fy * FACE + fx;
      back[y * SHEET_W + x] = behind ? 1 : 0;
    }
  }
  wrapped = { cell, back };
  return wrapped;
}

/** Equirectangular skin of one ball: plain ivory until `paint` is given the pictures. */
export function ballSkin(id: number, anisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET_W;
  canvas.height = SHEET_H;
  const g = canvas.getContext("2d")!;
  g.fillStyle = IVORY;
  g.fillRect(0, 0, SHEET_W, SHEET_H);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;

  /** Faces go on the near half, marks on the far half; either atlas may still be on its way. */
  const paint = (faces: ImageData | null, marks: ImageData | null) => {
    const map = wrappedMap();
    const sheet = g.createImageData(SHEET_W, SHEET_H);
    const ox = (id % 4) * FACE;
    const oy = Math.floor(id / 4) * FACE;
    for (let i = 0; i < map.cell.length; i += 1) {
      const atlas = map.back[i] ? marks : faces;
      const to = i * 4;
      sheet.data[to + 3] = 255;
      if (!atlas) {
        sheet.data[to] = 242;
        sheet.data[to + 1] = 237;
        sheet.data[to + 2] = 225;
        continue;
      }
      const f = map.cell[i];
      const from = ((oy + Math.floor(f / FACE)) * atlas.width + ox + (f % FACE)) * 4;
      sheet.data[to] = atlas.data[from];
      sheet.data[to + 1] = atlas.data[from + 1];
      sheet.data[to + 2] = atlas.data[from + 2];
    }
    g.putImageData(sheet, 0, 0);
    texture.needsUpdate = true;
  };
  return { texture, paint };
}

/**
 * Loads a 4 × 4 atlas (in ball order) and hands back its pixels as 256 px cells. The files are
 * smaller (192 px cells, enough for a ball about 100 device pixels across) and are scaled up here.
 */
export function loadAtlas(url: string, done: (atlas: ImageData) => void) {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = FACE * 4;
    canvas.height = FACE * 4;
    const g = canvas.getContext("2d", { willReadFrequently: true })!;
    g.imageSmoothingQuality = "high";
    g.drawImage(image, 0, 0, canvas.width, canvas.height);
    done(g.getImageData(0, 0, canvas.width, canvas.height));
  };
  image.src = url;
}

function noise(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Worsted cloth has no pattern of its own, only tooth: fibre-scale noise, used as relief. */
export function clothTooth() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const random = noise(20261116);
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

/** How much cloth one tile of the dollar print covers (m), two signs to a tile, set like bricks. */
const PRINT_TILE = 0.17;

/** The cloth's print: dollar signs in banknote ink, edge to edge, with the fibre's tooth over it. */
export function dollarPrint(anisotropy: number) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#6f8f7c";
  g.font = `700 ${size * 0.47}px Georgia, "Times New Roman", Times, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  // Each sign is drawn again one tile away wherever it could cross an edge, so the tile repeats cleanly.
  for (const [cx, cy] of [[0.25, 0.27], [0.75, 0.77]]) {
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) g.fillText("$", (cx + dx) * size, (cy + dy) * size);
  }
  const image = g.getImageData(0, 0, size, size);
  const random = noise(51);
  for (let i = 0; i < image.data.length; i += 4) {
    const tooth = 0.9 + random() * 0.1;
    image.data[i] *= tooth;
    image.data[i + 1] *= tooth;
    image.data[i + 2] *= tooth;
  }
  g.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / PRINT_TILE, 1 / PRINT_TILE);
  texture.anisotropy = anisotropy;
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
