// Clips are frame atlases built by apps/xyt-cube/scripts/build-atlas.sh into
// public/media/spacetime/<id>/{atlas.jpg, manifest.json}.

export type SpacetimeClip = {
  id: string;
  label: string;
};

export const spacetimeClips: readonly SpacetimeClip[] = [
  { id: "synthetic-loop", label: "합성 루프" },
];

export const defaultSpacetimeClipId = spacetimeClips[0].id;

export type SpacetimeClipManifest = {
  atlas: string;
  frames: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
};

export type LoadedSpacetimeClip = {
  id: string;
  manifest: SpacetimeClipManifest;
  image: HTMLImageElement;
  /** Seconds. */
  duration: number;
  /** Frame width / height: the scene spans [0, aspect] × [0, 1]. */
  aspect: number;
};

export async function loadSpacetimeClip(
  id: string,
  signal?: AbortSignal,
): Promise<LoadedSpacetimeClip> {
  const base = `/media/spacetime/${id}`;
  const response = await fetch(`${base}/manifest.json`, { signal });
  if (!response.ok) throw new Error(`Clip ${id} has no manifest (${response.status})`);
  const manifest = (await response.json()) as SpacetimeClipManifest;
  const image = new Image();
  image.decoding = "async";
  image.src = `${base}/${manifest.atlas}`;
  await image.decode();
  return {
    id,
    manifest,
    image,
    duration: manifest.frames / manifest.fps,
    aspect: manifest.frameWidth / manifest.frameHeight,
  };
}
