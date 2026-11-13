// The compositor: one WebGL2 canvas over the whole field, one instanced draw
// a frame. It owns the GPU side only — the groups' texture, the instance
// buffer, the atlas — and draws whatever the phones (phone/) have written.

import { FLOATS_PER_INSTANCE, FRAGMENT, GROUP_TEXELS, GROUPS_PER_PHONE, MAX_PHONES, VERTEX } from "./shaders";
import type { Motion } from "../model/motion";
import type { Slot } from "./atlas";

export type PhonePlacement = { x: number; y: number; scale: number };

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`pc/mobiles/2 shader: ${gl.getShaderInfoLog(shader)}`);
  return shader;
}

export class Compositor {
  readonly gl: WebGL2RenderingContext;
  readonly maxGroups = MAX_PHONES * GROUPS_PER_PHONE;
  /** Rows of GROUP_TEXELS RGBA texels, one row a group. */
  readonly groups = new Float32Array(this.maxGroups * GROUP_TEXELS * 4);
  private groupsDirtyFrom = Infinity;
  private groupsDirtyTo = -1;
  private program!: WebGLProgram;
  private vao!: WebGLVertexArrayObject;
  private instanceBuffer!: WebGLBuffer;
  private groupTexture!: WebGLTexture;
  private atlasTexture!: WebGLTexture;
  private uniforms!: Record<"groups" | "atlas" | "resolution" | "time" | "phones", WebGLUniformLocation | null>;
  private instanceCapacity = 0;
  private phones = new Float32Array(MAX_PHONES * 4);
  width = 1;
  height = 1;
  lost = false;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly atlasSize: number,
    readonly atlasLayers: number,
    private readonly onRestored: () => void,
  ) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("pc/mobiles/2 needs WebGL2");
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.lost = false;
      this.init();
      this.groupsDirtyFrom = 0;
      this.groupsDirtyTo = this.maxGroups - 1;
      this.onRestored();
    });
    this.init();
  }

  private init() {
    const gl = this.gl;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`pc/mobiles/2 program: ${gl.getProgramInfoLog(program)}`);
    this.program = program;
    this.uniforms = {
      groups: gl.getUniformLocation(program, "u_groups"),
      atlas: gl.getUniformLocation(program, "u_atlas"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      phones: gl.getUniformLocation(program, "u_phones"),
    };

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const corners = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.instanceBuffer = gl.createBuffer()!;
    this.instanceCapacity = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const stride = FLOATS_PER_INSTANCE * 4;
    for (let attribute = 0; attribute < 6; attribute += 1) {
      gl.enableVertexAttribArray(attribute + 1);
      gl.vertexAttribPointer(attribute + 1, 4, gl.FLOAT, false, stride, attribute * 16);
      gl.vertexAttribDivisor(attribute + 1, 1);
    }
    gl.bindVertexArray(null);

    this.groupTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.groupTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GROUP_TEXELS, this.maxGroups, 0, gl.RGBA, gl.FLOAT, this.groups);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.atlasTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.atlasTexture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, this.atlasSize, this.atlasSize, this.atlasLayers);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = this.canvas.width = Math.max(1, Math.round(width));
    this.height = this.canvas.height = Math.max(1, Math.round(height));
  }

  /** Glass top-left in device px, px per pt, glass corner radius in pt. */
  place(index: number, { x, y, scale }: PhonePlacement, radius = 55) {
    this.phones.set([x, y, scale, radius], index * 4);
  }

  writeGroup(index: number, motion: Motion, parent: number) {
    const at = index * GROUP_TEXELS * 4;
    const { from, to } = motion;
    this.groups.set(
      [motion.t0, motion.t1, motion.ease, parent, from.x, from.y, from.sx, from.sy, to.x, to.y, to.sx, to.sy, motion.ox, motion.oy, from.rot, to.rot, from.opacity, to.opacity, 0, 0],
      at,
    );
    if (index < this.groupsDirtyFrom) this.groupsDirtyFrom = index;
    if (index > this.groupsDirtyTo) this.groupsDirtyTo = index;
  }

  /** Premultiplied RGBA pixels, `slot.w` × `slot.h`. */
  upload(slot: Slot, pixels: Uint8Array) {
    if (this.lost) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.atlasTexture);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, slot.x, slot.y, slot.layer, slot.w, slot.h, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }

  draw(time: number, instances: Float32Array, count: number, background: readonly [number, number, number]) {
    if (this.lost) return;
    const gl = this.gl;
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (count === 0) return;

    if (this.groupsDirtyTo >= this.groupsDirtyFrom) {
      gl.bindTexture(gl.TEXTURE_2D, this.groupTexture);
      const rows = this.groupsDirtyTo - this.groupsDirtyFrom + 1;
      const from = this.groupsDirtyFrom * GROUP_TEXELS * 4;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, this.groupsDirtyFrom, GROUP_TEXELS, rows, gl.RGBA, gl.FLOAT, this.groups.subarray(from, from + rows * GROUP_TEXELS * 4));
      this.groupsDirtyFrom = Infinity;
      this.groupsDirtyTo = -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const floats = count * FLOATS_PER_INSTANCE;
    if (floats > this.instanceCapacity) {
      this.instanceCapacity = Math.max(floats, this.instanceCapacity * 2, 4096 * FLOATS_PER_INSTANCE);
      gl.bufferData(gl.ARRAY_BUFFER, this.instanceCapacity * 4, gl.DYNAMIC_DRAW);
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, instances, 0, floats);

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.groupTexture);
    gl.uniform1i(this.uniforms.groups, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.atlasTexture);
    gl.uniform1i(this.uniforms.atlas, 1);
    gl.uniform2f(this.uniforms.resolution, this.width, this.height);
    gl.uniform1f(this.uniforms.time, time);
    gl.uniform4fv(this.uniforms.phones, this.phones);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
  }
}
