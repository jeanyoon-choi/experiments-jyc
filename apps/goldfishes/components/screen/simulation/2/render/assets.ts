// What a look shows that is fetched or painted: the photographed rooms, the stills (SHADING plates) and 인쇄물's
// sheets. Nothing is asked for until a look first wants it; each sits as a plain placeholder until it is in.

import { sampling } from "./gl";
import { LIVE_SOURCES, type LiveSource } from "./live/source";
import { FACE_ENVIRONMENT, type Look } from "./look";
import { MIX_MATERIAL } from "./materials/mix";
import { PRINT_MATERIAL } from "./materials/print";
import { createPrintMap } from "./materials/print-sheets";
import { UNIT } from "./units";

/** The photographed rooms (환경), CC0 HDRIs from Poly Haven, shared with bubble/2. */
const LIGHT_FILES = ["photo_studio_loft_hall", "kloofendal_overcast", "studio_small_09", "shanghai_bund", "forest_slope", "lakeside"] as const;

const FACE_IMAGE = "/images/0908/tech-power-faces/008.jpg";
/** 맥시멀 믹스's leather: a scanned hide's normal and grain (public/assets/goldfishes/materials/sources.txt). */
const HIDE_IMAGE = "/assets/goldfishes/materials/leather-red-02.png";
/** The stills' layers (SHADING plates) are this size. */
const PLATE_SIZE = 512;
/** 라이브 화면's layer: dark until a frame arrives. */
const LIVE_LAYER = 2;

export type Assets = {
  /**
   * Asks for what `look` shows (each the first time) and binds the stills, the sheets and the room on their units
   * (units.ts) — every frame: an upload binds on whichever unit is active when it arrives.
   */
  use(look: Look): void;
  /** The portrait's width over its height (1 until it is in). */
  faceAspect(): number;
  /** 라이브 화면's picture's width over its height (1 until its first frame). */
  liveAspect(): number;
  /** Whether every room, still and sheet asked for is in. */
  loaded(): boolean;
  dispose(): void;
};

export function createAssets(gl: WebGL2RenderingContext): Assets {
  // The photographed rooms: fetched when first wanted.
  // 256 × 128 RGBA half floats (see components/screen/bubble/docs/2.md).
  const lightMap = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, lightMap);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array([0.7, 0.7, 0.7, 1]));
  sampling(gl, gl.TEXTURE_2D, gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR, gl.REPEAT, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  let lightWanted = -1;
  /** Rooms and stills asked for and not yet in (loaded(), for `?replay`). */
  let loading = 0;
  let disposed = false;
  const wantLightMap = (wanted: number) => {
    // The portrait (FACE_ENVIRONMENT) hangs in the studio.
    const mode = wanted === FACE_ENVIRONMENT ? 2 : wanted;
    const file = LIGHT_FILES[Math.min(Math.max(Math.round(mode), 0), LIGHT_FILES.length - 1)]!;
    if (mode === lightWanted) return;
    lightWanted = mode;
    loading += 1;
    void fetch(`/assets/goldfishes/koons-light/${file}.bin`)
      .then((response) => response.arrayBuffer())
      .then((data) => {
        if (disposed || lightWanted !== mode) return;
        gl.bindTexture(gl.TEXTURE_2D, lightMap);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 256, 128, 0, gl.RGBA, gl.HALF_FLOAT, new Uint16Array(data));
        gl.generateMipmap(gl.TEXTURE_2D);
      })
      .catch(() => {})
      .finally(() => {
        loading -= 1;
      });
  };

  // The stills (SHADING plates): the portrait and the hide, each loaded when first wanted (grey, and flat, until then).
  const plates = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, plates);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.log2(PLATE_SIZE) + 1, gl.RGBA8, PLATE_SIZE, PLATE_SIZE, 3);
  sampling(gl, gl.TEXTURE_2D_ARRAY, gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
  for (const [layer, value] of [[0, 90], [1, 128], [LIVE_LAYER, 0]] as const) {
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, PLATE_SIZE, PLATE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(PLATE_SIZE * PLATE_SIZE * 4).fill(value));
  }
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  /** Loads an image into a layer, drawn to the layer's size, and calls back with it once it is there. */
  const loadPlate = (layer: number, source: string, loaded?: (image: HTMLImageElement) => void) => {
    const image = new Image();
    loading += 1;
    image.onerror = () => {
      loading -= 1;
    };
    image.onload = () => {
      loading -= 1;
      if (disposed) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = PLATE_SIZE;
      canvas.getContext("2d")!.drawImage(image, 0, 0, PLATE_SIZE, PLATE_SIZE);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, plates);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, PLATE_SIZE, PLATE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      loaded?.(image);
    };
    image.src = source;
  };
  let faceAspect = 1;
  let faceWanted = false;
  const wantFace = () => {
    if (faceWanted) return;
    faceWanted = true;
    loadPlate(0, FACE_IMAGE, (image) => (faceAspect = image.naturalWidth / Math.max(1, image.naturalHeight)));
  };
  let hideWanted = false;
  const wantHide = () => {
    if (hideWanted) return;
    hideWanted = true;
    loadPlate(1, HIDE_IMAGE);
  };

  // 라이브 화면 (live/source.ts): its source is opened when a look first asks for it and closed when none does; each
  // new frame is drawn to the layer's size, mirrored (the screen reads as a mirror), and replaces the layer.
  let live: LiveSource | null = null;
  let liveWanted = 0;
  let liveCanvas: CanvasRenderingContext2D | null = null;
  const wantLive = (wanted: number) => {
    if (wanted !== liveWanted) {
      live?.close();
      live = LIVE_SOURCES[wanted]?.open() ?? null;
      liveWanted = wanted;
      if (!live) {
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, plates);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, LIVE_LAYER, PLATE_SIZE, PLATE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(PLATE_SIZE * PLATE_SIZE * 4));
        gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      }
    }
    const frame = live?.take();
    if (!frame) return;
    if (!liveCanvas) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = PLATE_SIZE;
      liveCanvas = canvas.getContext("2d")!;
      liveCanvas.setTransform(-1, 0, 0, 1, PLATE_SIZE, 0);
    }
    liveCanvas.drawImage(frame, 0, 0, PLATE_SIZE, PLATE_SIZE);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, plates);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, LIVE_LAYER, PLATE_SIZE, PLATE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, liveCanvas.canvas);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  };

  // 인쇄물's sheets (materials/print-sheets.ts): painted in a worker the first time that material is chosen.
  const printMap = createPrintMap(gl);

  return {
    use(look) {
      if (look.photoStrength > 0) wantLightMap(look.photo);
      if (look.photo === FACE_ENVIRONMENT) wantFace();
      if (Math.round(look.material) === MIX_MATERIAL.id) wantHide();
      gl.activeTexture(gl.TEXTURE0 + UNIT.plates);
      wantLive(Math.round(look.liveScreen ?? 0));
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, plates);
      if (Math.round(look.material) === PRINT_MATERIAL.id) printMap.want(Math.round(look.printRegion ?? 0));
      gl.activeTexture(gl.TEXTURE0 + UNIT.printMap);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, printMap.texture());
      gl.activeTexture(gl.TEXTURE0 + UNIT.lightMap);
      gl.bindTexture(gl.TEXTURE_2D, lightMap);
    },
    faceAspect: () => faceAspect,
    liveAspect: () => live?.aspect() ?? 1,
    loaded: () => loading === 0 && !printMap.painting(),
    dispose() {
      disposed = true;
      live?.close();
      gl.deleteTexture(lightMap);
      gl.deleteTexture(plates);
      printMap.dispose();
    },
  };
}
