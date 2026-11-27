// The bakes' queue: fields are baked off the main thread (field-worker.ts), on demand — every kind the pages or the
// portions may show now (kindsInUse) into tier 0 at least, and any kind wanting a finer tier than it has (tiers.ts
// Residency), the largest objects' first. The object pass tells it what it draws (`shown`, `seen`) and lets it plan
// a few times a second; what a worker answers goes to `takeIn` (field-textures.ts).
//
// Nothing a worker imports may import this file: a worker importing the module that starts it hung the production
// build (fish/school-core.ts). field-worker.ts is named here only as the Worker's URL and for its types.

import { kindsInUse, type ObjectParameters } from "../kinds/parameters.ts";
import { FIELD_KINDS, layerOf } from "../kinds/layers.ts";
import type { FieldAnswer, FieldRequest } from "./field-worker";
import { KEPT_BAKES } from "./tier-data.ts";
import type { Residency } from "./tiers.ts";

/** A few times a second: which kinds should hold which pools (tiers.ts), and the bakes that takes. */
const PLAN_EVERY = 0.25;

export type BakeQueue = {
  /** The layer if baked; else the bubble's, the layer asked for so it bakes. */
  shown(layer: number): number;
  /** Its largest object on screen since the last plan (CSS px), for the pools. */
  seen(layer: number, radius: number): void;
  /** Once a frame, after its objects are seen: every PLAN_EVERY seconds the pools are planned and bakes sent off. */
  plan(time: number, parameters: ObjectParameters, cssPerPixel: number): void;
  /** Whether no bake is under way: every worker is back. */
  idle(): boolean;
  dispose(): void;
};

export function createBakeQueue(residency: Residency, takeIn: (answer: FieldAnswer) => void): BakeQueue {
  const { layers, baked } = residency;
  const workers: Worker[] = [];
  const free: Worker[] = [];
  /** Per worker, the layers whose bakes it keeps (field-worker.ts `kept`, counted here as it counts them there). */
  const keeping = new Map<Worker, Set<number>>();
  const keep = (worker: Worker, layer: number) => {
    const layers = keeping.get(worker)!;
    layers.delete(layer);
    layers.add(layer);
    if (layers.size > KEPT_BAKES) layers.delete(layers.values().next().value!);
  };
  // `?replay` (loop/replay.ts): one worker, so the bakes come back in the order they were asked for and the pools
  // fill the same way every run.
  // simulation/2 (2026-11-25): the frame's own thread, the school's worker and the browser's GPU process each want a
  // core too. While three workers baked, the frame's own work took 1.6–2.4 times as long on a ten-core machine
  // (measured); on four cores three workers leave it nothing. So one worker up to four cores, two up to six, else three
  // (not measured on a machine with few cores: the opening's bakes take longer there, the frames should not).
  const cores = navigator.hardwareConcurrency || 2;
  const workerCount = window.location.search.includes("replay") || cores <= 4 ? 1 : cores <= 6 ? 2 : 3;
  let disposed = false;
  /** Per layer: a bake under way. */
  const baking = new Uint8Array(layers);
  /** Per layer: its largest object's radius (CSS px) drawn since the last plan, and as of that plan. */
  const drawnRadius = new Float32Array(layers);
  const plannedRadius = new Float32Array(layers);
  /** Per layer: asked for (wanted on screen before its field is in), so it bakes even if nothing in use has it. */
  const asked = new Uint8Array(layers);
  let inUse: number[] = [];
  let inUseOf: ObjectParameters | null = null;
  let plannedAt = -Infinity;
  /**
   * Whether `layer`'s bake is kept by another worker and not by `worker`: it waits for that one, which cuts its tiers
   * in a few milliseconds, instead of being baked over again here. (All three were busy without end, so the worker
   * that had just come free was seldom the one that kept it: measured, one bake in five came from a kept one.)
   */
  const keptElsewhere = (layer: number, worker: Worker) => {
    if (workers.length === 1 || keeping.get(worker)!.has(layer)) return false;
    for (const [other, layers] of keeping) if (other !== worker && layers.has(layer)) return true;
    return false;
  };
  const nextJob = (worker: Worker) => {
    // The largest object's kind lacking what it wants; then those asked for; then the rest in use, in order.
    let best = -1;
    let bestRadius = 0;
    for (let layer = 1; layer < layers; layer += 1) {
      if (baking[layer] || plannedRadius[layer]! <= bestRadius || !residency.lacking(layer) || keptElsewhere(layer, worker)) continue;
      best = layer;
      bestRadius = plannedRadius[layer]!;
    }
    if (best >= 0) return best;
    for (let layer = 1; layer < layers; layer += 1) if (asked[layer] && !baked[layer] && !baking[layer] && !keptElsewhere(layer, worker)) return layer;
    for (const layer of inUse) if (!baked[layer] && !baking[layer] && !keptElsewhere(layer, worker)) return layer;
    return -1;
  };
  const dispatch = () => {
    // Each free worker, the last freed first, takes the best job that is its to take.
    for (let at = free.length - 1; at >= 0; at -= 1) {
      const worker = free[at]!;
      for (;;) {
        const layer = nextJob(worker);
        if (layer < 0) break;
        const tiers = residency.tiersToBake(layer);
        if (tiers.length === 0) {
          // Nothing it could bring now (its pool is full of wanted kinds): it waits for the next plan.
          plannedRadius[layer] = 0;
          continue;
        }
        baking[layer] = 1;
        free.splice(at, 1);
        keep(worker, layer);
        worker.postMessage({ layer, kind: FIELD_KINDS[layer]!, tiers } satisfies FieldRequest);
        break;
      }
    }
  };
  for (let index = 0; index < workerCount; index += 1) {
    const worker = new Worker(new URL("./field-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FieldAnswer>) => {
      if (disposed) return;
      baking[event.data.layer] = 0;
      takeIn(event.data);
      free.push(worker);
      dispatch();
    };
    workers.push(worker);
    free.push(worker);
    keeping.set(worker, new Set());
  }

  return {
    shown: (layer) => {
      if (baked[layer]) return layer;
      asked[layer] = 1;
      return 0;
    },
    seen: (layer, radius) => {
      if (layer >= 0 && radius > drawnRadius[layer]!) drawnRadius[layer] = radius;
    },
    plan: (time, parameters, cssPerPixel) => {
      if (parameters !== inUseOf) {
        inUseOf = parameters;
        inUse = kindsInUse(parameters)
          .map(layerOf)
          .filter((layer) => layer > 0);
      }
      // The first frame plans at once (so the first bakes are the largest objects'); a clock that went back too.
      if (time - plannedAt < PLAN_EVERY && time >= plannedAt) return;
      plannedAt = time;
      residency.plan(drawnRadius, cssPerPixel, time);
      plannedRadius.set(drawnRadius);
      drawnRadius.fill(0);
      dispatch();
    },
    idle: () => free.length === workers.length,
    dispose: () => {
      disposed = true;
      for (const worker of workers) worker.terminate();
    },
  };
}
