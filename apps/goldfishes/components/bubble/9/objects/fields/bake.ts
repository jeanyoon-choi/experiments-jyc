// One kind's bake, whatever makes it: bubble/5–8's kinds as fields.ts makes them (unchanged), a face from its
// decoded portrait with its photograph's colours (faces.ts), and the catalogue's kinds (catalogue/relief.ts,
// catalogue/model.ts) with their own paint. Kept apart from fields.ts so the catalogue's modules, which build on
// fields.ts, never import it back. The workers (field-worker.ts) and the tests bake through here.

import { fieldOfModel } from "../catalogue/model.ts";
import { fieldOfRelief } from "../catalogue/relief.ts";
import type { ModelMake, ReliefMake } from "../catalogue/types.ts";
import { ALBEDO_SIZE, FACES, headAlbedo, loadPortrait, type Portrait } from "../shapes/faces.ts";
import { FIELD_EXTENT, fieldOf, fieldOfHead, type Field, type FieldKind } from "./fields.ts";
import { KIND, type FaceKind } from "../kinds/groups.ts";

// The tiers' slices (tier-data.ts), as the workers and the tests take them from here.
export { tiersOf, type TierData } from "./tier-data.ts";

/** What its paint is: a face's photograph (얼굴 사진 색), or none (the catalogue's kinds bake without paint: one material). */
export type PaintKind = "face" | null;

/** A baked kind: its field and, if it has one, its paint (ALBEDO_SIZE² RGBA, sRGB, over the field's frame). */
export type Baked = { field: Field; albedo: Uint8ClampedArray | null; paint: PaintKind };

const BLANK: Portrait = { width: 2, height: 2, luminance: new Float32Array(4).fill(0.5) };

/** A catalogue kind's making baked: its field and paint (a relief's, if any layer is painted). */
export function bakeMake(make: ReliefMake | ModelMake): Baked {
  if (make.source === "model") return { field: fieldOfModel(make), albedo: null, paint: null };
  return { field: fieldOfRelief(make).field, albedo: null, paint: null };
}

/** A catalogue kind's field and paint, at once. */
function bakeCatalogue(kind: FieldKind): Baked {
  const make = kind === "bubble" ? undefined : KIND[kind]?.make;
  if (!make) throw new Error(`${kind}: not a catalogue kind`);
  return bakeMake(make);
}

/** Any kind (a face fetches its portrait first; if that fails, a head without a likeness, so nothing waits for ever). */
export async function bakeKind(kind: FieldKind): Promise<Baked> {
  if (kind === "bubble") return { field: fieldOf(kind), albedo: null, paint: null };
  const entry = KIND[kind];
  if (entry?.make) return bakeCatalogue(kind);
  if (entry?.source !== "face") return { field: fieldOf(kind), albedo: null, paint: null };
  const face = FACES[kind as FaceKind];
  const portrait = await loadPortrait(face).catch(() => BLANK);
  return { field: fieldOfHead(portrait, face.box), albedo: headAlbedo(portrait, face.box, ALBEDO_SIZE, FIELD_EXTENT), paint: "face" };
}
