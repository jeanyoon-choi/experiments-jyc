// pc/2d-mobiles/2's working interfaces as a screen source (../source.ts). The engine (phone/engine.ts: the phones,
// their apps, the tiles painted off-thread) is that experiment's, copied whole into this folder; here it draws every
// glass side by side onto one sheet — a texture in three.js's own WebGL context, so nothing is copied between
// canvases — and each screen of the wall reads its own cell of the sheet.
//
// The sheet's size is a budget of pixels shared by all the glasses (settings.ts `budget`): a hundred glasses are
// each about 150 × 330, one glass alone 585 × 1266. Smaller copies (mipmaps) are made each frame, for the glasses
// seen small or at a slant.
//
// The engine draws with raw WebGL between three.js's frames: enter() sets every piece of state it relies on (three
// leaves its own behind, the unpack flags among them), and three's cache is reset after.

import * as THREE from "three";
import type { Hand, ScreenSource } from "../source";
import { TUNING_DEFAULTS, type Tuning } from "./model/tuning";
import { renderObjects } from "./objects/render";
import { Engine } from "./phone/engine";
import type { FeedSource } from "./phone/feed";
import { GLASS } from "./phone/geometry";

export type { FeedSource } from "./phone/feed";
export type { Tuning } from "./model/tuning";

/**
 * The glass's own goldfish is off: here the fish is outside the glass, holding the mobile. No death either (user,
 * 2026-11-23: kept as simple as pc/3d-mobiles/1): a mobile never goes dark.
 */
export const INTERFACE_TUNING: Tuning = { ...TUNING_DEFAULTS, thumb: 0, death: "off" };

const MIP_LEVELS = 4;

export type InterfaceOptions = {
  /** Screens, and how many of them stand across the wall. */
  count: number;
  columns: number;
  /** Sheet pixels for all the glasses together, in millions. */
  budget: number;
  feed: FeedSource;
  tuning: () => Tuning;
};

export function createInterfaceScreens(renderer: THREE.WebGLRenderer, { count, columns, budget, feed, tuning }: InterfaceOptions): ScreenSource {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const pxPerPt = Math.min(1.5, Math.max(0.3, Math.sqrt((budget * 1e6) / (count * GLASS.w * GLASS.h))));

  const enter = (target: WebGLFramebuffer | null) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.blendEquation(gl.FUNC_ADD);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    gl.activeTexture(gl.TEXTURE0);
  };

  enter(null);
  const engine = new Engine(gl, count, columns, pxPerPt, tuning, feed);
  const { sheet } = engine;
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // The engine's colours are display values already (sRGB bytes, blended as on its own canvas): stored as they are.
  gl.texStorage2D(gl.TEXTURE_2D, MIP_LEVELS, gl.RGBA8, sheet.width, sheet.height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, MIP_LEVELS - 1);
  const anisotropic = gl.getExtension("EXT_texture_filter_anisotropic");
  if (anisotropic) gl.texParameterf(gl.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number));
  const target = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, target);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  renderer.resetState();

  const cells = new Float32Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    const { x, y } = sheet.at(index);
    cells[index * 2] = x;
    cells[index * 2 + 1] = y;
  }
  const map = new THREE.ExternalTexture(texture);
  const material = new THREE.ShaderMaterial({
    uniforms: { sheet: { value: map }, sheetSize: { value: new THREE.Vector2(sheet.width, sheet.height) }, glass: { value: new THREE.Vector2(sheet.glassWidth, sheet.glassHeight) } },
    vertexShader: /* glsl */ `
      attribute vec2 cell;
      varying vec2 vAt;
      uniform vec2 sheetSize;
      uniform vec2 glass;
      void main() {
        // The sheet's rows run down from its top; the texture's from its bottom.
        vec2 px = cell + vec2(uv.x, 1.0 - uv.y) * glass;
        vAt = vec2(px.x, sheetSize.y - px.y) / sheetSize;
        vec4 at = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          at = instanceMatrix * at;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * at;
      }
    `,
    // A screen is a light: its pixels go to the display as the engine made them (no tone curve, no conversion).
    fragmentShader: /* glsl */ `
      uniform sampler2D sheet;
      varying vec2 vAt;
      void main() {
        gl_FragColor = vec4(texture2D(sheet, vAt).rgb, 1.0);
      }
    `,
  });

  const stopRenders = renderObjects();
  const touch = { x: 0, y: 0, spent: false };
  /** Each glass's touch a frame ago, for how fast it moves. */
  const before = new Float32Array(count * 3);
  let frames = 0;

  return {
    material,
    attributes: { cell: new THREE.InstancedBufferAttribute(cells, 2) },
    update() {
      enter(target);
      engine.frame();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.generateMipmap(gl.TEXTURE_2D);
      renderer.resetState();
      frames += 1;
    },
    hand(index, out: Hand) {
      const now = engine.now;
      engine.hand(index, touch);
      const at = index * 3;
      const dt = Math.max(1e-3, now - before[at + 2]!);
      // A stroke is a touch on the move: a flick crosses the glass at well over 600 pt a second.
      const speed = before[at + 2]! > 0 ? Math.hypot(touch.x - before[at]!, touch.y - before[at + 1]!) / dt : 0;
      if (dt > 0.004) {
        before[at] = touch.x;
        before[at + 1] = touch.y;
        before[at + 2] = now;
      }
      out.on = touch.y < GLASS.h && touch.y > 0;
      out.x = Math.min(1, Math.max(0, touch.x / GLASS.w));
      out.y = Math.min(1, Math.max(0, touch.y / GLASS.h));
      out.stroke = out.on ? Math.min(1, speed / 600) : 0;
      return out;
    },
    stats: () => ({ ...engine.stats(), frames, pxPerPt, sheet: [sheet.width, sheet.height] }),
    dispose() {
      stopRenders();
      enter(null);
      engine.dispose();
      gl.deleteFramebuffer(target);
      gl.deleteTexture(texture);
      renderer.resetState();
      map.dispose();
      material.dispose();
    },
  };
}
