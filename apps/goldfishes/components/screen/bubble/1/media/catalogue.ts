// What the films can show: Goldfishes' media, copied in (apps share no imports).
// Photo lists are those of /screen/media-grid/1 and /screen/pillars/1–4 (cats,
// politicians — Wikimedia Commons, see the JSON ledgers; the kisses were removed,
// user 2026-10-12); the 36 tech keywords are the industry's marks on balls of
// their brand colours (tech-marks.ts; the generated photographs in
// public/images/1011/tech-keywords were rejected, 2026-10-12); the 80 tech faces are /screen/tech-eyes/1's Commons
// portraits (attribution in public/images/0908/tech-power-faces/attribution.json);
// the keywords are its abbreviation list, drawn as text.

import catSources from "./sources/cat-sources.json";
import politicianSources from "./sources/politician-sources.json";
import { techPowerFaces } from "./sources/tech-power-faces.generated";
import { TECH_MARKS } from "./tech-marks";
import { TECH_SYMBOLS, type SymbolLayer } from "./tech-symbols";

export type SurfaceId = "none" | "cat" | "politician" | "tech" | "techBubble" | "techSymbol" | "face" | "keyword" | "fullname" | "fomo" | "emoji" | "mix";

/** One layer of the media texture: a whole image, a tile of one, or a word. */
export type MediaItem =
  | { kind: "image"; id: string; url: string }
  | { kind: "tile"; id: string; url: string; column: number; row: number; columns: number; rows: number }
  | { kind: "text"; id: string; text: string; hex?: string }
  | { kind: "emoji"; id: string; glyph: string }
  | { kind: "mark"; id: string; path: string; hex: string; bubble?: boolean }
  | { kind: "symbol"; id: string; layers: readonly SymbolLayer[]; hex: string };

export const SURFACES: readonly { id: SurfaceId; label: string }[] = [
  { id: "none", label: "없음" },
  { id: "cat", label: "고양이" },
  { id: "politician", label: "정치인" },
  { id: "tech", label: "기술" },
  { id: "techBubble", label: "기술-버블" },
  { id: "techSymbol", label: "기술-상징" },
  { id: "face", label: "테크 얼굴" },
  { id: "keyword", label: "키워드" },
  { id: "fullname", label: "풀네임" },
  { id: "fomo", label: "FOMO" },
  { id: "emoji", label: "이모지" },
  { id: "mix", label: "섞음" },
];

/** FOMO by default (user, 2026-10-12; first 키워드, 2026-10-11): the words chase the trend, the photographs are a choice. */
export const DEFAULT_SURFACE: SurfaceId = "fomo";

export type KeywordFontId = "gothic" | "thin" | "condensed" | "geometric" | "serif" | "didot" | "typewriter" | "mono" | "impact";

/**
 * Faces for the keyword tiles, from fonts a Mac has. `scale` evens out the
 * widths so a word spans about the same share of the tile in each.
 * 콘덴스드 · 지오메트릭 · 디도 · 타자 are mobile/dada-text's faces (user, 2026-10-19);
 * its 그로테스크 and 모노 are already 고딕 and 모노 here.
 */
export const KEYWORD_FONTS: readonly { id: KeywordFontId; label: string; family: string; weight: number; scale: number }[] = [
  { id: "gothic", label: "고딕", family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 700, scale: 1 },
  { id: "thin", label: "가늘게", family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 300, scale: 1.05 },
  { id: "condensed", label: "콘덴스드", family: "'Avenir Next Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif", weight: 800, scale: 1.15 },
  { id: "geometric", label: "지오메트릭", family: "Futura, 'Century Gothic', 'Avenir Next', sans-serif", weight: 700, scale: 0.98 },
  { id: "serif", label: "세리프", family: "Georgia, 'Times New Roman', serif", weight: 700, scale: 0.98 },
  { id: "didot", label: "디도", family: "Didot, 'Bodoni 72', 'Bodoni MT', 'Times New Roman', serif", weight: 700, scale: 1.02 },
  { id: "typewriter", label: "타자", family: "'American Typewriter', 'Courier New', Courier, monospace", weight: 700, scale: 0.92 },
  { id: "mono", label: "모노", family: "Menlo, Monaco, 'Courier New', monospace", weight: 700, scale: 0.9 },
  { id: "impact", label: "임팩트", family: "Impact, 'Arial Narrow', sans-serif", weight: 400, scale: 1.18 },
];
export const DEFAULT_KEYWORD_FONT: KeywordFontId = "gothic";

/**
 * How the keyword tiles are drawn: face, size relative to the tile, the text's opacity on black,
 * for a text item that carries a brand colour (FOMO), whether it is drawn in 기술-버블's way,
 * and `fill` — mobile/dada-text's lettering (user, 2026-10-19): one slab of capitals, every line
 * stretched to the slab's width, instead of a word set in the middle. `flat` lays the slab flat over the disc;
 * `sphere` wraps it round the ball (user, 2026-10-19: the flat one did not read as lettering on a bubble).
 */
export type Fill = "none" | "flat" | "sphere";
export type KeywordStyle = { font: KeywordFontId; size: number; opacity: number; brand: boolean; fill: Fill };
/** Size 1 spans about half the tile; a single word's default is half that (user, 2026-10-11). */
export const KEYWORD_SIZE_RANGE = [0.2, 2] as const;
const WORD_SIZE = 0.5;
/** Choosing a surface drawn as phrases sets 글자 크기 to its own default: 0.8 (user, 2026-10-12); the words keep 0.5. */
export const PHRASE_SURFACE_SIZE = 0.8;

/**
 * 이모지 and 기술 (user, 2026-10-12): the bubble is the emoji or the tech mark — an
 * opaque ball — not a picture seen through the film.
 */
export function isSolidSurface(surface: SurfaceId) {
  return surface === "emoji" || surface === "tech";
}

/** The surfaces drawn as text, which the keyword font, size and opacity apply to. */
export function isTextSurface(surface: SurfaceId) {
  return surface === "keyword" || surface === "fullname" || surface === "fomo" || surface === "mix";
}

/** 글자 크기 a text surface starts at when chosen. */
export function textSizeFor(surface: SurfaceId) {
  return surface === "fullname" || surface === "fomo" ? PHRASE_SURFACE_SIZE : WORD_SIZE;
}

/** The default surface's style: FOMO's phrases at 0.8. */
export const DEFAULT_KEYWORD_STYLE: KeywordStyle = { font: DEFAULT_KEYWORD_FONT, size: textSizeFor(DEFAULT_SURFACE), opacity: 0.7, brand: false, fill: "none" };
/** 꽉 채움 sets 글자 크기 to this: the lettering at its full width and height; below 1 it shrinks towards the middle. */
export const FILL_SIZE = 1;
/** The 글자 배치 chips: where the words sit on the bubble. */
export const FILLS: readonly { id: Fill; label: string }[] = [
  { id: "none", label: "가운데" },
  { id: "flat", label: "꽉 채움" },
  { id: "sphere", label: "꽉 채움 · 구면" },
];

/** tech-eyes/1's established industry abbreviations, in the atlas's tile order. */
export const TECH_KEYWORDS: readonly string[] = [
  "AI", "ML", "DL", "AGI", "GPT", "LLM",
  "NLP", "RAG", "CPU", "GPU", "NPU", "RAM",
  "OS", "PC", "IoT", "AR", "VR", "XR",
  "UI", "UX", "HCI", "MVP", "API", "SDK",
  "IDE", "OOP", "QA", "DB", "SQL", "CDN",
  "DNS", "URL", "VPN", "VM", "NFT", "DAO",
];

/** The abbreviations spelled out (풀네임 surface, user 2026-10-11): drawn over several lines, so each tile holds a phrase. */
export const TECH_KEYWORD_NAMES: readonly string[] = [
  "Artificial Intelligence", "Machine Learning", "Deep Learning", "Artificial General Intelligence", "Generative Pre-trained Transformer", "Large Language Model",
  "Natural Language Processing", "Retrieval-Augmented Generation", "Central Processing Unit", "Graphics Processing Unit", "Neural Processing Unit", "Random Access Memory",
  "Operating System", "Personal Computer", "Internet of Things", "Augmented Reality", "Virtual Reality", "Extended Reality",
  "User Interface", "User Experience", "Human-Computer Interaction", "Minimum Viable Product", "Application Programming Interface", "Software Development Kit",
  "Integrated Development Environment", "Object-Oriented Programming", "Quality Assurance", "Database", "Structured Query Language", "Content Delivery Network",
  "Domain Name System", "Uniform Resource Locator", "Virtual Private Network", "Virtual Machine", "Non-Fungible Token", "Decentralized Autonomous Organization",
];

/**
 * FOMO (user, 2026-10-12): what the same scene says to the people in it — the
 * fear of missing out, the anxiety of being replaced, the desire to be early.
 * Goldfishes' proposal names the signals (AI, quantum and metaverse hype, market
 * panic, breaking news, startups, research, hiring) and its reading list frames
 * FOMO not as a mood but as the platforms' working rule: react now or miss it.
 * Each phrase is a line from that feed, drawn like 풀네임, one word per line, with
 * no community acronyms (State of the Art, not SOTA). A set of forum slang
 * (HODL, NGMI, TC or GTFO …) replaced this one briefly and was withdrawn (user, 2026-10-12).
 */
export const FOMO_PHRASES: readonly string[] = [
  "Don't Miss Out", "Before It's Too Late", "Last Chance", "Left Behind", "Already Obsolete", "Still Not Using AI?",
  "Your Job Is Next", "Adapt or Die", "Everyone Is Building Agents", "Pivot to AI", "Stay Ahead", "Ship Faster",
  "10x Engineer", "Join the Waitlist", "Early Access", "Limited Seats", "Now Hiring", "Open to Work",
  "Raised 100 Million", "Unicorn Overnight", "To the Moon", "Buy the Dip", "All-Time High", "Market Crash",
  "Breaking News", "Just Announced", "New State of the Art", "Beats GPT", "This Changes Everything", "The Next Big Thing",
  "Artificial General Intelligence by 2027", "Quantum Advantage", "Metaverse Is Back", "Sold Out", "Trending Now", "Everyone Is Watching",
];

/**
 * 이모지 (user, 2026-10-11): the feed's reactions as balls, one glyph per tile in
 * the system's colour emoji font. Round faces only (user, 2026-10-12): each
 * bubble is its emoji, so the face's own outline is the ball's rim; faces with
 * hands, hats, steam or tears outside the circle, and every object, are left out.
 */
export const EMOJIS: readonly string[] = [
  "😀", "😃", "😄", "😁", "😆", "😂", "🙂", "🙃", "😉", "😊", "😍", "🤩",
  "😋", "😛", "😜", "🤪", "🤑", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄",
  "😬", "😌", "😔", "😷", "🤢", "🥵", "🥶", "🥴", "😵", "😎", "🤓", "😕",
  "😟", "😮", "😲", "😳", "🥺", "😨", "😢", "😭", "😩", "😫", "😡", "🤬", "🤡",
];

type PhotoSource = { id: string; imageUrl: string };

function photos(sources: readonly PhotoSource[]): MediaItem[] {
  return sources.map((source) => ({ kind: "image", id: source.id, url: source.imageUrl }));
}

const sets: Record<Exclude<SurfaceId, "none" | "mix">, () => MediaItem[]> = {
  cat: () => photos(catSources),
  politician: () => photos(politicianSources),
  tech: () => TECH_MARKS.map((mark) => ({ kind: "mark", id: `tech-${mark.keyword}`, path: mark.path, hex: mark.hex })),
  // 기술-버블 (user, 2026-10-12): the same marks as soap bubbles — a clear ball tinted by the
  // brand towards its rim, the mark floating inside, all under the film; not in 섞음.
  techBubble: () =>
    TECH_MARKS.map((mark) => ({ kind: "mark", id: `tech-bubble-${mark.keyword}`, path: mark.path, hex: mark.hex, bubble: true })),
  // 기술-상징 (user, 2026-10-12): the technologies themselves rather than companies — each
  // as the mechanism that defines it, in 기술-버블's treatment; 기술-버블 stays as it was.
  techSymbol: () =>
    TECH_SYMBOLS.map((symbol, index) => ({ kind: "symbol", id: `tech-symbol-${index}`, layers: symbol.layers, hex: symbol.hex })),
  face: () => techPowerFaces.map((face) => ({ kind: "image", id: `face-${face.id}`, url: face.image })),
  keyword: () => TECH_KEYWORDS.map((keyword) => ({ kind: "text", id: `keyword-${keyword}`, text: keyword })),
  fullname: () => TECH_KEYWORD_NAMES.map((name, index) => ({ kind: "text", id: `fullname-${TECH_KEYWORDS[index]}`, text: name })),
  // Each phrase carries a brand colour, the marks' in turn, for 글자 색 브랜드 (user, 2026-10-12).
  fomo: () =>
    FOMO_PHRASES.map((phrase, index) => ({ kind: "text", id: `fomo-${index}`, text: phrase, hex: TECH_MARKS[index % TECH_MARKS.length]!.hex })),
  emoji: () => EMOJIS.map((glyph, index) => ({ kind: "emoji", id: `emoji-${index}`, glyph })),
};

const MIX_ORDER = ["tech", "face", "keyword", "cat", "politician"] as const;

/** The layers a surface puts in the media texture, in layer order. */
export function surfaceItems(surface: SurfaceId): MediaItem[] {
  if (surface === "none") return [];
  if (surface === "mix") return MIX_ORDER.flatMap((id) => sets[id]());
  return sets[surface]();
}
