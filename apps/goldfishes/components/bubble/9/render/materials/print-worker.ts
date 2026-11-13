// 인쇄물's painter thread (print-sheets.ts starts it): asked for a 방향, it loads the photographs once, paints that
// 방향's sheets one by one and hands each back as a bitmap. It imports only the painter and the shared constants —
// never the module that starts it.

import { SHEET_COUNT, SHEET_SIZE, type PaintAnswer, type PaintRequest } from "./print-layout.ts";
import { paintSheet } from "./print-paint.ts";
import { mulberry } from "./print-press.ts";

// The app's own stock photographs (Wikimedia Commons; licences in the folder's credits.json). Things and places
// only: photographs of people are left out, since the sheets carry invented headlines.
const STOCK = "/assets/goldfishes/pc-mobiles-2/stock/";
const PHOTOS = [
  "gpu-01", "gpu-02", "gpu-03", "gpu-04", "rocket-01", "rocket-02", "rocket-03", "rocket-04", "robotDog-01", "robotDog-02", "robotDog-03",
  "roadster-01", "roadster-02", "roadster-03", "roadster-04", "headset-01", "headset-02", "cloud-01", "cloud-02", "cloud-03", "cloud-04",
  "heart-01", "heart-02", "like-03", "extra-01", "extra-02", "extra-03", "extra-04", "extra-05", "extra-06", "extra-07", "extra-12",
  "spinner-03", "spinner-04", "humanoid-02",
];

let photos: Promise<ImageBitmap[]> | null = null;
const load = () =>
  (photos ??= Promise.all(
    PHOTOS.map((name) =>
      fetch(`${STOCK}${name}.jpg`)
        .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(name))))
        .then((blob) => createImageBitmap(blob))
        .catch(() => null),
    ),
  ).then((list) => list.filter((bitmap): bitmap is ImageBitmap => bitmap !== null)));

let latest = -1;

self.onmessage = async (event: MessageEvent<PaintRequest>) => {
  const region = event.data.region;
  latest = region;
  const stock = await load();
  if (stock.length === 0) return;
  const canvas = new OffscreenCanvas(SHEET_SIZE, SHEET_SIZE);
  for (let layer = 0; layer < SHEET_COUNT; layer += 1) {
    // A newer request replaces this one.
    if (latest !== region) return;
    paintSheet(canvas, region, layer, stock, mulberry(0x9e3779b9 ^ (region * 104729 + layer * 7919)));
    const bitmap = await createImageBitmap(canvas);
    const answer: PaintAnswer = { region, layer, bitmap };
    (self as unknown as Worker).postMessage(answer, [bitmap]);
  }
};
