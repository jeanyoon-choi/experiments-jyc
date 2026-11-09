# 대치동 /1

Route: [`/mobile/daechi/1`](../../../app/mobile/daechi/[experiment]/page.tsx), created 2026-11-02. Code: `components/mobile/daechi/1/`.

Tested relation: whether a phone can hold the density of a Daechi-dong academy street at about 10 p.m. — the moment classes let out — in plain three.js WebGL, from the elevated view of the press photo looking down 대치동 학원가 with the sidewalk full of students.

## Composition

- Street frame (metres, looking down −z; the world runs z = +40 to −250 since the 2026-11-02 performance pass): left facades at x = −14, sidewalk to the curb at −6.3, two traffic lanes toward the viewer plus a curb lane of parked yellow 학원차 with blinking hazards, a median at 3.6–5.4, three lanes away, the right sidewalk 15.3–21.
- Signs come from one 2048² canvas atlas: 32 stacked vertical names, 24 horizontal floor signs with floor chips or phone lines, 4 red/amber/green dot-matrix tickers. Names are invented; only the grammar is Daechi's. Per facade: shop fascias, floor signs on 2F–7F, one or two projecting vertical stacks of 2–5 separate academies, occasional rooftop boards with running bulbs. Modes: steady, blink, pulse, scrolling LED, chase bulbs, faulty flicker. Each sign has an additive halo quad in place of bloom.
- Buildings (since the third revision): Daechi's five-to-ten-floor commercial buildings, not glass towers. Tiled walls (beige, brown brick, grey, off-white, red brick, per building), a concrete band under each floor's aluminium ribbon window, 1.15 m panes, rooms of four panes mostly lit by fluorescent light, rooftop stair penthouses and water tanks, apartment slabs on the horizon. About 70 % of floors letter their glass in cut vinyl, one character per pane (수 학 학 원, 클 리 닉, 국 어 학 원 …; 20 words, red, blue, white or yellow), drawn in the building shader from a 1024² glyph atlas with `textureGrad` so mip levels hold across pane edges.
- Sign density (since the third revision): every floor's band carries signs packed edge to edge (90 % of floors, 0.85–1.1 m tall), up to three projecting stacks of 2–5 units per building, rooftop boards on 45 %.
- 1,050 goldfish students (800 left, 250 right) in one instanced draw. Each fish stands on its tail, turned 90° from swimming: nose up, belly forward, eyes on the sides, a school backpack with straps on its back, the dorsal fin above the bag and the fantail hanging behind two short legs. Legs swing, pectoral fins flap, the tail sways, the body waddles on the hips; standing fish (about a third, near the curb and shop doors) breathe and hold glowing phones. Coats: orange, gold, red-and-white, calico, black. Movement is analytic in the vertex shader (wrapped along z), so the CPU uploads nothing per frame.
- Traffic: stop-and-go per lane with brake lights, billboard head/tail flares and wet-road streaks.
- Lighting is entirely fake and shared (`streetLight` in `shaders.ts`): shopfront spill from both facades, sodium lamps every 26 m that match the lamp posts, and a magenta/blue/green signage wash near the walls. No real lights, shadows or post-processing.

## Interaction

The viewport is fixed. A finger on a goldfish or a car takes it out of the street (screen-space pick against the same analytic motion as the shaders) and lifts it slightly nearer the camera along the finger's ray, so it rises under the finger: a fish upright and kicking, a car slowly tumbling. Several fingers hold several things. On release it keeps the finger's fling (at most 22 m/s, with an upward kick when nearly still) and flies nose-first, back or roof to the sky — fish at 8–13 m/s, cars at 12–17 m/s — seeking the nearest unclaimed unbroken sign, passing through it and bouncing off toward the next; any sign in its path breaks too (a car's reach is about twice a fish's). A broken sign and its halo vanish and fall as a grid of up to 7×7 pieces showing their part of the face, lit and dimming, spinning down to lie flat and fading after eight seconds.

Chain reaction: a flyer below 3.2 m knocks every walking fish within 1.6 m (2.6 m for a car) and every car within a further 1.4 m into the air, and each broken sign sends up to two fish from the ground within 6 m up after it. Launched things arc for half a second, then hunt signs too. It stops only at the capacities: 160 flying fish, 40 flying cars (a finger then replaces the oldest of that kind), 1,200 pieces in a ring buffer. Signs are binned by 4 m of z for the collision test. Code: `play.ts`.

## Budget

About ten draw calls, 24 Hz, reduced motion holds a still frame. Drag turns the head (±43° yaw) and eases back.

Resolution is adaptive between DPR 0.75 and min(device, 2), starting at 1.5. Between renders rAF keeps ticking at the display rate; the tick right after a render is late when the GPU is still busy, so its interval measured against the display refresh is the render's cost. Below 1.2 refreshes the DPR climbs by 0.1; above 1.7 it drops by 15 %, at most once per 1.2 s. Opaque meshes draw near occluders first (fish, cars, props, trees, signs, buildings, ground last) so early depth rejects hidden ground and wall pixels. The sign atlas is the 2048 layout drawn at 1.5× (3072², about 48 MB with mipmaps).

This exceeds the [GPU safety budget](../../../../../docs/harness/webgpu-tsl-particles.md)'s DPR 1. The user observed the DPR 1 route running well on their phone and asked for maximum sharpness (2026-11-02). No 30-second console/GPU record at DPR 2 on the phone exists yet; the adaptive floor is the fallback.

## History

- 2026-11-02, first version: 1,680 low-poly people, curb and median trees every 8–10 m, world to z = −330. Seen on the desktop route: the street read as intended, but the left-curb and median canopies hid the sidewalk and the road from the camera. The user reported that it ran poorly on a phone.
- 2026-11-02, revision: people replaced by goldfish; trees reduced to one small row on the right sidewalk every 16–20 m; world shortened to −250 and the crowd to 1,050; fewer sign halos, smaller margins, none on shop fascias or the skyline; the lighting only evaluates the lamp on the nearer curb; adaptive resolution added. Not yet measured on the phone.
- 2026-11-02, sharpness: the user reported performance fine but the image too soft on the phone at DPR ≤ 1. The cap was raised to adaptive DPR up to 2 (start 1.5), the atlas sharpened to 1.5×, and the draw order changed so near occluders draw first. The desktop route renders with no console errors; phone frame rate and the DPR it settles at are not measured.
- 2026-11-02, interaction: drag-to-look removed; tapping a goldfish lifts it under the finger and, released, it swims off smashing signs into falling pieces. Seen on the desktop route with a rAF shim: two flung fish broke the near left-facade stacks one after another, pieces landed on the sidewalk, no console or shader errors. Not yet tried on the phone.
- 2026-11-02, flying cars and the Daechi buildings: cars can be lifted and flung; low flyers and broken signs launch the fish and cars around them; buildings rebuilt as tiled academy buildings with ribbon windows lettered one character per pane; floor signs packed edge to edge on every floor. Seen on the desktop route with a rAF shim: one flung fish and one car emptied the near sidewalk into the air within seconds and stripped the near left facade of signs; window lettering read clearly (클 리 닉, 국 어 학 원); no console or shader errors. Not yet tried on the phone; the chain may be too fast and the per-frame cost with 200 flyers is unmeasured.

## /2 — breaking the street by force (2026-11-09)

Route: [`/mobile/daechi/2`](../../../app/mobile/daechi/[experiment]/page.tsx). Code: `components/mobile/daechi/2/`, started as a copy of `/1`. `/1` is unchanged.

Tested relation: whether how hard the finger throws reads as how much of the street breaks.

- A fish never sets other fish flying (no fish-on-fish sweep, no fish launched by a sign a fish broke). Cars still do both.
- Power is the finger's speed at release, in screen heights per second × 1.5 (a car × 1.4); a finger that stopped before letting go throws at 0. Each hit spends 55 % of it. Below 0.6 a hit breaks only the sign. From 0.6 it also breaches the wall behind the sign: a ragged hole (radius 1.7–3.5 m, a car up to 4.5 m) showing a floor slab and half-lit room, broken concrete round it, cracks and soot, blocks of tile and concrete and a dust puff. From 1.5 the building collapses. From 2.6 its neighbours follow one by one. From 3.6 the whole row goes, then the row across, then the apartment slabs. Breaches add damage, so a few of them collapse a building anyway. Flyers aim only at signs inside the view, so the first thing that breaks is always on screen.
- 2026-11-09 correction: the first thresholds (×0.5; breach 1, collapse 2) left a fast real mouse drag at power ≈ 1, and fish near the camera aimed at signs beside or behind it, so buildings fell off screen. The user saw no change. The multiplier was tripled and targets were limited to the view. Seen with a real mouse drag: one fast drag brings the visible left row down, then the whole street; a scripted 1.2 screen-heights-per-second throw collapses one visible building and breaches the next.
- A collapse shakes the building, leans it 0.05–0.14 rad toward the street over its back base edge, and sinks it to 7 % of its height in 2.8 s. Its signs ride down sputtering, its rooms go dark, and it leaves a rubble top. The state lives in one 8 × 96 float texture read by the building, sign and halo shaders, so a collapse costs no per-frame upload. Debris: 700 CPU-simulated boxes. Dust: 40 soft alpha puffs. Both draw only the slots in use.

Performance, measured on the desktop route at DPR 2 (780 × 1688, GPU timer query per frame):

- `/1` 2.70–2.73 ms; `/2` 2.42–2.53 ms; during a whole-street collapse 2.62 ms median, 6.6 ms max.
- The fish crowd was the largest cost (about 1.3 of 2.7 ms), mostly per-pixel street light on overlapping fish. It is now lit per vertex, with lighter eyes, legs and straps (531 instead of 723 indices). Flyer, shard, debris and dust meshes draw only active instances.
- The resolution guard was the likely cause of soft phone frames: it compared render time to one display refresh, so a 120 Hz phone dropped DPR for any render over ~14 ms although 24 Hz allows 41.7 ms. `/2` starts at min(device, 2) and drops (to at least 1) only when renders miss the 24 Hz frame.
- No 30-second phone record exists yet. The desktop 30-second run had no console, WebGL or shader errors and held DPR 2.
- Seen on the desktop route (a camera brought close for the breach): the hole, the rubble and the domino read as intended. Finger speeds on a phone are untested. The street does not rebuild.
