// The renderer's visual parameters — a Look — and how they reach a program: every one is a uniform of the same
// name in SHADING (shading.ts) and the materials (materials/).

import type { Uniforms } from "./gl";
import { MATERIAL_DEFAULTS, type MaterialValues } from "./materials";
import { MIX_DEPTH, MIX_HUE, MIX_LIGHTNESS, MIX_SATURATION } from "./materials/coats";

/** Towards the key light, on screen (y down, z towards the camera): 50° above the horizon, turned by lightTurn, the world tilted by viewTilt. */
export function keyOnScreen(viewTilt: number, lightTurn: number): [number, number, number] {
  const tilt = viewTilt * (Math.PI / 2);
  const turn = lightTurn * Math.PI * 2;
  const elevation = (50 * Math.PI) / 180;
  const right = Math.cos(elevation) * Math.sin(turn);
  const north = Math.cos(elevation) * Math.cos(turn);
  const up = Math.sin(elevation);
  // world right (1, 0, 0), north (0, −cos, −sin), up (0, −sin, cos), on screen
  return [right, -north * Math.cos(tilt) - up * Math.sin(tilt), -north * Math.sin(tilt) + up * Math.cos(tilt)];
}

/** 환경 6: a portrait as the whole environment (a sphere map), from Goldfishes' own tech-power faces. */
export const FACE_ENVIRONMENT = 6;

export type Colour = readonly [number, number, number];

/** The renderer's visual parameters; every one is a uniform of the same name (see the shader for each). */
export type Look = {
  lightColour: Colour;
  background: Colour;
  coating: Colour;
  coatingMix: number;
  /** 섞음's H, S and L (materials/coats.ts mixedCoatOf). */
  mixHue: number;
  mixDepth: number;
  mixSaturation: number;
  mixLightness: number;
  exposure: number;
  metalness: number;
  roughness: number;
  clearcoat: number;
  variety: number;
  viewTilt: number;
  lightTurn: number;
  photo: number;
  photoStrength: number;
  /** 라이브 화면: a live picture hung in the room on the camera's side — its source (live/source.ts LIVE_SOURCES; 0 none), brightness and size. */
  liveScreen: number;
  liveStrength: number;
  liveSize: number;
  keyStrength: number;
  keySize: number;
  shadowLift: number;
  groundLight: number;
  edgeShadow: number;
  colourBleed: number;
  neighbourReflection: number;
  crease: number;
  /** 0 the coat (bubble/7, drawn by the passes); otherwise a material's id (render/materials). */
  material: number;
} & MaterialValues;

/** bubble/2's look (its magenta steel in a photographed loft, seen from the side), in these parameters. */
export const LOOK_DEFAULTS: Look = {
  lightColour: [1, 1, 1],
  background: [1, 1, 1],
  coating: [0.92, 0.1, 0.48],
  coatingMix: 0,
  mixHue: MIX_HUE,
  mixDepth: MIX_DEPTH,
  mixSaturation: MIX_SATURATION,
  mixLightness: MIX_LIGHTNESS,
  exposure: 0.8,
  metalness: 1,
  roughness: 0.29,
  clearcoat: 0.26,
  variety: 1,
  viewTilt: 1,
  lightTurn: 0,
  photo: 0,
  photoStrength: 1,
  liveScreen: 0,
  liveStrength: 2,
  liveSize: 0.4,
  keyStrength: 0,
  keySize: 0.5,
  shadowLift: 0.2,
  groundLight: 0.15,
  edgeShadow: 0,
  colourBleed: 0,
  neighbourReflection: 0.85,
  crease: 0.5,
  // The coat, as bubble/7; every material's uniforms at their own defaults.
  material: 0,
  ...MATERIAL_DEFAULTS,
};

// A Look is replaced, never changed in place (state/schema.ts lookOf; loop/frame-loop.ts keeps one while the panel's
// settings are the same object), so what follows from one is worked out once and a program is told it once.
const keys = new WeakMap<Look, readonly [number, number, number]>();
const applied = new WeakMap<WebGLProgram, Look>();

/** keyOnScreen for a look, worked out the first time it is asked for. */
function keyOf(look: Look) {
  let key = keys.get(look);
  if (!key) keys.set(look, (key = keyOnScreen(look.viewTilt, look.lightTurn)));
  return key;
}

/**
 * The look's uniforms (and keyScreen, which follows from it) on a program in use: all of SHADING's, or the few a
 * program has (a parameter with no uniform there is passed over — 액체's film*, kept in the Look for saved 연출).
 * Uniforms are a program's own state: nothing is sent while the look is the one last set on that program.
 */
export function applyLook(gl: WebGL2RenderingContext, uniforms: Uniforms, program: WebGLProgram, look: Look) {
  if (applied.get(program) === look) return;
  applied.set(program, look);
  const key = keyOf(look);
  gl.uniform3f(uniforms.at(program, "keyScreen"), key[0], key[1], key[2]);
  for (const name in look) {
    const at = uniforms.at(program, name);
    if (at === null) continue;
    const value = look[name as keyof Look];
    if (typeof value === "number") gl.uniform1f(at, value);
    else gl.uniform3f(at, value[0], value[1], value[2]);
  }
}
