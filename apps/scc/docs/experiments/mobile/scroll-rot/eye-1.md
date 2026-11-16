# scroll-rot / eye / 1

`/mobile/scroll-rot/eye/1` (2026-11-16) is one eyeball in three.js, swiped like reels: every reel down shows the same eye, further gone. It lives at [`/mobile/scroll-rot/eye/[experiment]`](../../../../app/mobile/scroll-rot/eye/[experiment]/page.tsx), code in [`components/mobile/scroll-rot/eye/1`](../../../../components/mobile/scroll-rot/eye/1/).

The baseline is [brain/1](brain-1.md): its swipe (iOS's paging spring), its stills, its resolution governor, its baked noise and its Reels rail are copied here unchanged, not imported. What changed is the organ. There is no face reel.

- **Globe.** [`globe.ts`](../../../../components/mobile/scroll-rot/eye/1/globe.ts) builds it, no model file: a sphere in the proportions of a 24 mm eye with the cornea raised on its front as a steeper cap (radius 7.8 mm, 11.7 mm across), the normals turning softly across the limbal furrow.
- **Eye.** One `MeshPhysicalMaterial` patched in [`material.ts`](../../../../components/mobile/scroll-rot/eye/1/material.ts), no image textures.
  - The iris is not painted on the surface. The view ray is refracted at the cornea (index 1.376) and followed to a flat disc behind it, so the iris has depth and slides under the dome as the eye turns. Its fibres are baked noise stretched along the radius, with an ochre collarette round the pupil and a dark limbal ring.
  - The white is warm porcelain with a faint rose toward the equator. Vessels are the zero lines of two warped noise fields, broken into runs by a slow field, gathering away from the cornea. A cut optic nerve sits at the back.
  - A full clearcoat is the tear film; the iris and pupil have no gloss of their own.
- **Looking about.** Left alone the view swings 0.62 rad to either side; it never goes round to the back. A horizontal drag turns the eye freely, a pinch zooms, and the swing resumes 2.5 s after release.
- **Decline.** Pure in [`rot.ts`](../../../../components/mobile/scroll-rot/eye/1/rot.ts). Two things run on the reel number:
  - a whole-eye decline, `1 − e^(−reel/6)` (half by the fourth reel): vessels multiply and join up, the white flushes and yellows, the tear film dries, the cornea clouds until the pupil is milky, and late the globe loses pressure and puckers;
  - rot patches as in the brain (grey-yellow halo, ochre, olive, wet black core, mould specks, sunken), but slower: two seeds on the first reel off the cornea, then about five every three reels, each growing as `0.006 + 0.009·t^0.7`, capped at 0.045 (globe radius 0.1). Under a patch the cornea clouds at once.

Checks: lint passes; typecheck passes for this folder. Captured in Brave at reels 0, 2, 6, 9, 12, 16 and 20. Read against the aim (a real eye that visibly rots): the fresh eye and reels 2–9 hold; from about reel 12 the iris is a ghost under the cloud and the white stays paler than a rotted eye would be, so the late stages read more as a spotted ball than as an eye. Not tuned further. Frame time was not measured, and nothing was exercised on a mobile.
