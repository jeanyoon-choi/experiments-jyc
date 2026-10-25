// Rank as a raft of coated spheres. Every page is a bubble whose area is its
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
// around itself (and, when the ground reacts, its halo there) twice with
// depth testing on f: the first pass keeps each pixel's bubble, the second
// the next one. The composite, at full resolution, recomputes both exactly
// and shades each bubble as a sphere. No meshes: the sphere's normal comes
// from its disc, and reflected rays are traced analytically against the
// neighbouring spheres.
//
// The parameters are those of a physically based material and its
// surroundings (three.js MeshPhysicalMaterial and an environment map have
// the same ones), so a look carries over if the spheres become 3D objects:
// the coat's colour, metalness, roughness and clear coat; a photographed
// room (CC0 HDRI) and a key light, turned together; the ground the spheres
// rest on, of the background's colour, reflected below the horizon; and the
// camera's tilt, from straight above (the horizon runs round every rim: the
// spheres float in a tank) to the side (bubble/2: the horizon crosses them).
// Nothing persists between frames.

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

// How far (CSS px) past its own radius a bubble is drawn: its anti-aliased
// edge and, when the ground reacts (groundHalo 1), its halo there. The same
// in every program.
const HALO = /* glsl */ `
uniform float groundHalo;
float haloOf(float r) {
  return 2.0 + groundHalo * min(1.2 * r + 4.0, 160.0);
}
`;

const SPLAT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
out vec2 local;
flat out vec4 disc;
${HALO}
void main() {
  float extent = bubble.z + haloOf(bubble.z);
  local = (corner * 2.0 - 1.0) * extent;
  // Its index (from 1) travels with it, so the composite can look up its data.
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
${HALO}
void main() {
  float f = dot(local, local) / disc.z - disc.z;
  if (length(local) > disc.z + haloOf(disc.z)) discard;
  if (second) {
    vec4 found = texelFetch(first, ivec2(gl_FragCoord.xy), 0);
    if (found.z > 0.0 && distance(found.xy, disc.xy) < 1e-3 && abs(found.z - disc.z) < 1e-3) discard;
  }
  gl_FragDepth = clamp((f + 8192.0) / 16384.0, 0.0, 1.0);
  result = disc;
}
`;

// A sphere's coat: chosen, its hue drifting a little by 구슬마다 차이. (Uses hash.)
const COAT = /* glsl */ `
uniform vec3 coating;                 // the coat's colour
uniform float coatingMix;             // 1: each sphere takes one of five coats instead
uniform float variety;                // each sphere a little its own: its turn to the light, roughness, hue
// Five coats for 섞음: magenta, yellow, blue, orange, red.
vec3 mixedCoat(float pick) {
  if (pick < 0.2) return vec3(0.92, 0.1, 0.48);
  if (pick < 0.4) return vec3(1.0, 0.78, 0.1);
  if (pick < 0.6) return vec3(0.08, 0.26, 0.95);
  if (pick < 0.8) return vec3(1.0, 0.4, 0.06);
  return vec3(0.95, 0.07, 0.08);
}
vec3 coatOf(float seed) {
  vec3 coat = coatingMix > 0.5 ? mixedCoat(fract(seed * 7.31)) : coating;
  // A slight drift of hue and depth, as between batches of paint.
  float drift = 0.1 * variety * (hash(vec3(seed * 19.7, 5.1, 1.3)) - 0.5);
  float depth = 1.0 + 0.25 * variety * (hash(vec3(seed * 41.3, 2.7, 6.1)) - 0.5);
  coat = pow(max(coat, vec3(0.0)), vec3(depth));
  return max(coat + drift * (coat.gbr - coat.brg), vec3(0.0));
}
`;

// The ground round the spheres (when it reacts), drawn per sphere into two
// low-resolution targets and read back filtered, so every sphere around
// counts and nothing steps where the nearest sphere changes. Both fall off
// smoothly with the distance in radii, as a sphere's occlusion of the light
// over the ground does, so a large sphere shades further and a bead barely
// at all; there is no ring or band. First target: the colour weights' sum
// and the shade (the darkest wins), the shade's centre a little away from
// the key. Second: each sphere's colour by how near it is (adds), and the
// nearest's weight (the largest wins).
const SHADOW_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
out vec2 local;
flat out float radius;
flat out float seed;
${HALO}
void main() {
  float extent = bubble.z + haloOf(bubble.z);
  local = (corner * 2.0 - 1.0) * extent;
  radius = bubble.z;
  seed = bubble.w;
  vec2 clip = (bubble.xy + local) / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const SHADOW_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in float radius;
flat in float seed;
uniform vec3 keyScreen;               // towards the key light, on screen (z towards the camera)
layout(location = 0) out vec4 field;
layout(location = 1) out vec4 tint;
${HALO}
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
${COAT}
void main() {
  vec2 keyFlat = normalize(keyScreen.xy + vec2(1e-4, 0.0));
  float rho = max(length(local), 1e-3);
  float halo = haloOf(radius);
  if (rho - radius > halo) discard;
  // Fading out before the drawn circle's edge.
  float fade = 1.0 - smoothstep(0.7 * halo, halo, max(rho - radius, 0.0));
  // The light the sphere hides from the ground: about (r / distance)^4,
  // centred a little away from the key (further for a lower key).
  vec2 centre = -keyFlat * radius * 0.35 * (1.0 - keyScreen.z);
  float shade = 0.5 * pow(radius / max(length(local - centre), radius), 4.0) * fade;
  // Colour bounced onto the ground only right beside the sphere.
  float near = pow(radius / max(rho, radius), 10.0) * fade;
  field = vec4(0.0, 0.0, near, shade);
  tint = vec4(coatOf(seed) * near, near);
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
`;

const SPHERE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform highp sampler2D first;
uniform highp sampler2D second;
uniform float cssPerPixel;            // one device pixel, in CSS px
uniform highp sampler2D bubbleData;   // per bubble: x, y, radius, seed
uniform highp sampler2D neighbours;   // per bubble: indices (from 1) of the bubbles it overlaps
uniform sampler2D liquidField;        // round the spheres: meniscus slope, colour weights, shade (SHADOW_FRAGMENT)
uniform sampler2D liquidTint;         // round the spheres: their colours by nearness, the nearest's weight
out vec4 pixel;
${HALO}
${SHADING}

vec4 bubbleAt(float index) {
  int i = int(index) - 1;
  return texelFetch(bubbleData, ivec2(i % ${ROW}, i / ${ROW}), 0);
}

float own(vec4 b, vec2 p) {
  if (b.z <= 0.0) return 1e9;
  vec2 d = p - b.xy;
  return dot(d, d) / b.z - b.z;
}

void main() {
  setUpWorld();
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
  // Open ground: nothing else to compute.
  if (count == 0) {
    pixel = vec4(background, 1.0);
    gl_FragDepth = 1.0;
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
  float rr = max(a.z, 1e-3);
  float seedRaw = bubbleAt(a.w).w;
  vec3 coat = coatOf(seedRaw);

  // The ground round the sphere (only where some of this pixel is ground).
  float cover = clamp(toFace / cssPerPixel + 0.5, 0.0, 1.0);
  vec3 ground = background;
  if (cover < 1.0 && groundHalo > 0.5) {
    vec4 field = texture(liquidField, uv);
    vec4 near = texture(liquidTint, uv);
    ground *= 1.0 - edgeShadow * field.w;
    // The spheres' colour, bounced onto the ground next to them.
    vec3 nearCoat = near.rgb / max(field.z, 1e-3);
    ground = mix(ground, ground * mix(vec3(1.0), nearCoat * 1.6 + 0.08, 0.6), colourBleed * near.a);
  }
  if (cover <= 0.0) {
    pixel = vec4(ground, 1.0);
    gl_FragDepth = 1.0;
    return;
  }

  // The sphere: round to its edge; where it presses against a neighbour the
  // two meet in one narrow dark seam, turned down only over the last few
  // pixels so the seam is smooth at any size.
  vec2 out2 = da / rr;
  vec3 round3 = vec3(out2, sqrt(max(1.0 - dot(out2, out2), 0.0)));
  float seamWidth = (min(0.05 * rr, 4.0) + 1.0) * mix(0.5, 1.6, crease);
  float riseM = clamp(toEdge / seamWidth, 0.0, 1.0);
  float hM = sqrt(max(1.0 - (1.0 - riseM) * (1.0 - riseM), 0.0));
  vec3 pinched = normalize(vec3(-min((1.0 - riseM) / max(hM, 0.05), 20.0) * edgeGradient, 1.0));
  float atWall = toWall < toFace ? 1.0 - riseM : 0.0;
  vec3 n = normalize(mix(round3, pinched, atWall * atWall * (3.0 - 2.0 * atWall)));
  float facing = clamp(n.z, 0.0, 1.0);
  vec3 dir = normalize(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
  mat3 turn = turnOf(seedRaw);
  float rough = clamp(roughness * (1.0 + 0.6 * variety * (hash(vec3(seedRaw * 61.3, 5.5, 8.8)) - 0.5)), 0.0, 1.0);
  // The reflected ray, traced against the neighbouring spheres (centres on
  // one plane, the surface point raised by the sphere's own curvature). A
  // hit shows that sphere — its coat, its own reflection — darkened deep in
  // the seam, where light barely reaches.
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
  vec2 half2 = frame * 0.5;
  vec3 o = toWorld(vec3(from.xy - half2, from.z));
  vec3 wn = turn * toWorld(n);
  vec3 reflected = envAt(o, turn * toWorld(dir), rough);
  vec3 reflectedClear = clearcoat > 0.0 ? envAt(o, turn * toWorld(dir), rough * 0.3) : reflected;
  if (nearest < 1e8) {
    vec3 at = from + dir * nearest;
    vec3 n2 = normalize(at - vec3(hit.xy, 0.0));
    vec3 o2 = toWorld(vec3(at.xy - half2, at.z));
    vec3 seen = envAt(o2, turn * toWorld(reflect(dir, n2)), rough);
    // Seen through its own coat as well; the second tint is softened (a hue
    // that drifts red reads as a different colour, not as depth).
    vec3 other = surfaceOf(o2, turn * toWorld(n2), abs(dot(dir, n2)), sqrt(coatOf(hit.w)), seen, seen) * mix(0.55, 1.0, smoothstep(0.0, 0.35 * rr, nearest));
    // A rough surface blurs its neighbours away with the rest of what it reflects.
    float mirrored = neighbourReflection * (1.0 - smoothstep(0.3, 1.0, rough));
    reflected = mix(reflected, other, mirrored);
    reflectedClear = mix(reflectedClear, other, neighbourReflection * (1.0 - smoothstep(0.3, 1.0, rough * 0.3)));
  }
  vec3 colour = surfaceOf(o, wn, facing, coat, reflected, reflectedClear);
  // Deep in a seam little light arrives at all.
  colour *= mix(mix(0.5, 0.05, crease), 1.0, smoothstep(0.0, 2.5 * seamWidth, toWall));
  vec3 shown = filmic(colour * 1.25 * exposure);
  // A crisp silhouette: anti-aliased over one device pixel.
  pixel = vec4(mix(ground, shown, cover), 1.0);
  // Its height as depth, so what is drawn after in the raft's frame (objects/) passes behind it where it is lower.
  gl_FragDepth = cover >= 0.5 ? 0.5 - from.z / 8192.0 : 1.0;
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
      throw new Error(`bubble/6 shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`bubble/6 program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

/** The photographed rooms (환경), CC0 HDRIs from Poly Haven, shared with bubble/2. */
const LIGHT_FILES = ["photo_studio_loft_hall", "kloofendal_overcast", "studio_small_09", "shanghai_bund", "forest_slope", "lakeside"] as const;

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
const FACE_IMAGE = "/images/0908/tech-power-faces/008.jpg";

export type Colour = readonly [number, number, number];

/** 섞음's five coats (magenta, yellow, blue, orange, red), as the shader's mixedCoat picks them by fract(seed × 7.31). */
export const MIXED_COATS: readonly Colour[] = [
  [0.92, 0.1, 0.48],
  [1, 0.78, 0.1],
  [0.08, 0.26, 0.95],
  [1, 0.4, 0.06],
  [0.95, 0.07, 0.08],
];

/** The renderer's visual parameters; every one is a uniform of the same name (see the shader for each). */
export type Look = {
  lightColour: Colour;
  background: Colour;
  coating: Colour;
  coatingMix: number;
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
};

/** bubble/2's look (its magenta steel in a photographed loft, seen from the side), in these parameters. */
export const LOOK_DEFAULTS: Look = {
  lightColour: [1, 1, 1],
  background: [1, 1, 1],
  coating: [0.92, 0.1, 0.48],
  coatingMix: 0,
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
};

export type FoamRenderer = {
  /** Per bubble: x y radius seed (CSS px; seed in [0, 1)). */
  readonly bubbles: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  /** Draws the bubbles `from` … `bubbleCount` (by default all from the first). */
  render(bubbleCount: number, look?: Look, from?: number): void;
  /** For passes drawn over the raft in its material (objects/): the context, a program from shaders that include SHADING, */
  readonly gl: WebGL2RenderingContext;
  program(vertex: string, fragment: string): WebGLProgram;
  /** the last frame's look set on such a program (in use), and the field in CSS px and the canvas in device pixels. */
  shade(program: WebGLProgram): void;
  size(): { width: number; height: number; pixelWidth: number; pixelHeight: number };
  /** Waits for the GPU to finish the last frame (measurement only). */
  sync(): void;
  dispose(): void;
};

export function createFoamRenderer(canvas: HTMLCanvasElement): FoamRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  const splatProgram = compile(gl, SPLAT_VERTEX, SPLAT_FRAGMENT);
  const shadowProgram = compile(gl, SHADOW_VERTEX, SHADOW_FRAGMENT);
  const sphereProgram = compile(gl, SCREEN_VERTEX, SPHERE_FRAGMENT);
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

  const all = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  const bubbleBuffer = gl.createBuffer();
  const bubbleMesh = gl.createVertexArray();
  gl.bindVertexArray(bubbleMesh);
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bubbleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, all.byteLength, gl.DYNAMIC_DRAW);
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

  // The photographed rooms: fetched when first wanted.
  // 256 × 128 RGBA half floats (see docs/screen/bubble/2.md).
  const lightMap = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, lightMap);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array([0.7, 0.7, 0.7, 1]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  let lightWanted = -1;
  let disposed = false;
  const wantLightMap = (wanted: number) => {
    // The portrait (FACE_ENVIRONMENT) hangs in the studio.
    const mode = wanted === FACE_ENVIRONMENT ? 2 : wanted;
    const file = LIGHT_FILES[Math.min(Math.max(Math.round(mode), 0), LIGHT_FILES.length - 1)]!;
    if (mode === lightWanted) return;
    lightWanted = mode;
    void fetch(`/assets/goldfishes/koons-light/${file}.bin`)
      .then((response) => response.arrayBuffer())
      .then((data) => {
        if (disposed || lightWanted !== mode) return;
        gl.bindTexture(gl.TEXTURE_2D, lightMap);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 256, 128, 0, gl.RGBA, gl.HALF_FLOAT, new Uint16Array(data));
        gl.generateMipmap(gl.TEXTURE_2D);
      })
      .catch(() => {});
  };

  // The portrait, loaded when first wanted (grey until then).
  const faceMap = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, faceMap);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([90, 90, 90, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  let faceAspect = 1;
  let faceWanted = false;
  const wantFace = () => {
    if (faceWanted) return;
    faceWanted = true;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, faceMap);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      faceAspect = image.naturalWidth / Math.max(1, image.naturalHeight);
    };
    image.src = FACE_IMAGE;
  };

  type Layer = { texture: WebGLTexture; target: WebGLFramebuffer };
  const depth = gl.createRenderbuffer();
  const layers = [
    { texture: gl.createTexture(), target: gl.createFramebuffer() },
    { texture: gl.createTexture(), target: gl.createFramebuffer() },
  ] as const satisfies readonly Layer[];
  const shadow = { field: gl.createTexture(), tint: gl.createTexture(), target: gl.createFramebuffer() };
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.target);
    for (const [at, texture] of [shadow.field, shadow.tint].entries()) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, sim.width, sim.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + at, gl.TEXTURE_2D, texture, 0);
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  let lastLook = LOOK_DEFAULTS;
  const render: FoamRenderer["render"] = (bubbleCount, look = LOOK_DEFAULTS, from = 0) => {
    lastLook = look;
    // Only these bubbles, as if they were all there were.
    const bubbles = all.subarray(Math.min(from, bubbleCount) * BUBBLE_FLOATS);
    bubbleCount -= Math.min(from, bubbleCount);
    // The ground reacts (meniscus, shade, colour) only when asked to; otherwise no halos are drawn.
    const groundHalo = look.edgeShadow > 0 || look.colourBleed > 0 ? 1 : 0;
    const keyScreen = keyOnScreen(look.viewTilt, look.lightTurn);
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
    gl.uniform1f(location(splatProgram, "groundHalo"), groundHalo);
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

    // The liquid round the spheres: slopes and colours add, shade and nearness keep the largest.
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.target);
    gl.viewport(0, 0, sim.width, sim.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (count > 0 && groundHalo > 0) {
      gl.useProgram(shadowProgram);
      gl.uniform2f(location(shadowProgram, "frame"), frame.width, frame.height);
      gl.uniform1f(location(shadowProgram, "groundHalo"), groundHalo);
      gl.uniform3f(location(shadowProgram, "keyScreen"), keyScreen[0], keyScreen[1], keyScreen[2]);
      gl.uniform3f(location(shadowProgram, "coating"), look.coating[0], look.coating[1], look.coating[2]);
      gl.uniform1f(location(shadowProgram, "coatingMix"), look.coatingMix);
      gl.uniform1f(location(shadowProgram, "variety"), look.variety);
      gl.enable(gl.BLEND);
      gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(bubbleMesh);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.disable(gl.BLEND);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixels.width, pixels.height);
    // The spheres' heights go to the canvas's depth (ALWAYS: every pixel is written once).
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.clearDepth(1);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(sphereProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layers[0].texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, layers[1].texture);
    gl.uniform1i(location(sphereProgram, "first"), 0);
    gl.uniform1i(location(sphereProgram, "second"), 1);
    gl.uniform2f(location(sphereProgram, "frame"), frame.width, frame.height);
    gl.uniform1f(location(sphereProgram, "cssPerPixel"), frame.width / pixels.width);
    gl.uniform1f(location(sphereProgram, "groundHalo"), groundHalo);
    setLook(sphereProgram, look);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, bubbleData);
    gl.uniform1i(location(sphereProgram, "bubbleData"), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, neighbourData);
    gl.uniform1i(location(sphereProgram, "neighbours"), 3);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, shadow.field);
    gl.uniform1i(location(sphereProgram, "liquidField"), 5);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, shadow.tint);
    gl.uniform1i(location(sphereProgram, "liquidTint"), 6);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.DEPTH_TEST);
  };

  // The look's uniforms and the rooms it reflects, on a program in use that includes SHADING.
  const setLook = (program: WebGLProgram, look: Look) => {
    const keyScreen = keyOnScreen(look.viewTilt, look.lightTurn);
    gl.uniform2f(location(program, "frame"), frame.width, frame.height);
    gl.uniform3f(location(program, "keyScreen"), keyScreen[0], keyScreen[1], keyScreen[2]);
    for (const [name, value] of Object.entries(look)) {
      if (typeof value === "number") gl.uniform1f(location(program, name), value);
      else gl.uniform3f(location(program, name), value[0], value[1], value[2]);
    }
    if (look.photoStrength > 0) wantLightMap(look.photo);
    if (look.photo === FACE_ENVIRONMENT) wantFace();
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, faceMap);
    gl.uniform1i(location(program, "faceMap"), 7);
    gl.uniform1f(location(program, "faceAspect"), faceAspect);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, lightMap);
    gl.uniform1i(location(program, "lightMap"), 4);
  };

  const pixel = new Uint8Array(4);
  const sync: FoamRenderer["sync"] = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  };

  const dispose = () => {
    disposed = true;
    gl.deleteTexture(lightMap);
    gl.deleteTexture(faceMap);
    gl.deleteTexture(bubbleData);
    gl.deleteTexture(neighbourData);
    for (const layer of layers) {
      gl.deleteTexture(layer.texture);
      gl.deleteFramebuffer(layer.target);
    }
    gl.deleteTexture(shadow.field);
    gl.deleteTexture(shadow.tint);
    gl.deleteFramebuffer(shadow.target);
    gl.deleteRenderbuffer(depth);
    for (const buffer of [square, bubbleBuffer]) gl.deleteBuffer(buffer);
    for (const vao of [screen, bubbleMesh]) gl.deleteVertexArray(vao);
    gl.deleteProgram(splatProgram);
    gl.deleteProgram(shadowProgram);
    gl.deleteProgram(sphereProgram);
  };

  return {
    bubbles: all,
    resize,
    render,
    gl,
    program: (vertex, fragment) => compile(gl, vertex, fragment),
    shade: (program) => setLook(program, lastLook),
    size: () => ({ width: frame.width, height: frame.height, pixelWidth: pixels.width, pixelHeight: pixels.height }),
    sync,
    dispose,
  };
}
