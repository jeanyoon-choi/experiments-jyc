// The school off the main thread (user, 2026-11-03: a thousand fish with no
// cost to the frame). The frame loop talks to a SchoolThread exactly as it
// talked to the GoldfishSchool; the school itself lives in a worker
// (school-worker.ts) and steps on a copy of this frame's discs, ranks, links
// and bubble colours. Its fish come back packed in one buffer, and are read
// on the next frame, so the fish drawn are one frame behind the bubbles, a
// fraction of a pixel of raft motion. Every buffer goes to the worker and back
// again (transferred, not copied), so a frame allocates nothing.
//
// Where there is no Worker (tests, node), or the worker fails, the same frame
// is stepped here at once: runFrame() is the worker's step, so both paths
// give the same school.

import { GoldfishSchool, MAX_FISH, type Fish, type FishParameters, type LifeContext, type SchoolWeb } from "./goldfish.ts";
import { LIFE_DEFAULTS, type LifeParameters, type Rgb } from "./lifecycle.ts";

/** Floats per fish in the packed state. */
export const FISH_STRIDE = 24;

/** One frame for the school: its settings, this frame's inputs, and buffers for its answer. */
export type SchoolFrame = {
  width: number;
  height: number;
  count: number;
  life: LifeParameters;
  parameters: FishParameters;
  seconds: number;
  /** The web started over before this frame. */
  forget: boolean;
  /** Pages [noteFrom, noteTo) arrived since the last frame (noteTo ≤ noteFrom: none). */
  noteFrom: number;
  noteTo: number;
  bubbleCount: number;
  pageStart: number;
  pageCount: number;
  bubbles: Float32Array;
  shown: Float64Array;
  /** Each page's bubble colour (r g b), for the tint a fish takes on watching it. */
  coats: Float64Array;
  /** The web's links per page: page p's run [linkStart[p], linkStart[p + 1]) of linkTarget and linkWeight. */
  linkStart: Int32Array;
  linkTarget: Int32Array;
  linkWeight: Float64Array;
  /** Out: the fish (FISH_STRIDE floats each), this step's touches (x y seed), the contact drained per page. */
  state: Float64Array;
  touches: Float64Array;
  contact: Float64Array;
  /** Out: counts, and the step's own cost (ms). */
  fishCount: number;
  touchCount: number;
  deaths: { spent: number; crushed: number; shut: number };
  departed: number;
  stepMs: number;
};

/** The buffers of a frame, in the order they are transferred. */
function buffersOf(frame: SchoolFrame): ArrayBuffer[] {
  return [frame.bubbles, frame.shown, frame.coats, frame.linkStart, frame.linkTarget, frame.linkWeight, frame.state, frame.touches, frame.contact].map(
    (array) => array.buffer as ArrayBuffer,
  );
}

/** The web's links as the worker reads them: arrays of reusable entries, rebuilt in place from a frame. */
export class LinkView implements SchoolWeb {
  readonly out: { target: number; weight: number }[][] = [];

  read(frame: SchoolFrame) {
    const { out } = this;
    while (out.length < frame.pageCount) out.push([]);
    for (let page = 0; page < frame.pageCount; page += 1) {
      const list = out[page]!;
      const start = frame.linkStart[page]!;
      const end = frame.linkStart[page + 1]!;
      const length = end - start;
      while (list.length < length) list.push({ target: 0, weight: 0 });
      list.length = length;
      for (let index = 0; index < length; index += 1) {
        const entry = list[index]!;
        entry.target = frame.linkTarget[start + index]!;
        entry.weight = frame.linkWeight[start + index]!;
      }
    }
    // Pages beyond this frame's: no links (the school never reads them).
    for (let page = frame.pageCount; page < out.length; page += 1) out[page]!.length = 0;
    return this;
  }
}

/** The school's side of a frame: steps it and writes the answer into the frame's out buffers. */
export class SchoolCore {
  readonly school: GoldfishSchool;
  private readonly links = new LinkView();
  private width: number;
  private height: number;
  private coats: Float64Array = new Float64Array(0);
  private pageStart = 0;
  private readonly context: LifeContext = {
    parameters: { ...LIFE_DEFAULTS, enabled: 0 },
    colourOf: (bubble: number, out: Rgb) => {
      const at = (bubble - this.pageStart) * 3;
      out[0] = this.coats[at] ?? 0;
      out[1] = this.coats[at + 1] ?? 0;
      out[2] = this.coats[at + 2] ?? 0;
    },
  };

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.school = new GoldfishSchool(width, height);
  }

  run(frame: SchoolFrame) {
    const started = performance.now();
    const school = this.school;
    if (frame.width !== this.width || frame.height !== this.height) {
      this.width = frame.width;
      this.height = frame.height;
      school.resize(frame.width, frame.height);
    }
    if (frame.forget) school.forgetPages();
    if (frame.noteTo > frame.noteFrom) school.notePages(frame.noteFrom, frame.noteTo);
    school.setLife(frame.life);
    school.setCount(frame.count);
    this.coats = frame.coats;
    this.pageStart = frame.pageStart;
    this.context.parameters = frame.life;
    school.step(frame.seconds, this.links.read(frame), frame.shown, frame.bubbles, frame.bubbleCount, frame.pageStart, frame.pageCount, frame.parameters, this.context);
    if (frame.contact.length < frame.pageCount) frame.contact = new Float64Array(Math.max(frame.pageCount, 1_000));
    school.drainContact(frame.pageCount, frame.contact);
    if (frame.state.length < school.fish.length * FISH_STRIDE) frame.state = new Float64Array(MAX_FISH * FISH_STRIDE);
    packFish(school.fish, frame.state);
    frame.fishCount = school.fish.length;
    if (frame.touches.length < school.touchCount * 3) frame.touches = new Float64Array(MAX_FISH * 3);
    frame.touches.set(school.touches.subarray(0, school.touchCount * 3));
    frame.touchCount = school.touchCount;
    frame.deaths.spent = school.deaths.spent;
    frame.deaths.crushed = school.deaths.crushed;
    frame.deaths.shut = school.deaths.shut;
    frame.departed = school.departed;
    frame.stepMs = performance.now() - started;
    return frame;
  }
}

/** Writes each fish's state into `out`, FISH_STRIDE floats apiece. */
export function packFish(fish: readonly Fish[], out: Float64Array) {
  for (let index = 0; index < fish.length; index += 1) {
    const one = fish[index]!;
    const life = one.life;
    const at = index * FISH_STRIDE;
    out[at] = one.x;
    out[at + 1] = one.y;
    out[at + 2] = one.vx;
    out[at + 3] = one.vy;
    out[at + 4] = one.facing;
    out[at + 5] = one.target;
    out[at + 6] = one.angle;
    out[at + 7] = one.turn;
    out[at + 8] = one.reconsiderAt;
    out[at + 9] = one.stuck;
    out[at + 10] = one.trapped;
    out[at + 11] = one.enclosureCheckAt;
    out[at + 12] = one.seed;
    out[at + 13] = one.touching ? 1 : 0;
    out[at + 14] = life.vitality;
    out[at + 15] = life.lifespan;
    out[at + 16] = life.tint[0];
    out[at + 17] = life.tint[1];
    out[at + 18] = life.tint[2];
    out[at + 19] = life.tintAmount;
    out[at + 20] = life.dying ? 1 : 0;
    out[at + 21] = life.dyingTime;
    out[at + 22] = life.drift[0];
    out[at + 23] = life.drift[1];
  }
}

/** Reads `count` packed fish into `fish`, reusing its objects; the array ends up `count` long. */
export function unpackFish(state: Float64Array, count: number, fish: Fish[]) {
  while (fish.length < count) {
    fish.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 0,
      target: -1,
      angle: 0,
      turn: 1,
      reconsiderAt: 0,
      stuck: 0,
      trapped: 0,
      enclosureCheckAt: 0,
      seed: 0,
      touching: false,
      life: { vitality: 1, lifespan: 1, tint: [0, 0, 0], tintAmount: 0, dying: false, dyingTime: 0, drift: [0, 0] },
    });
  }
  fish.length = count;
  for (let index = 0; index < count; index += 1) {
    const one = fish[index]!;
    const life = one.life;
    const at = index * FISH_STRIDE;
    one.x = state[at]!;
    one.y = state[at + 1]!;
    one.vx = state[at + 2]!;
    one.vy = state[at + 3]!;
    one.facing = state[at + 4]!;
    one.target = state[at + 5]!;
    one.angle = state[at + 6]!;
    one.turn = state[at + 7]!;
    one.reconsiderAt = state[at + 8]!;
    one.stuck = state[at + 9]!;
    one.trapped = state[at + 10]!;
    one.enclosureCheckAt = state[at + 11]!;
    one.seed = state[at + 12]!;
    one.touching = state[at + 13]! > 0.5;
    life.vitality = state[at + 14]!;
    life.lifespan = state[at + 15]!;
    life.tint[0] = state[at + 16]!;
    life.tint[1] = state[at + 17]!;
    life.tint[2] = state[at + 18]!;
    life.tintAmount = state[at + 19]!;
    life.dying = state[at + 20]! > 0.5;
    life.dyingTime = state[at + 21]!;
    life.drift[0] = state[at + 22]!;
    life.drift[1] = state[at + 23]!;
  }
}

function emptyFrame(width: number, height: number): SchoolFrame {
  return {
    width,
    height,
    count: 0,
    life: { ...LIFE_DEFAULTS, enabled: 0 },
    parameters: {} as FishParameters,
    seconds: 0,
    forget: false,
    noteFrom: 0,
    noteTo: 0,
    bubbleCount: 0,
    pageStart: 0,
    pageCount: 0,
    bubbles: new Float32Array(1_024 * 4),
    shown: new Float64Array(1_000),
    coats: new Float64Array(1_000 * 3),
    linkStart: new Int32Array(1_001),
    linkTarget: new Int32Array(4_096),
    linkWeight: new Float64Array(4_096),
    state: new Float64Array(MAX_FISH * FISH_STRIDE),
    touches: new Float64Array(MAX_FISH * 3),
    contact: new Float64Array(1_000),
    fishCount: 0,
    touchCount: 0,
    deaths: { spent: 0, crushed: 0, shut: 0 },
    departed: 0,
    stepMs: 0,
  };
}

/**
 * The frame loop's school: GoldfishSchool's interface, stepped in a worker
 * when there is one (`threaded`), at once otherwise.
 */
export class SchoolThread {
  /** The fish as last stepped (read-only copies; the school's own live in the worker). */
  readonly fish: Fish[] = [];
  /** The touches of the last step read, as x, y, seed; `touchCount` of them (0 on a frame that read no step). */
  readonly touches = new Float64Array(MAX_FISH * 3);
  touchCount = 0;
  readonly deaths = { spent: 0, crushed: 0, shut: 0 };
  departed = 0;
  /** Smoothed ms of the school's own step, wherever it ran (?measure). */
  stepMs = 0;
  private worker: Worker | null = null;
  /** The worker has answered once (logged, for checking it runs). */
  private started = false;
  private core: SchoolCore | null = null;
  /** The frame being filled (null while it is with the worker), and an answer waiting to be read. */
  private frame: SchoolFrame | null;
  private answer: SchoolFrame | null = null;
  private width: number;
  private height: number;
  private count = 0;
  private life: LifeParameters = { ...LIFE_DEFAULTS, enabled: 0 };
  private forget = false;
  private noteFrom = 0;
  private noteTo = 0;
  /** Seconds not yet stepped (they gather while the worker is busy). */
  private pending = 0;
  /** Contact read from steps and not yet drained by the frame loop. */
  private readonly contact = new Float64Array(1_000);
  private readonly colour: Rgb = [0, 0, 0];

  constructor(width: number, height: number, threaded = typeof Worker !== "undefined") {
    this.width = width;
    this.height = height;
    this.frame = emptyFrame(width, height);
    if (threaded) {
      try {
        const worker = new Worker(new URL("./school-worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event: MessageEvent<SchoolFrame>) => {
          if (!this.started) {
            this.started = true;
            console.info("bubble/8 goldfish school: stepping in its worker.");
          }
          this.answer = event.data;
        };
        worker.onerror = (event) => {
          // A school that cannot run in a worker runs here (it starts over).
          console.warn("bubble/8 goldfish worker failed; stepping on the main thread.", event.message);
          this.fallBack();
        };
        this.worker = worker;
      } catch {
        this.core = new SchoolCore(width, height);
      }
    } else this.core = new SchoolCore(width, height);
  }

  private fallBack() {
    this.worker?.terminate();
    this.worker = null;
    this.core = new SchoolCore(this.width, this.height);
    this.frame = this.answer ?? emptyFrame(this.width, this.height);
    this.answer = null;
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  setLife(parameters: LifeParameters) {
    this.life = parameters;
  }

  setCount(count: number) {
    this.count = Math.max(0, Math.min(MAX_FISH, Math.round(count)));
  }

  notePages(from: number, to: number) {
    if (this.noteTo <= this.noteFrom) {
      this.noteFrom = from;
      this.noteTo = to;
    } else {
      this.noteFrom = Math.min(this.noteFrom, from);
      this.noteTo = Math.max(this.noteTo, to);
    }
  }

  forgetPages() {
    this.forget = true;
    // Notes from before the web started over mean nothing now.
    this.noteFrom = 0;
    this.noteTo = 0;
  }

  drainContact(pageCount: number, out: Float64Array) {
    for (let page = 0; page < pageCount; page += 1) {
      out[page] = this.contact[page]!;
      this.contact[page] = 0;
    }
  }

  /** As GoldfishSchool.step; the fish read back are the last step finished (in a worker, last frame's). */
  step(
    seconds: number,
    web: SchoolWeb,
    shown: ArrayLike<number>,
    bubbles: Float32Array,
    bubbleCount: number,
    pageStart: number,
    pageCount: number,
    parameters: FishParameters,
    life?: LifeContext,
    pageExtent: Float32Array | null = null,
  ) {
    this.touchCount = 0;
    this.pending += seconds;
    // The worker's last answer: read it, and its buffers are ours to fill again.
    if (this.answer) {
      this.read(this.answer);
      this.frame = this.answer;
      this.answer = null;
    }
    const frame = this.frame;
    // Still with the worker: these seconds wait for the next frame.
    if (!frame) return;
    this.fill(frame, web, shown, bubbles, bubbleCount, pageStart, pageCount, parameters, life, pageExtent);
    if (this.worker) {
      this.frame = null;
      this.worker.postMessage(frame, buffersOf(frame));
    } else if (this.core) {
      this.read(this.core.run(frame));
    }
  }

  private fill(
    frame: SchoolFrame,
    web: SchoolWeb,
    shown: ArrayLike<number>,
    bubbles: Float32Array,
    bubbleCount: number,
    pageStart: number,
    pageCount: number,
    parameters: FishParameters,
    life: LifeContext | undefined,
    pageExtent: Float32Array | null,
  ) {
    frame.width = this.width;
    frame.height = this.height;
    frame.count = this.count;
    frame.life = life?.parameters ?? this.life;
    frame.parameters = parameters;
    frame.seconds = this.pending;
    this.pending = 0;
    frame.forget = this.forget;
    frame.noteFrom = this.noteFrom;
    frame.noteTo = this.noteTo;
    this.forget = false;
    this.noteFrom = 0;
    this.noteTo = 0;
    frame.bubbleCount = bubbleCount;
    frame.pageStart = pageStart;
    frame.pageCount = pageCount;
    if (frame.bubbles.length < bubbleCount * 4) frame.bubbles = new Float32Array(bubbleCount * 8);
    frame.bubbles.set(bubbles.subarray(0, bubbleCount * 4));
    if (frame.shown.length < pageCount) frame.shown = new Float64Array(pageCount * 2);
    if (frame.coats.length < pageCount * 3) frame.coats = new Float64Array(pageCount * 6);
    if (frame.linkStart.length < pageCount + 1) frame.linkStart = new Int32Array(pageCount * 2 + 1);
    const colour = this.colour;
    let links = 0;
    for (let page = 0; page < pageCount; page += 1) {
      frame.shown[page] = shown[page]!;
      // The fish keep out of what is drawn there: an object reaches past its bubble's disc (size × its outline).
      if (pageExtent && page < pageExtent.length) frame.bubbles[(pageStart + page) * 4 + 2] = bubbles[(pageStart + page) * 4 + 2]! * pageExtent[page]!;
      if (life) {
        life.colourOf(pageStart + page, colour);
        frame.coats[page * 3] = colour[0];
        frame.coats[page * 3 + 1] = colour[1];
        frame.coats[page * 3 + 2] = colour[2];
      }
      frame.linkStart[page] = links;
      const list = web.out[page];
      if (!list) continue;
      if (frame.linkTarget.length < links + list.length) {
        const target = new Int32Array((links + list.length) * 2);
        target.set(frame.linkTarget);
        frame.linkTarget = target;
        const weight = new Float64Array((links + list.length) * 2);
        weight.set(frame.linkWeight);
        frame.linkWeight = weight;
      }
      for (const link of list) {
        frame.linkTarget[links] = link.target;
        frame.linkWeight[links] = link.weight;
        links += 1;
      }
    }
    frame.linkStart[pageCount] = links;
  }

  private read(frame: SchoolFrame) {
    unpackFish(frame.state, frame.fishCount, this.fish);
    // Copied: the frame's own buffer goes back to the worker before the frame loop reads the touches.
    this.touches.set(frame.touches.subarray(0, frame.touchCount * 3));
    this.touchCount = frame.touchCount;
    for (let page = 0; page < frame.pageCount; page += 1) this.contact[page] = this.contact[page]! + frame.contact[page]!;
    this.deaths.spent = frame.deaths.spent;
    this.deaths.crushed = frame.deaths.crushed;
    this.deaths.shut = frame.deaths.shut;
    this.departed = frame.departed;
    this.stepMs = this.stepMs * 0.95 + frame.stepMs * 0.05;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
  }
}
