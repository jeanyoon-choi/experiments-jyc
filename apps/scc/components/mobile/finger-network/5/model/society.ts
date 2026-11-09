// A small one-sex society with lives, love, and lineages. Each finished touch session adds an adult.
// Adults wander, court nearby singles, pair up, may have children, may cheat or divorce, age, and die.
//
// Complex-adaptive ingredients, all local and per agent:
// - heterogeneity: each agent carries an inherited trait (shown as hue) and its own pickiness;
// - local interaction: courting, cheating, and parenting only happen between people who are near;
// - adaptation: pickiness falls the longer one stays single and rises after being left;
// - feedback: compatible couples stay together longer, have more children, and children add satisfaction;
// - selection and emergence: children inherit a blend of their parents' traits with mutation, so colour
//   lineages, population size, and family clusters arise from the rules rather than being scripted.
// /5: no population upper bound — no hard cap and no crowding brake on births.
// All rates are in model years; the browser maps a year to `SECONDS_PER_YEAR` seconds.

export const SECONDS_PER_YEAR = 1.5;
export const ADULT_AGE = 16;

export type Agent = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Wander heading in radians, turned a little at random. */
  heading: number;
  /** Inherited trait on a circle of 360 degrees; similar traits attract. */
  trait: number;
  age: number;
  /** Lowest compatibility this agent will accept from a partner, adapted by experience. */
  pickiness: number;
  partner: number | null;
  /** Relationship satisfaction while partnered, 0 to 1. */
  satisfaction: number;
  parents: number[];
  /** 0 for touch-born people; a child is one more than its higher-generation parent. */
  generation: number;
  lastBirth: number;
  /** Walk cycle phase, advanced by distance walked. */
  stride: number;
  /** Society time of death; the browser fades the body before removal. */
  diedAt: number | null;
};

export type SocietyEvent =
  | { kind: "union"; time: number; a: number; b: number; x: number; y: number }
  | { kind: "split"; time: number; a: number; b: number; x: number; y: number; betrayal: boolean }
  | { kind: "birth"; time: number; child: number; x: number; y: number }
  | { kind: "death"; time: number; id: number; x: number; y: number };

export type Society = {
  agents: Agent[];
  byId: Map<number, Agent>;
  nextId: number;
  /** Seconds of society time. */
  time: number;
  events: SocietyEvent[];
  randomState: number;
};

export type SocietyParameters = {
  /** Distance at which two people can court, cheat, or touch hands. */
  meetRadius: number;
  /** Distance at which a single notices and walks toward a compatible single. */
  sightRadius: number;
  /** Courtship attempts per year while a compatible single is within `meetRadius`. */
  courtshipRate: number;
  /** Chance per year that a partnered agent near a more compatible single leaves for them. */
  temptationRate: number;
  /** Divorce rate per year at zero satisfaction, scaled by (1 − satisfaction)². */
  divorceRate: number;
  /** Births per year for a fertile couple; /5 has no population ceiling, so crowding never reduces it. */
  birthRate: number;
  fertileFrom: number;
  fertileUntil: number;
  birthSpacing: number;
  /** Gompertz mortality: hazard per year = base × e^(growth × age). */
  mortalityBase: number;
  mortalityGrowth: number;
  /** Standard deviation of a child's trait mutation, in degrees. */
  mutation: number;
  /** Pickiness lost per single year, and gained when left by a partner. */
  lonelinessRelief: number;
  heartbreak: number;
  personalSpace: number;
  coupleSpacing: number;
  walkSpeed: number;
  /** Seconds a death or other event stays in `events` for the browser to draw. */
  eventMemory: number;
};

export const DEFAULT_SOCIETY: SocietyParameters = {
  meetRadius: 46,
  sightRadius: 150,
  courtshipRate: 1.2,
  temptationRate: 0.35,
  divorceRate: 0.9,
  birthRate: 0.35,
  fertileFrom: 18,
  fertileUntil: 45,
  birthSpacing: 2.5,
  mortalityBase: 0.0006,
  mortalityGrowth: 0.085,
  mutation: 14,
  lonelinessRelief: 0.04,
  heartbreak: 0.18,
  personalSpace: 48,
  coupleSpacing: 30,
  walkSpeed: 20,
  eventMemory: 1.6,
};

export function createSociety(seed = 0x2f6e2b1): Society {
  return { agents: [], byId: new Map(), nextId: 0, time: 0, events: [], randomState: seed | 0 || 1 };
}

export function random(society: Society) {
  let next = society.randomState;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  society.randomState = next || 0x9e3779b9;
  return (next >>> 0) / 4_294_967_296;
}

function gaussian(society: Society) {
  return Math.sqrt(-2 * Math.log(1 - random(society))) * Math.cos(2 * Math.PI * random(society));
}

const wrapTrait = (degrees: number) => ((degrees % 360) + 360) % 360;
const distance = (a: Agent, b: Agent) => Math.hypot(a.x - b.x, a.y - b.y);
export const isAdult = (agent: Agent) => agent.age >= ADULT_AGE;
const alive = (agent: Agent) => agent.diedAt === null;

/** Parents, children, and siblings never pair. */
export function related(a: Agent, b: Agent) {
  return a.parents.includes(b.id) || b.parents.includes(a.id) || a.parents.some((id) => b.parents.includes(id));
}

/** 1 for identical traits, 0 for opposite ones on the trait circle. */
export function compatibility(a: Agent, b: Agent) {
  const gap = Math.abs(a.trait - b.trait) % 360;
  return 1 - Math.min(gap, 360 - gap) / 180;
}

function blendTraits(a: number, b: number) {
  const gap = ((b - a + 540) % 360) - 180;
  return wrapTrait(a + gap / 2);
}

export function addAgent(
  society: Society,
  at: { x: number; y: number; trait: number; age: number; parents?: number[] },
) {
  const agent: Agent = {
    id: society.nextId++,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    heading: random(society) * Math.PI * 2,
    trait: wrapTrait(at.trait),
    age: at.age,
    pickiness: 0.7,
    partner: null,
    satisfaction: 0,
    parents: at.parents ?? [],
    generation: Math.max(-1, ...(at.parents ?? []).map((id) => society.byId.get(id)?.generation ?? 0)) + 1,
    lastBirth: -Infinity,
    stride: 0,
    diedAt: null,
  };
  society.agents.push(agent);
  society.byId.set(agent.id, agent);
  return agent;
}

export function partnerOf(society: Society, agent: Agent) {
  return agent.partner === null ? null : (society.byId.get(agent.partner) ?? null);
}

function unite(society: Society, a: Agent, b: Agent) {
  const fit = compatibility(a, b);
  a.partner = b.id;
  b.partner = a.id;
  a.satisfaction = b.satisfaction = 0.45 + 0.5 * fit;
  society.events.push({ kind: "union", time: society.time, a: a.id, b: b.id, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
}

function separate(society: Society, a: Agent, b: Agent, betrayal: boolean, parameters: SocietyParameters) {
  a.partner = null;
  b.partner = null;
  // Being left hurts more than leaving; both become a little more careful.
  b.pickiness = Math.min(0.95, b.pickiness + parameters.heartbreak);
  a.pickiness = Math.min(0.95, a.pickiness + parameters.heartbreak * (betrayal ? 0.2 : 0.5));
  society.events.push({ kind: "split", time: society.time, a: a.id, b: b.id, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, betrayal });
}

function die(society: Society, agent: Agent) {
  if (!alive(agent)) return;
  agent.diedAt = society.time;
  const partner = partnerOf(society, agent);
  if (partner) {
    partner.partner = null;
    partner.pickiness = 0.5;
  }
  agent.partner = null;
  society.events.push({ kind: "death", time: society.time, id: agent.id, x: agent.x, y: agent.y });
}

export function stepSociety(society: Society, elapsed: number, bounds: { width: number; height: number }, parameters = DEFAULT_SOCIETY) {
  if (elapsed <= 0) return society;
  society.time += elapsed;
  const years = elapsed / SECONDS_PER_YEAR;
  const chance = (ratePerYear: number) => random(society) < 1 - Math.exp(-ratePerYear * years);
  const living = society.agents.filter(alive);

  for (const agent of living) {
    if (!alive(agent)) continue;
    agent.age += years;
    if (chance(parameters.mortalityBase * Math.exp(parameters.mortalityGrowth * agent.age))) {
      die(society, agent);
      continue;
    }
    if (!isAdult(agent)) continue;
    const partner = partnerOf(society, agent);

    if (!partner) {
      agent.pickiness = Math.max(0.15, agent.pickiness - parameters.lonelinessRelief * years);
      if (!chance(parameters.courtshipRate)) continue;
      // Court the most compatible single within reach, if each finds the other good enough.
      let best: Agent | null = null;
      for (const other of living) {
        if (other === agent || !alive(other) || !isAdult(other) || other.partner !== null) continue;
        if (distance(agent, other) > parameters.meetRadius || related(agent, other)) continue;
        if (!best || compatibility(agent, other) > compatibility(agent, best)) best = other;
      }
      if (best) {
        const fit = compatibility(agent, best);
        if (fit >= agent.pickiness && fit >= best.pickiness) unite(society, agent, best);
      }
      continue;
    }

    if (agent.id > partner.id) continue; // each couple is handled once, by its lower id
    const fit = compatibility(agent, partner);
    // Satisfaction leans toward how well the two fit, slowly wears with time, and wobbles.
    const target = 0.25 + 0.7 * fit;
    const drift = (target - agent.satisfaction) * 0.25 * years - 0.01 * years + gaussian(society) * 0.06 * Math.sqrt(years);
    agent.satisfaction = partner.satisfaction = Math.min(1, Math.max(0, agent.satisfaction + drift));

    if (chance(parameters.divorceRate * (1 - agent.satisfaction) ** 2)) {
      const leaver = random(society) < 0.5 ? agent : partner;
      separate(society, leaver, leaver === agent ? partner : agent, false, parameters);
      continue;
    }

    // Temptation: a nearby single who fits clearly better than the current bond may win one of them over.
    let betrayed = false;
    for (const [self, other] of [[agent, partner], [partner, agent]] as const) {
      for (const stranger of living) {
        if (stranger === self || stranger === other || !alive(stranger) || !isAdult(stranger) || stranger.partner !== null) continue;
        if (distance(self, stranger) > parameters.meetRadius || related(self, stranger)) continue;
        const pull = compatibility(self, stranger);
        if (pull < self.satisfaction + 0.15 || pull < stranger.pickiness) continue;
        if (!chance(parameters.temptationRate)) continue;
        separate(society, self, other, true, parameters);
        unite(society, self, stranger);
        betrayed = true;
        break;
      }
      if (betrayed) break;
    }
    if (betrayed) continue;

    const fertile = [agent, partner].every((p) => p.age >= parameters.fertileFrom && p.age <= parameters.fertileUntil);
    if (fertile && agent.age - agent.lastBirth >= parameters.birthSpacing && chance(parameters.birthRate * (0.5 + agent.satisfaction))) {
      const child = addAgent(
        society,
        {
          x: (agent.x + partner.x) / 2,
          y: (agent.y + partner.y) / 2 + 12,
          trait: blendTraits(agent.trait, partner.trait) + gaussian(society) * parameters.mutation,
          age: 0,
          parents: [agent.id, partner.id],
        },
      );
      agent.lastBirth = agent.age;
      partner.lastBirth = partner.age;
      agent.satisfaction = partner.satisfaction = Math.min(1, agent.satisfaction + 0.08);
      society.events.push({ kind: "birth", time: society.time, child: child.id, x: child.x, y: child.y });
    }
  }

  move(society, elapsed, bounds, parameters);
  society.events = society.events.filter((event) => society.time - event.time < parameters.eventMemory);
  society.agents = society.agents.filter((agent) => agent.diedAt === null || society.time - agent.diedAt < parameters.eventMemory);
  if (society.byId.size !== society.agents.length) {
    const kept = new Set(society.agents.map((agent) => agent.id));
    for (const id of society.byId.keys()) if (!kept.has(id)) society.byId.delete(id);
  }
  return society;
}

// Singles roam the whole field with a persistent heading and drift toward a compatible single in sight;
// couples walk side by side; children stay near a living parent; everyone keeps personal space.
function move(society: Society, elapsed: number, bounds: { width: number; height: number }, parameters: SocietyParameters) {
  const living = society.agents.filter(alive);
  for (const agent of living) {
    agent.heading += (random(society) - 0.5) * 2.4 * elapsed;
    const speed = parameters.walkSpeed * (isAdult(agent) ? 1 : 0.8) * (agent.age > 60 ? 0.6 : 1);
    let goalX = Math.cos(agent.heading) * speed;
    let goalY = Math.sin(agent.heading) * speed;
    const partner = partnerOf(society, agent);
    const steer = (x: number, y: number, gain: number) => {
      goalX = (x - agent.x) * gain;
      goalY = (y - agent.y) * gain;
    };

    if (partner && agent.id > partner.id) {
      // The follower keeps to the leader's side, whichever side it is already on.
      const side = agent.x >= partner.x ? 1 : -1;
      steer(partner.x + side * parameters.coupleSpacing, partner.y, 2.5);
    } else if (!isAdult(agent)) {
      const parent = agent.parents.map((id) => society.byId.get(id)).find((p) => p && alive(p));
      if (parent) steer(parent.x + (agent.id % 2 ? 22 : -22), parent.y + 26, 1.5);
    } else if (!partner) {
      let crush: Agent | null = null;
      for (const other of living) {
        if (other === agent || !isAdult(other) || other.partner !== null) continue;
        if (distance(agent, other) > parameters.sightRadius || related(agent, other)) continue;
        const fit = compatibility(agent, other);
        if (fit >= agent.pickiness && (!crush || fit > compatibility(agent, crush))) crush = other;
      }
      if (crush) {
        const d = distance(agent, crush) || 1;
        goalX = ((crush.x - agent.x) / d) * speed;
        goalY = ((crush.y - agent.y) / d) * speed;
      }
    }

    for (const other of living) {
      if (other === agent || other.id === agent.partner) continue;
      const dx = agent.x - other.x;
      const dy = agent.y - other.y;
      const d = Math.hypot(dx, dy);
      const space = parameters.personalSpace * (isAdult(agent) && isAdult(other) ? 1 : 0.5);
      if (d >= space || d === 0) continue;
      goalX += (dx / d) * (space - d) * 2;
      goalY += (dy / d) * (space - d) * 2;
    }
    const margin = 30;
    if (agent.x < margin) goalX += (margin - agent.x) * 3;
    if (agent.x > bounds.width - margin) goalX -= (agent.x - bounds.width + margin) * 3;
    if (agent.y < margin * 2) goalY += (margin * 2 - agent.y) * 3;
    if (agent.y > bounds.height - margin * 2) goalY -= (agent.y - bounds.height + margin * 2) * 3;
    if (agent.x < margin || agent.x > bounds.width - margin || agent.y < margin * 2 || agent.y > bounds.height - margin * 2) {
      agent.heading = Math.atan2(goalY, goalX);
    }

    const limit = speed * 1.6;
    const goalSpeed = Math.hypot(goalX, goalY);
    if (goalSpeed > limit) {
      goalX *= limit / goalSpeed;
      goalY *= limit / goalSpeed;
    }
    const follow = 1 - Math.exp(-4 * elapsed);
    agent.vx += (goalX - agent.vx) * follow;
    agent.vy += (goalY - agent.vy) * follow;
  }
  for (const agent of living) {
    agent.x += agent.vx * elapsed;
    agent.y += agent.vy * elapsed;
    agent.stride += Math.hypot(agent.vx, agent.vy) * elapsed * 0.16;
  }
}
