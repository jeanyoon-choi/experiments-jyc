// Plays each question's solution (math-2026/solutions.json) at twice the
// authored pace, written like a pen under the question: words come in bursts
// at their own speed, the hand drifts faster and slower, rests after commas
// and full stops and now and then stops to think, with every step still
// ending on its authored time. Writing never leaves the screen: when a line
// would fall below the fold the reader turns down to it. When the solution is
// done the reader waits half a second, goes back up to the question if it had
// turned down, marks the answer (a pen loop, or the boxed 답), then the marker
// circles the question number in red; two seconds later the reader turns to
// the next question. Whichever question the reader settles on, by a turn or a
// person's scroll, starts its solution there.

/** Solutions play at this multiple of the authored pace. */
const SPEED = 2;
/** After the last character, before going back up to the question. */
const AFTER_WRITING_MS = 500;
/** The answer is marked first; the red circle follows after this long. */
const GRADE_AFTER_MS = 420;
/** The graded question stays on screen this long before the next one. */
const HOLD_MS = 2000;
/** Where in the viewport a question counts as the one being read. */
const READ_LINE = 0.3;
/** The line being written stays at least this far above the foot of the screen, in px. */
const FOOT_CLEARANCE = 44;
/** A turn down puts the line being written this far down the screen. */
const PAGE_LINE = 0.24;
/** A person's own scrolling keeps the player from moving the page for this long. */
const HANDS_OFF_MS = 1500;
/** Longest wait for a smooth scroll to arrive. */
const ARRIVE_MS = 1600;

type Step = {
  element: HTMLElement;
  shown: HTMLElement;
  rest: HTMLElement;
  caret: HTMLElement;
  chars: string[];
  /** Time each character is written, from the solution's start. */
  times: number[];
  written: number;
};

type Phase = "writing" | "written" | "returning" | "answered" | "graded" | "done";

type Play = {
  screen: HTMLElement;
  steps: Step[];
  final: HTMLElement | null;
  answer: HTMLElement | null;
  duration: number;
  start: number;
  phase: Phase;
  /** When the current phase began. */
  since: number;
  /** Where the reader is heading while it follows the writing; null when at rest. */
  view: number | null;
};

/** One normal deviate (Box–Muller). */
function gauss() {
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

const WORD = /[0-9A-Za-z가-힣]/;
const LATIN = /[0-9A-Za-z]/;

/**
 * Write times for a step's characters. Each character's share of the step is
 * random: a slow drift of the hand's speed, a speed of its own for every
 * word, jitter on every stroke, a look at the line before it starts, rests
 * after punctuation and between words, care at relation signs, and a few
 * stops to think. The shares are scaled so the last character lands at the
 * step's end.
 */
function typing(chars: string[], at: number, dur: number) {
  let drift = 0;
  let word = 1;
  const weights = chars.map((char, i) => {
    const previous = chars[i - 1] ?? "";
    drift = 0.88 * drift + 0.2 * gauss();
    if (i === 0 || !WORD.test(previous)) word = Math.exp(0.5 * gauss());
    let w = Math.exp(drift + 0.4 * gauss()) * word;
    if (i === 0) w *= 2.5 + 2.5 * Math.random();
    else if (/[,.?!:;]/.test(previous)) w *= 2.4 + 3.2 * Math.random();
    else if (previous === " ") w *= 1.2 + 1.1 * Math.random();
    if (/[=<>≤≥→]/.test(char)) w *= 1.2 + 0.9 * Math.random();
    if (LATIN.test(char) && LATIN.test(previous)) w *= 0.45;
    if (Math.random() < 0.028) w *= 4 + 6 * Math.random();
    return w;
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  let t = at;
  return weights.map((w) => (t += (w / total) * dur));
}

function clear(screen: HTMLElement) {
  for (const step of Array.from(screen.querySelectorAll<HTMLElement>("[data-step]"))) {
    step.removeAttribute("data-writing");
    (step.querySelector("[data-shown]") as HTMLElement).textContent = "";
    (step.querySelector("[data-rest]") as HTMLElement).textContent = step.dataset.text ?? "";
  }
  screen.querySelector<HTMLElement>("[data-final]")?.removeAttribute("data-on");
  for (const choice of Array.from(screen.querySelectorAll<HTMLElement>("[data-circled]"))) choice.removeAttribute("data-circled");
  screen.removeAttribute("data-graded");
}

export function startPlayer(reader: HTMLElement) {
  const screens = Array.from(reader.querySelectorAll<HTMLElement>("[data-question]"));
  let play: Play | null = null;
  let frame = 0;
  let settleTimer = 0;
  let lastUserScroll = -Infinity;

  const current = () => {
    const line = reader.scrollTop + reader.clientHeight * READ_LINE;
    return screens.find((screen) => screen.offsetTop <= line && line < screen.offsetTop + screen.offsetHeight) ?? screens[0];
  };

  const handsOff = (now: number) => now - lastUserScroll < HANDS_OFF_MS;

  const begin = (screen: HTMLElement) => {
    if (play && play.screen !== screen) clear(play.screen);
    clear(screen);
    const solution = screen.querySelector<HTMLElement>("[data-solution]");
    if (!solution) {
      play = null;
      return;
    }
    const steps = Array.from(screen.querySelectorAll<HTMLElement>("[data-step]")).map((element) => {
      const chars = Array.from(element.dataset.text ?? "");
      const at = Number(element.dataset.at) / SPEED;
      const dur = Math.max(1, Number(element.dataset.dur)) / SPEED;
      return {
        element,
        shown: element.querySelector("[data-shown]") as HTMLElement,
        rest: element.querySelector("[data-rest]") as HTMLElement,
        caret: element.querySelector("[data-caret]") as HTMLElement,
        chars,
        times: typing(chars, at, dur),
        written: 0,
      };
    });
    const mark = solution.dataset.answer;
    const now = performance.now();
    play = {
      screen,
      steps,
      final: screen.querySelector<HTMLElement>("[data-final]"),
      answer: mark ? screen.querySelector<HTMLElement>(`[data-choice="${mark}"]`) : null,
      duration: Number(solution.dataset.duration) / SPEED,
      start: now,
      phase: "writing",
      since: now,
      view: null,
    };
  };

  /** Turn down to the line being written before it falls below the fold. */
  const follow = (active: Play, line: HTMLElement, now: number) => {
    if (handsOff(now)) {
      active.view = null;
      return;
    }
    const box = line.getBoundingClientRect();
    const offset = reader.scrollTop - reader.getBoundingClientRect().top;
    const view = active.view ?? reader.scrollTop;
    if (box.bottom + offset <= view + reader.clientHeight - FOOT_CLEARANCE) return;
    const last = active.screen.offsetTop + active.screen.offsetHeight - reader.clientHeight;
    const target = Math.min(last, box.top + offset - reader.clientHeight * PAGE_LINE);
    if (target <= view + 1) return;
    active.view = target;
    reader.scrollTo({ top: target, behavior: "smooth" });
  };

  const enter = (active: Play, phase: Phase, now: number) => {
    active.phase = phase;
    active.since = now;
  };

  const write = (active: Play, now: number) => {
    const t = now - active.start;
    let line: HTMLElement | null = null;
    for (const step of active.steps) {
      let count = step.written;
      while (count < step.chars.length && step.times[count] <= t) count++;
      if (count !== step.written) {
        step.written = count;
        step.shown.textContent = step.chars.slice(0, count).join("");
        step.rest.textContent = step.chars.slice(count).join("");
        line = step.caret;
      }
      const writing = count > 0 && count < step.chars.length;
      if (writing !== step.element.hasAttribute("data-writing")) step.element.toggleAttribute("data-writing", writing);
    }
    if (t >= active.duration) {
      for (const step of active.steps) {
        step.element.removeAttribute("data-writing");
        step.shown.textContent = step.chars.join("");
        step.rest.textContent = "";
      }
      if (active.final) {
        active.final.setAttribute("data-on", "");
        line = active.final;
      }
      enter(active, "written", now);
    }
    if (line) follow(active, line, now);
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const active = play;
    if (!active || active.phase === "done") return;
    const waited = now - active.since;
    const top = active.screen.offsetTop;
    switch (active.phase) {
      case "writing":
        write(active, now);
        break;
      case "written":
        // Back up to the question if the writing took the reader down.
        if (waited < AFTER_WRITING_MS || handsOff(now)) break;
        if (Math.abs(reader.scrollTop - top) > 2 && current() === active.screen) reader.scrollTo({ top, behavior: "smooth" });
        enter(active, "returning", now);
        break;
      case "returning":
        if (Math.abs(reader.scrollTop - top) > 2 && waited < ARRIVE_MS) break;
        active.answer?.setAttribute("data-circled", "");
        enter(active, "answered", now);
        break;
      case "answered":
        if (waited < (active.answer ? GRADE_AFTER_MS : 0)) break;
        active.screen.setAttribute("data-graded", "");
        enter(active, "graded", now);
        break;
      case "graded": {
        // A person who just scrolled keeps the page; the turn waits for them.
        if (waited < HOLD_MS || handsOff(now)) break;
        const next = screens[screens.indexOf(active.screen) + 1];
        enter(active, "done", now);
        // Settling on the next question starts it (onScroll), so its clock starts on arrival.
        if (next && current() === active.screen) reader.scrollTo({ top: next.offsetTop, behavior: "smooth" });
        break;
      }
    }
  };

  // Settled on another question (by the player's turn or a person's scroll): start it.
  const onScroll = () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      const screen = current();
      if (screen !== play?.screen) begin(screen);
    }, 100);
  };
  const onUserInput = () => {
    lastUserScroll = performance.now();
  };
  const inputs = ["wheel", "touchstart", "touchmove", "keydown", "pointerdown"] as const;

  reader.addEventListener("scroll", onScroll, { passive: true });
  for (const type of inputs) reader.addEventListener(type, onUserInput, { passive: true });
  begin(current());
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(settleTimer);
    reader.removeEventListener("scroll", onScroll);
    for (const type of inputs) reader.removeEventListener(type, onUserInput);
  };
}
