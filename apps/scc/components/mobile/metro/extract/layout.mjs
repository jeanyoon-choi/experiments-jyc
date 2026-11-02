// Schematic layout for the 수도권 전철 network.
//
// node layout.mjs network.json ../1/model/network.json
//
// The output is written to a temporary file and renamed into place, so a
// running dev server never reads a half-written or empty JSON module.
//
// 1. True station positions, with the far suburbs folded in the way the
//    official 노선도 folds them (component-wise asinh around 서울시청).
// 2. Key stations — transfers, branches, termini — relax toward even spacing
//    and octilinear (0°/45°/90°) links while a weak pull keeps the geography.
// 3. 2호선's loop becomes a circle (서울시 2023 노선도) and the rest relaxes
//    around it.
// 4. Each run of ordinary stations between two key stations is drawn as an
//    octilinear path with at most one bend, its stations evenly spaced; the
//    한강 runs through the middle of every link that bridges it.
// 5. The whole map turns 90° clockwise — west at the top, north to the
//    right — so the region's long east–west schematic spans a phone's height.
//
// Topology is never touched: only coordinates change.

import { readFileSync, renameSync, writeFileSync } from "node:fs";

const net = JSON.parse(readFileSync(process.argv[2], "utf8"));

// 서울시청 as origin; kilometres east (x) and north (y).
const LAT0 = 37.5657;
const LON0 = 126.9769;
const KX = 111.32 * Math.cos((LAT0 * Math.PI) / 180);
const KY = 110.57;
// Linear in the core, logarithmic in the tails; north–south folds sooner so
// 연천 and 신창 come in while 인천–춘천 stays long.
const BX = 12;
const BY = 3;

const stations = net.stations;
const n = stations.length;
const index = new Map(stations.map((s, i) => [s.id, i]));
const geo = stations.map((s) => [(s.lon - LON0) * KX, (s.lat - LAT0) * KY]);
const fold = geo.map(([x, y]) => [BX * Math.asinh(x / BX), BY * Math.asinh(y / BY)]);

const linesAt = Array.from({ length: n }, () => new Set());
const edgeSet = new Map();
for (const line of net.lines) {
  for (const [a, b] of line.edges) {
    const i = index.get(a);
    const j = index.get(b);
    linesAt[i].add(line.id);
    linesAt[j].add(line.id);
    edgeSet.set(i < j ? `${i}|${j}` : `${j}|${i}`, [Math.min(i, j), Math.max(i, j)]);
  }
}
const nb = Array.from({ length: n }, () => []);
for (const [a, b] of edgeSet.values()) {
  nb[a].push(b);
  nb[b].push(a);
}

const baseKey = (i) => nb[i].length !== 2 || linesAt[i].size > 1;
const ek = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// 2호선's circle line, in running order from 시청: prune the 성수 and 신정
// branches leaf by leaf until only the loop remains.
const loop = (() => {
  const adj = new Map();
  for (const [a, b] of net.lines.find((l) => l.id === "2").edges) {
    const i = index.get(a);
    const j = index.get(b);
    if (!adj.has(i)) adj.set(i, new Set());
    if (!adj.has(j)) adj.set(j, new Set());
    adj.get(i).add(j);
    adj.get(j).add(i);
  }
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const [i, set] of adj) {
      if (set.size > 1) continue;
      for (const j of set) adj.get(j).delete(i);
      adj.delete(i);
      pruned = true;
    }
  }
  const start = stations.findIndex((s) => s.name === "시청");
  const order = [start];
  let prev = -1;
  let cur = start;
  for (;;) {
    const next = [...adj.get(cur)].find((v) => v !== prev);
    if (next === start) break;
    order.push(next);
    prev = cur;
    cur = next;
  }
  return order;
})();
const onLoop = new Set(loop);
const loopEdge = new Set(loop.map((v, i) => ek(v, loop[(i + 1) % loop.length])));

// Chains of ordinary stations between key stations.
function buildChains(isKey) {
  const chains = [];
  const seen = new Set();
  const walk = (start, next) => {
    const path = [start, next];
    while (!isKey(path[path.length - 1])) {
      const cur = path[path.length - 1];
      const prev = path[path.length - 2];
      const nxt = nb[cur].find((v) => v !== prev);
      path.push(nxt);
      if (nxt === start) break;
    }
    return path;
  };
  for (let i = 0; i < n; i += 1) {
    if (!isKey(i)) continue;
    for (const j of nb[i]) {
      if (seen.has(ek(i, j))) continue;
      const path = walk(i, j);
      for (let k = 1; k < path.length; k += 1) seen.add(ek(path[k - 1], path[k]));
      chains.push(path);
    }
  }
  if (seen.size !== edgeSet.size) throw new Error("unvisited edges: a loop without key stations");
  if (chains.some((c) => c[0] === c[c.length - 1])) throw new Error("a run returns to its own key station");
  return chains;
}

const chainGeoOf = (c) => {
  let s = 0;
  for (let k = 1; k < c.length; k += 1) s += dist(geo[c[k - 1]], geo[c[k]]);
  return s;
};
const chains1 = buildChains(baseKey);
const steps = chains1
  .flatMap((c) => Array(c.length - 1).fill(chainGeoOf(c) / (c.length - 1)))
  .sort((a, b) => a - b);
const medianStep = steps[Math.floor(steps.length / 2)];

// One unit is the shortest station spacing; long rural runs stay longer.
const L = 1;
const linksOf = (chains) =>
  chains.map((c) => {
    const k = c.length - 1;
    const step = chainGeoOf(c) / k;
    return { a: c[0], b: c[k], k, t: k * L * Math.min(2.4, Math.max(1, Math.pow(step / medianStep, 0.45))) };
  });

// Scale the folded geography so the core's (lower-quartile) spacing is a
// little over one unit.
const foldSteps = chains1
  .map((c) => dist(fold[c[0]], fold[c[c.length - 1]]) / (c.length - 1))
  .filter((v) => v > 1e-6)
  .sort((a, b) => a - b);
const s0 = (1.3 * L) / foldSteps[Math.floor(foldSteps.length * 0.25)];
const p0 = fold.map(([x, y]) => [x * s0, y * s0]);
const p = p0.map(([x, y]) => [x, y]);

const OCT = Math.PI / 4;
const ITER = 9000;
const MIN_KEY = 2.2 * L;
const MIN_LINK = 0.9 * L;
const SIDE_GAP = 1.2 * L;

function closest(q, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2));
  return [a[0] + t * dx, a[1] + t * dy, t];
}

function relax(links, keys, iterations, { pinned = new Set(), snapFrom = 0, anchorScale = 1, skipLink = () => false, home = p0, side = null } = {}) {
  for (let it = 0; it < iterations; it += 1) {
    const phase = it / iterations;
    const snap = Math.min(1, snapFrom + phase * 1.5);
    const d = Array.from({ length: n }, () => [0, 0]);

    for (const link of links) {
      const { a, b, t, k } = link;
      if (skipLink(link)) continue;
      const dx = p[b][0] - p[a][0];
      const dy = p[b][1] - p[a][1];
      const len = Math.hypot(dx, dy) || 1e-6;
      const ang = Math.atan2(dy, dx);
      const sn = Math.round(ang / OCT) * OCT;
      const use = ang + (sn - ang) * snap;
      // Short links are pushed hard to their minimum; long ones relax gently.
      const minLen = k * L;
      const tl = len < minLen ? minLen : len + (t - len) * 0.15;
      const w = 0.3 / Math.sqrt(k);
      const cx = (Math.cos(use) * tl - dx) * w;
      const cy = (Math.sin(use) * tl - dy) * w;
      d[a][0] -= cx;
      d[a][1] -= cy;
      d[b][0] += cx;
      d[b][1] += cy;
    }

    for (let x = 0; x < keys.length; x += 1) {
      const i = keys[x];
      for (let y = x + 1; y < keys.length; y += 1) {
        const j = keys[y];
        if (pinned.has(i) && pinned.has(j)) continue;
        const dx = p[j][0] - p[i][0];
        const dy = p[j][1] - p[i][1];
        if (Math.abs(dx) > MIN_KEY || Math.abs(dy) > MIN_KEY) continue;
        const dd = Math.hypot(dx, dy) || 1e-6;
        if (dd >= MIN_KEY) continue;
        const push = ((MIN_KEY - dd) / dd) * 0.25;
        d[i][0] -= dx * push;
        d[i][1] -= dy * push;
        d[j][0] += dx * push;
        d[j][1] += dy * push;
      }
    }

    if (it % 3 === 0) {
      for (const link of links) {
        const { a, b } = link;
        if (skipLink(link)) continue;
        for (const q of keys) {
          if (q === a || q === b) continue;
          const [cx, cy, t] = closest(p[q], p[a], p[b]);
          if (t <= 0.01 || t >= 0.99) continue;
          const dx = p[q][0] - cx;
          const dy = p[q][1] - cy;
          if (Math.abs(dx) > MIN_LINK || Math.abs(dy) > MIN_LINK) continue;
          const dd = Math.hypot(dx, dy) || 1e-6;
          if (dd >= MIN_LINK) continue;
          const push = ((MIN_LINK - dd) / dd) * 0.5;
          d[q][0] += dx * push;
          d[q][1] += dy * push;
          d[a][0] -= dx * push * 0.4;
          d[a][1] -= dy * push * 0.4;
          d[b][0] -= dx * push * 0.4;
          d[b][1] -= dy * push * 0.4;
        }
      }
    }

    const anchor = 0.02 * anchorScale * (1 - phase * 0.8);
    const cap = 0.25 * L * (1 - phase * 0.8);
    for (const i of keys) {
      if (pinned.has(i)) continue;
      d[i][0] += (home[i][0] - p[i][0]) * anchor;
      d[i][1] += (home[i][1] - p[i][1]) * anchor;
      // Keep each station on its own side of 2호선's circle.
      const sd = side?.get(i);
      if (sd) {
        const rx = p[i][0] + d[i][0] - side.cx;
        const ry = p[i][1] + d[i][1] - side.cy;
        const rd = Math.hypot(rx, ry) || 1e-6;
        const limit = side.radius + sd * SIDE_GAP;
        if ((sd < 0 && rd > limit) || (sd > 0 && rd < limit)) {
          d[i][0] += (rx / rd) * (limit - rd);
          d[i][1] += (ry / rd) * (limit - rd);
        }
      }
      const m = Math.hypot(d[i][0], d[i][1]);
      if (!Number.isFinite(m)) throw new Error(`diverged at ${stations[i].name}, iteration ${it}`);
      const f = m > cap ? cap / m : 1;
      p[i][0] += d[i][0] * f;
      p[i][1] += d[i][1] * f;
    }
  }
}

// Phase 1: the octilinear relaxation of every key station.
const keys1 = [...Array(n).keys()].filter(baseKey);
relax(linksOf(chains1), keys1, ITER);

// Phase 2: 2호선 becomes a circle, as on 서울시's 2023 노선도. Its stations
// sit at even angles in running order, the circle centred where the loop
// settled and sized for even spacing; the rest relaxes around it.
const circle = (() => {
  // Ordinary loop stations have no position yet; interpolate along chains.
  const at = p.map(([x, y]) => [x, y]);
  for (const c of chains1) {
    for (let k = 1; k < c.length - 1; k += 1) {
      const f = k / (c.length - 1);
      at[c[k]] = [p[c[0]][0] + (p[c[c.length - 1]][0] - p[c[0]][0]) * f, p[c[0]][1] + (p[c[c.length - 1]][1] - p[c[0]][1]) * f];
    }
  }
  const pts = loop.map((i) => at[i]);
  const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
  const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
  let area = 0;
  pts.forEach((q, i) => {
    const r = pts[(i + 1) % pts.length];
    area += q[0] * r[1] - r[0] * q[1];
  });
  const dir = area > 0 ? 1 : -1;
  const m = loop.length;
  let sx = 0;
  let sy = 0;
  pts.forEach((q, i) => {
    const a = Math.atan2(q[1] - cy, q[0] - cx) - (dir * 2 * Math.PI * i) / m;
    sx += Math.cos(a);
    sy += Math.sin(a);
  });
  const theta0 = Math.atan2(sy, sx);
  const radius = (m * 2.1 * L) / (2 * Math.PI);
  return { cx, cy, radius, dir, theta0, m };
})();
const loopAngle = new Map(loop.map((v, i) => [v, circle.theta0 + (circle.dir * 2 * Math.PI * i) / circle.m]));
for (const [v, a] of loopAngle) p[v] = [circle.cx + circle.radius * Math.cos(a), circle.cy + circle.radius * Math.sin(a)];

// Which side of the loop each station really lies on (geography, folded).
const loopPoly = loop.map((i) => p0[i]);
const insideLoop = (q) => {
  let inside = false;
  for (let i = 0, j = loopPoly.length - 1; i < loopPoly.length; j = i, i += 1) {
    const [xi, yi] = loopPoly[i];
    const [xj, yj] = loopPoly[j];
    if (yi > q[1] !== yj > q[1] && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const key2 = (i) => baseKey(i) || onLoop.has(i);
const chains = buildChains(key2);
const keys = [...Array(n).keys()].filter(key2);
const side = Object.assign(new Map(), circle);
// Phase-1 loop radius, so stations move with the circle's growth.
const r1 = (() => {
  const ks = loop.filter(baseKey);
  return ks.reduce((s, i) => s + Math.hypot(p[i][0] - circle.cx, p[i][1] - circle.cy), 0) / ks.length;
})();
for (const i of keys) {
  if (onLoop.has(i)) continue;
  const sd = insideLoop(p0[i]) ? -1 : 1;
  side.set(i, sd);
  const rx = p[i][0] - circle.cx;
  const ry = p[i][1] - circle.cy;
  const rd = Math.hypot(rx, ry) || 1e-6;
  const to = sd < 0 ? Math.min((rd / r1) * (circle.radius - SIDE_GAP), circle.radius - SIDE_GAP) : Math.max(rd + (circle.radius - r1), circle.radius + SIDE_GAP);
  p[i] = [circle.cx + (rx / rd) * to, circle.cy + (ry / rd) * to];
}
const home2 = p.map(([x, y]) => [x, y]);
relax(linksOf(chains), keys, ITER / 2, {
  pinned: onLoop,
  snapFrom: 1,
  anchorScale: 0.5,
  skipLink: ({ a, b }) => loopEdge.has(ek(a, b)),
  home: home2,
  side,
});

// Composition: the circle's centre becomes the centre of a portrait frame
// (the phone, ASPECT tall), the circle spans CIRCLE_SHARE of its width, and
// beyond the circle every direction is stretched or folded on its own so the
// network reaches the frame's edge all round — even density, no empty side.
// Pre-rotation x (east) becomes the screen's height, y (north) its width.
const ASPECT = 2.05;
const CIRCLE_SHARE = 0.46;
// Below 1, the band just outside the circle opens up and the far tails fold.
const GAMMA = 0.6;
const halfW = circle.radius / CIRCLE_SHARE;
const halfH = halfW * ASPECT;
const BINS = 72;
const reachOf = (t) => {
  // Distance from the centre to the frame edge in direction t (pre-rotation).
  const c = Math.abs(Math.cos(t));
  const s = Math.abs(Math.sin(t));
  return Math.min(c > 1e-9 ? halfH / c : Infinity, s > 1e-9 ? halfW / s : Infinity);
};
const binOf = (t) => ((Math.floor(((t + Math.PI) / (2 * Math.PI)) * BINS) % BINS) + BINS) % BINS;
const extent = new Array(BINS).fill(circle.radius * 1.05);
for (const i of keys) {
  const rx = p[i][0] - circle.cx;
  const ry = p[i][1] - circle.cy;
  const b = binOf(Math.atan2(ry, rx));
  extent[b] = Math.max(extent[b], Math.hypot(rx, ry));
}
// Smooth the outline so neighbouring directions bend alike.
const smooth = extent.map((_, b) => {
  let best = 0;
  for (let o = -4; o <= 4; o += 1) best = Math.max(best, extent[(b + o + BINS) % BINS] * (1 - Math.abs(o) * 0.04));
  return best;
});
const warpAt = (t, rd) => {
  const f = ((t + Math.PI) / (2 * Math.PI)) * BINS - 0.5;
  const b0 = ((Math.floor(f) % BINS) + BINS) % BINS;
  const b1 = (b0 + 1) % BINS;
  const w = f - Math.floor(f);
  const e = smooth[b0] * (1 - w) + smooth[b1] * w;
  const reach = reachOf(t) * 0.97;
  const u = Math.min(1, (rd - circle.radius) / Math.max(1e-6, e - circle.radius));
  return circle.radius + (reach - circle.radius) * Math.pow(u, GAMMA);
};
for (const i of keys) {
  if (onLoop.has(i)) continue;
  const rx = p[i][0] - circle.cx;
  const ry = p[i][1] - circle.cy;
  const rd = Math.hypot(rx, ry) || 1e-6;
  if (rd <= circle.radius) continue;
  const to = warpAt(Math.atan2(ry, rx), rd);
  p[i] = [circle.cx + (rx / rd) * to, circle.cy + (ry / rd) * to];
}

// Octilinear path with at most one bend from a to b. `diagFirst` picks
// which leg comes first.
function octPath(a, b, diagFirst) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const diag = Math.min(ax, ay);
  const straight = [ax >= ay ? dx - sx * diag : 0, ay > ax ? dy - sy * diag : 0];
  const dv = [sx * diag, sy * diag];
  const tiny = 1e-3;
  if (Math.hypot(...straight) < tiny || diag < tiny) return [a, b];
  const first = diagFirst ? dv : straight;
  return [a, [a[0] + first[0], a[1] + first[1]], b];
}

function along(path, f) {
  const segs = [];
  let total = 0;
  for (let k = 1; k < path.length; k += 1) {
    const l = dist(path[k - 1], path[k]);
    segs.push(l);
    total += l;
  }
  let r = f * total;
  for (let k = 0; k < segs.length; k += 1) {
    if (r <= segs[k] || k === segs.length - 1) {
      const t = segs[k] ? Math.min(1, r / segs[k]) : 0;
      return { point: [path[k][0] + (path[k + 1][0] - path[k][0]) * t, path[k][1] + (path[k + 1][1] - path[k][1]) * t], seg: k };
    }
    r -= segs[k];
  }
  return { point: path[path.length - 1], seg: segs.length - 1 };
}

const pos = p.map(([x, y]) => [x, y]);
const vias = new Map(); // edge key → { from, points } lying between its stations
const pairUse = new Map();
for (const c of chains) {
  const a = c[0];
  const b = c[c.length - 1];
  if (c.length === 2 && loopEdge.has(ek(a, b))) {
    // Arc along the circle.
    let ta = loopAngle.get(a);
    let tb = loopAngle.get(b);
    while (tb - ta > Math.PI) tb -= 2 * Math.PI;
    while (ta - tb > Math.PI) tb += 2 * Math.PI;
    const pts = [];
    const steps = 6;
    for (let s = 1; s < steps; s += 1) {
      const t = ta + ((tb - ta) * s) / steps;
      pts.push([circle.cx + circle.radius * Math.cos(t), circle.cy + circle.radius * Math.sin(t)]);
    }
    vias.set(ek(a, b), { from: a, points: pts });
    continue;
  }
  const options = [octPath(p[a], p[b], true), octPath(p[a], p[b], false)];
  // Prefer the bend nearer the run's own (folded) geography.
  const score = (path) => {
    let s = 0;
    for (let k = 1; k < c.length - 1; k += 1) {
      const target = along(path, k / (c.length - 1)).point;
      s += dist(target, p0[c[k]]);
    }
    return s;
  };
  let best = score(options[0]) <= score(options[1]) ? 0 : 1;
  const pk = ek(a, b);
  if (pairUse.has(pk) && options[0].length === 3 && pairUse.get(pk) === best) best = 1 - best;
  pairUse.set(pk, best);
  const path = options[best];
  const k = c.length - 1;
  const at = [];
  for (let s = 0; s <= k; s += 1) {
    const r = along(path, s / k);
    at.push(r);
    if (s > 0 && s < k) pos[c[s]] = r.point;
  }
  if (path.length === 3) {
    for (let s = 1; s <= k; s += 1) {
      const startSeg = s === 1 ? 0 : at[s - 1].seg;
      const endSeg = s === k ? 1 : at[s].seg;
      const atBend = dist(at[s].point, path[1]) < 1e-6 || dist(at[s - 1].point, path[1]) < 1e-6;
      if (startSeg !== endSeg && !atBend) vias.set(ek(c[s - 1], c[s]), { from: c[s - 1], points: [path[1]] });
    }
  }
}

// 한강: through the middle of every link that bridges it, west to east.
const named = (name) => {
  const i = stations.findIndex((s) => s.name === name);
  if (i < 0) throw new Error(`no station ${name}`);
  return i;
};
const BRIDGES = [
  ["마곡나루", "디지털미디어시티"],
  ["당산", "합정"],
  ["여의나루", "마포"],
  ["노량진", "용산"],
  ["동작", "이촌"],
  ["압구정", "옥수"],
  ["압구정로데오", "서울숲"],
  ["청담", "자양"],
  ["잠실나루", "강변"],
  ["천호", "광나루"],
  ["암사역사공원", "장자호수공원"],
];
const linkPath = (a, b) => {
  const v = vias.get(ek(a, b));
  if (!v) return [pos[a], pos[b]];
  const mid = v.from === a ? v.points : [...v.points].reverse();
  return [pos[a], ...mid, pos[b]];
};
const crossings = BRIDGES.map(([x, y]) => {
  const a = named(x);
  const b = named(y);
  if (!edgeSet.has(ek(a, b))) throw new Error(`${x}–${y} is not a link`);
  return { at: along(linkPath(a, b), 0.5).point, lon: (stations[a].lon + stations[b].lon) / 2 };
}).sort((u, v) => u.lon - v.lon);
const river = crossings.map((c) => c.at);
const extend = (q, r, len) => {
  const d = dist(q, r) || 1;
  return [q[0] + ((q[0] - r[0]) / d) * len, q[1] + ((q[1] - r[1]) / d) * len];
};
river.unshift(extend(river[0], river[1], 6));
river.push(extend(river[river.length - 1], river[river.length - 2], 6));

// Turn 90° clockwise into screen space (y down): east → down, north → right.
const rot = ([x, y]) => [y, x];
const screen = pos.map(rot);
const minX = Math.min(...screen.map((q) => q[0]));
const minY = Math.min(...screen.map((q) => q[1]));
const round = (v) => Math.round(v * 1000) / 1000;
const place = (q) => {
  const [x, y] = rot(q);
  return [round(x - minX), round(y - minY)];
};

let worst = 0;
for (const c of chains) {
  if (c.length === 2 && loopEdge.has(ek(c[0], c[1]))) continue;
  const a = p[c[0]];
  const b = p[c[c.length - 1]];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  worst = Math.max(worst, Math.abs(ang - Math.round(ang / OCT) * OCT));
}
process.stderr.write(`stations ${n}, keys ${keys.length}, runs ${chains.length}, circle ${loop.length} stations r=${circle.radius.toFixed(2)}, worst key-link deviation ${((worst * 180) / Math.PI).toFixed(1)}°\n`);

const corner = (dx, dy) => place([circle.cx + dx, circle.cy + dy]);
const [fx0, fy0] = corner(-halfH, -halfW);
const [fx1, fy1] = corner(halfH, halfW);
const out = {
  source: net.source,
  // The portrait frame the map is composed for, circle at its centre.
  frame: { x: Math.min(fx0, fx1), y: Math.min(fy0, fy1), w: Math.abs(fx1 - fx0), h: Math.abs(fy1 - fy0) },
  river: river.map(place),
  stations: stations.map((s, i) => {
    const [x, y] = place(pos[i]);
    return { id: s.id, name: s.name, en: s.en, x, y };
  }),
  lines: net.lines.map((l) => {
    const keysOnLine = [...new Set(l.edges.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)))];
    return {
      id: l.id,
      name: l.name,
      badge: l.badge,
      colour: l.colour,
      edges: keysOnLine.map((k) => {
        const [a, b] = k.split("|");
        const v = vias.get(ek(index.get(a), index.get(b)));
        if (!v) return [a, b];
        const pts = v.from === index.get(a) ? v.points : [...v.points].reverse();
        return [a, b, pts.map(place)];
      }),
    };
  }),
};
const target = process.argv[3];
if (!target) throw new Error("usage: node layout.mjs network.json <output.json>");
const tmp = `${target}.${process.pid}.tmp`;
writeFileSync(tmp, JSON.stringify(out));
renameSync(tmp, target);
