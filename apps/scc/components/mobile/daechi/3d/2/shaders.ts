// Every surface is unlit and lit by one shared fake street light: shopfront
// spill from both facades, sodium lamps on the curbs, and a coloured wash of
// signage along the walls. No real lights, no post-processing.

export const COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

vec3 lampAt(vec3 p, vec3 n, float x0) {
  float zl = floor(p.z / 26.0 + 0.5) * 26.0;
  vec3 d = vec3(x0, 7.6, zl) - p;
  float dd = dot(d, d);
  return vec3(1.0, 0.70, 0.40) * 30.0 / (dd + 9.0) * (0.35 + 0.65 * max(dot(n, normalize(d)), 0.0));
}

vec3 streetLight(vec3 p, vec3 n) {
  vec3 c = vec3(0.045, 0.05, 0.09) * (0.55 + 0.45 * n.y);
  float dl = max(p.x + 14.0, 0.0);
  float dr = max(21.0 - p.x, 0.0);
  float low = smoothstep(7.5, 0.0, p.y);
  c += vec3(1.0, 0.93, 0.82) * exp(-dl * 0.26) * low * (0.5 + 0.5 * max(-n.x, 0.0));
  c += vec3(0.92, 0.96, 1.0) * exp(-dr * 0.26) * low * (0.5 + 0.5 * max(n.x, 0.0)) * 0.85;
  c += lampAt(p, n, p.x < 4.5 ? -6.6 : 15.6);
  float band = sin(p.z * 0.19) * 0.5 + 0.5;
  float hi = smoothstep(22.0, 2.0, p.y);
  c += mix(vec3(1.0, 0.18, 0.55), vec3(0.15, 0.55, 1.0), band) * exp(-dl * 0.4) * 0.3 * hi;
  c += mix(vec3(0.2, 1.0, 0.55), vec3(1.0, 0.45, 0.1), band) * exp(-dr * 0.4) * 0.22 * hi;
  return c;
}

float fogFactor(vec3 p) {
  float d = length(p - cameraPosition);
  return 1.0 - exp(-uFogDensity * uFogDensity * d * d);
}
`;

// --- Ground: pavers, curbs, asphalt, lane paint, crosswalks -----------------

export const GROUND_VERT = /* glsl */ `
varying vec3 vPos;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const GROUND_FRAG = /* glsl */ `
varying vec3 vPos;
void main() {
  float x = vPos.x;
  float z = vPos.z;
  vec3 n = vec3(0.0, 1.0, 0.0);
  vec3 base;
  bool sidewalk = (x < -6.3) || (x > 15.3);
  if (sidewalk) {
    vec2 b = vec2(x / 0.6, z / 0.3 + floor(x / 0.6) * 0.5);
    vec2 f = fract(b);
    float grout = step(0.06, f.x) * step(f.x, 0.94) * step(0.08, f.y) * step(f.y, 0.92);
    float tone = hash21(floor(b));
    base = mix(vec3(0.28, 0.17, 0.14), vec3(0.34, 0.31, 0.29), step(0.55, tone)) * (0.85 + 0.3 * tone);
    base *= mix(0.55, 1.0, grout);
    // Yellow tactile guide strip.
    float guide = x < 0.0 ? abs(x + 9.4) : abs(x - 18.4);
    base = mix(base, vec3(0.75, 0.6, 0.08), step(guide, 0.2));
  } else if (x < -6.0 || x > 15.0) {
    base = vec3(0.42);
  } else if (x > 3.6 && x < 5.4) {
    base = vec3(0.16, 0.16, 0.15);
    float edge = min(abs(x - 3.75), abs(x - 5.25));
    base = mix(base, vec3(0.9, 0.7, 0.1), step(edge, 0.08));
  } else {
    base = vec3(0.07, 0.07, 0.075) * (0.85 + 0.3 * hash21(floor(vPos.xz * 3.0)));
    // Dashed lane lines.
    float lx = x < 3.6 ? x + 6.0 : x - 5.4;
    float lane = abs(fract(lx / 3.2 + 0.5) - 0.5) * 3.2;
    float dash = step(fract(z / 12.0), 0.45);
    base = mix(base, vec3(0.8), step(lane, 0.07) * dash * step(0.5, lx) * step(lx, 9.3));
    // Yellow centre line beside the median.
    base = mix(base, vec3(0.85, 0.65, 0.1), step(abs(x - 3.45), 0.07) + step(abs(x - 5.55), 0.07));
    // Crosswalks and stop lines.
    float cz = mod(z + 38.0, 140.0);
    float zebra = step(cz, 5.0) * step(0.5, fract(x / 1.1));
    float stopL = step(abs(cz - 7.0), 0.25) * step(x, 3.6);
    float stopR = step(abs(cz + 2.0 - 140.0), 0.25) * step(5.4, x);
    base = mix(base, vec3(0.82), clamp(zebra + stopL + stopR, 0.0, 1.0));
  }
  vec3 col = base * streetLight(vPos, n) * 1.6;
  // Wet sheen on the asphalt: a smear of the signs above.
  if (!sidewalk) col += vec3(0.05, 0.03, 0.06) * (0.5 + 0.5 * sin(z * 0.19));
  gl_FragColor = vec4(mix(col, uFogColor, fogFactor(vPos)), 1.0);
}
`;

// --- Damage: breaches, cracks and collapse, read from one small texture -----
// Row b (one per building): texel 0 pivot (street-side base x, centre z,
// height, direction to the street), texel 1 state (collapse start in uTime, 0
// when standing; seed; lean; damage 0–1), texels 2–5 holes (z, y, radius, seed).

export const DAMAGE = /* glsl */ `
uniform sampler2D uDamage;
const float COLLAPSE_TIME = 2.8;
vec4 damageTexel(float b, int col) { return texelFetch(uDamage, ivec2(col, int(b + 0.5)), 0); }
// Shakes, leans toward the street over its base edge and sinks into its own
// rubble; k runs 0 → 1 over the collapse.
vec3 collapsed(vec3 p, float b, out float k) {
  k = 0.0;
  if (b < -0.5) return p;
  vec4 st = damageTexel(b, 1);
  float t = uTime - st.x;
  if (st.x <= 0.0 || t <= 0.0) return p;
  vec4 bl = damageTexel(b, 0);
  k = clamp(t / COLLAPSE_TIME, 0.0, 1.0);
  float shake = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.7, 2.4, t));
  float fall = clamp((t - 0.3) / (COLLAPSE_TIME - 0.3), 0.0, 1.0);
  fall *= fall;
  vec3 q = p;
  q.x += sin(t * 37.0 + st.y * 9.0) * 0.16 * shake;
  q.z += sin(t * 29.0 + st.y * 5.0) * 0.1 * shake;
  float a = st.z * fall * bl.w;
  vec2 d = vec2(q.x - bl.x, q.y);
  float c = cos(a), s = sin(a);
  q.x = bl.x + d.x * c + d.y * s;
  q.y = -d.x * s + d.y * c - fall * bl.z * 0.93;
  return q;
}
`;

// --- Buildings: concrete, fluorescent classroom windows, lit shopfronts -----

export const BUILDING_VERT = /* glsl */ `
${DAMAGE}
attribute float aSeed;
attribute float aBuilding;
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vN;
varying float vSeed;
varying float vB;
varying float vK;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  vN = normal;
  vSeed = aSeed;
  vB = aBuilding;
  float k;
  vWorld = collapsed(w.xyz, aBuilding, k);
  vK = k;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`;

// vSeed in [0, 1): Daechi commercial building — tiled walls, a band under each
// floor's aluminium ribbon window (where the floor signs hang), fluorescent
// classrooms, cut-vinyl words on the glass one character per pane.
// vSeed >= 2: apartment slab on the horizon. vSeed < 0: plain rooftop box.
// Patterns follow the standing building (vPos); light and fog the fallen one.
export const BUILDING_FRAG = /* glsl */ `
${DAMAGE}
#define WORDS 20
uniform sampler2D uGlyphs;
uniform float uWords[WORDS * 6];
uniform float uWordLen[WORDS];
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vN;
varying float vSeed;
varying float vB;
varying float vK;

vec3 tileColor(float s) {
  float k = floor(fract(s * 7.13) * 5.0);
  if (k < 1.0) return vec3(0.50, 0.44, 0.36);
  if (k < 2.0) return vec3(0.36, 0.24, 0.18);
  if (k < 3.0) return vec3(0.42, 0.42, 0.43);
  if (k < 4.0) return vec3(0.58, 0.56, 0.52);
  return vec3(0.44, 0.30, 0.26);
}

float vnoise(vec2 p, float seed) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i + seed);
  float b = hash21(i + vec2(1.0, 0.0) + seed);
  float c = hash21(i + vec2(0.0, 1.0) + seed);
  float d = hash21(i + vec2(1.0, 1.0) + seed);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Thin cracks: the 0.5 level line of value noise.
float cracks(vec2 p, float seed) {
  return 1.0 - smoothstep(0.004, 0.022, abs(vnoise(p, seed) - 0.5));
}

void main() {
  vec3 n = normalize(vN);
  vec3 rightV = vec3(n.z, 0.0, -n.x);
  float u = dot(vPos, rightV);
  float y = vPos.y;
  const float PANE = 1.15;
  // Glyph lookup is prepared outside any branch so its derivatives hold.
  float fu = u / PANE;
  float cu = floor(fu);
  float fuf = fract(fu);
  float fy = (y - 4.2) / 3.4;
  float fl = floor(fy);
  float fyf = fract(fy);
  float wi = floor(hash21(vec2(fl, vSeed * 17.0)) * float(WORDS));
  int w = int(clamp(wi, 0.0, float(WORDS - 1)));
  float len = uWordLen[w];
  float start = floor(hash21(vec2(fl + 2.0, vSeed)) * 4.0);
  float k = mod(cu - start, len + 1.0);
  float g = k < len ? uWords[w * 6 + int(min(k, 5.0))] : -1.0;
  // Glass inside the frame, glyph square across the pane width.
  vec2 lp = vec2((fuf - 0.05) / 0.9, (fyf - 0.4) / 0.44);
  float aspect = (PANE * 0.9) / (3.4 * 0.44);
  vec2 qg = vec2(lp.x, (lp.y - 0.5) / aspect + 0.5);
  vec2 cell = vec2(mod(max(g, 0.0), 8.0), floor(max(g, 0.0) / 8.0));
  vec2 guv = vec2((cell.x + clamp(qg.x, 0.0, 1.0)) / 8.0, 1.0 - (cell.y + 1.0 - clamp(qg.y, 0.0, 1.0)) / 8.0);
  float gscale = 1.0 / (PANE * 0.9 * 8.0);
  vec2 gdx = vec2(dFdx(u), dFdx(y)) * gscale;
  vec2 gdy = vec2(dFdy(u), dFdy(y)) * gscale;
  float glyph = textureGrad(uGlyphs, guv, gdx, gdy).r;
  glyph *= step(0.0, g) * step(0.0, qg.y) * step(qg.y, 1.0) * step(0.0, qg.x) * step(qg.x, 1.0);

  vec4 st = vB > -0.5 ? damageTexel(vB, 1) : vec4(0.0);
  float dmg = max(st.w, vK);
  vec3 L = streetLight(vWorld, n);
  vec3 col;
  if (abs(n.y) > 0.5) {
    col = vec3(0.035, 0.035, 0.04);
    // A fallen building's top is its rubble.
    if (vK > 0.0 && n.y > 0.5) {
      // Heaped blocks of tile and concrete with dark gaps between them.
      float lump = vnoise(vPos.xz * 1.1, st.y);
      float grain = vnoise(vPos.xz * 3.7, st.y + 5.0);
      vec3 rubble = mix(vec3(0.46, 0.45, 0.43), tileColor(abs(vSeed)), smoothstep(0.4, 0.6, lump));
      rubble *= (0.3 + 0.8 * grain) * (1.0 - 0.75 * cracks(vPos.xz * 1.9, st.y + 9.0));
      col = mix(col, rubble * L * 1.5, smoothstep(0.55, 1.0, vK));
    }
  } else if (vSeed < 0.0) {
    col = tileColor(-vSeed) * 0.6 * L * 1.6;
  } else if (vSeed >= 2.0) {
    // Apartment slab: off-white walls, rows of homes.
    float ay = y / 2.8;
    float ax = u / 3.2;
    float win = step(0.3, fract(ay)) * step(fract(ay), 0.78) * step(0.15, fract(ax)) * step(fract(ax), 0.85);
    float home = hash21(floor(vec2(ax, ay)) + vSeed);
    vec3 lit = mix(vec3(1.0, 0.8, 0.55), vec3(0.85, 0.9, 1.0), step(0.75, home)) * 0.75;
    lit *= step(vK * 1.3, hash21(floor(vec2(ax, ay)) * 1.7 + vSeed));
    col = mix(vec3(0.16, 0.16, 0.17), home > 0.45 ? lit : vec3(0.03, 0.035, 0.05), win);
  } else {
    vec3 tile = tileColor(vSeed);
    vec2 tg = fract(vec2(u / 0.3, y / 0.15));
    float grout = step(0.06, tg.x) * step(0.1, tg.y);
    vec3 wall = tile * mix(0.72, 1.0, grout);
    col = wall * L * 1.8;
    float room = floor(cu / 4.0);
    // Rooms go dark as the building comes down.
    float alive = step(vK * 1.4, hash21(vec2(room * 1.3, fl) + vSeed * 7.0));
    if (y < 4.2) {
      float glass = step(0.25, y) * step(y, 3.5) * step(0.07, fract(u / 3.0));
      float shop = hash11(floor(u / 6.0) * 1.7 + vSeed * 13.0);
      vec3 light = mix(vec3(1.0, 0.88, 0.7), vec3(0.85, 0.95, 1.0), step(0.5, shop));
      light *= 0.55 + 0.45 * hash11(floor(u / 3.0) * 7.0 + vSeed);
      light *= step(0.12, shop) * alive;
      col = mix(col, light, glass);
    } else {
      // Concrete band under the ribbon window.
      col *= fyf < 0.36 ? 0.78 : 1.0;
      float ribbon = step(0.37, fyf) * step(fyf, 0.87);
      float glass = step(0.05, fuf) * step(fuf, 0.95) * step(0.4, fyf) * step(fyf, 0.84);
      float r = hash21(vec2(room, fl) + vSeed * 31.7);
      vec3 fluo = mix(vec3(0.8, 0.92, 1.0), vec3(1.0, 0.95, 0.84), step(0.72, hash21(vec2(room * 3.1, fl + vSeed))));
      float blind = 0.55 + 0.45 * step(0.5, fract(fyf * 11.0)) * step(0.7, r);
      vec3 inside = r > 0.16 ? fluo * blind * (0.78 + 0.22 * r) * alive : vec3(0.02, 0.025, 0.04);
      vec3 frame = vec3(0.5, 0.52, 0.55) * L * 1.6;
      vec3 win = mix(frame, inside, glass);
      // Most academy floors letter their glass.
      float lettered = step(0.3, hash21(vec2(fl * 3.7, vSeed * 91.0)));
      float hue = hash21(vec2(fl, vSeed * 5.0));
      vec3 vinyl = hue < 0.3 ? vec3(0.9, 0.12, 0.08) : hue < 0.55 ? vec3(0.1, 0.25, 0.85) : hue < 0.8 ? vec3(0.97) : vec3(1.0, 0.8, 0.1);
      win = mix(win, vinyl * (r > 0.16 ? 0.95 : 0.3), glyph * glass * lettered);
      col = mix(col, win, ribbon);
    }
    if (dmg > 0.0) {
      vec4 bl = damageTexel(vB, 0);
      vec2 fp = vec2(u, y);
      float near = 0.0;
      // Breaches on the street face: a ragged hole through tile and glass,
      // broken concrete round its edge, floor slabs and dark rooms inside.
      if (n.x * bl.w > 0.5) {
        for (int h = 0; h < 4; h++) {
          vec4 hl = damageTexel(vB, 2 + h);
          if (hl.z <= 0.0) continue;
          vec2 d = vec2(vPos.z - hl.x, y - hl.y);
          vec2 hp = vec2(vPos.z, y);
          float jag = 0.62 + 0.55 * vnoise(hp * 1.3, hl.w * 13.0) + 0.18 * vnoise(hp * 4.7, hl.w * 7.0);
          float rr = length(d) / (hl.z * jag);
          near = max(near, 1.0 - smoothstep(1.0, 3.2, rr));
          if (rr < 1.0) {
            // Inside: the classroom's fluorescent light half out, the broken
            // edge of the floor slab, the room's back wall in shadow.
            float slab = step(fyf, 0.12) * step(0.02, fyf);
            float lit = step(0.35, hash21(vec2(floor(vPos.z / 1.6), fl) + hl.w));
            vec3 room = mix(vec3(0.03, 0.032, 0.04), vec3(0.62, 0.68, 0.7) * (0.25 + 0.3 * fyf), lit);
            room *= 0.55 + 0.45 * smoothstep(1.0, 0.3, rr);
            col = mix(room, vec3(0.5, 0.49, 0.47) * L * 1.4, slab);
          } else if (rr < 1.32) {
            col = vec3(0.62, 0.6, 0.56) * L * 1.8 * (0.55 + 0.45 * vnoise(vec2(vPos.z, y) * 7.0, hl.w));
          } else if (rr < 2.4) {
            // Soot and dust blown over the wall round the hole.
            col *= mix(0.4, 1.0, smoothstep(1.32, 2.4, rr + 0.5 * vnoise(vec2(vPos.z, y) * 1.3, hl.w)));
          }
        }
      }
      // Cracks spread from the holes; a falling building cracks all over.
      float c = cracks(fp * 1.7, vSeed * 40.0) * clamp(near * 1.3 + vK * 2.5, 0.0, 1.0);
      col *= 1.0 - 0.75 * c;
    }
    // Dust clings to it as it sinks.
    col = mix(col, vec3(0.32, 0.3, 0.28) * L * 1.5, vK * 0.45);
  }
  gl_FragColor = vec4(mix(col, uFogColor, fogFactor(vWorld)), 1.0);
}
`;

// --- Signs: one atlas, steady / blinking / pulsing / LED ticker / chase -----

export const SIGN_VERT = /* glsl */ `
${DAMAGE}
attribute vec4 aRect;
attribute vec4 aAnim;
attribute vec3 aSize;
attribute float aBroken;
attribute float aBuilding;
varying vec2 vUv;
varying vec4 vRect;
varying vec4 vAnim;
varying vec3 vSize;
varying vec3 vPos;
varying float vK;
void main() {
  if (aBroken > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vUv = uv;
  vRect = aRect;
  vAnim = aAnim;
  vSize = aSize;
  vec4 w = modelMatrix * vec4(position, 1.0);
  float k;
  vPos = collapsed(w.xyz, aBuilding, k);
  vK = k;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
}
`;

export const SIGN_BRIGHTNESS = /* glsl */ `
varying float vK;
float signBrightness(vec4 anim) {
  float mode = anim.x;
  float t = uTime * anim.z + anim.y;
  float b = anim.w;
  // A sign on a falling building sputters and dies.
  if (vK > 0.0) b *= step(vK * 1.15, hash11(floor(uTime * 13.0) + anim.y * 31.0)) * (1.0 - vK * 0.5);
  if (mode > 0.5 && mode < 1.5) b *= 0.15 + 0.85 * step(0.38, fract(t));
  else if (mode > 1.5 && mode < 2.5) b *= 0.72 + 0.28 * sin(t * 6.2832);
  else if (mode > 4.5) b *= 0.25 + 0.75 * step(0.1, hash11(floor(uTime * 11.0) + anim.y * 17.0));
  return b;
}
`;

export const SIGN_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec4 vRect;
varying vec4 vAnim;
varying vec3 vSize;
varying vec3 vPos;
${SIGN_BRIGHTNESS}
void main() {
  vec2 luv = vUv;
  if (!gl_FrontFacing) luv.x = 1.0 - luv.x;
  float mode = vAnim.x;
  if (mode > 2.5 && mode < 3.5) luv.x = fract(luv.x * vSize.z + uTime * vAnim.z);
  vec3 c = texture2D(uAtlas, vRect.xy + luv * vRect.zw).rgb;
  float b = signBrightness(vAnim);
  if (mode > 3.5 && mode < 4.5) {
    // Running bulbs around the edge.
    vec2 m = vec2(min(luv.x, 1.0 - luv.x) * vSize.x, min(luv.y, 1.0 - luv.y) * vSize.y);
    float edge = min(m.x, m.y);
    if (edge < 0.16) {
      float s = m.x < m.y ? luv.y * vSize.y : luv.x * vSize.x;
      float bulb = step(length(vec2(fract(s / 0.22) - 0.5, (edge - 0.08) / 0.22)), 0.32);
      float on = step(fract(s / 0.66 - uTime * 2.2 + vAnim.y), 0.4);
      c = mix(vec3(0.05), vec3(1.0, 0.85, 0.45) * (0.2 + 0.8 * on) * 1.2, bulb);
    }
  }
  gl_FragColor = vec4(mix(c * b, uFogColor, fogFactor(vPos) * 0.92), 1.0);
}
`;

export const HALO_VERT = /* glsl */ `
${DAMAGE}
attribute vec3 aColor;
attribute vec4 aAnim;
attribute vec3 aSize;
attribute float aBroken;
attribute float aBuilding;
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vAnim;
varying vec3 vSize;
varying vec3 vPos;
varying float vK;
void main() {
  if (aBroken > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vUv = uv;
  vColor = aColor;
  vAnim = aAnim;
  vSize = aSize;
  vec4 w = modelMatrix * vec4(position, 1.0);
  float k;
  vPos = collapsed(w.xyz, aBuilding, k);
  vK = k;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
}
`;

export const HALO_FRAG = /* glsl */ `
varying vec2 vUv;
varying vec3 vColor;
varying vec4 vAnim;
varying vec3 vSize;
varying vec3 vPos;
${SIGN_BRIGHTNESS}
void main() {
  // vSize: inner sign size (w, h) and the margin around it, all in metres.
  vec2 full = vSize.xy + 2.0 * vSize.z;
  vec2 p = abs((vUv - 0.5) * full);
  vec2 q = max(p - vSize.xy * 0.5, 0.0);
  float d = length(q);
  float g = exp(-d * 2.6 / max(vSize.z, 0.2)) * (1.0 - smoothstep(vSize.z * 0.75, vSize.z, max(q.x, q.y)));
  float b = signBrightness(vAnim);
  vec3 col = vColor * g * 0.42 * b * (1.0 - fogFactor(vPos));
  gl_FragColor = vec4(col, 1.0);
}
`;

// --- Goldfish: upright, bipedal, backpacked; walking in the vertex shader ---
// Parts: 0 body, 1 eye, 2/3 legs, 4 backpack and straps, 5/6 pectoral fins,
// 7 phone, 8 tail, 9 dorsal fin. The fish stands nose-up: belly forward (-z),
// back (+z) carries the bag, the tail fans down behind the legs. With FLY
// defined the instance matrix alone places a lifted or swimming fish.

export const FISH_VERT = /* glsl */ `
attribute float aPart;
attribute vec4 aWalk;   // speed (m/s along z), phase, sway, phone
attribute vec3 aScale;  // main scale colour
attribute vec3 aPatch;  // calico / second colour
attribute vec3 aBag;
#ifndef FLY
attribute float aHide;
#endif
uniform float uZMin;
uniform float uZLen;
varying vec3 vFront;
varying vec3 vBack;
vec3 vPos;
vec3 vN;
vec3 vCol;
float vEmit;

vec3 rotX(vec3 p, vec3 pivot, float a) {
  vec3 d = p - pivot;
  float c = cos(a), s = sin(a);
  return pivot + vec3(d.x, c * d.y - s * d.z, s * d.y + c * d.z);
}
vec3 rotZ(vec3 p, vec3 pivot, float a) {
  vec3 d = p - pivot;
  float c = cos(a), s = sin(a);
  return pivot + vec3(c * d.x - s * d.y, s * d.x + c * d.y, d.z);
}

void main() {
  vec3 p = position;
#ifdef FLY
  float speed = 0.0;
  float moving = 1.0;
  float ph = uTime * 11.0 + aWalk.y * 6.2832;
  float flap = sin(uTime * 13.0 + aWalk.y * 40.0);
  float tailAmp = 0.34;
#else
  if (aHide > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float speed = aWalk.x;
  float moving = step(0.01, abs(speed));
  float ph = uTime * abs(speed) * 5.2 + aWalk.y * 6.2832;
  float flap = sin(uTime * 5.0 + aWalk.y * 40.0);
  float tailAmp = 0.14;
#endif
  float swing = sin(ph) * 0.6 * moving;
  int part = int(aPart + 0.5);
  if (part == 2) p = rotX(p, vec3(0.0, 0.56, 0.0), swing);
  else if (part == 3) p = rotX(p, vec3(0.0, 0.56, 0.0), -swing);
  else if (part == 5) p = rotZ(p, vec3(-0.18, 1.0, 0.0), -0.35 * flap - 0.2);
  else if (part == 6) p = rotZ(p, vec3(0.18, 1.0, 0.0), 0.35 * flap + 0.2);
  else if (part == 8) p.x += sin(uTime * 4.0 + aWalk.y * 20.0 + p.y * 5.0) * tailAmp * (0.62 - p.y);
  else if (part == 9) p.x += flap * 0.03 * (p.z - 0.2);
  if (part == 7 && aWalk.w < 0.5) p = vec3(0.0, 1.0, 0.0);
#ifndef FLY
  if (part != 2 && part != 3) {
    // Waddle on the hips; idle fish breathe.
    p = rotZ(p, vec3(0.0, 0.56, 0.0), sin(ph) * 0.12 * moving);
    p.y += abs(cos(ph)) * 0.05 * moving + (1.0 - moving) * sin(uTime * 2.0 + aWalk.y * 9.0) * 0.015;
  }
#endif

  vec4 w = instanceMatrix * vec4(p, 1.0);
#ifndef FLY
  float z0 = instanceMatrix[3].z;
  float zt = uZMin + mod(z0 + speed * uTime - uZMin, uZLen);
  w.z += zt - z0;
  w.x += sin(uTime * 0.21 + aWalk.y * 19.0) * aWalk.z * moving;
#endif
  vPos = w.xyz;
  vN = normalize(mat3(instanceMatrix) * normal);

  float patchy = step(0.6, hash21(floor(position.xy * vec2(7.0, 6.0) + position.z * 3.0) + aWalk.y * 31.0));
  vec3 col = mix(aScale, aPatch, patchy);
  vEmit = 0.0;
  if (part == 0 && position.z < -0.12) col = mix(col, vec3(1.0, 0.86, 0.62), 0.3);
  if (part == 1) col = vec3(0.01);
  else if (part == 2 || part == 3) col = aScale * 0.85;
  else if (part == 4) col = aBag;
  else if (part == 5 || part == 6 || part == 8 || part == 9) { col = mix(aScale, vec3(1.0, 0.92, 0.8), 0.4); vEmit = 0.25; }
  else if (part == 7) { col = vec3(0.75, 0.88, 1.0); vEmit = 1.0; }
  vCol = col;
  // Lit per vertex: the crowd overlaps itself many times over, so per-pixel
  // street light was most of its cost. Fins, tail and phone are open
  // triangles and also carry the light of their other side.
  float fog = fogFactor(w.xyz);
  vec3 front = vEmit > 0.9 ? col * 1.4 : col * streetLight(w.xyz, vN) * 1.6 + col * vEmit * 0.35;
  vFront = mix(front, uFogColor, fog);
  vBack = vFront;
  if (part >= 5 && vEmit < 0.9) vBack = mix(col * streetLight(w.xyz, -vN) * 1.6 + col * vEmit * 0.35, uFogColor, fog);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const FISH_FRAG = /* glsl */ `
varying vec3 vFront;
varying vec3 vBack;
void main() {
  gl_FragColor = vec4(gl_FrontFacing ? vFront : vBack, 1.0);
}
`;

export const PEOPLE_FRAG = /* glsl */ `
varying vec3 vPos;
varying vec3 vN;
varying vec3 vCol;
varying float vEmit;
void main() {
  vec3 col = vEmit > 0.5 ? vCol * 1.4 : vCol * streetLight(vPos, normalize(vN)) * 1.5;
  gl_FragColor = vec4(mix(col, uFogColor, fogFactor(vPos)), 1.0);
}
`;

// --- Shards: pieces of a smashed sign, each showing its part of the face ---

export const SHARD_VERT = /* glsl */ `
attribute vec4 aRect;
attribute float aBright;
varying vec2 vUv;
varying vec4 vRect;
varying float vBright;
varying vec3 vPos;
void main() {
  vUv = uv;
  vRect = aRect;
  vBright = aBright;
  vec4 w = instanceMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const SHARD_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec4 vRect;
varying float vBright;
varying vec3 vPos;
void main() {
  vec2 luv = vUv;
  if (!gl_FrontFacing) luv.x = 1.0 - luv.x;
  vec3 c = texture2D(uAtlas, vRect.xy + luv * vRect.zw).rgb * vBright;
  gl_FragColor = vec4(mix(c, uFogColor, fogFactor(vPos)), 1.0);
}
`;

// --- Cars and 학원차: stop-and-go per lane, brake lights, hazards -----------

export const CAR_MOTION = /* glsl */ `
attribute vec4 aCar;   // speed, lane phase, stop-go amplitude, kind (0 car, 1 shuttle van)
uniform float uZMin;
uniform float uZLen;
float carTravel(vec4 car) {
  float w = 0.32;
  return car.x * (uTime + car.z * sin(uTime * w + car.y) / w);
}
float carBraking(vec4 car) {
  return step(0.01, abs(car.x)) * smoothstep(0.1, 0.5, sin(uTime * 0.32 + car.y)) * step(0.3, car.z);
}
vec3 travelled(vec4 w, vec4 car) {
  float z0 = instanceMatrix[3].z;
  float zt = uZMin + mod(z0 + carTravel(car) - uZMin, uZLen);
  return vec3(w.x, w.y, w.z + zt - z0);
}
`;

export const CAR_VERT = /* glsl */ `
${CAR_MOTION}
attribute float aPart;
attribute vec3 aBody;
#ifndef FLY
attribute float aHide;
#endif
varying vec3 vPos;
varying vec3 vN;
varying vec3 vCol;
varying float vEmit;
void main() {
#ifndef FLY
  if (aHide > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
#endif
  vec4 w = instanceMatrix * vec4(position, 1.0);
#ifdef FLY
  vPos = w.xyz;
#else
  vPos = travelled(w, aCar);
#endif
  vN = normalize(mat3(instanceMatrix) * normal);
  int part = int(aPart + 0.5);
  vec3 body = aBody;
  vEmit = 0.0;
  vec3 col = body;
  if (part == 1) col = vec3(0.04, 0.05, 0.07);
  else if (part == 4) col = vec3(0.02);
  else if (part == 2) {
    vEmit = 1.0;
    col = aCar.w > 0.5 ? vec3(1.0, 0.6, 0.05) * step(0.5, fract(uTime * 0.85 + aCar.y)) : vec3(1.0, 0.95, 0.85);
  } else if (part == 3) {
    vEmit = 1.0;
    float brake = carBraking(aCar);
    col = aCar.w > 0.5 ? vec3(1.0, 0.6, 0.05) * step(0.5, fract(uTime * 0.85 + aCar.y)) : vec3(0.75, 0.04, 0.03) * (0.6 + 0.9 * brake);
  }
  if (part == 0 && aCar.w > 0.5 && position.y > 0.5 && position.y < 0.62) col = vec3(0.04);
  vCol = col;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
}
`;

export const CAR_FRAG = PEOPLE_FRAG;

// Billboard flares on each lamp, plus a streak on the wet road toward us.
export const FLARE_VERT = /* glsl */ `
${CAR_MOTION}
attribute vec3 aLight;   // light position in the car's local frame
attribute vec3 aFlare;   // corner x, corner y, kind (0 head, 1 tail, 2 head streak, 3 tail streak)
attribute float aHide;
varying vec2 vCorner;
varying vec3 vCol;
varying float vKind;
varying vec3 vPos;
void main() {
  if (aHide > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec4 w = instanceMatrix * vec4(aLight, 1.0);
  vec3 c = travelled(w, aCar);
  vec3 fwd = normalize(mat3(instanceMatrix) * vec3(0.0, 0.0, -1.0));
  vec3 toCam = normalize(cameraPosition - c);
  float kind = aFlare.z;
  bool tail = kind == 1.0 || kind == 3.0;
  float facing = max(dot(tail ? -fwd : fwd, toCam), 0.0);
  bool van = aCar.w > 0.5;
  float blink = step(0.5, fract(uTime * 0.85 + aCar.y));
  vec3 col = tail ? vec3(1.0, 0.08, 0.04) * (0.45 + 0.9 * carBraking(aCar)) : vec3(1.0, 0.93, 0.78);
  float size = tail ? 0.55 : 1.1;
  if (van) { col = vec3(1.0, 0.55, 0.05) * blink; size = 0.8; facing = max(facing, 0.6); }
  col *= 0.25 + 0.75 * facing;
  vCorner = aFlare.xy;
  vKind = kind;
  vPos = c;
  if (kind < 1.5) {
    vec4 v = viewMatrix * vec4(c, 1.0);
    v.xy += aFlare.xy * size * (0.4 + facing);
    gl_Position = projectionMatrix * v;
  } else {
    // Streak lies on the road and runs toward the camera.
    vec3 g = vec3(c.x + aFlare.x * 0.22, 0.03, c.z + (aFlare.y * 0.5 + 0.5) * 7.0);
    col *= 0.45;
    gl_Position = projectionMatrix * viewMatrix * vec4(g, 1.0);
  }
  vCol = col;
}
`;

export const FLARE_FRAG = /* glsl */ `
varying vec2 vCorner;
varying vec3 vCol;
varying float vKind;
varying vec3 vPos;
void main() {
  float a;
  if (vKind < 1.5) {
    float r = length(vCorner);
    a = exp(-r * r * 7.0) + 0.6 * exp(-r * r * 60.0);
  } else {
    a = (1.0 - abs(vCorner.x)) * (1.0 - (vCorner.y * 0.5 + 0.5));
    a *= a;
  }
  gl_FragColor = vec4(vCol * a * (1.0 - fogFactor(vPos)), 1.0);
}
`;

// --- Street trees: canopies lit green from the lamps beneath ----------------

export const TREE_VERT = /* glsl */ `
attribute float aSeed;
varying vec3 vPos;
varying vec3 vN;
varying float vSeed;
void main() {
  vec3 p = position;
  vec4 w = instanceMatrix * vec4(p, 1.0);
  float h = hash11(aSeed * 13.0 + floor(position.x * 3.0) + floor(position.y * 3.0) * 7.0);
  w.xyz += normalize(mat3(instanceMatrix) * normal) * (h - 0.5) * 0.6;
  w.x += sin(uTime * 0.7 + aSeed * 5.0 + w.y * 0.3) * 0.08 * max(w.y - 6.0, 0.0) * 0.2;
  vPos = w.xyz;
  vN = normalize(mat3(instanceMatrix) * normal);
  vSeed = h;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const TREE_FRAG = /* glsl */ `
varying vec3 vPos;
varying vec3 vN;
varying float vSeed;
void main() {
  vec3 n = normalize(vN);
  vec3 leaf = mix(vec3(0.14, 0.32, 0.08), vec3(0.3, 0.5, 0.12), vSeed);
  vec3 l = streetLight(vPos, n);
  // Leaves glow where the lamp shines up through them.
  l += vec3(0.5, 0.45, 0.2) * max(-n.y, 0.0) * 0.6;
  vec3 col = leaf * l * 2.0;
  gl_FragColor = vec4(mix(col, uFogColor, fogFactor(vPos)), 1.0);
}
`;

// --- Static props: trunks, poles, lamp heads, bollards ----------------------

export const PROP_VERT = /* glsl */ `
attribute vec3 color;
attribute float aEmit;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vCol;
varying float vEmit;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  vN = normal;
  vCol = color;
  vEmit = aEmit;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const PROP_FRAG = PEOPLE_FRAG;

// --- Debris: blocks of tile and concrete from breached and falling walls ----

export const DEBRIS_VERT = /* glsl */ `
attribute vec3 aColor;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vCol;
void main() {
  vec4 w = instanceMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  vN = normalize(mat3(instanceMatrix) * normal);
  vCol = aColor;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const DEBRIS_FRAG = /* glsl */ `
varying vec3 vPos;
varying vec3 vN;
varying vec3 vCol;
void main() {
  vec3 col = vCol * streetLight(vPos, normalize(vN)) * 1.7;
  gl_FragColor = vec4(mix(col, uFogColor, fogFactor(vPos)), 1.0);
}
`;

// --- Dust: soft camera-facing puffs rolling out from the base ---------------

export const DUST_VERT = /* glsl */ `
attribute float aAlpha;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vPos;
void main() {
  vec3 c = instanceMatrix[3].xyz;
  float s = length(instanceMatrix[0].xyz);
  vec4 v = viewMatrix * vec4(c, 1.0);
  v.xy += position.xy * s;
  vUv = position.xy * 2.0;
  vAlpha = aAlpha;
  vPos = c;
  gl_Position = projectionMatrix * v;
}
`;

export const DUST_FRAG = /* glsl */ `
varying vec2 vUv;
varying float vAlpha;
varying vec3 vPos;
void main() {
  // Soft and billowing: a gaussian broken up by slow value noise.
  vec2 q = vUv * 2.2 + vPos.xz * 0.37 + vec2(0.0, -uTime * 0.25);
  vec2 i = floor(q);
  vec2 f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  float n = mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  float r2 = dot(vUv, vUv);
  float m = exp(-r2 * 3.2) * (1.0 - smoothstep(0.6, 1.0, r2)) * (0.45 + 0.75 * n);
  vec3 col = vec3(0.34, 0.31, 0.28) * (streetLight(vPos, vec3(0.0, 1.0, 0.0)) * 1.3 + 0.05);
  gl_FragColor = vec4(mix(col, uFogColor, fogFactor(vPos)), m * vAlpha);
}
`;
