// 연출: the whole looks the visual panel offers, by material family.

import { MATERIALS, materialOf } from "../render/materials";
import type { Visual } from "../state/schema";
import { CHROME, materialLook, MATTE, MILK } from "./base";

/**
 * 연출: whole looks, each a different environment, material and viewpoint
 * (the raft's area and flow stay unless a look sets them). The liquid films first (bubble/8 opens on 비눗막),
 * then the coats: bubble/2's, which bubble/4 opened on; bubble/5 opens on 우유 수조, bubble/6 and /7 on 크롬.
 * Its families (user, 2026-11-03): the materials (render/materials: 액체, 젤 · 세럼, 석고, 유리, 맥시멀 믹스), then bubble/2–7's coats.
 */
export const LOOK_FAMILIES: readonly { id: string; label: string }[] = [
  ...MATERIALS.filter((entry, index) => MATERIALS.findIndex((other) => other.family === entry.family) === index).map((entry) => ({ id: entry.family, label: entry.familyLabel })),
  { id: "koons", label: "쿤스 (코팅)" },
];

export type LookFamily = string;

/** The material a look is in: its material's family, or 쿤스 for the coat. */
export const familyOf = (visual: Visual): LookFamily => materialOf(visual.material)?.family ?? "koons";

export const LOOKS: readonly { id: string; label: string; family: LookFamily; look: Partial<Visual> }[] = [
  // Each material's 연출, bubble/7's studio unchanged under them.
  ...MATERIALS.flatMap((entry) => entry.looks.map((option) => ({ id: option.id, label: option.label, family: entry.family, look: materialLook(entry, option.look) }))),
  // bubble/2: magenta steel in a photographed loft, seen from the side, each lobe turned its own way.
  { id: "gallery", label: "갤러리 (bubble/2)", family: "koons", look: {} },
  // The same, roughness 1 (and no clear coat, whose sharper reflection would still show specks): no reflected
  // surroundings at all, only the light's soft gradient over the coat (user, 2026-10-22).
  { id: "matte", label: "갤러리 · 거칠기 1", family: "koons", look: MATTE },
  // The same with every sphere and object its own coat (섞음; user, 2026-11-07).
  { id: "matte-mix", label: "갤러리 · 거칠기 1 · 섞음", family: "koons", look: { ...MATTE, coatingMix: 1 } },
  // bubble/2's look with the blue coat, as in the first lifecycle recording (bubble-4-lifecycle.gif): the
  // goldfish's own colours, the blue they take on and their grey all read against it (user, 2026-10-22).
  { id: "gallery-blue", label: "갤러리 · 블루", family: "koons", look: { coating: [0.08, 0.26, 0.95], coatingMix: 0 } },
  // Saved by the user with JSON 내려받기 (bubble-3-2026-10-22T06-00-47-849Z.json): blue coat under violet light,
  // roughness 1, the dark parts lifted almost to the light, a bright ground, larger bubbles.
  {
    id: "violet",
    label: "보랏빛 무광", family: "koons",
    look: {
      lightColour: [0.8823529411764706, 0, 1],
      background: [1, 1, 1],
      coating: [0.2, 0, 1],
      coatingMix: 0,
      exposure: 1.29,
      metalness: 0.87,
      roughness: 1,
      clearcoat: 0.26,
      variety: 1,
      viewTilt: 1,
      lightTurn: 1,
      photo: 0,
      photoStrength: 0.24,
      keyStrength: 0.45,
      keySize: 0.46,
      shadowLift: 0.98,
      groundLight: 1.62,
      edgeShadow: 0,
      colourBleed: 0.16,
      neighbourReflection: 1,
      crease: 0,
      area: 0.6,
      portions: 1.95,
    },
  },
  // The user's two references (crimson metallic spheres in milk), without their generated haze: deep crimson
  // metal from straight above, every rim mirroring the white liquid all round, the middles the dim room, one
  // large soft window from the upper left, a barely-there contact shade on the milk.
  {
    id: "milk",
    label: "우유 수조", family: "koons",
    look: MILK,
  },
  // The second reference: the same, with more contrast — darker middles, a smaller, crisper window.
  {
    id: "milk-deep",
    label: "우유 수조 · 진하게", family: "koons",
    look: { coating: [0.72, 0.015, 0.035], metalness: 1, roughness: 0.06, clearcoat: 0.4, variety: 0.15, viewTilt: 0, lightTurn: 0.875, photo: 2, photoStrength: 0.3, keyStrength: 3, keySize: 0.55, shadowLift: 0.08, groundLight: 1.1, edgeShadow: 0.05, colourBleed: 0, neighbourReflection: 0.9, crease: 0.35, background: [1, 1, 1], exposure: 0.85 },
  },
  // Bare polished chrome, seen at a slant, the studio mirrored nearly unblurred.
  {
    id: "chrome",
    label: "크롬", family: "koons",
    look: CHROME,
  },
  // 크롬 with every sphere and object its own coat (섞음; user, 2026-11-07).
  { id: "chrome-mix", label: "크롬 · 섞음", family: "koons", look: { ...CHROME, coatingMix: 1 } },
  // Gold in a forest's light, half from the side.
  {
    id: "gold",
    label: "금빛 숲", family: "koons",
    look: { coating: [1, 0.74, 0.32], viewTilt: 0.7, lightTurn: 0.3, photo: 4, photoStrength: 1.6, keyStrength: 0.4, keySize: 0.6, shadowLift: 0.05, groundLight: 0.4, roughness: 0.18, clearcoat: 0.3, variety: 0.15, background: [0.93, 0.9, 0.84], exposure: 0.9 },
  },
];

/** What switching 재질 opens on: each material family its first look; 쿤스 bubble/7's opening (크롬). */
export const FAMILY_OPENING: Record<LookFamily, Partial<Visual>> = {
  ...Object.fromEntries(LOOK_FAMILIES.filter((family) => family.id !== "koons").map((family) => [family.id, LOOKS.find((option) => option.family === family.id)!.look])),
  koons: CHROME,
};
