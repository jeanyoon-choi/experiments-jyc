// Cubism 2 relay registration: one screen, any number of phones, one shared
// deformation of the video cube (the screen plane stays fixed).
// Contract: apps/xyt-cube/docs/cubism/2.md
import {
  bend,
  bendModelTiming,
  createBendRuntime,
  flatten,
  setClip,
  setOperation,
  setRate,
  snapshotBend,
} from "./model.mjs";

const familyId = "cubism";
const version = "2";
const id = `${familyId}:${version}`;
export const cubismBendRoom = `experiment:${familyId}:${version}`;
const clients = new Map();
const runtime = createBendRuntime();
let ioRef = null;
let dirty = true;

const events = {
  join: "cubism-2:join",
  hello: "cubism-2:hello",
  presence: "cubism-2:presence",
  stateOut: "cubism-2:state",
  bendIn: "cubism-2:bend:in",
  flattenIn: "cubism-2:flatten:in",
  operationIn: "cubism-2:operation:in",
  rateIn: "cubism-2:rate:in",
  clipIn: "cubism-2:clip:in",
};

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(cubismBendRoom),
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
  io.to(cubismBendRoom).emit(events.presence, getPresence(io));
}

setInterval(() => {
  const activeClientCount = ioRef?.sockets.adapter.rooms.get(cubismBendRoom)?.size ?? 0;
  if (!dirty || activeClientCount === 0) return;
  ioRef.to(cubismBendRoom).emit(events.stateOut, snapshotBend(runtime, Date.now()));
  dirty = false;
}, bendModelTiming.broadcastIntervalMs).unref();

function register({ io, socket }) {
  ioRef = io;
  const joined = () => Boolean(socket.data[id]) && socket.rooms.has(cubismBendRoom);
  const mark = (changed) => {
    if (changed) dirty = true;
  };

  socket.on(events.join, ({ role, version: requestedVersion } = {}, acknowledge = () => {}) => {
    if (requestedVersion !== version) {
      acknowledge({ ok: false, error: "cubism version 2 is required" });
      return;
    }
    const normalizedRole = role === "mobile" || role === "screen" ? role : "unknown";
    socket.data[id] = { role: normalizedRole, version };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(cubismBendRoom);
    socket.emit(events.hello, {
      state: snapshotBend(runtime, Date.now()),
      presence: getPresence(io),
    });
    broadcastPresence(io);
    acknowledge({ ok: true });
  });

  socket.on(events.bendIn, ({ delta } = {}) => {
    if (joined()) mark(bend(runtime, delta));
  });

  socket.on(events.flattenIn, () => {
    if (joined()) mark(flatten(runtime));
  });

  socket.on(events.operationIn, ({ operation } = {}) => {
    if (socket.data[id]?.role === "screen" && joined()) mark(setOperation(runtime, operation));
  });

  socket.on(events.rateIn, ({ rate } = {}) => {
    if (socket.data[id]?.role === "screen" && joined()) mark(setRate(runtime, rate, Date.now()));
  });

  socket.on(events.clipIn, ({ clip } = {}) => {
    if (socket.data[id]?.role === "screen" && joined()) mark(setClip(runtime, clip));
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    broadcastPresence(io);
  });
}

export const cubismBendExperiment = {
  id,
  events,
  register,
};
