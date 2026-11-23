import { createElement } from "react";
import { igds } from "./igds-glyphs";
import { igdsExtra, type IgdsExtraName } from "./igds-extra";

// Sourced IGDS glyphs (see igds-glyphs.ts and igds-extra.ts).
export type IconName = "heart" | "message" | "send" | "repost" | "search" | IgdsExtraName;

export function Icon({ name, filled = false, size = 24 }: { name: IconName; filled?: boolean; size?: number }) {
  const common = { "data-icon": name, width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "heart") return filled ? <svg {...common} viewBox="0 0 48 48"><path d={igds.heartFilled} /></svg> : <svg {...common}><path d={igds.heartOutline} /></svg>;
  if (name === "message") return <svg {...common}><path {...line} d={igds.comment} /></svg>;
  if (name === "repost") return <svg {...common}><path d={filled ? igds.repostDone : igds.repost} /></svg>;
  if (name === "search") return <svg {...common}><path {...line} d={igds.search} /><line {...line} {...igds.searchHandle} /></svg>;
  if (name === "send") return <svg {...common}><path {...line} d={igds.directOutline} /><line {...line} {...igds.directFold} /></svg>;
  const glyph = igdsExtra[name];
  return <svg {...common} viewBox={glyph.viewBox}>{glyph.els.map(([tag, attrs], index) => createElement(tag, { key: `${name}-${index}`, ...attrs }))}</svg>;
}
