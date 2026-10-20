// Copied from bubble/2 (2026-10-10): bubble/1's renderer with its visual
// constants opened as uniforms (`Look`), plus media under the films. Every
// bubble can show one layer of a 2D array texture (Goldfishes' photos, tech
// renders, faces, keywords), cross-fading to a next one, in one of four
// mappings: flat across its disc, a cropped window of the image, wrapped on a
// sphere (compressed at the rim, slowly turning), or a thin band stretched into
// vertical streaks (the pillars' side faces). The picture is seen through the
// film — Fresnel takes it away at grazing angles, the film's light lies over it
// — and with mediaMode 0 the frame is bubble/2's exactly.
// Rank as a raft of soap bubbles. Every page is a bubble whose area is its
// displayed rank; the bubbles float together and press into one another.
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
// resolution, recomputes both exactly and renders each bubble as a soap
// film filling its whole cell: a shallow cap (its normal from the distance
// to the cell's edge), a film whose thickness drains from top to bottom and
// swirls slowly, coloured by thin-film interference at three wavelengths,
// reflecting a soft window with a Fresnel weight; walls and the free face
// are where the film is seen edge-on. Nothing persists between frames.

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
/** Floats per bubble of media state: layer, next layer, blend, phase. */
export const MEDIA_FLOATS = 4;
export const MAX_MEDIA_LAYERS = 320;
/**
 * Media tiles are square. Small sets get 512 px tiles (a hub bubble at DPR 2
 * is 500–600 device px across, and the sphere mapping magnifies the middle);
 * the mixed set, with over 200 layers, stays at 256 px to keep texture memory
 * under about 100 MB.
 */
export function mediaTileSize(layers: number) {
  return layers <= 100 ? 512 : 256;
}

const SPLAT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
out vec2 local;
flat out vec4 disc;
void main() {
  float extent = bubble.z + ${MARGIN}.0;
  local = (corner * 2.0 - 1.0) * extent;
  // Its index (from 1) travels with it, so the film can look up its data.
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

const FILM_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
precision mediump sampler2DArray;
in vec2 uv;
uniform highp sampler2D first;
uniform highp sampler2D second;
uniform vec2 frame;                   // CSS px
uniform float time;
uniform float cssPerPixel;            // one device pixel, in CSS px
uniform float filmThickness;          // thickest film, nm (bubble/1: 900)
uniform float colourAmount;           // share of interference colour kept (bubble/1: .3)
uniform float flowSpeed;              // pace of the film's currents (bubble/1: 1)
uniform float swirl;                  // strength of the folding currents (bubble/1: 1)
uniform float domeDepth;              // cap depth as a share of the radius (bubble/1: .45)
uniform float fresnelGain;            // light at grazing angles (bubble/1: .9)
uniform float wallGain;               // light where a wall is seen edge-on (bubble/1: .45)
uniform float windowGain;             // the window's reflection (bubble/1: .85)
uniform float ambient;                // light everywhere on the film (bubble/1: .07)
uniform float exposure;               // overall (bubble/1: 1)
uniform float envMode;                // what the films reflect: 0 window (bubble/1), 1 overcast sky, 2 studio, 3 city at night, 4 dappled leaves, 5 water light, 6 an image
uniform vec3 lightColour;             // colour of the light the films reflect (bubble/1: white)
uniform vec3 filmTint;                // colour of the film itself (bubble/1: white)
uniform vec3 background;              // what lies behind the raft (bubble/1: black)
uniform float sphere;                 // 0: /1's shallow cap; 1: a full sphere that holds the whole surroundings
uniform float reflectionTint;         // 0: reflection laid over the film; 1: reflection coloured by the film's interference
uniform float envContrast;            // 0: soft surroundings; 1: crisp, high-range surroundings
uniform float backReflection;         // the far inside face mirroring the surroundings, inverted
uniform sampler2D envImage;           // an image to reflect (envMode 6), as a panorama
uniform highp sampler2D bubbleData;   // per bubble: x, y, radius, seed
uniform highp sampler2D neighbours;   // per bubble: indices (from 1) of the bubbles it overlaps
uniform highp sampler2D bubbleMedia;  // per bubble: layer, next layer, blend, phase
uniform mediump sampler2DArray media; // the images, one per layer
uniform float mediaMode;              // 0 none (bubble/2), 1 flat, 2 crop, 3 sphere, 4 streak
uniform float mediaSaturation;        // 0 grey … 1 as shot
uniform float mediaBrightness;
uniform float mediaZoom;              // 1: the whole image across the bubble; larger magnifies its middle
uniform float mediaDrift;             // how fast the image turns (sphere) or scrolls (streak)
uniform float filmOverMedia;          // how much the film at grazing angles hides what is behind it
uniform highp sampler2D bubbleReveal; // per bubble: 1 while a goldfish touches it, 0 when none does, moving between over the media fade
uniform float mediaReveal;            // 0: the picture is always there; 1: only as revealed by touch
uniform float mediaSolid;             // 1: the bubble is its picture — an opaque, lit ball (이모지) — rather than a film over it
uniform float textureDiversity;       // 0: every film from one recipe (bubble/3); 1: each bubble its own age, scale, currents and tilt
uniform float filmFlow;               // 0: the film's pattern stands still (bubble/3); 1: carried at a natural pace by drainage and convection
uniform float material;               // 0: soap film; 1: Koons's mirror-polished steel under a transparent colour coat (Balloon Dog)
uniform vec3 coating;                 // the coat's colour over the steel (its reflectance tint)
uniform float koonsLights;            // the brightness of the lights and windows the steel reflects
uniform float koonsRoom;              // the gallery's own brightness (창): walls, ceiling
uniform float koonsFloor;             // the pale floor and plinth below the horizon (창)
uniform float koonsClear;             // the clear coat's untinted reflection at grazing angles
uniform float koonsNeighbour;         // how much each lobe mirrors its neighbours
uniform float koonsTurn;              // how differently the lobes are turned to the room
uniform float koonsCrease;            // how deep and dark the clefts between lobes are
uniform float koonsBlur;              // how blurred the light the steel reflects is (a mip level of the light map)
uniform float koonsRotate;            // turns the light map round the raft (0–1, a full turn)
uniform float koonsContrast;          // the light's contrast: above 1 its bright parts brighter and dark parts darker
uniform float koonsDensity;           // the coat's density: above 1 a deeper, more saturated colour
uniform sampler2D koonsMap;           // the light round the steel: a photographed room's light (CC0 HDRI), blurred past legibility
uniform float coatingMix;             // 1: each bubble takes one of the five Balloon Dog coats instead of \`coating\`
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
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// Two octaves: enough for the slow currents that fold the film.
float fbm2(vec3 x) {
  return 0.5 * noise(x) + 0.25 * noise(x * 2.03 + vec3(1.7, 9.2, 3.1));
}
float fbm(vec3 x) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i += 1) {
    sum += amplitude * noise(x);
    x = x * 2.03 + vec3(1.7, 9.2, 3.1);
    amplitude *= 0.5;
  }
  return sum;
}

// The film's currents, in the bubble's own unit disc (y down), as the curl of
// a stream function, so the film is carried round without gathering or
// thinning anywhere, and nothing crosses the rim. Three parts: drainage —
// thick film sinking through the middle, thin film rising along the walls
// (two rolls); a slow circulation of the whole film, its sense and strength
// the bubble's own; and eddies that change slowly. Radii per second.
float streamAt(vec2 q, float seed, float spin, float t) {
  float envelope = max(1.0 - dot(q, q), 0.0);
  envelope *= envelope;
  return envelope * (-0.22 * q.x + (spin - 0.5) * 0.28 + 0.18 * (noise(vec3(q * 1.6 + seed, t * 0.05)) - 0.5));
}
vec2 filmVelocity(vec2 q, float seed, float spin, float t) {
  float e = 0.03;
  float here = streamAt(q, seed, spin, t);
  return vec2(streamAt(q + vec2(0.0, e), seed, spin, t) - here, here - streamAt(q + vec2(e, 0.0), seed, spin, t)) / e;
}

// The film's pattern at a point: the drainage offset its folds give, and the
// swirl that sets its thickness.
vec2 filmPattern(vec2 qn, float seed, float swirlAmount, float flowTime) {
  vec3 at = vec3(qn * 1.3 + seed, flowTime * 0.06 + seed);
  vec2 warp = (vec2(fbm2(at), fbm2(at + vec3(5.2, 1.3, 2.7))) - 0.375) * (0.9375 / 0.75);
  vec3 folded = vec3(qn * 1.7 + warp * 3.2 * swirlAmount + seed, flowTime * 0.045 + seed);
  vec2 warp2 = (vec2(fbm2(folded), fbm2(folded + vec3(3.1, 7.7, 1.9))) - 0.375) * (0.9375 / 0.75);
  return vec2(warp.y + warp2.x, fbm(vec3(qn * 2.0 + warp2 * 2.6 * swirlAmount + seed, flowTime * 0.04)));
}

// The light on Koons's steel: a real room's light, not drawn shapes. Drawn
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

// What the films reflect, by direction (screen y runs down, so up is −y).
// envContrast narrows every soft edge and widens the range of light, so the
// surroundings read as crisp, bright shapes on dark rather than haze.
vec3 surroundings(vec3 r) {
  float up = -r.y;
  float azimuth = atan(r.x, r.z);
  float soft = mix(1.0, 0.12, envContrast);
  vec3 light;
  if (envMode < 1.5) {
    // Overcast sky: bright above, a pale horizon, soft cloud.
    float cloud = fbm(vec3(azimuth * 1.6, up * 3.0, time * 0.01));
    float sky = smoothstep(-0.1 - 0.15 * soft, -0.1 + 1.0 * soft, up);
    light = vec3(0.12) * (1.0 - envContrast) + vec3(0.9) * sky * (0.75 + 0.5 * cloud);
  } else if (envMode < 2.5) {
    // Studio: two large soft boxes left and right, a dark floor.
    float left = 1.0 - smoothstep(0.3 - 0.1 * soft, 0.3 + 0.05 * soft, max(abs(azimuth + 0.9) * 1.0, abs(up - 0.35) * 1.4));
    float right = 1.0 - smoothstep(0.22 - 0.1 * soft, 0.22 + 0.05 * soft, max(abs(azimuth - 1.1) * 1.6, abs(up - 0.2)));
    light = vec3(0.02) * (1.0 - envContrast) + vec3(2.2) * left + vec3(1.1) * right;
  } else if (envMode < 3.5) {
    // City at night: scattered lights, out of focus unless sharpened.
    vec2 cell = vec2(azimuth * 9.0, up * 9.0);
    vec2 id = floor(cell);
    vec2 at = fract(cell) - 0.5 - (vec2(hash(vec3(id, 1.0)), hash(vec3(id, 2.0))) - 0.5) * 0.6;
    float size = mix(0.22, 0.08, envContrast);
    float lamp = step(0.62, hash(vec3(id, 3.0))) * (1.0 - smoothstep(size * (1.0 - 0.8 * soft), size, length(at)));
    vec3 hue = mix(vec3(1.0, 0.78, 0.5), vec3(0.75, 0.85, 1.0), hash(vec3(id, 4.0)));
    light = vec3(0.01) + hue * lamp * 2.2 * smoothstep(-0.6, 0.2, up);
  } else if (envMode < 4.5) {
    // Dappled light through leaves.
    float leaves = fbm(vec3(azimuth * 2.5, up * 4.0, time * 0.03));
    light = vec3(1.4) * smoothstep(0.52 - 0.1 * soft, 0.52 + 0.1 * soft, leaves) * smoothstep(-0.3, 0.5, up) + vec3(0.04) * (1.0 - envContrast);
  } else if (envMode < 5.5) {
    // Water light: a slowly shifting web of caustics.
    float a = noise(vec3(azimuth * 4.0, up * 6.0, time * 0.08));
    float b = noise(vec3(azimuth * 7.0 + 3.1, up * 11.0, time * 0.06));
    float web = pow(max(1.0 - abs(a - b) * 2.0, 0.0), mix(6.0, 18.0, envContrast));
    light = vec3(0.03) * (1.0 - envContrast) + vec3(1.6) * web;
  } else {
    // An image, wrapped round as a panorama. The derivatives are taken across
    // the seam without its jump, and scaled down to sample it sharper.
    vec2 uvImage = vec2(azimuth / 6.2831853 + 0.5, clamp(0.5 - up * 0.5, 0.0, 1.0));
    vec2 dx = dFdx(uvImage);
    vec2 dy = dFdy(uvImage);
    dx.x -= round(dx.x);
    dy.x -= round(dy.x);
    light = textureGrad(envImage, uvImage, dx * soft, dy * soft).rgb * 1.4;
  }
  // A wider range: highlights climb, shadows sink.
  return pow(light, vec3(1.0 + 1.2 * envContrast)) * (1.0 + 4.0 * envContrast);
}

// Reflectance of a soap film (n = 1.33) of thickness t (nm) at internal
// cosine c, per wavelength: two-beam interference with the half-wave shift
// at the front face, 2 sin²(2π n t c / λ).
// A bright picture rolls off into white instead of clipping flat, so turning
// 밝기 up does not flatten highlights into blocks.
vec3 softClip(vec3 x) {
  vec3 over = max(x - 0.75, 0.0);
  return min(x, vec3(0.75)) + 0.25 * (1.0 - exp(-over / 0.25));
}

vec3 interference(float t, float c) {
  vec3 lambda = vec3(650.0, 532.0, 450.0);
  vec3 phase = 6.2831853 * 1.33 * t * c / lambda;
  vec3 s = sin(phase);
  return 2.0 * s * s;
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
  float coverage = a.z > 0.0 ? smoothstep(-0.7, 0.7, toFace) : 0.0;

  // Each bubble's own character, from its seed (결 다양성; at 0 every bubble
  // shares one recipe). Every variation is centred on that recipe, so the raft
  // as a whole keeps its look and only its bubbles differ. Age is the hidden
  // variable most of it hangs on, as in a real raft: an older bubble has
  // drained a little further — a thinner film, a thin cap reaching lower,
  // calmer currents — a younger one is thicker, faintly banded and livelier.
  // The rest is independent: how far its drainage leans, the size of its
  // eddies, the curvature and tilt that place its highlight.
  float seedRaw = bubbleAt(a.w).w;
  float D = textureDiversity;
  vec4 hA = vec4(hash(vec3(seedRaw * 91.7, 1.3, 7.1)), hash(vec3(seedRaw * 53.1, 4.7, 2.9)), hash(vec3(seedRaw * 17.3, 8.1, 5.3)), hash(vec3(seedRaw * 71.9, 2.2, 9.4)));
  vec4 hB = vec4(hash(vec3(seedRaw * 33.7, 6.6, 1.1)), hash(vec3(seedRaw * 87.1, 3.3, 4.4)), hash(vec3(seedRaw * 29.9, 9.9, 6.2)), hash(vec3(seedRaw * 61.3, 5.5, 8.8)));
  vec4 hC = vec4(hash(vec3(seedRaw * 45.1, 7.7, 3.3)), hash(vec3(seedRaw * 23.9, 1.9, 6.7)), hash(vec3(seedRaw * 79.3, 4.1, 2.3)), hash(vec3(seedRaw * 13.7, 8.3, 9.1)));
  float age = hA.x;
  float bubbleDome = domeDepth * mix(1.0, 0.7 + 0.6 * hB.x, D);

  if (material > 0.5) {
    // Koons's Balloon Dog: every bubble an inflated lobe of mirror-polished
    // steel under a transparent colour coat. No diffuse light at all: what a
    // lobe shows is what it reflects — the soft room, and above all its
    // neighbours, so no two lobes look alike.
    // A round body to the very edge, as an inflated lobe is: where it presses
    // against a neighbour the two meet in one narrow dark gap (the twists and
    // clefts between lobes), turned down only over the last few pixels so the
    // gap is smooth at any size.
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
    // tail and ears do: turned, tipped and rolled, so its horizon belt tilts
    // and the windows' streaks fall differently on each.
    float yaw = (hA.z - 0.5) * 2.4 * koonsTurn;
    float tip = (hB.y - 0.5) * 0.7 * koonsTurn;
    float roll = (hC.z - 0.5) * 1.3 * koonsTurn;
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
    // The clear coat reflects untinted, more so at grazing angles; under it,
    // the steel reflects tinted by the coat.
    // The clear coat adds an untinted reflection only towards grazing angles,
    // and weakly: in the photographs the silhouette stays deep in the coat's
    // colour to a crisp edge, not haloed in grey.
    float clear = 0.04 + koonsClear * pow(1.0 - facingM, 5.0);
    vec3 steel = light * (clear + (1.0 - clear) * coat);
    // Deep in a cleft little light arrives at all.
    steel *= mix(mix(0.5, 0.05, koonsCrease), 1.0, smoothstep(0.0, 2.5 * creaseWidth, toWall));
    vec3 shown = filmic(steel * 1.25 * exposure);
    // A crisp silhouette: anti-aliased over one device pixel.
    float solidCover = clamp(toFace / cssPerPixel + 0.5, 0.0, 1.0);
    pixel = vec4(mix(background, shown, solidCover), 1.0);
    return;
  }

  // A shallow cap over the cell: steep at the edge, nearly level inside.
  float r = a.z;
  float rise = clamp(toEdge / (bubbleDome * r + 2.0), 0.0, 1.0);
  float h = sqrt(max(1.0 - (1.0 - rise) * (1.0 - rise), 0.0));
  // The same slope the screen-space difference of h over one device pixel
  // gave, (dh/dx, dh/dy) · pixel · depth, now from h's exact gradient at this
  // pixel, so it no longer steps in 2 × 2 blocks. Where h leaves the edge
  // vertically, it is held to what one pixel's difference could reach.
  float depth = bubbleDome * r + 2.0;
  float e = cssPerPixel;
  vec2 slope = rise > 0.0 && rise < 1.0 ? e * (1.0 - rise) / max(h, 1e-3) * edgeGradient : vec2(0.0);
  float reach = depth * sqrt(min(1.0, 2.0 * e / depth));
  slope = slope / max(1.0, length(slope) / reach);
  vec3 normal = normalize(vec3(-slope, max(h, 0.05) + 0.6));
  if (sphere > 0.0) {
    // A sphere over the bubble's own disc, held to the cap within a few
    // pixels of a wall so neighbours still meet along their shared wall.
    vec2 out2 = da / max(r, 1e-3);
    vec3 round3 = vec3(out2, sqrt(max(1.0 - dot(out2, out2), 0.0)) + 0.02);
    float atWall = toWall < toFace ? exp(-toWall / 3.0) : 0.0;
    normal = normalize(mix(normal, normalize(round3), sphere * (1.0 - atWall)));
  }
  // A raft's bubbles are not level: each leans a little, so their highlights
  // do not all sit in one place. Held off near the edge, where walls meet.
  vec2 tilt = (hB.yz - 0.5) * 0.1 * D * smoothstep(0.0, 0.5, rise);
  normal = normalize(vec3(normal.xy + tilt * normal.z, normal.z));
  float facing = clamp(normal.z, 0.0, 1.0);

  // The film drains: towards black film at the top of each bubble, thicker
  // below, and the drainage is carried round in slow, folding currents, so
  // no two bubbles and no two moments share a pattern.
  vec2 q = da / r;
  float flowTime = time * flowSpeed * mix(1.0, 0.6 + 0.8 * hB.w, D);
  float seed = seedRaw * 37.0;
  // The film's own frame: its drainage leaning a little off the vertical, and
  // younger films drawn slightly into bands along it.
  float turn = (hA.z - 0.5) * 0.9 * D;
  vec2 qf = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * q;
  vec2 qs = vec2(qf.x, qf.y * (1.0 + 0.5 * D * (1.0 - age) * hC.x));
  // Eddies have a size of their own, so a large bubble holds somewhat more and
  // finer ones than a small one, instead of the same pattern scaled.
  float eddies = mix(1.0, clamp(pow(r / 60.0, 0.3), 0.75, 1.5) * (0.85 + 0.3 * hA.y), D);
  vec2 qn = qs * eddies;
  float swirlAmount = swirl * mix(1.0, 1.0 + 0.5 * (0.5 - age) + 0.3 * (hC.w - 0.5), D);
  // The pattern is carried by the film's currents (막 흐름): read upstream
  // along the local velocity. Two copies, half a cycle apart, take turns, each
  // faded out as it is reset, and their blend is restored to the pattern's own
  // contrast. Small bubbles' films move faster for their size; younger films
  // are livelier. Each bubble keeps its own cycle so the raft never pulses.
  vec2 pattern;
  float flowRate = filmFlow * clamp(sqrt(60.0 / r), 0.75, 2.0) * mix(1.0, 0.6 + 0.8 * (1.0 - age), D);
  if (flowRate > 0.0) {
    const float period = 2.5;
    vec2 velocity = filmVelocity(qs, seed, hC.z, time) * flowRate;
    float cycle = fract(time / period + hB.w);
    float other = fract(cycle + 0.5);
    float weight = 1.0 - abs(2.0 * cycle - 1.0);
    vec2 one = filmPattern((qs - velocity * (cycle - 0.5) * period) * eddies, seed, swirlAmount, flowTime);
    vec2 two = filmPattern((qs - velocity * (other - 0.5) * period) * eddies, seed, swirlAmount, flowTime);
    vec2 mean = vec2(0.0, 0.4375);
    pattern = mean + (mix(two, one, weight) - mean) / sqrt(weight * weight + (1.0 - weight) * (1.0 - weight));
  } else {
    pattern = filmPattern(qn, seed, swirlAmount, flowTime);
  }
  float swirl = clamp(pattern.y, 0.0, 1.0);
  // An older film has drained further: its thin cap reaches lower.
  float drainShift = (age - 0.5) * 0.5 * D;
  float drain = smoothstep(-0.95 + drainShift, 0.9 + 0.5 * drainShift, qs.y + 0.55 * pattern.x);
  float thickest = filmThickness * exp2(((0.5 - age) * 0.7 + (hC.y - 0.5) * 0.4) * D);
  float thickness = mix(20.0, thickest, drain * drain) * (0.4 + 1.2 * swirl);
  if (D > 0.0) {
    // Marginal regeneration: along its walls the film is exchanged in broken
    // patches, thinner here and thicker there (by direction round the centre,
    // so with no seam).
    vec2 round2 = q / max(length(q), 1e-3);
    float plume = noise(vec3(round2 * (3.0 + 5.0 * hC.z) + seed, toEdge / r * 6.0 + flowTime * 0.05 + time * filmFlow * 0.25));
    thickness *= 1.0 + D * 0.5 * (plume - 0.5) * exp(-toEdge / (0.08 * r + 2.0));
  }
  float inner = sqrt(max(1.0 - (1.0 - facing * facing) / (1.33 * 1.33), 0.0));
  vec3 film = interference(thickness, inner);
  // Real films are pale on dark ground: most of the colour is tempered,
  // and only thick, swirling film keeps a little of it.
  float grey = dot(film, vec3(0.3333));
  film = mix(vec3(grey), film, colourAmount * smoothstep(150.0, 500.0, thickness));

  // What lies behind the film: this bubble's image, mapped by mode.
  vec3 picture = vec3(0.0);
  // The bubble as a ball: the point of its front half under this pixel.
  vec2 qc = q / max(1.0, length(q));
  float z = sqrt(max(1.0 - dot(qc, qc), 0.0));
  // How much this bubble is its picture (mediaSolid), and that ball's colour.
  float solid = 0.0;
  vec3 ballColour = vec3(0.0);
  if (mediaMode > 0.5) {
    int mi = int(a.w) - 1;
    vec4 m = texelFetch(bubbleMedia, ivec2(mi % ${ROW}, mi / ${ROW}), 0);
    float phase = m.w;
    float rock = sin(time * 0.3 * (0.6 + 0.8 * phase) + phase * 6.2831853);
    vec2 uvm;
    if (mediaSolid > 0.5) {
      // The bubble is the emoji: the face's circle is the bubble's disc, edge
      // to edge. It only tilts in the picture plane, so the rim never leaves the
      // face's outline (turning it in depth slid the face off one side).
      float angle = mediaDrift * 0.2 * rock;
      vec2 turned = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * qc;
      uvm = turned * (0.5 / mediaZoom) + 0.5;
    } else if (mediaMode < 1.5) {
      // Flat: the image across the bubble's disc.
      uvm = q * (0.5 / mediaZoom) + 0.5;
    } else if (mediaMode < 2.5) {
      // Crop: a window into the image, placed by the bubble's own phase, so
      // neighbours that share an image show different pieces of it.
      float window = 0.3 / mediaZoom;
      vec2 offset = (vec2(hash(vec3(phase * 7.0, 1.0, 2.0)), hash(vec3(phase * 7.0, 3.0, 4.0))) - 0.5) * (1.0 - 2.0 * window);
      uvm = 0.5 + offset + q * window;
    } else if (mediaMode < 3.5) {
      // Sphere: the image wrapped round a ball, its visible half across the
      // bubble, compressed towards the rim, rocking slowly about its axis (never
      // past its own edge, so nothing mirrors or seams).
      float lon = atan(qc.x, z) + mediaDrift * 0.35 * rock;
      float lat = asin(clamp(qc.y, -1.0, 1.0));
      uvm = vec2(lon / 3.1415927, lat / 3.1415927) / mediaZoom + 0.5;
    } else {
      // Streak: a thin horizontal band of the image stretched over the whole
      // bubble, so it reads as vertical streaks (the pillars' sides); the band
      // sweeps down the image and back up, never jumping.
      float band = abs(fract(phase + time * mediaDrift * 0.02) * 2.0 - 1.0);
      uvm = vec2(q.x * (0.5 / mediaZoom) + 0.5, band + q.y * 0.03);
    }
    // Derivatives jump at walls, where neighbouring pixels belong to other
    // bubbles; held to a sensible size so the mip level stays sharp there.
    vec2 dxm = dFdx(uvm);
    vec2 dym = dFdy(uvm);
    float gradient = max(length(dxm), length(dym));
    if (gradient > 0.02) {
      dxm *= 0.02 / gradient;
      dym *= 0.02 / gradient;
    }
    vec3 current = textureGrad(media, vec3(uvm, m.x), dxm, dym).rgb;
    vec3 next = m.z > 0.0 ? textureGrad(media, vec3(uvm, m.y), dxm, dym).rgb : current;
    picture = mix(current, next, m.z);
    float luminance = dot(picture, vec3(0.299, 0.587, 0.114));
    picture = softClip(mix(vec3(luminance), picture, mediaSaturation) * mediaBrightness);
    float shown = 1.0;
    if (mediaReveal > 0.0) {
      // Shown only on bubbles a goldfish is touching.
      float revealed = texelFetch(bubbleReveal, ivec2(mi % ${ROW}, mi / ${ROW}), 0).x;
      shown = mix(1.0, revealed, mediaReveal);
    }
    if (mediaSolid > 0.5) {
      // Not behind the film: the bubble itself turns into the emoji (and back to film when hidden).
      solid = shown;
      ballColour = picture;
      picture = vec3(0.0);
    } else {
      picture *= shown;
    }
  }

  // Fresnel weight and a soft window, mirrored faintly by the back face.
  vec3 view = vec3(0.0, 0.0, 1.0);
  float fresnel = 0.05 + 0.95 * pow(1.0 - facing, 5.0);
  vec3 window = normalize(vec3(-0.45, 0.6, 0.66));
  float front = pow(max(dot(normal, normalize(window + view)), 0.0), 90.0);
  vec3 mirrored = normalize(vec3(0.45, -0.6, 0.66));
  float back = pow(max(dot(normal, normalize(mirrored + view)), 0.0), 60.0) * 0.25;
  // Seen edge-on, at a wall or the free face, the film catches more light.
  float edgeOn = exp(-toEdge / 1.4);

  vec3 body = film * filmTint * lightColour * (ambient + fresnelGain * fresnel + wallGain * edgeOn);
  vec3 colour;
  if (envMode < 0.5) {
    // bubble/1: one soft window and its faint mirror.
    colour = body + lightColour * (front * windowGain + back);
  } else {
    // Any other surroundings, reflected by the film's own curvature.
    vec3 reflected = normalize(2.0 * normal.z * normal - view);
    float weight = 0.06 + 0.94 * pow(1.0 - facing, 3.0);
    vec3 tint = mix(vec3(1.0), film * filmTint, reflectionTint);
    vec3 seen = surroundings(reflected) * weight;
    if (backReflection > 0.0) {
      // The far face, seen through the near one, mirrors the scene upside down and faintly.
      seen += surroundings(normalize(vec3(-reflected.xy, reflected.z))) * (0.04 + 0.3 * pow(1.0 - facing, 2.0)) * backReflection;
    }
    colour = body + seen * tint * lightColour * windowGain * 1.6;
    // Highlights roll off instead of clipping when the range is widened.
    colour = mix(colour, 1.0 - exp(-colour * 1.3), envContrast);
  }
  // The picture is seen through the film: the film's reflections lie over it
  // and take it away where the film is seen at a grazing angle.
  colour += picture * (1.0 - fresnel * filmOverMedia);
  // The films are clear: what lies behind shows through them.
  pixel = vec4(background * (1.0 - 0.12 * coverage) + colour * coverage * exposure, 1.0);
  if (solid > 0.0) {
    // An opaque ball, shown as drawn: no highlight, rim light or reflection
    // (those belong to the film; user, 2026-10-12), only a crease where it is
    // pressed against its neighbours.
    vec3 lit = ballColour * (0.55 + 0.45 * smoothstep(0.0, 3.0, toEdge));
    vec3 asBall = background * (1.0 - coverage) + lit * coverage * exposure;
    pixel.rgb = mix(pixel.rgb, asBall, solid);
  }
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
      throw new Error(`bubble/3 shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`bubble/3 program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

/** Koons's light maps, by 반사되는 환경 (창, 흐린 하늘, 스튜디오, 밤 도시, 나뭇잎 빛, 물빛; an image uses 창's). CC0 HDRIs from Poly Haven. */
const KOONS_LIGHT_FILES = ["photo_studio_loft_hall", "kloofendal_overcast", "studio_small_09", "shanghai_bund", "forest_slope", "lakeside", "photo_studio_loft_hall"] as const;

export type Colour = readonly [number, number, number];

/** The renderer's main visual parameters; LOOK_DEFAULTS reproduce bubble/1. */
export type Look = {
  /** 0 window (bubble/1), 1 overcast sky, 2 studio, 3 city at night, 4 dappled leaves, 5 water light, 6 an uploaded image. */
  envMode: number;
  lightColour: Colour;
  filmTint: Colour;
  background: Colour;
  sphere: number;
  reflectionTint: number;
  envContrast: number;
  backReflection: number;
  filmThickness: number;
  colourAmount: number;
  flowSpeed: number;
  swirl: number;
  domeDepth: number;
  fresnelGain: number;
  wallGain: number;
  windowGain: number;
  ambient: number;
  exposure: number;
  /** 0: one film recipe for every bubble (bubble/3); 1: each bubble its own age, eddy size, currents and tilt. */
  textureDiversity: number;
  /** 0: the film's pattern stands still (bubble/3); 1: carried at a natural pace by drainage and convection. */
  filmFlow: number;
  /** 0: soap film; 1: Koons's mirror-polished steel under a transparent colour coat. */
  material: number;
  /** Koons: brightness of the reflected lights and windows. */
  koonsLights: number;
  /** Koons (창): the gallery's own brightness. */
  koonsRoom: number;
  /** Koons (창): the floor and plinth below the horizon. */
  koonsFloor: number;
  /** Koons: the clear coat's untinted reflection at grazing angles. */
  koonsClear: number;
  /** Koons: how much each lobe mirrors its neighbours. */
  koonsNeighbour: number;
  /** Koons: how differently the lobes are turned to the room. */
  koonsTurn: number;
  /** Koons: depth and darkness of the clefts between lobes. */
  koonsCrease: number;
  /** Koons: how blurred the reflected light is (mip level of the light map). */
  koonsBlur: number;
  /** Koons: the light map turned round the raft (0–1). */
  koonsRotate: number;
  /** Koons: the light's contrast. */
  koonsContrast: number;
  /** Koons: the coat's density. */
  koonsDensity: number;
  /** The coat's colour: the tint of the steel's reflection. */
  coating: Colour;
  /** 1: each bubble takes one of the five Balloon Dog coats. */
  coatingMix: number;
  /** 0 none (bubble/2), 1 flat, 2 crop, 3 sphere, 4 streak. */
  mediaMode: number;
  mediaSaturation: number;
  mediaBrightness: number;
  mediaZoom: number;
  mediaDrift: number;
  filmOverMedia: number;
  /** 0: pictures always shown; 1: only where goldfish have touched (bubble/2: irrelevant, no media). */
  mediaReveal: number;
  /** 1: each bubble is an opaque ball of its picture (이모지) rather than a film over it. */
  mediaSolid: number;
};

export const LOOK_DEFAULTS: Look = {
  envMode: 0,
  lightColour: [1, 1, 1],
  filmTint: [1, 1, 1],
  background: [0, 0, 0],
  sphere: 0,
  reflectionTint: 0,
  envContrast: 0,
  backReflection: 0,
  filmThickness: 900,
  colourAmount: 0.3,
  flowSpeed: 1,
  swirl: 1,
  domeDepth: 0.45,
  fresnelGain: 0.9,
  wallGain: 0.45,
  windowGain: 0.85,
  ambient: 0.07,
  exposure: 1,
  textureDiversity: 0,
  filmFlow: 0,
  material: 0,
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
  mediaMode: 0,
  mediaSaturation: 0.8,
  mediaBrightness: 1,
  mediaZoom: 1,
  mediaDrift: 1,
  filmOverMedia: 0.6,
  mediaReveal: 0,
  mediaSolid: 0,
};

export type FoamRenderer = {
  /** Per bubble: x y radius seed (CSS px; seed in [0, 1)). */
  readonly bubbles: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  render(bubbleCount: number, time: number, look?: Look): void;
  /** Per bubble: layer, next layer, blend, phase (parallel to `bubbles`). */
  readonly media: Float32Array;
  /** Per bubble: how far a goldfish's touch shows its picture, 0–1 (parallel to `bubbles`). */
  readonly reveal: Float32Array;
  /** An image the films reflect when envMode is 6. */
  setEnvironmentImage(image: TexImageSource): void;
  /** Makes room for this many media layers (black until set), at mediaTileSize(count). */
  setMediaLayerCount(count: number): void;
  /** Puts a square image of the current tile size into one layer. */
  setMediaLayer(index: number, image: TexImageSource): void;
  /** Rebuilds the media mipmaps; call after a batch of layers. */
  commitMedia(): void;
  /** Waits for the GPU to finish the last frame (measurement only). */
  sync(): void;
  dispose(): void;
};

export function createFoamRenderer(canvas: HTMLCanvasElement): FoamRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  const splatProgram = compile(gl, SPLAT_VERTEX, SPLAT_FRAGMENT);
  const filmProgram = compile(gl, SCREEN_VERTEX, FILM_FRAGMENT);
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
  const mediaData = dataTexture(ROW, MAX_BUBBLES / ROW);
  const media = new Float32Array(MAX_BUBBLES * MEDIA_FLOATS);
  const reveal = new Float32Array(MAX_BUBBLES);
  const revealData = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, revealData);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, ROW, MAX_BUBBLES / ROW, 0, gl.RED, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  // The images, one per layer; mirrored across their sides so a turning
  // sphere shows no seam, clamped top and bottom.
  const mediaArray = gl.createTexture();
  const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic");
  let mediaLayers = 0;
  let mediaTile = 256;
  const allocateMedia = (count: number) => {
    mediaLayers = Math.max(1, Math.min(MAX_MEDIA_LAYERS, count));
    mediaTile = mediaTileSize(count);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, mediaArray);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, mediaTile, mediaTile, mediaLayers, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (anisotropy) gl.texParameterf(gl.TEXTURE_2D_ARRAY, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  };
  allocateMedia(1);
  // The image the films reflect in envMode 6 (a grey placeholder until one is given).
  const environment = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, environment);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([90, 90, 90, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  const neighbourIds = new Float32Array(MAX_BUBBLES * NEIGHBOURS);
  const neighbourDepths = new Float32Array(MAX_BUBBLES * NEIGHBOURS);
  // Bubbles sorted by their left edge, reused between frames.
  const order = new Int32Array(MAX_BUBBLES);
  const lefts = new Float32Array(MAX_BUBBLES);

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

  const render: FoamRenderer["render"] = (bubbleCount, time, look = LOOK_DEFAULTS) => {
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
    if (look.mediaMode > 0) {
      gl.bindTexture(gl.TEXTURE_2D, mediaData);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW, rows, gl.RGBA, gl.FLOAT, media, 0);
      if (look.mediaReveal > 0) {
        gl.bindTexture(gl.TEXTURE_2D, revealData);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW, rows, gl.RED, gl.FLOAT, reveal, 0);
      }
    }
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
    gl.useProgram(filmProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layers[0].texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, layers[1].texture);
    gl.uniform1i(location(filmProgram, "first"), 0);
    gl.uniform1i(location(filmProgram, "second"), 1);
    gl.uniform2f(location(filmProgram, "frame"), frame.width, frame.height);
    gl.uniform1f(location(filmProgram, "time"), time);
    gl.uniform1f(location(filmProgram, "cssPerPixel"), frame.width / pixels.width);
    for (const [name, value] of Object.entries(look)) {
      if (typeof value === "number") gl.uniform1f(location(filmProgram, name), value);
      else gl.uniform3f(location(filmProgram, name), value[0], value[1], value[2]);
    }
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, environment);
    gl.uniform1i(location(filmProgram, "envImage"), 4);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, bubbleData);
    gl.uniform1i(location(filmProgram, "bubbleData"), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, neighbourData);
    gl.uniform1i(location(filmProgram, "neighbours"), 3);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, mediaData);
    gl.uniform1i(location(filmProgram, "bubbleMedia"), 5);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, mediaArray);
    gl.uniform1i(location(filmProgram, "media"), 6);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, revealData);
    gl.uniform1i(location(filmProgram, "bubbleReveal"), 7);
    if (look.material > 0.5) wantKoonsMap(look.envMode);
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, koonsMap);
    gl.uniform1i(location(filmProgram, "koonsMap"), 8);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

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

  const setEnvironmentImage: FoamRenderer["setEnvironmentImage"] = (image) => {
    gl.bindTexture(gl.TEXTURE_2D, environment);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
  };

  const setMediaLayerCount: FoamRenderer["setMediaLayerCount"] = (count) => {
    allocateMedia(count);
  };

  const setMediaLayer: FoamRenderer["setMediaLayer"] = (index, image) => {
    if (index < 0 || index >= mediaLayers) return;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, mediaArray);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, index, mediaTile, mediaTile, 1, gl.RGBA, gl.UNSIGNED_BYTE, image);
  };

  const commitMedia: FoamRenderer["commitMedia"] = () => {
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, mediaArray);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  };

  const pixel = new Uint8Array(4);
  const sync: FoamRenderer["sync"] = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  };

  const dispose = () => {
    disposed = true;
    gl.deleteTexture(koonsMap);
    gl.deleteTexture(environment);
    gl.deleteTexture(mediaData);
    gl.deleteTexture(revealData);
    gl.deleteTexture(mediaArray);
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
    gl.deleteProgram(filmProgram);
  };

  return { bubbles, media, reveal, resize, render, setEnvironmentImage, setMediaLayerCount, setMediaLayer, commitMedia, sync, dispose };
}
