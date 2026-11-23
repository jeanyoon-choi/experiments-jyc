import type { CursorAgent } from "../model";

export type CollageEyeShape = "circle" | "rectangle";
export type CollageGoldfishAssets = Array<HTMLImageElement | null>;

const ASSET_COUNT = 75;
const DISPLAY_WIDTH = 24;
const DISPLAY_HEIGHT = DISPLAY_WIDTH * (400 / 601);
const assetCache: Partial<
  Record<CollageEyeShape, CollageGoldfishAssets>
> = {};

function createAssetOrder(seed: number) {
  const order = Array.from({ length: ASSET_COUNT }, (_, index) => index);
  let state = seed >>> 0;

  for (let index = order.length - 1; index > 0; index -= 1) {
    state =
      (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [order[index], order[swapIndex]] = [
      order[swapIndex],
      order[index],
    ];
  }

  return order;
}

const ASSET_ORDERS = [
  createAssetOrder(0x75c1a),
  createAssetOrder(0x75c1b),
  createAssetOrder(0x75c1c),
  createAssetOrder(0x75c1d),
] as const;

function getAssetSource(shape: CollageEyeShape, index: number) {
  const number = String(index + 1).padStart(3, "0");

  if (shape === "circle") {
    return `/assets/goldfishes/goldfish-eye-collage-circle-75-svg/goldfish-eye-circle-${number}.svg`;
  }

  return `/assets/goldfishes/goldfish-eye-collage-rect-75-svg/goldfish-eye-rect-${number}.svg`;
}

export function loadCollageGoldfishAssets(shape: CollageEyeShape) {
  const cached = assetCache[shape];
  if (cached) return cached;

  const assets: CollageGoldfishAssets = Array.from(
    { length: ASSET_COUNT },
    () => null,
  );
  assetCache[shape] = assets;

  for (let index = 0; index < ASSET_COUNT; index += 1) {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      assets[index] = image;
    };
    image.src = getAssetSource(shape, index);
  }

  return assets;
}

export function getCollageAssetIndex(agentId: number) {
  const cycle = Math.floor(agentId / ASSET_COUNT);
  const indexWithinCycle = agentId % ASSET_COUNT;
  const order = ASSET_ORDERS[cycle % ASSET_ORDERS.length];
  return order[indexWithinCycle];
}

export function drawCollageGoldfish(
  context: CanvasRenderingContext2D,
  cursor: CursorAgent,
  cursorScale: number,
  image: CanvasImageSource,
) {
  const width = DISPLAY_WIDTH * cursorScale;
  const height = DISPLAY_HEIGHT * cursorScale;

  context.save();
  context.translate(cursor.x, cursor.y);
  context.rotate(Math.atan2(cursor.vy, cursor.vx));
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
}
