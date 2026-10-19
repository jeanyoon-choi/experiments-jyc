import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { spacetimeExperiment, spacetimeRoom } from "./index.mjs";

function fakeIo() {
  const sockets = new Map();
  return {
    sockets: { sockets, adapter: { rooms: new Map() } },
    to: () => ({ emit: () => {} }),
  };
}

function connect(io, id) {
  const socket = new EventEmitter();
  socket.id = id;
  socket.data = {};
  socket.rooms = new Set();
  socket.sent = [];
  socket.join = (room) => socket.rooms.add(room);
  socket.emit = (event, payload) => socket.sent.push({ event, payload });
  socket.trigger = (event, payload, ack) =>
    EventEmitter.prototype.emit.call(socket, event, payload, ack);
  io.sockets.sockets.set(id, socket);
  spacetimeExperiment.register({ io, socket });
  return socket;
}

function join(socket, role, version = "1") {
  let result;
  socket.trigger(spacetimeExperiment.events.join, { role, version }, (value) => {
    result = value;
  });
  return result;
}

function helloState(socket) {
  return socket.sent.find(({ event }) => event === spacetimeExperiment.events.hello).payload.state;
}

test("join checks the version and answers hello with presence", () => {
  const io = fakeIo();
  const stale = connect(io, "old");
  assert.equal(join(stale, "mobile", "0").ok, false);
  const mobile = connect(io, "m0");
  assert.equal(join(mobile, "mobile").ok, true);
  assert.ok(mobile.rooms.has(spacetimeRoom));
  const hello = mobile.sent.find(({ event }) => event === spacetimeExperiment.events.hello);
  assert.equal(hello.payload.presence.mobiles, 1);
});

test("only phones operate, only the screen resets, leaving keeps masses", () => {
  const { events } = spacetimeExperiment;
  const io = fakeIo();
  const mobile = connect(io, "m1");
  const screen = connect(io, "s1");
  join(mobile, "mobile");
  join(screen, "screen");

  mobile.trigger(events.compactIn, { compactness: 0.4 });
  screen.trigger(events.compactIn, { compactness: 0.9 });
  mobile.trigger(events.boostIn, { bx: 0.3, by: 0 });
  mobile.trigger(events.massPressIn, { u: 0.5, v: 0.5 });

  const late = connect(io, "s2");
  join(late, "screen");
  const state = helloState(late);
  assert.equal(state.compactness, 0.4);
  assert.deepEqual(state.observers.map(({ id }) => id), ["m1"]);
  assert.equal(state.masses.length, 1);

  mobile.trigger(events.resetIn);
  mobile.trigger("disconnect");
  const kept = connect(io, "s3");
  join(kept, "screen");
  assert.equal(helloState(kept).observers.length, 0);
  assert.equal(helloState(kept).masses[0].holding, false);

  screen.trigger(events.resetIn);
  const after = connect(io, "s4");
  join(after, "screen");
  assert.equal(helloState(after).compactness, 0);
  assert.equal(helloState(after).masses.length, 0);
});
