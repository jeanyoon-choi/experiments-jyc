# scroll-rot / brain / 2

`/mobile/scroll-rot/brain/2` (2026-11-16, experimental) is [brain/1](brain-1.md) with one relation changed: the brain is turned by the viewer's own head, read live through the front camera, as a mirror would show it. Route in [`/mobile/scroll-rot/brain/[experiment]`](../../../../app/mobile/scroll-rot/brain/[experiment]/page.tsx), code in [`components/mobile/scroll-rot/brain/2`](../../../../components/mobile/scroll-rot/brain/2/), a standalone copy that imports nothing from brain/1.

- **Baseline.** brain/1 as it stood on 2026-11-16. The model, tissue, rot, pager spring, stills, action rail and face reels are copied unchanged; read them there. The mesh is still built by brain/1's `build-model.mjs` (not copied).
- **Changed variable.** What turns the brain. In brain/1 the camera circles a still brain (auto-turn, horizontal drag). Here, while a head is followed, the camera comes round to the front and the brain itself takes the head's yaw, nod and tilt.
- **Invariants.** Nothing is added to the screen: no camera image, no label, no permission interface of our own. Without a camera, without permission or without a face, the route is brain/1: auto-turn and drag.

## Head pose

[`head.ts`](../../../../components/mobile/scroll-rot/brain/2/head.ts) uses what the repository already ships for gaze-tracking: `@mediapipe/tasks-vision` 1.0.1 with `public/models/gaze-tracking/face_landmarker.task` and `public/models/gaze-tracking/wasm` (CPU). The bundle holds the face-geometry metadata, so `outputFacialTransformationMatrixes` gives a 4×4 matrix per face: the canonical face placed in camera space (x to the image's right, y up, z towards the camera). Only its rotation is used.

- **Mirror.** The rotation is reflected left to right (quaternion `(x, −y, −z, w)`): yaw and roll change sign, the nod stays. Turning to one's left turns the brain's front to the left of the screen. The mesh is not reflected, so the hemispheres are not swapped as a true mirror would swap them.
- **Axes.** The brain's front is −x in the scene; a quarter turn about y brings it to face the viewer before the head's rotation is applied. No calibration: a mobile held low sees the head from below, and so the brain.
- **Rate and smoothing.** At most 20 readings a second from a 480×360 stream. The brain follows through a one-pole low-pass (time constant 0.11 s); the camera comes to the front in 0.35 s. No face for 0.8 s and the brain goes back to turning by itself.
- **When it reads.** Only at rest on a brain reel with no finger down: never while a page is in flight, never on a face reel. Paused time does not count towards losing the head. Frames that follow a reading are left out of the resolution governor.
- **Permission.** The browser's own prompt, asked on load. A refusal that comes back within 0.7 s (quicker than a person answers) is taken as the browser wanting a gesture, and is asked once more on the first touch. Any failure is silent.
- **Camera lifetime.** Released when the page is hidden or left and on dispose; taken back when the page shows again. The model is fetched only after a camera stream exists.
- **Drag.** A horizontal drag still orbits; 2.5 s after release the camera returns to the front. Pinch zooms.

## Stills

Each still now also keeps the brain's orientation. A reel landed on starts from its still's orientation and eases to the head from there, so there is no jump. When the brain has settled (within 3° of the head) more than 15° from where the neighbours were shot, they are shot again, at most once a second. In between, a still can be up to that much out of date.

## Checks (2026-11-16)

Lint passes; typecheck has no errors under `scroll-rot`. In Chrome on the development Mac, 533×703:

- With the camera prompt left unanswered: the brain renders and turns as brain/1, ArrowDown and ArrowUp page, the canvas moves to the landed reel, every still has a picture, no console errors.
- With `getUserMedia` replaced in the page by a canvas stream of the Zuckerberg cut-out (a real face image through the real model): the brain came round to face the viewer; rotating the image 25° clockwise tilted the brain's top to the left, −20° to the right (the mirrored roll); neighbours were shot again after the tilt; paging worked with the head followed. Frame gaps at rest over 3 s: median 16.7 ms, one of 180 over 22 ms; none in a flight.

**Not verified:** a real camera and a live head, so the sign of yaw and nod is by derivation only (roll was observed); the permission prompt on iOS Safari and whether it needs the touch; inference cost and swipe smoothness on a mobile; how the hidden 1 px video behaves on iOS.
