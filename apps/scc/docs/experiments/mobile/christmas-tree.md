# 크리스마스 트리

`/mobile/christmas-tree/1` (2026-11-23) is a Christmas tree in three.js made of nothing but Mark Zuckerberg's face, at [`/mobile/christmas-tree/[experiment]`](../../../app/mobile/christmas-tree/[experiment]/page.tsx), code in [`components/mobile/christmas-tree/1`](../../../components/mobile/christmas-tree/1/). The user asked for a Christmas tree on the mobile, filled throughout with his face.

- **Tested relation.** Whether one face, repeated, can stand in for every part of the tree (needles, trunk, star) and the outline still read as a Christmas tree. Baseline: the single-object three.js mobile routes (`samdasoo/1` for the page, `scroll-rot` for the face and the resolution governor); nothing is imported from them.
- **Face.** The cut-out `scroll-rot` shows on every tenth reel (public-domain White House photo), copied to `public/images/christmas-tree/face.webp` with its credit in `license.txt`.
- **Tree.** Pure in [`tree.ts`](../../../components/mobile/christmas-tree/1/tree.ts), seeded, the same on every load; 1 unit tall, 721 faces:
  - a trunk, a narrow column of small faces up to 0.25;
  - five tiers of boughs, each a cone skirt wider at its foot than the tier above is at its own, so the outline steps in; lower tiers are taller and their faces larger (0.118 down to 0.066 of the tree's height);
  - faces lie on a skirt as shingles, 0.55 of a face apart up the slope and 0.5 across, each tipped out at the top, so a face covers the chin of the one above and its own eyes and hair stay in view;
  - one larger face at the top where the star goes. It does not turn with the tree; it keeps facing out.
- **Rendering.** One `InstancedMesh` of a textured quad (alpha-tested, no blending, one draw call) under a fixed key light and a hemisphere light, so faces brighten and dim as the tree carries them round. No tint: the tree is skin and hair coloured, on `#000`.
- **Interaction.** Slow auto-turn; a one-finger horizontal drag turns the tree and carries on briefly after release; a pinch (or the wheel) zooms toward the middle; auto-turn resumes 2.5 s after release. DPR capped at 2, with scroll-rot's resolution governor.

Observed (headless Brave on the development Mac, 390×844 at DPR 2):

- A first pass tipped each face's top into the tree at 0.4 of a face between rows: only chins and cheeks showed, a pink pine cone. Tipping the tops out and spacing the rows wider brought the whole face back.
- The lowest tier hid the trunk until the boughs were raised to start at 0.25.
- Read against the request: it is a tree by outline alone (tiers, trunk, top); nothing is green, and no lights or ornaments were added. On a 390-wide screen the tree is limited by its width, leaving about 15% of the height black above and below.
- Frame interval 16.7 ms median and at the 95th percentile over 120 frames of auto-turn (display-bound; a synthetic drag turned the tree). **Not verified:** anything on a mobile — real touch, pinch, frame rate.

## /2 — relief heads, an intro, music (2026-11-23)

`/mobile/christmas-tree/2`, code in [`components/mobile/christmas-tree/2`](../../../components/mobile/christmas-tree/2/), a standalone copy of `/1`. The user asked for the tree to be turned about more freely in three.js, for the face to become a more realistic 3D face, for an intro like 입만 열면 거짓말, and for Last Christmas as music once entered. Baseline `/1`; the tree's layout, count and framing are unchanged.

- **Head.** The same photograph as a relief, built by [`build-model.mjs`](../../../components/mobile/christmas-tree/2/build-model.mjs) into `public/3d/christmas-tree/face.json` (453 points, 808 triangles, 28 KB). When the output changes, raise `?v=` in `scene.ts`.
  - MediaPipe Face Landmarker (the model served at `/models/gaze-tracking`) was run once on the cut-out in a browser; its 468 points, its mesh edges and the cut-out's traced silhouette are kept in `face-source.json`.
  - The mesh is a height field over the picture, so from the front it is exactly the photograph. Landmarks keep their measured depth (at 0.7, see below) when they face the camera and nothing nearer covers them: 155 of 468 in this three-quarter view. The silhouette lies just behind the face where the face runs to it (nose, brow, chin) and falls back over hair and neck. Hair, ear and neck, which the landmarker does not know, are a membrane between the two, blown out a little.
  - Tried and changed: with every camera-facing landmark kept, the far side of the nose (hidden behind its bridge) gave two depths at one place and the nose tore into shards; a silhouette at one flat depth put a cliff beside the nose. At the landmarker's full depth the walls of the nose, which the photograph never saw, smeared more; 0.7 lessens it.
- **Layering.** Neighbours in a row overlap by half a head, so every other one stands 0.17 of its size further out; before that, noses came through the next head.
- **Light.** One hard key light and a weak hemisphere, so the reliefs shade themselves and pass from lit to dark as the tree turns.
- **Turning.** A drag now also tips the view, from under the boughs (−0.45 rad) to nearly overhead (1.35 rad); the pinch closes in further (to 0.12 of the fitted distance). The head at the top faces the camera whatever the view.
- **Intro.** The intro of [`face-trace/politician-lie/2`](politician-lie.md), copied: the title 크리스마스 트리, the beckoning round arrow, the credit link. Behind it, instead of a recorded loop, the tree itself, already turning, under 55% black. A tap anywhere but the link enters; the intro does not return.
- **Music.** The entering tap makes an audio element for `/audio/christmas-tree/last-christmas.mp3`, looped; it pauses when the page is hidden and resumes on return. **The file is not in the repository**: nothing was downloaded, and until the user supplies it the route is silent (the request fails quietly).

Observed (headless Brave on the development Mac, 390×844 at DPR 2): intro, entered tree, a mid and a close zoom, and a view from above were captured. Heads seen from the photograph's own side or head on read as solid heads; seen from its far side (the right of the tree at any moment) the nose's unseen wall shows as a pink smear. This is the limit of a relief from one photograph, not fixed. 721 heads are about 583,000 triangles in one draw call; frame interval 16.7 ms median, 16.8 ms at the 95th percentile over 180 frames (display-bound), the same as `/1`. **Not verified:** anything on a mobile (touch, pinch, frame rate at this triangle count), and the music, since there is no file.
