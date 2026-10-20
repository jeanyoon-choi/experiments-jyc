import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createEyeBlinkController } from "./eye-blink-controller.ts";
import * as timing from "./eye-blink-timing.ts";

const component = ts.transpileModule(fs.readFileSync(new URL("../screen/tech-eye-blink.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function mountEye(controller, { index = 0, paused = false, active = true, reduced = false } = {}) {
  const surface = { style: {}, dataset: {} };
  const lid = { style: {} };
  let refIndex = 0, effect, now = 0, timerId = 0;
  const timers = new Map();
  const context = {
    exports: {},
    require(name) {
      if (name === "react") return { useRef: () => ({ current: refIndex++ === 0 ? surface : lid }), useEffect: (fn) => { effect = fn; } };
      if (name === "react/jsx-runtime") return { jsx: () => null };
      if (name.endsWith("eye-blink-timing")) return timing;
      if (name.endsWith("tech-power-faces.generated")) return { techPowerFaces: [{ id: "001" }] };
      throw new Error(name);
    },
    Math: { random: () => .5 },
    Image: class { set src(_) { this.onload?.(); } },
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
    window: {
      matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }),
      setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
      clearTimeout(id) { timers.delete(id); },
    },
  };
  vm.runInNewContext(component, context);
  context.exports.TechEyeBlink({ index, active, paused, controller });
  let cleanup = effect();
  return {
    surface, timers, cleanup: () => cleanup(),
    setActive(nextActive) {
      cleanup();
      refIndex = 0;
      context.exports.TechEyeBlink({ index, active: nextActive, paused, controller });
      cleanup = effect();
    },
    advanceTo(end) {
      while (timers.size) {
        const [id, next] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (next.at > end) break;
        now = next.at; timers.delete(id); next.fn();
      }
      now = end;
    },
  };
}

test("one all-eye command reaches ready eyes synchronously with one request ID", () => {
  const controller = createEyeBlinkController();
  const a = mountEye(controller, { index: 0, paused: true });
  const b = mountEye(controller, { index: 1, paused: true });
  const hidden = mountEye(controller, { index: 2, active: false });
  assert.equal(controller.blinkAll(), 2);
  assert.equal(a.surface.dataset.blinkFrame, "1");
  assert.equal(b.surface.dataset.blinkFrame, "1");
  assert.equal(a.surface.dataset.blinkRequest, b.surface.dataset.blinkRequest);
  for (const eye of [a, b]) {
    eye.advanceTo(85); assert.equal(eye.surface.dataset.blinkFrame, "4");
    eye.advanceTo(1000); assert.equal(eye.surface.dataset.blinkFrame, "0");
    assert.equal(eye.timers.size, 0, "paused manual blink must not start autonomy or a double blink");
    eye.cleanup();
  }
  hidden.cleanup();
  assert.equal(controller.blinkAll(), 0);
});

test("manual commands replace automatic timers and rapid clicks cannot stack blinks", () => {
  const controller = createEyeBlinkController();
  const eye = mountEye(controller);
  assert.equal(eye.timers.size, 1);
  for (let i = 0; i < 5; i++) {
    assert.equal(controller.blinkEye(0), true);
    assert.equal(eye.timers.size, 1);
  }
  eye.advanceTo(250);
  assert.equal(eye.surface.dataset.blinkFrame, "0");
  assert.equal(eye.timers.size, 1, "normal autonomous cadence resumes after the command");
  eye.cleanup(); assert.equal(eye.timers.size, 0);
});

test("individual targeting is isolated between eye IDs and screen instances", () => {
  const first = createEyeBlinkController(), second = createEyeBlinkController();
  const calls = [];
  first.register(8, () => { calls.push(8); return true; });
  first.register(9, () => { calls.push(9); return true; });
  second.register(8, () => { throw new Error("Cross-screen command"); });
  assert.equal(first.blinkEye(8), true);
  assert.deepEqual(calls, [8]);
  assert.equal(first.blinkEye(99), false);
});

test("reduced motion stops autonomy but permits one explicit user command", () => {
  const controller = createEyeBlinkController();
  const eye = mountEye(controller, { reduced: true });
  assert.equal(eye.timers.size, 0);
  assert.equal(eye.surface.style.visibility, "visible");
  assert.equal(controller.blinkAll(), 1);
  eye.advanceTo(1000);
  assert.equal(eye.surface.style.visibility, "visible");
  assert.equal(eye.timers.size, 0);
  eye.cleanup();
});

test("inactive bubbles retain the loaded open photograph without scheduling blinks", () => {
  const controller = createEyeBlinkController();
  const eye = mountEye(controller, { active: false });
  assert.equal(eye.surface.style.visibility, "visible");
  assert.equal(eye.surface.dataset.loadedSource, "/images/0922/tech-eye-blink/001.webp");
  assert.equal(eye.surface.dataset.blinkFrame, "0");
  assert.equal(eye.timers.size, 0);
  assert.equal(controller.blinkAll(), 0);
  eye.cleanup();
});

test("leaving and re-entering retain the same loaded crop and resume only when active", () => {
  const controller = createEyeBlinkController();
  const eye = mountEye(controller);
  const source = eye.surface.dataset.loadedSource;
  for (const active of [false, true, false, true]) {
    eye.setActive(active);
    assert.equal(eye.surface.style.visibility, "visible");
    assert.equal(eye.surface.dataset.loadedSource, source);
    assert.equal(eye.timers.size, active ? 1 : 0);
    assert.equal(eye.surface.dataset.blinkFrame, "0");
  }
  eye.cleanup();
});
