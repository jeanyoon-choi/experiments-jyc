// A painting worker: asked for a tile, it decodes the images the tile
// needs (kept for later tiles), measures and paints it on an OffscreenCanvas
// at the field's resolution, and hands the bitmap over (transferred, not
// copied). Painting never blocks the frame loop.

import { PAINTERS } from "../apps/painters";
import type { PaintEnv, PaintRequest, PaintResult } from "./types";

const images = new Map<string, ImageBitmap | null>();
const loading = new Map<string, Promise<void>>();

function load(url: string) {
  if (images.has(url)) return Promise.resolve();
  let promise = loading.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => void images.set(url, bitmap))
      .catch(() => void images.set(url, null))
      .finally(() => loading.delete(url));
    loading.set(url, promise);
  }
  return promise;
}

const measureCanvas = new OffscreenCanvas(1, 1);
const measureCtx = measureCanvas.getContext("2d")!;

async function paint({ id, spec, scale }: PaintRequest): Promise<PaintResult> {
  const painter = PAINTERS[spec.painter];
  if (!painter) return { id, error: `no painter ${spec.painter}` };
  const env: PaintEnv = { w: spec.w, mode: spec.mode, lang: spec.lang, os: spec.os ?? "ios", image: (url) => images.get(url) ?? null };
  const needs = painter.needs?.(spec.data, env) ?? [];
  const begin = performance.now();
  if (needs.length) await Promise.all(needs.map(load));
  const decoded = performance.now();
  const h = spec.h ?? Math.ceil(painter.measure?.(measureCtx, spec.data, env) ?? 100);
  const canvas = new OffscreenCanvas(Math.max(1, Math.ceil(spec.w * scale)), Math.max(1, Math.ceil(h * scale)));
  // A CPU canvas: its pixels are read back at once, which on a GPU canvas costs a readback (≈10 ms a tile).
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.scale(scale, scale);
  ctx.imageSmoothingQuality = "high";
  painter.paint(ctx, spec.data, env, h);
  // Raw premultiplied pixels: uploading an ImageBitmap into a texture array
  // took the browser's slow path (40–60 ms a frame for 8 tiles, 2026-10-28);
  // a typed array is a plain copy.
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = new Uint8Array(image.data.buffer);
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3]!;
    if (alpha === 255) continue;
    pixels[index] = (pixels[index]! * alpha + 127) / 255;
    pixels[index + 1] = (pixels[index + 1]! * alpha + 127) / 255;
    pixels[index + 2] = (pixels[index + 2]! * alpha + 127) / 255;
  }
  return { id, pixels, width: canvas.width, height: canvas.height, h, hotspots: painter.hotspots?.(spec.data, env, h) ?? [], ms: performance.now() - decoded, decode: decoded - begin };
}

self.onmessage = (event: MessageEvent<PaintRequest>) => {
  paint(event.data)
    .catch((error: unknown): PaintResult => ({ id: event.data.id, error: String(error) }))
    .then((result) => {
      if ("pixels" in result) (self as unknown as Worker).postMessage(result, [result.pixels.buffer]);
      else (self as unknown as Worker).postMessage(result);
    });
};
