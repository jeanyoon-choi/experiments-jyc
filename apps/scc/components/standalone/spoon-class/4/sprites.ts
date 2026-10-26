// The /3 human sprite, copied unchanged from its life-game presentation, the upstream ground and cloud images, and 수학의 정석.
import assets from "./source/assets.json";
// Spine of 실력 수학의 정석 대수 (성지출판), from Aladin's spine download.
import mathSpine from "./source/math-spine.jpg";

export const INK = "#535353";
export const PAPER = "#f7f7f7";

function dataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function human(x: number, pose: string) {
  const legs =
    pose === "run-left"
      ? '<rect x="16" y="35" width="5" height="10"/><rect x="24" y="35" width="5" height="6"/>'
      : pose === "run-right"
        ? '<rect x="16" y="35" width="5" height="6"/><rect x="24" y="35" width="5" height="10"/>'
        : pose === "crashed"
          ? '<rect x="7" y="39" width="18" height="5"/><rect x="3" y="34" width="8" height="5"/>'
          : '<rect x="16" y="35" width="5" height="10"/><rect x="24" y="35" width="5" height="10"/>';
  const torso = pose === "crashed" ? '<rect x="15" y="32" width="14" height="6"/>' : '<rect x="15" y="20" width="14" height="16"/>';
  const head = pose === "crashed" ? '<rect x="28" y="29" width="9" height="9"/>' : '<rect x="17" y="7" width="10" height="11"/>';
  const arms = pose === "crashed" ? "" : '<rect x="9" y="23" width="7" height="5"/><rect x="28" y="25" width="7" height="5"/>';
  return `<g transform="translate(${x} 0)" fill="${INK}">${head}${torso}${arms}${legs}</g>`;
}

function trexSprite(scale: number) {
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${262 * scale}" height="${47 * scale}" viewBox="0 0 262 47" shape-rendering="crispEdges">${human(0, "jump")}${human(44, "still")}${human(88, "run-left")}${human(132, "run-right")}${human(220, "crashed")}</svg>`);
}

export type SpriteSet = {
  // Source pixels per world pixel: 1 or 2, as upstream IS_HIDPI.
  density: number;
  trex: CanvasImageSource;
  // The upright spine: 실력 (green) and 기본 (orange).
  spines: { advanced: CanvasImageSource; basic: CanvasImageSource };
  horizon: CanvasImageSource;
  cloud: CanvasImageSource;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// SVG sprites are rasterised once, so each frame only copies bitmaps.
function rasterise(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  return canvas;
}

// Prescaled to four times the drawn book size, so each frame copies little.
const SPINE_PIXELS = { thickness: 21, height: 200 };

function spineCopy(image: HTMLImageElement, filter: string) {
  const canvas = document.createElement("canvas");
  canvas.width = SPINE_PIXELS.thickness;
  canvas.height = SPINE_PIXELS.height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.filter = filter || "none";
  context.drawImage(image, 0, 0, SPINE_PIXELS.thickness, SPINE_PIXELS.height);
  return canvas;
}

export async function loadSprites(density: 1 | 2): Promise<SpriteSet> {
  const [trex, spine, horizon, cloud] = await Promise.all([
    loadImage(trexSprite(density)),
    loadImage(mathSpine.src),
    loadImage(assets.images[`${density}x-horizon`]),
    loadImage(assets.images[`${density}x-cloud`]),
  ]);
  return {
    density,
    trex: rasterise(trex),
    spines: {
      advanced: spineCopy(spine, ""),
      // 기본 editions are the same spine in orange.
      basic: spineCopy(spine, "hue-rotate(205deg) saturate(1.25)"),
    },
    horizon,
    cloud,
  };
}
