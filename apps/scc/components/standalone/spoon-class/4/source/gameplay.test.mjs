// Execute the vendored Runner with deterministic browser boundaries. These are
// logic comparisons; canvas drawing is inert and no browser is launched.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { installRunnerCompatibility } from "./compatibility.mjs";

const html = readFileSync(new URL("./dino.html", import.meta.url), "utf8");
const engine = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .find((match) => match[1].includes("function Runner("))[1];
const FRAME = 1000 / 60;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function createGame({ patched, seed = 0xdecafbad, rejectPrefixedKeyframes = false } = {}) {
  let now = 1;
  let id = 0;
  const frames = new Map();
  const timers = new Map();
  const context = new Proxy({}, { get: () => () => {} });

  function element() {
    const listeners = new Map();
    return {
      style: {},
      classList: { remove() {} },
      offsetWidth: 600,
      appendChild() {},
      addEventListener(type, handler) {
        const handlers = listeners.get(type) ?? [];
        handlers.push(handler);
        listeners.set(type, handlers);
      },
      removeEventListener(type, handler) {
        listeners.set(type, (listeners.get(type) ?? []).filter((entry) => entry !== handler));
      },
      emit(type) {
        for (const handler of listeners.get(type) ?? []) {
          handler({ type, currentTarget: this, target: this });
        }
      },
      querySelector: () => null,
      getContext: () => context,
    };
  }

  const outer = element();
  const audio = { src: "data:audio/ogg;base64,T2dnUw==" };
  const document = {
    hidden: false,
    styleSheets: [
      {
        insertRule(rule) {
          if (rejectPrefixedKeyframes && rule.startsWith("@-webkit-keyframes")) {
            throw new SyntaxError("Failed to parse the rule");
          }
        },
      },
    ],
    querySelector: () => outer,
    createElement: element,
    getElementById: () => ({ ...element(), content: { getElementById: () => audio } }),
    addEventListener() {},
    removeEventListener() {},
  };
  const window = {
    devicePixelRatio: 1,
    navigator: { userAgent: "Chrome" },
    getComputedStyle: () => ({ paddingLeft: "0px" }),
    addEventListener() {},
    setTimeout(callback, delay) {
      const timerId = ++id;
      timers.set(timerId, { at: now + delay, callback });
      return timerId;
    },
    clearTimeout(timerId) {
      timers.delete(timerId);
    },
  };
  const math = Object.create(Math);
  math.random = seededRandom(seed);
  const environment = {
    window,
    document,
    Math: math,
    performance: { now: () => now },
    requestAnimationFrame(callback) {
      const frameId = ++id;
      frames.set(frameId, callback);
      return frameId;
    },
    cancelAnimationFrame(frameId) {
      frames.delete(frameId);
    },
    clearInterval() {},
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    AudioContext: class {
      decodeAudioData(_buffer, onDecoded) {
        onDecoded({});
      }
      createBufferSource() {
        return { connect() {}, start() {} };
      }
    },
  };

  runInNewContext(engine, environment);
  if (patched) installRunnerCompatibility(window.Runner, window);
  const runner = new window.Runner(".interstitial-wrapper");

  return {
    runner,
    step(count = 1) {
      for (let index = 0; index < count; index += 1) {
        now += FRAME;
        for (const [timerId, timer] of timers) {
          if (timer.at <= now) {
            timers.delete(timerId);
            timer.callback();
          }
        }
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(now));
      }
    },
    press() {
      runner.onKeyDown({ keyCode: 32, type: "keydown", target: runner.canvas });
    },
    release(keyCode = 32) {
      runner.onKeyUp({ keyCode, type: "keyup", target: runner.canvas });
    },
    finishIntro() {
      runner.containerEl.emit(patched ? "animationend" : "webkitAnimationEnd");
    },
  };
}

function capture(runner) {
  const copyBox = ({ x, y, width, height }) => ({ x, y, width, height });
  return {
    currentSpeed: runner.currentSpeed,
    distanceRan: runner.distanceRan,
    highestScore: runner.highestScore,
    runningTime: runner.runningTime,
    time: runner.time,
    started: runner.started,
    activated: runner.activated,
    crashed: runner.crashed,
    paused: runner.paused,
    playingIntro: runner.playingIntro,
    playCount: runner.playCount,
    trex: {
      xPos: runner.tRex.xPos,
      yPos: runner.tRex.yPos,
      status: runner.tRex.status,
      jumping: runner.tRex.jumping,
      jumpVelocity: runner.tRex.jumpVelocity,
      reachedMinHeight: runner.tRex.reachedMinHeight,
      speedDrop: runner.tRex.speedDrop,
      jumpCount: runner.tRex.jumpCount,
      currentFrame: runner.tRex.currentFrame,
      timer: runner.tRex.timer,
    },
    horizon: {
      clouds: runner.horizon.clouds.map((cloud) => ({
        xPos: cloud.xPos,
        yPos: cloud.yPos,
        remove: cloud.remove,
        cloudGap: cloud.cloudGap,
      })),
      obstacles: runner.horizon.obstacles.map((obstacle) => ({
        type: obstacle.typeConfig.type,
        size: obstacle.size,
        xPos: obstacle.xPos,
        yPos: obstacle.yPos,
        width: obstacle.width,
        gap: obstacle.gap,
        remove: obstacle.remove,
        followingObstacleCreated: obstacle.followingObstacleCreated,
        collisionBoxes: obstacle.collisionBoxes.map(copyBox),
      })),
      horizonLine: {
        sourceXPos: [...runner.horizon.horizonLine.sourceXPos],
        xPos: [...runner.horizon.horizonLine.xPos],
      },
    },
    distanceMeter: {
      digits: [...runner.distanceMeter.digits],
      acheivement: runner.distanceMeter.acheivement,
      flashTimer: runner.distanceMeter.flashTimer,
      flashIterations: runner.distanceMeter.flashIterations,
      highScore: Array.isArray(runner.distanceMeter.highScore)
        ? [...runner.distanceMeter.highScore]
        : runner.distanceMeter.highScore,
    },
  };
}

function assertSameFrame(source, hosted, frame) {
  assert.equal(
    JSON.stringify(capture(hosted.runner)),
    JSON.stringify(capture(source.runner)),
    `state diverged on frame ${frame}`,
  );
}

test("source behavior without intro completion reproduces the stationary-cactus defect", () => {
  const game = createGame({ patched: false });
  game.press();
  game.step(300);
  assert.equal(game.runner.playingIntro, true);
  assert.ok(game.runner.horizon.obstacles.length > 0);
  const x = game.runner.horizon.obstacles[0].xPos;
  game.step(30);
  assert.equal(game.runner.horizon.obstacles[0].xPos, x);
});

test("hosted Runner stays frame-identical to the unmodified source once the same intro end occurs", () => {
  const source = createGame({ patched: false });
  const hosted = createGame({ patched: true });
  source.press();
  hosted.press();

  let frame = 0;
  while (!source.runner.playingIntro && frame < 180) {
    source.step();
    hosted.step();
    assertSameFrame(source, hosted, frame);
    frame += 1;
  }
  assert.equal(source.runner.playingIntro, true);
  assert.equal(hosted.runner.playingIntro, true);

  // Source's legacy WebKit event and the host's standard event occur at the
  // same game boundary. From here every game-state field must remain equal.
  source.finishIntro();
  hosted.finishIntro();
  assertSameFrame(source, hosted, frame);

  for (let index = 0; index < 600; index += 1) {
    source.step();
    hosted.step();
    assertSameFrame(source, hosted, frame + index + 1);
  }

  assert.equal(source.runner.crashed, true);
  assert.equal(hosted.runner.crashed, true);
  source.step(46);
  hosted.step(46);
  source.release();
  hosted.release();
  assertSameFrame(source, hosted, frame + 647);

  for (let index = 0; index < 300; index += 1) {
    source.step();
    hosted.step();
    assertSameFrame(source, hosted, frame + 648 + index);
  }
});

test("fallback completion restores the source update loop when no animation event is delivered", () => {
  const game = createGame({ patched: true });
  game.press();
  for (let frame = 0; frame < 180 && !game.runner.playingIntro; frame += 1) game.step();
  assert.equal(game.runner.playingIntro, true);
  game.step(25);
  assert.equal(game.runner.playingIntro, false);
  assert.equal(game.runner.playCount, 1);

  const runningTime = game.runner.runningTime;
  game.runner.startGame();
  assert.equal(game.runner.runningTime, runningTime);
  assert.equal(game.runner.playCount, 1);

  for (let frame = 0; frame < 240 && !game.runner.horizon.obstacles.length; frame += 1) game.step();
  const cactus = game.runner.horizon.obstacles[0];
  assert.ok(cactus);
  const x = cactus.xPos;
  game.step(10);
  assert.ok(cactus.xPos < x, `${cactus.xPos} should be less than ${x}`);
});

test("a browser that rejects the prefixed intro keyframes still runs the game", () => {
  const source = createGame({ patched: false, rejectPrefixedKeyframes: true });
  source.press();
  assert.throws(() => source.step(180), SyntaxError);

  const game = createGame({ patched: true, rejectPrefixedKeyframes: true });
  game.press();
  for (let frame = 0; frame < 180 && !game.runner.playingIntro; frame += 1) game.step();
  assert.equal(game.runner.started, true);
  game.step(25);
  assert.equal(game.runner.playingIntro, false);
  for (let frame = 0; frame < 240 && !game.runner.horizon.obstacles.length; frame += 1) game.step();
  const cactus = game.runner.horizon.obstacles[0];
  assert.ok(cactus);
  const x = cactus.xPos;
  game.step(10);
  assert.ok(cactus.xPos < x, `${cactus.xPos} should be less than ${x}`);
});
