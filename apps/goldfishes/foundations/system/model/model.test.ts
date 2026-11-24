// The map must not point at things that are not there.
//   node --test apps/goldfishes/foundations/system/model/model.test.ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { HYPOTHESES, NODES, NOTES, REFERENCES, RELATIONS, VERSIONS, type Claim, type Evidence } from "./index.ts";

const app = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const registry = readFileSync(join(app, "components/experiments.ts"), "utf8");
const routes = new Set([...registry.matchAll(/^\s+key: "([^"]+)"/gm)].map((match) => match[1]));

const nodeIds = new Set(NODES.map((node) => node.id));
const relationIds = new Set(RELATIONS.map((relation) => relation.id));

function unique(ids: string[], what: string) {
  assert.equal(new Set(ids).size, ids.length, `${what}: an id is used twice`);
}

function checkClaims(owner: string, claims: Claim[]) {
  assert.ok(claims.length > 0, `${owner}: no source`);
  for (const claim of claims) {
    assert.ok(NOTES[claim.note], `${owner}: unknown note "${claim.note}"`);
  }
}

function checkEvidence(owner: string, evidence: Evidence[] = []) {
  for (const item of evidence) {
    if (item.route) assert.ok(routes.has(item.route), `${owner}: no experiment "${item.route}" in the registry`);
    if (item.file) assert.ok(existsSync(join(app, item.file)), `${owner}: no file "${item.file}"`);
  }
}

test("ids are unique and never shared between a node and a relation", () => {
  unique(NODES.map((node) => node.id), "nodes");
  unique(RELATIONS.map((relation) => relation.id), "relations");
  unique(HYPOTHESES.map((hypothesis) => hypothesis.id), "hypotheses");
  unique(VERSIONS.map((version) => version.id), "versions");
  for (const id of relationIds) assert.ok(!nodeIds.has(id), `"${id}" is both a node and a relation`);
});

test("every sentence has a source, every route and file exists", () => {
  for (const node of NODES) {
    checkClaims(node.id, node.claims);
    checkEvidence(node.id, node.built);
  }
  for (const relation of RELATIONS) {
    checkClaims(relation.id, relation.claims);
    checkEvidence(relation.id, relation.built);
    assert.ok(nodeIds.has(relation.from) && nodeIds.has(relation.to), `${relation.id}: an end is not a node`);
  }
  for (const hypothesis of HYPOTHESES) {
    checkClaims(hypothesis.id, hypothesis.claims);
    checkEvidence(hypothesis.id, hypothesis.evidence);
    for (const id of hypothesis.about) {
      assert.ok(nodeIds.has(id) || relationIds.has(id), `${hypothesis.id}: about unknown "${id}"`);
    }
    if (hypothesis.state === "supported" || hypothesis.state === "rejected") {
      assert.ok(hypothesis.verdict, `${hypothesis.id}: a verdict needs the artist's words and a date`);
    }
  }
});

test("every reference is a file in the app, beside parts that exist", () => {
  for (const reference of REFERENCES) {
    assert.ok(existsSync(join(app, reference.file)), `${reference.id}: no file "${reference.file}"`);
    for (const id of reference.about) assert.ok(nodeIds.has(id) || relationIds.has(id), `${reference.id}: beside unknown "${id}"`);
  }
});

test("a version holds only known parts, and both ends of each of its relations", () => {
  for (const version of VERSIONS) {
    const inVersion = new Set(version.nodes);
    for (const id of version.nodes) assert.ok(nodeIds.has(id), `${version.id}: unknown node "${id}"`);
    for (const id of version.relations) {
      const relation = RELATIONS.find((candidate) => candidate.id === id);
      assert.ok(relation, `${version.id}: unknown relation "${id}"`);
      assert.ok(inVersion.has(relation.from) && inVersion.has(relation.to), `${version.id}: "${id}" has an end outside it`);
    }
    for (const source of version.sources) assert.ok(NOTES[source], `${version.id}: unknown note "${source}"`);
    for (const id of Object.keys(version.labels ?? {})) {
      assert.ok(nodeIds.has(id) || relationIds.has(id), `${version.id}: a name for unknown "${id}"`);
    }
  }
  const dates = VERSIONS.map((version) => version.date);
  assert.deepEqual(dates, [...dates].sort(), "versions are oldest first");
});

test("a minor version keeps the structure of the version before it", () => {
  VERSIONS.forEach((version, index) => {
    assert.match(version.id, /^v\d+(\.\d+)?$/, `${version.id}: a version is "v2" or "v2.1"`);
    if (!version.id.includes(".")) return;
    const before = VERSIONS[index - 1];
    assert.equal(before?.id.split(".")[0], version.id.split(".")[0], `${version.id}: no ${version.id.split(".")[0]} before it`);
    assert.deepEqual([...version.nodes].sort(), [...before.nodes].sort(), `${version.id}: a minor version changes no node`);
    assert.deepEqual([...version.relations].sort(), [...before.relations].sort(), `${version.id}: a minor version changes no relation`);
  });
});

test("every part of the current version says what the code does today", () => {
  const current = VERSIONS[VERSIONS.length - 1];
  for (const id of current.nodes) {
    const node = NODES.find((candidate) => candidate.id === id);
    if (node && node.id !== "audience") assert.ok(node.status, `${id}: no status`);
  }
  for (const id of current.relations) {
    assert.ok(RELATIONS.find((candidate) => candidate.id === id)?.status, `${id}: no status`);
  }
});

test("the artist's notes cited are in the portfolio repository", (t) => {
  const entries = join(app, "../../../../project/portfolio-v4/content/texts/entries");
  if (!existsSync(entries)) return t.skip("portfolio-v4 is not on this machine");
  for (const key of Object.keys(NOTES)) {
    if (key.startsWith("notes-")) assert.ok(existsSync(join(entries, `${key}.json`)), `no transcript "${key}"`);
  }
});
