// Full-screen passes over one volume (x, y, frame) for moving-image/2. The GLSL
// `cubeAt` / `sliceAt` mirror socket/experiments/moving-image/2/geometry.mjs
// (tested there); keep them in step.
//
//   slice  the screen: a fixed flat plane (the present) through the deformed
//          cube, seen head-on. Each pixel s reads the cube point sliceAt(s).
//          Time loops; beyond the frame's x, y is black.
//   solid  the deformed cube drawn in its space from a fixed three-quarter
//          view, the half in front of the present removed; the cut face is
//          the screen, the rest shows how the cube is bent; the removed half
//          stays as faint glass with its edges. The flat screen rectangle
//          stays as a faint outline.
//   luma / chroma  write one decoded video frame into the Y layer and the
//          half-size CbCr layer (BT.709, full range).
//
// The volume is RGBA (phones) or Y + CbCr (screen). Unbent, each point reads
// its nearest frame (the clip's own frames); where the slice runs across
// time, neighbouring frames blend, so it has no steps. Frames not yet
// loaded read as black.

export const CUBISM_VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;

uniform sampler3D volume;   // RGBA, or Y
uniform sampler3D chroma;   // CbCr when ycbcr > 0.5
uniform float ycbcr;
uniform float filled;       // texture depth loaded so far, 0..1
uniform float frames;
uniform vec3 box;           // box half sizes, frame heights
uniform int operation;      // 0 shear, 1 cylinder, 2 sphere, 3 curvature, 4 torus, 5 flux
uniform vec2 amount;
uniform float present;      // the present's depth on the undeformed cube
uniform vec4 viewport;      // x, y, width, height in device px

out vec4 colour;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float EPSILON = 1e-4;
const vec3 NOWHERE = vec3(1e4);

float wrapAngle(float value) {
  return value - TAU * floor((value + PI) / TAU);
}

vec3 cubeAt(vec3 P) {
  float a = amount.x;
  float b = amount.y;
  if (operation == 0) {
    return vec3(P.xy, P.z + a * P.x + b * P.y);
  }
  if (operation == 1) {
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
  if (operation == 2) {
    if (abs(a) < EPSILON) return P;
    float rho0 = 1.0 / abs(a) + box.z;
    float s = sign(a);
    float qz = s * P.z + rho0;
    float rho = length(vec3(P.xy, qz));
    return vec3(rho0 * atan(P.x, qz), rho0 * atan(P.y, qz), s * (rho - rho0));
  }
  if (operation == 3) {
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
  if (operation == 4) {
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
  // 5: flux
  if (abs(a) < EPSILON) return P;
  float scale = length(box);
  vec3 p = P / scale;
  float p2 = dot(p, p);
  vec4 lifted = vec4(2.0 * p, p2 - 1.0) / (p2 + 1.0);
  vec4 n = vec4(0.0, 0.0, cos(b), sin(b));
  float xn = dot(lifted, n);
  float ch = cosh(a);
  float sh = sinh(a);
  vec4 q = (lifted + ((ch - 1.0) * xn + sh) * n) / (ch + sh * xn);
  float pole = 1.0 - q.w;
  if (pole < 1e-6) return NOWHERE;
  return scale * q.xyz / pole;
}

/** The cube point the screen shows at s while the present is at depth z. */
vec3 sliceAt(vec2 s, float z) {
  float K = amount.x;
  if (operation != 3 || abs(K) < EPSILON) return cubeAt(vec3(s, z));
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

// blend 0: the nearest frame (unturned playback shows the clip's own frames);
// 1: linear between neighbouring frames (a slice across time has no steps).
vec3 sampleCube(vec3 c, float blend) {
  vec3 tex = vec3(c.x / (2.0 * box.x) + 0.5, 0.5 - c.y / (2.0 * box.y), c.z / (2.0 * box.z) + 0.5);
  if (tex.z > filled) return vec3(0.0);
  float nearest = (min(floor(tex.z * frames), frames - 1.0) + 0.5) / frames;
  tex.z = mix(nearest, tex.z, blend);
  if (ycbcr < 0.5) return texture(volume, tex).rgb;
  float y = texture(volume, tex).r;
  vec2 cbcr = texture(chroma, tex).rg - 0.5;
  return clamp(vec3(y + 1.5748 * cbcr.y, y - 0.1873 * cbcr.x - 0.4681 * cbcr.y, y + 1.8556 * cbcr.x), 0.0, 1.0);
}

bool insideBox(vec3 c) {
  return all(lessThanEqual(abs(c), box + 1e-5));
}
`;

export const CUBISM_SLICE_FRAGMENT = /* glsl */ `${COMMON}
uniform float aspect;

void main() {
  vec2 local = gl_FragCoord.xy - viewport.xy;
  float scale = min(viewport.z / aspect, viewport.w);
  vec2 s = (local - 0.5 * viewport.zw) / scale;
  vec3 c = sliceAt(s, present);
  // Frames crossed per pixel: zero when flat, larger the more time the slice spans.
  float blend = smoothstep(0.002, 0.02, fwidth(c.z) * frames / (2.0 * box.z));
  // The clip loops: time wraps around the box.
  c.z -= 2.0 * box.z * floor((c.z + box.z) / (2.0 * box.z));
  colour = vec4(insideBox(c) ? sampleCube(c, blend) : vec3(0.0), 1.0);
}
`;

export const CUBISM_SOLID_FRAGMENT = /* glsl */ `${COMMON}
uniform vec3 eye;
uniform vec3 eyeRight;
uniform vec3 eyeUp;
uniform vec3 eyeForward;
uniform float focal;
uniform vec3 bounds;        // half sizes of the region searched for the cube
uniform float planeZ;       // the present plane in this space; > 1e3 = none

const int STEPS = 128;
const int REFINE = 6;

// 1 where c sits within 'width' of a box edge (two coordinates on the boundary).
float edge(vec3 c, float width) {
  vec3 near = step(box - width, abs(c));
  return step(1.5, near.x + near.y + near.z);
}

bool solidAt(vec3 P) {
  return P.z <= planeZ && insideBox(cubeAt(P));
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
  float planeHit = abs(dir.z) > 1e-6 ? (planeZ - eye.z) / dir.z : -1.0;
  // The flat screen: a faint outline where the present plane meets its rectangle.
  float outline = 0.0;
  if (planeHit > 0.0 && planeZ < 1e3) {
    vec2 q = (eye + planeHit * dir).xy;
    vec2 over = abs(q) - box.xy;
    float width = 1.4 * pixel * planeHit;
    if (max(over.x, over.y) < width && max(over.x, over.y) > -width) outline = 1.0;
  }

  if (t1 > t0) {
    // One march through the whole bent cube. The first surface met (even in
    // the removed half, in front of the present) leaves its edges as a faint
    // outline; the first point of the kept half is shaded: the cut face if it
    // lies on the present plane, the cube's outside otherwise.
    float step = (t1 - t0) / float(STEPS);
    float previous = t0;
    bool seenCube = false;
    for (int i = 0; i <= STEPS; i += 1) {
      float t = t0 + float(i) * step;
      vec3 P = eye + t * dir;
      vec3 c = cubeAt(P);
      if (!insideBox(c)) {
        previous = t;
        continue;
      }
      if (!seenCube) {
        seenCube = true;
        float low = previous;
        float high = t;
        for (int j = 0; j < REFINE; j += 1) {
          float mid = 0.5 * (low + high);
          if (insideBox(cubeAt(eye + mid * dir))) high = mid; else low = mid;
        }
        vec3 surfaceAt = eye + high * dir;
        vec3 surface = cubeAt(surfaceAt);
        if (i > 0 && surfaceAt.z > planeZ) {
          // In front of the present: the removed half, kept as faint glass.
          ghost = edge(surface, 1.6 * pixel * high);
          glass = sampleCube(surface, 1.0);
          glassAmount = 0.18;
        }
      }
      if (P.z > planeZ) {
        previous = t;
        continue;
      }
      // Entered the kept half: on the plane (cut) or through the outside.
      bool cut = (eye + previous * dir).z > planeZ && insideBox(cubeAt(eye + previous * dir));
      float low = previous;
      float high = t;
      for (int j = 0; j < REFINE; j += 1) {
        float mid = 0.5 * (low + high);
        if (solidAt(eye + mid * dir)) high = mid; else low = mid;
      }
      vec3 hit = cubeAt(eye + high * dir);
      if (cut) {
        result = sampleCube(hit, 1.0);
      } else {
        result = sampleCube(hit, 1.0) * 0.42;
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

// Target texel centres map to the source: for the half-size chroma layer the
// sample lands between four source pixels, and linear filtering averages them.
export const CUBISM_YCBCR_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D frame;    // row 0 = top of the picture, like the volume
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
