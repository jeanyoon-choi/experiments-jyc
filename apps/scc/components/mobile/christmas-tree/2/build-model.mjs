// Builds the relief head: node components/mobile/christmas-tree/2/build-model.mjs  (from apps/scc)
//
// Each head is a cut-out photograph (public/images/christmas-tree/, credits in license.txt), given the
// depth the photograph itself implies. faces/<name>.json holds what was measured from it, once, in a browser:
//   pts      MediaPipe Face Landmarker's 468 face points on the cut-out, in its pixels; z in the same
//            pixels, smaller = nearer the camera (the model served at /models/gaze-tracking)
//   tess     the landmarker's own mesh edges (FACE_LANDMARKS_TESSELATION)
//   outline  the cut-out's silhouette, 96 points traced outward from its centre, 2.5 px inside the edge
//   centre   that centre
// The cut-outs themselves were made in the same pass: MediaPipe's selfie multiclass segmenter, hair
// plus face skin, on the head cropped from each Commons portrait.
//
// The mesh is a height field over the picture: the landmarks that face the camera keep their measured
// depth; the silhouette lies back behind them; hair, ear and neck, which the landmarker does not know,
// are a membrane stretched between the two and blown out a little, so the head rounds off toward its
// edge. Seen from the front it is exactly the photograph.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const here = import.meta.dirname;
const FACES = ["zuckerberg", "kim", "trump"]; // faces/<name>.json in, public/3d/christmas-tree/<name>.json out

const FILL_STEP = 30; // px between the points added over hair, ear and neck
const CLEAR = 15; // px a filler keeps from any landmark or the silhouette
const RIM_BACK = 0.3; // how far behind the front of the face the silhouette lies at most, of the face's width
const RIM_FALL = 0.6; // px the silhouette drops back per px it stands off the nearest landmark
const FACING = 0.5; // a landmark seen more edge-on than this is left to the membrane
const INFLATE = 2.0; // px a free point rises over the mean of its neighbours, each pass
const BACK = 0.48; // how far the back of the head bulges behind the silhouette, of the head's height
const BACK_STEP = 58; // px between the points of the back
const RIM_INSET = 14; // px inside the silhouette that the back takes its colour from
const DEPTH = 0.7; // of the landmarker's own depth: at full depth the walls of the nose, which the photograph never saw, smear

function build(name) {
const OUT = path.resolve(here, `../../../../public/3d/christmas-tree/${name}.json`);
const { w, h, pts, tess, outline, centre } = JSON.parse(readFileSync(path.join(here, "faces", `${name}.json`), "utf8"));

// --- which landmarks face the camera ------------------------------------------------------
// triangles of the landmarker's mesh: every three points joined pairwise
const linked = pts.map(() => new Set());
for (const [a, b] of tess) {
  linked[a].add(b);
  linked[b].add(a);
}
const faceTriangles = [];
for (let a = 0; a < pts.length; a += 1) for (const b of linked[a]) if (b > a) for (const c of linked[b]) if (c > b && linked[a].has(c)) faceTriangles.push([a, b, c]);
// The far cheek is turned away and folds under the near one in the picture. A point stays when the
// mesh round it, taken as a whole, is seen from its front; the mesh's handedness is read off the
// triangles nearest the camera, which certainly are.
// The cliques come in no particular winding. Wind them alike: across a shared edge, two triangles of
// one surface run that edge in opposite directions.
{
  const byEdge = new Map();
  faceTriangles.forEach((t, index) => {
    for (let k = 0; k < 3; k += 1) {
      const p = t[k];
      const q = t[(k + 1) % 3];
      const key = p < q ? `${p},${q}` : `${q},${p}`;
      if (!byEdge.has(key)) byEdge.set(key, []);
      byEdge.get(key).push(index);
    }
  });
  const runs = (t, p, q) => t.some((value, k) => value === p && t[(k + 1) % 3] === q);
  const seen = new Uint8Array(faceTriangles.length);
  for (let start = 0; start < faceTriangles.length; start += 1) {
    if (seen[start]) continue;
    seen[start] = 1;
    const queue = [start];
    while (queue.length) {
      const t = faceTriangles[queue.pop()];
      for (let k = 0; k < 3; k += 1) {
        const p = t[k];
        const q = t[(k + 1) % 3];
        for (const other of byEdge.get(p < q ? `${p},${q}` : `${q},${p}`)) {
          if (seen[other]) continue;
          seen[other] = 1;
          if (runs(faceTriangles[other], p, q)) faceTriangles[other].reverse();
          queue.push(other);
        }
      }
    }
  }
}
const cross = ([a, b, c]) => (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
const depthOf = (t) => (pts[t[0]][2] + pts[t[1]][2] + pts[t[2]][2]) / 3;
const nearest = [...faceTriangles].sort((s, t) => depthOf(s) - depthOf(t)).slice(0, 80);
const hand = Math.sign(nearest.reduce((sum, t) => sum + cross(t), 0));
const normals = pts.map(() => [0, 0, 0]);
for (const t of faceTriangles) {
  const [a, b, c] = t.map((i) => pts[i]);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [(u[1] * v[2] - u[2] * v[1]) * hand, (u[2] * v[0] - u[0] * v[2]) * hand, (u[0] * v[1] - u[1] * v[0]) * hand];
  for (const i of t) for (let k = 0; k < 3; k += 1) normals[i][k] += n[k];
}
// how squarely each point faces the camera: 1 head on, 0 edge on, negative turned away
const facing = normals.map((n) => n[2] / (Math.hypot(n[0], n[1], n[2]) || 1));
// and whether another part of the face stands in front of it in the picture (the far side of the nose
// lies behind its bridge): such a point would be a second depth at the same place, and tear the field
const hidden = pts.map(([x, y, z], i) =>
  faceTriangles.some((t) => {
    if (t.includes(i)) return false;
    const [a, b, c] = t.map((j) => pts[j]);
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-6) return false;
    const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
    const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
    if (u < 0 || v < 0 || u + v > 1) return false;
    return u * a[2] + v * b[2] + (1 - u - v) * c[2] < z - 2;
  }),
);

const inside = (x, y, ring) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};
const edgeDistance = (x, y) => {
  let best = Infinity;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
    const [ax, ay] = outline[j];
    const [bx, by] = outline[i];
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)));
  }
  return best;
};

if (process.env.DEBUG) console.log(name, "unfacing", facing.filter((f) => f < FACING).length, "hidden", hidden.filter(Boolean).length, "outside", pts.filter(([x, y]) => !inside(x, y, outline)).length, "edge", pts.filter(([x, y]) => edgeDistance(x, y) < 6).length, "hand", hand);
// --- points -------------------------------------------------------------------------------
// each: [x, y, z toward the viewer, fixed?]
const points = [];
for (let i = 0; i < pts.length; i += 1) {
  const [x, y, z] = pts[i];
  if (facing[i] < FACING || hidden[i] || !inside(x, y, outline) || edgeDistance(x, y) < 6) continue;
  points.push([x, y, -z * DEPTH, true]);
}
const landmarkCount = points.length;
const xs = points.map((p) => p[0]);
const faceWidth = Math.max(...xs) - Math.min(...xs);
const front = Math.max(...points.map((p) => p[2]));
const rim = front - faceWidth * RIM_BACK;
// Where the face itself runs to the silhouette (nose, brow, chin in this three-quarter view) the edge
// lies just behind it; over hair and neck it falls away to the back.
for (const [x, y] of outline) {
  let near = Infinity;
  let depth = rim;
  for (let i = 0; i < landmarkCount; i += 1) {
    const d = Math.hypot(points[i][0] - x, points[i][1] - y);
    if (d < near) {
      near = d;
      depth = points[i][2];
    }
  }
  points.push([x, y, Math.max(rim, depth - near * RIM_FALL), true]);
}
// fillers on a staggered grid, clear of everything already placed
for (let row = 0, y = FILL_STEP / 2; y < h; y += FILL_STEP * 0.87, row += 1) {
  for (let x = (row % 2 ? FILL_STEP : FILL_STEP / 2); x < w; x += FILL_STEP) {
    if (!inside(x, y, outline) || edgeDistance(x, y) < CLEAR) continue;
    if (points.some((p) => Math.hypot(p[0] - x, p[1] - y) < CLEAR)) continue;
    points.push([x, y, rim, false]);
  }
}

// --- triangles: Delaunay over the picture (Bowyer–Watson) ----------------------------------
function delaunay(list) {
  const n = list.length;
  const v = list.map((p) => [p[0], p[1]]);
  const big = 4 * Math.max(w, h);
  v.push([-big, -big], [big * 2, -big], [w / 2, big * 2]);
  const circle = (a, b, c) => {
    const [ax, ay] = v[a];
    const [bx, by] = v[b];
    const [cx, cy] = v[c];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { a, b, c, x: ux, y: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };
  let triangles = [circle(n, n + 1, n + 2)];
  for (let i = 0; i < n; i += 1) {
    const [px, py] = v[i];
    const edges = new Map();
    const kept = [];
    for (const t of triangles) {
      if ((px - t.x) ** 2 + (py - t.y) ** 2 >= t.r2) {
        kept.push(t);
        continue;
      }
      for (const [p, q] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
        const key = p < q ? `${p},${q}` : `${q},${p}`;
        if (edges.has(key)) edges.delete(key);
        else edges.set(key, [p, q]);
      }
    }
    for (const [p, q] of edges.values()) kept.push(circle(p, q, i));
    triangles = kept;
  }
  return triangles.filter((t) => t.a < n && t.b < n && t.c < n).map((t) => [t.a, t.b, t.c]);
}
const triangles = delaunay(points)
  // the hull's spare triangles lie outside the head
  .filter(([a, b, c]) => inside((points[a][0] + points[b][0] + points[c][0]) / 3, (points[a][1] + points[b][1] + points[c][1]) / 3, outline))
  // wound so the front faces the viewer once y points up
  .map(([a, b, c]) => {
    const turn = (points[b][0] - points[a][0]) * (points[c][1] - points[a][1]) - (points[b][1] - points[a][1]) * (points[c][0] - points[a][0]);
    return turn > 0 ? [a, c, b] : [a, b, c];
  });

// --- depth of the free points: a membrane, blown out ---------------------------------------
const around = points.map(() => new Set());
for (const [a, b, c] of triangles) {
  around[a].add(b).add(c);
  around[b].add(a).add(c);
  around[c].add(a).add(b);
}
for (let pass = 0; pass < 600; pass += 1) {
  for (let i = 0; i < points.length; i += 1) {
    if (points[i][3] || around[i].size === 0) continue;
    let sum = 0;
    for (const j of around[i]) sum += points[j][2];
    points[i][2] = sum / around[i].size + INFLATE;
  }
}

// --- the back of the head -------------------------------------------------------------------
// The photograph has no back. The head is closed behind its silhouette by a dome, deepest behind the
// middle, and coloured with what the photograph shows at its own edge, drawn inward along each ray
// from the centre: hair over the crown, skin by the ears and under the jaw.
const first = landmarkCount; // the silhouette's points follow the landmarks
const reach = (x, y) => edgeDistance(x, y);
const backs = [];
for (let row = 0, y = BACK_STEP / 2; y < h; y += BACK_STEP * 0.87, row += 1) {
  for (let x = (row % 2 ? BACK_STEP : BACK_STEP / 2); x < w; x += BACK_STEP) {
    if (inside(x, y, outline) && reach(x, y) >= BACK_STEP * 0.45) backs.push([x, y]);
  }
}
const deepest = Math.max(...backs.map(([x, y]) => reach(x, y)));
const backTriangles = delaunay([...outline, ...backs])
  .filter(([a, b, c]) => {
    const at = (i) => (i < outline.length ? outline[i] : backs[i - outline.length]);
    return inside((at(a)[0] + at(b)[0] + at(c)[0]) / 3, (at(a)[1] + at(b)[1] + at(c)[1]) / 3, outline);
  })
  .map((t) => {
    const at = (i) => (i < outline.length ? outline[i] : backs[i - outline.length]);
    const [a, b, c] = t;
    const turn = (at(b)[0] - at(a)[0]) * (at(c)[1] - at(a)[1]) - (at(b)[1] - at(a)[1]) * (at(c)[0] - at(a)[0]);
    // wound the other way from the front: it is seen from behind
    const wound = turn > 0 ? [a, b, c] : [a, c, b];
    return wound.map((i) => (i < outline.length ? first + i : points.length + i - outline.length));
  });

// --- out: the head 1 tall, centred as the flat cut-out is ----------------------------------
const round = (value) => Math.round(value * 10000) / 10000;
const positions = [];
const uvs = [];
for (const [x, y, z] of points) {
  positions.push(round((x - w / 2) / h), round(0.5 - y / h), round((z - rim) / h));
  uvs.push(round(x / w), round(1 - y / h));
}
for (const [x, y] of backs) {
  const depth = BACK * h * Math.sqrt(1 - (1 - Math.min(1, reach(x, y) / deepest)) ** 2);
  positions.push(round((x - w / 2) / h), round(0.5 - y / h), round(-depth / h));
  // the silhouette point on this ray, a little inside the edge
  const ray = Math.round(((Math.atan2(y - centre[1], x - centre[0]) / (Math.PI * 2) + 1) % 1) * outline.length) % outline.length;
  const [ex, ey] = outline[ray];
  const far = Math.hypot(ex - centre[0], ey - centre[1]) || 1;
  const pull = Math.max(0, far - RIM_INSET) / far;
  uvs.push(round((centre[0] + (ex - centre[0]) * pull) / w), round(1 - (centre[1] + (ey - centre[1]) * pull) / h));
}
writeFileSync(OUT, JSON.stringify({ positions, uvs, indices: [...triangles.flat(), ...backTriangles.flat()] }));
const depths = points.map((p) => (p[2] - rim) / h);
console.log(`${name}: landmarks ${landmarkCount} of ${pts.length}, points ${points.length + backs.length}, triangles ${triangles.length} front + ${backTriangles.length} back, depth 0…${Math.max(...depths).toFixed(3)} of the head's height`);
}

for (const name of FACES) build(name);
