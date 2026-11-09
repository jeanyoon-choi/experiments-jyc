// A thin-plate spline carries 주호영's landmarks onto 추미애's. The shader
// needs one displacement V(x) = choo − joo for every frame point x, placed at
// the halfway geometry, so a pixel at morph amount t reads 주호영 at x − t·V
// and 추미애 at x + (1 − t)·V. Because V does not depend on t, t may vary from
// pixel to pixel (the Voronoi lattice gives every site its own amount).

/** Frame aspect: the aligned portraits are 900 × 1200. */
export const FRAME_ASPECT = 900 / 1200;

/** Border anchors that keep the frame edge where it is. */
function borderAnchors() {
  const points: number[] = [];
  for (const fraction of [0, 1 / 3, 2 / 3, 1]) {
    points.push(fraction, 0, fraction, 1, 0, fraction, 1, fraction);
  }
  // Corners are listed twice by the loop above; keep each point once.
  const unique = new Map<string, [number, number]>();
  for (let index = 0; index < points.length; index += 2) {
    unique.set(`${points[index]},${points[index + 1]}`, [points[index], points[index + 1]]);
  }
  return [...unique.values()];
}

function kernel(distanceSquared: number) {
  return distanceSquared < 1e-12 ? 0 : 0.5 * distanceSquared * Math.log(distanceSquared);
}

/** Gaussian elimination with partial pivoting; solves `matrix · x = rhs` for each column of rhs. */
function solve(matrix: Float64Array[], rhs: Float64Array[]) {
  const size = matrix.length;
  const columns = rhs[0].length;
  for (let pivot = 0; pivot < size; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(matrix[row][pivot]) > Math.abs(matrix[best][pivot])) best = row;
    }
    [matrix[pivot], matrix[best]] = [matrix[best], matrix[pivot]];
    [rhs[pivot], rhs[best]] = [rhs[best], rhs[pivot]];
    const head = matrix[pivot][pivot];
    for (let row = pivot + 1; row < size; row += 1) {
      const factor = matrix[row][pivot] / head;
      if (factor === 0) continue;
      for (let column = pivot; column < size; column += 1) matrix[row][column] -= factor * matrix[pivot][column];
      for (let column = 0; column < columns; column += 1) rhs[row][column] -= factor * rhs[pivot][column];
    }
  }
  const result = Array.from({ length: size }, () => new Float64Array(columns));
  for (let row = size - 1; row >= 0; row -= 1) {
    for (let column = 0; column < columns; column += 1) {
      let sum = rhs[row][column];
      for (let other = row + 1; other < size; other += 1) sum -= matrix[row][other] * result[other][column];
      result[row][column] = sum / matrix[row][row];
    }
  }
  return result;
}

export type DisplacementGrid = {
  width: number;
  height: number;
  /** Row-major, top row first, two values per cell in frame fractions. */
  data: Float32Array;
};

/**
 * Builds V over a `width × height` grid of the frame. Landmarks are flat
 * [x0, y0, x1, y1, …] arrays in frame fractions (origin top-left).
 */
export function buildDisplacement(
  joo: readonly number[],
  choo: readonly number[],
  width = 180,
  height = 240,
  smoothing = 2e-4,
): DisplacementGrid {
  // Work in an isotropic space: x in [0, 1], y in [0, 1 / aspect].
  const yScale = 1 / FRAME_ASPECT;
  const centres: [number, number][] = [];
  const values: [number, number][] = [];
  for (let index = 0; index < joo.length; index += 2) {
    centres.push([
      (joo[index] + choo[index]) / 2,
      ((joo[index + 1] + choo[index + 1]) / 2) * yScale,
    ]);
    values.push([choo[index] - joo[index], choo[index + 1] - joo[index + 1]]);
  }
  for (const [x, y] of borderAnchors()) {
    centres.push([x, y * yScale]);
    values.push([0, 0]);
  }

  const count = centres.length;
  const size = count + 3;
  const matrix = Array.from({ length: size }, () => new Float64Array(size));
  const rhs = Array.from({ length: size }, () => new Float64Array(2));
  for (let row = 0; row < count; row += 1) {
    const [rx, ry] = centres[row];
    for (let column = 0; column < count; column += 1) {
      const [cx, cy] = centres[column];
      matrix[row][column] = kernel((rx - cx) ** 2 + (ry - cy) ** 2);
    }
    matrix[row][row] += smoothing;
    matrix[row][count] = 1;
    matrix[row][count + 1] = rx;
    matrix[row][count + 2] = ry;
    matrix[count][row] = 1;
    matrix[count + 1][row] = rx;
    matrix[count + 2][row] = ry;
    rhs[row][0] = values[row][0];
    rhs[row][1] = values[row][1];
  }
  const weights = solve(matrix, rhs);

  const data = new Float32Array(width * height * 2);
  for (let row = 0; row < height; row += 1) {
    const y = ((row + 0.5) / height) * yScale;
    for (let column = 0; column < width; column += 1) {
      const x = (column + 0.5) / width;
      let dx = weights[count][0] + weights[count + 1][0] * x + weights[count + 2][0] * y;
      let dy = weights[count][1] + weights[count + 1][1] * x + weights[count + 2][1] * y;
      for (let index = 0; index < count; index += 1) {
        const u = kernel((x - centres[index][0]) ** 2 + (y - centres[index][1]) ** 2);
        dx += weights[index][0] * u;
        dy += weights[index][1] * u;
      }
      const offset = (row * width + column) * 2;
      data[offset] = dx;
      data[offset + 1] = dy;
    }
  }
  return { width, height, data };
}
