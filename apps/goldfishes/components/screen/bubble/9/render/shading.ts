// The material and its surroundings, shared by the raft's spheres (foam.ts)
// and by anything drawn in the same material (objects/): the coat (bubble/7:
// coloured metal or lacquer under a clear coat) or the liquid film (film.ts,
// bubble/8), the photographed room and key light, the ground. Every Look
// parameter is a uniform of the same name, set by FoamRenderer.shade.

import { MATERIAL_DEFAULTS, MATERIAL_GLSL, type MaterialValues } from "./materials";
import { MIX_DEPTH, MIX_HUE, MIX_LIGHTNESS, MIX_SATURATION, MIXED_COAT_GLSL, MIXED_COATS } from "./materials/coats";

// A sphere's coat: chosen, its hue drifting a little by 구슬마다 차이. (Uses hash.)
export const COAT = /* glsl */ `
uniform vec3 coating;                 // the coat's colour
uniform float coatingMix;             // 1: each sphere takes one of 섞음's coats instead
uniform float variety;                // each sphere a little its own: its turn to the light, roughness, hue
// 섞음's coats (materials/coats.ts): a palette spread in OKLab, any two far apart.
${MIXED_COAT_GLSL}
vec3 coatOf(float seed) {
  vec3 coat = coatingMix > 0.5 ? mixedCoat(fract(seed * 7.31)) : coating;
  // A slight drift of hue and depth, as between batches of paint.
  float drift = 0.1 * variety * (hash(vec3(seed * 19.7, 5.1, 1.3)) - 0.5);
  float depth = 1.0 + 0.25 * variety * (hash(vec3(seed * 41.3, 2.7, 6.1)) - 0.5);
  coat = pow(max(coat, vec3(0.0)), vec3(depth));
  return max(coat + drift * (coat.gbr - coat.brg), vec3(0.0));
}
`;

// The material and its surroundings, shared by the spheres and by anything
// else drawn in the same material (objects/): every Look parameter is a
// uniform here, set by FoamRenderer.shade. Call setUpWorld() first.
export const SHADING = /* glsl */ `
uniform vec2 frame;                   // CSS px
uniform sampler2D lightMap;           // the photographed room (CC0 HDRI), as a panorama
uniform sampler2D faceMap;            // a portrait (환경 일론 머스크), as the whole environment
uniform float faceAspect;             // its width over its height
uniform vec3 lightColour;             // the light's colour
uniform vec3 background;              // the ground's colour (what the spheres rest in)
uniform float exposure;
// Material
uniform float metalness;              // 0 glossy lacquer (the coat lit) … 1 coloured metal (the coat tints reflections)
uniform float roughness;              // how blurred reflections are
uniform float clearcoat;              // a clear layer, reflecting untinted, most towards the rim
// Light
uniform float viewTilt;               // 0 the camera straight above … 1 from the side (bubble/2)
uniform float lightTurn;              // turns the photographed room and the key together, 0–1
uniform float photo;                  // which photographed room
uniform float photoStrength;
uniform float keyStrength;            // the key light: a softbox far brighter than the room
uniform float keySize;                // 0 small and crisp … 1 large and soft
uniform float shadowLift;             // light everywhere, lifting the dark parts
// Ground
uniform float groundLight;            // the ground's brightness, as reflected below the horizon
uniform float edgeShadow;             // the spheres' shade on the ground and in their own rims; 0 none
uniform float colourBleed;            // the spheres' colour on the ground next to them
// Raft
uniform float neighbourReflection;    // how much each sphere mirrors its neighbours
uniform float crease;                 // how deep and dark the seams between spheres are
uniform vec3 keyScreen;               // towards the key, on screen (from viewTilt and lightTurn)

// The world's frame on screen (y down, z towards the camera): right, north
// and up, tilted from straight above (up towards the camera) to the side
// (up towards the top of the screen).
vec3 worldRight;
vec3 worldNorth;
vec3 worldUp;
vec3 keyWorld;
// The room is finite: the key hangs at a distance and the photographed room
// is a sphere round the raft, so each sphere sees them from where it is, its
// highlight and reflection a little different from its neighbours'.
float roomRadius;
vec3 keyAt;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

${COAT}

// A sphere's own turn to the light (구슬마다 차이), as bubble/2's lobes were
// turned: yaw about up, tip and roll.
mat3 turnOf(float seed) {
  float yaw = (hash(vec3(seed * 17.3, 8.1, 5.3)) - 0.5) * 2.4 * variety;
  float tip = (hash(vec3(seed * 87.1, 3.3, 4.4)) - 0.5) * 0.7 * variety;
  float roll = (hash(vec3(seed * 79.3, 4.1, 2.3)) - 0.5) * 1.3 * variety;
  mat3 turnZ = mat3(cos(yaw), sin(yaw), 0.0, -sin(yaw), cos(yaw), 0.0, 0.0, 0.0, 1.0);
  mat3 turnX = mat3(1.0, 0.0, 0.0, 0.0, cos(tip), sin(tip), 0.0, -sin(tip), cos(tip));
  mat3 turnY = mat3(cos(roll), 0.0, -sin(roll), 0.0, 1.0, 0.0, sin(roll), 0.0, cos(roll));
  return turnZ * turnX * turnY;
}

// A softbox: a rounded box across the direction c, hotter in its middle;
// larger is softer.
float softbox(vec3 d, vec3 c, float size, float soft) {
  float facing = dot(d, c);
  if (facing <= 0.05) return 0.0;
  vec3 t1 = normalize(cross(c, vec3(0.0, 0.0, 1.0)) + vec3(1e-4, 0.0, 0.0));
  vec3 t2 = cross(c, t1);
  vec2 q = abs(vec2(dot(d, t1), dot(d, t2)) / facing) / size;
  // Rounded well past a square (a hard square reads as a sticker on every sphere).
  float m = pow(pow(q.x, 2.6) + pow(q.y, 2.6), 1.0 / 2.6);
  return (1.0 - smoothstep(1.0 - 0.7 * soft, 1.0 + soft, m)) * (1.0 - 0.55 * min(m * m, 1.0));
}

// The photographed room in world direction w (z up), at a blur.
vec3 photoAt(vec3 w, float blur) {
  vec2 at = vec2(atan(w.x, w.y) / 6.2831853 + 0.5 + lightTurn, acos(clamp(w.z, -1.0, 1.0)) / 3.1415927);
  vec3 seen = textureLod(lightMap, at, blur).rgb;
  // Towards the poles every azimuth meets; a blurred panorama would pinch
  // there into a point, so it eases into the room's average.
  vec3 average = textureLod(lightMap, vec2(0.5), 8.0).rgb;
  return mix(average, seen, smoothstep(0.0, 0.15 + 0.6 * blur / 7.0, sqrt(max(1.0 - w.z * w.z, 0.0))));
}

// Where a ray from world point o along w meets the room's sphere, as a direction from its middle.
vec3 roomHit(vec3 o, vec3 w) {
  float b = dot(o, w);
  float c = dot(o, o) - roomRadius * roomRadius;
  return (o + w * (-b + sqrt(max(b * b - c, 0.0)))) / roomRadius;
}

vec3 screenOf(vec3 w) {
  return w.x * worldRight + w.y * worldNorth + w.z * worldUp;
}

// The portrait as the whole environment: every reflected direction maps
// onto it as a mirror ball's directions map onto its disc (a sphere map, in
// screen space), so each sphere reflects the face across its whole surface.
vec3 faceAt(vec3 w, float blur) {
  vec3 r = screenOf(w);
  float m = 2.0 * sqrt(r.x * r.x + r.y * r.y + (r.z + 1.0) * (r.z + 1.0));
  vec2 disc = r.xy / max(m, 1e-3);
  // The disc covers the image's full width and its face (a portrait is taller than wide).
  vec2 at = vec2(0.5 + disc.x, 0.42 + disc.y * faceAspect);
  return textureLod(faceMap, clamp(at, vec2(0.0), vec2(1.0)), blur).rgb;
}

// What a sphere's surface at world point o reflects along world direction w
// (z up): the room, the key and, below the horizon, the ground.
vec3 envAt(vec3 o, vec3 w, float rough) {
  vec3 room = vec3(shadowLift * 0.3);
  if (photoStrength > 0.0) {
    room += photoStrength * (photo > 5.5 ? faceAt(w, rough * 6.0) * 1.2 : photoAt(roomHit(o, w), rough * 7.0));
  }
  vec3 key = normalize(keyAt - o);
  float size = mix(0.12, 0.7, keySize);
  float soft = 0.45 + 0.8 * keySize + 1.5 * rough;
  room += keyStrength * 8.0 * softbox(w, key, size * (1.0 + 0.5 * rough), soft);
  room += keyStrength * 0.5 * exp((dot(w, key) - 1.0) / (0.12 + 0.5 * size + 0.3 * rough));
  // The ground: brighter straight down, and darker there in the sphere's own shade.
  float width = 0.08 + 0.6 * rough;
  float below = (1.0 - smoothstep(-width, width, w.z)) * (0.6 + 0.4 * smoothstep(0.0, 1.0, -w.z));
  below *= 1.0 - 0.5 * edgeShadow * smoothstep(0.4, 0.97, -w.z);
  room += groundLight * background * below;
  return lightColour * room;
}

// The light falling on a surface at world point o facing world direction n (for lacquer's body colour).
vec3 irradiance(vec3 o, vec3 n) {
  vec3 light = vec3(shadowLift * 0.3);
  if (photoStrength > 0.0) light += photoStrength * photoAt(n, 7.0);
  light += keyStrength * mix(0.15, 0.6, keySize) * max(dot(n, normalize(keyAt - o)), 0.0);
  light += groundLight * background * 0.5 * max(-n.z, 0.0);
  return lightColour * light;
}

vec3 toWorld(vec3 d) {
  return vec3(dot(d, worldRight), dot(d, worldNorth), dot(d, worldUp));
}

// A filmic curve (ACES, fitted): bright reflections roll into white, dark ones
// keep the coat dense instead of going grey.
vec3 filmic(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// The light leaving a surface (world normal n, cosine to the viewer facing)
// towards the viewer, given what it reflects (reflected) and what its clear
// coat reflects (sharper, reflectedClear).
vec3 surfaceOf(vec3 o, vec3 n, float facing, vec3 coat, vec3 reflected, vec3 reflectedClear) {
  float fresnel = pow(1.0 - facing, 5.0);
  vec3 metal = reflected * coat;
  vec3 lacquer = coat * irradiance(o, n) + reflected * (0.04 + 0.96 * fresnel);
  vec3 body = mix(lacquer, metal, metalness);
  float clear = 0.04 * min(clearcoat * 4.0, 1.0) + 0.96 * clearcoat * fresnel;
  return body * (1.0 - clear) + reflectedClear * clear;
}

void setUpWorld() {
  float tilt = viewTilt * 1.5707963;
  worldRight = vec3(1.0, 0.0, 0.0);
  worldNorth = vec3(0.0, -cos(tilt), -sin(tilt));
  worldUp = vec3(0.0, -sin(tilt), cos(tilt));
  keyWorld = toWorld(keyScreen);
  roomRadius = 1.5 * length(frame);
  keyAt = keyWorld * 0.9 * length(frame);
}
${MATERIAL_GLSL}
`;

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

/** 섞음's coats (materials/coats.ts), as the shader's mixedCoat picks them by fract(seed × 7.31). */
export { MIXED_COATS };
export { mixedCoatOf } from "./materials/coats";

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

