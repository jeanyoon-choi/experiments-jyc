import type { Fish, CellRelations } from "./attention-school";

export const APPROACH_PADDING = 24;
export type ApproachListener = (fishId: number, target: number, x: number, speed: number) => void;

/** Geometry only: neither ring visibility nor audio playback participates here. */
export class ApproachEvents {
  private readonly targets = new Int32Array(1000).fill(-1);
  private readonly cooldowns = new Float64Array(1000);
  private primed = false;

  reset() { this.targets.fill(-1); this.cooldowns.fill(0); this.primed = false; }

  step(fish: readonly Fish[], relations: CellRelations, seconds: number, emit: ApproachListener) {
    const { centers, radii, cellCount } = relations;
    for (const agent of fish) {
      const id = agent.id;
      if (id < 0 || id >= this.targets.length) continue;
      const target = agent.target;
      if (target < 0 || target >= cellCount || radii[target]! <= 0) { this.targets[id] = -1; continue; }
      const dx = agent.x - centers[target * 2]!;
      const dy = agent.y - centers[target * 2 + 1]!;
      const distance2 = dx * dx + dy * dy;
      const boundary = radii[target]! + APPROACH_PADDING;
      if (this.targets[id] === target) {
        // 4px hysteresis prevents boundary jitter from retriggering.
        if (distance2 > (boundary + 4) ** 2) this.targets[id] = -1;
        continue;
      }
      this.targets[id] = -1;
      if (distance2 > (radii[target]! + 0.75) ** 2 && distance2 <= boundary * boundary) {
        this.targets[id] = target;
        if (this.primed && seconds >= this.cooldowns[id]!) {
          this.cooldowns[id] = seconds + 0.8;
          emit(id, target, centers[target * 2]!, Math.hypot(agent.vx, agent.vy));
        }
      }
    }
    this.primed = true;
  }
}
