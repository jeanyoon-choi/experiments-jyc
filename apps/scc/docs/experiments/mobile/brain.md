# Brain

`/mobile/brain/1` (2026-11-09) is a hyper-real human brain in three.js. You swipe through it like reels: every reel down shows the same brain, rotting further. It lives at [`/mobile/brain/[experiment]`](../../../app/mobile/brain/[experiment]/page.tsx).

- **Model.** The source is [3D Model of Brain](https://commons.wikimedia.org/wiki/File:3DPX-003765_3DModel_of_Brain_Nevit_Dilmen.stl) by Nevit Dilmen. It is an MRI-derived STL (82k triangles), licensed CC BY-SA 3.0. The credit is in `public/3d/brain/license.txt`.
- **Build.** [`build-model.mjs`](../../../components/mobile/brain/1/build-model.mjs) prepares the mesh:
  - welds the vertices (40k remain);
  - cuts the spinal cord 66 mm up the STL frame, just below the medulla, and caps the cut;
  - removes the MRI voxel crust with Taubin smoothing (6 passes);
  - stores smooth int8 normals (`KHR_mesh_quantization`);
  - bakes sulcus depth into `COLOR_0` (R fine, G deep) from Laplacian smoothing at two scales.

  The output is `public/3d/brain/brain.glb` (1.28 MB). When the build output changes, raise `?v=` in `scene.ts`.
- **Tissue.** One `MeshPhysicalMaterial` is patched in `material.ts`. It uses no textures: the pink-beige crown, the dark red sulci, the capillary blush and a few thick superficial veins all come from baked depth and object-space simplex noise. Baked depth also supplies the sulcus occlusion, so there are no shadow maps. The material has a wet clearcoat and a faint red sheen, with a screen-space bump for grain and vessels. Lighting is RoomEnvironment PMREM plus a key light, a rim light and a hemisphere light, with ACES tone mapping at exposure 0.9 on `#0f0d0d`.
- **Reels.** A vertical drag pulls the current reel, and the next reel follows under it in the same canvas: two scissored renders, made only while dragging. A reel commits past 18% of the height or at 0.45 px/ms. Swiping down goes back one reel, and nothing exists above the first reel (it rubber-bands). Wheel and arrow keys step one reel on desktop.
- **Turning.** A horizontal drag turns the brain at a fixed latitude, and a pinch zooms. Auto-turn resumes 2.5 s after release.
- **Rot.** Rot is pure in [`rot.ts`](../../../components/mobile/brain/1/rot.ts). Up to 40 seeds sit on exposed gyral crowns. Three wake on the first reel, then two on each later reel. Each patch's radius grows as `0.005 + 0.011·t^0.75` m, capped at 5 cm. A reel arrives 35% of the way to its level, and the rest spreads over 1.6 s after it lands.
- **Rot shading.** The vertex shader takes the nearest patch with noise-ragged edges and sinks the tissue up to about 4.6 mm. The patch shades outward as a grey-yellow halo, then dry ochre, then olive-brown, then a wet black ooze core, with chalky mould specks in the middle band. Vessels, sheen and clearcoat give way inside a patch. The whole brain also drains from pink to grey-yellow by about the 20th reel.
- **Levels.** The rot level is the reel number, so swiping back shows the earlier, less rotten brain.

History: on 2026-11-09 the static brain was first shown with its full spinal cord. The cord was then cut at the user's request, and the reels and rot were added.

Checks: lint and typecheck (see below), plus browser captures at a desktop window.
