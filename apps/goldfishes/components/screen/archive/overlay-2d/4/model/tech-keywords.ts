export type TechKeyword = Readonly<{
  abbreviation: string;
  text: string;
}>;

// Established industry abbreviations; no invented two-letter expansions.
export const techKeywords: readonly TechKeyword[] = [
  { abbreviation: "AI", text: "Artificial Intelligence" },
  { abbreviation: "ML", text: "Machine Learning" },
  { abbreviation: "DL", text: "Deep Learning" },
  { abbreviation: "AGI", text: "Artificial General Intelligence" },
  { abbreviation: "GPT", text: "Generative Pre-trained Transformer" },
  { abbreviation: "LLM", text: "Large Language Model" },
  { abbreviation: "NLP", text: "Natural Language Processing" },
  { abbreviation: "RAG", text: "Retrieval-Augmented Generation" },
  { abbreviation: "CPU", text: "Central Processing Unit" },
  { abbreviation: "GPU", text: "Graphics Processing Unit" },
  { abbreviation: "NPU", text: "Neural Processing Unit" },
  { abbreviation: "RAM", text: "Random Access Memory" },
  { abbreviation: "OS", text: "Operating System" },
  { abbreviation: "PC", text: "Personal Computer" },
  { abbreviation: "IoT", text: "Internet of Things" },
  { abbreviation: "AR", text: "Augmented Reality" },
  { abbreviation: "VR", text: "Virtual Reality" },
  { abbreviation: "XR", text: "Extended Reality" },
  { abbreviation: "UI", text: "User Interface" },
  { abbreviation: "UX", text: "User Experience" },
  { abbreviation: "HCI", text: "Human-Computer Interaction" },
  { abbreviation: "MVP", text: "Minimum Viable Product" },
  { abbreviation: "API", text: "Application Programming Interface" },
  { abbreviation: "SDK", text: "Software Development Kit" },
  { abbreviation: "IDE", text: "Integrated Development Environment" },
  { abbreviation: "OOP", text: "Object-Oriented Programming" },
  { abbreviation: "QA", text: "Quality Assurance" },
  { abbreviation: "DB", text: "Database" },
  { abbreviation: "SQL", text: "Structured Query Language" },
  { abbreviation: "CDN", text: "Content Delivery Network" },
  { abbreviation: "DNS", text: "Domain Name System" },
  { abbreviation: "URL", text: "Uniform Resource Locator" },
  { abbreviation: "VPN", text: "Virtual Private Network" },
  { abbreviation: "VM", text: "Virtual Machine" },
  { abbreviation: "NFT", text: "Non-Fungible Token" },
  { abbreviation: "DAO", text: "Decentralized Autonomous Organization" },
];

export function techKeywordAt(index: number) {
  return techKeywords[index % techKeywords.length]!;
}
