// The painting contract. A tile is one bitmap on a glass: a post, a bar, a
// banner, a card, a sticker. The main thread asks for it by spec; a worker
// (paint/worker.ts) measures and paints it with Canvas2D at the field's
// resolution and hands back the bitmap; the compositor moves it on the GPU.
// A painter never touches the DOM, so it runs in a worker.

export type Mode = "light" | "dark";
export type Lang = "en" | "ko" | "ja" | "es";
export type Os = "ios" | "android";

/** What the main thread asks for. `data` must be structured-cloneable. */
export type TileSpec = {
  /** `<app>.<part>`, e.g. `instagram.post`, `system.banner`. */
  painter: string;
  /** Width in pt. */
  w: number;
  /** Fixed height in pt; absent: the painter measures it. */
  h?: number;
  mode: Mode;
  lang: Lang;
  os?: Os;
  data: unknown;
};

/** Where the painter may point a thumb on its tile, in pt from its top-left. */
export type Hotspot = { x: number; y: number; kind: "like" | "open" | "follow" | "button" };

export type PaintEnv = {
  w: number;
  mode: Mode;
  lang: Lang;
  os: Os;
  /** A decoded image, or null while it is still loading (painters declare theirs in `needs`). */
  image(url: string): ImageBitmap | null;
};

export type Ctx = OffscreenCanvasRenderingContext2D;

export type Painter<D = never> = {
  /** Image URLs the tile draws; the worker decodes them before painting. */
  needs?(data: D, env: PaintEnv): readonly string[];
  /** Height in pt, for a spec without a fixed `h`. */
  measure?(ctx: Ctx, data: D, env: PaintEnv): number;
  paint(ctx: Ctx, data: D, env: PaintEnv, h: number): void;
  /** Places on the painted tile a thumb may tap. */
  hotspots?(data: D, env: PaintEnv, h: number): Hotspot[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PainterTable = Record<string, Painter<any>>;

export type PaintRequest = { id: number; spec: TileSpec; scale: number };
export type PaintResult =
  | { id: number; pixels: Uint8Array; width: number; height: number; h: number; hotspots: Hotspot[]; ms: number; decode: number }
  | { id: number; error: string };
