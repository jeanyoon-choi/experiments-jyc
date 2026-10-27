// Goldfishes feed/1 relay registration: forwards the main screen's slot
// changes to every pc at once. No state, no timers — everything that could
// want tuning is in the screen (components/transport/feed/1/slots.mjs), so
// this file need not change, and the relay need not restart, while the feed
// is tuned (user, 2026-10-27).
// Contract: apps/goldfishes/docs/socket/feed/1.md
import { events, id, normalizePush, normalizeSnapshot, pcRoom, roles, room, screenRoom, version } from "./protocol.mjs";

export const feedRoom = room;

// Relay log: joins and leaves at once, traffic every 5 s while anyone is in the room.
const traffic = { pushes: 0, items: 0, snapshots: 0 };
const log = (message) => console.log(`[${id}] ${message}`);
let ioRef = null;

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) => socket.rooms.has(room));
  return {
    experimentId: id,
    version,
    total: sockets.length,
    screens: sockets.filter((socket) => socket.data[id]?.role === "screen").length,
    pcs: sockets.filter((socket) => socket.data[id]?.role === "pc").length,
    serverTime: Date.now(),
  };
}

setInterval(() => {
  if (!ioRef) return;
  const presence = getPresence(ioRef);
  if (presence.total === 0) return;
  log(`5s: ${presence.screens} screens, ${presence.pcs} pcs | forwarded ${traffic.pushes} pushes (${traffic.items} items), ${traffic.snapshots} snapshots`);
  for (const key of Object.keys(traffic)) traffic[key] = 0;
}, 5_000).unref();

function register({ io, socket }) {
  ioRef = io;
  const isScreen = () => socket.data[id]?.role === "screen" && socket.rooms.has(room);

  socket.on(events.join, ({ role, version: requestedVersion } = {}, acknowledge = () => {}) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    if (requestedVersion !== version) {
      reply({ ok: false, error: `${id} is required` });
      return;
    }
    if (!roles.includes(role)) {
      reply({ ok: false, error: `role must be one of ${roles.join(", ")}` });
      return;
    }
    socket.data[id] = { role, version };
    socket.join(room);
    socket.join(role === "screen" ? screenRoom : pcRoom);
    log(`join ${role} ${socket.id}`);
    // A new pc needs every screen's slots.
    if (role === "pc") io.to(screenRoom).emit(events.snapshotRequest, {});
    io.to(room).emit(events.presence, getPresence(io));
    reply({ ok: true });
  });

  socket.on(events.pushIn, (value = {}) => {
    if (!isScreen()) return;
    const push = normalizePush(value);
    traffic.pushes += 1;
    traffic.items += push.items.length;
    io.to(pcRoom).emit(events.pushOut, { screen: socket.id, ...push });
  });

  socket.on(events.snapshotIn, (value = {}) => {
    if (!isScreen()) return;
    traffic.snapshots += 1;
    io.to(pcRoom).emit(events.snapshotOut, { screen: socket.id, ...normalizeSnapshot(value) });
  });

  socket.on("disconnect", () => {
    if (!socket.data[id]) return;
    log(`leave ${socket.data[id].role} ${socket.id}`);
    if (socket.data[id].role === "screen") io.to(pcRoom).emit(events.screenGone, { screen: socket.id });
    io.to(room).emit(events.presence, getPresence(io));
  });
}

export const feedExperiment = {
  id,
  version,
  events,
  register,
};
