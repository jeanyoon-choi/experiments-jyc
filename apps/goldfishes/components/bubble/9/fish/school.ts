// Goldfish around the raft (added 2026-10-09). An adaptive school taken from
// Goldfishes' attention school (screen/tech-eyes/1: novelty, habituation,
// crowding, schooling, a hard no-overlap rule against the bubbles) and turned
// toward this route's network: a fish is a surfer of the web it swims around.
// When its attention lapses it either follows one of its page's links, with
// probability `follow` and in proportion to the link's weight (PageRank's
// random surfer), or looks about and picks by salience: displayed rank,
// novelty of new pages, its own boredom and the crowd already there.
//
// A fish never enters a bubble. It approaches the exposed part of its page's
// free face, then patrols back and forth along it, turning where a neighbour
// bubble closes the arc. Pages buried inside the raft are not reachable and
// are not chosen. Contact time per page is drained by the route and, scaled
// by `influence`, raises that page's quality: watched pages gain appeal, so
// the fish perform the rank they follow.
//
// Positions are CSS px of the field. Obstacles are exactly the discs the foam
// renderer draws this frame (pages and travelling portions), x y radius seed.
//
// This file is the school itself: who is in it (entering, dying, waves), how
// each fish swims and schools, and how fish keep off each other. What they
// cannot swim through is obstacles.ts; what they attend, attention.ts. One
// step runs them in a pinned order (school-hash.test.ts): every random draw,
// bucket and touch, and every float operation, is where it was.

import { Attention, type AttentionInput } from "./attention.ts";
import { fallVelocity, kill, createLife, LIFE_OFF, stepLife, vigour, type LifeParameters, type Rgb } from "./lifecycle.ts";
import { angleDifference, closestBetween, RandomStream, unit } from "./math.ts";
import { clampCount, EDGE_GAP, FISH_DEFAULTS, MAX_FISH, MOUTH, SIDE, TAIL, type Fish, type FishParameters, type FlatLinks, type LifeContext, type SchoolWeb } from "./model.ts";
import { Obstacles } from "./obstacles.ts";

const CRUISE = 24;
const MAX_SPEED = 64;
const APPROACH = 44;
const PATROL = 16;
/** Contact: the mouth within this many px of the target's edge. */
const CONTACT_BAND = 14;
/** Hold distance from the edge, beyond the mouth, px. */
const HOLD = 3;
const FISH_BUCKET = 64;
/** A fish found shut in a cavity this many checks running swims in again from the edge. */
const TRAPPED_CHECKS = 2;

// A fish's body seen from above, for keeping fish apart (glyph units, × scale
// for px; see goldfish-scene.ts): a capsule round the segment from BODY_FRONT
// ahead of its centre to BODY_BACK behind it, BODY_RADIUS wide — the body is
// 5.65 long each way and 2.72 wide, its side fins reach about 4.6 out, its
// tail fan 11.9 back.
const BODY_RADIUS = 3.6;
const BODY_FRONT = 2.4;
const BODY_BACK = 7.6;

export class GoldfishSchool {
  readonly fish: Fish[] = [];
  private width = 1;
  private height = 1;
  private readonly random = new RandomStream(0x51f15e);
  /** This step's discs and the geometry asked of them, rebuilt each step from the renderer's bubbles. */
  private readonly obstacles = new Obstacles();
  /** What each fish attends, and the contact that makes of it. */
  private readonly attention = new Attention();
  /** The step's inputs to attention, refilled each step. */
  private readonly attending: AttentionInput = {
    time: 0,
    web: { out: [] },
    shown: [],
    parameters: FISH_DEFAULTS,
    faces: this.obstacles,
    hold: 0,
    clearance: 0,
    random: this.random,
  };
  // Fish neighbour buckets.
  private bucketColumns = 1;
  private heads = new Int32Array(1);
  private next = new Int32Array(MAX_FISH);
  private readonly nextVelocity = new Float64Array(MAX_FISH * 2);
  /** Scratch for separate(): each fish's body segment (x1 y1 x2 y2), and a pair's closest points. */
  private readonly segments = new Float64Array(MAX_FISH * 4);
  private readonly closest = new Float64Array(4);
  /** Scratch for separate(): each fish's centre (x y), kept equal to fish.x and fish.y as it moves them. */
  private readonly centres = new Float64Array(MAX_FISH * 2);
  /** Which fish separate() moved. */
  private readonly moved = new Uint8Array(MAX_FISH);
  private time = 0;
  // Lifecycle: the school's size to keep, the settings, fish gone since the last wave, and the wave's clock.
  private target = 0;
  /** Off (bubble/3) until the scene says otherwise. */
  private lifeParameters: LifeParameters = LIFE_OFF;
  private filled = false;
  private sinceWave = 0;
  private nextSeed = 0;
  private readonly watched: Rgb = [0, 0, 0];
  /** Fish that have fallen off the screen since the school began, and deaths by cause (for tests and measurement). */
  departed = 0;
  readonly deaths = { spent: 0, crushed: 0, shut: 0 };
  /** This step's touches — fish whose mouth has just reached their page's edge — as x, y, seed; `touchCount` of them. */
  readonly touches = new Float64Array(MAX_FISH * 3);
  touchCount = 0;

  constructor(width: number, height: number) {
    this.resize(width, height);
  }

  resize(width: number, height: number) {
    const previousWidth = this.width;
    const previousHeight = this.height;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    for (const fish of this.fish) {
      fish.x *= this.width / previousWidth;
      fish.y *= this.height / previousHeight;
    }
    this.obstacles.resize(this.width, this.height);
    this.bucketColumns = Math.max(1, Math.ceil(this.width / FISH_BUCKET));
    this.heads = new Int32Array(this.bucketColumns * Math.max(1, Math.ceil(this.height / FISH_BUCKET)));
  }

  /** The lifecycle settings, before setCount, so a first school is staggered when they are on. */
  setLife(parameters: LifeParameters) {
    this.lifeParameters = parameters;
  }

  /**
   * The school's size. Fish beyond it leave at once; missing fish enter from
   * the field's edges — at once the first time (and always without a
   * lifecycle), otherwise with the next wave.
   */
  setCount(count: number) {
    this.target = clampCount(count);
    while (this.fish.length > this.target) this.fish.pop();
    if (!this.filled || this.lifeParameters.enabled < 0.5) {
      // The first school's strengths are staggered so its deaths do not come all at once.
      this.fill(this.lifeParameters.enabled >= 0.5 && !this.filled);
      if (this.target > 0) this.filled = true;
    }
  }

  /** Brings the school up to its size, each newcomer entering from an edge. */
  private fill(staggered: boolean) {
    const random = this.random;
    while (this.fish.length < this.target) {
      const fish: Fish = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        facing: 0,
        target: -1,
        angle: 0,
        turn: random.next() < 0.5 ? -1 : 1,
        reconsiderAt: 0,
        stuck: 0,
        trapped: 0,
        enclosureCheckAt: 0,
        seed: this.nextSeed + random.next(),
        touching: false,
        life: createLife(this.lifeParameters, random.next(), staggered ? 0.35 + 0.65 * random.next() : 1),
      };
      // Seeds keep counting up, so a newcomer never shares a dead fish's memories or affinities.
      this.nextSeed += 1;
      this.enter(fish);
      this.fish.push(fish);
    }
  }

  /** Puts a fish at a random point of the field's edge, heading inward. */
  private enter(fish: Fish) {
    const random = this.random;
    const side = Math.floor(random.next() * 4);
    const along = random.next();
    fish.x = side === 0 ? 4 : side === 1 ? this.width - 4 : along * this.width;
    fish.y = side === 2 ? 4 : side === 3 ? this.height - 4 : along * this.height;
    const heading = Math.atan2(this.height / 2 - fish.y, this.width / 2 - fish.x) + (random.next() - 0.5);
    fish.vx = Math.cos(heading) * CRUISE;
    fish.vy = Math.sin(heading) * CRUISE;
    fish.facing = heading;
    fish.target = -1;
    fish.stuck = 0;
    fish.trapped = 0;
    fish.reconsiderAt = this.time + random.next() * 1.5;
  }

  /** Marks pages from `from` up to `to` as just arrived. */
  notePages(from: number, to: number) {
    this.attention.notePages(from, to, this.time);
  }

  /**
   * The web started over: every page is new to the fish and nobody attends
   * anything. The new raft is seeded where fish may be swimming, so the
   * school swims back in from the edges rather than being shut inside it.
   */
  forgetPages() {
    this.attention.forgetPages();
    for (const fish of this.fish) this.enter(fish);
  }

  /** Fish-seconds of contact per page since the last drain; the array is reused. */
  drainContact(pageCount: number, out: Float64Array) {
    this.attention.drainContact(pageCount, out);
  }

  /**
   * One step. `bubbles` holds this frame's drawn discs (x y radius seed);
   * pages occupy [pageStart, pageStart + pageCount). `shown` is the displayed rank.
   */
  step(
    seconds: number,
    web: SchoolWeb | FlatLinks,
    shown: ArrayLike<number>,
    bubbles: Float32Array,
    bubbleCount: number,
    pageStart: number,
    pageCount: number,
    parameters: FishParameters,
    life?: LifeContext,
  ) {
    const dt = Math.min(1 / 24, Math.max(0, seconds));
    this.time += dt;
    const scale = parameters.scale;
    const lifeParameters = life?.parameters ?? LIFE_OFF;
    this.lifeParameters = lifeParameters;
    this.touchCount = 0;
    if (lifeParameters.enabled >= 0.5) this.wave(dt, lifeParameters);
    else this.fill(false);
    if (this.fish.length === 0 || dt === 0) return;
    const { obstacles, attention, attending, random } = this;
    obstacles.build(bubbles, bubbleCount, pageStart, pageCount, scale);
    const hold = (MOUTH + HOLD) * scale + EDGE_GAP;
    const clearance = SIDE * scale + EDGE_GAP;
    /** Schooling: closer than this, a neighbour pushes away; the field's margin pushes fish back in. */
    const personal = 16 * scale + 6;
    const margin = Math.min(24, this.width / 4, this.height / 4);
    const discs = obstacles.discs;

    attending.time = this.time;
    attending.web = web;
    attending.shown = shown;
    attending.parameters = parameters;
    attending.hold = hold;
    attending.clearance = clearance;
    attention.begin(this.time, this.fish, pageCount);

    this.heads.fill(-1);
    for (let i = 0; i < this.fish.length; i += 1) {
      const fish = this.fish[i]!;
      const bucket = Math.min(
        this.heads.length - 1,
        Math.floor(fish.y / FISH_BUCKET) * this.bucketColumns + Math.min(this.bucketColumns - 1, Math.floor(fish.x / FISH_BUCKET)),
      );
      this.next[i] = this.heads[bucket]!;
      this.heads[bucket] = i;
    }

    for (let i = 0; i < this.fish.length; i += 1) {
      const fish = this.fish[i]!;
      const id = Math.floor(fish.seed);
      if (fish.life.dying) {
        // Dead: no swimming; it falls down the screen (moved, and kept out of the bubbles, in the second pass).
        if (fish.life.dyingTime === 0) {
          fish.vx = fish.life.drift[0];
          fish.vy = fish.life.drift[1];
          fish.stuck = 0;
        }
        fish.life.dyingTime += dt;
        fallVelocity(fish.life, fish.vx, fish.vy, dt, lifeParameters, fish.seed, this.nextVelocity, i * 2);
        continue;
      }
      // A tiring fish swims more slowly.
      const speed = parameters.speed * vigour(fish.life, lifeParameters);
      let watching = false;
      if (this.time >= fish.enclosureCheckAt) {
        fish.enclosureCheckAt = this.time + 0.8 + 0.4 * unit(id, 21);
        fish.trapped = obstacles.enclosed(fish.x, fish.y, clearance) ? fish.trapped + 1 : 0;
        if (fish.trapped >= TRAPPED_CHECKS) {
          // Shut in a cavity of the raft: with a lifecycle it dies there; without, it swims in again from the edge.
          if (lifeParameters.enabled >= 0.5) {
            kill(fish.life, 0, 0);
            this.deaths.shut += 1;
            attention.release(fish);
            this.nextVelocity[i * 2] = 0;
            this.nextVelocity[i * 2 + 1] = 0;
            continue;
          }
          this.enter(fish);
        }
      }
      if (attention.lapsed(fish, this.time)) attention.reconsider(fish, attending);
      const heading = Math.atan2(fish.vy, fish.vx);
      const speedNow = Math.hypot(fish.vx, fish.vy);
      let desiredFacing = speedNow > 0.01 ? heading : fish.facing;
      let ax = 0;
      let ay = 0;
      let near = 0;

      if (fish.target >= 0) {
        const page = fish.target;
        const at = obstacles.discOf(page);
        const discX = discs[at]!;
        const discY = discs[at + 1]!;
        const discR = discs[at + 2]!;
        const radius = discR + hold;
        const toFish = Math.hypot(fish.x - discX, fish.y - discY);
        // While far off, hold the angle the fish comes from, so it arrives on its own side.
        if (toFish > radius + 60) {
          const found = obstacles.exposedAngle(page, Math.atan2(fish.y - discY, fish.x - discX), hold, clearance);
          if (found === null) fish.stuck = 3;
          else fish.angle = found;
        }
        const goalX = discX + Math.cos(fish.angle) * radius;
        const goalY = discY + Math.sin(fish.angle) * radius;
        const gx = goalX - fish.x;
        const gy = goalY - fish.y;
        const goalDistance = Math.hypot(gx, gy);
        near = Math.max(0, Math.min(1, 1 - (goalDistance - 6) / 40));

        if (near > 0.4 && parameters.patrol > 0) {
          // Patrol: move the goal along the free face; a neighbour wall turns the fish back.
          const angular = (PATROL * speed * parameters.patrol * (0.7 + 0.6 * unit(id, 4))) / Math.max(8, radius);
          const nextAngle = fish.angle + fish.turn * angular * dt;
          const nx = discX + Math.cos(nextAngle) * radius;
          const ny = discY + Math.sin(nextAngle) * radius;
          if (obstacles.free(nx, ny, clearance, page)) fish.angle = nextAngle;
          else fish.turn = -fish.turn;
          if (random.next() < dt * 0.25 * parameters.patrol) fish.turn = -fish.turn;
        } else if (!obstacles.free(goalX, goalY, clearance, page)) {
          // The bubble's neighbours moved over the goal: find the nearest open part of the face.
          const found = obstacles.exposedAngle(page, fish.angle, hold, clearance);
          if (found === null) fish.stuck = 3;
          else fish.angle = found;
        }

        const pull = Math.min(APPROACH * speed, goalDistance * 1.6);
        const desiredX = goalDistance > 0.01 ? (gx / goalDistance) * pull : 0;
        const desiredY = goalDistance > 0.01 ? (gy / goalDistance) * pull : 0;
        const strength = 2.4 + near * 4;
        ax += (desiredX - fish.vx) * strength;
        ay += (desiredY - fish.vy) * strength;

        // Facing the bubble when beside it, but leaning into the way it patrols.
        const inwardAngle = Math.atan2(discY - fish.y, discX - fish.x);
        const patrolLean = parameters.patrol > 0 ? fish.turn * 0.55 * Math.min(1, parameters.patrol) : 0;
        desiredFacing = near > 0.5 ? inwardAngle + patrolLean : desiredFacing;

        const edgeGap = toFish - discR - MOUTH * scale;
        if (edgeGap < CONTACT_BAND) {
          watching = true;
          if (!fish.touching && this.touchCount < MAX_FISH) {
            const at = this.touchCount * 3;
            this.touches[at] = fish.x;
            this.touches[at + 1] = fish.y;
            this.touches[at + 2] = fish.seed;
            this.touchCount += 1;
          }
          if (life && lifeParameters.tint >= 0.5) life.colourOf(pageStart + page, this.watched);
          attention.watch(fish, id, page, dt, attending);
        }
        // Stalled: far from the goal and not closing on it (sliding along a wall counts).
        const closing = goalDistance > 0.01 ? (fish.vx * gx + fish.vy * gy) / goalDistance : 0;
        fish.stuck = goalDistance > 40 && closing < 6 * speed ? fish.stuck + dt : Math.max(0, fish.stuck - dt);
      } else {
        // No reachable page: cruise.
        ax += Math.cos(heading) * (CRUISE * speed - speedNow) * 0.8;
        ay += Math.sin(heading) * (CRUISE * speed - speedNow) * 0.8;
      }

      fish.facing += angleDifference(desiredFacing, fish.facing) * Math.min(1, dt * 9);
      fish.touching = watching;
      // Spent: it lets go of its page.
      if (stepLife(fish.life, dt, watching && life ? this.watched : null, lifeParameters, fish.vx, fish.vy)) {
        this.deaths.spent += 1;
        attention.release(fish);
      }

      // Schooling, weaker beside a bubble so patrols stay individual.
      let vx = 0;
      let vy = 0;
      let cx = 0;
      let cy = 0;
      let neighbours = 0;
      const bx = Math.floor(fish.x / FISH_BUCKET);
      const by = Math.floor(fish.y / FISH_BUCKET);
      for (let y = Math.max(0, by - 1); y <= by + 1; y += 1) {
        for (let x = Math.max(0, bx - 1); x <= Math.min(this.bucketColumns - 1, bx + 1); x += 1) {
          const bucket = y * this.bucketColumns + x;
          if (bucket >= this.heads.length) continue;
          for (let j = this.heads[bucket]!; j !== -1; j = this.next[j]!) {
            if (i === j) continue;
            const other = this.fish[j]!;
            const dx = fish.x - other.x;
            const dy = fish.y - other.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 56 * 56) continue;
            // The sinking are not company.
            if (other.life.dying) continue;
            vx += other.vx;
            vy += other.vy;
            cx += other.x;
            cy += other.y;
            neighbours += 1;
            if (d2 < personal * personal) {
              const force = (260 * scale) / Math.max(4, d2);
              ax += dx * force;
              ay += dy * force;
            }
          }
        }
      }
      if (neighbours > 0) {
        const together = parameters.schooling * (1 - near * 0.8);
        ax += ((vx / neighbours - fish.vx) * 0.45 + (cx / neighbours - fish.x) * 0.1) * together;
        ay += ((vy / neighbours - fish.vy) * 0.45 + (cy / neighbours - fish.y) * 0.1) * together;
      }

      ax += Math.max(0, margin - fish.x) * 6 - Math.max(0, fish.x - this.width + margin) * 6;
      ay += Math.max(0, margin - fish.y) * 6 - Math.max(0, fish.y - this.height + margin) * 6;
      let nx = fish.vx + ax * dt;
      let ny = fish.vy + ay * dt;
      const limit = MAX_SPEED * speed;
      const next = Math.hypot(nx, ny);
      if (next > limit) {
        nx *= limit / next;
        ny *= limit / next;
      }
      this.nextVelocity[i * 2] = nx;
      this.nextVelocity[i * 2 + 1] = ny;
    }

    for (let i = 0; i < this.fish.length; i += 1) {
      const fish = this.fish[i]!;
      fish.vx = this.nextVelocity[i * 2]!;
      fish.vy = this.nextVelocity[i * 2 + 1]!;
      fish.x += fish.vx * dt;
      fish.y += fish.vy * dt;
    }
    // No two fish overlap, the living or the dead; the bubbles, resolved after, still win.
    this.separate(scale);
    for (let i = 0; i < this.fish.length; i += 1) {
      const fish = this.fish[i]!;
      const wasDying = fish.life.dying;
      if (wasDying) {
        // A body held still (shut in a cavity of the raft) for a few seconds slips through, so none is left behind.
        fish.stuck = Math.hypot(fish.vx, fish.vy) < 4 ? fish.stuck + dt : 0;
      }
      // The dead cannot pass through the bubbles either, but may fall off the bottom of the field.
      if (!wasDying || fish.stuck < 3) obstacles.resolve(fish, scale, !wasDying);
      // A page's bubble that swelled or traded places came far over it in one step: crushed. (Swimming into a
      // bubble comes a few px over it at most; a travelling portion sweeping past does not count.)
      if (!wasDying && lifeParameters.enabled >= 0.5 && lifeParameters.crushDistance > 0 && obstacles.pagePush > lifeParameters.crushDistance) {
        kill(fish.life, fish.vx, fish.vy);
        this.deaths.crushed += 1;
        attention.release(fish);
      }
    }
    // Once more, now that the bubbles have pushed some fish together, and the bubbles again for those it moved.
    if (this.separate(scale, 1)) {
      for (let i = 0; i < this.fish.length; i += 1) {
        const fish = this.fish[i]!;
        if (this.moved[i]) obstacles.resolve(fish, scale, !fish.life.dying);
      }
    }
    // The sunk leave the school once wholly off the bottom of the screen.
    const below = this.height + ((TAIL + MOUTH) * scale + 8);
    let kept = 0;
    for (const fish of this.fish) {
      if (fish.life.dying && fish.y > below) {
        this.departed += 1;
        continue;
      }
      this.fish[kept] = fish;
      kept += 1;
    }
    this.fish.length = kept;
  }

  /**
   * Pushes apart fish whose bodies overlap. Each body is a capsule matching
   * the drawn fish seen from above — a segment along its heading from just
   * behind the mouth to the base of the tail, as wide as the body with its
   * side fins — so fish touch only where they are drawn touching (a circle
   * round each would hold them apart at the sides and let them overlap nose to
   * tail). Overlaps are shared equally, and the part of their velocities that
   * closes them stops; two sweeps over the 64 px buckets (step()'s own, rebuilt here).
   */
  private separate(scale: number, sweeps = 2) {
    const count = this.fish.length;
    this.moved.fill(0, 0, count);
    if (count < 2) return false;
    let any = false;
    const radius = BODY_RADIUS * scale;
    const front = BODY_FRONT * scale;
    const back = BODY_BACK * scale;
    const reach = 2 * (Math.max(front, back) + radius);
    const reach2 = reach * reach;
    const centres = this.centres;
    const columns = this.bucketColumns;
    const rows = this.heads.length / columns;
    for (let sweep = 0; sweep < sweeps; sweep += 1) {
      // Bodies: each fish's segment ends, and its bucket.
      this.heads.fill(-1);
      for (let i = 0; i < count; i += 1) {
        const fish = this.fish[i]!;
        const cos = Math.cos(fish.facing);
        const sin = Math.sin(fish.facing);
        const at = i * 4;
        this.segments[at] = fish.x + cos * front;
        this.segments[at + 1] = fish.y + sin * front;
        this.segments[at + 2] = fish.x - cos * back;
        this.segments[at + 3] = fish.y - sin * back;
        centres[i * 2] = fish.x;
        centres[i * 2 + 1] = fish.y;
        const bucket = this.bucketOf(fish.x, fish.y, columns, rows);
        this.next[i] = this.heads[bucket]!;
        this.heads[bucket] = i;
      }
      let moved = false;
      for (let i = 0; i < count; i += 1) {
        const fish = this.fish[i]!;
        const bx = Math.min(columns - 1, Math.max(0, Math.floor(fish.x / FISH_BUCKET)));
        const by = Math.min(rows - 1, Math.max(0, Math.floor(fish.y / FISH_BUCKET)));
        for (let y = Math.max(0, by - 1); y <= Math.min(rows - 1, by + 1); y += 1) {
          for (let x = Math.max(0, bx - 1); x <= Math.min(columns - 1, bx + 1); x += 1) {
            for (let j = this.heads[y * columns + x]!; j !== -1; j = this.next[j]!) {
              // Each pair once. A bucket's chain runs from its highest index down (fish are pushed in index
              // order), so after the first j ≤ i none is left above i.
              if (j <= i) break;
              const cx = centres[j * 2]! - centres[i * 2]!;
              const cy = centres[j * 2 + 1]! - centres[i * 2 + 1]!;
              if (cx * cx + cy * cy > reach2) continue;
              if (!closestBetween(this.segments, i * 4, j * 4, this.closest)) continue;
              const dx = this.closest[2]! - this.closest[0]!;
              const dy = this.closest[3]! - this.closest[1]!;
              const distance = Math.hypot(dx, dy);
              const overlap = 2 * radius - distance;
              if (overlap <= 0) continue;
              // Coincident: part along the line between the centres, or a direction of their own.
              const other = this.fish[j]!;
              let nx = dx / distance;
              let ny = dy / distance;
              if (!(distance > 1e-4)) {
                const centre = Math.hypot(cx, cy);
                const angle = unit(fish.seed, other.seed) * Math.PI * 2;
                nx = centre > 1e-4 ? cx / centre : Math.cos(angle);
                ny = centre > 1e-4 ? cy / centre : Math.sin(angle);
              }
              const half = overlap / 2;
              fish.x -= nx * half;
              fish.y -= ny * half;
              other.x += nx * half;
              other.y += ny * half;
              centres[i * 2] = fish.x;
              centres[i * 2 + 1] = fish.y;
              centres[j * 2] = other.x;
              centres[j * 2 + 1] = other.y;
              const closing = (other.vx - fish.vx) * nx + (other.vy - fish.vy) * ny;
              if (closing < 0) {
                fish.vx += 0.5 * closing * nx;
                fish.vy += 0.5 * closing * ny;
                other.vx -= 0.5 * closing * nx;
                other.vy -= 0.5 * closing * ny;
              }
              moved = true;
              this.moved[i] = 1;
              this.moved[j] = 1;
            }
          }
        }
      }
      if (!moved) break;
      any = true;
    }
    return any;
  }

  private bucketOf(x: number, y: number, columns: number, rows: number) {
    const column = Math.min(columns - 1, Math.max(0, Math.floor(x / FISH_BUCKET)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(y / FISH_BUCKET)));
    return row * columns + column;
  }

  /** Every `waveEvery` seconds, as many fish as have gone swim in from the edges. */
  private wave(seconds: number, parameters: LifeParameters) {
    this.sinceWave += seconds;
    if (this.sinceWave < parameters.waveEvery) return;
    this.sinceWave = 0;
    this.fill(false);
  }

  /** Smallest clearance between any fish centre and any drawn disc, minus that disc's radius (test aid). */
  deepestOverlap() {
    const { discs, count } = this.obstacles;
    let worst = Infinity;
    for (const fish of this.fish) {
      for (let bubble = 0; bubble < count; bubble += 1) {
        const r = discs[bubble * 4 + 2]!;
        if (r <= 0) continue;
        const gap = Math.hypot(fish.x - discs[bubble * 4]!, fish.y - discs[bubble * 4 + 1]!) - r;
        worst = Math.min(worst, gap);
      }
    }
    return worst;
  }
}
