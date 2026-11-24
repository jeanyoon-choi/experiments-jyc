# bubble/9: checking that a change leaves the picture as it was

Status: procedure, used for the 2026-11-18 restructuring ([9.md](./9.md#structure-2026-11-18)).

`/screen/bubble/9?replay` draws nothing by itself (`components/screen/bubble/9/loop/replay.ts`). `window.bubbleReplay.step(n)` advances n frames of exactly 1/60 s; `idle()` is true when no bake is under way and every room, still and sheet asked for is in; `waiting()` says which is not. Under it the school is stepped on the main thread, the materials run on the raft's clock, the fish take pages as bubbles (an object's reach arrives with its bake), and one worker bakes (three answer in an order that differs run to run, and 0.04–2.7% of pixels with it). Then the same clicks and the same steps give the same pixels: two runs of the nineteen captures below were identical.

## A capture

1. Load the route; wait a few seconds (the first frame is not drawn until a step).
2. For each scene: set it up through the interface, then `step(a)`, wait for `idle()`, `step(b)`, wait, `step(c)`, wait — never step while waiting, or the number of frames depends on the machine — then `step(1)` and, in the same task, `canvas.toDataURL("image/png")`.
3. Compare with the same sequence run on the code before: every pixel, not a hash alone (a count and the largest difference say what kind of change it is).

(Preset labels here are those of 2026-11-18: A1 시계 굳음 is gone, and A2 · A3 are A1 · A2 since 2026-11-24.) The sequence used, in one session, in this order (a scene's result depends on those before it): A2 `[120, 60, 20]`; A1, A3, A4 `[180, 60, 20]`; B1, B2 `[120, 40, 10]`; B3, B4 `[60, 20, 10]`; then from A4 each 재질 in turn — 젤 · 세럼, 석고, 유리, 메시 복원, 인쇄물, LSD, 쿤스, 맥시멀 믹스 — `[60, 30, 10]`; 전파 `[60, 20, 10]`; 랩 `[30, 10, 5]`; 군집 again `[60, 20, 10]`.

```js
const R = window.bubbleReplay, canvas = document.querySelector("canvas");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const settle = async () => { while (!R.idle()) await sleep(100); };
async function capture(steps) {
  for (const n of steps) { R.step(n); await settle(); }
  R.step(1);
  return canvas.toDataURL("image/png");
}
async function differing(a, b) {            // two data URLs → how many pixels differ, and by how much at most
  const pixels = async (url) => { const image = new Image(); image.src = url; await image.decode();
    const c = document.createElement("canvas"); c.width = image.width; c.height = image.height;
    const x = c.getContext("2d"); x.drawImage(image, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  const p = await pixels(a), q = await pixels(b); let count = 0, most = 0;
  for (let i = 0; i < p.length; i += 4) { const d = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])); if (d) { count += 1; most = Math.max(most, d); } }
  return { count, most };
}
```

Keep the captures of the code before somewhere that outlasts a reload (IndexedDB: a reload is needed between the two codes). A long first wait is the whole catalogue baking on one worker.

## What it does not cover

The goldfish's own canvas; sound; the frames while a bake arrives (only settled frames are compared); 얼굴 사진 색 above 0; looks no preset or 재질 opening reaches. For where two codes differ, swap one folder of the old code for the new and run a short sequence again: that found the one difference of 2026-11-18 (a shader arm that is never taken, yet whose removal moved pixels).
