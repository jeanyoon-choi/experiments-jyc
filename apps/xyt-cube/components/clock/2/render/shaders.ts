// Full-screen passes over the clock's bent (x, y, t) cube. Nothing is sampled
// from a texture: every point is evaluated from the clock's definition, after
// the bending map. `cubeAt` / `sliceAt` mirror ../model/geometry.mjs.
//
//   slice  the screen: the fixed flat plane (the present) through the bent
//          cube; each pixel s shows the clock at the cube point sliceAt(s).
//   solid  the bent block in its space from a three-quarter view, the half in
//          front of the present removed; the cut face is the screen, the
//          hands' sheets through time are ray-marched as a volume; the flat
//          screen rectangle stays as an outline.
//
// Time has thickness (clock/1's rule, generalised to a curved cut): a point
// owns the time its neighbourhood of size L spans, Δt = L·|∇ₛt|, with ∇ₛt the
// cut's local time gradient (from screen derivatives of the cube point). Each
// point shows the clock averaged over that Δt and its pixel footprint (exact
// box filters). Flat, ∇ₛt = 0: the ordinary clock.

import { FRACTAL_GLSL } from "./fractal-glsl";
import { CLOCK_RADIUS, DIGIT_CYCLES, DIGIT_UNITS, EXACT_UNITS, HANDS, SEGMENTS } from "../model";

const float = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);

export const CLOCK_VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

uniform vec3 box;             // box half sizes (shorter viewport side = 1)
uniform int operation;        // 0 shear, 1 cylinder, 2 sphere, 3 curvature, 4 torus, 5 mobius
uniform vec2 amount;
uniform float present;        // the present's depth in the block (undeformed z)
uniform vec4 viewport;        // x, y, width, height in device px
uniform float secondsPerUnit; // clock seconds per unit of z
uniform float originWhole;    // clock seconds at z = 0, whole part (mod 1 day)
uniform float originFrac;     //   and fractional part
uniform vec3 handPhase;       // each hand's turn at z = 0
uniform float stimulus;       // 0 analogue, 1 digital, 2 fractal
uniform float thickness;      // L, screen units: a point's time thickness is the time spanned by L

out vec4 colour;

// Weight of the time-invariant face (rim, ticks, colons): 1 on a cut, lower
// inside the solid's volume so the face reads as a faint cylinder.
float faceWeight = 1.0;

const float TAU = 6.283185307179586;
const float R = ${float(CLOCK_RADIUS)};
const vec3 PERIOD = vec3(${HANDS.map((hand) => float(hand.period)).join(", ")});
const vec3 HAND_LENGTH = vec3(${HANDS.map((hand) => float(hand.length)).join(", ")}) * R;
const vec3 HAND_HALF = 0.5 * vec3(${HANDS.map((hand) => float(hand.width)).join(", ")}) * R;
const float RIM_HALF = 0.004 * R;
const float HUB = 0.02 * R;

// SCC fractal/clock/1: background, rim, gold hour, ivory minute, rust second.
const vec3 BACKGROUND = vec3(28.0, 29.0, 27.0) / 255.0;
const vec3 RIM = vec3(231.0, 223.0, 210.0) / 255.0;
const vec3 HOUR = vec3(210.0, 166.0, 76.0) / 255.0;
const vec3 MINUTE = vec3(240.0, 234.0, 223.0) / 255.0;
const vec3 SECOND = vec3(201.0, 106.0, 88.0) / 255.0;

// Antialiasing uses a tent (triangle) filter of half-width w — a box filter
// convolved with itself. A box's response falls off only as 1/f, so fine
// periodic marks near the pixel rate (the second hand's crossings, fractal
// rings) beat into moiré; a tent's falls off as 1/f². Coverage of a band is a
// difference of the tent's cumulative function, exact for any w.

// Cumulative of a unit tent of half-width w at u.
float tentCumulative(float u, float w) {
  if (u <= -w) return 0.0;
  if (u >= w) return 1.0;
  float a = u + w;
  float b = w - u;
  return u < 0.0 ? 0.5 * a * a / (w * w) : 1.0 - 0.5 * b * b / (w * w);
}

// Share of a tent of half-width w at x inside the band |x| < h.
float band(float x, float h, float w) {
  if (w < 1e-7) return step(abs(x), h);
  return tentCumulative(h - x, w) - tentCumulative(-h - x, w);
}

// The same for the period-1 band |wrap(c)| < h: the tent's share summed over
// the band's repeats; wide windows give the band's mean 2h.
float periodicBand(float c, float w, float h) {
  if (w < 1e-6) return step(abs(c - floor(c + 0.5)), h);
  if (w > 3.0) return 2.0 * h;
  c -= floor(c + 0.5);
  float sum = 0.0;
  for (int k = -4; k <= 4; k++) {
    float x = c - float(k);
    if (abs(x) > w + h + 1e-6) continue;
    sum += band(x, h, w);
  }
  return sum;
}

// The cut's time thickness at this point, in z units (set per pixel from
// the cut's local time gradient; 0 inside the solid's volume).
float thicknessZ = 0.0;

float cutThickness() {
  return thicknessZ;
}

// Footprint of a linear function with gradient g along the two footprint vectors.
float spread(vec3 g, vec3 fx, vec3 fy) {
  return abs(dot(g, fx)) + abs(dot(g, fy));
}


// ----------------------------------------------------------------- bending

const float PI = 3.14159265359;
const float EPSILON = 1e-4;
const vec3 NOWHERE = vec3(1e4);
const float MOBIUS_RING = 0.5;   // the ring axis's distance from the centre at a = 1

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
  // 5: mobius — the cube as a Möbius ring: t bent into a circle about an
  // axis at x = −R_m, the frame turned by φ = a·π·t/depth on the way round.
  if (a < EPSILON) return P;
  float depth = 2.0 * box.z;
  float k = TAU * MOBIUS_RING / depth;
  float stretch = 1.0 + a * (k - 1.0);
  float ringRadius = MOBIUS_RING / a;
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

// ----------------------------------------------------------------- analogue

// Coverage of hand i at p, box-filtered over the footprint (fx, fy).
float hand(int i, vec3 p, vec3 fx, vec3 fy) {
  float r = length(p.xy);
  vec2 radial = r > 1e-6 ? p.xy / r : vec2(0.0, 1.0);
  float lengthCover = band(r - 0.5 * HAND_LENGTH[i], 0.5 * HAND_LENGTH[i], spread(vec3(radial, 0.0), fx, fy));
  if (lengthCover <= 0.0) return 0.0;
  float half_ = asin(min(1.0, HAND_HALF[i] / max(r, 1e-6))) / TAU;
  float rate = secondsPerUnit / PERIOD[i];           // turns per unit z
  float angle = atan(p.x, p.y) / TAU;                // clockwise from 12, turns
  float offset = angle - (handPhase[i] + p.z * rate);
  offset -= floor(offset + 0.5);
  vec3 gradient = vec3(vec2(p.y, -p.x) / max(r * r, 1e-10) / TAU, -rate);
  return lengthCover * periodicBand(offset, spread(gradient, fx, fy) + abs(gradient.z) * cutThickness(), half_);
}

struct Face {
  float rim;
  float quarter;
  float other;
  float hub;
};

Face face(vec3 p, vec3 fx, vec3 fy) {
  Face f;
  float r = length(p.xy);
  vec2 radial = r > 1e-6 ? p.xy / r : vec2(0.0, 1.0);
  float rw = spread(vec3(radial, 0.0), fx, fy);
  f.rim = band(r - R, RIM_HALF, rw);
  f.hub = band(r, HUB, rw);
  // The nearest of the twelve ticks.
  float k = floor(atan(p.x, p.y) / TAU * 12.0 + 0.5);
  float a = k * TAU / 12.0;
  vec2 along = vec2(sin(a), cos(a));
  vec2 across = vec2(along.y, -along.x);
  bool quarter = mod(k, 3.0) == 0.0;
  float tickLength = (quarter ? 0.1 : 0.06) * R;
  float tickHalf = quarter ? RIM_HALF : 0.7 * RIM_HALF;
  float tick = band(dot(p.xy, across), tickHalf, spread(vec3(across, 0.0), fx, fy))
    * band(dot(p.xy, along) - (R - 0.5 * tickLength), 0.5 * tickLength, spread(vec3(along, 0.0), fx, fy));
  f.quarter = quarter ? tick : 0.0;
  f.other = quarter ? 0.0 : tick;
  return f;
}

vec3 analogue(vec3 p, vec3 fx, vec3 fy, out float marks) {
  Face f = face(p, fx, fy);
  vec3 c = BACKGROUND;
  f.rim *= faceWeight;
  f.quarter *= faceWeight;
  f.other *= faceWeight;
  c = mix(c, RIM, 0.72 * f.rim);
  c = mix(c, RIM, 0.72 * f.quarter);
  c = mix(c, RIM, 0.52 * f.other);
  float hour = hand(0, p, fx, fy);
  float minute = hand(1, p, fx, fy);
  float second = hand(2, p, fx, fy);
  c = mix(c, HOUR, 0.96 * hour);
  c = mix(c, MINUTE, 0.96 * minute);
  c = mix(c, SECOND, 0.96 * second);
  c = mix(c, MINUTE, f.hub);
  marks = max(max(max(f.rim, f.quarter), max(f.other, f.hub)), max(hour, max(minute, second)));
  return c;
}

// ------------------------------------------------------------------ digital

// HH:MM:SS, 24 h, seven segments; hours gold, minutes ivory, seconds rust.
// Digit cells in digit-width units; the row is 0.8 wide, like the clock face.
const float DIGIT_W = 0.8 / 7.95;
const float SEG_HALF = 0.08;        // half thickness, digit widths
const float DIGIT_HALF_W = 0.42;
const float DIGIT_HALF_H = 0.85;
const float SEG_GAP = 0.035;
const int SEGMENT_MASK[10] = int[10](${SEGMENTS.join(", ")});
const float DIGIT_UNIT[6] = float[6](${DIGIT_UNITS.map(float).join(", ")});
const float DIGIT_CYCLE[6] = float[6](${DIGIT_CYCLES.map(float).join(", ")});
const float DIGIT_X[6] = float[6](0.5, 1.75, 3.35, 4.6, 6.2, 7.45);
const float COLON_X[2] = float[2](2.55, 5.4);

int digitAt(int i, float m) {
  float value = mod(m, DIGIT_CYCLE[i]);
  if (i == 0) return int(floor(value / 10.0));
  if (i == 1) return int(mod(value, 10.0));
  return int(value);
}

float litAt(int i, float m, int segment) {
  return float((SEGMENT_MASK[digitAt(i, m)] >> segment) & 1);
}

// Share of the window [a, b] (clock seconds relative to the origin) during which
// the segment is lit; matches the model's segmentLitFraction.
float litFraction(int i, int segment, float a, float b) {
  float unit = DIGIT_UNIT[i];
  float base = floor(originWhole / unit);
  float rest = (originWhole - base * unit + originFrac) / unit;
  float lo = rest + a / unit;
  float hi = rest + b / unit;
  if (hi - lo < 1e-6) return litAt(i, base + floor(lo), segment);
  if (hi - lo > ${float(EXACT_UNITS)}) {
    float sum = 0.0;
    for (int m = 0; m < 24; m++) {
      if (float(m) >= DIGIT_CYCLE[i]) break;
      sum += litAt(i, float(m), segment);
    }
    return sum / DIGIT_CYCLE[i];
  }
  float total = 0.0;
  float m = floor(lo);
  for (int n = 0; n < ${EXACT_UNITS + 2}; n++) {
    if (m >= hi) break;
    float overlap = min(hi, m + 1.0) - max(lo, m);
    total += max(overlap, 0.0) * litAt(i, base + m, segment);
    m += 1.0;
  }
  return total / (hi - lo);
}

// Signed distance (digit widths) to segment s of a digit centred at the origin.
float segmentDistance(int s, vec2 q) {
  vec2 c;
  float halfLength;
  bool horizontal = s == 0 || s == 3 || s == 6;
  if (horizontal) {
    c = vec2(0.0, s == 0 ? DIGIT_HALF_H : (s == 3 ? -DIGIT_HALF_H : 0.0));
    halfLength = DIGIT_HALF_W - SEG_GAP;
  } else {
    c = vec2(s == 1 || s == 2 ? DIGIT_HALF_W : -DIGIT_HALF_W, s == 1 || s == 5 ? 0.5 * DIGIT_HALF_H : -0.5 * DIGIT_HALF_H);
    halfLength = 0.5 * DIGIT_HALF_H - SEG_GAP;
  }
  vec2 d = abs(q - c);
  vec2 la = horizontal ? d : d.yx;  // (along, across)
  return max(la.y - SEG_HALF, (la.x + la.y - halfLength) * 0.70710678);
}

vec3 digital(vec3 p, vec3 fx, vec3 fy, out float marks) {
  vec3 c = BACKGROUND;
  marks = 0.0;
  // Cube xy in digit widths, row centred.
  vec2 q = p.xy / DIGIT_W + vec2(3.975, 0.0);
  float scale = 1.0 / DIGIT_W;
  float pixel = max(length(vec2(length(fx.xy), length(fy.xy))) * scale, 1e-6);
  // Colons: two dots each, time-invariant.
  for (int k = 0; k < 2; k++) {
    vec2 d = q - vec2(COLON_X[k], 0.0);
    float dot_ = min(length(d - vec2(0.0, 0.42)), length(d + vec2(0.0, 0.42))) - SEG_HALF * 1.15;
    float cover = faceWeight * clamp(0.5 - dot_ / pixel, 0.0, 1.0);
    c = mix(c, MINUTE, 0.72 * cover);
    marks = max(marks, cover);
  }
  // The nearest digit cell.
  int i = 0;
  float best = 1e9;
  for (int k = 0; k < 6; k++) {
    float d = abs(q.x - DIGIT_X[k]);
    if (d < best) { best = d; i = k; }
  }
  vec2 local = q - vec2(DIGIT_X[i], 0.0);
  if (abs(local.x) > 0.7 || abs(local.y) > 1.1) return c;
  // The nearest segment (segments never overlap).
  int s = 0;
  float distance = 1e9;
  for (int k = 0; k < 7; k++) {
    float d = segmentDistance(k, local);
    if (d < distance) { distance = d; s = k; }
  }
  float cover = clamp(0.5 - distance / pixel, 0.0, 1.0);
  if (cover <= 0.0) return c;
  float window = (abs(fx.z) + abs(fy.z) + cutThickness()) * secondsPerUnit;
  float dt = p.z * secondsPerUnit;
  float lit = litFraction(i, s, dt - 0.5 * window, dt + 0.5 * window);
  vec3 ink = i < 2 ? HOUR : (i < 4 ? MINUTE : SECOND);
  c = mix(c, ink, cover * (0.07 + 0.89 * lit));
  marks = max(marks, cover * lit);
  return c;
}

${FRACTAL_GLSL}

vec3 clockAt(vec3 p, vec3 fx, vec3 fy, out float marks) {
  if (stimulus > 1.5) return fractal(p, fx, fy, marks);
  return stimulus < 0.5 ? analogue(p, fx, fy, marks) : digital(p, fx, fy, marks);
}

bool insideBox(vec3 p) {
  return all(lessThanEqual(abs(p), box + 1e-5));
}
`;

export const CLOCK_SLICE_FRAGMENT = /* glsl */ `${COMMON}
void main() {
  vec2 local = gl_FragCoord.xy - viewport.xy;
  float scale = min(viewport.z, viewport.w);
  vec2 s = (local - 0.5 * viewport.zw) / scale;
  vec3 c = sliceAt(s, present);
  // The pixel's footprint in the cube and the cut's local time gradient.
  vec3 fx = dFdx(c);
  vec3 fy = dFdy(c);
  // Δt = L·|∇ₛt| (z units); a seam (Möbius) is not a gradient: capped.
  thicknessZ = min(thickness * length(vec2(fx.z, fy.z)) * scale, box.z);
  if (c.x > 1e3) {
    colour = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float marks;
  colour = vec4(clockAt(c, fx, fy, marks), 1.0);
}
`;

export const CLOCK_SOLID_FRAGMENT = /* glsl */ `${COMMON}
uniform vec3 eye;
uniform vec3 eyeRight;
uniform vec3 eyeUp;
uniform vec3 eyeForward;
uniform float focal;
uniform vec3 bounds;          // half sizes of the region searched for the bent block
uniform float planeZ;         // the present plane in this space; > 1e3 = none

const int STEPS = 96;
// Inside the volume the fractal tree would be evaluated at every step of
// every ray (measured: the inset alone pulled the page to ~10 fps). The
// volume therefore draws only the root clock's sheets; the cut face, where
// the screen is, draws the whole tree.
const int REFINE = 5;
const float CONTENT = 0.43;   // the clock's marks live inside this radius (cube xy)

// 1 where c sits within 'width' of a box edge (two coordinates on the boundary).
float edge(vec3 c, float width) {
  vec3 near = step(box - width, abs(c));
  return step(1.5, near.x + near.y + near.z);
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

  // The cut face (derivatives taken outside any branch).
  float planeHit = abs(dir.z) > 1e-6 ? (planeZ - eye.z) / dir.z : -1.0;
  vec3 cutPoint = eye + max(planeHit, 0.0) * dir;
  vec3 cutCube = cubeAt(cutPoint);
  vec3 cutX = dFdx(cutCube);
  vec3 cutY = dFdy(cutCube);

  vec3 result = vec3(0.0);
  float transmit = 1.0;
  float ghost = 0.0;

  // The flat screen: a faint outline where the present plane meets its rectangle.
  float outline = 0.0;
  if (planeHit > 0.0 && planeZ < 1e3) {
    vec2 over = abs(cutPoint.xy) - box.xy;
    float width = 1.4 * pixel * planeHit;
    float m = max(over.x, over.y);
    if (m < width && m > -width) outline = 1.0;
  }

  if (t1 > t0) {
    bool cut = eye.z > planeZ && planeHit > t0 && planeHit < t1 && insideBox(cutCube);
    if (cut) {
      float marks;
      vec3 c = clockAt(cutCube, cutX, cutY, marks);
      float alpha = mix(0.25, 1.0, marks);
      result += transmit * alpha * c;
      transmit *= 1.0 - alpha;
    }
    // March the bent block: its first surface leaves faint edges (the removed
    // half too); inside the kept half the hands' sheets accumulate.
    float stepLength = (t1 - t0) / float(STEPS);
    vec3 none = vec3(0.0);
    vec3 stride = dir * stepLength;
    bool seen = false;
    float previous = t0;
    faceWeight = 0.3;

    for (int k = 0; k <= STEPS; k++) {
      float t = t0 + float(k) * stepLength;
      vec3 P = eye + t * dir;
      vec3 c = cubeAt(P);
      bool inside = insideBox(c);
      if (inside && !seen) {
        seen = true;
        float low = previous;
        float high = t;
        for (int j = 0; j < REFINE; j++) {
          float mid = 0.5 * (low + high);
          if (insideBox(cubeAt(eye + mid * dir))) high = mid; else low = mid;
        }
        if (k > 0) ghost = edge(cubeAt(eye + high * dir), 1.6 * pixel * high);
      }
      previous = t;
      if (!inside || P.z > planeZ || length(c.xy) > CONTENT) continue;
      float marks;
      vec3 shade = stimulus > 1.5 ? analogue(c, stride, none, marks) : clockAt(c, stride, none, marks);
      if (marks < 1e-4) continue;
      vec3 ink = clamp((shade - BACKGROUND * (1.0 - marks)) / marks, 0.0, 1.0);
      float alpha = 1.0 - exp(-marks * stepLength * (abs(stimulus - 1.0) < 0.5 ? 90.0 : 140.0));
      result += transmit * alpha * ink;
      transmit *= 1.0 - alpha;
      if (transmit < 0.02) break;
    }
  }
  result = max(result, vec3(0.45 * ghost));
  result = max(result, vec3(0.55 * outline));
  colour = vec4(result, 1.0);
}
`;
