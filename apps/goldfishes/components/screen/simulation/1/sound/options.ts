// What the 소리 panel can choose: the parameters, their defaults and the labelled option tables.
// No audio here; the engine (sound.ts) and the panel both read it.

import type { RawKind } from "./voices/raw.ts";
import type { RealPlatform } from "./voices/real.ts";

export type Soundscape = "glass" | "metal" | "crowd" | "notify" | "hymn" | "notice";

export const SOUNDSCAPES: readonly { id: Soundscape; label: string }[] = [
  { id: "glass", label: "유리" },
  { id: "metal", label: "금속" },
  { id: "crowd", label: "군중" },
  { id: "notify", label: "알림" },
  { id: "hymn", label: "알림 2" },
  { id: "notice", label: "알림 3" },
];

/** v2's sounds (voices/raw.ts), grouped as the panel shows them. */
export type RawScape = "mixed" | RawKind;

export const RAW_GROUPS: readonly { label: string; kinds: readonly { id: RawKind; label: string }[] }[] = [
  {
    label: "SNS · 메신저",
    kinds: [
      { id: "instagram", label: "인스타" },
      { id: "messenger", label: "메신저" },
      { id: "snapchat", label: "스냅챗" },
      { id: "discord", label: "디스코드" },
      { id: "whatsapp", label: "왓츠앱" },
    ],
  },
  {
    label: "업무",
    kinds: [
      { id: "slack", label: "슬랙" },
      { id: "teams", label: "팀즈" },
      { id: "outlook", label: "아웃룩" },
      { id: "zoom", label: "줌" },
    ],
  },
  {
    label: "폰",
    kinds: [
      { id: "iphone", label: "아이폰" },
      { id: "sent", label: "보냄" },
      { id: "haptic", label: "햅틱" },
    ],
  },
];

export const RAW_KINDS: readonly RawKind[] = RAW_GROUPS.flatMap((group) => group.kinds.map((kind) => kind.id));

/** v3's platforms (voices/real.ts). */
export type RealScape = "mixed" | RealPlatform;

export const REAL_SCAPES: readonly { id: RealScape; label: string }[] = [
  { id: "mixed", label: "섞임" },
  { id: "iphone", label: "아이폰" },
  { id: "slack", label: "슬랙" },
  { id: "whatsapp", label: "왓츠앱" },
  { id: "mac", label: "맥" },
];

export type SoundParameters = {
  /** 1: the six soundscapes; 2: platforms' notifications, synthesised (voices/raw.ts); 3: their own files (voices/real.ts). */
  version: 1 | 2 | 3;
  scape: Soundscape;
  /** v2's sound. */
  raw: RawScape;
  /**
   * v2's 겹침: "clean" as above; "brutal" (user, 2026-10-28: "진짜 '브루털' 하게 알림음들의 겹침 … 모든
   * 슈가코팅 사운드 필터 빼고"): no limiter, no spacing between touches, every voice at full level,
   * clipping where they pile up.
   */
  pile: "clean" | "brutal";
  /** v3's platform. */
  real: RealScape;
  volume: number;
  /** How much reaches the room and the echoes, 0–1. */
  space: number;
  /** How often a touch breaks into stuttering grains or retriggered yells, 0–1. */
  grain: number;
};

// v3 by default (user, 2026-10-28; v2 earlier that day); within v1, 알림 2 (user, 2026-10-27).
export const SOUND_DEFAULTS: SoundParameters = { version: 3, scape: "hymn", raw: "mixed", pile: "clean", real: "mixed", volume: 0.7, space: 0.55, grain: 0.35 };
