// The agents under the body, without a screen: the raft's layout, the emitter and the school stepped in the frame
// loop's order (loop/frame-loop.ts), so a change to the rules is measured before it is looked at.
//
//   node components/screen/simulation/1/study/run.ts            every scenario
//   node components/screen/simulation/1/study/run.ts M9 M8.2    only these rules
//
// What it leaves out: the objects' reach past their discs (the fish keep to the discs), sound, drawing.

import { FISH_DEFAULTS, type AgentsInput, type FishParameters } from "../fish/model.ts";
import { LIFE_DEFAULTS, type LifeParameters } from "../fish/lifecycle.ts";
import { SchoolThread } from "../fish/school-thread.ts";
import { RULES, type AgentParameters, type RuleId } from "../model/agents.ts";
import { Raft } from "../raft/raft.ts";
import { BUBBLE_FLOATS, MAX_BUBBLES } from "../render/units.ts";
import { stepDisplay } from "../simulation/display.ts";
import { Emitter } from "../simulation/emitter.ts";
import { DEFAULT_PARAMETERS } from "../web/model.ts";

const FIELD = { width: 1440, height: 810 };
const DELTA = 1 / 30;
/** bubble/9's opening (state/opening.ts), as far as the rules read it. */
const FISH: FishParameters = { ...FISH_DEFAULTS, scale: 0.65, speed: 3, follow: 0.6, novelty: 1, habituation: 1.75, span: 0.5, schooling: 2, patrol: 1 };
const VISUAL = { area: 1, portions: 0.5, flow: 1 };

export type Scenario = {
  rule: RuleId;
  change?: Partial<AgentParameters>;
  bubbles: number;
  fish: number;
  /** bubble/9's lifecycle (fish wear down, die, come again in waves) or none. */
  life: boolean;
  /** Seconds at which a stroke of nine bubbles is drawn. */
  strokes: readonly number[];
  seconds: number;
  /** 터지는 크기: capacity in multiples of the mean audience. */
  burstAt: number;
};

type Second = { top: number; strokeShare: number; strokeBubbles: number; tenKept: number; widest: number; topTenth: number; moves: number; changes: number; bursts: number; flows: number; couriers: number; fish: number; keywords: number; leading: number; swell: number };

export function run(scenario: Scenario, seed = 1) {
  const rule: AgentParameters = { ...RULES[scenario.rule], capacity: scenario.burstAt, burstAt: scenario.burstAt, recovery: 10, ...scenario.change };
  const transport = false;
  const raft = new Raft({ pages: scenario.bubbles, groups: 1, damping: 0.85, rules: true, transport });
  raft.school = scenario.fish;
  raft.seed = seed;
  raft.resize(FIELD);
  raft.rebuild(scenario.bubbles);
  const agents = raft.agents;
  const emitter = new Emitter();
  const bubbles = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  const school = new SchoolThread(FIELD.width, FIELD.height, false);
  const life: LifeParameters = { ...LIFE_DEFAULTS, enabled: scenario.life ? 1 : 0 };
  const lifeContext = { parameters: life, colourOf: () => {} };
  const input: AgentsInput = { data: agents.pageData, rules: rule, opening: agents.opening, entry: -1 };
  const contact = new Float64Array(1_000);
  const last = new Map<number, number>();
  const signs = { seeds: agents.seeds, couriers: agents.couriers, time: 0 };
  // bubble/9's opening (state/opening.ts): 순위 쏠림, 터지는 크기 and the school's feedback 20, up to 9.1.
  const parameters = { web: { ...DEFAULT_PARAMETERS, floor: 0.2106, burstAt: scenario.burstAt }, rule };
  const feedback = (20 * 0.25) / Math.max(30, scenario.fish);
  const before = new Float64Array(1_000);
  const records: Second[] = [];
  let topBefore: number[] = [];
  let leftSeen = 0;
  let strokeAt = 0;
  let counts = { ...agents.counts };
  let state = seed * 2_654_435_761;
  const random = () => {
    state = (Math.imul(state ^ (state >>> 15), 2_246_822_519) + 0x9e3779b9) >>> 0;
    return state / 4_294_967_296;
  };

  const frames = Math.round(scenario.seconds / DELTA);
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame * DELTA;
    raft.time = time;
    while (strokeAt < scenario.strokes.length && time >= scenario.strokes[strokeAt]!) {
      // A straight stroke of nine bubbles at a seeded place over the raft.
      strokeAt += 1;
      const angle = random() * Math.PI * 2;
      const reach = Math.min(FIELD.width, FIELD.height) * 0.22 * Math.sqrt(random());
      const turn = random() * Math.PI * 2;
      const x = FIELD.width / 2 + Math.cos(angle) * reach;
      const y = FIELD.height / 2 + Math.sin(angle) * reach;
      const keyword = agents.beginStroke(10_000 + agents.keywords.length * 7.31);
      for (let step = 0; step < 9; step += 1) raft.lay(x + Math.cos(turn) * 30 * (step - 4), y + Math.sin(turn) * 30 * (step - 4), keyword);
    }
    raft.step(DELTA, parameters);
    stepDisplay(raft.world, DELTA);
    raft.arrange(raft.world.shown, DELTA, DELTA, false, VISUAL.area);
    signs.time = agents.time;
    const pageStart = emitter.emit(raft.world, raft, bubbles, VISUAL, time, DELTA, signs);
    const pageCount = emitter.count - pageStart;
    school.setLife(life);
    if (rule.open < 0.5) agents.population = scenario.fish;
    school.setCount(agents.population);
    input.entry = agents.time < agents.entryUntil ? agents.entry : -1;
    school.step(DELTA, raft.world.state, raft.world.shown, bubbles, emitter.count, pageStart, pageCount, FISH, lifeContext, null, input);
    school.drainContact(pageCount, contact);
    for (let page = 0; page < pageCount; page += 1) {
      if (!(contact[page]! > 0)) continue;
      agents.attend(page, contact[page]!);
      if (transport) raft.pagerank.attend(page, contact[page]! * feedback, 9.1);
    }
    for (const one of school.fish) {
      if (one.life.dying || one.leaving) continue;
      const id = Math.floor(one.seed);
      const was = last.get(id);
      if (was !== undefined && was >= 0 && one.target >= 0 && one.target !== was) agents.moved(was, one.target);
      last.set(id, one.target);
    }
    if (school.left > leftSeen) agents.left(school.left - leftSeen);
    leftSeen = school.left;

    if (frame % Math.round(1 / DELTA) !== 0) continue;
    const size = agents.state.size;
    const radii = Array.from(raft.radii.subarray(0, size)).sort((a, b) => b - a);
    let area = 0;
    let top = 0;
    let swell = 0;
    for (let index = 0; index < size; index += 1) {
      area += radii[index]! ** 2;
      if (index < Math.round(size / 10)) top += radii[index]! ** 2;
      const r = raft.radii[index]!;
      if (before[index]! > 0) swell += Math.abs(r - before[index]!) / Math.max(1, r);
      before[index] = r;
    }
    let flows = 0;
    const world = raft.world;
    for (let bubble = 0; bubble < size; bubble += 1) for (const relation of world.state.out[bubble]!) if (world.flow(bubble, relation) > 0.25 / size) flows += 1;
    // Keywords by the fish watching them: how many, and the leading one's share.
    const watched = new Map<number, number>();
    let watching = 0;
    let alive = 0;
    for (const one of school.fish) {
      if (one.life.dying || one.leaving) continue;
      alive += 1;
      if (one.target < 0 || one.target >= size) continue;
      const keyword = agents.keywordOf(one.target);
      watched.set(keyword, (watched.get(keyword) ?? 0) + 1);
      watching += 1;
    }
    let leading = 0;
    let squares = 0;
    for (const count of watched.values()) {
      leading = Math.max(leading, count / Math.max(1, watching));
      squares += (count / Math.max(1, watching)) ** 2;
    }
    // The last stroke's keyword: its share of the watching fish, and how many bubbles carry it.
    const strokeKeyword = agents.counts.strokes > 0 ? agents.keywords.findLastIndex((word) => word.parent === null && word.key >= 10_000) : -1;
    let strokeBubbles = 0;
    if (strokeKeyword >= 0) for (let bubble = 0; bubble < size; bubble += 1) if (agents.keywordOf(bubble) === strokeKeyword) strokeBubbles += 1;
    const order = Array.from({ length: size }, (_, bubble) => bubble).sort((a, b) => raft.radii[b]! - raft.radii[a]!).slice(0, 10);
    const tenKept = topBefore.length ? order.filter((bubble) => topBefore.includes(bubble)).length : 10;
    topBefore = order;
    const now = agents.counts;
    records.push({
      top: radii[0]! ** 2 / Math.max(1, area),
      strokeShare: strokeKeyword >= 0 ? (watched.get(strokeKeyword) ?? 0) / Math.max(1, watching) : 0,
      strokeBubbles,
      tenKept,
      widest: radii[0]! / Math.max(1, radii[Math.floor(size / 2)]!),
      topTenth: top / Math.max(1, area),
      moves: now.moves - counts.moves,
      changes: now.signChanges - counts.signChanges,
      bursts: now.bursts - counts.bursts,
      flows,
      couriers: agents.couriers.length,
      fish: alive,
      keywords: squares > 0 ? 1 / squares : 0,
      leading,
      swell: swell / size,
    });
    counts = { ...now };
  }
  return records;
}

export function mean(records: readonly Second[], from: number, to: number) {
  const part = records.slice(from, to);
  const out = {} as Record<keyof Second, number>;
  for (const key of Object.keys(part[0] ?? {}) as (keyof Second)[]) out[key] = Math.round((part.reduce((sum, one) => sum + one[key], 0) / Math.max(1, part.length)) * 100) / 100;
  return out;
}

const BODY = { bubbles: 800, fish: 380, burstAt: 80 };
const SCENARIOS: { name: string; scenario: Omit<Scenario, "rule">; windows: readonly (readonly [string, number, number])[] }[] = [
  { name: "no input, 90 s", scenario: { ...BODY, life: true, strokes: [], seconds: 90 }, windows: [["30–90 s", 30, 90]] },
  { name: "one stroke at 20 s", scenario: { ...BODY, life: true, strokes: [20], seconds: 80 }, windows: [["before", 10, 20], ["0–20 s after", 20, 40], ["40–60 s after", 60, 80]] },
  { name: "ten strokes, 20–80 s", scenario: { ...BODY, life: true, strokes: [20, 26, 32, 38, 44, 50, 56, 62, 68, 74], seconds: 140 }, windows: [["during", 20, 80], ["0–30 s after", 80, 110], ["30–60 s after", 110, 140]] },
];

if (process.argv[1]?.endsWith("study/run.ts")) {
  const asked = process.argv.slice(2).filter((name): name is RuleId => name in RULES);
  const rules = asked.length ? asked : (Object.keys(RULES) as RuleId[]);
  for (const rule of rules) {
    for (const { name, scenario, windows } of SCENARIOS) {
      // The open audience is M9's own; under bubble/9's school (the default here) it is switched off.
      const records = run({ ...scenario, rule, change: { open: 0 } });
      void 0;
      for (const [label, from, to] of windows) console.log(rule, "|", name, "|", label, JSON.stringify(mean(records, from, to)));
    }
  }
}
