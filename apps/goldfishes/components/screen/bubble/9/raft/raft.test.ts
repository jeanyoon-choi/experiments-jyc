// Pinned digests of the raft driven as the frame loop drives it (Raft.step: the model's step and new pages placed;
// the displayed rank's step through the model's contract; arrange, a view change and back, pages and links made by hand): a refactor of raft/ must leave every
// bit of the bodies, the drawn centres and the radii as it was. A deliberate change of behaviour updates the digests
// (printed on failure). The layout keeps its sort order between calls (layout.ts `order`), so the runs below are in
// one fixed sequence.

import assert from "node:assert/strict";
import test from "node:test";
import { AREA_BUDGET } from "./defaults.ts";
import { Raft } from "./raft.ts";
import { DEFAULT_PARAMETERS } from "../web/model.ts";

const FRAME = { width: 1200, height: 700 };

/** FNV-1a over the bytes of `values`, folded into `hash`. */
function fold(hash: number, values: ArrayLike<number>) {
  const bytes = new Uint8Array(Float64Array.from(values).buffer);
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16_777_619) >>> 0;
  return hash;
}

function digest(pages: number, groups: number, steps: number) {
  const raft = new Raft({ pages, groups, damping: 0.85 });
  raft.resize(FRAME);
  const world = raft.world;
  const shown = world.shown;
  const parameters = { ...DEFAULT_PARAMETERS, growth: 1.5 };
  const delta = 1 / 60;
  let hash = 2_166_136_261;
  for (let step = 0; step < steps; step += 1) {
    raft.time += delta;
    // As loop/frame-loop.ts: the model's step (the digests are those of stepRankedWeb, placePage and iterate called
    // here directly, before the raft held its model: 2026-11-18), then the display's.
    raft.step(delta, parameters);
    world.show(0.1);
    if (step === 90) raft.changeView("ranking");
    if (step === 120) raft.createPage(300, 200, null);
    if (step === 130) raft.createPageFromLeader();
    if (step === 140) raft.toggleLink(3, 11);
    if (step === 150) raft.resize({ width: 1000, height: 720 });
    if (step === 200) raft.changeView("network");
    raft.arrange(shown, delta, step % 7 === 0 ? delta * 0.2 : delta, step > 250, AREA_BUDGET);
    if (step % 25 === 24) {
      const size = world.state.size;
      for (let page = 0; page < size; page += 1) {
        const body = raft.bodies[page]!;
        hash = fold(hash, [body.x, body.y, body.vx, body.vy]);
      }
      hash = fold(hash, raft.points.subarray(0, size * 2));
      hash = fold(hash, raft.radii.subarray(0, size));
      const at = raft.pageAt(raft.points[10]!, raft.points[11]!);
      const link = raft.linkAt(FRAME.width / 2, FRAME.height / 2);
      hash = fold(hash, [size, raft.linkVisibility, at ?? -1, link?.from ?? -1, link?.to ?? -1]);
    }
  }
  return hash.toString(16).padStart(8, "0");
}

test("the raft, arranged step by step, is pinned", () => {
  const found = [digest(300, 2, 300), digest(120, 1, 200), digest(900, 4, 60)];
  assert.deepEqual(found, PINNED, `raft digests: ${JSON.stringify(found)}`);
});

const PINNED = ["136239b9", "7ed535be", "3f4ae366"];
