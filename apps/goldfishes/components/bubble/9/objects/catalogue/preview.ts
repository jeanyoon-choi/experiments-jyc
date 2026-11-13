// A contact sheet of catalogue kinds, baked as the raft bakes them, for checking shapes without a browser:
//   node components/bubble/9/objects/catalogue/preview.ts <group module> <out.png> [kind ids…] [--colour]
// (run from apps/goldfishes; <group module> e.g. components/bubble/9/objects/catalogue/apps.ts, exporting a
// CatalogueGroup as its default or as the only CatalogueGroup export). Each cell is the field lit by one soft key
// from the upper left over plaster-white, or, with --colour, its paint; the kinds' order is printed.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";
import { FIELD_SIZE } from "../fields/fields.ts";
import { fieldOfModel } from "./model.ts";
import { fieldOfRelief } from "./relief.ts";
import type { CatalogueGroup, CatalogueKind } from "./types.ts";

const CELL = 256;

function crc32(buffer: Buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function png(width: number, height: number, rgb: Uint8Array) {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function bake(kind: CatalogueKind) {
  if (kind.make.source === "relief") return fieldOfRelief(kind.make);
  return { field: fieldOfModel(kind.make), albedo: null };
}

const [, , modulePath, out, ...rest] = process.argv;
if (!modulePath || !out) throw new Error("usage: preview.ts <group module> <out.png> [kind ids…] [--colour]");
const colour = rest.includes("--colour");
const wanted = rest.filter((arg) => !arg.startsWith("--"));
const exported = (await import(pathToFileURL(resolve(modulePath)).href)) as Record<string, unknown>;
const group = (exported.default ?? Object.values(exported).find((value) => value && typeof value === "object" && "kinds" in value)) as CatalogueGroup;
const kinds = wanted.length > 0 ? group.kinds.filter((kind) => wanted.includes(kind.id)) : group.kinds;
const columns = Math.min(8, kinds.length);
const rows = Math.ceil(kinds.length / columns);
const sheet = new Uint8Array(columns * CELL * rows * CELL * 3).fill(255);
const light = [-0.45, -0.55, 0.7];
const norm = Math.hypot(...light);
kinds.forEach((kind, index) => {
  const started = performance.now();
  const { field, albedo } = bake(kind);
  const ox = (index % columns) * CELL;
  const oy = Math.floor(index / columns) * CELL;
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const fx = Math.floor(((x + 0.5) / CELL) * FIELD_SIZE);
      const fy = Math.floor(((y + 0.5) / CELL) * FIELD_SIZE);
      const at = (fy * FIELD_SIZE + fx) * 4;
      if (field.data[at + 1]! > 0) continue;
      const nx = field.data[at + 2]!;
      const ny = field.data[at + 3]!;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lit = Math.max(0, (nx * light[0]! + ny * light[1]! + nz * light[2]!) / norm);
      let base = [232, 228, 220];
      if (colour && albedo) {
        const a = (Math.floor((y / CELL) * 256) * 256 + Math.floor((x / CELL) * 256)) * 4;
        // Premultiplied by the share painted (relief.ts): the paint's own colour where any.
        const alpha = albedo[a + 3]! / 255;
        if (alpha > 0) base = [albedo[a]! / alpha, albedo[a + 1]! / alpha, albedo[a + 2]! / alpha];
      }
      const shade = 0.35 + 0.75 * lit;
      const o = ((oy + y) * columns * CELL + ox + x) * 3;
      for (let c = 0; c < 3; c += 1) sheet[o + c] = Math.min(255, base[c]! * shade);
    }
  }
  console.log(`${index}\t${kind.id}\t${kind.label}\t${(performance.now() - started).toFixed(0)} ms, outline ${field.outline.toFixed(2)}`);
});
writeFileSync(out, png(columns * CELL, rows * CELL, sheet));
console.log(`wrote ${out}`);
