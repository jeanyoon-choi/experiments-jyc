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

// Rodin's marble (석고 → 대리석). Not the cast's light with a sheen on it: light goes into the stone. Looked at again
// (2026-11-05) — The Kiss at the Musée Rodin (https://commons.wikimedia.org/wiki/File:2007-07-paris-080.jpg), The Hand
// of God at the Louvre (link above), the Danaid (https://commons.wikimedia.org/wiki/File:Rodin_Museum_Danaid.JPG) and
// Carrara itself, a sample slab (https://commons.wikimedia.org/wiki/Category:Carrara_marble):
//   - the shade never goes grey: it stays a light, warm, luminous ivory, the terminator a long soft roll, and the
//     hollows between forms are lit from inside, a warm half-tone, never dark;
//   - the polished skin has a satin sheen: soft, broad highlights on every curve towards the window and the
//     room mirrored faintly where it turns away;
//   - edges turned from the eye glow (fingers, a cheek's rim);
//   - Carrara's veins: faint blue-grey, drawn in long branching runs across the whole block, over a soft cloudiness;
//   - the rough block is chalk-white, matte and cooler, its tooling sharp, its crystals catching single glints.
vec3 marbleOf(Surface s) {
  vec3 nS = s.nS;
  float patchy = fbm2(vec3(s.q * 1.7, s.seed * 11.0)) - 0.375;
  vec3 ivory = mix(vec3(1.0), vec3(1.0, 0.955, 0.875), stoneWarmth);
  // Non finito: the unworked stone on one side of each object's frame, an irregular half-plane (as before).
  float side = 6.2831853 * hash(vec3(s.seed * 23.0, 4.1, 0.7));
  vec2 toBlock = vec2(cos(side), sin(side));
  float reach = mix(0.65, -0.05, stoneUnfinished) + 0.2 * (hash(vec3(s.seed * 5.0, 8.3, 2.9)) - 0.5);
  float carve = reach - dot(s.q, toBlock) - 0.5 * patchy - 0.25 * (noise(vec3(s.q * 2.5, s.seed * 5.0)) - 0.5);
  vec2 carveSlope = vec2(dFdx(carve), -dFdy(carve));
  float perPx = max(length(carveSlope), 1e-5);
  float inside = carve / perPx;
  float polished = clamp(inside + 0.5, 0.0, 1.0);
  float rough = 1.0 - polished;
  // The step down to the block: a lit lip a pixel wide. It was tilted 0.6 at every size, which on small and thin
  // objects (where the line crosses them in a few px) drew a dark band across them; now gentle, and only where the
  // object is large enough for a step to read.
  float lip = exp(-abs(inside - 0.5) / 1.2) * smoothstep(45.0, 140.0, s.radius);
  nS = normalize(nS + vec3(-carveSlope / perPx * lip * 0.3, 0.0));
  float pocked = 0.0;
  if (rough > 0.0) {
    // The tooth chisel's grooves in patches and the point's pocks (as before).
    vec2 cell = floor(s.q * 1.8 + 1.5 * patchy);
    float angle = 3.1415927 * hash(vec3(cell, s.seed * 17.0 + 3.0));
    vec2 along = vec2(cos(angle), sin(angle));
    vec2 across = vec2(-along.y, along.x);
    float count = clamp(s.radius / 7.0, 5.0, 32.0);
    float grooveDetail = smoothstep(3.0, 6.0, s.radius / count);
    float u = dot(s.q, along) * count;
    float v = dot(s.q, across) * count + 0.6 * noise(vec3(u * 0.18, cell * 1.3 + s.seed * 7.0));
    float stroke = smoothstep(0.4, 0.75, noise(vec3(u * 0.22, v * 0.5, s.seed * 9.0 + cell.x * 3.1 + cell.y * 1.7)));
    float wall = sin(6.2831853 * v) * 0.22 * stroke * grooveDetail;
    vec2 tilt = across * wall;
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
    nS = normalize(nS + vec3(s.qTurn * ((tilt + pockTilt * pockDetail) * stoneChisel * rough), 0.0));
  }

  // Colour: Carrara white; the skin warmed a little, the block whiter and cooler.
  vec3 albedo = s.albedo * mix(vec3(0.97, 0.98, 1.0), mix(vec3(1.0), ivory, 0.45), polished);
  albedo = mix(albedo, min(albedo * 1.06 + 0.04, vec3(1.0)), rough);
  // Carrara's veins: long runs across the stone, bent by a warp, with fainter branches; blue-grey; softer in
  // the bruised block. And a faint cloudiness under them.
  // Veins at the stone's scale, not the object's: a small object carries a sliver of one, not a net of cracks.
  vec2 vq = s.q * clamp(s.radius / 140.0, 0.35, 2.2) + vec2(s.seed * 7.3, s.seed * 3.1);
  vec2 bend = vec2(fbm2(vec3(vq * 1.3, s.seed * 2.0)), fbm2(vec3(vq * 1.3 + 5.2, s.seed * 2.0 + 1.7))) - 0.375;
  vec2 veinFlow = vec2(cos(side + 1.1), sin(side + 1.1));
  float veinAt = dot(vq + 1.6 * bend, veinFlow);
  float run = abs(fract(veinAt * 1.3) - 0.5);
  float twig = abs(fract(dot(vq + 2.4 * bend, vec2(-veinFlow.y, veinFlow.x) * 0.5 + veinFlow) * 3.1) - 0.5);
  float fade = noise(vec3(vq * 2.2, s.seed * 4.0 + 4.0));
  float vein = (1.0 - smoothstep(0.004, 0.045, run)) * smoothstep(0.2, 0.6, fade)
    + 0.5 * (1.0 - smoothstep(0.002, 0.03, twig)) * smoothstep(0.55, 0.8, fade);
  vein = min(vein, 1.0) * stoneVein * mix(0.5, 1.0, polished);
  albedo *= 1.0 - 0.3 * vein * vec3(1.0, 0.94, 0.84);
  albedo *= 1.0 + (0.5 * stoneVein + stoneAge) * patchy * vec3(0.12, 0.12, 0.1);

  vec3 n = s.turn * toWorld(nS);
  float skin = polished;
  vec3 toKey = normalize(keyAt - s.o);
  float ndl = dot(n, toKey);
  // Light entering: the terminator wrapped far into the shade on the skin, a little on the block.
  float wrap = mix(0.12, 0.7, stoneScatter) * mix(0.45, 1.0, skin);
  float wrapped = max((ndl + wrap) / (1.0 + wrap), 0.0);
  float lambert = max(ndl, 0.0);
  float diffuse = mix(lambert, wrapped, 0.55 * skin);
  // Hollows: light reaches into them through the stone; only real undercuts darken, and never past a half-tone.
  float undercut = mix(1.0, s.occlusion, smoothstep(0.02, 0.2, s.relief));
  float open = max(mix(1.0, undercut, stoneOcclusion * 0.75), 0.45) * (1.0 - 0.15 * pocked);
  vec3 keyLight = lightColour * vec3(1.0, 0.97, 0.92) * keyStrength * mix(1.35, 1.05, keySize);
  vec3 sky = vec3(0.99, 0.98, 0.97) * (0.47 + 0.3 * shadowLift) * (0.55 + 0.45 * n.z);
  if (photoStrength > 0.0) sky += 0.2 * photoStrength * photoAt(n, 7.0);
  sky += background * (0.16 + 0.3 * groundLight) * clamp(0.35 - n.z, 0.0, 1.0);
  sky *= lightColour;
  vec3 warm = vec3(1.0, 0.87, 0.74);
  vec3 body = albedo * (keyLight * mix(0.85, 0.8, skin) * diffuse * mix(0.7, 1.0, open) + sky * open);
  // What came back from inside: warm in the shade past the terminator, in the hollows, and as a glow at the rims.
  float under = wrapped - lambert;
  body += albedo * warm * keyLight * stoneScatter * (0.75 * under * mix(0.5, 1.0, skin) + 0.25 * (1.0 - open));
  float rim = pow(1.0 - s.facing, 2.5) * (0.4 + 0.6 * clamp(0.5 - 0.5 * ndl, 0.0, 1.0));
  body += albedo * vec3(1.0, 0.86, 0.72) * keyStrength * 0.4 * stoneScatter * rim * mix(0.5, 1.0, skin);
  body += albedo * vec3(1.0, 0.9, 0.8) * keyStrength * 0.05 * stoneScatter;
  // The block: matte, a little brighter, its fine tooth; a few crystals catching the key.
  body *= (1.0 + 0.1 * rough) * (1.0 + mix(0.02, 0.1, rough) * (noise(s.grainAt * 0.9) - 0.5));
  float crystal = step(0.985, hash(floor(s.grainAt * 0.9))) * smoothstep(0.2, 0.8, ndl);
  body += keyLight * 0.35 * crystal * rough * open;

  // The polished skin's satin: a broad soft lobe and a smaller, brighter one, and the room faintly at grazing.
  vec3 spec = vec3(0.0);
  if (skin > 0.0) {
    vec3 toEye = toWorld(vec3(0.0, 0.0, 1.0));
    float nh = max(dot(n, normalize(toKey + toEye)), 0.0);
    float lobe = 0.18 * pow(nh, 10.0) + 0.7 * pow(nh, 48.0);
    float fresnel = pow(1.0 - s.facing, 5.0);
    Surface m = s;
    m.nS = nS;
    spec = (keyLight * lobe + mirrorOf(m, 0.4) * (0.025 + 0.35 * fresnel)) * stonePolish * skin * mix(0.6, 1.0, open);
  }
  return filmic((body + spec) * exposure);
}

vec3 stoneOf(Surface s) {
  if (stoneMarble >= 0.5) return marbleOf(s);
  vec3 nS = s.nS;
  // Broad tonal patches, fixed on it (one fbm, reused for the seam).
  float patchy = fbm2(vec3(s.q * 1.7, s.seed * 11.0)) - 0.375;
  vec3 ivory = mix(vec3(1.0), vec3(1.0, 0.955, 0.875), stoneWarmth);
  vec3 albedo = s.albedo * ivory;
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
  // Tonal blotches, broad and slight; darker ones yellower.
  albedo *= 1.0 + stoneAge * patchy * vec3(0.2, 0.24, 0.32);
  vec3 n = s.turn * toWorld(nS);

  // Light: the key (a high window) and a skylight from above, the white room bouncing into the shade.
  vec3 toKey = normalize(keyAt - s.o);
  float ndl = dot(n, toKey);
  // A clean terminator, the light planes flat and bright.
  float lambert = clamp(ndl * 1.2 + 0.04, 0.0, 1.0);
  float wrap = 0.1 * stoneScatter * 2.0;
  float wrapped = max((ndl + wrap) / (1.0 + wrap), 0.0);
  // Near the outline the height field's falloff reads as a hollow; only real undercuts are.
  float open = max(mix(1.0, undercut, stoneOcclusion), 0.3);
  vec3 keyLight = lightColour * vec3(1.0, 0.97, 0.92) * keyStrength * mix(1.35, 1.05, keySize);
  vec3 sky = vec3(0.99, 0.98, 0.97) * (0.47 + 0.3 * shadowLift) * (0.55 + 0.45 * n.z);
  if (photoStrength > 0.0) sky += 0.2 * photoStrength * photoAt(n, 7.0);
  sky += background * (0.16 + 0.3 * groundLight) * clamp(0.35 - n.z, 0.0, 1.0);
  sky *= lightColour;
  vec3 body = albedo * (keyLight * lambert * mix(0.55, 1.0, open) + sky * open);
  // Light that entered comes back warmer past the terminator: a faint softening; a faint glow at the rims.
  body += albedo * vec3(1.0, 0.78, 0.6) * keyLight * (wrapped - max(ndl, 0.0)) * 0.25 * mix(0.5, 1.0, open);
  float thin = pow(1.0 - s.facing, 2.0) * (0.35 + 0.65 * clamp(0.5 - 0.5 * ndl, 0.0, 1.0));
  body += albedo * vec3(1.0, 0.8, 0.62) * keyStrength * 0.05 * stoneScatter * thin * open;
  // The gypsum's fine tooth.
  body *= 1.0 + 0.03 * (noise(s.grainAt * 0.9) - 0.5);
  return filmic(body * 1.08 * exposure);
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
    { id: "rodin", label: "대리석 (로댕)", look: { coating: [0.96, 0.95, 0.93], coatingMix: 0, stoneMarble: 1, stoneWarmth: 0.5, stoneScatter: 0.75, stoneAge: 0.2, stoneVein: 0.55, stonePolish: 0.7, keyStrength: 1.25, keySize: 0.5, shadowLift: 0.15 } },
  ],
};
