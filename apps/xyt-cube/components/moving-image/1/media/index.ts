// Video cubes built by apps/xyt-cube/scripts/build-cube.sh into
// public/media/moving-image/<id>/. The screen ("full") reads the clip's own frames
// (at least 1920×1080) from an mp4, one seek per frame, straight into GPU
// memory; phones ("preview") unpack small frame sheets into an RGBA volume.

export type CubismClip = {
  id: string;
  label: string;
};

export const cubismClips: readonly CubismClip[] = [
  { id: "sintel-trailer", label: "Sintel 예고편" },
  { id: "bbb-trailer", label: "Big Buck Bunny 예고편" },
  { id: "tears-of-steel", label: "Tears of Steel 한 숏" },
];

export const defaultCubismClipId = cubismClips[0].id;

/** A registered clip id, or the default. */
export function cubismClipId(id: string | null) {
  return cubismClips.some((clip) => clip.id === id) ? (id as string) : defaultCubismClipId;
}

export type CubismLevel = "full" | "preview";

type CubeManifest = {
  frames: number;
  fps: number;
  full: { width: number; height: number; video: string };
  preview: { width: number; height: number; columns: number; rows: number; sheets: string[] };
};

type CubismVolumeShape = {
  id: string;
  width: number;
  height: number;
  frames: number;
  /** Seconds. */
  duration: number;
  /** Frame width / height: the box is aspect × 1 × depth. */
  aspect: number;
};

/** A whole clip in memory. Row 0 is the top of the frame; frame 0 is the earliest. */
export type CubismVolume = CubismVolumeShape & { kind: "rgba"; data: Uint8Array };

/** A clip whose frames arrive one by one from `src`. */
export type CubismVideo = CubismVolumeShape & { kind: "video"; src: string; fps: number };

async function decode(src: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  await image.decode();
  return image;
}

async function readManifest(base: string, id: string, signal?: AbortSignal) {
  const response = await fetch(`${base}/manifest.json`, { signal });
  if (!response.ok) throw new Error(`Clip ${id} has no manifest (${response.status})`);
  return (await response.json()) as CubeManifest;
}

export async function loadCubismClip(
  id: string,
  level: CubismLevel,
  signal?: AbortSignal,
): Promise<CubismVolume | CubismVideo> {
  const base = `/media/moving-image/${id}`;
  const manifest = await readManifest(base, id, signal);
  const shape = {
    id,
    frames: manifest.frames,
    duration: manifest.frames / manifest.fps,
    aspect: manifest.full.width / manifest.full.height,
  };
  if (level === "full") {
    const { width, height, video } = manifest.full;
    return { ...shape, kind: "video", width, height, src: `${base}/${video}`, fps: manifest.fps };
  }

  const { width, height, columns, rows, sheets } = manifest.preview;
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
  return { ...shape, kind: "rgba", width, height, data };
}

function once(target: HTMLVideoElement, type: "loadeddata" | "seeked", signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      target.removeEventListener(type, done);
      target.removeEventListener("error", fail);
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const fail = () => {
      target.removeEventListener(type, done);
      signal?.removeEventListener("abort", abort);
      reject(new Error(`Clip video failed to ${type === "seeked" ? "seek" : "load"}`));
    };
    const abort = () => {
      target.removeEventListener(type, done);
      target.removeEventListener("error", fail);
      reject(signal?.reason);
    };
    target.addEventListener(type, done);
    target.addEventListener("error", fail);
    signal?.addEventListener("abort", abort);
  });
}

/**
 * Seeks through the clip once, handing each decoded frame (in order) to
 * `onFrame` while the video element shows it.
 */
export async function streamCubismVideo(
  clip: CubismVideo,
  onFrame: (index: number, source: HTMLVideoElement) => void,
  signal?: AbortSignal,
) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const loaded = once(video, "loadeddata", signal);
    video.src = clip.src;
    await loaded;
    if (video.videoWidth !== clip.width || video.videoHeight !== clip.height) {
      throw new Error(`Clip video is ${video.videoWidth}×${video.videoHeight}, expected ${clip.width}×${clip.height}`);
    }
    for (let index = 0; index < clip.frames; index += 1) {
      const seeked = once(video, "seeked", signal);
      // Mid-frame, so the presented frame is unambiguously this one.
      video.currentTime = (index + 0.5) / clip.fps;
      await seeked;
      onFrame(index, video);
    }
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}
