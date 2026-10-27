// A hype event as an Apple News story: which fictional outlet runs it, how
// long ago, and the editorial graphic it gets when there is no photo.
// Outlets are invented; their wordmarks are typeset in news.module.css.

import { imageFor } from "../../content/images";
import type { AppPost } from "../types";

export type Outlet = { id: string; name: string };

export const OUTLETS: readonly Outlet[] = [
  { id: "meridian", name: "The Daily Meridian" },
  { id: "circuitry", name: "Circuitry" },
  { id: "bitstream", name: "bitstream" },
  { id: "ledger", name: "The Ledger Review" },
  { id: "harbor", name: "Harbor & Main" },
  { id: "signal", name: "Signal/Noise" },
  { id: "sentinel", name: "The Sentinel-Courier" },
  { id: "margin", name: "Forward Margin" },
];

/** Editorial colourways for the typographic stand-in image. */
const ART: readonly [string, string, string][] = [
  ["#0f2a4a", "#1f5f8b", "#7cc4ff"],
  ["#3b0d2c", "#a3214f", "#ffb3c7"],
  ["#10302a", "#1f7a5c", "#a6f0cf"],
  ["#2a1a05", "#b8641a", "#ffd79a"],
  ["#1b1340", "#5a3fd1", "#c8bcff"],
  ["#2b0b0b", "#c0352b", "#ffc2a8"],
  ["#0d1f1f", "#2a7f86", "#b4f1f0"],
  ["#1e1e24", "#4b4b58", "#f0d36b"],
];

export type Story = {
  outlet: Outlet;
  headline: string;
  dek: string;
  age: string;
  image?: string;
  art: { from: string; to: string; ink: string; figure: string; kicker: string };
};

/** Apple News ages: "12m ago", "2h ago", then "Yesterday". */
function ageOf(post: AppPost, newest: AppPost): string {
  const lead = 6 + Math.floor(newest.pick(41) * 150);
  const minutes = lead + Math.max(0, Math.round((newest.item.at - post.item.at) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
  return "Yesterday";
}

export function storyOf(post: AppPost, newest: AppPost): Story {
  const { event } = post;
  const [from, to, ink] = ART[Math.floor(post.pick(42) * ART.length)]!;
  return {
    outlet: OUTLETS[Math.floor(post.pick(43) * OUTLETS.length)]!,
    headline: event.headline,
    dek: event.dek,
    age: ageOf(post, newest),
    image: imageFor(event.image),
    art: { from, to, ink, figure: event.figures[0] ?? post.label, kicker: event.tags[0] ?? post.label },
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The Today header's date, from the newest post's time. */
export function dateOf(at: number): string {
  const date = new Date(at);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
