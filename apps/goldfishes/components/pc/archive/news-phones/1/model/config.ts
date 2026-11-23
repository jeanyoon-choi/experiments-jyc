export type NewsTopic = {
  id: string;
  keyword: string;
  section: string;
  headlines: readonly string[];
  summary: string;
};

// Local sample content. Replace this vocabulary independently of layout/timing.
export const topics: readonly NewsTopic[] = [
  { id: "ai", keyword: "Artificial intelligence", section: "Technology", headlines: ["The next workplace is taking shape around AI", "Small teams look for a different way to build with AI", "Who gets to decide what an assistant remembers?"], summary: "New tools are changing familiar routines. The questions now concern how people use them, what they keep, and what they choose to leave behind." },
  { id: "cities", keyword: "Cities", section: "Society", headlines: ["A quieter street becomes a place to stay", "The neighbourhood shops finding a second life", "What makes a city feel close to home?"], summary: "Across the city, small changes to everyday spaces are shaping how people meet, move and spend their time." },
  { id: "work", keyword: "Future of work", section: "Work", headlines: ["A working week with more room to think", "The skills that do not fit on a résumé", "Why teams are rethinking the morning meeting"], summary: "Workers and employers are reconsidering habits that once seemed settled, from the places they gather to the way they measure a good day." },
  { id: "energy", keyword: "Clean energy", section: "Business", headlines: ["The energy transition arrives on the high street", "A new generation of local power projects", "Inside the search for better energy storage"], summary: "Local projects bring a large transition into everyday view. Cost, access and long-term maintenance remain part of the conversation." },
  { id: "culture", keyword: "Culture", section: "Culture", headlines: ["Independent spaces make room for a new audience", "The return of the small neighbourhood cinema", "How a shared playlist becomes a meeting place"], summary: "A new set of spaces and practices is bringing people together, often through familiar objects seen in a different setting." },
  { id: "science", keyword: "Science", section: "Science", headlines: ["Looking more closely at the world beneath our feet", "A small discovery opens a larger question", "The patient work behind a new idea"], summary: "Observation, repeated experiments and open questions shape the work. The next step is to understand what the findings might mean outside the lab." },
];

export const fieldConfig = {
  phoneCount: 90,
  minimumRows: 5,
  phoneWidth: 390,
  phoneHeight: 844,
  gapRatio: 0.035,
  outerMarginRatio: 0.025,
  tickMs: 250,
  keywordPresenceProbability: 0.5,
  cadenceJitter: 0.25,
  historyLimit: 4,
  cadenceMs: [6000, 8300, 7100, 11000, 9400, 6700],
} as const;

export type FieldSettings = {
  phoneCount: number;
  minimumRows: number;
  gapRatio: number;
  keywordPresenceProbability: number;
  phoneScale: number;
  speed: number;
};

export const defaultSettings: FieldSettings = {
  phoneCount: fieldConfig.phoneCount,
  minimumRows: fieldConfig.minimumRows,
  gapRatio: fieldConfig.gapRatio,
  keywordPresenceProbability: fieldConfig.keywordPresenceProbability,
  phoneScale: 1,
  speed: 2.5,
};
