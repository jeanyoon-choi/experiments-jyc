// 소리 v3 · 실제 알림음 (user, 2026-10-28): v2's notifications, synthesised after the
// platforms', came out sugar-coated, cuter than the real ones ("real world notification 의
// exact replica 가 아니라 sugar coated … 제발 소리 좀 raw 한 소리로"). v3 plays the platforms'
// own files, as they ship: no synthesis, no pitch, no pan, no envelope, at their own level.
//
// The files are taken from this Mac's installs and only converted to WAV (afconvert, 16-bit,
// the source's own rate), under public/assets/goldfishes/audio/bubble-7/:
//   - iphone/: iOS's alert tones (ToneLibrary.framework): Rebound (the default since iOS 17),
//     Tri-tone, Note, a received message, three tapbacks;
//   - slack/: Slack.app's notification sounds, knock brush its default;
//   - whatsapp/: WhatsApp.app's incoming message, long and short;
//   - mac/: macOS's alert sounds (/System/Library/Sounds).
// They are the platforms' copyrighted sounds, so the folder is git-ignored: they stay on this
// machine. Teams, Discord, Instagram, Messenger and Snapchat ship theirs from the web, so
// none were on disk; they join when their files are added here.

export type RealPlatform = "iphone" | "slack" | "whatsapp" | "mac";
export type RealScape = "mixed" | RealPlatform;

export const REAL_FILES: Record<RealPlatform, readonly string[]> = {
  iphone: ["rebound", "tri-tone", "note", "received-message", "tapback-heart", "tapback-thumbs-up", "tapback-haha"],
  slack: ["knock-brush", "boop", "hummus", "here-you-go-lighter", "b2", "animal-stick"],
  whatsapp: ["incoming", "incoming-short"],
  mac: ["glass", "ping", "pop", "tink", "purr", "blow"],
};

export const REAL_PLATFORMS: readonly RealPlatform[] = ["iphone", "slack", "whatsapp", "mac"];

export const REAL_SCAPES: readonly { id: RealScape; label: string }[] = [
  { id: "mixed", label: "섞임" },
  { id: "iphone", label: "아이폰" },
  { id: "slack", label: "슬랙" },
  { id: "whatsapp", label: "왓츠앱" },
  { id: "mac", label: "맥" },
];

export const realUrl = (platform: RealPlatform, name: string) => `/assets/goldfishes/audio/bubble-7/${platform}/${name}.wav`;
