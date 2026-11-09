import type { ChatStore } from "./chat";
import { ROOMS } from "./rooms";
import { LEAVE, PEACE, PILE, REBUT, REPLY, SAY, THREADS } from "./script";
import { SIDES, other, type Member, type Room, type Side, type Thread } from "./types";

// The phone's roll is the only input. `lean` runs −1 (left) … +1 (right).
//
// Speed follows the tilt and nothing else: messages per second =
// MAX_RATE · |lean|^1.5 (8/s at full tilt, about 2.8/s at half, 1/s at a
// quarter). A token bucket holds every delivery — lines, pile-ons, beats of a
// thread, departures — to that rate. A level phone sends nothing: the queue
// is dropped and no room moves. There is no small talk; the tab starts empty
// and a room appears with its first political message.
//
// Each side keeps a heat (0–3). It rises at 0.2/s · |lean| while the phone
// leans that way and falls at 0.08/s otherwise, so a long lean radicalises
// every room and a swing to the other side meets the leftovers of the first.
// Heat sets the tier: below 0.9 온건, below 1.9 강경, above 극단.
//
// A political message is either the next beat of a scripted thread or one
// line from the person the side favours: members who lean that way speak
// most; members of the other side push back at 온건, mutter at 강경 and leave
// the room at 극단; people with no side ask for it to stop, then leave too.
// Rooms are drawn by how political they are; the open room three times as
// often.

const MAX_RATE = 8;
const LEVEL = 0.03;
const RISE = 0.2;
const FALL = 0.08;

type Kind = "political" | "beat" | "pile" | "reply" | "system";
type Pending = { due: number; kind: Kind; side?: Side; member?: string; text?: string };
type RoomState = {
  pending: Pending[];
  recent: string[];
  lastSender: string;
  /** Members who left (or were kicked) and when. */
  gone: Map<string, number>;
  /** A thread being played: aborted if the phone swings to the other side. */
  thread: { side: Side; until: number } | null;
};

export type Director = ReturnType<typeof createDirector>;

/** Open-chat moderation talk: kicks, entry checks, 분탕 reports. Nowhere else. */
const OPEN_ONLY = /강퇴|분탕 신고|분탕 들어왔|입장 10분|프리홍콩 입력/;

const tierOf = (heat: number) => (heat < 0.9 ? 0 : heat < 1.9 ? 1 : 2);
const sideOf = (lean: number): Side => (lean < 0 ? "left" : "right");

export function createDirector(store: ChatStore, random: () => number = Math.random) {
  const states = new Map<string, RoomState>(ROOMS.map((room) => [room.id, { pending: [], recent: [], lastSender: "", gone: new Map(), thread: null }]));
  const heat: Record<Side, number> = { left: 0, right: 0 };
  let lean = 0;
  let lastStep = 0;
  let turn = 0;
  let tokens = 0;
  /** Rooms that have shown a message. */
  const opened = new Set<string>();
  const sent: number[] = [];

  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];

  /** Weighted choice; null when every weight is zero. */
  const choose = <T,>(entries: readonly (readonly [T, number])[]): T | null => {
    let total = 0;
    for (const [, weight] of entries) total += Math.max(0, weight);
    if (total <= 0) return null;
    let roll = random() * total;
    for (const [value, weight] of entries) {
      roll -= Math.max(0, weight);
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1][0];
  };

  const present = (room: Room, state: RoomState) => room.members.filter((member) => !state.gone.has(member.id));
  const stance = (member: Member, side: Side) => (member.lean === 0 ? "none" : sideOf(member.lean) === side ? "with" : "against");

  const fresh = (state: RoomState, pool: readonly string[], room?: Room) => {
    const usable = room && !room.open ? pool.filter((line) => !OPEN_ONLY.test(line)) : pool;
    if (usable.length) pool = usable;
    let text = pick(pool);
    for (let attempt = 0; attempt < 6 && state.recent.includes(text); attempt += 1) text = pick(pool);
    return text;
  };

  const post = (room: Room, state: RoomState, sender: string, text: string, wall: number): true => {
    state.recent.push(text);
    if (state.recent.length > 40) state.recent.shift();
    if (sender !== "system") state.lastSender = sender;
    opened.add(room.id);
    store.add({ roomId: room.id, sender, text, at: wall, unread: 0 });
    return true;
  };

  const schedule = (state: RoomState, item: Pending) => {
    if (state.pending.length < 12) state.pending.push(item);
  };

  /** An open chat belongs to one side: its majority stays, and it kicks the rest. */
  const homeOf = (room: Room): Side | null => (room.open ? sideOf(room.members.reduce((sum, member) => sum + member.lean, 0)) : null);

  const leave = (room: Room, state: RoomState, member: Member, now: number) => {
    state.gone.set(member.id, now);
    const kicked = Boolean(room.open);
    schedule(state, { due: now + 400 + random() * 900, kind: "system", text: kicked ? `${member.name}님을 내보냈습니다.` : `${member.name}님이 나갔습니다.` });
  };

  /** A member who left comes back once the room has cooled toward their side. */
  const maybeReturn = (room: Room, state: RoomState, now: number) => {
    for (const [id, at] of state.gone) {
      const member = room.members.find((candidate) => candidate.id === id);
      if (!member || now - at < 12_000) continue;
      // Back when the tilt turns their way; people with no side once the
      // current side has cooled to 온건.
      const theirs = member.lean === 0 ? null : sideOf(member.lean);
      const welcoming = theirs ? heat[theirs] > 0.6 && lean * member.lean > 0 : tierOf(heat[sideOf(lean)]) === 0 && now - at > 20_000;
      if (!welcoming || random() > 0.04) continue;
      state.gone.delete(id);
      const host = present(room, state).find((candidate) => candidate.id !== id);
      const text = room.open || !host ? `${member.name}님이 들어왔습니다.` : `${host.name}님이 ${member.name}님을 초대했습니다.`;
      schedule(state, { due: now + random() * 600, kind: "system", text });
    }
  };

  const fillNames = (text: string, roles: Partial<Record<"A" | "B" | "O" | "N", Member>>) => text
    .replaceAll("{A}", roles.A?.name ?? "")
    .replaceAll("{B}", roles.B?.name ?? "")
    .replaceAll("{O}", roles.O?.name ?? "")
    .replaceAll("{N}", roles.N?.name ?? "");

  /** Binds a thread's roles to present members and queues every beat. */
  const startThread = (room: Room, state: RoomState, side: Side, thread: Thread, now: number) => {
    const people = present(room, state);
    const withSide = people.filter((member) => stance(member, side) === "with").sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean) + (random() - 0.5));
    const against = people.filter((member) => stance(member, side) === "against");
    const none = people.filter((member) => member.lean === 0);
    const roles = { A: withSide[0], B: withSide[1] ?? withSide[0], O: against.length ? pick(against) : undefined, N: none.length ? pick(none) : undefined };
    if (!roles.A) return false;
    let due = now + 200 + random() * 600;
    for (const [role, text] of thread) {
      const speaker = roles[role];
      if (!speaker || (!room.open && OPEN_ONLY.test(text))) continue;
      schedule(state, { due, kind: "beat", side, member: speaker.id, text: fillNames(text, roles) });
      due += 900 + random() * 1700 + Math.min(2500, text.length * 25);
    }
    state.thread = { side, until: due };
    return true;
  };

  /** One political turn; false when it only queued a thread or found no speaker. */
  const political = (room: Room, state: RoomState, side: Side, now: number, wall: number): boolean => {
    const tier = tierOf(heat[side]);
    // Threads carry the narrative; most messages outside them are single lines.
    if (room.kind === "group" && (!state.thread || state.thread.until < now) && random() < 0.4) {
      const pool = THREADS[side][tier];
      if (pool.length && startThread(room, state, side, pick(pool), now)) return false;
    }
    const people = present(room, state);
    const home = homeOf(room);
    const hostile = home !== null && home !== side;
    const speaker = choose(people.map((member) => {
      const position = stance(member, side);
      // In the other side's open chat the lone voice speaks up and the room shouts it down.
      const weight = hostile ? (position === "with" ? 0.5 : 0.9)
        : position === "with" ? 0.6 + Math.abs(member.lean) * 0.5
          : position === "against" ? [0.7, 0.35, 0.15][tier] * Math.abs(member.lean)
            : [0.45, 0.25, 0.12][tier];
      return [member, member.id === state.lastSender && room.kind === "group" ? weight * 0.3 : weight] as const;
    }));
    if (!speaker) return false;
    const position = stance(speaker, side);
    let text: string;
    if (position === "with") text = fresh(state, SAY[side][speaker.voice][tier], room);
    else if (position === "against") {
      // Shouting down the other side's tilt, an open chat's majority also
      // turns up its own line.
      text = fresh(state, hostile && random() < 0.6 ? SAY[other(side)][speaker.voice][tier] : REBUT[other(side)][speaker.voice], room);
    }
    else text = fresh(state, PEACE[speaker.voice]);
    post(room, state, speaker.id, text, wall);
    // At 극단 the people who disagree, or want none of it, walk out; an open
    // chat kicks whoever is not its own side.
    const outsider = home !== null && speaker.lean !== 0 && sideOf(speaker.lean) !== home;
    const walks = home === null ? position !== "with" : outsider;
    if (walks && room.kind === "group" && tier >= 1 && random() < (tier === 2 ? 0.28 : 0.06) * (hostile ? 1.5 : 1)) {
      if (random() < 0.5) schedule(state, { due: now + 700 + random() * 900, kind: "beat", member: speaker.id, text: fresh(state, LEAVE[speaker.voice]) });
      leave(room, state, speaker, now + 1200);
    }
    if (room.kind === "group" && random() < 0.25 + 0.15 * tier) schedule(state, { due: now + 500 + random() * 1800, kind: "pile", side });
    return true;
  };

  /** Posts one queued item; false when nothing was said. */
  const deliver = (room: Room, state: RoomState, item: Pending, now: number, wall: number): boolean => {
    if (item.kind === "system") return post(room, state, "system", item.text ?? "", wall);
    if (item.kind === "beat") {
      const text = item.text ?? "";
      const leaving = LEAVE[room.members.find((member) => member.id === item.member)?.voice ?? "young"].includes(text);
      if (item.member && state.gone.has(item.member) && !leaving) return false;
      // A beat already said a moment ago is skipped, not repeated.
      if (!leaving && state.recent.slice(-12).includes(text)) return false;
      return post(room, state, item.member ?? room.members[0].id, text, wall);
    }
    const people = present(room, state);
    if (!people.length) return false;
    const side = item.side ?? sideOf(lean);
    if (item.kind === "pile") {
      const agreeing = people.filter((member) => stance(member, side) === "with" && member.id !== state.lastSender);
      if (!agreeing.length) return false;
      return post(room, state, pick(agreeing).id, fresh(state, PILE[side][tierOf(heat[side])], room), wall);
    }
    if (item.kind === "reply") {
      const speaker = choose(people.map((member) => [member, stance(member, side) === "with" ? 1 : 0.25] as const)) ?? people[0];
      const pool = stance(speaker, side) === "with" ? REPLY[side] : REBUT[other(side)][speaker.voice];
      return post(room, state, speaker.id, fresh(state, pool, room), wall);
    }
    return political(room, state, side, now, wall);
  };

  return {
    /** `target` is the measured lean (−1 … +1); the director eases toward it. */
    step(target: number, now: number, wall: number) {
      const elapsed = lastStep ? Math.min(250, now - lastStep) : 100;
      lastStep = now;
      const seconds = elapsed / 1000;
      lean += (target - lean) * Math.min(1, seconds * 6);
      const amount = Math.min(1, Math.abs(lean));

      for (const side of SIDES) {
        const toward = Math.max(0, side === "left" ? -lean : lean);
        heat[side] = Math.max(0, Math.min(3, heat[side] + (toward > 0.15 ? RISE * toward : -FALL) * seconds));
      }
      while (sent.length && now - sent[0] > 1000) sent.shift();

      // Level: nothing is said and nothing waits to be said.
      if (amount < LEVEL) {
        tokens = 0;
        states.forEach((state) => {
          state.pending = state.pending.filter((item) => item.kind === "reply");
          state.thread = null;
        });
        store.readMine(elapsed, random);
        store.flush();
        return;
      }

      const rate = MAX_RATE * amount ** 1.5;
      tokens = Math.min(1.5, tokens + rate * seconds);
      const weight = (side: Side) => {
        const toward = Math.max(0, side === "left" ? -lean : lean);
        return toward * (1 + 0.5 * heat[side]) + 0.15 * heat[side];
      };
      const weights = { left: weight("left"), right: weight("right") };

      for (const room of ROOMS) {
        const state = states.get(room.id)!;
        // A swing to the other side cuts a running thread short.
        if (state.thread && weights[other(state.thread.side)] > weights[state.thread.side] * 1.6) {
          state.pending = state.pending.filter((item) => item.kind !== "beat");
          state.thread = null;
        }
        if (opened.has(room.id)) maybeReturn(room, state, now);
      }

      // Exactly one message per token: a queued line that is due goes first
      // (the open room first, the rest in turn); otherwise a new political
      // line is drawn now, from a room picked by how political it is.
      turn = (turn + 1) % ROOMS.length;
      const order = [...ROOMS.slice(turn), ...ROOMS.slice(0, turn)].sort((a, b) => Number(b.id === store.openId) - Number(a.id === store.openId));
      for (let guard = 0; tokens >= 1 && guard < 24; guard += 1) {
        let room: Room | null = null;
        for (const candidate of order) {
          const pending = states.get(candidate.id)!.pending;
          if (!pending.length) continue;
          pending.sort((a, b) => a.due - b.due);
          if (pending[0].due <= now) {
            room = candidate;
            break;
          }
        }
        if (!room) {
          room = choose(ROOMS.map((candidate) => [candidate, candidate.politics ** 1.5 * (store.openId === candidate.id ? 3 : 1)] as const));
          if (!room) break;
          const side = choose([["left", weights.left], ["right", weights.right]] as const) ?? sideOf(lean);
          states.get(room.id)!.pending.unshift({ due: now, kind: "political", side });
        }
        const state = states.get(room.id)!;
        if (deliver(room, state, state.pending.shift()!, now, wall)) {
          tokens -= 1;
          sent.push(now);
        }
      }
      store.readMine(elapsed, random);
      store.flush();
    },

    /** The participant typed: the room answers by the side the phone leans to. */
    reply(roomId: string, text: string, now: number, wall: number) {
      const room = ROOMS.find((candidate) => candidate.id === roomId);
      const state = states.get(roomId);
      if (!room || !state || !text.trim()) return;
      store.add({ roomId, sender: "me", text: text.trim(), at: wall, unread: room.kind === "dm" ? 1 : (room.size ?? room.members.length + 1) - 1 });
      // A level phone answers nothing; tilted, the reply waits for its turn
      // under the same rate.
      if (Math.abs(lean) >= 0.15) {
        schedule(state, { due: now + 800 + random() * 1200, kind: "reply", side: sideOf(lean) });
        if (room.kind === "group") schedule(state, { due: now + 1600 + random() * 1600, kind: "pile", side: sideOf(lean) });
      }
      store.flush();
    },

    heat: () => ({ ...heat }),
    lean: () => lean,
    /** What the readout shows. */
    stats: () => ({
      lean,
      heat: { ...heat },
      tier: { left: tierOf(heat.left), right: tierOf(heat.right) },
      perSecond: sent.length,
      rate: Math.abs(lean) < LEVEL ? 0 : MAX_RATE * Math.min(1, Math.abs(lean)) ** 1.5,
      opened: opened.size,
      rooms: ROOMS.length,
    }),
  };
}
