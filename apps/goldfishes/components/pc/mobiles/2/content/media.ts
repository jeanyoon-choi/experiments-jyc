// Photographs for a keyword, from three sources mixed (user, 2026-10-28:
// "크롬 오브제 렌더 + 생성 사진 + 스톡 다 해보셈"):
// - object: the main screen's own object rendered in chrome (objects/render.ts),
//   so the thing a goldfish just touched turns up on its phone as a product shot;
// - generated: model-made feed pictures (tools/generate.mjs) — the dead internet;
// - stock: freely licensed photographs (tools/fetch-stock.mjs, credits.json).
// Fictional faces for posters are generated (avatar-*). No real people.

import manifest from "./media.json";
import type { Random } from "../model/random";

export type PhotoKind = "any" | "object" | "photo" | "portrait";

const objectUrls = new Map<string, string>();

/** objects/render.ts hands over its renders as they are made. */
export function setObjectRender(kind: string, url: string) {
  objectUrls.set(kind, url);
}

export function objectRender(kind: string) {
  return objectUrls.get(kind) ?? null;
}

const keyOf = (url: string) => url.slice(url.lastIndexOf("/") + 1).replace(/-[^-]*\.jpg$/, "");
const all = [...manifest.stock, ...manifest.generated];
const byKeyword = new Map<string, string[]>();
for (const url of all) {
  const key = keyOf(url);
  if (key === "avatar") continue;
  byKeyword.set(key, [...(byKeyword.get(key) ?? []), url]);
}
const ambient = all.filter((url) => /\/(extra|food|mall|city|money|beach|gym|sauna)-/.test(url));
const faces = manifest.generated.filter((url) => url.includes("/avatar-"));

/** Share of photos that are the object render, when one exists. */
const OBJECT_SHARE = 0.34;

export function photoFor(keyword: string, rng: Random, kind: PhotoKind = "any"): string {
  const render = objectRender(keyword);
  if (kind === "object" && render) return render;
  if (kind === "portrait") return faceFor(rng);
  if (kind === "any" && render && rng.chance(OBJECT_SHARE)) return render;
  const own = byKeyword.get(keyword) ?? [];
  const pool = own.length && rng.chance(0.85) ? own : ambient.length ? ambient : own;
  return pool.length ? rng.pick(pool) : (render ?? "");
}

export function faceFor(rng: Random) {
  return faces.length ? rng.pick(faces) : "";
}

export function ambientPhoto(rng: Random) {
  return ambient.length ? rng.pick(ambient) : "";
}
