// 소리 v2 · 날것 (user, 2026-10-28): v1's soundscapes were "너무 다 멜로딕하고 ai slop
// … 너무 마리네이션이 많이됨". v2 keeps the engine's logic — a touch, a page's own voice,
// its rank, its pan, 부서짐 — and drops everything laid on top: no chord, no harmony, no
// room, no echo. A touch is one notification, as it is.
//
// Which notifications: today's smartphone and SNS platforms', one per platform (user,
// 2026-10-28: "현대적인 2020년대 스마트폰의 알림음, notification, sns 시대, 어떤 각 플랫폼별
// 알림음"). A fish touching a page is attention landing on content, and that is what a
// notification is. The first v2 was the 2000s feature phone's beeps, keypad and clicks,
// which the user threw out. Each is synthesised after the platform's sound, not sampled,
// at its own pitch. The work is not for a Korean audience only, so no one country's
// platform (KakaoTalk was tried and dropped, user, 2026-10-28).
//
// SNS and messengers (user, 2026-10-28, asking for more: "또 다른 sns?"):
//   - 인스타: the Instagram DM's bubbly blip sliding up, then a higher one;
//   - 메신저: Messenger's single round pop;
//   - 스냅챗: Snapchat's chirp, a bird-like sweep up and back, twice;
//   - 디스코드: Discord's message ping, a round two-note bwop;
//   - 왓츠앱: WhatsApp's quick double pop.
// Work (user: "팀즈나 기타 다른 productivity app"):
//   - 슬랙: Slack's knock-brush, two wooden knocks and a brush;
//   - 팀즈: Teams' warm two-note bell, falling;
//   - 아웃룩: Outlook's new-mail ding, one glassy strike;
//   - 줌: Zoom's someone-joined chime, two tones rising.
// The phone itself:
//   - 아이폰: iOS's text tone, two soft mallet notes bouncing up (Rebound);
//   - 보냄: the iMessage send whoosh;
//   - 햅틱: the phone's short taptic buzzes.
// TikTok, X and Notion have no notification of their own to speak of; they are left out.

import { addClick, addMode, bandpass, fadeOut, midiToHz, normalise, random, SYNTH_RATE } from "./synth.ts";

export type RawKind =
  | "instagram"
  | "messenger"
  | "snapchat"
  | "discord"
  | "whatsapp"
  | "slack"
  | "teams"
  | "outlook"
  | "zoom"
  | "iphone"
  | "sent"
  | "haptic";
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

const samples = (seconds: number) => Math.floor(seconds * SYNTH_RATE);

/** A sine from `from` gliding to `to` Hz over `glide` s, 2 ms attack, decaying with `decay`, added at `start`. */
function blip(out: Float32Array, from: number, to: number, glide: number, decay: number, level: number, start: number) {
  const first = samples(start);
  const length = Math.min(out.length - first, samples(decay * 7));
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const t = index / SYNTH_RATE;
    const frequency = t < glide ? from * (to / from) ** (t / glide) : to;
    phase += (2 * Math.PI * frequency) / SYNTH_RATE;
    out[first + index]! += Math.sin(phase) * level * Math.min(1, t / 0.002) * Math.exp(-t / decay);
  }
}

/** A soft mallet on a bar: its first two modes and a touch of the strike. */
function mallet(out: Float32Array, frequency: number, decay: number, level: number, start: number) {
  addMode(out, frequency, level, decay, start);
  addMode(out, frequency * 3.93, level * 0.12, decay * 0.25, start);
  addClick(out, Math.round(frequency), frequency * 2, 1.5, level * 0.15, 0.002, start);
}

function iphone() {
  const out = new Float32Array(samples(0.55));
  mallet(out, midiToHz(84), 0.14, 1, 0);
  mallet(out, midiToHz(91), 0.18, 0.85, 0.075);
  return out;
}

function instagram() {
  const out = new Float32Array(samples(0.4));
  blip(out, 520, 1050, 0.045, 0.06, 1, 0);
  blip(out, 900, 1600, 0.03, 0.07, 0.7, 0.09);
  return out;
}

function slack() {
  const out = new Float32Array(samples(0.42));
  for (const at of [0, 0.085]) {
    addMode(out, 620, 1, 0.025, at);
    addMode(out, 1480, 0.45, 0.012, at);
    addClick(out, Math.round(at * 1000) + 1, 1200, 1.2, 0.5, 0.003, at);
  }
  // The brush: noise swelling and fading through a high band.
  const brush = new Float32Array(samples(0.16));
  const next = random(17);
  for (let index = 0; index < brush.length; index += 1) {
    const t = index / brush.length;
    brush[index] = (next() * 2 - 1) * Math.sin(Math.PI * t) ** 2;
  }
  bandpass(brush, 4500, 1.2);
  const first = samples(0.2);
  for (let index = 0; index < brush.length; index += 1) out[first + index]! += brush[index]! * 0.8;
  return out;
}

function discord() {
  const out = new Float32Array(samples(0.4));
  blip(out, 700, 760, 0.02, 0.07, 1, 0);
  blip(out, 1080, 1020, 0.02, 0.09, 0.8, 0.07);
  return out;
}

function whatsapp() {
  const out = new Float32Array(samples(0.28));
  blip(out, 380, 900, 0.02, 0.03, 1, 0);
  blip(out, 480, 1150, 0.02, 0.035, 0.9, 0.075);
  return out;
}

function sent() {
  const out = new Float32Array(samples(0.36));
  const next = random(29);
  for (let index = 0; index < out.length; index += 1) {
    const t = index / out.length;
    out[index] = (next() * 2 - 1) * Math.sin(Math.PI * t ** 0.6) ** 2;
  }
  // Swept up in slices: a rising band.
  const slice = samples(0.02);
  for (let start = 0; start < out.length; start += slice) {
    const part = out.subarray(start, Math.min(out.length, start + slice));
    bandpass(part, 600 * 2 ** ((3 * start) / out.length), 2.5);
  }
  return out;
}

function messenger() {
  const out = new Float32Array(samples(0.22));
  blip(out, 300, 720, 0.03, 0.045, 1, 0);
  blip(out, 1440, 1440, 0, 0.02, 0.15, 0.004);
  return out;
}

function snapchat() {
  const out = new Float32Array(samples(0.34));
  for (const at of [0, 0.13]) {
    const first = samples(at);
    const length = samples(0.09);
    let phase = 0;
    for (let index = 0; index < length; index += 1) {
      const t = index / length;
      // Up and back, like a bird's chirp.
      phase += (2 * Math.PI * (1500 + 1700 * Math.sin(Math.PI * t))) / SYNTH_RATE;
      out[first + index]! += Math.sin(phase) * Math.sin(Math.PI * t) ** 0.5;
    }
  }
  return out;
}

/** A warm bell: a mallet with its second mode at 2.76, as a struck plate. */
function bell(out: Float32Array, frequency: number, decay: number, level: number, start: number) {
  addMode(out, frequency, level, decay, start);
  addMode(out, frequency * 2.76, level * 0.25, decay * 0.4, start);
  addMode(out, frequency * 5.4, level * 0.06, decay * 0.15, start);
}

function teams() {
  const out = new Float32Array(samples(0.9));
  bell(out, midiToHz(79), 0.22, 1, 0);
  bell(out, midiToHz(75), 0.28, 0.9, 0.13);
  return out;
}

function outlook() {
  const out = new Float32Array(samples(0.9));
  addMode(out, midiToHz(88), 1, 0.3);
  addMode(out, midiToHz(88) * 2.41, 0.3, 0.12);
  addMode(out, midiToHz(88) * 4.1, 0.1, 0.05);
  addClick(out, 41, 6000, 1.5, 0.2, 0.0015);
  return out;
}

function zoom() {
  const out = new Float32Array(samples(0.75));
  blip(out, 659, 659, 0, 0.12, 1, 0);
  blip(out, 988, 988, 0, 0.16, 0.9, 0.16);
  return out;
}

function haptic() {
  const out = new Float32Array(samples(0.26));
  for (const at of [0, 0.13]) {
    const first = samples(at);
    const length = samples(0.07);
    for (let index = 0; index < length; index += 1) {
      const t = index / SYNTH_RATE;
      out[first + index]! += Math.tanh(2.5 * Math.sin(2 * Math.PI * 230 * t)) * Math.min(1, t / 0.004, (length - index) / samples(0.01));
    }
  }
  return out;
}

const RENDER: Record<RawKind, () => Float32Array> = {
  instagram,
  messenger,
  snapchat,
  discord,
  whatsapp,
  slack,
  teams,
  outlook,
  zoom,
  iphone,
  sent,
  haptic,
};

/**
 * One platform's notification, arriving `count` times in a row (notifications piling up); level-matched.
 * `brutal`: the copies land on top of one another, nothing smooths its end, and it peaks at full scale.
 */
export function rawVoice(kind: RawKind, count: number, brutal = false) {
  const one = RENDER[kind]();
  const spacing = brutal ? 0.07 : Math.min(0.32, Math.max(0.16, one.length / SYNTH_RATE));
  const times = Math.max(1, count);
  const out = new Float32Array(samples(spacing * (times - 1)) + one.length);
  for (let time = 0; time < times; time += 1) {
    const first = samples(spacing * time);
    for (let index = 0; index < one.length; index += 1) out[first + index]! += one[index]!;
  }
  if (brutal) return normalise(out, 1);
  fadeOut(out, 0.004);
  return normalise(out);
}
