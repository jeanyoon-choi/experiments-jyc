// 석고 v2 (bubble/8, user 2026-11-03): "석고 v2 하나 만들어서 조금 더 hyperrealistic 한 재질" — v1
// (render/plaster.ts) read "너무 일반 3d graphic 같음", and its marble "전혀 로댕같지 않음". One shader, two stones,
// drawn from photographs looked at side by side (2026-11-03), not from an idea of either.
//
// PLASTER CASTS, seen in: the Ashmolean's cast gallery (https://www.ashmolean.org/cast-gallery-department), Springfield
// Museums' casts of Michelangelo's Medici tomb and Ludovisi Ares under green walls and arched windows
// (https://springfieldmuseums.org/about/smith-art-museum/plaster-cast-collection/), Munich's Museum für Abgüsse
// (https://www.muenchen.de/en/sights/museums/museum-plaster-casts-ancient-art), Cambridge's Museum of Classical
// Archaeology (https://www.classics.cam.ac.uk/museum/collections/cast-collection), a Farnese Hercules cast under a
// skylight (https://commons.wikimedia.org/wiki/File:Hercules_-_1.jpg), Canova's plaster models at Possagno — the
// Death of Priam relief (https://commons.wikimedia.org/wiki/File:Antonio_Canova_-_La_morte_di_Priamo_(1787-1792)_-_Plaster_-_Possagno,_Fondazione_Canova.jpg)
// and the pointed Bust of Peace (https://commons.wikimedia.org/wiki/File:Antonio_Canova,_Bust_of_Peace,_Pointed_Plaster,_image_courtesy_of_the_Museo_Canova_and_Gipsoteca_canoviana,_Possagno.jpg)
// — and a Venus de Milo and a Hermes of Praxiteles cast in the same search's gallery photographs.
// Common to all of them:
//   - dead matte: no highlight anywhere, the form read from shading alone; the lit side never burns to white;
//   - low contrast: under a skylight or a gallery's windows the shade side stays a light, slightly warm grey
//     (the white room bounces into it); only the deepest undercuts go dark;
//   - a body colour that is never screen white: from cool chalk (Canova's fresh models, the Hermes) to ivory and
//     greige (the Hercules, Springfield, the Venus);
//   - darkness gathered in the hollows as grime, browner than the shade, and broad tonal blotches — washes,
//     shellac, handling — never a fine printed texture; fine pores only up close;
//   - crisp edges, softened only by the light.
// What varies: fresh chalk-white vs aged ivory/greige; how much grime and blotching; (the mould seams and
// Canova's pointing nails are the maker's marks, slight).
//
// RODIN'S MARBLES, seen in: The Kiss at the Musée Rodin in six visitors' photographs
// (https://commons.wikimedia.org/wiki/Category:Le_Baiser_by_Auguste_Rodin_(Mus%C3%A9e_Rodin)), The Hand of God shown at
// the Louvre's Michelangelo–Rodin exhibition (https://commons.wikimedia.org/wiki/File:Paris_1er_-_Mus%C3%A9e_du_Louvre_-_Exposition_Michel-Ange_Rodin_-_Corps_vivants_-_La_Main_de_Dieu_(Auguste_Rodin)_01.jpg;
// the Met on its "play between a highly finished and a non-finito surface": https://www.metmuseum.org/toah/works-of-art/08.210),
// La Pensée at the Orsay (https://commons.wikimedia.org/wiki/File:La_Pensee-Rodin-Orsay.jpg), the Danaid
// (https://www.musee-rodin.fr/en/musee/collections/oeuvres/danaid ; https://commons.wikimedia.org/wiki/File:Rodin_Museum_Danaid.JPG),
// and, against them, a fully finished Rodin marble, the Met's Orpheus (https://commons.wikimedia.org/wiki/File:Orpheus_MET_DP246605.jpg).
// Common to them:
//   - the figure's skin polished but not glossy: a broad satin sheen, gradients so soft they read as wax; light
//     goes into it — the shade side glows warm, thin parts (fingers, a cheek's edge) almost translucent;
//   - the skin a warm ivory, the rough block beside it whiter, greyer and cooler (bruised crystals scatter
//     white; La Pensée's block even shows rust-pink iron stains);
//   - the block worked, not raw: fields of fine parallel tooth-chisel hatching (the Danaid's rock, crossing patch
//     by patch) over the point chisel's pocks (the Hand of God's block) — high micro-contrast, no sheen;
//   - the figure emerges where the form rises; the stone stays where it falls away, towards the outline and in
//     the hollows; the line between them is irregular but distinct, a small step.
// What varies: how much is left rough (The Kiss mostly finished, La Pensée a head on a block), how warm the skin.
//
// Needs SHADING (hash, keyAt, photoAt, filmic, toWorld …) and surface.ts (Surface, mirrorOf, noise, fbm2).

import type { MaterialEntry } from "./surface";

const defaults = {
  stoneMarble: 0,
  stoneWarmth: 0.25,
  stoneScatter: 0.5,
  stoneOcclusion: 0.85,
  stoneDust: 0.3,
  stoneAge: 0.4,
  stoneSeam: 0.2,
  stoneUnfinished: 0.55,
  stoneChisel: 0.7,
  stonePolish: 0.6,
  stoneVein: 0.2,
};

export const STONE_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 3,
  family: "plaster",
  familyLabel: "석고",
  colourLabel: "석고",
  glsl: /* glsl */ `
uniform float stoneMarble;            // 0 the plaster cast … 1 Rodin's marble (polished figure from a rough block)
uniform float stoneWarmth;            // ivory warmth of the white (marble: of its polished skin)
uniform float stoneScatter;           // light entering the stone: wrapped terminator, glowing thin rims
uniform float stoneOcclusion;         // how dark its hollows grow
uniform float stoneDust;              // plaster: dust settled on its upward faces
uniform float stoneAge;               // tonal blotches, grime in the hollows
uniform float stoneSeam;              // plaster: the mould's seam
uniform float stoneUnfinished;        // marble: how much stays rough block (non finito)
uniform float stoneChisel;            // marble: the tooth chisel's grooves and the point's pocks in the rough
uniform float stonePolish;            // marble: the polished skin's satin sheen
uniform float stoneVein;              // marble: faint grey veins

vec3 stoneOf(Surface s) {
  vec3 nS = s.nS;
  float marble = step(0.5, stoneMarble);
  // Broad tonal patches, fixed on it (one fbm, reused for the carved line and the chisel's patches).
  float patchy = fbm2(vec3(s.q * 1.7, s.seed * 11.0)) - 0.375;
  vec3 ivory = mix(vec3(1.0), vec3(1.0, 0.955, 0.875), stoneWarmth);
  vec3 albedo = s.albedo;
  float polished = 1.0;
  float pocked = 0.0;
  if (marble > 0.5) {
    // Non finito: the figure emerges from one side of its block (The Hand of God, the Danaid): each object keeps
    // the unworked stone on one side of its own frame, an irregular half-plane over roughly a third of it.
    float side = 6.2831853 * hash(vec3(s.seed * 23.0, 4.1, 0.7));
    vec2 toBlock = vec2(cos(side), sin(side));
    float reach = mix(0.65, -0.05, stoneUnfinished) + 0.2 * (hash(vec3(s.seed * 5.0, 8.3, 2.9)) - 0.5);
    float carve = reach - dot(s.q, toBlock) - 0.5 * patchy - 0.25 * (noise(vec3(s.q * 2.5, s.seed * 5.0)) - 0.5);
    // The carved line, crisp to a pixel: signed px from it (positive inside the figure).
    vec2 carveSlope = vec2(dFdx(carve), -dFdy(carve));
    float perPx = max(length(carveSlope), 1e-5);
    float inside = carve / perPx;
    polished = clamp(inside + 0.5, 0.0, 1.0);
    float rough = 1.0 - polished;
    // The step: the figure's edge rolls over onto the lower block within a pixel or two, so its rim catches the
    // key on one side and drops into shade on the other.
    float lip = exp(-abs(inside - 0.5) / 1.4);
    nS = normalize(nS + vec3(-carveSlope / perPx * lip * 0.6, 0.0));
    if (rough > 0.0) {
      // The tooth chisel: grooves a few px apart in patches, each patch cut its own way; each groove a scoop
      // between sharp crests, so one wall faces the key and the other turns from it.
      vec2 cell = floor(s.q * 1.8 + 1.5 * patchy);
      float angle = 3.1415927 * hash(vec3(cell, s.seed * 17.0 + 3.0));
      vec2 along = vec2(cos(angle), sin(angle));
      vec2 across = vec2(-along.y, along.x);
      float count = clamp(s.radius / 7.0, 5.0, 32.0);
      // Below about 4 px between grooves they fade into the matte grain (no moiré).
      float grooveDetail = smoothstep(3.0, 6.0, s.radius / count);
      float u = dot(s.q, along) * count;
      float v = dot(s.q, across) * count + 0.6 * noise(vec3(u * 0.18, cell * 1.3 + s.seed * 7.0));
      float stroke = smoothstep(0.4, 0.75, noise(vec3(u * 0.22, v * 0.5, s.seed * 9.0 + cell.x * 3.1 + cell.y * 1.7)));
      // Shallow, soft scoops: seen mostly in raking light.
      float wall = sin(6.2831853 * v) * 0.22 * stroke * grooveDetail;
      vec2 tilt = across * wall;
      // The point's pocks: small irregular cavities, their walls turned towards their middles.
      float pockSize = 0.8 * count;
      float pockDetail = smoothstep(2.0, 4.5, s.radius / pockSize);
      vec2 pq = s.q * pockSize + s.seed * 13.0;
      vec2 pc = floor(pq);
      vec2 pf = fract(pq);
      vec2 pockTilt = vec2(0.0);
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec3 rnd = vec3(hash(vec3(pc + g, 1.3)), hash(vec3(pc + g, 7.1)), hash(vec3(pc + g, 3.7)));
          if (rnd.z > 0.2) continue;
          vec2 d = g + rnd.xy - pf;
          float e = length(d * vec2(1.0, 1.0 + 1.2 * rnd.x)) / (0.25 + 0.4 * rnd.z);
          if (e < 1.0) {
            pocked = max(pocked, 1.0 - e * e);
            pockTilt += d / max(length(d), 1e-3) * e * 0.3;
          }
        }
      }
      pocked *= pockDetail * rough;
      // q's frame turned onto the screen (objects are turned), so each groove's lit wall faces the real key.
      nS = normalize(nS + vec3(s.qTurn * ((tilt + pockTilt * pockDetail) * stoneChisel * rough), 0.0));
    }
    // Faint veins in the polished skin.
    float vein = 1.0 - smoothstep(0.0, 0.03, abs(fbm2(vec3(s.q * 1.2 + vec2(s.seed * 4.0, 0.0), 2.0)) - 0.375));
    albedo *= 1.0 - stoneVein * 0.14 * vein * polished * vec3(1.0, 0.97, 0.94);
    // The skin Carrara white, warmed only a little; the block whiter, greyer, cooler (bruised crystals scatter white).
    albedo *= mix(vec3(0.97, 0.98, 1.0), mix(vec3(1.0), ivory, 0.3), polished);
    albedo = mix(albedo, min(albedo * 1.08 + 0.05, vec3(1.0)), rough);
  } else {
    albedo *= ivory;
    // The cast's age: dust grey on the faces turned up (broad, from the smooth form), grime brown in its undercuts.
    float up = smoothstep(0.4, 1.0, s.n.z);
    float dust = stoneDust * up * (0.4 + 0.8 * noise(s.grainAt * 0.05 + vec3(s.q * 3.0, 0.0)));
    albedo = mix(albedo, vec3(0.78, 0.75, 0.69), clamp(dust, 0.0, 1.0) * 0.22);
    float undercut = mix(1.0, s.occlusion, smoothstep(0.02, 0.2, s.relief));
    albedo *= mix(vec3(0.88, 0.85, 0.8), vec3(1.0), mix(1.0, smoothstep(0.0, 0.85, undercut), stoneAge));
    // The mould's seam: a fine ridge across it, catching light on one side and shading the other.
    float seamAngle = 6.2831853 * hash(vec3(s.seed * 31.0, 1.7, 4.2));
    vec2 seamAcross = vec2(cos(seamAngle), sin(seamAngle));
    float d = dot(s.q, seamAcross) + 0.25 * (hash(vec3(s.seed * 7.0, 2.2, 9.1)) - 0.5) + 0.04 * patchy;
    float w = 1.2 / max(s.radius, 8.0);
    float ridge = (1.0 - smoothstep(0.0, w * 1.5, abs(d))) * smoothstep(0.15, 0.4, s.relief) * stoneSeam;
    nS = normalize(nS + vec3(s.qTurn * (seamAcross * sign(d) * ridge * 0.4), 0.0));
  }
  // Tonal blotches, broad and slight; darker ones yellower.
  albedo *= 1.0 + stoneAge * patchy * vec3(0.2, 0.24, 0.32);
  vec3 n = s.turn * toWorld(nS);
  float skin = marble * polished;
  float rough = marble * (1.0 - polished);

  // Light: the key (a high window) and a skylight from above, the white room bouncing into the shade.
  vec3 toKey = normalize(keyAt - s.o);
  float ndl = dot(n, toKey);
  // Plaster: a clean terminator, the light planes flat and bright. Marble's skin: light wrapping deep into it.
  // Marble: the whole object one volume — skin and block share the same light, terminator and glow.
  float lambert = clamp(ndl * mix(1.2, 1.0, marble) + mix(0.04, 0.0, marble), 0.0, 1.0);
  float wrap = mix(0.1, 0.35, marble) * stoneScatter * 2.0;
  float wrapped = max((ndl + wrap) / (1.0 + wrap), 0.0);
  // Near the outline the height field's falloff reads as a hollow; only real undercuts are.
  float undercutL = mix(1.0, s.occlusion, smoothstep(0.02, 0.2, s.relief));
  float open = max(mix(1.0, undercutL, stoneOcclusion), mix(0.3, 0.15, marble)) * (1.0 - 0.15 * pocked);
  vec3 keyLight = lightColour * vec3(1.0, 0.97, 0.92) * keyStrength * mix(1.35, 1.05, keySize);
  vec3 sky = vec3(0.99, 0.98, 0.97) * (0.47 + 0.3 * shadowLift) * (0.55 + 0.45 * n.z);
  if (photoStrength > 0.0) sky += 0.2 * photoStrength * photoAt(n, 7.0);
  sky += background * (0.16 + 0.3 * groundLight) * clamp(0.35 - n.z, 0.0, 1.0);
  sky *= lightColour * mix(1.0, 0.8, marble);
  vec3 body = albedo * (keyLight * lambert * mix(0.55, 1.0, open) + sky * open);
  // Light that entered comes back warmer past the terminator: a faint softening in plaster; in the marble's skin
  // a glow bleeding well into the shade, brighter at its thin rims.
  vec3 warm = mix(vec3(1.0, 0.78, 0.6), vec3(1.0, 0.84, 0.7), marble);
  body += albedo * warm * keyLight * (wrapped - max(ndl, 0.0)) * mix(0.25, 0.6, marble) * (1.0 - 0.25 * rough) * mix(0.5, 1.0, open);
  float thin = pow(1.0 - s.facing, 2.0) * (0.35 + 0.65 * clamp(0.5 - 0.5 * ndl, 0.0, 1.0));
  body += albedo * vec3(1.0, 0.8, 0.62) * keyStrength * (0.05 + 0.3 * marble * (1.0 - 0.5 * rough)) * stoneScatter * thin * open;
  body += albedo * vec3(1.0, 0.88, 0.78) * keyStrength * 0.08 * marble * (1.0 - 0.5 * rough) * stoneScatter;
  // The skin: smooth and a touch brighter (polish lets more light out).
  body *= 1.0 + 0.04 * skin;
  // The rough block: opaque and a little brighter; the gypsum's and the block's fine tooth.
  body *= (1.0 + 0.05 * rough) * (1.0 + mix(0.03, 0.1, rough) * (noise(s.grainAt * 0.9) - 0.5));

  // Sheen: plaster none to speak of; the marble's skin a broad satin that moves with the form, the block none.
  vec3 spec = vec3(0.0);
  if (skin > 0.0) {
    vec3 toEye = toWorld(vec3(0.0, 0.0, 1.0));
    float satin = pow(max(dot(n, normalize(toKey + toEye)), 0.0), 8.0);
    float fresnel = pow(1.0 - s.facing, 5.0);
    Surface m = s;
    m.nS = nS;
    spec = (keyLight * satin * 0.5 + mirrorOf(m, 0.6) * (0.03 + 0.4 * fresnel)) * stonePolish * skin * mix(0.6, 1.0, open);
  }
  return filmic((body + spec) * 1.08 * exposure);
}
`,
  call: "stoneOf",
  defaults,
  controls: [
    { key: "stoneMarble", label: "석고 0 · 대리석 1", min: 0, max: 1, step: 1 },
    { key: "stoneWarmth", label: "상아빛", min: 0, max: 1, step: 0.01 },
    { key: "stoneScatter", label: "빛 투과 (속광)", min: 0, max: 1, step: 0.01 },
    { key: "stoneOcclusion", label: "오목한 곳 그늘", min: 0, max: 1, step: 0.01 },
    { key: "stoneAge", label: "얼룩 · 때", min: 0, max: 1, step: 0.01 },
    { key: "stoneDust", label: "먼지 (석고)", min: 0, max: 1, step: 0.01 },
    { key: "stoneSeam", label: "틀 이음선 (석고)", min: 0, max: 1, step: 0.01 },
    { key: "stoneUnfinished", label: "미완의 돌 (대리석)", min: 0, max: 1, step: 0.01 },
    { key: "stoneChisel", label: "정 자국 (대리석)", min: 0, max: 1, step: 0.01 },
    { key: "stonePolish", label: "광택 (대리석)", min: 0, max: 1, step: 0.01 },
    { key: "stoneVein", label: "결 (대리석)", min: 0, max: 1, step: 0.01 },
  ],
  // Over bubble/7's studio: a large, soft key (a skylight, a gallery window) and the shade lifted.
  looks: [
    // A cast as most galleries show it (Cambridge, Munich, the Hermes, Canova's models): chalk white, a touch of ivory, little age.
    { id: "stone", label: "석고상 v2", look: { coating: [0.95, 0.94, 0.91], coatingMix: 0, stoneMarble: 0, stoneWarmth: 0.25, stoneAge: 0.3, stoneDust: 0.25, keyStrength: 1.25, keySize: 0.7, shadowLift: 0.2 } },
    // A century-old cast (Springfield, the Hercules, the Venus): ivory-greige, grime in its folds, blotched.
    { id: "stone-aged", label: "석고상 · 오래된", look: { coating: [0.91, 0.88, 0.82], coatingMix: 0, stoneMarble: 0, stoneWarmth: 0.75, stoneAge: 0.9, stoneDust: 0.6, stoneSeam: 0.4, keyStrength: 1.15, keySize: 0.7, shadowLift: 0.2 } },
    // Rodin's marbles: a warm, translucent figure from a whiter, worked block.
    { id: "rodin", label: "대리석 (로댕)", look: { coating: [0.96, 0.95, 0.93], coatingMix: 0, stoneMarble: 1, stoneWarmth: 0.5, stoneScatter: 0.7, stoneAge: 0.2, keyStrength: 1.25, keySize: 0.55, shadowLift: 0.15 } },
  ],
};
