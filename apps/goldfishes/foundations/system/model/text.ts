import type { Lang, Text } from "./types.ts";

/** A sentence in both languages. */
export function both(ko: string, en: string): Text {
  return { ko, en };
}

export function say(text: Text | undefined, lang: Lang): string {
  if (text === undefined) return "";
  return typeof text === "string" ? text : text[lang];
}

/** "v2.1" → "v2". */
export function major(id: string) {
  return id.split(".")[0];
}
