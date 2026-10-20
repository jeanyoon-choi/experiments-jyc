// Video cubes are frame sheets built by apps/xyt-cube/scripts/build-cube.sh into
// public/media/cubism/<id>/. The loader unpacks them into one RGBA volume
// (x, y, frame) ready for a 3D texture.

export type CubismClip = {
  id: string;
  label: string;
};

export const cubismClips: readonly CubismClip[] = [
  { id: "genai-family", label: "생성 영상" },
  { id: "cat-jump", label: "고양이" },
  { id: "living-geometry", label: "리빙 지오메트리 60초" },
  { id: "factory-4", label: "팩토리 4.0 90초" },
  { id: "synthetic-loop", label: "합성 루프" },
];

export const defaultCubismClipId = cubismClips[0].id;

/** A registered clip id, or the default. */
export function cubismClipId(id: string | null) {
  return cubismClips.some((clip) => clip.id === id) ? (id as string) : defaultCubismClipId;
}

export type CubismLevel = "full" | "preview";

type LevelManifest = {
  width: number;
  height: number;
  columns: number;
  rows: number;
  sheets: string[];
};

type CubeManifest = {
  frames: number;
  fps: number;
  full: LevelManifest;
  preview: LevelManifest;
};

export type CubismVolume = {
  id: string;
  width: number;
  height: number;
  frames: number;
  /** Seconds. */
  duration: number;
  /** Frame width / height: the box is aspect × 1 × depth. */
  aspect: number;
  /** Row 0 is the top of the frame; frame 0 is the earliest. */
  data: Uint8Array;
};

async function decode(src: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  await image.decode();
  return image;
}

export async function loadCubismVolume(
  id: string,
  level: CubismLevel,
  signal?: AbortSignal,
): Promise<CubismVolume> {
  const base = `/media/cubism/${id}`;
  const response = await fetch(`${base}/manifest.json`, { signal });
  if (!response.ok) throw new Error(`Clip ${id} has no manifest (${response.status})`);
  const manifest = (await response.json()) as CubeManifest;
  const { width, height, columns, rows, sheets } = manifest[level];
  const frameBytes = width * height * 4;
  const data = new Uint8Array(frameBytes * manifest.frames);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("2D canvas is unavailable");

  const images = await Promise.all(sheets.map((sheet) => decode(`${base}/${sheet}`)));
  signal?.throwIfAborted();
  let frame = 0;
  for (const image of images) {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
    for (let row = 0; row < rows && frame < manifest.frames; row += 1) {
      for (let column = 0; column < columns && frame < manifest.frames; column += 1) {
        const pixels = context.getImageData(column * width, row * height, width, height).data;
        data.set(pixels, frame * frameBytes);
        frame += 1;
      }
    }
  }

  return {
    id,
    width,
    height,
    frames: manifest.frames,
    duration: manifest.frames / manifest.fps,
    aspect: manifest.full.width / manifest.full.height,
    data,
  };
}
