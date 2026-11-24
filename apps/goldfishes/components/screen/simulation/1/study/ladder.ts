// The agent model, one change at a time, without a screen (simulation/docs/agent-model-proposal.md): bubble/9's loop
// as loop/frame-loop.ts orders it — the web, the display, the raft, the emitter, the school, its watching — with the
// places where a decision is made local switched on one after another, so it is seen which of them stills the raft.
//
//   node components/screen/simulation/1/study/ladder.ts            the whole ladder, about three minutes
//   node components/screen/simulation/1/study/ladder.ts 0 8        only these steps
//
// Left out: the objects' reach past their discs, sound, drawing. A morph is taken to set after its duration.

import { FISH_DEFAULTS, type FishParameters } from "../fish/model.ts";
import { LIFE_DEFAULTS } from "../fish/lifecycle.ts";
import { SchoolThread } from "../fish/school-thread.ts";
import { RULES } from "../model/agents.ts";
import { Raft } from "../raft/raft.ts";
import { BUBBLE_FLOATS, MAX_BUBBLES } from "../render/units.ts";
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

export type Step = { name: string; nearSpread?: boolean; contacts: boolean; visible: boolean; noSpread: boolean; noDrift: boolean; noArrivals: boolean; near: number; adopt: boolean };
const OFF = { contacts: false, visible: false, noSpread: false, noDrift: false, noArrivals: false, near: 0, adopt: false };
/** Each step is the one before it with one more change. */
export const LADDER: Step[] = [
  { ...OFF, name: "0 bubble/9" },
  { ...OFF, name: "1-2 맞닿은 버블에게만", contacts: true },
  { ...OFF, name: "3 지금 보이는 크기로", contacts: true, visible: true },
  { ...OFF, name: "4 고르게 뿌리지 않음", contacts: true, visible: true, noSpread: true },
  { ...OFF, name: "5 품질이 혼자 안 움직임", contacts: true, visible: true, noSpread: true, noDrift: true },
  { ...OFF, name: "6 새 버블은 획에서만", contacts: true, visible: true, noSpread: true, noDrift: true, noArrivals: true },
  { ...OFF, name: "7 금붕어는 근처만", contacts: true, visible: true, noSpread: true, noDrift: true, noArrivals: true, near: 0.3 },
  { ...OFF, name: "8 보내온 이웃의 오브제로", contacts: true, visible: true, noSpread: true, noDrift: true, noArrivals: true, near: 0.3, adopt: true },
  // Not in the proposal: row 4 made local instead of removed (that share goes evenly to the bubbles it touches).
  { ...OFF, name: "9 뿌리던 몫은 맞닿은 버블에게", contacts: true, visible: true, noSpread: true, noDrift: true, noArrivals: true, near: 0.3, adopt: true, nearSpread: true },
];

type Second = Record<"top" | "widest" | "topTenth" | "specks" | "tenReplaced" | "underWay" | "portions" | "changes" | "kinds" | "fishSpread" | "inside" | "strokeShare", number>;

/** `strokes`: seconds at which nine bubbles of a new object are laid in a line. */
export function run(step: Step, seconds: number, strokes: readonly number[] = [], seed = 1) {
  const agentsOn = step.name !== LADDER[0]!.name;
  const raft = new Raft({ pages: 800, groups: 1, damping: 0.85, rules: agentsOn, transport: true });
  Object.assign(raft.local, { contacts: step.contacts, visible: step.visible, noSpread: step.noSpread, noDrift: step.noDrift, noArrivals: step.noArrivals, nearSpread: step.nearSpread === true });
  raft.seed = seed === 1 ? raft.seed : seed * 2_654_435_761;
  raft.resize(FIELD);
  raft.rebuild(800);
  const agents = raft.agents;
  const world = raft.pagerank;
  const emitter = new Emitter();
  const bubbles = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  const school = new SchoolThread(FIELD.width, FIELD.height, false);
  const lifeContext = { parameters: LIFE_DEFAULTS, colourOf: () => {} };
  const fish = { ...FISH, near: step.near };
  const parameters = { web: WEB, rule: RULES["에이전트"] };
  const contact = new Float64Array(1_000);
  const watched = new Float32Array(1_000);
  const turnedAt = new Float64Array(1_000).fill(-100);
  /** Without the agents' objects (step 0), a turn is a change to some other object: counted, not followed. */
  const kindOf = Int32Array.from({ length: 1_000 }, (_, page) => page % 240);
  const before = new Float64Array(1_000);
  const signs = { seeds: agents.seeds, couriers: agents.couriers, time: 0 };
  const records: Second[] = [];
  let top: number[] = [];
  let changes = 0;
  let strokeAt = 0;
  let strokeKeyword = -1;
  let random = seed * 48_271;
  const next = () => {
    random = (Math.imul(random ^ (random >>> 15), 2_246_822_519) + 0x9e3779b9) >>> 0;
    return random / 4_294_967_296;
  };

  const frames = Math.round(seconds / DELTA);
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame * DELTA;
    raft.time = time;
    while (agentsOn && strokeAt < strokes.length && time >= strokes[strokeAt]!) {
      strokeAt += 1;
      const angle = next() * Math.PI * 2;
      const reach = Math.min(FIELD.width, FIELD.height) * 0.25 * Math.sqrt(next());
      const turn = next() * Math.PI * 2;
      strokeKeyword = agents.beginStroke(10_000 + agents.keywords.length * 7.31);
      for (let at = -4; at <= 4; at += 1) raft.lay(FIELD.width / 2 + Math.cos(angle) * reach + Math.cos(turn) * 30 * at, FIELD.height / 2 + Math.sin(angle) * reach + Math.sin(turn) * 30 * at, strokeKeyword);
    }
    raft.step(DELTA, agentsOn ? parameters : WEB);
    stepDisplay(raft.world, DELTA);
    raft.arrange(world.shown, DELTA, DELTA, false, VISUAL.area);
    signs.time = agents.time;
    const pageStart = emitter.emit(world, raft, bubbles, VISUAL, time, DELTA, agentsOn ? signs : null);
    const pageCount = emitter.count - pageStart;
    if (pageCount > world.state.size) throw new Error("pages out of step");
    school.setLife(LIFE_DEFAULTS);
    school.setCount(380);
    school.step(DELTA, world.state, world.shown, bubbles, emitter.count, pageStart, pageCount, fish, lifeContext);
    school.drainContact(pageCount, contact);
    const strength = INFLUENCE / Math.max(30, school.fish.length);
    for (let page = 0; page < pageCount; page += 1) {
      // A watched page moves on once its last morph has set (simulation/attention.ts turn).
      watched[page] = watched[page]! + contact[page]!;
      if (watched[page]! >= TURN_WATCH && time - turnedAt[page]! >= MORPH_SECONDS) {
        watched[page] = 0;
        turnedAt[page] = time;
        if (step.adopt) agents.adopt(page, raft.sender(page));
        else {
          kindOf[page] = (kindOf[page]! + 1 + Math.floor(next() * 200)) % 240;
          changes += 1;
        }
      }
      if (contact[page]! > 0) world.attend(page, contact[page]! * strength, CEILING);
    }

    if (frame % Math.round(1 / DELTA) !== 0) continue;
    const size = world.state.size;
    const order = Array.from({ length: size }, (_, page) => page).sort((a, b) => raft.radii[b]! - raft.radii[a]!);
    let area = 0;
    let tenth = 0;
    let specks = 0;
    const kinds = new Set<number>();
    for (let index = 0; index < size; index += 1) {
      const page = order[index]!;
      const r = raft.radii[page]!;
      area += r * r;
      if (index < Math.round(size / 10)) tenth += r * r;
      if (r <= 5.01) specks += 1;
      kinds.add(step.adopt ? agents.keywordOf(page) : kindOf[page]!);
      before[page] = r;
    }
    const ten = order.slice(0, 10);
    const replaced = top.length ? ten.filter((page) => !top.includes(page)).length : 0;
    top = ten;
    // Where the ten largest are: how far from the raft's middle, over the raft's own radius (0 middle, 1 rim).
    let cx = 0;
    let cy = 0;
    for (let page = 0; page < size; page += 1) {
      cx += raft.points[page * 2]! / size;
      cy += raft.points[page * 2 + 1]! / size;
    }
    let spread = 0;
    for (let page = 0; page < size; page += 1) spread = Math.max(spread, Math.hypot(raft.points[page * 2]! - cx, raft.points[page * 2 + 1]! - cy));
    let inside = 0;
    for (const page of ten) inside += Math.hypot(raft.points[page * 2]! - cx, raft.points[page * 2 + 1]! - cy) / Math.max(1, spread) / 10;
    // How evenly the fish stand round the raft: the share of eight sectors holding at least a twentieth of them.
    const sectors = new Float64Array(8);
    let alive = 0;
    let onStroke = 0;
    for (const one of school.fish) {
      if (one.life.dying) continue;
      alive += 1;
      sectors[Math.floor(((Math.atan2(one.y - cy, one.x - cx) + Math.PI) / (2 * Math.PI)) * 8) % 8]! += 1;
      if (strokeKeyword >= 0 && one.target >= 0 && one.target < size && agents.keywordOf(one.target) === strokeKeyword) onStroke += 1;
    }
    let held = 0;
    for (const count of sectors) if (count >= alive / 20) held += 1;
    const signChanges = agents.counts.signChanges;
    records.push({
      top: (raft.radii[order[0]!]! ** 2) / Math.max(1, area),
      widest: raft.radii[order[0]!]! / Math.max(1, raft.radii[order[Math.floor(size / 2)]!]!),
      topTenth: tenth / Math.max(1, area),
      specks,
      tenReplaced: replaced,
      underWay: world.carried,
      portions: pageStart,
      changes: step.adopt ? signChanges - changes : changes,
      kinds: kinds.size,
      fishSpread: held / 8,
      inside,
      strokeShare: onStroke / Math.max(1, alive),
    });
    changes = step.adopt ? signChanges : 0;
  }
  return records;
}

export function mean(records: readonly Second[], from: number, to: number) {
  const part = records.slice(from, to);
  const out = {} as Second;
  for (const key of Object.keys(part[0] ?? {}) as (keyof Second)[]) out[key] = Math.round((part.reduce((sum, one) => sum + one[key], 0) / Math.max(1, part.length)) * 1_000) / 1_000;
  return out;
}

if (process.argv[1]?.endsWith("study/ladder.ts")) {
  const asked = process.argv.slice(2).map(Number);
  LADDER.forEach((step, index) => {
    if (asked.length && !asked.includes(index)) return;
    // A stroke at 70 s: its object's share of the fish in the half minute after.
    const records = run(step, 120, [70]);
    console.log(step.name, JSON.stringify(mean(records, 40, 70)), "after the stroke", JSON.stringify(mean(records, 75, 120)));
  });
}
