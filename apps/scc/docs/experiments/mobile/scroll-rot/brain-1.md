# scroll-rot / brain / 1

`/mobile/scroll-rot/brain/1` is a hyper-real human brain in three.js, swiped like reels: every reel down shows the same brain, rotting further. It lives at [`/mobile/scroll-rot/brain/[experiment]`](../../../../app/mobile/scroll-rot/brain/[experiment]/page.tsx), code in [`components/mobile/scroll-rot/brain/1`](../../../../components/mobile/scroll-rot/brain/1/).

History:
- 2026-11-09: first shown as a static brain with its full spinal cord; the cord was cut at the user's request, and the reels and rot were added. The route was `/mobile/brain/1`.
- 2026-11-16: moved into the `scroll-rot` family (the old route redirects). The same day a fork, `brain/2`, rebuilt the shader and the swipe and added the Reels rail and the face; the user then had the original deleted and the fork made `brain/1`. The original (a custom 280 ms slide, two scissored renders per frame while dragging, no interface) is in git history before that date.

## The brain

- **Model.** The source is [3D Model of Brain](https://commons.wikimedia.org/wiki/File:3DPX-003765_3DModel_of_Brain_Nevit_Dilmen.stl) by Nevit Dilmen. It is an MRI-derived STL (82k triangles), licensed CC BY-SA 3.0. The credit is in `public/3d/brain/license.txt`.
- **Build.** [`build-model.mjs`](../../../../components/mobile/scroll-rot/brain/1/build-model.mjs) prepares the mesh:
  - welds the vertices (40k remain);
  - cuts the spinal cord 66 mm up the STL frame, just below the medulla, and caps the cut;
  - removes the MRI voxel crust with Taubin smoothing (6 passes);
  - stores smooth int8 normals (`KHR_mesh_quantization`);
  - bakes sulcus depth into `COLOR_0` (R fine, G deep) from Laplacian smoothing at two scales.

  The output is `public/3d/brain/brain.glb` (1.28 MB). When the build output changes, raise `?v=` in `scene.ts`.
- **Tissue.** One `MeshPhysicalMaterial` is patched in `material.ts`. It uses no image textures: the pink-beige crown, the dark red sulci, the capillary blush and a few thick superficial veins all come from baked depth and object-space simplex noise. Baked depth also supplies the sulcus occlusion, so there are no shadow maps. The material has a wet clearcoat and a faint red sheen, with a screen-space bump for grain and vessels. Lighting is RoomEnvironment PMREM plus a key light, a rim light and a hemisphere light, with ACES tone mapping at exposure 0.9 on `#0f0d0d`.
- **Turning.** A horizontal drag turns the brain at a fixed latitude, and a pinch zooms. Auto-turn resumes 2.5 s after release. The turn stops while a page is in flight.
- **Rot.** Rot is pure in [`rot.ts`](../../../../components/mobile/scroll-rot/brain/1/rot.ts). Up to 40 seeds sit on exposed gyral crowns. Four wake on the first reel, then two on each later reel. Each patch's radius grows as `0.008 + 0.012·t^0.75` m, capped at 5 cm. A reel arrives 35% of the way to its level, and the rest spreads over 1.6 s after it lands.
- **Rot shading.** The vertex shader takes the nearest patch with noise-ragged edges and sinks the tissue up to about 4.6 mm. The patch shades outward as a grey-yellow halo, then dry ochre, then olive-brown, then a wet black ooze core, with chalky mould specks in the middle band. Vessels, sheen and clearcoat give way inside a patch. The whole brain also drains from pink to grey-yellow by about the 20th reel.
- **Levels.** The rot level is the reel number, so swiping back shows the earlier, less rotten brain.

## Performance

- **Noise.** The first version evaluated 3D simplex noise twelve times per fragment. This one evaluates it once (the vein line). The slow fields (vein warp, capillary blush, coarse mottle) are computed per vertex and interpolated, so their pattern is the same as the first version's. The fine grain (mottle, rot edge, pitting, mould specks, tissue grain) comes from a 128³ RGBA texture of the same simplex noise, baked once on the GPU at start ([`noise.ts`](../../../../components/mobile/scroll-rot/brain/1/noise.ts)), read with four fetches. The grain has the same character but not the same placement, and two frequencies moved slightly (rot edge 130→140, specks and grain 620/520→570).
- **Resolution governor.** If more than 40% of 45 consecutive frames run later than 22 ms, the canvas pixel ratio drops by 15% (floor 1.25) and stays there.
- **The swipe.** The first version computed the swipe itself (a fixed 280 ms ease-out, blind to the finger's speed) and drew the brain twice per frame while it moved. Two tries with the browser's scroll snap followed on 2026-11-16; the user found both far from Reels. On iOS a snap container has no flick: momentum is disabled and the page drifts to the nearest snap point ([WebKit bug 243582](https://bugs.webkit.org/show_bug.cgi?id=243582)), and snap decides by final position, not by the gesture.

  The swipe is now iOS's own pager, rebuilt in [`scene.ts`](../../../../components/mobile/scroll-rot/brain/1/scene.ts). No first-party source says how Instagram tunes Reels; this assumes it rides UIKit's paging scroll view, and takes that from a runtime reading of UIKit ([zeronsh/zgx #1780](https://github.com/zeronsh/zgx/pull/1780), one unverified source):
  - the page follows the finger exactly from 10 px of movement, taking hold there with no jump;
  - a release at 0.3 px/ms or faster turns the page however short the drag; slower, the nearer page wins; one page a flick;
  - the release speed is handed to the spring `v = (v + (target − x)·0.000284858)·0.970815; x += v`, once a millisecond: 90% there in about 190 ms, about 2 px past, at rest by about 550 ms;
  - a finger put down mid-flight catches the page where it is;
  - above the first reel, UIScrollView's rubber band (0.55).

- **Stills.** One WebGL canvas sits in the page at rest; the two pages on each side hold a 2D still of their brain, so the moving track is only a transform. While a page is in full flight nothing else happens in script: no drawing, no copying, no page made or dropped. In the last 6% of a page's travel the canvas moves into the arriving page under that page's still, takes the still's angle and level, and the still steps aside two frames later; then out-of-date stills are shot, one per frame, and the reel's own still is refreshed once its rot has grown. Waiting for a true stop (an earlier version) starved fast flicking, and reels came up black. A reel that still comes into view with no picture is shot on the spot.

Measured in Brave on the development Mac (canvas 2940×1726, DPR 2), by drawing each frame seven times and reading a pixel back, since single frames are held to the display's refresh:

| | first version | now |
| --- | --- | --- |
| reel 0, at rest | 4.5 ms | 0.6 ms |
| reel 10, at rest | 4.2 ms | 1.5 ms |

These are the added cost per extra draw. The first figure for the current version is likely too low (its single-draw frame sat on the refresh interval); total time for seven draws fell from about 37.5 ms to 17–21 ms, so the gain is between 2× and 2.7×. **Not measured on a mobile**, which is where the stutter was reported.

## Interface

Only the Reels action rail: like, comment, repost and share with counts, in the geometry measured for [`/sns/mobile/11`](../../sns/mobile/11.md) from Instagram's US App Store Reels frame, with the sourced IGDS glyphs (copied, not imported). A first pass on 2026-11-16 cloned the whole frame (header, account and caption, progress line, audio tile, tab pill); the user had it cut down to the rail the same day.

- With the tab pill gone the rail no longer sits 112 pt up, where it crossed the brain's widest part. It was first dropped to 20 pt, which the user found too low; it is now 48 pt above the bottom safe area, its glyphs 15 pt from the side. Glyph size, pitch and type are the frame's.
- Counts are fictional and fixed per reel. Like and repost toggle; a double tap on the reel likes it with the heart burst; comment and share do nothing.
- Wheel and arrow keys page on desktop. A horizontal drag turns the brain and a pinch zooms, as before.

## The face

From the twentieth swipe on, every tenth (reels 20, 30, 40, …) lands on Mark Zuckerberg's face where the brain would be: a cut-out head on the same stage, about the brain's place and size, still, with the rail beside it. The user asked for it on 2026-11-16 (first "about 30 swipes", then 20, then every tenth from 20). It is an image in the page, not in the 3D scene; the scene draws nothing for that reel and the rot level keeps counting past it. The picture is the public-domain White House photo already kept in `apps/goldfishes`, enlarged 2× and cut with that app's head mask (`public/images/scroll-rot/`, credit in `license.txt`). It is soft at mobile size (the head is about 260 px wide in the source) and the mask leaves a thin fringe of background at the left and at the collar.

Checks: lint passes; typecheck passes for this folder. In Brave with synthetic touches on a 390×703 stage: a 60 px flick in 64 ms turned the page (90% at 200 ms, 1.4 px past, at rest by 467 ms); a slow 80 px drag returned; a slow 400 px drag turned; a touch 90 ms into a flight held the page at 2.52 for 200 ms and released to 3; a flick down went back. The face was captured at reel 20 with the scroll-snap version; reel 30 was not looked at. The timings in the table are the cost of one draw at rest. Nothing here was exercised on a mobile: real touch, the double tap and frame rate remain unchecked.
