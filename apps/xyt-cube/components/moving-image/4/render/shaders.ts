// Full-screen passes for moving-image/3. The GLSL `cubeAt`, `sliceAt` and the
// loop mirror ../model/geometry.ts (tested there); keep them in step.
//
//   slice  the screen: the flat plane Z = present through the (turned or
//          bent) cube, seen head-on. Each pixel s shows the cube point
//          sliceAt(s) at its own continuous time.
//   solid  the cube drawn in its space from a fixed three-quarter view, the
//          half in front of the present removed (as in moving-image/2).
//   ycbcr  writes one decoded video frame into a Y layer and a half-size
//          CbCr layer (BT.709, full range).
//
// The medium. Frames are layers of 2D arrays (Y, CbCr); between them lives a
// low-resolution flow layer (forward F01 and backward F10, see
// scripts/build-cube-flow.py). A time f between frames i and i + 1 (α = f − i)
// is a picture of its own: both neighbours are warped along the flow to time
// α (backward warping, the position found by fixed-point iteration
// p = x − α·F01(p)) and blended (1 − α, α), each side weighted down where its
// fixed point does not converge (occlusions, unreliable flow). At α = 0 or 1
// it is exactly the frame, so time is continuous everywhere: no nearest-frame
// switch, no per-quad derivative switch, no comb. The loop's last frames
// cross-fade into its first (no cut), each shot cut becomes a short dissolve
// (../model/geometry.ts cutWindows); the frame's x, y border is antialiased
// over one screen pixel using the slice's analytic derivative.
//
// `liquid` = 0 reproduces moving-image/2's sampling for comparison: nearest
// frame when flat, a linear cross-fade (weighted by fwidth) where the slice
// crosses time, a hard loop cut and hard borders.

export const LIQUID_VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;

uniform sampler2DArray lumaFrames;    // R: Y
uniform sampler2DArray chromaFrames;  // RG: Cb, Cr (half size)
uniform sampler2DArray flowLayers;    // RGBA: F01.xy, F10.xy (companded)
uniform highp sampler2D cutWindows;   // per frame interval: from, to, before, after (from < 0: none)
uniform float frames;
uniform float loaded;       // frames written so far
uniform float flowLoaded;   // flow layers written so far
uniform vec2 frameSize;     // px
uniform vec2 flowCode;      // range (px), companding power
uniform vec2 loop;          // period, seam (frame intervals)
uniform float liquid;       // 1 flow-interpolated medium, 0 moving-image/2's sampling
uniform vec3 box;           // box half sizes, frame heights
uniform int operation;      // 0 none, 1 shear, 2 cylinder, 3 sphere, 4 curvature, 5 torus, 6 moebius
uniform vec2 amount;
uniform vec2 tilt;          // the plane's turn about y, then x (radians)
uniform float present;      // the present's depth on the undeformed cube
uniform vec4 viewport;      // x, y, width, height in device px
uniform sampler2DArray nearLuma;    // the live window: Y of the original frames near the present
uniform sampler2DArray nearChroma;  //   and their half-size CbCr
uniform float nearTimes[40];        // clip times (s) in ascending order; < -1e8: empty (at the end)
uniform float nearSlots[40];        // the slot (texture layer) of each sorted time
uniform float nearCount;            // filled entries
uniform float fps;                  // the cube's frames per clip second

out vec4 colour;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float EPSILON = 1e-4;
const vec3 NOWHERE = vec3(1e4);

float wrapAngle(float value) {
  return value - TAU * floor((value + PI) / TAU);
}

vec2 turn2(float angle, vec2 v) {
  float c = cos(angle), s = sin(angle);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

const float MOEBIUS_RING = 0.5;

/** R = Ry(tilt.x)·Rx(tilt.y) applied to v, and its inverse. */
vec3 tiltTurn(vec3 v) {
  float cb = cos(tilt.y), sb = sin(tilt.y), ca = cos(tilt.x), sa = sin(tilt.x);
  float y = v.y * cb - v.z * sb;
  float z = v.y * sb + v.z * cb;
  return vec3(v.x * ca + z * sa, y, -v.x * sa + z * ca);
}

vec3 tiltUnturn(vec3 v) {
  float cb = cos(tilt.y), sb = sin(tilt.y), ca = cos(tilt.x), sa = sin(tilt.x);
  float x = v.x * ca - v.z * sa;
  float z0 = v.x * sa + v.z * ca;
  return vec3(x, v.y * cb + z0 * sb, -v.y * sb + z0 * cb);
}

/** The tilt as a turn of the space about the present's centre. */
vec3 tiltPoint(vec3 P) {
  return tiltTurn(P - vec3(0.0, 0.0, present)) + vec3(0.0, 0.0, present);
}

vec3 cubeAt(vec3 P) {
  float a = amount.x;
  float b = amount.y;
  if (operation == 0) return P;
  if (operation == 6) {
    // The cube as a Möbius ring: t bent into a circle about an axis at
    // x = −R_m, the frame turned by φ = a·π·t/depth on the way round.
    if (a < EPSILON) return P;
    float depth = 2.0 * box.z;
    float k = TAU * MOEBIUS_RING / depth;
    float stretch = 1.0 + a * (k - 1.0);
    float ringRadius = MOEBIUS_RING / a;
    float qx = P.x + ringRadius;
    float theta = atan(P.z, qx);
    float rho = length(vec2(qx, P.z)) - ringRadius;
    float t = ringRadius * theta / stretch;
    if (abs(t) > box.z + 1e-6) return NOWHERE;
    float phi = a * PI * t / depth;
    float c = cos(phi);
    float s = sin(phi);
    return vec3(rho * c + P.y * s, -rho * s + P.y * c, t);
  }
  if (operation == 1) {
    return vec3(P.xy, P.z + a * P.x + b * P.y);
  }
  if (operation == 2) {
    float k = length(amount);
    if (k < EPSILON) return P;
    vec2 n = amount / k;
    float u = dot(P.xy, n);
    float v = -P.x * n.y + P.y * n.x;
    float rho0 = 1.0 / k + abs(n.x) * box.x + abs(n.y) * box.y;
    float cu = length(vec2(u + rho0, P.z)) - rho0;
    float ct = rho0 * atan(P.z, u + rho0);
    return vec3(cu * n.x - v * n.y, cu * n.y + v * n.x, ct);
  }
  if (operation == 3) {
    if (abs(a) < EPSILON) return P;
    float rho0 = 1.0 / abs(a) + box.z;
    float s = sign(a);
    float qz = s * P.z + rho0;
    float rho = length(vec3(P.xy, qz));
    return vec3(rho0 * atan(P.x, qz), rho0 * atan(P.y, qz), s * (rho - rho0));
  }
  if (operation == 4) {
    if (abs(a) < EPSILON) return P;
    float rho = inversesqrt(abs(a));
    float r = length(P);
    if (r < 1e-7) return P;
    float D;
    if (a > 0.0) D = rho * atan(r / rho);
    else if (r < rho) D = rho * atanh(r / rho);
    else return NOWHERE;
    return P * (D / r);
  }
  if (operation == 5) {
    vec2 L = 2.0 * box.xz;
    float alpha = TAU * P.x / L.x;
    float tau = TAU * P.z / L.y;
    vec4 w = vec4(cos(alpha), sin(alpha), cos(tau), sin(tau));
    float c1 = cos(a), s1 = sin(a), c2 = cos(b), s2 = sin(b);
    vec4 r = vec4(c1 * w.x - s1 * w.z, c2 * w.y - s2 * w.w, s1 * w.x + c1 * w.z, s2 * w.y + c2 * w.w);
    float alphaOut = alpha + wrapAngle(atan(r.y, r.x) - alpha);
    float tauOut = tau + wrapAngle(atan(r.w, r.z) - tau);
    return vec3(alphaOut * L.x / TAU, P.y, tauOut * L.y / TAU);
  }
  return P;
}

/** The cube point the screen shows at s while the present is at depth z. */
vec3 sliceAt(vec2 s, float z) {
  float K = amount.x;
  if (operation != 4 || abs(K) < EPSILON) return cubeAt(vec3(s, z));
  float rho = inversesqrt(abs(K));
  float sigma = length(s);
  vec2 u = sigma > 1e-7 ? s / sigma : vec2(0.0);
  float D;
  vec3 q;
  if (K > 0.0) {
    D = rho * acos(clamp(cos(sigma / rho) * cos(z / rho), -1.0, 1.0));
    q = vec3(rho * sin(sigma / rho) * u, rho * cos(sigma / rho) * sin(z / rho));
  } else {
    D = rho * acosh(cosh(sigma / rho) * cosh(z / rho));
    q = vec3(rho * sinh(sigma / rho) * u, rho * cosh(sigma / rho) * sinh(z / rho));
  }
  float qLength = length(q);
  return qLength < 1e-7 ? vec3(0.0) : q * (D / qLength);
}

/** The (possibly tilted) screen at s; curvature's screen is turned in cube coordinates. */
vec3 sliceTotal(vec2 s) {
  if (operation == 4) {
    vec3 c = sliceAt(s, present);
    return c.x > 1e3 ? c : tiltPoint(c);
  }
  return cubeAt(tiltPoint(vec3(s, present)));
}

/** The cube point at place P of the space the solid view draws (the plane is Z = present). */
vec3 cubeTotal(vec3 P) {
  if (operation == 4) {
    vec3 c = cubeAt(P);
    return c.x > 1e3 ? c : tiltPoint(c);
  }
  return cubeAt(tiltPoint(P));
}

// --- the medium -------------------------------------------------------------

/** Y, Cb, Cr of frame 'layer' at p (px, row 0 = top). */
vec3 frameAt(vec2 p, float layer) {
  vec3 uv = vec3(p / frameSize, layer);
  return vec3(texture(lumaFrames, uv).r, texture(chromaFrames, uv).rg);
}

/** F01.xy, F10.xy (px) of flow layer 'layer' at p (px). */
vec4 flowAt(vec2 p, float layer) {
  vec4 s = texture(flowLayers, vec3(p / frameSize, layer)) * (255.0 / 127.5) - 1.0;
  return sign(s) * pow(abs(s), vec4(flowCode.y)) * flowCode.x;
}

/** The picture at clip time f (frame index, continuous) and position p (px). */
vec3 pictureAt(vec2 p, float f) {
  if (f > loaded - 1.0) return vec3(0.0, 0.5, 0.5);
  float i = clamp(floor(f), 0.0, frames - 2.0);
  float a = clamp(f - i, 0.0, 1.0);
  if (a < 1e-4) return frameAt(p, i);
  if (a > 1.0 - 1e-4) return frameAt(p, i + 1.0);
  if (i >= flowLoaded) return mix(frameAt(p, i), frameAt(p, i + 1.0), a);

  // Backward warping: the frame-i point that the flow carries to p at α,
  // and the frame-(i+1) point the backward flow carries there.
  vec4 F = flowAt(p, i);
  vec2 p0 = p - a * F.xy;
  vec2 p1 = p - (1.0 - a) * F.zw;
  vec2 step0 = vec2(0.0);
  vec2 step1 = vec2(0.0);
  for (int k = 0; k < 2; k += 1) {
    vec2 n0 = p - a * flowAt(p0, i).xy;
    vec2 n1 = p - (1.0 - a) * flowAt(p1, i).zw;
    step0 = n0 - p0;
    step1 = n1 - p1;
    p0 = n0;
    p1 = n1;
  }
  // A fixed point that still moves is ambiguous (an occlusion edge) or the
  // flow is unreliable there: lean on the other side.
  float c0 = exp(-dot(step0, step0) / 4.0);
  float c1 = exp(-dot(step1, step1) / 4.0);
  float w0 = (1.0 - a) * (0.05 + c0);
  float w1 = a * (0.05 + c1);
  return (w0 * frameAt(p0, i) + w1 * frameAt(p1, i + 1.0)) / (w0 + w1);
}

/** The cube's own medium at time f: across a shot cut, the run-on before it fades into the run-on after it. */
vec3 cubeClipAt(vec2 p, float f) {
  vec4 cut = texelFetch(cutWindows, ivec2(int(clamp(floor(f), 0.0, frames - 2.0)), 0), 0);
  if (cut.x < 0.0 || f < cut.x || f > cut.y) return pictureAt(p, f);
  float x = (f - cut.x) / (cut.y - cut.x);
  return mix(pictureAt(p, min(f, cut.z)), pictureAt(p, max(f, cut.w)), x * x * (3.0 - 2.0 * x));
}

// The live window: the original video at its own frame rate, a second or so
// around the present (a temporal level of detail over a sparsely sampled
// cube). w is 1 inside it, fading to 0 over its last 0.15 s at either end and
// 0 where its frames are more than 0.2 s apart (a gap) or it is empty.
vec4 nearAt(vec2 p, float seconds) {
  int n = int(nearCount);
  if (n < 2) return vec4(0.0);
  float lo = nearTimes[0];
  float hi = nearTimes[n - 1];
  if (seconds < lo || seconds > hi || hi - lo < 0.35) return vec4(0.0);
  // The frames are nearly evenly spaced: start from the proportional guess
  // and step to the bracketing pair.
  int k = clamp(int((seconds - lo) / (hi - lo) * float(n - 1)), 0, n - 2);
  for (int i = 0; i < 4; i++) {
    if (k > 0 && nearTimes[k] > seconds) k -= 1;
    else if (k < n - 2 && nearTimes[k + 1] < seconds) k += 1;
  }
  float below = nearTimes[k];
  float above = nearTimes[k + 1];
  if (above - below > 0.2) return vec4(0.0);
  float w = smoothstep(lo, lo + 0.15, seconds) * (1.0 - smoothstep(hi - 0.15, hi, seconds));
  float a = clamp((seconds - below) / max(above - below, 1e-5), 0.0, 1.0);
  vec2 uv = p / frameSize;
  float l0 = nearSlots[k];
  float l1 = nearSlots[k + 1];
  vec3 ycc0 = vec3(texture(nearLuma, vec3(uv, l0)).r, texture(nearChroma, vec3(uv, l0)).rg);
  vec3 ycc1 = vec3(texture(nearLuma, vec3(uv, l1)).r, texture(nearChroma, vec3(uv, l1)).rg);
  return vec4(mix(ycc0, ycc1, a), w);
}

/** The clip at time f (frames): the live window where it holds the moment, the cube elsewhere. */
vec3 clipAt(vec2 p, float f) {
  vec4 near = nearAt(p, f / fps);
  if (near.w >= 1.0) return near.xyz;
  vec3 cube = cubeClipAt(p, f);
  return near.w > 0.0 ? mix(cube, near.xyz, near.w) : cube;
}

vec2 pixelOf(vec2 cxy) {
  return vec2(cxy.x / (2.0 * box.x) + 0.5, 0.5 - cxy.y / (2.0 * box.y)) * frameSize;
}

/** The loop at loop time u (frame intervals): its last frames fade into its first. */
vec3 loopAt(vec2 cxy, float u, vec2 perPixel) {
  float w = u - loop.x * floor(u / loop.x);
  if (w >= loop.y) return clipAt(pixelOf(cxy), w);
  float x = w / loop.y;
  // The end of the loop reaches the start across the seam: for the closed
  // Möbius ring (a = 1), through the half-turn gluing (x, y, t_min) ~
  // (−x, −y, t_max). An open ring (a < 1) has no seam in space, so there the
  // fade is the plain content loop (a partial turn would draw the turned
  // frame's straight edges into the fade).
  vec2 end = operation == 6 && amount.x > 0.999 ? -cxy : cxy;
  vec2 inside = clamp((box.xy - abs(end)) / perPixel + 0.5, 0.0, 1.0);
  vec3 last = mix(vec3(0.0, 0.5, 0.5), clipAt(pixelOf(clamp(end, -box.xy, box.xy)), w + loop.x), inside.x * inside.y);
  return mix(last, clipAt(pixelOf(cxy), w), x * x * (3.0 - 2.0 * x));
}

vec3 rgbOf(vec3 ycc) {
  float y = ycc.x;
  vec2 cbcr = ycc.yz - 0.5;
  return clamp(vec3(y + 1.5748 * cbcr.y, y - 0.1873 * cbcr.x - 0.4681 * cbcr.y, y + 1.8556 * cbcr.x), 0.0, 1.0);
}

/** moving-image/2's sampling: nearest frame (blend 0) or a cross-fade (blend 1); the box spans all frames. */
vec3 legacyAt(vec3 c, float blend) {
  float z = c.z / (2.0 * box.z) + 0.5;
  if (z > loaded / frames) return vec3(0.0);
  float nearest = min(floor(z * frames), frames - 1.0);
  float f = clamp(mix(nearest + 0.5, z * frames, blend) - 0.5, 0.0, frames - 1.0);
  vec2 p = vec2(c.x / (2.0 * box.x) + 0.5, 0.5 - c.y / (2.0 * box.y)) * frameSize;
  float i = floor(f);
  return rgbOf(mix(frameAt(p, i), frameAt(p, min(i + 1.0, frames - 1.0)), f - i));
}

/** The medium at cube point c (z unwrapped; xy inside the frame). */
vec3 liquidAt(vec3 c, vec2 perPixel) {
  return rgbOf(loopAt(c.xy, (c.z + box.z) / (2.0 * box.z) * loop.x, perPixel));
}

bool insideBox(vec3 c) {
  return all(lessThanEqual(abs(c), box + 1e-5));
}
`;

export const LIQUID_SLICE_FRAGMENT = /* glsl */ `${COMMON}
uniform float aspect;

vec3 minAbs(vec3 a, vec3 b) {
  return mix(a, b, step(abs(b), abs(a)));
}

void main() {
  vec2 local = gl_FragCoord.xy - viewport.xy;
  float scale = min(viewport.z / aspect, viewport.w);
  vec2 s = (local - 0.5 * viewport.zw) / scale;
  vec3 c = sliceTotal(s);
  if (liquid < 0.5) {
    float blend = smoothstep(0.002, 0.02, fwidth(c.z) * frames / (2.0 * box.z));
    c.z -= 2.0 * box.z * floor((c.z + box.z) / (2.0 * box.z));
    colour = vec4(insideBox(c) ? legacyAt(c, blend) : vec3(0.0), 1.0);
    return;
  }
  if (c.x > 1e3) {
    colour = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  // The frame's border, antialiased: distance to it in screen pixels, from
  // the slice's own derivative (one pixel step along each screen axis).
  // One-sided differences on both sides, the smaller kept: across the Möbius
  // seam the two sides are glued points far apart in cube coordinates.
  vec3 dx = minAbs(sliceTotal(s + vec2(1.0 / scale, 0.0)) - c, c - sliceTotal(s - vec2(1.0 / scale, 0.0)));
  vec3 dy = minAbs(sliceTotal(s + vec2(0.0, 1.0 / scale)) - c, c - sliceTotal(s - vec2(0.0, 1.0 / scale)));
  vec2 perPixel = max(vec2(length(vec2(dx.x, dy.x)), length(vec2(dx.y, dy.y))), vec2(1e-6));
  vec2 inside = clamp((box.xy - abs(c.xy)) / perPixel + 0.5, 0.0, 1.0);
  float coverage = inside.x * inside.y;
  vec3 rgb = coverage > 0.0 ? liquidAt(vec3(clamp(c.xy, -box.xy, box.xy), c.z), perPixel) : vec3(0.0);
  colour = vec4(rgb * coverage, 1.0);
}
`;

export const LIQUID_SOLID_FRAGMENT = /* glsl */ `${COMMON}
uniform vec3 eye;
uniform vec3 eyeRight;
uniform vec3 eyeUp;
uniform vec3 eyeForward;
uniform float focal;
uniform vec3 bounds;        // half sizes of the region searched for the cube
uniform float planeZ;       // the present plane in this space; > 1e3 = none

const int STEPS = 160;
const int REFINE = 6;

// 1 where c sits within 'width' of a box edge (two coordinates on the boundary).
float edge(vec3 c, float width) {
  vec3 near = step(box - width, abs(c));
  return step(1.5, near.x + near.y + near.z);
}

vec3 solidCube(vec3 Q) {
  return cubeTotal(Q);
}

bool inside(vec3 c) {
  return insideBox(c);
}

/** Whether the point drawn at Q lies in the kept half: at or behind the present plane. */
bool kept(vec3 Q, vec3 c) {
  return Q.z <= planeZ;
}

bool solidAt(vec3 Q) {
  vec3 c = solidCube(Q);
  return inside(c) && kept(Q, c);
}

vec3 shade(vec3 c) {
  return liquid > 0.5 ? liquidAt(vec3(clamp(c.xy, -box.xy, box.xy), c.z), vec2(1e-4)) : legacyAt(c, 1.0);
}

void main() {
  vec2 local = gl_FragCoord.xy - viewport.xy;
  vec2 ndc = (2.0 * local - viewport.zw) / viewport.w;
  vec3 dir = normalize(eyeForward * focal + eyeRight * ndc.x + eyeUp * ndc.y);
  float pixel = 2.0 / (viewport.w * focal);

  vec3 inv = 1.0 / dir;
  vec3 lo = min((-bounds - eye) * inv, (bounds - eye) * inv);
  vec3 hi = max((-bounds - eye) * inv, (bounds - eye) * inv);
  float t0 = max(max(max(lo.x, lo.y), lo.z), 0.0);
  float t1 = min(min(hi.x, hi.y), hi.z);

  vec3 result = vec3(0.0);
  float ghost = 0.0;
  vec3 glass = vec3(0.0);
  float glassAmount = 0.0;
  // The flat screen: a faint outline where the present plane meets its rectangle.
  float outline = 0.0;
  float planeHit = abs(dir.z) > 1e-6 ? (planeZ - eye.z) / dir.z : -1.0;
  if (planeHit > 0.0 && planeZ < 1e3) {
    vec2 q = (eye + planeHit * dir).xy;
    vec2 over = abs(q) - box.xy;
    float width = 1.4 * pixel * planeHit;
    if (max(over.x, over.y) < width && max(over.x, over.y) > -width) outline = 1.0;
  }

  if (t1 > t0) {
    float step = (t1 - t0) / float(STEPS);
    float previous = t0;
    bool seenCube = false;
    for (int i = 0; i <= STEPS; i += 1) {
      float t = t0 + float(i) * step;
      vec3 Q = eye + t * dir;
      vec3 c = solidCube(Q);
      if (!inside(c)) {
        previous = t;
        continue;
      }
      if (!seenCube) {
        seenCube = true;
        float low = previous;
        float high = t;
        for (int j = 0; j < REFINE; j += 1) {
          float mid = 0.5 * (low + high);
          if (inside(solidCube(eye + mid * dir))) high = mid; else low = mid;
        }
        vec3 surfaceAt = eye + high * dir;
        vec3 surface = solidCube(surfaceAt);
        if (i > 0 && !kept(surfaceAt, surface)) {
          // In front of the present: the removed half, kept as faint glass.
          ghost = edge(surface, 1.6 * pixel * high);
          glass = shade(surface);
          glassAmount = 0.18;
        }
      }
      if (!kept(Q, c)) {
        previous = t;
        continue;
      }
      // Entered the kept half: on the plane (cut) or through the outside.
      vec3 before = eye + previous * dir;
      vec3 beforeCube = solidCube(before);
      bool cut = inside(beforeCube) && !kept(before, beforeCube);
      float low = previous;
      float high = t;
      for (int j = 0; j < REFINE; j += 1) {
        float mid = 0.5 * (low + high);
        if (solidAt(eye + mid * dir)) high = mid; else low = mid;
      }
      vec3 hit = solidCube(eye + high * dir);
      if (cut) {
        result = shade(hit);
      } else {
        result = shade(hit) * 0.42;
        result = mix(result, vec3(1.0), 0.5 * edge(hit, 1.6 * pixel * high));
      }
      break;
    }
  }
  result = mix(result, glass, glassAmount);
  result = max(result, vec3(0.3 * ghost));
  result = max(result, vec3(0.55 * outline));
  colour = vec4(result, 1.0);
}
`;

export const LIQUID_YCBCR_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D frame;    // row 0 = top of the picture, like the layers
uniform vec2 target;        // layer size in texels
uniform float writeChroma;

out vec4 colour;

void main() {
  vec3 rgb = texture(frame, gl_FragCoord.xy / target).rgb;
  float y = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  colour = writeChroma > 0.5
    ? vec4((rgb.b - y) / 1.8556 + 0.5, (rgb.r - y) / 1.5748 + 0.5, 0.0, 1.0)
    : vec4(y, 0.0, 0.0, 1.0);
}
`;
