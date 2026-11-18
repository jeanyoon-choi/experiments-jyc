// The bubble's own field, apart from fields.ts: the object pass makes it on the main thread at once (every kind is
// drawn as the bubble until its bake is in), and must not take the shapes, marks and catalogue with it.

import { FIELD_EXTENT, FIELD_SIZE, MEMBRANE_SIZE, type Field } from "./frame.ts";

/** The bubble's field, exactly and at once (the raft's first frames need it): a unit sphere over its disc. */
export function bubbleField(): Field {
  const unit = (FIELD_EXTENT * 2) / FIELD_SIZE;
  const data = new Float32Array(FIELD_SIZE * FIELD_SIZE * 4);
  for (let y = 0; y < FIELD_SIZE; y += 1) {
    for (let x = 0; x < FIELD_SIZE; x += 1) {
      const px = (x + 0.5) * unit - FIELD_EXTENT;
      const py = (y + 0.5) * unit - FIELD_EXTENT;
      const r = Math.hypot(px, py);
      const at = (y * FIELD_SIZE + x) * 4;
      const h = r < 1 ? Math.sqrt(1 - r * r) : 0;
      data[at] = h;
      data[at + 1] = r - 1;
      data[at + 2] = r < 1 ? px : 0;
      data[at + 3] = r < 1 ? py : 0;
    }
  }
  const membrane = new Float32Array(MEMBRANE_SIZE * MEMBRANE_SIZE);
  const cell = (FIELD_EXTENT * 2) / MEMBRANE_SIZE;
  for (let y = 0; y < MEMBRANE_SIZE; y += 1) {
    for (let x = 0; x < MEMBRANE_SIZE; x += 1) {
      const r = Math.hypot((x + 0.5) * cell - FIELD_EXTENT, (y + 0.5) * cell - FIELD_EXTENT);
      membrane[y * MEMBRANE_SIZE + x] = r < 1 ? Math.sqrt(1 - r * r) : 0;
    }
  }
  return { data, thickness: 1, peak: 1, membrane, reach: 1 + 2 * unit, outline: 1 + 2 * unit };
}
