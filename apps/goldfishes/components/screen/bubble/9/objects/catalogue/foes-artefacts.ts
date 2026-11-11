// 금붕어의 천적 — the made ones (foes.ts): what people built that a goldfish ends by. Tackle and kitchen, the bowl and
// the bag it is sold in, the drain it is flushed down, and what the water carries now: chlorine, detergent, fuel,
// medicine, plastic, heat. Each is the object's own masses from three.js primitives and lofts (foes-kit.ts), without
// lettering, labels, threads or grilles; round things are shown a little from above so their mouths and lids are seen.

import { blob, box, cylinder, fronted, lathe, limb, loft, plate, posed, torus, turned, type Geometry, type Station } from "./foes-kit.ts";

type Builder = () => Geometry[];
type P3 = readonly [number, number, number];

/** A tube through its points, tapering from r0 to r1. */
function tube(points: readonly P3[], r0: number, r1 = r0, sub = 6): Geometry {
  const last = points.length - 1;
  return loft(points.map((p, index): Station => [p[0], p[1], p[2], r0 + ((r1 - r0) * index) / last]), { seg: 14, sub });
}

/** A lens: a flat, slightly domed blade from root to tip. */
function lens(from: P3, to: P3, chord: number, thick: number, tip = 0.4, root = 0.75): Geometry {
  const mid: P3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  return loft([[...from, chord * root, chord * root, thick], [...mid, chord, chord, thick], [...to, chord * tip, chord * tip, thick * 0.8]], { seg: 14, sub: 5 });
}

// ── 낚시 · 채집 ─────────────────────────────────────────────────────────────────────────────────────────────────

/** 낚싯바늘: the eye, the shank, the bend, the point and its barb. */
const hook: Builder = () =>
  fronted([
    torus(0.15, 0.07, 0.28, 1.12, 0.02),
    tube([[0.28, 0.98, 0], [0.28, 0.1, 0], [0.22, -0.48, 0], [-0.08, -0.86, 0], [-0.5, -0.74, 0], [-0.66, -0.3, 0], [-0.6, 0.14, 0]], 0.1, 0.075, 8),
    loft([[-0.6, 0.14, 0, 0.075], [-0.56, 0.36, 0, 0.02]], { cap: [0, 1], sub: 3, seg: 12 }),
    loft([[-0.6, 0.12, 0, 0.06], [-0.4, -0.16, 0, 0.022]], { cap: [0, 1], sub: 3, seg: 12 }),
  ]);

/** 뜰채: the hoop, the bag of net hanging deep under it, the handle. */
const scoopNet: Builder = () =>
  posed(
    [
      turned(torus(0.56, 0.085), Math.PI / 2),
      // The bag, deep and pointed, its mouth open inside the hoop.
      lathe([[0, -1.25], [0.16, -1.18], [0.36, -0.8], [0.5, -0.36], [0.56, 0], [0.5, 0], [0.44, -0.34], [0.3, -0.76], [0.12, -1.08], [0, -1.12]]),
      limb([-0.56, 0, 0], [-0.8, 0, 0], 0.11, 0.1),
      limb([-0.8, 0, 0], [-1.8, 0, 0], 0.1, 0.11),
    ],
    0.42, 0, 0.42,
  );


/** 작살: a three-pronged fish spear, each prong barbed. */
const trident: Builder = () => {
  const prong = (x: number, top: number): Geometry[] => [
    limb([x, 0.1, 0], [x, top - 0.2, 0], 0.1, 0.095),
    loft([[x, top - 0.36, 0, 0.2, 0.2, 0.11], [x, top - 0.16, 0, 0.13, 0.13, 0.1], [x, top, 0, 0.02]], { cap: [0.4, 1], sub: 4, seg: 12 }),
  ];
  return posed(
    fronted([
      limb([0, -1.15, 0], [0, 0.1, 0], 0.115, 0.115),
      tube([[-0.52, 0.44, 0], [-0.48, 0.14, 0], [0, 0.02, 0], [0.48, 0.14, 0], [0.52, 0.44, 0]], 0.11),
      ...prong(-0.52, 1.0), ...prong(0, 1.24), ...prong(0.52, 1.0),
    ]),
    0, 0, -0.55,
  );
};


/** 낚시찌: the float's swollen body, the antenna that shows above water, the stem and its eye. */
const float: Builder = () =>
  posed(
    fronted([
      loft([[0, -0.6, 0, 0.08], [0, -0.3, 0, 0.34], [0, 0.05, 0, 0.4], [0, 0.42, 0, 0.17], [0, 0.6, 0, 0.1]], { sub: 8 }),
      limb([0, 0.55, 0], [0, 1.15, 0], 0.095, 0.08),
      blob(0, 1.22, 0, 0.13),
      limb([0, -0.55, 0], [0, -0.92, 0], 0.08, 0.075),
      torus(0.12, 0.065, 0, -1.06, 0),
    ]),
    0, 0, -0.5,
  );


/** 루어: a minnow plug with its diving lip, the line eye at the nose, two treble hooks hanging. */
const lure: Builder = () => {
  const treble = (x: number, y: number): Geometry[] => [
    torus(0.075, 0.045, x, y - 0.07, 0),
    limb([x, y - 0.12, 0], [x, y - 0.42, 0], 0.06, 0.06),
    tube([[x, y - 0.4, 0], [x - 0.08, y - 0.64, 0], [x - 0.3, y - 0.62, 0], [x - 0.33, y - 0.36, 0]], 0.06, 0.028, 4),
    tube([[x, y - 0.4, 0], [x + 0.08, y - 0.64, 0], [x + 0.3, y - 0.62, 0], [x + 0.33, y - 0.36, 0]], 0.06, 0.028, 4),
    tube([[x, y - 0.4, 0.02], [x, y - 0.6, 0.12], [x, y - 0.5, 0.24]], 0.06, 0.03, 4),
  ];
  return fronted([
    loft([[-0.9, 0.12, 0, 0.07], [-0.62, 0.1, 0, 0.18, 0.18, 0.15], [-0.1, 0.1, 0, 0.29, 0.3, 0.24], [0.45, 0.1, 0, 0.27, 0.28, 0.24], [0.84, 0.08, 0, 0.14]]),
    lens([-0.85, 0.12, 0], [-1.15, 0.12, 0], 0.24, 0.07, 0.95, 0.5),
    lens([0.68, -0.08, 0.02], [1.1, -0.46, 0.02], 0.15, 0.07, 0.8, 0.9),
    torus(0.085, 0.05, 1.02, 0.1, 0),
    blob(0.62, 0.17, 0.22, 0.08),
    ...treble(0.28, -0.14), ...treble(-0.5, -0.04),
  ]);
};


// ── 집 · 어항 ───────────────────────────────────────────────────────────────────────────────────────────────────

/** 금붕어 어항: the round bowl, flattened a little, its wide mouth and rolled lip, the water standing inside. */
const bowl: Builder = () =>
  posed(
    [
      lathe([[0, -0.72], [0.4, -0.72], [0.5, -0.68], [0.86, -0.4], [0.98, 0], [0.88, 0.36], [0.72, 0.54], [0.68, 0.62], [0.76, 0.72], [0.8, 0.78], [0.72, 0.8], [0.62, 0.66], [0.62, 0.52], [0.36, 0.46], [0, 0.44]]),
    ],
    0.5,
  );


/** 야시장 금붕어 봉지: a bag of water tied off, the knot and the two ears of film above it, the gathers running down from the knot. */
const bag: Builder = () => {
  const parts: Geometry[] = [
    lathe([[0, -0.9], [0.4, -0.86], [0.68, -0.56], [0.74, -0.18], [0.6, 0.2], [0.34, 0.5], [0.15, 0.7], [0.1, 0.8]]),
    blob(0, 0.86, 0, 0.17, 0.13, 0.17),
    lens([-0.02, 0.9, 0], [-0.42, 1.38, 0], 0.17, 0.1, 0.9, 0.5),
    lens([0.04, 0.9, 0.04], [0.36, 1.46, 0.04], 0.16, 0.1, 0.9, 0.5),
  ];
  // Gathers: folds of film pulled to the knot, dying out on the shoulder.
  for (const [x, y, z] of [[-0.4, 0.26, 0.3], [-0.14, 0.2, 0.5], [0.16, 0.2, 0.5], [0.42, 0.26, 0.28]] as const) parts.push(loft([[0, 0.8, 0.1, 0.07], [x * 0.5, (y + 0.8) / 2, z * 0.75, 0.065], [x, y, z, 0.03]], { seg: 12 }));
  return fronted(parts);
};

/** 양변기: the tank and its lid, the bowl on its foot, the seat ring and the cover standing up — where an unwanted fish goes. */
const toilet: Builder = () =>
  posed(
    [
      box(0.46, 0.8, 0.86, 0.09, -0.62, 0.42, 0),
      box(0.54, 0.1, 0.94, 0.045, -0.62, 0.86, 0),
      // The bowl: an egg in plan, narrowing to the foot.
      turned(lathe([[0, -0.92], [0.34, -0.92], [0.36, -0.84], [0.24, -0.5], [0.34, -0.2], [0.5, -0.03], [0.5, 0.02], [0.4, 0.0], [0.2, -0.22], [0, -0.28]]), 0, 0, 0, [0.1, 0, 0], [1.3, 1, 1]),
      turned(torus(0.44, 0.075), Math.PI / 2, 0, 0, [0.1, 0.05, 0], [1.3, 1, 1]),
      // The cover, up against the tank.
      turned(cylinder(0.5, 0.5, 0.09, 0, 0, 0, 40), 0, 0, Math.PI / 2 - 0.12, [-0.3, 0.6, 0], [1, 1.1, 1]),
      // The flush lever.
      limb([-0.4, 0.66, 0.34], [-0.4, 0.66, 0.48], 0.045, 0.05),
    ],
    0.38, -0.62,
  );

/** 수도꼭지 (염소): the flange at the wall, the body, the spout turned down, a T handle, one drop falling. */
const tap: Builder = () =>
  fronted([
    turned(cylinder(0.34, 0.34, 0.14), 0, 0, Math.PI / 2, [-0.98, 0.1, 0]),
    tube([[-0.98, 0.1, 0], [-0.3, 0.1, 0], [0.3, 0.12, 0], [0.62, -0.04, 0], [0.7, -0.42, 0]], 0.19, 0.15, 8),
    turned(torus(0.14, 0.055), Math.PI / 2, 0, 0, [0.7, -0.44, 0]),
    blob(-0.2, 0.12, 0, 0.27, 0.25, 0.25),
    limb([-0.2, 0.3, 0], [-0.2, 0.7, 0], 0.11, 0.09),
    limb([-0.62, 0.78, 0], [0.22, 0.78, 0], 0.095, 0.095),
    blob(-0.2, 0.78, 0.02, 0.13),
    // The drop.
    loft([[0.7, -0.74, 0, 0.02], [0.7, -0.92, 0, 0.09], [0.7, -1.04, 0, 0.12]], { cap: [0, 1], sub: 5 }),
  ]);

/** 락스 · 세제통: the jug with its moulded handle and the hole through it, the offset neck, a ribbed cap. */
const jug: Builder = () =>
  fronted([
    loft([[0, -0.95, 0, 0.52, 0.52, 0.32], [0, -0.35, 0, 0.54, 0.54, 0.34], [0, 0.02, 0, 0.3, 0.52, 0.32], [0.1, 0.36, 0, 0.14, 0.4, 0.27], [0.2, 0.66, 0, 0.14, 0.15, 0.15]], { cap: [0.25, 0.2], sq: 2.6, seg: 22 }),
    tube([[0.04, 0.6, 0], [-0.36, 0.56, 0], [-0.5, 0.26, 0], [-0.46, -0.08, 0]], 0.1, 0.11),
    turned(cylinder(0.19, 0.19, 0.22), 0, 0, 0, [0.21, 0.84, 0]),
    turned(torus(0.19, 0.04), Math.PI / 2, 0, 0, [0.21, 0.74, 0]),
  ]);

/** 분무기: a trigger sprayer — the bottle's shoulders, the collar, the head with its nozzle, the trigger. */
const sprayer: Builder = () =>
  fronted([
    loft([[0, -1.05, 0, 0.42, 0.42, 0.28], [0, -0.45, 0, 0.44, 0.44, 0.3], [0, -0.05, 0, 0.36, 0.34, 0.27], [0.02, 0.25, 0, 0.16, 0.16, 0.16], [0.02, 0.4, 0, 0.14]], { cap: [0.25, 0.2], sq: 2.5, seg: 22 }),
    turned(cylinder(0.17, 0.17, 0.14), 0, 0, 0, [0.02, 0.46, 0]),
    // The head, the nozzle forward, the trigger under it.
    loft([[-0.2, 0.74, 0, 0.17, 0.16, 0.16], [0.2, 0.76, 0, 0.19, 0.17, 0.16], [0.56, 0.78, 0, 0.14, 0.13, 0.13]], { sq: 2.4, cap: 0.5 }),
    limb([0.02, 0.5, 0], [0.02, 0.7, 0], 0.13, 0.13),
    turned(cylinder(0.09, 0.11, 0.14), 0, 0, -Math.PI / 2, [0.74, 0.78, 0]),
    tube([[0.42, 0.66, 0.02], [0.4, 0.4, 0.02], [0.5, 0.16, 0.02]], 0.075, 0.06),
  ]);

/** 믹서기 (Marco Evaristti, Helena, 2000): the motor base and its dial, the jug with handle and spout, the lid. */
const blender: Builder = () =>
  fronted([
    lathe([[0, -1.0], [0.52, -1.0], [0.54, -0.92], [0.44, -0.5], [0.36, -0.42], [0, -0.42]]),
    blob(0, -0.74, 0.44, 0.13, 0.13, 0.08),
    lathe([[0, -0.42], [0.28, -0.42], [0.3, -0.3], [0.44, 0.62], [0.46, 0.7], [0, 0.7]]),
    lathe([[0, 0.7], [0.42, 0.7], [0.42, 0.8], [0.16, 0.84], [0.14, 0.96], [0, 0.98]]),
    tube([[0.4, 0.5, 0], [0.74, 0.44, 0], [0.76, 0.0, 0], [0.34, -0.14, 0]], 0.075, 0.075),
    limb([-0.44, 0.66, 0], [-0.56, 0.72, 0], 0.07, 0.05),
  ]);

/** 프라이팬: the dished pan and its long handle. */
const pan: Builder = () =>
  posed(
    [
      lathe([[0, -0.06], [0.46, -0.04], [0.66, 0.08], [0.76, 0.26], [0.82, 0.3], [0.74, 0.31], [0.62, 0.14], [0.36, 0.03], [0, 0.0]]),
      loft([[0.74, 0.24, 0, 0.09, 0.09, 0.12], [1.0, 0.32, 0, 0.08, 0.08, 0.1], [1.45, 0.38, 0, 0.1, 0.1, 0.14], [1.8, 0.38, 0, 0.095, 0.095, 0.13]]),
    ],
    0.72, 0, 0.6,
  );


/** 포크: four tines, the neck, the handle swelling to its end. */
const fork: Builder = () => {
  const parts: Geometry[] = [
    loft([[0, -1.2, 0, 0.16, 0.16, 0.13], [0, -0.7, 0, 0.13, 0.13, 0.12], [0, -0.1, 0, 0.095, 0.095, 0.11], [0, 0.2, 0, 0.12, 0.12, 0.11], [0, 0.42, 0, 0.29, 0.29, 0.12], [0, 0.56, 0, 0.3, 0.3, 0.11]], { cap: [1, 0.2], sub: 6 }),
  ];
  for (const x of [-0.235, -0.078, 0.078, 0.235]) parts.push(loft([[x, 0.5, 0, 0.066, 0.066, 0.1], [x, 0.95, 0.03, 0.064, 0.064, 0.09], [x, 1.22, 0.02, 0.035]], { seg: 12 }));
  return posed(fronted(parts), 0, 0, -0.6);
};


/** 식칼: the blade's straight back and curved belly, the bolster, a riveted handle. */
const knife: Builder = () =>
  posed(
    fronted([
      loft([[-0.2, 0.02, 0, 0.11, 0.3, 0.1], [0.3, 0.02, 0, 0.11, 0.32, 0.11], [0.85, 0.04, 0, 0.1, 0.24, 0.095], [1.25, 0.1, 0, 0.035, 0.06, 0.05]], { cap: [0.1, 1], sub: 8, seg: 20 }),
      box(0.13, 0.38, 0.3, 0.06, -0.26, -0.02, 0.02),
      loft([[-0.3, 0.02, 0, 0.12, 0.14, 0.15], [-0.7, 0.02, 0, 0.125, 0.14, 0.16], [-1.05, 0.0, 0, 0.13, 0.17, 0.16]], { sq: 2.6, cap: [0.3, 0.6] }),
      blob(-0.48, 0.0, 0.15, 0.05), blob(-0.68, 0.0, 0.155, 0.05), blob(-0.88, -0.01, 0.155, 0.05),
    ]),
    0, 0, 0.6,
  );


/** 양동이: the pail, open, its rolled rim, the bail fallen to one side. */
const bucket: Builder = () =>
  posed(
    [
      lathe([[0, -0.7], [0.4, -0.7], [0.42, -0.66], [0.58, 0.5], [0.62, 0.56], [0.56, 0.58], [0.52, 0.5], [0.38, -0.56], [0, -0.58]]),
      turned(torus(0.6, 0.05, 0, 0, 0, Math.PI), -0.5, 0, 0, [0, 0.5, 0]),
      ...[-1, 1].map((side) => blob(side * 0.6, 0.48, 0, 0.08)),
    ],
    0.5,
  );

// ── 버려진 것 ───────────────────────────────────────────────────────────────────────────────────────────────────

/** 페트병: the cap and neck ring, the shoulder, the pinched waist, the footed base. */
const petBottle: Builder = () =>
  posed(
    fronted([
      lathe([[0, -1.12], [0.16, -1.14], [0.3, -1.1], [0.36, -0.98], [0.36, -0.5], [0.29, -0.34], [0.36, -0.18], [0.36, 0.26], [0.3, 0.48], [0.15, 0.78], [0.13, 0.86], [0, 0.86]]),
      turned(torus(0.15, 0.045), Math.PI / 2, 0, 0, [0, 0.8, 0]),
      turned(cylinder(0.16, 0.16, 0.2), 0, 0, 0, [0, 0.98, 0]),
    ]),
    0, 0, -0.75,
  );

/** 식스팩 링: six rings of film in two rows, joined. */
const sixPack: Builder = () => {
  const parts: Geometry[] = [];
  for (const y of [-0.34, 0.34]) for (const x of [-0.68, 0, 0.68]) parts.push(torus(0.27, 0.085, x, y, 0));
  // The webs between them, and the two finger holes' bars.
  for (const x of [-0.34, 0.34]) parts.push(limb([x, -0.12, 0], [x, 0.12, 0], 0.085, 0.085));
  return posed(fronted(parts), 0, 0, -0.35);
};

/** 캔: a drinks can, its necked top, the rim, the tab and the mouth it opened. */
const can: Builder = () =>
  posed(
    [
      lathe([[0, -0.86], [0.3, -0.86], [0.4, -0.76], [0.4, 0.62], [0.33, 0.76], [0.34, 0.82], [0.3, 0.82], [0.28, 0.76], [0, 0.76]], { sharp: false }),
      // The tab: a ring and its rivet.
      turned(torus(0.085, 0.04), Math.PI / 2, 0, 0, [0, 0.8, 0.1], [1, 1, 1.3]),
      blob(0, 0.79, -0.02, 0.05, 0.03, 0.05),
    ],
    0.6, 0, -0.3,
  );

/** AA 건전지: the cell, the crimp below its shoulder, the button of its positive end. */
const battery: Builder = () =>
  posed(
    [
      lathe([[0, -0.9], [0.28, -0.9], [0.34, -0.84], [0.34, 0.62], [0.3, 0.72], [0.15, 0.72], [0.15, 0.92], [0.11, 0.96], [0, 0.96]], { sharp: true }),
      turned(torus(0.33, 0.035), Math.PI / 2, 0, 0, [0, 0.5, 0]),
    ],
    0.22, 0, -0.75,
  );


/** 알약: a capsule, one half a size over the other. */
const pill: Builder = () =>
  posed(
    fronted([
      loft([[-0.75, 0, 0, 0.3], [0.05, 0, 0, 0.3]], { sub: 2, seg: 24, cap: [1, 0.3] }),
      loft([[-0.02, 0, 0, 0.345], [0.75, 0, 0, 0.345]], { sub: 2, seg: 24, cap: [0.25, 1] }),
    ]),
    0, 0, 0.7,
  );

/** 주사기: the barrel and its finger flange, the plunger and thumb rest, the hub, the needle. */
const syringe: Builder = () =>
  posed(
    fronted([
      turned(lathe([[0, -0.5], [0.2, -0.5], [0.22, -0.46], [0.22, 0.42], [0.1, 0.52], [0.1, 0.66], [0.06, 0.72], [0, 0.72]], { sharp: true }), 0, 0, -Math.PI / 2),
      limb([0.7, 0, 0], [1.4, 0, 0], 0.045, 0.03),
      box(0.1, 0.82, 0.3, 0.05, -0.52, 0, 0),
      limb([-0.52, 0, 0], [-1.05, 0, 0], 0.09, 0.09),
      box(0.1, 0.56, 0.4, 0.05, -1.08, 0, 0),
    ]),
    0, 0, 0.65,
  );

/** 일회용 마스크: three pleats across, the nose edge, two ear loops. */
const mask: Builder = () =>
  fronted([
    loft([[-0.62, 0, 0, 0.42, 0.42, 0.16], [0, 0, 0, 0.46, 0.46, 0.2], [0.62, 0, 0, 0.42, 0.42, 0.16]], { sq: 3.2, cap: 0.2, seg: 24 }),
    ...[-0.24, 0, 0.24].map((y) => loft([[-0.66, y, 0.1, 0.085, 0.085, 0.07], [0, y, 0.17, 0.095, 0.095, 0.08], [0.66, y, 0.1, 0.085, 0.085, 0.07]], { seg: 12, cap: 0.4 })),
    // Ear loops.
    tube([[0.68, 0.34, 0], [1.0, 0.42, 0], [1.2, 0.1, 0], [1.14, -0.24, 0], [0.68, -0.34, 0]], 0.05, 0.05),
    tube([[-0.68, 0.34, 0], [-1.0, 0.42, 0], [-1.2, 0.1, 0], [-1.14, -0.24, 0], [-0.68, -0.34, 0]], 0.05, 0.05),
  ]);

/** 타이어: the carcass and its tread blocks. */
const tyre: Builder = () => {
  const parts: Geometry[] = [turned(torus(0.62, 0.3), 0, 0, 0, [0, 0, 0], [1, 1, 1.15])];
  for (let index = 0; index < 26; index += 1) {
    const angle = (index / 26) * Math.PI * 2;
    for (const z of [-0.14, 0.14]) parts.push(turned(box(0.14, 0.13, 0.22, 0.04), 0, 0, angle + (z > 0 ? 0.12 : 0), [Math.cos(angle + (z > 0 ? 0.12 : 0)) * 0.9, Math.sin(angle + (z > 0 ? 0.12 : 0)) * 0.9, z]));
  }
  return posed(parts, 0.25, 0.75);
};

/** 테이크아웃 컵: the tapered cup, the domed lid, the straw. */
const cup: Builder = () =>
  posed(
    [
      lathe([[0, -0.95], [0.3, -0.95], [0.32, -0.9], [0.44, 0.42], [0.48, 0.44], [0.48, 0.52], [0.43, 0.56], [0.36, 0.72], [0.2, 0.82], [0, 0.84]]),
      limb([0.06, 0.6, 0], [0.26, 1.5, 0], 0.06, 0.06),
    ],
    0.3, 0, -0.12,
  );

/** 라이터: a disposable lighter — the tank, the windguard, the spark wheel, the lever. */
const lighter: Builder = () =>
  posed(
    [
      loft([[0, -0.95, 0, 0.3, 0.3, 0.17], [0, 0.0, 0, 0.3, 0.3, 0.17], [0, 0.36, 0, 0.3, 0.3, 0.17]], { sq: 3, cap: [0.3, 0.1], seg: 22 }),
      box(0.34, 0.36, 0.32, 0.07, 0.14, 0.52, 0),
      turned(cylinder(0.15, 0.15, 0.3), Math.PI / 2, 0, 0, [-0.02, 0.68, 0]),
      loft([[-0.32, 0.42, 0, 0.09, 0.09, 0.15], [-0.14, 0.5, 0, 0.075, 0.075, 0.14]], { cap: 0.5, sub: 3 }),
    ],
    0.15, -0.5, -0.2,
  );


/** 전구: the globe drawing in to its neck, the screw cap in three turns, the contact. */
const bulb: Builder = () =>
  posed(
    fronted([
      lathe([[0, -0.52], [0.2, -0.5], [0.22, -0.3], [0.28, -0.1], [0.5, 0.2], [0.56, 0.5], [0.46, 0.82], [0.24, 1.0], [0, 1.04]]),
      ...[-0.36, -0.5, -0.64].map((y) => turned(torus(0.2, 0.065), Math.PI / 2, 0, 0, [0, y, 0])),
      lathe([[0, -0.86], [0.1, -0.84], [0.16, -0.72], [0.18, -0.64], [0, -0.64]]),
    ]),
    0, 0, 0.5,
  );

// ── 산업 ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** 드럼통: a 200-litre drum, its two rolling hoops and chimes, the bung on its head. */
const drum: Builder = () =>
  posed(
    [
      lathe([[0, -0.84], [0.5, -0.84], [0.5, 0.84], [0.44, 0.84], [0.44, 0.78], [0, 0.78]], { sharp: true }),
      ...[-0.84, -0.28, 0.28, 0.84].map((y) => turned(torus(0.5, 0.05), Math.PI / 2, 0, 0, [0, y, 0])),
      turned(cylinder(0.1, 0.1, 0.1), 0, 0, 0, [0.22, 0.82, 0.1]),
      turned(cylinder(0.05, 0.05, 0.08), 0, 0, 0, [-0.24, 0.81, -0.12]),
    ],
    0.5, 0.3,
  );

/** 제리캔: the pressed X on its side, three bars of handle, the spout at the corner. */
const jerrycan: Builder = () =>
  posed(
    [
      plate([[-0.55, -0.85], [0.55, -0.85], [0.55, 0.3], [0.3, 0.62], [-0.55, 0.62]], 0.56, { bevel: 0.12 }),
      // The X pressed into the side, as a swelling.
      limb([-0.36, -0.62, 0.26], [0.36, 0.2, 0.26], 0.085, 0.085, 0.07, 0.07),
      limb([-0.36, 0.2, 0.26], [0.36, -0.62, 0.26], 0.085, 0.085, 0.07, 0.07),
      // The handle's three bars and their posts; the spout.
      ...[-0.18, 0, 0.18].map((z) => limb([-0.4, 0.84, z], [0.06, 0.84, z], 0.06, 0.06)),
      box(0.1, 0.3, 0.5, 0.04, -0.42, 0.72, 0),
      box(0.1, 0.3, 0.5, 0.04, 0.08, 0.72, 0),
      turned(cylinder(0.13, 0.13, 0.26), 0, 0, -0.7, [0.5, 0.56, 0]),
    ],
    0.3, -0.6,
  );

/** 공장: a saw-tooth shed, two stacks behind it, the smoke leaving them. */
const factory: Builder = () =>
  posed(
    [
      plate([[-0.9, -0.75], [0.9, -0.75], [0.9, -0.05], [0.3, 0.25], [0.3, -0.05], [-0.3, 0.25], [-0.3, -0.05], [-0.9, 0.25]], 0.9, { bevel: 0.07 }),
      turned(lathe([[0, -0.75], [0.2, -0.75], [0.14, 1.0], [0, 1.0]], { sharp: true }), 0, 0, 0, [0.62, 0.0, -0.2]),
      turned(lathe([[0, -0.75], [0.18, -0.75], [0.13, 0.7], [0, 0.7]], { sharp: true }), 0, 0, 0, [0.18, 0.0, -0.2]),
      // Smoke: puffs growing as they drift.
      blob(0.58, 1.14, -0.2, 0.2), blob(0.36, 1.32, -0.2, 0.26), blob(0.02, 1.42, -0.2, 0.3),
      blob(0.12, 0.84, -0.2, 0.17), blob(-0.1, 0.98, -0.2, 0.21),
    ],
    0.22, -0.5,
  );


/** 배수관: an outfall — the pipe's open mouth and collar, the effluent falling from it. */
const outfall: Builder = () =>
  posed(
    [
      turned(lathe([[0.36, -0.9], [0.36, 0.36], [0.43, 0.36], [0.43, 0.56], [0.32, 0.56], [0.29, 0.3], [0.29, -0.9]], { sharp: true }), 0, 0, -Math.PI / 2),
      loft([[0.4, -0.14, 0, 0.13, 0.13, 0.24], [0.8, -0.3, 0, 0.15, 0.15, 0.22], [1.0, -0.7, 0, 0.17, 0.17, 0.2], [1.06, -1.2, 0, 0.21]], { sub: 8 }),
      blob(1.08, -1.32, 0, 0.46, 0.14, 0.4),
    ],
    0.2, -0.55,
  );

export const ARTEFACTS = {
  hook, scoopNet, trident, float, lure,
  bowl, bag, toilet, tap, jug, sprayer, blender, pan, fork, knife, bucket,
  petBottle, sixPack, can, battery, pill, syringe, mask, tyre, cup, lighter, bulb,
  drum, jerrycan, factory, outfall,
} satisfies Record<string, Builder>;
