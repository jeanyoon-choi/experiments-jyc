import {
  defaultSettings,
  fieldConfig,
  monochromeColours,
  techKeywords,
  type FieldSettings,
} from "./config";

export type FishPhone = {
  id: string;
  surfaceIndex: number;
  activeColour: string | null;
  cadenceMs: number;
  nextUpdateAt: number;
};

export function createField(count: number = fieldConfig.phoneCount): FishPhone[] {
  return Array.from({ length: Math.max(0, Math.min(192, Math.floor(count))) }, (_, index) => ({
    id: `goldfish-${String(index + 1).padStart(3, "0")}`,
    surfaceIndex: index,
    activeColour: monochromeColours[index % monochromeColours.length],
    cadenceMs: fieldConfig.cadenceMs[index % fieldConfig.cadenceMs.length],
    nextUpdateAt: 0,
  }));
}

export function advanceField(
  phones: FishPhone[],
  elapsed: number,
  samples: readonly { presence: number; dwell: number; phase: number }[],
  settings: FieldSettings = defaultSettings,
): FishPhone[] {
  let changed = false;
  const next = phones.map((phone, index) => {
    if (elapsed < phone.nextUpdateAt) return phone;
    changed = true;
    const sample = samples[index]!;
    const wasPresent = phone.activeColour !== null;
    // Advance the surface only while it is already invisible. This prevents a
    // visible keyword-to-keyword swap during a phone's entrance or exit.
    const surfaceIndex = !wasPresent && sample.presence < settings.presenceProbability
      ? (phone.surfaceIndex + 1) % (monochromeColours.length * techKeywords.length)
      : phone.surfaceIndex;
    const activeColour = sample.presence < settings.presenceProbability
      ? monochromeColours[surfaceIndex % monochromeColours.length]
      : null;
    const duration = phone.cadenceMs * (1 + (sample.dwell * 2 - 1) * fieldConfig.cadenceJitter) / settings.speed;
    const remaining = phone.nextUpdateAt === 0 ? 1 - sample.phase : 1;
    return { ...phone, surfaceIndex, activeColour, nextUpdateAt: elapsed + duration * remaining };
  });
  return changed ? next : phones;
}
