import { click, listenForGesture } from "./audio";
import { confetti } from "./confetti";
import type { Effect } from "./program";

// Plays the booklet as code. For each question:
//   stream — the cell is written line by line in token-sized bursts, like a
//            model streaming code, with key clicks; a line that reads an
//            equation of the question marks it as read;
//   run    — a marker steps through the code, each statement's output appears
//            where it was printed, and lines that draw (curves, Riemann sums,
//            a search, the construction on a figure) draw on the paper — the
//            page goes up to show them first; the cell's own run time,
//            measured in this browser, is printed last;
//   check  — each choice gets its verdict from the cell, the false ones are
//            struck, the answer is circled;
// then the number is graded in red and the page turns. After question 30 the
// answer sheet is filled by its cell, the time is written, and confetti.
//
// Performance as in /3: a frame reads first and writes after, geometry is
// measured once per line and kept in scroll coordinates, scroll and box come
// from events, streaming is a clip, and the loop sleeps when nothing moves.

/** Streaming: ms per character. */
const MS_PER_CHAR = 2.4;
/** Run: ms per line. */
const RUN_STEP_MS = 26;
const READ_LINE = 0.3;
const FOOT_CLEARANCE = 40;
const PAGE_LINE = 0.24;
const HANDS_OFF_MS = 1200;
const ARRIVE_MS = 900;
const SCROLL_SETTLE_MS = 650;
const SETTLE_MS = 150;
const GRADE_AFTER_MS = 240;
const HOLD_MS = 800;
/** The page's own glide: within a question, and to the next one. */
const GLIDE_MS = 340;
const TURN_MS = 420;
/** Plot and construction strokes take the code theme's colours. */
const INKS = ["#0550ae", "#8250df", "#953800", "#1a7f37"];

type Rect = { x: number; y: number; w: number; h: number };

type Phase = "stream" | "run" | "settle" | "toFocus" | "check" | "post" | "mark" | "toTop" | "graded" | "done";

/** A short animation on the paper. */
type Anim = { start: number; dur: number; update?(p: number): void; done?(): void; ended?: boolean };

type Stream = {
  el: HTMLElement;
  ink: HTMLElement | null;
  caret: HTMLElement | null;
  r: Rect;
  stops: number[];
  /** Time each stop is reached, from the line's start. */
  times: number[];
  start: number;
  shown: number;
};

type Play = {
  screen: HTMLElement;
  index: number;
  omr: boolean;
  phase: Phase;
  since: number;
  target: number;
  view: number | null;
  viewAt: number;
  /** Lines to stream, in order, and the one being streamed. */
  queue: HTMLElement[];
  line: Stream | null;
  lineEnd: number;
  /** Lines to run, and the next one. */
  runs: HTMLElement[];
  pc: number;
  pcAt: number;
  pcEl: HTMLElement | null;
  /** Once something is drawn on the paper, the page stays with it until the run ends. */
  visual: boolean;
  waitingFor: Effect[] | null;
  anims: Anim[];
  checkAt: number;
  maths: HTMLElement[];
  runtime: string | null;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function gauss() {
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

/** Bursts of 1–5 glyphs at an uneven pace, like tokens arriving. */
function streamTimes(count: number, length: number) {
  const perStop = (length * MS_PER_CHAR) / Math.max(1, count);
  const times: number[] = [];
  let t = 0;
  let i = 0;
  while (i < count) {
    const burst = Math.min(count - i, 1 + Math.floor(Math.random() * 5));
    t += burst * perStop * Math.exp(0.45 * gauss()) + (Math.random() < 0.025 ? 40 : 0);
    for (let k = 0; k < burst; k++) times.push(t);
    i += burst;
  }
  return times;
}

export function startRunner(reader: HTMLElement) {
  const screens = Array.from(reader.querySelectorAll<HTMLElement>("[data-question], [data-omr]"));
  const sessionStart = performance.now();
  let play: Play | null = null;
  let frame = 0;
  let sleeping = false;
  let settleTimer = 0;
  let lastUserScroll = -Infinity;
  /** The page moved by the runner itself, eased; snapping is off while it moves. */
  let glide: { from: number; to: number; start: number; dur: number } | null = null;
  let snapOff = false;

  let box = reader.getBoundingClientRect();
  let viewport = reader.clientHeight;
  let scroll = reader.scrollTop;
  let tops = screens.map((screen) => screen.offsetTop);
  let heights = screens.map((screen) => screen.offsetHeight);
  const remeasure = () => {
    box = reader.getBoundingClientRect();
    viewport = reader.clientHeight;
    scroll = reader.scrollTop;
    tops = screens.map((screen) => screen.offsetTop);
    heights = screens.map((screen) => screen.offsetHeight);
  };

  const rectOf = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { x: r.left - box.left, y: r.top - box.top + scroll, w: r.width, h: r.height };
  };
  const indexAt = (y: number) => {
    for (let i = 0; i < screens.length; i++) if (tops[i] <= y && y < tops[i] + heights[i]) return i;
    return 0;
  };
  const current = () => indexAt(scroll + viewport * READ_LINE);
  const handsOff = (now: number) => now - lastUserScroll < HANDS_OFF_MS;
  const visible = (r: Rect) => r.y >= scroll - 1 && r.y + r.h <= scroll + viewport - FOOT_CLEARANCE;

  const stopsOf = (ink: HTMLElement) => {
    const left = ink.getBoundingClientRect().left;
    const walker = document.createTreeWalker(ink, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const xs: number[] = [];
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      for (let i = 0; i < node.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const b = range.getBoundingClientRect();
        if (b.width > 0) xs.push(b.right - left);
      }
    }
    xs.sort((a, b) => a - b);
    const stops = [0];
    for (const x of xs) if (x - stops[stops.length - 1] > 0.5) stops.push(x);
    return stops;
  };

  // ---------------------------------------------------------------------
  // Effects on the paper.

  const effectsOf = (line: HTMLElement): Effect[] => (line.dataset.effects ? (JSON.parse(line.dataset.effects) as Effect[]) : []);

  /** The element an effect draws on (for the page to show it first). */
  const targetOf = (active: Play, effect: Effect): Element | null => {
    switch (effect.k) {
      case "read":
        return null;
      case "build":
        return active.screen.querySelector("[data-construction]")?.parentElement ?? null;
      case "fill":
        return null;
      default:
        return active.screen.querySelector("[data-plot]");
    }
  };

  const draw = (active: Play, path: SVGPathElement, at: number, dur: number, ink: string, done?: () => void) => {
    path.style.setProperty("--c", ink);
    active.anims.push({
      start: at,
      dur,
      update: (p) => {
        path.style.strokeDashoffset = String(1 - p);
      },
      done: () => {
        path.style.strokeDashoffset = "0";
        done?.();
      },
    });
  };

  const fire = (active: Play, effect: Effect, now: number) => {
    const screen = active.screen;
    switch (effect.k) {
      case "read":
        active.maths[effect.index]?.setAttribute("data-read", "");
        break;
      case "curve": {
        const path = screen.querySelector<SVGPathElement>(`[data-curve="${effect.id}"]`);
        const order = Array.from(screen.querySelectorAll("[data-curve]")).indexOf(path as Element);
        if (path) draw(active, path, now, 300, INKS[order % INKS.length]);
        break;
      }
      case "sums": {
        const sums = Array.from(screen.querySelectorAll<SVGGElement>("[data-sum]"));
        sums.forEach((sum, j) =>
          active.anims.push({
            start: now + j * 70,
            dur: 1,
            done: () => {
              sum.style.setProperty("--c", INKS[0]);
              sum.style.visibility = "visible";
              if (sums[j - 1]) sums[j - 1].style.visibility = "";
            },
          }),
        );
        break;
      }
      case "points":
        Array.from(screen.querySelectorAll<SVGCircleElement>("[data-point]")).forEach((point, k) => {
          active.anims.push({
            start: now + k * 12,
            dur: 120,
            update: () => {
              point.style.setProperty("--c", INKS[0]);
              point.style.visibility = "visible";
            },
            done: () => {
              if (!point.hasAttribute("data-bracket")) point.setAttribute("data-off", "");
            },
          });
        });
        break;
      case "root": {
        const root = screen.querySelector<SVGGElement>("[data-root]");
        if (root)
          active.anims.push({
            start: now,
            dur: 1,
            done: () => {
              root.style.setProperty("--c", INKS[1]);
              root.style.visibility = "visible";
            },
          });
        break;
      }
      case "build": {
        const step = screen.querySelector(`[data-cstep="${effect.step}"]`);
        if (!step) break;
        const ink = INKS[effect.step % INKS.length];
        Array.from(step.querySelectorAll<SVGPathElement>("[data-cpath]")).forEach((path, j) => {
          const label = path.nextElementSibling as SVGTextElement | null;
          draw(active, path, now + j * 50, path.hasAttribute("data-fill") ? 60 : 200, ink, () => {
            path.setAttribute("data-on", "");
            if (label?.hasAttribute("data-clabel")) {
              label.style.setProperty("--c", ink);
              label.style.visibility = "visible";
            }
          });
        });
        break;
      }
      case "fill":
        Array.from(screen.querySelectorAll<HTMLElement>("[data-bubble]")).forEach((bubble, k) =>
          active.anims.push({
            start: now + k * 8,
            dur: 1,
            done: () => {
              bubble.setAttribute("data-filled", "");
              if (k % 3 === 0) click(0.55);
            },
          }),
        );
        break;
    }
  };

  const animate = (active: Play, now: number) => {
    let busy = false;
    for (const anim of active.anims) {
      if (anim.ended) continue;
      busy = true;
      if (now < anim.start) continue;
      const p = clamp((now - anim.start) / anim.dur, 0, 1);
      anim.update?.(p);
      if (p >= 1) {
        anim.ended = true;
        anim.done?.();
      }
    }
    return busy;
  };

  // ---------------------------------------------------------------------
  // Questions.

  const clear = (screen: HTMLElement) => {
    for (const el of Array.from(screen.querySelectorAll<HTMLElement>("[data-type]"))) {
      el.removeAttribute("data-writing");
      el.removeAttribute("data-done");
      const ink = el.querySelector<HTMLElement>("[data-ink]");
      const caret = el.querySelector<HTMLElement>("[data-caret]");
      if (ink) ink.style.clipPath = "";
      if (caret) caret.style.transform = "";
    }
    for (const el of Array.from(screen.querySelectorAll<HTMLElement>("[data-strike]"))) el.style.transform = "";
    for (const el of Array.from(screen.querySelectorAll("[data-out], [data-circled], [data-filled], [data-on], [data-read], [data-pc]"))) {
      for (const name of ["data-out-on", "data-circled", "data-filled", "data-on", "data-read", "data-pc"]) el.removeAttribute(name);
    }
    for (const el of Array.from(screen.querySelectorAll<SVGElement>("[data-curve], [data-sum], [data-point], [data-root], [data-cpath], [data-clabel]"))) {
      el.style.strokeDashoffset = "";
      el.style.visibility = "";
      el.style.removeProperty("--c");
      el.removeAttribute("data-off");
    }
    screen.removeAttribute("data-graded");
  };

  const enter = (active: Play, phase: Phase, now: number) => {
    active.phase = phase;
    active.since = now;
  };

  const wake = () => {
    if (!sleeping) return;
    sleeping = false;
    frame = requestAnimationFrame(tick);
  };

  const begin = (index: number) => {
    const screen = screens[index];
    if (play && play.screen !== screen) clear(play.screen);
    clear(screen);
    remeasure();
    snapOff = heights[index] > viewport + 2;
    reader.style.scrollSnapType = snapOff ? "none" : "";
    const omr = screen.hasAttribute("data-omr");
    const lines = Array.from(screen.querySelectorAll<HTMLElement>("[data-row]"));
    const now = performance.now();
    play = {
      screen,
      index,
      omr,
      phase: "stream",
      since: now,
      target: tops[index],
      view: null,
      viewAt: 0,
      queue: lines.filter((line) => line.querySelector("[data-type]") && !line.hasAttribute("data-result")),
      line: null,
      lineEnd: now,
      runs: lines.filter((line) => line.hasAttribute("data-code") || line.hasAttribute("data-out-line") || line.hasAttribute("data-runtime")),
      pc: 0,
      pcAt: 0,
      pcEl: null,
      visual: false,
      waitingFor: null,
      anims: [],
      checkAt: 0,
      maths: Array.from(screen.querySelectorAll<HTMLElement>("[data-math]")).filter(
        (el) => !el.closest("[data-choices]") && !el.closest("[data-cell]") && !el.closest("[data-construction]"),
      ),
      runtime: null,
    };
    // The cell's own run time in this browser, off the animation frame.
    const active = play;
    const body = screen.querySelector<HTMLElement>("[data-cell]")?.dataset.body;
    if (body && !omr) {
      window.setTimeout(() => {
        try {
          // Repeated until the clock (coarse in some browsers) has 2 ms to measure; the mean of one run.
          const run = new Function("__o", body) as (o: unknown[]) => void;
          run([]);
          let runs = 0;
          const t0 = performance.now();
          while (performance.now() - t0 < 2 && runs < 5000) {
            run([]);
            runs++;
          }
          const ms = (performance.now() - t0) / Math.max(1, runs);
          active.runtime = ms < 0.001 ? ms.toExponential(1) : ms.toFixed(ms < 1 ? 4 : 2);
        } catch {
          active.runtime = null;
        }
      }, 0);
    }
    wake();
  };

  const scrollTo = (top: number, dur = GLIDE_MS) => {
    reader.style.scrollSnapType = "none";
    glide = { from: scroll, to: top, start: performance.now(), dur };
    wake();
  };
  /** Moves the page a frame along its glide. */
  const glideStep = (now: number) => {
    if (!glide) return;
    const p = clamp((now - glide.start) / glide.dur, 0, 1);
    const eased = 1 - (1 - p) ** 3;
    scroll = glide.from + (glide.to - glide.from) * eased;
    reader.scrollTop = scroll;
    if (p >= 1) {
      glide = null;
      scroll = reader.scrollTop;
      if (!snapOff) reader.style.scrollSnapType = "";
    }
  };

  const turn = (active: Play, target: number) => {
    const top = tops[active.index];
    const last = top + Math.max(0, heights[active.index] - viewport);
    active.target = clamp(target, top, last);
    active.view = active.target;
    active.viewAt = performance.now();
    if (Math.abs(scroll - active.target) > 2 && current() === active.index) scrollTo(active.target);
  };
  const arrived = (active: Play, waited: number) => Math.abs(scroll - active.target) <= 2 || waited >= ARRIVE_MS;

  /** Keeps a rect on screen, turning down to it (never up) while writing. */
  const follow = (active: Play, r: Rect, now: number) => {
    if (handsOff(now)) return;
    const view = active.view !== null && now - active.viewAt < SCROLL_SETTLE_MS ? active.view : scroll;
    if (r.y + r.h <= view + viewport - FOOT_CLEARANCE) return;
    const top = tops[active.index];
    const target = Math.min(top + heights[active.index] - viewport, r.y - viewport * PAGE_LINE);
    if (target <= view + 1) return;
    active.view = target;
    active.viewAt = now;
    scrollTo(target);
  };

  /** Writes the next bursts of the lines being streamed (several short lines may finish in one frame); false when done. */
  const stream = (active: Play, now: number) => {
    let at = active.line?.start ?? now;
    for (let guard = 0; guard < 40; guard++) {
      if (!streamLine(active, now, at)) return false;
      if (active.line) return true;
      // The next line starts where the last one ended, not at the next frame.
      at = active.lineEnd;
      if (at > now) return true;
    }
    return true;
  };

  const streamLine = (active: Play, now: number, startAt: number) => {
    if (!active.line) {
      const el = active.queue.shift();
      if (!el) return false;
      const ink = el.querySelector<HTMLElement>("[data-ink]");
      const typed = el.querySelector<HTMLElement>("[data-type]");
      if (el.hasAttribute("data-elapsed") && ink) {
        const seconds = Math.round((now - sessionStart) / 1000);
        ink.textContent = `시험 시간 100분 중 ${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
      }
      const r = ink ? rectOf(ink) : { x: 0, y: 0, w: 0, h: 0 };
      const stops = ink ? stopsOf(ink) : [0];
      active.line = {
        el: typed ?? el,
        ink,
        caret: typed?.querySelector<HTMLElement>("[data-caret]") ?? null,
        r,
        stops,
        times: streamTimes(stops.length - 1, Number(typed?.dataset.len ?? stops.length)),
        start: startAt,
        shown: 0,
      };
      active.line.el.setAttribute("data-writing", "");
      for (const effect of effectsOf(el)) if (effect.k === "read") fire(active, effect, now);
    }
    const line = active.line;
    const t = now - line.start;
    let count = line.shown;
    while (count < line.times.length && line.times[count] <= t) count++;
    if (count !== line.shown && line.ink && line.caret) {
      line.shown = count;
      const x = line.stops[count];
      line.ink.style.clipPath = `inset(-0.7em ${Math.max(0, line.r.w - x).toFixed(1)}px -0.7em 0)`;
      line.caret.style.transform = `translateX(${x.toFixed(1)}px)`;
      click();
    }
    follow(active, line.r, now);
    if (count >= line.times.length) {
      active.lineEnd = line.start + (line.times[line.times.length - 1] ?? 0);
      line.el.removeAttribute("data-writing");
      line.el.setAttribute("data-done", "");
      if (line.ink) line.ink.style.clipPath = "";
      active.line = null;
    }
    return true;
  };

  /** Steps the run marker by time (several lines a frame when due); false when every line has run. */
  const run = (active: Play, now: number) => {
    for (let guard = 0; guard < 40; guard++) {
      const due = active.waitingFor !== null || now - active.pcAt >= RUN_STEP_MS;
      if (!due) return true;
      const before = active.pc;
      if (!runStep(active, now)) return false;
      if (active.waitingFor || active.pc === before) return true;
    }
    return true;
  };

  const runStep = (active: Play, now: number) => {
    if (active.waitingFor) {
      if (!arrived(active, now - active.since)) return true;
      for (const effect of active.waitingFor) fire(active, effect, now);
      active.waitingFor = null;
      active.visual = true;
      active.pcAt = now;
      return true;
    }
    if (now - active.pcAt < RUN_STEP_MS) return true;
    const el = active.runs[active.pc];
    if (!el) {
      active.pcEl?.removeAttribute("data-pc");
      return false;
    }
    active.pc++;
    active.pcAt = Math.max(active.pcAt + RUN_STEP_MS, now - RUN_STEP_MS * 4);
    if (el.hasAttribute("data-runtime")) {
      const out = el.querySelector<HTMLElement>("[data-time]");
      if (out && active.runtime !== null) out.textContent = `// ${out.dataset.time} statements · ${active.runtime} ms`;
      out?.setAttribute("data-on", "");
      return true;
    }
    if (el.hasAttribute("data-code")) {
      active.pcEl?.removeAttribute("data-pc");
      el.setAttribute("data-pc", "");
      active.pcEl = el;
    }
    el.querySelector("[data-out]")?.setAttribute("data-on", "");
    const effects = effectsOf(el).filter((effect) => effect.k !== "read");
    if (effects.length) {
      // Show what is drawn on first.
      const target = targetOf(active, effects[0]);
      if (target && !handsOff(now)) {
        const r = rectOf(target);
        if (!visible(r)) {
          turn(active, r.y - viewport * 0.08);
          active.waitingFor = effects;
          active.since = now;
          return true;
        }
      }
      for (const effect of effects) fire(active, effect, now);
      active.visual = active.visual || !!target;
    }
    if (!active.visual) follow(active, rectOf(el), now);
    return true;
  };

  const step = (active: Play, now: number) => {
    const waited = now - active.since;
    const screen = active.screen;
    const animating = animate(active, now);
    switch (active.phase) {
      case "stream":
        if (!stream(active, now)) {
          active.pcAt = now - RUN_STEP_MS;
          enter(active, "run", now);
        }
        break;
      case "run":
        if (run(active, now) || animating) break;
        enter(active, active.omr ? "post" : "settle", now);
        break;
      case "post":
        // The sheet's result lines, then the confetti.
        if (active.queue.length === 0 && !active.line) active.queue = Array.from(screen.querySelectorAll<HTMLElement>("[data-result]"));
        if (stream(active, now) || active.queue.length) break;
        confetti(document.body.querySelector("[data-cursors]") ?? document.body);
        enter(active, "done", now);
        break;
      case "settle": {
        if (waited < SETTLE_MS || handsOff(now)) break;
        const choices = screen.querySelector("[data-choices]");
        if (choices && screen.dataset.answer) {
          const r = rectOf(choices);
          if (!visible(r)) turn(active, r.y + r.h / 2 - viewport / 2);
          else active.target = scroll;
          enter(active, "toFocus", now);
        } else enter(active, "mark", now);
        break;
      }
      case "toFocus":
        if (!arrived(active, waited)) break;
        // Verdicts at once, the false ones struck, then the answer circled.
        Array.from(screen.querySelectorAll<HTMLElement>("[data-verdict]")).forEach((verdict, i) =>
          active.anims.push({ start: now + i * 25, dur: 1, done: () => verdict.setAttribute("data-on", "") }),
        );
        Array.from(screen.querySelectorAll<HTMLElement>("[data-choice]"))
          .filter((choice) => !choice.querySelector("[data-verdict][data-true]"))
          .forEach((choice, j) => {
            const line = choice.querySelector<HTMLElement>("[data-strike]");
            active.anims.push({
              start: now + 130 + j * 25,
              dur: 120,
              update: (p) => {
                if (line) line.style.transform = `scaleX(${p.toFixed(3)})`;
              },
              done: () => choice.setAttribute("data-out", ""),
            });
          });
        active.checkAt = now + 130 + 4 * 25 + 120 + 40;
        enter(active, "check", now);
        break;
      case "check":
        if (now < active.checkAt || animating) break;
        screen.querySelector(`[data-choice="${screen.dataset.answer}"]`)?.setAttribute("data-circled", "");
        enter(active, "mark", now);
        break;
      case "mark":
        if (waited < GRADE_AFTER_MS || handsOff(now)) break;
        turn(active, tops[active.index]);
        enter(active, "toTop", now);
        break;
      case "toTop":
        if (!arrived(active, waited)) break;
        screen.setAttribute("data-graded", "");
        enter(active, "graded", now);
        break;
      case "graded": {
        if (waited < HOLD_MS || handsOff(now)) break;
        const next = active.index + 1;
        enter(active, "done", now);
        snapOff = false;
        if (next < screens.length && current() === active.index) scrollTo(tops[next], TURN_MS);
        break;
      }
    }
  };

  function tick(now: number) {
    glideStep(now);
    if (play && play.phase !== "done") {
      step(play, now);
      frame = requestAnimationFrame(tick);
    } else if ((play && animate(play, now)) || glide) {
      frame = requestAnimationFrame(tick);
    } else sleeping = true;
  }

  const onScroll = () => {
    scroll = reader.scrollTop;
    wake();
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      const index = current();
      if (!play || index !== play.index) begin(index);
    }, 60);
  };
  const onUserScroll = () => {
    lastUserScroll = performance.now();
    if (glide) {
      glide = null;
      if (!snapOff) reader.style.scrollSnapType = "";
    }
  };
  const inputs = ["wheel", "touchmove", "keydown"] as const;
  const resize = new ResizeObserver(remeasure);
  const stopAudio = listenForGesture();

  reader.addEventListener("scroll", onScroll, { passive: true });
  for (const type of inputs) reader.addEventListener(type, onUserScroll, { passive: true });
  resize.observe(reader);
  begin(current());
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(settleTimer);
    reader.removeEventListener("scroll", onScroll);
    for (const type of inputs) reader.removeEventListener(type, onUserScroll);
    resize.disconnect();
    stopAudio();
  };
}
