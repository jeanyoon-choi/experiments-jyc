import assert from "node:assert/strict";
import test from "node:test";
import { bodyAt } from "./layout.ts";
import { createRankedWeb, DEFAULT_PARAMETERS, stepRankedWeb } from "../web/model.ts";
import { viewTargets } from "./views.ts";

test("ranking view orders pages by rank, left to right then row by row", () => {
  const web = createRankedWeb();
  const pending = { value: 0 };
  for (let step = 0; step < 600; step += 1) stepRankedWeb(web, 1 / 60, DEFAULT_PARAMETERS, pending);
  for (const frame of [{ width: 1440, height: 760 }, { width: 390, height: 700 }]) {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const bodies = Array.from({ length: web.size }, () => bodyAt(frame, random));
    const radii = Float64Array.from({ length: web.size }, (_, page) =>
      Math.max(2.2, Math.sqrt((web.rank[page]! * 0.06 * frame.width * frame.height) / Math.PI)));
    const out = new Float64Array(web.size * 2);
    viewTargets("ranking", bodies, radii, web.rank, web.size, frame, out);
    const order = Array.from({ length: web.size }, (_, page) => page).sort((a, b) => web.rank[b]! - web.rank[a]! || a - b);
    for (let index = 1; index < order.length; index += 1) {
      const before = order[index - 1]!;
      const after = order[index]!;
      const sameRow = Math.abs((out[after * 2 + 1]! + radii[after]!) - (out[before * 2 + 1]! + radii[before]!)) < 1e-6;
      if (sameRow) assert.ok(out[after * 2]! > out[before * 2]!);
      else assert.ok(out[after * 2 + 1]! > out[before * 2 + 1]! - radii[before]!);
    }
    for (let page = 0; page < web.size; page += 1) {
      assert.ok(out[page * 2]! >= 0 && out[page * 2]! <= frame.width);
    }
  }
});
