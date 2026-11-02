// Deliberately self-contained: stringified into the game document after the
// upstream Runner has been created.
//
// /5 changes what the runner must jump over with the age clock
// (window.spoonClassAge, from life-age.mjs). The stage boundaries come from
// the host page (signs.ts); life-game.mjs composes each stage's sign
// collages on demand. When the age enters a new stage, new obstacles take
// that stage's sprites; obstacles already on the runway keep theirs. A
// restart returns the age, and so the stage, to birth.
export function installLifeStages(window) {
  const runner = window.Runner && window.Runner.instance_;
  if (!runner || !runner.horizon || typeof window.spoonClassStageSprites !== "function") return;
  const YEAR = 2000;
  let current = -1;

  function enter() {
    const years = (Number(window.spoonClassAge) || 0) / YEAR;
    const stage = window.spoonClassStageAt(years);
    if (stage === current) return;
    current = stage;
    const sprites = window.spoonClassStageSprites(stage);
    if (!sprites) return;
    runner.horizon.obstacleImgs.CACTUS_SMALL = sprites.CACTUS_SMALL;
    runner.horizon.obstacleImgs.CACTUS_LARGE = sprites.CACTUS_LARGE;
  }

  const update = runner.update;
  runner.update = function stagedUpdate() {
    enter();
    return update.apply(this, arguments);
  };
}
