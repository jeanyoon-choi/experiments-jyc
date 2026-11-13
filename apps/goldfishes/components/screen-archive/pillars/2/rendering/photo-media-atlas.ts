import catSources from "../model/cat-sources.json";
import kissSources from "../model/kiss-sources.json";
import politicianSources from "../model/politician-sources.json";

export type MediaSurface = "cat" | "kiss" | "politician";
export type AttentionSurface = "white" | MediaSurface;

export const MEDIA_ATLAS_COLUMNS = 8;
export const MEDIA_ATLAS_ROWS = 9;
export const MEDIA_ATLAS_TILE_SIZE = 128;
const MAX_CONCURRENT_DECODES = 4;

const mediaSources = {
  cat: catSources,
  kiss: kissSources,
  politician: politicianSources,
} as const;

export const MEDIA_IMAGE_COUNTS: Record<MediaSurface, number> = {
  cat: catSources.length,
  kiss: kissSources.length,
  politician: politicianSources.length,
};

const atlasPromises = new Map<MediaSurface, Promise<HTMLCanvasElement>>();

function drawCover(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  size: number,
) {
  const scale = Math.max(size / image.width, size / image.height);
  const sourceWidth = size / scale;
  const sourceHeight = size / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    size,
    size,
  );
}

async function buildMediaAtlas(surface: MediaSurface) {
  const sources = mediaSources[surface];
  const canvas = document.createElement("canvas");
  canvas.width = MEDIA_ATLAS_COLUMNS * MEDIA_ATLAS_TILE_SIZE;
  canvas.height = MEDIA_ATLAS_ROWS * MEDIA_ATLAS_TILE_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Unable to create the media atlas canvas.");

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  let nextIndex = 0;
  const workers = Array.from(
    {
      length: Math.min(MAX_CONCURRENT_DECODES, sources.length),
    },
    async () => {
      while (nextIndex < sources.length) {
        const index = nextIndex;
        nextIndex += 1;
        const response = await fetch(sources[index].imageUrl);
        if (!response.ok) continue;
        const bitmap = await createImageBitmap(await response.blob());
        const column = index % MEDIA_ATLAS_COLUMNS;
        const row = Math.floor(index / MEDIA_ATLAS_COLUMNS);
        drawCover(
          context,
          bitmap,
          column * MEDIA_ATLAS_TILE_SIZE,
          row * MEDIA_ATLAS_TILE_SIZE,
          MEDIA_ATLAS_TILE_SIZE,
        );
        bitmap.close();
      }
    },
  );

  await Promise.all(workers);
  return canvas;
}

export function loadMediaAtlas(surface: MediaSurface) {
  let atlasPromise = atlasPromises.get(surface);
  if (!atlasPromise) {
    atlasPromise = buildMediaAtlas(surface).finally(() => {
      atlasPromises.delete(surface);
    });
    atlasPromises.set(surface, atlasPromise);
  }

  return atlasPromise;
}
