import assert from "node:assert/strict";
import test from "node:test";
import { ADDRESS_TIER, bytesOf, chainOf, MEMORY_BUDGET, paintChainOf, poolsFor, Residency, tierBytes, tierFor, toHalf } from "./tiers.ts";

/** bubble/8's fields: 55 layers of 512² RGBA16F and 128² R16F with mips, 16 photographs 256² RGBA8 with mips. */
const BUBBLE_EIGHT = 55 * (((512 * 512 * 8 + 128 * 128 * 2) * 4) / 3) + 16 * ((256 * 256 * 4 * 4) / 3);

test("the tiers fit the memory budget whatever the catalogue's size, never above bubble/8's", () => {
  assert.ok(MEMORY_BUDGET <= BUBBLE_EIGHT, `${MEMORY_BUDGET} vs ${BUBBLE_EIGHT}`);
  for (const layers of [55, 200, 600, 900, 1500]) {
    const pools = poolsFor(layers);
    assert.ok(bytesOf(pools) <= MEMORY_BUDGET, `${layers} layers: ${(bytesOf(pools) / 2 ** 20).toFixed(1)} MiB`);
    assert.equal(pools[0], layers);
    assert.ok(pools[3] >= 8 && pools[2] >= 16 && pools[1] >= 1, `${layers}: ${pools}`);
  }
  // The opening (measured 2026-11-05: 17–19 kinds wanting 512², 7–12 256², 9–13 128²) fits with room to spare.
  const pools = poolsFor(600);
  assert.ok(pools[3] >= 20 && pools[2] >= 16 && pools[1] >= 32, `${pools}`);
  console.log(`  600 layers: pools ${pools.join(" / ")}, ${(bytesOf(pools) / 2 ** 20).toFixed(1)} MiB; per kind or slot ${[0, 1, 2, 3].map((tier) => (tierBytes(tier as 0) / 1024).toFixed(0)).join(" / ")} KiB`);
});

test("an object's tier: exact for the mip the shader reads at its size", () => {
  // 512 / 3 texels per object unit; at 2 device px per CSS px an object of radius 42 CSS px reads mip 1 (256²).
  assert.equal(tierFor(200, 0.5), 3);
  assert.equal(tierFor(42, 0.5), 2);
  assert.equal(tierFor(20, 0.5), 1);
  assert.equal(tierFor(9, 0.5), 0);
  assert.equal(tierFor(42, 1), 1);
});

test("mip chains are 2 × 2 boxes; half floats round as WebGL rounds", () => {
  const data = Float32Array.from({ length: 4 * 4 }, (_, at) => at);
  const chain = chainOf(data, 4, 1);
  assert.deepEqual([...chain.subarray(16)], [2.5, 4.5, 10.5, 12.5, 7.5]);
  const half = toHalf(Float32Array.from([0, 1, -2, 0.5, 65504, 1e-8, 0.1]));
  assert.deepEqual([...half], [0, 0x3c00, 0xc000, 0x3800, 0x7bff, 0, 0x2e66]);
  const paint = paintChainOf(new Uint8Array([255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 0, 0]), 2);
  // Averaged in linear light: half of red is 188 in sRGB, not 128; alpha half.
  assert.deepEqual([...paint.subarray(16)], [188, 0, 0, 128]);
});

test("residency: the largest objects' kinds take the pools, the holders a little favoured, the unseen evicted first", () => {
  const layers = 10;
  const residency = new Residency(layers, [layers, 2, 2, 2]);
  assert.equal(residency.pin(0, 3), 0);
  for (let layer = 0; layer < layers; layer += 1) residency.bake(layer);
  const radius = new Float32Array(layers);
  // Kinds 1–4 large (512²), 5–6 mid (256²).
  [0, 200, 180, 160, 150, 40, 30, 0, 0, 0].forEach((r, layer) => (radius[layer] = r));
  residency.plan(radius, 0.5, 1);
  assert.deepEqual([...residency.desired], [0, 3, 2, 2, 1, 1, 0, 0, 0, 0]);
  // The pinned bubble holds one of the two 512² slots: kind 1 gets the other.
  assert.equal(residency.place(1, 3), 1);
  assert.equal(residency.address[1], 3 * ADDRESS_TIER + 1);
  assert.equal(residency.place(2, 3), -1, "the pinned bubble and a wanted holder are never evicted");
  assert.equal(residency.place(2, 2), 0);
  assert.equal(residency.place(3, 2), 1);
  assert.deepEqual(residency.tiersToBake(4), [1]);
  // Spare room filled by a bake that was not for it, only where free.
  assert.equal(residency.place(9, 1, false), 0);
  assert.equal(residency.place(8, 1, false), 1);
  assert.equal(residency.place(7, 1, false), -1);
  // Next plan: 9 and 8 unseen and unwanted, so a wanting kind evicts one of them.
  residency.plan(radius, 0.5, 2);
  assert.equal(residency.place(4, 1), 0);
  assert.equal(residency.address[9], 9, "evicted back to its own 64² layer");
  // A holder is favoured by a quarter: kinds 2 and 3 keep their 256² slots against a new kind of 190…
  radius.fill(0);
  [0, 200, 170, 160, 0, 190].forEach((r, layer) => (radius[layer] = r));
  residency.plan(radius, 0.5, 3);
  assert.equal(residency.desired[3], 2);
  assert.equal(residency.desired[5], 1);
  // …but not against one of 210.
  radius[5] = 210;
  residency.plan(radius, 0.5, 4);
  assert.equal(residency.desired[5], 2);
  assert.equal(residency.desired[3], 1);
});
