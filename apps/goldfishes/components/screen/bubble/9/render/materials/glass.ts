// 유리 (bubble/8, user 2026-11-03: "유리도 하나 추가해라"; the stub "전혀 유리 같아 보이지 않음"): solid glass
// objects on bubble/7's white studio ground, as glass is photographed on white.
// bubble/9 (user, 2026-11-05: "유리 전혀 유리같지가 않음. 제대로 유리같게끔 재스타일링"; "색 지정이 안됨 … 색 좀 제대로
// 넣을 수 있도록"): bubble/8's glass read as white plastic or grey silicone (a dead-white middle at the ground's own
// white, a wide flat black outline, no colour unless 색 유리 was chosen). Restyled; the coat (the 유리 색 chips and
// picker, 섞음 per object, a logo's brand) is now the glass's own colour in every look.
//
// References looked at, across makers and kinds of photograph:
// - product shots on white: Iittala's Birds by Toikka, clear and coloured, on white sweeps
//   (https://www.finnishdesignshop.com/en-at/product/birds-by-toikka-mari,
//   https://www.greenergrassdesign.com/iittala-bbt-flycatcher-80x80mm-3x3-clear-white/,
//   https://www.touchoffinland.com/products/iittala-toikka-blue-bird), and Venini/Murano sommerso vases, the colour
//   deepest where the walls are thickest (https://glasscollection.cmog.org/objects/37001/sommerso-submerged-vase,
//   https://www.1stdibs.com/buy/venini-sommerso);
// - cast glass sculpture: Vladimíra Klumpar's cut, polished and sandblasted casts
//   (https://www.galeriekuzebauch.com/en_US/vladimira-klumpar-vibrace/, https://www.glassart.de/glass-sculptures/red-stem/),
//   Roni Horn's solid casts, fire-polished tops and frosted mould-marked sides
//   (https://www.hauserwirth.com/hauser-wirth-exhibitions/2883-roni-horn/,
//   https://nashersculpturecenter.org/art/exhibitions/object/id/3118-467), Ramon Orlina's cut cullet glass
//   (https://salcedoauctions.com/stories/towering-vision-ramon-orlinas-tower-club-sculptures,
//   https://galerieraphael.com.ph/exhibit/19/apex);
// - optical glass in museum photography: Christopher Ries's cut Schott optical glass
//   (https://westernartandarchitecture.com/articles/spotlighting-the-works-of-christopher-ries), the Corning Museum's
//   own photographers on lighting transparent glass (https://oldblog.cmog.org/?p=20488);
// - how glass is lit: bright field with black cards for the edges, dark field for the rims
//   (https://www.prophotostudio.net/blog/learning-center/why-photographing-glass-is-so-hard/,
//   https://www.diyphotography.net/?p=819, https://medium.com/@dtravisphoto/lighting-glass-d9ddf81eeb8f).
//
// What makes them read as glass, and how each is drawn here:
// 1. The body is the set behind it, bent and turned over: there is no diffuse shading at all. Rays through it are
//    refracted in, across the solid (a local sphere, flattened by glassBase), reflected inside while the way out is
//    shut, and out again, and look at the set: the white sweep (brightest on the floor round the piece, falling off
//    up the backdrop and towards the cards — so the bent image has a gradient, upside down), the black cards either
//    side, the dark studio round the camera with the softbox in it.
// 2. Clear in the middle, mirror at the graze (Fresnel, 4% face-on): the softbox a small hard highlight, the cards
//    and sweep mirrored round the rims.
// 3. Dark refracted bands with hard edges where rays leave for the cards or the studio, repeated inwards where the
//    sides reflect totally; a dark wall at the outline on steep sides, a thin bright line of light run inside it.
// 4. The softbox seen through the thick part (rays from the lower body turned up to it): a bright, coloured core.
// 5. Colour by thickness (Beer–Lambert): the coat is the colour the glass passes, thin edges near colourless, the
//    thick middle saturated and deeper, the side walls (seen along their length) deepest; clear glass greens and
//    blues a little where thick. Only light through the glass is coloured; reflections stay white.
// 6. Dispersion: the three colours leave at a little different angles, faint fringes along the bands.
// Frosted (Horn's sides, Klumpar's sandblasted faces): the light behind diffuses through the body, so it glows,
// its colour deepening where thick, lit from the key side, the rim bright; the outline stays a crisp polished line.
// Not drawn (no pass shows them to the material): the neighbouring objects bent through the body, the floor
// caustic.

import type { MaterialEntry } from "./surface";

const defaults = {
  glassIor: 1.5,
  glassDispersion: 0.25,
  glassAbsorb: 0.35,
  glassColour: 1,
  glassFrost: 0,
  glassFlags: 0.85,
  glassBase: 0.15,
};

// Clear soda-lime: a faint green-blue, seen only through thick parts.
const CLEAR: readonly [number, number, number] = [0.98, 0.996, 0.992];

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

// The set along screen direction e (linear light, before exposure), the white sweep as bright as whiteLin, the dark
// studio as bright as dark. Glass on
// white is photographed in a white sweep with black cards close on either side and a dark studio round the camera:
// rays sent on to the paper under it or the backdrop behind it find white; rays bent sideways or back towards the
// camera find black. The changes are hard edges in direction (a card's edge), so they draw crisp bands. The sweep
// is lit from above the camera: brightest on the floor round the piece, greyer up the backdrop and towards the
// cards, so what is seen through the glass has a gradient, turned over. The softbox hangs in the dark.
vec3 glassSet(vec3 o, mat3 turn, vec3 e, float blur, vec3 whiteLin, float dark) {
  vec3 w = turn * toWorld(e);
  vec3 toKey = normalize(keyAt - o);
  float size = mix(0.12, 0.7, keySize);
  vec3 key = lightColour * keyStrength * 8.0 * softbox(w, toKey, size * (1.0 + 0.6 * blur), 0.35 + 0.8 * keySize + 1.6 * blur);
  vec3 studio = dark * ((1.0 - glassFlags) * envAt(o, w, max(blur, 0.5)) + glassFlags * lightColour);
  vec3 camera = toWorld(vec3(0.0, 0.0, 1.0));
  vec2 behindIt = -camera.xy / max(length(camera.xy), 1e-3);
  float edge = 0.01 + 0.6 * blur;
  vec2 flat2 = w.xy / max(length(w.xy), 1e-3);
  float facingBack = dot(flat2, behindIt);
  float straightOn = smoothstep(0.5 - edge, 0.5 + edge, facingBack);
  // Seen from straight above there is no "behind": only the paper round it, the cards at a graze.
  straightOn = mix(0.0, straightOn, smoothstep(0.05, 0.3, length(camera.xy)));
  float backdrop = straightOn * (1.0 - smoothstep(0.5 - edge, 0.5 + edge, w.z));
  float cards = mix(0.1, 0.42, glassFlags);
  float paper = max(smoothstep(cards - edge, cards + edge, -w.z), straightOn);
  float white = mix(backdrop, paper, smoothstep(edge, -edge, w.z));
  float side = abs(flat2.x * behindIt.y - flat2.y * behindIt.x) * sqrt(max(1.0 - w.z * w.z, 0.0));
  float light = mix(1.0, 0.62, smoothstep(0.0, 0.42, w.z)) * mix(1.0, 0.8, smoothstep(0.35, 0.8, side));
  // Straight down, the paper under the piece is in its own (light) shade.
  light *= 1.0 - 0.1 * smoothstep(0.75, 1.0, -w.z);
  // The sweep is lit hardest straight behind the piece (a graded backdrop): the further a ray is bent from the line
  // of sight, the greyer the white it finds, so every curve of the body draws.
  light *= mix(0.5, 1.0, smoothstep(0.55, 0.995, dot(w, -camera)));
  // Two tall strip lights just inside the cards, either side: on the glass they draw the thin bright lines along
  // every edge that turns (reflected at the rims, refracted inside the dark bands), as glass is lit to show its form.
  float strip = smoothstep(0.86 - edge, 0.9 + edge, side) * (1.0 - smoothstep(0.96, 0.985 + edge, side));
  strip *= smoothstep(-0.25 - edge, -0.15, w.z) * (1.0 - smoothstep(0.55, 0.65 + edge, w.z)) * step(-0.45, facingBack);
  return mix(studio, whiteLin * light, white) + key + lightColour * 2.2 * strip * (1.0 - white);
}

// A transmittance as the print shows it: the white seen through takes the colour as it would on the print, not as
// light the film curve then rolls back to white (in linear light, white through blue glass came out pale cyan).
vec3 glassShown(vec3 a) {
  return glassUnfilm(a * 0.97) / glassUnfilm(vec3(0.97));
}

float glassFresnel(float f0, float c) {
  return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0);
}

vec3 glassOf(Surface s) {
  float ior = glassIor;
  float frost = glassFrost;
  vec3 n = s.nS;
  // Seen through a lens a little longer than the page is wide: the line of sight leans out towards the frame's
  // edges, so flat faces show a gradient of the set and catch the softbox in one place, not everywhere at once.
  vec3 v = normalize(vec3(screenOf(s.o).xy / length(frame) * 1.1, -1.0));
  float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  float fIn = glassFresnel(f0, -dot(n, v));
  float blur = 0.5 * frost;
  vec3 whiteLin = glassUnfilm(s.behind * 0.95) / (1.25 * exposure);

  // In through the front, across to the far side: the local sphere's far point, flattened towards the base.
  vec3 dir = refract(v, n, 1.0 / ior);
  vec3 base = -worldUp;
  float chord = max(-2.0 * dot(n, dir), 0.0);
  // The far side mirrors the near one (a lens: a solid shows its back as well as its front), bending the ray twice.
  vec3 lens = normalize(vec3(n.xy, -n.z));
  vec3 exitN = normalize(mix(mix(normalize(n + dir * chord), lens, 0.3), base, glassBase));
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
  vec3 seen = glassSet(s.o, s.turn, eG, blur, whiteLin, 0.12);
  if (spread > 0.0005) {
    seen.r = glassSet(s.o, s.turn, eR, blur, whiteLin, 0.12).r;
    seen.b = glassSet(s.o, s.turn, eB, blur, whiteLin, 0.12).b;
  }
  vec3 fOut = vec3(glassFresnel(f0, -dot(eR, -exitN)), glassFresnel(f0, -dot(eG, -exitN)), glassFresnel(f0, -dot(eB, -exitN)));
  fOut = mix(vec3(f0), fOut, kept);
  vec3 through = (1.0 - fIn) * (1.0 - fOut);

  // Colour by thickness (Beer–Lambert, as a power of the colour passed): the coat (or a logo's brand) is what the
  // glass lets through; 0 on glassColour is clear soda-lime. Thin edges pass nearly all, the thick middle the colour
  // itself and deeper; a little green-blue in any glass that is thick.
  vec3 tint = clamp(mix(vec3(${CLEAR.join(", ")}), s.albedo, max(glassColour, s.dyed)), vec3(0.015), vec3(1.0));
  // How far through it the light ran: the path across, scaled by its size, and by its own height (a relief's thin
  // margins pass more of it, its thick middle holds the colour) and, where its side turns away, along the side.
  float depth = travelled * clamp(sqrt(max(s.radius, 4.0) / 60.0), 0.55, 1.4) * (mix(0.45, 1.25, clamp(s.relief, 0.0, 1.0)) + 0.9 * (1.0 - n.z) * (1.0 - n.z));
  // Light piped along the body towards its outline: a slab's colour deepens towards its edges.
  depth += 0.6 * exp(-s.edge / (0.12 * s.radius + 2.0));
  float thick = smoothstep(0.3, 2.4, depth);
  // The coat is the colour at its thickest (eased, so a long path inside deepens it without going opaque).
  float held = 2.6 * depth / (depth + 2.0);
  vec3 absorbed = pow(tint, vec3(glassAbsorb * held)) * exp(-vec3(0.006, 0.0015, 0.003) * depth);
  absorbed = glassShown(absorbed);
  // The softbox and the sweep's light gather in the thick body (a lens), so its colour glows rather than greys.
  vec3 colour = seen * absorbed * through * (1.0 + 0.3 * thick * (1.0 - frost));
  // The paper seen through it lies in its own light: the coloured shade it casts round its margins, the light it
  // focuses gathered in the middle — so even a flat slab glows from its centre and darkens towards its edges.
  colour *= mix(0.72, 1.06, smoothstep(0.0, 0.3 * s.radius + 4.0, s.edge));
  // The caustic: the key, focused by the round body, lights a crescent inside the side away from it.
  float away = dot(n.xy, -normalize(keyScreen.xy + vec2(1e-4, 0.0)));
  float caustic = smoothstep(0.2, 0.65, away) * (1.0 - smoothstep(0.7, 0.93, length(n.xy))) * smoothstep(0.1, 0.6, depth);
  colour += whiteLin * 0.3 * keyStrength * caustic * sqrt(absorbed) * (1.0 - 0.6 * frost);

  // The wall at the outline: a solid's side, seen along its length, bends every ray out to the cards — a crisp dark
  // band in the glass's deepest colour, wider on bigger pieces and where the side rises steeply, thinning to nothing
  // where the piece tapers; light run inside the wall shows as a thin bright line along its inner edge.
  float steep = clamp(1.0 - n.z, 0.0, 1.0);
  float rimWidth = glassFlags * (0.4 + 0.012 * s.radius) * steep * steep * 1.6;
  float wall = smoothstep(rimWidth - 0.6, rimWidth + 0.6, s.edge);
  vec3 wallColour = whiteLin * 0.03 * pow(tint, vec3(glassAbsorb * 2.2));
  colour = mix(wallColour, colour, wall);
  float line = exp(-pow((s.edge - rimWidth * 0.78) / 0.7, 2.0)) * step(1.5, rimWidth);
  colour += whiteLin * 0.25 * line * sqrt(pow(tint, vec3(glassAbsorb)));
  float ghostAt = glassFlags * (0.3 + 0.025 * s.radius) * 1.6 * 2.1;
  // Inside it, the margin: rays there leave through the side walls, so a band as wide as the piece is thick runs
  // round it, deeper in colour and darker, its inner edge crisp (a cast tile's edge seen through its face).
  float margin = (1.0 - smoothstep(ghostAt - 0.7, ghostAt + 0.7, s.edge)) * step(2.5, ghostAt) * (1.0 - 0.7 * frost);
  colour = mix(colour, colour * pow(tint, vec3(glassAbsorb * 1.6)) * 0.62, margin);

  // Frosted (sandblasted): the light behind diffuses through the body, so it glows rather than shows the set — its
  // colour deepening where thick, a little brighter towards the key, the thin rim brightest. The bands survive only
  // softly under it.
  if (frost > 0.0) {
    // Light scattered in the thick body glows out of it, richer in colour; where the side turns away, less of it
    // reaches the camera, so the form shades darker and greyer towards its rims (Klumpar's sandblasted faces).
    vec3 soft = glassShown(pow(tint, vec3(glassAbsorb * mix(0.3, 1.5, thick))) * exp(-vec3(0.006, 0.0015, 0.003) * depth));
    float lit = 0.5 + 0.5 * dot(s.n, normalize(keyAt - s.o));
    vec3 glow = whiteLin * soft * mix(0.7, 1.08, thick) * mix(0.82, 1.04, lit * lit);
    glow *= mix(1.0, 0.72, steep * steep * (1.0 - 0.5 * thick));
    // The bands under the skin, blurred, still show through it as shade in the glow: it is glass, not wax. (Mixed as
    // shade, not added: in linear light the glow's white would drown them.)
    float structure = dot(colour, vec3(0.3, 0.5, 0.2)) / max(dot(whiteLin * soft, vec3(0.3, 0.5, 0.2)), 1e-3);
    vec3 frosted = glow * mix(0.3, 1.0, sqrt(clamp(structure, 0.0, 1.2)));
    colour = mix(colour, frosted, frost);
  }


  // The front: 4% face-on, rising to a mirror at the graze — a small hard softbox, the cards and sweep round the rim.
  // Reflections are untinted. Sandblasting blurs them, but the polished outline keeps a crisp bright line.
  vec3 front = glassSet(s.o, s.turn, reflect(v, n), blur * 1.4, whiteLin * 0.04 * wall, 0.03);
  // And the photographed studio itself, faint (never a grey haze at the graze): its windows and stands give the flat faces a life of their own.
  vec3 room = envAt(s.o, s.turn * toWorld(reflect(v, n)), 0.05 + blur);
  colour += (front * fIn + room * f0 * (1.0 - smoothstep(0.05, 0.3, fIn))) * mix(1.0, 0.7, frost);
  // The polished arris: a crisp bright line at the outline, a darker one just inside it.
  float outline = exp(-pow((s.edge - 0.9) / 0.6, 2.0));
  float arris = exp(-pow((s.edge - 2.6) / 0.9, 2.0));
  colour *= 1.0 - 0.3 * frost * arris;
  colour += whiteLin * 0.6 * frost * outline;
  return filmic(colour * 1.25 * exposure);
}
`,
  call: "glassOf",
  defaults,
  controls: [
    { key: "glassIor", label: "굴절률", min: 1.3, max: 2, step: 0.01 },
    { key: "glassDispersion", label: "분산 (가장자리 무지개)", min: 0, max: 1.5, step: 0.01 },
    { key: "glassAbsorb", label: "두께 색 (흡수)", min: 0, max: 2, step: 0.01 },
    { key: "glassColour", label: "색 (0 맑은 유리 · 1 유리 색)", min: 0, max: 1, step: 0.01 },
    { key: "glassFrost", label: "샌딩 (프로스티드)", min: 0, max: 1, step: 0.01 },
    { key: "glassFlags", label: "검은 반사판 (윤곽 · 가장자리 어둠)", min: 0, max: 1, step: 0.01 },
    { key: "glassBase", label: "바닥 (0 구슬 · 1 평평한 받침)", min: 0, max: 1, step: 0.01 },
  ],
  // Each look opens on a colour of its own; the 유리 색 chips and picker (and 섞음) then colour it.
  looks: [
    { id: "glass", label: "유리", look: { coating: CLEAR, coatingMix: 0 } },
    { id: "glass-tinted", label: "색 유리", look: { glassAbsorb: 0.5, coating: [0.2, 0.62, 0.58], coatingMix: 0 } },
    { id: "glass-frosted", label: "프로스티드 유리", look: { glassFrost: 0.75, coating: [0.86, 0.93, 0.95], coatingMix: 0 } },
  ],
};
