# Expression — /mobile/expression/1

2026-11-02. Experimental. Tests whether the archive's existing on-device face model (MediaPipe Face Landmarker, the same local `face_landmarker.task` and wasm as [face trace](face-trace.md) and [gaze tracking](gaze-tracking.md)) can read facial expression in real time on a phone. It reads the face as many named, deliberately exaggerated conditions. No new dependency; no images saved or sent.

## Contract

- Input: front camera at 1280×720 requested, mirrored. Landmarks, 52 blendshapes and the facial transformation matrix come from a 640-wide copy at most every 45 ms (≈20 Hz). Camera starts on a tap; hiding the page stops the tracks, returning restarts them.
- Loading ([`assets.ts`](../../../components/mobile/expression/1/assets.ts)): `public/` serves the 11.7 MB SIMD wasm and 3.7 MB model uncompressed with `max-age=0` and no validator, so the first version downloaded ~15 MB on every visit. Both are now fetched on page open (not on the tap), kept in Cache Storage `scc-face-landmarker-v1` (bump on file change), and passed as a blob URL and `modelAssetBuffer`. `@mediapipe/tasks-vision` is imported dynamically.
- Calibration: the first 30 face frames (≈1.5 s, status “무표정으로 잠시”) set a neutral baseline for every blendshape and for yaw, pitch and roll. Conditions use `(raw − base) / max(0.2, 1 − base)`. Tapping the screen while tracking recalibrates.
- Readings ([`reader.ts`](../../../components/mobile/expression/1/reader.ts), pure, no DOM), 144 in five groups:
  - 58 conditions, 0–100, on at 50: smile, duchenne, grin, laugh, smirk L/R, contempt, frown, sad, cry, angry, rage, surprise, shock, fear, disgust, sneer L/R, grimace, teeth, scream, yawn, jaw drop, O mouth, kiss, duckface, pout, cheek puff, lips press, lips in, jaw L/R, underbite, mouth L/R, wink L/R, eyes shut, squint, wide eyes, brows up, single brow L/R, furrow, worry, side-eye L/R, eye roll, look down, cross-eyed, turn L/R, chin up/down, tilt L/R, too close, far away. Formulas are loose FACS composites with steep ramps, so an exaggerated face saturates them.
  - Head (10): yaw, pitch, roll (degrees from baseline), distance (matrix translation, cm), face x/y, face fill, angular speed, nod and shake counts (two reversals over 5° within 1.4 s).
  - Dynamics (17): energy, valence, arousal, L/R asymmetry, neutral, blendshape change rate, stillness, talking (jaw-open deviation over 1.2 s), blinks, blinks/min, last blink ms, seconds without blinking, winks, smile held, micro-expressions (an emotion over 0.45 that falls back within 500 ms), 5 s peak, inference fps.
  - Geometry (8): eye-open ratios, mouth-open ratio, mouth width and brow heights over eye span, lip-corner tilt, face length/width.
  - Raw (51): every blendshape score, uncalibrated.
- L/R follow the subject's own sides, as the blendshape names do. Yaw and pitch take their magnitude from the matrix and their sign from landmarks (nose tip against eye midpoint; nose tip between eyes and mouth), because the matrix sign convention is undocumented. Pitch's sign is learned online from the two readings' covariance.
- Display: the mirrored camera at 62% brightness with the 478 landmarks as dots. Over it, every reading runs down the columns (3 portrait, up to 6 wide), with a blank cell between groups. Font size is chosen so all rows fit the viewport. Each cell's weight lifts its opacity and fills a bar behind it; a condition past its threshold inverts to black on white. Values are written to the DOM directly per inference; React does not re-render them.

## Status

`pnpm typecheck` and scoped eslint pass. A synthetic neutral-then-smile sequence through `reader.ts` gave smile 100, duchenne 53, laugh 77, valence +100, angry 0 and sad 0. Not yet checked with a real face or on a phone. The browser check on 2026-11-02 could not attach to the tab. Thresholds and ramps are first guesses and may need tuning per face.

## Open questions

- Whether the matrix yaw/pitch magnitudes stay stable at phone distances, or the landmark-only fallback is steadier.
- Whether 20 Hz CPU inference holds on older phones; the GPU delegate is untried here.
