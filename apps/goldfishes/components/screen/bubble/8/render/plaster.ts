// 석고 (user, 2026-11-03): a third material beside the liquid and Koons's coats —
// the plaster cast and the carved marble: the cast galleries of Greek and Roman
// sculpture (Cambridge's Museum of Classical Archaeology, some 600 casts:
// https://www.classics.cam.ac.uk/museum/collections/cast-collection) and Rodin's
// marbles (The Kiss, "smoothly carved in gleaming white marble":
// https://en.wikipedia.org/wiki/The_Kiss_(Rodin_sculpture)). What makes them
// read, and what is drawn here:
//   - a matte, chalky white body (plaster scatters almost all light back
//     diffusely): the form is read from shading alone, not from reflections;
//   - one directional key over soft room light, the shadow side a warm grey;
//   - deep, soft darkness in every hollow (occlusion) — the eye sockets,
//     the folds — which is what gives a cast its drawing;
//   - marble: light entering a little (the terminator softened and warmed)
//     and a faint, broad polish;
//   - a fine grain, never a texture you can name.
// Needs SHADING (hash, keyAt, photoAt, the look's light) and materials/surface.ts's noise.

export const PLASTER = /* glsl */ `
uniform float plasterSheen;           // 0 chalky plaster … a marble's soft polish
uniform float plasterTranslucency;    // light passing a little into it: the terminator softened and warmed (marble)
uniform float plasterOcclusion;       // how dark its hollows grow
uniform float plasterGrain;           // the cast's fine grain

// The body at world point o, world normal n (facing: its cosine to the camera),
// of colour albedo; occlusion 0–1 (1 open), grainAt a point on it (stable as it
// moves), reflected the room it mirrors, softly (for marble's polish). Displayed.
vec3 plasterOf(vec3 o, vec3 n, float facing, vec3 albedo, float occlusion, vec3 grainAt, vec3 reflected) {
  // A sculpture is lit raking, as in a cast gallery under a high side window: the look's key, laid lower
  // towards the horizon, so every curve turns from light to shadow across it.
  vec3 toKey = normalize(keyAt - o);
  toKey = normalize(vec3(toKey.xy * 1.9, toKey.z * 0.75));
  float wrap = 0.5 * plasterTranslucency;
  float ndl = dot(n, toKey);
  float lit = max((ndl + wrap) / (1.0 + wrap), 0.0);
  lit = lit * lit * (3.0 - 2.0 * lit) * 0.35 + lit * 0.65;
  // The room fills the shadows coolly and dimly; the ground bounces a little from below.
  // A white room bounces a great deal back into a white cast's shadows: they stay a light, cool grey.
  vec3 room = vec3(0.9, 0.94, 1.0) * (0.34 + shadowLift * 0.25);
  if (photoStrength > 0.0) room += 0.3 * photoStrength * photoAt(n, 7.0);
  room *= 0.75 + 0.25 * max(n.z, 0.0);
  room += background * (0.12 + 0.2 * groundLight) * max(-n.z, 0.0);
  vec3 key = vec3(1.0, 0.97, 0.92) * keyStrength * mix(1.5, 1.05, keySize) * lit;
  // Light that has entered the stone comes back warmer, most at the terminator.
  float terminator = plasterTranslucency * clamp(1.0 - abs(ndl) * 2.5, 0.0, 1.0);
  vec3 body = albedo * lightColour * (key * mix(0.6, 1.0, occlusion) + room * occlusion);
  body += albedo * vec3(1.0, 0.78, 0.62) * terminator * 0.18 * keyStrength;
  float grain = (noise(grainAt) - 0.5) + 0.5 * (noise(grainAt * 2.7 + 3.1) - 0.5);
  body *= 1.0 + plasterGrain * 0.035 * grain;
  float fresnel = 0.03 + 0.97 * pow(1.0 - facing, 5.0);
  vec3 polish = reflected * fresnel * plasterSheen;
  return filmic((body + polish) * 1.2 * exposure);
}
`;
