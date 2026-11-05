// The objects drawn on the raft's canvas, after the raft, in its material:
// the fragment shader is the spheres' (render/foam.ts SHADING) — coat,
// metal, clear coat, the photographed room, the key, the ground below the
// horizon, each page's own turn and hue — with the object's own normal in
// place of the sphere's. Each object mirrors its nearest neighbours as the
// spheres do (raft 이웃 반사): without them it showed only the room, a lone
// highlight on an empty coat, and read cheap (user: "너무 싼티남"). The
// neighbours are mirrored as the spheres they are (bubbles, ontologically),
// up to four, found here on the CPU. Not carried over: the spheres' seams.
//
// bubble/7 (액체 모핑, user 2026-10-27): no meshes. Every object is a field
// (fields.ts) in one texture array, the bubble its first layer, and every
// object one square in one instanced draw. Per pixel the shader reads two
// kinds' fields and blends them as liquid (morph.ts): the outline flows from
// one to the other, the surface softens into a drop held by surface tension,
// wobbles and ripples, and sets again into the next object's own surface. The
// height it finds is written as depth, as the meshes' was.
//
// Pages morph when what they are shown as changes (변신, the set's chips);
// portions under way flow from their own object into the page they reach;
// the 랩 draws one object, large, on its own morph.
//
// bubble/9 (기호의 파티, 2026-11-05): with the catalogue's hundreds of kinds the fields are kept in tiers (tiers.ts):
// every kind at 64², and pools of 128², 256² and 512² slots for the kinds whose objects on screen are largest, so
// GPU memory is fixed whatever the catalogue's size. An instance carries, for the two kinds it flows between, the
// address of each one's finest tier (tier × 4096 + slot); the shader reads that tier at the mip it would have read
// of the full field, so a kind looks the same from any tier fine enough for its size. Bakes run on demand in the
// workers, the largest objects' kinds first.

import { BUBBLE_FLOATS, type FoamRenderer } from "../render/foam";
import { SHADING } from "../render/shading";
import { tiersOf, type TierData } from "./bake";
import { FIELD_EXTENT, FIELD_SIZE, fieldOf } from "./fields";
import type { FieldAnswer, FieldRequest } from "./field-worker";
import type { Liquid } from "./liquid";
import { envelope, FIELD_KINDS, layerOf, passage, retarget, type Morph } from "./morph";
import { KIND, type LogoKind } from "./groups";
import { brandOf } from "./marks";
import { kindsInUse, pageKind, pagesAreObjects, portionKind, type ObjectKind, type ObjectParameters } from "./objects";
import { ADDRESS_BRAND, ADDRESS_TIER, levelsOf, poolsFor, Residency, TIER_FIELD, TIER_MEMBRANE, TIER_PAINT, TIERS, type Tier } from "./tiers";

/** Neighbours each object mirrors, nearest first. */
const NEIGHBOURS = 4;
/**
 * Per instance: its bubble, its neighbours', then (turn, from layer, to layer, shape), (melt, half its square,
 * the from and to layers' photographs: 유명인 얼굴, −1 none) and its tint (rgb, amount: 전파).
 */
const INSTANCE_FLOATS = BUBBLE_FLOATS * (1 + NEIGHBOURS) + 12;
const LAYERS = FIELD_KINDS.length;
/** Pages tracked for their morphs. */
const MAX_TRACKED = 4096;
/**
 * A page's turn springs towards where it should face: it gathers speed (never starting at full speed) and settles
 * with a slight give. Per second, and its damping ratio; a half turn peaks near 23 rad/s (22° a frame at 60 fps), is
 * done in 0.3 s and overshoots by about 1° (user, 2026-11-04: 조금 더 찰지게, then faster still while it never jumps).
 */
const TURN_SPRING = 16;
const TURN_DAMPING = 0.75;

const VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 2) in vec4 bubble;  // x, y, radius, seed
layout(location = 3) in vec4 near0;   // its neighbours, as bubbles (radius 0: none)
layout(location = 4) in vec4 near1;
layout(location = 5) in vec4 near2;
layout(location = 6) in vec4 near3;
layout(location = 7) in vec4 turning; // its turn in the screen's plane (radians), the layers it flows from and to, how far
layout(location = 8) in vec4 morph;   // x: how melted, 0–1; y: half the square it is drawn in (object units); z, w: the photographs (−1: none)
layout(location = 9) in vec4 tint;    // 전파: a colour and how much of the coat it has taken
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
void main() {
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
  radius = r;
  // Texels of the field per device pixel.
  detail = max(0.0, log2(${(FIELD_SIZE / (2 * FIELD_EXTENT)).toFixed(3)} * cssPerPixel / max(r, 1e-3)));
  vec2 clip = screen / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `#version 300 es
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
// The fields' tiers (tiers.ts): 64² (every kind), 128², 256², 512² (pools); the membranes' 32², 64², and 128² for
// the 256² pool's slots then the 512² pool's; the paints' (a face's photograph, a catalogue kind's colours) 32²–256².
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
  return mix(membraneOf(uv, flow.x, m), membraneOf(uv, flow.y, m), clamp(flow.z, 0.0, 1.0));
}

// A paint at an address (tier × 4096 + slot), at the mip lod of the full 512² field (the full paint is 256²).
vec4 paintOf(vec2 uv, float address, float lod) {
  if (address >= ${3 * ADDRESS_TIER}.0) return textureLod(paints3, vec3(uv, address - ${3 * ADDRESS_TIER}.0), lod - 1.0);
  if (address >= ${2 * ADDRESS_TIER}.0) return textureLod(paints2, vec3(uv, address - ${2 * ADDRESS_TIER}.0), lod - 2.0);
  if (address >= ${ADDRESS_TIER}.0) return textureLod(paints1, vec3(uv, address - ${ADDRESS_TIER}.0), lod - 3.0);
  return textureLod(paints0, vec3(uv, address), lod - 4.0);
}

// One layer's paint, weighted by w (its share of the morph) and by its control: a face's photograph by 얼굴 사진 색
// (all of it, its colours carried past its outline), a catalogue kind's colours by 브랜드 색 (where painted: alpha).
void paintInto(vec2 uv, float scan, float w, float lod, inout vec4 sum) {
  if (w <= 0.0) return;
  bool own = scan >= ${ADDRESS_BRAND}.0;
  vec4 t = paintOf(uv, own ? scan - ${ADDRESS_BRAND}.0 : scan, lod);
  float k = w * (own ? brand : faceColour);
  sum += vec4(k * t.rgb, k * (own ? t.a : 1.0));
}

// Its paint (유명인 얼굴: its photograph over its field's frame, as a 3D scan's texture; a catalogue kind: its own
// colours), weighted by the share of the morph its layer has; rgb premultiplied, a how much of it is paint.
vec4 scanAt(vec2 p, float lod, float settled) {
  vec2 uv = p / ${(2 * FIELD_EXTENT).toFixed(2)} + 0.5;
  vec4 sum = vec4(0.0);
  if (scans.x >= 0.0) paintInto(uv, scans.x, 1.0 - settled, lod, sum);
  if (scans.y >= 0.0) paintInto(uv, scans.y, settled, lod, sum);
  return sum;
}

// Its own colour: the coat, or where it is painted its paint over it (얼굴 사진 색, 브랜드 색).
vec3 ownColourOf(vec2 p, float lod, float settled, out float scanned) {
  vec3 coat = coatOf(seed);
  vec4 scan = scanAt(p, lod, settled);
  scanned = scan.a;
  return coat * (1.0 - scan.a) + scan.rgb;
}

// The outline's distance, blended between the two fields.
float outlineAt(vec2 p, float lod) {
  return mix(fieldAt(p, flow.x, lod).g, fieldAt(p, flow.y, lod).g, flow.z);
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
  float shape = clamp(flow.z, -0.4, 1.4);
  vec2 p = local;
  // It melts and sets in patches that run over it, not all at once (the T-1000 pulling itself back
  // into shape): the melt here leads or lags the object's by up to a quarter.
  float front = 0.5 + 0.25 * (sin(p.x * 2.3 + p.y * 1.7 + seed * 9.0 + time * 0.9) + sin(p.y * 3.1 - p.x * 1.3 + seed * 5.0 - time * 0.7));
  float melt = flow.w <= 0.0 ? 0.0 : clamp(flow.w * 1.5 - front * 0.5, 0.0, 1.0);
  // Melted, the liquid's outline and everything on it sway: a slow, smooth displacement, its own per object.
  if (melt > 0.0) {
    float phase = seed * 37.0;
    vec2 sway = vec2(
      sin(p.y * 3.1 + time * 2.3 + phase) + 0.5 * sin(p.x * 5.3 - time * 3.7 + phase * 1.7),
      cos(p.x * 2.7 - time * 2.9 + phase * 1.3) + 0.5 * sin(p.y * 4.9 + time * 3.3 - phase)
    );
    p += sway * wobble * melt * 0.67;
  }
  float lod = max(detail, melt * soften);
  vec4 a = fieldAt(p, flow.x, lod);
  vec4 b = flow.y == flow.x ? a : fieldAt(p, flow.y, lod);
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
    float e = TEXEL * exp2(lod) * 1.5;
    vec2 slope = vec2(outlineAt(p + vec2(e, 0.0), lod) - outlineAt(p - vec2(e, 0.0), lod), outlineAt(p + vec2(0.0, e), lod) - outlineAt(p - vec2(0.0, e), lod)) / (2.0 * e);
    vec2 inward = -slope / max(length(slope), 1e-4);
    float d = max(-s, 1e-5);
    // The edge: rises as a sphere of radius EDGE does from its rim.
    const float EDGE = 0.45;
    float edge = sqrt(2.0 * EDGE * d);
    vec2 edgeSlope = inward * sqrt(2.0 * EDGE) / (2.0 * sqrt(d));
    float me = TEXEL * exp2(max(lod, 2.0)) * 2.0;
    float membrane = membraneAt(p, lod);
    vec2 membraneSlope = vec2(membraneAt(p + vec2(me, 0.0), lod) - membraneAt(p - vec2(me, 0.0), lod), membraneAt(p + vec2(0.0, me), lod) - membraneAt(p - vec2(0.0, me), lod)) / (2.0 * me);
    // A smooth minimum of the two, so they meet without a crease.
    const float KNEE = 0.12;
    float pick = clamp(0.5 + 0.5 * (edge - membrane) / KNEE, 0.0, 1.0);
    float lh = swell * (mix(edge, membrane, pick) - KNEE * pick * (1.0 - pick));
    vec2 grad = swell * mix(edgeSlope, membraneSlope, pick);
    // Ripples running in from the edge, a few, dying out inward (at one amplitude over all of it they were
    // rings parallel to its outline, a contour map; user, 2026-11-05).
    float wave = -s * 26.0 - time * 7.0 + seed * 40.0;
    float swing = ripple * 0.025 * melt * smoothstep(0.0, 0.05, d) * exp(-d / 0.12);
    lh += swing * sin(wave);
    grad += inward * swing * 26.0 * cos(wave);
    vec3 nl = normalize(vec3(-grad, 1.0));
    float molten = smoothstep(0.0, 0.55, melt);
    h = mix(h, lh, melt);
    n = normalize(mix(n, nl, molten));
  }

  // Into the raft's frame: turned with the object, heights stretched by puff (the normal's height shrinks by as much).
  vec3 surface = vec3(screen, h * radius / size * puff);
  vec3 surfaceNormal = normalize(vec3(turn * n.xy * puff, n.z * size));
  // Depth 0.5 − height / 8192, as the composite writes the spheres'.
  gl_FragDepth = 0.5 - surface.z / 8192.0;

  setUpWorld();
  vec3 dir = normalize(2.0 * surfaceNormal.z * surfaceNormal - vec3(0.0, 0.0, 1.0));
  float facing = clamp(surfaceNormal.z, 0.0, 1.0);
  mat3 turnLight = turnOf(seed);
  float bare = mercury * melt;
  float rough = clamp(roughness * (1.0 + 0.6 * variety * (hash(vec3(seed * 61.3, 5.5, 8.8)) - 0.5)), 0.0, 1.0);
  rough = mix(rough, 0.03, bare);
  vec3 o = toWorld(vec3(surface.xy - frame * 0.5, surface.z));
  vec3 wn = turnLight * toWorld(surfaceNormal);
  // 재질 (bubble/8, render/materials): every material but the coat shades the object from one Surface. Its
  // hollows are where its surface lies below its own blurred height (an unsharp mask of the height field: eye
  // sockets, folds, the gaps between a GPU's fans).
  if (material > 0.5) {
    float around = mix(fieldAt(p, flow.x, lod + 3.5).r, fieldAt(p, flow.y, lod + 3.5).r, settled);
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
    pixel = vec4(shadeMaterial(sf), 1.0);
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
  pixel = vec4(filmic(colour * 1.25 * exposure), 1.0);
}
`;

/** Per page or portion, what the frame loop knows beyond its bubble (전파 and the portions' targets). */
export type ObjectFrame = {
  /** Seconds, for the liquid's sway and the pages' 변신. */
  time: number;
  /** A portion's target page (−1 for pages). */
  targetOf: Int32Array;
  /** A portion's share of its way, 0–1. */
  travelOf: Float32Array;
  /** Per page: tint rgb and amount (전파), or null. */
  tints: Float32Array | null;
  /** Per page: the kind 전파 has given it (a field layer), or −1 (its own). */
  caught: Int16Array | null;
};

/** The 랩's one object: where, how large, which morph and how far along it (null: by the clock). */
export type LabFrame = { x: number; y: number; radius: number; turn: number; morph: Morph; time: number; scrub: number | null };

export type ObjectPass = {
  /**
   * Draws the frame's `count` bubbles that are shown as objects: the portions
   * before `pageStart` (each from its page, `pageOf`), then the pages;
   * `headingOf` is each one's direction of travel (각도 · 움직이는 방향).
   */
  draw(pageStart: number, count: number, pageOf: Int32Array, headingOf: Float32Array, parameters: ObjectParameters, frame: ObjectFrame): void;
  /** Draws the 랩's object alone. */
  drawLab(lab: LabFrame, parameters: ObjectParameters): void;
  /** Whether a layer's field is ready. */
  ready(layer: number): boolean;
  /**
   * Per page, last frame: how far its drawn object reaches, as a share of its
   * disc (size × its outline; 1 while it is the raft's sphere). The goldfish
   * keep out of that disc, not the bare bubble's.
   */
  pageExtent: Float32Array;
  dispose(): void;
};

export function createObjectPass(foam: FoamRenderer, maxBubbles: number): ObjectPass {
  const gl = foam.gl;
  const program = foam.program(VERTEX, FRAGMENT);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const at = {
    size: uniform("size"),
    puff: uniform("puff"),
    time: uniform("time"),
    cssPerPixel: uniform("cssPerPixel"),
    soften: uniform("soften"),
    wobble: uniform("wobble"),
    ripple: uniform("ripple"),
    swell: uniform("swell"),
    mercury: uniform("mercury"),
    faceColour: uniform("faceColour"),
    brand: uniform("brand"),
    midSlots: uniform("midSlots"),
  };

  // The tiers (tiers.ts): every kind's 64² layer, and the pools' slots, sized at the start from one budget.
  const pools = poolsFor(LAYERS);
  const residency = new Residency(LAYERS, pools);
  const array = (size: number, layers: number, format: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levelsOf(size), format, size, size, Math.max(1, layers));
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };
  const fieldArrays = TIERS.map((tier) => array(TIER_FIELD[tier], pools[tier], gl.RGBA16F));
  // The 256² and 512² pools' membranes are both 128²: one array, the 256² pool's slots first.
  const membraneArrays = [array(TIER_MEMBRANE[0], pools[0], gl.R16F), array(TIER_MEMBRANE[1], pools[1], gl.R16F), array(TIER_MEMBRANE[2], pools[2] + pools[3], gl.R16F)];
  const paintArrays = TIERS.map((tier) => array(TIER_PAINT[tier], pools[tier], gl.SRGB8_ALPHA8));
  const textures = [...fieldArrays, ...membraneArrays, ...paintArrays];
  const samplers = ["fields0", "fields1", "fields2", "fields3", "membranes0", "membranes1", "membranes2", "paints0", "paints1", "paints2", "paints3"].map(uniform);
  /** Per layer, its paint: none, a face's photograph (얼굴 사진 색), or a catalogue kind's colours (브랜드 색). */
  const paintOf = new Int8Array(LAYERS);
  const PAINT_FACE = 1;
  const PAINT_BRAND = 2;
  const baked = residency.baked;
  /** Per layer, how far its outline reaches (the bubble's until it is baked). */
  const reach = new Float32Array(LAYERS).fill(1.05);
  /** Per layer, how far its outline reaches in any direction. */
  const outline = new Float32Array(LAYERS).fill(1.05);
  const pageExtent = new Float32Array(MAX_TRACKED).fill(1);
  /** Per page, the turn it was drawn at last frame (radians, not wrapped) and how fast it was turning. */
  const pageTurn = new Float32Array(MAX_TRACKED);
  const pageSpin = new Float32Array(MAX_TRACKED);
  let lastTime = 0;

  /** One mip chain into a layer of an array, level by level. */
  const chain = (texture: WebGLTexture, size: number, layer: number, data: Uint16Array | Uint8Array, format: number, type: number, channels: number) => {
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    let offset = 0;
    for (let side = size, level = 0; side >= 1; side /= 2, level += 1) {
      const count = side * side * channels;
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, level, 0, 0, layer, side, side, 1, format, type, data.subarray(offset, offset + count));
      offset += count;
    }
  };
  /** Writes one tier's data into its slot (tier 0: the layer's own). */
  const uploadTier = (tier: Tier, slot: number, data: TierData) => {
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    chain(fieldArrays[tier]!, TIER_FIELD[tier], slot, data.field, gl.RGBA, gl.HALF_FLOAT, 4);
    chain(membraneArrays[Math.min(2, tier)]!, TIER_MEMBRANE[tier], tier === 3 ? pools[2] + slot : slot, data.membrane, gl.RED, gl.HALF_FLOAT, 1);
    if (data.paint) chain(paintArrays[tier]!, TIER_PAINT[tier], slot, data.paint, gl.RGBA, gl.UNSIGNED_BYTE, 4);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  };
  /** Takes in a bake: its measures, then each tier it brought, into the slot the residency gives it (if any). */
  const takeIn = (answer: Omit<FieldAnswer, "took">) => {
    const { layer } = answer;
    reach[layer] = answer.reach;
    outline[layer] = answer.outline;
    paintOf[layer] = answer.paint === "face" ? PAINT_FACE : answer.paint === "brand" ? PAINT_BRAND : 0;
    for (const data of [...answer.tiers].sort((a, b) => a.tier - b.tier)) {
      const slot = data.tier === 0 ? layer : residency.place(layer, data.tier, residency.desired[layer] === data.tier);
      if (slot < 0) continue;
      uploadTier(data.tier, slot, data);
      if (data.tier === 0) residency.bake(layer);
    }
  };
  /** A layer's paint's shader address (its finest tier's, + ADDRESS_BRAND for a catalogue kind's colours), −1 none. */
  const paintAddress = (layer: number) => {
    const paint = paintOf[layer]!;
    const address = residency.address[layer]!;
    if (!paint || address < 0) return -1;
    return paint === PAINT_BRAND ? address + ADDRESS_BRAND : address;
  };

  // The bubble at once (exact, a few milliseconds), in tier 0 and in a 512² slot kept for it: every kind is drawn as
  // it until its own field is ready.
  {
    const field = fieldOf("bubble");
    const slot = residency.pin(0, 3);
    const [base, top] = tiersOf(field, null, [0, 3]);
    takeIn({ layer: 0, thickness: field.thickness, peak: field.peak, reach: field.reach, outline: field.outline, paint: null, tiers: [base!] });
    uploadTier(3, slot, top!);
  }

  // Bakes, off the main thread (field-worker.ts), on demand: every kind the pages or the portions may show now
  // (kindsInUse) into tier 0 at least, and any kind wanting a finer tier than it has; the largest objects' first.
  const workers: Worker[] = [];
  const idle: Worker[] = [];
  const workerCount = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
  let disposed = false;
  /** Per layer: a bake under way. */
  const baking = new Uint8Array(LAYERS);
  /** Per layer: its largest object's radius (CSS px) drawn since the last plan, and as of that plan. */
  const drawnRadius = new Float32Array(LAYERS);
  const plannedRadius = new Float32Array(LAYERS);
  /** Per layer: asked for (wanted on screen before its field is in), so it bakes even if nothing in use has it. */
  const asked = new Uint8Array(LAYERS);
  let inUse: number[] = [];
  let inUseOf: ObjectParameters | null = null;
  let plannedAt = -Infinity;
  const nextJob = () => {
    // The largest object's kind lacking what it wants; then those asked for; then the rest in use, in order.
    let best = -1;
    let bestRadius = 0;
    for (let layer = 1; layer < LAYERS; layer += 1) {
      if (baking[layer] || plannedRadius[layer]! <= bestRadius || !residency.lacking(layer)) continue;
      best = layer;
      bestRadius = plannedRadius[layer]!;
    }
    if (best >= 0) return best;
    for (let layer = 1; layer < LAYERS; layer += 1) if (asked[layer] && !baked[layer] && !baking[layer]) return layer;
    for (const layer of inUse) if (!baked[layer] && !baking[layer]) return layer;
    return -1;
  };
  const dispatch = () => {
    while (idle.length > 0) {
      const layer = nextJob();
      if (layer < 0) return;
      const tiers = residency.tiersToBake(layer);
      if (tiers.length === 0) {
        // Nothing it could bring now (its pool is full of wanted kinds): it waits for the next plan.
        plannedRadius[layer] = 0;
        continue;
      }
      baking[layer] = 1;
      idle.pop()!.postMessage({ layer, kind: FIELD_KINDS[layer]!, tiers } satisfies FieldRequest);
    }
  };
  for (let index = 0; index < workerCount; index += 1) {
    const worker = new Worker(new URL("./field-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FieldAnswer>) => {
      if (disposed) return;
      baking[event.data.layer] = 0;
      takeIn(event.data);
      idle.push(worker);
      dispatch();
    };
    workers.push(worker);
    idle.push(worker);
  }
  /** A few times a second: which kinds should hold which pools (tiers.ts), and the bakes that takes. */
  const PLAN_EVERY = 0.25;
  const plan = (time: number, parameters: ObjectParameters) => {
    if (parameters !== inUseOf) {
      inUseOf = parameters;
      inUse = kindsInUse(parameters).map(layerOf).filter((layer) => layer > 0);
    }
    // The first frame plans at once (so the first bakes are the largest objects'); a clock that went back too.
    if (time - plannedAt < PLAN_EVERY && time >= plannedAt) return;
    plannedAt = time;
    const size = foam.size();
    residency.plan(drawnRadius, size.width / Math.max(1, size.pixelWidth), time);
    plannedRadius.set(drawnRadius);
    drawnRadius.fill(0);
    dispatch();
  };
  const ready = (layer: number) => baked[layer] === 1;
  /** The layer if baked; else the bubble's, the layer asked for so it bakes. */
  const shown = (layer: number) => {
    if (baked[layer]) return layer;
    asked[layer] = 1;
    return 0;
  };
  /** Its largest object on screen since the last plan (CSS px), for the pools. */
  const seen = (layer: number, radius: number) => {
    if (layer >= 0 && radius > drawnRadius[layer]!) drawnRadius[layer] = radius;
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const data = new Float32Array((maxBubbles + 1) * INSTANCE_FLOATS);
  const instances = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  for (let slot = 0; slot < NEIGHBOURS + 4; slot += 1) {
    gl.enableVertexAttribArray(2 + slot);
    gl.vertexAttribPointer(2 + slot, 4, gl.FLOAT, false, INSTANCE_FLOATS * 4, slot * 16);
    gl.vertexAttribDivisor(2 + slot, 1);
  }
  gl.bindVertexArray(null);

  // Each bubble's nearest neighbours (sweep and prune along x), reused between frames.
  const order = new Int32Array(maxBubbles);
  const lefts = new Float32Array(maxBubbles);
  const nearIds = new Int32Array(maxBubbles * NEIGHBOURS);
  const nearGaps = new Float32Array(maxBubbles * NEIGHBOURS);
  const keep = (index: number, other: number, gap: number) => {
    const base = index * NEIGHBOURS;
    let slot = -1;
    let widest = -Infinity;
    for (let at = 0; at < NEIGHBOURS; at += 1) {
      if (nearIds[base + at]! < 0) {
        slot = at;
        break;
      }
      if (nearGaps[base + at]! > widest) {
        widest = nearGaps[base + at]!;
        slot = at;
      }
    }
    if (nearIds[base + slot]! >= 0 && gap >= widest) return;
    nearIds[base + slot] = other;
    nearGaps[base + slot] = gap;
  };
  const findNeighbours = (count: number, size: number) => {
    const bubbles = foam.bubbles;
    nearIds.fill(-1, 0, count * NEIGHBOURS);
    for (let index = 0; index < count; index += 1) {
      order[index] = index;
      lefts[index] = bubbles[index * 4]! - bubbles[index * 4 + 2]! * Math.max(1, size) * 1.4;
    }
    const sorted = order.subarray(0, count).sort((a, b) => lefts[a]! - lefts[b]!);
    for (let at = 0; at < count; at += 1) {
      const a = sorted[at]!;
      const ax = bubbles[a * 4]!;
      const ay = bubbles[a * 4 + 1]!;
      const ar = bubbles[a * 4 + 2]! * Math.max(1, size) * 1.4;
      for (let next = at + 1; next < count; next += 1) {
        const b = sorted[next]!;
        if (lefts[b]! > ax + ar) break;
        const br = bubbles[b * 4 + 2]! * Math.max(1, size) * 1.4;
        const dx = bubbles[b * 4]! - ax;
        const dy = bubbles[b * 4 + 1]! - ay;
        const reach = ar + br;
        if (Math.abs(dy) >= reach || dx * dx + dy * dy >= reach * reach) continue;
        const gap = Math.hypot(dx, dy) - bubbles[a * 4 + 2]! - bubbles[b * 4 + 2]!;
        keep(a, b, gap);
        keep(b, a, gap);
      }
    }
  };

  // Each page's morph: the layer it flows from, the one it flows to, and since when (−1: not seen yet).
  const pageFrom = new Int16Array(MAX_TRACKED);
  const pageTo = new Int16Array(MAX_TRACKED).fill(-1);
  const pageStart = new Float64Array(MAX_TRACKED);
  const morph: Morph = { from: 0, to: 0, start: 0 };
  /** The layer a page is shown as now, its morph moved on if what it should be has changed. */
  const pageLayer = (page: number, want: number, time: number, liquid: Liquid) => {
    if (page >= MAX_TRACKED) return { from: want, to: want, start: -Infinity };
    if (pageTo[page]! < 0) {
      pageFrom[page] = want;
      pageTo[page] = want;
      pageStart[page] = -Infinity;
    } else if (pageTo[page] !== want) {
      morph.from = pageFrom[page]!;
      morph.to = pageTo[page]!;
      morph.start = pageStart[page]!;
      retarget(morph, want, time, liquid);
      pageFrom[page] = morph.from;
      pageTo[page] = morph.to;
      pageStart[page] = morph.start;
    }
    return { from: pageFrom[page]!, to: pageTo[page]!, start: pageStart[page]! };
  };

  // Each logo's brand colour by layer (테크 로고; marks.ts), the others none.
  const brandColour = new Float32Array(LAYERS * 3);
  const branded = new Float32Array(LAYERS);
  // 유명인 얼굴: a head stays upright (a face upside down is not read as one), only tilting a little with its way.
  const upright = new Uint8Array(LAYERS);
  FIELD_KINDS.forEach((kind, layer) => {
    if (kind !== "bubble" && KIND[kind].source === "face") upright[layer] = 1;
  });
  FIELD_KINDS.forEach((kind, layer) => {
    if (kind === "bubble" || KIND[kind].source !== "mark") return;
    const colour = brandOf(kind as LogoKind);
    brandColour.set(colour, layer * 3);
    // A black or near-black brand (Apple, X, TikTok, OpenAI) dyes nothing: a film cannot be black.
    branded[layer] = Math.min(1, Math.max(0, (Math.max(...colour) - 0.08) / 0.3));
  });

  /**
   * Writes one instance's morph, turn and tint (its bubble and neighbours are written first): 전파's tint when
   * the page has one, else its brand colour by `brand`, blended between the two layers it flows between.
   */
  const write = (slot: number, flowFrom: number, flowTo: number, shape: number, melt: number, turn: number, tints: Float32Array | null, tintPage: number, brand: number, size: number) => {
    const to = slot * INSTANCE_FLOATS;
    const tail = to + (NEIGHBOURS + 1) * BUBBLE_FLOATS;
    data[tail] = turn;
    // Its size on screen, for the pools: the kinds it flows between want a tier as fine as that.
    const radius = data[to + 2]! * size;
    seen(flowFrom, radius);
    seen(flowTo, radius);
    const fromLayer = shown(flowFrom);
    const toLayer = shown(flowTo);
    data[tail + 1] = residency.address[fromLayer]!;
    data[tail + 2] = residency.address[toLayer]!;
    data[tail + 3] = shape;
    data[tail + 4] = melt;
    // The square: both outlines, and room for the melt's sway and the spring's overshoot.
    const fromReach = reach[fromLayer]!;
    const toReach = reach[toLayer]!;
    const loose = melt > 0 || shape < 0 || shape > 1 ? 0.22 + Math.max(0, shape - 1, -shape) * Math.abs(toReach - fromReach) : 0;
    data[tail + 5] = Math.min(FIELD_EXTENT, Math.max(fromReach, toReach) + loose);
    data[tail + 6] = paintAddress(fromLayer);
    data[tail + 7] = paintAddress(toLayer);
    if (tints && tintPage >= 0 && tints[tintPage * 4 + 3]! > 0) {
      data.set(tints.subarray(tintPage * 4, tintPage * 4 + 4), tail + 8);
      return;
    }
    const along = Math.min(1, Math.max(0, shape));
    const a = branded[fromLayer]! * (1 - along);
    const b = branded[toLayer]! * along;
    if (brand <= 0 || a + b <= 0) {
      data.fill(0, tail + 8, tail + 12);
      return;
    }
    for (let channel = 0; channel < 3; channel += 1) data[tail + 8 + channel] = (brandColour[fromLayer * 3 + channel]! * a + brandColour[toLayer * 3 + channel]! * b) / (a + b);
    data[tail + 11] = brand * (a + b);
  };

  const begin = (parameters: ObjectParameters, time: number) => {
    const size = foam.size();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, size.pixelWidth, size.pixelHeight);
    // In depth with the spheres just drawn (the portions under way): each passes behind the other where it is lower.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(program);
    foam.shade(program);
    gl.uniform1f(at.size, parameters.size);
    gl.uniform1f(at.puff, parameters.puff);
    gl.uniform1f(at.time, time);
    gl.uniform1f(at.cssPerPixel, size.width / Math.max(1, size.pixelWidth));
    gl.uniform1f(at.soften, parameters.soften);
    gl.uniform1f(at.wobble, parameters.wobble);
    gl.uniform1f(at.ripple, parameters.ripple);
    gl.uniform1f(at.swell, parameters.swell);
    gl.uniform1f(at.mercury, parameters.mercury);
    gl.uniform1f(at.faceColour, parameters.faceColour ?? 1);
    gl.uniform1f(at.brand, parameters.brand);
    gl.uniform1f(at.midSlots, pools[2]);
    // Units 8–18 (WebGL2 has at least 32; the raft's own programs use 0–7).
    textures.forEach((texture, index) => {
      gl.activeTexture(gl.TEXTURE8 + index);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.uniform1i(samplers[index]!, 8 + index);
    });
  };
  const finish = (count: number) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, instances);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * INSTANCE_FLOATS);
    gl.bindVertexArray(vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
  };

  const draw: ObjectPass["draw"] = (pageStartIndex, count, pageOf, headingOf, parameters, frame) => {
    const facing = Math.round(parameters.facing);
    const bubbles = foam.bubbles;
    const time = frame.time;
    const portionMorph = parameters.portionMorph >= 0.5;
    const caught = frame.caught;
    const pageObjects = pagesAreObjects(parameters);
    /** The layer a page should be now: its 전파 kind, or its own (변신 included). */
    const wantOf = (page: number) => {
      const kind: ObjectKind | null = caught && caught[page]! >= 0 ? (FIELD_KINDS[caught[page]!] as ObjectKind) : pageKind(page, parameters, time);
      return layerOf(kind);
    };
    const dt = Math.min(0.1, Math.max(0, time - lastTime));
    lastTime = time;
    const total = Math.min(count, maxBubbles);
    findNeighbours(total, parameters.size);
    let drawn = 0;
    for (let index = 0; index < total; index += 1) {
      const from = index * BUBBLE_FLOATS;
      const page = pageOf[index]!;
      const seed = bubbles[from + 3]!;
      let flowFrom: number;
      let flowTo: number;
      let shape: number;
      let melt: number;
      if (index < pageStartIndex) {
        const target = frame.targetOf[index]!;
        if (portionMorph && target >= 0) {
          // Its source page's shape → its own (bubble, heart, tech, …) → the shape of the page it reaches.
          const own = layerOf(portionKind(page, seed, parameters));
          const shownAs = (other: number) => (other < MAX_TRACKED && pageTo[other]! >= 0 ? pageTo[other]! : wantOf(other));
          ({ from: flowFrom, to: flowTo, shape, melt } = passage(frame.travelOf[index]!, shownAs(page), own, shownAs(target), parameters));
          // All bubbles, end to end: the raft's own sphere.
          if (flowFrom === 0 && flowTo === 0 && !pageObjects) continue;
        } else {
          const kind = portionKind(page, seed, parameters);
          if (!kind) continue;
          flowFrom = flowTo = layerOf(kind);
          shape = 1;
          melt = 0;
        }
      } else {
        const want = wantOf(page);
        const state = pageLayer(page, want, time, parameters);
        // While the pages are spheres, one that is a bubble and stays one is the raft's: not drawn here.
        const raft = !pageObjects && state.from === 0 && state.to === 0;
        if (page < MAX_TRACKED) pageExtent[page] = raft ? 1 : parameters.size * Math.max(outline[state.from]!, outline[state.to]!);
        if (raft) continue;
        flowFrom = state.from;
        flowTo = state.to;
        ({ shape, melt } = envelope((time - state.start) / parameters.duration, parameters));
      }
      const slot = drawn;
      const to = slot * INSTANCE_FLOATS;
      data.set(bubbles.subarray(from, from + BUBBLE_FLOATS), to);
      for (let near = 0; near < NEIGHBOURS; near += 1) {
        const other = nearIds[index * NEIGHBOURS + near]!;
        const at = to + (near + 1) * BUBBLE_FLOATS;
        if (other < 0) data.fill(0, at, at + BUBBLE_FLOATS);
        else data.set(bubbles.subarray(other * BUBBLE_FLOATS, (other + 1) * BUBBLE_FLOATS), at);
      }
      // Its turn: none, its own fixed one (from its seed), or where it is heading.
      const spin = seed * 97.13;
      let turn = facing === 1 ? (spin - Math.floor(spin)) * Math.PI * 2 : facing === 2 ? headingOf[index]! : 0;
      // Heads stay near upright, leaning a little the way they head, eased in and out with the morph into or out of a head.
      const s = Math.min(1, Math.max(0, shape));
      const keep = upright[flowFrom]! * (1 - s) + upright[flowTo]! * s;
      if (keep > 0) {
        const lean = Math.sin(turn) * 0.175;
        turn = Math.atan2((1 - keep) * Math.sin(turn) + keep * Math.sin(lean), (1 - keep) * Math.cos(turn) + keep * Math.cos(lean));
      }
      // A page turns towards that, never in one frame: a heading that swings round, a morph into a head, a change of 각도.
      if (index >= pageStartIndex && page < MAX_TRACKED) {
        const was = pageTurn[page]!;
        const spin = pageSpin[page]! + (TURN_SPRING * TURN_SPRING * Math.atan2(Math.sin(turn - was), Math.cos(turn - was)) - 2 * TURN_DAMPING * TURN_SPRING * pageSpin[page]!) * dt;
        turn = was + spin * dt;
        pageSpin[page] = spin;
        pageTurn[page] = turn;
      }
      write(slot, flowFrom, flowTo, shape, melt, turn, frame.tints, page, parameters.brand, parameters.size);
      drawn += 1;
    }
    plan(time, parameters);
    if (drawn === 0) return;
    begin(parameters, time);
    finish(drawn);
  };

  const drawLab: ObjectPass["drawLab"] = (lab, parameters) => {
    const u = lab.scrub ?? (lab.time - lab.morph.start) / parameters.duration;
    const { shape, melt } = envelope(u, parameters);
    data.fill(0, 0, INSTANCE_FLOATS);
    data[0] = lab.x;
    data[1] = lab.y;
    data[2] = lab.radius;
    data[3] = 0.37;
    write(0, lab.morph.from, lab.morph.to, shape, melt, lab.turn, null, -1, parameters.brand, parameters.size);
    plan(lab.time, parameters);
    begin(parameters, lab.time);
    finish(1);
  };

  const dispose = () => {
    disposed = true;
    for (const worker of workers) worker.terminate();
    gl.deleteBuffer(corners);
    gl.deleteBuffer(instances);
    gl.deleteVertexArray(vao);
    for (const texture of textures) gl.deleteTexture(texture);
    gl.deleteProgram(program);
  };

  return { draw, drawLab, ready, pageExtent, dispose };
}
