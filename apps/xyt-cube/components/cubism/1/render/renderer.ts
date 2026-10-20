// WebGL2 renderer for cubism/1: the clip as one 3D texture and two
// full-screen passes (slice, solid). It holds no domain state; callers pass a
// complete plane every animation frame.

import type { CubismVolume } from "../media";
import { CUBISM_SLICE_FRAGMENT, CUBISM_SOLID_FRAGMENT, CUBISM_VERTEX } from "./shaders";

type Vector = readonly [number, number, number];

export type CubismPlaneFrame = {
  /** Box half sizes, frame heights. */
  half: Vector;
  u: Vector;
  v: Vector;
  w: Vector;
  /** A point on the plane: the screen centre in the slice view. */
  centre: Vector;
  /** Time wraps around the box (the clip loops) instead of ending at its faces. */
  loopTime: boolean;
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

const SHARED = ["volume", "box", "axisU", "axisV", "axisW", "centre", "viewport"] as const;
const SLICE = [...SHARED, "aspect", "loopTime"] as const;
const SOLID = [...SHARED, "eye", "eyeRight", "eyeUp", "eyeForward", "focal"] as const;

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
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly texture: WebGLTexture;
  private aspect = 0;

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
    const vertexArray = gl.createVertexArray();
    const texture = gl.createTexture();
    if (!vertexArray || !texture) throw new Error("WebGL2 could not allocate cubism resources");
    this.vertexArray = vertexArray;
    this.texture = texture;
  }

  /** Largest width, height or frame count this GPU accepts for a volume. */
  get maxVolumeSize() {
    return this.gl.getParameter(this.gl.MAX_3D_TEXTURE_SIZE) as number;
  }

  setVolume(volume: CubismVolume) {
    const { gl } = this;
    const limit = this.maxVolumeSize;
    if (volume.width > limit || volume.height > limit || volume.frames > limit) {
      throw new Error(`Clip volume exceeds this GPU's ${limit} px 3D texture limit`);
    }
    gl.bindTexture(gl.TEXTURE_3D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA8,
      volume.width,
      volume.height,
      volume.frames,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      volume.data,
    );
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    this.aspect = volume.aspect;
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

  render(plane: CubismPlaneFrame | null, passes: readonly CubismPass[]) {
    const { gl } = this;
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!plane || !this.aspect) return;

    gl.bindVertexArray(this.vertexArray);
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
      gl.uniform3f(uniforms.box, ...plane.half);
      gl.uniform3f(uniforms.axisU, ...plane.u);
      gl.uniform3f(uniforms.axisV, ...plane.v);
      gl.uniform3f(uniforms.axisW, ...plane.w);
      gl.uniform3f(uniforms.centre, ...plane.centre);
      gl.uniform4f(uniforms.viewport, x, y, width, height);
      if (pass.kind === "slice") {
        gl.uniform1f(this.slice.uniforms.aspect, this.aspect);
        gl.uniform1f(this.slice.uniforms.loopTime, plane.loopTime ? 1 : 0);
      } else {
        const s = this.solid.uniforms;
        gl.uniform3f(s.eye, ...pass.camera.eye);
        gl.uniform3f(s.eyeRight, ...pass.camera.right);
        gl.uniform3f(s.eyeUp, ...pass.camera.up);
        gl.uniform3f(s.eyeForward, ...pass.camera.forward);
        gl.uniform1f(s.focal, pass.camera.focal);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  dispose() {
    const { gl } = this;
    gl.deleteTexture(this.texture);
    gl.deleteVertexArray(this.vertexArray);
    gl.deleteProgram(this.slice.program);
    gl.deleteProgram(this.solid.program);
  }
}
