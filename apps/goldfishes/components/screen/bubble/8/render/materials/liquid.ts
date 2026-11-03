// 액체 (bubble/8): the bubbles' liquid — water, drops, films (render/film.ts holds its references and properties).

import { FILM } from "../film";
import type { MaterialEntry } from "./surface";

const defaults = {
  filmThickness: 900,
  filmColour: 0.2,
  filmSwirl: 1,
  filmFlow: 1,
  filmBody: 0.15,
  filmLens: 1,
  filmDye: 0,
  filmSheen: 0.03,
  filmEdge: 0.9,
  filmDome: 0.45,
  filmRipple: 0.9,
  filmRound: 0.85,
};

export const LIQUID_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 1,
  family: "liquid",
  familyLabel: "액체",
  colourLabel: "액체",
  glsl: FILM + /* glsl */ `
vec3 liquidOf(Surface s) {
  return filmOf(s.o, s.nS, s.turn, s.q, s.qTurn, s.seed * 37.0, s.radius, s.edge, s.relief, s.behind, s.albedo, max(filmDye, s.dyed * 0.85), s.melt);
}
`,
  call: "liquidOf",
  defaults,
  controls: [
    { key: "filmBody", label: "몸 (막의 결)", min: 0, max: 1, step: 0.01 },
    { key: "filmLens", label: "렌즈 (깊이: 0 얇은 막 · 1 물방울)", min: 0, max: 1, step: 0.01 },
    { key: "filmRipple", label: "물결 (표면 일렁임)", min: 0, max: 1.5, step: 0.01 },
    { key: "filmThickness", label: "막 두께 (nm)", min: 200, max: 2000, step: 10 },
    { key: "filmColour", label: "간섭색", min: 0, max: 1, step: 0.01 },
    { key: "filmSwirl", label: "소용돌이", min: 0, max: 3, step: 0.05 },
    { key: "filmFlow", label: "막 흐름 속도", min: 0, max: 3, step: 0.05 },
    { key: "filmDye", label: "색 (흡수)", min: 0, max: 1, step: 0.01 },
    { key: "filmSheen", label: "광택 (정면 반사)", min: 0, max: 1, step: 0.01 },
    { key: "filmEdge", label: "가장자리 (메니스커스)", min: 0, max: 1.5, step: 0.01 },
    { key: "filmDome", label: "돔 깊이", min: 0.05, max: 1, step: 0.01 },
    { key: "filmRound", label: "구면 (0 납작한 막 · 1 둥근 방울)", min: 0, max: 1, step: 0.01 },
  ],
  looks: [
    { id: "liquid", label: "물방울", look: { coating: [1, 1, 1], coatingMix: 0 } },
    { id: "liquid-film", label: "얇은 막", look: { coating: [1, 1, 1], coatingMix: 0, filmLens: 0, filmBody: 0.6, filmEdge: 0.8, filmSheen: 0.06, filmRipple: 0.35, filmRound: 0.6 } },
    { id: "liquid-dyed", label: "물든 막", look: { coatingMix: 1, filmDye: 0.7 } },
    // SCC bubble/1's films on black, chosen only here (the ground stays white otherwise).
    {
      id: "soap",
      label: "비눗막 · 검정 (SCC bubble/1)",
      look: { background: [0, 0, 0], viewTilt: 0, lightTurn: 0.875, photoStrength: 0, keyStrength: 0.9, keySize: 0.05, shadowLift: 0, groundLight: 0, edgeShadow: 0, roughness: 0.1, variety: 0.3, exposure: 1, filmThickness: 800, filmColour: 0.3, filmSwirl: 1.5, filmRound: 0, filmRipple: 0.15, filmEdge: 0.45, filmBody: 0, filmLens: 0, filmSheen: 0.12 },
    },
  ],
};
