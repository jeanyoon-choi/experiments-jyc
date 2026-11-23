export type SearchTopic = {
  id: string;
  query: string;
  suggestions: readonly string[];
  imageOffset: number;
};

type ImageSource = { id: string; url: string; ratio: number };

export type ImageResult = {
  id: string;
  src: string;
  alt: string;
  title: string;
  source: string;
  ratio: number;
};

export const searchCadence = {
  minimumMs: 100,
  maximumMs: 1000,
  loadingMs: 58,
  resultsPerQuery: 24,
  columnCount: 6,
} as const;

// This dated trial owns its copy of the 0908 technology vocabulary. Topic data
// determines both the visible refinement language and the image composition.
export const searchTopics: readonly SearchTopic[] = [
  { id: "artificial-intelligence", query: "Artificial Intelligence", suggestions: ["Technology", "Future", "Robot", "Wallpaper", "Computer", "Machine learning", "Human", "Brain", "Logo"], imageOffset: 0 },
  { id: "augmented-reality", query: "Augmented Reality", suggestions: ["Glasses", "Design", "Interface", "Spatial", "Headset", "Phone", "Gaming", "Architecture", "Concept"], imageOffset: 1 },
  { id: "business-intelligence", query: "Business Intelligence", suggestions: ["Dashboard", "Analytics", "Data visualization", "Metrics", "Report", "Power BI", "Strategy", "Charts", "Software"], imageOffset: 2 },
  { id: "cloud-native-computing", query: "Cloud Native Computing", suggestions: ["Kubernetes", "Architecture", "Containers", "DevOps", "Platform", "Cloud", "Diagram", "Servers", "Infrastructure"], imageOffset: 3 },
  { id: "computer-vision", query: "Computer Vision", suggestions: ["Camera", "Object detection", "Vision AI", "Image recognition", "Robotics", "Diagram", "Research", "Face", "Dataset"], imageOffset: 4 },
  { id: "continuous-delivery", query: "Continuous Delivery", suggestions: ["CI CD", "Pipeline", "DevOps", "Deployment", "Git", "Automation", "Diagram", "Release", "Software"], imageOffset: 5 },
  { id: "data-center", query: "Data Center", suggestions: ["Servers", "Network", "Rack", "Cooling", "Cloud", "Infrastructure", "Hardware", "Security", "Architecture"], imageOffset: 6 },
  { id: "deep-learning", query: "Deep Learning", suggestions: ["Neural network", "AI", "Model", "Diagram", "Research", "Training", "Image", "Brain", "Machine learning"], imageOffset: 7 },
  { id: "digital-twin", query: "Digital Twin", suggestions: ["Manufacturing", "Simulation", "Technology", "Healthcare", "Diagram", "Icon", "Smart building", "Supply chain", "Software"], imageOffset: 8 },
  { id: "distributed-systems", query: "Distributed Systems", suggestions: ["Architecture", "Network", "Microservices", "Database", "Cloud", "Diagram", "Scalability", "Systems design", "Software"], imageOffset: 9 },
  { id: "edge-computing", query: "Edge Computing", suggestions: ["IoT", "5G", "Network", "Devices", "Cloud", "Diagram", "Smart city", "Sensors", "Architecture"], imageOffset: 10 },
  { id: "human-computer-interaction", query: "Human Computer Interaction", suggestions: ["UX", "Interface", "Interaction design", "User research", "Touch", "Screen", "Prototype", "Design", "Usability"], imageOffset: 11 },
  { id: "machine-learning", query: "Machine Learning", suggestions: ["Artificial intelligence", "Data science", "Python", "Model", "Diagram", "Neural network", "Training", "Research", "AI"], imageOffset: 12 },
  { id: "natural-language", query: "Natural Language", suggestions: ["NLP", "Language model", "Text", "Linguistics", "Translation", "AI", "Diagram", "Speech", "Chatbot"], imageOffset: 13 },
  { id: "neural-networks", query: "Neural Networks", suggestions: ["Deep learning", "AI", "Brain", "Diagram", "Model", "Machine learning", "Data", "Nodes", "Research"], imageOffset: 14 },
  { id: "prompt-engineering", query: "Prompt Engineering", suggestions: ["AI prompts", "LLM", "Generative AI", "Chatbot", "Workflow", "Examples", "Design", "Text", "Guide"], imageOffset: 15 },
  { id: "quantum-computing", query: "Quantum Computing", suggestions: ["Qubits", "Quantum computer", "Physics", "IBM", "Diagram", "Research", "Technology", "Chip", "Future"], imageOffset: 16 },
  { id: "robotic-process-automation", query: "Robotic Process Automation", suggestions: ["RPA", "Workflow", "Automation", "Business", "Bots", "Process", "Software", "Diagram", "Enterprise"], imageOffset: 17 },
  { id: "virtual-reality", query: "Virtual Reality", suggestions: ["VR headset", "Gaming", "Immersive", "Metaverse", "Design", "Experience", "3D", "Technology", "Concept"], imageOffset: 18 },
  { id: "zero-trust-security", query: "Zero Trust Security", suggestions: ["Cyber security", "Network", "Identity", "Data protection", "Architecture", "Diagram", "Access", "Cloud", "Security"], imageOffset: 19 },
  { id: "autonomous-decision-systems", query: "Autonomous Decision Systems", suggestions: ["AI agents", "Decision intelligence", "Automation", "Systems", "Responsible AI", "Workflow", "Model", "Diagram", "Future"], imageOffset: 20 },
];

// Observed public thumbnails from the inspected AI and Digital Twin Google
// Images states are mixed with fixed technology editorial images. The data is
// sampled material, not live Google ranking or a network request at runtime.
const imageSources: readonly ImageSource[] = [
  { id: "ai-robot", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXLuUU-ZlivFz3Hi3-6jKvCMr5yYvvgSpNBRVRLe-bRw&s=10", ratio: .99 },
  { id: "ai-definition", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZGuG4P7m5orN0MHE_2F2GCPuBIj88ZO-QYr1uA_iy0g&s=10", ratio: 1.47 },
  { id: "ai-library", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRf-1wRgciK9B3zHymYXRwS31lhBYBMqJ8onnQ3q4YfIg&s=10", ratio: 1.62 },
  { id: "ai-face", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5kbwdFx7vZas3DMU0jrE8hqWOVV6RACker9BbKgW0oQ&s=10", ratio: 1.62 },
  { id: "ai-diagram", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhC4f03Y2uwyacrEK15zLf56V2quF2Xr9vZBRttdZ42A&s=10", ratio: 1.89 },
  { id: "ai-brain", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSl-_PZXccpvh-E8J0ojWuUTWui9w9NVRmO3H2CEqPVwA&s=10", ratio: 1.47 },
  { id: "ai-network", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzxNzfNqyz-j9KwXKOAY-_hstzlpy1Ur3M40q2Q8HYXA&s=10", ratio: 1.58 },
  { id: "ai-interface", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTr3BgnKpmOzz27sOWulZENsVNG5h3uckOr05Wbe9HN9w&s=10", ratio: 1.98 },
  { id: "ai-cube", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwNPXHRX0VmDWZArUu0DcR-SWZxDAFw1oVi0RuEgWoMA&s=10", ratio: .99 },
  { id: "ai-work", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRA91xFkzJXCe5U6ThZlGG4y4O11OX0S-evVqW-shrnww&s=10", ratio: 1.62 },
  { id: "ai-human", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiLFFk8zrsadMvigi2sxTgpDTtUZyh6X4kpUPJDP_m0g&s=10", ratio: 1.47 },
  { id: "ai-nasa", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0pD_h0g-XdldTAkiWCAenv7nAQh3Fx7AmNha_-qGnPw&s=10", ratio: .99 },
  { id: "twin-process", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUsXTWDfiQulLMer1iwPnyJlA93AXLVPiYhVg7GKDXJw&s=10", ratio: 1.58 },
  { id: "twin-engine", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxs1iHRh-goMjk-D-7KNG3DvpvPSyUA5EGgiuj2KlPZA&s=10", ratio: 1.23 },
  { id: "twin-visual", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjHXmNWhaYJqVaGIgn7leL2FHCvTdfJGqF3ovf9T00Aw&s=10", ratio: 1.89 },
  { id: "twin-factory", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSy3vUjtl2KmY-JI95cgnTu6NA1IZcWOapp0i5thPvNJg&s=10", ratio: 1.76 },
  { id: "twin-building", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZIEI6NV89ohdQVpQCiV1ItMjB7jcy0Nbs_mg2QC4Jjg&s=10", ratio: 1.47 },
  { id: "twin-reality", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMkTSMc5R7-XB8VvX8mnTzGuBmHlphA9_VexAE-Whdqg&s=10", ratio: 1.58 },
  { id: "twin-network", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1i71ccZZBQsZvRrfG6QgqVXNxbe5lWNTIifFCBx1eGA&s=10", ratio: 1.47 },
  { id: "twin-optimization", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTScR3b3mnFygf1dgcU20zZeIi3iHCWI3WN2F8jvEuoKg&s=10", ratio: 1.47 },
  { id: "twin-mckinsey", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOEKlroYRXZgMQfsKJvaTtMiBzeRYmqGLASirzUf40-g&s=10", ratio: 1.76 },
  { id: "twin-industrial", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQe79sr6E8mmtziBCy6GaocHmd90u-UuT7Lj8eqtLqBeg&s=10", ratio: 1.76 },
  { id: "twin-vr", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZxmRwYiuOUIbXBbc6j-cGvx2-64jg30rMVVqjRstkBQ&s=10", ratio: 1.2 },
  { id: "twin-siemens", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToM6N9h73gx-CBCx7B7gc_FvHkkC0V4iwPkXaiWy41oA&s=10", ratio: 1.3 },
  { id: "circuit", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
  { id: "laptop", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=960&q=86", ratio: 1.32 },
  { id: "robotics", url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=960&q=86", ratio: 1.77 },
  { id: "terminal", url: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
  { id: "satellite", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=960&q=86", ratio: 1.67 },
  { id: "programming", url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
  { id: "security", url: "https://images.unsplash.com/photo-1550751827-4cbd374c3f58?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
  { id: "headset", url: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
  { id: "server", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
  { id: "presentation", url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=960&q=86", ratio: 1.6 },
  { id: "workspace", url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
  { id: "interface", url: "https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=960&q=86", ratio: 1.4 },
  { id: "analytics", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=960&q=86", ratio: 1.68 },
  { id: "industrial-robot", url: "https://images.unsplash.com/photo-1555255707-c07966088b7b?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
  { id: "quantum", url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=960&q=86", ratio: 1.5 },
];

const titlePatterns = [
  (query: string) => `What is ${query}?`,
  (query: string) => `${query}: definition, examples and uses`,
  (query: string) => `How ${query} works`,
  (query: string) => `${query} architecture and diagram`,
  (query: string) => `${query} explained visually`,
  (query: string) => `Inside the future of ${query}`,
  (query: string) => `${query} applications`,
  (query: string) => `${query} for business and research`,
] as const;

const publishers = ["Britannica", "IBM", "MIT Technology Review", "IEEE Spectrum", "McKinsey", "Google Cloud", "NVIDIA", "Siemens", "Wired", "Microsoft Learn", "Nature", "TechTarget"] as const;

export function imageResultsForTopic(topicIndex: number): readonly ImageResult[] {
  const topic = searchTopics[topicIndex] ?? searchTopics[0];
  return Array.from({ length: searchCadence.resultsPerQuery }, (_, index) => {
    const source = imageSources[(topic.imageOffset * 5 + index * 7) % imageSources.length]!;
    const title = titlePatterns[(topic.imageOffset + index * 3) % titlePatterns.length]!(topic.query);
    const publisher = publishers[(topic.imageOffset * 2 + index * 5) % publishers.length]!;
    return { id: `${topic.id}:${source.id}`, src: source.url, alt: `${title}, ${publisher}`, title, source: publisher, ratio: source.ratio };
  });
}

export function topicIndexForQuery(query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized ? searchTopics.findIndex((topic) => topic.query.toLocaleLowerCase() === normalized) : -1;
}
