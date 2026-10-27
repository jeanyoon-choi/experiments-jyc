import { techKeywords } from "./config";

type SentenceTemplate = {
  id: string;
  render: (keyword: string) => string;
};

const templates: readonly SentenceTemplate[] = [
  { id: "leverage", render: (keyword) => `We need to leverage the power of ${keyword}.` },
  { id: "automate", render: (keyword) => `Automate critical workflows with ${keyword}.` },
  { id: "scale", render: (keyword) => `With ${keyword}, we can scale operations.` },
  { id: "driven", render: (keyword) => `Build a ${keyword}-driven organization.` },
  { id: "unlock", render: (keyword) => `It is time to unlock ${keyword}'s full potential.` },
  { id: "transform", render: (keyword) => `Transform the business with ${keyword}.` },
  { id: "advantage", render: (keyword) => `Turn ${keyword} into a strategic advantage.` },
  { id: "operationalize", render: (keyword) => `Operationalize ${keyword} across the organization.` },
  { id: "growth", render: (keyword) => `Put ${keyword} at the center of growth.` },
  { id: "future", render: (keyword) => `Future-proof every workflow with ${keyword}.` },
];

export type KeywordSentence = {
  id: string;
  keyword: string;
  sentence: string;
};

export function keywordSentenceAt(surfaceIndex: number): KeywordSentence {
  const index = Math.max(0, Math.floor(surfaceIndex));
  const keywordIndex = index % techKeywords.length;
  const templateIndex = Math.floor(index / techKeywords.length) % templates.length;
  const keyword = techKeywords[keywordIndex]!;
  const template = templates[templateIndex]!;
  return {
    id: `${keywordIndex}:${template.id}`,
    keyword,
    sentence: template.render(keyword),
  };
}
