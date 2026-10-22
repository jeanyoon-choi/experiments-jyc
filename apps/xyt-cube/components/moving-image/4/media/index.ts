// Fixed-viewpoint time-lapses as moving-image cubes (scripts/build-cube.sh)
// plus their optical flow (scripts/build-cube-flow.sh), in
// public/media/moving-image/<id>/. Copied from moving-image/3's loader; only
// the clip list differs. Each clip is sized to about 10 MB in the repository.

export type LiquidClip = { id: string; label: string };

export const liquidClips: readonly LiquidClip[] = [
  // Pexels (Ben Kyselka): roofs of Brno, night to day to night. 168 frames.
  { id: "brno-day", label: "브르노의 하루" },
  // Pexels (Timo Volz): Shibuya Crossing from above, evening. 124 frames.
  { id: "shibuya-night", label: "시부야 스크램블" },
  // NOAA GOES-19 full disk GeoColor, 2026-10-21 UTC, one frame per 10 min. 144 frames.
  { id: "earth-day", label: "지구의 하루" },
  // Google Earth Timelapse (Landsat), Columbia Glacier, Alaska, 1984–2018. 41 frames.
  { id: "columbia-glacier", label: "컬럼비아 빙하 1984–2018" },
];

export const defaultLiquidClipId = liquidClips[0].id;

type CubeManifest = {
  frames: number;
  fps: number;
  full: { width: number; height: number; video: string };
  /** The original at its own frame rate, same size and start, for the live window. */
  live?: { video: string };
};

type FlowManifest = {
  width: number;
  height: number;
  scale: number;
  range: number;
  companding: number;
  cuts: number[];
};

/** A clip whose frames arrive one by one from `src`, and whose flow arrives from `flow`. */
export type LiquidVideo = {
  id: string;
  width: number;
  height: number;
  frames: number;
  fps: number;
  /** Frame width / height. */
  aspect: number;
  src: string;
  flow: FlowManifest & { src: string };
  /** The original at its own frame rate (clip second 0 = its second 0), or null. */
  live: string | null;
};

export async function loadLiquidClip(id: string, signal?: AbortSignal): Promise<LiquidVideo> {
  const base = `/media/moving-image/${id}`;
  const [manifest, flow] = await Promise.all(
    ["manifest.json", "flow.json"].map(async (name) => {
      const response = await fetch(`${base}/${name}`, { signal });
      if (!response.ok) throw new Error(`Clip ${id} has no ${name} (${response.status})`);
      return response.json();
    }),
  ) as [CubeManifest, FlowManifest];
  const { width, height, video } = manifest.full;
  return {
    id,
    width,
    height,
    frames: manifest.frames,
    fps: manifest.fps,
    aspect: width / height,
    src: `${base}/${video}`,
    flow: { ...flow, src: `${base}/flow.bin.gz` },
    live: manifest.live ? `${base}/${manifest.live.video}` : null,
  };
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

/** Seeks through the clip once, handing each decoded frame (in order) to `onFrame`. */
export async function streamLiquidVideo(
  clip: LiquidVideo,
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
      video.currentTime = (index + 0.5) / clip.fps;
      await seeked;
      onFrame(index, video);
    }
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

/**
 * Streams the flow volume: gunzips flow.bin.gz, undoes its plane filter
 * (see scripts/build-cube-flow.py) and hands each layer, interleaved RGBA
 * (F01.x, F01.y, F10.x, F10.y companded bytes), to `onLayer`.
 */
export async function streamLiquidFlow(
  clip: LiquidVideo,
  onLayer: (index: number, rgba: Uint8Array) => void,
  signal?: AbortSignal,
) {
  const { width, height } = clip.flow;
  const plane = width * height;
  const layerBytes = plane * 4;
  const response = await fetch(clip.flow.src, { signal });
  if (!response.ok || !response.body) throw new Error(`Clip ${clip.id} has no flow (${response.status})`);
  const reader = response.body.pipeThrough(new DecompressionStream("gzip")).getReader();
  const filtered = new Uint8Array(layerBytes);
  const rgba = new Uint8Array(layerBytes);
  let filledBytes = 0;
  let layer = 0;
  while (layer < clip.frames) {
    const { value, done } = await reader.read();
    if (done) break;
    let offset = 0;
    while (offset < value.length) {
      const take = Math.min(value.length - offset, layerBytes - filledBytes);
      filtered.set(value.subarray(offset, offset + take), filledBytes);
      filledBytes += take;
      offset += take;
      if (filledBytes < layerBytes) continue;
      for (let channel = 0; channel < 4; channel += 1) {
        const base = channel * plane;
        // Undo the y difference (column prefix sums), then the x difference (row prefix sums).
        for (let i = width; i < plane; i += 1) filtered[base + i] += filtered[base + i - width];
        for (let y = 0; y < height; y += 1) {
          const row = base + y * width;
          let sum = 0;
          for (let x = 0; x < width; x += 1) {
            sum = (sum + filtered[row + x]) & 255;
            rgba[(y * width + x) * 4 + channel] = sum;
          }
        }
      }
      onLayer(layer, rgba);
      layer += 1;
      filledBytes = 0;
      if (layer >= clip.frames) break;
    }
  }
  await reader.cancel().catch(() => undefined);
}
