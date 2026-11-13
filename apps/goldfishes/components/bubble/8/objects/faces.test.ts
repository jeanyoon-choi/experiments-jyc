import assert from "node:assert/strict";
import test from "node:test";
import { ALBEDO_SIZE, FACES, HEAD_REACH, headAlbedo, headFrame, headSurface, type Portrait } from "./faces.ts";
import { FIELD_EXTENT, fieldOfHead } from "./fields.ts";
import { KINDS_OF } from "./groups.ts";

const SIZE = 192;

/** A portrait lit by a slow gradient, with one bright spot where the face's nose would be. */
function portrait(spot: boolean): Portrait {
  const width = 200;
  const height = 260;
  const luminance = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const glow = spot ? 0.4 * Math.exp(-((x - 100) ** 2 + (y - 140) ** 2) / 60) : 0;
      luminance[y * width + x] = 0.2 + 0.4 * (x / width) + glow;
    }
  }
  return { width, height, luminance };
}

const box = { x: 100, y: 130, h: 120 };
const unit = (2 * FIELD_EXTENT) / SIZE;
const at = (px: number, py: number) => Math.round((py / FIELD_EXTENT / 2 + 0.5) * SIZE - 0.5) * SIZE + Math.round((px / FIELD_EXTENT / 2 + 0.5) * SIZE - 0.5);

test("every face has a portrait and a box", () => {
  assert.deepEqual(Object.keys(FACES), [...KINDS_OF.face]);
  for (const face of Object.values(FACES)) assert.ok(face.file.endsWith(".jpg") && face.mask.endsWith(".png") && face.box.h > 0, face.name);
});

test("a head is finite and smooth, reaches about 1.15 of the disc, and stands taller than its edge", () => {
  const { height, normal } = headSurface(portrait(false), box, SIZE, FIELD_EXTENT);
  let furthest = 0;
  let peak = 0;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = y * SIZE + x;
      if (height[index] === -Infinity) continue;
      assert.ok(Number.isFinite(height[index]! + normal[index * 2]! + normal[index * 2 + 1]!));
      assert.ok(height[index]! >= 0);
      furthest = Math.max(furthest, Math.hypot((x + 0.5) * unit - FIELD_EXTENT, (y + 0.5) * unit - FIELD_EXTENT));
      peak = Math.max(peak, height[index]!);
    }
  }
  assert.ok(Math.abs(furthest - HEAD_REACH) < 3 * unit, `reaches ${furthest}`);
  assert.ok(peak > 0.7 && peak < 1.4, `peak ${peak}`);
  // The photo's slow light leaves no tilt: the head is as high left of the middle as right of it.
  const left = height[at(-0.3, 0)]!;
  const right = height[at(0.3, 0)]!;
  assert.ok(Math.abs(left - right) < 0.03, `left ${left}, right ${right}`);
});

test("brighter is nearer: a bright spot in the portrait stands out of the head (a fine layer only)", () => {
  const plain = headSurface(portrait(false), box, SIZE, FIELD_EXTENT).height;
  const lit = headSurface(portrait(true), box, SIZE, FIELD_EXTENT).height;
  // The spot sits 10 px below the face's centre: 10/120 face heights, times the frame's scale.
  let raised = 0;
  for (let index = 0; index < plain.length; index += 1) if (plain[index]! > -Infinity) raised = Math.max(raised, lit[index]! - plain[index]!);
  assert.ok(raised > 0.004 && raised < 0.05, `raised ${raised}`);
});

test("a head bakes into a field like every kind's", () => {
  const field = fieldOfHead(portrait(false), box);
  assert.ok(field.thickness > 0.3 && field.peak > 0.7 && field.reach > 1.1 && field.reach <= FIELD_EXTENT);
  assert.ok(field.data[1]! > 0);
});

/** A head's matte: a wide bob (a disc) over a narrow neck, the face box in it as before. */
function matted(): Portrait {
  const base = portrait(false);
  const mask = new Float32Array(base.width * base.height);
  for (let y = 0; y < base.height; y += 1) {
    for (let x = 0; x < base.width; x += 1) {
      const bob = Math.hypot(x - 100, y - 115) < 85;
      const neck = Math.abs(x - 100) < 30 && y > 150 && y < 225;
      mask[y * base.width + x] = bob || neck ? 1 : 0;
    }
  }
  const colour = new Uint8ClampedArray(base.width * base.height * 4).fill(200);
  return { ...base, mask, colour };
}

test("the silhouette is the matte's: a wider head reaches wider, the frame fits it to the reach", () => {
  const plain = headFrame(portrait(false), box);
  const bob = headFrame(matted(), box);
  assert.ok(bob.scale < plain.scale, `${bob.scale} vs ${plain.scale}`);
  const { height } = headSurface(matted(), box, SIZE, FIELD_EXTENT);
  let furthest = 0;
  for (let index = 0; index < height.length; index += 1) {
    if (height[index] === -Infinity) continue;
    furthest = Math.max(furthest, Math.hypot(((index % SIZE) + 0.5) * unit - FIELD_EXTENT, (Math.floor(index / SIZE) + 0.5) * unit - FIELD_EXTENT));
  }
  assert.ok(Math.abs(furthest - HEAD_REACH) < 3 * unit, `reaches ${furthest}`);
});

test("a face's colours cover its frame: the matte as alpha, its colour carried out beyond it", () => {
  const albedo = headAlbedo(matted(), box, ALBEDO_SIZE, FIELD_EXTENT);
  assert.equal(albedo.length, ALBEDO_SIZE * ALBEDO_SIZE * 4);
  const middle = (ALBEDO_SIZE / 2) * ALBEDO_SIZE + ALBEDO_SIZE / 2;
  assert.equal(albedo[middle * 4 + 3], 255);
  assert.equal(albedo[3], 0);
  assert.equal(albedo[0], 200);
});
