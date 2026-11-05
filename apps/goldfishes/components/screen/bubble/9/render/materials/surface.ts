// 재질 (bubble/8, user 2026-11-03): every material other than bubble/7's coat is
// one entry here — 액체, 젤 · 세럼, 석고, 석고 v2, 유리, 맥시멀 믹스 — each in its own file with
// its GLSL, its uniforms' defaults, its sliders and its 연출. The raft's spheres
// (render/foam.ts) and the objects (objects/object-pass.ts) describe the point
// they shade as one Surface and call shadeMaterial(s) (index.ts), so a material
// is written once and draws both. The coat (material 0) stays in the passes, as
// bubble/7 drew it.

import type { Colour } from "../shading";

/** A slider for one of a material's uniforms. */
export type MaterialControl = { key: string; label: string; min: number; max: number; step: number };

/** A material: its id (the `material` uniform), the 재질 it belongs to, its GLSL (uniforms and `call(Surface)`), the
 * defaults of its uniforms, its sliders and its 연출 (each given over bubble/7's studio). */
export type MaterialEntry<Values extends Record<string, number>> = {
  id: number;
  family: string;
  familyLabel: string;
  /** What the colour chips are called under it. */
  colourLabel: string;
  glsl: string;
  /** The GLSL function `vec3 name(Surface s)` returning the displayed colour. */
  call: string;
  defaults: Values;
  controls: readonly MaterialControl[];
  looks: readonly { id: string; label: string; look: Partial<Values> & Record<string, number | Colour> }[];
};

export const SURFACE = /* glsl */ `
uniform float material;               // 0 the coat (bubble/7); otherwise a material's id (render/materials)
uniform float time;                   // seconds, for anything that moves on its own

// The point being shaded, in the frames a material needs.
struct Surface {
  vec3 o;          // world point (z up)
  vec3 n;          // world normal, turned with the object's own turn to the room
  vec3 nS;         // the normal on screen (x right, y down, z towards the camera)
  mat3 turn;       // its own turn to the room (구슬마다 차이): world directions it looks along go through it
  float facing;    // cosine to the camera
  vec3 albedo;     // its colour: the coat, or 전파's strain or a logo's brand over it
  float dyed;      // how much of albedo is a strain's or brand's (0: its own coat)
  float occlusion; // 1 open … 0 deep in a hollow or a seam
  vec3 grainAt;    // a point fixed on it, for texture (moves with it)
  vec2 q;          // where on it, in its own unit disc (an object's field frame; y down)
  mat2 qTurn;      // turns a direction in q's frame onto the screen (objects are turned): add detail slopes to nS through it
  float seed;      // its own number, 0–1
  float radius;    // its size, CSS px
  float edge;      // CSS px to its outline or the nearest wall
  float relief;    // its height over the ground, 0 at the outline … about 1 at its highest
  vec3 behind;     // the ground as shown behind it
  float melt;      // a morph's melt, 0–1
};

// What it mirrors along its reflection, at a blur (0 sharp … 1 blurred away).
vec3 mirrorOf(Surface s, float rough) {
  vec3 d = normalize(2.0 * s.nS.z * s.nS - vec3(0.0, 0.0, 1.0));
  return envAt(s.o, s.turn * toWorld(d), rough);
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm2(vec3 x) {
  return 0.5 * noise(x) + 0.25 * noise(x * 2.03 + vec3(1.7, 9.2, 3.1));
}
float fbm3(vec3 x) {
  return 0.5 * noise(x) + 0.25 * noise(x * 2.03 + vec3(1.7, 9.2, 3.1)) + 0.125 * noise(x * 4.12 + vec3(5.1, 2.3, 7.7));
}
`;
