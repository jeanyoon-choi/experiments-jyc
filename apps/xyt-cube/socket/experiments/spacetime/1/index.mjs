// Spacetime 1 relay registration: one screen, any number of phones, each
// phone performing one operation (O1 compact, O2 boost, O3 mass).
// Contract: apps/xyt-cube/docs/spacetime/1.md
import {
  createSpacetimeRuntime,
  moveMass,
  pressMass,
  releaseMass,
  removeObserver,
  resetSpacetime,
  setCompactness,
  setObserver,
  snapshotSpacetime,
  spacetimeModelTiming,
  stepSpacetime,
} from "./model.mjs";

const familyId = "spacetime";
const version = "1";
const id = `${familyId}:${version}`;
export const spacetimeRoom = `experiment:${familyId}:${version}`;
const clients = new Map();
const runtime = createSpacetimeRuntime();
let ioRef = null;
let dirty = true;
let lastStepAt = Date.now();

const events = {
  join: "spacetime-1:join",
  hello: "spacetime-1:hello",
  presence: "spacetime-1:presence",
  stateOut: "spacetime-1:state",
  compactIn: "spacetime-1:compact:in",
  boostIn: "spacetime-1:boost:in",
  boostLeaveIn: "spacetime-1:boost-leave:in",
  massPressIn: "spacetime-1:mass-press:in",
  massMoveIn: "spacetime-1:mass-move:in",
  massReleaseIn: "spacetime-1:mass-release:in",
  resetIn: "spacetime-1:reset:in",
};

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(spacetimeRoom),
  );

  return {
    experimentId: familyId,
    version,
    total: sockets.length,
    mobiles: sockets.filter((socket) => socket.data[id]?.role === "mobile").length,
    screens: sockets.filter((socket) => socket.data[id]?.role === "screen").length,
    clients: sockets.map((socket) => ({
      id: socket.id,
      role: socket.data[id]?.role || "unknown",
      connectedAt: clients.get(socket.id)?.connectedAt || Date.now(),
    })),
    serverTime: Date.now(),
  };
}

function broadcastPresence(io) {
  io.to(spacetimeRoom).emit(events.presence, getPresence(io));
}

function broadcastState(io, now = Date.now()) {
  io.to(spacetimeRoom).emit(events.stateOut, snapshotSpacetime(runtime, now));
  dirty = false;
}

setInterval(() => {
  const now = Date.now();
  const dt = Math.min((now - lastStepAt) / 1000, 0.25);
  lastStepAt = now;
  if (stepSpacetime(runtime, now, dt)) dirty = true;
  const activeClientCount = ioRef?.sockets.adapter.rooms.get(spacetimeRoom)?.size ?? 0;
  if (dirty && activeClientCount > 0) broadcastState(ioRef, now);
}, spacetimeModelTiming.broadcastIntervalMs).unref();

function register({ io, socket }) {
  ioRef = io;
  const isRole = (role) =>
    socket.data[id]?.role === role && socket.rooms.has(spacetimeRoom);
  const mark = (changed) => {
    if (changed) dirty = true;
  };

  socket.on(events.join, ({ role, version: requestedVersion } = {}, acknowledge = () => {}) => {
    if (requestedVersion !== version) {
      acknowledge({ ok: false, error: "spacetime version 1 is required" });
      return;
    }
    const normalizedRole = role === "mobile" || role === "screen" ? role : "unknown";
    socket.data[id] = { role: normalizedRole, version };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(spacetimeRoom);
    socket.emit(events.hello, {
      state: snapshotSpacetime(runtime, Date.now()),
      presence: getPresence(io),
    });
    broadcastPresence(io);
    acknowledge({ ok: true });
  });

  socket.on(events.compactIn, ({ compactness } = {}) => {
    if (isRole("mobile")) mark(setCompactness(runtime, compactness));
  });

  socket.on(events.boostIn, ({ bx, by } = {}) => {
    if (isRole("mobile")) mark(setObserver(runtime, socket.id, bx, by, Date.now()));
  });

  socket.on(events.boostLeaveIn, () => {
    mark(removeObserver(runtime, socket.id));
  });

  socket.on(events.massPressIn, ({ u, v } = {}) => {
    if (isRole("mobile")) mark(pressMass(runtime, socket.id, u, v, Date.now()));
  });

  socket.on(events.massMoveIn, ({ u, v } = {}) => {
    if (isRole("mobile")) mark(moveMass(runtime, socket.id, u, v));
  });

  socket.on(events.massReleaseIn, () => {
    mark(releaseMass(runtime, socket.id));
  });

  socket.on(events.resetIn, () => {
    if (!isRole("screen")) return;
    resetSpacetime(runtime);
    dirty = true;
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    mark(removeObserver(runtime, socket.id));
    mark(releaseMass(runtime, socket.id));
    broadcastPresence(io);
  });
}

export const spacetimeExperiment = {
  id,
  events,
  register,
};
