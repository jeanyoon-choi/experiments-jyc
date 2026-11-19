// The visual panel's tables: its sliders by group, the rooms, the colour pickers.

import { MATERIALS, materialOf } from "../render/materials";
import type { Visual } from "../state/schema";
import type { SliderControl } from "../ui/controls";

export type NumericKey = { [K in keyof Visual]: Visual[K] extends number ? K : never }[keyof Visual];

/** A titled group of sliders; `material` shows it only under that material (a material's id, or "koons" for the coat). */
export type SliderGroup = { title: string; material?: number | "koons"; controls: readonly SliderControl<NumericKey>[] };

const BASE_SLIDER_GROUPS: readonly SliderGroup[] = [
  {
    title: "코팅",
    material: "koons",
    controls: [
      { key: "metalness", label: "금속성 (0 래커 · 1 금속)", min: 0, max: 1, step: 0.01 },
      { key: "roughness", label: "거칠기", min: 0, max: 1, step: 0.01 },
      { key: "clearcoat", label: "클리어코트", min: 0, max: 1, step: 0.01 },
      { key: "variety", label: "구슬마다 차이", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "빛",
    controls: [
      { key: "viewTilt", label: "시점 (0 위에서 · 1 옆에서)", min: 0, max: 1, step: 0.01 },
      { key: "lightTurn", label: "빛 방향", min: 0, max: 1, step: 0.005 },
      { key: "photoStrength", label: "환경 사진 밝기", min: 0, max: 3, step: 0.01 },
      { key: "keyStrength", label: "주광 세기", min: 0, max: 5, step: 0.05 },
      { key: "keySize", label: "주광 크기 (0 작고 선명 · 1 크고 부드럽게)", min: 0, max: 1, step: 0.01 },
      { key: "shadowLift", label: "어두운 곳 밝기", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "바닥",
    controls: [
      { key: "groundLight", label: "바닥 반사 (테두리)", min: 0, max: 2, step: 0.01 },
      { key: "edgeShadow", label: "가장자리 그림자 (0 없음)", min: 0, max: 1, step: 0.01 },
      { key: "colourBleed", label: "색 번짐 (0 없음)", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "라프트",
    controls: [
      { key: "neighbourReflection", label: "이웃 반사", min: 0, max: 1, step: 0.01 },
      { key: "crease", label: "맞닿은 틈", min: 0, max: 1, step: 0.01 },
      { key: "area", label: "버블 면적", min: 0.1, max: 1.2, step: 0.01 }, // max 1.2 (user, 2026-11-07; was 0.6)
      { key: "exposure", label: "노출", min: 0.3, max: 2.5, step: 0.01 },
    ],
  },
];

/** The coat's and light's sliders, then each material's own (render/materials), shown under that material. */
export const SLIDER_GROUPS: readonly SliderGroup[] = [
  ...BASE_SLIDER_GROUPS.slice(0, 1),
  ...MATERIALS.filter((entry) => entry.controls.length > 0).map((entry) => ({
    title: entry.familyLabel,
    material: entry.id,
    controls: entry.controls as readonly SliderControl<NumericKey>[],
  })),
  ...BASE_SLIDER_GROUPS.slice(1),
];

/** 환경: a photographed room's light (foam.ts LIGHT_FILES), or a portrait hung on the camera's side (FACE_ENVIRONMENT). */
export const PHOTO_ROOMS = [
  { mode: 0, label: "로프트" },
  { mode: 1, label: "흐린 하늘" },
  { mode: 2, label: "스튜디오" },
  { mode: 3, label: "밤 도시" },
  { mode: 4, label: "숲" },
  { mode: 5, label: "호숫가" },
  { mode: 6, label: "일론 머스크" },
] as const;

/** What choosing a colour under a material also sets so that it takes (젤: 코팅 색 사용). */
export function coatChosenOf(material: number): Partial<Visual> {
  return (materialOf(material)?.coatChosen ?? {}) as Partial<Visual>;
}

export const COLOUR_CONTROLS = [
  { key: "lightColour", label: "빛" },
  { key: "background", label: "배경 (액체)" },
] as const;
