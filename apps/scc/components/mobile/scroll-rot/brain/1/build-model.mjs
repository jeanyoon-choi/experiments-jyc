// Build a compact brain GLB from the MRI STL: weld, centre, smooth normals,
// bake sulcus depth (multi-scale Laplacian cavity) into COLOR_0.R/G.
// usage: node build-brain.mjs in.stl out.glb
import fs from "node:fs";

const [, , src, out] = process.argv;
const TAUBIN = 6;
const CUT_Z = 66; // mm in the STL frame; the cord runs below ~70, the cerebellum starts ~80
const b = fs.readFileSync(src);
const nTri = b.readUInt32LE(80);
const map = new Map();
const pos = [];
const idx = new Uint32Array(nTri * 3);
for (let t = 0; t < nTri; t++) {
  for (let k = 0; k < 3; k++) {
    const o = 84 + 50 * t + 12 + 12 * k;
    const x = b.readFloatLE(o), y = b.readFloatLE(o + 4), z = b.readFloatLE(o + 8);
    const key = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
    let i = map.get(key);
    if (i === undefined) { i = pos.length / 3; map.set(key, i); pos.push(x, y, z); }
    idx[t * 3 + k] = i;
  }
}
// drop degenerate tris
const tris = [];
for (let t = 0; t < nTri; t++) {
  const a = idx[t * 3], c = idx[t * 3 + 1], d = idx[t * 3 + 2];
  if (a !== c && c !== d && a !== d) tris.push(a, c, d);
}
const nV0 = pos.length / 3;
console.log("tris", nTri, "->", tris.length / 3, "verts", nV0);

// Cut the spinal cord below the medulla, as a removed specimen is cut, and cap the section.
{
  const keep = [];
  for (let t = 0; t < tris.length; t += 3) {
    if ([0, 1, 2].some((k) => pos[tris[t + k] * 3 + 2] > CUT_Z)) keep.push(tris[t], tris[t + 1], tris[t + 2]);
  }
  for (const v of keep) if (pos[v * 3 + 2] < CUT_Z) pos[v * 3 + 2] = CUT_Z;
  const edges = new Map();
  for (let t = 0; t < keep.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = keep[t + k], b2 = keep[t + ((k + 1) % 3)];
    const key = a < b2 ? `${a},${b2}` : `${b2},${a}`;
    const e = edges.get(key);
    if (e) e.n++; else edges.set(key, { a, b: b2, n: 1 });
  }
  const open = [...edges.values()].filter((e) => e.n === 1);
  let cx = 0, cy = 0;
  const ring = new Set();
  for (const e of open) { ring.add(e.a); ring.add(e.b); }
  for (const v of ring) { cx += pos[v * 3]; cy += pos[v * 3 + 1]; }
  const centre = pos.length / 3;
  pos.push(cx / ring.size, cy / ring.size, CUT_Z);
  // open edges keep the winding of their triangle (a→b); reversed (b→a→centre) faces outward
  for (const e of open) keep.push(e.b, e.a, centre);
  tris.length = 0;
  for (const v of keep) tris.push(v);
  console.log("cut at", CUT_Z, "open edges", open.length, "tris", tris.length / 3);
}
// drop vertices no longer used
{
  const used = new Int32Array(pos.length / 3).fill(-1);
  const np = [];
  for (let i = 0; i < tris.length; i++) {
    const v = tris[i];
    if (used[v] < 0) { used[v] = np.length / 3; np.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); }
    tris[i] = used[v];
  }
  pos.length = 0;
  for (const v of np) pos.push(v);
}

const nV = pos.length / 3;
// centre on bbox
const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
for (let i = 0; i < nV; i++) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], pos[i * 3 + a]); max[a] = Math.max(max[a], pos[i * 3 + a]); }
const c = min.map((m, a) => (m + max[a]) / 2);
const P = new Float32Array(nV * 3);
for (let i = 0; i < nV; i++) for (let a = 0; a < 3; a++) P[i * 3 + a] = (pos[i * 3 + a] - c[a]) / 1000; // metres
console.log("size mm", max.map((m, a) => (m - min[a]).toFixed(1)));

// Taubin smoothing (λ/μ) removes the MRI voxel crust without shrinking the gyri.
{
  const adj0 = Array.from({ length: nV }, () => new Set());
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b2, d] = [tris[t], tris[t + 1], tris[t + 2]];
    adj0[a].add(b2); adj0[a].add(d); adj0[b2].add(a); adj0[b2].add(d); adj0[d].add(a); adj0[d].add(b2);
  }
  const T = new Float32Array(P.length);
  for (let it = 0; it < 2 * TAUBIN; it++) {
    const f = it % 2 ? -0.53 : 0.5;
    for (let i = 0; i < nV; i++) {
      let x = 0, y = 0, z = 0; const n = adj0[i].size || 1;
      for (const j of adj0[i]) { x += P[j * 3]; y += P[j * 3 + 1]; z += P[j * 3 + 2]; }
      T[i * 3] = P[i * 3] + f * (x / n - P[i * 3]); T[i * 3 + 1] = P[i * 3 + 1] + f * (y / n - P[i * 3 + 1]); T[i * 3 + 2] = P[i * 3 + 2] + f * (z / n - P[i * 3 + 2]);
    }
    P.set(T);
  }
}

// normals (area weighted)
const N = new Float32Array(nV * 3);
for (let t = 0; t < tris.length; t += 3) {
  const [a, b2, d] = [tris[t], tris[t + 1], tris[t + 2]];
  const ux = P[b2 * 3] - P[a * 3], uy = P[b2 * 3 + 1] - P[a * 3 + 1], uz = P[b2 * 3 + 2] - P[a * 3 + 2];
  const vx = P[d * 3] - P[a * 3], vy = P[d * 3 + 1] - P[a * 3 + 1], vz = P[d * 3 + 2] - P[a * 3 + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  for (const v of [a, b2, d]) { N[v * 3] += nx; N[v * 3 + 1] += ny; N[v * 3 + 2] += nz; }
}
for (let i = 0; i < nV; i++) { const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; N[i * 3] /= l; N[i * 3 + 1] /= l; N[i * 3 + 2] /= l; }

// adjacency
const adj = Array.from({ length: nV }, () => new Set());
for (let t = 0; t < tris.length; t += 3) {
  const [a, b2, d] = [tris[t], tris[t + 1], tris[t + 2]];
  adj[a].add(b2); adj[a].add(d); adj[b2].add(a); adj[b2].add(d); adj[d].add(a); adj[d].add(b2);
}
const A = adj.map((s) => Int32Array.from(s));

// cavity at scale: smooth positions k times, measure (smoothed - p)·n. Positive => inside a fold.
function cavity(iters) {
  let S = Float32Array.from(P), T = new Float32Array(P.length);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < nV; i++) {
      const nb = A[i]; let x = 0, y = 0, z = 0;
      for (const j of nb) { x += S[j * 3]; y += S[j * 3 + 1]; z += S[j * 3 + 2]; }
      const n = nb.length || 1;
      T[i * 3] = 0.5 * S[i * 3] + 0.5 * x / n; T[i * 3 + 1] = 0.5 * S[i * 3 + 1] + 0.5 * y / n; T[i * 3 + 2] = 0.5 * S[i * 3 + 2] + 0.5 * z / n;
    }
    [S, T] = [T, S];
  }
  const out = new Float32Array(nV);
  for (let i = 0; i < nV; i++) out[i] = (S[i * 3] - P[i * 3]) * N[i * 3] + (S[i * 3 + 1] - P[i * 3 + 1]) * N[i * 3 + 1] + (S[i * 3 + 2] - P[i * 3 + 2]) * N[i * 3 + 2];
  return out;
}
function normalise(v) {
  const s = Float32Array.from(v).sort();
  const lo = s[Math.floor(s.length * 0.03)], hi = s[Math.floor(s.length * 0.97)];
  return v.map((x) => Math.min(1, Math.max(0, (x - lo) / (hi - lo))));
}
const fine = normalise(cavity(6));
const deep = normalise(cavity(40));
const C = new Uint8Array(nV * 4);
for (let i = 0; i < nV; i++) { C[i * 4] = Math.round(fine[i] * 255); C[i * 4 + 1] = Math.round(deep[i] * 255); C[i * 4 + 3] = 255; }

// quantised normals (KHR_mesh_quantization, int8 normalised, 4-byte aligned stride)
const Nq = new Int8Array(nV * 4);
for (let i = 0; i < nV; i++) for (let a = 0; a < 3; a++) Nq[i * 4 + a] = Math.round(N[i * 3 + a] * 127);
const I = nV < 65536 ? Uint16Array.from(tris) : Uint32Array.from(tris);

// GLB
const views = [];
const chunks = [];
let off = 0;
function push(arr, target, stride) {
  const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  const pad = (4 - (buf.length % 4)) % 4;
  views.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}), ...(stride ? { byteStride: stride } : {}) });
  chunks.push(buf, Buffer.alloc(pad));
  off += buf.length + pad;
  return views.length - 1;
}
const pmin = [1e9, 1e9, 1e9], pmax = [-1e9, -1e9, -1e9];
for (let i = 0; i < nV; i++) for (let a = 0; a < 3; a++) { pmin[a] = Math.min(pmin[a], P[i * 3 + a]); pmax[a] = Math.max(pmax[a], P[i * 3 + a]); }
const vP = push(P, 34962), vN = push(Nq, 34962, 4), vC = push(C, 34962, 4), vI = push(I, 34963);
const gltf = {
  asset: { version: "2.0", generator: "scc brain build", copyright: "Nevit Dilmen, CC BY-SA 3.0 (3D Model of Brain, from MRI)" },
  extensionsUsed: ["KHR_mesh_quantization"],
  extensionsRequired: ["KHR_mesh_quantization"],
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "brain" }],
  meshes: [{ name: "brain", primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3 }] }],
  accessors: [
    { bufferView: vP, componentType: 5126, count: nV, type: "VEC3", min: pmin, max: pmax },
    { bufferView: vN, componentType: 5120, normalized: true, count: nV, type: "VEC3" },
    { bufferView: vC, componentType: 5121, normalized: true, count: nV, type: "VEC4" },
    { bufferView: vI, componentType: I instanceof Uint16Array ? 5123 : 5125, count: I.length, type: "SCALAR" },
  ],
  bufferViews: views,
  buffers: [{ byteLength: off }],
};
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const bin = Buffer.concat(chunks);
const head = Buffer.alloc(12);
head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(out, Buffer.concat([head, jh, json, bh, bin]));
console.log("wrote", out, fs.statSync(out).size);
