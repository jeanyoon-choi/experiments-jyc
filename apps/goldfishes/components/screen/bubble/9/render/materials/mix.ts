// 맥시멀 믹스 (bubble/8, user 2026-11-03: "이런 류의 재질도 있어야함. 이것도 재질로 추가하셈." with a screenshot of a
// maximalist 3D tangle on black): every object — and, by 부분 나눔, each part of one — is its own hyper-real
// material: liquid chrome, crackled gold, Koons-style coloured mirror, glossy enamel, matte soft-touch silicone /
// rubber, flock or sugar grain, leather.
//
// References looked at (2026-11-03; each viewed, the image searches as the sets of authored photos they returned):
//   - the user's screenshot (an Instagram reel: a maximalist CGI tangle on black);
//   - Kitasavi (Nikita Savinov), maximalist 3D sculptures of enamel, PVC and chrome blobs — the face of blobs on a
//     light ground, the chrome-and-wire heads (https://www.raster.art/artist/kitasavi/about ,
//     https://www.google.com/search?q=kitasavi+3d+sculpture&udm=2);
//   - Jeff Koons, Balloon Dog and Hanging Heart: mirror-polished stainless steel under a transparent colour coating
//     (https://www.thebroad.org/art/jeff-koons/balloon-dog-blue , https://lesoeuvres.pinaultcollection.com/en/node/2175 ,
//     https://www.google.com/search?q=Jeff+Koons+Play-Doh+sculpture+Hanging+Heart+photo&udm=2);
//   - Anish Kapoor's mirror works in white galleries (MASS MoCA, Sky Mirror; https://www.google.com/search?q=Anish+Kapoor+polished+stainless+steel+sculpture+mirror&udm=2):
//     chrome on white reads only through the dark floor band and the sharp room it mirrors;
//   - Be@rbrick rubber-coated matte figures (Holt Renfrew, Sideshow, Buy Bearbricks UK;
//     https://www.google.com/search?q=Bearbrick+matte+rubber+finish+figure+photo&udm=2): a broad dull sheen, no hotspot;
//   - flocked PVC toys (Rhode Island Novelty, Weijun Toys, Timbuk Toys;
//     https://www.google.com/search?q=flocked+vinyl+art+toy+figure+macro+velvet+texture&udm=2): the velvet's
//     silhouette lighter than its middle, colour softened, no specular;
//   - sugar-coated gummies in macro (Alamy, Dreamstime, Adobe Stock;
//     https://www.google.com/search?q=sour+sugar+coated+gummy+candy+macro+photography&udm=2): a saturated body under
//     scattered white crystals that flash as single bright points across the lit side;
//   - crackle gilding close-ups (gilded frames, gilding over crackle gesso;
//     https://www.google.com/search?q=crackle+gold+leaf+gilded+sculpture+craquelure+close+up&udm=2): warm yellow
//     reflections broken by a fine network of dark cracks;
//   - leather product photography (FlixStudio's guide, studio close-ups;
//     https://www.google.com/search?q=brown+leather+object+product+photography+grain+close+up+studio&udm=2): pebble
//     grain cells with dark creases between, a low broken sheen;
//   - Peter Tarka's playful 3D illustration (https://petertarka.com ,
//     https://www.google.com/search?q=Peter+Tarka+3d+illustration&udm=2): pastel matte-to-satin solids on light grounds.
// Common to all: each object is ONE clean material, legible at a glance; colour is flat and dense (primaries plus a
// few pastels, white, black, browns — never neon); the gloss ones show the room as sharp shapes (white softbox,
// dark floor) and the matte ones show only the form; metals take all their contrast from what they mirror, their
// tint in the reflection; the textured ones (grain, crackle, leather) carry it finer than the eye can count.
// What varies (sliders and looks): the share of metal, of matte, the palette (maximal / pastel / the page's coat),
// how rough the gloss runs, how many objects split into parts, the ground (white studio, black as the screenshot).
// Needs SHADING (hash, keyAt, irradiance, filmic, toWorld …) and surface.ts (Surface, mirrorOf, noise).

import type { MaterialEntry } from "./surface";

const defaults = {
  mixMetal: 0.38,
  mixMatte: 0.42,
  mixPalette: 0,
  mixSpread: 0.4,
  mixParts: 0.25,
  mixGrain: 0.6,
  mixCrackle: 0.5,
  mixSeed: 0,
};

export const MIX_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 7,
  family: "mix",
  familyLabel: "맥시멀 믹스",
  colourLabel: "믹스",
  glsl: /* glsl */ `
uniform float mixMetal;               // share of metals (chrome, gold, coloured mirror)
uniform float mixMatte;               // share of matte among the rest (silicone, grain, leather) vs enamel
uniform float mixPalette;             // 0 maximal, 1 pastel, 2 the page's coat
uniform float mixSpread;              // how rough the glossy ones may run
uniform float mixParts;               // share of objects split into two materials
uniform float mixGrain;               // flock / sugar / leather grain
uniform float mixCrackle;             // gold's crackle
uniform float mixSeed;                // reshuffles who gets what

const vec3 mixEnamel[10] = vec3[10](
  vec3(0.80, 0.05, 0.04), vec3(0.04, 0.16, 0.80), vec3(0.50, 0.80, 0.12), vec3(0.98, 0.76, 0.18), vec3(0.97, 0.36, 0.05),
  vec3(0.55, 0.36, 0.85), vec3(0.012, 0.012, 0.014), vec3(0.90, 0.90, 0.88), vec3(0.03, 0.30, 0.13), vec3(0.28, 0.60, 0.95));
const vec3 mixSoft[7] = vec3[7](
  vec3(0.90, 0.50, 0.54), vec3(0.74, 0.85, 0.96), vec3(0.92, 0.92, 0.90), vec3(0.72, 0.60, 0.90), vec3(0.98, 0.86, 0.52),
  vec3(0.60, 0.86, 0.72), vec3(0.03, 0.03, 0.035));
const vec3 mixGrainy[5] = vec3[5](
  vec3(0.78, 0.05, 0.04), vec3(0.05, 0.18, 0.78), vec3(0.95, 0.45, 0.55), vec3(0.50, 0.78, 0.14), vec3(0.98, 0.72, 0.15));
const vec3 mixHide[4] = vec3[4](vec3(0.50, 0.23, 0.09), vec3(0.22, 0.10, 0.05), vec3(0.34, 0.04, 0.04), vec3(0.025, 0.022, 0.02));
const vec3 mixAnodised[5] = vec3[5](
  vec3(0.90, 0.10, 0.08), vec3(0.10, 0.32, 0.95), vec3(0.92, 0.12, 0.50), vec3(0.10, 0.62, 0.66), vec3(0.50, 0.24, 0.90));

// Which material an object (or part) is: 0 chrome, 1 gold, 2 coloured mirror, 3 enamel, 4 silicone, 5 grain, 6 leather.
int mixKindOf(float seed) {
  float a = hash(vec3(seed * 53.1 + mixSeed * 7.7, 2.3, 7.9));
  float b = hash(vec3(seed * 29.7 + mixSeed * 3.1, 8.6, 1.4));
  if (a < mixMetal) return b < 0.5 ? 0 : (b < 0.75 ? 1 : 2);
  if (b < mixMatte) {
    float c = hash(vec3(seed * 71.3, 4.4, 3.3 + mixSeed));
    return c < 0.45 ? 4 : (c < 0.72 ? 5 : 6);
  }
  return 3;
}

vec3 mixColourOf(int kind, float seed, Surface s) {
  float pick = hash(vec3(seed * 91.7 + mixSeed * 5.3, 6.1, 2.8));
  vec3 c;
  if (kind == 2) c = mixAnodised[int(pick * 4.999)];
  else if (kind == 4) c = mixSoft[int(pick * 6.999)];
  else if (kind == 5) c = mixGrainy[int(pick * 4.999)];
  else if (kind == 6) c = mixHide[int(pick * 3.999)];
  else c = mixEnamel[int(pick * 9.999)];
  if (kind != 6) {
    float m = max(c.r, max(c.g, c.b));
    if (mixPalette > 1.5) c = m < 0.05 ? c : s.albedo;
    else if (mixPalette > 0.5 && m > 0.05) c = mix(c, vec3(0.95, 0.94, 0.92), 0.42);
  }
  return mix(c, s.albedo, s.dyed);
}

vec3 mixOf(Surface s) {
  float seed = s.seed;
  vec2 gp = s.q * s.radius;                        // CSS px on it, fixed to it
  float seamShade = 1.0;
  // 부분 나눔: a part slotted onto it, cut along a wavering line, a fine dark seam between.
  if (hash(vec3(seed * 13.9 + mixSeed, 5.7, 3.2)) < mixParts) {
    float angle = 6.2831853 * hash(vec3(seed * 37.3, 1.1, 6.6));
    float d = dot(s.q, vec2(cos(angle), sin(angle))) + 0.5 * (hash(vec3(seed * 17.1, 9.3, 2.2)) - 0.5)
      + 0.22 * (noise(vec3(s.q * 1.8, seed * 7.0)) - 0.5);
    float px = d * s.radius;
    seamShade = mix(0.35, 1.0, smoothstep(0.4, 1.6, abs(px)));
    if (d > 0.0) seed = fract(seed * 1.618 + 0.317);
  }
  int kind = mixKindOf(seed);
  vec3 albedo = mixColourOf(kind, seed, s);
  float r = hash(vec3(seed * 43.7, 3.9, 5.1));
  float open = max(mix(1.0, s.occlusion, 0.85), 0.15) * seamShade;
  float fresnel = pow(1.0 - s.facing, 5.0);
  vec3 toKey = normalize(keyAt - s.o);
  vec3 colour;

  if (kind <= 2) {
    // Metals: all their contrast is what they mirror, their colour in the reflection.
    float rough = 0.008 + 0.13 * mixSpread * r * r;
    vec3 seen = mirrorOf(s, rough);
    if (kind == 0) {
      vec3 tint = mix(vec3(0.93, 0.94, 0.96), albedo, s.dyed);
      colour = seen * tint;
    } else if (kind == 1) {
      vec3 gold = mix(vec3(1.0, 0.72, 0.30), albedo, s.dyed);
      colour = seen * mix(gold, vec3(1.0, 0.92, 0.8), fresnel * 0.7);
      // Crackle gilding: a fine network of dark, duller cracks.
      float k = max(5.0, s.radius * 0.07);
      float c1 = abs(noise(vec3(gp / k, seed * 11.0)) - 0.5);
      float c2 = abs(noise(vec3(gp / (k * 0.47) + 3.7, seed * 5.0)) - 0.5);
      float line = 1.0 - smoothstep(0.0, 0.03, min(c1, c2 * 1.25));
      vec3 dull = mirrorOf(s, 0.4) * gold * 0.18;
      colour = mix(colour, dull, line * mixCrackle * 0.85);
    } else {
      // Koons: a mirror under a transparent colour coat — the colour dense where it mirrors light, near black where dark.
      colour = seen * albedo * 1.05 + seen * 0.05 * fresnel;
    }
    colour *= mix(0.45, 1.0, open);
  } else if (kind == 3) {
    // Enamel: a dense lacquer body under a crisp clear coat that mirrors the softbox and the room.
    float rough = 0.012 + 0.22 * mixSpread * r * r;
    vec3 body = albedo * irradiance(s.o, s.n) * open;
    vec3 clear = mirrorOf(s, rough) * (0.045 + 0.955 * fresnel) * mix(0.5, 1.0, open);
    colour = body * (1.0 - 0.6 * fresnel) + clear;
  } else if (kind == 6) {
    // Leather: pebble grain cells with dark creases, a low broken sheen.
    float k = max(2.2, s.radius * 0.024);
    float h0 = noise(vec3(gp / k, seed * 9.0));
    float hx = noise(vec3((gp + vec2(0.7, 0.0)) / k, seed * 9.0));
    float hy = noise(vec3((gp + vec2(0.0, 0.7)) / k, seed * 9.0));
    float crease = 1.0 - smoothstep(0.0, 0.09, abs(h0 - 0.5));
    Surface m = s;
    m.nS = normalize(s.nS + vec3(vec2(hx - h0, hy - h0) * 0.9 * mixGrain, 0.0));
    m.n = s.turn * toWorld(m.nS);
    vec3 body = albedo * irradiance(m.o, m.n) * open * (1.0 - 0.28 * mixGrain * crease);
    vec3 sheen = mirrorOf(m, 0.42) * (0.035 + 0.35 * fresnel) * (1.0 - 0.7 * crease) * open;
    colour = body + sheen * 0.8;
  } else {
    vec3 n = s.n;
    float ndl = dot(n, toKey);
    // The matte ones show their form only through shading: the room's even light turned towards the key. Under a
    // key near the camera a long, mostly face-on part (the rocket's hull) met it all at one angle, and a light
    // pastel or grey rode the filmic shoulder: a flat, unlit plate. So the key's turn reaches deeper, the form
    // falls off towards its outline as a matte object's does in a studio (Be@rbrick's rubber), and the lightest
    // colours stay a little under white (a white rubber is about 0.9, not 1).
    vec3 irr = irradiance(s.o, n) * mix(0.42, 1.08, smoothstep(-0.55, 0.85, ndl));
    float turned = mix(0.76, 1.0, smoothstep(0.05, 0.75, s.facing));
    albedo *= min(1.0, 0.9 / max(max(albedo.r, max(albedo.g, albedo.b)), 1e-3));
    if (kind == 4) {
      // Soft-touch silicone / rubber: soft diffuse, light wrapping a little into it (deeper colour past the
      // terminator), one broad dull sheen, no hotspot.
      float wrap = max((ndl + 0.45) / 1.45, 0.0) - max(ndl, 0.0);
      vec3 deep = albedo * albedo / max(max(albedo.r, max(albedo.g, albedo.b)), 0.05);
      vec3 body = albedo * irr * open * turned + deep * keyStrength * 0.22 * wrap * open;
      vec3 sheen = mirrorOf(s, 0.72) * (0.025 + 0.2 * fresnel) * open;
      colour = body + sheen;
    } else {
      // Grain: flock (velvet: lighter towards its silhouette) or sugar (crystals sparkling over a saturated body).
      bool sugar = hash(vec3(seed * 19.3, 7.7, 0.9)) < 0.5;
      float rim = pow(1.0 - s.facing, 1.6);
      vec3 body = albedo * irr * open * (sugar ? 0.9 * turned : 0.82);
      body += mix(albedo, vec3(1.0), sugar ? 0.45 : 0.25) * irr * rim * (sugar ? 0.35 : 0.7) * open;
      // The grain itself: cells about a pixel and a half, each its own shade, a few of them flashing.
      float k = max(1.3, s.radius * 0.01);
      vec2 cell = floor(gp / k);
      float g = hash(vec3(cell, seed * 31.0));
      body *= 1.0 + mixGrain * (sugar ? 0.35 : 0.22) * (g - 0.5);
      if (sugar) {
        body = mix(body, irr * 0.85 * open, 0.12 * mixGrain);
        float facet = hash(vec3(cell + 17.0, seed * 13.0));
        float glint = smoothstep(0.82, 0.98, fract(facet + 1.7 * dot(n, toKey) + 0.6 * s.n.x));
        float lit = smoothstep(-0.1, 0.4, ndl);
        body += lightColour * keyStrength * 1.6 * glint * step(1.0 - 0.3 * mixGrain, g) * lit * open;
      }
      colour = body;
    }
  }
  return filmic(colour * exposure * 1.05);
}
`,
  call: "mixOf",
  defaults,
  controls: [
    { key: "mixMetal", label: "금속 비율 (크롬 · 금 · 컬러 미러)", min: 0, max: 1, step: 0.01 },
    { key: "mixMatte", label: "무광 비율 (실리콘 · 플록 · 가죽)", min: 0, max: 1, step: 0.01 },
    { key: "mixPalette", label: "팔레트 (0 맥시멀 · 1 파스텔 · 2 코팅색)", min: 0, max: 2, step: 1 },
    { key: "mixSpread", label: "광택 거칠기 폭", min: 0, max: 1, step: 0.01 },
    { key: "mixParts", label: "부분 나눔 (한 오브제에 두 재질)", min: 0, max: 1, step: 0.01 },
    { key: "mixGrain", label: "결 (설탕 · 플록 · 가죽)", min: 0, max: 1, step: 0.01 },
    { key: "mixCrackle", label: "금 갈라짐", min: 0, max: 1, step: 0.01 },
    { key: "mixSeed", label: "섞기", min: 0, max: 20, step: 1 },
  ],
  looks: [
    // bubble/7's white studio, unchanged: the mix lit by its key and mirroring its room.
    { id: "mix", label: "맥시멀 믹스", look: {} },
    // The screenshot's black void: no ground light, the room and key alone in the metals.
    {
      id: "mix-black",
      label: "맥시멀 믹스 · 검정",
      look: { background: [0.015, 0.015, 0.02], groundLight: 0, edgeShadow: 0, shadowLift: 0, photoStrength: 1.1, keyStrength: 1.5, keySize: 0.35, exposure: 0.95, mixMetal: 0.5 },
    },
    // Peter Tarka's / Kitasavi's light-ground pastels: matte more often, softer key.
    { id: "mix-pastel", label: "파스텔 믹스", look: { mixPalette: 1, mixMatte: 0.6, mixMetal: 0.25, keySize: 0.6, shadowLift: 0.15 } },
  ],
};
