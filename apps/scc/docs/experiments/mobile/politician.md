# 정치인 — /mobile/politician/1

2026-11-09. Experimental. 주호영 and 추미애 merged in one WebGL2 fragment shader. A morph carries one face's geometry onto the other's. [`face-voronoi/3`](../complex-systems/face-voronoi/README.md)'s moving lattice decides how much of each face goes where.

## Contract

- Material: two official frontal portraits from Wikimedia Commons, aligned offline so the pupils sit at the same points of a 900×1200 frame (`public/images/politician/1/`).
  - 주호영: [Joo Ho-young's Portrait (2024)](https://commons.wikimedia.org/wiki/File:Joo_Ho-young%27s_Portrait_(2024).jpg), 대한민국 국회, KOGL Type 1.
  - 추미애: [Choo Mi-ae ministerial portrait](https://commons.wikimedia.org/wiki/File:Choo_Mi-ae_ministerial_portrait.png), 대한민국 법무부, KOGL Type 1.
  - Any corner left uncovered by the rotation is filled from the photo stretched underneath.
- Geometry: 87 landmarks per face (macOS Vision, 76-point constellation plus pupils), measured once on the aligned images and stored in `landmarks.ts`. A thin-plate spline places the displacement V = 추미애 − 주호영 at the halfway geometry, with the frame edge pinned. It is baked once at load into a 180×240 RG16F texture (`morph.ts`, tested in `morph.test.mjs`). A pixel at morph amount t reads 주호영 at x − t·V and 추미애 at x + (1 − t)·V, and mixes them by t in linear light. Because V does not depend on t, t can change from pixel to pixel.
- Lattice: moving sites as in `face-voronoi/3`, with Gaussian weights over a 5×5 neighbourhood. Each site has its own t, which swings on its own phase around the bias by ± spread/2.
  - **얼굴** (default): the weights agree on one t per pixel, and the single full-screen face is morphed by it. The result is one face in which patches lean toward one person or the other.
  - **격자**: face-gradient 3. The sites agree on one shared face coordinate (forehead to chin), and every site's own composite is sampled there. Eyes meet eyes across creased cells, and each cell shows a different mix.
- Finger: x sets the bias (left 추미애, right 주호영). y sets the spread (top: a patchwork of both; bottom: one even blend). The finger also swirls the lattice under it, with `face-voronoi/3`'s pointer lens. Before the first touch, the bias drifts slowly between the two faces. The value stays where the finger leaves it.
- Screen: the frame covers the viewport and stays anchored on the face. The option control sits at the bottom right. There is no other UI.
- Budgets: rendering at full device pixel ratio (at most 2×). After 30 frames slower than 34 ms, resolution steps down by 0.85 (to at least 0.5×). It steps back up after 240 frames faster than 20 ms.

## Observed

Brave, 2026-11-09, visible tab, 558×690 viewport at 2× (canvas 1116×1380):

- 얼굴: left gives 추미애, right gives 주호영, and the middle a single blended face. Moving toward the top produces blue-backdrop and painting patches, with the features drifting between the two.
- 격자: a creased lattice of composite faces, each cell at its own mix.
- Both modes hold a 16.7 ms median frame (p95 17.6 ms). The console showed no errors.
- Useful failure: the first lattice put an exact-black hole wherever every site was far away. The weight floor of 1e-4 divided colour by too much there. It is now 1e-30, and the readback counts 0 black pixels.
- Unverified: phone GPU cost, whether the fallback engages on a phone, and the layout of a landscape window.

# 정치인 /2 — /mobile/politician/2

2026-11-09. A copy of `/1` (no shared imports) with four faces instead of two. Each screen corner holds one person whole, and the finger morphs them toward the middle.

## Contract

- Material: four press photos from market and food stops, chosen at the user's request ("포멀한 사진 말고 구수한 사진", 2026-11-09). They replaced the official portraits used first that day. Rights stay with the photographers and outlets, and the photos are used here only in this private experiment.
  - Each face was picked by Vision (yaw, pitch, size) from that day's candidates: [박근혜](https://www.segye.com/newsView/20260523505617), waving at 서문시장 (세계일보, 2026-05-23); [문재인](https://www.ytn.co.kr/_ln/0101_202002121430513555), at a 남대문시장 갈치 restaurant (YTN, 2020-02-12, turned about 39°); [이재명](https://www.hankyung.com/article/2025050649667), eating noodles, the middle panel of the outlet's three-photo collage (한국경제, 2025-05-06); [윤석열](https://m.seoul.co.kr/news/2023/12/06/20231206500086), eating 떡볶이 at 부산 깡통시장 (서울신문, 2023-12-06).
  - All four are aligned as in `/1`, in `public/images/politician/2/`. A face hint picks the right person in group photos. Any part of the frame the rotated photo leaves uncovered continues the photo's own border pixels (edge clamp), instead of `/1`'s stretched underlay.
- Corners: 문재인 top left, 박근혜 top right, 이재명 bottom left, 윤석열 bottom right. Left is 진보 and right is 보수, as in `/1`. Earlier presidents are on top.
- Geometry: the same 87 Vision landmarks per face. Four thin-plate fields V_k = face_k − mean are placed at the mean geometry and packed into two RGBA16F textures. For weights w, a pixel reads face k at x + V_k − Σ w_j V_j. With two faces this reduces to `/1`'s formula.
- Finger: each coordinate is shaped by a smoothstep over 0.16–0.84 of the screen, and the corner weights are bilinear in those coordinates. Within 16% of a corner, that face is held whole. Along an edge, two faces morph; in the middle, all four do.
- Lattice disagreement: spread = 1.1 · (1 − largest weight) / 0.75, which is zero at a corner and 1.1 in the middle. Each site multiplies its four weights by e^(±1.6·spread) on private phases, then renormalises. A one-hot corner therefore stays whole for every site, and the middle becomes a patchwork of the four.
- Before the first touch, the point wanders slowly past all four corners.
- One composite face only: `/1`'s 격자 mode and its option control were removed at the user's request ("'격자' 버젼은 필요 없음", 2026-11-09). Budgets are as in `/1`.

## Observed

Brave, 2026-11-09, visible tab, canvas 1116×1380:

- With the market photos, each corner showed exactly its own photo (checked again in a 1315×639 window, canvas 2631×1278: 16.7 ms median, 0 black pixels in either mode). The first version used official portraits; the centre showed one plausible four-way face. After 격자 was removed, the page loaded with no console errors and 0 black pixels.
- Both modes held a 16.7 ms median frame (p95 ≤ 17.7 ms).
- Useful failure: additive swings (weight ± spread/2, clamped at 0) sometimes zeroed all four weights of a site, which left black holes in single frames (4,558 px). The multiplicative swing replaced them. Across 16 sampled frames per mode, the readback found 0 black pixels.
- Unverified: phone GPU cost, and the layout of a landscape window.
