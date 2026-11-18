// What the option panels show, as data: the versions to step between and each panel's controls. The labels, ranges
// and steps are the gallery's own (../docs/model/goldfishes-all-versions.html#m91), so a value set here is the value
// the model document speaks of. Adding a control is an edit here.

import { PRESETS, type Parameters } from "./model.ts";

export type VersionId = keyof typeof PRESETS;

/** The versions that are this engine under other conditions, in the order they were made; ‹ › and [ ] step through them. */
export const VERSIONS: readonly { id: VersionId; name: string }[] = [
  { id: "M8", name: "닿은 버블만" },
  { id: "M8.1", name: "나을 때만 옮김" },
  { id: "M8.2", name: "넘치면 터짐" },
  { id: "M9", name: "드나드는 금붕어" },
  { id: "M9.1", name: "자리 차이 없앰" },
];

const KEYS = Object.keys(PRESETS.M9) as (keyof Parameters)[];

/** Which version the values now are, or null once one has been moved. */
export function versionOf(parameters: Parameters): VersionId | null {
  return VERSIONS.find(({ id }) => KEYS.every((key) => PRESETS[id][key] === parameters[key]))?.id ?? null;
}

/** A slider, or (with `choices`) a pair of chips for a condition that is 0 or 1. */
export type Control = { key: keyof Parameters; label: string } & ({ min: number; max: number; step: number } | { choices: readonly [off: string, on: string] });

export type PanelId = "fish" | "bubble" | "audience";

type Group = { title?: string; controls: readonly Control[] };

export const PANELS: readonly { id: PanelId; label: string; note: string; groups: readonly Group[] }[] = [
  {
    id: "fish",
    label: "금붕어",
    note: "덜 지루한 것을 찾습니다. 자기 버블과 거기 닿은 버블만 봅니다",
    groups: [
      {
        controls: [
          { key: "look", label: "버블 하나를 다시 보는 빈도 (/초)", min: 0.01, max: 3, step: 0.01 },
          { key: "alpha", label: "붐빔에 끌림", min: 0, max: 5, step: 0.05 },
          { key: "speed", label: "속도", min: 0.02, max: 0.6, step: 0.01 },
        ],
      },
      {
        title: "익숙해짐",
        controls: [
          { key: "keywordBore", label: "키워드에 익숙해지는 속도", min: 0, max: 1, step: 0.005 },
          { key: "shapeBore", label: "모양에 익숙해지는 속도", min: 0, max: 3, step: 0.01 },
          { key: "keywordForget", label: "키워드 익숙함이 풀리는 속도", min: 0, max: 0.2, step: 0.001 },
          { key: "shapeForget", label: "모양 익숙함이 풀리는 속도", min: 0, max: 0.5, step: 0.005 },
        ],
      },
      {
        title: "옮기기",
        controls: [
          { key: "betterOnly", label: "옮기는 때", choices: ["주사위 (M8)", "확실히 나을 때만"] },
          { key: "theta", label: "얼마나 덜 지루해야 옮기나 (차이)", min: 0, max: 1, step: 0.01 },
          { key: "greed", label: "탐욕 (주사위일 때)", min: 0, max: 20, step: 0.1 },
        ],
      },
    ],
  },
  {
    id: "bubble",
    label: "버블",
    note: "자기 관객을 원합니다. 자기와 이웃의 금붕어 수, 이웃의 기호만 봅니다",
    groups: [
      {
        controls: [
          { key: "copy", label: "이웃을 보는 빈도 (/초)", min: 0.02, max: 3, step: 0.01 },
          { key: "mu", label: "따라 할 때 연관 키워드를 가져올 확률", min: 0, max: 0.2, step: 0.001 },
        ],
      },
      {
        title: "베끼기",
        controls: [
          { key: "losingOnly", label: "베끼는 때", choices: ["이웃이 더 붐비면 (M8)", "금붕어가 줄 때만"] },
          { key: "window", label: "줄고 있는지 비교하는 기간 (초)", min: 1, max: 30, step: 0.5 },
          { key: "lose", label: "얼마나 줄어야 줄고 있다고 보나 (비율)", min: 0, max: 0.8, step: 0.01 },
          { key: "countSwimming", label: "세는 금붕어", choices: ["도착한 금붕어만", "자기를 고른 전부 (M8.1)"] },
        ],
      },
      {
        title: "크기 · 터짐",
        controls: [
          { key: "lambda", label: "열기 식음", min: 0, max: 3, step: 0.05 },
          { key: "capacityBurst", label: "터지는 때", choices: ["이웃보다 뜨거우면 (M8)", "담는 수를 넘으면"] },
          { key: "capacity", label: "버블 하나가 담는 금붕어 (평균의 배)", min: 1.5, max: 20, step: 0.1 },
          { key: "burstHeat", label: "터지는 열기 (이웃 평균의 배)", min: 1.5, max: 20, step: 0.1 },
          { key: "ownSize", label: "크기", choices: ["전체 면적 고정 (M8.1)", "자기 열기로만"] },
          { key: "area", label: "버블 면적", min: 0.3, max: 1.2, step: 0.05 },
          { key: "contrast", label: "크기 대비 (1 = 넓이가 열기에 비례)", min: 1, max: 4, step: 0.1 },
        ],
      },
      {
        title: "자리 차이 (M9.1)",
        controls: [
          { key: "evenLook", label: "다시 고르는 빈도", choices: ["보이는 수에 비례", "금붕어마다 같게"] },
          { key: "evenView", label: "보는 버블", choices: ["닿은 버블", "어디서나 같은 수"] },
          { key: "view", label: "보는 옆 버블 수", min: 1, max: 12, step: 1 },
          { key: "trueContact", label: "맞닿음", choices: ["느슨하게", "진짜 닿을 때만"] },
        ],
      },
    ],
  },
  {
    id: "audience",
    label: "관객 · 시작",
    note: "화면에 손가락을 그으면 새 키워드의 버블이 놓입니다. 그것 말고는 새로운 것이 생기지 않습니다",
    groups: [
      {
        controls: [
          { key: "open", label: "금붕어 드나듦", choices: ["수 고정 (M8.2)", "획과 함께 오고 지루하면 떠남"] },
          { key: "join", label: "획 하나에 들어오는 금붕어", min: 0, max: 200, step: 1 },
          { key: "outside", label: "화면 밖의 재미 (이보다 지루하면 떠남)", min: 0, max: 0.5, step: 0.005 },
        ],
      },
      {
        title: "시작 (바꾸면 다시 시작)",
        controls: [
          { key: "fish", label: "처음 금붕어 수", min: 0, max: 1000, step: 10 },
          { key: "bubbles", label: "처음 버블 수", min: 5, max: 150, step: 5 },
          { key: "keywords", label: "처음 키워드 수", min: 1, max: 8, step: 1 },
          { key: "familiar", label: "처음 키워드에 이미 익숙한 정도", min: 0, max: 0.99, step: 0.01 },
        ],
      },
    ],
  },
];

/** The values a world is made from: moving one starts the screen again; every other value acts on the running one. */
export const AT_START: ReadonlySet<keyof Parameters> = new Set(["fish", "bubbles", "keywords", "familiar"]);

/** Decimals a value is shown with, from its slider's step. */
export const digitsOf = (step: number) => (step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3);
