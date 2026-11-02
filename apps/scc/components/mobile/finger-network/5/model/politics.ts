// A political landscape on a phone: height is opinion, from 하파 (bottom) to 상파 (top).
//
// Core dynamics: Baumann, Lorenz-Spreen, Sokolov and Starnini, "Modeling Echo Chambers and Polarization
// Dynamics in Social Networks", Phys. Rev. Lett. 124, 048301 (2020). Opinions are unbounded reals whose
// sign is the side and whose magnitude is conviction:
//     dxᵢ/dt = −xᵢ + K Σⱼ Aᵢⱼ(t) tanh(α xⱼ)
// over an activity-driven temporal network. Each person is active at its own heavy-tailed rate; when
// active it contacts m people, choosing j with probability ∝ |xᵢ − xⱼ|^(−βᵢ) (homophily), and each contact
// is returned with probability r. With weak controversy α everyone relaxes to neutral consensus; with
// strong α and homophily the society splits into two convinced camps that mostly hear themselves.
//
// Partisan reactance added here: a convinced person who hears a convinced member of the other side is
// pushed away rather than pulled (repulsive influence; Flache et al., JASSS 20(4) 2, 2017, review), so
// cross-side contact can deepen a divide instead of dissolving the smaller camp.
//
// Adaptive layers added here, both closing feedback loops across scales:
// - each person's homophily βᵢ is learned: contact with a convinced member of the other side raises it
//   (avoidance, affective polarization), and it relaxes slowly back to the person's temperament;
// - controversy α is the society's issue salience, drifting toward a base plus a share of the current
//   polarization (attention follows conflict) and jolted by occasional issues.
// The system is open: people retire and neutral newcomers arrive, and touches add people anywhere.
// Sideways, people drift toward those they hear, so echo chambers also appear as horizontal clusters.
// Time is in seconds of screen time; `timeScale` maps it to the model's time unit.

export type Citizen = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  stride: number;
  /** Signed conviction: positive is 상파, negative is 하파, magnitude is strength. */
  opinion: number;
  /** Heavy-tailed activity: how often this person reaches out. */
  activity: number;
  /** Learned homophily βᵢ, and the temperament it relaxes back to. */
  homophily: number;
  temperament: number;
  /** People this person currently hears, with the screen time each contact ends. */
  hears: Map<number, number>;
  leftAt: number | null;
};

export type Contact = { time: number; from: number; to: number; cross: boolean };

export type Politics = {
  citizens: Citizen[];
  byId: Map<number, Citizen>;
  nextId: number;
  time: number;
  /** Controversy α, the society's issue salience. */
  controversy: number;
  /** Contacts made recently, for the browser to draw and count. */
  contacts: Contact[];
  issueUntil: number;
  issue: number;
  randomState: number;
};

export type PoliticsParameters = {
  /** K: strength of social influence. */
  influence: number;
  /** m: people contacted per activation; r: chance a contact is returned. */
  contactsPerActivation: number;
  reciprocity: number;
  /** Activations per person per second at activity 1. */
  activationRate: number;
  /** Activity a ∈ [ε, 1] drawn from a power law F(a) ∝ a^(−γ). */
  activityExponent: number;
  activityFloor: number;
  /** Screen seconds a contact keeps influencing its receiver. */
  contactSeconds: number;
  /** Model time units per screen second. */
  timeScale: number;
  /** Base controversy, how much polarization raises it, and how fast it follows (per second). */
  baseControversy: number;
  controversyFeedback: number;
  controversyRate: number;
  /** Occasional issues add to controversy for a while. */
  issueRate: number;
  issueStrength: number;
  issueSeconds: number;
  /** Temperaments are drawn uniformly from this range; learning raises βᵢ, relaxation returns it. */
  temperamentLow: number;
  temperamentHigh: number;
  avoidanceLearning: number;
  homophilyRelaxation: number;
  homophilyCeiling: number;
  /** Share of contacts made with anyone, ignoring homophily (work, family, chance). */
  crossExposure: number;
  /** Leaning beyond which both people count as convinced partisans, and how hard such a cross-side voice repels. */
  partisanLeaning: number;
  reactance: number;
  /** Retirements per person per second; newcomers start near neutral. */
  turnover: number;
  newcomerSpread: number;
  /** Conviction at which a person stands 76% of the way from the centre to its edge. */
  convictionScale: number;
  spread: number;
  walkSpeed: number;
  personalSpace: number;
  /** Size of the society a fresh landscape starts with. */
  founders: number;
};

export const DEFAULT_POLITICS: PoliticsParameters = {
  influence: 3,
  contactsPerActivation: 4,
  reciprocity: 0.5,
  activationRate: 1.5,
  activityExponent: 2.1,
  activityFloor: 0.05,
  contactSeconds: 2.5,
  timeScale: 1,
  baseControversy: 1.2,
  controversyFeedback: 1.5,
  controversyRate: 0.15,
  issueRate: 1 / 25,
  issueStrength: 1.2,
  issueSeconds: 5,
  temperamentLow: 1.5,
  temperamentHigh: 3.5,
  avoidanceLearning: 0.25,
  homophilyRelaxation: 0.04,
  homophilyCeiling: 5,
  crossExposure: 0.1,
  partisanLeaning: 0.5,
  reactance: 0.5,
  turnover: 1 / 90,
  newcomerSpread: 0.3,
  convictionScale: 3,
  spread: 0.36,
  walkSpeed: 18,
  personalSpace: 30,
  founders: 56,
};

export function createPolitics(seed = 0x51a7e, parameters = DEFAULT_POLITICS): Politics {
  return { citizens: [], byId: new Map(), nextId: 0, time: 0, controversy: parameters.baseControversy, contacts: [], issueUntil: 0, issue: 0, randomState: seed | 0 || 1 };
}

function random(politics: Politics) {
  let next = politics.randomState;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  politics.randomState = next || 0x9e3779b9;
  return (next >>> 0) / 4_294_967_296;
}

function gaussian(politics: Politics) {
  return Math.sqrt(-2 * Math.log(1 - random(politics))) * Math.cos(2 * Math.PI * random(politics));
}

/** Where on the screen a conviction stands; tanh keeps strong convictions inside the screen. */
export function heightOf(opinion: number, bounds: { height: number }, parameters = DEFAULT_POLITICS) {
  return bounds.height / 2 - Math.tanh(opinion / parameters.convictionScale) * bounds.height * parameters.spread;
}

/** The conviction of a screen height, the inverse of `heightOf`. */
export function opinionAt(y: number, bounds: { height: number }, parameters = DEFAULT_POLITICS) {
  const t = Math.max(-0.97, Math.min(0.97, (bounds.height / 2 - y) / (bounds.height * parameters.spread)));
  return Math.atanh(t) * parameters.convictionScale;
}

/** Leaning in (−1, 1): how far toward its side's screen edge a person stands. */
export const leaningOf = (citizen: Citizen, parameters = DEFAULT_POLITICS) => Math.tanh(citizen.opinion / parameters.convictionScale);

export function addCitizen(politics: Politics, at: { x: number; y: number; opinion: number }, parameters = DEFAULT_POLITICS) {
  const temperament = parameters.temperamentLow + random(politics) * (parameters.temperamentHigh - parameters.temperamentLow);
  // Inverse-transform sample of a power law on [ε, 1].
  const g = 1 - parameters.activityExponent;
  const floor = parameters.activityFloor ** g;
  const activity = (floor + random(politics) * (1 - floor)) ** (1 / g);
  const citizen: Citizen = {
    id: politics.nextId++,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    heading: random(politics) * Math.PI * 2,
    stride: 0,
    opinion: at.opinion,
    activity,
    homophily: temperament,
    temperament,
    hears: new Map(),
    leftAt: null,
  };
  politics.citizens.push(citizen);
  politics.byId.set(citizen.id, citizen);
  return citizen;
}

/** A fresh landscape: founders scattered across the screen, all near neutral. */
export function foundPolitics(politics: Politics, bounds: { width: number; height: number }, parameters = DEFAULT_POLITICS) {
  for (let index = 0; index < parameters.founders; index += 1) {
    const opinion = gaussian(politics) * parameters.newcomerSpread;
    addCitizen(politics, { x: 30 + random(politics) * (bounds.width - 60), y: heightOf(opinion, bounds, parameters), opinion }, parameters);
  }
  return politics;
}

export type PoliticsMeasure = {
  upper: number;
  lower: number;
  neutral: number;
  /** Mean |leaning|: 0 is consensus at the centre, 1 is everyone at an edge. */
  polarization: number;
  /** Among recent contacts between convinced people, the share within one side. */
  echo: number;
  /** Share of recent contacts that crossed sides. */
  crossing: number;
};

export function measurePolitics(politics: Politics, parameters = DEFAULT_POLITICS): PoliticsMeasure {
  const present = politics.citizens.filter((c) => c.leftAt === null);
  const n = present.length || 1;
  const leanings = present.map((c) => leaningOf(c, parameters));
  let same = 0;
  let convinced = 0;
  let crossing = 0;
  for (const contact of politics.contacts) {
    const a = politics.byId.get(contact.from);
    const b = politics.byId.get(contact.to);
    if (!a || !b) continue;
    if (contact.cross) crossing += 1;
    if (Math.abs(leaningOf(a, parameters)) < 0.3 || Math.abs(leaningOf(b, parameters)) < 0.3) continue;
    convinced += 1;
    if (!contact.cross) same += 1;
  }
  return {
    upper: leanings.filter((l) => l >= 0.3).length / n,
    lower: leanings.filter((l) => l <= -0.3).length / n,
    neutral: leanings.filter((l) => Math.abs(l) < 0.3).length / n,
    polarization: leanings.reduce((sum, l) => sum + Math.abs(l), 0) / n,
    echo: convinced > 0 ? same / convinced : 0,
    crossing: politics.contacts.length > 0 ? crossing / politics.contacts.length : 0,
  };
}

export function stepPolitics(politics: Politics, elapsed: number, bounds: { width: number; height: number }, parameters = DEFAULT_POLITICS) {
  if (elapsed <= 0) return politics;
  politics.time += elapsed;
  const now = politics.time;
  const chance = (rate: number) => random(politics) < 1 - Math.exp(-rate * elapsed);

  for (const citizen of [...politics.citizens]) {
    if (citizen.leftAt === null && chance(parameters.turnover)) {
      citizen.leftAt = now;
      const opinion = gaussian(politics) * parameters.newcomerSpread;
      addCitizen(politics, { x: 30 + random(politics) * (bounds.width - 60), y: heightOf(opinion, bounds, parameters), opinion }, parameters);
    }
  }
  const present = politics.citizens.filter((c) => c.leftAt === null);

  // Controversy follows polarization (attention follows conflict) and is jolted by occasional issues.
  if (now >= politics.issueUntil && chance(parameters.issueRate)) {
    politics.issue = parameters.issueStrength * (0.5 + random(politics));
    politics.issueUntil = now + parameters.issueSeconds;
  }
  const polarization = present.reduce((sum, c) => sum + Math.abs(leaningOf(c, parameters)), 0) / (present.length || 1);
  const target = parameters.baseControversy + parameters.controversyFeedback * polarization + (now < politics.issueUntil ? politics.issue : 0);
  politics.controversy += (target - politics.controversy) * (1 - Math.exp(-parameters.controversyRate * elapsed));

  // Activity-driven contacts chosen by homophily, sometimes returned, sometimes with anyone.
  for (const citizen of present) {
    if (!chance(citizen.activity * parameters.activationRate)) continue;
    const others = present.filter((other) => other !== citizen);
    if (others.length === 0) continue;
    const weights = others.map((other) => Math.max(Math.abs(citizen.opinion - other.opinion), 1e-3) ** -citizen.homophily);
    const total = weights.reduce((sum, w) => sum + w, 0);
    for (let k = 0; k < Math.min(parameters.contactsPerActivation, others.length); k += 1) {
      let chosen: Citizen;
      if (random(politics) < parameters.crossExposure) {
        chosen = others[Math.floor(random(politics) * others.length)]!;
      } else {
        let pick = random(politics) * total;
        let index = 0;
        while (index < others.length - 1 && pick > weights[index]!) pick -= weights[index++]!;
        chosen = others[index]!;
      }
      const cross = Math.sign(citizen.opinion) !== Math.sign(chosen.opinion);
      citizen.hears.set(chosen.id, now + parameters.contactSeconds);
      if (random(politics) < parameters.reciprocity) chosen.hears.set(citizen.id, now + parameters.contactSeconds);
      politics.contacts.push({ time: now, from: citizen.id, to: chosen.id, cross });
      // Meeting a convinced member of the other side teaches avoidance.
      if (cross && Math.abs(leaningOf(chosen, parameters)) > 0.5) {
        citizen.homophily = Math.min(parameters.homophilyCeiling, citizen.homophily + parameters.avoidanceLearning);
      }
    }
  }

  // dxᵢ/dt = −xᵢ + K Σ tanh(α xⱼ) over whom each person currently hears.
  const dt = elapsed * parameters.timeScale;
  const pulls = present.map((citizen) => {
    let sum = 0;
    for (const [id, until] of citizen.hears) {
      const other = politics.byId.get(id);
      if (until < now || !other || other.leftAt !== null) {
        citizen.hears.delete(id);
        continue;
      }
      const voice = Math.tanh(politics.controversy * other.opinion);
      const partisans = Math.abs(leaningOf(citizen, parameters)) > parameters.partisanLeaning && Math.abs(leaningOf(other, parameters)) > parameters.partisanLeaning;
      sum += partisans && Math.sign(other.opinion) !== Math.sign(citizen.opinion) ? -parameters.reactance * voice : voice;
    }
    return sum;
  });
  const relax = 1 - Math.exp(-parameters.homophilyRelaxation * elapsed);
  present.forEach((citizen, index) => {
    citizen.opinion += (-citizen.opinion + parameters.influence * pulls[index]!) * dt;
    citizen.homophily += (citizen.temperament - citizen.homophily) * relax;
  });

  move(politics, present, elapsed, bounds, parameters);
  politics.contacts = politics.contacts.filter((contact) => now - contact.time < parameters.contactSeconds);
  politics.citizens = politics.citizens.filter((c) => c.leftAt === null || now - c.leftAt < 1.6);
  if (politics.byId.size !== politics.citizens.length) {
    const kept = new Set(politics.citizens.map((c) => c.id));
    for (const id of politics.byId.keys()) if (!kept.has(id)) politics.byId.delete(id);
  }
  return politics;
}

// Height follows conviction; sideways, people drift toward whom they hear, so echo chambers cluster.
function move(politics: Politics, present: Citizen[], elapsed: number, bounds: { width: number; height: number }, parameters: PoliticsParameters) {
  for (const citizen of present) {
    citizen.heading += (random(politics) - 0.5) * 2 * elapsed;
    let goalX = Math.cos(citizen.heading) * parameters.walkSpeed * 0.5;
    let goalY = (heightOf(citizen.opinion, bounds, parameters) - citizen.y) * 1.2;
    let heard = 0;
    let meanX = 0;
    for (const id of citizen.hears.keys()) {
      const other = politics.byId.get(id);
      if (!other) continue;
      heard += 1;
      meanX += other.x;
    }
    if (heard > 0) goalX += (meanX / heard - citizen.x) * 0.6;
    for (const other of present) {
      if (other === citizen) continue;
      const dx = citizen.x - other.x;
      const dy = citizen.y - other.y;
      const d = Math.hypot(dx, dy);
      if (d >= parameters.personalSpace || d === 0) continue;
      goalX += (dx / d) * (parameters.personalSpace - d) * 2.5;
      goalY += (dy / d) * (parameters.personalSpace - d);
    }
    const margin = 24;
    if (citizen.x < margin) goalX += (margin - citizen.x) * 3;
    if (citizen.x > bounds.width - margin) goalX -= (citizen.x - bounds.width + margin) * 3;
    if (citizen.x < margin || citizen.x > bounds.width - margin) citizen.heading = Math.PI - citizen.heading;
    const limit = parameters.walkSpeed * 2.5;
    const speed = Math.hypot(goalX, goalY);
    if (speed > limit) {
      goalX *= limit / speed;
      goalY *= limit / speed;
    }
    const follow = 1 - Math.exp(-4 * elapsed);
    citizen.vx += (goalX - citizen.vx) * follow;
    citizen.vy += (goalY - citizen.vy) * follow;
  }
  for (const citizen of present) {
    citizen.x += citizen.vx * elapsed;
    citizen.y += citizen.vy * elapsed;
    citizen.stride += Math.hypot(citizen.vx, citizen.vy) * elapsed * 0.16;
  }
}
