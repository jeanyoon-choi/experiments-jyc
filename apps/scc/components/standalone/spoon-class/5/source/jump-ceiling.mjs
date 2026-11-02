// Deliberately self-contained: stringified into the game document after the
// upstream Runner has been created.
//
// The /3 host crops sky from short rows. Only the rise of the jump changes:
// the jump is replayed with the source's own per-frame update (60fps steps)
// and the least change that keeps the head below the cropped edge is chosen.
// First the source's max-height threshold is raised; when that is exhausted
// (it acts only once the minimum height is reached) the take-off velocity is
// reduced. Gravity, drop velocity, ground and collision boxes are unchanged.
export function installJumpCeiling(window) {
  const runner = window.Runner && window.Runner.instance_;
  const ceiling = Math.max(0, Number(window.spoonClassJumpCeiling) || 0);
  if (!runner || !runner.tRex || ceiling <= 0) return;

  const trex = runner.tRex;
  const config = trex.config;

  function apex(maxJumpHeight, takeOffVelocity) {
    let y = trex.groundYPos;
    let velocity = takeOffVelocity;
    let reachedMinHeight = false;
    let highest = y;
    for (let frame = 0; frame < 240; frame += 1) {
      y += Math.round(velocity);
      velocity += config.GRAVITY;
      if (y < trex.minJumpHeight) reachedMinHeight = true;
      if (y < maxJumpHeight && reachedMinHeight && velocity < config.DROP_VELOCITY) {
        velocity = config.DROP_VELOCITY;
      }
      highest = Math.min(highest, y);
      if (y > trex.groundYPos) break;
    }
    return highest;
  }

  const velocity = config.INIITAL_JUMP_VELOCITY;
  if (apex(config.MAX_JUMP_HEIGHT, velocity) >= ceiling) return;

  for (let maxJumpHeight = config.MAX_JUMP_HEIGHT; maxJumpHeight <= trex.minJumpHeight; maxJumpHeight += 1) {
    if (apex(maxJumpHeight, velocity) >= ceiling) {
      config.MAX_JUMP_HEIGHT = maxJumpHeight;
      return;
    }
  }

  config.MAX_JUMP_HEIGHT = trex.minJumpHeight;
  for (let takeOff = velocity; takeOff < 0; takeOff += 0.1) {
    if (apex(trex.minJumpHeight, takeOff) >= ceiling) {
      config.INIITAL_JUMP_VELOCITY = takeOff;
      return;
    }
  }
}
