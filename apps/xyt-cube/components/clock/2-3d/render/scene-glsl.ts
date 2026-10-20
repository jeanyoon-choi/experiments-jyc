// A real clock, ray-traced per pixel at that pixel's own time.
//
// The object: a minimal wall clock of the Max Bill / Junghans kind, in
// metres. A brushed-aluminium case (a thin cylinder, 300 mm across, 45 mm
// deep, one rounded edge), a matte off-white dial with printed hour batons
// and a minute track (no numerals, no text), slim satin-black hour and minute
// hands and a red lacquered second hand with a round counterweight, stacked at
// their own heights above the dial on a small hub, behind flat glass.
//
// Each screen pixel is a cube point (x, y, t): (x, y) is the point on the
// film of a fixed perspective camera straight in front of the clock, t the
// scene time. The ray through (x, y) meets the clock with every
// hand at its angle at time t, so a turned cut shows one 3D clock whose hands
// stand at different times across the picture, with their real form and
// highlights. No cast shadows or occlusion: only the surfaces' own shading.
// Lighting is computed in linear light and tone-mapped.

export const SCENE_GLSL = /* glsl */ `
// ------------------------------------------------------------- the 3D clock

const float CASE_OUT = 0.150;
const float CASE_IN = 0.1435;
const float CASE_BACK = -0.034;
const float CASE_TOP = 0.011;
const float GLASS_Z = 0.0102;
const float DIAL_Z = 0.0;

// Camera: straight in front of the clock, on its axis, the clock filling
// ~80 % of the shorter side.
const vec3 TARGET = vec3(0.0, 0.0, 0.004);
const float CAMERA_DISTANCE = 0.66;
const float CAMERA_YAW = 0.0;
const float CAMERA_PITCH = 0.0;
const float FOCAL = 1.72;

const vec3 KEY = normalize(vec3(-0.5, 0.62, 0.6));

vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }

float sdRoundRect(vec2 q, vec2 b, float r) {
  vec2 d = abs(q) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

// A flat part of thickness th at height z, from a 2D distance d2.
float extrude(float d2, float z, float zc, float th) {
  vec2 w = vec2(d2, abs(z - zc) - 0.5 * th);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

// The 2D outline of a hand pointing along +y in its own frame q: a tapered
// bar from -tail to len, half-widths w0 (root) to w1 (tip).
float handOutline(vec2 q, float len, float tail, float w0, float w1) {
  float s = clamp((q.y + tail) / (len + tail), 0.0, 1.0);
  float halfWidth = 0.5 * mix(w0, w1, s);
  return max(abs(q.x) - halfWidth, abs(q.y - 0.5 * (len - tail)) - 0.5 * (len + tail));
}

vec2 handFrame(vec2 p, float turn) {
  float a = TAU * turn;
  vec2 along = vec2(sin(a), cos(a));
  return vec2(dot(p, vec2(along.y, -along.x)), dot(p, along));
}

// Hand turns at the scene time (z of the cube point).
vec3 turnsAt(float z) {
  return handPhase + z * secondsPerUnit / PERIOD;
}

// Scene distance and material: 1 case, 2 dial, 3 black hands/hub, 4 red second, 5 cap.
vec2 scene(vec3 p, vec3 turns) {
  float r = length(p.xy);
  float caseD = sdRoundRect(vec2(r - 0.5 * (CASE_OUT + CASE_IN), p.z - 0.5 * (CASE_BACK + CASE_TOP)),
                            vec2(0.5 * (CASE_OUT - CASE_IN), 0.5 * (CASE_TOP - CASE_BACK)), 0.0024);
  vec2 best = vec2(caseD, 1.0);
  float dial = max(r - CASE_IN, abs(p.z + 0.0015) - 0.0015);
  if (dial < best.x) best = vec2(dial, 2.0);
  // Outside the hands' cylinder, step no farther than just past its boundary
  // (the hands are under a millimetre thick and would be stepped over). The
  // 0.5 mm margin keeps the bound from reading as an obstacle to shadow rays;
  // the hands lie ≥ 2.4 mm inside it, so nothing can be skipped.
  float handsBound = max(r - 0.136, abs(p.z - 0.0042) - 0.0046);
  if (handsBound > 0.0) {
    float bound = handsBound + 0.0005;
    return bound < best.x ? vec2(bound, 0.0) : best;
  }

  vec2 q = handFrame(p.xy, turns.x);
  float hour = extrude(handOutline(q, 0.084, 0.018, 0.0062, 0.0042), p.z, 0.0028, 0.0009) - 0.0002;
  q = handFrame(p.xy, turns.y);
  float minute = extrude(handOutline(q, 0.124, 0.022, 0.0048, 0.0030), p.z, 0.0042, 0.0008) - 0.0002;
  float black = min(hour, minute);
  float hub = max(r - 0.0042, abs(p.z - 0.0034) - 0.0034);
  black = min(black, hub);
  if (black < best.x) best = vec2(black, 3.0);

  q = handFrame(p.xy, turns.z);
  float second2 = min(handOutline(q, 0.128, 0.036, 0.0014, 0.0011), length(q - vec2(0.0, -0.03)) - 0.0056);
  float second = extrude(second2, p.z, 0.0057, 0.0006) - 0.00015;
  if (second < best.x) best = vec2(second, 4.0);
  float cap = max(r - 0.0017, abs(p.z - 0.0066) - 0.0006);
  if (cap < best.x) best = vec2(cap, 5.0);
  return best;
}

vec3 sceneNormal(vec3 p, vec3 turns) {
  const vec2 k = vec2(1.0, -1.0);
  const float h = 0.00006;
  return normalize(k.xyy * scene(p + k.xyy * h, turns).x + k.yyx * scene(p + k.yyx * h, turns).x +
                   k.yxy * scene(p + k.yxy * h, turns).x + k.xxx * scene(p + k.xxx * h, turns).x);
}

// A dark studio: a large soft box upper left, a narrow strip right, near-black elsewhere.
vec3 studio(vec3 d, float roughness) {
  float spread = mix(0.08, 0.6, roughness);
  float box = smoothstep(1.0 - spread * 1.4, 1.0 - spread * 0.2, dot(d, normalize(vec3(-0.55, 0.65, 0.52))));
  float strip = smoothstep(1.0 - spread * 0.8, 1.0, dot(d, normalize(vec3(0.85, 0.15, 0.5))));
  float ground = 0.02 + 0.03 * clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  return vec3(ground) + vec3(2.4, 2.35, 2.25) * box + vec3(0.7) * strip;
}

float ggx(vec3 n, vec3 v, vec3 l, float roughness) {
  vec3 h = normalize(v + l);
  float a = roughness * roughness;
  float nh = max(dot(n, h), 0.0);
  float d = a * a / (3.14159 * pow(nh * nh * (a * a - 1.0) + 1.0, 2.0));
  float nl = max(dot(n, l), 0.0);
  float nv = max(dot(n, v), 1e-3);
  float k = a * 0.5;
  float g = nl / (nl * (1.0 - k) + k) * nv / (nv * (1.0 - k) + k);
  return d * g / (4.0 * nv);
}

// Printed marks on the dial at polar (r, angle), antialiased over 'pixel' metres.
float dialInk(vec2 p, float pixel) {
  float r = length(p);
  float turn = atan(p.x, p.y) / TAU;
  float ink = 0.0;
  // Hour batons.
  float k = floor(turn * 12.0 + 0.5);
  float a = TAU * k / 12.0;
  vec2 along = vec2(sin(a), cos(a));
  vec2 across = vec2(along.y, -along.x);
  float quarter = mod(k, 3.0) == 0.0 ? 1.0 : 0.0;
  float halfWidth = mix(0.0013, 0.0021, quarter);
  float inner = mix(0.112, 0.104, quarter);
  float bar = max(abs(dot(p, across)) - halfWidth, abs(dot(p, along) - 0.5 * (0.1335 + inner)) - 0.5 * (0.1335 - inner));
  ink = max(ink, 1.0 - smoothstep(-pixel, pixel, bar));
  // Minute track.
  float m = floor(turn * 60.0 + 0.5);
  float b = TAU * m / 60.0;
  vec2 along2 = vec2(sin(b), cos(b));
  vec2 across2 = vec2(along2.y, -along2.x);
  float tick = max(abs(dot(p, across2)) - 0.00042, abs(dot(p, along2) - 0.1308) - 0.0027);
  ink = max(ink, 0.9 * (1.0 - smoothstep(-pixel, pixel, tick)));
  return ink;
}

vec3 shade(vec3 p, vec3 rd, vec3 turns, float material, float pixel) {
  vec3 n = sceneNormal(p, turns);
  vec3 v = -rd;
  vec3 albedo;
  float roughness;
  float metal = 0.0;
  if (material < 1.5) {
    albedo = toLinear(vec3(0.84, 0.85, 0.86));
    roughness = 0.32;
    metal = 1.0;
  } else if (material < 2.5) {
    albedo = mix(toLinear(vec3(0.89, 0.885, 0.86)), toLinear(vec3(0.07, 0.07, 0.075)), dialInk(p.xy, pixel));
    roughness = 0.7;
  } else if (material < 3.5) {
    albedo = toLinear(vec3(0.035, 0.035, 0.04));
    roughness = 0.38;
  } else if (material < 4.5) {
    albedo = toLinear(vec3(0.78, 0.13, 0.08));
    roughness = 0.24;
  } else {
    albedo = toLinear(vec3(0.8, 0.8, 0.8));
    roughness = 0.15;
    metal = 1.0;
  }
  float nl = max(dot(n, KEY), 0.0);
  vec3 f0 = mix(vec3(0.04), albedo, metal);
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 F = f0 + (1.0 - f0) * fresnel;
  vec3 diffuse = (1.0 - metal) * albedo * (nl * 1.9 + 0.22);
  vec3 specular = F * (ggx(n, v, KEY, roughness) * nl * 1.6) + F * studio(reflect(rd, n), roughness) * 0.6;
  return diffuse + specular;
}

vec3 tonemap(vec3 c) {
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}

// The clock as seen through film point 'image' (screen units, shorter side 1)
// at the cube time z; 'pixel' is the film footprint of one pixel.
vec3 realClock(vec2 image, float z, float pixel) {
  vec3 forward = vec3(sin(CAMERA_YAW) * cos(CAMERA_PITCH), sin(CAMERA_PITCH), cos(CAMERA_YAW) * cos(CAMERA_PITCH));
  vec3 camEye = TARGET + forward * CAMERA_DISTANCE;
  vec3 ahead = -forward;
  vec3 right = normalize(cross(ahead, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, ahead);
  vec3 rd = normalize(ahead * FOCAL + right * image.x + up * image.y);
  vec3 turns = turnsAt(z);

  // The bounding cylinder of the case.
  vec3 background = toLinear(BACKGROUND);
  float t0 = 1e9;
  float t1 = -1e9;
  {
    float a = dot(rd.xy, rd.xy);
    float b = dot(camEye.xy, rd.xy);
    float c = dot(camEye.xy, camEye.xy) - 0.1525 * 0.1525;
    float disc = b * b - a * c;
    if (disc > 0.0) {
      float root = sqrt(disc);
      float lo = (-b - root) / a;
      float hi = (-b + root) / a;
      float za = (CASE_BACK - 0.002 - camEye.z) / rd.z;
      float zb = (CASE_TOP + 0.002 - camEye.z) / rd.z;
      t0 = max(lo, min(za, zb));
      t1 = min(hi, max(za, zb));
    }
  }
  if (t1 <= t0) return BACKGROUND;

  float t = max(t0, 0.0);
  float material = 0.0;
  for (int i = 0; i < 96; i++) {
    vec2 h = scene(camEye + rd * t, turns);
    if (h.x < 0.00003) {
      material = h.y;
      break;
    }
    t += h.x;
    if (t > t1) break;
  }
  vec3 colour = background;
  if (material > 0.5) {
    vec3 p = camEye + rd * t;
    float pixelWorld = pixel * t / FOCAL / max(abs(rd.z), 0.25);
    colour = shade(p, rd, turns, material, pixelWorld);
  }
  // The glass: a faint reflection of the studio over the dial.
  float tg = (GLASS_Z - camEye.z) / rd.z;
  vec3 g = camEye + rd * tg;
  bool glass = tg > 0.0 && length(g.xy) < CASE_IN && (material < 0.5 || tg < t);
  if (glass) {
    float fresnel = 0.04 + 0.96 * pow(1.0 - abs(rd.z), 5.0);
    colour += fresnel * studio(reflect(rd, vec3(0.0, 0.0, 1.0)), 0.05) * 0.35;
  }
  return material > 0.5 || glass ? tonemap(colour) : BACKGROUND;
}
`;
