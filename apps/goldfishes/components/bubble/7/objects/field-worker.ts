// Bakes objects' fields (fields.ts) off the main thread: each takes 70–130 ms,
// and baked in the frame loop they stalled the first two seconds (measured
// 2026-10-27: fifteen frames of 100–167 ms). Asked for a kind, it answers with
// its field, the buffers handed over rather than copied.

import { fieldOf, type FieldKind } from "./fields";

export type FieldRequest = { layer: number; kind: FieldKind };

self.onmessage = (event: MessageEvent<FieldRequest>) => {
  const { layer, kind } = event.data;
  const field = fieldOf(kind);
  (self as unknown as Worker).postMessage({ layer, field }, [field.data.buffer, field.membrane.buffer]);
};
