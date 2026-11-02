# 삼다수

`/mobile/samdasoo/1` (2026-11-02) sets one bare 500 mL 제주삼다수 bottle, without its label, on a studio floor in three.js, at [`/mobile/samdasoo/[experiment]`](../../../app/mobile/samdasoo/[experiment]/page.tsx).

- Geometry (cm, `scene.ts`): lathed PET shell 6.6 cm across and 21.6 cm to the cap; five-foot petaloid base, seven grip grooves (four below, three above the recessed, empty label panel), a cosine shoulder to a 1.36 cm neck with its support ring. Cap: one 96-ridge knurled lathe including its tamper band.
- Shading: no lights, environment or tone mapping. Every surface is a function of its view angle only (`ShaderMaterial`): water pale `#d8edf5` at the facing centre to `#4f9cc6` at the turning edge with one soft fixed band of light; PET only as edge ink `#5d7a8c`, so grooves, shoulder and neck draw as lines; cap flat `#2f8fd0` stepped by one fixed direction. Flat `#eef1f2` ground and one soft contact shadow.
- Interaction: slow auto-turn; one-finger drag orbits (polar limited), pinch zooms; auto-turn resumes 2.5 s after release. DPR capped at 2.

History (all 2026-11-02): the first version wrapped a drawn Hallasan label and used physical materials (transmissive water, additive PET reflections under RoomEnvironment, a key light, a floor caustic). The label, key light and caustic were removed at the user's request (bottle only, light too strong); the remaining physical render was then judged tacky (milky body, glowing white halo at neck and edges, stock-render look) and replaced by the view-angle shading above.

Checks: lint and typecheck; seen in the browser at a desktop window size (front view and after a drag orbit). Not yet seen on a phone.
