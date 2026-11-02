import type { ChatStore } from "./chat";
import { ROOMS, type Room } from "./rooms";
import { FACE_WORDS, FLAVOR_LINES, FRAGMENTS, GENERIC, IDLE, LOOKS, PILE_ON, READ_NO_REPLY, REPLY_BACK } from "./script";
import { TRIGGERS, emptyLevels, type Measures, type Signals, type Trigger, type TriggerLevels } from "./triggers";

// The face drives each room as a Poisson source. Rate per room =
//   base + Σ sensitivity · level · heat · (1 + 0.9 · pressure)
// plus onset bursts when a situation begins. Pressure (0–3) rises while the
// room is fed and decays at rest; it chooses the tier (mild → hostile) and,
// near the top, turns messages into fragment spam. Groups pile on.

/** How fast each situation inflames, independent of the room. */
export const HEAT: Record<Trigger, number> = {
  blank: 0.15, talk: 0.15, shut: 0.2, nervous: 0.2, down: 0.25, surprise: 0.4, sad: 0.45, smile: 0.5,
  tilt: 0.65, turn: 0.7, cute: 0.7, laugh: 0.8, fake: 1, close: 1, frown: 1.3, gone: 1.4, smirk: 1.4, disgust: 1.5, angry: 1.8,
};
/** Rooms hit by the first burst when a situation starts. */
const BURST: Record<Trigger, number> = {
  smile: 3, fake: 3, laugh: 4, blank: 1, frown: 4, angry: 6, sad: 2, disgust: 5, smirk: 5,
  surprise: 3, tilt: 4, turn: 3, down: 2, shut: 2, nervous: 1, close: 4, cute: 4, talk: 1, gone: 6,
};
/** How readily a situation becomes a remark about looks. */
const LOOKS_BIAS: Partial<Record<Trigger, number>> = { close: 1.4, smile: 0.9, laugh: 1, cute: 1, blank: 0.8, down: 0.9, fake: 0.7, surprise: 0.6 };

const MAX_PER_SECOND = 7;
const ONSET = 0.5;

type Kind = "trigger" | "idle" | "pile" | "read" | "reply";
type Pending = { due: number; kind: Kind; trigger?: Trigger };
type RoomState = { pressure: number; pending: Pending[]; recent: string[]; sinceReply: number; lastSender: string };

export type Director = ReturnType<typeof createDirector>;

export function createDirector(store: ChatStore, random: () => number = Math.random) {
  const states = new Map<string, RoomState>(ROOMS.map((room) => [room.id, { pressure: 0, pending: [], recent: [], sinceReply: 0, lastSender: "" }]));
  let previous: TriggerLevels = emptyLevels();
  let lastStep = 0;
  const sent: number[] = [];
  let signals: Signals = { present: false, levels: emptyLevels(), measures: { smileHeld: 0, tiltDeg: 0, turnDeg: 0, blinkRate: 0, blinks: 0, stillness: 0, asymmetry: 0, faceFill: 0, sinceBlink: 0 } };

  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];

  const fill = (text: string, measures: Measures) => text
    .replaceAll("{s}", measures.smileHeld.toFixed(1))
    .replaceAll("{tilt}", String(Math.max(1, Math.round(measures.tiltDeg))))
    .replaceAll("{turn}", String(Math.max(1, Math.round(measures.turnDeg))))
    .replaceAll("{blink}", String(Math.round(measures.blinkRate)))
    .replaceAll("{n}", String(Math.max(1, Math.round(measures.blinks))))
    .replaceAll("{still}", String(Math.max(3, Math.round(measures.stillness))))
    .replaceAll("{asym}", String(Math.max(3, Math.round(measures.asymmetry * 100))))
    .replaceAll("{fill}", String(Math.max(20, Math.round(measures.faceFill * 100))))
    .replaceAll("{nob}", String(Math.round(measures.sinceBlink)))
    .replaceAll("{score}", String(1 + Math.floor(random() * 7) / 2))
    .replaceAll("{pct}", String(1 + Math.floor(random() * 29)));

  const dominant = (levels: TriggerLevels): Trigger | "none" => {
    let best: Trigger | "none" = "none";
    let value = 0.3;
    for (const trigger of TRIGGERS) {
      if (levels[trigger] > value) {
        value = levels[trigger];
        best = trigger;
      }
    }
    return best;
  };

  const tierOf = (pressure: number) => (pressure < 0.9 ? 0 : pressure < 1.9 ? 1 : 2);

  const compose = (room: Room, state: RoomState, kind: Kind, trigger: Trigger | undefined): string => {
    const voice = FLAVOR_LINES[room.flavor];
    const register = room.register;
    const tier = tierOf(state.pressure);
    if (kind === "idle") return pick(voice?.idle && random() < 0.7 ? voice.idle : IDLE[register]);
    if (kind === "pile") return pick(PILE_ON[register]);
    if (kind === "read") return pick(READ_NO_REPLY[register]);
    if (kind === "reply") return pick(REPLY_BACK[register]).replaceAll("{face}", FACE_WORDS[dominant(signals.levels)]);
    const situation = trigger ?? "blank";
    if (state.pressure > 2.2 && random() < 0.32) return pick(FRAGMENTS[register]);
    const looksChance = room.looks * (LOOKS_BIAS[situation] ?? 0.35) * (0.4 + tier * 0.3);
    if (random() < looksChance) {
      if (voice?.looks && random() < 0.6) return pick(voice.looks);
      return pick(LOOKS[register][Math.min(2, tier + (random() < 0.3 ? 1 : 0))]);
    }
    const own = voice?.[situation];
    if (own && random() < 0.6) return pick(own);
    const tiers = GENERIC[register][situation];
    return pick(tiers[tier].length ? tiers[tier] : tiers[0]);
  };

  const deliver = (room: Room, state: RoomState, item: Pending, wall: number) => {
    let text = "";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      text = compose(room, state, item.kind, item.trigger);
      if (!state.recent.includes(text)) break;
    }
    state.recent.push(text);
    if (state.recent.length > 24) state.recent.shift();
    let sender = room.members[0].id;
    if (room.kind === "group") {
      const others = room.members.filter((member) => member.id !== state.lastSender);
      sender = pick(item.kind === "pile" && others.length ? others : room.members).id;
    }
    state.lastSender = sender;
    store.add({ roomId: room.id, sender, text: fill(text, signals.measures), at: wall, unread: 0 });
    if (store.openId === room.id) state.sinceReply += 1;
  };

  const schedule = (state: RoomState, item: Pending) => {
    if (state.pending.length < 8) state.pending.push(item);
  };

  return {
    step(next: Signals, now: number, wall: number) {
      signals = next;
      const elapsed = lastStep ? Math.min(250, now - lastStep) : 100;
      lastStep = now;
      const levels = next.levels;

      // Onset bursts: a situation that has just begun reaches several rooms
      // at once, the most sensitive first.
      for (const trigger of TRIGGERS) {
        if (levels[trigger] < ONSET || previous[trigger] >= ONSET) continue;
        const ranked = ROOMS
          .map((room) => ({ room, score: (room.sensitivity[trigger] ?? 0) * (0.5 + random()) + (store.openId === room.id ? 1 : 0) }))
          .filter((entry) => entry.score > 0.3)
          .sort((a, b) => b.score - a.score)
          .slice(0, BURST[trigger] + Math.round(levels[trigger] * 2));
        ranked.forEach(({ room }, order) => {
          schedule(states.get(room.id)!, { due: now + 180 + order * 140 + random() * 700, kind: "trigger", trigger });
        });
      }
      previous = { ...levels };

      const seconds = elapsed / 1000;
      for (const room of ROOMS) {
        const state = states.get(room.id)!;
        let drive = 0;
        let strongest: Trigger | undefined;
        let strongestValue = 0;
        for (const trigger of TRIGGERS) {
          const value = (room.sensitivity[trigger] ?? 0) * levels[trigger] * HEAT[trigger];
          drive += value;
          if (value > strongestValue) {
            strongestValue = value;
            strongest = trigger;
          }
        }
        // The room on screen watches hardest.
        const watching = store.openId === room.id;
        drive = Math.min(3, drive * (watching ? 2 : 1));
        state.pressure = Math.max(0, Math.min(3, state.pressure + (drive * 0.35 - 0.1) * seconds));
        const rate = room.base * (watching ? 3 : 1) / 60 + drive * 0.06 * (1 + 0.9 * state.pressure);
        if (random() < 1 - Math.exp(-rate * seconds)) {
          schedule(state, { due: now, kind: drive > 0.15 && strongest ? "trigger" : "idle", trigger: strongest });
        }
      }

      while (sent.length && now - sent[0] > 1000) sent.shift();
      for (const room of ROOMS) {
        const state = states.get(room.id)!;
        if (!state.pending.length) continue;
        state.pending.sort((a, b) => a.due - b.due);
        while (state.pending.length && state.pending[0].due <= now) {
          if (sent.length >= MAX_PER_SECOND) {
            state.pending[0].due = now + 150 + random() * 300;
            break;
          }
          const item = state.pending.shift()!;
          deliver(room, state, item, wall);
          sent.push(now);
          if (room.kind === "group" && item.kind !== "pile" && random() < 0.3 + state.pressure * 0.15) {
            schedule(state, { due: now + 500 + random() * 2000, kind: "pile" });
          }
          if (store.openId === room.id && state.sinceReply >= 4 && random() < 0.25) {
            state.sinceReply = 0;
            schedule(state, { due: now + 900 + random() * 1500, kind: "read" });
          }
        }
      }
      store.readMine(elapsed, random);
      store.flush();
    },

    /** The participant typed a reply: they answer the face, not the words. */
    reply(roomId: string, text: string, now: number, wall: number) {
      const room = ROOMS.find((candidate) => candidate.id === roomId);
      const state = states.get(roomId);
      if (!room || !state || !text.trim()) return;
      store.add({ roomId, sender: "me", text: text.trim(), at: wall, unread: room.kind === "dm" ? 1 : (room.size ?? room.members.length + 1) - 1 });
      state.sinceReply = 0;
      state.pressure = Math.min(3, state.pressure + 0.3);
      schedule(state, { due: now + 700 + random() * 1100, kind: "reply" });
      if (room.kind === "group") schedule(state, { due: now + 1400 + random() * 1600, kind: "pile" });
      store.flush();
    },

    pressure: (roomId: string) => states.get(roomId)?.pressure ?? 0,
  };
}
