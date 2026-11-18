// 재질 (bubble/8, user 2026-11-03): every material other than bubble/7's coat is
// one entry here — 젤 · 세럼, 석고, 석고 v2, 유리, 맥시멀 믹스 … (액체 until 2026-11-11) — each in its own file with
// its GLSL, its uniforms' defaults, its sliders and its 연출. The raft's spheres
// (render/foam.ts) and the objects (objects/object-pass.ts) describe the point
// they shade as one Surface and call shadeMaterial(s) (index.ts), so a material
// is written once and draws both. The coat (material 0) stays in the passes, as
// bubble/7 drew it.

import type { Colour } from "../look";
import { float, HEIGHT_STEPS } from "../units";

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
  /** Rows of chips under its 연출, each setting one of its uniforms and kept when a 연출 is chosen (인쇄물's 방향). */
  choices?: readonly { key: string; label: string; options: readonly { value: number; label: string }[] }[];
  /** Its own colour chips (user, 2026-11-05), shown after the shared coats and before 섞음. */
  coats?: readonly { id: string; label: string; colour: Colour }[];
  /** What choosing a colour (a chip, 섞음 or the picker) also sets, so the colour takes (젤: 코팅 색 사용 1). */
  coatChosen?: Partial<Values>;
  /**
   * Whether, with these values, its colour is its own and not the coat (젤's 색상 · 채도, 맥시멀 믹스's palettes).
   * 섞음 then leaves the look as it is and mixes that colour's hue (user, 2026-11-13), instead of turning the coat on.
   */
  ownColour?: (look: Partial<Values>) => boolean;
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
  float body;      // which body it is in the raft's frame (SHADING bodyId)
};

// 이웃 반사 · 맞닿은 틈 (user, 2026-11-17): the raft as it was drawn last frame, at half size, so a surface can see
// what stands round it: rgb as shown (blurred in its mips), a its height in eighths of a CSS px plus its body's id
// (read unfiltered). One frame late; nothing in the raft moves far in a frame.
uniform sampler2D lastScene;

vec3 screenAt(Surface s) {
  vec3 at = screenOf(s.o);
  at.xy += frame * 0.5;
  return at;
}

vec2 lastUv(vec2 p) {
  return vec2(p.x / frame.x, 1.0 - p.y / frame.y);
}

// What stood at a point of the screen (CSS px): x its height, y its body's id (0: the ground).
vec2 lastBody(vec2 p) {
  ivec2 cells = textureSize(lastScene, 0);
  float kept = texelFetch(lastScene, clamp(ivec2(lastUv(p) * vec2(cells)), ivec2(0), cells - 1), 0).a;
  return vec2(floor(kept) * ${float(1 / HEIGHT_STEPS)}, fract(kept));
}

// The same between the last frame's cells (its height from the four round the point, its body the nearest's), where
// a step of a cell would show: on the surface a reflection lands on.
vec2 lastBodySmooth(vec2 p) {
  ivec2 cells = textureSize(lastScene, 0);
  vec2 g = lastUv(p) * vec2(cells) - 0.5;
  ivec2 corner = ivec2(floor(g));
  vec2 f = g - vec2(corner);
  ivec2 limit = cells - 1;
  float a = texelFetch(lastScene, clamp(corner, ivec2(0), limit), 0).a;
  float b = texelFetch(lastScene, clamp(corner + ivec2(1, 0), ivec2(0), limit), 0).a;
  float c = texelFetch(lastScene, clamp(corner + ivec2(0, 1), ivec2(0), limit), 0).a;
  float d = texelFetch(lastScene, clamp(corner + ivec2(1, 1), ivec2(0), limit), 0).a;
  float nearest = f.x < 0.5 ? (f.y < 0.5 ? a : c) : (f.y < 0.5 ? b : d);
  return vec2(mix(mix(floor(a), floor(b), f.x), mix(floor(c), floor(d), f.x), f.y) * ${float(1 / HEIGHT_STEPS)}, fract(nearest));
}

// The light a shown colour was (filmic's inverse, at about the exposure the materials show with).
vec3 radianceOf(vec3 shown) {
  vec3 y = min(shown, vec3(0.97));
  vec3 a = 2.51 - 2.43 * y;
  vec3 b = 0.03 - 0.59 * y;
  return (-b + sqrt(b * b + 0.56 * a * y)) / (2.0 * a) / (1.15 * exposure);
}

// Where the mirrored ray first meets another body of the raft: xy where on the last frame, z how surely (0: it meets
// none, and the room shows). Marched over the last frame's heights (every body is solid down to the ground) in
// seven widening steps, then halved five times onto the surface it meets. Once a pixel.
vec3 neighbourHit = vec3(0.0);
bool neighbourTraced = false;
vec3 neighbourAlong(Surface s) {
  if (neighbourTraced) return neighbourHit;
  neighbourTraced = true;
  vec3 d = normalize(2.0 * s.nS.z * s.nS - vec3(0.0, 0.0, 1.0));
  float run = length(d.xy);
  // Straight back at the camera: nothing of the raft lies that way.
  if (neighbourReflection <= 0.0 || run < 0.2) return neighbourHit;
  vec3 from = screenAt(s);
  vec3 along = d / run;
  float reach = clamp(1.6 * s.radius, 40.0, 0.35 * length(frame));
  float before = 0.0;
  float found = -1.0;
  for (int i = 1; i <= 7; i += 1) {
    float t = reach * float(i * i) / 49.0;
    vec3 at = from + along * t;
    if (at.z < 0.0 || any(lessThan(at.xy, vec2(0.0))) || any(greaterThan(at.xy, frame))) break;
    vec2 there = lastBody(at.xy);
    // Its own body is passed over: seen from above, a flank's reflection leaves along the flank itself, and the
    // last frame's heights are not fine enough to tell that from running into it.
    if (there.x > at.z + 1.0 && abs(there.y - s.body) >= 0.002) {
      found = t;
      break;
    }
    before = t;
  }
  if (found < 0.0) return neighbourHit;
  for (int i = 0; i < 5; i += 1) {
    float middle = 0.5 * (before + found);
    vec3 at = from + along * middle;
    vec2 there = lastBodySmooth(at.xy);
    if (there.x > at.z + 1.0 && abs(there.y - s.body) >= 0.002) found = middle;
    else before = middle;
  }
  vec3 at = from + along * found;
  // Strongest where the two touch and gone by its reach (what lies further is the room's to show), and at the
  // frame's edge, so the room takes over without a line.
  vec2 border = min(at.xy, frame - at.xy);
  float sure = (1.0 - smoothstep(0.1, 1.0, found / reach)) * smoothstep(0.0, 24.0, min(border.x, border.y));
  // A ray that only clips the other — its top, or its side — fades out, so what is mirrored has no cut edge: how
  // far the body stands over the ray a little further on, to either side of it.
  float further = 5.0 + 0.2 * found;
  vec3 beyond = at + along * further;
  vec2 aside = vec2(-along.y, along.x) * further;
  float inside = 0.0;
  inside += smoothstep(0.0, 0.6 * further, lastBody(beyond.xy + aside).x - beyond.z);
  inside += smoothstep(0.0, 0.6 * further, lastBody(beyond.xy - aside).x - beyond.z);
  inside += smoothstep(0.0, 0.6 * further, lastBody(at.xy + 1.5 * aside).x - at.z + 0.3 * further);
  inside += smoothstep(0.0, 0.6 * further, lastBody(at.xy - 1.5 * aside).x - at.z + 0.3 * further);
  sure *= inside * 0.25;
  // And one that lands on the other's foot, where it meets the ground: the ground's own reflection is beside it.
  sure *= smoothstep(0.0, 8.0, at.z);
  neighbourHit = vec3(lastUv(at.xy), sure * neighbourReflection);
  return neighbourHit;
}

// 맞닿은 틈, between bodies: where another body stands in this surface beside it, the two are joined as a fillet
// joins them — the normal leans over towards the other's, so highlights bend into the join instead of being cut by
// it, and less light reaches down into it. Eight heights of the last frame round the point, on two rings.
void joinNeighbours(inout Surface s) {
  if (crease <= 0.0) return;
  vec3 from = screenAt(s);
  float width = clamp(0.06 * s.radius, 2.0, 12.0) * mix(0.5, 1.6, crease);
  vec2 slope = -s.nS.xy / max(s.nS.z, 0.25);
  vec2 lean = vec2(0.0);
  float shade = 0.0;
  for (int i = 0; i < 8; i += 1) {
    float ring = i < 4 ? 1.0 : 0.5;
    float angle = (float(i) + (i < 4 ? 0.0 : 0.5)) * 1.5707963;
    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 off = dir * width * ring;
    vec2 there = lastBody(from.xy + off);
    if (there.y <= 0.0 || abs(there.y - s.body) < 0.002) continue;
    // How far it stands above this surface carried on to there.
    float above = there.x - (from.z + dot(slope, off));
    float k = smoothstep(0.0, width * ring, above) * (i < 4 ? 0.5 : 1.0);
    shade += k;
    // A body far above is in front, not joined: it shades, and leans nothing.
    lean -= dir * k * (1.0 - smoothstep(2.0 * width, 6.0 * width, above));
  }
  if (shade <= 0.0) return;
  vec3 n = normalize(s.nS + vec3(lean * 0.5 * crease, 0.0));
  s.nS = n;
  s.n = s.turn * toWorld(n);
  s.facing = clamp(n.z, 0.0, 1.0);
  s.occlusion *= 1.0 - (0.25 + 0.5 * crease) * min(shade / 3.0, 1.0);
}

// What it mirrors along its reflection, at a blur (0 sharp … 1 blurred away).
// 이웃 반사: where its reflection meets another body of the raft it shows that body as it was last drawn, blurred
// as the room is and never quite sharp (a neighbour's colour and light in it, not its picture: the frame holds it
// as seen from above, not from here); a surface too rough to show one
// (silicone's and leather's dull sheen) is not traced.
vec3 mirrorOf(Surface s, float rough) {
  vec3 d = normalize(2.0 * s.nS.z * s.nS - vec3(0.0, 0.0, 1.0));
  vec3 seen = envAt(s.o, s.turn * toWorld(d), rough);
  if (rough >= 0.4) return seen;
  vec3 hit = neighbourAlong(s);
  if (hit.z <= 0.0) return seen;
  return mix(seen, radianceOf(textureLod(lastScene, hit.xy, 3.5 + rough * 3.5).rgb), hit.z * (1.0 - smoothstep(0.25, 0.4, rough)));
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
`;
