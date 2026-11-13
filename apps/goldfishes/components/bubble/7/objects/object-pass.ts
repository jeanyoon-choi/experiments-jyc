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

import { BUBBLE_FLOATS, SHADING, type FoamRenderer } from "../render/foam";
import { FIELD_EXTENT, FIELD_SIZE, fieldOf, MEMBRANE_SIZE, type Field } from "./fields";
import type { FieldRequest } from "./field-worker";
import type { Liquid } from "./liquid";
import { envelope, FIELD_KINDS, layerOf, passage, retarget, type Morph } from "./morph";
import { pageKind, pageSet, portionKind, type ObjectKind, type ObjectParameters } from "./objects";

/** Neighbours each object mirrors, nearest first. */
const NEIGHBOURS = 4;
/**
 * Per instance: its bubble, its neighbours', then (turn, from layer, to layer, shape), (melt, −, −, −) and
 * its tint (rgb, amount: 전파).
 */
const INSTANCE_FLOATS = BUBBLE_FLOATS * (1 + NEIGHBOURS) + 12;
const LAYERS = FIELD_KINDS.length;
/** Pages tracked for their morphs. */
const MAX_TRACKED = 4096;

const VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 2) in vec4 bubble;  // x, y, radius, seed
layout(location = 3) in vec4 near0;   // its neighbours, as bubbles (radius 0: none)
layout(location = 4) in vec4 near1;
layout(location = 5) in vec4 near2;
layout(location = 6) in vec4 near3;
layout(location = 7) in vec4 turning; // its turn in the screen's plane (radians), the layers it flows from and to, how far
layout(location = 8) in vec4 morph;   // x: how melted, 0–1; y: half the square it is drawn in (object units)
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
uniform sampler2DArray fields;
uniform sampler2DArray membranes;
uniform float size;
uniform float puff;
uniform float time;
uniform float soften;
uniform float wobble;
uniform float ripple;
uniform float swell;
uniform float mercury;
out vec4 pixel;
${SHADING}

const float TEXEL = ${((2 * FIELD_EXTENT) / FIELD_SIZE).toFixed(6)};

vec4 fieldAt(vec2 p, float layer, float lod) {
  return textureLod(fields, vec3(p / ${(2 * FIELD_EXTENT).toFixed(2)} + 0.5, layer), lod);
}

// The drop's membrane height, blended between the two fields' membranes.
float membraneAt(vec2 p, float lod) {
  vec2 uv = p / ${(2 * FIELD_EXTENT).toFixed(2)} + 0.5;
  float m = max(0.0, lod - 2.0);
  return mix(textureLod(membranes, vec3(uv, flow.x), m).r, textureLod(membranes, vec3(uv, flow.y), m).r, clamp(flow.z, 0.0, 1.0));
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
    // Ripples running in from the edge.
    float wave = -s * 26.0 - time * 7.0 + seed * 40.0;
    float swing = ripple * 0.025 * melt * smoothstep(0.0, 0.08, d);
    lh += swing * sin(wave);
    grad += inward * swing * 26.0 * cos(wave);
    vec3 nl = normalize(vec3(-grad, 1.0));
    float liquid = smoothstep(0.0, 0.55, melt);
    h = mix(h, lh, melt);
    n = normalize(mix(n, nl, liquid));
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
  vec3 coat = mix(coatOf(seed), colouring.rgb, colouring.a);
  coat = mix(coat, vec3(0.86, 0.87, 0.88), bare);
  vec3 colour = liquidSurfaceOf(o, wn, facing, coat, reflected, reflectedClear, mix(metalness, 1.0, bare));
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
  /** Per page: the kind 전파 has given it, or −1 (its own). */
  caught: Int8Array | null;
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
    fields: uniform("fields"),
    membranes: uniform("membranes"),
    soften: uniform("soften"),
    wobble: uniform("wobble"),
    ripple: uniform("ripple"),
    swell: uniform("swell"),
    mercury: uniform("mercury"),
  };

  // The fields: one layer per kind, the bubble first; mipmapped, so a melt can wash details out.
  const fields = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, fields);
  const levels = Math.floor(Math.log2(FIELD_SIZE)) + 1;
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.RGBA16F, FIELD_SIZE, FIELD_SIZE, LAYERS);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const membranes = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, membranes);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.floor(Math.log2(MEMBRANE_SIZE)) + 1, gl.R16F, MEMBRANE_SIZE, MEMBRANE_SIZE, LAYERS);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const baked = new Array<boolean>(LAYERS).fill(false);
  /** Per layer, how far its outline reaches (the bubble's until it is baked). */
  const reach = new Float32Array(LAYERS).fill(1.05);
  const upload = (layer: number, field: Field) => {
    baked[layer] = true;
    reach[layer] = field.reach;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, fields);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, FIELD_SIZE, FIELD_SIZE, 1, gl.RGBA, gl.FLOAT, field.data);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, membranes);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, MEMBRANE_SIZE, MEMBRANE_SIZE, 1, gl.RED, gl.FLOAT, field.membrane);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  };
  // The bubble at once (exact, a few milliseconds): every kind is drawn as it until its own field is ready.
  upload(0, fieldOf("bubble"));
  // Every other kind baked off the main thread, a few at a time (field-worker.ts).
  const workers: Worker[] = [];
  const queue = FIELD_KINDS.map((kind, layer) => ({ kind, layer })).slice(1);
  const workerCount = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
  let disposed = false;
  const next = (worker: Worker) => {
    const job = queue.shift();
    if (job) worker.postMessage(job satisfies FieldRequest);
    else worker.terminate();
  };
  for (let index = 0; index < workerCount; index += 1) {
    const worker = new Worker(new URL("./field-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ layer: number; field: Field }>) => {
      if (disposed) return;
      upload(event.data.layer, event.data.field);
      next(worker);
    };
    workers.push(worker);
    next(worker);
  }
  const ready = (layer: number) => baked[layer]!;
  const shown = (layer: number) => (ready(layer) ? layer : 0);

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

  /** Writes one instance's morph, turn and tint (its bubble and neighbours are written first). */
  const write = (slot: number, flowFrom: number, flowTo: number, shape: number, melt: number, turn: number, tints: Float32Array | null, tintPage: number) => {
    const to = slot * INSTANCE_FLOATS;
    const tail = to + (NEIGHBOURS + 1) * BUBBLE_FLOATS;
    data[tail] = turn;
    data[tail + 1] = shown(flowFrom);
    data[tail + 2] = shown(flowTo);
    data[tail + 3] = shape;
    data[tail + 4] = melt;
    // The square: both outlines, and room for the melt's sway and the spring's overshoot.
    const fromReach = reach[shown(flowFrom)]!;
    const toReach = reach[shown(flowTo)]!;
    const loose = melt > 0 || shape < 0 || shape > 1 ? 0.22 + Math.max(0, shape - 1, -shape) * Math.abs(toReach - fromReach) : 0;
    data[tail + 5] = Math.min(FIELD_EXTENT, Math.max(fromReach, toReach) + loose);
    if (tints && tintPage >= 0) data.set(tints.subarray(tintPage * 4, tintPage * 4 + 4), tail + 8);
    else data.fill(0, tail + 8, tail + 12);
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
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, fields);
    gl.uniform1i(at.fields, 8);
    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, membranes);
    gl.uniform1i(at.membranes, 9);
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
    const pageObjects = pageSet(parameters) !== null;
    /** The layer a page should be now: its 전파 kind, or its own (변신 included). */
    const wantOf = (page: number) => {
      const kind: ObjectKind | null = caught && caught[page]! >= 0 ? (FIELD_KINDS[caught[page]!] as ObjectKind) : pageKind(page, parameters, time);
      return layerOf(kind);
    };
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
        if (!pageObjects && state.from === 0 && state.to === 0) continue;
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
      const turn = facing === 1 ? (spin - Math.floor(spin)) * Math.PI * 2 : facing === 2 ? headingOf[index]! : 0;
      write(slot, flowFrom, flowTo, shape, melt, turn, frame.tints, page);
      drawn += 1;
    }
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
    write(0, lab.morph.from, lab.morph.to, shape, melt, lab.turn, null, -1);
    begin(parameters, lab.time);
    finish(1);
  };

  const dispose = () => {
    disposed = true;
    for (const worker of workers) worker.terminate();
    gl.deleteBuffer(corners);
    gl.deleteBuffer(instances);
    gl.deleteVertexArray(vao);
    gl.deleteTexture(fields);
    gl.deleteTexture(membranes);
    gl.deleteProgram(program);
  };

  return { draw, drawLab, ready, dispose };
}
