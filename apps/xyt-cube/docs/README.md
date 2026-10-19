# xyt-cube experiments

Experimental archive for the (x, y, t) moving-image cube: a clip is treated as
a cube, the screen shows one slice under a fixed rule, and phones change the
cube's geometry. Local HTTPS port 2003; no Vercel project yet.

The first variant is [spacetime/1](./spacetime/1.md): screen
`/screen/spacetime/1` with three phone links, O1 compact, O2 boost, O3 mass.

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
