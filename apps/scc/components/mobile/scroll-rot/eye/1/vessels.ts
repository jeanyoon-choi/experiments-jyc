import * as THREE from "three";
import { LIMBUS } from "./globe";
import { RADIUS } from "./rot";

// The vessels of the white, grown rather than drawn: trunks enter behind the equator and run forward
// toward the cornea, wandering, tapering and forking as they go, and stop short of it in fine arcades.
// The map is polar about the eye's axis: x is the angle round it, y the angle from the front pole.
//   R: superficial conjunctival vessels, thin and bright
//   G: deep episcleral vessels, broad and soft
//   B: the capillary bed that only fills when the eye reddens
const W = 2048;
const H = 1024;
const LIMBUS_Y = (Math.asin(LIMBUS / RADIUS) / Math.PI) * H;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function growVessels() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  const rand = mulberry32(0x5c1e7a);

  // Strokes are gathered by look and drawn in a few paths; each layer has a fixed budget of
  // segments (36,000 in all), so the forking can never run away and stall the page.
  let budget = 0;
  const batches = new Map<string, { width: number; style: string; path: Path2D }>();
  const segment = (x0: number, y0: number, x1: number, y1: number, width: number, style: string) => {
    const w = Math.max(0.5, Math.round(width * 2) / 2);
    const key = `${style}|${w}`;
    let batch = batches.get(key);
    if (!batch) batches.set(key, (batch = { width: w, style, path: new Path2D() }));
    batch.path.moveTo(x0, y0);
    batch.path.lineTo(x1, y1);
    // the map wraps round the axis: a stroke near an edge is repeated on the other side
    if (Math.min(x0, x1) < 16 || Math.max(x0, x1) > W - 16) {
      const shift = x0 < W / 2 ? W : -W;
      batch.path.moveTo(x0 + shift, y0);
      batch.path.lineTo(x1 + shift, y1);
    }
  };
  const wrap = (x: number) => ((x % W) + W) % W;
  const alpha = (a: number) => (Math.round(Math.min(1, a) * 8) / 8).toFixed(3);

  // heading 0 points at the front pole (up the map)
  const grow = (x: number, y: number, heading: number, width: number, channel: 0 | 1 | 2, stopY: number, depth: number) => {
    let bend = 0;
    let sinceFork = 0;
    for (let step = 0; step < 500 && width > 0.3 && budget > 0; step++) {
      budget -= 1;
      // a vessel wanders: its curvature drifts, and it is drawn back toward the cornea
      bend = bend * 0.9 + (rand() - 0.5) * (channel === 1 ? 0.07 : 0.16);
      heading += bend - heading * 0.02;
      const polar = Math.max(0.2, Math.sin((y / H) * Math.PI));
      const len = channel === 1 ? 4 : 3;
      x = wrap(x);
      const nx = x + (Math.sin(heading) * len) / polar;
      const ny = y - Math.cos(heading) * len;
      if (ny < stopY || ny > H * 0.97) break;
      if (channel === 0) segment(x, y, nx, ny, width, `rgba(255,0,0,${alpha(0.45 + width * 0.25)})`);
      else if (channel === 2) segment(x, y, nx, ny, width, `rgba(0,0,255,${alpha(0.3 + width * 0.3)})`);
      else {
        // soft-edged: three passes instead of a blur filter
        segment(x, y, nx, ny, width * 2.2, "rgba(0,255,0,0.1)");
        segment(x, y, nx, ny, width * 1.4, "rgba(0,255,0,0.16)");
        segment(x, y, nx, ny, width * 0.8, "rgba(0,255,0,0.25)");
      }
      x = nx;
      y = ny;
      width *= channel === 1 ? 0.998 : 0.996;
      sinceFork += 1;
      if (depth < 3 && sinceFork > 12 && rand() < (channel === 1 ? 0.012 : 0.025)) {
        sinceFork = 0;
        const side = rand() < 0.5 ? -1 : 1;
        grow(x, y, heading + side * (0.35 + rand() * 0.6), width * (0.5 + rand() * 0.2), channel, stopY, depth + 1);
        heading -= side * 0.12;
        width *= 0.88;
      }
    }
  };

  // deep trunks first, then the superficial ones over them, then the latent bed
  budget = 6000;
  for (let i = 0; i < 16; i++) grow(rand() * W, H * (0.55 + rand() * 0.3), (rand() - 0.5) * 0.8, 5 + rand() * 5, 1, LIMBUS_Y * (1.5 + rand()), 2);
  budget = 14000;
  for (let i = 0; i < 34; i++) grow(rand() * W, H * (0.42 + rand() * 0.42), (rand() - 0.5) * 1.2, 2.2 + rand() * 2.8, 0, LIMBUS_Y * (1.12 + rand() * 0.9), 0);
  budget = 16000;
  for (let i = 0; i < 220; i++) grow(rand() * W, H * (0.2 + rand() * 0.7), (rand() - 0.5) * 2.4, 1.4 + rand() * 1.6, 2, LIMBUS_Y * (1.02 + rand() * 0.5), 2);
  for (const batch of batches.values()) {
    ctx.strokeStyle = batch.style;
    ctx.lineWidth = batch.width;
    ctx.stroke(batch.path);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter; // no mipmaps: the angle round the axis jumps at its seam
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
