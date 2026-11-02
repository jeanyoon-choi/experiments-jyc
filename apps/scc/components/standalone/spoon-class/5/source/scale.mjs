// Deliberately self-contained: stringified into the game document after the
// upstream engine script and before the Runner is constructed.
//
// /4 enlarges the obstacles and strengthens the jump to match. Both obstacle
// types grow by OBSTACLE_SCALE with their collision boxes, standing on the
// same ground line (bottom at y = 140). Under lighter gravity the jump rises
// higher (the baby's head peaks at y ≈ −3 instead of 5) and floats longer, so
// a held jump keeps the runner's collision boxes above a large obstacle's top
// for 25 frames, against the source jump's 23 above the source obstacle; the
// widest group still leaves about the source's margin at the starting speed.
export function installScale(window) {
  const OBSTACLE_SCALE = 1.3;
  const JUMP = {
    INIITAL_JUMP_VELOCITY: -9.25,
    GRAVITY: 0.4,
    DROP_VELOCITY: -4,
    MAX_JUMP_HEIGHT: 20,
    MIN_JUMP_HEIGHT: 39,
  };
  const Runner = window.Runner;
  const Obstacle = Runner && Runner.spoonClassObstacle;
  const Trex = Runner && Runner.spoonClassTrex;
  if (!Obstacle || !Trex || !Obstacle.types) return;

  for (const type of Obstacle.types) {
    const bottom = type.yPos + type.height;
    const width = Math.round(type.width * OBSTACLE_SCALE);
    const height = Math.round(type.height * OBSTACLE_SCALE);
    const sx = width / type.width;
    const sy = height / type.height;
    type.collisionBoxes = type.collisionBoxes.map(
      (box) => new box.constructor(Math.round(box.x * sx), Math.round(box.y * sy), Math.round(box.width * sx), Math.round(box.height * sy)),
    );
    type.width = width;
    type.height = height;
    type.yPos = bottom - height;
  }
  Object.assign(Trex.config, JUMP);
}
