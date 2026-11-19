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

import { MAX_FISH, type Fish, type FishParameters, type LifeContext, type SchoolWeb } from "./goldfish.ts";
import { LIFE_DEFAULTS, type LifeParameters, type Rgb } from "./lifecycle.ts";
import { buffersOf, emptyFrame, SchoolCore, unpackFish, type SchoolFrame } from "./school-core.ts";

export { FISH_STRIDE, LinkView, packFish, SchoolCore, unpackFish, type SchoolFrame } from "./school-core.ts";


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
