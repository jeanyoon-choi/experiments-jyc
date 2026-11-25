// 석고 (bubble/8): the plaster cast (render/plaster.ts). Kept as the user's first 석고 (user, 2026-11-03).

import { PLASTER } from "../plaster";
import type { MaterialEntry } from "./surface";

const defaults = { plasterSheen: 0.03, plasterTranslucency: 0.1, plasterOcclusion: 0.85, plasterGrain: 0.5 };

export const PLASTER_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 2,
  family: "plaster",
  familyLabel: "석고",
  colourLabel: "석고",
  glsl: PLASTER + /* glsl */ `
vec3 plasterMaterialOf(Surface s) {
  float occlusion = max(mix(1.0, s.occlusion, plasterOcclusion), 0.15) * mix(0.75, 1.0, smoothstep(0.0, 0.25, s.facing + 0.1));
  return plasterOf(s.o, s.n, s.facing, s.albedo, occlusion, s.grainAt, mirrorOf(s, 0.35));
}
`,
  call: "plasterMaterialOf",
  defaults,
  controls: [
    { key: "plasterSheen", label: "광택", min: 0, max: 1, step: 0.01 },
    { key: "plasterTranslucency", label: "빛 투과", min: 0, max: 1, step: 0.01 },
    { key: "plasterOcclusion", label: "오목한 곳 그늘", min: 0, max: 1, step: 0.01 },
    { key: "plasterGrain", label: "결", min: 0, max: 1, step: 0.01 },
  ],
  // The cast gallery's plaster: chalky, matte, deep in its hollows; the key a little stronger and smaller than 크롬's.
  looks: [{ id: "plaster", label: "석고상", look: { coating: [0.9, 0.88, 0.84], coatingMix: 0, keyStrength: 1.4, keySize: 0.25, shadowLift: 0.15 } }],
};
