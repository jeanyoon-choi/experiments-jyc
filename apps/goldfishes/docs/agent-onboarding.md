# Goldfishes working contract

Start with the target route's document and modules plus `components/experiments.ts`; follow only relevant links. For a new or substantial experiment, also read root `AGENTS.md` and the SCC [tinkering](../../../docs/foundations/tinkering.md) guidance; use [design](../../../docs/foundations/design-guidelines.md) for a new/materially redesigned UI and [history](./research-and-rendering-history.md) only when its rendering or historical decisions apply.

## Method

Goldfishes tests one change in the relation between a school, its attention field, participant input, and viewpoint. Keep a recognizable working parent; change one operative material, geometry, topology, temporal rule, or input relation; compare the result directly. A new directory is a standalone copy, not a candidate for shared abstraction. Public image URLs are allowed, but data lists selecting them remain local; company logos are the sole shared immutable collection.

Before coding, write:

```text
question: what relation is tested?
baseline: closest complete parent
mutation: exact changed behavior/material/geometry/input
invariants: every unrequested visual and interaction contract
evidence: observable or measurable result
```

Unmentioned properties are invariants. A geometry change does not authorize new locomotion, camera, palette, controls, layout, or media scheduling. A prompt saying “same as” calls for local reproduction unless it explicitly asks for shared architecture.

## Visual and technical floor

- The changed relation must read without labels, metrics, scenery, water decoration, badges, panels, or technical chrome. Leva is collapsed authoring UI, never the artwork's wrapper.
- Geometry, hit areas, targets, projections, and resize behavior must share coordinates. 3D must be perceptible in the relevant view, not merely use 3D primitives.
- Preserve legible fish anatomy, heading, tail motion, gathering, and collision behavior. Materials must not stretch, seam, flip, crop unintentionally, or flicker identity.
- Stable identities stay stable across redraw, resize, and theme changes unless the experiment explicitly resamples them. Keep workload bounded; distinguish an architectural bound from an FPS result.

## Object party rules

For any new object or sign group in the bubble family (bubble/5 onward: 기호의 파티, 오브제 대잔치, any new kinds). Learnt from bubble/9's failed first catalogue ([record](./screen/bubble/9.md#failure-the-first-catalogue-broke-the-objectmaterial-contract-2026-11-05)).

- **Object and material are decomposed, never bound.** An object is only a shape (a field: height and normal). Its look is the material chosen in 비주얼 → 재질, the same for every object: under 쿤스 (코팅) every object is that coating, under 맥시멀 믹스 each takes its coat colour over its whole body. A new kind never carries its own colours, printed lines, textures or a separate albedo path. The photo colour of 유명인 얼굴 and the brand colour of 테크 로고 are opt-in sliders at 0, and nothing new adds to them.
- **Volume first.** Every kind is a volume. Flat signs (icons, logos, glyphs) are blown up as a balloon over their outline, as 테크 로고, 통화 기호 and SNS are (`objects/fields.ts`, in bubble/9 `objects/fields/fields.ts`; membrane ∇²u = −1, height 2√u). Never a flat slab with engraved lines, since reflective materials show one patch of room on a flat face. A sign with no possible volume (line diagrams, notation, charts) is not a kind.
- **The silhouette must name it.** A kind is a candidate only if its outline and volume alone say what it is. Things known by their print, colour or engraving (a banknote, a coin's die, a printed label) fail under one material, and heavier texture does not save them (bubble/9 달러·센트).
- **Slightly abstracted, not super-real.** Keep the silhouette and the main masses that make the thing recognisable. Drop grilles, vents, lettering, lattices, wires and hairlines; thin structures become plump parts. Match the chunkiness of bubble/5–8's models (rocket, robot, GPU card), not CAD.
- **Check in the raft, under the materials.** Before passing a kind, look at it in the running route in 쿤스 (코팅) and 맥시멀 믹스 beside bubble/5–8's objects (통화 기호 and 유명인 얼굴 are the reference that passed). A plaster-lit contact sheet is not acceptance.
- **Never decide for the user.** Do not leave out, swap or rename kinds the user asked for, or switch some off; report doubts instead.

## Archive workflow

1. Inspect status, the registry, target date folder, and untracked files. Treat all concurrent work as owned.
2. Copy the closest complete experiment to the next serial of its family, `components/<area>/<family>/<n+1>` (serials rise with creation date; start a new family at `1`), and register its ISO date; make changes inside it only.
3. Register one date, route, and concrete phrase in `experiments.ts`; add the matching concise document. A dated route is permanent. Promotion deliberately replaces `default` while retaining the dated origin.
4. Record implementation facts, observation conditions, failed alternatives, and unresolved questions. Do not turn an inference into evidence.
5. Re-open shared registry/index files immediately before patching. Do not reorder, normalize, adopt, delete, or report other work.

Completion means one intelligible question, a standalone implementation, preserved invariants, a resolved visible relation, and an honest record of result and uncertainty.
