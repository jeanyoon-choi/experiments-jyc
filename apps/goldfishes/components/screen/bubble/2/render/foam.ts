// Rank as a raft of Koons's Balloon Dog lobes. Every page is a bubble whose
// area is its displayed rank; the bubbles float together and press into one
// another, each an inflated lobe of mirror-polished steel under a transparent
// colour coat (bubble/1 is the same raft in soap film).
//
// Shape follows planar soap-bubble geometry (Plateau's laws as in
// LittleBadger/bubbles): bubble i owns the points where
//   f_i(p) = |p − c_i|² / r_i − r_i
// is the smallest and negative. A free face is then a circle of radius r_i,
// and the wall between two bubbles is a circular arc whose curvature follows
// their pressure difference, bowing into the larger one; at the contact
// distance √(r₁² + r₂² − r₁r₂) walls meet three at a time at 120°. The
// layout (this route's copy) keeps touching bubbles at that distance.
//
// On the GPU, at a share of the CSS resolution, every bubble draws a square
// around itself twice with depth testing on f: the first pass keeps each
// pixel's bubble, the second the next one. The composite, at full
// resolution, recomputes both exactly and renders each bubble as a lobe: a
// round body to its edge, pinched into one narrow cleft where it meets a
// neighbour, reflecting a photographed room's light (blurred past legibility)
// and, traced against them, its neighbours. Nothing persists between frames.

export const MAX_BUBBLES = 16_384;
/** Floats per bubble: x y radius seed (CSS px). */
export const BUBBLE_FLOATS = 4;
/** The ownership passes run at this share of the CSS resolution. */
const SCALE = 0.75;
/** Bubble data and neighbour lists are kept in textures this many bubbles wide. */
const ROW = 128;
/** Each bubble lists up to this many neighbours it overlaps (4 per texel), most deeply pressed first. */
const NEIGHBOUR_TEXELS = 4;
const NEIGHBOURS = NEIGHBOUR_TEXELS * 4;
/**
 * A bubble is drawn this far (CSS px) past its own radius: enough for its
 * anti-aliased edge (walls come from the neighbour lists, not from here).
 */
const MARGIN = 2;

const SPLAT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
out vec2 local;
flat out vec4 disc;
void main() {
  float extent = bubble.z + ${MARGIN}.0;
  local = (corner * 2.0 - 1.0) * extent;
  // Its index (from 1) travels with it, so the lobe can look up its data.
  disc = vec4(bubble.xyz, float(gl_InstanceID) + 1.0);
  vec2 clip = (bubble.xy + local) / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const SPLAT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec4 disc;
uniform highp sampler2D first;
uniform bool second;
out vec4 result;
void main() {
  float f = dot(local, local) / disc.z - disc.z;
  if (length(local) > disc.z + ${MARGIN}.0) discard;
  if (second) {
    vec4 found = texelFetch(first, ivec2(gl_FragCoord.xy), 0);
    if (found.z > 0.0 && distance(found.xy, disc.xy) < 1e-3 && abs(found.z - disc.z) < 1e-3) discard;
  }
  gl_FragDepth = clamp((f + 8192.0) / 16384.0, 0.0, 1.0);
  result = disc;
}
`;

const SCREEN_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
out vec2 uv;
void main() {
  uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const STEEL_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform highp sampler2D first;
uniform highp sampler2D second;
uniform vec2 frame;                   // CSS px
uniform float cssPerPixel;            // one device pixel, in CSS px
uniform float exposure;               // overall
uniform float envMode;                // 반사되는 환경: which light map (KOONS_LIGHT_FILES)
uniform vec3 lightColour;             // colour of the light the steel reflects
uniform vec3 background;              // what lies behind the raft
uniform highp sampler2D bubbleData;   // per bubble: x, y, radius, seed
uniform highp sampler2D neighbours;   // per bubble: indices (from 1) of the bubbles it overlaps
uniform vec3 coating;                 // the coat's colour over the steel (its reflectance tint)
uniform float coatingMix;             // 1: each bubble takes one of the five Balloon Dog coats instead of 'coating'
uniform float koonsLights;            // the brightness of the light the steel reflects
uniform float koonsRoom;              // light everywhere, lifting the dark parts
uniform float koonsFloor;             // the pale bounce from below
uniform float koonsClear;             // the clear coat's untinted reflection at grazing angles
uniform float koonsNeighbour;         // how much each lobe mirrors its neighbours
uniform float koonsTurn;              // how differently the lobes are turned to the room
uniform float koonsCrease;            // how deep and dark the clefts between lobes are
uniform float koonsBlur;              // how blurred the light the steel reflects is (a mip level of the light map)
uniform float koonsRotate;            // turns the light map round the raft (0–1, a full turn)
uniform float koonsContrast;          // the light's contrast: above 1 its bright parts brighter and dark parts darker
uniform float koonsDensity;           // the coat's density: above 1 a deeper, more saturated colour
uniform sampler2D koonsMap;           // the light round the steel: a photographed room's light (CC0 HDRI), blurred past legibility
out vec4 pixel;

vec4 bubbleAt(float index) {
  int i = int(index) - 1;
  return texelFetch(bubbleData, ivec2(i % ${ROW}, i / ${ROW}), 0);
}

float own(vec4 b, vec2 p) {
  if (b.z <= 0.0) return 1e9;
  vec2 d = p - b.xy;
  return dot(d, d) / b.z - b.z;
}

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// The light on the steel: a real room's light, not drawn shapes. Drawn
// light (discs, strips, flags, a softbox) reads as cheesy and plastic, and the
// same shape repeats on every lobe; a photographed light distribution (a CC0
// HDRI, blurred past legibility before it is shipped and further here by
// 반사 흐림) has the irregular brightness and colour of real light without
// showing anything nameable. Each lobe, turned its own way, catches its own
// part of it. 반사되는 환경 picks the room (a bright loft hall for 창, an
// overcast sky, a small studio, a city at night, a forest slope, a lakeside).
// Screen y runs down; z points at the camera.
float lobe(vec3 d, vec3 towards, float width) {
  return exp((dot(d, normalize(towards)) - 1.0) / width);
}
vec3 koonsLight(vec3 d) {
  float up = -d.y;
  vec2 at = vec2(atan(d.x, -d.z) / 6.2831853 + 0.5 + koonsRotate, acos(clamp(up, -1.0, 1.0)) / 3.1415927);
  vec3 light = textureLod(koonsMap, at, koonsBlur).rgb;
  light = 0.7 * pow(max(light, vec3(0.0)) / 0.7, vec3(koonsContrast));
  float bounce = koonsFloor * 0.5 * lobe(d, vec3(0.0, 1.0, 0.25), 0.35);
  return lightColour * (koonsLights * light + koonsRoom * 0.06 + bounce);
}

// A filmic curve (ACES, fitted): bright reflections roll into white, dark ones
// keep the coat dense instead of going grey.
vec3 filmic(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// The five Balloon Dog coats (magenta, yellow, blue, orange, red), as tints of
// the steel's reflection, for 섞음.
vec3 balloonCoat(float pick) {
  if (pick < 0.2) return vec3(0.92, 0.1, 0.48);
  if (pick < 0.4) return vec3(1.0, 0.78, 0.1);
  if (pick < 0.6) return vec3(0.08, 0.26, 0.95);
  if (pick < 0.8) return vec3(1.0, 0.4, 0.06);
  return vec3(0.95, 0.07, 0.08);
}

void main() {
  vec2 p = vec2(uv.x, 1.0 - uv.y) * frame;
  // The passes are per texel at a coarser grid; gather every bubble they
  // found around this pixel and decide exactly here, so walls fall where the
  // geometry puts them, not on the texel grid.
  ivec2 centre = ivec2(uv * vec2(textureSize(first, 0)));
  ivec2 limit = textureSize(first, 0) - 1;
  vec4 found[18];
  int count = 0;
  // Nearest bubbles first: where none lies around, this is open ground and
  // the second layer is never read.
  for (int layer = 0; layer < 2; layer += 1) {
    if (layer == 1 && count == 0) break;
    for (int y = -1; y <= 1; y += 1) {
      for (int x = -1; x <= 1; x += 1) {
        ivec2 at = clamp(centre + ivec2(x, y), ivec2(0), limit);
        vec4 c = layer == 0 ? texelFetch(first, at, 0) : texelFetch(second, at, 0);
        // Repeats are harmless (they give the same distances), so they are
        // kept rather than searched for.
        if (c.z <= 0.0) continue;
        found[count] = c;
        count += 1;
      }
    }
  }
  // Open ground: nothing to compute.
  if (count == 0) {
    pixel = vec4(background, 1.0);
    return;
  }
  vec4 a = vec4(0.0);
  float fa = 1e9;
  for (int i = 0; i < 18; i += 1) {
    if (i >= count) break;
    float f = own(found[i], p);
    if (f < fa) {
      fa = f;
      a = found[i];
    }
  }
  // Distances in px, each from f's own gradient: to the free face (f = 0)
  // and to the nearest wall with any neighbour that overlaps here. Taking
  // the nearest over all neighbours keeps the surface whole where the
  // second-nearest bubble changes.
  vec2 da = p - a.xy;
  float rho = max(length(da), 1e-3);
  float slopeA = max(2.0 * rho / max(a.z, 1e-3), 1e-3);
  float toFace = -fa / slopeA;
  // The distance's gradient, exactly (toFace = (r² − ρ²) / 2ρ), and for the
  // nearest wall that of the wall distance.
  vec2 edgeGradient = -(a.z * a.z + rho * rho) / (2.0 * rho * rho) * (da / rho);
  // The nearest wall over every bubble this one overlaps — the same list for
  // all of its pixels, so the surface never changes with the texel grid.
  float toWall = 1e4;
  vec2 wallGradient = vec2(0.0);
  int self = int(a.w) - 1;
  for (int t = 0; t < ${NEIGHBOUR_TEXELS}; t += 1) {
    vec4 ids = texelFetch(neighbours, ivec2((self % ${ROW}) * ${NEIGHBOUR_TEXELS} + t, self / ${ROW}), 0);
    for (int k = 0; k < 4; k += 1) {
    float id = ids[k];
    if (id <= 0.0) continue;
    vec4 c = bubbleAt(id);
    float fc = own(c, p);
    if (fc >= 0.0) continue;
    vec2 dc = p - c.xy;
    vec2 gradient = 2.0 * da / a.z - 2.0 * dc / c.z;
    float g = max(length(gradient), 1e-3);
    float candidate = (fc - fa) / g;
    if (candidate < toWall) {
      toWall = candidate;
      wallGradient = -gradient / g;
    }
    }
  }
  float toEdge = min(toFace, toWall);
  if (toWall < toFace) edgeGradient = wallGradient;

  // Koons's Balloon Dog: every bubble an inflated lobe of mirror-polished
  // steel under a transparent colour coat. No diffuse light at all: what a
  // lobe shows is what it reflects — the soft room, and above all its
  // neighbours, so no two lobes look alike.
  // A round body to the very edge, as an inflated lobe is: where it presses
  // against a neighbour the two meet in one narrow dark gap (the twists and
  // clefts between lobes), turned down only over the last few pixels so the
  // gap is smooth at any size.
  float seedRaw = bubbleAt(a.w).w;
  float rr = max(a.z, 1e-3);
  vec2 out2 = da / rr;
  vec3 round3 = vec3(out2, sqrt(max(1.0 - dot(out2, out2), 0.0)));
  float creaseWidth = (min(0.05 * rr, 4.0) + 1.0) * mix(0.5, 1.6, koonsCrease);
  float riseM = clamp(toEdge / creaseWidth, 0.0, 1.0);
  float hM = sqrt(max(1.0 - (1.0 - riseM) * (1.0 - riseM), 0.0));
  vec3 pinched = normalize(vec3(-min((1.0 - riseM) / max(hM, 0.05), 20.0) * edgeGradient, 1.0));
  float atWall = toWall < toFace ? 1.0 - riseM : 0.0;
  vec3 n = normalize(mix(round3, pinched, atWall * atWall * (3.0 - 2.0 * atWall)));
  float facingM = clamp(n.z, 0.0, 1.0);
  vec3 dir = normalize(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
  // Each lobe sits at its own angle to the room, as the dog's legs, body,
  // tail and ears do: turned, tipped and rolled, so each catches its own
  // part of the light.
  float yaw = (hash(vec3(seedRaw * 17.3, 8.1, 5.3)) - 0.5) * 2.4 * koonsTurn;
  float tip = (hash(vec3(seedRaw * 87.1, 3.3, 4.4)) - 0.5) * 0.7 * koonsTurn;
  float roll = (hash(vec3(seedRaw * 79.3, 4.1, 2.3)) - 0.5) * 1.3 * koonsTurn;
  mat3 turnY = mat3(cos(yaw), 0.0, -sin(yaw), 0.0, 1.0, 0.0, sin(yaw), 0.0, cos(yaw));
  mat3 turnX = mat3(1.0, 0.0, 0.0, 0.0, cos(tip), sin(tip), 0.0, -sin(tip), cos(tip));
  mat3 turnZ = mat3(cos(roll), sin(roll), 0.0, -sin(roll), cos(roll), 0.0, 0.0, 0.0, 1.0);
  mat3 turn = turnY * turnX * turnZ;
  vec3 coat = pow(coatingMix > 0.5 ? balloonCoat(fract(seedRaw * 7.31)) : coating, vec3(koonsDensity));
  // The reflected ray, traced against the neighbouring lobes as spheres
  // (centres on one plane, the surface point raised by the lobe's own
  // curvature). A hit shows that lobe — its coat, its own reflection of the
  // room — darkened deep in the cleft, where light barely reaches.
  vec3 from = vec3(p, n.z * rr);
  float nearest = 1e9;
  vec4 hit = vec4(0.0);
  for (int t = 0; t < ${NEIGHBOUR_TEXELS}; t += 1) {
    vec4 ids = texelFetch(neighbours, ivec2((self % ${ROW}) * ${NEIGHBOUR_TEXELS} + t, self / ${ROW}), 0);
    for (int k = 0; k < 4; k += 1) {
      float id = ids[k];
      if (id <= 0.0) continue;
      vec4 c = bubbleAt(id);
      vec3 oc = from - vec3(c.xy, 0.0);
      float b = dot(oc, dir);
      float cc = dot(oc, oc) - c.z * c.z;
      float disc = b * b - cc;
      if (cc <= 0.0 || disc <= 0.0) continue;
      float along = -b - sqrt(disc);
      if (along > 0.5 && along < nearest) {
        nearest = along;
        hit = c;
      }
    }
  }
  vec3 light;
  if (nearest < 1e8) {
    vec3 at = from + dir * nearest;
    vec3 n2 = normalize(at - vec3(hit.xy, 0.0));
    vec3 dir2 = reflect(dir, n2);
    vec3 coat2 = pow(coatingMix > 0.5 ? balloonCoat(fract(hit.w * 7.31)) : coating, vec3(koonsDensity));
    float clear2 = 0.04 + koonsClear * pow(1.0 - abs(dot(dir, n2)), 5.0);
    // Seen through its own coat as well as this lobe's; the second tint is
    // softened (a hue that drifts red reads as a different colour, not as depth).
    vec3 mirrored = koonsLight(turn * dir2) * (clear2 + (1.0 - clear2) * sqrt(coat2)) * mix(0.55, 1.0, smoothstep(0.0, 0.35 * rr, nearest));
    light = mix(koonsLight(turn * dir), mirrored, koonsNeighbour);
  } else {
    light = koonsLight(turn * dir);
  }
  // The clear coat adds an untinted reflection only towards grazing angles,
  // and weakly: in the photographs the silhouette stays deep in the coat's
  // colour to a crisp edge, not haloed in grey. Under it, the steel reflects
  // tinted by the coat.
  float clear = 0.04 + koonsClear * pow(1.0 - facingM, 5.0);
  vec3 steel = light * (clear + (1.0 - clear) * coat);
  // Deep in a cleft little light arrives at all.
  steel *= mix(mix(0.5, 0.05, koonsCrease), 1.0, smoothstep(0.0, 2.5 * creaseWidth, toWall));
  vec3 shown = filmic(steel * 1.25 * exposure);
  // A crisp silhouette: anti-aliased over one device pixel.
  float solidCover = clamp(toFace / cssPerPixel + 0.5, 0.0, 1.0);
  pixel = vec4(mix(background, shown, solidCover), 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const;
  for (const [type, source] of shaders) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`bubble/2 shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`bubble/2 program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

/** Koons's light maps, by 반사되는 환경 (창, 흐린 하늘, 스튜디오, 밤 도시, 나뭇잎 빛, 물빛). CC0 HDRIs from Poly Haven. */
const KOONS_LIGHT_FILES = ["photo_studio_loft_hall", "kloofendal_overcast", "studio_small_09", "shanghai_bund", "forest_slope", "lakeside"] as const;

export type Colour = readonly [number, number, number];

/** The renderer's visual parameters; every one is a uniform of the same name. */
export type Look = {
  /** 반사되는 환경: 0 창, 1 흐린 하늘, 2 스튜디오, 3 밤 도시, 4 나뭇잎 빛, 5 물빛. */
  envMode: number;
  lightColour: Colour;
  background: Colour;
  exposure: number;
  /** Brightness of the reflected light. */
  koonsLights: number;
  /** Light everywhere, lifting the dark parts. */
  koonsRoom: number;
  /** The pale bounce from below. */
  koonsFloor: number;
  /** The clear coat's untinted reflection at grazing angles. */
  koonsClear: number;
  /** How much each lobe mirrors its neighbours. */
  koonsNeighbour: number;
  /** How differently the lobes are turned to the room. */
  koonsTurn: number;
  /** Depth and darkness of the clefts between lobes. */
  koonsCrease: number;
  /** How blurred the reflected light is (mip level of the light map). */
  koonsBlur: number;
  /** The light map turned round the raft (0–1). */
  koonsRotate: number;
  /** The light's contrast. */
  koonsContrast: number;
  /** The coat's density. */
  koonsDensity: number;
  /** The coat's colour: the tint of the steel's reflection. */
  coating: Colour;
  /** 1: each bubble takes one of the five Balloon Dog coats. */
  coatingMix: number;
};

export const LOOK_DEFAULTS: Look = {
  envMode: 0,
  lightColour: [1, 1, 1],
  background: [0, 0, 0],
  exposure: 1,
  koonsLights: 1,
  koonsRoom: 1,
  koonsFloor: 1,
  koonsClear: 0.25,
  koonsNeighbour: 0.85,
  koonsTurn: 1,
  koonsCrease: 0.5,
  koonsBlur: 2,
  koonsRotate: 0,
  koonsContrast: 1,
  koonsDensity: 1,
  coating: [0.92, 0.1, 0.48],
  coatingMix: 0,
};

export type FoamRenderer = {
  /** Per bubble: x y radius seed (CSS px; seed in [0, 1)). */
  readonly bubbles: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  render(bubbleCount: number, look?: Look): void;
  /** Waits for the GPU to finish the last frame (measurement only). */
  sync(): void;
  dispose(): void;
};

export function createFoamRenderer(canvas: HTMLCanvasElement): FoamRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  const splatProgram = compile(gl, SPLAT_VERTEX, SPLAT_FRAGMENT);
  const steelProgram = compile(gl, SCREEN_VERTEX, STEEL_FRAGMENT);
  // Uniform locations, looked up once per program and name rather than every frame.
  const locations = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  const location = (program: WebGLProgram, name: string) => {
    let known = locations.get(program);
    if (!known) locations.set(program, (known = new Map()));
    let found = known.get(name);
    if (found === undefined) known.set(name, (found = gl.getUniformLocation(program, name)));
    return found;
  };

  const square = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const bubbles = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  const bubbleBuffer = gl.createBuffer();
  const bubbleMesh = gl.createVertexArray();
  gl.bindVertexArray(bubbleMesh);
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bubbleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bubbles.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, BUBBLE_FLOATS * 4, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.bindVertexArray(null);

  const dataTexture = (width: number, height: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  };
  const bubbleData = dataTexture(ROW, MAX_BUBBLES / ROW);
  const neighbourData = dataTexture(ROW * NEIGHBOUR_TEXELS, MAX_BUBBLES / ROW);
  const neighbourIds = new Float32Array(MAX_BUBBLES * NEIGHBOURS);
  const neighbourDepths = new Float32Array(MAX_BUBBLES * NEIGHBOURS);
  // Bubbles sorted by their left edge, reused between frames.
  const order = new Int32Array(MAX_BUBBLES);
  const lefts = new Float32Array(MAX_BUBBLES);

  // Koons's light maps: one per 반사되는 환경, fetched when first wanted.
  // 256 × 128 RGBA half floats (see docs/screen/bubble/2.md).
  const koonsMap = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, koonsMap);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array([0.7, 0.7, 0.7, 1]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  let koonsWanted = -1;
  let disposed = false;
  const wantKoonsMap = (mode: number) => {
    const file = KOONS_LIGHT_FILES[Math.min(Math.max(Math.round(mode), 0), KOONS_LIGHT_FILES.length - 1)]!;
    if (mode === koonsWanted) return;
    koonsWanted = mode;
    void fetch(`/assets/goldfishes/koons-light/${file}.bin`)
      .then((response) => response.arrayBuffer())
      .then((data) => {
        if (disposed || koonsWanted !== mode) return;
        gl.bindTexture(gl.TEXTURE_2D, koonsMap);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 256, 128, 0, gl.RGBA, gl.HALF_FLOAT, new Uint16Array(data));
        gl.generateMipmap(gl.TEXTURE_2D);
      })
      .catch(() => {});
  };

  type Layer = { texture: WebGLTexture; target: WebGLFramebuffer };
  const depth = gl.createRenderbuffer();
  const layers = [
    { texture: gl.createTexture(), target: gl.createFramebuffer() },
    { texture: gl.createTexture(), target: gl.createFramebuffer() },
  ] as const satisfies readonly Layer[];
  let frame = { width: 1, height: 1 };
  let pixels = { width: 1, height: 1 };
  let sim = { width: 1, height: 1 };

  const resize: FoamRenderer["resize"] = (width, height, ratio) => {
    frame = { width: Math.max(1, width), height: Math.max(1, height) };
    pixels = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    sim = { width: Math.max(1, Math.round(width * SCALE)), height: Math.max(1, Math.round(height * SCALE)) };
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, sim.width, sim.height);
    for (const layer of layers) {
      gl.bindTexture(gl.TEXTURE_2D, layer.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, sim.width, sim.height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.target);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layer.texture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const render: FoamRenderer["render"] = (bubbleCount, look = LOOK_DEFAULTS) => {
    const count = Math.min(bubbleCount, MAX_BUBBLES);
    gl.bindBuffer(gl.ARRAY_BUFFER, bubbleBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, bubbles, 0, count * BUBBLE_FLOATS);
    // Per bubble, the bubbles it overlaps (sweep and prune along x), most
    // deeply pressed first.
    const rows = Math.max(1, Math.ceil(count / ROW));
    neighbourIds.fill(0, 0, rows * ROW * NEIGHBOURS);
    neighbourDepths.fill(0, 0, count * NEIGHBOURS);
    // Kept in place: a bubble's slots hold its deepest overlaps so far.
    const keep = (index: number, other: number, depth: number) => {
      const base = index * NEIGHBOURS;
      let slot = -1;
      let shallowest = Infinity;
      for (let at = 0; at < NEIGHBOURS; at += 1) {
        if (neighbourIds[base + at] === 0) {
          slot = at;
          break;
        }
        if (neighbourDepths[base + at]! < shallowest) {
          shallowest = neighbourDepths[base + at]!;
          slot = at;
        }
      }
      if (neighbourIds[base + slot] !== 0 && depth <= shallowest) return;
      neighbourIds[base + slot] = other + 1;
      neighbourDepths[base + slot] = depth;
    };
    for (let index = 0; index < count; index += 1) {
      order[index] = index;
      lefts[index] = bubbles[index * 4]! - bubbles[index * 4 + 2]!;
    }
    const sorted = order.subarray(0, count).sort((a, b) => lefts[a]! - lefts[b]!);
    for (let at = 0; at < count; at += 1) {
      const a = sorted[at]!;
      const ax = bubbles[a * 4]!;
      const ay = bubbles[a * 4 + 1]!;
      const ar = bubbles[a * 4 + 2]!;
      for (let next = at + 1; next < count; next += 1) {
        const b = sorted[next]!;
        const br = bubbles[b * 4 + 2]!;
        if (bubbles[b * 4]! - br > ax + ar) break;
        const dx = bubbles[b * 4]! - ax;
        const dy = bubbles[b * 4 + 1]! - ay;
        const reach = ar + br;
        if (Math.abs(dy) >= reach || dx * dx + dy * dy >= reach * reach) continue;
        const depth = reach - Math.hypot(dx, dy);
        keep(a, b, depth);
        keep(b, a, depth);
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, bubbleData);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW, rows, gl.RGBA, gl.FLOAT, bubbles, 0);
    gl.bindTexture(gl.TEXTURE_2D, neighbourData);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW * NEIGHBOUR_TEXELS, rows, gl.RGBA, gl.FLOAT, neighbourIds, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(splatProgram);
    gl.uniform2f(location(splatProgram, "frame"), frame.width, frame.height);
    gl.uniform1i(location(splatProgram, "first"), 0);
    for (let peel = 0; peel < 2; peel += 1) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, layers[peel]!.target);
      gl.viewport(0, 0, sim.width, sim.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (count === 0) continue;
      gl.uniform1i(location(splatProgram, "second"), peel);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, peel === 1 ? layers[0].texture : null);
      gl.bindVertexArray(bubbleMesh);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.disable(gl.DEPTH_TEST);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    gl.useProgram(steelProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layers[0].texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, layers[1].texture);
    gl.uniform1i(location(steelProgram, "first"), 0);
    gl.uniform1i(location(steelProgram, "second"), 1);
    gl.uniform2f(location(steelProgram, "frame"), frame.width, frame.height);
    gl.uniform1f(location(steelProgram, "cssPerPixel"), frame.width / pixels.width);
    for (const [name, value] of Object.entries(look)) {
      if (typeof value === "number") gl.uniform1f(location(steelProgram, name), value);
      else gl.uniform3f(location(steelProgram, name), value[0], value[1], value[2]);
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, bubbleData);
    gl.uniform1i(location(steelProgram, "bubbleData"), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, neighbourData);
    gl.uniform1i(location(steelProgram, "neighbours"), 3);
    wantKoonsMap(look.envMode);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, koonsMap);
    gl.uniform1i(location(steelProgram, "koonsMap"), 4);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const pixel = new Uint8Array(4);
  const sync: FoamRenderer["sync"] = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  };

  const dispose = () => {
    disposed = true;
    gl.deleteTexture(koonsMap);
    gl.deleteTexture(bubbleData);
    gl.deleteTexture(neighbourData);
    for (const layer of layers) {
      gl.deleteTexture(layer.texture);
      gl.deleteFramebuffer(layer.target);
    }
    gl.deleteRenderbuffer(depth);
    for (const buffer of [square, bubbleBuffer]) gl.deleteBuffer(buffer);
    for (const vao of [screen, bubbleMesh]) gl.deleteVertexArray(vao);
    gl.deleteProgram(splatProgram);
    gl.deleteProgram(steelProgram);
  };

  return { bubbles, resize, render, sync, dispose };
}
