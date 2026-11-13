// A hype event as a LinkedIn post (Greed, NOTES 1017): the humblebrag —
// "I'm thrilled to announce…", "Here's what X taught me about B2B sales".
// Pure: every variation comes from the post's pick.

import type { HypeEvent } from "../../content/events";
import type { AppPost } from "../types";

export type LinkedInPost = {
  name: string;
  degree: string;
  headline: string;
  age: string;
  body: string;
  media: "document" | "link";
  documentTitle: string;
  pages: number;
  linkTitle: string;
  linkSource: string;
  reactions: string;
  comments: number;
  reposts: number;
  /** Which three reaction glyphs lead the count, most first. */
  stack: readonly Reaction[];
  hue: number;
};

export type Reaction = "like" | "celebrate" | "insightful" | "love" | "support";

const TAGLINES = ["", " | Speaker | Advisor", " | Building in public", " | 2x Founder", " | Top Voice", " | Ex-FAANG"];
const AGES = ["1m", "12m", "1h", "3h", "5h", "1d"];

const clean = (text: string) => text.replace(/[.!]$/, "");
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const hashtags = (event: HypeEvent) => event.tags.map((tag) => `#${tag.replace(/[^A-Za-z0-9]/g, "")}`).join(" ");

const BODIES: readonly ((event: HypeEvent, label: string) => string)[] = [
  (e) => `I'm thrilled to announce that ${lower(clean(e.headline))}. 🚀\n\n${e.dek}\n\n${e.figures.join(". ")}.\n\nNone of this would have been possible without the incredible team at ${e.org}. Grateful. Humbled. Hiring.\n\n${hashtags(e)}`,
  (e, label) => `Here's what ${label} taught me about B2B sales 🧵\n\n1. ${e.figures[0]} isn't a number. It's a mindset.\n2. ${e.figures[1] ?? "Every no"}? That's just pipeline.\n3. ${e.figures[2] ?? "Show up"}. Every single day.\n\nAgree? ♻️ Repost to help someone in your network.`,
  (e) => `I almost didn't post this.\n\n${clean(e.headline)}.\n\nMost people would see a crisis. I see ${e.figures[0]} of opportunity. That's the difference between a job and a calling.\n\n${hashtags(e)}`,
  (e, label) => `Humbled and honoured to share some personal news 🙏\n\nAfter 6 incredible weeks, I'm stepping into a new chapter in ${label}. ${e.dek}\n\nThe journey is the destination. Let's connect.`,
  (e) => `Unpopular opinion: ${lower(clean(e.dek))}. And that's a good thing.\n\nAt ${e.org} we call it "${e.figures[1] ?? e.figures[0]}". Our competitors call it a problem.\n\nThoughts? 👇`,
];

const DOCUMENTS: readonly ((event: HypeEvent, label: string) => string)[] = [
  (_, label) => `7 lessons ${label} taught me about leadership`,
  (e) => `${e.figures[0]}: the playbook nobody talks about`,
  (_, label) => `The ${label} framework that 10x'd our pipeline`,
  (e) => `How ${e.org} scaled to ${e.figures[e.figures.length - 1] ?? e.figures[0]}`,
];

const KEYWORD_HUES: Record<string, number> = { sparkle: 262, cloud: 205, gpu: 145, robot: 24, humanoid: 190, robotDog: 36, roadster: 355, headset: 295, ape: 46, rocket: 14, chat: 214, spinner: 228, heart: 342, like: 210, comment: 270 };

const STACKS: readonly (readonly Reaction[])[] = [
  ["like", "celebrate", "insightful"],
  ["like", "celebrate", "love"],
  ["celebrate", "like", "support"],
  ["like", "insightful", "celebrate"],
];

function slug(org: string) {
  return `${org.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
}

function thousands(value: number) {
  return value.toLocaleString("en-US");
}

export function linkedInPostOf(post: AppPost, index: number): LinkedInPost {
  const { event, label, pick } = post;
  const role = event.person.role;
  const headline = (role.includes(event.org) ? role : `${role} · ${event.org}`) + TAGLINES[Math.floor(pick(21) * TAGLINES.length)]!;
  const reactionCount = Math.floor(80 + pick(22) * pick(23) * 9800);
  return {
    name: event.person.name,
    degree: pick(24) < 0.7 ? "1st" : "2nd",
    headline,
    age: AGES[Math.min(AGES.length - 1, index + Math.floor(pick(25) * 2))]!,
    body: BODIES[Math.floor(pick(26) * BODIES.length)]!(event, label),
    media: pick(27) < 0.5 ? "document" : "link",
    documentTitle: DOCUMENTS[Math.floor(pick(28) * DOCUMENTS.length)]!(event, label),
    pages: 8 + Math.floor(pick(29) * 14),
    linkTitle: event.headline,
    linkSource: `${slug(event.org)} • ${2 + Math.floor(pick(30) * 7)} min read`,
    reactions: thousands(reactionCount),
    comments: Math.floor(reactionCount * (0.04 + pick(31) * 0.12)),
    reposts: Math.floor(reactionCount * (0.01 + pick(32) * 0.05)),
    stack: STACKS[Math.floor(pick(33) * STACKS.length)]!,
    hue: KEYWORD_HUES[event.keyword] ?? 210,
  };
}

export function monogram(org: string) {
  const words = org.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0]![0]! + words[1]![0]! : org.slice(0, 2)).toUpperCase();
}
