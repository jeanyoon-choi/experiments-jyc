// 유리 (bubble/8, user 2026-11-03: "유리도 하나 추가해라"; the stub "전혀 유리 같아 보이지 않음"): solid glass
// objects on bubble/7's white studio ground, as glass is photographed on white.
//
// References looked at (2026-11-03), across makers and kinds of photograph:
// - product shots on white: a clear optical cube (https://www.magnific.com — "Clear glass object photos", via image
//   search), a crystal ball on a white sweep (https://www.dreamstime.com — "transparent glass object"), Iittala's
//   Toikka birds, clear and cobalt (https://www.iittala.com/, https://www.thescandinavianshop.com/), a cut-crystal
//   polar-bear block (Instagram, "POLAR BEAR FAMILY CRYSTAL");
// - studio cast glass: Vladimíra Klumpar's amber cast, sandblasted and polished sculpture on a white sweep
//   (https://www.galeriekuzebauch.com/en/vystavy/vladimira-klumpar-vibrace), Ramon Orlina's cut teal, cobalt and
//   pink cast glass (https://www.salcedoauctions.com/, https://www.drybrushgallery.com/), Roni Horn's cast glass
//   with matte sides and a glossy top (https://www.hauserwirth.com/hauser-wirth-exhibitions/2883-roni-horn/,
//   https://urbanglass.org/), Anna Orlina's laminated optical glass, its dispersion (Facebook, "Inner Sanctum");
// - optical glass in museum/dark-field photography: Christopher Ries's cut Schott optical glass
//   (https://westernartandarchitecture.com/articles/spotlighting-the-works-of-christopher-ries,
//   https://www.ragoarts.com/), the Corning Museum's glass collection (https://glasscollection.cmog.org/);
// - how the white-ground photographs are lit: bright field with black flags for the edges
//   (https://www.photigy.com/school/how-to-photograph-glass-on-a-white-background-out-from-a-camera/,
//   https://sekonic.com/classroom/whiteline-and-blackline-lighting/).
//
// Common to all of them (implemented, in order):
// 1. The body is what lies behind it, bent: on white it is nearly the ground's own white (cube, ball, birds), not a
//    lit surface; there is no diffuse shading at all.
// 2. Crisp dark and white bands, not soft gradients: where refraction or a reflection inside sends the ray to the
//    dark round the set (flags, camera side, ceiling) the glass goes dark in a band with a hard edge; where it goes
//    on to the white sweep it stays white. The outline is a thin dark line on the flagged sides.
// 3. Total internal reflection: steep inner faces act as mirrors (the cube's base, Orlina's cut planes), so bands
//    repeat and invert inside the body.
// 4. Colour by thickness: thin edges near colourless, thick middles saturated and darker (Orlina, Klumpar, Horn);
//    clear soda-lime greys a little green-blue only where thick.
// 5. Small, hard highlights and bright rim lines from the key; reflection is weak face-on (4%), strong at a graze.
// 6. (Not drawn: the pale floor shadow with light gathered in it — it read as soft grey shading on the body.)
// Frosted glass (Horn's sides, Klumpar's sandblasted amber, the crystal block, sandblasted panels) glows: bright,
// a little cool, milkier where thick, the thin edges still showing the glass, a crisp polished outline.
// What varies (parameters and 연출): clear or coloured (teal, cobalt, amber, pink — the coat), polished or
// sandblasted (Horn's sides, Klumpar, the crystal block → 프로스티드), how strong the dispersion fringes are (Anna
// Orlina's laminated glass strongest, plain cast glass faint), lens-like or block-like (glassBase).
//
// The model: refract in at the shaded point, cross a local sphere (flattened towards the base it stands on) to its
// far side, reflect totally inside while the exit is shut, refract out per colour channel, and look along that ray
// at the set: the white floor and sweep behind (their value taken from the displayed ground, so a clear body sits at
// the ground's own white), or the dark studio round the camera with the key softbox in it.

import type { MaterialEntry } from "./surface";

const defaults = {
  glassIor: 1.5,
  glassDispersion: 0.2,
  glassAbsorb: 0.5,
  glassColour: 0,
  glassFrost: 0,
  glassFlags: 0.9,
  glassBase: 0.15,
};

export const GLASS_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 5,
  family: "glass",
  familyLabel: "유리",
  colourLabel: "유리",
  glsl: /* glsl */ `
uniform float glassIor;
uniform float glassDispersion;
uniform float glassAbsorb;
uniform float glassColour;
uniform float glassFrost;
uniform float glassFlags;
uniform float glassBase;

// The linear light that filmic() shows as y (ACES fit inverted), so the ground seen through glass keeps its white.
vec3 glassUnfilm(vec3 y) {
  y = clamp(y, 0.0, 0.985);
  vec3 a = 2.43 * y - 2.51;
  vec3 b = 0.59 * y - 0.03;
  vec3 c = 0.14 * y;
  return (-b - sqrt(b * b - 4.0 * a * c)) / (2.0 * a);
}

// What a ray leaving the glass along screen direction e sees (rgb: the dark studio and the key; a: how much of it
// is the white set instead). Glass on white is photographed in a white sweep with black cards close on either side
// and a dark studio round the camera: rays the glass sends on to the paper under it or the backdrop behind it find
// white; rays it bends sideways or back towards the camera find black. The changes are hard edges in direction
// (a card's edge), so they draw crisp bands and rims, never a soft grey. The dark is flat, not a photographed
// room: a room's detail in the dark parts is what makes a surface read as chrome.
vec4 glassSeen(vec3 o, mat3 turn, vec3 e, float blur) {
  vec3 w = turn * toWorld(e);
  vec3 toKey = normalize(keyAt - o);
  float size = mix(0.12, 0.7, keySize);
  vec3 key = lightColour * keyStrength * 8.0 * softbox(w, toKey, size * (1.0 + 0.5 * blur), 0.45 + 0.8 * keySize + 1.5 * blur);
  vec3 studio = (1.0 - glassFlags) * envAt(o, w, max(blur, 0.5)) + glassFlags * lightColour * 0.09;
  vec3 camera = toWorld(vec3(0.0, 0.0, 1.0));
  vec2 behindIt = -camera.xy / max(length(camera.xy), 1e-3);
  float edge = 0.01 + 0.6 * blur;
  float facingBack = dot(w.xy / max(length(w.xy), 1e-3), behindIt);
  float straightOn = smoothstep(0.65 - edge, 0.65 + edge, facingBack);
  // Seen from straight above there is no "behind": only the paper round it, the cards at a graze.
  straightOn = mix(0.0, straightOn, smoothstep(0.05, 0.3, length(camera.xy)));
  float backdrop = straightOn * (1.0 - smoothstep(0.4 - edge, 0.4 + edge, w.z));
  float cards = mix(0.2, 0.6, glassFlags);
  float paper = max(smoothstep(cards - edge, cards + edge, -w.z), straightOn);
  float white = mix(backdrop, paper, smoothstep(edge, -edge, w.z));
  return vec4(studio + key, white);
}

float glassFresnel(float f0, float c) {
  return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0);
}

vec3 glassOf(Surface s) {
  float ior = glassIor;
  float frost = glassFrost;
  vec3 n = s.nS;
  vec3 v = vec3(0.0, 0.0, -1.0);
  float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  float fIn = glassFresnel(f0, n.z);
  float blur = 0.45 * frost;
  vec3 coolWhite = s.behind * mix(vec3(1.0), vec3(0.975, 0.988, 1.0), frost);

  // In through the front, across to the far side: the local sphere's far point, flattened towards the base.
  vec3 dir = refract(v, n, 1.0 / ior);
  vec3 base = -worldUp;
  float chord = max(-2.0 * dot(n, dir), 0.0);
  vec3 exitN = normalize(mix(normalize(n + dir * chord), base, glassBase));
  float travelled = mix(chord, (0.3 + s.relief) * 1.6 / max(dot(dir, base), 0.3), glassBase);
  // Reflected totally inside while the way out is shut (up to twice), each time across the solid again.
  for (int k = 0; k < 2; k += 1) {
    vec3 out3 = refract(dir, -exitN, ior);
    if (dot(out3, out3) > 0.0) break;
    dir = reflect(dir, exitN);
    vec3 p = exitN;
    float c = max(-2.0 * dot(p, dir), 0.25);
    travelled += c;
    exitN = normalize(p + dir * c);
  }

  // Out, a little apart per colour (dispersion). Still shut: mirrored once more, out square through another face.
  float spread = glassDispersion * 0.03;
  vec3 eR = refract(dir, -exitN, ior - spread);
  vec3 eG = refract(dir, -exitN, ior);
  vec3 eB = refract(dir, -exitN, ior + spread);
  vec3 kept = vec3(dot(eR, eR) > 0.0 ? 1.0 : 0.0, dot(eG, eG) > 0.0 ? 1.0 : 0.0, dot(eB, eB) > 0.0 ? 1.0 : 0.0);
  vec3 inward = reflect(dir, exitN);
  travelled += 1.0 - kept.g;
  eR = kept.r > 0.5 ? eR : inward;
  eG = kept.g > 0.5 ? eG : inward;
  eB = kept.b > 0.5 ? eB : inward;
  vec4 sG = glassSeen(s.o, s.turn, eG, blur);
  vec4 sR = sG;
  vec4 sB = sG;
  if (spread > 0.0005) {
    sR = glassSeen(s.o, s.turn, eR, blur);
    sB = glassSeen(s.o, s.turn, eB, blur);
  }
  vec3 dark = vec3(sR.r, sG.g, sB.b);
  vec3 white = vec3(sR.a, sG.a, sB.a);
  // The wall at the outline: a solid's side, seen through its own thickness, bends every ray out to the cards, so
  // the outline is a crisp near-black band, wider on bigger, thicker pieces (the black line of bright-field shots).
  // Its width follows the wall: wide where the side rises steeply, thinning to nothing where the piece tapers.
  float steep = clamp(1.0 - n.z, 0.0, 1.0);
  float rimWidth = glassFlags * (0.5 + 0.08 * s.radius) * steep * steep * 1.6;
  float wall = smoothstep(rimWidth - 0.6, rimWidth + 0.6, s.edge);
  // Light running inside the wall shows as a thin bright line along its inner edge.
  white = max(white * wall, vec3(0.8 * exp(-pow((s.edge - rimWidth * 0.75) / 0.7, 2.0)) * step(1.5, rimWidth)));
  vec3 fOut = vec3(glassFresnel(f0, -dot(eR, -exitN)), glassFresnel(f0, -dot(eG, -exitN)), glassFresnel(f0, -dot(eB, -exitN)));
  fOut = mix(vec3(f0), fOut, kept);
  vec3 through = (1.0 - fIn) * (1.0 - fOut);

  // Beer–Lambert: clear glass greens a little where thick; coloured glass takes the coat (or a logo's brand).
  vec3 clearSigma = vec3(0.025, 0.007, 0.014);
  vec3 tintSigma = -log(clamp(s.albedo, vec3(0.03), vec3(1.0))) * 1.2;
  vec3 sigma = mix(clearSigma, tintSigma, max(glassColour, s.dyed)) * glassAbsorb;
  float depth = travelled * clamp(sqrt(max(s.radius, 4.0) / 60.0), 0.5, 1.4);
  vec3 absorbed = exp(-sigma * depth);

  // The white set seen through: the displayed ground, filtered (bright field: the surfaces' loss shows only half).
  vec3 seenWhite = glassUnfilm(coolWhite * absorbed * mix(vec3(1.0), through, 0.5)) / (1.25 * exposure);
  vec3 colour = mix(dark * absorbed * through, seenWhite, white);
  // The front: 4% face-on, a small hard key, and at the grazing rim the black cards or the white set mirrored.
  vec4 front = glassSeen(s.o, s.turn, reflect(v, n), blur * 1.5);
  vec3 sweep = glassUnfilm(s.behind * 0.96) / (1.25 * exposure);
  colour += mix(front.rgb, sweep, front.a * wall) * fIn;

  // Frosted (sandblasted): light scatters in the skin and through the body, so it glows: bright, a little cool,
  // milkier where thick, while the thin edges still show the (blurred) glass behind. The outline stays a crisp
  // polished line.
  if (frost > 0.0) {
    // Thin parts pass the scattered light nearly whole (bright, luminous); thick parts hold it in a softly
    // darker, cooler, milkier core; the key side of the form a little brighter: volume, not a flat disc.
    float thick = max(smoothstep(0.0, 0.8, s.relief) * smoothstep(0.1, 1.2, depth), 0.7 * smoothstep(0.4, 2.4, depth));
    vec3 core = coolWhite * mix(vec3(0.995), vec3(0.74, 0.775, 0.815), thick) * mix(vec3(1.0), absorbed, 0.5);
    float lit = 0.5 + 0.5 * dot(s.n, normalize(keyAt - s.o));
    core *= mix(0.8, 1.03, lit * lit);
    // Where the side turns away the light scatters out through little glass: the rim glows.
    float glow = max((1.0 - n.z) * (1.0 - n.z), 0.75 * (1.0 - smoothstep(0.0, 2.0 + 0.12 * s.radius, s.edge)));
    core = mix(core, coolWhite, 0.85 * glow);
    vec3 milk = glassUnfilm(core) / (1.25 * exposure);
    colour = mix(colour, milk, frost * mix(0.8, 1.0, thick));
    float line = 1.0 - smoothstep(0.5, 1.6, s.edge);
    colour = mix(colour, mix(dark * absorbed, seenWhite, 0.25), frost * line * 0.55);
  }
  return filmic(colour * 1.25 * exposure);
}
`,
  call: "glassOf",
  defaults,
  controls: [
    { key: "glassIor", label: "굴절률", min: 1.3, max: 2, step: 0.01 },
    { key: "glassDispersion", label: "분산 (가장자리 무지개)", min: 0, max: 1.5, step: 0.01 },
    { key: "glassAbsorb", label: "두께 색 (흡수)", min: 0, max: 2, step: 0.01 },
    { key: "glassColour", label: "색 (0 맑은 유리 · 1 코팅 색)", min: 0, max: 1, step: 0.01 },
    { key: "glassFrost", label: "샌딩 (프로스티드)", min: 0, max: 1, step: 0.01 },
    { key: "glassFlags", label: "검은 반사판 (윤곽 · 가장자리 어둠)", min: 0, max: 1, step: 0.01 },
    { key: "glassBase", label: "바닥 (0 구슬 · 1 평평한 받침)", min: 0, max: 1, step: 0.01 },
  ],
  looks: [
    { id: "glass", label: "유리", look: {} },
    { id: "glass-tinted", label: "색 유리", look: { glassColour: 1, glassAbsorb: 0.4, coating: [0.36, 0.74, 0.7], coatingMix: 0 } },
    { id: "glass-frosted", label: "프로스티드 유리", look: { glassFrost: 0.75 } },
  ],
};
