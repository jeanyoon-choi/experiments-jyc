import type { SocialStorySystem } from "./types";

export type FieldLayout = {
  width: number; height: number; columns: number; rows: number;
  iconSize: number; gap: number; showLabels: boolean;
};
export type Fish = {
  id: number; x: number; y: number; vx: number; vy: number;
  target: number; reconsiderAt: number;
};
/**
 * Read-only observation of the target-force branch for one fish's latest step.
 * A positive signedRadial pulls the fish inward toward its preferred radius;
 * a negative value pushes it outward. Contact is the exact branch that feeds
 * keyword attention, rather than a geometric nearest-cell estimate.
 */
export type AttentionMechanism = Readonly<{
  fishId: number;
  targetIndex: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
  signedRadial: number;
  contact: boolean;
}>;
export type CellRelations = Readonly<{
  cellCount: number;
  centers: Float64Array;
  radii: Float64Array;
  // Dense fish-major matrix: candidate=1, avoidance=2, selected=4, contact=8.
  flags: Uint8Array;
  weights: Float32Array;
  scoreMax: Float32Array;
}>;
type Target = { index: number; x: number; y: number; born: number; strength: number };
// Circumscribes the entire 1.3× glyph, including its tail, plus a small gap.
const FISH_CLEARANCE = 16;

export function storyCenter(index: number, layout: FieldLayout) {
  const { width, height, columns, rows, iconSize, gap, showLabels } = layout;
  const rowHeight = iconSize + (showLabels ? 28 : 0);
  return {
    x: (width - columns * iconSize - (columns - 1) * gap) / 2
      + iconSize / 2 + index % columns * (iconSize + gap),
    y: (height - rows * rowHeight - (rows - 1) * gap) / 2
      + iconSize / 2 + Math.floor(index / columns) * (rowHeight + gap),
  };
}

function unit(id: number, salt: number) {
  const value = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** Fixed, stable school; spatial buckets and double-buffered velocities avoid order bias. */
export class AttentionSchool {
  readonly fish: Fish[];
  private readonly nextVelocity: Float64Array;
  private readonly next: Int32Array;
  private heads = new Int32Array(0);
  private bucketColumns = 0;
  private targets = new Map<number, Target>();
  private lastMemoryCleanup = 0;
  private layout: FieldLayout;
  private readonly familiarity = new Map<string, { value: number; time: number }>();
  private readonly contact = new Map<number, number>();
  private readonly density = new Float64Array(64 * 36);
  private readonly flowX = new Float64Array(64 * 36);
  private readonly flowY = new Float64Array(64 * 36);
  private occupancy = new Map<number, number>();
  private relationState: CellRelations = { cellCount: 0, centers: new Float64Array(0), radii: new Float64Array(0), flags: new Uint8Array(0), weights: new Float32Array(0), scoreMax: new Float32Array(0) };

  private candidateFlags = new Uint8Array(0);
  private candidateScores = new Float32Array(0);

  get relations(): CellRelations { return this.relationState; }

  private markRelation(fish: Fish, cell: number, flag: number) {
    const index = fish.id * this.relationState.cellCount + cell;
    if (cell < this.relationState.cellCount) this.relationState.flags[index]! |= flag;
  }

  private readonly mechanismRecords: AttentionMechanism[] = [];
  private readonly mechanismPool: { -readonly [K in keyof AttentionMechanism]: AttentionMechanism[K] }[] = [];

  get mechanisms(): readonly AttentionMechanism[] {
    return this.mechanismRecords;
  }

  private nearbyTargets(x: number, y: number, radius: number) {
    const { columns, rows, iconSize, gap, showLabels } = this.layout;
    const origin = storyCenter(0, this.layout);
    const sx = iconSize + gap, sy = iconSize + gap + (showLabels ? 28 : 0);
    const result: Target[] = [];
    for (let row = Math.max(0, Math.ceil((y - radius - origin.y) / sy)); row <= Math.min(rows - 1, Math.floor((y + radius - origin.y) / sy)); row++) {
      for (let column = Math.max(0, Math.ceil((x - radius - origin.x) / sx)); column <= Math.min(columns - 1, Math.floor((x + radius - origin.x) / sx)); column++) {
        const target = this.targets.get(row * columns + column);
        if (target) result.push(target);
      }
    }
    return result;
  }

  private resolveObstacles(fish: Fish) {
    const radius = this.layout.iconSize / 2 + FISH_CLEARANCE;
    for (let pass = 0; pass < 24; pass++) {
      let overlap = false;
      for (const target of this.nearbyTargets(fish.x, fish.y, radius)) {
        const dx = fish.x - target.x, dy = fish.y - target.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= radius - 0.001) continue;
        overlap = true;
        this.markRelation(fish, target.index, 2);
        const relation = fish.id * this.relationState.cellCount + target.index;
        if (!(this.relationState.flags[relation]! & 4)) this.relationState.weights[relation] = Math.max(this.relationState.weights[relation]!, Math.min(1, (radius - distance) / FISH_CLEARANCE));
        const angle = unit(fish.id, target.index + 17) * Math.PI * 2;
        const ux = distance > 0.001 ? dx / distance : Math.cos(angle);
        const uy = distance > 0.001 ? dy / distance : Math.sin(angle);
        fish.x = Math.max(0, Math.min(this.layout.width - 0.01, target.x + ux * radius));
        fish.y = Math.max(0, Math.min(this.layout.height - 0.01, target.y + uy * radius));
        const inward = Math.min(0, fish.vx * ux + fish.vy * uy);
        fish.vx -= inward * ux; fish.vy -= inward * uy;
      }
      if (!overlap) break;
    }
  }

  private trailCell(x: number, y: number) {
    return Math.max(0, Math.min(35, Math.floor(y / this.layout.height * 36))) * 64
      + Math.max(0, Math.min(63, Math.floor(x / this.layout.width * 64)));
  }

  /** Fish-seconds of local contact since the previous story step. */
  drainAttention() {
    const result = new Map(this.contact);
    this.contact.clear();
    return result;
  }

  private remembered(id: number, target: number, now: number) {
    const entry = this.familiarity.get(`${id}:${target}`);
    return entry ? entry.value * Math.exp(-Math.max(0, now - entry.time) / 12000) : 0;
  }

  constructor(layout: FieldLayout, count = 100) {
    this.layout = layout;
    this.fish = Array.from({ length: Math.min(120, Math.max(1, count)) }, (_, id) => {
      const heading = unit(id, 3) * Math.PI * 2;
      return { id, x: unit(id, 1) * layout.width, y: unit(id, 2) * layout.height,
        vx: Math.cos(heading) * 36, vy: Math.sin(heading) * 36,
        target: -1, reconsiderAt: 0 };
    });
    this.nextVelocity = new Float64Array(this.fish.length * 2);
    this.next = new Int32Array(this.fish.length);
    this.resize(layout);
  }

  resize(layout: FieldLayout) {
    for (const fish of this.fish) {
      fish.x *= layout.width / Math.max(1, this.layout.width);
      fish.y *= layout.height / Math.max(1, this.layout.height);
      fish.target = -1;
    }
    this.layout = layout;
    this.mechanismRecords.length = 0;
    this.relationState.flags.fill(0);
    this.relationState.weights.fill(0);
    this.relationState.scoreMax.fill(0);
    this.candidateFlags.fill(0);
    this.candidateScores.fill(0);
    this.bucketColumns = Math.max(1, Math.ceil(layout.width / 64));
    this.heads = new Int32Array(this.bucketColumns * Math.max(1, Math.ceil(layout.height / 64)));
  }

  updateTargets(system: SocialStorySystem) {
    const count = system.states.length;
    if (this.relationState.cellCount !== count) {
      this.relationState = { cellCount: count, centers: new Float64Array(count * 2),
        radii: new Float64Array(count), flags: new Uint8Array(count * this.fish.length),
        weights: new Float32Array(count * this.fish.length), scoreMax: new Float32Array(this.fish.length) };
      this.candidateFlags = new Uint8Array(count * this.fish.length);
      this.candidateScores = new Float32Array(count * this.fish.length);
    }
    // Retain the last evaluated candidate scores until that fish reconsiders.
    // Expired/replaced cells must lose their old candidate relationships immediately.
    for (const fish of this.fish) {
      let maximum = 0;
      for (let cell = 0; cell < count; cell++) {
        const state = system.states[cell]!;
        const previous = this.targets.get(cell);
        const relation = fish.id * count + cell;
        if (state.status === "empty" || !previous || previous.born !== state.availableAt) {
          this.candidateFlags[relation] = 0;
          this.candidateScores[relation] = 0;
        }
        maximum = Math.max(maximum, this.candidateScores[relation]!);
      }
      this.relationState.scoreMax[fish.id] = maximum;
    }
    this.relationState.flags.set(this.candidateFlags);
    this.relationState.weights.set(this.candidateScores);
    for (let index = 0; index < count; index++) {
      const center = storyCenter(index, this.layout);
      this.relationState.centers[index * 2] = center.x;
      this.relationState.centers[index * 2 + 1] = center.y;
      this.relationState.radii[index] = system.states[index]!.status === "empty" ? 0 : this.layout.iconSize / 2;
    }
    this.targets.clear();
    this.mechanismRecords.length = 0;
    system.states.forEach((state, index) => {
      if (state.status === "empty") return;
      this.targets.set(index, { index, ...storyCenter(index, this.layout), born: state.availableAt,
        strength: state.status === "new" ? 1 : state.status === "viewing" ? 0.28 : 0.07 });
    });
    // Newly appearing circles must not enclose a fish even before its next step.
    for (const fish of this.fish) this.resolveObstacles(fish);
  }

  step(seconds: number, now: number) {
    const dt = Math.min(1 / 24, Math.max(0, seconds));
    this.relationState.flags.set(this.candidateFlags);
    this.relationState.weights.set(this.candidateScores);
    const { width, height, iconSize } = this.layout;
    // Synchronous read phase: no fish sees deposits from a later/earlier iteration.
    const decay = Math.exp(-dt / 8);
    for (let i = 0; i < this.density.length; i++) {
      this.density[i] *= decay; this.flowX[i] *= decay; this.flowY[i] *= decay;
    }
    if (now - this.lastMemoryCleanup >= 1000) {
      for (const [key, entry] of this.familiarity) {
        if (now - entry.time > 60000) this.familiarity.delete(key);
      }
      this.lastMemoryCleanup = now;
    }
    this.occupancy.clear();
    const mechanisms = this.mechanismRecords;
    mechanisms.length = 0;
    for (const fish of this.fish) {
      const target = this.targets.get(fish.target);
      if (target && Math.hypot(target.x - fish.x, target.y - fish.y) < iconSize / 2 + 48) {
        this.occupancy.set(target.index, (this.occupancy.get(target.index) ?? 0) + 1);
      }
    }
    this.heads.fill(-1);
    for (let i = 0; i < this.fish.length; i++) {
      const fish = this.fish[i]!;
      const bucket = Math.min(this.heads.length - 1,
        Math.floor(Math.max(0, fish.y) / 64) * this.bucketColumns
        + Math.min(this.bucketColumns - 1, Math.floor(Math.max(0, fish.x) / 64)));
      this.next[i] = this.heads[bucket]!;
      this.heads[bucket] = i;
    }
    for (let i = 0; i < this.fish.length; i++) {
      const fish = this.fish[i]!;
      let target = this.targets.get(fish.target);
      if (!target || now >= fish.reconsiderAt) {
        const start = fish.id * this.relationState.cellCount;
        const end = start + this.relationState.cellCount;
        this.candidateFlags.fill(0, start, end);
        this.candidateScores.fill(0, start, end);
        this.relationState.flags.fill(0, start, end);
        this.relationState.weights.fill(0, start, end);
        this.relationState.scoreMax[fish.id] = 0;
        target = undefined;
        let best = -1;
        for (const candidate of this.nearbyTargets(fish.x, fish.y, 180)) {
          const distance = Math.hypot(candidate.x - fish.x, candidate.y - fish.y);
          if (distance > 180) continue;
          this.markRelation(fish, candidate.index, 1);
          const novelty = 1 + 5 * Math.exp(-Math.max(0, now - candidate.born) / 1700);
          const loyalty = candidate.index === fish.target ? 1.35 : 1;
          const affinity = 0.85 + 0.3 * unit(fish.id, candidate.index + 5);
          const familiarity = this.remembered(fish.id, candidate.index, now);
          const crowd = this.occupancy.get(candidate.index) ?? 0;
          const score = candidate.strength * novelty * loyalty * affinity
            / ((70 + distance) * (1 + familiarity * 3) * (1 + crowd * 0.3));
          const relation = fish.id * this.relationState.cellCount + candidate.index;
          this.candidateFlags[relation] = 1;
          this.candidateScores[relation] = score;
          this.relationState.weights[relation] = score;
          this.relationState.scoreMax[fish.id] = Math.max(this.relationState.scoreMax[fish.id]!, score);
          if (score > best) { best = score; target = candidate; }
        }
        fish.target = target?.index ?? -1;
        fish.reconsiderAt = now + 260 + unit(fish.id, 9) * 420;
      }
      const heading = Math.atan2(fish.vy, fish.vx);
      const speedNow = Math.hypot(fish.vx, fish.vy);
      let ax = Math.cos(heading) * (36 - speedNow) * 0.8;
      let ay = Math.sin(heading) * (36 - speedNow) * 0.8;
      // Follow moderate nearby traffic; avoid saturated tracks. Fixed-size local sensors.
      for (const offset of [-0.65, 0, 0.65]) {
        const angle = heading + offset;
        const cell = this.trailCell(fish.x + Math.cos(angle) * 30, fish.y + Math.sin(angle) * 30);
        const density = this.density[cell]!;
        const attraction = density / (0.3 + density) - Math.min(2, density / 3);
        ax += Math.cos(angle) * attraction * 9 + this.flowX[cell]! / (0.3 + density) * 5;
        ay += Math.sin(angle) * attraction * 9 + this.flowY[cell]! / (0.3 + density) * 5;
      }
      if (target) {
        const dx = fish.x - target.x;
        const dy = fish.y - target.y;
        const distance = Math.max(0.1, Math.hypot(dx, dy));
        const familiarity = this.remembered(fish.id, target.index, now);
        const radius = iconSize / 2 + FISH_CLEARANCE + 8 + Math.min(110, familiarity * 35);
        const radial = Math.max(-65, Math.min(95, (distance - radius) * 2.3));
        const desiredX = -dx / distance * radial;
        const desiredY = -dy / distance * radial;
        ax += (desiredX - fish.vx) * 2.5;
        ay += (desiredY - fish.vy) * 2.5;
        const contact = distance < iconSize / 2 + 48;
        this.markRelation(fish, target.index, contact ? 12 : 4);
        this.relationState.weights[fish.id * this.relationState.cellCount + target.index] = contact ? 1 : Math.min(1, Math.abs(radial) / 95);
        let record = this.mechanismPool[i];
        if (!record) {
          record = { fishId: fish.id, targetIndex: -1, targetX: 0, targetY: 0,
            targetRadius: 0, signedRadial: 0, contact: false };
          this.mechanismPool[i] = record;
        }
        record.targetIndex = target.index;
        record.targetX = target.x; record.targetY = target.y;
        record.targetRadius = iconSize / 2;
        record.signedRadial = radial; record.contact = contact;
        mechanisms.push(record);
        if (contact) {
          this.familiarity.set(`${fish.id}:${target.index}`, { value: Math.min(4, familiarity + dt * 0.5), time: now });
          this.contact.set(target.index, (this.contact.get(target.index) ?? 0) + dt);
        }
      }
      let vx = 0, vy = 0, cx = 0, cy = 0, neighbors = 0;
      const bx = Math.floor(fish.x / 64), by = Math.floor(fish.y / 64);
      for (let y = Math.max(0, by - 1); y <= by + 1; y++) {
        for (let x = Math.max(0, bx - 1); x <= Math.min(this.bucketColumns - 1, bx + 1); x++) {
          const bucket = y * this.bucketColumns + x;
          if (bucket >= this.heads.length) continue;
          for (let j = this.heads[bucket]!; j !== -1; j = this.next[j]!) {
            if (i === j) continue;
            const other = this.fish[j]!;
            const dx = fish.x - other.x, dy = fish.y - other.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 64 * 64) continue;
            vx += other.vx; vy += other.vy; cx += other.x; cy += other.y; neighbors++;
            if (d2 < 48 * 48) {
              const force = 300 / Math.max(4, d2);
              ax += dx * force; ay += dy * force;
            }
          }
        }
      }
      if (neighbors) {
        ax += (vx / neighbors - fish.vx) * 0.45 + (cx / neighbors - fish.x) * 0.12;
        ay += (vy / neighbors - fish.vy) * 0.45 + (cy / neighbors - fish.y) * 0.12;
      }
      const margin = Math.min(28, width / 4, height / 4);
      // Anticipatory avoidance deflects approaching fish before hard contact.
      const clearance = iconSize / 2 + FISH_CLEARANCE;
      for (const obstacle of this.nearbyTargets(fish.x, fish.y, clearance + 30)) {
        const dx = fish.x - obstacle.x, dy = fish.y - obstacle.y;
        const distance = Math.max(0.01, Math.hypot(dx, dy));
        if (distance >= clearance + 30) continue;
        this.markRelation(fish, obstacle.index, 2);
        const ux = dx / distance, uy = dy / distance;
        const inward = Math.max(0, -(fish.vx * ux + fish.vy * uy));
        const force = (clearance + 30 - distance) * (2 + inward * 0.2);
        const relation = fish.id * this.relationState.cellCount + obstacle.index;
        if (!(this.relationState.flags[relation]! & 4)) this.relationState.weights[relation] = force / (force + 100);
        ax += ux * force; ay += uy * force;
      }
      ax += Math.max(0, margin - fish.x) * 6 - Math.max(0, fish.x - width + margin) * 6;
      ay += Math.max(0, margin - fish.y) * 6 - Math.max(0, fish.y - height + margin) * 6;
      let nx = fish.vx + ax * dt, ny = fish.vy + ay * dt;
      const speed = Math.hypot(nx, ny);
      if (speed > 96) { nx *= 96 / speed; ny *= 96 / speed; }
      this.nextVelocity[i * 2] = nx;
      this.nextVelocity[i * 2 + 1] = ny;
    }
    for (let i = 0; i < this.fish.length; i++) {
      const fish = this.fish[i]!;
      fish.vx = this.nextVelocity[i * 2]!; fish.vy = this.nextVelocity[i * 2 + 1]!;
      fish.x = Math.max(0, Math.min(width - 0.01, fish.x + fish.vx * dt));
      fish.y = Math.max(0, Math.min(height - 0.01, fish.y + fish.vy * dt));
      this.resolveObstacles(fish);
      const cell = this.trailCell(fish.x, fish.y);
      const speed = Math.max(1, Math.hypot(fish.vx, fish.vy));
      const deposit = Math.min(dt, Math.max(0, 6 - this.density[cell]!));
      this.density[cell] += deposit;
      this.flowX[cell] += fish.vx / speed * deposit;
      this.flowY[cell] += fish.vy / speed * deposit;
    }
  }
}
