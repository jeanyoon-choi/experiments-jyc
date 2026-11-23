// The field above the phones: what a strike does beyond its own phone, and
// when a phone dies. Pure, so it is tested.
//
// - Ripple: a strong strike spreads to the phones around it, ring by ring,
//   as bubble/7's strains spread through the raft (전파) — the same keyword
//   lands on neighbours a beat later.
// - Surge: when the strike rate jumps well above its own recent level, every
//   phone gets the same notification at the same instant: the moment a hype
//   owns the whole field. Then it scatters again.
// - Death (NOTES 1020, 1023): too much stimulus in ten seconds, or too long
//   on nothing new, and the goldfish dies.

export type Seat = { column: number; row: number };

export type Echo = { phone: number; delay: number };

/** Phones a strike at `origin` reaches, with their delays (s). `roll` gives 0–1 per call. */
export function ripple(seats: readonly Seat[], origin: number, rank: number, wave: number, roll: () => number, { radius = 3, step = 0.11, threshold = 0.55 } = {}): Echo[] {
  if (wave <= 0 || rank < threshold) return [];
  const from = seats[origin];
  if (!from) return [];
  const reach = Math.max(1, Math.round(radius * (0.5 + wave * 0.5)));
  const out: Echo[] = [];
  seats.forEach((seat, phone) => {
    if (phone === origin) return;
    const distance = Math.max(Math.abs(seat.column - from.column), Math.abs(seat.row - from.row));
    if (distance > reach) return;
    const chance = wave * rank * (1 - (distance - 1) / reach);
    if (roll() < chance) out.push({ phone, delay: distance * step + roll() * 0.04 });
  });
  return out;
}

/** Strike-rate surge detector: a fast and a slow average of strikes a second. */
export class Surge {
  fast = 0;
  slow = 0;
  private last = -Infinity;
  private seen = 0;
  private readonly ratio: number;
  private readonly cooldown: number;
  /** Below this rate (strikes/s over the field) nothing surges. */
  private readonly floor: number;

  constructor(ratio = 1.7, cooldown = 22, floor = 6) {
    this.ratio = ratio;
    this.cooldown = cooldown;
    this.floor = floor;
  }

  /** Call every frame with the strikes since the last call; true when the field should sync. */
  step(strikes: number, dt: number, now: number) {
    if (dt <= 0) return false;
    const rate = strikes / dt;
    this.fast += (rate - this.fast) * Math.min(1, dt / 1.5);
    this.slow += (rate - this.slow) * Math.min(1, dt / 25);
    this.seen += dt;
    // Until the slow average has something to stand on, it follows the fast one.
    if (this.seen < 8) this.slow = this.fast;
    if (this.seen < 8 || now - this.last < this.cooldown) return false;
    if (this.fast > this.floor && this.fast > this.slow * this.ratio) {
      this.last = now;
      return true;
    }
    return false;
  }
}

/** A phone's dopamine: its strikes in the last ten seconds, and when its keyword last changed. */
export class Dopamine {
  private readonly times: number[] = [];
  lastNew = 0;
  private lastKeyword = "";

  constructor(now: number) {
    this.lastNew = now;
  }

  strike(keyword: string, now: number) {
    this.times.push(now);
    while (this.times.length && this.times[0]! < now - 10) this.times.shift();
    if (keyword !== this.lastKeyword) {
      this.lastKeyword = keyword;
      this.lastNew = now;
    }
  }

  /** Strikes in the last ten seconds. */
  level(now: number) {
    while (this.times.length && this.times[0]! < now - 10) this.times.shift();
    return this.times.length;
  }

  /** "overdose", "still" or null. */
  verdict(now: number, overdose: number, stillness: number): "overdose" | "still" | null {
    if (this.level(now) >= overdose) return "overdose";
    if (now - this.lastNew >= stillness) return "still";
    return null;
  }

  reset(now: number) {
    this.times.length = 0;
    this.lastNew = now;
    this.lastKeyword = "";
  }
}
