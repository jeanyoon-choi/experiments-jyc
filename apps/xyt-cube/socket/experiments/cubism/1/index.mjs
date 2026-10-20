// Cubism 1 relay registration: one screen, any number of phones, one shared
// cut plane through the video cube.
// Contract: apps/xyt-cube/docs/cubism/1.md
import {
  createCubismRuntime,
  cubismModelTiming,
  facePlane,
  setClip,
  setPivot,
  setRate,
  snapshotCubism,
  turnPlane,
} from "./model.mjs";

const familyId = "cubism";
const version = "1";
const id = `${familyId}:${version}`;
export const cubismRoom = `experiment:${familyId}:${version}`;
const clients = new Map();
const runtime = createCubismRuntime();
let ioRef = null;
let dirty = true;

const events = {
  join: "cubism-1:join",
  hello: "cubism-1:hello",
  presence: "cubism-1:presence",
  stateOut: "cubism-1:state",
  turnIn: "cubism-1:turn:in",
  faceIn: "cubism-1:face:in",
  rateIn: "cubism-1:rate:in",
  clipIn: "cubism-1:clip:in",
  pivotIn: "cubism-1:pivot:in",
};

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(cubismRoom),
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
  io.to(cubismRoom).emit(events.presence, getPresence(io));
}

setInterval(() => {
  const activeClientCount = ioRef?.sockets.adapter.rooms.get(cubismRoom)?.size ?? 0;
  if (!dirty || activeClientCount === 0) return;
  ioRef.to(cubismRoom).emit(events.stateOut, snapshotCubism(runtime, Date.now()));
  dirty = false;
}, cubismModelTiming.broadcastIntervalMs).unref();

function register({ io, socket }) {
  ioRef = io;
  const joined = () => Boolean(socket.data[id]) && socket.rooms.has(cubismRoom);
  const mark = (changed) => {
    if (changed) dirty = true;
  };

  socket.on(events.join, ({ role, version: requestedVersion } = {}, acknowledge = () => {}) => {
    if (requestedVersion !== version) {
      acknowledge({ ok: false, error: "cubism version 1 is required" });
      return;
    }
    const normalizedRole = role === "mobile" || role === "screen" ? role : "unknown";
    socket.data[id] = { role: normalizedRole, version };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(cubismRoom);
    socket.emit(events.hello, {
      state: snapshotCubism(runtime, Date.now()),
      presence: getPresence(io),
    });
    broadcastPresence(io);
    acknowledge({ ok: true });
  });

  socket.on(events.turnIn, ({ delta } = {}) => {
    if (joined()) mark(turnPlane(runtime, delta));
  });

  socket.on(events.faceIn, () => {
    if (joined()) mark(facePlane(runtime));
  });

  socket.on(events.rateIn, ({ rate } = {}) => {
    if (socket.data[id]?.role === "screen" && joined()) mark(setRate(runtime, rate, Date.now()));
  });

  socket.on(events.clipIn, ({ clip } = {}) => {
    if (socket.data[id]?.role === "screen" && joined()) mark(setClip(runtime, clip));
  });

  socket.on(events.pivotIn, ({ pivot } = {}) => {
    if (socket.data[id]?.role === "screen" && joined()) mark(setPivot(runtime, pivot));
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    broadcastPresence(io);
  });
}

export const cubismExperiment = {
  id,
  events,
  register,
};
