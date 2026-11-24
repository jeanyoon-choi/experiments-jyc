// What one object carries to the shader (shader.ts: locations 2–10, nine vec4s), the buffer the frame's objects are
// written into, and the square they are all drawn as in one instanced draw.

import { BUBBLE_FLOATS, NEIGHBOURS } from "./neighbours.ts";

/**
 * Per instance: its bubble, its neighbours', then (turn, from layer, to layer, shape), (melt, half its square,
 * the from and to layers' photographs: 유명인 얼굴, −1 none), its tint (rgb, amount: 전파) and its motion.
 */
export const INSTANCE_FLOATS = BUBBLE_FLOATS * (1 + NEIGHBOURS) + 16;
/** Where each of those lies in an instance, after its bubble and its neighbours. */
const TAIL = BUBBLE_FLOATS * (1 + NEIGHBOURS);
/** `turning`: its turn (radians), the addresses of the fields it flows from and to (tiers.ts), how far along. */
const TURN = TAIL;
const FROM = TAIL + 1;
const TO = TAIL + 2;
const SHAPE = TAIL + 3;
/** `morph`: how melted, half the square it is drawn in (object units), the from and to layers' paints (−1 none). */
const MELT = TAIL + 4;
const HALF = TAIL + 5;
const SCAN_FROM = TAIL + 6;
const SCAN_TO = TAIL + 7;
/** `tint`: rgb and amount (tint.ts writes it). */
export const TINT = TAIL + 8;
/** `settle`: the sway's and the mirror's strength (morph.ts motion), the from and to layers' extra blur (tiers.ts blurOf). */
const SWAY = TAIL + 12;
const SHEEN = TAIL + 13;
const BLUR_FROM = TAIL + 14;
const BLUR_TO = TAIL + 15;

/** An instance's bubble: `bubbles`' `index`th (x y radius seed). */
export function placeBubble(data: Float32Array, slot: number, bubbles: Float32Array, index: number) {
  const to = slot * INSTANCE_FLOATS;
  const from = index * BUBBLE_FLOATS;
  data[to] = bubbles[from]!;
  data[to + 1] = bubbles[from + 1]!;
  data[to + 2] = bubbles[from + 2]!;
  data[to + 3] = bubbles[from + 3]!;
}

/** An instance's neighbours, as the bubbles they are: `ids`' for bubble `index` (−1: none, radius 0). */
/** No neighbours for an instance (a material that does not read them: object-pass.ts draw). */
export function clearNeighbours(data: Float32Array, slot: number) {
  const from = slot * INSTANCE_FLOATS + BUBBLE_FLOATS;
  data.fill(0, from, from + NEIGHBOURS * BUBBLE_FLOATS);
}

export function placeNeighbours(data: Float32Array, slot: number, bubbles: Float32Array, ids: Int32Array, index: number) {
  let to = slot * INSTANCE_FLOATS + BUBBLE_FLOATS;
  for (let near = 0; near < NEIGHBOURS; near += 1, to += BUBBLE_FLOATS) {
    const other = ids[index * NEIGHBOURS + near]!;
    if (other < 0) {
      data[to] = 0;
      data[to + 1] = 0;
      data[to + 2] = 0;
      data[to + 3] = 0;
    } else {
      const from = other * BUBBLE_FLOATS;
      data[to] = bubbles[from]!;
      data[to + 1] = bubbles[from + 1]!;
      data[to + 2] = bubbles[from + 2]!;
      data[to + 3] = bubbles[from + 3]!;
    }
  }
}

/** An instance's turn, morph and motion (its bubble, neighbours and tint are written apart). */
export function writeInstance(
  data: Float32Array,
  slot: number,
  turn: number,
  fromAddress: number,
  toAddress: number,
  shape: number,
  melt: number,
  half: number,
  fromPaint: number,
  toPaint: number,
  sway: number,
  sheen: number,
  fromBlur: number,
  toBlur: number,
) {
  const to = slot * INSTANCE_FLOATS;
  data[to + TURN] = turn;
  data[to + FROM] = fromAddress;
  data[to + TO] = toAddress;
  data[to + SHAPE] = shape;
  data[to + MELT] = melt;
  data[to + HALF] = half;
  data[to + SCAN_FROM] = fromPaint;
  data[to + SCAN_TO] = toPaint;
  data[to + SWAY] = sway;
  data[to + SHEEN] = sheen;
  data[to + BLUR_FROM] = fromBlur;
  data[to + BLUR_TO] = toBlur;
}

export type Instances = {
  /** Room for `max` + 1 instances, written slot by slot before `bind`. */
  readonly data: Float32Array;
  /** Hands the first `count` instances to the GPU and binds the square with them, ready to draw. */
  bind(count: number): void;
  dispose(): void;
};

export function createInstances(gl: WebGL2RenderingContext, max: number): Instances {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const data = new Float32Array((max + 1) * INSTANCE_FLOATS);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  // Locations 2–10: the bubble, its four neighbours, then the four vec4s after them.
  for (let slot = 0; slot < NEIGHBOURS + 5; slot += 1) {
    gl.enableVertexAttribArray(2 + slot);
    gl.vertexAttribPointer(2 + slot, 4, gl.FLOAT, false, INSTANCE_FLOATS * 4, slot * 16);
    gl.vertexAttribDivisor(2 + slot, 1);
  }
  gl.bindVertexArray(null);
  return {
    data,
    bind: (count) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * INSTANCE_FLOATS);
      gl.bindVertexArray(vao);
    },
    dispose: () => {
      gl.deleteBuffer(corners);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
    },
  };
}
