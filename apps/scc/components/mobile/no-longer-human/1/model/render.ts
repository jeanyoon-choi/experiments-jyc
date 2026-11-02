// Canvas drawing for scattered pages. A frame is one image of the page as
// typeset, one path that papers over the letters that have come loose, and one
// drawImage per loose letter from a glyph atlas — no text shaping per frame.
//
// Every image source is an immutable ImageBitmap once ready: Safari copies a
// canvas source that has changed since its last use, which made the earlier
// mutable atlas and pinned layer slower than plain fillText on iPhone.

import { SPECK_STRIDE, type Glyph, type Scene } from "./physics";

const CELL = 32;
const ATLAS = 1024;
const PER_ROW = ATLAS / CELL;

type Source = HTMLCanvasElement | ImageBitmap;

export function createRenderer(paper: string, ink: string) {
  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = ATLAS;
  atlasCanvas.height = ATLAS;
  const atlasContext = atlasCanvas.getContext("2d");
  const slots = new Map<string, number>();
  const ascents = new Map<string, number>();
  const bases = new WeakMap<Scene, Source>();
  let atlas: Source = atlasCanvas;
  let atlasVersion = 0;
  let disposed = false;

  const snapshot = (canvas: HTMLCanvasElement, use: (bitmap: ImageBitmap) => void) => {
    if (typeof createImageBitmap !== "function") return;
    createImageBitmap(canvas).then((bitmap) => {
      if (disposed) bitmap.close();
      else use(bitmap);
    }, () => {});
  };

  /** Rasterises a letter into the atlas once and records its cell on the glyph. */
  const place = (glyph: Glyph) => {
    const key = `${glyph.font}\u0000${glyph.char}`;
    let slot = slots.get(key);
    if (slot === undefined) {
      if (!atlasContext || slots.size >= PER_ROW * PER_ROW) return;
      slot = slots.size;
      slots.set(key, slot);
      atlasContext.font = glyph.font;
      let ascent = ascents.get(glyph.font);
      if (ascent === undefined) {
        ascent = atlasContext.measureText("가").fontBoundingBoxAscent;
        ascents.set(glyph.font, ascent);
      }
      atlasContext.fillStyle = ink;
      atlasContext.textAlign = "center";
      atlasContext.textBaseline = "alphabetic";
      const sx = (slot % PER_ROW) * CELL;
      const sy = Math.floor(slot / PER_ROW) * CELL;
      // The cell centre is the letter's typeset box centre.
      atlasContext.fillText(glyph.char, sx + CELL / 2, sy + CELL / 2 - glyph.height / 2 + ascent);
    }
    glyph.sx = (slot % PER_ROW) * CELL;
    glyph.sy = Math.floor(slot / PER_ROW) * CELL;
  };

  /** Readies a page before it is touched: atlas cells and the typeset image. */
  const prepare = (scene: Scene) => {
    if (bases.has(scene)) return;
    const before = slots.size;
    for (const glyph of scene.glyphs) place(glyph);
    if (slots.size !== before) {
      // Keep drawing from the canvas until the new bitmap arrives.
      atlas = atlasCanvas;
      const version = (atlasVersion += 1);
      snapshot(atlasCanvas, (bitmap) => {
        if (version !== atlasVersion) return bitmap.close();
        atlas = bitmap;
      });
    }

    const base = document.createElement("canvas");
    base.width = Math.ceil(scene.width);
    base.height = Math.ceil(scene.height);
    const context = base.getContext("2d");
    if (context) {
      context.fillStyle = paper;
      context.fillRect(0, 0, base.width, base.height);
      for (const glyph of scene.glyphs) {
        if (glyph.sx >= 0) {
          context.drawImage(atlasCanvas, glyph.sx, glyph.sy, CELL, CELL, glyph.x - CELL / 2, glyph.y - CELL / 2, CELL, CELL);
        }
      }
    }
    bases.set(scene, base);
    snapshot(base, (bitmap) => {
      if (bases.get(scene) === base) bases.set(scene, bitmap);
      else bitmap.close();
    });
  };

  const draw = (context: CanvasRenderingContext2D, scene: Scene, offsetX: number) => {
    prepare(scene);
    const base = bases.get(scene);
    context.setTransform(1, 0, 0, 1, offsetX, 0);
    if (base) context.drawImage(base, 0, 0);

    const { loose } = scene;
    if (loose.length > 0) {
      // The typeset places the loose letters have left.
      context.fillStyle = paper;
      context.beginPath();
      for (let index = 0; index < loose.length; index += 1) {
        const glyph = loose[index];
        context.rect(glyph.left, glyph.top, glyph.width, glyph.height);
      }
      context.fill();

      context.fillStyle = ink;
      for (let index = 0; index < loose.length; index += 1) {
        const glyph = loose[index];
        const scale = 1 + glyph.pulse * 0.4;
        const cos = Math.cos(glyph.angle) * scale;
        const sin = Math.sin(glyph.angle) * scale;
        context.setTransform(cos, sin, -sin, cos, offsetX + glyph.x, glyph.y);
        if (glyph.sx >= 0) context.drawImage(atlas, glyph.sx, glyph.sy, CELL, CELL, -CELL / 2, -CELL / 2, CELL, CELL);
        else {
          context.font = glyph.font;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(glyph.char, 0, 0);
        }
      }
    }

    if (scene.speckCount > 0) {
      context.setTransform(1, 0, 0, 1, offsetX, 0);
      context.fillStyle = ink;
      const { specks } = scene;
      for (let index = 0; index < scene.speckCount; index += 1) {
        const offset = index * SPECK_STRIDE;
        const life = specks[offset + 4];
        const size = 1 + life * 2;
        context.globalAlpha = life;
        context.fillRect(specks[offset] - size / 2, specks[offset + 1] - size / 2, size, size);
      }
      context.globalAlpha = 1;
    }
  };

  const dispose = () => {
    disposed = true;
    if (atlas instanceof ImageBitmap) atlas.close();
  };

  return { prepare, draw, dispose };
}
