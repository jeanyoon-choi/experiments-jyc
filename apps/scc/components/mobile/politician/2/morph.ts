// Thin-plate splines carry the average face onto each of the four. The
// shader needs, for every frame point x, the offsets V_k(x) = face_k − mean,
// placed at the mean geometry. For weights w (summing to 1) the morph
// geometry is mean + Σ w_j V_j, so a pixel at x reads face k at
// x + V_k(x) − Σ_j w_j V_j(x). V does not depend on w, so w may vary from
// pixel to pixel (the Voronoi lattice gives every site its own weights).

/** Frame aspect: the aligned portraits are 900 × 1200. */
export const FRAME_ASPECT = 900 / 1200;

/** Border anchors that keep the frame edge where it is. */
function borderAnchors() {
  const unique = new Map<string, [number, number]>();
  for (const fraction of [0, 1 / 3, 2 / 3, 1]) {
    for (const point of [[fraction, 0], [fraction, 1], [0, fraction], [1, fraction]] as [number, number][]) {
      unique.set(`${point[0]},${point[1]}`, point);
    }
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
  /** Row-major, top row first: RGBA = V_0.xy, V_1.xy, in frame fractions. */
  first: Float32Array;
  /** Row-major, top row first: RGBA = V_2.xy, V_3.xy, in frame fractions. */
  second: Float32Array;
};

/**
 * Builds V_0…V_3 over a `width × height` grid of the frame. Each landmark set
 * is a flat [x0, y0, x1, y1, …] array in frame fractions (origin top-left).
 */
export function buildDisplacements(
  faces: readonly (readonly number[])[],
  width = 180,
  height = 240,
  smoothing = 2e-4,
): DisplacementGrid {
  if (faces.length !== 4) throw new Error("Four landmark sets expected");
  const yScale = 1 / FRAME_ASPECT;
  const centres: [number, number][] = [];
  const values: number[][] = [];
  for (let index = 0; index < faces[0].length; index += 2) {
    const meanX = faces.reduce((sum, face) => sum + face[index], 0) / 4;
    const meanY = faces.reduce((sum, face) => sum + face[index + 1], 0) / 4;
    centres.push([meanX, meanY * yScale]);
    values.push(faces.flatMap((face) => [face[index] - meanX, face[index + 1] - meanY]));
  }
  for (const [x, y] of borderAnchors()) {
    centres.push([x, y * yScale]);
    values.push(new Array(8).fill(0));
  }

  const count = centres.length;
  const size = count + 3;
  const matrix = Array.from({ length: size }, () => new Float64Array(size));
  const rhs = Array.from({ length: size }, () => new Float64Array(8));
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
    rhs[row].set(values[row]);
  }
  const weights = solve(matrix, rhs);

  const first = new Float32Array(width * height * 4);
  const second = new Float32Array(width * height * 4);
  const cell = new Float64Array(8);
  for (let row = 0; row < height; row += 1) {
    const y = ((row + 0.5) / height) * yScale;
    for (let column = 0; column < width; column += 1) {
      const x = (column + 0.5) / width;
      for (let channel = 0; channel < 8; channel += 1) {
        cell[channel] = weights[count][channel] + weights[count + 1][channel] * x + weights[count + 2][channel] * y;
      }
      for (let index = 0; index < count; index += 1) {
        const u = kernel((x - centres[index][0]) ** 2 + (y - centres[index][1]) ** 2);
        if (u === 0) continue;
        const w = weights[index];
        for (let channel = 0; channel < 8; channel += 1) cell[channel] += w[channel] * u;
      }
      const offset = (row * width + column) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        first[offset + channel] = cell[channel];
        second[offset + channel] = cell[channel + 4];
      }
    }
  }
  return { width, height, first, second };
}

/**
 * Corner weights for a finger at (x, y) in [0, 1]²: 문재인 top left, 박근혜 top
 * right, 이재명 bottom left, 윤석열 bottom right. Near a corner the shaped
 * coordinates saturate, so that corner's face is held whole; along an edge two
 * faces morph, and in the middle all four.
 */
export const CORNER_ORDER = ["moon", "park", "lee", "yoon"] as const;

function shape(value: number) {
  const t = Math.min(1, Math.max(0, (value - 0.16) / 0.68));
  return t * t * (3 - 2 * t);
}

export function cornerWeights(x: number, y: number): [number, number, number, number] {
  const u = shape(x);
  const v = shape(y);
  return [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
}
