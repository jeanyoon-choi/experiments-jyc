// AI 슬롭 (bubble/9 기호의 파티, user 2026-11-12): the things people picture when they hear "AI slop" — the genre's
// monuments and memes, each as one volume the chosen material covers whole. No faces and no lettering: a kind is
// here only if its silhouette and masses name it, and the wrongness that makes it slop (a sixth finger, sneakers on
// a shark, a cup for a head) is itself a volume.
//
// Every kind is a model (types.ts ModelMake): three.js primitives seen from the front (y up, +z towards the viewer),
// chunky and a little abstracted as bubble/5–8's models are (shapes/models.ts) — no part under ~0.06 of the disc,
// no grilles, hairlines or wire, flat sheets (fins, ears, a boarding pass) domed as pillows so no face is flat.
//
// To add a kind: write a Builder with the kit below and add one line to SLOP (id `slop…`, label, feed, sub, source).
// Nothing else changes; a new subgroup is just a new `sub` string.
//
// What each refers to (checked 2026-11-12):
//   Shrimp Jesus, Facebook 2024 — https://en.wikipedia.org/wiki/AI_slop , https://knowyourmeme.com/memes/events/facebook-ai-slop
//   Pope in a white puffer coat, Midjourney, r/midjourney 2023-03-24 — https://knowyourmeme.com/memes/pope-in-white-puffer-jacket-pope-francis-drip
//   Extra fingers — https://petapixel.com/2023/03/02/why-ai-image-generators-cant-get-hands-right/
//   Italian brainrot (2025): Tralalero Tralala, Bombardiro Crocodilo, Tung Tung Tung Sahur, Ballerina Cappuccina,
//     Lirilì Larilà, Chimpanzini Bananini — https://en.wikipedia.org/wiki/Italian_brainrot ; Frigo Camelo —
//     https://knowyourmeme.com/memes/frigo-camelo ; Boneca Ambalabu — https://knowyourmeme.com/memes/boneca-ambalabu ;
//     La Vaca Saturno Saturnita — https://dic.pixiv.net/a/ItalianBrainrot
//   Will Smith eating spaghetti, ModelScope, r/StableDiffusion 2023-03-23 — https://knowyourmeme.com/memes/ai-will-smith-eating-spaghetti
//   Emotional-support kangaroo with a boarding pass (Veo 3, 2025) — https://tribune.com.pk/story/2549271/viral-ai-generated-kangaroo-video-sparks-confusion-and-raises-concerns-over-deepfake-content
//   Bunnies on a trampoline (2025) — https://petapixel.com/2025/07/31/people-are-falling-for-an-ai-video-of-bunnies-bouncing-on-a-trampoline
//   Glass fruit cutting ASMR (Veo 3, 2025) — https://www.fastcompany.com/91353440/ai-generated-asmr-is-taking-over-tiktok
//   Bigfoot vlogs (Veo 3, from 2025-05-25) — https://knowyourmeme.com/memes/ai-vlogs
//   Glue on pizza, Google AI Overviews 2024-05-22 — https://9to5google.com/2024/06/12/google-ai-overview-mistake-glue-pizza/
//   Slop, Merriam-Webster's word of the year 2025 (earlier: pig slop) — https://www.pbs.org/newshour/nation/merriam-websters-word-of-the-year-for-2025-is-ais-slop
//   The six-legged horse is the generic too-many-limbs failure, not one named image.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { CatalogueGroup, CatalogueKind } from "./types.ts";

type V3 = readonly [number, number, number];
type P2 = readonly [number, number];
type Parts = THREE.BufferGeometry[];
type Builder = (detailed: boolean) => Parts;

const UP = new THREE.Vector3(0, 1, 0);
const NONE: V3 = [0, 0, 0];
const ONE: V3 = [1, 1, 1];

/** A radius along a path from (t, radius) stops, eased between them. */
function profile(stops: readonly P2[]) {
  return (t: number) => {
    if (t <= stops[0]![0]) return stops[0]![1];
    for (let index = 1; index < stops.length; index += 1) {
      const [t1, r1] = stops[index]!;
      if (t > t1) continue;
      const [t0, r0] = stops[index - 1]!;
      const s = (t - t0) / Math.max(1e-6, t1 - t0);
      return r0 + (r1 - r0) * s * s * (3 - 2 * s);
    }
    return stops[stops.length - 1]![1];
  };
}

/** The primitives every kind is built from, at one level of detail. */
function kit(d: boolean) {
  const sphere = (r: number) => new THREE.SphereGeometry(r, d ? 24 : 12, d ? 16 : 8);
  const turned = (g: THREE.BufferGeometry, turn: V3) => {
    if (turn[0]) g.rotateX(turn[0]);
    if (turn[1]) g.rotateY(turn[1]);
    if (turn[2]) g.rotateZ(turn[2]);
    return g;
  };

  /** An ellipsoid: radius, centre, its three scales, then turned about its centre (x, y, z in turn). */
  const ball = (r: number, at: V3, scale: V3 = ONE, turn: V3 = NONE) => turned(sphere(r).scale(...scale), turn).translate(...at);

  /** A rounded limb from one point to another, its radius running from `r0` to `r1`. */
  const limb = (from: V3, to: V3, r0: number, r1 = r0): Parts => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const length = Math.max(1e-4, a.distanceTo(b));
    const shaft = new THREE.CylinderGeometry(r1, r0, length, d ? 18 : 9, 1, true);
    shaft.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()));
    shaft.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return [shaft, sphere(r0).translate(...from), sphere(r1).translate(...to)];
  };

  /** A limb through several points in turn (a jointed arm or leg), its radius running from `r0` to `r1`. */
  const chain = (points: readonly V3[], r0: number, r1 = r0): Parts => {
    const out: Parts = [];
    const last = points.length - 1;
    for (let index = 0; index < last; index += 1) out.push(...limb(points[index]!, points[index + 1]!, r0 + ((r1 - r0) * index) / last, r0 + ((r1 - r0) * (index + 1)) / last));
    return out;
  };

  /** A smooth tube through points (a trunk, a tail, a noodle); `radius` may run along it. `closed` joins its ends. */
  const tube = (path: readonly V3[], radius: number | ((t: number) => number), closed = false): Parts => {
    const curve = new THREE.CatmullRomCurve3(path.map((point) => new THREE.Vector3(...point)), closed, "centripetal");
    const along = (d ? 9 : 4) * path.length;
    const round = d ? 14 : 8;
    const frames = curve.computeFrenetFrames(along, closed);
    const at = typeof radius === "number" ? () => radius : radius;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= along; i += 1) {
      const t = i / along;
      const centre = curve.getPointAt(t);
      const r = at(t);
      const n = frames.normals[i]!;
      const b = frames.binormals[i]!;
      for (let j = 0; j < round; j += 1) {
        const angle = (j / round) * Math.PI * 2;
        const cos = Math.cos(angle) * r;
        const sin = Math.sin(angle) * r;
        positions.push(centre.x + n.x * cos + b.x * sin, centre.y + n.y * cos + b.y * sin, centre.z + n.z * cos + b.z * sin);
      }
    }
    for (let i = 0; i < along; i += 1) {
      for (let j = 0; j < round; j += 1) {
        const a = i * round + j;
        const c = i * round + ((j + 1) % round);
        indices.push(a, a + round, c, c, a + round, c + round);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    if (closed) return [geometry];
    const first = path[0]!;
    const end = path[path.length - 1]!;
    return [geometry, sphere(at(0)).translate(...first), sphere(at(1)).translate(...end)];
  };

  /** A box with rounded edges. */
  const box = (w: number, h: number, depth: number, r: number, at: V3, turn: V3 = NONE) =>
    turned(new RoundedBoxGeometry(w, h, depth, d ? 3 : 1, Math.min(r, w / 2, h / 2, depth / 2) * 0.999), turn).translate(...at);

  /** A body of revolution about y from (radius, y) stops; `smooth` runs a curve through them. */
  const lathe = (stops: readonly P2[], at: V3 = NONE, scale: V3 = ONE, turn: V3 = NONE, smooth = false) => {
    const points = stops.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
    const outline = smooth ? new THREE.SplineCurve(points).getPoints(d ? 28 : 12).map((point) => new THREE.Vector2(Math.max(0, point.x), point.y)) : points;
    return turned(new THREE.LatheGeometry(outline, d ? 32 : 14).scale(...scale), turn).translate(...at);
  };

  const torus = (ring: number, r: number, at: V3, turn: V3 = NONE, scale: V3 = ONE) =>
    turned(new THREE.TorusGeometry(ring, r, d ? 12 : 6, d ? 40 : 16).scale(...scale), turn).translate(...at);

  /**
   * A sheet as a pillow: a flat outline in the xy plane domed to `thick` on both sides (a fin, an ear, a leaf, a
   * ticket), so no face of it is flat. The outline must be seen whole from its middle. `smooth` runs a curve
   * through the points; otherwise its corners stay (the softening rounds them).
   */
  const pillow = (outline: readonly P2[], thick: number, at: V3 = NONE, turn: V3 = NONE, smooth = false) => {
    let rim: P2[];
    if (smooth) {
      const curve = new THREE.CatmullRomCurve3(outline.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, "centripetal");
      rim = curve.getSpacedPoints(d ? 48 : 20).slice(0, -1).map((point) => [point.x, point.y] as const);
    } else {
      rim = [];
      const steps = d ? 8 : 3;
      for (let index = 0; index < outline.length; index += 1) {
        const [ax, ay] = outline[index]!;
        const [bx, by] = outline[(index + 1) % outline.length]!;
        for (let step = 0; step < steps; step += 1) rim.push([ax + ((bx - ax) * step) / steps, ay + ((by - ay) * step) / steps]);
      }
    }
    let cx = 0;
    let cy = 0;
    for (const [x, y] of rim) {
      cx += x / rim.length;
      cy += y / rim.length;
    }
    const rings = d ? 8 : 4;
    const count = rim.length;
    const positions: number[] = [];
    const indices: number[] = [];
    for (const side of [1, -1]) {
      const base = positions.length / 3;
      for (let ring = 0; ring <= rings; ring += 1) {
        const angle = (ring / rings) * (Math.PI / 2);
        const s = Math.cos(angle);
        for (const [x, y] of rim) positions.push(cx + (x - cx) * s, cy + (y - cy) * s, side * thick * Math.sin(angle));
      }
      for (let ring = 0; ring < rings; ring += 1) {
        for (let j = 0; j < count; j += 1) {
          const a = base + ring * count + j;
          const c = base + ring * count + ((j + 1) % count);
          indices.push(a, c, a + count, c, c + count, a + count);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return turned(geometry, turn).translate(...at);
  };

  return { ball, limb, chain, tube, box, lathe, torus, pillow };
}

/** Every part turned about the origin (x, y, z in turn): the view a thing is shown in. */
function shown(parts: Parts, turn: V3) {
  for (const part of parts) {
    if (turn[0]) part.rotateX(turn[0]);
    if (turn[1]) part.rotateY(turn[1]);
    if (turn[2]) part.rotateZ(turn[2]);
  }
  return parts;
}

/** Parts moved (after any turning of their own). */
function moved(parts: Parts, by: V3) {
  for (const part of parts) part.translate(...by);
  return parts;
}

// ── 망가진 해부 ────────────────────────────────────────────────────────────────────────────────────────────────

/** The AI hand: an open palm with a thumb and six fingers, the wrist below. */
const hand: Builder = (d) => {
  const { ball, limb, chain } = kit(d);
  const parts: Parts = [
    ball(0.5, [0, -0.3, 0], [1.02, 0.86, 0.36]),
    // The ball of the thumb, low on the palm; the wrist.
    ball(0.26, [-0.24, -0.46, 0.05], [1, 1.3, 0.5], [0, 0, 0.4]),
    ...limb([0.02, -0.6, -0.02], [0.02, -0.9, -0.02], 0.28, 0.26).map((part) => part.scale(1, 1, 0.5)),
  ];
  const lengths = [0.44, 0.6, 0.7, 0.69, 0.6, 0.42];
  lengths.forEach((length, index) => {
    const u = index / (lengths.length - 1) - 0.5;
    const lean = u * 0.8;
    const x = u * 0.84;
    const y = 0.02 - u * u * 0.4;
    const r = 0.088 - Math.abs(u) * 0.02;
    const reach = (s: number): V3 => [x + Math.sin(lean) * length * s, y + Math.cos(lean) * length * s, 0.03 + 0.05 * Math.sin(s * Math.PI)];
    parts.push(...chain([reach(-0.2), reach(0.42), reach(0.74), reach(1)], r * 1.04, r * 0.88));
    // Knuckles.
    parts.push(ball(r * 1.1, reach(0.42), [1, 1, 0.9]), ball(r, reach(0.74), [1, 1, 0.9]));
  });
  parts.push(...chain([[-0.34, -0.5, 0.06], [-0.68, -0.28, 0.1], [-0.9, 0.0, 0.1]], 0.12, 0.09), ball(0.115, [-0.68, -0.28, 0.1]));
  return parts;
};

/** The horse that came out with six legs: seen from the side, walking left. */
const horse: Builder = (d) => {
  const { ball, limb, chain, tube } = kit(d);
  const parts: Parts = [
    ball(0.33, [0.02, 0.12, 0], [1.6, 0.92, 0.82]),
    ball(0.29, [-0.4, 0.15, 0], [1, 1, 0.86]),
    ball(0.3, [0.44, 0.16, 0], [1, 0.98, 0.86]),
    ...limb([-0.46, 0.24, 0], [-0.74, 0.66, 0], 0.21, 0.13),
    // The head, long and dropping to the muzzle; the ears; the mane as a ridge down the neck.
    ...limb([-0.74, 0.7, 0], [-1.02, 0.42, 0], 0.125, 0.085),
    ball(0.1, [-0.76, 0.72, 0], [1.2, 1.1, 1]),
    ball(0.06, [-0.7, 0.87, 0.06], [0.7, 1.5, 0.7], [0, 0, -0.2]),
    ball(0.06, [-0.63, 0.84, -0.05], [0.7, 1.5, 0.7], [0, 0, -0.45]),
    ...tube([[-0.62, 0.74, 0], [-0.46, 0.58, 0], [-0.3, 0.4, 0]], 0.075),
    ...tube([[0.66, 0.26, 0], [0.86, 0.2, 0], [0.94, -0.08, 0], [0.9, -0.36, 0]], profile([[0, 0.07], [0.5, 0.085], [1, 0.045]])),
  ];
  // Six legs under one belly, each mid-stride.
  const legs: readonly [number, number, number, number][] = [
    [-0.5, -0.1, -0.08, 0.14],
    [-0.3, 0.04, 0.02, -0.1],
    [-0.08, -0.07, -0.02, 0.15],
    [0.14, 0.05, 0.06, -0.1],
    [0.38, 0.08, 0.0, 0.14],
    [0.56, 0.1, 0.16, -0.1],
  ];
  for (const [x, knee, hoof, z] of legs) {
    parts.push(...chain([[x, 0.02, z], [x + knee, -0.38, z], [x + hoof, -0.78, z]], 0.115, 0.06));
    parts.push(ball(0.08, [x + knee, -0.38, z]), ball(0.085, [x + hoof - 0.02, -0.84, z], [1.15, 0.8, 1]));
  }
  return parts;
};

// ── 페이스북 · 바이럴 이미지 ──────────────────────────────────────────────────────────────────────────────────

/** Shrimp Jesus: a haloed, long-haired figure with its arms out, its body a prawn's curling tail. */
const shrimpJesus: Builder = (d) => {
  const { ball, limb, torus, pillow } = kit(d);
  const parts: Parts = [
    torus(0.29, 0.05, [0, 0.72, -0.1]),
    ball(0.15, [0, 0.72, 0.02], [1, 1.15, 1]),
    // Hair to the shoulders and a beard: masses only.
    ball(0.1, [-0.14, 0.6, -0.02], [0.9, 2, 1]),
    ball(0.1, [0.14, 0.6, -0.02], [0.9, 2, 1]),
    ball(0.09, [0, 0.57, 0.08], [1, 1.1, 0.8]),
    ball(0.26, [0, 0.3, 0], [1, 1.1, 0.7]),
  ];
  for (const side of [-1, 1]) {
    // A robed arm held out, its sleeve hanging, an open hand.
    parts.push(...limb([side * 0.16, 0.42, 0], [side * 0.72, 0.47, 0.03], 0.1, 0.16).map((part) => part.scale(1, 1, 0.7)));
    parts.push(ball(0.09, [side * 0.92, 0.48, 0.04], [1.25, 0.9, 0.7]));
  }
  // The abdomen: six shingled plates down a J that curls to the left, then the tail fan.
  const spine: readonly P2[] = [[0.02, 0.02], [0.1, -0.26], [0.08, -0.52], [-0.08, -0.76], [-0.34, -0.88], [-0.6, -0.8]];
  spine.forEach(([x, y], index) => {
    const [nx, ny] = spine[Math.min(spine.length - 1, index + 1)]!;
    const [px, py] = spine[Math.max(0, index - 1)]!;
    const angle = Math.atan2(ny - py, nx - px) + Math.PI / 2;
    const r = 0.27 - index * 0.022;
    parts.push(ball(r, [x, y, 0.02 + index * 0.012], [1, 0.2 / r, 0.78], [0, 0, angle]));
  });
  for (const fan of [-0.7, 0, 0.7]) {
    const angle = 2.65 + fan;
    parts.push(pillow([[0, -0.07], [0.26, -0.11], [0.36, 0], [0.26, 0.11], [0, 0.07]], 0.06, [-0.7, -0.76, 0.1], [0, 0, angle], true));
  }
  // Swimmerets on the hollow of the curl.
  for (const [x, y, to] of [[-0.12, -0.16, 3.3], [-0.1, -0.38, 3.4], [-0.16, -0.58, 3.0]] as const) {
    parts.push(...limb([x, y, 0.04], [x + Math.cos(to) * 0.24, y + Math.sin(to) * 0.24, 0.06], 0.065, 0.05));
  }
  return parts;
};

/** The Pope's white puffer coat (Midjourney, 2023): quilted rolls to the shins, the skullcap, the cross on the chest. */
const pufferPope: Builder = (d) => {
  const { ball, box } = kit(d);
  const parts: Parts = [
    ball(0.17, [0, 0.84, 0], [1, 1.08, 1]),
    ball(0.13, [0, 1.0, -0.02], [1, 0.62, 1]),
    ball(0.25, [0, 0.62, 0], [1, 0.5, 0.85]),
    ball(0.07, [-0.16, -1.0, 0.1], [1.4, 0.9, 1.6]),
    ball(0.07, [0.16, -1.0, 0.1], [1.4, 0.9, 1.6]),
  ];
  // The coat: six fat rolls, widening to the hem.
  for (let roll = 0; roll < 6; roll += 1) {
    const width = 0.38 + roll * 0.022;
    parts.push(ball(width, [0, 0.42 - roll * 0.25, 0], [1, 0.24 / width, 0.62]));
  }
  for (const side of [-1, 1]) {
    // A sleeve of four rolls, the arm a little out from the body, the hand below the cuff.
    for (let roll = 0; roll < 4; roll += 1) {
      const t = roll / 3;
      parts.push(ball(0.18 - t * 0.02, [side * (0.5 + t * 0.16), 0.4 - t * 0.6, 0.02 + t * 0.04], [1, 1.02, 1], [0, 0, side * 0.26]));
    }
    parts.push(ball(0.09, [side * 0.7, -0.4, 0.07], [0.9, 1.2, 0.8]));
  }
  // The pectoral cross, proud of the chest.
  parts.push(box(0.11, 0.4, 0.16, 0.045, [0, 0.14, 0.3]), box(0.3, 0.11, 0.16, 0.045, [0, 0.22, 0.3]));
  return parts;
};

// ── 이탈리안 브레인롯 ──────────────────────────────────────────────────────────────────────────────────────────

/** A chunky trainer, its toe towards −x, the ankle's opening at (0, 0). */
function trainer(d: boolean, at: V3, size = 1): Parts {
  const { ball, box } = kit(d);
  const parts: Parts = [
    box(0.44, 0.1, 0.2, 0.05, [-0.1, -0.17, 0]),
    ball(0.12, [-0.02, -0.06, 0], [1, 1, 0.8]),
    ball(0.13, [-0.17, -0.08, 0], [1.25, 0.72, 0.76]),
    ball(0.09, [-0.26, -0.09, 0], [1.1, 0.75, 1]),
  ];
  for (const part of parts) part.scale(size, size, size).translate(...at);
  return parts;
}

/** Tralalero Tralala: a shark on three legs in trainers, seen from the side. */
const tralalero: Builder = (d) => {
  const { limb, tube, pillow, ball } = kit(d);
  const parts: Parts = [
    ...tube(
      [[-1.02, 0.2, 0], [-0.62, 0.27, 0], [-0.12, 0.3, 0], [0.4, 0.26, 0], [0.8, 0.22, 0]],
      profile([[0, 0.05], [0.12, 0.2], [0.38, 0.35], [0.62, 0.28], [0.86, 0.12], [1, 0.07]]),
    ),
    // The lower jaw under the snout, the dorsal fin, the tail's two lobes, a pectoral fin.
    ball(0.14, [-0.62, 0.06, 0], [1.6, 0.6, 1]),
    pillow([[-0.24, 0.5], [0.1, 1.0], [0.22, 0.94], [0.26, 0.5]], 0.075, [0, 0, 0]),
    pillow([[0.7, 0.26], [1.0, 0.74], [1.1, 0.7], [0.9, 0.18]], 0.06),
    pillow([[0.72, 0.2], [0.98, -0.12], [1.06, -0.04], [0.88, 0.26]], 0.055),
    pillow([[-0.3, 0.12], [-0.12, -0.2], [0.0, -0.18], [-0.04, 0.14]], 0.06, [0, 0, 0.24], [0.5, 0, 0]),
  ];
  for (const [x, z] of [[-0.5, 0.14], [0.08, -0.1], [0.64, 0.14]] as const) {
    parts.push(...limb([x, 0.04, z], [x + 0.02, -0.36, z], 0.11, 0.09), ...trainer(d, [x + 0.04, -0.42, z], 1.15));
  }
  return parts;
};

/** Bombardiro Crocodilo: a twin-prop bomber whose nose is a crocodile's head, seen from above and a little behind. */
const bombardiro: Builder = (d) => {
  const { ball, limb, tube, pillow } = kit(d);
  const flat: V3 = [Math.PI / 2, 0, 0];
  const parts: Parts = [
    ...tube([[-0.2, 0, 0], [0.2, 0.01, 0], [0.64, 0.02, 0], [1.0, 0.04, 0]], profile([[0, 0.21], [0.4, 0.17], [1, 0.07]])),
    // Wings, tailplane and fin.
    pillow([[-0.02, 0], [0.1, 1.0], [0.3, 1.0], [0.46, 0], [0.3, -1.0], [0.1, -1.0]], 0.06, [0, 0.02, 0], flat),
    pillow([[0.72, 0], [0.78, 0.4], [0.94, 0.4], [1.02, 0], [0.94, -0.4], [0.78, -0.4]], 0.045, [0, 0.05, 0], flat),
    pillow([[0.66, 0.04], [0.9, 0.44], [1.04, 0.44], [1.04, 0.04]], 0.05),
  ];
  // The crocodile: the skull with its brows, the long upper jaw lifted and the lower dropped, teeth along both.
  const head: Parts = [ball(0.24, [0, 0, 0], [1.15, 0.85, 1]), ball(0.09, [0.0, 0.17, 0.13]), ball(0.09, [0.0, 0.17, -0.13])];
  const jaw = (lift: number, r0: number, r1: number, teeth: number) => {
    const piece: Parts = [...limb([-0.08, 0, 0], [-0.78, 0, 0], r0, r1).map((part) => part.scale(1, 0.55, 1)), ball(r1 * 1.15, [-0.8, 0, 0], [1, 0.62, 1.1])];
    for (let tooth = 0; tooth < 5; tooth += 1) {
      const x = -0.26 - tooth * 0.125;
      const half = r0 + ((r1 - r0) * (tooth + 1)) / 6;
      for (const side of [-1, 1]) piece.push(ball(0.05, [x, teeth * 0.07, side * half * 0.8], [0.9, 1.3, 0.9]));
    }
    return shown(piece, [0, 0, lift]);
  };
  head.push(...moved(jaw(-0.2, 0.19, 0.13, -1), [0, 0.03, 0]), ...moved(jaw(0.3, 0.16, 0.1, 1), [0, -0.08, 0]));
  parts.push(...moved(head, [-0.42, 0.02, 0]));
  for (const side of [-1, 1]) {
    // An engine under each wing: the nacelle, the spinner, the propeller as one fat blade.
    parts.push(...limb([-0.08, -0.01, side * 0.5], [0.36, 0, side * 0.5], 0.115, 0.075));
    parts.push(ball(0.08, [-0.18, -0.01, side * 0.5], [1.3, 1, 1]));
    parts.push(ball(0.06, [-0.18, -0.01, side * 0.5], [0.7, 0.9, 4]));
  }
  return shown(shown(parts, [0, 0.22, 0]), [0.95, 0, -0.4]);
};

/** Tung Tung Tung Sahur: a wooden log standing on thin legs, a bat in its hand. */
const tungTung: Builder = (d) => {
  const { ball, limb, chain, lathe } = kit(d);
  return [
    lathe([[0, -0.36], [0.2, -0.36], [0.27, -0.3], [0.285, 0.2], [0.27, 0.72], [0.2, 0.8], [0, 0.82]]),
    // Legs and long flat feet.
    ...limb([-0.12, -0.3, 0], [-0.15, -0.84, 0], 0.07, 0.06),
    ...limb([0.12, -0.3, 0], [0.15, -0.84, 0], 0.07, 0.06),
    ball(0.085, [-0.19, -0.9, 0.06], [1.5, 0.75, 1.5]),
    ball(0.085, [0.19, -0.9, 0.06], [1.5, 0.75, 1.5]),
    // The free arm hanging; the other raised, holding the bat by its handle.
    ...chain([[0.26, 0.34, 0.02], [0.44, 0.1, 0.04], [0.46, -0.16, 0.06]], 0.06),
    ball(0.085, [0.47, -0.22, 0.06]),
    ...chain([[-0.26, 0.34, 0.04], [-0.48, 0.14, 0.1], [-0.58, 0.32, 0.14]], 0.06),
    ball(0.09, [-0.6, 0.36, 0.14]),
    ...limb([-0.56, 0.24, 0.16], [-0.84, 1.02, 0.12], 0.05, 0.115),
    ball(0.07, [-0.545, 0.2, 0.16]),
  ];
};

/** Ballerina Cappuccina: a dancer in a tutu on one pointe, her head a cappuccino cup. */
const ballerina: Builder = (d) => {
  const { ball, limb, chain, tube, lathe, torus } = kit(d);
  return [
    // The cup: its tapered body, the rim, the foam, the handle.
    lathe([[0, 0.48], [0.15, 0.48], [0.18, 0.52], [0.26, 0.9], [0.23, 0.94], [0, 0.94]]),
    torus(0.25, 0.04, [0, 0.91, 0], [Math.PI / 2, 0, 0]),
    ball(0.22, [0, 0.93, 0], [1, 0.42, 1]),
    torus(0.11, 0.05, [0.3, 0.7, 0], NONE, [1, 1.15, 1]),
    ...limb([0, 0.38, 0], [0, 0.52, 0], 0.055),
    // The bodice and the tutu, tipped towards the viewer.
    ...limb([0, 0.3, 0], [0, 0.04, 0], 0.135, 0.095).map((part) => part.scale(1, 1, 0.8)),
    ball(0.56, [0, 0.0, 0], [1, 0.13, 0.62], [0.5, 0, 0]),
    // One arm curved up, the other out to the side.
    ...tube([[-0.12, 0.33, 0], [-0.44, 0.38, 0.04], [-0.6, 0.64, 0.06], [-0.52, 0.92, 0.06]], profile([[0, 0.068], [1, 0.05]])),
    ...tube([[0.12, 0.33, 0], [0.42, 0.24, 0.05], [0.76, 0.32, 0.08]], profile([[0, 0.068], [1, 0.05]])),
    // The standing leg on its pointe; the other drawn up, its toe at the knee.
    ...chain([[-0.05, -0.08, 0], [-0.02, -0.5, 0.02], [0, -0.9, 0]], 0.095, 0.055),
    ball(0.058, [0, -0.97, 0], [0.9, 1.7, 1]),
    ...chain([[0.07, -0.08, 0.02], [0.42, -0.34, 0.14], [0.08, -0.52, 0.1]], 0.095, 0.055),
  ];
};

/** Lirilì Larilà: a saguaro standing on two feet in sandals, an elephant's head — ears, trunk, tusks — on top. */
const lirili: Builder = (d) => {
  const { ball, limb, tube, box } = kit(d);
  const parts: Parts = [
    ...limb([0, -0.42, 0], [0, 0.2, 0], 0.25),
    // The saguaro's two arms.
    ...tube([[0.2, -0.12, 0], [0.5, -0.16, 0], [0.6, -0.02, 0], [0.6, 0.2, 0]], 0.105),
    ...tube([[-0.2, -0.26, 0], [-0.48, -0.3, 0], [-0.58, -0.18, 0], [-0.58, 0.02, 0]], 0.095),
    // The head, the ears spread wide, the trunk hanging and curling, the tusks.
    ball(0.25, [0, 0.52, 0.08], [1, 1.05, 0.95]),
    ball(0.25, [-0.4, 0.56, -0.02], [0.84, 1.08, 0.3], [0, 0.3, 0.12]),
    ball(0.25, [0.4, 0.56, -0.02], [0.84, 1.08, 0.3], [0, -0.3, -0.12]),
    ...tube([[0, 0.46, 0.28], [0, 0.24, 0.42], [0.04, 0.04, 0.44], [0.16, -0.04, 0.42], [0.24, 0.06, 0.4]], profile([[0, 0.115], [0.6, 0.085], [1, 0.065]])),
    ...limb([-0.12, 0.36, 0.26], [-0.25, 0.14, 0.4], 0.05, 0.034),
    ...limb([0.12, 0.36, 0.26], [0.25, 0.14, 0.4], 0.05, 0.034),
  ];
  // The saguaro's ribs, down its front.
  for (const angle of [-1.2, -0.6, 0, 0.6, 1.2]) parts.push(...limb([Math.sin(angle) * 0.25, -0.4, Math.cos(angle) * 0.25], [Math.sin(angle) * 0.25, 0.16, Math.cos(angle) * 0.25], 0.09));
  for (const side of [-1, 1]) {
    // A stout leg, the foot, the sandal's thick sole and its strap.
    parts.push(...limb([side * 0.15, -0.5, 0], [side * 0.17, -0.8, 0.02], 0.125, 0.115));
    parts.push(ball(0.13, [side * 0.18, -0.86, 0.12], [1, 0.6, 1.5]));
    parts.push(box(0.32, 0.08, 0.46, 0.04, [side * 0.18, -0.95, 0.12]));
    parts.push(...limb([side * 0.05, -0.84, 0.2], [side * 0.31, -0.84, 0.2], 0.05));
  }
  return shown(parts, [0.28, 0, 0]);
};

/** La Vaca Saturno Saturnita: Saturn with its ring for a body, a cow's head, two human legs. */
const vacaSaturno: Builder = (d) => {
  const { ball, chain, tube, torus } = kit(d);
  const parts: Parts = [
    ball(0.5, [0.06, 0.02, 0]),
    // The ring: a flat band, tipped so its near side crosses the planet.
    ...shown([torus(0.8, 0.1, [0, 0, 0], NONE, [1, 1, 0.42])], [1.22, 0, -0.3]).map((part) => part.translate(0.06, 0.02, 0)),
    // The cow's head, forward of the planet: the muzzle, the horns, the ears.
    ball(0.24, [-0.34, 0.54, 0.36], [1, 1.05, 1]),
    ball(0.19, [-0.38, 0.36, 0.52], [1.2, 0.85, 1]),
    ...tube([[-0.5, 0.7, 0.34], [-0.7, 0.76, 0.34], [-0.76, 0.98, 0.34]], profile([[0, 0.07], [1, 0.04]])),
    ...tube([[-0.18, 0.72, 0.34], [0.02, 0.78, 0.34], [0.08, 1.0, 0.34]], profile([[0, 0.07], [1, 0.04]])),
    ball(0.12, [-0.68, 0.52, 0.3], [1.3, 0.6, 0.45], [0, 0, 0.35]),
    ball(0.12, [0.0, 0.56, 0.3], [1.3, 0.6, 0.45], [0, 0, -0.35]),
  ];
  for (const [x, lean] of [[-0.12, -0.05], [0.28, 0.05]] as const) {
    parts.push(...chain([[x, -0.4, 0.04], [x + lean, -0.68, 0.08], [x + lean * 1.4, -0.94, 0.04]], 0.1, 0.07));
    parts.push(ball(0.085, [x + lean * 1.4 - 0.05, -1.0, 0.1], [1.5, 0.7, 1.3]));
  }
  return parts;
};

/** Boneca Ambalabu: a frog's head on a car tyre that walks on two human legs. */
const boneca: Builder = (d) => {
  const { ball, chain, torus } = kit(d);
  const parts: Parts = [
    torus(0.34, 0.2, [0, -0.08, 0], [0, 0.55, 0]),
    // The frog's head: wide and flat, its two eyes domed on top.
    ball(0.36, [0, 0.52, 0.02], [1, 0.62, 0.8]),
    ball(0.135, [-0.2, 0.74, 0.06]),
    ball(0.135, [0.2, 0.74, 0.06]),
  ];
  // The tyre's tread: blocks round its rim.
  for (let block = 0; block < 12; block += 1) {
    const angle = (block / 12) * Math.PI * 2;
    parts.push(ball(0.075, [Math.cos(angle) * 0.53, Math.sin(angle) * 0.53, 0], [1.1, 1.1, 1.9], [0, 0, angle]).rotateY(0.55).translate(0, -0.08, 0));
  }
  for (const side of [-1, 1]) {
    parts.push(...chain([[side * 0.14, -0.52, 0.02], [side * 0.17, -0.76, 0.06], [side * 0.16, -1.0, 0.02]], 0.095, 0.065));
    parts.push(ball(0.085, [side * 0.16 - 0.05, -1.06, 0.08], [1.5, 0.7, 1.3]));
  }
  return parts;
};

/** Frigo Camelo: a camel whose body is a refrigerator, standing in big boots. */
const frigoCamelo: Builder = (d) => {
  const { ball, limb, tube, box, pillow } = kit(d);
  const door = (w: number, h: number): readonly P2[] => [[-w, -h], [w, -h], [w, h], [-w, h]];
  const parts: Parts = [
    box(0.74, 1.04, 0.56, 0.14, [0.12, 0.12, 0]),
    // Its two doors, cushions proud of the front, and their handles.
    pillow(door(0.3, 0.14), 0.07, [0.12, 0.44, 0.28]),
    pillow(door(0.3, 0.3), 0.08, [0.12, -0.06, 0.28]),
    ...limb([-0.1, 0.38, 0.36], [-0.1, 0.5, 0.36], 0.05),
    ...limb([-0.1, -0.02, 0.37], [-0.1, 0.16, 0.37], 0.05),
    // The camel: the hump, the neck swinging up out of the top, the long head, the ears.
    ball(0.26, [0.2, 0.66, 0], [1, 0.8, 0.8]),
    ...tube([[-0.12, 0.5, 0], [-0.46, 0.6, 0], [-0.54, 0.92, 0], [-0.66, 1.14, 0]], profile([[0, 0.18], [0.5, 0.13], [1, 0.11]])),
    ...limb([-0.6, 1.18, 0], [-1.0, 1.02, 0], 0.14, 0.1),
    ball(0.115, [-1.0, 0.99, 0], [1.1, 0.9, 1]),
    ball(0.06, [-0.52, 1.34, 0.07], [0.8, 1.5, 0.8]),
    ball(0.06, [-0.44, 1.31, -0.07], [0.8, 1.5, 0.8]),
  ];
  for (const [x, z] of [[-0.14, 0.18], [0.38, 0.18], [-0.14, -0.18], [0.38, -0.18]] as const) {
    // A leg, then the boot: its shaft, its foot, its sole.
    parts.push(...limb([x, -0.36, z], [x, -0.62, z], 0.07));
    parts.push(...limb([x, -0.6, z], [x, -0.8, z], 0.1, 0.105));
    parts.push(ball(0.11, [x - 0.1, -0.84, z], [1.45, 0.85, 1]));
    parts.push(box(0.36, 0.08, 0.22, 0.04, [x - 0.07, -0.94, z]));
  }
  return shown(parts, [0.12, -0.5, 0]);
};

/** Chimpanzini Bananini: a chimpanzee's head and ears out of a half-peeled banana. */
const chimpanzini: Builder = (d) => {
  const { ball, limb, tube, pillow } = kit(d);
  const flap: readonly P2[] = [[0, -0.15], [0.3, -0.16], [0.64, 0], [0.3, 0.16], [0, 0.15]];
  return [
    // The banana, unpeeled to its middle: thick at the opening, curving to the stalk.
    ...tube([[0.34, -1.04, 0], [0.2, -0.84, 0], [0.0, -0.44, 0], [0, 0.0, 0]], profile([[0, 0.06], [0.12, 0.1], [0.6, 0.24], [1, 0.25]])),
    // The peel, hanging back in three.
    pillow(flap, 0.07, [-0.18, -0.02, 0.02], [0, 0, Math.PI + 0.7], true),
    pillow(flap, 0.07, [0.18, -0.02, 0.02], [0, 0, -0.7], true),
    pillow(flap, 0.07, [0.02, -0.04, 0.24], [0, 0.45, -Math.PI / 2 + 0.12], true),
    // The chimpanzee where the fruit would be: shoulders in the opening, the skull, the brow, the muzzle, the big ears.
    ball(0.24, [0, 0.08, 0], [1, 0.8, 0.9]),
    ball(0.27, [0, 0.42, 0.02], [1, 1.04, 0.95]),
    ...limb([-0.13, 0.5, 0.23], [0.13, 0.5, 0.23], 0.06),
    ball(0.18, [0, 0.32, 0.21], [1.1, 0.85, 0.85]),
    ball(0.15, [-0.33, 0.46, -0.02], [0.8, 1, 0.45]),
    ball(0.15, [0.33, 0.46, -0.02], [0.8, 1, 0.45]),
  ];
};

// ── 영상 슬롭 ──────────────────────────────────────────────────────────────────────────────────────────────────

/** "Will Smith eating spaghetti" without him: a bowl heaped with noodles, a fork lifting a twirled nest of them. */
const spaghetti: Builder = (d) => {
  const { ball, limb, tube, lathe, box } = kit(d);
  const parts: Parts = [
    lathe([[0, -0.12], [0.36, -0.12], [0.62, 0.0], [0.82, 0.22], [0.86, 0.3], [0.78, 0.3], [0.6, 0.14], [0, 0.1]]),
    ball(0.6, [0, 0.16, 0], [1, 0.36, 1]),
  ];
  // Noodles: fat loops lying over the heap, each tipped its own way.
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let loop = 0; loop < 7; loop += 1) {
    const angle = (loop / 7) * Math.PI * 2 + next();
    const reach = 0.16 + next() * 0.26;
    const cx = Math.cos(angle) * reach;
    const cz = Math.sin(angle) * reach;
    const size = 0.2 + next() * 0.14;
    const tip = next() * Math.PI;
    const path: V3[] = [];
    for (let step = 0; step < 8; step += 1) {
      const a = (step / 8) * Math.PI * 2;
      const x = cx + Math.cos(a) * size;
      const z = cz + Math.sin(a) * size;
      const dome = 0.3 * Math.sqrt(Math.max(0, 1 - (x * x + z * z) / 0.5));
      path.push([x, 0.16 + dome + 0.07 * Math.sin(a * 2 + tip), z]);
    }
    parts.push(...tube(path, 0.075, true));
  }
  // The fork, leaning out of the bowl: along `axis` from the nest of noodles wound on its tines to its handle.
  const nest: V3 = [0.02, 0.92, 0.1];
  const axis: V3 = [0.45, 0.89, -0.06];
  const across: V3 = [0.89, -0.45, 0];
  const on = (s: number, w = 0): V3 => [nest[0] + axis[0] * s + across[0] * w, nest[1] + axis[1] * s + across[1] * w, nest[2] + axis[2] * s];
  parts.push(ball(0.18, nest, [1, 1.1, 1]));
  for (let wrap = 0; wrap < 3; wrap += 1) {
    const path: V3[] = [];
    for (let step = 0; step < 8; step += 1) {
      const a = (step / 8) * Math.PI * 2;
      const y = (wrap - 1) * 0.13 + 0.05 * Math.sin(a + wrap);
      const r = 0.2 * Math.sqrt(Math.max(0.3, 1 - (y / 0.26) ** 2));
      path.push([nest[0] + Math.cos(a) * r, nest[1] + y, nest[2] + Math.sin(a) * r]);
    }
    parts.push(...tube(path, 0.068, true));
  }
  for (const w of [-0.135, -0.045, 0.045, 0.135]) parts.push(...limb(on(0.05, w), on(0.5, w), 0.038));
  parts.push(box(0.36, 0.16, 0.08, 0.05, on(0.56), [0, 0, -0.47]));
  parts.push(...limb(on(0.6), on(0.8), 0.07, 0.05), ...limb(on(0.8), on(1.55), 0.05, 0.085));
  // Strands hanging from the nest back into the bowl.
  parts.push(...tube([[-0.08, 0.8, 0.16], [-0.16, 0.62, 0.2], [-0.1, 0.46, 0.16], [-0.14, 0.34, 0.14]], 0.065));
  parts.push(...tube([[0.1, 0.78, 0.2], [0.16, 0.62, 0.24], [0.1, 0.48, 0.24], [0.16, 0.36, 0.2]], 0.065));
  return shown(parts, [0.7, 0, 0]);
};

/** The emotional-support kangaroo at the gate: upright on its tail, a boarding pass in its paws. */
const kangaroo: Builder = (d) => {
  const { ball, limb, chain, tube, pillow } = kit(d);
  return [
    ball(0.32, [0.14, -0.3, 0], [1, 1.1, 0.8]),
    ...limb([0.12, -0.2, 0], [-0.1, 0.34, 0], 0.27, 0.17).map((part) => part.scale(1, 1, 0.85)),
    ...limb([-0.12, 0.4, 0], [-0.2, 0.68, 0], 0.115, 0.09),
    // The head: the long muzzle, the tall ears.
    ball(0.11, [-0.22, 0.74, 0]),
    ...limb([-0.26, 0.74, 0], [-0.5, 0.64, 0], 0.09, 0.06),
    ball(0.06, [-0.2, 0.96, 0.05], [0.8, 2.5, 0.6], [0, 0, 0.12]),
    ball(0.06, [-0.09, 0.94, -0.05], [0.8, 2.5, 0.6], [0, 0, -0.32]),
    // The tail, heavy at its root, lying out behind.
    ...tube([[0.26, -0.48, 0], [0.6, -0.72, 0], [0.98, -0.84, 0], [1.26, -0.84, 0]], profile([[0, 0.19], [0.5, 0.12], [1, 0.055]])),
    // The hind leg: the great thigh, the shin back to the heel, the long foot.
    ...limb([0.18, -0.28, 0.16], [-0.14, -0.52, 0.18], 0.19, 0.105),
    ...limb([-0.14, -0.52, 0.18], [0.18, -0.8, 0.18], 0.095, 0.065),
    ...limb([0.2, -0.86, 0.18], [-0.4, -0.88, 0.18], 0.065, 0.055),
    // The arm, and the pass held out in the paw.
    ...chain([[-0.12, 0.28, 0.16], [-0.2, 0.04, 0.2], [-0.42, 0.12, 0.24]], 0.075, 0.052),
    ball(0.065, [-0.45, 0.13, 0.24]),
    pillow([[-0.2, -0.1], [0.2, -0.1], [0.2, 0.1], [-0.2, 0.1]], 0.04, [-0.62, 0.22, 0.26], [0, 0.35, 0.3]),
  ];
};

/** A rabbit about the origin, its nose towards −x (or +x with `side` 1). */
function rabbit(d: boolean, at: V3, side: -1 | 1, tilt: number, size = 1.3): Parts {
  const { ball } = kit(d);
  const parts: Parts = [
    ball(0.2, [0.02, 0, 0], [1.15, 0.9, 0.85]),
    ball(0.15, [0.14, -0.03, 0], [1, 1, 0.9]),
    ball(0.125, [-0.2, 0.12, 0]),
    ball(0.06, [-0.18, 0.32, 0.05], [0.85, 2.3, 0.6], [0, 0, -0.25]),
    ball(0.06, [-0.1, 0.3, -0.05], [0.85, 2.3, 0.6], [0, 0, -0.6]),
    ball(0.065, [0.29, 0.06, 0]),
    ball(0.06, [0.14, -0.19, 0.08], [1.8, 0.7, 0.8], [0, 0, 0.3]),
    ball(0.05, [-0.14, -0.16, 0.06], [0.9, 1.5, 0.8]),
  ];
  for (const part of parts) part.scale(-side * size, size, size).rotateZ(tilt).translate(...at);
  return parts;
}

/** Bunnies on a trampoline at night: the round trampoline, three rabbits in the air over it. */
const bunnies: Builder = (d) => {
  const { limb, torus, lathe } = kit(d);
  // The frame's padded ring, the mat sagging to its middle, four legs.
  const base: Parts = [torus(0.74, 0.085, [0, 0, 0], [Math.PI / 2, 0, 0]), lathe([[0, -0.16], [0.3, -0.12], [0.56, -0.04], [0.72, 0]])];
  for (const [x, z] of [[-0.54, 0.44], [0.54, 0.44], [-0.54, -0.44], [0.54, -0.44]] as const) base.push(...limb([x, 0, z], [x * 1.05, -0.34, z * 1.05], 0.065));
  shown(base, [0.68, 0, 0]);
  moved(base, [0, -0.62, 0]);
  return [...base, ...rabbit(d, [-0.52, 0.0, 0.2], 1, 0.25), ...rabbit(d, [0.04, 0.62, 0.1], -1, -0.3), ...rabbit(d, [0.56, -0.04, 0.24], -1, 0.1)];
};

/** Glass-fruit cutting: a strawberry split in two by a big kitchen knife, the halves falling apart. */
const glassFruit: Builder = (d) => {
  const { ball, limb, lathe, pillow } = kit(d);
  const half = (side: number): Parts => {
    const parts: Parts = [lathe([[0, -0.62], [0.16, -0.5], [0.4, -0.12], [0.5, 0.18], [0.44, 0.36], [0.26, 0.45], [0, 0.46]], NONE, [0.78, 1, 0.8], NONE, true)];
    // The calyx: leaves lying on the shoulder.
    for (const leaf of [-0.5, 0.5]) parts.push(pillow([[0, -0.08], [0.2, -0.1], [0.34, 0], [0.2, 0.1], [0, 0.08]], 0.05, [leaf * 0.12, 0.44, 0.1], [0, 0, Math.PI / 2 - leaf * 1.5], true));
    // Seeds, as studs.
    for (const [x, y] of [[-0.1, 0.2], [0.12, 0.12], [-0.02, -0.06], [0.14, -0.2], [-0.08, -0.3]] as const) {
      parts.push(ball(0.045, [x, y, 0.8 * 0.5 * Math.sqrt(Math.max(0.1, 1 - (x / 0.39) ** 2 - ((y - 0.05) / 0.6) ** 2)) - 0.005], [1, 1.3, 0.6]));
    }
    for (const part of parts) part.translate(0, 0.62, 0).rotateZ(-side * 0.3).translate(side * 0.42, -0.9, 0);
    return parts;
  };
  return [
    ...half(1),
    ...half(-1),
    // The knife come down between them: the blade's broad face, its edge curving to the point; the handle.
    pillow([[-0.15, 0.5], [-0.16, -0.5], [0.02, -0.88], [0.15, -0.6], [0.15, 0.5]], 0.05),
    ...limb([0.02, 0.56, 0], [0.02, 1.04, 0], 0.1, 0.11).map((part) => part.scale(1, 1, 0.8)),
  ];
};

/** A Bigfoot vlog: the creature in its famous stride, a phone held out on a selfie stick. */
const bigfoot: Builder = (d) => {
  const { ball, limb, chain, box } = kit(d);
  return [
    // The head with its crest, sunk into the great shoulders; the barrel of the body.
    ball(0.17, [-0.08, 0.74, 0.04], [1, 1.3, 1]),
    ball(0.36, [0, 0.46, 0], [1.15, 0.78, 0.8]),
    ...limb([0, 0.44, 0], [0.04, -0.02, 0], 0.33, 0.27).map((part) => part.scale(1, 1, 0.8)),
    ball(0.28, [0.04, -0.08, 0], [1, 0.9, 0.85]),
    // The stride: the leading leg planted, the trailing one bent with its heel up.
    ...chain([[-0.04, -0.14, 0.08], [-0.24, -0.5, 0.1], [-0.22, -0.88, 0.1]], 0.19, 0.1),
    ball(0.1, [-0.34, -0.96, 0.1], [2, 0.72, 1.1]),
    ...chain([[0.1, -0.14, -0.08], [0.28, -0.5, -0.08], [0.52, -0.8, -0.08]], 0.19, 0.1),
    ball(0.1, [0.57, -0.9, -0.08], [1.1, 1.7, 1.1], [0, 0, -0.5]),
    // The long arm swinging back, its hand at the knee; the other held out with the phone it films itself on.
    ...chain([[0.3, 0.48, -0.1], [0.5, 0.08, -0.1], [0.5, -0.36, -0.08]], 0.14, 0.105),
    ball(0.125, [0.5, -0.46, -0.08], [1, 1.25, 0.9]),
    ...chain([[-0.3, 0.48, 0.14], [-0.62, 0.36, 0.2], [-0.86, 0.66, 0.24]], 0.14, 0.105),
    ball(0.125, [-0.88, 0.7, 0.24]),
    box(0.3, 0.52, 0.1, 0.08, [-0.94, 0.9, 0.3], [0, 0.35, 0.3]),
  ];
};

// ── 슬롭이라는 말 ──────────────────────────────────────────────────────────────────────────────────────────────

/** Slop as the word has it: a pig with its snout in a trough that is running over. */
const trough: Builder = (d) => {
  const { ball, limb, torus, box, pillow } = kit(d);
  const parts: Parts = [
    ball(0.38, [0.26, 0.08, 0], [1.4, 0.98, 0.86]),
    ball(0.27, [-0.36, -0.06, 0.04], [1.05, 1, 0.95]),
    // The snout, blunt; the ear flopped forward; the curl of the tail.
    ...limb([-0.48, -0.14, 0.04], [-0.7, -0.3, 0.04], 0.15, 0.13),
    pillow([[0, 0], [0.22, 0.02], [0.18, -0.22], [0.04, -0.32]], 0.055, [-0.46, 0.22, 0.22], [0, 0, 0.5], true),
    torus(0.09, 0.045, [0.86, 0.22, 0]),
    // The trough, and the slop heaped in it and running down its side.
    box(0.9, 0.3, 0.5, 0.08, [-0.84, -0.5, 0.06]),
    ball(0.3, [-0.98, -0.36, 0.06], [1.15, 0.5, 0.8]),
    ...limb([-1.2, -0.38, 0.3], [-1.22, -0.6, 0.33], 0.09, 0.075),
  ];
  for (const [x, z] of [[-0.12, 0.14], [0.04, -0.12], [0.5, 0.14], [0.64, -0.12]] as const) {
    parts.push(...limb([x, -0.16, z], [x, -0.58, z], 0.11, 0.08));
  }
  return parts;
};

/** "Add glue to the sauce": a slice of pizza, and a glue bottle squeezed out over it. */
const gluePizza: Builder = (d) => {
  const { ball, limb, tube, lathe, pillow, box } = kit(d);
  const slice: Parts = [
    pillow([[0, -0.86], [0.6, 0.42], [-0.6, 0.42]], 0.1),
    // The crust rolled along its top, three pepperoni, a string of cheese off the point.
    ...tube([[-0.62, 0.44, 0.02], [0, 0.52, 0.02], [0.62, 0.44, 0.02]], 0.13),
    ball(0.13, [-0.2, 0.12, 0.09], [1, 1, 0.4]),
    ball(0.12, [0.24, 0.1, 0.09], [1, 1, 0.4]),
    ball(0.11, [-0.02, -0.4, 0.07], [1, 1, 0.4]),
    ...limb([0, -0.8, 0.02], [0.03, -1.0, 0.02], 0.06, 0.045),
  ];
  moved(shown(slice, [0, 0, 0.3]), [-0.3, -0.36, 0]);
  // The bottle, tipped nozzle down over the slice: its flat body, the shoulders, the twist cap.
  const bottle: Parts = [
    box(0.6, 0.7, 0.3, 0.13, [0, 0.35, 0]),
    lathe([[0, 0.6], [0.24, 0.62], [0.13, 0.78], [0.13, 0.86], [0.11, 0.88], [0.05, 1.12], [0, 1.13]], NONE, [1, 1, 0.8]),
  ];
  moved(shown(bottle, [0, 0, 2.3]), [0.82, 1.06, 0.42]);
  return [
    ...slice,
    ...bottle,
    // The glue: a bead from the nozzle, pooling on the slice.
    ...limb([-0.02, 0.3, 0.42], [-0.2, -0.18, 0.2], 0.05, 0.065),
    ball(0.19, [-0.24, -0.26, 0.12], [1.2, 0.8, 0.5], [0, 0, 0.3]),
  ];
};

// ── The group ──────────────────────────────────────────────────────────────────────────────────────────────────

const BODY = "망가진 해부";
const IMAGE = "페이스북 · 바이럴 이미지";
const BRAINROT = "이탈리안 브레인롯";
const VIDEO = "영상 슬롭";
const WORD = "슬롭이라는 말";

type Slop = { readonly id: string; readonly label: string; readonly feed: string; readonly sub: string; readonly build: Builder; readonly fill?: number; readonly source: string };

/** Every kind, in the panels' order. Adding one is one line here and its Builder above. */
const SLOP: readonly Slop[] = [
  { id: "slopHand", label: "손가락 일곱 개", feed: "AI hands", sub: BODY, build: hand, source: "the extra-fingered hand of 2022–23 image generators; https://petapixel.com/2023/03/02/why-ai-image-generators-cant-get-hands-right/" },
  { id: "slopHorse", label: "다리 여섯 개 말", feed: "AI anatomy", sub: BODY, build: horse, source: "the animal generated with too many legs: a generic failure, no single source" },
  { id: "slopShrimpJesus", label: "새우 예수", feed: "Shrimp Jesus", sub: IMAGE, build: shrimpJesus, source: "Shrimp Jesus, Facebook 2024; https://en.wikipedia.org/wiki/AI_slop" },
  { id: "slopPufferPope", label: "패딩 입은 교황", feed: "Balenciaga Pope", sub: IMAGE, build: pufferPope, source: "Pope Francis in a white puffer coat, Midjourney, 2023-03-24; https://knowyourmeme.com/memes/pope-in-white-puffer-jacket-pope-francis-drip" },
  { id: "slopTralalero", label: "트랄랄레로 트랄랄라", feed: "Tralalero Tralala", sub: BRAINROT, build: tralalero, source: "https://en.wikipedia.org/wiki/Italian_brainrot" },
  { id: "slopBombardiro", label: "봄바르디로 크로코딜로", feed: "Bombardiro Crocodilo", sub: BRAINROT, build: bombardiro, source: "https://en.wikipedia.org/wiki/Italian_brainrot" },
  { id: "slopTungTung", label: "퉁 퉁 퉁 사후르", feed: "Tung Tung Tung Sahur", sub: BRAINROT, build: tungTung, source: "https://en.wikipedia.org/wiki/Italian_brainrot" },
  { id: "slopBallerina", label: "발레리나 카푸치나", feed: "Ballerina Cappuccina", sub: BRAINROT, build: ballerina, source: "https://en.wikipedia.org/wiki/Italian_brainrot" },
  { id: "slopLirili", label: "리릴리 라릴라", feed: "Lirili Larila", sub: BRAINROT, build: lirili, source: "https://en.wikipedia.org/wiki/Italian_brainrot" },
  { id: "slopVacaSaturno", label: "라 바카 사투르노 사투르니타", feed: "La Vaca Saturno Saturnita", sub: BRAINROT, build: vacaSaturno, source: "https://dic.pixiv.net/a/ItalianBrainrot" },
  { id: "slopBoneca", label: "보네카 암발라부", feed: "Boneca Ambalabu", sub: BRAINROT, build: boneca, source: "https://knowyourmeme.com/memes/boneca-ambalabu" },
  { id: "slopFrigoCamelo", label: "프리고 카멜로", feed: "Frigo Camelo", sub: BRAINROT, build: frigoCamelo, source: "https://knowyourmeme.com/memes/frigo-camelo" },
  { id: "slopChimpanzini", label: "침판지니 바나니니", feed: "Chimpanzini Bananini", sub: BRAINROT, build: chimpanzini, source: "https://en.wikipedia.org/wiki/Italian_brainrot" },
  { id: "slopSpaghetti", label: "스파게티 (윌 스미스)", feed: "Will Smith spaghetti", sub: VIDEO, build: spaghetti, source: "Will Smith eating spaghetti, ModelScope, 2023-03-23; https://knowyourmeme.com/memes/ai-will-smith-eating-spaghetti" },
  { id: "slopKangaroo", label: "탑승권 든 캥거루", feed: "Emotional support kangaroo", sub: VIDEO, build: kangaroo, source: "the emotional-support kangaroo holding a boarding pass, 2025; https://tribune.com.pk/story/2549271/viral-ai-generated-kangaroo-video-sparks-confusion-and-raises-concerns-over-deepfake-content" },
  { id: "slopBunnies", label: "트램펄린 토끼", feed: "Trampoline bunnies", sub: VIDEO, build: bunnies, source: "bunnies on a trampoline, TikTok 2025; https://petapixel.com/2025/07/31/people-are-falling-for-an-ai-video-of-bunnies-bouncing-on-a-trampoline" },
  { id: "slopGlassFruit", label: "유리 과일 썰기", feed: "Glass fruit ASMR", sub: VIDEO, build: glassFruit, source: "AI glass-fruit cutting ASMR, 2025; https://www.fastcompany.com/91353440/ai-generated-asmr-is-taking-over-tiktok" },
  { id: "slopBigfoot", label: "빅풋 브이로그", feed: "Bigfoot vlog", sub: VIDEO, build: bigfoot, source: "AI Bigfoot vlogs, from 2025-05-25; https://knowyourmeme.com/memes/ai-vlogs" },
  { id: "slopTrough", label: "여물통의 돼지", feed: "Slop", sub: WORD, build: trough, source: "slop as pig feed, the older sense of Merriam-Webster's 2025 word of the year; https://www.pbs.org/newshour/nation/merriam-websters-word-of-the-year-for-2025-is-ais-slop" },
  { id: "slopGluePizza", label: "접착제 피자", feed: "Glue pizza", sub: WORD, build: gluePizza, source: "Google AI Overviews, 2024-05-22; https://9to5google.com/2024/06/12/google-ai-overview-mistake-glue-pizza/" },
];

const kinds: CatalogueKind[] = SLOP.map(({ id, label, feed, sub, build, fill, source }) => ({ id, label, feed, sub, make: { source: "model", parts: build, fill: fill ?? 1.2 }, source }));

const slop: CatalogueGroup = { id: "slop", label: "AI 슬롭", kinds };

export default slop;
