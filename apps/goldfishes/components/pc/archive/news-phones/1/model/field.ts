import { defaultSettings, fieldConfig, topics, type FieldSettings } from "./config";

export type NewsStory = {
  id: string;
  topicId: string;
  headline: string;
  summary: string;
  section: string;
};

export type FishPhone = {
  id: string;
  site: "news";
  topicIndex: number;
  activeKeyword: string | null;
  revision: number;
  cadenceMs: number;
  nextUpdateAt: number;
  stories: NewsStory[];
};

function createStory(fishId: string, topicIndex: number, revision: number): NewsStory {
  const topic = topics[topicIndex % topics.length];
  return {
    id: `${fishId}:story:${revision}`,
    topicId: topic.id,
    headline: topic.headlines[((Math.floor(revision / topics.length) % topic.headlines.length) + topic.headlines.length) % topic.headlines.length],
    summary: topic.summary,
    section: topic.section,
  };
}

export function createField(count: number = fieldConfig.phoneCount): FishPhone[] {
  return Array.from({ length: Math.max(0, Math.min(192, Math.floor(count))) }, (_, index) => {
    const id = `goldfish-${String(index + 1).padStart(3, "0")}`;
    const topicIndex = index % topics.length;
    return {
      id, site: "news", topicIndex, activeKeyword: null, revision: index * 7,
      cadenceMs: fieldConfig.cadenceMs[index % fieldConfig.cadenceMs.length],
      nextUpdateAt: 0,
      stories: Array.from({ length: fieldConfig.historyLimit }, (_, offset) =>
        createStory(id, (topicIndex + offset) % topics.length, index * 7 - offset)),
    };
  });
}

export function updatePhone(phone: FishPhone, elapsed: number, topicIndex = (phone.topicIndex + 1) % topics.length): FishPhone {
  const revision = phone.revision + 1;
  return {
    ...phone, revision, topicIndex, activeKeyword: topics[topicIndex].id, nextUpdateAt: elapsed + phone.cadenceMs,
    stories: [createStory(phone.id, topicIndex, revision), ...phone.stories].slice(0, fieldConfig.historyLimit),
  };
}

// Samples are captured outside React's updater so replay stays deterministic.
export function advanceField(phones: FishPhone[], elapsed: number, paused: ReadonlySet<string>, samples: readonly { presence: number; dwell: number; phase: number }[], settings: FieldSettings = defaultSettings): FishPhone[] {
  let changed = false;
  const next = phones.map((phone, index) => {
    if (paused.has(phone.id) || elapsed < phone.nextUpdateAt) return phone;
    changed = true;
    const sample = samples[index];
    const present = sample.presence < settings.keywordPresenceProbability;
    const nextPhone = present ? updatePhone(phone, elapsed) : { ...phone, activeKeyword: null };
    const duration = phone.cadenceMs * (1 + (sample.dwell * 2 - 1) * fieldConfig.cadenceJitter) / settings.speed;
    // Join an already-running cycle; new phones do not all wait a full first dwell.
    const remaining = phone.nextUpdateAt === 0 ? 1 - sample.phase : 1;
    return {
      ...nextPhone,
      nextUpdateAt: elapsed + duration * remaining,
    };
  });
  return changed ? next : phones;
}
