// A pool table with no pockets, in metres, z up, origin at the middle of the cloth. Nothing is
// struck: the table is tipped, and the balls roll downhill, into the rails and into each other.
// The balls are larger than life, larger still than pool/1's, and the rail's height is scaled with
// them. There are no cushions: the cloth lies sunk between four wooden rails and runs to their feet.
// x runs across the short side, y along the long side. The table's outer edge is the screen's
// edge, so the playing length follows the screen's proportions.

/** How much larger than a regulation 57.15 mm ball. */
const BALL_SCALE = 2.2;
export const BALL_R = 0.028575 * BALL_SCALE;
/** Across the short side, outer edge to outer edge: pool/1's table. */
export const TABLE_W = 1.069;
/** The width of each wooden rail, from the cloth to the table's outer edge. */
export const RAIL = 0.068;
/** Rail to rail across the short side. */
export const PLAY_W = TABLE_W - RAIL * 2;
/** How far the cloth lies below the rails' tops. */
export const RAIL_TOP = 0.044 * BALL_SCALE;
export const MAX_SPEED = 6.5;

/**
 * Gravity on this table, a fifth of the real thing. Every force scales with it (the slope's pull,
 * the cloth's grip, its rolling resistance), so the balls move exactly as real ones would, played
 * back 2.2 times slower: a table two metres long has to be watched on a screen a hand wide.
 */
export const G = 9.81 / 5;
const MU_SLIDE = 0.2;
const MU_ROLL = 0.022;
/** No ball travels further than this in one step, so none can pass through another or a rail. */
const MAX_TRAVEL = BALL_R * 0.2;
const MIN_STEPS = 2;
const MAX_STEPS = 24;
/** Passes over the contacts in one step: a tipped table gathers every ball into one heap. */
const CONTACT_PASSES = 8;
const BALL_BOUNCE = 0.95;
/** Cloth over wood gives back less than rubber. */
const RAIL_BOUNCE = 0.55;
const REST_SPEED = 0.004;

export type Ball = {
  /** 0 is the cue ball, 1–15 the object balls. */
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Angular velocity about x and y, rad/s. */
  wx: number;
  wy: number;
  /** Orientation quaternion. */
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  /** Leaning on a neighbour this step rather than striking it. */
  held: boolean;
  /** Where the step found it. */
  fromX: number;
  fromY: number;
};

export const HIT_BALL = 0;
export const HIT_CUSHION = 1;
/** Something the table heard: what struck, how fast (m/s), and which balls (`b` is -1 for a rail). */
export type Hit = { kind: number; speed: number; a: number; b: number };
/** Impacts softer than this are not heard. */
const HEARD = 0.03;

export type Table = {
  length: number;
  balls: Ball[];
  /** Gravity as the table feels it (m/s²), set by the caller before each advance: along the cloth, and into it. */
  gx: number;
  gy: number;
  gn: number;
  /** The furthest any ball travelled in one step of the last advance (m). */
  stir: number;
  /** Impacts since the caller last emptied this list (it keeps at most 48). */
  hits: Hit[];
};

// Standard eight-ball rack: the 8 in the middle of the third row, a solid and a stripe at the back corners.
const LOOSE = 0.0008;
const RACK = [1, 9, 2, 10, 8, 3, 4, 14, 7, 11, 12, 6, 15, 13, 5];

function place(ball: Ball, x: number, y: number) {
  // Every ball is set down face up, the right way round for the player.
  Object.assign(ball, { x, y, vx: 0, vy: 0, wx: 0, wy: 0, qx: 0, qy: 0, qz: 0, qw: 1, held: false, fromX: x, fromY: y });
}

function rack(table: Table) {
  const gap = BALL_R * 2 + 0.0006;
  const rowStep = gap * Math.sin(Math.PI / 3);
  // The rack's middle, not its front ball, sits a quarter of the way down the table.
  const foot = table.length / 4 - rowStep * 2;
  place(table.balls[0], 0, -table.length / 4);
  let n = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let i = 0; i <= row; i += 1) {
      // No rack is perfect: each ball sits a fraction of a millimetre off its place.
      const off = ((n * 7919) % 13) / 13 - 0.5;
      const off2 = ((n * 104729) % 11) / 11 - 0.5;
      place(table.balls[RACK[n]], (i - row / 2) * gap + off * LOOSE, foot + row * rowStep + off2 * LOOSE);
      n += 1;
    }
  }
}

export function createTable(length: number): Table {
  const balls = Array.from({ length: 16 }, (_, id) => ({ id }) as Ball);
  const table: Table = { length, balls, gx: 0, gy: 0, gn: G, stir: 0, hits: [] };
  rack(table);
  return table;
}

/**
 * Tips the table: gravity along the cloth and into it, in m/s². A mobile jerked sideways pulls
 * harder than gravity for a moment; no more than twice gravity is taken.
 */
export function tip(table: Table, gx: number, gy: number, gn: number) {
  const size = Math.hypot(gx, gy);
  const scale = size > G * 2 ? (G * 2) / size : 1;
  table.gx = gx * scale;
  table.gy = gy * scale;
  table.gn = Math.min(G * 2, Math.max(0, gn));
}

/** A rolling ball takes 5/7 of the slope's pull; below this pull the cloth holds a resting ball where it is. */
function hold(table: Table) {
  return (MU_ROLL * table.gn * 7) / 5;
}

/** Whether the slope is steep enough to start a resting ball. */
export function isTipped(table: Table) {
  return Math.hypot(table.gx, table.gy) > hold(table);
}

export function isMoving(table: Table) {
  for (const ball of table.balls) {
    if (ball.vx !== 0 || ball.vy !== 0 || ball.wx !== 0 || ball.wy !== 0) return true;
  }
  return false;
}

function turn(ball: Ball, dt: number) {
  const { wx, wy, qx, qy, qz, qw } = ball;
  if (wx === 0 && wy === 0) return;
  const h = dt / 2;
  const x = qx + h * (wx * qw + wy * qz);
  const y = qy + h * (wy * qw - wx * qz);
  const z = qz + h * (wx * qy - wy * qx);
  const w = qw - h * (wx * qx + wy * qy);
  const n = 1 / Math.hypot(x, y, z, w);
  ball.qx = x * n;
  ball.qy = y * n;
  ball.qz = z * n;
  ball.qw = w * n;
}

// The slope pulls at the ball's centre; cloth friction acts at the contact point, in proportion to
// how hard gravity presses the ball on the cloth (`gn`). While the contact point slips the ball
// slides and its spin changes; once it stops slipping the ball rolls, keeping 5/7 of the slope's
// pull, and only rolling resistance is left. On a table stood on its edge nothing presses the ball
// down, and it falls without turning.
function roll(ball: Ball, dt: number, gx: number, gy: number, gn: number, tipped: boolean) {
  const r = BALL_R;
  ball.vx += gx * dt;
  ball.vy += gy * dt;
  const ux = ball.vx - r * ball.wy;
  const uy = ball.vy + r * ball.wx;
  const slip = Math.hypot(ux, uy);
  const grip = 3.5 * MU_SLIDE * gn * dt;
  if (slip > grip) {
    const ax = (-MU_SLIDE * gn * ux) / slip;
    const ay = (-MU_SLIDE * gn * uy) / slip;
    ball.vx += ax * dt;
    ball.vy += ay * dt;
    ball.wx += (2.5 / r) * ay * dt;
    ball.wy -= (2.5 / r) * ax * dt;
    return;
  }
  if (slip > 0) {
    // The last of the slip goes this step: 2/7 of it comes off the velocity, the rest off the spin.
    ball.vx -= (ux * 2) / 7;
    ball.vy -= (uy * 2) / 7;
  }
  const speed = Math.hypot(ball.vx, ball.vy);
  const next = speed - MU_ROLL * gn * dt;
  // On a slope that can start it again, a ball that has slowed to nothing is only turning round.
  if (next <= 0 || (next < REST_SPEED && !tipped)) {
    ball.vx = 0;
    ball.vy = 0;
    ball.wx = 0;
    ball.wy = 0;
    return;
  }
  ball.vx *= next / speed;
  ball.vy *= next / speed;
  ball.wx = -ball.vy / r;
  ball.wy = ball.vx / r;
}

function hear(table: Table, kind: number, speed: number, floor: number, a: number, b: number) {
  if (speed > floor && table.hits.length < 48) table.hits.push({ kind, speed, a, b });
}

/** One rail against one ball: `u` is the rail's inward normal, `over` how far the ball is past it. */
function rail(table: Table, ball: Ball, ux: number, uy: number, over: number, lean: number, floor: number) {
  const r = BALL_R;
  ball.x += ux * over;
  ball.y += uy * over;
  const into = ball.vx * ux + ball.vy * uy;
  if (into >= 0) return;
  // A ball the slope presses on the rail lies against it; one that arrives is thrown back, less
  // the harder it hits.
  const leaning = -into < lean;
  const bounce = leaning ? 0 : RAIL_BOUNCE * (1 - Math.min(0.25, -into * 0.03));
  hear(table, HIT_CUSHION, -into, floor, ball.id, -1);
  ball.vx -= (1 + bounce) * into * ux;
  ball.vy -= (1 + bounce) * into * uy;
  // The rail's cloth grips the ball and turns its roll round with it: the ball leaves rolling
  // along the rebound, and keeps whatever slip it had along the rail.
  const slip = (ball.vx - r * ball.wy) * ux + (ball.vy + r * ball.wx) * uy;
  ball.wy += (slip * ux) / r;
  ball.wx -= (slip * uy) / r;
}

function tick(table: Table, dt: number) {
  const { balls, length, gx, gy, gn } = table;
  const r = BALL_R;
  const pull = Math.hypot(gx, gy);
  const tipped = pull > hold(table);
  // What the slope alone can press two things together by in one step: slower than this is leaning,
  // not striking, and is neither thrown back nor heard.
  const lean = pull * dt * 1.5;
  const floor = HEARD + pull * dt * 3;
  for (const ball of balls) {
    ball.held = false;
    ball.fromX = ball.x;
    ball.fromY = ball.y;
    // A slope too slight to start a ball still bends the path of one already rolling.
    if (tipped || ball.vx !== 0 || ball.vy !== 0 || ball.wx !== 0 || ball.wy !== 0) {
      roll(ball, dt, gx, gy, gn, tipped);
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
    }
  }

  const reach = r * 2;
  const clearX = PLAY_W / 2 - r;
  const clearY = length / 2 - r;
  for (let pass = 0; pass < CONTACT_PASSES; pass += 1) {
    let touched = false;
    for (let i = 0; i < balls.length; i += 1) {
      const a = balls[i];
      const aStill = a.vx === 0 && a.vy === 0;
      for (let j = i + 1; j < balls.length; j += 1) {
        const b = balls[j];
        // Only pairs with one of them moving can have closed.
        if (pass === 0 && aStill && b.vx === 0 && b.vy === 0) continue;
        const nx = b.x - a.x;
        const ny = b.y - a.y;
        if (nx > reach || nx < -reach || ny > reach || ny < -reach) continue;
        const square = nx * nx + ny * ny;
        if (square >= reach * reach || square === 0) continue;
        const distance = Math.sqrt(square);
        const ux = nx / distance;
        const uy = ny / distance;
        const overlap = (reach - distance) / 2;
        a.x -= ux * overlap;
        a.y -= uy * overlap;
        b.x += ux * overlap;
        b.y += uy * overlap;
        touched = true;
        const closing = (a.vx - b.vx) * ux + (a.vy - b.vy) * uy;
        if (closing <= 0) continue;
        // Equal masses, no friction between balls: only the velocity along the line of centres is
        // exchanged. Balls that strike keep their spin (a rolling one follows through, a sliding one
        // stops); balls leaning in a heap do not bounce and do not turn.
        const leaning = closing < lean;
        const impulse = ((1 + (leaning ? 0 : BALL_BOUNCE)) / 2) * closing;
        if (leaning) {
          a.held = true;
          b.held = true;
        } else hear(table, HIT_BALL, closing, floor, a.id, b.id);
        a.vx -= ux * impulse;
        a.vy -= uy * impulse;
        b.vx += ux * impulse;
        b.vy += uy * impulse;
      }
    }
    for (const ball of balls) {
      if (ball.x > clearX) rail(table, ball, -1, 0, ball.x - clearX, lean, floor);
      else if (ball.x < -clearX) rail(table, ball, 1, 0, -clearX - ball.x, lean, floor);
      else if (ball.y <= clearY && ball.y >= -clearY) continue;
      if (ball.y > clearY) rail(table, ball, 0, -1, ball.y - clearY, lean, floor);
      else if (ball.y < -clearY) rail(table, ball, 0, 1, -clearY - ball.y, lean, floor);
      touched = true;
    }
    if (!touched) break;
  }

  for (const ball of balls) {
    if (ball.held && dt > 0) {
      // Held in the heap: it turns only as far as it really travelled this step.
      ball.wx = -(ball.y - ball.fromY) / dt / r;
      ball.wy = (ball.x - ball.fromX) / dt / r;
    }
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > MAX_SPEED) {
      ball.vx *= MAX_SPEED / speed;
      ball.vy *= MAX_SPEED / speed;
    }
    turn(ball, dt);
    const moved = Math.hypot(ball.x - ball.fromX, ball.y - ball.fromY);
    if (moved > table.stir) table.stir = moved;
  }
}

/**
 * Advances by `seconds`, in as many equal steps as the fastest ball needs: two for a table that
 * is nearly at rest, up to twenty-four for balls thrown the length of it. Returns true while
 * anything still moves or the slope could still move it.
 */
export function advance(table: Table, seconds: number) {
  const span = Math.min(seconds, 1 / 30);
  let fastest = 0;
  for (const ball of table.balls) {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > fastest) fastest = speed;
  }
  const steps = Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.ceil((fastest * span) / MAX_TRAVEL)));
  const dt = span / steps;
  const tipped = isTipped(table);
  table.stir = 0;
  let moving = true;
  for (let n = 0; n < steps && moving; n += 1) {
    tick(table, dt);
    moving = tipped || isMoving(table);
  }
  return moving;
}

/** The playing length follows the screen. Each half moves with its spot, so a rack stays a rack. */
export function resize(table: Table, length: number) {
  if (Math.abs(length - table.length) < 1e-6) return;
  const shift = (length - table.length) / 4;
  table.length = length;
  const limit = length / 2 - BALL_R;
  for (const ball of table.balls) ball.y = Math.min(limit, Math.max(-limit, ball.y + Math.sign(ball.y) * shift));
  // A shorter table can press resting balls together; let them part before they next roll.
  if (!isMoving(table)) {
    const { gx, gy } = table;
    table.gx = 0;
    table.gy = 0;
    for (let n = 0; n < 40; n += 1) tick(table, 0);
    table.gx = gx;
    table.gy = gy;
    for (const ball of table.balls) {
      ball.vx = 0;
      ball.vy = 0;
      ball.wx = 0;
      ball.wy = 0;
    }
  }
}
