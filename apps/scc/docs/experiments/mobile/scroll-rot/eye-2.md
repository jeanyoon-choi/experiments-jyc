# scroll-rot / eye / 2

`/mobile/scroll-rot/eye/2` (2026-11-23, experimental) is [eye/1](eye-1.md) with one relation changed, the one [brain/2](brain-2.md) changed for the brain: the eye is turned by the viewer's own head, read live through the front camera, as a mirror would show it. Route in [`/mobile/scroll-rot/eye/[experiment]`](../../../../app/mobile/scroll-rot/eye/[experiment]/page.tsx), code in [`components/mobile/scroll-rot/eye/2`](../../../../components/mobile/scroll-rot/eye/2/). Nothing is imported from eye/1 or brain/2; the files are copies.

- **Baseline.** eye/1 as it stood on 2026-11-23: globe, matter, decline, pager, stills, rail, sheets and face reels are copied unchanged; read them there.
- **Changed variable.** What turns the eye. In eye/1 the view swings from side to side. Here, while a head is followed, the camera comes to the front and the globe itself takes the head's yaw, nod and tilt. The head-reading, smoothing, permission, camera lifetime and still re-shooting are brain/2's, hunk for hunk; read [its notes](brain-2.md#head-pose).
- **Invariants.** Nothing is added to the screen. Without a camera, without permission or without a face, the route is eye/1: the swing and the drag.

What differs from brain/2:

- **Axes.** The globe's front is +z, as a head that faces the camera, so [`head.ts`](../../../../components/mobile/scroll-rot/eye/2/head.ts) applies no quarter turn; only the mirror reflection `(x, −y, −z, w)`.
- **The iris under a turned globe.** eye/1's shader follows the view ray to the iris in the globe's own frame and took the camera position as given in the world, which is only right while the globe never turns. [`material.ts`](../../../../components/mobile/scroll-rot/eye/2/material.ts) now brings the camera into the globe's frame (`inverse(modelMatrix)`, per vertex) before refracting.

Checks: lint and typecheck pass; the route answers 200. **Not verified:** everything visual. The automation browser stopped at the local certificate warning on 2026-11-23, so the route was not opened: the shader change has not been seen to compile or the iris to sit right under a turned globe, and no head (real or fed in) has turned the eye. As in brain/2, the sign of yaw and nod is by derivation only, and cost on a mobile is unmeasured.
