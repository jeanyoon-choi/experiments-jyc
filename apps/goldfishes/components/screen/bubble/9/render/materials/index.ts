// The materials (surface.ts): their GLSL in order, the dispatch on `material`,
// and everything the panels read from them. bubble/9: 콘크리트 dropped (user, 2026-11-05: too close to 석고; bubble/8 keeps it).

import { GLASS_MATERIAL } from "./glass";
import { LIQUID_MATERIAL } from "./liquid";
import { MIX_MATERIAL } from "./mix";
import { PLASTER_MATERIAL } from "./plaster";
import { SERUM_MATERIAL } from "./serum";
import { STONE_MATERIAL } from "./stone";
import { SURFACE } from "./surface";

export const MATERIALS = [LIQUID_MATERIAL, SERUM_MATERIAL, PLASTER_MATERIAL, STONE_MATERIAL, GLASS_MATERIAL, MIX_MATERIAL] as const;

/** Every material's uniforms at their defaults (a look's starting values). */
export const MATERIAL_DEFAULTS = {
  ...LIQUID_MATERIAL.defaults,
  ...PLASTER_MATERIAL.defaults,
  ...STONE_MATERIAL.defaults,
  ...GLASS_MATERIAL.defaults,
  ...SERUM_MATERIAL.defaults,
  ...MIX_MATERIAL.defaults,
};
export type MaterialValues = typeof MATERIAL_DEFAULTS;

/** SURFACE, each material's GLSL, then shadeMaterial(s) choosing by `material`. Included after SHADING's functions. */
export const MATERIAL_GLSL = [
  SURFACE,
  // 석고 first: other materials (and placeholders) may build on its plasterOf.
  ...[PLASTER_MATERIAL, ...MATERIALS.filter((entry) => entry !== PLASTER_MATERIAL)].map((entry) => entry.glsl),
  /* glsl */ `
vec3 shadeMaterial(Surface s) {
  int id = int(material + 0.5);
${MATERIALS.map((entry) => `  if (id == ${entry.id}) return ${entry.call}(s);`).join("\n")}
  return s.albedo;
}
`,
].join("\n");

/** The material with this id, or null for the coat (0). */
export function materialOf(id: number) {
  return MATERIALS.find((entry) => entry.id === Math.round(id)) ?? null;
}
