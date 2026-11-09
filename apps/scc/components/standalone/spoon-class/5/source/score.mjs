// Deliberately self-contained: this function is stringified into the isolated
// game document immediately after the upstream Runner has been created.
//
// The upper-right score is the upstream Chrome distance meter (00000 and the
// HI score), drawn by its own code. Two things are added around it: on a row
// whose sky the host crops (spoonClassClockTop document pixels), the meter
// moves down by the crop so it stays visible; and the time each game has been
// running is published as window.spoonClassAge, which the host's 수명순
// ordering ranks rows by. HI is shared by every game on the page: the best
// score of any game (window.parent.spoonClassHighScore, upstream pixel
// distance, reset when the page mounts) becomes each game's highest score.
export function installScoreMeter(window) {
  const runner = window.Runner && window.Runner.instance_;
  if (!runner || !runner.distanceMeter) return;

  const meter = runner.distanceMeter;
  // The source translates by y and draws at y again, so digits sit at 2y.
  const crop = Math.max(0, Number(window.spoonClassClockTop) || 0);
  meter.y += crop / 2;

  let aliveMilliseconds = 0;
  window.spoonClassAge = 0;
  const update = meter.update;
  meter.update = function updateScore(deltaTime) {
    if (runner.started && !runner.playingIntro && !runner.crashed) {
      aliveMilliseconds += deltaTime;
    }
    window.spoonClassAge = aliveMilliseconds;
    shareHighScore(false);
    return update.apply(this, arguments);
  };

  // Upstream DistanceMeter.dimensions: HI is drawn from x − 100 as eight
  // 11px characters, 13px high, at 2y.
  const host = window.parent && window.parent !== window ? window.parent : window;
  function shareHighScore(redraw) {
    const own = Number(runner.highestScore) || 0;
    let best = 0;
    try {
      best = Number(host.spoonClassHighScore) || 0;
      if (own > best) {
        host.spoonClassHighScore = runner.highestScore;
        return;
      }
    } catch (error) {
      return;
    }
    if (best <= own) return;
    runner.highestScore = best;
    meter.setHighScore(best);
    // A crashed game no longer draws frames: repaint its HI in place.
    if (redraw && meter.canvasCtx) {
      meter.canvasCtx.clearRect(meter.x - 101, 2 * meter.y - 1, 91, 15);
      meter.drawHighScore();
    }
  }
  const gameOver = runner.gameOver;
  runner.gameOver = function gameOverShared() {
    const result = gameOver.apply(this, arguments);
    shareHighScore(false);
    return result;
  };
  if (window.setInterval) {
    window.setInterval(function () {
      if (runner.crashed) shareHighScore(true);
    }, 250);
  }

  const restart = runner.restart;
  runner.restart = function restartScore() {
    aliveMilliseconds = 0;
    window.spoonClassAge = 0;
    return restart.apply(this, arguments);
  };
}
