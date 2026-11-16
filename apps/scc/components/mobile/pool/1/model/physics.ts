// A 6 ft pool table in metres, z up, origin at the middle of the cloth. The balls are larger
// than life (the user's call: they need to read on a mobile, not to be regulation), and
// everything a ball meets (pockets, cushion height, rail height) is scaled with them.
// x runs across the short side, y along the long side. The table's outer edge is the screen's
// edge, so the playing length follows the screen's proportions.

/** How much larger than a regulation 57.15 mm ball. */
const BALL_SCALE = 1.3;
export const BALL_R = 0.028575 * BALL_SCALE;
/** Cushion nose to cushion nose across the short side. */
export const PLAY_W = 0.813;
/** Cushion nose to the table's outer edge. */
export const RAIL = 0.115;
/** Cushion nose back to the rail it is glued to. */
export const CUSHION_DEPTH = 0.056;
export const RAIL_TOP = 0.044 * BALL_SCALE;
export const TABLE_W = PLAY_W + RAIL * 2;
export const POCKET_DEPTH = 0.16 * BALL_SCALE;
export const MAX_SPEED = 6.5;

const CORNER_JAW = 0.081 * BALL_SCALE; // jaw point, measured from the cloth's corner along each nose line
const CORNER_FACING = Math.tan((52 * Math.PI) / 180);
const CORNER_OFFSET = 0.015 * BALL_SCALE;
const CORNER_HOLE = 0.058 * BALL_SCALE;
const SIDE_JAW = 0.0635 * BALL_SCALE;
const SIDE_FACING = Math.tan((14 * Math.PI) / 180);
const SIDE_OFFSET = 0.047 * BALL_SCALE;
const SIDE_HOLE = 0.056 * BALL_SCALE;

const G = 9.81;
const MU_SLIDE = 0.2;
const MU_ROLL = 0.022;
const STEP = 1 / 480;
const BALL_BOUNCE = 0.95;
const NOSE_BOUNCE = 0.8;
const FACING_BOUNCE = 0.6;
const REST_SPEED = 0.004;

export const ON_TABLE = 0;
export const FALLING = 1;
export const GONE = 2;

export type Ball = {
  /** 0 is the cue ball, 1–15 the object balls. */
  id: number;
  state: number;
  pocket: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Angular velocity about x and y, rad/s. */
  wx: number;
  wy: number;
  /** Orientation quaternion. */
  qx: number;
  qy: number;
  qz: number;
  qw: number;
};

export type Pocket = { x: number; y: number; radius: number };

/** One strip of cushion: nose from a to b, the outward normal, and how far each end is cut back. */
export type Cushion = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  ox: number;
  oy: number;
  cutA: number;
  cutB: number;
};

type Segment = { ax: number; ay: number; bx: number; by: number; bounce: number };

export type Table = {
  length: number;
  balls: Ball[];
  pockets: Pocket[];
  cushions: Cushion[];
  segments: Segment[];
  carry: number;
};

/** The cushion's back corners at each end, where its facings meet the rail. */
export function cushionBack(c: Cushion) {
  const size = Math.hypot(c.bx - c.ax, c.by - c.ay);
  const tx = (c.bx - c.ax) / size;
  const ty = (c.by - c.ay) / size;
  const d = CUSHION_DEPTH;
  return {
    tx,
    ty,
    ax: c.ax + c.ox * d - tx * c.cutA * d,
    ay: c.ay + c.oy * d - ty * c.cutA * d,
    bx: c.bx + c.ox * d + tx * c.cutB * d,
    by: c.by + c.oy * d + ty * c.cutB * d,
  };
}

function lay(table: Table, length: number) {
  const hw = PLAY_W / 2;
  const hl = length / 2;
  const cushions: Cushion[] = [];
  for (const s of [-1, 1]) {
    cushions.push({ ax: -hw + CORNER_JAW, ay: s * hl, bx: hw - CORNER_JAW, by: s * hl, ox: 0, oy: s, cutA: CORNER_FACING, cutB: CORNER_FACING });
    cushions.push({ ax: s * hw, ay: -hl + CORNER_JAW, bx: s * hw, by: -SIDE_JAW, ox: s, oy: 0, cutA: CORNER_FACING, cutB: SIDE_FACING });
    cushions.push({ ax: s * hw, ay: SIDE_JAW, bx: s * hw, by: hl - CORNER_JAW, ox: s, oy: 0, cutA: SIDE_FACING, cutB: CORNER_FACING });
  }
  const segments: Segment[] = [];
  for (const c of cushions) {
    const back = cushionBack(c);
    segments.push({ ax: c.ax, ay: c.ay, bx: c.bx, by: c.by, bounce: NOSE_BOUNCE });
    segments.push({ ax: c.ax, ay: c.ay, bx: back.ax, by: back.ay, bounce: FACING_BOUNCE });
    segments.push({ ax: c.bx, ay: c.by, bx: back.bx, by: back.by, bounce: FACING_BOUNCE });
  }
  const pockets: Pocket[] = [];
  for (const sy of [-1, 1]) {
    for (const sx of [-1, 1]) {
      pockets.push({ x: sx * (hw + CORNER_OFFSET), y: sy * (hl + CORNER_OFFSET), radius: CORNER_HOLE });
    }
  }
  for (const sx of [-1, 1]) pockets.push({ x: sx * (hw + SIDE_OFFSET), y: 0, radius: SIDE_HOLE });
  table.length = length;
  table.cushions = cushions;
  table.segments = segments;
  table.pockets = pockets;
}

// Standard eight-ball rack: the 8 in the middle of the third row, a solid and a stripe at the back corners.
const RACK = [1, 9, 2, 10, 8, 3, 4, 14, 7, 11, 12, 6, 15, 13, 5];

function place(ball: Ball, x: number, y: number) {
  // A different face up for every ball, the same on every rack.
  const a = ball.id * 2.399963;
  const b = ball.id * 1.324718 + 0.6;
  const half = b / 2;
  Object.assign(ball, {
    state: ON_TABLE,
    pocket: -1,
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    wx: 0,
    wy: 0,
    qx: Math.sin(half) * Math.cos(a),
    qy: Math.sin(half) * Math.sin(a),
    qz: 0,
    qw: Math.cos(half),
  });
}

export function rack(table: Table) {
  const gap = BALL_R * 2 + 0.0003;
  const rowStep = gap * Math.sin(Math.PI / 3);
  const foot = table.length / 4;
  place(table.balls[0], 0, -table.length / 4);
  let n = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let i = 0; i <= row; i += 1) {
      place(table.balls[RACK[n]], (i - row / 2) * gap, foot + row * rowStep);
      n += 1;
    }
  }
  table.carry = 0;
}

export function createTable(length: number): Table {
  const balls = Array.from({ length: 16 }, (_, id) => ({ id }) as Ball);
  const table: Table = { length, balls, pockets: [], cushions: [], segments: [], carry: 0 };
  lay(table, length);
  rack(table);
  return table;
}

export function cueBall(table: Table) {
  return table.balls[0];
}

export function isMoving(table: Table) {
  for (const ball of table.balls) {
    if (ball.state === FALLING) return true;
    if (ball.state === ON_TABLE && (ball.vx !== 0 || ball.vy !== 0 || ball.wx !== 0 || ball.wy !== 0)) return true;
  }
  return false;
}

/** A centre-ball hit along (dx, dy) with power 0–1: the ball leaves sliding and picks up its roll from the cloth. */
export function strike(table: Table, dx: number, dy: number, power: number) {
  const cue = cueBall(table);
  const size = Math.hypot(dx, dy);
  if (cue.state !== ON_TABLE || size === 0) return;
  const speed = MAX_SPEED * Math.min(1, Math.max(0, power));
  cue.vx = (dx / size) * speed;
  cue.vy = (dy / size) * speed;
}

/** Where the cue ball's centre first meets a ball or a cushion line along (dx, dy). */
export function trace(table: Table, dx: number, dy: number) {
  const cue = cueBall(table);
  const size = Math.hypot(dx, dy) || 1;
  const ux = dx / size;
  const uy = dy / size;
  const hw = PLAY_W / 2 - BALL_R;
  const hl = table.length / 2 - BALL_R;
  let best = Infinity;
  if (ux < 0) best = Math.min(best, (-hw - cue.x) / ux);
  if (ux > 0) best = Math.min(best, (hw - cue.x) / ux);
  if (uy < 0) best = Math.min(best, (-hl - cue.y) / uy);
  if (uy > 0) best = Math.min(best, (hl - cue.y) / uy);
  best = Math.max(0, best);
  let hit = false;
  for (const other of table.balls) {
    if (other.id === 0 || other.state !== ON_TABLE) continue;
    const ox = other.x - cue.x;
    const oy = other.y - cue.y;
    const along = ox * ux + oy * uy;
    if (along <= 0) continue;
    const off = ox * ox + oy * oy - along * along;
    const reach = 4 * BALL_R * BALL_R;
    if (off >= reach) continue;
    const t = along - Math.sqrt(reach - off);
    if (t >= 0 && t < best) {
      best = t;
      hit = true;
    }
  }
  return { x: cue.x + ux * best, y: cue.y + uy * best, ball: hit };
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

// Cloth friction acts at the contact point. While that point slips the ball slides and its spin
// changes; once it stops slipping the ball rolls and only rolling resistance is left.
function roll(ball: Ball, dt: number) {
  const r = BALL_R;
  const ux = ball.vx - r * ball.wy;
  const uy = ball.vy + r * ball.wx;
  const slip = Math.hypot(ux, uy);
  const grip = 3.5 * MU_SLIDE * G * dt;
  if (slip > grip) {
    const ax = (-MU_SLIDE * G * ux) / slip;
    const ay = (-MU_SLIDE * G * uy) / slip;
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
  const next = speed - MU_ROLL * G * dt;
  if (next < REST_SPEED) {
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

function fall(table: Table, ball: Ball, dt: number) {
  const pocket = table.pockets[ball.pocket];
  ball.vz -= G * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;
  // The lip lets the ball in as it sinks; below the cloth it is inside the pocket's wall.
  const sunk = Math.min(1, Math.max(0, -ball.z / BALL_R));
  const room = pocket.radius - BALL_R * sunk;
  const dx = ball.x - pocket.x;
  const dy = ball.y - pocket.y;
  const d = Math.hypot(dx, dy);
  if (d > room && d > 0) {
    const nx = dx / d;
    const ny = dy / d;
    ball.x = pocket.x + nx * room;
    ball.y = pocket.y + ny * room;
    const out = ball.vx * nx + ball.vy * ny;
    if (out > 0) {
      ball.vx -= 1.35 * out * nx;
      ball.vy -= 1.35 * out * ny;
    }
  }
  if (ball.z < -POCKET_DEPTH) {
    ball.state = GONE;
    ball.vx = 0;
    ball.vy = 0;
    ball.vz = 0;
    ball.wx = 0;
    ball.wy = 0;
  }
}

function drop(ball: Ball, pocket: number) {
  ball.state = FALLING;
  ball.pocket = pocket;
  ball.vz = 0;
}

function tick(table: Table, dt: number) {
  const { balls, pockets, segments, length } = table;
  const r = BALL_R;
  for (const ball of balls) {
    if (ball.state === GONE) continue;
    if (ball.state === FALLING) fall(table, ball, dt);
    else if (ball.vx !== 0 || ball.vy !== 0 || ball.wx !== 0 || ball.wy !== 0) {
      roll(ball, dt);
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
    }
    turn(ball, dt);
  }

  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i];
    if (a.state !== ON_TABLE) continue;
    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j];
      if (b.state !== ON_TABLE) continue;
      const nx = b.x - a.x;
      const ny = b.y - a.y;
      if (nx > r * 2 || nx < -r * 2 || ny > r * 2 || ny < -r * 2) continue;
      const distance = Math.hypot(nx, ny);
      if (distance >= r * 2 || distance === 0) continue;
      const ux = nx / distance;
      const uy = ny / distance;
      const overlap = (r * 2 - distance) / 2;
      a.x -= ux * overlap;
      a.y -= uy * overlap;
      b.x += ux * overlap;
      b.y += uy * overlap;
      const closing = (a.vx - b.vx) * ux + (a.vy - b.vy) * uy;
      if (closing <= 0) continue;
      // Equal masses, no friction between balls: only the velocity along the line of centres is
      // exchanged, and each ball keeps its spin (so a rolling cue ball follows, a sliding one stops).
      const impulse = ((1 + BALL_BOUNCE) / 2) * closing;
      a.vx -= ux * impulse;
      a.vy -= uy * impulse;
      b.vx += ux * impulse;
      b.vy += uy * impulse;
    }
  }

  const clearX = PLAY_W / 2 - r;
  const clearY = length / 2 - r;
  for (const ball of balls) {
    if (ball.state !== ON_TABLE) continue;
    if (ball.x > -clearX && ball.x < clearX && ball.y > -clearY && ball.y < clearY) continue;
    let dropped = false;
    for (let p = 0; p < pockets.length; p += 1) {
      const pocket = pockets[p];
      if (Math.hypot(ball.x - pocket.x, ball.y - pocket.y) < pocket.radius) {
        drop(ball, p);
        dropped = true;
        break;
      }
    }
    if (dropped) continue;
    for (const s of segments) {
      const ex = s.bx - s.ax;
      const ey = s.by - s.ay;
      const t = Math.min(1, Math.max(0, ((ball.x - s.ax) * ex + (ball.y - s.ay) * ey) / (ex * ex + ey * ey)));
      const nx = ball.x - (s.ax + ex * t);
      const ny = ball.y - (s.ay + ey * t);
      const d = Math.hypot(nx, ny);
      if (d >= r || d === 0) continue;
      const ux = nx / d;
      const uy = ny / d;
      ball.x += ux * (r - d);
      ball.y += uy * (r - d);
      const into = ball.vx * ux + ball.vy * uy;
      if (into >= 0) continue;
      // Rubber gives less back the harder it is hit.
      const bounce = s.bounce * (1 - Math.min(0.25, -into * 0.03));
      ball.vx -= (1 + bounce) * into * ux;
      ball.vy -= (1 + bounce) * into * uy;
      // The nose grips the ball above its centre and turns its roll round with it: the ball
      // leaves rolling along the rebound, and keeps whatever slip it had along the cushion.
      const slip = (ball.vx - r * ball.wy) * ux + (ball.vy + r * ball.wx) * uy;
      ball.wy += (slip * ux) / r;
      ball.wx -= (slip * uy) / r;
    }
    // Nothing leaves the table: a ball squeezed past a jaw belongs to the nearest pocket.
    if (Math.abs(ball.x) > PLAY_W / 2 + CUSHION_DEPTH || Math.abs(ball.y) > length / 2 + CUSHION_DEPTH) {
      let nearest = 0;
      let best = Infinity;
      for (let p = 0; p < pockets.length; p += 1) {
        const d = Math.hypot(ball.x - pockets[p].x, ball.y - pockets[p].y);
        if (d < best) {
          best = d;
          nearest = p;
        }
      }
      ball.x = pockets[nearest].x;
      ball.y = pockets[nearest].y;
      drop(ball, nearest);
    }
  }
}

function free(table: Table, x: number, y: number, self: Ball) {
  for (const other of table.balls) {
    if (other === self || other.state !== ON_TABLE) continue;
    if (Math.hypot(other.x - x, other.y - y) < BALL_R * 2.05) return false;
  }
  return true;
}

/** A pocketed cue ball comes back on the head spot, or the nearest free place beside it. */
function respot(table: Table) {
  const cue = cueBall(table);
  const y = -table.length / 4;
  let x = 0;
  for (let n = 0; n < 14; n += 1) {
    const candidate = Math.ceil(n / 2) * BALL_R * 2.2 * (n % 2 ? 1 : -1);
    if (free(table, candidate, y, cue)) {
      x = candidate;
      break;
    }
  }
  place(cue, x, y);
}

/** Once everything is at rest: a cleared table is racked again, a pocketed cue ball comes back. */
function settle(table: Table) {
  if (table.balls.every((ball) => ball.id === 0 || ball.state === GONE)) rack(table);
  else if (cueBall(table).state === GONE) respot(table);
}

/** Advances by `seconds` in fixed steps. Returns true while anything still moves. */
export function advance(table: Table, seconds: number) {
  table.carry += Math.min(seconds, 1 / 20);
  let moving = true;
  while (table.carry >= STEP) {
    table.carry -= STEP;
    tick(table, STEP);
    moving = isMoving(table);
    if (!moving) {
      table.carry = 0;
      break;
    }
  }
  if (!moving) settle(table);
  return moving;
}

/** The playing length follows the screen. Each half moves with its spot, so a rack stays a rack. */
export function resize(table: Table, length: number) {
  if (Math.abs(length - table.length) < 1e-6) return;
  const shift = (length - table.length) / 4;
  lay(table, length);
  const limit = length / 2 - BALL_R;
  for (const ball of table.balls) {
    if (ball.state !== ON_TABLE) continue;
    ball.y = Math.min(limit, Math.max(-limit, ball.y + Math.sign(ball.y) * shift));
  }
  // A shorter table can press resting balls together; let them part before the next shot.
  if (!isMoving(table)) {
    for (let n = 0; n < 40; n += 1) tick(table, 0);
    for (const ball of table.balls) {
      if (ball.state !== ON_TABLE) continue;
      ball.vx = 0;
      ball.vy = 0;
      ball.wx = 0;
      ball.wy = 0;
    }
  }
}
