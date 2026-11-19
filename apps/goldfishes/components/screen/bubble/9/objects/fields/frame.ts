// The fields' frame: what the bakes (fields.ts, bake.ts), the tiers' slices (tier-data.ts) and the object pass's
// shader agree on. Nothing else is here, so the main thread takes these without the shapes behind the bakes.

/** The field covers [−EXTENT, EXTENT]² of the object's frame (objects reach at most 1.4 of the disc). */
export const FIELD_EXTENT = 1.5;
/** Texels per side. */
export const FIELD_SIZE = 512;
/** The membrane's texels per side. */
export const MEMBRANE_SIZE = 128;
/** Rasterised this many times finer, then averaged down, so the outline's distance is exact to a fraction of a texel. */
export const SUPERSAMPLE = 2;
/** Texels per side of a face's colour (its albedo) over the field's frame. */
export const ALBEDO_SIZE = 256;

export type Field = {
  /** FIELD_SIZE² texels, RGBA: height, signed distance, normal x, normal y. */
  data: Float32Array;
  /** The deepest point inside the outline (its inscribed radius), object units. */
  thickness: number;
  /** The highest point of its top surface. */
  peak: number;
  /** MEMBRANE_SIZE² texels: the outline's membrane height (see fields.ts's header). */
  membrane: Float32Array;
  /** How far the outline reaches from the centre along x or y at most (the square it is drawn in). */
  reach: number;
  /** How far the outline reaches from the centre in any direction: the disc the goldfish keep out of. */
  outline: number;
};
