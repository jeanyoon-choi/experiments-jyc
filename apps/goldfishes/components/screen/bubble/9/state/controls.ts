// The tables the network, goldfish and sound panels draw their sliders from (the visual panel's are looks/controls.ts;
// the objects', the liquid's and 전파's sit beside their own code).

import type { FishParameters } from "../fish/goldfish";
import type { LifeParameters } from "../fish/lifecycle";
import type { SliderControl } from "../ui/controls";
import type { Feedback } from "./schema";

export const MIN_PAGES = 20;

/** 흐름 버블's slider (네트워크, its first fold; it was 비주얼 → 라프트's until 2026-11-12): what it shows is the web's flow, not a look. */
export const FLOW_CONTROL = { label: "흐름 버블 양 (적을수록 많이)", min: 0, max: 10, step: 0.05 } as const;

// Goldfish

export const FISH_CONTROLS: readonly SliderControl<keyof FishParameters>[] = [
  { key: "scale", label: "크기", min: 0.4, max: 2, step: 0.05 },
  { key: "speed", label: "속도", min: 0.25, max: 3, step: 0.05 },
  { key: "follow", label: "링크를 따라 헤엄칠 확률", min: 0, max: 1, step: 0.01 },
  { key: "novelty", label: "새 페이지에 끌림", min: 0, max: 3, step: 0.05 },
  { key: "habituation", label: "싫증", min: 0, max: 3, step: 0.05 },
  { key: "span", label: "주의 지속 (초)", min: 0.5, max: 8, step: 0.1 },
  { key: "schooling", label: "무리 짓기", min: 0, max: 2, step: 0.05 },
  { key: "patrol", label: "가장자리 오가기", min: 0, max: 2, step: 0.05 },
];

export const FEEDBACK_CONTROLS: readonly SliderControl<keyof Feedback>[] = [
  { key: "influence", label: "품질에 주는 영향", min: 0, max: 20, step: 0.01 },
  { key: "ceiling", label: "영향 상한", min: 0, max: 10, step: 0.1 },
  { key: "perFish", label: "무리 크기 반영 (0 나눠 갖기 · 1 한 마리씩)", min: 0, max: 1, step: 0.01 },
];

// Lifecycle

/** 생애주기's sliders (fish/lifecycle.ts); 켜기 · 끄기 is a pair of chips. */
export const LIFE_CONTROLS: readonly SliderControl<Exclude<keyof LifeParameters, "enabled" | "tint">>[] = [
  { key: "lifespan", label: "수명 (컨텐츠를 볼 수 있는 시간, 초)", min: 2, max: 60, step: 0.5 },
  { key: "idleWear", label: "보지 않고 헤엄칠 때 닳는 정도", min: 0, max: 1, step: 0.01 },
  { key: "spread", label: "수명의 개체차", min: 0, max: 1, step: 0.01 },
  { key: "tintRate", label: "본 구슬 색으로 물드는 속도", min: 0, max: 3, step: 0.05 },
  { key: "fadeAt", label: "죽기 전 미리 회색이 되는 남은 기력 (0 죽는 순간)", min: 0, max: 0.8, step: 0.01 },
  { key: "sinkSpeed", label: "떨어지는 속도 (px/초)", min: 10, max: 500, step: 1 },
  { key: "crushDistance", label: "버블에 밀려 죽는 거리 (px, 0 끔)", min: 0, max: 60, step: 1 },
  { key: "waveEvery", label: "새로 오는 주기 (초)", min: 1, max: 30, step: 0.5 },
];

// Sound

type SoundSlider = SliderControl<"volume" | "space" | "grain">;

export const SOUND_CONTROLS: readonly SoundSlider[] = [
  { key: "volume", label: "음량", min: 0, max: 1, step: 0.01 },
  { key: "space", label: "공간 (잔향 · 메아리)", min: 0, max: 1, step: 0.01 },
  { key: "grain", label: "부서짐 (끊기는 알갱이 · 되풀이되는 고함 · 쌓이는 알림)", min: 0, max: 1, step: 0.01 },
];

/** v2 is dry: no room, no echoes. */
export const SOUND_RAW_CONTROLS: readonly SoundSlider[] = [
  { key: "volume", label: "음량", min: 0, max: 1, step: 0.01 },
  { key: "grain", label: "부서짐 (연타)", min: 0, max: 1, step: 0.01 },
];
