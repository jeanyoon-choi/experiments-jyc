# xyt-cube experiments

Experimental archive for the (x, y, t) moving-image cube: a clip is treated as
a cube, the screen shows one slice under a fixed rule, and phones change the
cube's geometry. Local HTTPS port 2003; no Vercel project yet.

The first variant is [spacetime/1](./spacetime/1.md): screen
`/screen/spacetime/1` with three phone links, O1 compact, O2 boost, O3 mass.
It replaced the note's geometry with relativity metaphors and kept the
projection fixed; it is kept as a failed attempt.

The moving-image family (named `cubism` until 2026-10-20; `/screen/cubism/*`
and `/mobile/cubism/*` still open the same variants) takes a recorded clip
into the cube.

[moving-image/1](./moving-image/1.md) is the note's Option B after Fels, Lee & Mase's
video cubism: the cube stays, the projection plane turns. Screen
`/screen/moving-image/1`, phone `/mobile/moving-image/1`; clips from
`scripts/build-cube.sh` (1920×1080 or larger).

[moving-image/2](./moving-image/2.md) is the note's Option A: the plane stays the
ordinary present and the cube itself is bent by six geometries (non-orthogonal
axes, cylindrical and spherical coordinates, constant curvature, Clifford
torus, Möbius flux). Screen `/screen/moving-image/2`, phone `/mobile/moving-image/2`.

[moving-image/3](./moving-image/3.md) makes both continuous (optical-flow
interpolation between frames). [moving-image/4](./moving-image/4.md) is
moving-image/3 over fixed-viewpoint time-lapses only (a day, a crossing, the
Earth from orbit, a glacier's decades), each about 10 MB. Screen
`/screen/moving-image/4`.

[clock/1](./clock/1.md) is a separate family: no recorded footage, but a
clock defined directly in (x, y, t) (SCC clock palette; analogue and
seven-segment), whose cube is turned like moving-image/1. Screen
`/screen/clock/1`. [clock/2](./clock/2.md) is moving-image/2's operation on
the same clock (the plane stays the present, the cube is bent; a true Möbius
gluing replaces the flux). Screen `/screen/clock/2`. [clock/1-3d](./clock/1-3d.md)
and [clock/2-3d](./clock/2-3d.md) do the same to a real 3D clock, ray-traced per
pixel at the pixel's own time.

New variants belong in `components/<family>/<serial>/`, with the doc at
`docs/<family>/<serial>.md`; register the ISO date in
`components/experiments.ts`. Socket handlers live in
`socket/experiments/<family>/<serial>/` with their own events and room.
Clips are built with `scripts/build-atlas.sh`.

| Route | Date |
| --- | --- |
| `/screen/spacetime/1` | 2026-10-19 |
| `/mobile/spacetime/1/compact` | 2026-10-19 |
| `/mobile/spacetime/1/boost` | 2026-10-19 |
| `/mobile/spacetime/1/mass` | 2026-10-19 |
| `/screen/moving-image/1` | 2026-10-20 |
| `/mobile/moving-image/1` | 2026-10-20 |
| `/screen/moving-image/2` | 2026-10-20 |
| `/mobile/moving-image/2` | 2026-10-20 |
| `/screen/moving-image/4` | 2026-10-22 |
| `/screen/clock/1` | 2026-10-20 |
| `/screen/clock/2` | 2026-10-20 |
| `/screen/clock/1-3d` | 2026-10-20 |
| `/screen/clock/2-3d` | 2026-10-20 |
