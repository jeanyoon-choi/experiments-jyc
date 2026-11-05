// 액체 (bubble/8, user 2026-11-03): the objects and spheres as liquid, not as
// Koons's coated steel (NOTES 1023: his fetish is hardware, solid and
// unchanging; this work's is software, liquid, variable). The liquid is the
// bubbles' own — SCC bubble/1's drained films, Goldfishes bubble/1's pale drops
// on white — varied for this work's white studio, objects seen from above at a
// tilt, ~800 of them, melting into one another.
//
// References, looked at (2026-11-03):
//   - the old routes, frame by frame: SCC bubble/1 (grey films on black, wavy
//     level drainage bands, bright walls, rainbow only at the walls), SCC
//     bubble/3, Goldfishes bubble/1 (pale drops on white, soft grey wavy
//     reflections, a darker crescent inside the rim);
//   - Shinichi Maruyama's Water Sculptures, clear water thrown against white
//     (https://www.google.com/search?q=Shinichi+Maruyama+water+sculpture&udm=2 —
//     Bruce Silverstein Gallery, Designboom);
//   - clear water splashes shot at high speed on white (Vecteezy, Dreamstime:
//     https://www.google.com/search?q=clear+water+splash+white+background+high+speed+photography+studio&udm=2);
//   - water drops on white paper and on a white plate (Vecteezy, Dreamstime,
//     Magnific: https://www.google.com/search?q=water+droplets+on+white+surface+macro+photograph&udm=2),
//     the drop as a lens (Don Komarechka,
//     https://petapixel.com/2019/06/05/shooting-water-droplet-refractions-for-magical-macro-images/);
//   - single soap bubbles and white foam on white and grey grounds (Shutterstock,
//     PNGimg, Vecteezy: https://www.google.com/search?q=soap+bubble+on+white+background+photograph+clear+grey&udm=2);
//   - soap foam in black and white (Alamy, Dreamstime, Vecteezy:
//     https://www.google.com/search?q=soap+bubbles+foam+black+and+white+photograph&udm=2);
//   - rippled water from above in black and white (Pexels, Unsplash, Alamy:
//     https://www.google.com/search?q=water+surface+ripples+from+above+white+tray+studio+photograph+black+and+white&udm=2);
//   - soap films in macro, their drained, swirled interference (Canon Ireland's
//     macro soap bubbles, Dreamstime:
//     https://www.google.com/search?q=soap+bubble+macro+photograph+white+background+film+swirl&udm=2;
//     drainage and black film rising from the rims,
//     https://engage.aps.org/dfd/resources/virtual-pressroom/2008-pressroom/soap-bubbles);
//   - an opaque liquid: Harold Edgerton's Milk Drop Coronet, 1957 (MoMA, Wikipedia:
//     https://www.google.com/search?q=Harold+Edgerton+milk+drop+coronet+1957&udm=2).
// Its colour (user, 2026-11-05: the 액체 colour chips and picker must really colour it), looked at:
//   - food-coloured water drops shot in macro (Stuart Willson's Liquid Fire, https://fstoppers.com/photo/485927;
//     dyed drops falling into plain water, https://www.talkphotography.co.uk/threads/waterdrop-collisions.368439/;
//     coloured drops on white, https://www.google.com/search?q=food+coloring+water+drop+on+white+macro&udm=2):
//     the colour is the light's path through the liquid — pale at a drop's thin outline, rich in its middle,
//     deepest in the dark band at its rim, its caustic focus a bright saturated spot, its highlights still white;
//   - dyed soap bubbles (https://uspto.report/patent/app/20120035311 — dyed solution blows nearly colourless
//     bubbles; dyed soap layers, https://www.flowvis.org/media/2013spring/GetWet/Reports/Lotem_Sella.pdf):
//     a dyed film is faintly tinted, its colour gathering where it is thick — the drained foot and the walls —
//     under the interference colours, which stay its own.
// Common to all of them, on a light ground:
//   1. It is mostly the ground seen through it: its body stays within a few
//      per cent of the white, with no grey fill and no mirrored room (that
//      reads as chrome or mercury, Koons's steel, which this replaces).
//   2. It is drawn by thin, crisp dark lines where its surface turns steep —
//      a narrow band at a drop's rim, a sheet's edges and folds (Maruyama), a
//      bubble's or foam wall's hairline — wider only the deeper the liquid.
//   3. Its moving surface leaves faint refraction lines and light caustic
//      brightening inside it, travelling; a thrown or melting liquid carries
//      many more, darker ones (Maruyama's rings).
//   4. It is mirror-smooth: the window or softbox comes back as a few sharp,
//      small, white highlights.
//   5. It never rests: swells and drainage keep every line sliding.
//   6. Colour only as a hairline in thin films at walls, never bands.
// What varies (sliders and looks): its depth (렌즈: a drop's broad band … a
// film's hairline), how much its skin moves (물결), the film's drained bands
// faint in it (몸), its dye (전파's strains, a brand), the ground (black in
// SCC bubble/1). Looks: 물방울 (drops and thrown water: 1–6 at full depth),
// 얇은 막 (bubbles and foam on white: hairlines, the bands, little depth), 물든
// 막, 비눗막 · 검정 (SCC bubble/1). Melting (Surface.melt) is when it is most
// liquid: its swells grow and quicken and its film flows with the currents —
// a smooth drop, never terraced into rings along its height (user, 2026-11-05).
//
// Needs SHADING (hash, lightColour, exposure, envAt, toWorld, keyScreen, roughness) and materials/surface.ts (noise, fbm2, time).

export const FILM = /* glsl */ `
uniform float filmThickness;          // the thickest film, nm (SCC bubble/1: 900)
uniform float filmColour;             // the share of interference colour kept, at rims and walls (SCC bubble/1: 0.3)
uniform float filmSwirl;              // how strongly the currents fold the bands
uniform float filmFlow;               // how fast the bands drain and the currents move (0 still)
uniform float filmBody;               // 몸: the drained film's bands, faint grey in it (0 none)
uniform float filmLens;               // 렌즈: its depth — the rim's dark band a little wider and the caustic focus (1) … a film's hairline (0)
uniform float filmDye;                // the dye's strength: how much each unit of depth takes of the colours the coat absorbs
uniform float filmSheen;              // its reflectance face-on (water 0.02; a wet skin more)
uniform float filmEdge;               // the meniscus at its outline and walls: a dark line on white, a bright one on black
uniform float filmDome;               // a sphere's cap, its depth over the radius (render/foam.ts)
uniform float filmRipple;             // 물결: the swells of its skin at rest (melting multiplies them)
uniform float filmRound;              // 구면: 0 a nearly flat film (SCC bubble/1) … 1 a round drop (render/foam.ts)

// The bands at q (its own unit disc, y down) on a surface at height relief (0 rim … 1 top): its thickness (nm), the
// currents' fold (yz), the level it drains by (w, 0 thin top … 1 thick foot). Detail follows size (CSS px).
vec4 filmBandsAt(vec2 q, float down, float seed, float radius, float relief, float melt) {
  float t = time * filmFlow * (1.0 + 2.5 * melt);
  float stir = filmSwirl * (1.0 + 0.4 * melt);
  vec2 warp = vec2(0.0);
  if (radius >= 9.0) {
    vec3 at = vec3(q * 1.15 + seed * 7.0, t * 0.06 + seed * 3.0);
    warp = vec2(fbm2(at), fbm2(at + vec3(5.2, 1.3, 2.7))) - 0.375;
    if (radius >= 28.0) {
      vec3 folded = vec3(q * 2.3 + warp * 2.4 * stir + seed * 5.0, t * 0.09 - seed);
      warp += 0.45 * (vec2(noise(folded), noise(folded + vec3(3.1, 7.7, 1.9))) - 0.5);
    }
  }
  // Drained thin at the top of the screen and of the dome, thick at the foot; folded into wavy, roughly level bands.
  // Melting, the dome no longer drains it (a melted drop's height is a smooth swell from its outline in, whose
  // iso-heights would come back as rings like a contour map): the currents carry the film instead.
  float level = clamp(0.42 + 0.34 * down + 0.3 * mix(1.0 - relief, 0.5, melt) + stir * 0.5 * (warp.y + 0.45 * warp.x), 0.0, 1.0);
  // Still draining: the whole film thins and thickens slowly, so its fringes keep travelling.
  float breathe = 0.9 + 0.1 * sin(t * 0.35 + seed * 6.2831853);
  float thickness = filmThickness * (1.0 + 0.15 * melt) * breathe * (0.12 + 1.05 * level);
  return vec4(thickness, warp, level);
}

// A soap film's (n = 1.33) reflectance at thickness t (nm) and internal cosine c, per wavelength:
// two-beam interference with the half-wave shift at the front face, 2 sin²(2π n t c / λ).
vec3 interference(float t, float c) {
  vec3 phase = 6.2831853 * 1.33 * t * c / vec3(650.0, 532.0, 450.0);
  vec3 s = sin(phase);
  return 2.0 * s * s;
}

// Its skin's swells at q: three long travelling waves, their phase bent by the currents (warp), so they never read
// as a ruled pattern; melting, larger and faster. Returns their slope (xy) and curvature (z), per unit height.
vec3 filmSwellAt(vec2 q, float seed, vec2 warp, float melt) {
  float t = time * (0.5 + 1.5 * melt);
  vec3 swell = vec3(0.0);
  for (int i = 0; i < 3; i += 1) {
    float fi = float(i);
    float a = seed * 6.2831853 + fi * 2.2;
    vec2 d = vec2(cos(a), sin(a));
    float k = 2.6 + 1.9 * fi;
    float phase = dot(q, d) * k + 2.2 * (warp.x + warp.y) - t * (1.1 + 0.35 * fi) + seed * 13.0 * (fi + 1.0);
    swell += vec3(d * cos(phase), -k * sin(phase)) / (1.0 + fi);
  }
  return swell;
}

// The liquid at a surface point: nS its normal on screen, turn its own turn to the room, o its world point; q, seed,
// radius, edge (CSS px to its outline or wall), relief: where on it and how high; behind: the ground there; dye: its
// colour (the coat, or a strain's, brand's or face's over it), dyed: how much of dye is a strain's, brand's or face's;
// melt: a morph's. Returns the displayed colour.
vec3 filmOf(vec3 o, vec3 nS, mat3 turn, vec2 q, mat2 qTurn, float seed, float radius, float edge, float relief, vec3 behind, vec3 dye, float dyed, float melt) {
  // Drained towards the screen's bottom however the object is turned (qTurn: q's frame onto the screen).
  vec2 qScreen = qTurn * q;
  vec4 bands = filmBandsAt(q, qScreen.y, seed, radius, relief, melt);
  // Its skin: long swells, and ripples along the drained bands (Maruyama's rings, SCC bubble/1's bands), their slope
  // and curvature from the bands' own screen gradient (per unit of q). Melting, the swells grow and the ripples along
  // the bands give way to them: a melting drop is stirred, not terraced.
  float swell = filmRipple * (1.0 + 2.2 * melt);
  float perQ = 0.5 / max(length(vec2(dFdx(q.x), dFdy(q.x))) + length(vec2(dFdx(q.y), dFdy(q.y))), 1e-5);
  vec2 levelSlope = vec2(dFdx(bands.w), -dFdy(bands.w)) * perQ;
  float ridgeK = 6.2831853 * (5.0 + 3.0 * fract(seed * 3.7));
  float ridgePhase = ridgeK * bands.w - time * filmFlow * (0.6 + 2.0 * melt);
  float ridgeH = 0.004 * filmRipple * (1.0 - melt) * smoothstep(9.0, 30.0, radius);
  vec3 swells = 0.16 * swell * filmSwellAt(q, seed, bands.yz, melt);
  swells.xy = qTurn * swells.xy;
  vec2 slope = swells.xy + ridgeH * ridgeK * cos(ridgePhase) * levelSlope;
  // Where the skin is convex it gathers the light it passes onto the ground, where concave it spreads it: the
  // caustic lines under moving water.
  float curvature = swells.z * 0.25 - ridgeH * ridgeK * ridgeK * sin(ridgePhase) * dot(levelSlope, levelSlope);
  // 구면 0 lays an object's surface nearly flat towards the camera, as SCC bubble/1's films lie (spheres come flat
  // from their cap already, render/foam.ts).
  vec2 leaned = nS.xy * mix(0.3, 1.0, filmRound);
  vec3 n = normalize(vec3(leaned + slope * max(nS.z, 0.25), nS.z));
  float facing = clamp(n.z, 0.0, 1.0);
  float tilt = length(n.xy);

  // Seen through (a light ground): the ground itself, within a few per cent — water and bubbles on white are mostly
  // the white seen through them. Only a little shaded, brightened where its skin gathers the light it passes
  // (caustics) and in the focus it throws away from the key.
  vec2 keyFlat = normalize(keyScreen.xy + vec2(1e-4, 0.0));
  vec2 focus = -keyFlat * 0.42;
  float caustic = exp(-dot(qScreen - focus, qScreen - focus) * 6.0) * filmLens;
  float gathered = clamp(0.012 * curvature, -0.03, 0.04);
  // Drawn by thin dark lines only. Where the surface turns steep past what refraction carries (its rim, a fold) the
  // view leaves the white ground for the room: a narrow band, wider the deeper the liquid (렌즈), and the meniscus
  // hairline at its outline and walls.
  float onset = mix(0.975, 0.9, filmLens);
  float steep = smoothstep(onset, onset + 0.06, tilt);
  float keyward = 0.5 + 0.5 * dot(n.xy / max(tilt, 1e-4), keyFlat);
  float hair = exp(-max(edge, 0.0) / 0.9);
  float line = max(steep * mix(1.0, 0.7, keyward), hair);
  // Its colour, as a dyed liquid's (Beer–Lambert): the light crosses it to the ground and back, and each channel the
  // dye takes is lost by the path's length, so the colour deepens with the depth — pale at a drop's thin outline,
  // rich at its middle and in the dark band at its rim; in a film (렌즈 0) faint, collecting at the drained foot and
  // in the thick meniscus at its walls, as a dyed bubble keeps its colour in its walls. The dye's brightest channel
  // passes untouched, so it stays luminous; white (each look's opening) leaves it clear. A strain's, brand's or
  // face's colour (dyed) is laid flat over it as before, so it stays legible.
  vec3 dyeHue = clamp(dye / max(max(dye.r, max(dye.g, dye.b)), 0.05), 0.02, 1.0);
  float coatShare = 1.0 - clamp(dyed, 0.0, 1.0);
  float depth = mix(0.06 + 0.3 * bands.w * bands.w, 0.12 + relief * clamp(relief, 0.0, 1.0), filmLens) + 0.6 * line;
  vec3 paint = mix(vec3(1.0), dyeHue, 0.64 * clamp(dyed, 0.0, 1.0));
  // The focus it throws onto the ground is the light brightest through it, so the dye there is its most luminous.
  vec3 dyedDepth = pow(dyeHue, vec3(0.7 * filmDye * coatShare * depth * (1.0 - 0.45 * caustic)));
  vec3 through = dyedDepth * paint;
  // Its rim's dark band is then mostly the dye's own depth, a little less the grey of the room.
  float tinted = 1.0 - min(dyedDepth.r, min(dyedDepth.g, dyedDepth.b));
  vec3 below = behind * through * (0.965 + 0.035 * caustic + gathered);
  // The ripples' crests: faint refraction lines along the drained bands, travelling; gone while it melts.
  float crest = pow(max(-sin(ridgePhase), 0.0), 10.0) * smoothstep(9.0, 30.0, radius) * smoothstep(0.05, 0.4, length(levelSlope));
  line = max(line, crest * filmRipple * 0.12 * (1.0 - melt));
  // Iridescence only as a hairline at the walls (and, melting, faintly flowing over it).
  vec3 fringes = interference(bands.x, sqrt(max(1.0 - (1.0 - facing * facing) / 1.7689, 0.0)));
  float fringeGrey = dot(fringes, vec3(0.3, 0.45, 0.25));
  vec3 hairColour = mix(vec3(1.0), fringes / max(fringeGrey, 0.2), clamp(filmColour, 0.0, 1.0) * smoothstep(120.0, 300.0, bands.x));
  below *= 1.0 - min(filmEdge, 1.0) * 0.62 * mix(1.0, 0.6, tinted) * line * mix(vec3(1.0), hairColour, hair);
  // The drained film's bands, very faint (몸).
  below *= 1.0 - filmBody * 0.05 * smoothstep(0.1, 0.95, bands.w) * fringeGrey;

  // Reflected: on white only the key, sharp and small (no room, which turns it to metal), at water's Fresnel —
  // untoned, so it comes back white.
  vec3 dir = normalize(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
  vec3 w = turn * toWorld(dir);
  float fresnel = filmSheen + (1.0 - filmSheen) * pow(1.0 - facing, 5.0);
  float glint = softbox(w, normalize(keyAt - o), mix(0.12, 0.7, keySize) * 0.7, 0.35);
  vec3 keyShown = lightColour * keyStrength * 8.0 * glint * fresnel * 1.25 * exposure;
  // Off its face, not through it: on a dyed liquid too the highlight is white (it lifts the channels the dye took).
  float belowTop = max(below.r, max(below.g, below.b));
  vec3 lightShown = below + keyShown + (vec3(belowTop) - below) * clamp(dot(keyShown, vec3(0.333)), 0.0, 1.0);

  // On a dark ground (SCC bubble/1) its body is only the film's reflection of a broad window and the room's glow,
  // so the drained bands are what it shows — thick folds bright, thin film towards black — and the walls and
  // outline are bright lines.
  float dark = 1.0 - clamp(dot(behind, vec3(0.333)), 0.0, 1.0);
  float edgeOn = exp(-max(edge, 0.0) / 1.4);
  float colourful = clamp(filmColour * max(edgeOn, 0.6 * melt), 0.0, 1.0) * smoothstep(120.0, 300.0, bands.x);
  // Dyed, the film body's reflection and its bright walls (thick, so the most coloured) take the dye; the
  // interference colours stay over it, and the window's bright highlight, off its front face, stays white.
  vec3 mirrored = (envAt(o, w, max(roughness, 0.25)) + lightColour * 0.6) * 1.25 * exposure;
  vec3 filmDyed = pow(dyeHue, vec3(0.7 * filmDye * coatShare * (0.2 + 0.5 * bands.w + 1.2 * edgeOn)));
  filmDyed = mix(filmDyed, vec3(1.0), smoothstep(1.2, 2.6, dot(mirrored, vec3(0.333))));
  vec3 film = mix(vec3(0.35 + 0.65 * fringeGrey) * filmDyed, fringes, colourful);
  float banded = (0.05 + 0.32 * fringeGrey * fringeGrey) * (0.35 + 0.65 * smoothstep(0.0, 0.8, bands.w));
  float reflectance = max(banded, min(filmEdge * 2.0, 1.0) * edgeOn);
  vec3 darkShown = behind * (1.0 - reflectance) + mirrored * film * reflectance;
  vec3 shown = mix(lightShown, darkShown, dark);
  return shown / (1.0 + max(max(shown.r, max(shown.g, shown.b)) - 1.0, 0.0));
}
`;
