// Eight upstream Runner worlds advanced together. The constants, jump,
// obstacle, gap, cloud, ground and collision rules are those of the pinned
// dino.html (see source/); only the crash changes: a hit never ends the run.
// The runner lies down for STUN_DURATION while its world stands still, then
// gets up and runs on, so every hit costs one second of distance.

export const GAME_HEIGHT = 150;
const DEFAULT_WIDTH = 600;
const FPS = 60;
const MS_PER_FRAME = 1000 / FPS;

export const RACER_COUNT = 8;
// A hit costs this much running time.
export const STUN_DURATION = 1000;
// Distances closer than this share a place.
const TIE_DISTANCE = 0.01;
// Where a runner stands follows its rank: the middle rank at the middle of
// the row, first at the right, last at the left, evenly between. Tied runners
// share the mean of their ranks, so a field without hits stands in the middle.
// Runners walk to a new place gradually and stay where they fell while hurt.
const MIN_X = 8;
const PLACE_TIME = 600;
// Obstacles first appear this far ahead of the runner, as upstream (x=50).
const UPSTREAM_X = 50;
// 수학의 정석 standing upright side by side, spines out: every obstacle.
// The spine photograph is 104×1000, so a 50-high book is 5.2 thick.
export const BOOK = { HEIGHT: 50, THICKNESS: 5.2, GROUND: 140 };
// Hidden tabs can return one very long frame; the world advances at most this.
const MAX_DELTA = 1000 / 15;

const RUNNER = {
  ACCELERATION: 0.001,
  BOTTOM_PAD: 10,
  CLEAR_TIME: 3000,
  GAP_COEFFICIENT: 0.6,
  MAX_SPEED: 12,
  MOBILE_SPEED_COEFFICIENT: 1.2,
  SPEED: 6,
};

export const TREX = {
  DROP_VELOCITY: -5,
  GRAVITY: 0.6,
  HEIGHT: 47,
  INITIAL_JUMP_VELOCITY: -10,
  INTRO_DURATION: 1500,
  MAX_JUMP_HEIGHT: 30,
  MIN_JUMP_HEIGHT: 30,
  SPEED_DROP_COEFFICIENT: 3,
  WIDTH: 44,
};
const GROUND_Y = GAME_HEIGHT - TREX.HEIGHT - RUNNER.BOTTOM_PAD;
const MIN_JUMP_Y = GROUND_Y - TREX.MIN_JUMP_HEIGHT;

// Sprite-sheet x of each pose, and frame timing, from Trex.animFrames.
export const POSE = { jump: 0, still: 44, runLeft: 88, runRight: 132, crashed: 220 };
const RUN_FRAMES = [POSE.runLeft, POSE.runRight];
const RUN_MS_PER_FRAME = 1000 / 12;

type Box = { x: number; y: number; width: number; height: number };

// The /3 human's own outline (head, torso with arms, legs), not the T-rex
// boxes: a hit is exactly where the drawn human touches a book.
const TREX_BOXES: Box[] = [
  { x: 16, y: 6, width: 10, height: 11 },
  { x: 8, y: 19, width: 26, height: 10 },
  { x: 14, y: 19, width: 14, height: 16 },
  { x: 15, y: 34, width: 13, height: 10 },
];

// Every obstacle is a row of 수학의 정석.
export type ObstacleKind = "books";

const OBSTACLE_TYPES: {
  kind: ObstacleKind;
  width: number;
  multipleSpeed: number;
  minGap: number;
}[] = [
  {
    kind: "books",
    width: BOOK.THICKNESS,
    // As the small cactus: wider rows of books from the first obstacles on.
    multipleSpeed: 3,
    minGap: 120,
  },
];
const MAX_GAP_COEFFICIENT = 1.5;
const MAX_OBSTACLE_LENGTH = 3;

export const CLOUD = {
  HEIGHT: 14,
  MAX_CLOUD_GAP: 400,
  MAX_SKY_LEVEL: 30,
  MIN_CLOUD_GAP: 100,
  MIN_SKY_LEVEL: 71,
  WIDTH: 46,
};
const CLOUD_FREQUENCY = 0.5;
const MAX_CLOUDS = 6;
const BG_CLOUD_SPEED = 0.2;

export const HORIZON = { WIDTH: 600, HEIGHT: 12, YPOS: 127 };
const BUMP_THRESHOLD = 0.5;

export type Obstacle = {
  kind: ObstacleKind;
  typeWidth: number;
  height: number;
  size: number;
  x: number;
  y: number;
  width: number;
  gap: number;
  boxes: Box[];
  followingCreated: boolean;
  // The obstacle this runner already fell over; it is passed through.
  struck: boolean;
  // Books standing left to right: 실력 or 기본 edition.
  books: { basic: boolean }[];
};

export type Cloud = { x: number; y: number; gap: number };

export type Racer = {
  id: number;
  distance: number;
  speed: number;
  runningTime: number;
  x: number;
  y: number;
  jumping: boolean;
  jumpVelocity: number;
  reachedMinHeight: boolean;
  speedDrop: boolean;
  frame: number;
  frameTimer: number;
  stun: number;
  // Where its rank puts it.
  place: number;
  hits: number;
  horizonX: [number, number];
  horizonSource: [number, number];
  clouds: Cloud[];
  obstacles: Obstacle[];
};

export type Race = {
  width: number;
  // Widest on-screen spread between the last and the first runner.
  started: boolean;
  age: number;
  racers: Racer[];
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Runner.setSpeed: smaller worlds run proportionally slower.
function startSpeed(width: number) {
  if (width >= DEFAULT_WIDTH) return RUNNER.SPEED;
  return Math.min(
    RUNNER.SPEED,
    (RUNNER.SPEED * width * RUNNER.MOBILE_SPEED_COEFFICIENT) / DEFAULT_WIDTH,
  );
}

function makeCloud(width: number): Cloud {
  return {
    x: width,
    y: randomInt(CLOUD.MAX_SKY_LEVEL, CLOUD.MIN_SKY_LEVEL),
    gap: randomInt(CLOUD.MIN_CLOUD_GAP, CLOUD.MAX_CLOUD_GAP),
  };
}

function makeObstacle(width: number, speed: number): Obstacle {
  const type = OBSTACLE_TYPES[randomInt(0, OBSTACLE_TYPES.length - 1)];
  let size = randomInt(1, MAX_OBSTACLE_LENGTH);
  if (size > 1 && type.multipleSpeed > speed) size = 1;
  // Upstream sizes 1–3 become rows of 3, 5 or 7 books, one block each.
  const books = Array.from({ length: 1 + size * 2 }, () => ({
    basic: Math.random() < 0.5,
  }));
  const obstacleWidth = Math.round(books.length * BOOK.THICKNESS);
  const minGap = Math.round(
    obstacleWidth * speed + type.minGap * RUNNER.GAP_COEFFICIENT,
  );
  return {
    kind: type.kind,
    typeWidth: obstacleWidth,
    height: BOOK.HEIGHT,
    size: 1,
    x: width - obstacleWidth,
    y: BOOK.GROUND - BOOK.HEIGHT,
    width: obstacleWidth,
    gap: randomInt(minGap, Math.round(minGap * MAX_GAP_COEFFICIENT)),
    boxes: [{ x: 0, y: 0, width: obstacleWidth, height: BOOK.HEIGHT }],
    followingCreated: false,
    struck: false,
    books,
  };
}

function makeRacer(id: number, width: number): Racer {
  return {
    id,
    distance: 0,
    speed: startSpeed(width),
    runningTime: 0,
    x: 0,
    y: GROUND_Y,
    jumping: false,
    jumpVelocity: 0,
    reachedMinHeight: false,
    speedDrop: false,
    frame: 0,
    frameTimer: 0,
    stun: 0,
    place: middleFor(width),
    hits: 0,
    horizonX: [0, HORIZON.WIDTH],
    horizonSource: [0, HORIZON.WIDTH],
    clouds: [makeCloud(width)],
    obstacles: [],
  };
}

function middleFor(width: number) {
  return Math.round(width / 2 - TREX.WIDTH / 2);
}

// The runner blinks while it passes back through the obstacle it fell over.
export function isRecovering(racer: Racer) {
  return (
    racer.stun === 0 &&
    racer.obstacles.some(
      (obstacle) => obstacle.struck && obstacle.x + obstacle.width > racer.x,
    )
  );
}

export function createRace(width: number): Race {
  const racers = Array.from({ length: RACER_COUNT }, (_, id) =>
    makeRacer(id, width),
  );
  return {
    width,
    started: false,
    age: 0,
    racers,
  };
}

export function resizeRace(race: Race, width: number) {
  race.width = width;
  if (race.started) return;
  for (const racer of race.racers) racer.speed = startSpeed(width);
}

function boxesTouch(a: Box, b: Box) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.height + a.y > b.y
  );
}

// checkForCollision, without the debug drawing.
function collides(obstacle: Obstacle, racer: Racer) {
  const trexBox = {
    x: racer.x + 1,
    y: racer.y + 1,
    width: TREX.WIDTH - 2,
    height: TREX.HEIGHT - 2,
  };
  const obstacleBox = {
    x: obstacle.x + 1,
    y: obstacle.y + 1,
    width: obstacle.typeWidth * obstacle.size - 2,
    height: obstacle.height - 2,
  };
  if (!boxesTouch(trexBox, obstacleBox)) return false;
  for (const trexPart of TREX_BOXES) {
    for (const obstaclePart of obstacle.boxes) {
      if (
        boxesTouch(
          { ...trexPart, x: trexPart.x + trexBox.x, y: trexPart.y + trexBox.y },
          {
            ...obstaclePart,
            x: obstaclePart.x + obstacleBox.x,
            y: obstaclePart.y + obstacleBox.y,
          },
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export function startJump(racer: Racer) {
  if (racer.jumping || racer.stun > 0) return false;
  racer.jumping = true;
  racer.jumpVelocity = TREX.INITIAL_JUMP_VELOCITY;
  racer.reachedMinHeight = false;
  racer.speedDrop = false;
  racer.frame = 0;
  racer.frameTimer = 0;
  return true;
}

export function endJump(racer: Racer) {
  if (racer.reachedMinHeight && racer.jumpVelocity < TREX.DROP_VELOCITY) {
    racer.jumpVelocity = TREX.DROP_VELOCITY;
  }
}

export function setSpeedDrop(racer: Racer, active: boolean) {
  if (!active) {
    racer.speedDrop = false;
    return;
  }
  if (!racer.jumping) return;
  racer.speedDrop = true;
  racer.jumpVelocity = 1;
}

function land(racer: Racer) {
  racer.y = GROUND_Y;
  racer.jumpVelocity = 0;
  racer.jumping = false;
  racer.speedDrop = false;
  racer.frame = 0;
  racer.frameTimer = 0;
}

function updateJump(racer: Racer, deltaTime: number) {
  const framesElapsed = deltaTime / MS_PER_FRAME;
  racer.y += Math.round(
    racer.jumpVelocity *
      (racer.speedDrop ? TREX.SPEED_DROP_COEFFICIENT : 1) *
      framesElapsed,
  );
  racer.jumpVelocity += TREX.GRAVITY * framesElapsed;
  if (racer.y < MIN_JUMP_Y || racer.speedDrop) racer.reachedMinHeight = true;
  if (racer.y < TREX.MAX_JUMP_HEIGHT || racer.speedDrop) endJump(racer);
  if (racer.y > GROUND_Y) land(racer);
}

function updateHorizon(racer: Racer, deltaTime: number, width: number) {
  const increment = Math.floor(racer.speed * (FPS / 1000) * deltaTime);
  const line = racer.horizonX[0] <= 0 ? 0 : 1;
  const other = line === 0 ? 1 : 0;
  racer.horizonX[line] -= increment;
  racer.horizonX[other] = racer.horizonX[line] + HORIZON.WIDTH;
  if (racer.horizonX[line] <= -HORIZON.WIDTH) {
    racer.horizonX[line] += HORIZON.WIDTH * 2;
    racer.horizonX[other] = racer.horizonX[line] - HORIZON.WIDTH;
    racer.horizonSource[line] =
      Math.random() > BUMP_THRESHOLD ? HORIZON.WIDTH : 0;
  }

  const cloudStep = Math.ceil(
    (BG_CLOUD_SPEED / 1000) * deltaTime * racer.speed,
  );
  for (const cloud of racer.clouds) cloud.x -= cloudStep;
  const lastCloud = racer.clouds[racer.clouds.length - 1];
  if (
    racer.clouds.length < MAX_CLOUDS &&
    lastCloud &&
    width - lastCloud.x > lastCloud.gap &&
    CLOUD_FREQUENCY > Math.random()
  ) {
    racer.clouds.push(makeCloud(width));
  }
  racer.clouds = racer.clouds.filter((cloud) => cloud.x + CLOUD.WIDTH > 0);
}

function updateObstacles(racer: Racer, deltaTime: number, width: number) {
  const step = Math.floor(((racer.speed * FPS) / 1000) * deltaTime);
  for (const obstacle of racer.obstacles) obstacle.x -= step;
  racer.obstacles = racer.obstacles.filter(
    (obstacle) => obstacle.x + obstacle.width > 0,
  );
  const last = racer.obstacles[racer.obstacles.length - 1];
  if (!last) {
    racer.obstacles.push(makeObstacle(width, racer.speed));
  } else if (
    !last.followingCreated &&
    last.x + last.width + last.gap < width
  ) {
    racer.obstacles.push(makeObstacle(width, racer.speed));
    last.followingCreated = true;
  }
}

function updateRacer(race: Race, racer: Racer, deltaTime: number) {
  if (racer.stun > 0) {
    racer.stun = Math.max(0, racer.stun - deltaTime);
    return false;
  }

  racer.x += (racer.place - racer.x) * (1 - Math.exp(-deltaTime / PLACE_TIME));
  if (racer.jumping) updateJump(racer, deltaTime);
  racer.runningTime += deltaTime;
  const hasObstacles = racer.runningTime > RUNNER.CLEAR_TIME;
  updateHorizon(racer, deltaTime, race.width);
  // Obstacles appear as far ahead as upstream, beyond the edge if need be.
  if (hasObstacles) {
    updateObstacles(
      racer,
      deltaTime,
      Math.max(race.width, race.width + racer.x - UPSTREAM_X),
    );
  }

  // Every obstacle is checked: upstream checks only the first, which is
  // enough with the runner at x=50, but a runner further right meets the
  // next obstacle while the one it passed is still on screen.
  const ahead = racer.obstacles.find(
    (obstacle) => !obstacle.struck && collides(obstacle, racer),
  );
  if (hasObstacles && ahead) {
    ahead.struck = true;
    racer.hits += 1;
    racer.stun = STUN_DURATION;
    land(racer);
    return true;
  }

  racer.distance += (racer.speed * deltaTime) / MS_PER_FRAME;
  if (racer.speed < RUNNER.MAX_SPEED) racer.speed += RUNNER.ACCELERATION;
  if (!racer.jumping) {
    racer.frameTimer += deltaTime;
    if (racer.frameTimer >= RUN_MS_PER_FRAME) {
      racer.frame = (racer.frame + 1) % RUN_FRAMES.length;
      racer.frameTimer = 0;
    }
  }
  return false;
}

function placeRacers(race: Race) {
  const byDistance = [...race.racers].sort((a, b) => b.distance - a.distance);
  const middle = middleFor(race.width);
  const reach = middle - MIN_X;
  let start = 0;
  while (start < byDistance.length) {
    let end = start + 1;
    while (
      end < byDistance.length &&
      byDistance[start].distance - byDistance[end].distance < TIE_DISTANCE
    ) {
      end += 1;
    }
    // 0 for first, 1 for last; ties share their mean.
    const position = (start + end - 1) / 2 / Math.max(1, byDistance.length - 1);
    for (let index = start; index < end; index += 1) {
      byDistance[index].place = middle + (1 - 2 * position) * reach;
    }
    start = end;
  }
}

// Advances every world and places the runners by rank. Each keeps its row.
// Returns the racers hit this frame.
export function stepRace(race: Race, rawDeltaTime: number) {
  const hit: Racer[] = [];
  const deltaTime = Math.min(MAX_DELTA, Math.max(0, rawDeltaTime));
  if (race.started) {
    race.age += deltaTime;
    for (const racer of race.racers) {
      if (updateRacer(race, racer, deltaTime)) hit.push(racer);
    }
    placeRacers(race);
  }
  return hit;
}

export function racerPose(racer: Racer, started: boolean) {
  if (racer.stun > 0) return POSE.crashed;
  if (!started) return POSE.still;
  if (racer.jumping) return POSE.jump;
  return RUN_FRAMES[racer.frame];
}
