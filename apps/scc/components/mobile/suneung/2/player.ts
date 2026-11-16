// Plays each question's solution at its authored pace (math-2026/solutions.json):
// steps are written character by character over their durations, the answer is
// circled (or written) when the solution ends, then the reader moves to the
// next question. Whichever question the reader settles on — by the player or
// by a person scrolling — starts its solution from the beginning.

/** Where in the viewport a question counts as the one being read. */
const READ_LINE = 0.3;
/** Space kept under the line being written, as a share of the viewport. */
const FOLLOW_MARGIN = 0.18;
/** A person's own scrolling pauses the follow-scroll for this long. */
const HANDS_OFF_MS = 1500;
/** Pause after the answer is marked, before turning to the next question. */
const AFTER_ANSWER_MS = 450;

type Step = { element: HTMLElement; shown: HTMLElement; rest: HTMLElement; text: string; at: number; dur: number; written: number };

type Play = {
  screen: HTMLElement;
  steps: Step[];
  final: HTMLElement | null;
  answer: HTMLElement | null;
  duration: number;
  start: number;
  done: boolean;
};

function reset(screen: HTMLElement) {
  for (const step of Array.from(screen.querySelectorAll<HTMLElement>("[data-step]"))) {
    step.hidden = true;
    (step.querySelector("[data-shown]") as HTMLElement).textContent = "";
    (step.querySelector("[data-rest]") as HTMLElement).textContent = step.dataset.text ?? "";
  }
  screen.querySelector<HTMLElement>("[data-final]")?.setAttribute("hidden", "");
  for (const choice of Array.from(screen.querySelectorAll<HTMLElement>("[data-circled]"))) choice.removeAttribute("data-circled");
}

export function startPlayer(reader: HTMLElement) {
  const screens = Array.from(reader.querySelectorAll<HTMLElement>("[data-question]"));
  let play: Play | null = null;
  let frame = 0;
  let turnTimer = 0;
  let settleTimer = 0;
  let handsOffUntil = 0;
  let lastUserScroll = -Infinity;

  const current = () => {
    const line = reader.scrollTop + reader.clientHeight * READ_LINE;
    return screens.find((screen) => screen.offsetTop <= line && line < screen.offsetTop + screen.offsetHeight) ?? screens[0];
  };

  const begin = (screen: HTMLElement) => {
    window.clearTimeout(turnTimer);
    reset(screen);
    const solution = screen.querySelector<HTMLElement>("[data-solution]");
    const steps = Array.from(screen.querySelectorAll<HTMLElement>("[data-step]")).map((element) => ({
      element,
      shown: element.querySelector("[data-shown]") as HTMLElement,
      rest: element.querySelector("[data-rest]") as HTMLElement,
      text: element.dataset.text ?? "",
      at: Number(element.dataset.at),
      dur: Math.max(1, Number(element.dataset.dur)),
      written: -1,
    }));
    const answerMark = solution?.dataset.answer;
    play = {
      screen,
      steps,
      final: screen.querySelector<HTMLElement>("[data-final]"),
      answer: answerMark ? screen.querySelector<HTMLElement>(`[data-choice="${answerMark}"]`) : null,
      duration: Number(solution?.dataset.duration ?? 0),
      start: performance.now(),
      done: false,
    };
  };

  /** Keep the line being written in view, unless a person is scrolling. */
  const follow = (element: HTMLElement) => {
    if (performance.now() < handsOffUntil) return;
    const bottom = element.getBoundingClientRect().bottom - reader.getBoundingClientRect().top;
    const limit = reader.clientHeight * (1 - FOLLOW_MARGIN);
    if (bottom > limit) reader.scrollTop += bottom - limit;
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (!play || play.done) return;
    const t = now - play.start;
    let writing: HTMLElement | null = null;
    for (const step of play.steps) {
      if (t < step.at) break;
      if (step.element.hidden) step.element.hidden = false;
      const count = Math.min(step.text.length, Math.ceil(((t - step.at) / step.dur) * step.text.length));
      if (count !== step.written) {
        step.written = count;
        step.shown.textContent = step.text.slice(0, count);
        step.rest.textContent = step.text.slice(count);
      }
      writing = step.element;
    }
    if (writing) follow(writing);
    if (t >= play.duration) {
      play.done = true;
      for (const step of play.steps) {
        step.element.hidden = false;
        step.shown.textContent = step.text;
        step.rest.textContent = "";
      }
      if (play.answer) play.answer.setAttribute("data-circled", "");
      if (play.final) {
        play.final.hidden = false;
        follow(play.final);
      } else if (play.answer) follow(play.answer);
      const index = screens.indexOf(play.screen);
      const next = screens[index + 1];
      if (next) {
        turnTimer = window.setTimeout(() => {
          // A person who just scrolled keeps control; the player only turns pages it is still on.
          if (performance.now() - lastUserScroll < HANDS_OFF_MS || current() !== play?.screen) return;
          reader.scrollTo({ top: next.offsetTop, behavior: "smooth" });
        }, AFTER_ANSWER_MS);
      }
    }
  };

  // Settled on another question (by the player's turn or a person's scroll): start it.
  const onScroll = () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      const screen = current();
      if (screen !== play?.screen) begin(screen);
    }, 140);
  };
  const onUserInput = () => {
    lastUserScroll = performance.now();
    handsOffUntil = lastUserScroll + HANDS_OFF_MS;
  };

  reader.addEventListener("scroll", onScroll, { passive: true });
  for (const type of ["wheel", "touchstart", "touchmove", "keydown", "pointerdown"] as const) {
    reader.addEventListener(type, onUserInput, { passive: true });
  }
  begin(current());
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(turnTimer);
    window.clearTimeout(settleTimer);
    reader.removeEventListener("scroll", onScroll);
    for (const type of ["wheel", "touchstart", "touchmove", "keydown", "pointerdown"] as const) {
      reader.removeEventListener(type, onUserInput);
    }
  };
}
