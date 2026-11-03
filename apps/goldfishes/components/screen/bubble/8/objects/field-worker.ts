// Bakes objects' fields (fields.ts) off the main thread: each takes 70–130 ms,
// and baked in the frame loop they stalled the first two seconds (measured
// 2026-10-27: fifteen frames of 100–167 ms). Asked for a kind, it answers with
// its field, the buffers handed over rather than copied. A face (faces.ts)
// first fetches and decodes its portrait and its head's matte, and answers
// with its colours too (headAlbedo, the scan's texture); if the portrait fails
// it is baked from a blank one, a head without a likeness, so the layer never
// waits forever.

import { ALBEDO_SIZE, FACES, headAlbedo, loadPortrait, type Portrait } from "./faces";
import { FIELD_EXTENT, fieldOf, fieldOfHead, type Field, type FieldKind } from "./fields";
import { KIND, type FaceKind } from "./groups";

export type FieldRequest = { layer: number; kind: FieldKind };
/** A baked layer: its field, and for a face its colours (ALBEDO_SIZE² RGBA, sRGB, over the field's frame). */
export type FieldAnswer = { layer: number; field: Field; albedo: Uint8ClampedArray | null };

const BLANK: Portrait = { width: 2, height: 2, luminance: new Float32Array(4).fill(0.5) };

async function bake(kind: FieldKind): Promise<{ field: Field; albedo: Uint8ClampedArray | null }> {
  if (kind === "bubble" || KIND[kind].source !== "face") return { field: fieldOf(kind), albedo: null };
  const face = FACES[kind as FaceKind];
  const portrait = await loadPortrait(face).catch(() => BLANK);
  return { field: fieldOfHead(portrait, face.box), albedo: headAlbedo(portrait, face.box, ALBEDO_SIZE, FIELD_EXTENT) };
}

self.onmessage = async (event: MessageEvent<FieldRequest>) => {
  const { layer, kind } = event.data;
  const { field, albedo } = await bake(kind);
  const transfer: ArrayBuffer[] = [field.data.buffer as ArrayBuffer, field.membrane.buffer as ArrayBuffer];
  if (albedo) transfer.push(albedo.buffer as ArrayBuffer);
  (self as unknown as Worker).postMessage({ layer, field, albedo } satisfies FieldAnswer, transfer);
};
