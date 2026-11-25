// simulation/2, one change at a time, without a screen (simulation/docs/2.md): bubble/9's loop as loop/frame-loop.ts
// orders it — the web, the display, the raft, the emitter, the school, its watching — with each place where
// simulation/2 leaves bubble/9 switched on after the one before, so it is seen which of them changes the picture.
//
//   node components/screen/simulation/2/study/ladder.ts               every step, 180 s each, no input
//   node components/screen/simulation/2/study/ladder.ts 0 4           only these steps
//   node components/screen/simulation/2/study/ladder.ts stroke 4      step 4 with strokes (see STROKES)
//
// Left out: the objects' reach past their discs, sound, drawing. A morph is taken to set after its duration. A face
// (rules/bubbles.ts) is counted as one of 240 kinds by its number, the same way at every step.

import { FISH_DEFAULTS, type FishParameters } from "../fish/model.ts";
import { LIFE_DEFAULTS } from "../fish/lifecycle.ts";
import { SchoolThread } from "../fish/school-thread.ts";
import { Raft } from "../raft/raft.ts";
import { BUBBLE_FLOATS, MAX_BUBBLES } from "../render/units.ts";
import { Bubbles } from "../rules/bubbles.ts";
import type { System } from "../rules/versions.ts";
import { stepDisplay } from "../simulation/display.ts";
import { Emitter } from "../simulation/emitter.ts";
import { DEFAULT_PARAMETERS } from "../web/model.ts";

const FIELD = { width: 1440, height: 810 };
const DELTA = 1 / 30;
/** bubble/9 as it opens on preset A1 (state/opening.ts, presets/families.ts). */
const FISH: FishParameters = { ...FISH_DEFAULTS, scale: 0.65, speed: 3, follow: 0.6, novelty: 1, habituation: 1.75, span: 0.5, schooling: 2, patrol: 1 };
const WEB = { ...DEFAULT_PARAMETERS, growth: 0.85, volatility: 1.5, floor: 0.2106029267357361, burstAt: 80 };
const VISUAL = { area: 1, portions: 0.5, flow: 1 };
const MORPH_SECONDS = 8;
const TURN_WATCH = 1;
/** Watching's feedback (simulation/attention.ts): 품질에 주는 영향 20, 영향 상한 9.1, a school of at least 30. */
const INFLUENCE = 20 * 0.25;
const CEILING = 9.1;
/** For trials: `BURST=40 RECOVERY=20 PER_FISH=0.5 TASTE=2 STROKE_QUALITY=3 OVERRIDE='{"tire":0}' node study/ladder.ts 4`. */
const GAIN = Number(process.env.GAIN ?? 1);
/** `EXTENT=1.5`: every object taken to reach this far past its disc (the browser hands the school each object's own reach). */
const EXTENT = process.env.EXTENT ? new Float32Array(1_000).fill(Number(process.env.EXTENT)) : null;
/** `STROKE_LENGTH=18`: bubbles a stroke lays (9 without it). */
const STROKE_HALF = Math.floor(Number(process.env.STROKE_LENGTH ?? 9) / 2);
const TASTE = process.env.TASTE === undefined ? null : Number(process.env.TASTE);

export type Step = { name: string; system: System };
const NINE: System = { drift: 0, arrivals: 0, adopt: 0, tire: 0, taste: 0, burstAt: Number(process.env.BURST ?? 50), recovery: Number(process.env.RECOVERY ?? 30), perFish: Number(process.env.PER_FISH ?? 1), strokeSize: 1, strokeQuality: Number(process.env.STROKE_QUALITY ?? 2) };
/** Each step is the one before it with one more change. */
export const LADDER: Step[] = [
  { name: "0 bubble/9", system: NINE },
  { name: "1 품질은 금붕어가 볼 때만", system: { ...NINE, drift: 1 } },
  { name: "2 금붕어의 취향과 기질에 질림", system: { ...NINE, drift: 1, taste: 1, tire: 1 } },
  { name: "3 이웃의 기질과 오브제로", system: { ...NINE, drift: 1, taste: 1, tire: 1, adopt: 1 } },
  { name: "4 새 버블은 획에서만", system: { ...NINE, drift: 1, taste: 1, tire: 1, adopt: 1, arrivals: 1 } },
];

type Second = Record<
  | "bubbles" | "widest" | "topTenth" | "specks" | "big" | "huge" | "cover" | "tenReplaced" | "swell" | "portions"
  | "kinds" | "kindsSeen" | "kindChanges" | "topKind" | "leaderChanged" | "held" | "dead" | "spent" | "crushed" | "shut" | "strokeFish" | "strokeArea",
  number
>;

function kindOfFace(face: number) {
  const hashed = Math.sin(face * 91.345 + 17.17) * 43_758.5453;
  return Math.floor((hashed - Math.floor(hashed)) * 240);
}

/** `strokes`: seconds at which nine bubbles of one new disposition and object are laid in a line. */
export function run(step: Step, seconds: number, strokes: readonly number[] = [], seed = 1, overrides: Partial<System> = {}) {
  const system = { ...step.system, ...overrides, ...(JSON.parse(process.env.OVERRIDE ?? "{}") as Partial<System>) };
  if (TASTE !== null && system.taste > 0) system.taste = TASTE;
  const raft = new Raft({ pages: 800, groups: 1, damping: 0.85 });
  raft.seed = seed === 1 ? raft.seed : seed * 2_654_435_761;
  raft.resize(FIELD);
  raft.rebuild(800);
  raft.own.drift = system.drift < 0.5;
  raft.own.arrivals = system.arrivals < 0.5;
  raft.own.burstAt = system.burstAt;
  raft.own.recovery = system.recovery;
  // bubble/9's own value while its dice are on.
  const PER_FISH = system.drift >= 0.5 ? system.perFish : 0;
  const world = raft.world;
  const emitter = new Emitter();
  const discs = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  const school = new SchoolThread(FIELD.width, FIELD.height, false);
  const lifeContext = { parameters: LIFE_DEFAULTS, colourOf: () => {} };
  const fish: FishParameters = { ...FISH, taste: system.taste, tireByDisposition: system.tire };
  const disposed = system.taste > 0 || system.tire >= 0.5;
  const bubbles = new Bubbles();
  const contact = new Float64Array(1_000);
  const watched = new Float32Array(1_000);
  const turns = new Uint32Array(1_000);
  const turnedAt = new Float64Array(1_000).fill(-100);
  const before = new Float64Array(1_000);
  const records: Second[] = [];
  let kindBefore: Int32Array | null = null;
  let leader = -1;
  let top: number[] = [];
  let strokeAt = 0;
  let known = world.state.size;
  let strokeKind = -1;
  let random = seed * 48_271;
  const next = () => {
    random = (Math.imul(random ^ (random >>> 15), 2_246_822_519) + 0x9e3779b9) >>> 0;
    return random / 4_294_967_296;
  };

  const frames = Math.round(seconds / DELTA);
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame * DELTA;
    raft.time = time;
    while (strokeAt < strokes.length && time >= strokes[strokeAt]!) {
      strokeAt += 1;
      const angle = next() * Math.PI * 2;
      const reach = Math.min(FIELD.width, FIELD.height) * 0.25 * Math.sqrt(next());
      const turn = next() * Math.PI * 2;
      bubbles.keep(world.state, world.state.size);
      const number = bubbles.begin(null);
      strokeKind = kindOfFace(bubbles.strokeFace(number));
      let last: number | null = null;
      for (let at = -STROKE_HALF; at <= STROKE_HALF; at += 1) {
        const page = raft.lay(FIELD.width / 2 + Math.cos(angle) * reach + Math.cos(turn) * 30 * at, FIELD.height / 2 + Math.sin(angle) * reach + Math.sin(turn) * 30 * at, last, system.strokeSize, system.strokeQuality);
        if (page === null) continue;
        bubbles.lay(page, number);
        last = page;
      }
    }
    raft.step(DELTA, WEB);
    bubbles.keep(world.state, world.state.size);
    stepDisplay(world, DELTA);
    raft.arrange(world.shown, DELTA, DELTA, false, VISUAL.area);
    const pageStart = emitter.emit(world, raft, discs, VISUAL, time, DELTA);
    const pageCount = emitter.count - pageStart;
    if (pageCount > world.state.size) throw new Error("pages out of step");
    if (world.state.size > known) school.notePages(known, world.state.size);
    known = world.state.size;
    school.setLife(LIFE_DEFAULTS);
    school.setCount(380);
    school.step(DELTA, world.state, world.shown, discs, emitter.count, pageStart, pageCount, fish, lifeContext, EXTENT, disposed ? bubbles.dispositions : null);
    school.drainContact(pageCount, contact);
    // 무리 크기 반영 (state/feedback.ts perFish): at 1 every fish counts as one of 30, whatever the school's size.
    const strength = (INFLUENCE * GAIN) / (Math.max(30, school.fish.length) ** (1 - PER_FISH) * 30 ** PER_FISH);
    for (let page = 0; page < pageCount; page += 1) {
      // A watched page moves on once its last morph has set (simulation/attention.ts turn).
      watched[page] = watched[page]! + contact[page]!;
      if (watched[page]! >= TURN_WATCH && time - turnedAt[page]! >= MORPH_SECONDS) {
        watched[page] = 0;
        turnedAt[page] = time;
        turns[page] = turns[page]! + 1;
        if (system.adopt >= 0.5) bubbles.adopt(page, raft.sender(page));
        else bubbles.moveOn(page, turns[page]!);
      }
      if (contact[page]! > 0) world.attend(page, contact[page]! * strength, CEILING);
    }

    if (frame % Math.round(1 / DELTA) !== 0) continue;
    const size = world.state.size;
    const order = Array.from({ length: size }, (_, page) => page).sort((a, b) => raft.radii[b]! - raft.radii[a]!);
    let area = 0;
    let tenth = 0;
    let specks = 0;
    let big = 0;
    let huge = 0;
    let swell = 0;
    let kindChanges = 0;
    const kindNow = new Int32Array(1_000).fill(-1);
    const areaOfKind = new Map<number, number>();
    for (let index = 0; index < size; index += 1) {
      const page = order[index]!;
      const r = raft.radii[page]!;
      area += r * r;
      if (index < Math.round(size / 10)) tenth += r * r;
      if (r <= 5.01) specks += 1;
      if (r >= 40) big += 1;
      if (r >= 80) huge += 1;
      if (before[page]! > 0) swell += Math.abs(r - before[page]!) / Math.max(1, r) / size;
      before[page] = r;
      const kind = kindOfFace(bubbles.faceOf(page));
      kindNow[page] = kind;
      areaOfKind.set(kind, (areaOfKind.get(kind) ?? 0) + r * r);
      if (kindBefore && kindBefore[page]! >= 0 && kindBefore[page] !== kind) kindChanges += 1;
    }
    kindBefore = kindNow;
    let kindsSeen = 0;
    let topKind = 0;
    let leading = -1;
    for (const [kind, share] of areaOfKind) {
      if (share > area * 0.01) kindsSeen += 1;
      if (share > topKind) {
        topKind = share;
        leading = kind;
      }
    }
    const leaderChanged = leader >= 0 && leading !== leader ? 1 : 0;
    leader = leading;
    const ten = order.slice(0, 10);
    const replaced = top.length ? ten.filter((page) => !top.includes(page)).length : 0;
    top = ten;
    let alive = 0;
    let held = 0;
    let onStroke = 0;
    for (const one of school.fish) {
      if (one.life.dying) continue;
      alive += 1;
      if (one.target < 0) continue;
      held += 1;
      if (strokeKind >= 0 && one.target < size && kindNow[one.target] === strokeKind) onStroke += 1;
    }
    records.push({
      bubbles: size,
      widest: raft.radii[order[0]!]! / Math.max(1, raft.radii[order[Math.floor(size / 2)]!]!),
      topTenth: tenth / Math.max(1, area),
      specks,
      big,
      huge,
      cover: (Math.PI * area) / (FIELD.width * FIELD.height),
      tenReplaced: replaced,
      swell,
      portions: pageStart,
      kinds: areaOfKind.size,
      kindsSeen,
      kindChanges,
      topKind: topKind / Math.max(1, area),
      leaderChanged,
      held,
      dead: school.deaths.spent + school.deaths.crushed + school.deaths.shut,
      spent: school.deaths.spent,
      crushed: school.deaths.crushed,
      shut: school.deaths.shut,
      strokeFish: onStroke / Math.max(1, alive),
      strokeArea: strokeKind >= 0 ? (areaOfKind.get(strokeKind) ?? 0) / Math.max(1, area) : 0,
    });
  }
  return records;
}

export function mean(records: readonly Second[], from: number, to: number) {
  const part = records.slice(from, to);
  const out = {} as Second;
  for (const key of Object.keys(part[0] ?? {}) as (keyof Second)[]) out[key] = Math.round((part.reduce((sum, one) => sum + one[key], 0) / Math.max(1, part.length)) * 1_000) / 1_000;
  return out;
}

const KEYS = ["widest", "topTenth", "big", "huge", "specks", "tenReplaced", "swell", "portions", "kinds", "kindsSeen", "kindChanges", "topKind", "leaderChanged", "held"] as const;
function line(label: string, one: Second, keys: readonly (keyof Second)[] = KEYS) {
  return `${label.padEnd(12)} ${keys.map((key) => `${key} ${one[key]}`).join("  ")}`;
}

if (process.argv[1]?.endsWith("study/ladder.ts")) {
  const stroke = process.argv[2] === "stroke";
  if (process.argv[2] === "long") {
    // `long 4 600`: one step for that long without input, a line a minute.
    const step = LADDER[Number(process.argv[3] ?? 4)]!;
    const seconds = Number(process.argv[4] ?? 600);
    const records = run(step, seconds);
    console.log(step.name);
    for (let from = 0; from < seconds; from += 60) console.log(line(`  ${from}-${from + 60}s`, mean(records, from, from + 60)));
    process.exit(0);
  }
  if (process.argv[2] === "answer") {
    // `AT=60 node study/ladder.ts answer`: one stroke at AT under the last step, in one line — how far its object
    // went (its largest share of the area, and when), what it holds 30 and 60 s on, and the goldfish crushed in the
    // 6 s after it against the 6 s before.
    const at = Number(process.env.AT ?? 60);
    const records = run(LADDER[LADDER.length - 1]!, at + 62, [at], Number(process.env.SEED ?? 1));
    let peak = 0;
    let when = 0;
    let fish = 0;
    for (let second = at; second < at + 60; second += 1) {
      const one = records[second]!;
      fish = Math.max(fish, one.strokeFish);
      if (one.strokeArea <= peak) continue;
      peak = one.strokeArea;
      when = second - at;
    }
    const crushed = (from: number, to: number) => records[to]!.crushed - records[from]!.crushed;
    console.log(`at ${at}  peak ${(peak * 100).toFixed(1)}% after ${when}s  +30s ${(records[at + 30]!.strokeArea * 100).toFixed(1)}%  +60s ${(records[at + 60]!.strokeArea * 100).toFixed(1)}%  fish at most ${(fish * 100).toFixed(0)}%  crushed 6s before ${crushed(at - 7, at - 1)} after ${crushed(at - 1, at + 5)}`);
    process.exit(0);
  }
  const asked = process.argv.slice(stroke ? 3 : 2).map(Number);
  LADDER.forEach((step, index) => {
    if (asked.length && !asked.includes(index)) return;
    console.log(step.name);
    if (stroke) {
      // One stroke at 60 s: what its disposition holds of the fish and of the area, in ten-second steps after.
      const records = run(step, 150, [Number(process.env.AT ?? 60)], Number(process.env.SEED ?? 1));
      for (let from = 50; from < 150; from += 10) console.log(line(`  ${from}-${from + 10}s`, mean(records, from, from + 10), ["bubbles", "strokeFish", "strokeArea", "kinds", "kindsSeen", "topKind", "tenReplaced", "widest", "dead"]));
      return;
    }
    const records = run(step, 180);
    console.log(line("  40-110s", mean(records, 40, 110)));
    console.log(line("  110-180s", mean(records, 110, 180)));
    const end = records[records.length - 1]!;
    const start = records[59]!;
    console.log(`  deaths a minute, 60-180s: spent ${(end.spent - start.spent) / 2}  crushed ${(end.crushed - start.crushed) / 2}  shut ${(end.shut - start.shut) / 2}`);
  });
}
