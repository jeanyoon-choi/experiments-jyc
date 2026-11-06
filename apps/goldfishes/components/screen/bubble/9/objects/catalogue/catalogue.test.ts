import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, CylinderGeometry } from "three";
import { bakeMake, tiersOf } from "../fields/bake.ts";
import type { CatalogueGroup } from "./types.ts";
import { FIELD_SIZE } from "../fields/fields.ts";
import { BASE_GROUPS, GROUPS, KIND, KINDS_OF, mergedCatalogue, OBJECT_KINDS, SUBGROUPS_OF } from "../kinds/groups.ts";
import { groupBit, hashOf, kindIn, kindsInUse, OBJECT_DEFAULTS, onCount, pageKind, type ObjectParameters, withKinds } from "../kinds/parameters.ts";
import { TIER_FIELD, TIER_MEMBRANE, TIER_PAINT, TIERS } from "../fields/tiers.ts";

const TILE = "M2 2H22V22H2Z";
const SAMPLE: CatalogueGroup = {
  id: "sample",
  label: "샘플",
  kinds: [
    { id: "sampleTile", label: "타일", feed: "Tile", sub: "가", make: { source: "relief", viewBox: [0, 0, 24, 24], layers: [{ d: TILE, height: 0.2, bevel: 0.05, paint: "#ff3b30" }, { d: "M8 8H16V16H8Z", height: 0.06, paint: "#ffffff" }] } },
    { id: "sampleRing", label: "링", feed: "Ring", sub: "가", make: { source: "relief", viewBox: [0, 0, 24, 24], layers: [{ d: "M4 12A8 8 0 1 0 20 12A8 8 0 1 0 4 12", stroke: 2, height: 0.12 }] } },
    { id: "sampleBox", label: "상자", feed: "Box", sub: "나", off: true, make: { source: "model", fill: 1.2, parts: () => [new BoxGeometry(2, 1, 0.3), new CylinderGeometry(0.3, 0.3, 0.2, 24).rotateX(Math.PI / 2).translate(0.5, 0, 0.2)] } },
    // Taken ids are left out, never breaking the registry.
    { id: "heart", label: "dup", feed: "x", sub: "나", make: { source: "relief", viewBox: [0, 0, 24, 24], layers: [{ d: TILE, height: 0.2 }] } },
    { id: "size", label: "reserved", feed: "x", sub: "나", make: { source: "relief", viewBox: [0, 0, 24, 24], layers: [{ d: TILE, height: 0.2 }] } },
  ],
};

test("catalogue groups register after bubble/5–8's: kinds with their making and subgroup, taken ids left out", () => {
  const warn = console.warn;
  console.warn = () => {};
  const [group, ...rest] = mergedCatalogue([SAMPLE, { ...SAMPLE, id: "tech" }]);
  console.warn = warn;
  assert.equal(rest.length, 0, "a group id already taken is left out");
  assert.deepEqual(group!.kinds.map((kind) => kind.id), ["sampleTile", "sampleRing", "sampleBox"]);
  assert.equal(group!.kinds[0]!.entry.source, "relief");
  assert.equal(group!.kinds[2]!.entry.source, "model");
  assert.equal(group!.kinds[2]!.entry.off, true);
  assert.equal(group!.kinds[0]!.entry.sub, "가");
  // The registry as the app has it: the five groups first, every kind once, the catalogue's off in the opening's pages.
  assert.deepEqual(GROUPS.slice(0, 5), BASE_GROUPS);
  assert.equal(new Set(OBJECT_KINDS).size, OBJECT_KINDS.length);
  for (const g of GROUPS.slice(5)) assert.ok((OBJECT_DEFAULTS.pages & groupBit(g)) === 0, `${g} on at the start`);
  for (const kind of OBJECT_KINDS) assert.ok(KIND[kind] && KINDS_OF[KIND[kind].group].includes(kind), kind);
});

test("catalogue kinds bake into fields without paint (one material); every tier's slice is the full chain's level", () => {
  for (const kind of SAMPLE.kinds.slice(0, 3)) {
    const started = performance.now();
    const { field, albedo, paint } = bakeMake(kind.make);
    const took = performance.now() - started;
    assert.ok(field.thickness > 0.02 && field.peak > 0.02, kind.id);
    assert.ok(field.data[1]! > 0, `${kind.id}: the field's border is outside`);
    assert.equal(paint, null, kind.id);
    if (albedo) {
      // The tile is painted red, the square on it white.
      const at = (128 * 256 + 128) * 4;
      assert.deepEqual([...albedo.subarray(at, at + 4)], [255, 255, 255, 255]);
    }
    const tiers = tiersOf(field, albedo, TIERS);
    for (const tier of tiers) {
      const side = TIER_FIELD[tier.tier];
      let texels = 0;
      for (let s = side; s >= 1; s /= 2) texels += s * s;
      assert.equal(tier.field.length, texels * 4);
      assert.equal(tier.membrane.length, (TIER_MEMBRANE[tier.tier] ** 2 * 4 - 1) / 3);
      if (tier.paint) assert.equal(tier.paint.length, ((TIER_PAINT[tier.tier] ** 2 * 4 - 1) / 3) * 4);
    }
    // The 512² tier's first texel is the field's own (as a half float).
    const top = tiers[3]!.field;
    assert.ok(Math.abs(halfOf(top[1]!) - field.data[1]!) < 2e-3 * Math.max(1, Math.abs(field.data[1]!)));
    // The 64² tier's first level is the full chain's level 3.
    assert.deepEqual(tiers[0]!.field.subarray(0, 16), tiers[3]!.field.subarray(chainOffset(FIELD_SIZE, 3) * 4, chainOffset(FIELD_SIZE, 3) * 4 + 16));
    console.log(`  ${kind.id}: baked in ${took.toFixed(0)} ms`);
  }
});

function chainOffset(size: number, level: number) {
  let offset = 0;
  for (let at = 0; at < level; at += 1) offset += (size >> at) ** 2;
  return offset;
}

function halfOf(bits: number) {
  const exponent = (bits >> 10) & 0x1f;
  const mantissa = bits & 0x3ff;
  const sign = bits & 0x8000 ? -1 : 1;
  if (exponent === 0) return sign * 2 ** -14 * (mantissa / 1024);
  return sign * 2 ** (exponent - 15) * (1 + mantissa / 1024);
}

test("a page's kind from cached share tables is the one the per-kind walk gives", () => {
  const walk = (group: string, roll: number, parameters: ObjectParameters) => {
    const kinds = KINDS_OF[group]!;
    let total = 0;
    for (const kind of kinds) if (parameters[`${kind}On`] >= 0.5) total += Math.max(0, parameters[kind]!);
    if (total <= 0) return null;
    let left = roll * total;
    let last: string | null = null;
    for (const kind of kinds) {
      if (parameters[`${kind}On`] < 0.5 || parameters[kind]! <= 0) continue;
      last = kind;
      left -= parameters[kind]!;
      if (left < 0) return kind;
    }
    return last;
  };
  const shares: ObjectParameters = { ...OBJECT_DEFAULTS, gpu: 3, cloud: 0, rocket: 0.5, heartOn: 0, claude: 2 };
  for (const group of BASE_GROUPS) {
    for (let index = 0; index < 500; index += 1) {
      const roll = hashOf(index * 7.31);
      assert.equal(kindIn(group, roll, shares), walk(group, roll, shares), `${group} at ${roll}`);
    }
  }
  // The same parameters object, asked again: the same answer, from the table.
  assert.equal(pageKind(12, shares, 30), pageKind(12, shares, 30));
  assert.ok(kindsInUse(OBJECT_DEFAULTS).every((kind) => !KIND[kind].off));
});

test("the panels' subgroups cover each group's kinds once; 모두 켬 / 모두 끔 set a subgroup", () => {
  for (const group of GROUPS) assert.deepEqual(SUBGROUPS_OF[group]!.flatMap((sub) => sub.kinds), [...KINDS_OF[group]!], group);
  assert.equal(SUBGROUPS_OF.tech.length, 1);
  const kinds = KINDS_OF.sns;
  const off = withKinds(OBJECT_DEFAULTS, kinds, false);
  assert.equal(onCount(off, kinds), 0);
  assert.equal(onCount(withKinds(off, kinds, true), kinds), kinds.length);
  assert.equal(off.size, OBJECT_DEFAULTS.size);
});
