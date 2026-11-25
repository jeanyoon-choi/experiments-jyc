// The passes after the field's own draw (pc/2d-mobiles/4, 필터): the field
// is drawn into a texture, and the canvas shows it through two things of the
// goldfish's own.
// - 물결, the water. The goldfish is its only source: where it touches the
//   glass a drop falls, and where it swims it leaves a wake. Made one of
//   three ways (docs/4.md): rings worked out for each drop where they are
//   shown (the default; nothing comes back from an edge); or a height field
//   over the whole canvas at half its resolution, stepped once a frame by the
//   wave equation, whose edges either take a wave in or turn it back. Water
//   stays on its own glass. The canvas is the field seen through the
//   surface: bent by its slope, lit where it bends.
// - 어안, the eye: each glass seen through a lens. From the middle of the
//   glass it is a barrel (the middle large, the edges bowed outward); from
//   the goldfish it is a bulge that travels with it, large where it looks.
// Nothing here runs unless one of them is on.

export type PostFrame = {
  /** 0–1 each; 0 is off. */
  ripple: number;
  lens: number;
  /** 0: the lens sits in the middle of each glass; 1: on its goldfish. */
  lensAt: number;
  /** The shown glasses, device px from the canvas's top-left: the first one's corner, the step to the next, one's size. */
  grid: { x: number; y: number; pitchX: number; pitchY: number; w: number; h: number; columns: number; count: number };
  /** Each mobile's goldfish, device px (x, y) by seat; x below −1e5: none. */
  fish: Float32Array;
  /** What the goldfish did to the water this frame: x, y (device px), amount. */
  drops: Float32Array;
  dropCount: number;
  /** A drop's width, device px. */
  dropSize: number;
  /** How the water is made: 0 rings worked out for each drop, 1 the stepped surface with edges that take a wave in, 2 the same with edges that turn it back. */
  water: number;
  /** The engine's clock, seconds. */
  time: number;
  /** The last RINGS drops of each mobile, by seat: x, y (device px), the moment it fell, its amount (0: none). */
  rings: Float32Array;
};

/** Drops kept for each mobile (the rings' texture is this wide). */
export const RINGS = 8;

const FULL = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

// r: the height now, g: the height a frame ago.
const STEP = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform sampler2D u_scene;
uniform vec2 u_texel;
uniform vec2 u_resolution;
uniform vec4 u_grid;
uniform vec4 u_cell;
uniform float u_open;   // 1: a glass's edge takes a wave in; 0: it turns it back
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy * u_texel;
  vec2 here = texture(u_state, uv).rg;
  vec2 dx = vec2(u_texel.x, 0.0);
  vec2 dy = vec2(0.0, u_texel.y);
  float beside = texture(u_state, uv + dx).r + texture(u_state, uv - dx).r + texture(u_state, uv + dy).r + texture(u_state, uv - dy).r;
  float across = texture(u_state, uv + dx + dy).r + texture(u_state, uv + dx - dy).r + texture(u_state, uv - dx + dy).r + texture(u_state, uv - dx - dy).r;
  // Nine neighbours, so a ring is round: with four it ran faster along the grid and went square and grainy.
  float spread = 0.5 * beside + 0.25 * across - 3.0 * here.r;
  float next = (2.0 * here.r - here.g + 0.5 * spread) * 0.985;
  // Glass only: the field's alpha is 1 where a mobile drew and 0 between them.
  next *= step(0.5, texture(u_scene, uv).a);
  if (u_open > 0.5) {
    // Towards its edge the water is thick, so a wave dies there and none comes back to cross the next one.
    vec2 p = vec2(gl_FragCoord.x * u_texel.x, 1.0 - gl_FragCoord.y * u_texel.y) * u_resolution;
    vec2 local = p - u_grid.xy - floor((p - u_grid.xy) / u_grid.zw) * u_grid.zw;
    vec2 away = min(local, u_cell.xy - local);
    next *= mix(0.86, 1.0, smoothstep(0.0, u_cell.x * 0.22, min(away.x, away.y)));
  }
  outColor = vec4(clamp(next, -2.0, 2.0), here.r, 0.0, 1.0);
}
`;

const DROP_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec3 a_drop;
uniform vec2 u_resolution;
uniform float u_size;
out float v_amount;
void main() {
  vec2 ndc = a_drop.xy / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = u_size;
  v_amount = a_drop.z;
}
`;

const DROP_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in float v_amount;
out vec4 outColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  outColor = vec4(v_amount * exp(-d * d * 5.0) * step(d, 1.0), 0.0, 0.0, 0.0);
}
`;

const SHOW = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform sampler2D u_state;
uniform sampler2D u_fish;
uniform sampler2D u_rings;
uniform vec2 u_resolution;
uniform vec2 u_texel;
uniform float u_time;
uniform vec4 u_grid;   // first glass's corner, step to the next (device px, y down)
uniform vec4 u_cell;   // a glass's size, columns, count
uniform vec4 u_fx;     // ripple, lens, lens centre (0 middle, 1 goldfish), water (0 none, 1 the stepped surface, 2 rings)
out vec4 outColor;

// A drop in open water, worked out rather than stepped: a short train of waves on a ring that grows at one speed,
// lower as it spreads and as it ages. In pt of the glass and in seconds, so it is the same at any size and frame rate.
const float RING_SPEED = 230.0;
const float RING_LIFE = 1.9;
const float RING_WAVE = 0.14;     // 2π / 45 pt
const float RING_WIDTH = 26.0;

// xy: the surface's slope, z: how sharply it bends (a crest is negative).
vec3 ringsAt(vec2 p, float seat, float px) {
  vec3 sum = vec3(0.0);
  for (int index = 0; index < ${RINGS}; index += 1) {
    vec4 ring = texelFetch(u_rings, ivec2(index, int(seat)), 0);
    float age = u_time - ring.z;
    if (ring.w <= 0.0 || age < 0.0 || age > RING_LIFE) continue;
    vec2 v = (p - ring.xy) / px;
    float r = length(v);
    float s = r - RING_SPEED * age;
    float left = 1.0 - age / RING_LIFE;
    float amount = ring.w * left * left * smoothstep(0.0, 0.1, age) / sqrt(1.0 + r / 50.0);
    float w2 = RING_WIDTH * RING_WIDTH;
    float body = amount * exp(-s * s / w2);
    float c = cos(RING_WAVE * s);
    float n = sin(RING_WAVE * s);
    float rise = body * (-2.0 * s / w2 * c - RING_WAVE * n);
    float bend = body * ((4.0 * s * s / (w2 * w2) - 2.0 / w2 - RING_WAVE * RING_WAVE) * c + 4.0 * s * RING_WAVE / w2 * n);
    sum += vec3(r > 0.001 ? v / r * rise : vec2(0.0), bend);
  }
  return sum;
}

vec2 uvOf(vec2 p) {
  return vec2(p.x, u_resolution.y - p.y) / u_resolution;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 id = floor((p - u_grid.xy) / u_grid.zw);
  vec2 corner = u_grid.xy + id * u_grid.zw;
  float seat = id.y * u_cell.z + id.x;
  bool glass = id.x >= 0.0 && id.x < u_cell.z && id.y >= 0.0 && seat < u_cell.w && p.x - corner.x <= u_cell.x && p.y - corner.y <= u_cell.y;
  if (!glass) {
    outColor = vec4(texture(u_scene, uvOf(p)).rgb, 1.0);
    return;
  }
  vec2 q = p;
  if (u_fx.y > 0.0) {
    vec2 halfSize = u_cell.xy * 0.5;
    vec2 centre = corner + halfSize;
    vec2 fish = texelFetch(u_fish, ivec2(int(seat), 0), 0).xy;
    if (u_fx.z > 0.5 && fish.x > -1.0e5) {
      // From the goldfish: a bulge as wide as the glass that travels with it.
      vec2 d = (p - clamp(fish, corner, corner + u_cell.xy)) / u_cell.x;
      float r = length(d);
      if (r < 1.0) {
        float fall = 1.0 - r * r;
        q = p - d * u_cell.x * (1.0 - 1.0 / (1.0 + 1.6 * u_fx.y)) * fall * fall;
      }
    } else {
      // From the middle: a barrel. The middle of each edge stays put, the corners run off the glass.
      vec2 d = (p - centre) / halfSize;
      float k = 1.1 * u_fx.y;
      q = centre + d * halfSize * (1.0 + k * dot(d, d)) / (1.0 + k);
    }
  }
  vec3 color = vec3(0.0);
  float light = 0.0;
  if (u_fx.w > 0.5) {
    // Each glass shows itself only: the lens may run off it (then there is nothing), the water never does.
    vec2 lensInside = min(q - corner, corner + u_cell.xy - q);
    if (min(lensInside.x, lensInside.y) < 0.0) {
      outColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    vec2 slope;
    float bend;
    if (u_fx.w > 1.5) {
      vec3 water = ringsAt(q, seat, u_cell.x / 390.0);
      slope = water.xy * 4.0;
      bend = water.z * 15.0;
    } else {
      vec2 uv = uvOf(q);
      float here = texture(u_state, uv).r;
      float east = texture(u_state, uv + vec2(u_texel.x, 0.0)).r;
      float west = texture(u_state, uv - vec2(u_texel.x, 0.0)).r;
      // The texture's y runs up, the screen's down.
      float south = texture(u_state, uv - vec2(0.0, u_texel.y)).r;
      float north = texture(u_state, uv + vec2(0.0, u_texel.y)).r;
      slope = vec2(east - west, south - north);
      bend = (east + west + south + north - 4.0 * here) * 5.0;
    }
    q = clamp(q + slope * u_fx.x * u_cell.x * 0.3, corner + 0.5, corner + u_cell.xy - 0.5);
    // The lines of the water: a crest gathers the light and a trough spreads it, whichever way it faces.
    // Lit from one side (the first version), the surface read as embossed paper.
    // A trough only dims a little: at full strength both ways the rings were black and white bands over the interface.
    light = clamp(-bend * u_fx.x * 3.0, -0.1, 0.55);
  }
  vec2 inside = min(q - corner, corner + u_cell.xy - q);
  if (min(inside.x, inside.y) >= 0.0) color = texture(u_scene, uvOf(q)).rgb;
  outColor = vec4(clamp(color + light, 0.0, 1.0), 1.0);
}
`;

function program(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const made = gl.createProgram()!;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`pc/2d-mobiles/4 filter shader: ${gl.getShaderInfoLog(shader)}`);
    gl.attachShader(made, shader);
  }
  gl.linkProgram(made);
  if (!gl.getProgramParameter(made, gl.LINK_STATUS)) throw new Error(`pc/2d-mobiles/4 filter program: ${gl.getProgramInfoLog(made)}`);
  return made;
}

type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };

/** Water texels per device px, each way. */
const WATER_SCALE = 0.5;
const MAX_DROPS = 512;

export class Post {
  private readonly step: WebGLProgram;
  private readonly drop: WebGLProgram;
  private readonly show: WebGLProgram;
  private readonly empty: WebGLVertexArrayObject;
  private readonly dropArray: WebGLVertexArrayObject;
  private readonly dropBuffer: WebGLBuffer;
  private readonly fishTexture: WebGLTexture;
  private readonly ringTexture: WebGLTexture;
  /** Whether this GPU can draw into a half-float texture (the water needs it). */
  readonly water: boolean;
  private scene: Target | null = null;
  private state: [Target, Target] | null = null;
  private width = 0;
  private height = 0;
  private waterWidth = 0;
  private waterHeight = 0;
  private stirred = false;
  private readonly locations = new Map<string, WebGLUniformLocation | null>();

  private at(owner: "step" | "drop" | "show", name: string) {
    const key = `${owner}.${name}`;
    if (!this.locations.has(key)) this.locations.set(key, this.gl.getUniformLocation(this[owner], name));
    return this.locations.get(key)!;
  }

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.water = Boolean(gl.getExtension("EXT_color_buffer_float") ?? gl.getExtension("EXT_color_buffer_half_float"));
    this.step = program(gl, FULL, STEP);
    this.drop = program(gl, DROP_VERTEX, DROP_FRAGMENT);
    this.show = program(gl, FULL, SHOW);
    this.empty = gl.createVertexArray()!;
    this.dropArray = gl.createVertexArray()!;
    this.dropBuffer = gl.createBuffer()!;
    gl.bindVertexArray(this.dropArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dropBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_DROPS * 12, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.fishTexture = gl.createTexture()!;
    this.ringTexture = gl.createTexture()!;
    for (const texture of [this.fishTexture, this.ringTexture]) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, RINGS, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(RINGS * 4));
  }

  private target(width: number, height: number, internal: number, format: number, type: number, filter: number): Target {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, framebuffer };
  }

  private release(target: Target | null) {
    if (!target) return;
    this.gl.deleteTexture(target.texture);
    this.gl.deleteFramebuffer(target.framebuffer);
  }

  /** Points the field's draw at this pass's own texture; false if it cannot be made. */
  begin(width: number, height: number) {
    const gl = this.gl;
    if (width !== this.width || height !== this.height || !this.scene) {
      this.release(this.scene);
      this.release(this.state?.[0] ?? null);
      this.release(this.state?.[1] ?? null);
      this.width = width;
      this.height = height;
      this.scene = this.target(width, height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      this.waterWidth = Math.max(1, Math.ceil(width * WATER_SCALE));
      this.waterHeight = Math.max(1, Math.ceil(height * WATER_SCALE));
      this.state = this.water
        ? [
            this.target(this.waterWidth, this.waterHeight, gl.RG16F, gl.RG, gl.HALF_FLOAT, gl.LINEAR),
            this.target(this.waterWidth, this.waterHeight, gl.RG16F, gl.RG, gl.HALF_FLOAT, gl.LINEAR),
          ]
        : null;
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) this.state = null;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.framebuffer);
    return true;
  }

  /** The field is drawn: move the water a step, then show the field through the water and the lens. */
  finish(frame: PostFrame) {
    const gl = this.gl;
    const scene = this.scene!;
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    const stepped = frame.ripple > 0 && frame.water > 0 && this.state !== null;
    const water = frame.ripple <= 0 ? 0 : frame.water === 0 ? 2 : stepped ? 1 : 0;
    if (stepped) {
      const [from, to] = this.state!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, to.framebuffer);
      gl.viewport(0, 0, this.waterWidth, this.waterHeight);
      gl.useProgram(this.step);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, from.texture);
      gl.uniform1i(this.at("step", "u_state"), 3);
      gl.uniform1i(this.at("step", "u_scene"), 2);
      gl.uniform2f(this.at("step", "u_texel"), 1 / this.waterWidth, 1 / this.waterHeight);
      gl.uniform2f(this.at("step", "u_resolution"), this.width, this.height);
      gl.uniform4f(this.at("step", "u_grid"), frame.grid.x, frame.grid.y, frame.grid.pitchX, frame.grid.pitchY);
      gl.uniform4f(this.at("step", "u_cell"), frame.grid.w, frame.grid.h, frame.grid.columns, frame.grid.count);
      gl.uniform1f(this.at("step", "u_open"), frame.water === 1 ? 1 : 0);
      gl.bindVertexArray(this.empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const drops = Math.min(MAX_DROPS, frame.dropCount);
      if (drops > 0) {
        // Onto the height now only: a push, which the next step carries outward.
        gl.useProgram(this.drop);
        gl.uniform2f(this.at("drop", "u_resolution"), this.width, this.height);
        gl.uniform1f(this.at("drop", "u_size"), Math.max(3, frame.dropSize * WATER_SCALE));
        gl.bindVertexArray(this.dropArray);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dropBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, frame.drops, 0, drops * 3);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.colorMask(true, false, false, false);
        gl.drawArrays(gl.POINTS, 0, drops);
        gl.colorMask(true, true, true, true);
        gl.disable(gl.BLEND);
      }
      this.state = [to, from];
      this.stirred = true;
    } else if (this.stirred && this.state) {
      // Water switched off: still, so it starts from rest when it is switched on again.
      for (const target of this.state) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      this.stirred = false;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.show);
    gl.uniform1i(this.at("show", "u_scene"), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, stepped ? this.state![0].texture : scene.texture);
    gl.uniform1i(this.at("show", "u_state"), 3);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.fishTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, frame.fish.length / 2, 1, 0, gl.RG, gl.FLOAT, frame.fish);
    gl.uniform1i(this.at("show", "u_fish"), 4);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.ringTexture);
    if (water === 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, RINGS, frame.rings.length / (RINGS * 4), 0, gl.RGBA, gl.FLOAT, frame.rings);
    gl.uniform1i(this.at("show", "u_rings"), 5);
    gl.uniform1f(this.at("show", "u_time"), frame.time);
    gl.uniform2f(this.at("show", "u_resolution"), this.width, this.height);
    gl.uniform2f(this.at("show", "u_texel"), 1 / this.waterWidth, 1 / this.waterHeight);
    const { grid } = frame;
    gl.uniform4f(this.at("show", "u_grid"), grid.x, grid.y, grid.pitchX, grid.pitchY);
    gl.uniform4f(this.at("show", "u_cell"), grid.w, grid.h, grid.columns, grid.count);
    gl.uniform4f(this.at("show", "u_fx"), frame.ripple, frame.lens, frame.lensAt, water);
    gl.bindVertexArray(this.empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE0);
  }
}
