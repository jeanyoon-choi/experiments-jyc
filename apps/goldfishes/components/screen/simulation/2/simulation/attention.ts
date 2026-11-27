// What the goldfish's watching does: it raises the watched pages' quality in the model, moves a watched page on to
// its next object, and a page newly touched is a touch. Nothing here knows the school, the sound or the 연결 feed:
// the contact is drained from whoever gathered it and the touches go to a sink, both handed in by the loop.

import { MAX_ENTITIES, type World } from "../model/index.ts";
import { hashOf as pageHash, type ObjectParameters } from "../objects/kinds/parameters.ts";
import { styleOf } from "../objects/morph/liquid.ts";
import type { Feedback } from "../state/feedback.ts";

/** Fish-seconds of watching that move a page on to its next object (pageTurns). */
const TURN_WATCH = 1;
/**
 * Log quality one fish-second of watching gives a page, divided by the school
 * (at least FISH_AUDIENCE fish; 무리 크기 반영 changes this), so all fish on one
 * page for a second give it ATTENTION_GAIN × influence; quality reverts at 0.08 per second.
 */
const ATTENTION_GAIN = 0.25;
const FISH_AUDIENCE = 30;

/** Whoever gathered the fish's contact per page since it was last asked (the school). */
export type ContactSource = { drainContact(pageCount: number, out: Float64Array): void };
/** Whether a page's morph has set by `time` (the object pass): only then does it move on again. */
export type Settling = { settled(page: number, time: number, duration: number): boolean };
/** A page a fish has just begun to touch: its rank against the largest, and where it is in the field (0–1). */
export type PageTouch = { page: number; rank: number; x: number; y: number };
export type TouchSink = { touch(touch: PageTouch): void };

export class Watching {
  /** Fish-seconds of contact per page this frame. */
  readonly attention = new Float64Array(MAX_ENTITIES);
  /**
   * Per page: how many times it has moved on to another object, and the goldfish's watching (fish-seconds) since.
   * bubble/9 (user, 2026-11-06): no clock — a page moves on once the fish have watched it for TURN_WATCH and its last
   * morph has set, so the watched flow from one object into the next and the unwatched stay what they are.
   */
  readonly turns = new Uint32Array(MAX_ENTITIES);
  private readonly watched = new Float32Array(MAX_ENTITIES);
  /** Which pages a fish touched last frame: a page newly touched is a note (소리). */
  private readonly touchedBefore = new Uint8Array(MAX_ENTITIES);

  /** `page` is another bubble now (a stroke's, in a let-go bubble's place): the watching of what stood there is not its own. */
  renew(page: number) {
    this.watched[page] = 0;
    this.touchedBefore[page] = 0;
  }

  /** This frame's contact, taken from `source`. */
  drain(source: ContactSource, pageCount: number) {
    source.drainContact(pageCount, this.attention);
  }

  /**
   * How many times each page has moved on (MORPH_STYLES): 금붕어 — once the fish have watched it TURN_WATCH since its
   * last turn and that morph has set; 시계 — on its own beat every `change` seconds.
   */
  turn(pageCount: number, time: number, objects: ObjectParameters, pass: Settling) {
    const { turns, watched, attention } = this;
    const style = styleOf(objects);
    for (let page = 0; page < pageCount; page += 1) {
      if (style.change > 0) {
        turns[page] = Math.floor(time / style.change + pageHash(page + 0.5));
        continue;
      }
      watched[page] = watched[page]! + attention[page]!;
      if (watched[page]! >= TURN_WATCH && pass.settled(page, time, objects.duration)) {
        turns[page] = turns[page]! + 1;
        watched[page] = 0;
      }
    }
  }

  /** 소리: a page a fish has just begun to touch goes to `sink` (null: nobody listens, the touches are still kept). */
  touches(pageCount: number, shown: ArrayLike<number>, points: ArrayLike<number>, field: { width: number; height: number }, sink: TouchSink | null) {
    const { attention, touchedBefore } = this;
    let largest = 0;
    if (sink) for (let page = 0; page < pageCount; page += 1) largest = Math.max(largest, shown[page]!);
    for (let page = 0; page < pageCount; page += 1) {
      const touched = attention[page]! > 0 ? 1 : 0;
      if (sink && touched && !touchedBefore[page]) {
        sink.touch({
          page,
          rank: largest > 0 ? shown[page]! / largest : 0,
          x: points[page * 2]! / field.width,
          y: points[page * 2 + 1]! / field.height,
        });
      }
      touchedBefore[page] = touched;
    }
  }

  /** The watching feeds back into quality, among a school of `fishCount`. */
  feedBack(pageCount: number, world: Pick<World<never>, "attend">, feedback: Feedback, fishCount: number) {
    const attention = this.attention;
    // 무리 크기 반영: at 0 the school's effect is shared among its fish, at 1 every fish counts as one of FISH_AUDIENCE.
    const { influence, ceiling, perFish } = feedback;
    const audience = Math.max(FISH_AUDIENCE, fishCount) ** (1 - perFish) * FISH_AUDIENCE ** perFish;
    const strength = (influence * ATTENTION_GAIN) / audience;
    if (strength > 0) for (let page = 0; page < pageCount; page += 1) world.attend(page, attention[page]! * strength, ceiling);
  }
}
