import { click, listenForGesture } from "./audio";
import { confetti } from "./confetti";
import styles from "./swarm.module.css";
import { linear } from "./work";

// A swarm of agents works the booklet, question by question, as multiplayer
// cursors on the paper. For each question:
//   read     — crosshairs box every equation of the question and badge it
//              with what they read (its linear form); a figure is boxed with
//              its printed size and swept;
//   compute  — I-beams type the operations into the margin, set in LaTeX's
//              face, several lines at once, with key clicks; pens draw
//              plots and, on a geometry figure, the construction beside the
//              line that uses it;
//   check    — every choice is evaluated beside itself at once, the ones that
//              are not the value are struck, and the swarm converges on the
//              one that is (or on the boxed 답);
// then the answer is circled, the number is circled in red, and the swarm
// turns to the next question. Harder questions bring more agents in from the
// sides. After question 30 the swarm fills the answer sheet, writes the time,
// fires the confetti and leaves.
//
// Performance: a frame reads first and writes after. Geometry is measured
// once per task, when its agent leaves (in scroll coordinates, which do not
// change while a question plays: typing is a clip and changes no layout), and
// the scroll position and reader box are kept from events. So a frame forces
// no layout; it writes clip-paths, transforms and a few mark boxes. Agents
// that have not moved are not written, and the loop sleeps when nothing moves.

/** One colour per agent; red is kept for grading. */
const COLORS = ["#2563eb", "#16a34a", "#9333ea", "#db2777", "#0891b2", "#ea580c", "#4f46e5", "#0d9488"];
const POOL = 24;
const ACTIVE: Record<string, number> = { easy: 6, mid: 10, hard: 14, killer: 22 };
/** A question's computation gets this share of its authored duration (solutions.json: 157 s in all). */
const PACE = 0.29;
const BUDGET_MIN = 600;
const BUDGET_MAX = 2400;
/** Typing: ms per character of the line's source. */
const MS_PER_CHAR = 5;
/** Where in the viewport a question counts as the one being read. */
const READ_LINE = 0.3;
/** What is being written stays at least this far above the foot of the screen, in px. */
const FOOT_CLEARANCE = 44;
/** A turn down puts what is being written this far down the screen. */
const PAGE_LINE = 0.24;
const HANDS_OFF_MS = 1200;
const ARRIVE_MS = 900;
/** A smooth scroll this old is taken to have ended (or been cut short). */
const SCROLL_SETTLE_MS = 650;
const SETTLE_MS = 120;
/** The answer is circled first; the red grade follows after this long. */
const GRADE_AFTER_MS = 220;
/** The graded question stays on screen this long before the next one. */
const HOLD_MS = 750;
const MAX_READS = 10;
const LABEL_CHARS = 34;

type Mode = "arrow" | "text" | "cross";
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

type Agent = {
  el: HTMLElement;
  color: string;
  mode: Mode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Last written position. */
  wx: number;
  wy: number;
  active: boolean;
  freeAt: number;
  task: Task | null;
  angle: number;
  radius: number;
  spin: number;
  side: -1 | 1;
  park: number;
};

type Task = {
  wish: number;
  start: number;
  approach: number;
  work: number;
  mode: Mode;
  agent: Agent | null;
  state: 0 | 1 | 2 | 3;
  p: number;
  /** Reads: measure once, when the agent leaves. */
  prepare?(): void;
  /** Where the cursor is at work progress p (pure: cached geometry only). */
  aim(p: number): Point | null;
  begin?(agent: Agent): void;
  update?(p: number): void;
  finish?(): void;
  /** What the task writes, for the page to follow (cached). */
  focus?: Rect;
};

type Timeline = { origin: number; tasks: Task[] };

type Phase = "A" | "settle" | "toFocus" | "B" | "mark" | "toTop" | "graded" | "done";

type Play = {
  screen: HTMLElement;
  index: number;
  omr: boolean;
  phase: Phase;
  since: number;
  timeline: Timeline | null;
  target: number;
  /** Where the page was last sent within the question, and when. */
  view: number | null;
  viewAt: number;
  /** The question's box in scroll coordinates, measured when it begins. */
  origin: Rect;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function gauss() {
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

/** Times for `count` reveals over dur: bursts and small stops, the last landing at dur. */
function typing(count: number, dur: number) {
  let drift = 0;
  const weights = Array.from({ length: count }, (_, i) => {
    drift = 0.85 * drift + 0.25 * gauss();
    let w = Math.exp(drift + 0.35 * gauss());
    if (i === 0) w *= 2;
    if (Math.random() < 0.03) w *= 4;
    return w;
  });
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  let t = 0;
  return weights.map((w) => (t += (w / total) * dur));
}

const CURSOR = `
<svg class="${styles.arrow}" viewBox="0 0 16 20"><path d="M1.5 1.5V15.6L5.3 12.1L7.9 18.2L10.5 17.1L7.9 11.1H13Z"/></svg>
<svg class="${styles.ibeam}" viewBox="0 0 10 18"><path class="${styles.under}" d="M2 1.5h6M2 16.5h6M5 1.5v15"/><path class="${styles.over}" d="M2 1.5h6M2 16.5h6M5 1.5v15"/></svg>
<svg class="${styles.cross}" viewBox="0 0 16 16"><path class="${styles.under}" d="M8 1v14M1 8h14"/><path class="${styles.over}" d="M8 1v14M1 8h14"/></svg>`;

export function startSwarm(reader: HTMLElement, layer: HTMLElement) {
  const screens = Array.from(reader.querySelectorAll<HTMLElement>("[data-question], [data-omr]"));
  const sessionStart = performance.now();
  let play: Play | null = null;
  let frame = 0;
  let sleeping = false;
  let settleTimer = 0;
  let lastUserScroll = -Infinity;
  let last = performance.now();

  // Kept from events, never read in a frame.
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

  // Badge widths from the font, without layout.
  const measureContext = document.createElement("canvas").getContext("2d");
  const mono = getComputedStyle(reader).getPropertyValue("--mono") || "monospace";
  if (measureContext) measureContext.font = `500 10px ${mono}`;
  const textWidth = (text: string) => (measureContext ? measureContext.measureText(text).width : text.length * 6);

  const agents: Agent[] = Array.from({ length: POOL }, (_, i) => {
    const el = document.createElement("div");
    el.className = styles.cursor;
    el.innerHTML = CURSOR;
    el.dataset.mode = "arrow";
    const color = COLORS[i % COLORS.length];
    el.style.setProperty("--c", color);
    layer.append(el);
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? -40 : box.width + 40;
    const y = viewport * (0.2 + 0.6 * Math.random());
    return {
      el,
      color,
      mode: "arrow",
      x,
      y,
      vx: 0,
      vy: 0,
      wx: NaN,
      wy: NaN,
      active: false,
      freeAt: 0,
      task: null,
      angle: Math.random() * Math.PI * 2,
      radius: 22 + Math.random() * 56,
      spin: (0.6 + Math.random() * 1.0) * (Math.random() < 0.5 ? -1 : 1),
      side,
      park: 0.15 + Math.random() * 0.7,
    };
  });

  // ---------------------------------------------------------------------
  // Geometry, in the reader's scroll coordinates. Only called while preparing.

  const rectOf = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { x: r.left - box.left, y: r.top - box.top + scroll, w: r.width, h: r.height };
  };
  const pointOf = (x: number, y: number): Point => ({ x: x - box.left, y: y - box.top + scroll });

  const indexAt = (y: number) => {
    for (let i = 0; i < screens.length; i++) if (tops[i] <= y && y < tops[i] + heights[i]) return i;
    return 0;
  };
  const current = () => indexAt(scroll + viewport * READ_LINE);
  const handsOff = (now: number) => now - lastUserScroll < HANDS_OFF_MS;

  const markOn = (screen: HTMLElement, className: string, color: string) => {
    const el = document.createElement("div");
    el.className = className;
    el.style.setProperty("--c", color);
    screen.querySelector<HTMLElement>("[data-layer]")?.append(el);
    return el;
  };
  /** Positions a mark from scroll coordinates, relative to the playing question. */
  const place = (el: HTMLElement, r: Rect) => {
    const origin = play?.origin ?? { x: 0, y: 0 };
    el.style.transform = `translate(${(r.x - origin.x).toFixed(1)}px, ${(r.y - origin.y).toFixed(1)}px)`;
    el.style.width = `${r.w.toFixed(1)}px`;
    el.style.height = `${r.h.toFixed(1)}px`;
  };

  // ---------------------------------------------------------------------
  // Tasks.

  const task = (fields: Omit<Task, "start" | "agent" | "state" | "p">): Task => ({ ...fields, start: 0, agent: null, state: 0, p: 0 });

  const marquee = (screen: HTMLElement, el: Element, label: string, wish: number) => {
    let r: Rect = { x: 0, y: 0, w: 0, h: 0 };
    let frameEl: HTMLElement | null = null;
    const t = task({
      wish,
      approach: 110,
      work: 130,
      mode: "cross",
      prepare() {
        const m = rectOf(el);
        r = { x: m.x - 2, y: m.y - 2, w: m.w + 4, h: m.h + 4 };
        t.focus = r;
      },
      aim: (p) => ({ x: r.x + r.w * p, y: r.y + r.h * p }),
      begin(agent) {
        frameEl = markOn(screen, styles.box, agent.color);
        place(frameEl, { ...r, w: 0, h: 0 });
      },
      update(p) {
        if (frameEl) place(frameEl, { ...r, w: r.w * p, h: r.h * p });
      },
      finish() {
        if (!frameEl || !play) return;
        place(frameEl, r);
        const badge = markOn(screen, styles.badge, frameEl.style.getPropertyValue("--c"));
        badge.textContent = label;
        const width = textWidth(label) + 8;
        const x = clamp(r.x, play.origin.x + 4, play.origin.x + play.origin.w - width - 4);
        badge.style.transform = `translate(${(x - play.origin.x).toFixed(1)}px, ${(r.y + r.h + 3 - play.origin.y).toFixed(1)}px)`;
      },
    });
    return t;
  };

  const sweep = (screen: HTMLElement, el: Element, wish: number) => {
    let r: Rect = { x: 0, y: 0, w: 0, h: 0 };
    let line: HTMLElement | null = null;
    const t = task({
      wish,
      approach: 90,
      work: 280,
      mode: "cross",
      prepare() {
        r = rectOf(el);
        t.focus = r;
      },
      aim: (p) => ({ x: r.x + r.w * p, y: r.y - 3 }),
      begin(agent) {
        line = markOn(screen, styles.sweep, agent.color);
      },
      update(p) {
        if (line) place(line, { x: r.x + r.w * p, y: r.y, w: 1, h: r.h });
      },
      finish() {
        line?.remove();
      },
    });
    return t;
  };

  /** Glyph edges of typed text, from the left of its ink: where the clip stops. */
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

  /** Type a [data-type] element: reveal it glyph by glyph from the left, with a key click for each. */
  const typed = (el: HTMLElement, wish: number, work: number, approach = 120, before?: () => void, pitch = 1) => {
    const ink = el.querySelector<HTMLElement>("[data-ink]");
    const caret = el.querySelector<HTMLElement>("[data-caret]");
    let r: Rect = { x: 0, y: 0, w: 0, h: 0 };
    let stops = [0];
    let times: number[] = [];
    let shown = 0;
    const t = task({
      wish,
      approach,
      work,
      mode: "text",
      prepare() {
        before?.();
        if (!ink) return;
        r = rectOf(ink);
        stops = stopsOf(ink);
        times = typing(stops.length - 1, work);
        t.focus = r;
      },
      aim: () => ({ x: r.x + stops[shown] + 2, y: r.y + r.h / 2 }),
      begin(agent) {
        el.style.setProperty("--c", agent.color);
        el.setAttribute("data-writing", "");
      },
      update(p) {
        const now = p * work;
        let count = shown;
        while (count < times.length && times[count] <= now) count++;
        if (count === shown || !ink || !caret) return;
        shown = count;
        const x = stops[count];
        ink.style.clipPath = `inset(-0.7em ${Math.max(0, r.w - x).toFixed(1)}px -0.7em -0.2em)`;
        caret.style.transform = `translateX(${x.toFixed(1)}px)`;
        click(pitch);
      },
      finish() {
        el.removeAttribute("data-writing");
        el.setAttribute("data-done", "");
        if (ink) ink.style.clipPath = "";
      },
    });
    return t;
  };

  /** A path drawn with the pen along its length (plot curves, construction strokes). */
  const pen = (path: SVGPathElement, wish: number, work: number, after?: () => void) => {
    let length = 0;
    let matrix: DOMMatrix | null = null;
    const t = task({
      wish,
      approach: 120,
      work,
      mode: "cross",
      prepare() {
        length = path.getTotalLength();
        const ctm = path.getScreenCTM();
        // Screen → scroll coordinates, fixed for the task.
        matrix = ctm ? new DOMMatrix().translate(-box.left, -box.top + scroll).multiply(ctm) : null;
        t.focus = rectOf(path);
      },
      aim(p) {
        if (!matrix) return null;
        const point = path.getPointAtLength(length * p);
        const at = new DOMPoint(point.x, point.y).matrixTransform(matrix);
        return { x: at.x, y: at.y };
      },
      begin(agent) {
        path.style.setProperty("--c", agent.color);
        if (path.parentElement) (path.parentElement as unknown as SVGElement).style.setProperty("--c", agent.color);
      },
      update(p) {
        path.style.strokeDashoffset = String(1 - p);
      },
      finish() {
        path.style.strokeDashoffset = "0";
        after?.();
      },
    });
    return t;
  };

  const reveal = (el: SVGGraphicsElement, wish: number, work: number, after?: () => void, hide?: SVGGraphicsElement) => {
    let at: Point = { x: 0, y: 0 };
    const t = task({
      wish,
      approach: 110,
      work,
      mode: "arrow",
      prepare() {
        const r = el.getBoundingClientRect();
        at = pointOf(r.left + r.width / 2, r.top + Math.min(r.height / 2, 6));
        t.focus = rectOf(el);
      },
      aim: () => at,
      begin(agent) {
        el.style.setProperty("--c", agent.color);
        el.style.visibility = "visible";
        if (hide) hide.style.visibility = "";
      },
      finish: after,
    });
    return t;
  };

  const strike = (choice: HTMLElement, wish: number) => {
    const text = choice.querySelector<HTMLElement>(`.${styles.choiceText}`);
    const line = choice.querySelector<HTMLElement>("[data-strike]");
    let r: Rect = { x: 0, y: 0, w: 0, h: 0 };
    return task({
      wish,
      approach: 100,
      work: 120,
      mode: "arrow",
      prepare() {
        if (text) r = rectOf(text);
      },
      aim: (p) => ({ x: r.x + r.w * p, y: r.y + r.h * 0.55 }),
      begin(agent) {
        line?.style.setProperty("--c", agent.color);
      },
      update(p) {
        if (line) line.style.transform = `scaleX(${p.toFixed(3)})`;
      },
      finish() {
        choice.setAttribute("data-out", "");
      },
    });
  };

  const converge = (el: Element, wish: number) => {
    const active = agents.filter((agent) => agent.active);
    return active.map((agent, i) => {
      const angle = (i / active.length) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 18 + (i % 3) * 10 + Math.random() * 6;
      let center: Point = { x: 0, y: 0 };
      const t = task({
        wish: wish + Math.random() * 50,
        approach: 160,
        work: 40,
        mode: "arrow",
        prepare() {
          const r = rectOf(el);
          center = { x: r.x + Math.min(r.w, 40) / 2, y: r.y + r.h / 2 };
        },
        aim: () => ({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius * 0.8 }),
      });
      t.agent = agent;
      return t;
    });
  };

  const fill = (bubble: HTMLElement, wish: number) => {
    let at: Point = { x: 0, y: 0 };
    return task({
      wish,
      approach: 100,
      work: 50,
      mode: "arrow",
      prepare() {
        const r = bubble.getBoundingClientRect();
        at = pointOf(r.left + r.width / 2, r.top + r.height / 2);
      },
      aim: () => at,
      finish() {
        bubble.setAttribute("data-filled", "");
        click(0.55);
      },
    });
  };

  // ---------------------------------------------------------------------
  // Plans.

  const truncate = (text: string) => (text.length > LABEL_CHARS ? `${text.slice(0, LABEL_CHARS - 1)}…` : text);
  const lengthOf = (el: HTMLElement) => Number(el.querySelector<HTMLElement>("[data-type]")?.dataset.len ?? el.dataset.len ?? 20);

  /** Read and compute. */
  const planWork = (screen: HTMLElement): Task[] => {
    const tasks: Task[] = [];
    const budget = clamp(Number(screen.dataset.duration ?? 0) * PACE, BUDGET_MIN, BUDGET_MAX);
    const maths = Array.from(screen.querySelectorAll<HTMLElement>("[data-math]"))
      .filter((el) => !el.closest("[data-choices]") && !el.closest("[data-work]") && !el.closest("[data-construction]"))
      .slice(0, MAX_READS);
    maths.forEach((el, i) => tasks.push(marquee(screen, el, truncate(linear(el.dataset.math ?? "")), 20 + i * 22)));
    let t = 20 + maths.length * 22;
    const figure = screen.querySelector<HTMLElement>("[data-fig-w]");
    if (figure) {
      const size = `${Math.round(Number(figure.dataset.figW))} × ${Math.round(Number(figure.dataset.figH))}`;
      tasks.push(marquee(screen, figure, size, t + 20));
      tasks.push(sweep(screen, figure, t + 60));
      t += 200;
    }
    const opsStart = Math.max(110, t * 0.5);
    const work = screen.querySelector<HTMLElement>("[data-work]");
    const ops = Array.from(screen.querySelectorAll<HTMLElement>("[data-op] > [data-type]"));
    const plot = screen.querySelector<SVGSVGElement>("[data-plot]");
    const plotOps = plot ? Number(work?.dataset.plotOps ?? 0) : 0;
    const lineWork = (el: HTMLElement) => clamp(lengthOf(el) * MS_PER_CHAR, 110, budget * 0.5) * (0.85 + 0.3 * Math.random());

    // Lines start in order, spread over the budget; several are written at once.
    const lineWish: number[] = [];
    let next = opsStart;
    if (plot) {
      const curves = Array.from(plot.querySelectorAll<SVGPathElement>("[data-curve]"));
      curves.forEach((path, i) => tasks.push(pen(path, opsStart + i * 70, 380)));
      const span = budget * 0.5;
      for (let k = 0; k < plotOps; k++) lineWish[k] = opsStart + 140 + (k * span) / Math.max(1, plotOps);
      const sums = Array.from(plot.querySelectorAll<SVGGElement>("[data-sum]"));
      sums.forEach((sum, j) => tasks.push(reveal(sum, lineWish[j + 1] + 20, 90, undefined, sums[j - 1])));
      const points = Array.from(plot.querySelectorAll<SVGCircleElement>("[data-point]"));
      points.forEach((point, k) =>
        tasks.push(
          reveal(point, opsStart + 160 + k * 12, 120, () => {
            if (!point.hasAttribute("data-bracket")) point.setAttribute("data-off", "");
          }),
        ),
      );
      const root = plot.querySelector<SVGGElement>("[data-root]");
      if (root) tasks.push(reveal(root, (lineWish[plotOps - 1] ?? opsStart) + 120, 120));
      next = (lineWish[plotOps - 1] ?? opsStart) + 200;
    }
    const rest = ops.length - plotOps;
    const span = budget * (plot ? 0.3 : 0.5);
    for (let k = plotOps; k < ops.length; k++) lineWish[k] = next + ((k - plotOps) * span) / Math.max(1, rest);
    ops.forEach((el, k) => tasks.push(typed(el, lineWish[k], lineWork(el))));

    // A construction on the figure: each step beside its margin line.
    const construction = screen.querySelector<SVGSVGElement>("[data-construction]");
    if (construction) {
      for (const step of Array.from(construction.querySelectorAll<SVGGElement>("[data-cstep]"))) {
        const at = lineWish[Number(step.dataset.cstep)] ?? opsStart;
        Array.from(step.querySelectorAll<SVGPathElement>("[data-cpath]")).forEach((path, j) => {
          const label = path.nextElementSibling as SVGTextElement | null;
          const done = () => {
            if (path.classList.contains(styles.cfill)) path.setAttribute("data-on", "");
            if (label?.hasAttribute("data-clabel")) label.style.visibility = "visible";
          };
          tasks.push(pen(path, at + j * 40, path.classList.contains(styles.cfill) ? 60 : 200, done));
        });
      }
    }
    return tasks;
  };

  const planCheck = (screen: HTMLElement): Task[] => {
    const tasks: Task[] = [];
    const answer = screen.dataset.answer;
    if (answer) {
      const choices = Array.from(screen.querySelectorAll<HTMLElement>("[data-choice]"));
      choices.forEach((choice, i) => {
        const probe = choice.querySelector<HTMLElement>("[data-probe]");
        if (probe) tasks.push(typed(probe, i * 15, 90, 100));
      });
      choices
        .filter((choice) => choice.dataset.choice !== answer)
        .forEach((choice, j) => tasks.push(strike(choice, 180 + j * 20)));
      const target = choices.find((choice) => choice.dataset.choice === answer);
      if (target) tasks.push(...converge(target, 250));
    } else {
      const final = screen.querySelector<HTMLElement>("[data-final]");
      if (final) tasks.push(...converge(final.lastElementChild ?? final, 20));
    }
    return tasks;
  };

  const planSheet = (sheet: HTMLElement): Task[] => {
    const bubbles = Array.from(sheet.querySelectorAll<HTMLElement>("[data-bubble]"));
    const tasks = bubbles.map((bubble, k) => fill(bubble, 80 + k * 9));
    const end = 80 + bubbles.length * 9 + 260;
    const lines = Array.from(sheet.querySelectorAll<HTMLElement>("[data-op] > [data-type]"));
    lines.forEach((line, k) => {
      const before = line.hasAttribute("data-elapsed")
        ? () => {
            const seconds = Math.round((performance.now() - sessionStart) / 1000);
            const ink = line.querySelector("[data-ink]");
            if (ink) ink.textContent = `시험 시간 100분 중 ${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
          }
        : undefined;
      tasks.push(typed(line, end + k * 160, 320, 140, before));
    });
    return tasks;
  };

  const schedule = (tasks: Task[]): Timeline => {
    const now = performance.now();
    const active = agents.filter((agent) => agent.active);
    for (const agent of active) agent.freeAt = 0;
    const order = [...tasks].sort((a, b) => a.wish - b.wish);
    for (const t of order) {
      const free = (a: Agent) => Math.max(t.wish, a.freeAt > 0 ? a.freeAt + 20 : 0);
      const agent = t.agent ?? active.reduce((best, candidate) => (free(candidate) < free(best) ? candidate : best), active[0]);
      t.agent = agent;
      t.start = free(agent);
      agent.freeAt = t.start + t.approach + t.work;
    }
    return { origin: now, tasks: order };
  };

  /** Advances a timeline: all reads (prepares) first, then all writes. Returns true while unfinished. */
  const run = (timeline: Timeline, now: number) => {
    const t = now - timeline.origin;
    let busy = false;
    for (const task of timeline.tasks) {
      if (task.state === 0 && t >= task.start && task.agent) {
        task.prepare?.();
        task.state = 1;
        task.agent.task = task;
      }
    }
    for (const task of timeline.tasks) {
      if (task.state === 3) continue;
      busy = true;
      if (task.state === 0 || !task.agent) continue;
      const workStart = task.start + task.approach;
      if (task.state === 1 && t >= workStart) {
        task.begin?.(task.agent);
        task.state = 2;
      }
      if (task.state === 2) {
        task.p = clamp((t - workStart) / task.work, 0, 1);
        task.update?.(task.p);
        if (task.p >= 1) {
          task.finish?.();
          task.state = 3;
          if (task.agent.task === task) task.agent.task = null;
        }
      }
    }
    return busy;
  };

  const halt = (timeline: Timeline | null) => {
    if (!timeline) return;
    for (const task of timeline.tasks) {
      if (task.agent?.task === task) task.agent.task = null;
      task.state = 3;
    }
  };

  // ---------------------------------------------------------------------
  // Questions.

  const clear = (screen: HTMLElement) => {
    screen.querySelector<HTMLElement>("[data-layer]")?.replaceChildren();
    for (const el of Array.from(screen.querySelectorAll<HTMLElement>("[data-type]"))) {
      el.removeAttribute("data-writing");
      el.removeAttribute("data-done");
      el.style.removeProperty("--c");
      const ink = el.querySelector<HTMLElement>("[data-ink]");
      const caret = el.querySelector<HTMLElement>("[data-caret]");
      if (ink) ink.style.clipPath = "";
      if (caret) caret.style.transform = "";
    }
    for (const el of Array.from(screen.querySelectorAll<HTMLElement>("[data-strike]"))) el.style.transform = "";
    for (const el of Array.from(screen.querySelectorAll("[data-out], [data-circled], [data-filled], [data-on]"))) {
      el.removeAttribute("data-out");
      el.removeAttribute("data-circled");
      el.removeAttribute("data-filled");
      el.removeAttribute("data-on");
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
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const begin = (index: number) => {
    const screen = screens[index];
    if (play) {
      halt(play.timeline);
      if (play.screen !== screen) clear(play.screen);
    }
    clear(screen);
    remeasure();
    const omr = screen.hasAttribute("data-omr");
    const count = omr ? 22 : (ACTIVE[screen.dataset.level ?? "mid"] ?? 10);
    agents.forEach((agent, i) => {
      agent.active = i < count;
      agent.task = null;
    });
    // A question taller than the screen is scrolled within by the player; snapping would pull it back.
    reader.style.scrollSnapType = heights[index] > viewport + 2 ? "none" : "";
    const now = performance.now();
    play = {
      screen,
      index,
      omr,
      phase: "A",
      since: now,
      timeline: null,
      target: tops[index],
      view: null,
      viewAt: 0,
      origin: rectOf(screen),
    };
    play.timeline = schedule(omr ? planSheet(screen) : planWork(screen));
    wake();
  };

  const scrollTo = (top: number) => reader.scrollTo({ top, behavior: "smooth" });

  const turn = (active: Play, target: number) => {
    const top = tops[active.index];
    const last = top + Math.max(0, heights[active.index] - viewport);
    active.target = clamp(target, top, last);
    active.view = null;
    if (Math.abs(scroll - active.target) > 2 && current() === active.index) scrollTo(active.target);
  };
  const arrived = (active: Play, waited: number) => Math.abs(scroll - active.target) <= 2 || waited >= ARRIVE_MS;

  /** Turn down to what is being written before it falls below the fold. */
  const follow = (active: Play, now: number) => {
    if (!active.timeline || handsOff(now)) return;
    let lowest: Rect | null = null;
    for (const task of active.timeline.tasks) {
      if (task.state !== 2 || !task.focus) continue;
      if (!lowest || task.focus.y + task.focus.h > lowest.y + lowest.h) lowest = task.focus;
    }
    if (!lowest) return;
    // Where the page is: the last sent position while its smooth scroll runs, the real one after
    // (a scroll cut short or snapped back must not leave the writing below the fold).
    const view = active.view !== null && now - active.viewAt < SCROLL_SETTLE_MS ? active.view : scroll;
    if (lowest.y + lowest.h <= view + viewport - FOOT_CLEARANCE) return;
    const top = tops[active.index];
    const target = Math.min(top + heights[active.index] - viewport, lowest.y - viewport * PAGE_LINE);
    if (target <= view + 1) return;
    active.view = target;
    active.viewAt = now;
    scrollTo(target);
  };

  const step = (active: Play, now: number) => {
    const waited = now - active.since;
    const screen = active.screen;
    switch (active.phase) {
      case "A":
        if (active.timeline && run(active.timeline, now)) follow(active, now);
        else if (!active.omr) enter(active, "settle", now);
        else {
          enter(active, "done", now);
          confetti(layer);
          // The sheet is done: the swarm leaves off the sides.
          for (const agent of agents) agent.active = false;
        }
        break;
      case "settle": {
        if (waited < SETTLE_MS || handsOff(now)) break;
        const final = screen.querySelector("[data-final]");
        final?.setAttribute("data-on", "");
        const focus = screen.dataset.answer ? screen.querySelector("[data-choices]") : final;
        if (focus) {
          const r = rectOf(focus);
          const visible = r.y >= scroll && r.y + r.h <= scroll + viewport - FOOT_CLEARANCE;
          if (!visible) turn(active, r.y + r.h / 2 - viewport / 2);
          else active.target = scroll;
        }
        enter(active, "toFocus", now);
        break;
      }
      case "toFocus":
        if (!arrived(active, waited)) break;
        active.timeline = schedule(planCheck(screen));
        enter(active, "B", now);
        break;
      case "B":
        if (active.timeline && run(active.timeline, now)) break;
        if (screen.dataset.answer) screen.querySelector(`[data-choice="${screen.dataset.answer}"]`)?.setAttribute("data-circled", "");
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
        reader.style.scrollSnapType = "";
        // Settling on the next screen starts it (onScroll), so its clock starts on arrival.
        if (next < screens.length && current() === active.index) scrollTo(tops[next]);
        break;
      }
    }
  };

  // ---------------------------------------------------------------------
  // Motion.

  const move = (dt: number, now: number) => {
    const column = play?.origin ?? { x: 0, w: box.width };
    const hive = { x: column.x + column.w * 0.74, y: scroll + viewport * 0.2 };
    const seconds = now / 1000;
    let moving = false;
    for (const agent of agents) {
      const task = agent.task;
      let target: Point | null = null;
      let k = 140;
      if (task && task.state >= 1) {
        target = task.aim(task.state === 2 ? task.p : 0);
        k = task.state === 2 ? 1400 : 600;
      }
      if (!target) {
        if (agent.active) {
          agent.angle += agent.spin * dt;
          const wobble = 6 * Math.sin(seconds * 1.7 + agent.park * 9);
          target = { x: hive.x + Math.cos(agent.angle) * (agent.radius + wobble), y: hive.y + Math.sin(agent.angle) * agent.radius * 0.6 };
        } else {
          target = { x: agent.side < 0 ? -40 : box.width + 40, y: scroll + viewport * agent.park };
          k = 90;
        }
      }
      const mode: Mode = task && task.state >= 1 ? task.mode : "arrow";
      if (mode !== agent.mode) {
        agent.mode = mode;
        agent.el.dataset.mode = mode;
      }
      const c = 2 * Math.sqrt(k) * 0.8;
      agent.vx += (k * (target.x - agent.x) - c * agent.vx) * dt;
      agent.vy += (k * (target.y - agent.y) - c * agent.vy) * dt;
      if (agent.active || Math.abs(agent.vx) + Math.abs(agent.vy) > 1 || Math.abs(target.x - agent.x) + Math.abs(target.y - agent.y) > 1) moving = true;
    }
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (a.task || !a.active) continue;
      for (let j = i + 1; j < agents.length; j++) {
        const b = agents[j];
        if (b.task || !b.active) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 400 || d2 < 0.01) continue;
        const push = (20 - Math.sqrt(d2)) * 8 * dt;
        a.vx -= dx * push;
        a.vy -= dy * push;
        b.vx += dx * push;
        b.vy += dy * push;
      }
    }
    for (const agent of agents) {
      agent.x += agent.vx * dt;
      agent.y += agent.vy * dt;
      const sx = agent.x + box.left;
      const sy = agent.y - scroll + box.top;
      if (Math.abs(sx - agent.wx) < 0.1 && Math.abs(sy - agent.wy) < 0.1) continue;
      agent.wx = sx;
      agent.wy = sy;
      agent.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    }
    return moving;
  };

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const playing = play !== null && play.phase !== "done";
    if (play && playing) step(play, now);
    const moving = move(dt, now);
    if (playing || moving) frame = requestAnimationFrame(tick);
    else sleeping = true;
  }

  // ---------------------------------------------------------------------
  // Events.

  const onScroll = () => {
    scroll = reader.scrollTop;
    wake();
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      const index = current();
      if (!play || index !== play.index) begin(index);
    }, 60);
  };
  /** Only a person's own scrolling (not a tap) takes the page from the player. */
  const onUserScroll = () => {
    lastUserScroll = performance.now();
  };
  const inputs = ["wheel", "touchmove", "keydown"] as const;
  const resize = new ResizeObserver(() => {
    remeasure();
    if (play) play.origin = rectOf(play.screen);
  });
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
    layer.replaceChildren();
  };
}
