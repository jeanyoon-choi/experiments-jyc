// Deliberately self-contained: this function is stringified into the isolated
// game document before the upstream bootstrap runs.
//
// `signs` lists photographed Korean signs cut out of street photographs
// (the host page's decoded image element, pixel size, kind and the life
// stages it belongs to; see the docs). `stages` lists the life stages with
// the age (in years) each begins. When given, both obstacle sprites become
// collages of the signs of the current stage: 입간판 standing on the pavement
// for the small obstacles; 세로 and blade signs, and signs stacked up a
// facade, for the large ones. The stage-0 pair is painted here; later pairs
// are composed on demand through window.spoonClassStageSprites (life-stages.mjs
// hands them to new obstacles). Only the images change; obstacle sizes and
// collision boxes stay those of scale.mjs.
export function installLifeGamePresentation(document, signs, stages) {
  const INK = "#535353";
  const PAPER = "#f7f7f7";

  function dataUri(svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function human(x, pose) {
    const legs =
      pose === "run-left"
        ? '<rect x="16" y="35" width="5" height="10"/><rect x="24" y="35" width="5" height="6"/>'
        : pose === "run-right"
          ? '<rect x="16" y="35" width="5" height="6"/><rect x="24" y="35" width="5" height="10"/>'
          : pose === "crashed"
            ? '<rect x="7" y="39" width="18" height="5"/><rect x="3" y="34" width="8" height="5"/>'
            : '<rect x="16" y="35" width="5" height="10"/><rect x="24" y="35" width="5" height="10"/>';
    const torso = pose === "crashed" ? '<rect x="15" y="32" width="14" height="6"/>' : '<rect x="15" y="20" width="14" height="16"/>';
    const head = pose === "crashed" ? '<rect x="28" y="29" width="9" height="9"/>' : '<rect x="17" y="7" width="10" height="11"/>';
    const arms = pose === "crashed" ? "" : '<rect x="9" y="23" width="7" height="5"/><rect x="28" y="25" width="7" height="5"/>';
    return `<g transform="translate(${x} 0)" fill="${INK}">${head}${torso}${arms}${legs}</g>`;
  }

  function trexSprite(scale) {
    const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="${262 * scale}" height="${47 * scale}" viewBox="0 0 262 47" shape-rendering="crispEdges">${human(0, "jump")}${human(44, "still")}${human(88, "run-left")}${human(132, "run-right")}${human(220, "crashed")}</svg>`;
    return dataUri(sprite);
  }

  function examSprite(scale) {
    const papers = Array.from({ length: 6 }, (_, index) => {
      const x = index * 17;
      return `<g transform="translate(${x} 0)" fill="${INK}"><rect x="1" y="0" width="15" height="35"/><rect x="3" y="2" width="11" height="31" fill="${PAPER}"/><rect x="3" y="2" width="11" height="3"/><rect x="4" y="8" width="2" height="2"/><rect x="8" y="8" width="5" height="1"/><rect x="4" y="13" width="2" height="2"/><rect x="8" y="13" width="5" height="1"/><rect x="4" y="18" width="2" height="2"/><rect x="8" y="18" width="5" height="1"/><rect x="4" y="24" width="8" height="1"/><rect x="4" y="28" width="2" height="2"/><rect x="7" y="28" width="2" height="2"/><rect x="10" y="28" width="2" height="2"/></g>`;
    }).join("");
    return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${102 * scale}" height="${35 * scale}" viewBox="0 0 102 35" shape-rendering="crispEdges">${papers}</svg>`);
  }

  function lifeObstacleSprite(scale) {
    const blocks = Array.from({ length: 6 }, (_, index) => {
      const x = index * 25;
      return `<g transform="translate(${x} 0)" fill="${INK}"><rect x="2" y="2" width="21" height="48"/><rect x="5" y="5" width="15" height="42" fill="${PAPER}"/><rect x="8" y="9" width="9" height="5" fill="${INK}"/><rect x="8" y="20" width="9" height="3" fill="${INK}"/><rect x="8" y="29" width="9" height="3" fill="${INK}"/><rect x="8" y="38" width="9" height="3" fill="${INK}"/></g>`;
    }).join("");
    return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${150 * scale}" height="${50 * scale}" viewBox="0 0 150 50" shape-rendering="crispEdges">${blocks}</svg>`);
  }

  // Each sprite holds three obstacles side by side: size 1 in the first
  // unit, size 2 in the next two, size 3 in the last three (the upstream
  // Obstacle draws from x = unit × size × (size − 1) / 2). Each is composed on
  // its own so no sign is cut at an obstacle's edge.
  const SEGMENTS = [[0, 1], [1, 2], [3, 3]];
  // Hairline between neighbouring cut-outs, in sprite pixels.
  const GAP = 0.7;
  const KINDS = {
    // 세로간판: neon and vertical blade signs, and 학원 vertical signs.
    vertical: ["vertical", "neon", "hagwon-v"],
    // 학원 간판 stacked up a facade, one per floor.
    hagwon: ["hagwon"],
    // 입간판 and the box signs that stand on the pavement.
    stand: ["stand", "aframe", "cylinder", "lightbox"],
  };

  // The signs of the stage being composed. A stage without signs of a group
  // borrows the stage's other signs, so every stage fills both obstacles.
  let pool = [];
  function ofKinds(group) {
    const matching = pool.filter((sign) => KINDS[group].includes(sign.kind));
    return matching.length ? matching : pool;
  }

  function choose(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Signs at (nearly) full height side by side, then evenly scaled so the
  // row ends exactly at the segment's edge.
  function row(pool, x0, width, height, minHeight) {
    const picked = [];
    let natural = 0;
    while (natural < width && picked.length < 8) {
      const remaining = width - natural;
      const unused = pool.filter((sign) => !picked.some((item) => item.sign === sign));
      const fits = unused.filter((sign) => (height * sign.width) / sign.height <= remaining * 1.2);
      // Nothing fits the rest: widen the signs already standing rather than
      // always closing with the narrowest sign, unless that stretches them
      // visibly.
      if (!fits.length && picked.length && width / natural <= 1.3) break;
      const sign = fits.length
        ? choose(fits)
        : unused.reduce((a, b) => (a.width / a.height < b.width / b.height ? a : b), unused[0] || pool[0]);
      const h = height * (minHeight + Math.random() * (1 - minHeight));
      picked.push({ sign, h, w: (h * sign.width) / sign.height });
      natural += picked[picked.length - 1].w + GAP;
    }
    const scale = (width - GAP * (picked.length - 1)) / (natural - GAP * picked.length);
    let x = x0;
    return picked.map(({ sign, h, w }) => {
      const item = { sign, x, y: height - h, w: w * scale, h };
      x += w * scale + GAP;
      return item;
    });
  }

  // 학원 signs at the facade's full width, stacked from the ground up and
  // evenly scaled in height so the top sign meets the sprite's top.
  function facade(pool, x0, width, height) {
    const picked = [];
    let natural = 0;
    while (natural < height && picked.length < 6) {
      const remaining = height - natural;
      const unused = pool.filter((sign) => !picked.includes(sign));
      const fits = unused.filter((sign) => (width * sign.height) / sign.width <= remaining * 1.2);
      const sign = fits.length ? choose(fits) : choose(unused.length ? unused : pool);
      picked.push(sign);
      natural += (width * sign.height) / sign.width + GAP;
    }
    const scale = (height - GAP * (picked.length - 1)) / (natural - GAP * picked.length);
    let y = height;
    return picked.map((sign) => {
      const h = ((width * sign.height) / sign.width) * scale;
      y -= h;
      const item = { sign, x: x0, y, w: width, h };
      y -= GAP;
      return item;
    });
  }

  let unitLarge = 25;
  function composeLarge(x0, width, height) {
    const vertical = ofKinds("vertical");
    const hagwon = ofKinds("hagwon");
    const mode = width <= unitLarge ? "vertical" : choose(width >= 3 * unitLarge ? ["vertical", "facade", "mixed", "mixed"] : ["vertical", "facade"]);
    if (mode === "vertical") return row(vertical, x0, width, height, 0.84);
    if (mode === "facade") return facade(hagwon, x0, width, height);
    const split = Math.round(width * (0.45 + Math.random() * 0.15));
    const facadeFirst = Math.random() < 0.5;
    const columns = facadeFirst
      ? [facade(hagwon, x0, split, height), row(vertical, x0 + split + GAP, width - split - GAP, height, 0.84)]
      : [row(vertical, x0, width - split - GAP, height, 0.84), facade(hagwon, x0 + width - split, split, height)];
    return columns.flat();
  }

  function composeSmall(x0, width, height) {
    return row(ofKinds("stand"), x0, width, height, 0.88);
  }

  function signSprite(unit, height, compose) {
    const items = SEGMENTS.flatMap(([start, size]) => compose(start * unit, size * unit, height));
    return { width: unit * 6, height, items };
  }

  // The sprite is painted once into a canvas that takes the image element's
  // place (same id), so the Runner draws obstacles from it directly. Signs
  // are the page's own decoded images: nothing is encoded or decoded per
  // game.
  function paint(sprite, scale, id) {
    const target = document.getElementById(id);
    if (!target) return;
    const canvas = paintCanvas(sprite, scale);
    if (!canvas) return;
    canvas.id = id;
    target.replaceWith(canvas);
  }

  function paintCanvas(sprite, scale) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sprite.width * scale);
    canvas.height = Math.round(sprite.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.scale(scale, scale);
    for (const { sign, x, y, w, h } of sprite.items) {
      if (sign.kind === "cylinder") {
        // A lit cylinder (원통 입간판) is cut out along its domed top.
        const ry = w * 0.22;
        context.save();
        context.beginPath();
        context.moveTo(x, y + h);
        context.lineTo(x, y + ry);
        context.ellipse(x + w / 2, y + ry, w / 2, ry, 0, Math.PI, 0);
        context.lineTo(x + w, y + h);
        context.closePath();
        context.clip();
        context.drawImage(sign.image, x, y, w, h);
        context.restore();
      } else {
        context.drawImage(sign.image, x, y, w, h);
      }
    }
    return canvas;
  }

  const collage = Array.isArray(signs) && signs.length > 0;
  const stageList = Array.isArray(stages) && stages.length ? stages.slice().sort((x, y) => x.from - y.from) : [{ id: "all", from: 0 }];
  function stageAt(years) {
    let index = 0;
    stageList.forEach((stage, at) => {
      if (years >= stage.from) index = at;
    });
    return index;
  }
  // A stage's pool: its own signs, or, when it has none yet, the nearest
  // earlier stage that has some.
  function poolOf(index) {
    for (let at = index; at >= 0; at -= 1) {
      const id = stageList[at].id;
      const own = signs.filter((sign) => !Array.isArray(sign.stages) || id === "all" || sign.stages.includes(id));
      if (own.length) return own;
    }
    return signs;
  }
  const view = document.defaultView;
  const Obstacle = view && view.Runner && view.Runner.spoonClassObstacle;
  const types = (Obstacle && Obstacle.types) || [];
  const typeOf = (name, width, height) => types.find((type) => type.type === name) || { width, height };
  const smallType = typeOf("CACTUS_SMALL", 17, 35);
  const largeType = typeOf("CACTUS_LARGE", 25, 50);
  unitLarge = largeType.width;
  function composeStage(index) {
    pool = poolOf(index);
    return {
      small: signSprite(smallType.width, smallType.height, composeSmall),
      large: signSprite(largeType.width, largeType.height, composeLarge),
    };
  }
  const first = collage ? composeStage(0) : null;
  const small = first && first.small;
  const large = first && first.large;
  if (collage && view && document.createElement) {
    // Canvases for later stages at the scale the Runner draws (2x on
    // high-density screens), composed once per stage per game.
    const hidpi = (view.devicePixelRatio || 1) > 1;
    const cache = new Map();
    view.spoonClassStageAt = (years) => stageAt(years);
    view.spoonClassStageSprites = (index) => {
      if (!cache.has(index)) {
        const pair = composeStage(index);
        cache.set(index, {
          CACTUS_SMALL: paintCanvas(pair.small, hidpi ? 2 : 1),
          CACTUS_LARGE: paintCanvas(pair.large, hidpi ? 2 : 1),
        });
      }
      return cache.get(index);
    };
  }
  const sprites = {};
  // The human is painted once from its SVG into a canvas that replaces the
  // sprite image (growth.mjs repaints it): the engine then draws a bitmap
  // every frame rather than an SVG image, which phones rasterise slowly.
  if (document.createElement && view && view.Image) {
    for (const [id, scale] of [["1x-trex", 1], ["2x-trex", 2]]) {
      const target = document.getElementById(id);
      if (!target) continue;
      const canvas = document.createElement("canvas");
      canvas.id = id;
      canvas.width = 262 * scale;
      canvas.height = 47 * scale;
      const loader = new view.Image();
      loader.onload = function () {
        const context = canvas.getContext("2d");
        if (context) context.drawImage(loader, 0, 0, canvas.width, canvas.height);
        const runner = view.Runner && view.Runner.instance_;
        if (runner && runner.tRex && !runner.playing) runner.tRex.update(0);
      };
      loader.src = trexSprite(scale);
      target.replaceWith(canvas);
    }
  } else {
    sprites["1x-trex"] = trexSprite(1);
    sprites["2x-trex"] = trexSprite(2);
  }
  if (collage) {
    paint(small, 1, "1x-obstacle-small");
    paint(small, 2, "2x-obstacle-small");
    paint(large, 1, "1x-obstacle-large");
    paint(large, 2, "2x-obstacle-large");
  } else {
    sprites["1x-obstacle-small"] = examSprite(1);
    sprites["2x-obstacle-small"] = examSprite(2);
    sprites["1x-obstacle-large"] = lifeObstacleSprite(1);
    sprites["2x-obstacle-large"] = lifeObstacleSprite(2);
  }

  for (const [id, src] of Object.entries(sprites)) {
    const image = document.getElementById(id);
    if (image) image.src = src;
  }
}
