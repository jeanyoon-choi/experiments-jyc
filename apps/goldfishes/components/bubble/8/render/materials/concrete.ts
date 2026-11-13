// 콘크리트 (bubble/8, user 2026-11-03: "콘크리트도 하나 추가해라"; the first stub "전혀 콘크리트 같아 보이지 않음").
// Cast concrete as architecture and design objects are cast. References looked at (photographs, side by side):
//   fair-faced, smooth form face — Ando's Church of the Light (Commons photo set:
//     https://commons.wikimedia.org/w/index.php?search=Church+of+the+Light+Ando&title=Special:MediaSearch&type=image ;
//     panel and tie grid: https://www.studiomatrx.org/guides/tadao-ando-facade-design), the Pulitzer Foundation's
//     as-cast finish (https://www.structuremag.org/wp-content/uploads/2014/10/F-CoverStory1.pdf), Kahn's Salk
//     Institute, warmer pozzolan grey, lead-plugged ties and V-groove joints
//     (https://www.salk.edu/about/visiting-salk/virtual-architecture-tour/ ; https://www.witoldrybczynski.com/?p=3797);
//   board-formed béton brut — Le Corbusier's Unité d'Habitation, Boston City Hall, the plank-marked walls on
//     https://en.wikipedia.org/wiki/B%C3%A9ton_brut ; Zumthor's Bruder Klaus Chapel, rammed in pour layers
//     (https://www.archdaily.com/798340/peter-zumthors- );
//   tooled and blasted — the Barbican's pick- and bush-hammered faces exposing aggregate
//     (https://www.barbicanliving.co.uk/barbican-story/construction/hammered-and-brushed-finish/), sandblasted and
//     precast panels (https://www.google.com/search?q=sandblasted+concrete+wall+texture+close+up+architecture&udm=2);
//   surface defects — bugholes, air caught at the form face, up to about 15 mm
//     (https://giatecscientific.com/education/bugholes-in-concrete ; close-ups:
//     https://www.google.com/search?q=concrete+bugholes+surface+voids+close+up&udm=2);
//   design objects — hand-cast cement stools and vases (Concrete Poetics, https://www.1stdibs.com/dealers/concrete-poetics/shop/furniture/seating ;
//     Archiproducts' concrete objects: https://www.google.com/search?q=cast+concrete+object+design+vase+stool+product+photo+white+background&udm=2).
// Common to all of them (drawn always):
//   1. a mid grey, cool to warm, never white and never clay: shadows go to slate; it is matt — no highlight to speak
//      of, only a faint satin sheen on a fresh smooth form face;
//   2. cloudy tone at the scale of the pour (blotches, each formwork panel or board a shade its own), faint
//      streaks running down;
//   3. bugholes: dark-cored, irregular, a little tall, many tiny and a few large (a power law), sharp-edged, never
//      lit craters;
//   4. a fine sand tooth under everything, with specks of aggregate (light quartz, dark stone, warm grit);
//   5. dirtier in the hollows and at the arrises, the arrises a little chipped where rough.
// What varies (sliders, and each 연출 grounded in several of the references above):
//   콘크리트 — the smooth form face with a tie-hole grid and hairline panel joints (Ando, Kahn, Pulitzer);
//   송판 노출 콘크리트 — plank marks, wood grain and grout fins (Unité, Boston City Hall, Bruder Klaus);
//   노출 콘크리트 · 거친 — skin removed, aggregate and bugholes everywhere (Barbican, sandblasted precast, cast objects);
//   젖은 콘크리트 — darkened, the gloss lying unevenly where water pools.
// Every feature sits on the form (q × radius, CSS px, fixed to it) and is sized by the object's radius, clamped so a
// small sphere is not speckled with sub-pixel noise; the tie grid only appears on large objects.

import type { MaterialEntry } from "./surface";

const defaults = {
  concreteMottle: 0.6,
  concretePits: 0.6,
  concreteAggregate: 0.2,
  concreteTies: 1,
  concreteRough: 0.3,
  concreteSheen: 0.5,
  concreteStain: 0.35,
  concreteBoard: 0,
  concreteWet: 0,
  concreteOcclusion: 0.85,
};

export const CONCRETE_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 4,
  family: "concrete",
  familyLabel: "콘크리트",
  colourLabel: "콘크리트",
  glsl: /* glsl */ `
uniform float concreteMottle;         // cloudy tone across the cast and between pour panels
uniform float concretePits;           // bugholes and pinholes
uniform float concreteAggregate;      // sand and stone exposed (0 a smooth skin … 1 sandblasted)
uniform float concreteTies;           // form-tie holes and panel joints (Ando)
uniform float concreteRough;          // micro-roughness: the skin's tooth, the chipped arrises
uniform float concreteSheen;          // the smooth-cast skin's satin sheen
uniform float concreteStain;          // streaks and dirt in the hollows and at the edges
uniform float concreteBoard;          // board-formed: plank marks and wood grain (송판)
uniform float concreteWet;            // wet: darker and glossy
uniform float concreteOcclusion;      // how dark its hollows grow

// The feature in P's cell of size cell: its offset from the feature's centre, and two numbers 0–1 of its own.
vec4 concreteCell(vec2 P, float cell, float salt) {
  vec2 c = floor(P / cell);
  vec2 jitter = vec2(hash(vec3(c + 17.3, salt + 3.1)), hash(vec3(c + 41.7, salt + 7.9))) - 0.5;
  vec2 centre = (c + 0.5 + jitter * 0.4) * cell;
  return vec4(P - centre, hash(vec3(c, salt)), hash(vec3(c + 5.1, salt + 11.3)));
}

vec3 concreteOf(Surface s) {
  float R = max(s.radius, 1.0);
  vec2 P = s.q * R + vec2(s.seed * 517.0, s.seed * 291.0);
  float zs = s.seed * 7.0;
  float rim0 = 1.0 - smoothstep(0.0, 0.3, s.relief);
  // Slopes are worked out on the form (q's frame) and turned onto the screen through s.qTurn.
  vec3 alb = s.albedo;
  vec2 tilt = vec2(0.0);   // the normal's lean on screen, from the pits, specks and tooth
  float pitShade = 1.0;    // light lost inside pits and tie holes
  float smooth_ = 1.0;     // where the skin is intact (its sheen)

  // 2. Cloudy tone, low in frequency, cooler where darker; faint streaks running down.
  float cloud = fbm3(vec3(P / (R * 0.55 + 30.0), zs)) - 0.44;
  float mid = noise(vec3(P / (R * 0.16 + 8.0), zs + 3.0)) - 0.5;
  alb *= 1.0 + concreteMottle * (0.6 * cloud + 0.14 * mid);
  alb *= mix(vec3(1.01, 1.0, 0.98), vec3(0.97, 0.99, 1.02), clamp(0.5 - cloud * 2.0, 0.0, 1.0));
  float streak = noise(vec3(P.x / (R * 0.06 + 3.0), P.y / (R * 0.9 + 25.0), zs + 9.0));
  alb *= 1.0 - concreteStain * 0.16 * smoothstep(0.55, 0.85, streak);

  // 송판: board-formed (Le Corbusier's béton brut, Lasdun's National Theatre, Boston City Hall): horizontal
  // planks, each a shade its own and a little proud or sunk, the wood's grain printed in, a lip of grout at each seam.
  if (concreteBoard > 0.0) {
    float plank = max(R * 0.17, 8.0);
    // Boards are never quite straight nor quite equal: the seams wander a little.
    float y = P.y + plank * 0.18 * (noise(vec3(P.x / (R * 0.8 + 30.0), zs, 6.0)) - 0.5);
    float row = floor(y / plank);
    float yIn = y - row * plank;
    float own = hash(vec3(row, zs, 2.2));
    // The grain: long streaks along the board, broken into figure here and there.
    float figure = noise(vec3(P.x / (R * 0.25 + 10.0) + own * 9.0, y / 2.2, zs + own * 5.0));
    float streaks = noise(vec3(P.x / (R * 0.6 + 25.0) + own * 3.0, y / 0.8, zs + 11.0));
    float wood = 0.6 * figure + 0.4 * streaks;
    alb *= 1.0 + concreteBoard * (0.16 * (own - 0.5) + 0.2 * (wood - 0.5));
    // At each seam a fin of grout that leaked between the boards: a hairline, dark or light by board.
    float seam = 1.0 - smoothstep(0.25, 1.0, min(yIn, plank - yIn));
    alb *= 1.0 + concreteBoard * seam * (own > 0.5 ? -0.2 : 0.08);
    tilt.y += concreteBoard * (0.08 * (own - 0.5) + 0.3 * (wood - 0.5) + 0.45 * seam * (yIn < 0.5 * plank ? 1.0 : -1.0));
  }

  // Ando: one formwork panel repeated, two holes across and three down, each pour a shade its own.
  float ties = concreteTies * smoothstep(45.0, 110.0, R);
  if (ties > 0.0) {
    vec2 spacing = vec2(R * 0.5, R * 0.36);
    vec2 G = P / spacing;
    vec2 panel = floor(G / vec2(2.0, 3.0));
    alb *= 1.0 + ties * concreteMottle * 0.09 * (hash(vec3(panel, 4.4)) - 0.5);
    vec2 inPanel = (G - panel * vec2(2.0, 3.0)) * spacing;
    vec2 toJoint = min(inPanel, vec2(2.0, 3.0) * spacing - inPanel);
    float joint = 1.0 - smoothstep(0.35, 1.1, min(toJoint.x, toJoint.y));
    alb *= 1.0 - ties * 0.14 * joint;
    vec2 d = (fract(G) - 0.5) * spacing;
    float r = max(R * 0.02, 2.2);
    float dl = length(d);
    float hole = 1.0 - smoothstep(r - 0.4, r + 0.3, dl);
    // A recessed cone, crisp at its rim: its wall falls steeply inwards (in shade on the key's side, lit across from
    // it), and at its bottom a flat plug of grey lead or mortar sitting a little inside, a shade darker.
    float plug = 1.0 - smoothstep(0.52 * r - 0.3, 0.52 * r + 0.3, dl);
    float wall = hole * (1.0 - plug);
    tilt += ties * wall * -(d / max(dl, 1e-3)) * 1.6;
    pitShade *= 1.0 - ties * (wall * 0.3 + plug * 0.42);
    alb *= 1.0 - ties * plug * 0.12;
    smooth_ *= 1.0 - ties * hole;
  }

  // 3. Bugholes: sparse cavities, roundish but never round, most tiny and a few large, gathered where air rises
  // against the form (towards the top and the edges, in drifts). Each is sunk: its inner wall falls away from the
  // surface, in shade on the key's side and lit on the far rim, its bottom dark.
  float pitCell = clamp(R * 0.085, 5.0, 22.0);
  float drift = smoothstep(0.45, 0.8, noise(vec3(P / (R * 0.22 + 12.0), zs + 13.0)));
  float gather = 0.1 + 0.9 * max(drift, 0.7 * max(rim0, smoothstep(0.2, -0.7, s.q.y)));
  for (int k = 0; k < 2; k += 1) {
    float cell = k == 0 ? pitCell : pitCell * 0.5;
    vec4 f = concreteCell(P, cell, 31.0 + float(k) * 13.0);
    // Blasted faces show their bugholes in clusters: the drifts count twice there.
    float clump = concreteAggregate > 0.4 ? gather * gather : gather;
    float share = concreteAggregate > 0.4 ? (k == 0 ? 0.12 : 0.1) : (k == 0 ? 0.07 : 0.16);
    float density = concretePits * clump * share;
    if (f.z < density) {
      // Size: a steep power law; shape: a soft oval at its own angle, slightly lumpy.
      float r = cell * (k == 0 ? 0.1 + 0.2 * f.w * f.w * f.w : 0.1 + 0.08 * f.w);
      float ang = f.w * 31.0;
      vec2 axis = vec2(cos(ang), sin(ang));
      vec2 e = vec2(dot(f.xy, axis), dot(f.xy, vec2(-axis.y, axis.x))) * vec2(1.0, 1.0 + 0.35 * fract(f.z * 53.0));
      float a = atan(e.y, e.x);
      float dl = length(e) / (1.0 + 0.08 * sin(2.0 * a + f.z * 70.0));
      float seen = smoothstep(0.7, 1.5, r);
      float inside = (1.0 - smoothstep(r - 0.35, r + 0.3, dl)) * seen;
      // Too small for a wall to show, a pinhole is just a dark point; larger, the lit far lip appears.
      float walled = smoothstep(1.2, 3.0, r);
      tilt += inside * walled * -(f.xy / max(length(f.xy), 1e-3)) * 1.5 * smoothstep(0.15 * r, 0.6 * r, dl);
      pitShade *= 1.0 - inside * (mix(0.5, 0.25, walled) + 0.4 * smoothstep(0.75 * r, 0.1 * r, dl));
      smooth_ *= 1.0 - inside;
    }
  }

  // 4. Sand and stone: specks of light quartz, dark basalt, warm grit; raised a little where blasted.
  if (concreteAggregate <= 0.4) {
  float speckCell = clamp(R * mix(0.035, 0.024, concreteAggregate), 1.9, 8.0);
  vec4 g = concreteCell(P, speckCell, 71.0);
  if (g.z < 0.05 + 0.6 * concreteAggregate) {
    float r = speckCell * (0.1 + 0.2 * g.w);
    float dl = length(g.xy);
    float speck = (1.0 - smoothstep(r - 0.5, r + 0.4, dl)) * smoothstep(0.3, 1.0, r);
    float kind = fract(g.w * 7.31 + g.z * 3.7);
    vec3 stone = kind < 0.4 ? vec3(0.62, 0.63, 0.64) : kind < 0.75 ? vec3(1.16, 1.14, 1.1) : vec3(1.08, 1.0, 0.88);
    float exposed = mix(0.12, 1.0, concreteAggregate);
    alb *= mix(vec3(1.0), stone, speck * exposed);
    tilt += speck * concreteAggregate * (g.xy / max(dl, 1e-3)) * 0.6 * smoothstep(0.0, r, dl);
    smooth_ *= 1.0 - speck * concreteAggregate;
  }
  } else {
    // Exposed aggregate (the Barbican's bush-hammered faces, Rudolph's corduroy, sandblasted precast): the skin
    // is gone and the stones stand proud, packed so they touch in places — rounded or fractured lumps up to about
    // 5% of the object's radius, each lit on one side and shaded on the other, its top a facet of its own, casting
    // a contact shadow into a matt, pitted, darker matrix. The form's broad shading breaks up at every stone.
    float exposed = smoothstep(0.4, 1.0, concreteAggregate);
    float cellP = clamp(R * 0.075, 6.0, 48.0);
    vec2 base = floor(P / cellP - 0.5);
    float topH = -1.0;
    vec2 topSlope = vec2(0.0);
    vec3 topTone = vec3(1.0);
    float edgeGap = 1e4;
    for (int i = 0; i < 4; i += 1) {
      vec2 c = base + vec2(float(i - (i / 2) * 2), float(i / 2));
      float h1 = hash(vec3(c, 71.0));
      float h2 = hash(vec3(c + 5.1, 82.3));
      float h3 = hash(vec3(c + 17.3, 74.1));
      float h4 = hash(vec3(c + 41.7, 78.9));
      vec2 centre = (c + 0.5 + (vec2(h3, h4) - 0.5) * 0.7) * cellP;
      float r = cellP * (0.3 + 0.32 * h2 * h2) * (h1 > 0.9 ? 0.5 : 1.0);
      float turnA = h2 * 43.0;
      vec2 axis = vec2(cos(turnA), sin(turnA));
      vec2 d = P - centre;
      float squash = 1.0 + 0.45 * h1;
      vec2 e = vec2(dot(d, axis), dot(d, vec2(-axis.y, axis.x)) * squash);
      float ang = atan(e.y, e.x);
      float rr = r * (1.0 + 0.045 * sin(5.0 * ang + h1 * 80.0) + 0.05 * sin(3.0 * ang + h4 * 20.0));
      float u = length(e) / rr;
      edgeGap = min(edgeGap, (u - 1.0) * rr);
      // Flat-topped and rounded down at the edge: height 1 − u³.
      float H = 1.0 - u * u * u;
      if (H > topH) {
        topH = H;
        vec2 outward = d / max(length(d), 1e-3);
        vec2 facet = (vec2(h3, h4) - 0.5) * 0.5;
        topSlope = outward * 2.4 * u * u + facet;
        float kind = fract(h2 * 7.31 + h1 * 3.7);
        topTone = kind < 0.28 ? vec3(0.56, 0.57, 0.58) : kind < 0.52 ? vec3(1.1, 1.09, 1.06) : kind < 0.72 ? vec3(1.1, 1.01, 0.86) : kind < 0.9 ? vec3(0.86, 0.83, 0.79) : vec3(1.28, 1.27, 1.24);
      }
    }
    float inStone = 1.0 - smoothstep(-0.5, 0.5, edgeGap);
    // Grit in the matrix between the stones.
    vec4 a4 = concreteCell(P, clamp(R * 0.028, 2.4, 9.0), 90.0);
    float gr = clamp(R * 0.028, 2.4, 9.0) * (0.12 + 0.2 * a4.w);
    float grit = (1.0 - smoothstep(gr - 0.4, gr + 0.4, length(a4.xy))) * step(a4.z, 0.6) * (1.0 - inStone);
    float gritKind = fract(a4.w * 9.1 + a4.z * 2.3);
    vec3 gritTone = gritKind < 0.4 ? vec3(0.65) : gritKind < 0.8 ? vec3(1.12, 1.08, 1.0) : vec3(1.25);
    // The matrix: matt, coarse, pitted, darker in the gaps, shaded where it meets a stone.
    float sand = noise(vec3(P / 0.9, zs + 17.0)) - 0.5;
    float sand2 = noise(vec3(P / 2.4, zs + 19.0)) - 0.5;
    vec3 matrix = vec3(0.9, 0.9, 0.88) * (1.0 + 0.22 * sand + 0.12 * sand2);
    alb *= mix(vec3(1.0), mix(mix(matrix, matrix * gritTone, grit), topTone * (1.0 + 0.1 * sand2), inStone), exposed);
    float contact = (1.0 - inStone) * (1.0 - smoothstep(0.0, cellP * 0.16, edgeGap));
    pitShade *= 1.0 - exposed * (0.32 * contact + 0.05 * (1.0 - inStone));
    tilt += exposed * (inStone * topSlope + (1.0 - inStone) * vec2(sand2, sand) * 0.5 + grit * (a4.xy / max(length(a4.xy), 1e-3)) * 0.5);
    smooth_ *= 1.0 - exposed;
  }

  // 5. The skin's tooth: a fine grain of light and lean, finer than the specks, held above a pixel.
  float tooth = 0.35 + concreteRough;
  float g1 = noise(vec3(P / 1.4, zs + 1.0)) - 0.5;
  float g2 = noise(vec3(P / 1.4 + 7.7, zs + 2.0)) - 0.5;
  alb *= 1.0 + 0.07 * tooth * g1;
  tilt += vec2(g1, g2) * 0.06 * tooth;

  // 6. Dirt in the hollows and towards the arrises; the arrises chipped where it is rough.
  float rim = rim0;
  alb *= mix(0.78, 1.0, mix(1.0, s.occlusion, concreteStain));
  alb *= 1.0 - 0.1 * concreteStain * rim;
  float chip = rim * concreteRough * smoothstep(0.62, 0.75, noise(vec3(P / (pitCell * 0.9), zs + 5.0)));
  alb *= 1.0 + 0.12 * chip;
  tilt += chip * vec2(g2, -g1) * 1.2;
  smooth_ *= 1.0 - chip;

  // Wet: the water darkens it and lays a gloss over the skin.
  alb *= mix(1.0, 0.55, concreteWet);

  vec2 lean = s.qTurn * tilt;
  vec3 nS = normalize(s.nS + vec3(lean, 0.0));
  vec3 n = normalize(s.turn * toWorld(nS));
  // Lit a little raking, as a wall under a side window, so every pit and swell draws.
  vec3 toKey = normalize(keyAt - s.o);
  toKey = normalize(vec3(toKey.xy * 1.5, toKey.z * 0.85));
  float ndl = dot(n, toKey);
  // Rough cement scatters past the terminator a little: a soft wrap, the turn from light to shade broad.
  float lit = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
  lit *= lit;
  lit = mix(lit, sqrt(lit) * 0.9, 0.25 * concreteRough * (1.0 - concreteWet));
  vec3 room = vec3(0.88, 0.93, 1.0) * (0.4 + shadowLift * 0.3);
  if (photoStrength > 0.0) room += 0.3 * photoStrength * photoAt(n, 7.0);
  room *= 0.75 + 0.25 * max(n.z, 0.0);
  room += background * (0.1 + 0.18 * groundLight) * max(-n.z, 0.0);
  vec3 key = vec3(1.0, 0.97, 0.93) * keyStrength * mix(1.45, 1.05, keySize) * lit;
  float occ = max(mix(1.0, s.occlusion, concreteOcclusion), 0.12);
  vec3 body = alb * lightColour * (key * mix(0.5, 1.0, occ) * pitShade + room * occ * mix(0.55, 1.0, pitShade));

  // The satin sheen of the smooth-cast skin, and the wet gloss, both broken where the skin is.
  Surface t = s;
  t.nS = nS;
  float facing = clamp(nS.z, 0.0, 1.0);
  float blur = mix(0.6 + 0.25 * concreteRough, 0.42, concreteWet);
  vec3 reflected = mirrorOf(t, blur);
  float fresnel = 0.03 + 0.97 * pow(1.0 - facing, 5.0);
  // Water lies unevenly: glossy where it pools, already drying to matt elsewhere.
  float pooled = smoothstep(-0.12, 0.12, -cloud + 0.3 * mid);
  float gloss = concreteSheen * 0.45 * (1.0 - 0.7 * concreteRough) * smooth_ + concreteWet * mix(0.12, 0.55, pooled) * mix(0.3, 1.0, smooth_);
  vec3 sheen = reflected * fresnel * gloss * occ;
  return filmic((body * 1.15 + sheen) * exposure);
}
`,
  call: "concreteOf",
  defaults,
  controls: [
    { key: "concreteMottle", label: "얼룩 (구름결 · 판마다 톤)", min: 0, max: 1, step: 0.01 },
    { key: "concretePits", label: "기포 구멍", min: 0, max: 1, step: 0.01 },
    { key: "concreteAggregate", label: "골재 노출 (샌드블라스트)", min: 0, max: 1, step: 0.01 },
    { key: "concreteTies", label: "폼타이 구멍 · 거푸집 줄눈", min: 0, max: 1, step: 0.01 },
    { key: "concreteRough", label: "거칠기 (결 · 깨진 모서리)", min: 0, max: 1, step: 0.01 },
    { key: "concreteSheen", label: "광택 (매끈한 면)", min: 0, max: 1, step: 0.01 },
    { key: "concreteStain", label: "때 (흘러내림 · 오목한 곳)", min: 0, max: 1, step: 0.01 },
    { key: "concreteBoard", label: "송판 자국 (나뭇결)", min: 0, max: 1, step: 0.01 },
    { key: "concreteWet", label: "젖음", min: 0, max: 1, step: 0.01 },
    { key: "concreteOcclusion", label: "오목한 곳 그늘", min: 0, max: 1, step: 0.01 },
  ],
  looks: [
    // Ando's fair-faced concrete: a smooth cool grey skin, tie holes, a faint satin sheen.
    {
      id: "concrete",
      label: "콘크리트",
      look: { coating: [0.46, 0.47, 0.48], coatingMix: 0, keyStrength: 1.3, keySize: 0.3, shadowLift: 0.15, concretePits: 0.45 },
    },
    // Board-formed: plank marks and wood grain, a little warmer, no tie grid, more bugholes.
    {
      id: "concrete-board",
      label: "송판 노출 콘크리트",
      look: {
        coating: [0.47, 0.47, 0.46],
        coatingMix: 0,
        keyStrength: 1.35,
        keySize: 0.25,
        shadowLift: 0.15,
        concreteBoard: 1,
        concreteTies: 0,
        concretePits: 0.8,
        concreteRough: 0.55,
        concreteSheen: 0.2,
        concreteStain: 0.5,
      },
    },
    // Raw and sandblasted: the skin taken off, aggregate and bugholes everywhere, matte.
    {
      id: "concrete-raw",
      label: "노출 콘크리트 · 거친",
      look: {
        coating: [0.47, 0.46, 0.44],
        coatingMix: 0,
        keyStrength: 1.35,
        keySize: 0.22,
        shadowLift: 0.12,
        concreteMottle: 0.45,
        concretePits: 0.75,
        concreteAggregate: 1,
        concreteTies: 0,
        concreteRough: 1,
        concreteSheen: 0.05,
        concreteStain: 0.5,
      },
    },
    // After rain: dark and glossy.
    {
      id: "concrete-wet",
      label: "젖은 콘크리트",
      look: { coating: [0.46, 0.47, 0.48], coatingMix: 0, keyStrength: 1.3, keySize: 0.3, shadowLift: 0.15, concreteWet: 1, concreteStain: 0.5 },
    },
  ],
};
