import { techKeywords } from "./config";

type GoogleResultTemplate = {
  id: string;
  domain: string;
  path: string;
  title: (keyword: string) => string;
  snippet: (keyword: string) => string;
};

export type GoogleSearchResult = {
  id: string;
  domain: string;
  path: string;
  title: string;
  snippet: string;
};

export type GoogleSearchPage = {
  id: string;
  query: string;
  resultCount: string;
  results: readonly GoogleSearchResult[];
};

const resultTemplates: readonly GoogleResultTemplate[] = [
  {
    id: "overview",
    domain: "reference.example",
    path: "topics",
    title: (keyword) => `${keyword}: an overview`,
    snippet: (keyword) => `A concise introduction to ${keyword}, its key ideas, and the questions it opens for people and systems.`,
  },
  {
    id: "research",
    domain: "research.example",
    path: "library",
    title: (keyword) => `Research and methods for ${keyword}`,
    snippet: (keyword) => `Read current methods, foundational terms, and selected publications related to ${keyword}.`,
  },
  {
    id: "practice",
    domain: "practice.example",
    path: "guides",
    title: (keyword) => `Putting ${keyword} into practice`,
    snippet: (keyword) => `A practical guide to the tools, trade-offs, and everyday applications surrounding ${keyword}.`,
  },
  {
    id: "community",
    domain: "community.example",
    path: "discussions",
    title: (keyword) => `Questions about ${keyword}`,
    snippet: (keyword) => `Browse an annotated collection of common questions, terminology, and further reading.`,
  },
];

const resultCounts = ["About 12,400,000 results", "About 8,730,000 results", "About 24,100,000 results", "About 6,280,000 results"] as const;

export function googleSearchAt(surfaceIndex: number): GoogleSearchPage {
  const keywordIndex = Math.abs(Math.floor(surfaceIndex)) % techKeywords.length;
  const keyword = techKeywords[keywordIndex]!;
  const resultOffset = keywordIndex % resultTemplates.length;
  const results = resultTemplates.map((_, index) => {
    const shiftedTemplate = resultTemplates[(index + resultOffset) % resultTemplates.length]!;
    return {
      id: `${keywordIndex}:${shiftedTemplate.id}`,
      domain: shiftedTemplate.domain,
      path: shiftedTemplate.path,
      title: shiftedTemplate.title(keyword),
      snippet: shiftedTemplate.snippet(keyword),
    };
  });

  return {
    id: `google-search:${keywordIndex}`,
    query: keyword,
    resultCount: resultCounts[keywordIndex % resultCounts.length]!,
    results,
  };
}
