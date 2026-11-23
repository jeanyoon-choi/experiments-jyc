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

## /2 — relief heads, an intro, music, two faces (2026-11-23)

`/mobile/christmas-tree/2`, code in [`components/mobile/christmas-tree/2`](../../../components/mobile/christmas-tree/2/), a standalone copy of `/1`. The user asked for the tree to be turned about more freely in three.js, for the face to become a more realistic 3D face, for an intro like 입만 열면 거짓말, and for Last Christmas as music once entered; then for a Kim Jong-un version chosen from the bottom-right option panel. Baseline `/1`; the tree's layout, count and framing are unchanged except where noted.

- **Heads.** Each face is its photograph as a relief, built by [`build-model.mjs`](../../../components/mobile/christmas-tree/2/build-model.mjs) into `public/3d/christmas-tree/<name>.json`. When an output changes, raise `?v=` in `scene.ts`.
  - MediaPipe Face Landmarker (the model served at `/models/gaze-tracking`) was run once on each cut-out in a browser; its 468 points, its mesh edges and the cut-out's traced silhouette are kept in `faces/<name>.json`.
  - The mesh is a height field over the picture, so from the front it is exactly the photograph. A landmark keeps its measured depth (at 0.7, see below) when it faces the camera squarely enough (0.5 or more) and nothing nearer covers it. The silhouette lies just behind the face where the face runs to it and falls back over hair and neck. Hair, ear and neck, which the landmarker does not know, are a membrane between the two, blown out a little.
  - Zuckerberg (the three-quarter cut-out of `/1`): 241 of 468 landmarks, 910 triangles. Kim Jong-un (a near-frontal portrait): 353 landmarks, 992 triangles.
  - Tried and changed: with every landmark kept, the far side of the nose (hidden behind its bridge) gave two depths at one place and the nose tore into shards; a silhouette at one flat depth put a cliff beside the nose; at the landmarker's full depth the walls of the nose, which the photograph never saw, smeared more. A first facing test read the winding of the landmarker's triangles as found, which is arbitrary, and threw away half of a frontal face; the triangles are now wound alike first.
- **Kim Jong-un.** The portrait is [Kim Jong-un April 2019 (cropped)](https://commons.wikimedia.org/wiki/File:Kim_Jong-un_April_2019_(cropped).jpg) (Alexei Nikolsky, kremlin.ru, CC BY 4.0), downloaded with the user's go-ahead. The head was cropped from it and cut out with MediaPipe's selfie multiclass segmenter (hair plus face skin; the model was fetched by the browser, not stored), `public/images/christmas-tree/kim.webp`, credit in `license.txt`.
- **Option.** The bottom-right control copied from `complex-systems/bubble/3`: a round dark button that inverts when open, above a white panel headed 얼굴 with two chips, 저커버그 (default) and 김정은. It appears once the intro is left. Choosing swaps the texture and the relief on the same 721 placements; each face loads once.
- **Layering.** Neighbours in a row overlap by half a head, so every other one stands 0.17 of its size further out, and heads tip out 0.28–0.42 rad at the top (0.2–0.34 in `/1`); before that, noses came through the next head.
- **Light.** One hard key light and a weak hemisphere, so the reliefs shade themselves and pass from lit to dark as the tree turns.
- **Turning.** A drag now also tips the view, from under the boughs (−0.45 rad) to nearly overhead (1.35 rad); the pinch closes in further (to 0.12 of the fitted distance). The head at the top faces the camera whatever the view.
- **Intro.** The intro of [`face-trace/politician-lie/2`](politician-lie.md), copied: the title 크리스마스 트리, the beckoning round arrow, the credit link. Behind it, instead of a recorded loop, the tree itself, already turning, under 55% black. A tap anywhere but the link enters; the intro does not return.
- **Music.** Not Last Christmas: no licensed file of it was at hand, and asked, the user said to pick and download a copyright-free song that is unmistakably Christmas. It is [Jingle Bells (2020)](https://commons.wikimedia.org/wiki/File:Jingle_Bells_(2020)_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) by the United States Air Force Band of Mid-America, public domain, re-encoded to 112 kb/s (`public/audio/christmas-tree/jingle-bells.mp3`, 2 min 13 s, 2.5 MB, credit in `license.txt`). The entering tap makes the audio element and plays it on a loop; it pauses when the page is hidden and resumes on return.

Observed (headless Brave on the development Mac, 390×844 at DPR 2): the intro, the entered tree, the open option panel, both faces whole and at a mid zoom, and a view from above were captured.

- Kim Jong-un's heads read as solid heads from every side of the tree; a few small dark flecks show beside some eyes at a close zoom.
- Zuckerberg's read as solid from the photograph's own side or head on; from its far side (the right of the tree at any moment) the nose's unseen wall still smears and its edge steps. This is the limit of a relief from one three-quarter photograph, not fixed.
- After the entering tap the audio element was playing (4.7 s in, 132.8 s long, looping, no error). It was not heard by anyone.
- 721 heads are about 656,000 (Zuckerberg) or 715,000 (Kim) triangles in one draw call; frame interval 16.7 ms median, 16.8 ms at the 95th percentile over 180 frames with either face (display-bound), the same as `/1`.
- **Not verified:** anything on a mobile — touch, pinch, the music starting from a real tap, and frame rate at this triangle count.
