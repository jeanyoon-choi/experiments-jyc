import { SKIN_SIZE } from "./renderer";
import type { Vec } from "./warp";

// Where the bare face has been pressed, and for how long, over the photo's uv.
export function createSkin() {
  return new Float32Array(SKIN_SIZE * SKIN_SIZE);
}

/** Adds `seconds` of pressing around a photo-space point. */
export function pressSkin(skin: Float32Array, point: Vec, radius: number, aspect: number, seconds: number) {
  const centreX = point.x / aspect * SKIN_SIZE;
  const centreY = point.y * SKIN_SIZE;
  const reachX = radius / aspect * SKIN_SIZE;
  const reachY = radius * SKIN_SIZE;
  const left = Math.max(0, Math.floor(centreX - reachX * 2.5));
  const right = Math.min(SKIN_SIZE - 1, Math.ceil(centreX + reachX * 2.5));
  const top = Math.max(0, Math.floor(centreY - reachY * 2.5));
  const bottom = Math.min(SKIN_SIZE - 1, Math.ceil(centreY + reachY * 2.5));
  for (let y = top; y <= bottom; y += 1) {
    const dy = (y + 0.5 - centreY) / reachY;
    for (let x = left; x <= right; x += 1) {
      const dx = (x + 0.5 - centreX) / reachX;
      skin[y * SKIN_SIZE + x] += seconds * Math.exp(-(dx * dx + dy * dy));
    }
  }
}
