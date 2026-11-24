// The model in use, named once: what the loop (loop/) and the simulation (simulation/) import, so neither knows it
// is PageRank. Another model changes this file and what raft/raft.ts constructs.

import { DEFAULT_PARAMETERS, MAX_PAGES, type WebParameters } from "../web/model.ts";

export type { Relation, World, WorldEvent, WorldMetrics, WorldState } from "./world.ts";

/** What the panels set of the model, handed to World.step. */
export type ModelParameters = WebParameters;
/** What a world steps with while the panels set nothing. */
export const MODEL_DEFAULTS: ModelParameters = DEFAULT_PARAMETERS;

/** The most entities a world ever holds: what per-entity buffers are sized by. */
export const MAX_ENTITIES = MAX_PAGES;
