# Source-driven 3D eyeballs — 2026-09-23

Route: `/screen/tech-eyes/1` → controls → eyes → big tech → `3D eyeball`.
All 80 identities now use live Three.js meshes; repeated story instances reuse
the same identity render. Static 2D, blinking 2D, and the independent blink-all
controller remain available. Default selection stays blinking 2D. The rejected
skin-and-eye option is removed. Fish, story geometry, presets, and timing remain
unchanged.

Each model has an open scleral globe, recessed iris annulus, black pupil cavity,
and protruding transmissive cornea (IOR 1.376). Original photographic iris pixels
provide the colour/pattern; authored radial microstructure, veins, and small
stable shape/tint differences supply detail that the portraits cannot resolve.
Globe size and proportions vary subtly; iris proportion uses the source eye
window plus bounded variation. The final user adjustment increases iris/pupil
diameter by 18% relative to the globe. These are source-driven reconstructions,
not anatomical scans or verified biometric iris models.

The same right panel offers `inspect 3D · drag to rotate`: choose any of the
80 names, drag/use arrow keys, or switch to `original photo` for comparison.
The inspector mounts only while expanded. `big tech colour` intentionally applies
the existing affiliation gradient; `big tech` retains photographic colour.
The existing global backboard filter still affects the scene and inspector.

## Sources and limits

[Generated source ledger](../../../components/screen/archive/tech-eyes/1/model/tech-eye-3d-profiles.generated.json)
records each exact Commons source, author/license, raster dimensions, eye
coordinates, and acquisition status. Final distribution: 58 Commons thumbnails,
17 Commons originals, 5 previously downloaded Commons rasters; 80 valid Vision
eye contours. Assets live in `public/images/0922/tech-eye-3d/portraits/`.
`source/prepare-tech-eye-3d.mjs` acquires the same photos used by the existing
CEO registry; `inspect-all-eye-landmarks.swift` reads their actual pixels.
Image URLs include dimension versions to avoid stale low-resolution rasters
being sampled with newly generated high-resolution coordinates.

Iris windows remain small even in some larger portraits; glasses, illumination,
occlusion and landmark estimates limit identity fidelity. Unseen anatomy and
microdetail are authored, not recovered. The first generic generated iris atlas
was rejected and removed from runtime; its
[prompt and rejected asset](../../../components/screen/archive/tech-eyes/1/source/tech-eye-3d-rejected/README.md)
remain local experiment history.

## Bounded rendering

One WebGL context and four instanced meshes serve all identities plus one
inspector. A 1216×768 live render atlas supplies 96px field cells and a 256px
inspector cell to lightweight 2D presentation canvases. The presented image is
generated from real geometry each update, not a pre-rendered eye sprite.
Seven measured draw calls include the physical transmission capture. Geometry
is shared and active identities are packed into the draw batch each update,
with five renderer-reported textures. Source decoding is limited to three
concurrent images, loaded lazily. The iris atlas is 960×768, sclera
1024×512, plus bounded environment/transmission targets.

DPR is 1; idle gaze updates target 24 Hz and moving lids target 60 Hz, without
per-frame React state changes. The transmissive capture uses 0.7 resolution scale.
Only active identities animate; repeated IDs share their gaze. Pause and reduced
motion stop autonomous gaze; hidden documents stop scheduling. Inspector input
can explicitly invalidate a paused view. Unmount releases geometry, materials,
textures, context, timers, listeners, and pending image loads. Failures retain
the original photograph. The cap is a workload limit, not a FPS guarantee.

Implementation: `model/tech-eye-3d.ts`,
`rendering/tech-eyeball-atlas.ts`, `screen/tech-eye-3d.tsx`; narrow integration
in `screen/index.tsx`. Independent blinking modules and the former
blink-auto snapshot (since removed) were not edited.

References: installed Three 0.185.1,
[physical materials](https://threejs.org/docs/pages/MeshPhysicalMaterial.html),
[WebGL renderer](https://threejs.org/docs/pages/WebGLRenderer.html), and the local
0804/0806 rendering records. Validation results below distinguish update cadence
from total application FPS and CPU submission time from GPU duration.

## Verified baseline

HTTPS clean-load inspection at 1184×684, 600 existing fish, and temporary 48px
icons produced 91 field outputs plus the inspector: all 80 source IDs ready.
Over 61 seconds the eye renderer measured 15.66 updates/s, 2.19 ms average CPU
submission/copy work per update, 7 calls, and 492,480 submitted triangles.
GPU duration and total application FPS were not measured. No new browser
warnings/errors occurred. Pause froze its frame counter; static and blinking 2D
both removed every 3D canvas. The 60px layout was restored. Typecheck, scoped
ESLint, asset audit (632 checked / 0 missing), and diff checks passed.

## Optional volumetric blinking

`3D blinking` adds a separate instanced upper/lower lid shell; the original
`3D eyeball` option retains its lid-free appearance. The lids wrap the globe,
with more upper-lid travel than lower-lid travel, a narrow rim/crease, and
continuous eased geometry rather than texture frames or squashing the eyeball.
Field gaze moves behind stationary lids; inspector rotation turns the complete
assembly. The detached lid shell is authored, not recovered CEO skin anatomy.

`blink all` works in both 3D modes, including pause/reduced motion. In the
baseline option it temporarily adds lids for one blink, then removes them.
In automatic mode it replaces the current blink without a queued extra blink.
Only loaded, viewport-intersecting outputs are targeted; no unloaded source
queues a future command. Duplicate identity outputs share the same blink.

Following user feedback, durations were slowed: closing 110–145 ms, closed
dwell 45–75 ms, reopening 170–220 ms, with a stable per-identity ±6% multiplier
and fresh per-blink samples. Typical total is approximately 0.31–0.47 seconds.
Recurring gaps are 2.5–7 seconds; occasional doubles are capped at one follow-up.
There are no independent per-eye timers. Pause/reduced motion suppress autonomy,
but explicit commands run once. Hidden documents stop the shared renderer.

Ownership: `model/eye-blink-3d.ts` (pure deterministic timing) and
`rendering/tech-eye-lids.ts` (optional geometry/material) are separate from both
the original eyeball surfaces and the independent 2D blink implementation.
The optional shell adds one instanced mesh. In the final packed renderer,
3D blinking measured 9 calls and roughly 325,000–358,000 submitted triangles
with 39–43 active identities; geometry cost scales with drawn identities.

The five pure tests cover timing variation, slower reopening, pause, capped
elapsed time, non-chaining doubles, and manual replacement across all 80 seeds.
HTTPS testing confirmed 73 loaded outputs closing on `blink all` while paused,
then reopening with the frame counter stopped and the original seven-call
baseline restored. Automatic partial/full closure was observed independently
across multiple identities. No new browser warnings/errors were captured.
The final slowed automatic mode loaded all 80 identities across 92 outputs;
a 33.86-second active interval measured 16.80 eye updates/s (24 Hz cap),
with 2.49 ms cumulative average CPU submission/copy work per update.
In a separate approximately 10-second DOM sample, 41 identities were observed
partially closing and 32 fully closing; inactive bubbles intentionally do not
blink. These are observed samples, not a guarantee that all 80 blink in a
fixed window. This verification does not measure GPU time or application FPS.

## Slower, smoother control and field optimisation

The right-panel `blink speed` slider ranges from ×0.40 to ×1.40, with ×0.70
selected initially. It scales closing, dwell, and reopening time without
changing the 2.5–7-second recurrence. A change mid-blink preserves the current
lid position and rescales the remaining time. The same value applies to
automatic blinks and 3D `blink all`. Identity and per-blink timing variation
remain in effect.

To keep the slower motion smooth, the moving-lid scheduler targets 60 updates/s;
it targets 24 when no lid moves. Only active identities, first paints, manual
blink targets, and the inspector enter the render batch. Offscreen and inactive
canvases keep their last frame. The field cell resolution is 96px while the
inspector retains 256px. Lid mesh subdivisions and transmission capture
resolution are reduced. These changes cut the atlas from 1536×1024 to
1216×768 without reducing the inspector's displayed resolution.

On the same HTTPS browser, a 12.63-second sample before the optimisation gave
approximately 18.7 eye updates/s, 2.59 ms average CPU work per update, 9 calls,
and 803,520 submitted triangles. Afterward, a 14.55-second sample gave
approximately 42.7 updates/s, 1.93 ms cumulative average CPU work, 9 calls,
and 325,120–357,632 triangles. This is eye-renderer cadence, not total app FPS
or GPU duration. At slider ×0.40, browser sampling observed at least 11 distinct
lid positions during one reopening. No new browser errors or warnings appeared.

The 3D-specific outer story ring and separator are hidden, and a fully open
eyelid shell is collapsed so it cannot leave a thin rim around the globe.
The ring colour control is hidden in 3D eye mode; other surfaces retain it.

After packing active identities, the paused `blink all` path was checked again:
84 ready outputs entered the blink and all 84 returned to an open frame at
slider ×0.40. The final open frame is explicitly painted before an identity
leaves the draw batch; the seven-call baseline then resumes.
