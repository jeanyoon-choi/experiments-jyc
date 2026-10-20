import assert from "node:assert/strict";
import test from "node:test";
import { experimentRegistries, experiments } from "./index.mjs";

test("socket experiment registry has unique ids and event names", () => {
  const ids = experiments.map((experiment) => experiment.id);
  const eventNames = experiments.flatMap((experiment) =>
    Object.values(experiment.events),
  );

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(eventNames).size, eventNames.length);
});

test("scoped socket registries expose only their owning app", () => {
  assert.deepEqual(
    experimentRegistries["c-val"].map(({ id }) => id),
    ["c-val:1", "c-val:2"],
  );
  assert.deepEqual(
    experimentRegistries["ddong-meong"].map(({ id }) => id),
    ["ddong-meong"],
  );
  assert.equal(
    experimentRegistries.scc.some(({ id }) => id.startsWith("c-val:")),
    false,
  );
  assert.deepEqual(experimentRegistries.goldfishes, []);
  assert.deepEqual(
    experimentRegistries["xyt-cube"].map(({ id }) => id),
    ["spacetime:1", "moving-image:1", "moving-image:2"],
  );
  assert.equal(
    experimentRegistries.scc.some(({ id }) => id.startsWith("ddong-meong-")),
    false,
  );
  assert.strictEqual(experimentRegistries.all, experiments);
});
