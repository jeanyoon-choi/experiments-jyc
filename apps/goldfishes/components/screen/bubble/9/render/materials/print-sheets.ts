// 인쇄물's sheets as a texture (print.ts samples it): one array of SHEET_COUNT layers for the 방향 in use.
//
// Nothing is made, fetched or held until the material is first chosen: until then the sampler holds one paper
// texel. Then a worker (print-worker.ts) paints the 방향's sheets — layouts in print-paint.ts, the press in
// print-press.ts — and each arrives as a bitmap and is uploaded on its own, so no frame carries more than one
// 1024² upload. Choosing another 방향 repaints into a new array and frees the old one: one 방향 (about 64 MiB with
// its mipmaps) is held at a time.
//
// `?sheets` in the URL keeps the painted sheets on `window.printSheets` (ImageBitmaps), to look at them flat.

import { PRINT_UNIT, SHEET_COUNT, SHEET_SIZE, type PaintAnswer, type PaintRequest } from "./print-layout";

export { PRINT_UNIT };

export function createPrintMap(gl: WebGL2RenderingContext) {
  let disposed = false;
  const blank = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, blank);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([236, 231, 218, 255]));
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  let worker: Worker | null = null;
  let wanted = -1;
  /** The array being filled, and the one shown (the same once every layer has arrived). */
  let filling: { region: number; texture: WebGLTexture; layers: number } | null = null;
  let shown: WebGLTexture | null = null;
  const keep = typeof window !== "undefined" && window.location.search.includes("sheets");

  const receive = (event: MessageEvent<PaintAnswer>) => {
    const { region, layer, bitmap } = event.data;
    if (disposed || !filling || filling.region !== region) {
      bitmap.close();
      return;
    }
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, filling.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, SHEET_SIZE, SHEET_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    if (keep) ((window as unknown as { printSheets?: ImageBitmap[] }).printSheets ??= [])[layer] = bitmap;
    else bitmap.close();
    filling.layers += 1;
    if (filling.layers < SHEET_COUNT) return;
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    if (shown && shown !== filling.texture) gl.deleteTexture(shown);
    shown = filling.texture;
    filling = null;
  };

  return {
    /** Paints `region`'s sheets, the first time it is asked for (and again when another 방향 is). */
    want(region: number) {
      if (disposed || region === wanted) return;
      wanted = region;
      try {
        worker ??= new Worker(new URL("./print-worker.ts", import.meta.url), { type: "module" });
      } catch {
        return;
      }
      worker.onmessage = receive;
      if (filling) gl.deleteTexture(filling.texture);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.floor(Math.log2(SHEET_SIZE)) + 1, gl.RGBA8, SHEET_SIZE, SHEET_SIZE, SHEET_COUNT);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
      filling = { region, texture, layers: 0 };
      const request: PaintRequest = { region };
      worker.postMessage(request);
    },
    texture: () => shown ?? blank,
    dispose() {
      disposed = true;
      worker?.terminate();
      gl.deleteTexture(blank);
      if (shown) gl.deleteTexture(shown);
      if (filling && filling.texture !== shown) gl.deleteTexture(filling.texture);
    },
  };
}
