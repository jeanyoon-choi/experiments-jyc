import assert from "node:assert/strict";
import test from "node:test";
import { createPerson, toWorld, updatePerson } from "./rig.ts";

const close = (a, b) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-6, `${JSON.stringify(a)} != ${JSON.stringify(b)}`);

test("a person appears from two session nodes and keeps its shape as nodes fade away", () => {
  const anchors = new Map([[1, { x: 180, y: 90 }], [2, { x: 90, y: 600 }], [3, { x: 300, y: 610 }]]);
  const person = updatePerson(createPerson(), anchors, 1 / 60);
  close(toWorld(person.figure.frame, person.figure.endpoints.leftFoot), anchors.get(2));
  const head = toWorld(person.figure.frame, person.figure.endpoints.head);
  const rightFoot = toWorld(person.figure.frame, person.figure.endpoints.rightFoot);

  anchors.delete(2);
  for (let frame = 0; frame < 60; frame += 1) updatePerson(person, anchors, 1 / 60);
  assert.ok(person.frozen, "the lost node froze its part");
  close(toWorld(person.figure.frame, person.figure.endpoints.head), head);
  close(toWorld(person.figure.frame, person.figure.endpoints.rightFoot), rightFoot);

  anchors.delete(3);
  updatePerson(person, anchors, 1 / 60);
  assert.equal(person.binding, null);
  close(toWorld(person.figure.frame, person.figure.endpoints.head), head);
});

test("a single node makes no person", () => {
  assert.equal(updatePerson(createPerson(), new Map([[1, { x: 0, y: 0 }]]), 1 / 60).figure, null);
});
