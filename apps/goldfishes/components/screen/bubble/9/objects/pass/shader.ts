// The object pass's two shaders, and nothing else: one square per object (instances.ts lays out what each carries),
// shaded by the spheres' own SHADING (render/shading.ts) with the object's normal in place of the sphere's. Per
// pixel it reads the two kinds' fields it flows between (fields/field-textures.ts: units 8–18) and blends them as
// liquid (morph/morph.ts). Drawn twice (object-pass.ts): `shading` 0 writes its height as depth and which instance
// it is, `shading` 1 its material where `sceneWinner` says it is the nearest surface.

import { SHADING } from "../../render/shading";
import { FIELD_EXTENT, FIELD_SIZE } from "../fields/frame";
import { ADDRESS_TIER } from "../fields/tiers";

export const VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 2) in vec4 bubble;  // x, y, radius, seed
layout(location = 3) in vec4 near0;   // its neighbours, as bubbles (radius 0: none)
layout(location = 4) in vec4 near1;
layout(location = 5) in vec4 near2;
layout(location = 6) in vec4 near3;
layout(location = 7) in vec4 turning; // its turn in the screen's plane (radians), the layers it flows from and to, how far
layout(location = 8) in vec4 morph;   // x: how melted, 0–1; y: half the square it is drawn in (object units); z, w: the photographs (−1: none)
layout(location = 9) in vec4 tint;    // 전파: a colour and how much of the coat it has taken
layout(location = 10) in vec4 settle; // x: the sway and ripples' strength, y: the mirror's (morph.ts motion); z, w: extra mip levels for the from and to layers while they sharpen into a finer tier (tiers.ts)
uniform vec2 frame;
uniform float size;
uniform float cssPerPixel;
out vec2 local;
out vec2 screen;
flat out float seed;
flat out vec4 neighbours[4];
flat out vec4 flow;      // from, to, shape, melt
flat out vec4 colouring;
flat out float detail;   // the finest mip level worth reading at this size
flat out mat2 turn;
flat out float radius;
flat out vec2 scans;     // the photographs of the layers it flows from and to (유명인 얼굴), −1 none
flat out vec4 motion;    // sway, sheen (morph.ts motion), the from and to layers' extra blur (tiers.ts blurOf)
flat out vec3 winner;    // which instance this is, as the first pass writes it (two bytes, and 1: an object)
void main() {
  float number = float(gl_InstanceID) + 1.0;
  winner = vec3(mod(number, 256.0), floor(number / 256.0), 255.0) / 255.0;
  neighbours[0] = near0;
  neighbours[1] = near1;
  neighbours[2] = near2;
  neighbours[3] = near3;
  float r = bubble.z * size;
  float c = cos(turning.x);
  float s = sin(turning.x);
  turn = mat2(c, s, -s, c);
  // Only as large as the outlines it flows between reach: most of a 3 × 3 square was empty and paid for.
  local = corner * morph.y;
  screen = bubble.xy + turn * local * r;
  seed = bubble.w;
  flow = vec4(turning.yzw, morph.x);
  colouring = tint;
  scans = morph.zw;
  motion = settle;
  radius = r;
  // Texels of the field per device pixel.
  detail = max(0.0, log2(${(FIELD_SIZE / (2 * FIELD_EXTENT)).toFixed(3)} * cssPerPixel / max(r, 1e-3)));
  vec2 clip = screen / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

export const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 local;
in vec2 screen;
flat in float seed;
flat in vec4 neighbours[4];
flat in vec4 flow;
flat in vec4 colouring;
flat in float detail;
flat in mat2 turn;
flat in float radius;
flat in vec2 scans;
flat in vec4 motion;
flat in vec3 winner;
// The fields' tiers (tiers.ts): 64² (every kind), 128², 256², 512² (pools); the membranes' 32², 64², and 128² for
// the 256² pool's slots then the 512² pool's; the paints' (a face's photograph) 32²–256².
uniform sampler2DArray fields0;
uniform sampler2DArray fields1;
uniform sampler2DArray fields2;
uniform sampler2DArray fields3;
uniform sampler2DArray membranes0;
uniform sampler2DArray membranes1;
uniform sampler2DArray membranes2;
uniform sampler2DArray paints0;
uniform sampler2DArray paints1;
uniform sampler2DArray paints2;
uniform sampler2DArray paints3;
uniform float midSlots;
uniform float faceColour;
uniform float brand;
uniform float size;
uniform float puff;
uniform float soften;
uniform float wobble;
uniform float ripple;
uniform float swell;
uniform float mercury;
// 시계 (MORPH_STYLES): the melt floor the outline keeps swaying on; 0 under 금붕어.
uniform float residue;
// 0: its heights alone, and which object it is (the first pass); 1: its material, where the first pass left it the winner.
uniform float shading;
uniform sampler2D sceneWinner;
out vec4 pixel;
${SHADING}

const float TEXEL = ${((2 * FIELD_EXTENT) / FIELD_SIZE).toFixed(6)};

// A field at an address (tier × 4096 + slot), read at the mip lod of the full 512² field.
vec4 fieldAt(vec2 p, float address, float lod) {
  vec2 uv = p / ${(2 * FIELD_EXTENT).toFixed(2)} + 0.5;
  if (address >= ${3 * ADDRESS_TIER}.0) return textureLod(fields3, vec3(uv, address - ${3 * ADDRESS_TIER}.0), lod);
  if (address >= ${2 * ADDRESS_TIER}.0) return textureLod(fields2, vec3(uv, address - ${2 * ADDRESS_TIER}.0), lod - 1.0);
  if (address >= ${ADDRESS_TIER}.0) return textureLod(fields1, vec3(uv, address - ${ADDRESS_TIER}.0), lod - 2.0);
  return textureLod(fields0, vec3(uv, address), lod - 3.0);
}

// A membrane at a field's address, at the mip m of the full 128² membrane.
float membraneOf(vec2 uv, float address, float m) {
  if (address >= ${3 * ADDRESS_TIER}.0) return textureLod(membranes2, vec3(uv, midSlots + address - ${3 * ADDRESS_TIER}.0), m).r;
  if (address >= ${2 * ADDRESS_TIER}.0) return textureLod(membranes2, vec3(uv, address - ${2 * ADDRESS_TIER}.0), m).r;
  if (address >= ${ADDRESS_TIER}.0) return textureLod(membranes1, vec3(uv, address - ${ADDRESS_TIER}.0), m - 1.0).r;
  return textureLod(membranes0, vec3(uv, address), m - 2.0).r;
}

// The drop's membrane height, blended between the two fields' membranes.
float membraneAt(vec2 p, float lod) {
  vec2 uv = p / ${(2 * FIELD_EXTENT).toFixed(2)} + 0.5;
  float m = lod - 2.0;
  return mix(membraneOf(uv, flow.x, m + motion.z), membraneOf(uv, flow.y, m + motion.w), clamp(flow.z, 0.0, 1.0));
}

// A paint at an address (tier × 4096 + slot), at the mip lod of the full 512² field (the full paint is 256²).
vec4 paintOf(vec2 uv, float address, float lod) {
  if (address >= ${3 * ADDRESS_TIER}.0) return textureLod(paints3, vec3(uv, address - ${3 * ADDRESS_TIER}.0), lod - 1.0);
  if (address >= ${2 * ADDRESS_TIER}.0) return textureLod(paints2, vec3(uv, address - ${2 * ADDRESS_TIER}.0), lod - 2.0);
  if (address >= ${ADDRESS_TIER}.0) return textureLod(paints1, vec3(uv, address - ${ADDRESS_TIER}.0), lod - 3.0);
  return textureLod(paints0, vec3(uv, address), lod - 4.0);
}

// One layer's paint, weighted by w (its share of the morph) and by its control: a face's photograph by 얼굴 사진 색
// (all of it, its colours carried past its outline).
void paintInto(vec2 uv, float scan, float w, float lod, inout vec4 sum) {
  if (w <= 0.0) return;
  // The "own" arm (a paint of a catalogue kind's own colours, weighted by 브랜드 색) is never taken: no bake makes
  // such a paint any more. It stays word for word: without it the compiled shader's arithmetic comes out a little
  // differently, and 0.03% of 맥시멀 믹스's pixels moved by up to 21/255 (pixel-compared, 2026-11-18).
  bool own = scan >= 16384.0;
  vec4 t = paintOf(uv, own ? scan - 16384.0 : scan, lod);
  float k = w * (own ? brand : faceColour);
  sum += vec4(k * t.rgb, k * (own ? t.a : 1.0));
}

// Its paint (유명인 얼굴: its photograph over its field's frame, as a 3D scan's texture), weighted by the share of
// the morph its layer has; rgb premultiplied, a how much of it is paint.
vec4 scanAt(vec2 p, float lod, float settled) {
  vec2 uv = p / ${(2 * FIELD_EXTENT).toFixed(2)} + 0.5;
  vec4 sum = vec4(0.0);
  if (scans.x >= 0.0) paintInto(uv, scans.x, 1.0 - settled, lod, sum);
  if (scans.y >= 0.0) paintInto(uv, scans.y, settled, lod, sum);
  return sum;
}

// Its own colour: the coat, or where it is painted its paint over it (얼굴 사진 색).
vec3 ownColourOf(vec2 p, float lod, float settled, out float scanned) {
  vec3 coat = coatOf(seed);
  vec4 scan = scanAt(p, lod, settled);
  scanned = scan.a;
  return coat * (1.0 - scan.a) + scan.rgb;
}

// The outline's distance, blended between the two fields.
float outlineAt(vec2 p, float lod) {
  return mix(fieldAt(p, flow.x, lod + motion.z).g, fieldAt(p, flow.y, lod + motion.w).g, flow.z);
}

// The light leaving the surface, as SHADING's surfaceOf, with its own metalness (수은화 raises it while melted).
vec3 liquidSurfaceOf(vec3 o, vec3 n, float facing, vec3 coat, vec3 reflected, vec3 reflectedClear, float metal) {
  float fresnel = pow(1.0 - facing, 5.0);
  vec3 bare = reflected * coat;
  vec3 lacquer = coat * irradiance(o, n) + reflected * (0.04 + 0.96 * fresnel);
  vec3 body = mix(lacquer, bare, metal);
  float clear = 0.04 * min(clearcoat * 4.0, 1.0) + 0.96 * clearcoat * fresnel;
  return body * (1.0 - clear) + reflectedClear * clear;
}

void main() {
  // Under another surface: nothing more is read.
  if (shading > 0.5 && any(greaterThan(abs(texelFetch(sceneWinner, ivec2(gl_FragCoord.xy), 0).rgb - winner), vec3(0.002)))) discard;
  float shape = clamp(flow.z, -0.4, 1.4);
  vec2 p = local;
  // It melts and sets in patches that run over it, not all at once (the T-1000 pulling itself back
  // into shape): the melt here leads or lags the object's by up to a quarter.
  float front = 0.5 + 0.25 * (sin(p.x * 2.3 + p.y * 1.7 + seed * 9.0 + time * 0.9) + sin(p.y * 3.1 - p.x * 1.3 + seed * 5.0 - time * 0.7));
  float melt = flow.w <= 0.0 ? 0.0 : clamp(flow.w * 1.5 - front * 0.5, 0.0, 1.0);
  // The sway: the melt's, or a ring-down's (morph.ts motion), or the style's floor, breathing per object. It only
  // displaces the outline; the drop's surface below is worked out only while it really melts.
  float sway = max(motion.x <= 0.0 ? 0.0 : clamp(motion.x * 1.5 - front * 0.5, 0.0, 1.0), residue * (0.7 + 0.3 * sin(time * 0.5 + seed * 17.0)));
  // Melted, the liquid's outline and everything on it sway: a slow, smooth displacement, its own per object.
  if (sway > 0.0) {
    float phase = seed * 37.0;
    vec2 sway2 = vec2(
      sin(p.y * 3.1 + time * 2.3 + phase) + 0.5 * sin(p.x * 5.3 - time * 3.7 + phase * 1.7),
      cos(p.x * 2.7 - time * 2.9 + phase * 1.3) + 0.5 * sin(p.y * 4.9 + time * 3.3 - phase)
    );
    p += sway2 * wobble * sway * 0.67;
  }
  float lod = max(detail, melt * soften);
  vec4 a = fieldAt(p, flow.x, lod + motion.z);
  vec4 b = flow.y == flow.x ? a : fieldAt(p, flow.y, lod + motion.w);
  float s = mix(a.g, b.g, shape);
  if (s > 0.0) discard;
  float settled = clamp(shape, 0.0, 1.0);

  // The solid: the two objects' own surfaces (seen only where it is not melted).
  vec3 na = vec3(a.ba, sqrt(max(0.0, 1.0 - dot(a.ba, a.ba))));
  vec3 nb = vec3(b.ba, sqrt(max(0.0, 1.0 - dot(b.ba, b.ba))));
  float h = mix(a.r, b.r, settled);
  vec3 n = normalize(mix(na, nb, settled));

  if (melt > 0.0) {
    // The liquid: a drop held by surface tension over the outline as it is now — the two shapes'
    // membranes blended, rounded off at the flowing edge (a sphere's fall over the last stretch in).
    float d = max(-s, 1e-5);
    // The edge: rises as a sphere of radius EDGE does from its rim.
    const float EDGE = 0.45;
    float edge = sqrt(2.0 * EDGE * d);
    float membrane = membraneAt(p, lod);
    // A smooth minimum of the two, so they meet without a crease.
    const float KNEE = 0.12;
    float pick = clamp(0.5 + 0.5 * (edge - membrane) / KNEE, 0.0, 1.0);
    float lh = swell * (mix(edge, membrane, pick) - KNEE * pick * (1.0 - pick));
    // Ripples running in from the edge, a few, dying out inward (at one amplitude over all of it they were
    // rings parallel to its outline, a contour map; user, 2026-11-05).
    float wave = -s * 26.0 - time * 7.0 + seed * 40.0;
    float swing = ripple * 0.025 * sway * smoothstep(0.0, 0.05, d) * exp(-d / 0.12);
    lh += swing * sin(wave);
    h = mix(h, lh, melt);
    // Its slopes (sixteen more reads of the fields) only where it is shaded: the first pass wants its height alone
    // (2026-11-18: a melting object that filled the screen cost 20 ms of a 54 ms frame, most of it here).
    if (shading > 0.5) {
      float e = TEXEL * exp2(lod) * 1.5;
      vec2 slope = vec2(outlineAt(p + vec2(e, 0.0), lod) - outlineAt(p - vec2(e, 0.0), lod), outlineAt(p + vec2(0.0, e), lod) - outlineAt(p - vec2(0.0, e), lod)) / (2.0 * e);
      vec2 inward = -slope / max(length(slope), 1e-4);
      vec2 edgeSlope = inward * sqrt(2.0 * EDGE) / (2.0 * sqrt(d));
      float me = TEXEL * exp2(max(lod, 2.0)) * 2.0;
      vec2 membraneSlope = vec2(membraneAt(p + vec2(me, 0.0), lod) - membraneAt(p - vec2(me, 0.0), lod), membraneAt(p + vec2(0.0, me), lod) - membraneAt(p - vec2(0.0, me), lod)) / (2.0 * me);
      vec2 grad = swell * mix(edgeSlope, membraneSlope, pick);
      grad += inward * swing * 26.0 * cos(wave);
      vec3 nl = normalize(vec3(-grad, 1.0));
      float molten = smoothstep(0.0, 0.55, melt);
      n = normalize(mix(n, nl, molten));
    }
  }

  // Into the raft's frame: turned with the object, heights stretched by puff (the normal's height shrinks by as much).
  vec3 surface = vec3(screen, h * radius / size * puff);
  vec3 surfaceNormal = normalize(vec3(turn * n.xy * puff, n.z * size));
  // Depth 0.5 − height / 8192, as the composite writes the spheres'.
  gl_FragDepth = 0.5 - surface.z / 8192.0;
  if (shading < 0.5) {
    pixel = vec4(winner, 1.0);
    return;
  }

  setUpWorld();
  vec3 dir = normalize(2.0 * surfaceNormal.z * surfaceNormal - vec3(0.0, 0.0, 1.0));
  float facing = clamp(surfaceNormal.z, 0.0, 1.0);
  mat3 turnLight = turnOf(seed);
  float bare = mercury * (motion.y <= 0.0 ? 0.0 : clamp(motion.y * 1.5 - front * 0.5, 0.0, 1.0));
  float rough = clamp(roughness * (1.0 + 0.6 * variety * (hash(vec3(seed * 61.3, 5.5, 8.8)) - 0.5)), 0.0, 1.0);
  rough = mix(rough, 0.03, bare);
  vec3 o = toWorld(vec3(surface.xy - frame * 0.5, surface.z));
  vec3 wn = turnLight * toWorld(surfaceNormal);
  // 재질 (bubble/8, render/materials): every material but the coat shades the object from one Surface. Its
  // hollows are where its surface lies below its own blurred height (an unsharp mask of the height field: eye
  // sockets, folds, the gaps between a GPU's fans).
  if (material > 0.5) {
    float around = mix(fieldAt(p, flow.x, lod + motion.z + 3.5).r, fieldAt(p, flow.y, lod + motion.w + 3.5).r, settled);
    float hollow = max(around - h, 0.0) / max(0.15, around);
    Surface sf;
    sf.o = o;
    sf.n = wn;
    sf.nS = surfaceNormal;
    sf.turn = turnLight;
    sf.facing = facing;
    float scanned;
    sf.albedo = mix(ownColourOf(p, lod, settled, scanned), colouring.rgb, colouring.a);
    sf.dyed = max(colouring.a, scanned);
    sf.occlusion = clamp(1.0 - 1.8 * hollow, 0.0, 1.0);
    sf.grainAt = vec3(p * 140.0, seed * 13.0);
    sf.q = p;
    sf.qTurn = turn;
    sf.seed = seed;
    sf.radius = radius;
    sf.edge = -s * radius;
    sf.relief = h;
    sf.behind = background;
    sf.melt = melt;
    sf.body = bodyId(seed, 1.0);
    joinNeighbours(sf);
    pixel = vec4(shadeMaterial(sf), sf.body);
    return;
  }
  // 전파's strain or a logo's brand colour, over the page's own coat.
  float scanned;
  vec3 coat = mix(ownColourOf(p, lod, settled, scanned), colouring.rgb, colouring.a);
  vec3 reflected = envAt(o, turnLight * toWorld(dir), rough);
  vec3 reflectedClear = clearcoat > 0.0 ? envAt(o, turnLight * toWorld(dir), rough * 0.3) : reflected;
  float nearest = 1e9;
  vec4 hit = vec4(0.0);
  float square = 0.0;
  for (int k = 0; k < 4; k += 1) {
    vec4 c = neighbours[k];
    if (c.z <= 0.0) continue;
    vec3 oc = surface - vec3(c.xy, 0.0);
    float bb = dot(oc, dir);
    float cc = dot(oc, oc) - c.z * c.z;
    float disc = bb * bb - cc;
    if (cc <= 0.0 || disc <= 0.0) continue;
    float along = -bb - sqrt(disc);
    if (along > 0.5 && along < nearest) {
      nearest = along;
      hit = c;
      square = smoothstep(0.0, 0.6, sqrt(disc) / c.z);
    }
  }
  if (nearest < 1e8) {
    vec3 at = surface + dir * nearest;
    vec3 n2 = normalize(at - vec3(hit.xy, 0.0));
    vec3 o2 = toWorld(vec3(at.xy - frame * 0.5, at.z));
    vec3 seen = envAt(o2, turnLight * toWorld(reflect(dir, n2)), rough);
    vec3 other = surfaceOf(o2, turnLight * toWorld(n2), abs(dot(dir, n2)), sqrt(coatOf(hit.w)), seen, seen) * mix(0.55, 1.0, smoothstep(0.0, 0.35 * hit.z, nearest));
    float mirrored = neighbourReflection * (1.0 - smoothstep(0.3, 1.0, rough)) * square;
    reflected = mix(reflected, other, mirrored);
    reflectedClear = mix(reflectedClear, other, neighbourReflection * (1.0 - smoothstep(0.3, 1.0, rough * 0.3)) * square);
  }
  coat = mix(coat, vec3(0.86, 0.87, 0.88), bare);
  // A face's photograph is its surface's own colour (a scan's), not a metal's tint of the room: it is lacquer where it is scanned.
  vec3 colour = liquidSurfaceOf(o, wn, facing, coat, reflected, reflectedClear, mix(mix(metalness, 0.0, 0.85 * scanned), 1.0, bare));
  pixel = vec4(filmic(colour * 1.25 * exposure), bodyId(seed, 1.0));
}
`;
