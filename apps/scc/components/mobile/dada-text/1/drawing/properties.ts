import { property } from "../marks";
import type { Paint } from "../reading/paint";
import { cellUrl } from "./cell-image";
import { palette, type Look } from "./look";

const px = (value: number) => `${Math.round(value * 100) / 100}px`;
const sides = ["top", "right", "bottom", "left"] as const;

/**
 * A paint as values of the element's own (non-inherited) custom properties, which `sheet.css` turns into its background,
 * shadow and border colours. Setting them restyles that element only.
 */
export function cellProperties(paint: Paint, look: Look): Record<string, string> {
  const { paper, frame, stroke } = palette(look);
  // A frame is an inset shadow at the chosen weight. Original border sides keep their own width in the frame colour, and are
  // thickened beyond it by an inset shadow on that side alone, so no box changes size.
  const shadows: string[] = [];
  if (paint.frame && stroke) shadows.push(`inset 0 0 0 ${px(stroke)} ${frame}`);
  if (stroke > 1) {
    const extra = px(stroke - 1);
    const inward = { top: `inset 0 ${extra} 0 0`, bottom: `inset 0 -${extra} 0 0`, left: `inset ${extra} 0 0 0`, right: `inset -${extra} 0 0 0` };
    for (const side of paint.borders) shadows.push(`${inward[side as keyof typeof inward]} ${frame}`);
  }
  const properties: Record<string, string> = {
    [property("fill")]: paint.fill ? paper : "transparent",
    [property("frame")]: shadows.join(", ") || "none",
    [property("image")]: paint.layers.length ? paint.layers.map((layer) => cellUrl(layer.cell, look)).join(", ") : "none",
    [property("position")]: paint.layers.map((layer) => ("whole" in layer ? "0 0" : `${px(layer.x)} ${px(layer.y)}`)).join(", ") || "0 0",
    [property("size")]: paint.layers.map((layer) => ("whole" in layer ? "100% 100%" : `${px(layer.w)} ${px(layer.h)}`)).join(", ") || "auto",
    [property("origin")]: paint.local ? "padding-box" : "border-box",
    [property("attachment")]: paint.local ? "local" : "scroll",
  };
  for (const side of sides) properties[property(`border-${side}`)] = paint.borders.includes(side) ? frame : "transparent";
  return properties;
}
