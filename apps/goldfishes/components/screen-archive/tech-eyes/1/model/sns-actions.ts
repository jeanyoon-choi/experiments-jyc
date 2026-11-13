export const snsActions = [
  { id: "like", label: "Like", viewBox: "26 94 88 78", colour: "#ed4956" },
  { id: "comment", label: "Comment", viewBox: "270 94 82 78", colour: "#0095f6" },
  { id: "repost", label: "Repost", viewBox: "448 91 72 85", colour: "#00ba7c" },
  { id: "send", label: "Send", viewBox: "562 94 87 79", colour: "#aeb6bc" },
] as const;

export type SnsActionColour = "monochrome" | "colour";

export function snsActionAt(index: number) {
  return snsActions[((index % snsActions.length) + snsActions.length) % snsActions.length]!;
}
