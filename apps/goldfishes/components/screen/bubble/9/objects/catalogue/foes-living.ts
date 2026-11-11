// 금붕어의 천적 — the living ones (foes.ts): birds, mammals, predatory fish and amphibians, aquatic insects, reptiles
// and the parasites and microbes a goldfish dies of. Each is sculpted from lofted masses (foes-kit.ts) in the view
// that names it — a wader, a fish or a mammal in side profile heading +x, an insect, a softshell turtle or a parasite
// from above — its anatomy in real proportion, thin structures (legs, bills, barbels, breathing tubes) made plump.
// Built about z 0 and `fronted`, so the outline meets the raft at height 0 as the balloons do.

import * as THREE from "three";
import { blob, fronted, limb, loft, torus, turned, type Geometry, type Station } from "./foes-kit.ts";

type Builder = () => Geometry[];
type P3 = readonly [number, number, number];

/** The parts and their mirror image across x = 0 (an animal seen from above). */
function pair(parts: Geometry[]): Geometry[] {
  return [...parts, ...parts.map((part) => part.clone().scale(-1, 1, 1))];
}

/** A fin, a feather or a paddle: a flat lens from its root to its tip, `chord` across at its widest. */
function fin(from: P3, to: P3, chord: number, thick = 0.05, tip = 0.4, root = 0.75): Geometry {
  const mid: P3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  return loft([[...from, chord * root, chord * root, thick], [...mid, chord, chord, thick], [...to, chord * tip, chord * tip, thick * 0.8]], { seg: 14, sub: 5 });
}

/** A bent limb through its joints, tapering from r0 to r1. */
function bent(points: readonly P3[], r0: number, r1 = r0, options: { flat?: number } = {}): Geometry {
  const last = points.length - 1;
  return loft(points.map((p, index): Station => {
    const r = r0 + ((r1 - r0) * index) / last;
    return [p[0], p[1], p[2], r, r, options.flat ?? r];
  }), { seg: 12, sub: 5 });
}

/** Segments along a spine: overlapping beads a little proud of the body, so rings read as volume, not lines. */
function beads(stations: readonly Station[], count: number, proud = 1.07, from = 0.04, to = 0.96): Geometry[] {
  const spine = new THREE.CatmullRomCurve3(stations.map((s) => new THREE.Vector3(s[0], s[1], s[2])), false, "centripetal");
  const radii = new THREE.CatmullRomCurve3(stations.map((s) => new THREE.Vector3(s[3], s[4] ?? s[3], s[5] ?? s[3])), false, "catmullrom", 0.5);
  const length = spine.getLength();
  const out: Geometry[] = [];
  for (let index = 0; index < count; index += 1) {
    const at = from + ((to - from) * (index + 0.5)) / count;
    const p = spine.getPoint(at);
    const t = spine.getTangent(at);
    const r = radii.getPoint(at);
    out.push(blob(0, 0, 0, ((length * (to - from)) / count) * 0.62, ((r.x + r.y) / 2) * proud, r.z * proud).rotateZ(Math.atan2(t.y, t.x)).translate(p.x, p.y, p.z));
  }
  return out;
}

// ── 새 ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A wader's leg from its hip: the shank, the backward ankle, the tarsus and three toes forward, one back. */
function waderLeg(hip: readonly [number, number], ankle: readonly [number, number], foot: readonly [number, number], z: number, r = 0.05): Geometry[] {
  return [
    limb([hip[0], hip[1], z], [ankle[0], ankle[1], z], r * 1.2, r),
    blob(ankle[0], ankle[1], z, r * 1.35),
    limb([ankle[0], ankle[1], z], [foot[0], foot[1], z], r, r * 0.95),
    limb([foot[0], foot[1], z], [foot[0] + 0.27, foot[1] - 0.03, z], r, r * 0.7),
    limb([foot[0], foot[1], z], [foot[0] + 0.2, foot[1] - 0.05, z + 0.08], r, r * 0.7),
    limb([foot[0], foot[1], z], [foot[0] - 0.15, foot[1] - 0.035, z], r, r * 0.7),
  ];
}

/** 왜가리 (Ardea cinerea), standing: the S-neck drawn back on the shoulders, dagger bill, crest plumes, stilt legs. */
const heron: Builder = () =>
  fronted([
    // Body: an egg tilted up to the chest.
    loft([[-0.52, -0.22, 0, 0.06], [-0.3, -0.11, 0, 0.2, 0.17, 0.18], [0, 0.03, 0, 0.29, 0.26, 0.27], [0.22, 0.18, 0, 0.21, 0.22, 0.21], [0.32, 0.3, 0, 0.12]]),
    // Tail, short and square under the wing tips.
    loft([[-0.42, -0.2, 0, 0.1, 0.08, 0.07], [-0.74, -0.42, 0, 0.065, 0.06, 0.05]], { sub: 3 }),
    // The folded wing on the flank, its primaries drooping past the tail.
    loft([[0.17, 0.17, 0.2, 0.11, 0.12, 0.1], [-0.12, 0.03, 0.25, 0.17, 0.19, 0.12], [-0.42, -0.15, 0.2, 0.11, 0.14, 0.09], [-0.7, -0.35, 0.12, 0.05, 0.06, 0.05]]),
    // Long scapular plumes over the wing.
    loft([[0.06, 0.2, 0.3, 0.06, 0.06, 0.05], [-0.25, 0.1, 0.33, 0.055, 0.055, 0.045], [-0.52, -0.08, 0.27, 0.03]], { seg: 12 }),
    // The neck: forward at the base, back, then up — the S a heron rests in.
    loft([[0.25, 0.25, 0, 0.14, 0.15, 0.14], [0.47, 0.47, 0.02, 0.11, 0.115, 0.11], [0.45, 0.76, 0.03, 0.09], [0.27, 0.95, 0.03, 0.08], [0.2, 1.16, 0.03, 0.078], [0.3, 1.34, 0.03, 0.09]], { sub: 8 }),
    // Breast plumes hanging from the neck's base.
    loft([[0.43, 0.42, 0.1, 0.06], [0.45, 0.2, 0.13, 0.055], [0.38, 0.0, 0.12, 0.028]], { seg: 12 }),
    // Head and dagger bill.
    blob(0.37, 1.39, 0.03, 0.17, 0.115, 0.11, -0.12),
    loft([[0.46, 1.385, 0.03, 0.082, 0.08, 0.075], [0.75, 1.345, 0.03, 0.055, 0.052, 0.05], [1.06, 1.295, 0.03, 0.016]], { cap: [0, 1] }),
    blob(0.42, 1.42, 0.12, 0.04),
    // Crest: two long plumes from the nape.
    loft([[0.3, 1.46, 0.06, 0.05], [0.08, 1.42, 0.06, 0.042], [-0.16, 1.24, 0.06, 0.024]], { seg: 10 }),
    loft([[0.26, 1.4, 0.02, 0.045], [0.06, 1.3, 0.02, 0.038], [-0.08, 1.1, 0.02, 0.022]], { seg: 10 }),
    // Legs: the feathered thighs, then stilts.
    blob(0.0, -0.2, 0.1, 0.12, 0.17, 0.12, 0.2),
    blob(-0.14, -0.2, 0.0, 0.12, 0.16, 0.12, 0.1),
    ...waderLeg([0.02, -0.28], [0.11, -0.6], [0.04, -0.98], 0.11, 0.058),
    ...waderLeg([-0.14, -0.28], [-0.1, -0.62], [-0.22, -0.98], 0.01, 0.058),
  ]);

/** 백로 (Ardea alba), stalking: the neck reaching out and down to strike, one leg lifted, breeding aigrettes over the tail. */
const egret: Builder = () =>
  fronted([
    loft([[-0.56, 0.08, 0, 0.07], [-0.34, 0.1, 0, 0.21, 0.19, 0.19], [-0.04, 0.12, 0, 0.29, 0.28, 0.27], [0.2, 0.17, 0, 0.23, 0.24, 0.22], [0.33, 0.24, 0, 0.14]]),
    loft([[0.12, 0.2, 0.2, 0.11, 0.12, 0.1], [-0.16, 0.16, 0.25, 0.17, 0.19, 0.12], [-0.46, 0.08, 0.2, 0.11, 0.13, 0.09], [-0.76, -0.02, 0.1, 0.06]]),
    // Aigrettes: long loose plumes off the back, falling past the tail.
    loft([[-0.2, 0.36, 0.2, 0.07], [-0.62, 0.26, 0.17, 0.065], [-1.0, -0.04, 0.1, 0.035]], { seg: 10 }),
    loft([[-0.25, 0.26, 0.32, 0.065], [-0.64, 0.06, 0.26, 0.06], [-0.92, -0.3, 0.14, 0.032]], { seg: 10 }),
    // The neck thrown forward in its kink, the head low over the water.
    loft([[0.27, 0.22, 0, 0.15, 0.16, 0.15], [0.52, 0.43, 0.02, 0.12], [0.78, 0.58, 0.03, 0.1], [1.0, 0.52, 0.03, 0.092], [1.1, 0.32, 0.03, 0.092], [1.17, 0.17, 0.03, 0.1]], { sub: 8 }),
    blob(1.21, 0.1, 0.03, 0.18, 0.125, 0.12, -0.75),
    loft([[1.27, 0.03, 0.03, 0.09, 0.088, 0.08], [1.46, -0.2, 0.03, 0.062, 0.06, 0.056], [1.64, -0.44, 0.03, 0.02]], { cap: [0, 1] }),
    blob(1.27, 0.13, 0.14, 0.045),
    blob(-0.02, -0.08, 0.1, 0.13, 0.17, 0.13, 0.15),
    blob(-0.16, -0.06, 0.0, 0.13, 0.16, 0.13, -0.3),
    // The standing leg, and the other lifted with its toes hanging.
    ...waderLeg([0.0, -0.16], [0.08, -0.5], [0.02, -0.9], 0.11, 0.062),
    limb([-0.16, -0.14, 0.01], [0.06, -0.38, 0.01], 0.072, 0.062),
    blob(0.06, -0.38, 0.01, 0.08),
    limb([0.06, -0.38, 0.01], [-0.2, -0.62, 0.01], 0.062, 0.056),
    limb([-0.2, -0.62, 0.01], [-0.08, -0.82, 0.01], 0.056, 0.038),
    limb([-0.2, -0.62, 0.01], [-0.36, -0.78, 0.01], 0.056, 0.038),
  ]);

/** 민물가마우지 (Phalacrocorax carbo), drying its wings: upright, both wings hung open, the snake neck and hooked bill in profile. */
const cormorant: Builder = () => {
  const wing = (): Geometry[] => {
    const parts: Geometry[] = [bent([[0.2, 0.3, 0.1], [0.62, 0.52, 0.12], [1.0, 0.3, 0.1]], 0.1, 0.07)];
    // Flight feathers hanging from the arm, longest at the wrist.
    for (let index = 0; index < 7; index += 1) {
      const t = index / 6;
      const root: P3 = t < 0.5 ? [0.22 + t * 0.8, 0.3 + t * 0.42, 0.05] : [0.62 + (t - 0.5) * 0.76, 0.52 - (t - 0.5) * 0.44, 0.05];
      const drop = 0.42 + 0.3 * Math.sin(t * Math.PI) + 0.14 * t;
      parts.push(fin(root, [root[0] + 0.05 + t * 0.22, root[1] - drop, 0.03], 0.085, 0.06, 0.55));
    }
    return parts;
  };
  return fronted([
    loft([[0, -0.68, 0, 0.12], [0, -0.35, 0, 0.25, 0.25, 0.24], [0, 0.02, 0, 0.28, 0.28, 0.27], [0, 0.34, 0, 0.2, 0.2, 0.2]]),
    ...pair(wing()),
    // Tail: a stiff wedge.
    fin([0, -0.62, 0], [0, -1.08, 0], 0.15, 0.06, 0.75),
    // Webbed feet either side of it.
    ...pair([fin([0.12, -0.66, 0.1], [0.3, -0.9, 0.1], 0.1, 0.06, 0.9)]),
    // Neck, head, the bill hooked at its tip, the throat pouch.
    loft([[0, 0.36, 0.05, 0.14], [0.07, 0.62, 0.08, 0.105], [-0.03, 0.86, 0.08, 0.09], [0.08, 1.04, 0.08, 0.095]], { sub: 8 }),
    blob(0.17, 1.09, 0.08, 0.17, 0.105, 0.1, 0.18),
    loft([[0.28, 1.1, 0.08, 0.06, 0.07, 0.06], [0.52, 1.15, 0.08, 0.045], [0.66, 1.15, 0.08, 0.04], [0.7, 1.06, 0.08, 0.025]], { seg: 12 }),
    blob(0.26, 1.03, 0.08, 0.08, 0.06, 0.06),
    blob(0.22, 1.13, 0.17, 0.038),
  ]);
};

/** 물총새 (Alcedo atthis) on its perch: a head too big for it, a dagger bill longer than the head, stub tail, tiny feet. */
const kingfisher: Builder = () =>
  fronted([
    // The perch.
    loft([[-0.95, -0.72, 0, 0.07], [-0.3, -0.62, 0, 0.075], [0.4, -0.6, 0, 0.07], [0.95, -0.5, 0, 0.055]]),
    // Body, upright and compact.
    loft([[-0.3, -0.45, 0.05, 0.12], [-0.17, -0.25, 0.05, 0.27, 0.24, 0.26], [0.0, 0.05, 0.05, 0.33, 0.31, 0.32], [0.1, 0.3, 0.05, 0.27]]),
    // Stub tail.
    fin([-0.26, -0.4, 0.05], [-0.48, -0.82, 0.05], 0.1, 0.07, 0.8),
    // Folded wing.
    loft([[0.08, 0.16, 0.3, 0.12, 0.13, 0.1], [-0.1, -0.1, 0.36, 0.17, 0.19, 0.12], [-0.3, -0.44, 0.26, 0.07, 0.08, 0.07]]),
    // Head, bill, eye.
    blob(0.17, 0.45, 0.08, 0.3, 0.26, 0.28, 0.1),
    loft([[0.36, 0.45, 0.08, 0.11, 0.1, 0.1], [0.75, 0.42, 0.08, 0.075, 0.07, 0.07], [1.18, 0.37, 0.08, 0.02]], { cap: [0, 1] }),
    blob(0.27, 0.52, 0.31, 0.055),
    // Feet on the perch.
    blob(0.05, -0.55, 0.14, 0.09, 0.06, 0.08),
    blob(-0.12, -0.56, 0.1, 0.09, 0.06, 0.08),
  ]);

/** 펠리컨 (Pelecanus), standing: the bill as long as its body with the pouch slung under it, neck folded back. */
const pelican: Builder = () =>
  fronted([
    loft([[-0.78, -0.16, 0, 0.07], [-0.5, -0.12, 0, 0.26, 0.24, 0.25], [-0.1, -0.02, 0, 0.36, 0.36, 0.34], [0.2, 0.08, 0, 0.3, 0.31, 0.3], [0.36, 0.2, 0, 0.17]]),
    loft([[0.08, 0.12, 0.26, 0.14, 0.15, 0.11], [-0.25, 0.0, 0.32, 0.21, 0.23, 0.13], [-0.6, -0.14, 0.24, 0.13, 0.14, 0.09], [-0.9, -0.22, 0.14, 0.05]]),
    loft([[0.3, 0.18, 0, 0.17], [0.42, 0.5, 0.03, 0.125], [0.3, 0.8, 0.04, 0.11], [0.3, 1.0, 0.04, 0.115]], { sub: 8 }),
    blob(0.34, 1.07, 0.04, 0.19, 0.16, 0.15, -0.2),
    // The bill, hooked, and the pouch under it.
    loft([[0.42, 1.06, 0.04, 0.07, 0.09, 0.08], [0.7, 0.9, 0.04, 0.055, 0.25, 0.1], [0.98, 0.7, 0.04, 0.05, 0.2, 0.09], [1.24, 0.5, 0.04, 0.045, 0.05, 0.05]], { sub: 8 }),
    limb([1.24, 0.5, 0.04], [1.25, 0.4, 0.04], 0.045, 0.03),
    blob(0.42, 1.12, 0.17, 0.04),
    // Short legs, webbed feet.
    limb([-0.02, -0.3, 0.12], [0.02, -0.62, 0.12], 0.09, 0.07),
    fin([0.0, -0.62, 0.12], [0.3, -0.7, 0.12], 0.1, 0.06, 0.95),
    limb([-0.22, -0.3, 0.0], [-0.2, -0.62, 0.0], 0.09, 0.07),
    fin([-0.22, -0.62, 0.0], [0.06, -0.7, 0.0], 0.1, 0.06, 0.95),
  ]);

// ── 포유류 ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** 고양이, sitting at the water's edge with one paw lifted to hook: a round head, pricked ears, the tail up behind. */
const cat: Builder = () =>
  fronted([
    // Trunk from the rump up to the shoulders, the chest full over the fore legs.
    loft([[-0.25, -0.62, 0, 0.36, 0.36, 0.32], [-0.14, -0.3, 0, 0.36, 0.36, 0.33], [0.02, 0.06, 0, 0.3, 0.3, 0.28], [0.12, 0.32, 0, 0.22]]),
    blob(0.16, -0.12, 0.04, 0.22, 0.36, 0.26, 0.1),
    // Haunch and hind foot.
    blob(-0.12, -0.62, 0.22, 0.34, 0.3, 0.2, 0.2),
    limb([-0.06, -0.9, 0.22], [0.2, -0.92, 0.22], 0.09, 0.085),
    // The standing fore leg.
    limb([0.26, -0.1, 0.18], [0.3, -0.84, 0.18], 0.12, 0.09),
    blob(0.36, -0.9, 0.18, 0.13, 0.08, 0.1),
    // The other, lifted, its paw turned down.
    bent([[0.3, 0.1, 0.02], [0.6, 0.0, 0.02], [0.8, 0.2, 0.02]], 0.11, 0.085),
    blob(0.86, 0.18, 0.02, 0.105, 0.125, 0.09, -0.5),
    // Head, short muzzle, ears, eye.
    blob(0.22, 0.62, 0.05, 0.3, 0.27, 0.27),
    blob(0.45, 0.54, 0.1, 0.1, 0.085, 0.1),
    loft([[0.02, 0.8, 0.04, 0.15, 0.15, 0.09], [-0.05, 1.12, 0.04, 0.015]], { cap: [0, 1], sub: 4 }),
    loft([[0.3, 0.84, 0.14, 0.15, 0.15, 0.09], [0.37, 1.15, 0.14, 0.015]], { cap: [0, 1], sub: 4 }),
    blob(0.35, 0.67, 0.26, 0.05),
    // Tail: up and over in a hook.
    loft([[-0.5, -0.8, 0, 0.12], [-0.86, -0.64, 0, 0.11], [-0.98, -0.22, 0, 0.1], [-0.8, 0.1, 0, 0.095], [-0.9, 0.38, 0, 0.085]], { sub: 8 }),
  ]);


/** 수달 (Lutra lutra), standing up to look: a long trunk, short limbs, the flat broad head, the thick tapering tail. */
const otter: Builder = () =>
  fronted([
    loft([[-0.1, -0.7, 0, 0.24, 0.26, 0.25], [-0.02, -0.3, 0, 0.26, 0.28, 0.27], [0.06, 0.15, 0, 0.23, 0.25, 0.24], [0.14, 0.52, 0, 0.19, 0.2, 0.2], [0.2, 0.78, 0, 0.17]]),
    // Tail, thick at the root.
    loft([[-0.2, -0.72, 0, 0.19], [-0.55, -0.92, 0, 0.14], [-0.98, -0.98, 0, 0.085], [-1.3, -0.92, 0, 0.035]], { sub: 8 }),
    // Hind leg and long webbed foot.
    blob(-0.02, -0.72, 0.16, 0.2, 0.24, 0.16),
    loft([[-0.06, -0.97, 0.16, 0.085], [0.2, -1.0, 0.16, 0.09, 0.07, 0.08], [0.42, -1.0, 0.16, 0.06]], { seg: 12 }),
    // Fore legs held at the chest.
    bent([[0.2, 0.42, 0.2], [0.36, 0.22, 0.24], [0.5, 0.26, 0.24]], 0.095, 0.075),
    bent([[0.22, 0.38, 0.0], [0.42, 0.12, 0.0], [0.56, 0.14, 0.0]], 0.095, 0.075),
    // Head: flat-topped, the muzzle broad, small ears set low.
    blob(0.26, 0.92, 0.03, 0.23, 0.18, 0.2, 0.15),
    blob(0.45, 0.9, 0.06, 0.13, 0.115, 0.15, 0.1),
    blob(0.57, 0.94, 0.08, 0.045),
    blob(0.1, 1.02, 0.14, 0.055, 0.06, 0.05),
    blob(0.36, 1.0, 0.2, 0.04),
  ]);

/** 너구리 (Nyctereutes procyonoides), walking: round and low on short legs, the cheek ruffs, small round ears, a short muzzle, a bushy tail hung low. */
const raccoonDog: Builder = () =>
  fronted([
    loft([[-0.62, 0.0, 0, 0.26, 0.28, 0.26], [-0.3, 0.05, 0, 0.34, 0.36, 0.32], [0.12, 0.05, 0, 0.34, 0.36, 0.32], [0.45, 0.08, 0, 0.28, 0.3, 0.28], [0.6, 0.14, 0, 0.22]]),
    loft([[-0.66, 0.1, 0, 0.13], [-0.92, -0.04, 0, 0.2], [-1.06, -0.3, 0, 0.19], [-1.1, -0.52, 0, 0.09]]),
    limb([0.4, -0.16, 0.16], [0.44, -0.56, 0.16], 0.13, 0.095),
    blob(0.5, -0.6, 0.16, 0.12, 0.07, 0.1),
    limb([0.2, -0.16, 0.0], [0.12, -0.56, 0.0], 0.13, 0.095),
    blob(0.18, -0.6, 0.0, 0.12, 0.07, 0.1),
    bent([[-0.46, -0.1, 0.16], [-0.56, -0.36, 0.16], [-0.48, -0.56, 0.16]], 0.15, 0.095),
    blob(-0.42, -0.6, 0.16, 0.12, 0.07, 0.1),
    bent([[-0.26, -0.12, 0.0], [-0.3, -0.36, 0.0], [-0.2, -0.56, 0.0]], 0.14, 0.095),
    blob(-0.14, -0.6, 0.0, 0.12, 0.07, 0.1),
    // Head: the ruff flaring back under the ears, a short pointed muzzle.
    blob(0.76, 0.24, 0.04, 0.27, 0.24, 0.25),
    loft([[0.76, 0.14, 0.2, 0.17], [0.62, 0.0, 0.2, 0.15], [0.46, -0.14, 0.16, 0.05]], { seg: 12 }),
    loft([[0.9, 0.18, 0.06, 0.13, 0.11, 0.13], [1.06, 0.13, 0.06, 0.085, 0.075, 0.09], [1.14, 0.11, 0.06, 0.06]]),
    blob(1.19, 0.12, 0.06, 0.05),
    blob(0.62, 0.47, 0.02, 0.1, 0.11, 0.07),
    blob(0.8, 0.49, 0.14, 0.1, 0.11, 0.07),
    blob(0.92, 0.3, 0.22, 0.042),
  ]);


/** 곰, walking the bank: the shoulder hump, a heavy head and blunt muzzle, round ears, pillar legs and flat feet. */
const bear: Builder = () =>
  fronted([
    loft([[-0.8, 0.0, 0, 0.3, 0.3, 0.3], [-0.4, 0.1, 0, 0.38, 0.38, 0.34], [0.15, 0.22, 0, 0.42, 0.4, 0.36], [0.52, 0.16, 0, 0.33, 0.33, 0.3], [0.72, 0.08, 0, 0.26]]),
    blob(-1.02, 0.1, 0, 0.07),
    blob(0.9, 0.06, 0.04, 0.27, 0.25, 0.25),
    loft([[1.02, 0.0, 0.06, 0.14, 0.12, 0.14], [1.2, -0.06, 0.06, 0.11, 0.1, 0.11]]),
    blob(1.31, -0.05, 0.06, 0.05),
    blob(0.76, 0.31, 0.02, 0.095, 0.095, 0.07),
    blob(0.93, 0.32, 0.16, 0.095, 0.095, 0.07),
    blob(1.02, 0.12, 0.22, 0.038),
    limb([0.45, -0.05, 0.18], [0.52, -0.74, 0.18], 0.18, 0.14),
    blob(0.58, -0.82, 0.18, 0.17, 0.08, 0.13),
    limb([0.2, -0.1, 0.0], [0.0, -0.74, 0.0], 0.18, 0.14),
    blob(0.06, -0.82, 0.0, 0.17, 0.08, 0.13),
    bent([[-0.55, -0.05, 0.18], [-0.72, -0.4, 0.18], [-0.62, -0.74, 0.18]], 0.21, 0.14),
    blob(-0.56, -0.82, 0.18, 0.17, 0.08, 0.13),
    bent([[-0.3, -0.1, 0.0], [-0.2, -0.42, 0.0], [-0.24, -0.74, 0.0]], 0.2, 0.14),
    blob(-0.18, -0.82, 0.0, 0.17, 0.08, 0.13),
  ]);


/** 사람 손, open and reaching down into the water: the broad palm with its two pads, four fingers, the thumb apart. */
const hand: Builder = () => {
  const finger = (root: readonly [number, number], tip: readonly [number, number], r: number): Geometry => {
    const at = (t: number, lift: number): P3 => [root[0] + (tip[0] - root[0]) * t, root[1] + (tip[1] - root[1]) * t, lift];
    return loft([[...at(0, 0.03), r * 1.05], [...at(0.45, 0.06), r * 1.04], [...at(0.75, 0.06), r * 0.98], [...at(1, 0.04), r * 0.9]], { seg: 14 });
  };
  return fronted([
    loft([[0, -1.1, 0, 0.3, 0.3, 0.19], [0, -0.78, 0, 0.32, 0.32, 0.2], [0.0, -0.42, 0, 0.43, 0.43, 0.22], [0.02, -0.05, 0, 0.45, 0.45, 0.2]], { cap: [0.6, 0.3], sq: 2.8 }),
    blob(-0.26, -0.52, 0.0, 0.22, 0.3, 0.26, 0.5),
    finger([-0.32, 0.0], [-0.46, 0.82], 0.115),
    finger([-0.08, 0.04], [-0.1, 0.98], 0.12),
    finger([0.16, 0.02], [0.26, 0.88], 0.115),
    finger([0.38, -0.1], [0.6, 0.56], 0.1),
    loft([[-0.3, -0.55, 0.05, 0.16], [-0.6, -0.3, 0.07, 0.14], [-0.82, -0.02, 0.07, 0.12], [-0.92, 0.2, 0.05, 0.105]], { seg: 14 }),
  ]);
};


// ── 물고기 · 양서류 ─────────────────────────────────────────────────────────────────────────────────────────────

/** A forked tail: two lobes from the peduncle. */
function forkedTail(x: number, y: number, reach: number, spread: number, chord: number): Geometry[] {
  return [fin([x + 0.06, y, 0], [x - reach, y + spread, 0], chord, 0.055, 0.45, 0.9), fin([x + 0.06, y, 0], [x - reach, y - spread, 0], chord, 0.055, 0.45, 0.9), blob(x - reach * 0.3, y, 0, reach * 0.4, spread * 0.5, 0.05)];
}

/** 큰입배스 (Micropterus salmoides): the jaw hinged behind the eye and thrown open, a deep flank, the spiny dorsal
 * notched from the soft one. */
const bass: Builder = () => {
  const parts: Geometry[] = [
    loft([[-0.82, 0.0, 0, 0.11, 0.11, 0.09], [-0.5, 0.01, 0, 0.21, 0.21, 0.16], [-0.05, 0.02, 0, 0.34, 0.35, 0.25], [0.38, 0.0, 0, 0.33, 0.35, 0.26], [0.66, -0.01, 0, 0.26, 0.27, 0.23], [0.82, 0.0, 0, 0.17, 0.16, 0.18]]),
    // Upper jaw and snout; the lower jaw dropped and jutting past it.
    loft([[0.72, 0.07, 0, 0.14, 0.1, 0.17], [0.94, 0.1, 0, 0.09, 0.07, 0.12], [1.1, 0.12, 0, 0.05, 0.045, 0.07]]),
    loft([[0.5, -0.2, 0, 0.1, 0.12, 0.16], [0.82, -0.3, 0, 0.075, 0.08, 0.12], [1.08, -0.3, 0, 0.06, 0.06, 0.08], [1.17, -0.24, 0, 0.045]]),
    // The maxilla, a strap from the snout back past the eye.
    bent([[1.02, 0.06, 0.1], [0.86, -0.06, 0.2], [0.7, -0.2, 0.22]], 0.05, 0.065),
    // Gill cover, eye.
    blob(0.47, -0.02, 0.17, 0.17, 0.27, 0.11, 0.1),
    blob(0.74, 0.12, 0.2, 0.065),
    // Soft dorsal, anal, pelvic, pectoral.
    fin([-0.38, 0.2, 0], [-0.56, 0.5, 0], 0.15, 0.055, 0.75),
    fin([-0.36, -0.2, 0], [-0.54, -0.46, 0], 0.13, 0.055, 0.75),
    fin([0.2, -0.3, 0.04], [0.02, -0.56, 0.04], 0.09, 0.055, 0.6),
    fin([0.36, -0.1, 0.25], [0.1, -0.2, 0.27], 0.1, 0.06, 0.7),
    ...forkedTail(-0.82, 0, 0.42, 0.3, 0.16),
  ];
  // The spiny dorsal: nine spines, each its own lobe, rising then falling to the notch.
  for (let index = 0; index < 9; index += 1) {
    const t = index / 8;
    const x = 0.42 - t * 0.66;
    const tall = 0.1 + 0.16 * Math.sin(Math.PI * (0.15 + 0.75 * t) ** 0.8);
    parts.push(fin([x, 0.28, 0], [x - 0.07, 0.3 + tall, 0], 0.055, 0.05, 0.6, 1));
  }
  return fronted(parts);
};

/** 가물치 (Channa argus): a long round trunk, the dorsal and anal fins running most of it ray by ray, a snake's flat head, a round tail. */
const snakehead: Builder = () => {
  const parts: Geometry[] = [
    loft([[-1.0, 0.0, 0, 0.14, 0.14, 0.12], [-0.55, 0.0, 0, 0.23, 0.23, 0.2], [0.05, 0.0, 0, 0.25, 0.25, 0.24], [0.55, 0.0, 0, 0.23, 0.23, 0.24], [0.86, -0.01, 0, 0.18, 0.17, 0.22], [1.02, -0.02, 0, 0.13, 0.12, 0.18]]),
    // Flat snout over a lower jaw that reaches a little further.
    loft([[0.95, 0.04, 0, 0.1, 0.06, 0.17], [1.18, 0.02, 0, 0.06, 0.045, 0.12]]),
    loft([[0.86, -0.12, 0, 0.065, 0.08, 0.16], [1.1, -0.12, 0, 0.055, 0.06, 0.12], [1.23, -0.1, 0, 0.04]]),
    blob(0.94, 0.07, 0.17, 0.05),
    blob(0.66, -0.01, 0.17, 0.12, 0.17, 0.08, 0.1),
    // Round tail, fan pectoral, small pelvic.
    fin([-0.94, 0, 0], [-1.42, 0, 0], 0.22, 0.06, 0.8, 0.6),
    fin([0.56, -0.08, 0.2], [0.28, -0.16, 0.22], 0.12, 0.06, 0.8),
    fin([0.4, -0.2, 0.03], [0.26, -0.38, 0.03], 0.07, 0.05, 0.6),
  ];
  // Dorsal and anal, long and even, each ray a lobe.
  for (let index = 0; index < 17; index += 1) {
    const x = 0.44 - index * 0.082;
    const y = 0.17 - 0.06 * (index / 16) ** 2;
    parts.push(fin([x, y, 0], [x - 0.2, y + 0.24 + 0.05 * Math.sin((index / 16) * Math.PI), 0], 0.075, 0.05, 0.85, 1));
  }
  for (let index = 0; index < 12; index += 1) {
    const x = 0.0 - index * 0.082;
    const y = -0.18 + 0.07 * (index / 11) ** 2;
    parts.push(fin([x, y, 0], [x - 0.2, y - 0.22, 0], 0.075, 0.05, 0.85, 1));
  }
  return fronted(parts);
};


/** 메기 (Silurus asotus): the broad flat head and wide mouth, long barbels, a tiny dorsal, the anal fin running to the tail. */
const catfish: Builder = () =>
  fronted([
    loft([[-1.12, 0.34, 0, 0.07, 0.07, 0.06], [-0.8, 0.1, 0, 0.11, 0.11, 0.09], [-0.35, -0.05, 0, 0.18, 0.18, 0.15], [0.15, -0.06, 0, 0.25, 0.26, 0.24], [0.6, 0.0, 0, 0.25, 0.25, 0.28], [0.92, 0.03, 0, 0.17, 0.17, 0.25]], { cap: [1, 0.7] }),
    // The lower lip, a wide mouth's shelf.
    loft([[0.72, -0.14, 0.02, 0.06, 0.07, 0.2], [1.02, -0.08, 0.02, 0.05, 0.05, 0.16]]),
    // Anal fin from the vent to the tail; the tail a small round lobe; tiny dorsal; pectoral.
    loft([[-1.16, 0.34, 0, 0.03, 0.11, 0.05], [-0.8, 0.02, 0, 0.03, 0.16, 0.05], [-0.35, -0.2, 0, 0.03, 0.16, 0.05], [0.08, -0.28, 0, 0.03, 0.05, 0.05]], { seg: 14 }),
    fin([-1.1, 0.33, 0], [-1.36, 0.56, 0], 0.11, 0.055, 0.8, 0.7),
    fin([0.3, 0.2, 0], [0.2, 0.42, 0], 0.065, 0.05, 0.6),
    fin([0.52, -0.16, 0.24], [0.3, -0.34, 0.24], 0.1, 0.06, 0.7),
    blob(0.84, 0.13, 0.22, 0.045),
    // Barbels: the two long ones from the upper lip, two short under the chin.
    bent([[0.98, 0.1, 0.16], [1.24, 0.32, 0.16], [1.18, 0.64, 0.12], [0.94, 0.82, 0.08]], 0.05, 0.028),
    bent([[1.02, 0.04, 0.0], [1.32, 0.06, 0.0], [1.5, -0.2, 0.0], [1.46, -0.48, 0.0]], 0.05, 0.028),
    bent([[0.9, -0.14, 0.12], [1.0, -0.4, 0.12], [0.9, -0.56, 0.1]], 0.04, 0.025),
    bent([[0.78, -0.17, 0.0], [0.76, -0.42, 0.0], [0.62, -0.54, 0.0]], 0.04, 0.025),
  ]);

/** 황소개구리 (Lithobates catesbeianus), sitting: eyes standing over the skull, the eardrum bigger than the eye, the
 * hind leg folded in its Z, long toes. */
const bullfrog: Builder = () =>
  fronted([
    loft([[-0.66, -0.36, 0, 0.14, 0.16, 0.2], [-0.32, -0.2, 0, 0.3, 0.3, 0.32], [0.1, 0.0, 0, 0.33, 0.33, 0.34], [0.46, 0.16, 0, 0.24, 0.24, 0.3], [0.76, 0.22, 0, 0.11, 0.12, 0.2]]),
    // Throat.
    blob(0.42, -0.04, 0.04, 0.27, 0.17, 0.24, 0.3),
    // Eyes, the far one behind; eardrum.
    blob(0.3, 0.42, 0.0, 0.12),
    blob(0.44, 0.4, 0.16, 0.125),
    blob(0.2, 0.2, 0.31, 0.1, 0.1, 0.05),
    // Hind leg: thigh forward, shank back, the foot forward again with its toes.
    loft([[-0.45, -0.22, 0.3, 0.2], [-0.15, -0.36, 0.34, 0.17], [0.12, -0.46, 0.34, 0.13]]),
    loft([[0.12, -0.5, 0.3, 0.12], [-0.2, -0.62, 0.3, 0.11], [-0.52, -0.68, 0.28, 0.085]]),
    bent([[-0.52, -0.72, 0.26], [-0.2, -0.82, 0.26], [0.02, -0.84, 0.26]], 0.075, 0.06),
    limb([0.0, -0.84, 0.26], [0.3, -0.78, 0.26], 0.05, 0.04),
    limb([0.0, -0.84, 0.26], [0.32, -0.87, 0.26], 0.05, 0.04),
    limb([0.0, -0.84, 0.26], [0.24, -0.94, 0.26], 0.05, 0.04),
    // Fore leg, the hand turned in.
    bent([[0.4, -0.08, 0.24], [0.5, -0.38, 0.28], [0.44, -0.66, 0.28]], 0.11, 0.075),
    limb([0.44, -0.68, 0.28], [0.64, -0.74, 0.28], 0.05, 0.04),
    limb([0.44, -0.68, 0.28], [0.58, -0.82, 0.28], 0.05, 0.04),
    limb([0.44, -0.68, 0.28], [0.34, -0.8, 0.28], 0.05, 0.04),
  ]);

/** 강꼬치고기 (Esox): a long arrow, the duck-bill jaws, dorsal and anal set far back by the forked tail. */
const pike: Builder = () =>
  fronted([
    loft([[-0.95, 0.0, 0, 0.09, 0.09, 0.08], [-0.55, 0.0, 0, 0.16, 0.16, 0.14], [0.0, 0.0, 0, 0.19, 0.2, 0.19], [0.5, 0.0, 0, 0.18, 0.18, 0.19], [0.78, 0.0, 0, 0.14, 0.13, 0.16]]),
    loft([[0.74, 0.03, 0, 0.11, 0.06, 0.15], [0.98, 0.0, 0, 0.075, 0.045, 0.13], [1.2, -0.03, 0, 0.05, 0.04, 0.1]]),
    loft([[0.7, -0.09, 0, 0.05, 0.075, 0.13], [0.98, -0.12, 0, 0.05, 0.06, 0.11], [1.23, -0.12, 0, 0.04]]),
    blob(0.74, 0.08, 0.16, 0.055),
    blob(0.56, -0.01, 0.16, 0.1, 0.15, 0.07, 0.1),
    fin([-0.52, 0.13, 0], [-0.74, 0.42, 0], 0.13, 0.055, 0.7),
    fin([-0.52, -0.13, 0], [-0.74, -0.42, 0], 0.12, 0.055, 0.7),
    fin([0.0, -0.17, 0.03], [-0.14, -0.4, 0.03], 0.075, 0.05, 0.6),
    fin([0.5, -0.12, 0.18], [0.3, -0.3, 0.18], 0.08, 0.055, 0.6),
    ...forkedTail(-0.95, 0, 0.38, 0.27, 0.12),
  ]);

// ── 수서곤충 · 갑각류 (seen from above, the head up) ───────────────────────────────────────────────────────────

/** 물장군 (Lethocerus deyrollei): a flat leaf of a body, the fore legs thick clasping hooks, the hind legs oars. */
const waterBug: Builder = () =>
  fronted([
    loft([[0, -0.92, 0, 0.06], [0, -0.6, 0, 0.36, 0.36, 0.13], [0, -0.15, 0, 0.5, 0.5, 0.2], [0, 0.3, 0, 0.44, 0.44, 0.2], [0, 0.56, 0, 0.3, 0.3, 0.16]]),
    // The wing cases, a groove between them; the shield between their bases.
    ...pair([blob(0.2, -0.28, 0.1, 0.25, 0.52, 0.13, 0.08)]),
    loft([[0, 0.24, 0.17, 0.2, 0.2, 0.08], [0, -0.08, 0.2, 0.03]], { cap: [0.3, 1], sub: 4 }),
    // Pronotum, head, eyes, the short breathing strap.
    blob(0, 0.44, 0.1, 0.38, 0.18, 0.15),
    blob(0, 0.7, 0.05, 0.17, 0.15, 0.13),
    ...pair([blob(0.15, 0.72, 0.1, 0.085)]),
    limb([0, -0.9, 0], [0, -1.12, 0], 0.05, 0.035),
    ...pair([
      // Raptorial fore leg: a thick femur, the tibia a hook closing on it.
      loft([[0.28, 0.5, 0.05, 0.1], [0.55, 0.72, 0.08, 0.14], [0.8, 0.9, 0.06, 0.1]]),
      bent([[0.8, 0.92, 0.06], [0.78, 1.16, 0.06], [0.52, 1.3, 0.04]], 0.07, 0.03),
      // Middle and hind legs, flattened for swimming.
      bent([[0.42, 0.12, 0.02], [0.92, -0.06, 0.02], [1.08, -0.42, 0.02]], 0.065, 0.045),
      loft([[0.4, -0.2, 0.02, 0.07], [0.82, -0.52, 0.02, 0.09, 0.09, 0.05], [0.92, -0.9, 0.02, 0.075, 0.075, 0.045], [0.84, -1.12, 0.02, 0.035]], { seg: 12 }),
    ]),
  ]);

/** 게아재비 (Ranatra chinensis): a stick with a mantis's fore legs held out ahead and a breathing tube as long as itself. */
const waterStick: Builder = () =>
  fronted([
    loft([[0, -0.5, 0, 0.09], [0, -0.1, 0, 0.125], [0, 0.3, 0, 0.11], [0, 0.6, 0, 0.085]]),
    blob(0, 0.68, 0.02, 0.11, 0.09, 0.1),
    ...pair([
      blob(0.115, 0.7, 0.04, 0.08),
      // Fore leg: the long coxa forward, the femur, the tibia folded back along it.
      bent([[0.06, 0.54, 0.02], [0.26, 0.76, 0.04], [0.5, 1.26, 0.04]], 0.068, 0.082),
      bent([[0.5, 1.28, 0.04], [0.34, 1.1, 0.1], [0.27, 0.92, 0.1]], 0.052, 0.034),
      // Walking legs.
      bent([[0.08, 0.18, 0.02], [0.5, 0.4, 0.04], [0.92, 0.12, 0.02]], 0.062, 0.048),
      bent([[0.08, 0.0, 0.02], [0.5, -0.28, 0.04], [0.78, -0.8, 0.02]], 0.062, 0.048),
    ]),
    limb([0, -0.48, 0], [0, -1.34, 0], 0.062, 0.046),
  ]);


/** 잠자리 유충 (학배기): the wide head and eyes, wing pads on the back, a broad ringed abdomen ending in three spines. */
const dragonflyNymph: Builder = () => {
  const abdomen: Station[] = [[0, 0.36, 0, 0.2, 0.2, 0.16], [0, 0.05, 0, 0.3, 0.3, 0.2], [0, -0.35, 0, 0.29, 0.29, 0.19], [0, -0.7, 0, 0.15, 0.15, 0.12]];
  return fronted([
    loft([[0, -0.82, 0, 0.06], ...abdomen.slice().reverse()]),
    ...beads(abdomen, 8, 1.06, 0.06, 1),
    blob(0, 0.5, 0.02, 0.24, 0.2, 0.2),
    blob(0, 0.76, 0.02, 0.24, 0.15, 0.16),
    ...pair([
      blob(0.2, 0.8, 0.05, 0.12, 0.115, 0.12),
      // Wing pads.
      fin([0.07, 0.46, 0.2], [0.13, 0.02, 0.22], 0.07, 0.06, 0.6),
      fin([0.16, 0.44, 0.16], [0.26, 0.1, 0.18], 0.06, 0.055, 0.6),
      bent([[0.16, 0.62, 0.02], [0.52, 0.86, 0.04], [0.76, 1.14, 0.02]], 0.065, 0.04),
      bent([[0.2, 0.5, 0.02], [0.68, 0.5, 0.04], [1.04, 0.22, 0.02]], 0.065, 0.04),
      bent([[0.2, 0.4, 0.02], [0.68, 0.08, 0.04], [0.98, -0.5, 0.02]], 0.07, 0.04),
      limb([0.07, -0.78, 0], [0.16, -1.04, 0], 0.055, 0.02),
    ]),
    limb([0, -0.8, 0], [0, -1.1, 0], 0.06, 0.02),
  ]);
};

/** 물방개 (Cybister): one smooth streamlined oval, the hind legs long fringed oars. */
const divingBeetle: Builder = () =>
  fronted([
    ...pair([blob(0.05, -0.14, 0, 0.46, 0.76, 0.32)]),
    blob(0, 0.5, 0.02, 0.43, 0.24, 0.26),
    blob(0, 0.76, 0.02, 0.27, 0.16, 0.2),
    ...pair([
      blob(0.22, 0.8, 0.06, 0.08),
      bent([[0.1, 0.88, 0.02], [0.2, 1.06, 0.02], [0.36, 1.16, 0.02]], 0.045, 0.032),
      bent([[0.3, 0.6, 0.0], [0.58, 0.82, 0.0], [0.66, 1.0, 0.0]], 0.06, 0.042),
      bent([[0.44, 0.2, 0.0], [0.84, 0.26, 0.0], [1.02, 0.04, 0.0]], 0.06, 0.042),
      loft([[0.38, -0.25, 0.0, 0.09], [0.88, -0.4, 0.0, 0.13, 0.13, 0.07], [1.1, -0.78, 0.0, 0.12, 0.12, 0.06], [1.08, -1.08, 0.0, 0.05]], { seg: 12 }),
    ]),
  ]);

/** 가재: the two claws held out, the carapace with its rostrum, a ringed tail and its fan. */
const crayfish: Builder = () => {
  const tail: Station[] = [[0, -0.08, 0, 0.25, 0.25, 0.2], [0, -0.45, 0, 0.22, 0.22, 0.18], [0, -0.8, 0, 0.17, 0.17, 0.14]];
  const parts: Geometry[] = [
    loft([[0, -0.1, 0, 0.24, 0.24, 0.22], [0, 0.2, 0, 0.3, 0.3, 0.26], [0, 0.52, 0, 0.23, 0.23, 0.22], [0, 0.72, 0, 0.12, 0.12, 0.12], [0, 0.9, 0, 0.03]]),
    loft(tail),
    ...beads(tail, 5, 1.08, 0.05, 1),
    // The tail fan.
    fin([0, -0.82, 0], [0, -1.12, 0], 0.12, 0.06, 0.9),
    ...pair([
      fin([0.06, -0.82, 0], [0.24, -1.1, 0], 0.11, 0.06, 0.9),
      fin([0.1, -0.8, 0], [0.42, -0.98, 0], 0.1, 0.06, 0.9),
      blob(0.15, 0.72, 0.1, 0.065),
      bent([[0.07, 0.8, 0.1], [0.12, 1.1, 0.1], [0.24, 1.36, 0.08]], 0.04, 0.028),
      // The claw: arm, the swollen hand, the fixed and the moving finger.
      bent([[0.22, 0.46, 0.04], [0.46, 0.6, 0.06], [0.62, 0.84, 0.06]], 0.085, 0.09),
      blob(0.7, 1.02, 0.06, 0.17, 0.25, 0.15, -0.25),
      loft([[0.7, 1.2, 0.06, 0.09], [0.7, 1.42, 0.06, 0.06], [0.76, 1.6, 0.06, 0.025]], { seg: 12 }),
      loft([[0.84, 1.12, 0.06, 0.07], [0.94, 1.36, 0.06, 0.055], [0.86, 1.56, 0.06, 0.022]], { seg: 12 }),
    ]),
  ];
  // Four pairs of walking legs.
  for (let index = 0; index < 4; index += 1) {
    const y = 0.38 - index * 0.15;
    parts.push(...pair([bent([[0.24, y, 0], [0.66, y + 0.06 - index * 0.14, 0.02], [0.96, y - 0.14 - index * 0.2, 0]], 0.055, 0.035)]));
  }
  return fronted(parts);
};

// ── 파충류 ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** 자라 (Pelodiscus sinensis) from above: the flat leathery disc and its soft skirt, the long neck out, the snorkel snout,
 * paddle feet with three claws. */
const softshell: Builder = () => {
  const foot = (x: number, y: number, turn: number): Geometry[] => {
    const parts = [blob(0, 0, 0, 0.17, 0.14, 0.09)];
    for (const [cx, cy] of [[0.15, 0.08], [0.19, 0], [0.15, -0.08]] as const) parts.push(limb([cx, cy, 0], [cx + 0.1, cy * 1.5, 0], 0.045, 0.022));
    return parts.map((part) => part.rotateZ(turn).translate(x, y, 0.02));
  };
  return fronted([
    // The skirt under the shell, then the shell, low and smooth.
    blob(0, -0.1, 0, 0.82, 0.88, 0.1),
    blob(0, -0.08, 0, 0.66, 0.73, 0.3),
    // Neck, head, the snout drawn out to a tube, eyes on top.
    loft([[0, 0.6, 0.02, 0.17], [0.05, 0.84, 0.04, 0.125], [0.0, 1.02, 0.04, 0.115]], { sub: 8 }),
    loft([[0, 0.98, 0.04, 0.13], [0, 1.12, 0.04, 0.19, 0.19, 0.15], [0, 1.3, 0.04, 0.1]], { sub: 5 }),
    limb([0, 1.34, 0.05], [0, 1.6, 0.05], 0.062, 0.046),
    ...pair([
      blob(0.11, 1.18, 0.14, 0.05),
      limb([0.5, 0.42, 0.0], [0.8, 0.66, 0.02], 0.13, 0.11),
      ...foot(0.87, 0.73, 0.75),
      limb([0.5, -0.6, 0.0], [0.78, -0.86, 0.02], 0.13, 0.11),
      ...foot(0.85, -0.93, -0.75),
    ]),
    limb([0, -0.9, 0], [0, -1.12, 0], 0.08, 0.03),
  ]);
};


/** 붉은귀거북 (Trachemys scripta), in profile: the domed shell with its plates swelling, the rim, head up on its neck, clawed feet. */
const turtle: Builder = () => {
  const leg = (x: number, lean: number, z: number): Geometry[] => [
    limb([x, -0.16, z], [x + lean, -0.46, z], 0.14, 0.11),
    blob(x + lean + 0.06, -0.54, z, 0.16, 0.07, 0.11),
    ...[0.12, 0.19, 0.24].map((dx, index) => limb([x + lean + dx, -0.55, z], [x + lean + dx + 0.09, -0.6 + index * 0.02, z], 0.04, 0.022)),
  ];
  return fronted([
    loft([[-0.78, -0.12, 0, 0.08, 0.05, 0.2], [-0.46, -0.06, 0, 0.36, 0.1, 0.36], [0, -0.02, 0, 0.5, 0.14, 0.42], [0.46, -0.05, 0, 0.36, 0.12, 0.36], [0.76, -0.12, 0, 0.1, 0.06, 0.2]]),
    blob(-0.42, 0.06, 0.3, 0.2, 0.17, 0.12), blob(-0.04, 0.12, 0.37, 0.21, 0.19, 0.13), blob(0.36, 0.06, 0.3, 0.2, 0.17, 0.12),
    blob(-0.3, 0.3, 0.17, 0.17, 0.11, 0.1, 0.25), blob(0, 0.4, 0.19, 0.19, 0.11, 0.1), blob(0.3, 0.3, 0.17, 0.17, 0.11, 0.1, -0.25),
    loft([[-0.82, -0.14, 0.06, 0.06], [-0.4, -0.18, 0.3, 0.07], [0, -0.19, 0.36, 0.07], [0.4, -0.18, 0.3, 0.07], [0.8, -0.14, 0.06, 0.06]], { seg: 12 }),
    // Neck and head, the beak blunt.
    loft([[0.62, -0.08, 0.04, 0.13], [0.9, 0.1, 0.06, 0.1], [1.08, 0.26, 0.06, 0.1]]),
    blob(1.2, 0.36, 0.06, 0.2, 0.15, 0.15, 0.5),
    blob(1.25, 0.43, 0.18, 0.045),
    ...leg(0.5, 0.14, 0.16), ...leg(0.26, 0.04, 0.0), ...leg(-0.5, -0.16, 0.16), ...leg(-0.26, -0.02, 0.0),
    limb([-0.78, -0.14, 0.02], [-1.06, -0.3, 0.02], 0.07, 0.025),
  ]);
};


/** 무자치 (물뱀), coiled: the body laid in a spiral, loop on loop, the neck lifted over it, a wedge head, the forked tongue out. */
const snake: Builder = () => {
  const body: Station[] = [];
  const turns = 1.8;
  for (let index = 0; index <= 22; index += 1) {
    const s = index / 22;
    const angle = -2.4 + s * turns * Math.PI * 2;
    const reach = 0.98 - 0.46 * s;
    body.push([Math.cos(angle) * reach, Math.sin(angle) * reach * 0.82 - 0.1, 0.02 + 0.2 * s, 0.035 + 0.1 * Math.min(1, s * 3.5)]);
  }
  // The neck rising out of the coil's middle and over it.
  body.push([0.12, 0.0, 0.3, 0.13], [0.42, 0.26, 0.4, 0.12], [0.7, 0.52, 0.44, 0.11]);
  return fronted([
    loft(body, { sub: 4, seg: 14 }),
    loft([[0.68, 0.5, 0.44, 0.12], [0.86, 0.66, 0.44, 0.21, 0.21, 0.15], [1.08, 0.86, 0.42, 0.1]]),
    blob(0.8, 0.78, 0.56, 0.05), blob(0.98, 0.62, 0.56, 0.05),
    limb([1.08, 0.86, 0.4], [1.2, 0.97, 0.38], 0.038, 0.032),
    limb([1.2, 0.97, 0.38], [1.22, 1.12, 0.38], 0.032, 0.022),
    limb([1.2, 0.97, 0.38], [1.35, 1.0, 0.38], 0.032, 0.022),
  ]);
};


// ── 미생물 · 기생 ───────────────────────────────────────────────────────────────────────────────────────────────

/** 닻벌레 (Lernaea cyprinacea), the female: the anchor of horns that holds in the flesh, the worm trunk, two egg sacs. */
const anchorWorm: Builder = () =>
  fronted([
    loft([[0, 0.92, 0, 0.12], [0, 0.5, 0, 0.115], [0.02, 0.08, 0, 0.16], [0.06, -0.32, 0, 0.21], [0.04, -0.58, 0, 0.16]], { sub: 8 }),
    blob(0, 0.98, 0.03, 0.14),
    ...pair([
      bent([[0.0, 0.92, 0.0], [0.34, 1.06, 0.0], [0.66, 0.9, 0.0]], 0.11, 0.065),
      bent([[0.3, 1.04, 0.02], [0.42, 1.24, 0.02], [0.38, 1.4, 0.02]], 0.085, 0.05),
    ]),
    loft([[0.14, -0.58, 0.02, 0.11], [0.3, -0.92, 0.02, 0.125], [0.28, -1.3, 0.02, 0.105]]),
    loft([[-0.06, -0.58, 0.02, 0.11], [-0.2, -0.92, 0.02, 0.125], [-0.24, -1.3, 0.02, 0.105]]),
  ]);


/** 물이 (Argulus japonicus) from above: the shield in two lobes, the two sucking discs, eyes, the split tail, swimming legs. */
const fishLouse: Builder = () => {
  const parts: Geometry[] = [
    blob(0, 0.36, 0, 0.56, 0.5, 0.18),
    ...pair([blob(0.32, -0.12, 0, 0.44, 0.72, 0.18, 0.16)]),
    // Trunk and split tail.
    loft([[0, 0.25, 0.1, 0.2, 0.2, 0.14], [0, -0.3, 0.1, 0.19, 0.19, 0.14], [0, -0.8, 0.05, 0.15, 0.15, 0.1]]),
    ...pair([
      blob(0.1, -1.02, 0.02, 0.11, 0.2, 0.08, -0.15),
      // Sucker: a ring and its cup's floor.
      torus(0.13, 0.055, 0.27, 0.4, 0.17),
      blob(0.27, 0.4, 0.12, 0.1, 0.1, 0.06),
      blob(0.13, 0.7, 0.14, 0.065),
    ]),
  ];
  for (let index = 0; index < 4; index += 1) parts.push(...pair([limb([0.15, -0.3 - index * 0.14, 0.02], [0.72 - index * 0.1, -0.72 - index * 0.11, 0.0], 0.06, 0.04)]));
  return fronted(parts);
};

/** 백점충 (Ichthyophthirius multifiliis), the feeding stage: a ball in its coat of cilia, the horseshoe nucleus showing. */
const ich: Builder = () => {
  const parts: Geometry[] = [blob(0, 0, 0, 0.86, 0.86, 0.7)];
  // The macronucleus: a horseshoe swelling under the skin.
  parts.push(turned(torus(0.36, 0.14, 0, 0, 0, Math.PI * 1.3), 0, 0, Math.PI * 0.6, [-0.04, 0.04, 0.56]));
  for (let index = 0; index < 60; index += 1) {
    const angle = (index / 60) * Math.PI * 2;
    parts.push(limb([Math.cos(angle) * 0.82, Math.sin(angle) * 0.82, 0.02], [Math.cos(angle + 0.08) * 0.96, Math.sin(angle + 0.08) * 0.96, 0.02], 0.04, 0.032));
  }
  return fronted(parts);
};


/** 금붕어 헤르페스바이러스 (CyHV-2): the enveloped particle, a ball studded with its spikes. */
const virus: Builder = () => {
  const parts: Geometry[] = [blob(0, 0, 0, 0.66)];
  const count = 34;
  for (let index = 0; index < count; index += 1) {
    // A Fibonacci lattice over the half facing the camera and a little past the rim.
    const z = 1 - (index + 0.5) / count * 1.12;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const angle = index * 2.399963;
    const d: P3 = [Math.cos(angle) * r, Math.sin(angle) * r, z];
    parts.push(limb([d[0] * 0.6, d[1] * 0.6, d[2] * 0.6], [d[0] * 0.9, d[1] * 0.9, d[2] * 0.9], 0.055, 0.05));
    parts.push(blob(d[0] * 0.95, d[1] * 0.95, d[2] * 0.95, 0.1));
  }
  return fronted(parts);
};

/** 에로모나스 (Aeromonas hydrophila), the rod that rots fins and ulcerates: a capsule and its one whip. */
const bacterium: Builder = () => {
  const along: readonly [number, number] = [Math.cos(0.62), Math.sin(0.62)];
  const whip: P3[] = [];
  for (let index = 0; index <= 14; index += 1) {
    const s = index / 14;
    const wave = Math.sin(s * Math.PI * 4.6) * (0.06 + 0.12 * s);
    whip.push([-0.02 - along[0] * s * 1.15 - along[1] * wave, 0.0 - along[1] * s * 1.15 + along[0] * wave, 0.02]);
  }
  return fronted([
    loft([[0.0, 0.0, 0, 0.26], [0.32, 0.23, 0, 0.29], [0.66, 0.47, 0, 0.26]], { sub: 4 }),
    loft(whip.map((p, index): Station => [p[0], p[1], p[2], 0.065 - 0.025 * (index / 14)]), { seg: 12, sub: 4 }),
  ]);
};

/** 거머리 (Hirudinea): a ringed strap tapering to the head, the wide sucker at its foot, thrown in a curve. */
const leech: Builder = () => {
  const body: Station[] = [[0.62, -0.98, 0, 0.16, 0.16, 0.12], [0.22, -0.78, 0, 0.24, 0.24, 0.17], [-0.2, -0.32, 0, 0.27, 0.27, 0.2], [-0.12, 0.24, 0, 0.21, 0.21, 0.17], [0.3, 0.6, 0, 0.14, 0.14, 0.12], [0.56, 0.92, 0, 0.09, 0.09, 0.08]];
  return fronted([
    loft(body, { sub: 8 }),
    ...beads(body, 20, 1.06, 0.03, 0.97),
    // The foot sucker: a disc with its rim; the mouth sucker small.
    blob(0.78, -1.06, 0, 0.22, 0.22, 0.07),
    torus(0.19, 0.06, 0.78, -1.06, 0.03),
    blob(0.62, 1.0, 0.02, 0.11, 0.11, 0.08),
  ]);
};

/** 히드라 (Hydra): the foot, the column, the crown of tentacles round its mouth, a bud growing from its side. */
const hydra: Builder = () => {
  const tentacle = (x: number, y: number, angle: number, length: number, r: number, phase: number): Geometry => {
    const points: Station[] = [];
    for (let index = 0; index <= 6; index += 1) {
      const s = index / 6;
      const wave = Math.sin(s * Math.PI * 1.6 + phase) * 0.11 * s;
      points.push([x + Math.sin(angle) * s * length + Math.cos(angle) * wave, y + Math.cos(angle) * s * length - Math.sin(angle) * wave, 0.02, r * (1 - 0.5 * s)]);
    }
    return loft(points, { seg: 12, sub: 4 });
  };
  const parts: Geometry[] = [
    blob(0, -1.08, 0, 0.24, 0.08, 0.14),
    loft([[0, -1.06, 0, 0.1], [0.06, -0.55, 0, 0.13], [-0.04, 0.0, 0, 0.17], [0, 0.3, 0, 0.15]], { sub: 8 }),
    blob(0, 0.4, 0.03, 0.11, 0.13, 0.12),
  ];
  [-1.5, -0.9, -0.32, 0.3, 0.9, 1.5].forEach((angle, index) => parts.push(tentacle(Math.sin(angle) * 0.1, 0.34 + Math.cos(angle) * 0.06, angle, 0.86 - 0.1 * (index % 2), 0.075, index * 1.7)));
  // The bud.
  parts.push(loft([[0.1, -0.3, 0.02, 0.1], [0.34, -0.16, 0.02, 0.1], [0.52, -0.02, 0.02, 0.085]]));
  [0.2, 0.95, 1.7].forEach((angle, index) => parts.push(tentacle(0.54, 0.0, angle, 0.3, 0.05, index)));
  return fronted(parts);
};

export const LIVING = {
  heron, egret, cormorant, kingfisher, pelican,
  cat, otter, raccoonDog, bear, hand,
  bass, snakehead, catfish, bullfrog, pike,
  waterBug, waterStick, dragonflyNymph, divingBeetle, crayfish,
  softshell, turtle, snake,
  anchorWorm, fishLouse, ich, virus, bacterium, leech, hydra,
} satisfies Record<string, Builder>;
