// Deliberately self-contained: this function is stringified into the isolated
// game document immediately after the upstream Runner has been created.
export function installLifeAgeMeter(window) {
  const runner = window.Runner && window.Runner.instance_;
  if (!runner || !runner.distanceMeter) return;

  // This is the sole age-speed setting for the fork.
  const MONTHS_PER_SECOND = 6;
  const MONTH_MILLISECONDS = 1000 / MONTHS_PER_SECOND;
  const glyphs = {
    0: ["111", "101", "101", "101", "111"],
    1: ["010", "110", "010", "010", "111"],
    2: ["111", "001", "111", "100", "111"],
    3: ["111", "001", "111", "001", "111"],
    4: ["101", "101", "111", "001", "001"],
    5: ["111", "100", "111", "001", "111"],
    6: ["111", "100", "111", "101", "111"],
    7: ["111", "001", "010", "010", "010"],
    8: ["111", "101", "111", "101", "111"],
    9: ["111", "101", "111", "001", "111"],
    D: ["110", "101", "101", "101", "110"],
    M: ["101", "111", "111", "101", "101"],
    Y: ["101", "101", "010", "010", "010"],
  };
  // /3 draws the clock at 1.5× the shared size so it reads on a phone.
  const pixel = 3;
  const SOURCE_DIGIT_HEIGHT = 13;
  const clockTop = Math.max(0, Number(window.spoonClassClockTop) || 0);
  const advance = pixel * 4;
  let ageMilliseconds = 0;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function ageText() {
    const elapsedMonths = Math.floor(ageMilliseconds / MONTH_MILLISECONDS);
    const years = Math.floor(elapsedMonths / 12);
    const months = elapsedMonths % 12;
    const days = Math.floor(((ageMilliseconds % MONTH_MILLISECONDS) / MONTH_MILLISECONDS) * 30);
    return `${pad(years % 100)}Y ${pad(months)}M ${pad(days)}D`;
  }

  function drawAge(meter) {
    const context = meter.canvasCtx;
    const text = ageText();
    const width = text.length * advance - pixel;
    const x = meter.x + 55 - width;
    const y = meter.y + clockTop;
    context.save();
    // The source runner has already painted `00000` before this adapter is
    // installed. Clear that fixed HUD area too, so birth is legible before
    // the first animation frame.
    context.fillStyle = "#f7f7f7";
    // Cover the source digits drawn before the first update. The source
    // translates by y and then draws at y again, so they span 2y..2y+13.
    context.fillRect(x - 2, meter.y - 1, width + 4, meter.y + SOURCE_DIGIT_HEIGHT + 2);
    // The host crops sky from short rows; the clock sits below the crop.
    context.fillRect(x - 2, y - 1, width + 4, glyphs[0].length * pixel + 2);
    context.fillStyle = "#535353";
    for (let index = 0; index < text.length; index += 1) {
      const glyph = glyphs[text[index]];
      if (!glyph) continue;
      for (let row = 0; row < glyph.length; row += 1) {
        for (let column = 0; column < glyph[row].length; column += 1) {
          if (glyph[row][column] === "1") {
            context.fillRect(x + index * advance + column * pixel, y + row * pixel, pixel, pixel);
          }
        }
      }
    }
    context.restore();
  }

  const distanceMeter = runner.distanceMeter;
  distanceMeter.update = function updateAge(deltaTime) {
    if (runner.started && !runner.playingIntro && !runner.crashed) {
      ageMilliseconds += deltaTime;
    }
    // The host reads each game's lifespan to rank rows by it.
    window.spoonClassAge = ageMilliseconds;
    drawAge(this);
    return false;
  };

  const restart = runner.restart;
  runner.restart = function restartLife() {
    ageMilliseconds = 0;
    window.spoonClassAge = 0;
    return restart.apply(this, arguments);
  };

  // Render the initial 00Y 00M 00D state immediately, not only after play
  // has begun. The source meter otherwise leaves its initial 00000 behind.
  drawAge(distanceMeter);
}
