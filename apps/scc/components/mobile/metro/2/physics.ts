// The network as a physical graph. Every station is a node; every link is an
// elastic cord of small nodes between its two stations. A grabbed station
// goes exactly where the finger puts it; its cords stretch and pull the next
// stations, which pull theirs, the effect fading along the graph while each
// node is held toward its home. The paper does not move: only points and the
// lines between them do, and the graph's connections never change.
//
// Position-based dynamics (Verlet integration, then a few passes of distance
// constraints): unconditionally stable, typed arrays only, nothing allocated
// per step.

export type Network = {
  count: number;
  /** x, y per node (CSS px). */
  pos: Float32Array;
  prev: Float32Array;
  home: Float32Array;
  /** 1 for free nodes, 0 while held by a finger. */
  free: Uint8Array;
  /** Pull toward home per step, per node. */
  anchor: Float32Array;
  /** Constraint i joins a[i] and b[i] at rest length rest[i] with stiffness k[i]. */
  a: Int32Array;
  b: Int32Array;
  rest: Float32Array;
  k: Float32Array;
  constraints: number;
};

export type NetworkBuilder = {
  node: (x: number, y: number, anchor: number) => number;
  link: (i: number, j: number, k: number) => void;
  build: () => Network;
};

export function networkBuilder(): NetworkBuilder {
  const xy: number[] = [];
  const anchors: number[] = [];
  const pairs: number[] = [];
  const stiff: number[] = [];
  return {
    node(x, y, anchor) {
      xy.push(x, y);
      anchors.push(anchor);
      return anchors.length - 1;
    },
    link(i, j, k) {
      pairs.push(i, j);
      stiff.push(k);
    },
    build() {
      const count = anchors.length;
      const pos = Float32Array.from(xy);
      const constraints = stiff.length;
      const a = new Int32Array(constraints);
      const b = new Int32Array(constraints);
      const rest = new Float32Array(constraints);
      for (let c = 0; c < constraints; c += 1) {
        a[c] = pairs[c * 2];
        b[c] = pairs[c * 2 + 1];
        rest[c] = Math.hypot(pos[b[c] * 2] - pos[a[c] * 2], pos[b[c] * 2 + 1] - pos[a[c] * 2 + 1]);
      }
      return {
        count,
        pos,
        prev: Float32Array.from(xy),
        home: Float32Array.from(xy),
        free: new Uint8Array(count).fill(1),
        anchor: Float32Array.from(anchors),
        a,
        b,
        rest,
        k: Float32Array.from(stiff),
        constraints,
      };
    },
  };
}

const DAMPING = 0.82;
const PASSES = 6;

/** One frame. Returns the largest node movement (px), for putting the loop to sleep. */
export function step(net: Network) {
  const { pos, prev, home, free, anchor, a, b, rest, k, count, constraints } = net;
  let moved = 0;
  for (let i = 0; i < count; i += 1) {
    if (!free[i]) continue;
    const x = i * 2;
    const vx = (pos[x] - prev[x]) * DAMPING;
    const vy = (pos[x + 1] - prev[x + 1]) * DAMPING;
    prev[x] = pos[x];
    prev[x + 1] = pos[x + 1];
    pos[x] += vx + (home[x] - pos[x]) * anchor[i];
    pos[x + 1] += vy + (home[x + 1] - pos[x + 1]) * anchor[i];
  }
  for (let pass = 0; pass < PASSES; pass += 1) {
    for (let c = 0; c < constraints; c += 1) {
      const i = a[c];
      const j = b[c];
      const wi = free[i];
      const wj = free[j];
      const w = wi + wj;
      if (w === 0) continue;
      const xi = i * 2;
      const xj = j * 2;
      const dx = pos[xj] - pos[xi];
      const dy = pos[xj + 1] - pos[xi + 1];
      const length = Math.sqrt(dx * dx + dy * dy) || 1e-6;
      const s = (k[c] * (length - rest[c])) / (length * w);
      pos[xi] += dx * s * wi;
      pos[xi + 1] += dy * s * wi;
      pos[xj] -= dx * s * wj;
      pos[xj + 1] -= dy * s * wj;
    }
  }
  for (let i = 0; i < count; i += 1) {
    const x = i * 2;
    const d = Math.abs(pos[x] - prev[x]) + Math.abs(pos[x + 1] - prev[x + 1]);
    if (d > moved) moved = d;
  }
  return moved;
}

/** Holds node i at (x, y): it no longer moves by itself. */
export function hold(net: Network, i: number, x: number, y: number) {
  net.free[i] = 0;
  net.pos[i * 2] = x;
  net.pos[i * 2 + 1] = y;
  net.prev[i * 2] = x;
  net.prev[i * 2 + 1] = y;
}

/** Lets node i go where it is, and makes that its home: a station stays where it was put. */
export function drop(net: Network, i: number) {
  net.free[i] = 1;
  net.home[i * 2] = net.pos[i * 2];
  net.home[i * 2 + 1] = net.pos[i * 2 + 1];
}
