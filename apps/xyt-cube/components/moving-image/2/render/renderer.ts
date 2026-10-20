// WebGL2 renderer for moving-image/2: the clip as one volume and two full-screen
// passes (slice, solid) through the deformed cube. The volume is RGBA (phones, from frame sheets) or
// Y + half-size CbCr written frame by frame from a decoded video (screen). It
// holds no domain state; callers pass a complete plane every animation frame.

import type { CubismVideo, CubismVolume } from "../media";
import {
  CUBISM_SLICE_FRAGMENT,
  CUBISM_SOLID_FRAGMENT,
  CUBISM_VERTEX,
  CUBISM_YCBCR_FRAGMENT,
} from "./shaders";

type Vector = readonly [number, number, number];

export type CubismBendFrame = {
  /** Box half sizes, frame heights. */
  half: Vector;
  /** Index into OPERATIONS. */
  operation: number;
  amount: readonly [number, number];
  /** The present's depth on the undeformed cube. */
  present: number;
  /** The present plane in the space the cube is drawn in; null = beyond it. */
  planeZ: number | null;
  /** Half sizes of the region the solid view searches for the cube. */
  bounds: Vector;
};

export type CubismCamera = {
  eye: Vector;
  right: Vector;
  up: Vector;
  forward: Vector;
  focal: number;
};

export type CubismPass =
  | { kind: "slice"; viewport: readonly [number, number, number, number] }
  | { kind: "solid"; viewport: readonly [number, number, number, number]; camera: CubismCamera };

const SHARED = ["volume", "chroma", "ycbcr", "filled", "frames", "box", "operation", "amount", "present", "viewport"] as const;
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
    throw new Error(`cubism shader: ${log}`);
  }
  return shader;
}

function link<Name extends string>(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
  names: readonly Name[],
): Program<Name> {
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL2 could not create a program");
  const vertex = compile(gl, gl.VERTEX_SHADER, CUBISM_VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`cubism program: ${gl.getProgramInfoLog(program)}`);
  }
  const uniforms = Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<Name, WebGLUniformLocation | null>;
  return { program, uniforms };
}

export class CubismRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly slice: Program<(typeof SLICE)[number]>;
  private readonly solid: Program<(typeof SOLID)[number]>;
  private readonly ycbcr: Program<(typeof YCBCR)[number]>;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly texture: WebGLTexture;
  private readonly chroma: WebGLTexture;
  private readonly staging: WebGLTexture;
  private readonly framebuffer: WebGLFramebuffer;
  private aspect = 0;
  private frames = 1;
  private video: { width: number; height: number; frames: number; loaded: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 is unavailable");
    this.gl = gl;
    this.slice = link(gl, CUBISM_SLICE_FRAGMENT, SLICE);
    this.solid = link(gl, CUBISM_SOLID_FRAGMENT, SOLID);
    this.ycbcr = link(gl, CUBISM_YCBCR_FRAGMENT, YCBCR);
    const vertexArray = gl.createVertexArray();
    const texture = gl.createTexture();
    const chroma = gl.createTexture();
    const staging = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!vertexArray || !texture || !chroma || !staging || !framebuffer) {
      throw new Error("WebGL2 could not allocate cubism resources");
    }
    this.vertexArray = vertexArray;
    this.texture = texture;
    this.chroma = chroma;
    this.staging = staging;
    this.framebuffer = framebuffer;
    this.allocate(chroma, gl.RG8, gl.RG, 1, 1, 1, null);
    gl.bindTexture(gl.TEXTURE_2D, staging);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private allocate(
    texture: WebGLTexture,
    internal: number,
    format: number,
    width: number,
    height: number,
    depth: number,
    data: Uint8Array | null,
  ) {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(gl.TEXTURE_3D, 0, internal, width, height, depth, 0, format, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  }

  private checkSize(width: number, height: number, frames: number) {
    const limit = this.maxVolumeSize;
    if (width > limit || height > limit || frames > limit) {
      throw new Error(`Clip volume exceeds this GPU's ${limit} px 3D texture limit`);
    }
  }

  /** Largest width, height or frame count this GPU accepts for a volume. */
  get maxVolumeSize() {
    return this.gl.getParameter(this.gl.MAX_3D_TEXTURE_SIZE) as number;
  }

  setVolume(volume: CubismVolume) {
    const { gl } = this;
    this.checkSize(volume.width, volume.height, volume.frames);
    this.allocate(this.texture, gl.RGBA8, gl.RGBA, volume.width, volume.height, volume.frames, volume.data);
    this.allocate(this.chroma, gl.RG8, gl.RG, 1, 1, 1, null);
    this.video = null;
    this.aspect = volume.aspect;
    this.frames = volume.frames;
  }

  /** Allocates an empty Y + CbCr volume; frames then arrive via writeVideoFrame. */
  beginVideo(clip: CubismVideo) {
    const { gl } = this;
    this.checkSize(clip.width, clip.height, clip.frames);
    this.allocate(this.texture, gl.R8, gl.RED, clip.width, clip.height, clip.frames, null);
    this.allocate(this.chroma, gl.RG8, gl.RG, clip.width / 2, clip.height / 2, clip.frames, null);
    this.video = { width: clip.width, height: clip.height, frames: clip.frames, loaded: 0 };
    this.aspect = clip.aspect;
    this.frames = clip.frames;
  }

  /** Converts the frame `source` currently shows into layer `index`. Frames arrive in order. */
  writeVideoFrame(index: number, source: TexImageSource) {
    const { gl, video } = this;
    if (!video || index >= video.frames) return;
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
    for (const [texture, width, height, chroma] of [
      [this.texture, video.width, video.height, 0],
      [this.chroma, video.width / 2, video.height / 2, 1],
    ] as const) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture, 0, index);
      gl.viewport(0, 0, width, height);
      gl.uniform2f(this.ycbcr.uniforms.target, width, height);
      gl.uniform1f(this.ycbcr.uniforms.writeChroma, chroma);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, null, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    video.loaded = Math.max(video.loaded, index + 1);
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

  render(plane: CubismBendFrame | null, passes: readonly CubismPass[]) {
    const { gl } = this;
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!plane || !this.aspect) return;

    const { video } = this;
    const filled = !video || video.loaded >= video.frames ? 1 : Math.max(0, (video.loaded - 0.5) / video.frames);
    gl.bindVertexArray(this.vertexArray);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.chroma);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, this.texture);
    gl.enable(gl.SCISSOR_TEST);

    for (const pass of passes) {
      const [x, y, width, height] = pass.viewport;
      gl.viewport(x, y, width, height);
      gl.scissor(x, y, width, height);
      const { program, uniforms } = pass.kind === "slice" ? this.slice : this.solid;
      gl.useProgram(program);
      gl.uniform1i(uniforms.volume, 0);
      gl.uniform1i(uniforms.chroma, 1);
      gl.uniform1f(uniforms.ycbcr, video ? 1 : 0);
      gl.uniform1f(uniforms.filled, filled);
      gl.uniform1f(uniforms.frames, this.frames);
      gl.uniform3f(uniforms.box, ...plane.half);
      gl.uniform1i(uniforms.operation, plane.operation);
      gl.uniform2f(uniforms.amount, plane.amount[0], plane.amount[1]);
      gl.uniform1f(uniforms.present, plane.present);
      gl.uniform4f(uniforms.viewport, x, y, width, height);
      if (pass.kind === "slice") {
        gl.uniform1f(this.slice.uniforms.aspect, this.aspect);
      } else {
        const s = this.solid.uniforms;
        gl.uniform3f(s.eye, ...pass.camera.eye);
        gl.uniform3f(s.eyeRight, ...pass.camera.right);
        gl.uniform3f(s.eyeUp, ...pass.camera.up);
        gl.uniform3f(s.eyeForward, ...pass.camera.forward);
        gl.uniform1f(s.focal, pass.camera.focal);
        gl.uniform3f(s.bounds, ...plane.bounds);
        gl.uniform1f(s.planeZ, plane.planeZ ?? 1e4);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  dispose() {
    const { gl } = this;
    gl.deleteTexture(this.texture);
    gl.deleteTexture(this.chroma);
    gl.deleteTexture(this.staging);
    gl.deleteFramebuffer(this.framebuffer);
    gl.deleteProgram(this.ycbcr.program);
    gl.deleteVertexArray(this.vertexArray);
    gl.deleteProgram(this.slice.program);
    gl.deleteProgram(this.solid.program);
  }
}
