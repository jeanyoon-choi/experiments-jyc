// LSD (bubble/9, user 2026-11-11: "lsd-like texture, 도파민, 마약 같은 느낌이 나는 material").
//
// Two passes were rejected and removed whole:
//   1. a rainbow phase flowing in warped bands (user, 2026-11-12: "그냥 알록달록 한 그라디언트");
//   2. Klüver's form constants drawn on the objects — log-polar funnels, lattices, spirals, eyes in black outline
//      (user, 2026-11-12: "더 cheesy 하고 더 kitschy … explicit pattern 이면 절대 안되는거"). Rule kept: no motif,
//      no pattern, no palette drawn on the surface. An explicit sign of "psychedelia" is kitsch here.
//
// Third pass: nothing is drawn. The object stays one clean, wet, coloured mirror — and what changes is how it is
// seen, as open-eyed perception changes at an ordinary dose:
//   - 숨: surfaces breathe. The mirror's normal swells and flows slowly, so highlights and the reflected room swim
//     across a thing that is standing still;
//   - 잔상: tracers. Red, green and blue each see the surface as it was a moment apart (the flow sampled at three
//     lagged times), so whatever moves in the reflection drags a spectral trail and whatever rests is white again —
//     colour appears only where there is motion;
//   - 색 분리: the three images also part a little towards the outline, as through a prism (halos round edges);
//   - 색 흐름: colour will not stay put. Each object has one hue at a time, saturated beyond paint, and it drifts —
//     through the object, round with the viewing angle (펄), and slowly in time — with its complement as an
//     after-image along the outline.
// Stronger (user, 2026-11-12: "방향 나쁘지 않은데, 더 과감하게 … 더 약빤 배리에이션들"; LSD · 진하게 kept as it was): the
// same four effects past where they are polite, and three more that still draw nothing —
//   - 녹아내림: the flow gains a slow, large swell and a quick fine one, so forms liquefy under the light;
//   - 메아리: two more images of the room, further back in time, each in a hue turned from the last (the trail
//     behind the trail);
//   - 솔라: the tone curve folds back on itself (the Sabattier effect): the brightest parts turn to their
//     negative, so highlights go dark and edged in the complement;
//   - 색 순환: the hue's drift through an object widens until it runs through neighbours on the wheel.
// Cost: three reflections and seven value-noise taps a pixel; 녹아내림 adds four taps, 메아리 two reflections and
// four taps (measured: docs/screen/bubble/9.md).
// Needs SHADING (hash, envAt, irradiance, filmic, toWorld, exposure) and surface.ts (Surface, noise, time).

import type { MaterialEntry } from "./surface";

const defaults = {
  lsdBreath: 0.6,
  lsdTrail: 0.35,
  lsdSplit: 0.6,
  lsdDrift: 1,
  lsdPearl: 0.5,
  lsdSaturation: 1.35,
  lsdMirror: 0.8,
  lsdSpeed: 1,
  lsdCoat: 0,
  lsdMelt: 0,
  lsdEcho: 0,
  lsdSolar: 0,
  lsdCycle: 0,
};

export const ACID_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 10,
  family: "acid",
  familyLabel: "LSD",
  colourLabel: "LSD",
  glsl: /* glsl */ `
uniform float lsdBreath;              // the surface swelling and flowing under the light
uniform float lsdTrail;               // seconds between the red, the green and the blue image
uniform float lsdSplit;               // the three images apart towards the outline, and the after-image there
uniform float lsdDrift;               // how fast colour moves through an object
uniform float lsdPearl;               // the hue turning with the viewing angle
uniform float lsdSaturation;          // beyond paint
uniform float lsdMirror;              // 0 a lacquer body … 1 a coloured mirror
uniform float lsdSpeed;               // its clock
uniform float lsdCoat;                // 0 each object its own hue, 1 the page's coat as its home
uniform float lsdMelt;                // a slow large swell and a quick fine one over the flow: forms liquefy
uniform float lsdEcho;                // two more images of the room, further back, each in a turned hue
uniform float lsdSolar;               // the tone curve folding back: the brightest parts to their negative
uniform float lsdCycle;               // the hue's drift widening round the wheel

// The flow's slope at a time: what the mirror's normal leans by.
vec2 lsdSlope(vec2 u, float tc) {
  return (vec2(noise(vec3(u, tc * 0.45)), noise(vec3(u + 31.7, tc * 0.45 + 5.0))) - 0.5) * 1.1 * lsdBreath;
}

// A colour turned round the grey axis by a share of the wheel.
vec3 lsdTurn(vec3 c, float turns) {
  float a = 6.2831853 * turns;
  vec3 axis = vec3(0.57735);
  return c * cos(a) + cross(axis, c) * sin(a) + axis * dot(axis, c) * (1.0 - cos(a));
}

vec3 lsdOf(Surface s) {
  float t = time * lsdSpeed;
  float own = hash(vec3(s.seed * 13.7, 4.4, 1.9));
  vec2 u = s.q * 1.3 + own * 17.0;
  vec3 seen;
  vec3 middle = s.nS;
  // 녹아내림: a slow large swell and a quick fine one, the same for the three images (only the flow is lagged).
  vec2 melt = vec2(0.0);
  if (lsdMelt > 0.0) {
    melt = lsdMelt * 2.4 * (vec2(noise(vec3(u * 0.42 + 9.1, t * 0.8)), noise(vec3(u * 0.42 + 47.3, t * 0.8 + 2.0))) - 0.5)
      + lsdMelt * 0.7 * (vec2(noise(vec3(u * 3.3 + 2.7, t * 1.3)), noise(vec3(u * 3.3 + 17.9, t * 1.3 + 8.0))) - 0.5);
  }
  for (int c = 0; c < 3; c++) {
    // Each channel a moment behind the last: the flow as it was.
    float tc = t - float(c) * lsdTrail;
    vec3 n = normalize(s.nS + vec3(s.qTurn * (lsdSlope(u, tc) + melt) + s.nS.xy * 0.07 * lsdSplit * float(c - 1), 0.0));
    vec3 d = normalize(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
    seen[c] = envAt(s.o, s.turn * toWorld(d), 0.03)[c];
    if (c == 1) middle = n;
  }
  // One hue at a time, drifting through the object, with the angle and in time.
  float rim = 1.0 - s.facing;
  float turns = (0.16 + 1.1 * lsdCycle) * (noise(vec3(s.q * 0.9 + own * 5.0, t * 0.12 * lsdDrift)) - 0.5) * min(lsdDrift, 1.0)
    + 0.06 * sin(t * 0.17 * lsdDrift + own * 6.2831853) + 0.3 * lsdPearl * rim * rim;
  vec3 home = mix(0.5 + 0.5 * cos(6.2831853 * (own + vec3(0.0, 0.33, 0.67))), s.albedo, max(lsdCoat, s.dyed));
  vec3 tint = clamp(lsdTurn(home, turns), 0.0, 1.0);
  float open = max(mix(1.0, s.occlusion, 0.8), 0.15);
  float fresnel = pow(rim, 5.0);
  vec3 lacquer = tint * irradiance(s.o, s.turn * toWorld(middle)) + seen * (0.04 + 0.96 * fresnel);
  vec3 mirror = seen * mix(tint, vec3(1.0), 0.12 + 0.6 * fresnel);
  vec3 colour = mix(lacquer, mirror, lsdMirror) * mix(0.45, 1.0, open);
  if (lsdEcho > 0.0) {
    // The trail behind the trail: the room as the flow had it, twice more, each a third of the wheel on.
    for (int e = 1; e <= 2; e++) {
      float te = t - (2.0 + 2.5 * float(e)) * max(lsdTrail, 0.15);
      vec3 n = normalize(s.nS + vec3(s.qTurn * (lsdSlope(u, te) * 1.4 + melt), 0.0));
      vec3 d = normalize(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
      vec3 ghost = envAt(s.o, s.turn * toWorld(d), 0.05) * clamp(lsdTurn(tint, 0.33 * float(e)), 0.0, 1.0);
      colour = max(colour, ghost * lsdEcho * (e == 1 ? 0.8 : 0.55) * open);
    }
  }
  // The complement, as an after-image along the outline.
  colour += clamp(lsdTurn(tint, 0.5), 0.0, 1.0) * 0.3 * lsdSplit * rim * rim * rim * open;
  colour = filmic(colour * exposure * 1.1);
  if (lsdSolar > 0.0) {
    vec3 folded = colour + (1.0 - 2.0 * colour) * smoothstep(0.42, 0.78, colour);
    colour = mix(colour, clamp(folded * 1.7, 0.0, 1.0), lsdSolar);
  }
  float grey = dot(colour, vec3(0.2126, 0.7152, 0.0722));
  return clamp(mix(vec3(grey), colour, lsdSaturation), 0.0, 1.0);
}
`,
  call: "lsdOf",
  defaults,
  controls: [
    { key: "lsdBreath", label: "숨 (표면이 부풀고 흐름)", min: 0, max: 2, step: 0.01 },
    { key: "lsdTrail", label: "잔상 (빨강 · 초록 · 파랑의 시간차, 초)", min: 0, max: 1.5, step: 0.01 },
    { key: "lsdSplit", label: "색 분리 (가장자리 프리즘 · 보색 잔상)", min: 0, max: 2, step: 0.01 },
    { key: "lsdDrift", label: "색 흐름", min: 0, max: 4, step: 0.01 },
    { key: "lsdPearl", label: "펄 (각도에 따라 색이 돎)", min: 0, max: 2, step: 0.01 },
    { key: "lsdSaturation", label: "채도", min: 0.5, max: 2, step: 0.01 },
    { key: "lsdMirror", label: "거울 (0 래커 · 1 컬러 미러)", min: 0, max: 1, step: 0.01 },
    { key: "lsdSpeed", label: "속도", min: 0, max: 3, step: 0.01 },
    { key: "lsdCoat", label: "코팅색을 바탕으로", min: 0, max: 1, step: 1 },
    { key: "lsdMelt", label: "녹아내림", min: 0, max: 2, step: 0.01 },
    { key: "lsdEcho", label: "메아리 (잔상 뒤의 잔상)", min: 0, max: 1.5, step: 0.01 },
    { key: "lsdSolar", label: "솔라 (밝은 곳이 뒤집힘)", min: 0, max: 1, step: 0.01 },
    { key: "lsdCycle", label: "색 순환", min: 0, max: 1, step: 0.01 },
  ],
  coatChosen: { lsdCoat: 1 },
  looks: [
    // A coloured mirror that breathes, over bubble/7's white ground.
    { id: "lsd", label: "LSD", look: {} },
    // Bare chrome: no colour of its own, only what the tracers pull out of the light.
    { id: "lsd-chrome", label: "LSD · 크롬", look: { lsdCoat: 1, coating: [0.86, 0.86, 0.86], coatingMix: 0, lsdSaturation: 1.6, lsdTrail: 0.5, lsdSplit: 1, lsdPearl: 0 } },
    // A lacquer body, wetter and deeper: the dose turned up.
    { id: "lsd-deep", label: "LSD · 진하게", look: { lsdMirror: 0.35, lsdBreath: 1.1, lsdTrail: 0.6, lsdSplit: 1.2, lsdDrift: 2, lsdPearl: 1, lsdSaturation: 1.6 } },
    // Stronger, each past where 진하게 stops (user, 2026-11-12).
    { id: "lsd-melt", label: "LSD · 녹아내림", look: { lsdMirror: 0.9, lsdBreath: 1.4, lsdMelt: 1.2, lsdTrail: 0.7, lsdSplit: 1.3, lsdDrift: 2.5, lsdPearl: 1.2, lsdSaturation: 1.7, lsdSpeed: 1.3 } },
    { id: "lsd-echo", label: "LSD · 잔상 폭주", look: { lsdMirror: 1, lsdBreath: 1.2, lsdMelt: 0.5, lsdTrail: 1.1, lsdEcho: 1.2, lsdSplit: 1.8, lsdDrift: 2, lsdSaturation: 1.8, lsdSpeed: 1.5 } },
    { id: "lsd-solar", label: "LSD · 솔라", look: { lsdMirror: 0.6, lsdBreath: 1.2, lsdMelt: 0.6, lsdTrail: 0.7, lsdSplit: 1.4, lsdSolar: 1, lsdCycle: 0.5, lsdDrift: 3, lsdPearl: 1.4, lsdSaturation: 1.9 } },
    {
      id: "lsd-peak",
      label: "LSD · 피크",
      look: { lsdMirror: 0.85, lsdBreath: 1.8, lsdMelt: 1.8, lsdTrail: 1.2, lsdEcho: 1.4, lsdSplit: 2, lsdSolar: 0.75, lsdCycle: 1, lsdDrift: 4, lsdPearl: 2, lsdSaturation: 2, lsdSpeed: 1.8 },
    },
    // On black, the room and key alone in the mirrors.
    {
      id: "lsd-black",
      label: "LSD · 검정",
      look: { background: [0.01, 0.01, 0.015], groundLight: 0, edgeShadow: 0, shadowLift: 0, photoStrength: 1.1, keyStrength: 1.5, keySize: 0.35 },
    },
  ],
};
