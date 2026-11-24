import { both } from "./text.ts";
import type { Note } from "./types.ts";

// The sources the map cites. The artist's notes are tabs of the Google Doc
// "NOTES", transcribed to portfolio-v4/content/texts/entries/<key>.json and
// published at jeanyoon.ch/oi/texts/<key>.
const TRANSCRIPTS = "portfolio-v4/content/texts/entries/";

function note(key: string, title: string, date: string): [string, Note] {
  return [key, { title, date, at: TRANSCRIPTS, url: `https://jeanyoon.ch/oi/texts/${key}` }];
}

export const NOTES: Record<string, Note> = {
  "eaas-proposal": {
    title: "Goldfishes - Emergence (EAAS proposal)",
    date: "2026-06-25",
    at: "Google Docs: Goldfishes - Emergence",
  },
  ...Object.fromEntries([
    note("notes-2026-10-20-goldfishes", "1020_G_액체성", "2026-10-20"),
    note("notes-2026-10-23-goldfishes", "1023_G_레디메이드/유통", "2026-10-23"),
    note("notes-2026-11-06-goldfishes", "1106_G_Multi Agent", "2026-11-06"),
    note("notes-2026-11-11-filter-bubble", "1111_필터 버블", "2026-11-11"),
    note("notes-2026-11-15-heterogenous-simulation", "1115_Heterogenous Simulation", "2026-11-15"),
    note("notes-2026-11-18-algorithm-pop-art", "1118_Algorithm Pop Art", "2026-11-18"),
    note("notes-2026-11-23-how-to-create-a-bubble", "1123_How to Create a Bubble", "2026-11-23"),
  ]),
  direction: {
    title: "Goldfishes: direction",
    date: "2026-11-18",
    at: "apps/goldfishes/docs/direction.md",
  },
  "simulation-0": {
    title: "simulation/0",
    date: "2026-11-18",
    at: "apps/goldfishes/components/screen/simulation/docs/0.md",
  },
  code: {
    title: both("코드베이스를 읽고", "From reading the codebase"),
    date: "2026-11-24",
    at: "apps/goldfishes/",
  },
};
