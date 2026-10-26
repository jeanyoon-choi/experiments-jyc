// Deliberately self-contained: stringified into the game document after the
// upstream Runner has been created, when the host sets spoonClassGrowth.
//
// The human grows with the age clock (window.spoonClassAge, from
// life-age.mjs): from the /3 baby at birth to a grown body at GROWN_YEARS,
// taller, with longer legs set wider apart. The source's collision boxes are
// left as they are: they keep covering the top 47 pixels of the body (head
// and torso), so whatever passes below them goes between the legs, and a
// grown runner clears books with a lower jump. Only the human's size and
// sprite change; gravity, jump velocities, speed and obstacles are the
// source's.
export function installGrowth(window) {
  const runner = window.Runner && window.Runner.instance_;
  if (!runner || !runner.tRex || !window.spoonClassGrowth) return;

  const document = window.document;
  const trex = runner.tRex;
  const config = trex.config;
  const INK = "#535353";
  const YEAR = 2000;
  const GROWN_YEARS = 18;
  const GROUND_PAD = 10;
  const GAME_HEIGHT = 150;
  const BASE_WIDTH = 44;
  // Frame order in the sprite sheet, as upstream x / 44.
  const FRAMES = ["jump", "still", "run-left", "run-right", "still", "crashed"];

  function body(growth) {
    const legs = Math.round(10 + 20 * growth);
    const torso = Math.round(16 + 8 * growth);
    const head = Math.round(11 + 3 * growth);
    const height = 6 + head + 2 + torso + legs + 2;
    const width = Math.round(BASE_WIDTH + 10 * growth);
    const spread = Math.round(4 + 8 * growth);
    const lift = Math.round(4 + 6 * growth);
    return { legs, torso, head, height, width, spread, lift, growth };
  }

  function figure(shape, pose, x) {
    const { legs, torso, head, height, width, spread, lift } = shape;
    const centre = Math.round(width / 2);
    if (pose === "crashed") {
      // The /3 crashed pose, scaled to the body.
      const scale = Math.min(width / BASE_WIDTH, height / 47);
      return `<g transform="translate(${x} ${height - 47 * scale}) scale(${scale})" fill="${INK}"><rect x="28" y="29" width="9" height="9"/><rect x="15" y="32" width="14" height="6"/><rect x="7" y="39" width="18" height="5"/><rect x="3" y="34" width="8" height="5"/></g>`;
    }
    const feet = height - 2;
    const hip = feet - legs;
    const shoulder = hip - torso;
    const headTop = shoulder - 2 - head;
    const leftLeg = pose === "run-right" ? legs - lift : legs;
    const rightLeg = pose === "run-left" ? legs - lift : legs;
    return `<g transform="translate(${x} 0)" fill="${INK}">` +
      `<rect x="${centre - 5}" y="${headTop}" width="10" height="${head}"/>` +
      `<rect x="${centre - 7}" y="${shoulder}" width="14" height="${torso + 1}"/>` +
      `<rect x="${centre - 13}" y="${shoulder + 3}" width="7" height="5"/>` +
      `<rect x="${centre + 6}" y="${shoulder + 5}" width="7" height="5"/>` +
      `<rect x="${centre - spread - 5}" y="${hip}" width="5" height="${leftLeg}"/>` +
      `<rect x="${centre + spread}" y="${hip}" width="5" height="${rightLeg}"/>` +
      `<rect x="${centre - spread - 5}" y="${hip}" width="${2 * spread + 10}" height="3"/>` +
      `</g>`;
  }

  function sheet(shape, scale) {
    const figures = FRAMES.map((pose, index) => figure(shape, pose, index * shape.width)).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${6 * shape.width * scale}" height="${shape.height * scale}" viewBox="0 0 ${6 * shape.width} ${shape.height}" shape-rendering="crispEdges">${figures}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // The animation frame lists are private to the engine; each is reached once
  // as the current list of its status, then rescaled in place.
  const statuses = ["CRASHED", "JUMPING", "RUNNING", "WAITING"];
  const status = trex.status;
  const frameLists = statuses.map((name) => {
    trex.update(0, name);
    return trex.currentAnimFrames;
  });
  trex.update(0, status);
  const baseFrames = frameLists.map((frames) => frames.slice());
  const images = ["1x-trex", "2x-trex"].map((id) => document.getElementById(id)).filter(Boolean);
  // A newborn keeps the /3 baby sprite until the first growth step.
  let current = config.HEIGHT;
  let pending = null;

  function apply(shape) {
    const previousHeight = config.HEIGHT;
    config.WIDTH = shape.width;
    config.HEIGHT = shape.height;
    frameLists.forEach((frames, list) => {
      frames.forEach((_, index) => {
        frames[index] = (baseFrames[list][index] / BASE_WIDTH) * shape.width;
      });
    });
    const groundYPos = GAME_HEIGHT - shape.height - GROUND_PAD;
    trex.yPos = trex.jumping ? trex.yPos - (shape.height - previousHeight) : groundYPos;
    trex.groundYPos = groundYPos;
    trex.minJumpHeight = groundYPos - config.MIN_JUMP_HEIGHT;
  }

  function grow() {
    const age = Number(window.spoonClassAge) || 0;
    const growth = Math.min(1, age / YEAR / GROWN_YEARS);
    const shape = body(growth);
    if (shape.height === current || pending === shape.height) return;
    pending = shape.height;
    // Swap the sprite and the body together once the new sheet has loaded.
    const sources = images.map((image) => sheet(shape, image.id.startsWith("2x") ? 2 : 1));
    const loader = new window.Image();
    loader.onload = function () {
      if (pending !== shape.height) return;
      images.forEach((image, index) => (image.src = sources[index]));
      apply(shape);
      current = shape.height;
      pending = null;
    };
    loader.src = sources[images.length - 1];
  }

  const update = runner.update;
  runner.update = function growingUpdate() {
    grow();
    return update.apply(this, arguments);
  };
  grow();
}
