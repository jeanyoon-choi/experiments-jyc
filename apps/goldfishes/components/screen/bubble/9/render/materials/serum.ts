// 젤 · 세럼 (bubble/8, user 2026-11-03): one coloured liquid as cosmetic advertising shoots it — a blue gel blob,
// a clear drop, an amber serum, dark oil droplets — all from the same parameters (absorption colour and density,
// murk, bubbles, marbling, the studio's dark flags, the light it gathers).
//
// References (viewed, not only listed). The user's four screenshots (a blue gel blob with bubbles on pale grey; a
// clear drop under a dropper in violet light; an amber drop with marbling and rectangular softbox highlights on
// white; dark navy oil droplets in water), and:
// - Shutterstock, macro blue gel droplet on white (https://www.shutterstock.com/image-photo/macro-shot-transparent-blue-gel-droplet-2768293643)
// - Dreamstime, clear gel serum swirl, bubbles everywhere (https://www.dreamstime.com/macro-swatch-clear-cosmetic-gel-serum-perfect-glistening-dollop-captured-shot-transparent-texture-tiny-bubbles-image415464532)
// - Dreamstime, clear gel swatch on white (https://www.dreamstime.com/cosmetic-gel-serum-texture-clear-liquid-bubbles-swatch-drop-sample-isolated-white-background-image157562304)
// - Shutterstock CGI, transparent gel drop with a bubble chain (https://www.shutterstock.com/image-illustration/transparent-gel-drop-tiny-air-bubbles-2716398815)
// - Getty, aloe gel serum with bubbles on lilac and on white (https://www.gettyimages.com/detail/photo/close-up-macro-aloe-vera-gel-serum-cosmetic-texture-royalty-free-image/1410761164,
//   https://www.gettyimages.com/detail/photo/close-up-macro-aloe-vera-gel-serum-cosmetic-texture-royalty-free-image/1522013574)
// - Bendito Mockup, amber serum drop from a dropper (https://benditomockup.com/store/amber-serum-drop-with-dropper-stock-photo/)
// - Vecteezy, honey drops on white and a golden serum sphere full of bubbles (https://www.vecteezy.com/free-photos/honey-drop,
//   https://www.vecteezy.com/png/67613445-golden-honey-serum-drop-luminous-beauty-oil-with-air-bubbles-on-for-skincare-and-cosmetic-product-photography-transparent-background)
// - Getty / Eugene Mymrin, gold serum drops (https://www.gettyimages.in/photos/gold-serum-drop)
// - Vecteezy, crude oil droplets, near-black and glossy (https://www.vecteezy.com/photo/71808626-crude-oil-droplets-glisten-on-a-metallic-surface-revealing-their-dark-and-glossy-texture-the-macro-shot-captures-the-intricate-details-of-this-liquid-under-light-in-stunning-resolution)
// - Charlotte Bellamy, oil and water macro (https://charlottebellamyphotography.wordpress.com/2014/09/03/colour-bubbles-oil-and-water-macro-photography/)
// - Getty, hyaluronic acid bubbles (CGI advertising) (https://www.gettyimages.com/photos/hyaluronic-acid-bubbles);
//   Shutterstock, blue hyaluronic serum bubbles (https://www.shutterstock.com/video/clip-4119117787-blue-hyaluronic-acid-serum-bubbles-skincare-cosmetics)
//
// Common to all of them (re-read at full size, IMG_8610 above all):
// 1. Light passes through it: the body is luminous, the ground's white seen through a coloured lens. Pale, almost
//    white-tinted where the path is short or the light is gathered, deep saturated colour where the path is long
//    (the rim, where refraction bends the path sideways through the body); one smooth continuous gradient, never
//    paint. Its variation is large and soft (thickness), not blotches.
// 2. The surface is smooth and glassy-wet (surface tension): only slow, large undulation at rest; ripples only
//    while it is disturbed.
// 3. Crisp optical details, few: a thin deep meniscus line along the outline, small sharp glints of the softbox
//    (rectangular windows), and sparse perfect bubbles clustered in one region: a few large, more small, specks —
//    each the liquid's own colour with a thin darker ring, a lighter core, one tiny white glint towards the light
//    and a faint focused crescent opposite.
// 4. Restraint: mostly white studio, one colour in light.
// What varies (parameters and looks): the absorbed colour and its density (clear … near-opaque oil), murk,
// marbling (amber's swirls), the number and size of bubbles, how dark the bent rays go (the clear drop's black
// lines), how much light it gathers, a resting puddle or a floating drop.
// All four screenshots are reached by parameters. A clear liquid on a uniform white ground has nothing to refract
// but its own edges and reads as white plastic, so 맑은 방울 also sets a pale lilac ground, as IMG_8613's violet
// backdrop does: the ground seen through the drop is what makes it read as clear.

import type { MaterialEntry } from "./surface";

const defaults = {
  serumHue: 0.63,
  serumChroma: 0.85,
  serumDensity: 2.2,
  serumMurk: 0.18,
  serumCoat: 0,
  serumIor: 1.38,
  serumBase: 0.8,
  serumFlags: 0.3,
  serumCaustic: 0.9,
  serumSwirl: 0.5,
  serumHaze: 0.05,
  serumBubbles: 0.6,
  serumBubbleSize: 1,
  serumGloss: 1,
  serumBox: 0.7,
  serumMeniscus: 0.6,
  serumWobble: 0.5,
  serumFlow: 1,
};

export const SERUM_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 6,
  family: "serum",
  familyLabel: "젤 · 세럼",
  colourLabel: "젤",
  glsl: /* glsl */ `
uniform float serumHue;
uniform float serumChroma;
uniform float serumDensity;
uniform float serumMurk;
uniform float serumCoat;
uniform float serumIor;
uniform float serumBase;
uniform float serumFlags;
uniform float serumCaustic;
uniform float serumSwirl;
uniform float serumHaze;
uniform float serumBubbles;
uniform float serumBubbleSize;
uniform float serumGloss;
uniform float serumBox;
uniform float serumMeniscus;
uniform float serumWobble;
uniform float serumFlow;

// The linear light filmic() shows as y, so the ground seen through a clear body keeps its white.
vec3 serumUnfilm(vec3 y) {
  // Held below the curve's shoulder: past it the white ground would stand for so much light that no colour could
  // absorb it (the body would read pale whatever its density).
  y = clamp(y, 0.0, 0.93);
  vec3 a = 2.43 * y - 2.51;
  vec3 b = 0.59 * y - 0.03;
  vec3 c = 0.14 * y;
  return (-b - sqrt(b * b - 4.0 * a * c)) / (2.0 * a);
}

float serumFresnel(float f0, float c) {
  return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0);
}

// One layer of bubbles in cells of size cell (q units): x its darker ring, y its core (less liquid in the way),
// z its glint towards the key, w its coverage; the focused crescent opposite the key comes back in lit.
vec4 serumBubbleLayer(vec2 q, vec2 shift, float cell, float salt, float clusterSalt, float spread, float chance, float px, float drift, vec2 toKey, out float lit) {
  lit = 0.0;
  vec2 g = (q + shift) / cell;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  // Bubbles gather in one cluster on each body (the large ones at its heart, the small trailing off round it),
  // decided once per cell so a bubble is never cut in two.
  vec2 centre = (vec2(hash(vec3(clusterSalt, 1.3, 2.1)), hash(vec3(clusterSalt, 4.7, 0.3))) - 0.5) * 0.7;
  vec2 at = (id + 0.5) * cell - shift - centre;
  chance *= exp(-dot(at, at) / spread);
  float h1 = hash(vec3(id, salt));
  if (h1 > chance) return vec4(0.0);
  float h2 = hash(vec3(id + 7.31, salt + 3.7));
  float h3 = hash(vec3(id - 3.17, salt + 9.1));
  float h4 = hash(vec3(id.yx + 1.9, salt + 5.3));
  float r = mix(0.12, 0.46, h2 * h2);
  vec2 c = (vec2(h3, h4) - 0.5) * (1.0 - 2.0 * r);
  c += drift * (0.5 - r) * vec2(sin(time * 0.6 + h2 * 40.0), cos(time * 0.5 + h3 * 40.0));
  // Kept whole inside its cell (never cut off at a cell's side).
  c = clamp(c, vec2(r - 0.5), vec2(0.5 - r));
  vec2 b = (f - c) / r;
  float d = length(b);
  if (d > 1.0) return vec4(0.0);
  float rpx = r * cell * px;
  float aa = 1.0 / max(rpx, 0.6);
  float inside = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  // Deeper bubbles are seen through more liquid: softer, less contrast.
  float near = mix(1.0, 0.5, fract(h1 * 13.7 + h4));
  // Air in gel is a diverging lens: its rim turns the light away (a soft dark band, deepest on the side towards
  // the key) and focuses it on the far side (a bright rim) — never an even outline.
  float ringWidth = max(0.22, 2.0 * aa);
  float rimBand = smoothstep(1.0 - 2.4 * ringWidth, 1.0 - 0.3 * ringWidth, d) * inside;
  float side = dot(b / max(d, 1e-3), toKey);
  float ring = rimBand * (0.35 + 0.65 * smoothstep(-0.6, 0.8, side));
  float brightRim = rimBand * smoothstep(0.0, -0.9, side);
  float core = sqrt(max(1.0 - d * d, 0.0)) * inside;
  vec2 g1 = b - toKey * 0.5;
  float glint = exp(-dot(g1, g1) * mix(25.0, 140.0, smoothstep(3.0, 20.0, rpx))) * inside;
  vec2 g2 = b + toKey * 0.42;
  lit = (0.35 * exp(-dot(g2, g2) * 5.0) * (1.0 - rimBand) + 0.9 * brightRim) * inside * near;
  return vec4(ring * near, core * near, glint * near, inside);
}

vec3 serumOf(Surface s) {
  float px = max(s.radius, 1.0);
  float t = time * serumFlow;
  float melt = s.melt;
  vec2 toKey = normalize(keyScreen.xy + vec2(1e-4));
  // q's frame is the object's own (turned on screen): screen directions go into it, its slopes come out of it.
  mat2 toQ = inverse(s.qTurn);
  vec2 keyQ = normalize(toQ * toKey + vec2(1e-4));

  // Smooth and wet (surface tension): at rest only a slow, large undulation; ripples while it is disturbed.
  float k = s.seed * 47.0;
  vec2 d1 = vec2(cos(k), sin(k));
  vec2 d2 = vec2(cos(k + 2.1), sin(k + 2.1));
  vec2 d3 = vec2(cos(k + 4.3), sin(k + 4.3));
  vec2 swell = d1 * cos(dot(s.q, d1) * 1.7 + t * 0.6) * 1.7 + d2 * cos(dot(s.q, d2) * 2.6 - t * 0.45) * 2.6 * 0.6;
  vec2 ripple = d3 * cos(dot(s.q, d3) * 7.0 + t * 2.4 - 8.0 * melt) * 7.0 + d1 * cos(dot(s.q, d1.yx) * 5.1 - t * 1.9) * 5.1 * 0.7;
  vec2 slope = serumWobble * (0.03 * swell + 0.035 * melt * ripple);
  vec3 n = normalize(s.nS + vec3(-(s.qTurn * slope), 0.0));

  vec3 v = vec3(0.0, 0.0, -1.0);
  float ior = serumIor;
  float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  float fIn = serumFresnel(f0, n.z);

  // In through the top; across a floating drop to its far side, or down through a resting body to the ground.
  vec3 dir = refract(v, n, 1.0 / ior);
  vec3 base = -worldUp;
  // Fixed in the body (the height field's normals crease along its ridges; a refracted offset would tear bubbles).
  vec2 inner = s.q;

  // Its thickness varies largely and softly (and, for marbled serums, in streams carried by a slow flow).
  float marble = 0.5;
  if (serumSwirl > 0.001) {
    vec3 p = vec3(inner * 1.1, s.seed * 7.0 + t * 0.02 + melt);
    float soft = noise(p) * 0.65 + noise(p * 2.1 + vec3(3.1, 7.7, 1.3)) * 0.35;
    float streams = 0.5 + 0.5 * sin(8.0 * soft + 2.0 * noise(vec3(inner * 0.8, t * 0.03 + s.seed * 3.0)));
    marble = mix(soft, streams, clamp(serumSwirl * 1.6 - 0.6, 0.0, 1.0));
  }
  // Held at its highest past relief 1 (a tall object's flat top, e.g. a headset's visor, stands well over 1): the
  // unclamped cubic turns negative there, the path with it, and the absorption would amplify instead of absorb.
  float thickness = mix(0.08, 0.5, smoothstep(0.0, 1.0, s.relief)) * mix(1.0, 0.25 + 1.5 * marble, serumSwirl);
  float chord = max(-2.0 * dot(n, dir), 0.0);
  vec3 exitN = normalize(mix(normalize(n + dir * chord), base, serumBase));
  // A resting body's rounded edge: looking down there one looks through its bulging side, the longest way through.
  // The rounded side is the longest way through: deep there, so no pale halo forms round the body.
  float bulge = 1.8 * pow(1.0 - clamp(s.nS.z, 0.0, 1.0), 1.5);
  float travelled = mix(chord * 0.6, thickness / max(dot(dir, base), 0.4), serumBase) + bulge;
  // Where the way out closes (total internal reflection) the ray turns back inside, blended over a narrow band of
  // angles: the face deepens into the wall smoothly, with no seam.
  float cosOut = dot(dir, exitN);
  float open = smoothstep(0.0, 0.45, 1.0 - ior * ior * (1.0 - cosOut * cosOut));
  vec3 refracted = refract(dir, -exitN, ior);
  vec3 out3 = normalize(mix(dir, dot(refracted, refracted) > 0.0 ? refracted : dir, open));
  travelled += (1.0 - open) * 0.6 * mix(1.0, thickness, serumBase);
  float trapped = 1.0;
  vec3 outW = s.turn * toWorld(out3);
  float fOut = serumFresnel(f0, abs(dot(out3, exitN)));
  float through = (1.0 - fIn) * (1.0 - fOut) * trapped;

  // Bubbles: sparse and clustered; a few large, more small, specks — a layer only where its bubbles are pixels wide.
  vec4 bub = vec4(0.0);
  float lit = 0.0;
  if (serumBubbles > 0.001) {
    float drift = 0.12 + 1.5 * melt;
    // Small bodies show no bubbles at all (on a thumbnail they read as a pattern, not a liquid).
    float keep = smoothstep(0.03, 0.25, s.relief) * smoothstep(1.5, 5.0, s.edge) * smoothstep(45.0, 90.0, px);
    float salt = s.seed * 31.7;
    for (int i = 0; i < 4; i += 1) {
      float cell = serumBubbleSize * (i == 0 ? 0.7 : i == 1 ? 0.26 : i == 2 ? 0.1 : 0.04);
      float spread = i == 0 ? 0.05 : i == 1 ? 0.1 : i == 2 ? 0.17 : 0.26;
      if (cell * px * 0.14 < 1.0) break;
      float chance = serumBubbles * (i == 0 ? 0.9 : i == 1 ? 0.7 : i == 2 ? 0.55 : 0.45);
      float layerLit;
      vec4 layer = serumBubbleLayer(inner, float(i) * vec2(0.37, 0.71), cell, salt + float(i) * 17.0, salt, spread, chance, px, drift, keyQ, layerLit);
      float fade = keep * smoothstep(1.0, 2.0, cell * px * 0.14);
      layer *= fade;
      // Larger bubbles lie in front: smaller ones only show where nothing covers them.
      float shown = 1.0 - bub.w;
      bub += layer * shown;
      lit += layerLit * fade * shown;
    }
  }

  // Beer–Lambert: its own colour (or the coat, or a logo's brand), plus murk.
  vec3 hueRgb = clamp(abs(mod(serumHue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  vec3 tint = mix(vec3(1.0), hueRgb, serumChroma);
  tint = mix(tint, clamp(s.albedo, vec3(0.03), vec3(1.0)), max(serumCoat, s.dyed));
  vec3 sigma = -log(clamp(tint, vec3(0.03), vec3(1.0))) * serumDensity + vec3(serumMurk);
  // Marbled serums carry denser and thinner streams of the colour itself.
  sigma *= mix(1.0, 0.45 + 1.1 * marble, serumSwirl * serumSwirl * 0.8);
  float scale = clamp(pow(px / 60.0, 0.15), 0.85, 1.2);
  float path = max(travelled, 0.0) * scale * (1.0 - 0.25 * bub.y);
  // Long paths saturate softly: the walls also take light in from their sides, so the rim stays a deep colour, not ink.
  path = 2.6 * (1.0 - exp(-path / 2.6));
  vec3 absorbed = exp(-sigma * path);

  // What the light leaving it saw: a resting body ends on the ground below (darker where the ray lies flat under
  // its own body), a floating drop on the studio round it.
  vec3 env = envAt(s.o, outW, 0.35);
  float seenGround = smoothstep(mix(0.3, 0.04, serumFlags), mix(-0.25, -0.08, serumFlags), outW.z);
  seenGround = mix(seenGround, 1.0, serumBase * (1.0 - serumFlags));
  vec3 room = env * (1.0 - 0.92 * serumFlags * (1.0 - smoothstep(0.55, 0.95, outW.z)));
  vec3 ground = serumUnfilm(s.behind) / (1.25 * exposure);
  ground *= mix(1.0, smoothstep(mix(0.05, 0.5, serumFlags), mix(0.85, 0.66, serumFlags), -outW.z), serumFlags);
  // The light it gathers, away from the key, through less liquid: the luminous heart of the drop.
  vec2 hit = s.q + toQ * out3.xy * 0.6 * s.relief;
  vec2 focusAt = -keyQ * 0.25 * clamp(length(keyScreen.xy) * 1.5, 0.0, 1.0);
  float focus = exp(-dot(hit - focusAt, hit - focusAt) * 1.6) * smoothstep(0.0, 0.45, s.relief);
  // Focused light has crossed little of the liquid: near-white at its hottest, tinted where it spreads.
  vec3 gathered = serumCaustic * 1.6 * focus * keyStrength * exp(-sigma * path * mix(0.6, 0.15, focus));
  vec3 colour = ((room * (1.0 - seenGround) + ground * seenGround) * absorbed + gathered * seenGround) * through;
  // A little light scattered inside the gel, coloured by what it crossed.
  colour += serumHaze * 0.5 * irradiance(s.o, s.n) * (1.0 - exp(-vec3(path))) * exp(-sigma * path * 0.5) * (1.0 - fIn);

  // Bubbles: the liquid's own colour, ringed deeper, lighter in the core, a focused crescent and one tiny glint.
  colour = mix(colour, colour * exp(-sigma * 0.6) * 0.8, bub.x);
  colour = mix(colour, mix(colour, vec3(1.0) * dot(colour, vec3(0.33)) * 1.8 + colour, 0.5), clamp(lit, 0.0, 1.0) * 0.6);

  // The meniscus: a thin deep line along the outline.
  float line = (1.0 - smoothstep(0.7, 3.0, s.edge)) * serumMeniscus * smoothstep(40.0, 80.0, px);
  colour = mix(colour, ground * exp(-sigma * 2.5) * 0.85, line);

  // The front: the studio mirrored (a thin bright line where it turns away), the softbox's crisp windows.
  // Only the room and the ground are mirrored here (no wide soft key lobe: a smear reads as airbrush); the key
  // shows as the crisp window below. At grazing angles this is the thin bright edge reflection.
  vec3 r = s.turn * toWorld(reflect(v, n));
  vec3 mirrored = vec3(shadowLift * 0.3);
  if (photoStrength > 0.0) {
    // Held down: the photographed room's big bright windows would lie across the body as soft white smears.
    mirrored += min(photoStrength * (photo > 5.5 ? faceAt(r, 0.4) * 1.2 : photoAt(roomHit(s.o, r), 0.4)), vec3(0.45));
  }
  mirrored += 0.5 * groundLight * background * (1.0 - smoothstep(-0.1, 0.1, r.z));
  // Capped at grazing: a full mirror there would lay a pale halo round the body instead of a thin bright line.
  // Weak over the turned-away band (else a grey halo lies round a dark body), full only in the last pixels.
  float edgeLine = 1.0 - smoothstep(0.5, 2.0, s.edge);
  colour += lightColour * mirrored * (min(fIn, 0.1) + 0.6 * edgeLine * fIn) * serumGloss;
  vec3 c = normalize(keyAt - s.o);
  float facingKey = dot(r, c);
  if (facingKey > 0.2 && serumBox > 0.0) {
    vec3 t1 = normalize(cross(c, vec3(0.0, 0.0, 1.0)) + vec3(1e-4, 0.0, 0.0));
    vec3 t2 = cross(c, t1);
    vec2 u = abs(vec2(dot(r, t1), dot(r, t2)) / facingKey);
    vec2 boxHalf = vec2(0.13, 0.08) * (0.6 + keySize);
    float edgeSoft = 0.008 + 0.025 * keySize;
    float window = (1.0 - smoothstep(boxHalf.x - edgeSoft, boxHalf.x + edgeSoft, u.x)) * (1.0 - smoothstep(boxHalf.y - edgeSoft, boxHalf.y + edgeSoft, u.y));
    colour += lightColour * keyStrength * 28.0 * serumBox * serumGloss * window * fIn;
  }
  colour += lightColour * keyStrength * 2.5 * bub.z * serumGloss;
  return filmic(colour * 1.25 * exposure);
}
`,
  call: "serumOf",
  defaults,
  controls: [
    { key: "serumHue", label: "색상", min: 0, max: 1, step: 0.005 },
    { key: "serumChroma", label: "채도 (0 맑음 · 1 진한 색)", min: 0, max: 1, step: 0.01 },
    { key: "serumDensity", label: "색 농도 (두께에 따른 흡수)", min: 0, max: 3, step: 0.01 },
    { key: "serumMurk", label: "탁도 (어둡게 · 오일)", min: 0, max: 4, step: 0.01 },
    { key: "serumCoat", label: "코팅 색 사용", min: 0, max: 1, step: 0.01 },
    { key: "serumIor", label: "굴절률", min: 1.2, max: 1.7, step: 0.01 },
    { key: "serumBase", label: "모양 (0 떠 있는 방울 · 1 바닥에 놓인 젤)", min: 0, max: 1, step: 0.01 },
    { key: "serumFlags", label: "굴절선 어둠 (검은 반사판)", min: 0, max: 1, step: 0.01 },
    { key: "serumCaustic", label: "모인 빛 (안쪽 밝음)", min: 0, max: 2, step: 0.01 },
    { key: "serumSwirl", label: "두께 결 · 마블링", min: 0, max: 1, step: 0.01 },
    { key: "serumHaze", label: "탁한 빛 (산란)", min: 0, max: 1, step: 0.01 },
    { key: "serumBubbles", label: "기포 양", min: 0, max: 2, step: 0.01 },
    { key: "serumBubbleSize", label: "기포 크기", min: 0.4, max: 2.5, step: 0.01 },
    { key: "serumGloss", label: "광택", min: 0, max: 2, step: 0.01 },
    { key: "serumBox", label: "소프트박스 하이라이트", min: 0, max: 2, step: 0.01 },
    { key: "serumMeniscus", label: "윤곽선 (메니스커스)", min: 0, max: 1, step: 0.01 },
    { key: "serumWobble", label: "표면 일렁임", min: 0, max: 2, step: 0.01 },
    { key: "serumFlow", label: "흐름 속도", min: 0, max: 3, step: 0.05 },
  ],
  looks: [
    { id: "serum-blue", label: "블루 젤", look: { keySize: 0.2 } },
    {
      id: "serum-clear",
      label: "맑은 방울",
      look: { background: [0.8, 0.78, 0.92], serumHue: 0.7, serumChroma: 0.12, serumDensity: 1, serumMurk: 0.01, serumIor: 1.5, serumBase: 0.2, serumFlags: 0.9, serumCaustic: 0.8, serumSwirl: 0, serumHaze: 0, serumBubbles: 0.35, serumBubbleSize: 0.6, serumMeniscus: 0.9, serumWobble: 0.3, keySize: 0.2 },
    },
    {
      id: "serum-amber",
      label: "앰버",
      look: { serumHue: 0.075, serumChroma: 0.96, serumDensity: 3.2, serumMurk: 0.1, serumBase: 0.7, serumFlags: 0.35, serumCaustic: 1.1, serumSwirl: 0.6, serumHaze: 0.05, serumBubbles: 0.4, serumBubbleSize: 0.6, serumBox: 1.2, keySize: 0.15 },
    },
    {
      id: "serum-oil",
      label: "오일 방울",
      look: { serumHue: 0.68, serumChroma: 0.6, serumDensity: 1, serumMurk: 4, serumBase: 0.5, serumFlags: 0.4, serumCaustic: 0.15, serumSwirl: 0.1, serumHaze: 0.05, serumBubbles: 0.45, serumBubbleSize: 0.5, serumGloss: 1.3, serumBox: 0.7, serumMeniscus: 0.3, serumWobble: 0.4, keySize: 0.2 },
    },
  ],
};
