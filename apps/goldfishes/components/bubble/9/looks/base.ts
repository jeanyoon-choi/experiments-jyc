// What every 연출 is written over, and the coats' looks that others are built from.

import { MATERIALS } from "../render/materials";
import { VISUAL_DEFAULTS, type Visual } from "../state/schema";

/** What every 연출 starts from: bubble/2's look (갤러리) with 기본값 3's raft. */
export const LOOK_BASE: Visual = { ...VISUAL_DEFAULTS, area: 0.46, portions: 1.95 };

/** 크롬 (bare polished chrome at a slant, the studio mirrored nearly unblurred): bubble/6's opening look (user, 2026-10-25; again 2026-10-27). */
export const CHROME: Partial<Visual> = { coating: [0.78, 0.77, 0.75], viewTilt: 0.4, lightTurn: 0.1, photo: 2, photoStrength: 1.2, keyStrength: 1.2, keySize: 0.3, shadowLift: 0.05, groundLight: 0.8, edgeShadow: 0.3, roughness: 0.02, clearcoat: 0.2, variety: 0.15, exposure: 0.9 };

/** 갤러리 · 거칠기 1: bubble/6 opened on it briefly (user, 2026-10-27), then on 크롬 again. */
export const MATTE: Partial<Visual> = { roughness: 1, clearcoat: 0 };

/** 우유 수조 (crimson metal in the studio room, seen from straight above): bubble/5's opening look (user, 2026-10-25). */
export const MILK: Partial<Visual> = { coating: [0.72, 0.015, 0.035], metalness: 1, roughness: 0.12, clearcoat: 0.35, variety: 0.15, viewTilt: 0, lightTurn: 0.875, photo: 2, photoStrength: 0.45, keyStrength: 2.6, keySize: 0.85, shadowLift: 0.18, groundLight: 1.1, edgeShadow: 0.05, colourBleed: 0, neighbourReflection: 0.9, crease: 0.35, background: [1, 1, 1], exposure: 0.85 };

/** A material's look over bubble/7's studio (크롬's ground, room, light and view): the material, its defaults, the look's own. */
export function materialLook(entry: (typeof MATERIALS)[number], look: Record<string, unknown>): Partial<Visual> {
  return { ...CHROME, material: entry.id, ...entry.defaults, ...(look as Partial<Visual>) };
}
