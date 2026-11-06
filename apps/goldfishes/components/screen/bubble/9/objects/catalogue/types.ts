// 기호의 파티 (bubble/9, user 2026-11-05): the catalogue of new object groups — UI icons as shipped, app icons,
// AI start-ups' marks and stock tickers.
// Each group is one module in this folder exporting a CatalogueGroup; index.ts lists them and groups.ts
// merges them with bubble/5–8's groups, so a group's agent edits only its own module.
//
// A kind is a shape only: the chosen material covers it whole, as every bubble/5–8 object (docs/agent-onboarding.md,
// object party rules). It is made one of two ways, both baked into the same field as every other object:
//   relief — vector layers (SVG path data), each with a height blown up as its own balloon over its outline, as
//            테크 로고 and 통화 기호 are (relief.ts); a layer's `paint` is kept for the record and never shown.
//   model  — three.js geometry seen from above (y up in three.js's frame, the front towards +z), fitted to the disc
//            and softened a little (model.ts).

import type * as THREE from "three";

/** A colour: hex ("#ff3b30" or "ff3b30"), or a gradient in the relief's viewBox coordinates. */
export type Paint =
  | string
  | { readonly linear: readonly [number, number, number, number]; readonly stops: readonly (readonly [number, string])[] }
  | { readonly radial: readonly [number, number, number]; readonly stops: readonly (readonly [number, string])[] };

export type ReliefLayer = {
  /** SVG path data, in the relief's viewBox. Filled with the non-zero rule unless `stroke` is set. */
  readonly d: string;
  /** Stroked instead of filled: the stroke's width in viewBox units (round caps and joins, as Lucide draws). */
  readonly stroke?: number;
  /** Height this layer adds where it covers, in object units (the disc's radius is 1; an app icon's tile ~0.2). Negative engraves. */
  readonly height: number;
  /** How far in from its edge the layer rounds up to its full height, in object units (default: its height, capped at 0.08). */
  readonly bevel?: number;
  /** Grows the fill this much all round (object units) before it is blown up: lettering's weight (tickers, coins). */
  readonly bold?: number;
  /** Scales this layer's balloon height (default 1): lettering made as full as the 통화 기호' glyphs. */
  readonly puff?: number;
  /** Kept for the record; never shown (the material covers every kind whole). */
  readonly paint?: Paint;
};

export type ReliefMake = {
  readonly source: "relief";
  /** The viewBox the layers' path data are in: x, y, width, height. */
  readonly viewBox: readonly [number, number, number, number];
  readonly layers: readonly ReliefLayer[];
  /** How far the object reaches from its centre, in disc radii (MARK_FILL 1.18 by default). */
  readonly fill?: number;
};

export type ModelMake = {
  readonly source: "model";
  /** Its parts in three.js's frame (any attributes; only positions and normals are kept). `detailed` false: lighter. */
  readonly parts: (detailed: boolean) => THREE.BufferGeometry[];
  /** How far it reaches from its centre, in disc radii (1.05–1.4, as the bubble/5–8 models). */
  readonly fill?: number;
};

export type CatalogueKind = {
  /** Stable id, unique across every group (camelCase, ascii). */
  readonly id: string;
  /** Label in the panels. */
  readonly label: string;
  /** The feed's keyword (link/feed.ts). */
  readonly feed: string;
  /** Its subgroup within the group, as the panel lists it (e.g. "알림·소셜"). */
  readonly sub: string;
  /** Off at the start. */
  readonly off?: true;
  readonly make: ReliefMake | ModelMake;
  /** Where its data came from (package and icon name, or a URL), for the record. */
  readonly source?: string;
};

export type CatalogueGroup = {
  /** Stable id (camelCase, ascii), unique among all groups. */
  readonly id: string;
  readonly label: string;
  readonly kinds: readonly CatalogueKind[];
};
