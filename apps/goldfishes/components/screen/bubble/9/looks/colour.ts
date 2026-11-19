import type { Colour } from "../render/foam";

export function toHex(colour: Colour) {
  return `#${colour.map((value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function fromHex(hex: string): Colour {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
