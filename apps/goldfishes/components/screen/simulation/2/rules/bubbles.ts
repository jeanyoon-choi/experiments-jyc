// What each bubble carries besides its size: a disposition (rules/disposition.ts) and a face — the object it is shown
// as. The two have nothing to do with one another in content (artist, 2026-11-25: the disposition is the bubble's,
// not the sign's; the objects will all change); they only travel together. A bubble that changes takes both from the
// bubble that sends it the most (artist, 2026-11-24: "the object of the neighbour that sent the portion"); a stroke
// brings in one new pair for all the bubbles it lays. Nothing here decides anything: the loop says when.

import { layerOf } from "../objects/kinds/layers.ts";
import { pageKind, type ObjectParameters } from "../objects/kinds/parameters.ts";
import { copy, drawn, SIZE } from "./disposition.ts";

const MOST = 4096;

/** The layer of the object `face` is under `objects`; −1 when it is none (a bubble). */
function layerFor(face: number, objects: ObjectParameters) {
  const layer = layerOf(pageKind(face, objects));
  return layer > 0 ? layer : -1;
}

export class Bubbles {
  /** Per bubble: its disposition, SIZE numbers apiece. The school reads it as it is. */
  readonly dispositions = new Float32Array(MOST * SIZE);
  /** Per bubble: its face, a key into the objects that are on (objects/kinds/parameters.ts pageKind). */
  private readonly faces = new Float64Array(MOST);
  /** Per bubble: the field layer its face is under the objects in use (−1: none, a bubble; −2: not worked out yet). Read as 전파's kinds are. */
  readonly kinds = new Int16Array(MOST).fill(-2);
  private known = 0;
  private state: unknown = null;
  private objects: ObjectParameters | null = null;
  /** What each stroke brought in: its disposition and face. */
  private readonly strokes: { disposition: Float32Array; face: number }[] = [];

  /**
   * Every bubble up to `size` has a pair: a world started over (a new `state`) starts them over, and one come since
   * has its own (its disposition by its number, its face bubble/9's for that page).
   */
  keep(state: unknown, size: number, turns: ArrayLike<number> | null = null) {
    if (state !== this.state) {
      this.state = state;
      this.known = 0;
      this.strokes.length = 0;
      this.objects = null;
    }
    for (let bubble = this.known; bubble < Math.min(size, MOST); bubble += 1) {
      drawn(bubble, this.dispositions, bubble * SIZE);
      const turn = turns ? (turns[bubble] ?? 0) : 0;
      this.faces[bubble] = turn === 0 ? bubble : bubble + turn * 1.618;
      this.kinds[bubble] = -2;
    }
    this.known = Math.max(this.known, Math.min(size, MOST));
  }

  /** `bubble` takes the disposition and the face of `from`. True when its face changed. */
  adopt(bubble: number, from: number) {
    if (from < 0 || from >= this.known || bubble >= this.known || from === bubble) return false;
    copy(this.dispositions, from * SIZE, this.dispositions, bubble * SIZE);
    if (this.faces[bubble] === this.faces[from]) return false;
    this.faces[bubble] = this.faces[from]!;
    this.kinds[bubble] = -2;
    return true;
  }

  /** bubble/9's way: `bubble` moves on to its own next object; its disposition stays. */
  moveOn(bubble: number, turn: number) {
    if (bubble >= this.known) return;
    this.faces[bubble] = turn === 0 ? bubble : bubble + turn * 1.618;
    this.kinds[bubble] = -2;
  }

  /** `bubble`'s face: the same number, the same object (for counting kinds without the objects' tables). */
  faceOf(bubble: number) {
    return this.faces[bubble]!;
  }

  /** How many strokes there have been. */
  get strokeCount() {
    return this.strokes.length;
  }

  /** The face stroke `number` brought in. */
  strokeFace(number: number) {
    return this.strokes[number]?.face ?? -1;
  }

  /** A stroke begins: a disposition of its own and a face not on the screen now (if one is found). Its number. */
  begin(objects: ObjectParameters | null) {
    const shown = new Set<number>();
    for (let bubble = 0; bubble < this.known; bubble += 1) shown.add(this.kinds[bubble]!);
    const number = this.strokes.length;
    const base = 10_000 + number * 7.31;
    let face = base;
    for (let tries = 0; objects && tries < 48; tries += 1) {
      const key = base + tries * 0.618;
      if (shown.has(layerFor(key, objects))) continue;
      face = key;
      break;
    }
    const disposition = new Float32Array(SIZE);
    drawn(base, disposition, 0);
    this.strokes.push({ disposition, face });
    return number;
  }

  /** `bubble`, just laid by stroke `number`, has that stroke's pair. */
  lay(bubble: number, number: number) {
    const stroke = this.strokes[number];
    if (!stroke || bubble >= MOST) return;
    this.known = Math.max(this.known, bubble + 1);
    copy(stroke.disposition, 0, this.dispositions, bubble * SIZE);
    this.faces[bubble] = stroke.face;
    this.kinds[bubble] = -2;
  }

  /** Every bubble's layer under `objects` (worked out again only for a face that changed, or when the objects do). */
  resolve(objects: ObjectParameters) {
    const all = objects !== this.objects;
    this.objects = objects;
    const { kinds, faces } = this;
    for (let bubble = 0; bubble < this.known; bubble += 1) {
      if (all || kinds[bubble]! < -1) kinds[bubble] = layerFor(faces[bubble]!, objects);
    }
    return kinds;
  }
}
