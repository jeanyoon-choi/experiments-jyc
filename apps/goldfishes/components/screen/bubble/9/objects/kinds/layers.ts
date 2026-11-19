// The layer registry: every kind's place in the fields' arrays, the bubble first. The object pass, the bakes'
// queue, the frame loop, 전파 and the feed all name a kind by its layer.

import type { FieldKind } from "../fields/fields.ts";
import { OBJECT_KINDS } from "./groups.ts";

/** The fields' layers: the bubble first, then every kind. */
export const FIELD_KINDS: readonly FieldKind[] = ["bubble", ...OBJECT_KINDS];
const LAYER = new Map(FIELD_KINDS.map((kind, layer) => [kind, layer]));
/** A kind's layer (0 for none: the bubble; −1 unknown), by a map: it runs per page per frame, over hundreds of kinds. */
export const layerOf = (kind: FieldKind | null) => (kind === null ? 0 : (LAYER.get(kind) ?? -1));
