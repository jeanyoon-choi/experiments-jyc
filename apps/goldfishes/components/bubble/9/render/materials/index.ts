// The materials (surface.ts): their GLSL in order, the dispatch on `material`,
// and everything the panels read from them. bubble/9: 콘크리트 dropped (user, 2026-11-05: too close to 석고; bubble/8 keeps it).
// 2026-11-11 (user): 메시 복원 (hmr.ts), 인쇄물 (print.ts, print-sheets.ts) and 도파민 (acid.ts) added after the others.

import { ACID_MATERIAL } from "./acid";
import { GLASS_MATERIAL } from "./glass";
import { HMR_MATERIAL } from "./hmr";
import { LIQUID_MATERIAL } from "./liquid";
import { MIX_MATERIAL } from "./mix";
import { PLASTER_MATERIAL } from "./plaster";
import { PRINT_MATERIAL } from "./print";
import { SERUM_MATERIAL } from "./serum";
import { STONE_MATERIAL } from "./stone";
import { SURFACE } from "./surface";

// 액체 is no longer offered (user, 2026-11-11): it is out of MATERIALS, so the panels, 연출 and shadeMaterial no longer
// reach it. Its GLSL and its uniforms' defaults stay, since the raft's film path (foam.ts, film.ts) is written on them.
export const MATERIALS = [SERUM_MATERIAL, PLASTER_MATERIAL, STONE_MATERIAL, GLASS_MATERIAL, MIX_MATERIAL, HMR_MATERIAL, PRINT_MATERIAL, ACID_MATERIAL] as const;

/** Every material's uniforms at their defaults (a look's starting values). */
export const MATERIAL_DEFAULTS = {
  ...LIQUID_MATERIAL.defaults,
  ...PLASTER_MATERIAL.defaults,
  ...STONE_MATERIAL.defaults,
  ...GLASS_MATERIAL.defaults,
  ...SERUM_MATERIAL.defaults,
  ...MIX_MATERIAL.defaults,
  ...HMR_MATERIAL.defaults,
  ...PRINT_MATERIAL.defaults,
  ...ACID_MATERIAL.defaults,
};
export type MaterialValues = typeof MATERIAL_DEFAULTS;

/** SURFACE, each material's GLSL, then shadeMaterial(s) choosing by `material`. Included after SHADING's functions. */
export const MATERIAL_GLSL = [
  SURFACE,
  // 석고 first: other materials (and placeholders) may build on its plasterOf.
  ...[PLASTER_MATERIAL, LIQUID_MATERIAL, ...MATERIALS.filter((entry) => entry !== PLASTER_MATERIAL)].map((entry) => entry.glsl),
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
