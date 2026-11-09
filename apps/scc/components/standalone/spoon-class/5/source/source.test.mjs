import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Script, runInNewContext } from "node:vm";
import { installRunnerCompatibility } from "./compatibility.mjs";
import { installAudioCompatibility, restoreBrowserReplacements } from "./browser.mjs";
import { installScoreMeter } from "./score.mjs";
import { installJumpCeiling } from "./jump-ceiling.mjs";
import { installLifeGamePresentation } from "./life-game.mjs";
import { installScale } from "./scale.mjs";

const original = readFileSync(new URL("./dino.html", import.meta.url), "utf8");
const packaged = JSON.parse(readFileSync(new URL("./document.json", import.meta.url), "utf8"));

test("vendored HTML matches the pinned upstream bytes", () => {
  const hash = createHash("sha256").update(original).digest("hex");
  assert.equal(hash, "942ee61b111ddd7778cd8204bf9a4a60802d3a63549ec6e9d2353edd6eb5198a");
  assert.equal(packaged.sha256, hash);
});

test("packaging preserves the upstream document outside its explicit integration additions", () => {
  assert.ok(packaged.html.includes(`(${installRunnerCompatibility.toString()})(window.Runner, window);`));
  assert.ok(packaged.html.includes(`(${installScoreMeter.toString()})(window);`));
  assert.ok(packaged.html.includes(`(${installLifeGamePresentation.toString()})(document, window.parent !== window ? window.parent.spoonClassSigns : null);`));
  assert.match(packaged.html, /data-spoon-class-module-style/);
  assert.match(packaged.html, /data-spoon-class-module-presentation/);
  const restored = packaged.html
    .replace(/\n<meta http-equiv="Content-Security-Policy"[^>]+>/, "")
    .replace(/<style data-spoon-class-module-style>[\s\S]*?<\/style>\n/, "")
    .replace(/<style data-spoon-class-browser-style>[\s\S]*?<\/style>\n/, "")
    .replace(/<script data-spoon-class-compatibility>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-audio>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-life-presentation>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-score>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-jump-ceiling>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-scale>[\s\S]*?<\/script>\n/, "")
    .replace("\n    Runner.spoonClassObstacle = Obstacle;\n    Runner.spoonClassTrex = Trex;", "");
  const sourceRestored = restored.replace(
    /<script data-spoon-class-module-presentation>[\s\S]*?<\/script>\n/,
    "",
  );
  assert.equal(restoreBrowserReplacements(sourceRestored), original);
});

test("/4 enlarges both obstacle types on the same ground line and strengthens the jump", () => {
  function CollisionBox(x, y, width, height) {
    Object.assign(this, { x, y, width, height });
  }
  const Obstacle = {
    types: [
      { type: "CACTUS_SMALL", width: 17, height: 35, yPos: 105, collisionBoxes: [new CollisionBox(4, 0, 6, 34)] },
      { type: "CACTUS_LARGE", width: 25, height: 50, yPos: 90, collisionBoxes: [new CollisionBox(8, 0, 7, 49)] },
    ],
  };
  const Trex = { config: { INIITAL_JUMP_VELOCITY: -10, GRAVITY: 0.6, MIN_JUMP_HEIGHT: 30, MAX_JUMP_HEIGHT: 30, DROP_VELOCITY: -5 } };
  installScale({ Runner: { spoonClassObstacle: Obstacle, spoonClassTrex: Trex } });
  const [small, large] = Obstacle.types;
  assert.deepEqual([small.width, small.height, small.yPos + small.height], [22, 46, 140]);
  assert.deepEqual([large.width, large.height, large.yPos + large.height], [33, 65, 140]);
  assert.ok(large.collisionBoxes[0] instanceof CollisionBox);
  assert.deepEqual({ ...large.collisionBoxes[0] }, { x: 11, y: 0, width: 9, height: 64 });
  // A held jump replayed with the source update keeps a 47px-high body above
  // the large obstacle's top for longer than the source jump cleared its own.
  const airborne = (config, ground, top) => {
    let y = ground;
    let velocity = config.INIITAL_JUMP_VELOCITY;
    let reachedMin = false;
    let frames = 0;
    for (let frame = 0; frame < 300; frame += 1) {
      y += Math.round(velocity);
      velocity += config.GRAVITY;
      if (y < ground - config.MIN_JUMP_HEIGHT) reachedMin = true;
      if (y < config.MAX_JUMP_HEIGHT && reachedMin && velocity < config.DROP_VELOCITY) velocity = config.DROP_VELOCITY;
      if (y + 47 <= top) frames += 1;
      if (y > ground) break;
    }
    return frames;
  };
  const source = { INIITAL_JUMP_VELOCITY: -10, GRAVITY: 0.6, MIN_JUMP_HEIGHT: 30, MAX_JUMP_HEIGHT: 30, DROP_VELOCITY: -5 };
  assert.ok(airborne(Trex.config, 93, large.yPos) > airborne(source, 93, 90));
  assert.match(packaged.html, /Runner\.spoonClassObstacle = Obstacle;/);
  assert.ok(packaged.html.indexOf("data-spoon-class-scale") < packaged.html.indexOf("data-spoon-class-life-presentation"));
});

test("score keeps the upstream meter, moves it below a cropped sky and publishes time alive", () => {
  const drawn = [];
  const meter = { x: 100, y: 5, update(deltaTime) { drawn.push(deltaTime); return "upstream"; } };
  const runner = { started: true, playingIntro: false, crashed: false, distanceMeter: meter, restart() {} };
  const window = { Runner: { instance_: runner }, spoonClassClockTop: 12 };
  installScoreMeter(window);
  assert.equal(meter.y, 11);
  assert.equal(meter.update(500), "upstream");
  assert.deepEqual(drawn, [500]);
  assert.equal(window.spoonClassAge, 500);
  runner.crashed = true;
  meter.update(500);
  assert.equal(window.spoonClassAge, 500);
  runner.restart();
  assert.equal(window.spoonClassAge, 0);
});

test("HI is the best score of every game on the page", () => {
  const parent = { spoonClassHighScore: 0 };
  function game() {
    const meter = { x: 100, y: 5, highScore: [], update() {}, setHighScore(value) { this.highScore = [value]; } };
    const runner = { started: true, playingIntro: false, crashed: false, highestScore: 0, distanceMeter: meter, restart() {}, gameOver() {} };
    installScoreMeter({ parent, Runner: { instance_: runner } });
    return { meter, runner };
  }
  const a = game();
  const b = game();
  a.runner.highestScore = 800;
  a.runner.gameOver();
  assert.equal(parent.spoonClassHighScore, 800);
  b.meter.update(16);
  assert.equal(b.runner.highestScore, 800);
  assert.deepEqual(b.meter.highScore, [800]);
  b.runner.highestScore = 500;
  b.runner.gameOver();
  assert.equal(parent.spoonClassHighScore, 800, "a lower score never lowers HI");
});

test("life presentation keeps the upstream T-Rex and replaces only the obstacle sprites", () => {
  const images = new Map(
    [
      "1x-trex",
      "2x-trex",
      "1x-obstacle-small",
      "2x-obstacle-small",
      "1x-obstacle-large",
      "2x-obstacle-large",
    ].map((id) => [id, { src: "upstream" }]),
  );
  installLifeGamePresentation({ getElementById: (id) => images.get(id) });
  for (const [id, image] of images) {
    if (id.endsWith("trex")) assert.equal(image.src, "upstream");
    else assert.match(image.src, /^data:image\/svg\+xml;charset=utf-8,/);
  }
});

test("given the page's sign images, each obstacle becomes its own canvas collage spanning its full width", () => {
  const ids = ["1x-obstacle-small", "2x-obstacle-small", "1x-obstacle-large", "2x-obstacle-large"];
  const signs = [
    { image: "stand", width: 40, height: 120, kind: "stand" },
    { image: "cylinder", width: 70, height: 120, kind: "cylinder" },
    { image: "neon", width: 30, height: 120, kind: "neon" },
    { image: "vertical", width: 25, height: 120, kind: "vertical" },
    { image: "hagwon-wide", width: 600, height: 120, kind: "hagwon" },
    { image: "hagwon", width: 260, height: 120, kind: "hagwon" },
  ];
  for (let run = 0; run < 20; run += 1) {
    const elements = new Map(ids.map((id) => [id, { id, replaceWith(next) { elements.set(id, next); } }]));
    const fakeDocument = {
      getElementById: (id) => elements.get(id),
      createElement: () => {
        const draws = [];
        const transform = { scale: 1 };
        return {
          draws,
          getContext: () => ({
            scale: (scale) => (transform.scale = scale),
            save() {},
            restore() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            ellipse() {},
            closePath() {},
            clip() {},
            drawImage: (image, x, y, w, h) => draws.push({ image, x, y, w, h, scale: transform.scale }),
          }),
        };
      },
    };
    installLifeGamePresentation(fakeDocument, signs);
    for (const id of ids) {
      const canvas = elements.get(id);
      const [unit, height] = id.includes("small") ? [17, 35] : [25, 50];
      const scale = id.startsWith("2x") ? 2 : 1;
      assert.equal(canvas.id, id, "the canvas takes the image element's place");
      assert.deepEqual([canvas.width, canvas.height], [unit * 6 * scale, height * scale]);
      // Upstream obstacle sizes 1, 2 and 3 draw units [0,1), [1,3) and [3,6).
      for (const [start, size] of [[0, 1], [1, 2], [3, 3]]) {
        const inside = canvas.draws.filter((item) => item.x >= start * unit - 0.01 && item.x < (start + size) * unit);
        assert.ok(inside.length > 0);
        for (const item of inside) {
          assert.equal(item.scale, scale);
          assert.ok(item.x + item.w <= (start + size) * unit + 0.02, "no sign crosses an obstacle edge");
          assert.ok(item.y >= -0.02 && item.y + item.h <= height + 0.02);
        }
        assert.ok(Math.max(...inside.map((item) => item.x + item.w)) >= (start + size) * unit - 0.02, "the collage reaches the obstacle's right edge");
        assert.ok(inside.some((item) => item.y + item.h >= height - 0.02), "signs stand on the ground");
      }
      const kinds = new Set(canvas.draws.map((item) => item.image));
      if (id.includes("small")) assert.ok([...kinds].every((kind) => kind === "stand" || kind === "cylinder"), "small obstacles are 입간판 only");
      else assert.ok([...kinds].every((kind) => kind !== "stand" && kind !== "cylinder"), "large obstacles are 세로 and 학원 signs only");
    }
  }
});

test("the module document removes standalone text and forwards only player keys", () => {
  assert.match(packaged.html, /querySelectorAll\("\.onlyforchrome"\)/);
  assert.match(packaged.html, /getElementById\("main-frame-notchrome"\)/);
  assert.match(packaged.html, /channel: "spoon-class-input"/);
  assert.match(packaged.html, /!event\.isTrusted/);
  assert.match(packaged.html, /\}, "\*"\);/);  assert.match(packaged.html, /addEventListener\("touchstart", syncTouch, touchOptions\)/);
  assert.match(packaged.html, /keyCode: 32\n/);
});

const SAFARI_IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const FIREFOX = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:131.0) Gecko/20100101 Firefox/131.0";

test("every browser constructs the original Runner, not only Chrome user agents", () => {
  assert.doesNotMatch(packaged.html, /indexOf\('chrome'\)/);
  const bootstrap = [...packaged.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .find((match) => match[1].includes("new Runner('.interstitial-wrapper')"))[1];
  for (const userAgent of [SAFARI_IPAD, FIREFOX, "Mozilla/5.0 (iPhone) CriOS/129.0 Mobile Safari/604.1"]) {
    let constructed = 0;
    runInNewContext(bootstrap, {
      navigator: { userAgent },
      Runner: function Runner() {
        constructed += 1;
      },
      document: { getElementById: () => assert.fail("non-Chrome notice shown") },
    });
    assert.equal(constructed, 1, userAgent);
  }
});

test("touch-primary devices without a Mobi user agent use the original touch input", () => {
  const line = packaged.html.match(/var IS_MOBILE = [^\n]+/)[0];
  const isMobile = (window) => runInNewContext(`var IS_IOS = false; ${line} IS_MOBILE;`, { window });
  const media = (coarse) => () => ({ matches: coarse });
  assert.equal(isMobile({ navigator: { userAgent: SAFARI_IPAD, maxTouchPoints: 5 }, matchMedia: media(true) }), true);
  assert.equal(isMobile({ navigator: { userAgent: FIREFOX, maxTouchPoints: 0 }, matchMedia: media(false) }), false);
  assert.equal(isMobile({ navigator: { userAgent: "Android Mobile", maxTouchPoints: 5 }, matchMedia: media(true) }), true);
});

test("audio falls back to webkitAudioContext and a failed Ogg decode stays silent", async () => {
  let rejected = false;
  class LegacyContext {
    decodeAudioData(_buffer, _onDecoded, onError) {
      assert.equal(typeof onError, "function");
      return Promise.reject(new Error("Ogg unsupported")).catch((error) => {
        rejected = true;
        throw error;
      });
    }
  }
  const window = { webkitAudioContext: LegacyContext };
  installAudioCompatibility(window);
  assert.equal(window.AudioContext, LegacyContext);
  await new window.AudioContext().decodeAudioData(new ArrayBuffer(0), () => {})?.catch(() => {});
  assert.equal(rejected, true);

  const silent = {};
  installAudioCompatibility(silent);
  assert.doesNotThrow(() => new silent.AudioContext().decodeAudioData(new ArrayBuffer(0), () => {}));
});

test("all upstream inline scripts parse without executing a browser", () => {
  const scripts = [...original.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 5);
  for (const [index, match] of scripts.entries()) {
    assert.doesNotThrow(() => new Script(match[1], { filename: `upstream-script-${index}.js` }));
  }
});

test("both sprite densities and all three original Ogg sounds are intact", () => {
  const sprites = [...original.matchAll(/<img id="([12])x-([^"]+)" src="data:image\/png;base64,([^"]+)"/g)];
  assert.equal(sprites.length, 14);
  for (const [, , , data] of sprites) {
    const png = Buffer.from(data, "base64");
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.ok(png.readUInt32BE(16) > 0);
    assert.ok(png.readUInt32BE(20) > 0);
  }
  const sounds = [...original.matchAll(/<audio id="offline-sound-([^"]+)" src="data:audio\/mpeg;base64,([^"]+)"/g)];
  assert.deepEqual(sounds.map((sound) => sound[1]), ["press", "hit", "reached"]);
  for (const [, , data] of sounds) {
    // The source labels these MPEG, but the bytes contain Ogg/Vorbis audio.
    assert.equal(Buffer.from(data, "base64").subarray(0, 4).toString(), "OggS");
  }
});

test("a cropped row lowers only the jump apex, never below the visible edge", () => {
  const trex = {
    groundYPos: 93,
    minJumpHeight: 63,
    config: { GRAVITY: 0.6, DROP_VELOCITY: -5, INIITAL_JUMP_VELOCITY: -10, MAX_JUMP_HEIGHT: 30 },
  };
  const apex = ({ MAX_JUMP_HEIGHT, INIITAL_JUMP_VELOCITY }) => {
    let y = 93;
    let velocity = INIITAL_JUMP_VELOCITY;
    let reached = false;
    let highest = y;
    while (y <= 93) {
      y += Math.round(velocity);
      velocity += 0.6;
      if (y < 63) reached = true;
      if (y < MAX_JUMP_HEIGHT && reached && velocity < -5) velocity = -5;
      highest = Math.min(highest, y);
    }
    return highest;
  };
  for (const ceiling of [0, 12, 30, 45]) {
    const config = { ...trex.config };
    installJumpCeiling({ Runner: { instance_: { tRex: { ...trex, config } } }, spoonClassJumpCeiling: ceiling });
    assert.ok(apex(config) >= ceiling, `apex ${apex(config)} above ceiling ${ceiling}`);
    assert.equal(config.GRAVITY, 0.6);
    assert.equal(config.DROP_VELOCITY, -5);
    if (ceiling === 0) assert.deepEqual(config, trex.config);
  }
});
