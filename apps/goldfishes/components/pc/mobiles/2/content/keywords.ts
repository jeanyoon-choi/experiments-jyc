// The keywords this pc version knows content for, as screen/bubble/7 names
// them (its object kinds, objects/objects.ts OBJECT_SETS). Used as the demo
// screen's vocabulary; a live screen announces its own, which wins. A keyword
// this list lacks is still shown, from its label (content/events.ts).

import type { FeedKeyword } from "@/components/transport/feed/1";

export const KEYWORDS: FeedKeyword[] = [
  { id: "sparkle", label: "AI", set: "tech" },
  { id: "cloud", label: "Cloud", set: "tech" },
  { id: "gpu", label: "GPU", set: "tech" },
  { id: "robot", label: "Robots", set: "tech" },
  { id: "humanoid", label: "Humanoid", set: "tech" },
  { id: "robotDog", label: "Robot dog", set: "tech" },
  { id: "roadster", label: "Tesla", set: "tech" },
  { id: "headset", label: "VR", set: "tech" },
  { id: "ape", label: "NFT", set: "tech" },
  { id: "rocket", label: "Rocket", set: "tech" },
  { id: "chat", label: "Chatbot", set: "tech" },
  { id: "spinner", label: "Loading", set: "tech" },
  { id: "heart", label: "Love", set: "sns" },
  { id: "like", label: "Likes", set: "sns" },
  { id: "comment", label: "Comments", set: "sns" },
];
