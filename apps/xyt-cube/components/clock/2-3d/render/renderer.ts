// WebGL2 renderer for clock/2: two full-screen passes (slice, solid)
// over the clock's bent analytic cube. No textures; callers pass a complete frame
// every animation frame. Structure copied from moving-image/1's renderer.

import { CLOCK_SLICE_FRAGMENT, CLOCK_SOLID_FRAGMENT, CLOCK_VERTEX } from "./shaders";

type Vector = readonly [number, number, number];

export type ClockFrame = {
  half: Vector;
  /** Index into OPERATIONS. */
  operation: number;
  amount: readonly [number, number];
  /** The present's depth in the block (undeformed z). */
  present: number;
  /** The present plane in the space the block is drawn in; null = beyond it. */
  planeZ: number | null;
  /** Half sizes of the region the solid view searches for the bent block. */
  bounds: Vector;
  secondsPerUnit: number;
  /** Clock seconds at z = 0, mod one day: whole and fractional parts. */
  originWhole: number;
  originFrac: number;
  /** Each hand's turn (0..1) at z = 0. */
  handPhase: Vector;
  /** 0 analogue, 1 digital, 2 fractal. */
  stimulus: 0 | 1 | 2;
  /** The fractal tree's hand turns at z = 0, three per node (fractalPhases). */
  nodePhase: Float32Array;
  /** L, screen units: a point's time thickness is the time spanned by L along the cut. */
  thickness: number;
};

export type ClockCamera = {
  eye: Vector;
  right: Vector;
  up: Vector;
  forward: Vector;
  focal: number;
};

export type ClockPass =
  | { kind: "slice"; viewport: readonly [number, number, number, number] }
  | {
      kind: "solid";
      viewport: readonly [number, number, number, number];
      camera: ClockCamera;
    };

const SHARED = [
  "box",
  "operation",
  "amount",
  "present",
  "viewport",
  "secondsPerUnit",
  "originWhole",
  "originFrac",
  "handPhase",
  "stimulus",
  "nodePhase",
  "thickness",
] as const;
const SOLID = [...SHARED, "eye", "eyeRight", "eyeUp", "eyeForward", "focal", "bounds", "planeZ"] as const;

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
    throw new Error(`clock shader: ${log}`);
  }
  return shader;
}

function link<Name extends string>(gl: WebGL2RenderingContext, fragmentSource: string, names: readonly Name[]): Program<Name> {
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL2 could not create a program");
  const vertex = compile(gl, gl.VERTEX_SHADER, CLOCK_VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`clock program: ${gl.getProgramInfoLog(program)}`);
  }
  const uniforms = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<
    Name,
    WebGLUniformLocation | null
  >;
  return { program, uniforms };
}

export class ClockRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly slice: Program<(typeof SHARED)[number]>;
  private readonly solid: Program<(typeof SOLID)[number]>;
  private readonly vertexArray: WebGLVertexArrayObject;

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
    this.slice = link(gl, CLOCK_SLICE_FRAGMENT, SHARED);
    this.solid = link(gl, CLOCK_SOLID_FRAGMENT, SOLID);
    const vertexArray = gl.createVertexArray();
    if (!vertexArray) throw new Error("WebGL2 could not allocate a vertex array");
    this.vertexArray = vertexArray;
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

  render(frame: ClockFrame, passes: readonly ClockPass[]) {
    const { gl } = this;
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(this.vertexArray);
    gl.enable(gl.SCISSOR_TEST);

    for (const pass of passes) {
      const [x, y, width, height] = pass.viewport;
      gl.viewport(x, y, width, height);
      gl.scissor(x, y, width, height);
      const program = pass.kind === "slice" ? this.slice : this.solid;
      gl.useProgram(program.program);
      const u = program.uniforms;
      gl.uniform3f(u.box, ...frame.half);
      gl.uniform1i(u.operation, frame.operation);
      gl.uniform2f(u.amount, frame.amount[0], frame.amount[1]);
      gl.uniform1f(u.present, frame.present);
      gl.uniform4f(u.viewport, x, y, width, height);
      gl.uniform1f(u.secondsPerUnit, frame.secondsPerUnit);
      gl.uniform1f(u.originWhole, frame.originWhole);
      gl.uniform1f(u.originFrac, frame.originFrac);
      gl.uniform3f(u.handPhase, ...frame.handPhase);
      gl.uniform1f(u.stimulus, frame.stimulus);
      gl.uniform3fv(u.nodePhase, frame.nodePhase);
      gl.uniform1f(u.thickness, frame.thickness);
      if (pass.kind === "solid") {
        const s = (program as Program<(typeof SOLID)[number]>).uniforms;
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
    gl.disable(gl.SCISSOR_TEST);
  }

  dispose() {
    const { gl } = this;
    gl.deleteProgram(this.slice.program);
    gl.deleteProgram(this.solid.program);
    gl.deleteVertexArray(this.vertexArray);
  }
}
