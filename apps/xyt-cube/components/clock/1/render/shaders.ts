// Full-screen passes over the clock's (x, y, t) cube. Nothing is sampled
// from a texture: every point is evaluated from the clock's definition.
//
//   slice  every pixel is a point s on the cut plane, seen head-on:
//          p = centre + s.x·u + s.y·v; its clock time is origin + p.z·k.
//   solid  the cube seen from outside (moving-image/1's solid view): the half
//          on the camera's side of the plane is removed; the cut face shows
//          the slice and, behind it, the hands' sheets through time are
//          ray-marched as a volume.
//
// Time has thickness. On a turned cut, neighbouring points of the screen lie
// at different times; a point owns the time its neighbourhood spans:
// Δt = L·|∇ₛt| (L = `thickness`, in screen units; ∇ₛt the cut's time
// gradient). Each point shows the clock averaged over that Δt (and over the
// pixel's footprint): an exact box filter, so a hand appears as the wedge it
// actually sweeps in Δt, 360°·Δt/period. Flat, ∇ₛt = 0: the ordinary clock.
// Turned, a slow hand stays sharp (it barely moves in Δt) and a fast one
// fills the gaps between its turns: one rule for every hand, no tuning.

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
uniform float bounded;        // 1: outside the box is no time (cube pivot)
uniform vec3 axisU;
uniform vec3 axisV;
uniform vec3 axisW;
uniform vec3 centre;          // a point on the plane (screen centre)
uniform vec4 viewport;        // x, y, width, height in device px
uniform float secondsPerUnit; // clock seconds per unit of z
uniform float originWhole;    // clock seconds at z = 0, whole part (mod 1 day)
uniform float originFrac;     //   and fractional part
uniform vec3 handPhase;       // each hand's turn at z = 0
uniform float stimulus;       // 0 analogue, 1 digital, 2 fractal
uniform float thickness;      // L: the cut's time thickness is the time spanned by L along the cut

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

// The cut's time thickness in z units: the z spanned by L along the cut.
float cutThickness() {
  return thickness * length(vec2(axisU.z, axisV.z));
}

// Footprint of a linear function with gradient g along the two footprint vectors.
float spread(vec3 g, vec3 fx, vec3 fy) {
  return abs(dot(g, fx)) + abs(dot(g, fy));
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
  vec3 p = centre + s.x * axisU + s.y * axisV;
  if (bounded > 0.5 && !insideBox(p)) {
    colour = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float marks;
  vec3 pixelU = axisU / scale;
  vec3 pixelV = axisV / scale;
  colour = vec4(clockAt(p, pixelU, pixelV, marks), 1.0);
}
`;

export const CLOCK_SOLID_FRAGMENT = /* glsl */ `${COMMON}
uniform vec3 eye;
uniform vec3 eyeRight;
uniform vec3 eyeUp;
uniform vec3 eyeForward;
uniform float focal;

const int STEPS = 72;
// Inside the volume the fractal tree would be evaluated at every step of
// every ray; the volume draws only the root clock's sheets, and the cut face,
// where the screen is, draws the whole tree.
const float CONTENT = 0.43;   // the marks live inside this radius

// 1 where p sits within 'width' of a box edge (two coordinates on the boundary).
float edge(vec3 p, float width) {
  vec3 near = step(box - width, abs(p));
  return step(1.5, near.x + near.y + near.z);
}

void main() {
  vec2 local = gl_FragCoord.xy - viewport.xy;
  vec2 ndc = (2.0 * local - viewport.zw) / viewport.w;
  vec3 dir = normalize(eyeForward * focal + eyeRight * ndc.x + eyeUp * ndc.y);

  vec3 inv = 1.0 / dir;
  vec3 a = (-box - eye) * inv;
  vec3 b = (box - eye) * inv;
  vec3 lo = min(a, b);
  vec3 hi = max(a, b);
  float t0 = max(max(lo.x, lo.y), lo.z);
  float t1 = min(min(hi.x, hi.y), hi.z);
  float pixel = 2.0 / (viewport.w * focal);

  if (t1 <= max(t0, 0.0)) {
    colour = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Keep the half-space away from the eye.
  float offset = dot(centre, axisW);
  float sideSign = dot(eye, axisW) - offset >= 0.0 ? 1.0 : -1.0;
  float side0 = sideSign * (dot(eye, axisW) - offset);
  float slope = sideSign * dot(dir, axisW);
  float entry = slope < 0.0 ? -side0 / slope : 1e9;
  float near = max(t0, entry);
  bool hit = near < t1;
  bool cut = hit && entry > t0;

  vec3 result = vec3(0.0);
  float transmit = 1.0;

  // Derivatives outside any branch (the cut face's pixel footprint).
  vec3 cutPoint = eye + near * dir;
  vec3 cutX = dFdx(cutPoint);
  vec3 cutY = dFdy(cutPoint);

  if (cut) {
    // The cut face: the slice, its background half transparent.
    float marks;
    vec3 c = clockAt(cutPoint, cutX, cutY, marks);
    float alpha = mix(0.22, 1.0, marks);
    result += transmit * alpha * c;
    transmit *= 1.0 - alpha;
  }

  if (hit) {
    // March only where the marks are: the cylinder r < CONTENT.
    float qa = dot(dir.xy, dir.xy);
    float qb = dot(eye.xy, dir.xy);
    float qc = dot(eye.xy, eye.xy) - CONTENT * CONTENT;
    float disc = qb * qb - qa * qc;
    if (disc > 0.0 && qa > 1e-8) {
      float root = sqrt(disc);
      float c0 = max(near, (-qb - root) / qa);
      float c1 = min(t1, (-qb + root) / qa);
      if (c1 > c0) {
        float stepLength = (c1 - c0) / float(STEPS);
        vec3 stride = dir * stepLength;
        vec3 none = vec3(0.0);
        // The face (rim, ticks) stays a faint cylinder; the hands are the sheets.
        faceWeight = 0.3;
        for (int k = 0; k < STEPS; k++) {
          vec3 p = eye + (c0 + (float(k) + 0.5) * stepLength) * dir;
          float marks;
          vec3 c = stimulus > 1.5 ? analogue(p, stride, none, marks) : clockAt(p, stride, none, marks);
          if (marks < 1e-4) continue;
          // The marks' own colour (unmixed from the background).
          vec3 ink = clamp((c - BACKGROUND * (1.0 - marks)) / marks, 0.0, 1.0);
          // Mark coverage along the step → opacity (a sheet crossed head-on ≈ 0.6).
          float alpha = 1.0 - exp(-marks * stepLength * (abs(stimulus - 1.0) < 0.5 ? 90.0 : 140.0));
          result += transmit * alpha * ink;
          transmit *= 1.0 - alpha;
          if (transmit < 0.02) break;
        }
      }
    }
  }

  // Box edges: the removed half faint in front, the far edges behind.
  float frontEdge = edge(eye + t0 * dir, 1.4 * pixel * t0);
  float backEdge = edge(eye + t1 * dir, 1.4 * pixel * t1);
  result = mix(result, vec3(1.0), (cut ? 0.35 : 0.6) * frontEdge);
  result = mix(result, vec3(0.35), backEdge * transmit);
  colour = vec4(result, 1.0);
}
`;
