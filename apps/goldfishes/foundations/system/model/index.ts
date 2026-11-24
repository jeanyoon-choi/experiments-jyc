import { HYPOTHESES } from "./hypotheses.ts";
import { NODES } from "./nodes.ts";
import { NOTES } from "./notes.ts";
import { REFERENCES } from "./references.ts";
import { RELATIONS } from "./relations.ts";
import { LOG, VERSIONS } from "./versions.ts";

export type * from "./types.ts";
export { both, major, say } from "./text.ts";
export { HYPOTHESES, LOG, NODES, NOTES, REFERENCES, RELATIONS, VERSIONS };

export const CURRENT = VERSIONS[VERSIONS.length - 1];

export const nodeById = new Map(NODES.map((node) => [node.id, node]));
export const relationById = new Map(RELATIONS.map((relation) => [relation.id, relation]));
