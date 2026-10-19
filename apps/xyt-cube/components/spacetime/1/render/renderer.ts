// WebGL2 renderer for spacetime/1: one program, one full-screen triangle,
// the clip's frame atlas and the O3 lag field. It holds no domain state; the
// screen passes a complete frame every animation frame.

import type { LoadedSpacetimeClip } from "../media";
import { MAX_SHADER_MASSES, SPACETIME_FRAGMENT, SPACETIME_VERTEX } from "./shaders";

export type SpacetimeRenderFrame = {
  timeNow: number;
  period: number;
  /** O1: circumference of the compact space as a fraction of the frame; 1 = off. */
  compactScale: number;
  /** Columns 1 and 2 of the observer → rest matrix, (w, x, y) each. */
  restX: readonly [number, number, number];
  restY: readonly [number, number, number];
  lightSpeed: number;
  /** Scene-unit masses (x, y, mu); at most MAX_SHADER_MASSES are drawn. */
  masses: readonly { x: number; y: number; mu: number }[];
  lensGain: number;
  softening: number;
  lagOn: boolean;
};

const UNIFORMS = [
  "atlas",
  "atlasGrid",
  "frameSize",
  "frames",
  "fps",
  "canvas",
  "aspect",
  "timeNow",
  "period",
  "compactScale",
  "restX",
  "restY",
  "lightSpeed",
  "massCount",
  "masses",
  "lensGain",
  "softening",
  "lag",
  "lagSize",
  "lagOn",
] as const;

type UniformName = (typeof UNIFORMS)[number];

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL2 could not create a shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`spacetime shader: ${log}`);
  }
  return shader;
}

export class SpacetimeRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly uniforms: Record<UniformName, WebGLUniformLocation | null>;
  private readonly atlasTexture: WebGLTexture;
  private readonly lagTexture: WebGLTexture;
  private readonly massData = new Float32Array(MAX_SHADER_MASSES * 3);
  private clip: LoadedSpacetimeClip | null = null;
  private lagWidth = 0;
  private lagHeight = 0;
  private readonly canvas: HTMLCanvasElement;

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

    const program = gl.createProgram();
    if (!program) throw new Error("WebGL2 could not create a program");
    const vertex = compile(gl, gl.VERTEX_SHADER, SPACETIME_VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, SPACETIME_FRAGMENT);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`spacetime program: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    const vertexArray = gl.createVertexArray();
    const atlasTexture = gl.createTexture();
    const lagTexture = gl.createTexture();
    if (!vertexArray || !atlasTexture || !lagTexture) {
      throw new Error("WebGL2 could not allocate spacetime resources");
    }
    this.vertexArray = vertexArray;
    this.atlasTexture = atlasTexture;
    this.lagTexture = lagTexture;

    this.uniforms = Object.fromEntries(
      UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]),
    ) as Record<UniformName, WebGLUniformLocation | null>;

    gl.bindTexture(gl.TEXTURE_2D, lagTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.setLagField(new Float32Array(1), 1, 1);
  }

  setClip(clip: LoadedSpacetimeClip) {
    const { gl } = this;
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (clip.image.naturalWidth > maxSize || clip.image.naturalHeight > maxSize) {
      throw new Error(
        `Clip atlas ${clip.image.naturalWidth}×${clip.image.naturalHeight} exceeds this GPU's ${maxSize} px limit`,
      );
    }
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, clip.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.clip = clip;
  }

  /** Lag in seconds, row-major, row 0 at the top of the scene. */
  setLagField(data: Float32Array, width: number, height: number) {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.lagTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (width !== this.lagWidth || height !== this.lagHeight) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, width, height, 0, gl.RED, gl.FLOAT, data);
      this.lagWidth = width;
      this.lagHeight = height;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.FLOAT, data);
    }
  }

  resize(width: number, height: number) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  render(frame: SpacetimeRenderFrame) {
    const { gl, uniforms: u, clip } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!clip) return;

    const count = Math.min(frame.masses.length, MAX_SHADER_MASSES);
    this.massData.fill(0);
    for (let i = 0; i < count; i += 1) {
      this.massData[i * 3] = frame.masses[i].x;
      this.massData[i * 3 + 1] = frame.masses[i].y;
      this.massData[i * 3 + 2] = frame.masses[i].mu;
    }

    const { manifest } = clip;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vertexArray);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.uniform1i(u.atlas, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lagTexture);
    gl.uniform1i(u.lag, 1);

    gl.uniform2f(u.atlasGrid, manifest.columns, manifest.rows);
    gl.uniform2f(u.frameSize, manifest.frameWidth, manifest.frameHeight);
    gl.uniform1f(u.frames, manifest.frames);
    gl.uniform1f(u.fps, manifest.fps);
    gl.uniform2f(u.canvas, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.aspect, clip.aspect);
    gl.uniform1f(u.timeNow, frame.timeNow);
    gl.uniform1f(u.period, frame.period);
    gl.uniform1f(u.compactScale, frame.compactScale);
    gl.uniform3f(u.restX, frame.restX[0], frame.restX[1], frame.restX[2]);
    gl.uniform3f(u.restY, frame.restY[0], frame.restY[1], frame.restY[2]);
    gl.uniform1f(u.lightSpeed, frame.lightSpeed);
    gl.uniform1i(u.massCount, count);
    gl.uniform3fv(u.masses, this.massData);
    gl.uniform1f(u.lensGain, frame.lensGain);
    gl.uniform1f(u.softening, frame.softening);
    gl.uniform2f(u.lagSize, this.lagWidth, this.lagHeight);
    gl.uniform1f(u.lagOn, frame.lagOn ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const { gl } = this;
    gl.deleteTexture(this.atlasTexture);
    gl.deleteTexture(this.lagTexture);
    gl.deleteVertexArray(this.vertexArray);
    gl.deleteProgram(this.program);
  }
}
