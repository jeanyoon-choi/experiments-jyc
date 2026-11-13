// Photographs for the events (content/events.ts `image`), by key. One place
// for every image URL, so the set can be swapped (for local copies under
// public/) without touching a clone. A key with no image: undefined, and the
// clone draws its own placeholder.

const IMAGES: Record<string, string> = {};

export function imageFor(key: string | undefined): string | undefined {
  return key ? IMAGES[key] : undefined;
}

/** The faces stored as PNG (public/images/0908/tech-power-faces/attribution.json); the rest are JPEG. */
const PNG_FACES = new Set([26, 30, 58]);

/** Portraits for people and accounts: the app's own local tech faces, by seed. */
export function portraitFor(seed: number): string {
  const face = (seed % 80) + 1;
  return `/images/0908/tech-power-faces/${String(face).padStart(3, "0")}.${PNG_FACES.has(face) ? "png" : "jpg"}`;
}

const held: HTMLImageElement[] = [];

/**
 * Loads and decodes every portrait once, up front, and keeps them: a post
 * that mounts mid-scroll then paints with its face, never blank for a frame.
 */
export function preloadPortraits() {
  if (typeof window === "undefined" || held.length > 0) return;
  for (let seed = 0; seed < 80; seed += 1) {
    const image = new Image();
    image.src = portraitFor(seed);
    image.decode().catch(() => {});
    held.push(image);
  }
}
