import { LAUGHS, LINES, RECORDED, rateOf, stageOf, type Line, type Part } from "./script";

export type Praise = {
  /** Call from a gesture: browsers only start audio from one. */
  resume(): void;
  /** One more operation was billed, on `part`, bringing the bill to `operations`. */
  say(operations: number, part: Part): void;
  /** Cuts off whatever is being said. */
  stop(): void;
  dispose(): void;
};

// Declares playback so iOS Safari (16.4+) does not mute Web Audio with the
// ringer switch.
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

// Touch grants audio permission at the end of a gesture, not at its start.
const unlockEvents = ["pointerup", "touchend", "click", "keydown"] as const;

const FOLDER = "/audio/plastic-dream/";
/** A laugh follows every this many lines. */
const LAUGH_EVERY = 3;

/**
 * Recorded voices praising each operation: one line at a time, never over
 * another, with at most one waiting; a line about the part just operated on
 * when there is one, and none repeated until its stage has been through all
 * of them. The recordings are played slower and lower as the bill grows.
 */
export function createPraise(): Praise {
  const lines = LINES.filter((line) => RECORDED.includes(line.id));
  const buffers = new Map<string, Promise<AudioBuffer | null>>();
  const said = new Set<string>();
  let context: AudioContext | null = null;
  let current: AudioBufferSourceNode | null = null;
  let waiting: { operations: number; part: Part } | null = null;
  let speaking = false;
  let count = 0;
  let laugh = 0;
  let turn = 0;
  let disposed = false;

  const load = (id: string) => {
    let buffer = buffers.get(id);
    if (!buffer && context) {
      const audio = context;
      buffer = fetch(`${FOLDER}${id}.mp3`)
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(id))))
        .then((data) => audio.decodeAudioData(data))
        .catch(() => null);
      buffers.set(id, buffer);
    }
    return buffer ?? Promise.resolve(null);
  };

  const resume = () => {
    if (disposed || lines.length === 0) return;
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session && session.type !== "playback") {
      try {
        session.type = "playback";
      } catch {}
    }
    if (!context) {
      context = new AudioContext();
      // Older iOS needs a buffer started inside the gesture before it will sound.
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate);
      source.connect(context.destination);
      source.start(0);
      // The first things to be said are fetched before they are needed.
      for (const line of lines) if (line.stage === 0) void load(line.id);
      for (const id of LAUGHS) void load(id);
    }
    if (context.state !== "running") void context.resume();
  };

  const pick = (operations: number, part: Part): Line | null => {
    // The nearest stage at or below this one that has recordings.
    let pool: Line[] = [];
    for (let stage = stageOf(operations); stage >= 0 && pool.length === 0; stage -= 1) {
      pool = lines.filter((line) => line.stage === stage);
    }
    if (pool.length === 0) return null;
    let fresh = pool.filter((line) => !said.has(line.id));
    if (fresh.length === 0) {
      for (const line of pool) said.delete(line.id);
      fresh = pool;
    }
    const own = fresh.filter((line) => line.part === part);
    const general = fresh.filter((line) => line.part === "any");
    const from = own.length > 0 ? own : general.length > 0 ? general : fresh;
    return from[Math.floor(Math.random() * from.length)];
  };

  const play = async (id: string, rate: number, own: number) => {
    const buffer = await load(id);
    if (!buffer || !context || own !== turn) return;
    await new Promise<void>((resolve) => {
      const source = context!.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      source.connect(context!.destination);
      source.onended = () => resolve();
      current = source;
      source.start();
    });
  };

  const speak = async (operations: number, part: Part) => {
    const chosen = pick(operations, part);
    if (!chosen || !context || context.state !== "running") return;
    speaking = true;
    const own = turn;
    const rate = rateOf(operations);
    said.add(chosen.id);
    // What may be said next is fetched while this is said.
    for (const line of lines) if (line.stage === stageOf(operations) + 1) void load(line.id);
    await play(chosen.id, rate, own);
    count += 1;
    if (own === turn && LAUGHS.length > 0 && count % LAUGH_EVERY === 0) {
      await play(LAUGHS[laugh % LAUGHS.length], rate, own);
      laugh += 1;
    }
    if (own !== turn) return;
    speaking = false;
    current = null;
    const next = waiting;
    waiting = null;
    if (next) void speak(next.operations, next.part);
  };

  for (const type of unlockEvents) window.addEventListener(type, resume, { capture: true, passive: true });

  const stop = () => {
    turn += 1;
    waiting = null;
    speaking = false;
    try {
      current?.stop();
    } catch {}
    current = null;
  };

  return {
    resume,
    say(operations, part) {
      if (disposed || lines.length === 0) return;
      if (speaking) waiting = { operations, part };
      else void speak(operations, part);
    },
    stop,
    dispose() {
      disposed = true;
      stop();
      for (const type of unlockEvents) window.removeEventListener(type, resume, { capture: true });
      void context?.close();
      context = null;
    },
  };
}
