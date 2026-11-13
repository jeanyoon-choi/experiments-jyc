export type TechKeyword = Readonly<{
  abbreviation: string;
}>;

// Established industry abbreviations; no invented two-letter expansions.
export const techKeywords: readonly TechKeyword[] = [
  { abbreviation: "AI" },
  { abbreviation: "ML" },
  { abbreviation: "DL" },
  { abbreviation: "AGI" },
  { abbreviation: "GPT" },
  { abbreviation: "LLM" },
  { abbreviation: "NLP" },
  { abbreviation: "RAG" },
  { abbreviation: "CPU" },
  { abbreviation: "GPU" },
  { abbreviation: "NPU" },
  { abbreviation: "RAM" },
  { abbreviation: "OS" },
  { abbreviation: "PC" },
  { abbreviation: "IoT" },
  { abbreviation: "AR" },
  { abbreviation: "VR" },
  { abbreviation: "XR" },
  { abbreviation: "UI" },
  { abbreviation: "UX" },
  { abbreviation: "HCI" },
  { abbreviation: "MVP" },
  { abbreviation: "API" },
  { abbreviation: "SDK" },
  { abbreviation: "IDE" },
  { abbreviation: "OOP" },
  { abbreviation: "QA" },
  { abbreviation: "DB" },
  { abbreviation: "SQL" },
  { abbreviation: "CDN" },
  { abbreviation: "DNS" },
  { abbreviation: "URL" },
  { abbreviation: "VPN" },
  { abbreviation: "VM" },
  { abbreviation: "NFT" },
  { abbreviation: "DAO" },
];

export function techKeywordAt(index: number) {
  return techKeywords[index % techKeywords.length]!;
}
