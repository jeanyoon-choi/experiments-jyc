// The Face Landmarker needs ~15 MB (11.7 MB SIMD wasm + 3.7 MB model) that
// `public/` serves uncompressed with `max-age=0` and no validator, so every
// visit downloaded it again. Keep both in Cache Storage (bump the version when
// either file changes) and start fetching on page open, not on the tap.
const BASE = "/models/gaze-tracking";
const CACHE = "scc-face-landmarker-v1";

type Vision = typeof import("@mediapipe/tasks-vision");
type WasmFileset = Parameters<Vision["FaceLandmarker"]["createFromOptions"]>[0];

type FaceAssets = {
  vision: Vision;
  fileset: WasmFileset;
  model: Uint8Array;
};

async function cachedBlob(url: string) {
  try {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(url);
    if (hit) return await hit.blob();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    await cache.put(url, response.clone()).catch(() => {});
    return await response.blob();
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error("얼굴 모델을 불러올 수 없습니다.");
    return await response.blob();
  }
}

let pending: Promise<FaceAssets> | null = null;

export function loadFaceAssets() {
  pending ??= (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const stem = await vision.FilesetResolver.isSimdSupported()
      ? "vision_wasm_internal"
      : "vision_wasm_nosimd_internal";
    const [wasm, model] = await Promise.all([
      cachedBlob(`${BASE}/wasm/${stem}.wasm`),
      cachedBlob(`${BASE}/face_landmarker.task`),
    ]);
    return {
      vision,
      fileset: {
        wasmLoaderPath: `${BASE}/wasm/${stem}.js`,
        wasmBinaryPath: URL.createObjectURL(new Blob([wasm], { type: "application/wasm" })),
      },
      model: new Uint8Array(await model.arrayBuffer()),
    };
  })();
  pending.catch(() => { pending = null; });
  return pending;
}
