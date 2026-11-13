// The goldfish's lifecycle (bubble/4, user 2026-10-22). A fish lives on the
// time it spends watching the raft's content: every second beside a page
// wears it down (and, more slowly, every second it swims about), so the busier
// it flits from page to page, the sooner it is spent. Its colour tells its
// life: it arrives in its goldfish colour, takes on the colour of the bubbles
// it watches, and as its strength fails turns quickly to a pale grey. Spent,
// it stops swimming — no tail beat, no schooling — and falls like a body down
// the screen, rolled onto its side, sliding round the bubbles it cannot pass
// through, until it leaves the screen. A fish also dies where it is crushed:
// thrown far in one step by a bubble that swells or trades places, or shut in
// a cavity of the raft. Every few seconds as many
// fish as have gone swim in again from all the screen's edges, as the school
// does when the page opens. Nobody is born of anybody.
//
// Pure functions over a fish's `Life`; the school steps them and the scene
// reads their colour and pose. Colours are sRGB, 0–1.

export type Rgb = [number, number, number];

export type LifeParameters = {
  /** 1: fish wear down, die and are replaced; 0: they live for ever (bubble/3). */
  enabled: number;
  /** Seconds of watching a fresh fish can take before it is spent (its mean; fish differ by `spread`). */
  lifespan: number;
  /** How much swimming about without watching wears it down, as a share of watching's rate. */
  idleWear: number;
  /** How much lifespans differ between fish, 0 alike … 1 from about a third to three times. */
  spread: number;
  /** How fast a fish takes on the colour of the bubbles it watches (per second of watching). */
  tintRate: number;
  /** Strength left at which it starts turning grey (and slowing); at 0 it is grey and dies. */
  fadeAt: number;
  /** How fast a dead fish falls down the screen at most, px/s. */
  sinkSpeed: number;
  /** A fish a page's bubble comes this far over (px) in one step — swelling or trading places — dies there; 0: never. */
  crushDistance: number;
  /** Seconds between waves: each brings in as many fish as have gone. */
  waveEvery: number;
};

export const LIFE_DEFAULTS: LifeParameters = {
  enabled: 1,
  lifespan: 30,
  idleWear: 0.1,
  spread: 0.4,
  tintRate: 0.8,
  fadeAt: 0,
  sinkSpeed: 170,
  crushDistance: 20,
  waveEvery: 6,
};

export type Life = {
  /** 1 fresh … 0 spent. */
  vitality: number;
  /** Seconds of watching this fish can take from fresh. */
  lifespan: number;
  /** The colour it has taken on from what it watched, and how far (0–1). */
  tint: Rgb;
  tintAmount: number;
  /** Spent: sinking, no longer swimming. */
  dying: boolean;
  /** Seconds since it was spent. */
  dyingTime: number;
  /** Its velocity when spent, which dies away as it starts to sink (px/s). */
  drift: [number, number];
};

/** The pale grey a spent fish turns: body and fins (the monochrome palette, lightened). */
export const SPENT_BODY: Rgb = [0.66, 0.66, 0.66];
export const SPENT_FIN: Rgb = [0.84, 0.84, 0.84];

/** A fresh life; `random` is in [0, 1). `vitality` below 1 staggers the first school's deaths. */
export function createLife(parameters: LifeParameters, random: number, vitality = 1): Life {
  // Log-uniform spread around the mean, so short and long lives are equally likely.
  const lifespan = parameters.lifespan * Math.exp((random * 2 - 1) * parameters.spread * 1.1);
  return { vitality, lifespan, tint: [0, 0, 0], tintAmount: 0, dying: false, dyingTime: 0, drift: [0, 0] };
}

/**
 * One step of a living fish. `watched` is the colour of the bubble it is
 * watching this step, or null when it is not beside one; `velocity` is how it
 * is swimming. Returns true the step it is spent.
 */
export function stepLife(life: Life, seconds: number, watched: Rgb | null, parameters: LifeParameters, vx = 0, vy = 0) {
  if (life.dying) return false;
  if (watched) {
    // Its colour eases toward what it watches, and it takes on more of it.
    const ease = Math.min(1, seconds * 3);
    for (let channel = 0; channel < 3; channel += 1) {
      life.tint[channel] = life.tintAmount > 0 ? life.tint[channel]! + (watched[channel]! - life.tint[channel]!) * ease : watched[channel]!;
    }
    life.tintAmount += (1 - life.tintAmount) * Math.min(1, seconds * parameters.tintRate);
  }
  if (parameters.enabled < 0.5) return false;
  const wear = (watched ? 1 : parameters.idleWear) * (seconds / Math.max(0.1, life.lifespan));
  life.vitality = Math.max(0, life.vitality - wear);
  if (life.vitality > 0) return false;
  kill(life, vx, vy);
  return true;
}

/** Ends a life at once (spent, crushed or shut in): it greys and starts to fall, keeping its velocity for a moment. */
export function kill(life: Life, vx: number, vy: number) {
  life.vitality = 0;
  life.dying = true;
  life.dyingTime = 0;
  life.drift[0] = vx;
  life.drift[1] = vy;
}

function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** How far a fish has greyed: 0 above `fadeAt`, 1 when spent (and while sinking). */
export function greyness(life: Life, parameters: LifeParameters) {
  if (life.dying) return 1;
  if (parameters.enabled < 0.5 || parameters.fadeAt <= 0) return 0;
  return smooth(1 - life.vitality / parameters.fadeAt);
}

/** Its swimming strength: full while fresh, slowing to about half as it greys. */
export function vigour(life: Life, parameters: LifeParameters) {
  return 1 - 0.5 * greyness(life, parameters);
}

/** Its colour now, for one part (body or fins): its own, then what it watched, then grey. */
export function lifeColour(life: Life, parameters: LifeParameters, own: Rgb, spent: Rgb, out: Rgb, tintShare = 1) {
  const grey = greyness(life, parameters);
  // `tintShare` below 1 keeps a part (the fins) a little more its own colour.
  const taken = life.tintAmount * tintShare;
  for (let channel = 0; channel < 3; channel += 1) {
    const tinted = own[channel]! + (life.tint[channel]! - own[channel]!) * taken;
    out[channel] = tinted + (spent[channel]! - tinted) * grey;
  }
  return out;
}

/**
 * A falling body's next velocity from its current one: the way it was
 * swimming dies away, it accelerates down the screen to at most `sinkSpeed`,
 * drifting a little sideways. Where a bubble has stopped it (the school slides
 * it round the bubble), a sideways push sees it off the top.
 */
export function fallVelocity(life: Life, vx: number, vy: number, seconds: number, parameters: LifeParameters, seed: number, out: Float64Array, at: number) {
  vx *= Math.exp(-seconds * 6);
  vx += Math.sin(life.dyingTime * 1.3 + seed * 2.3) * 14 * seconds;
  // Straight into the fall: down at once, at full speed within about a fifth of a second.
  vy = Math.min(parameters.sinkSpeed, Math.max(vy, parameters.sinkSpeed * 0.35) + parameters.sinkSpeed * 3 * seconds);
  if (life.dyingTime > 0.4 && Math.hypot(vx, vy) < parameters.sinkSpeed * 0.15) vx += (seed % 1 < 0.5 ? -1 : 1) * 60 * seconds;
  out[at] = vx;
  out[at + 1] = vy;
}

/** How far a sinking fish has rolled onto its side, radians. */
export function sinkRoll(life: Life) {
  return life.dying ? (Math.PI / 2) * 0.85 * smooth(life.dyingTime / 0.8) : 0;
}

/** sRGB 0–1 from "#rrggbb". */
export function rgbOf(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
