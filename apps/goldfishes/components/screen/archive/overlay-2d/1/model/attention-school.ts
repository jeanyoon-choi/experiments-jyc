import type { SocialStorySystem } from "./types";

export type FieldLayout = {
  width: number; height: number; columns: number; rows: number;
  iconSize: number; gap: number; showLabels: boolean;
};
export type Fish = {
  id: number; x: number; y: number; vx: number; vy: number;
  target: number; reconsiderAt: number;
};

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
  private targets: { index: number; x: number; y: number; born: number; strength: number }[] = [];
  private layout: FieldLayout;

  constructor(layout: FieldLayout, count = 100) {
    this.layout = layout;
    this.fish = Array.from({ length: Math.min(100, Math.max(1, count)) }, (_, id) => {
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
    this.bucketColumns = Math.max(1, Math.ceil(layout.width / 64));
    this.heads = new Int32Array(this.bucketColumns * Math.max(1, Math.ceil(layout.height / 64)));
  }

  updateTargets(system: SocialStorySystem) {
    this.targets = system.states.flatMap((state, index) => {
      if (state.status === "empty") return [];
      return [{ index, ...storyCenter(index, this.layout), born: state.availableAt,
        strength: state.status === "new" ? 1 : state.status === "viewing" ? 0.28 : 0.07 }];
    });
  }

  step(seconds: number, now: number) {
    const dt = Math.min(1 / 24, Math.max(0, seconds));
    const { width, height, iconSize } = this.layout;
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
      let target = this.targets.find((candidate) => candidate.index === fish.target);
      if (!target || now >= fish.reconsiderAt) {
        let best = -1;
        for (const candidate of this.targets) {
          const distance = Math.hypot(candidate.x - fish.x, candidate.y - fish.y);
          const novelty = 1 + 5 * Math.exp(-Math.max(0, now - candidate.born) / 1700);
          const loyalty = candidate.index === fish.target ? 1.35 : 1;
          const affinity = 0.85 + 0.3 * unit(fish.id, candidate.index + 5);
          const score = candidate.strength * novelty * loyalty * affinity / (70 + distance);
          if (score > best) { best = score; target = candidate; }
        }
        fish.target = target?.index ?? -1;
        fish.reconsiderAt = now + 260 + unit(fish.id, 9) * 420;
      }
      let ax = Math.cos(now / 1600 + fish.id) * 11;
      let ay = Math.sin(now / 1900 + fish.id) * 11;
      if (target) {
        const dx = fish.x - target.x;
        const dy = fish.y - target.y;
        const distance = Math.max(0.1, Math.hypot(dx, dy));
        const radius = iconSize / 2 + 20 + unit(fish.id, 7) * 27;
        const radial = Math.max(-65, Math.min(95, (distance - radius) * 2.3));
        const circulation = fish.id % 5 === 0 ? -1 : 1;
        const tangent = 24 * Math.exp(-Math.abs(distance - radius) / 80) * circulation;
        const desiredX = -dx / distance * radial - dy / distance * tangent;
        const desiredY = -dy / distance * radial + dx / distance * tangent;
        ax += (desiredX - fish.vx) * 2.5;
        ay += (desiredY - fish.vy) * 2.5;
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
    }
  }
}
