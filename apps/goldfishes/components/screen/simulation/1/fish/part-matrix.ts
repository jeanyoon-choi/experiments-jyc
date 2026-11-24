// The goldfish's part matrices (goldfish-scene.ts), written without three's
// objects: a thousand fish of eight parts each are placed every frame. Affine
// 4 × 4, column-major, as three's Matrix4.elements.

/** A part's matrix on the body (column-major): position, Euler rotation (XYZ, as Object3D's), scale. */
export function localMatrix(out: Float64Array, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) {
  const a = Math.cos(rx);
  const b = Math.sin(rx);
  const c = Math.cos(ry);
  const d = Math.sin(ry);
  const e = Math.cos(rz);
  const f = Math.sin(rz);
  const ae = a * e;
  const af = a * f;
  const be = b * e;
  const bf = b * f;
  out[0] = c * e * sx;
  out[1] = (af + be * d) * sx;
  out[2] = (bf - ae * d) * sx;
  out[3] = 0;
  out[4] = -c * f * sy;
  out[5] = (ae - bf * d) * sy;
  out[6] = (be + af * d) * sy;
  out[7] = 0;
  out[8] = d * sz;
  out[9] = -b * c * sz;
  out[10] = a * c * sz;
  out[11] = 0;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[15] = 1;
  return out;
}

/** `root` × `local` (both affine, column-major) into `out` at `at`. */
export function place(out: Float32Array, at: number, root: Float64Array, local: Float64Array) {
  for (let column = 0; column < 4; column += 1) {
    const l0 = local[column * 4]!;
    const l1 = local[column * 4 + 1]!;
    const l2 = local[column * 4 + 2]!;
    const w = column === 3 ? 1 : 0;
    out[at + column * 4] = root[0]! * l0 + root[4]! * l1 + root[8]! * l2 + root[12]! * w;
    out[at + column * 4 + 1] = root[1]! * l0 + root[5]! * l1 + root[9]! * l2 + root[13]! * w;
    out[at + column * 4 + 2] = root[2]! * l0 + root[6]! * l1 + root[10]! * l2 + root[14]! * w;
    out[at + column * 4 + 3] = w;
  }
}
