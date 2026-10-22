// WebGL2 renderer for moving-image/3 (copied from moving-image/2's and changed):
// the clip as three 2D-array textures — Y frames, half-size CbCr frames and
// quarter-size flow layers — and two full-screen passes (slice, solid). It
// holds no domain state; callers pass a complete frame every animation frame.

import type { LiquidVideo } from "../media";
import type { CutWindow } from "../model/geometry";
import { LIQUID_SLICE_FRAGMENT, LIQUID_SOLID_FRAGMENT, LIQUID_VERTEX, LIQUID_YCBCR_FRAGMENT } from "./shaders";

type Vector = readonly [number, number, number];

export type LiquidFrame = {
  /** Box half sizes, frame heights. */
  half: Vector;
  /** Index into OPERATIONS. */
  operation: number;
  amount: readonly [number, number];
  /** The plane's tilt (radians about y, then x). */
  tilt: readonly [number, number];
  /** The present's depth on the undeformed cube. */
  present: number;
  /** The present plane in the space the cube is drawn in; null = beyond it. */
  planeZ: number | null;
  /** Half sizes of the region the solid view searches for the cube. */
  bounds: Vector;
  /** Loop period and seam, frame intervals. */
  loop: readonly [number, number];
  /** 1 = the flow-interpolated medium; 0 = moving-image/2's sampling. */
  liquid: boolean;
};

/**
 * Slots of the live window: the original video at its own frame rate around
 * the present (for clips whose cube is sampled sparsely, e.g. 15 min at one
 * frame per 3 s). 40 FHD frames cost ~124 MB.
 */
export const NEAR_SLOTS = 40;
/** A slot time this low means the slot is empty. */
const EMPTY = -1e9;

export type LiquidCamera = {
  eye: Vector;
  right: Vector;
  up: Vector;
  forward: Vector;
  focal: number;
};

export type LiquidPass =
  | { kind: "slice"; viewport: readonly [number, number, number, number] }
  | { kind: "solid"; viewport: readonly [number, number, number, number]; camera: LiquidCamera };

const SHARED = [
  "lumaFrames",
  "chromaFrames",
  "flowLayers",
  "cutWindows",
  "frames",
  "loaded",
  "flowLoaded",
  "frameSize",
  "flowCode",
  "loop",
  "liquid",
  "box",
  "operation",
  "amount",
  "tilt",
  "present",
  "viewport",
  "nearLuma",
  "nearChroma",
  "nearTimes",
  "nearSlots",
  "nearCount",
  "fps",
] as const;
const SLICE = [...SHARED, "aspect"] as const;
const SOLID = [...SHARED, "eye", "eyeRight", "eyeUp", "eyeForward", "focal", "bounds", "planeZ"] as const;
const YCBCR = ["frame", "target", "writeChroma"] as const;

type Program<Name extends string> = {
  program: WebGLProgram;
  uniforms: Record<Name, WebGLUniformLocation | null>;
};

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL2 could not create a shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`moving-image/4 shader: ${log}`);
  }
  return shader;
}

function link<Name extends string>(gl: WebGL2RenderingContext, fragmentSource: string, names: readonly Name[]): Program<Name> {
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL2 could not create a program");
  const vertex = compile(gl, gl.VERTEX_SHADER, LIQUID_VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`moving-image/4 program: ${gl.getProgramInfoLog(program)}`);
  }
  const uniforms = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<
    Name,
    WebGLUniformLocation | null
  >;
  return { program, uniforms };
}

type Loaded = {
  width: number;
  height: number;
  frames: number;
  aspect: number;
  flowWidth: number;
  flowHeight: number;
  flowCode: [number, number];
  loaded: number;
  flowLoaded: number;
};

export class LiquidRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly slice: Program<(typeof SLICE)[number]>;
  private readonly solid: Program<(typeof SOLID)[number]>;
  private readonly ycbcr: Program<(typeof YCBCR)[number]>;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly luma: WebGLTexture;
  private readonly chroma: WebGLTexture;
  private readonly flow: WebGLTexture;
  private readonly staging: WebGLTexture;
  private readonly cuts: WebGLTexture;
  private readonly framebuffer: WebGLFramebuffer;
  private readonly nearLuma: WebGLTexture;
  private readonly nearChroma: WebGLTexture;
  private readonly nearTimes = new Float32Array(NEAR_SLOTS).fill(EMPTY);
  /** The live window sorted by time for the shader: times, their slots, count. */
  private readonly sortedTimes = new Float32Array(NEAR_SLOTS).fill(EMPTY);
  private readonly sortedSlots = new Float32Array(NEAR_SLOTS);
  private sortedCount = 0;
  private readonly order = Array.from({ length: NEAR_SLOTS }, (_, i) => i);
  private near: { width: number; height: number } | null = null;
  private clip: (Loaded & { fps: number }) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL2 is unavailable");
    this.gl = gl;
    this.slice = link(gl, LIQUID_SLICE_FRAGMENT, SLICE);
    this.solid = link(gl, LIQUID_SOLID_FRAGMENT, SOLID);
    this.ycbcr = link(gl, LIQUID_YCBCR_FRAGMENT, YCBCR);
    const vertexArray = gl.createVertexArray();
    const luma = gl.createTexture();
    const chroma = gl.createTexture();
    const flow = gl.createTexture();
    const staging = gl.createTexture();
    const cuts = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    const nearLuma = gl.createTexture();
    const nearChroma = gl.createTexture();
    if (!vertexArray || !luma || !chroma || !flow || !staging || !cuts || !framebuffer || !nearLuma || !nearChroma) {
      throw new Error("WebGL2 could not allocate moving-image/4 resources");
    }
    this.vertexArray = vertexArray;
    this.luma = luma;
    this.chroma = chroma;
    this.flow = flow;
    this.staging = staging;
    this.cuts = cuts;
    this.framebuffer = framebuffer;
    this.nearLuma = nearLuma;
    this.nearChroma = nearChroma;
    this.setCuts(1, []);
    for (const [texture, internal, format] of [
      [luma, gl.R8, gl.RED],
      [chroma, gl.RG8, gl.RG],
      [flow, gl.RGBA8, gl.RGBA],
      [nearLuma, gl.R8, gl.RED],
      [nearChroma, gl.RG8, gl.RG],
    ] as const) {
      this.allocate(texture, internal, format, 1, 1, 1);
    }
    gl.bindTexture(gl.TEXTURE_2D, staging);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private allocate(texture: WebGLTexture, internal: number, format: number, width: number, height: number, depth: number) {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, internal, width, height, depth, 0, format, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /** Bytes the clip's textures hold on the GPU (the live window included). */
  get bytes() {
    const clip = this.clip;
    if (!clip) return 0;
    const near = this.near ? NEAR_SLOTS * this.near.width * this.near.height * 1.5 : 0;
    return clip.frames * (clip.width * clip.height * 1.5 + clip.flowWidth * clip.flowHeight * 4) + near;
  }

  /** Allocates empty frames and flow; they then arrive via writeVideoFrame / writeFlowLayer. */
  begin(clip: LiquidVideo) {
    const { gl } = this;
    const limit = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number;
    const size = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (clip.frames > limit || clip.width > size || clip.height > size) {
      throw new Error(`Clip exceeds this GPU's texture limits (${size} px, ${limit} layers)`);
    }
    this.allocate(this.luma, gl.R8, gl.RED, clip.width, clip.height, clip.frames);
    this.allocate(this.chroma, gl.RG8, gl.RG, clip.width / 2, clip.height / 2, clip.frames);
    this.allocate(this.flow, gl.RGBA8, gl.RGBA, clip.flow.width, clip.flow.height, clip.frames);
    this.near = null;
    this.clearNear();
    this.allocate(this.nearLuma, gl.R8, gl.RED, 1, 1, 1);
    this.allocate(this.nearChroma, gl.RG8, gl.RG, 1, 1, 1);
    this.clip = {
      fps: clip.fps,
      width: clip.width,
      height: clip.height,
      frames: clip.frames,
      aspect: clip.aspect,
      flowWidth: clip.flow.width,
      flowHeight: clip.flow.height,
      flowCode: [clip.flow.range, clip.flow.companding],
      loaded: 0,
      flowLoaded: 0,
    };
  }

  /** The clip's cut windows as a table indexed by frame interval. */
  setCuts(frames: number, windows: readonly CutWindow[]) {
    const { gl } = this;
    const table = new Float32Array(Math.max(1, frames) * 4).fill(-1);
    for (const window of windows) {
      for (let i = window.from; i < window.to; i += 1) {
        table.set([window.from, window.to, window.before, window.after], i * 4);
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, this.cuts);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, Math.max(1, frames), 1, 0, gl.RGBA, gl.FLOAT, table);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  /** Allocates the live window's slots (same size as the clip's frames). */
  beginNear(width: number, height: number) {
    const { gl } = this;
    this.allocate(this.nearLuma, gl.R8, gl.RED, width, height, NEAR_SLOTS);
    this.allocate(this.nearChroma, gl.RG8, gl.RG, width / 2, height / 2, NEAR_SLOTS);
    this.near = { width, height };
    this.clearNear();
  }

  /** Empties the live window (after a seek, or while it is not playing). */
  clearNear() {
    this.nearTimes.fill(EMPTY);
    this.sortNear();
  }

  private sortNear() {
    const times = this.nearTimes;
    this.order.sort((a, b) => times[a] - times[b]);
    let count = 0;
    this.sortedTimes.fill(EMPTY);
    for (const slot of this.order) {
      if (times[slot] <= EMPTY) continue;
      this.sortedTimes[count] = times[slot];
      this.sortedSlots[count] = slot;
      count += 1;
    }
    this.sortedCount = count;
  }

  /** Converts the frame `source` shows into live slot `slot`, at clip time `seconds`. */
  writeNearFrame(slot: number, seconds: number, source: TexImageSource) {
    const near = this.near;
    if (!near) return;
    this.convert(source, this.nearLuma, this.nearChroma, slot, near.width, near.height);
    this.nearTimes[slot % NEAR_SLOTS] = seconds;
    this.sortNear();
  }

  /** Converts the frame `source` currently shows into layer `index`. Frames arrive in order. */
  writeVideoFrame(index: number, source: TexImageSource) {
    const { clip } = this;
    if (!clip || index >= clip.frames) return;
    this.convert(source, this.luma, this.chroma, index, clip.width, clip.height);
    clip.loaded = Math.max(clip.loaded, index + 1);
  }

  /** One decoded frame into layer `layer` of a Y array and its half-size CbCr array. */
  private convert(source: TexImageSource, luma: WebGLTexture, chroma: WebGLTexture, layer: number, width: number, height: number) {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.staging);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(this.vertexArray);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.useProgram(this.ycbcr.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.staging);
    gl.uniform1i(this.ycbcr.uniforms.frame, 0);
    for (const [texture, w, h, isChroma] of [
      [luma, width, height, 0],
      [chroma, width / 2, height / 2, 1],
    ] as const) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture, 0, layer);
      gl.viewport(0, 0, w, h);
      gl.uniform2f(this.ycbcr.uniforms.target, w, h);
      gl.uniform1f(this.ycbcr.uniforms.writeChroma, isChroma);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, null, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Uploads flow layer `index` (interleaved RGBA bytes). Layers arrive in order. */
  writeFlowLayer(index: number, rgba: Uint8Array) {
    const { gl, clip } = this;
    if (!clip || index >= clip.frames) return;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.flow);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, index, clip.flowWidth, clip.flowHeight, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    clip.flowLoaded = Math.max(clip.flowLoaded, index + 1);
  }

  resize(width: number, height: number) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  get size() {
    return [this.canvas.width, this.canvas.height] as const;
  }

  render(frame: LiquidFrame | null, passes: readonly LiquidPass[]) {
    const { gl, clip } = this;
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!frame || !clip) return;

    gl.bindVertexArray(this.vertexArray);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.nearChroma);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.nearLuma);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.cuts);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.flow);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.chroma);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.luma);
    gl.enable(gl.SCISSOR_TEST);

    for (const pass of passes) {
      const [x, y, width, height] = pass.viewport;
      gl.viewport(x, y, width, height);
      gl.scissor(x, y, width, height);
      const { program, uniforms } = pass.kind === "slice" ? this.slice : this.solid;
      gl.useProgram(program);
      gl.uniform1i(uniforms.lumaFrames, 0);
      gl.uniform1i(uniforms.chromaFrames, 1);
      gl.uniform1i(uniforms.flowLayers, 2);
      gl.uniform1i(uniforms.cutWindows, 3);
      gl.uniform1i(uniforms.nearLuma, 4);
      gl.uniform1i(uniforms.nearChroma, 5);
      gl.uniform1fv(uniforms.nearTimes, this.sortedTimes);
      gl.uniform1fv(uniforms.nearSlots, this.sortedSlots);
      gl.uniform1f(uniforms.nearCount, this.sortedCount);
      gl.uniform1f(uniforms.fps, clip.fps);
      gl.uniform1f(uniforms.frames, clip.frames);
      gl.uniform1f(uniforms.loaded, clip.loaded);
      gl.uniform1f(uniforms.flowLoaded, clip.flowLoaded);
      gl.uniform2f(uniforms.frameSize, clip.width, clip.height);
      gl.uniform2f(uniforms.flowCode, ...clip.flowCode);
      gl.uniform2f(uniforms.loop, ...frame.loop);
      gl.uniform1f(uniforms.liquid, frame.liquid ? 1 : 0);
      gl.uniform3f(uniforms.box, ...frame.half);
      gl.uniform1i(uniforms.operation, frame.operation);
      gl.uniform2f(uniforms.amount, frame.amount[0], frame.amount[1]);
      gl.uniform2f(uniforms.tilt, frame.tilt[0], frame.tilt[1]);
      gl.uniform1f(uniforms.present, frame.present);
      gl.uniform4f(uniforms.viewport, x, y, width, height);
      if (pass.kind === "slice") {
        gl.uniform1f(this.slice.uniforms.aspect, clip.aspect);
      } else {
        const s = this.solid.uniforms;
        gl.uniform3f(s.eye, ...pass.camera.eye);
        gl.uniform3f(s.eyeRight, ...pass.camera.right);
        gl.uniform3f(s.eyeUp, ...pass.camera.up);
        gl.uniform3f(s.eyeForward, ...pass.camera.forward);
        gl.uniform1f(s.focal, pass.camera.focal);
        gl.uniform3f(s.bounds, ...frame.bounds);
        gl.uniform1f(s.planeZ, frame.planeZ ?? 1e4);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  dispose() {
    const { gl } = this;
    for (const texture of [this.luma, this.chroma, this.flow, this.staging, this.cuts, this.nearLuma, this.nearChroma]) {
      gl.deleteTexture(texture);
    }
    gl.deleteFramebuffer(this.framebuffer);
    gl.deleteVertexArray(this.vertexArray);
    for (const { program } of [this.slice, this.solid, this.ycbcr]) gl.deleteProgram(program);
  }
}
