import type { ChatStore } from "./chat";
import { ROOMS } from "./rooms";
import { capOf, fits, playsThreads, voiceIn } from "./scenes";
import { HUSH, LEAVE, NOD, PEACE, PILE, REBUT, REPLY, RETORT, SAY, THREADS } from "./script";
import { SIDES, TOP_TIER, other, type Member, type Room, type Side, type Thread } from "./types";

// The mobile's roll is the only input. `lean` runs −1 (left) … +1 (right).
//
// Speed follows the tilt and nothing else. Two token buckets hold every
// delivery (lines, pile-ons, beats of a thread, departures):
// - the list: MAX_RATE · |lean|^1.3 messages per second across all rooms
//   (30/s at full tilt, about 12/s at half, 5/s at a quarter; 2.5 times /1's,
//   raised when the angles were widened 2.5 times so the pace per angle holds);
// - the room on screen: ROOM_RATE · |lean|^0.7 more, its own, so an open room
//   keeps talking however many rooms share the list (half that in a 1:1).
// Talk also gathers. A third bucket, GATHER_RATE · |lean|^1.3 more, goes
// only to rooms that are already talking, the busier the likelier, so rooms
// keep piling up messages and unread counts while the list's own bucket
// keeps opening new rooms at its usual pace.
// A level mobile sends nothing: the queue is dropped and no room moves. There
// is no small talk; the tab starts empty and a room appears with its first
// political message.
//
// Only the side the mobile leans to speaks. A swing to the other side drops
// everything the first side had queued, and a supporters' open chat says
// nothing at all under the other side's tilt: it never changes sides.
//
// The angle sets the extremity, at once. reach = |lean| · REACH + hold, and
// the tier is its whole part, up to 3: 온건 below a quarter tilt, 강경 from
// there, 극단 from about half, 극좌·극우 from about 0.7. `hold` is what a long
// lean adds: it rises at 0.1/s · |lean| up to |lean| itself, so holding an
// angle can lift the talk one step and never two, and it falls at 0.5/s once
// the mobile eases back. Coming back toward level brings the tier down with
// the angle; a step down waits for the reach to clear the boundary by STICK,
// so a hand trembling on a boundary does not flip the room. A room's own
// scene caps the tier and filters the lines (scenes.ts). Only a room's very
// first political line is one tier lower than the angle asks.
//
// A political message is either the next beat of a scripted thread or one
// line. Someone on the favoured side speaks first; only then may the other
// side push back (at 온건), mutter (강경) or leave (극단), and the people with
// no side ask for quiet, then leave too. At 극좌·극우 they leave or are kicked
// faster still, some without a word, and agreement piles up twice as thick. A room where nobody leans the
// favoured way stays silent, and so does a 1:1 with someone who does not.

const MAX_RATE = 30;
const ROOM_RATE = 4;
const LEVEL = 0.03;
/** Tiers per unit of lean: full tilt reaches 4.2, past the fourth tier's 3. */
const REACH = 4.2;
/** What holding a lean adds to the reach: up to HOLD_MAX · |lean|. */
const HOLD_MAX = 1;
const HOLD_RISE = 0.1;
const HOLD_FALL = 0.5;
/** How far the reach must drop under a tier's floor before the tier steps down. */
const STICK = 0.12;
/** Replies one claim can draw before someone on the favoured side speaks again. */
const ANSWERS = 2;
/** Extra messages per second at full tilt for rooms already talking. */
const GATHER_RATE = 30;
/** A talking room draws them by 1 + (messages so far, up to BUSY) / 4. */
const BUSY = 80;

type Kind = "political" | "beat" | "pile" | "reply" | "system";
type Pending = { due: number; kind: Kind; side?: Side; member?: string; text?: string };
type RoomState = {
  pending: Pending[];
  recent: string[];
  lastSender: string;
  /** Members who left (or were kicked) and when. */
  gone: Map<string, number>;
  /** A thread being played: aborted if the mobile swings to the other side. */
  thread: { side: Side; until: number } | null;
  /** Replies the last claim may still draw from the other side and the uninvolved. */
  answers: number;
  /** Political lines said so far, by side: a room's first is one tier lower. */
  said: Record<Side, number>;
  /** Everything posted here so far. */
  count: number;
};

export type Director = ReturnType<typeof createDirector>;

const sideOf = (lean: number): Side => (lean < 0 ? "left" : "right");

export function createDirector(store: ChatStore, random: () => number = Math.random) {
  const states = new Map<string, RoomState>(ROOMS.map((room) => [room.id, { pending: [], recent: [], lastSender: "", gone: new Map(), thread: null, answers: 0, said: { left: 0, right: 0 }, count: 0 }]));
  const hold: Record<Side, number> = { left: 0, right: 0 };
  /** The tier each side talks at now (0 온건 … 3 극좌·극우). */
  const level: Record<Side, number> = { left: 0, right: 0 };
  let lean = 0;
  let lastStep = 0;
  let turn = 0;
  let tokens = 0;
  let roomTokens = 0;
  let gatherTokens = 0;
  let current: Side | null = null;
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
  /** How far the mobile leans toward a side (0–1). */
  const toward = (side: Side) => Math.min(1, Math.max(0, side === "left" ? -lean : lean));
  const reach = (side: Side) => toward(side) * REACH + hold[side];
  /** The tier this room talks at: what the angle asks, held to what the room allows; its first line one lower. */
  const tierIn = (room: Room, side: Side) => {
    const said = states.get(room.id)!.said[side];
    return Math.min(capOf(room), Math.max(0, level[side] - (said === 0 ? 1 : 0)));
  };
  /**
   * A supporters' open chat belongs to one side: everyone but at most one
   * outsider leans hard the same way. It stays, and it kicks the rest. Mixed
   * open chats (a 토론방, a 부동산 방) have no home.
   */
  const homeOf = (room: Room): Side | null => {
    if (!room.open) return null;
    for (const side of SIDES) {
      const core = room.members.filter((member) => Math.abs(member.lean) === 2 && sideOf(member.lean) === side).length;
      if (core >= room.members.length - 1) return side;
    }
    return null;
  };
  /**
   * Someone here leans the favoured way, so the room has something to say.
   * A supporters' open chat is silent under the other side's tilt.
   */
  const speaks = (room: Room, state: RoomState, side: Side) => {
    const home = homeOf(room);
    return (home === null || home === side) && present(room, state).some((member) => stance(member, side) === "with");
  };

  /** A line from the pool that belongs in this room and was not just said; null when none fits. */
  const fresh = (state: RoomState, pool: readonly string[], room: Room, speaker?: Member) => {
    const usable = pool.filter((line) => fits(line, room, speaker));
    if (!usable.length) return null;
    let text = pick(usable);
    for (let attempt = 0; attempt < 6 && state.recent.includes(text); attempt += 1) text = pick(usable);
    return text;
  };

  const post = (room: Room, state: RoomState, sender: string, text: string, wall: number): true => {
    state.recent.push(text);
    if (state.recent.length > 40) state.recent.shift();
    if (sender !== "system") state.lastSender = sender;
    opened.add(room.id);
    state.count += 1;
    store.add({ roomId: room.id, sender, text, at: wall, unread: 0 });
    return true;
  };

  const schedule = (state: RoomState, item: Pending) => {
    if (state.pending.length < 12) state.pending.push(item);
  };

  const leave = (room: Room, state: RoomState, member: Member, now: number) => {
    state.gone.set(member.id, now);
    const kicked = Boolean(room.open);
    schedule(state, { due: now + 300 + random() * 600, kind: "system", text: kicked ? `${member.name}님을 내보냈습니다.` : `${member.name}님이 나갔습니다.` });
  };

  /** A member who left comes back once the room has cooled toward their side. */
  const maybeReturn = (room: Room, state: RoomState, now: number) => {
    for (const [id, at] of state.gone) {
      const member = room.members.find((candidate) => candidate.id === id);
      if (!member || now - at < 12_000) continue;
      // Back when the tilt turns their way; people with no side once the
      // mobile has eased back to 온건.
      const theirs = member.lean === 0 ? null : sideOf(member.lean);
      const welcoming = theirs ? toward(theirs) > 0.15 : level[sideOf(lean)] === 0 && now - at > 20_000;
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

  /** Binds a thread's roles to present members and queues every beat that fits the room. */
  const startThread = (room: Room, state: RoomState, side: Side, thread: Thread, now: number) => {
    const people = present(room, state);
    const withSide = people.filter((member) => stance(member, side) === "with").sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean) + (random() - 0.5));
    const against = people.filter((member) => stance(member, side) === "against");
    const none = people.filter((member) => member.lean === 0);
    // Two people carry a thread; one alone would be answering themselves.
    // And the threads are written in 반말: not for people who keep to 존댓말 here.
    if (withSide.length < 2 || voiceIn(room, withSide[0]) === "office" || voiceIn(room, withSide[1]) === "office") return false;
    const roles = { A: withSide[0], B: withSide[1], O: against.length ? pick(against) : undefined, N: none.length ? pick(none) : undefined };
    const beats = thread.flatMap(([role, text]) => {
      const speaker = roles[role];
      return speaker && fits(text, room, speaker) ? [{ speaker, text: fillNames(text, roles) }] : [];
    });
    // A thread the room would cut to a stub, or that does not open on its own claim, is not played.
    if (beats.length < 3 || thread[0][1] !== beats[0].text) return false;
    let due = now + 150 + random() * 350;
    for (const beat of beats) {
      schedule(state, { due, kind: "beat", side, member: beat.speaker.id, text: beat.text });
      due += 350 + random() * 650 + Math.min(1200, beat.text.length * 12);
    }
    state.thread = { side, until: due };
    state.said[side] += beats.length;
    return true;
  };

  /** One political turn; false when it only queued a thread or found no speaker. */
  const political = (room: Room, state: RoomState, side: Side, now: number, wall: number): boolean => {
    const tier = tierIn(room, side);
    const top = tier === TOP_TIER;
    const people = present(room, state);
    const home = homeOf(room);
    // Threads carry the narrative; most messages outside them are single lines.
    if (playsThreads(room) && (!state.thread || state.thread.until < now) && random() < 0.4) {
      const pool = THREADS[side][tier];
      if (pool.length && startThread(room, state, side, pick(pool), now)) return false;
    }
    const answering = state.answers > 0;
    const speaker = choose(people.map((member) => {
      const position = stance(member, side);
      // Nobody answers a claim that has not been made.
      if (position !== "with" && !answering) return [member, 0] as const;
      const weight = position === "with" ? 0.6 + Math.abs(member.lean) * 0.5
          : position === "against" ? [0.7, 0.35, 0.15, 0.1][tier] * Math.abs(member.lean)
            : [0.45, 0.25, 0.12, 0.08][tier];
      return [member, member.id === state.lastSender && room.kind === "group" ? weight * 0.3 : weight] as const;
    }));
    if (!speaker) return false;
    const position = stance(speaker, side);
    const voice = voiceIn(room, speaker);
    let text: string | null;
    if (position === "with") {
      // A voice with nothing to say this far out says what it would one tier down.
      text = null;
      for (let step = tier; step >= 0 && !text; step -= 1) text = fresh(state, SAY[side][voice][step], room, speaker);
    }
    else if (position === "against") text = fresh(state, REBUT[other(side)][voice], room, speaker);
    else text = fresh(state, [...PEACE[voice], ...(HUSH[room.scene] ?? [])], room, speaker);
    if (!text) return false;
    post(room, state, speaker.id, text, wall);
    state.said[side] += 1;
    if (position === "with") state.answers = ANSWERS;
    else state.answers -= 1;
    // A plea for quiet sometimes gets the favoured side's stock answer.
    if (position === "none" && room.kind === "group" && tier >= 1 && random() < 0.2) {
      const back = people.find((member) => stance(member, side) === "with" && voiceIn(room, member) !== "elder");
      if (back) schedule(state, { due: now + 500 + random() * 700, kind: "beat", member: back.id, text: RETORT });
    }
    // At 극단 the people who disagree, or want none of it, walk out; an open
    // chat kicks whoever is not its own side. At 극좌·극우 half of them go the
    // moment they speak.
    const unwelcome = (member: Member) => (home === null ? stance(member, side) !== "with" : member.lean !== 0 && sideOf(member.lean) !== home);
    const walks = unwelcome(speaker);
    if (walks && room.kind === "group" && tier >= 1 && random() < (top ? 0.5 : tier === 2 ? 0.28 : 0.06)) {
      const parting = random() < 0.5 ? fresh(state, LEAVE[voice], room, speaker) : null;
      if (parting) schedule(state, { due: now + 400 + random() * 500, kind: "beat", member: speaker.id, text: parting });
      leave(room, state, speaker, now + 800);
    }
    if (position === "with" && room.kind === "group" && random() < 0.25 + 0.15 * tier) {
      schedule(state, { due: now + 250 + random() * 900, kind: "pile", side });
      // 극좌·극우: the agreement comes in twos.
      if (top && random() < 0.6) schedule(state, { due: now + 700 + random() * 1100, kind: "pile", side });
    }
    // 극좌·극우: someone who has not said a word is pushed out too.
    if (position === "with" && room.kind === "group" && top && random() < 0.1) {
      const quiet = people.filter((member) => member.id !== speaker.id && unwelcome(member));
      if (quiet.length) leave(room, state, pick(quiet), now + 500);
    }
    return true;
  };

  /** Posts one queued item; false when nothing was said. */
  const deliver = (room: Room, state: RoomState, item: Pending, now: number, wall: number): boolean => {
    if (item.kind === "system") return post(room, state, "system", item.text ?? "", wall);
    if (item.kind === "beat") {
      const text = item.text ?? "";
      const speaker = room.members.find((member) => member.id === item.member);
      const leaving = LEAVE[speaker ? voiceIn(room, speaker) : "young"].includes(text);
      if (item.member && state.gone.has(item.member) && !leaving) return false;
      // A beat already said a moment ago is skipped, not repeated.
      if (!leaving && state.recent.slice(-12).includes(text)) return false;
      return post(room, state, item.member ?? room.members[0].id, text, wall);
    }
    const people = present(room, state);
    if (!people.length) return false;
    // A reply follows the tilt as it is now, not as it was when the participant typed.
    const side = item.kind === "reply" ? sideOf(lean) : item.side ?? sideOf(lean);
    const home = homeOf(room);
    if (home !== null && home !== side) return false;
    if (item.kind === "pile") {
      const agreeing = people.filter((member) => stance(member, side) === "with" && member.id !== state.lastSender);
      if (!agreeing.length) return false;
      const speaker = pick(agreeing);
      const voice = voiceIn(room, speaker);
      // 존댓말 rooms nod politely; elders add their own to what fits them.
      const text = fresh(state, voice === "office" ? NOD.office : [...PILE[side][tierIn(room, side)], ...(voice === "elder" ? NOD.elder : [])], room, speaker);
      return text ? post(room, state, speaker.id, text, wall) : false;
    }
    if (item.kind === "reply") {
      const speaker = choose(people.map((member) => [member, stance(member, side) === "with" ? 1 : 0.25] as const)) ?? people[0];
      const pool = stance(speaker, side) === "with" ? REPLY[side] : REBUT[other(side)][voiceIn(room, speaker)];
      const text = fresh(state, pool, room, speaker) ?? fresh(state, PILE[side][0], room, speaker);
      return text ? post(room, state, speaker.id, text, wall) : false;
    }
    return political(room, state, side, now, wall);
  };

  /** How much a room draws the next line: talk gathers where it already is. */
  const gather = (state: RoomState) => (state.count === 0 ? 0 : 1 + Math.min(state.count, BUSY) / 4);

  /** The next thing a room says: what it has queued and due, else a new political turn. */
  const speak = (room: Room, side: Side, now: number, wall: number) => {
    const state = states.get(room.id)!;
    state.pending.sort((a, b) => a.due - b.due);
    const item = state.pending[0]?.due <= now ? state.pending.shift()! : speaks(room, state, side) ? { due: now, kind: "political" as const, side } : null;
    return item ? deliver(room, state, item, now, wall) : false;
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
        const pull = toward(side);
        const ceiling = pull * HOLD_MAX;
        hold[side] = hold[side] < ceiling ? Math.min(ceiling, hold[side] + HOLD_RISE * pull * seconds) : Math.max(ceiling, hold[side] - HOLD_FALL * seconds);
        // Up at once; down only when the reach has cleared the boundary.
        const asked = reach(side);
        if (asked >= level[side] + 1) level[side] = Math.min(TOP_TIER, Math.floor(asked));
        else if (asked < level[side] - STICK) {
          level[side] = Math.max(0, Math.floor(asked + STICK));
          // What was queued further out is not said once the mobile has come back.
          states.forEach((state) => {
            state.pending = state.pending.filter((item) => item.kind !== "beat");
            state.thread = null;
          });
        }
      }
      while (sent.length && now - sent[0] > 1000) sent.shift();

      // Level: nothing is said and nothing waits to be said.
      if (amount < LEVEL) {
        tokens = 0;
        roomTokens = 0;
        gatherTokens = 0;
        states.forEach((state) => {
          state.pending = state.pending.filter((item) => item.kind === "reply");
          state.thread = null;
        });
        store.readMine(elapsed, random);
        store.flush();
        return;
      }

      tokens = Math.min(5, tokens + MAX_RATE * amount ** 1.3 * seconds);
      // Only the side the mobile leans to speaks. On a swing, whatever the
      // other side still had to say is dropped, mid-thread included.
      const side = sideOf(lean);
      const swung = current !== null && current !== side;
      current = side;
      for (const room of ROOMS) {
        const state = states.get(room.id)!;
        if (swung) {
          state.pending = state.pending.filter((item) => item.kind === "system" || item.kind === "reply");
          state.thread = null;
          state.answers = 0;
        }
        if (opened.has(room.id)) maybeReturn(room, state, now);
      }

      // The room on screen talks at its own rate, on top of the list's.
      const onScreen = ROOMS.find((room) => room.id === store.openId);
      if (onScreen) {
        roomTokens = Math.min(1.5, roomTokens + ROOM_RATE * amount ** 0.7 * (onScreen.kind === "dm" ? 0.5 : 1) * seconds);
        for (let guard = 0; roomTokens >= 1 && guard < 6; guard += 1) {
          if (speak(onScreen, side, now, wall)) {
            roomTokens -= 1;
            sent.push(now);
          }
        }
      } else roomTokens = 0;

      turn = (turn + 1) % ROOMS.length;
      const order = [...ROOMS.slice(turn), ...ROOMS.slice(0, turn)];
      // The rooms already talking get a bucket of their own, so their messages
      // pile up. It takes what is queued and due first, which leaves the
      // list's bucket below free to keep opening rooms.
      gatherTokens = Math.min(5, gatherTokens + GATHER_RATE * amount ** 1.3 * seconds);
      for (let guard = 0; gatherTokens >= 1 && guard < 36; guard += 1) {
        const due = order.find((candidate) => states.get(candidate.id)!.pending.some((item) => item.due <= now));
        const room = due ?? choose(ROOMS.map((candidate) => {
          const state = states.get(candidate.id)!;
          return [candidate, speaks(candidate, state, side) ? candidate.politics ** 1.5 * gather(state) : 0] as const;
        }));
        if (!room) break;
        if (speak(room, side, now, wall)) {
          gatherTokens -= 1;
          sent.push(now);
        }
      }

      // The list: exactly one message per token. A queued line that is due
      // goes first, the rooms taking turns; otherwise a new political line is
      // drawn now, from a room picked by how political it is.
      for (let guard = 0; tokens >= 1 && guard < 36; guard += 1) {
        const due = order.find((candidate) => states.get(candidate.id)!.pending.some((item) => item.due <= now));
        const room = due ?? choose(ROOMS.map((candidate) => [candidate, speaks(candidate, states.get(candidate.id)!, side) ? candidate.politics ** 1.5 : 0] as const));
        if (!room) break;
        if (speak(room, side, now, wall)) {
          tokens -= 1;
          sent.push(now);
        }
      }

      store.readMine(elapsed, random);
      store.flush();
    },

    /** The participant typed: the room answers by the side the mobile leans to. */
    reply(roomId: string, text: string, now: number, wall: number) {
      const room = ROOMS.find((candidate) => candidate.id === roomId);
      const state = states.get(roomId);
      if (!room || !state || !text.trim()) return;
      store.add({ roomId, sender: "me", text: text.trim(), at: wall, unread: room.kind === "dm" ? 1 : (room.size ?? room.members.length + 1) - 1 });
      // A level mobile answers nothing; tilted, the reply waits for its turn
      // under the same rate.
      if (Math.abs(lean) >= 0.15) {
        schedule(state, { due: now + 500 + random() * 800, kind: "reply", side: sideOf(lean) });
        if (room.kind === "group") schedule(state, { due: now + 1100 + random() * 1000, kind: "pile", side: sideOf(lean) });
      }
      store.flush();
    },

    lean: () => lean,
    /** What the readout shows. */
    stats: () => ({
      lean,
      reach: { left: reach("left"), right: reach("right") },
      tier: { ...level },
      perSecond: sent.length,
      opened: opened.size,
      rooms: ROOMS.length,
    }),
  };
}
