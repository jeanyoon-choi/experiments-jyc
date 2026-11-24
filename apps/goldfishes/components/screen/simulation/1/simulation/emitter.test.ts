// The emitter, driven as the frame loop drives it (the model's step, the display's, arrange, emit): mass is
// conserved, and every bit of the bubbles and their page, heading, target and travel is pinned on what
// render/frame-loop.ts emitBubbles wrote before it moved here (2026-11-18). A deliberate change of behaviour
// updates the digests (printed on failure).

import assert from "node:assert/strict";
import test from "node:test";
import { stepDisplay } from "./display.ts";
import { Emitter } from "./emitter.ts";
import { MODEL_DEFAULTS } from "../model/index.ts";
import { AREA_BUDGET } from "../raft/defaults.ts";
import { Raft } from "../raft/raft.ts";
import { BUBBLE_FLOATS, MAX_BUBBLES } from "../render/units.ts";

const FRAME = { width: 1200, height: 700 };
const DELTA = 1 / 60;

/** FNV-1a over the bytes of `values`, folded into `hash`. */
function fold(hash: number, values: ArrayLike<number>) {
  const bytes = new Uint8Array(Float64Array.from(values).buffer);
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16_777_619) >>> 0;
  return hash;
}

/** One frame as loop/frame-loop.ts orders it, up to the emitter; `between`: what the pointer does before the layout. */
function frame(raft: Raft, emitter: Emitter, bubbles: Float32Array, seconds: number, motionTime: number, visual: { area: number; portions: number; flow: number }, between?: () => void) {
  raft.step(seconds, { ...MODEL_DEFAULTS, growth: 1.5 });
  stepDisplay(raft.world, seconds);
  between?.();
  raft.arrange(raft.world.shown, DELTA, seconds, false, visual.area);
  return emitter.emit(raft.world, raft, bubbles, visual, motionTime, Math.max(DELTA, 1e-3));
}

function digest(pages: number, groups: number, steps: number) {
  const raft = new Raft({ pages, groups, damping: 0.85 });
  raft.resize(FRAME);
  const emitter = new Emitter();
  const bubbles = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  let motionTime = 0;
  let hash = 2_166_136_261;
  for (let step = 0; step < steps; step += 1) {
    raft.time += DELTA;
    const seconds = step % 7 === 0 ? DELTA * 0.3 : DELTA;
    // The portions' clock stands still for a while (reduced motion).
    if (step < 160 || step >= 170) motionTime += DELTA;
    const visual = { area: AREA_BUDGET, portions: step >= 220 ? 0 : 0.5, flow: step >= 180 && step < 200 ? 0 : 1 };
    const pageStart = frame(raft, emitter, bubbles, seconds, motionTime, visual, () => {
      if (step === 40) raft.toggleFocus(5);
      if (step === 70) raft.createPage(300, 200, null);
      if (step === 80) raft.toggleLink(3, 11);
      if (step === 100) raft.changeView("ranking");
      if (step === 150) raft.changeView("network");
    });
    const count = emitter.count;
    assert.equal(emitter.pageStart, pageStart);
    if (step % 5 === 4) {
      hash = fold(hash, bubbles.subarray(0, count * BUBBLE_FLOATS));
      hash = fold(hash, emitter.pageOf.subarray(0, count));
      hash = fold(hash, emitter.headingOf.subarray(0, count));
      hash = fold(hash, emitter.targetOf.subarray(0, count));
      hash = fold(hash, emitter.travelOf.subarray(0, count));
      hash = fold(hash, [pageStart, count]);
    }
  }
  return hash.toString(16).padStart(8, "0");
}

test("the emitter's bubbles are what the frame loop's emitBubbles wrote", () => {
  const found = [digest(120, 2, 260), digest(400, 1, 120), digest(1000, 4, 40)];
  assert.deepEqual(found, PINNED, `emitter digests: ${JSON.stringify(found)}`);
});

const PINNED = ["88bc084a", "a85e6545", "d5b35259"];

test("the portions under way and the pages' pools together hold the displayed weight", () => {
  // A scale at which a page's area is its pool exactly, unless it is held at the least radius.
  const area = 3;
  const visual = { area, portions: 0, flow: 1 };
  const scale = area * FRAME.width * FRAME.height;
  const raft = new Raft({ pages: 60, groups: 1, damping: 0.85 });
  raft.resize(FRAME);
  const emitter = new Emitter();
  const bubbles = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  let portionsSeen = 0;
  let exact = 0;
  for (let step = 0; step < 240; step += 1) {
    raft.time += DELTA;
    const pageStart = frame(raft, emitter, bubbles, DELTA, raft.time, visual);
    const state = raft.world.state;
    assert.equal(emitter.count - pageStart, state.size);
    let shown = 0;
    let links = 0;
    for (let page = 0; page < state.size; page += 1) {
      shown += raft.world.shown[page]!;
      links += state.out[page]!.length;
    }
    let mass = 0;
    let held = 0;
    for (let bubble = 0; bubble < emitter.count; bubble += 1) {
      const radius = bubbles[bubble * BUBBLE_FLOATS + 2]!;
      mass += (Math.PI * radius * radius) / scale;
      if (bubble >= pageStart && radius <= 5) held += 1;
      if (bubble < pageStart) {
        assert.equal(emitter.pageOf[bubble]! < state.size && emitter.targetOf[bubble]! < state.size, true);
      } else {
        assert.equal(emitter.pageOf[bubble], bubble - pageStart);
        assert.equal(emitter.targetOf[bubble], -1);
      }
    }
    portionsSeen += pageStart;
    // A portion under 1.5 px is not drawn: each link may be missing at most that much.
    const undrawn = (links * Math.PI * 1.5 * 1.5) / scale;
    assert.ok(Math.abs(shown - 1) < 1e-9, `displayed weight ${shown} at step ${step}`);
    assert.ok(mass >= shown - undrawn - 1e-5, `mass ${mass} of ${shown} (undrawn up to ${undrawn}) at step ${step}`);
    // A pool owing more than it holds is drawn at the least radius, not below nothing: only then is there more.
    if (held === 0) {
      exact += 1;
      assert.ok(mass <= shown + 1e-5, `mass ${mass} of ${shown} at step ${step}`);
    }
  }
  assert.ok(portionsSeen > 1_000 && exact > 60, `portions ${portionsSeen}, frames with no page held ${exact}`);
});
