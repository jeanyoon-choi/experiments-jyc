// 기술-상징 (user, 2026-10-12): technologies themselves, not the companies that sell
// them, in the 기술-버블 treatment. Rounds with the user:
//   1. pictograms (padlock, key, cloud, pin, cursor, #): too cheesy, literal;
//   2. so each is drawn as an identity studio would draw a logo for the technology —
//      one idea per mark, reduced to solid geometry with negative space, on one
//      24-unit grid with one line weight, never an icon or a textbook diagram, and
//      not so abstract that the idea is lost (a wafer of dies, ShiftRows' missing
//      diagonal, an identicon for a hash, a shutter for vision, contours sinking
//      to a minimum, a ball in a socket for an interface).
// A mark is a list of layers drawn in order into a mask (fills even-odd, strokes
// round-capped, cuts erase), so overlaps never double the colour. Colours follow the
// field: learning violet to pink, hardware green, networks blue, security red,
// blockchain gold, software mixed.

/** One drawing step of a mark in a 24 × 24 box. */
export type SymbolLayer = { d: string; mode: "fill" | "stroke" | "cut" | "cutStroke"; width?: number };
/** A technology's mark and its colour (hex, no #). */
export type TechSymbol = { name: string; layers: readonly SymbolLayer[]; hex: string };

type Point = readonly [number, number];

const LINE = 2.2;

const fill = (d: string): SymbolLayer => ({ d, mode: "fill" });
const stroke = (d: string, width = LINE): SymbolLayer => ({ d, mode: "stroke", width });
const cut = (d: string): SymbolLayer => ({ d, mode: "cut" });
const cutStroke = (d: string, width: number): SymbolLayer => ({ d, mode: "cutStroke", width });

const round = (value: number) => Math.round(value * 100) / 100;
const at = (degrees: number, r: number, cx = 12, cy = 12): Point => [
  cx + r * Math.cos((degrees * Math.PI) / 180),
  cy + r * Math.sin((degrees * Math.PI) / 180),
];
const circle = (x: number, y: number, r: number) =>
  `M${round(x - r)} ${round(y)}a${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0`;
const ring = (x: number, y: number, r: number, thickness: number) => circle(x, y, r) + circle(x, y, r - thickness);
const polygon = (points: readonly Point[]) => `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`;
const roundRect = (x: number, y: number, w: number, h: number, radius: number) => {
  const r = round(Math.min(radius, w / 2, h / 2));
  const [sw, sh] = [round(w - 2 * r), round(h - 2 * r)];
  return `M${round(x + r)} ${round(y)}h${sw}a${r} ${r} 0 0 1 ${r} ${r}v${sh}a${r} ${r} 0 0 1 ${-r} ${r}h${-sw}a${r} ${r} 0 0 1 ${-r} ${-r}v${-sh}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
};
const square = (cx: number, cy: number, size: number) => polygon([[cx - size / 2, cy - size / 2], [cx + size / 2, cy - size / 2], [cx + size / 2, cy + size / 2], [cx - size / 2, cy + size / 2]]);
/** An arc of a ring from `from` to `to` degrees, clockwise. */
const arc = (r: number, from: number, to: number, cx = 12, cy = 12) => {
  const [x0, y0] = at(from, r, cx, cy);
  const [x1, y1] = at(to, r, cx, cy);
  return `M${round(x0)} ${round(y0)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${round(x1)} ${round(y1)}`;
};
/** A piece of an annulus between two radii and two angles, clockwise. */
const sector = (inner: number, outer: number, from: number, to: number) => {
  const large = to - from > 180 ? 1 : 0;
  const [a, b] = at(from, outer);
  const [c, d] = at(to, outer);
  const [e, f] = at(to, inner);
  const [g, h] = at(from, inner);
  return `M${round(a)} ${round(b)}A${outer} ${outer} 0 ${large} 1 ${round(c)} ${round(d)}L${round(e)} ${round(f)}A${inner} ${inner} 0 ${large} 0 ${round(g)} ${round(h)}Z`;
};

// Neural network: three inputs narrowing into one node.
const NEURAL = (() => {
  const inputs: Point[] = [[4.5, 5], [4.5, 12], [4.5, 19]];
  return [
    ...inputs.map(([x, y]) => fill(polygon([[x, y - 1.15], [x, y + 1.15], [16.5, 12]]))),
    fill(inputs.map(([x, y]) => circle(x, y, 2.3)).join("")),
    fill(circle(16.5, 12, 5.5)),
  ];
})();

// Attention: one query, every key weighted around it.
const ATTENTION_WEIGHTS = [2.1, 1.4, 0.9, 0.7, 0.9, 1.3, 1.8, 1.1, 0.8, 0.7, 1, 1.5];
const ATTENTION = [
  fill(circle(12, 12, 3.4)),
  fill(ATTENTION_WEIGHTS.map((r, index) => circle(...at(index * 30 - 90, 8.2), r)).join("")),
];

// Diffusion: a disc whose right half is still noise, the dots thinning outwards.
const DIFFUSION = (() => {
  const dots: string[] = [];
  for (const [column, x] of [13.6, 16.1, 18.6, 21].entries()) {
    const r = 1.05 - column * 0.2;
    for (let k = -3; k <= 3; k += 1) {
      const y = 12 + k * 2.5;
      if (Math.hypot(x - 12, y - 12) <= 9.3 - r) dots.push(circle(x, y, r));
    }
  }
  return [fill("M12 2.8A9.2 9.2 0 0 0 12 21.2Z"), fill(dots.join(""))];
})();

// Embedding: a lattice whose points swell where meanings cluster.
const EMBEDDING = (() => {
  const dots: string[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const x = 4 + column * 4;
      const y = 4 + row * 4;
      const near = Math.max(Math.exp(-((x - 7) ** 2 + (y - 7.5) ** 2) / 16), Math.exp(-((x - 17) ** 2 + (y - 16) ** 2) / 12));
      dots.push(circle(x, y, 0.55 + 1.45 * near));
    }
  }
  return [fill(dots.join(""))];
})();

// Computer vision: a camera's iris, six blades around a hexagonal opening.
const SHUTTER = (() => {
  const outer = 9.4;
  const hole = Array.from({ length: 6 }, (_, index) => at(index * 60 - 75, 4.2));
  const ends = hole.map((point, index) => {
    const from = hole[(index + 5) % 6]!;
    const length = Math.hypot(point[0] - from[0], point[1] - from[1]);
    const u = [(point[0] - from[0]) / length, (point[1] - from[1]) / length] as const;
    const b = u[0] * (point[0] - 12) + u[1] * (point[1] - 12);
    const c = (point[0] - 12) ** 2 + (point[1] - 12) ** 2 - outer * outer;
    const t = -b + Math.sqrt(b * b - c);
    return [point, [point[0] + u[0] * t, point[1] + u[1] * t]] as const;
  });
  return [
    fill(circle(12, 12, outer) + polygon(hole)),
    cutStroke(ends.map(([a, b]) => `M${round(a[0])} ${round(a[1])}L${round(b[0])} ${round(b[1])}`).join(""), 0.9),
  ];
})();

// Cloud: three plates of infrastructure, one stacked on another.
const PLATES = (() => {
  const top = 3.2;
  const band = (y: number) => polygon([[3.5, y], [12, y + 4.5], [20.5, y], [20.5, y + 2.2], [12, y + 6.7], [3.5, y + 2.2]]);
  return [fill(polygon([[12, top], [20.5, top + 4.5], [12, top + 9], [3.5, top + 4.5]])), fill(band(top + 7.6)), fill(band(top + 11.8))];
})();

// Hash: an identicon — a digest drawn as a mirrored 5 × 5 pattern.
const IDENTICON = (() => {
  const half = ["101", "011", "110", "010", "101"];
  const cells: string[] = [];
  half.forEach((row, y) => {
    const bits = row + row[1] + row[0];
    [...bits].forEach((bit, x) => {
      if (bit === "1") cells.push(square(4.8 + x * 3.6, 4.8 + y * 3.6, 3.2));
    });
  });
  return [fill(cells.join(""))];
})();

// Encryption: AES's state grid with ShiftRows' moved cells left as a diagonal gap.
const STATE_GRID = (() => {
  const cells: string[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      if (column !== row) cells.push(roundRect(3.3 + column * 4.6, 3.3 + row * 4.6, 3.6, 3.6, 0.6));
    }
  }
  return [fill(cells.join(""))];
})();

// Firewall: a wall's running bond, rounded into a mark.
const FIREWALL = [
  fill(
    [0, 1, 2, 3]
      .flatMap((row) => {
        const y = 4 + row * 4.2;
        const bricks = row % 2 === 0 ? [[2.6, 9], [12.4, 9]] : [[2.6, 4], [7.4, 9.2], [17.4, 4]];
        return bricks.map(([x, w]) => roundRect(x!, y, w!, 3.4, 0.9));
      })
      .join(""),
  ),
];

const SEMICONDUCTOR = (() => {
  const dies: string[] = [];
  for (let row = -3; row <= 3; row += 1) {
    for (let column = -3; column <= 3; column += 1) {
      const x = 12 + column * 2.8;
      const y = 11.4 + row * 2.8;
      if (Math.hypot(Math.abs(x - 12) + 1.1, Math.abs(y - 12) + 1.1) <= 8.2 && y + 1.1 <= 19) dies.push(square(x, y, 2.2));
    }
  }
  return [stroke("M7.76 20.5A9.5 9.5 0 1 1 16.24 20.5Z", 1.2), fill(dies.join(""))];
})();

// Sierpinski: the shape made of smaller copies of itself.
const SIERPINSKI = (() => {
  const out: string[] = [];
  const mid = (p: Point, q: Point): Point => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const split = (a: Point, b: Point, c: Point, depth: number) => {
    if (depth === 0) return void out.push(polygon([a, b, c]));
    split(a, mid(a, b), mid(a, c), depth - 1);
    split(mid(a, b), b, mid(b, c), depth - 1);
    split(mid(a, c), mid(b, c), c, depth - 1);
  };
  split([12, 3], [22, 20.3], [2, 20.3], 3);
  return [fill(out.join(""))];
})();

export const TECH_SYMBOLS: readonly TechSymbol[] = [
  // Learning
  { name: "Neural Network", layers: NEURAL, hex: "8B5CF6" },
  { name: "Attention", layers: ATTENTION, hex: "A855F7" },
  { name: "Diffusion", layers: DIFFUSION, hex: "D946EF" },
  { name: "Embedding", layers: EMBEDDING, hex: "6366F1" },
  // Contours sinking towards a minimum off the centre.
  { name: "Gradient Descent", layers: [fill(circle(12, 12, 9.5) + circle(13, 13, 7.3) + circle(14, 14, 5.1) + circle(15, 15, 2.9) + circle(15.6, 15.6, 1.2))], hex: "7C3AED" },
  {
    name: "Tokenization",
    layers: [
      fill(
        [[2, 7], [10.4, 4], [15.8, 6.2], [2, 3.2], [6.6, 9.4], [17.4, 4.6], [2, 9.5], [12.9, 4.1], [18.4, 3.6]]
          .map(([x, w], index) => roundRect(x!, 5.4 + Math.floor(index / 3) * 4.8, w!, 3.6, 1.8))
          .join(""),
      ),
    ],
    hex: "C084FC",
  },
  // Agent and environment, overlapping; the action lives where they meet.
  { name: "Reinforcement Learning", layers: [fill(circle(8.8, 12, 6.6) + circle(15.2, 12, 6.6) + circle(12, 12, 1.7))], hex: "EC4899" },
  { name: "Computer Vision", layers: SHUTTER, hex: "818CF8" },
  // A disc divided by a wave.
  { name: "Signal Processing", layers: [fill("M3 12C6 5.5 9 5.5 12 12S18 18.5 21 12A9 9 0 0 1 3 12Z"), stroke(circle(12, 12, 9), 1.2)], hex: "F472B6" },
  // Hardware
  {
    name: "Parallel Computing",
    layers: [fill([2, 6.5, 11, 15.5].map((x) => polygon([[x, 20], [x + 2.6, 20], [x + 6.6, 4], [x + 4, 4]])).join(""))],
    hex: "22C55E",
  },
  { name: "Semiconductor", layers: SEMICONDUCTOR, hex: "10B981" },
  // A NAND gate: the shape and its inverting bubble, nothing more.
  { name: "Logic Gate", layers: [fill("M3.5 5h7a7 7 0 0 1 0 14h-7Z"), fill(circle(20, 12, 1.9))], hex: "84CC16" },
  // Superposition: one half solid, the other only drawn.
  {
    name: "Quantum Computing",
    layers: [fill(ring(12, 12, 9.2, 1.4)), fill("M12 6A6 6 0 0 0 12 18Z"), stroke("M12 6A6 6 0 0 1 12 18", 1.2)],
    hex: "06B6D4",
  },
  {
    name: "Robotics",
    layers: [stroke("M6 19.5L9.5 12L18 8", 2.6), fill(roundRect(2.5, 18.6, 8, 2.8, 1.4)), fill(circle(9.5, 12, 2.7) + circle(18, 8, 2.1))],
    hex: "14B8A6",
  },
  // Networks
  { name: "Cloud Infrastructure", layers: PLATES, hex: "3B82F6" },
  { name: "Wireless", layers: [fill(circle(12, 12, 9.4) + circle(12, 12, 8.6) + circle(12, 12, 6.3) + circle(12, 12, 4.8) + circle(12, 12, 2.6))], hex: "0EA5E9" },
  // A route through a grid of routers.
  {
    name: "Packet Routing",
    layers: [
      fill([5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => circle(x, y, 1.15))).join("")),
      stroke("M5 19H12V12H19V5"),
      fill(circle(5, 19, 2.5) + circle(19, 5, 2.5)),
    ],
    hex: "2563EB",
  },
  // Rings of peers, each overlapping its neighbours, none in the middle.
  { name: "Peer-to-Peer", layers: [0, 60, 120, 180, 240, 300].map((degree) => fill(ring(...at(degree, 6.4), 3.3, 1.2))), hex: "38BDF8" },
  // Three ranges; the position is where all three agree.
  { name: "Positioning", layers: [fill([-90, 30, 150].map((degree) => circle(...at(degree, 3.6), 5.7)).join(""))], hex: "60A5FA" },
  // A signal and its later arrival.
  { name: "Latency", layers: [fill(circle(7.6, 12, 4.8)), fill(ring(16.4, 12, 4.8, 1.3))], hex: "0284C7" },
  // Security
  { name: "Encryption", layers: STATE_GRID, hex: "EF4444" },
  // A key pair: a disc with a hole and the one piece that fits it.
  { name: "Public-Key Cryptography", layers: [fill(circle(9.6, 12, 7.2) + circle(12.4, 12, 2.6)), fill(circle(19.8, 12, 2.6))], hex: "F97316" },
  { name: "Hash Function", layers: IDENTICON, hex: "F43F5E" },
  { name: "Firewall", layers: FIREWALL, hex: "FB7185" },
  // Blockchain
  {
    name: "Blockchain",
    layers: [6.5, 12, 17.5].map((x) => fill(polygon([[x, 7], [x + 5, 12], [x, 17], [x - 5, 12]]) + polygon([[x, 9.1], [x + 2.9, 12], [x, 14.9], [x - 2.9, 12]]))),
    hex: "F59E0B",
  },
  {
    name: "Merkle Tree",
    layers: [
      stroke("M12 4.5L6.5 12L3.5 19.5M6.5 12L9.5 19.5M12 4.5L17.5 12L14.5 19.5M17.5 12L20.5 19.5", 1.5),
      fill(circle(12, 4.5, 2.5) + circle(6.5, 12, 2.1) + circle(17.5, 12, 2.1)),
      fill([3.5, 9.5, 14.5, 20.5].map((x) => square(x, 19.5, 3.2)).join("")),
    ],
    hex: "EAB308",
  },
  // Votes that close into one ring.
  { name: "Consensus", layers: [fill([0, 60, 120, 180, 240, 300].map((degree) => sector(5.2, 9.2, degree - 26, degree + 26)).join("") + circle(12, 12, 3))], hex: "FBBF24" },
  // Terms with a seal: the agreement that carries itself out.
  {
    name: "Smart Contract",
    layers: [
      fill(roundRect(3, 2.5, 13, 17, 2)),
      cutStroke("M6.2 7h6.6M6.2 10.4h6.6M6.2 13.8h3.6", 1.4),
      cut(circle(17.2, 17.2, 5.6)),
      fill(circle(17.2, 17.2, 4.2)),
    ],
    hex: "D97706",
  },
  // Software
  { name: "Database", layers: [6, 12, 18].map((y) => fill(`M4 ${y}a8 2.8 0 1 0 16 0a8 2.8 0 1 0-16 0`)), hex: "A3E635" },
  // Two lines of work meeting in one.
  { name: "Version Control", layers: [stroke("M6 3.5v3c0 6 6 5 6 11v3.5M18 3.5v3c0 6-6 5-6 11"), fill(circle(6, 3.5, 2.3) + circle(18, 3.5, 2.3) + circle(12, 20.5, 2.3))], hex: "FB923C" },
  // A unit sealed inside its own boundary.
  { name: "Container", layers: [fill(roundRect(3, 3, 18, 18, 3.2) + roundRect(5, 5, 14, 14, 1.8)), fill(roundRect(8.2, 8.2, 7.6, 7.6, 1))], hex: "67E8F9" },
  { name: "Recursion", layers: SIERPINSKI, hex: "E879F9" },
  // Source as its indentation.
  {
    name: "Source Code",
    layers: [fill([[3, 8], [6, 13], [9, 11], [9, 7], [6, 9]].map(([x, w], row) => roundRect(x!, 3.4 + row * 4, w!, 2.4, 1.2)).join(""))],
    hex: "FACC15",
  },
  // A ball held by a socket: one side provides, the other requires.
  { name: "API", layers: [fill(circle(9.5, 12, 3.8) + roundRect(2, 11.1, 4, 1.8, 0.9)), fill(sector(6.2, 8, -68, 68) + roundRect(17.2, 11.1, 4.8, 1.8, 0.9))], hex: "4ADE80" },
  // Three stages, round and round.
  { name: "Continuous Integration", layers: [stroke(arc(8, -80, 20) + arc(8, 40, 140) + arc(8, 160, 260), 2.6), fill(circle(12, 12, 2.2))], hex: "2DD4BF" },
  // Windows, one in front of another.
  {
    name: "Graphical Interface",
    layers: [fill(roundRect(2, 3, 14, 11, 1.8) + roundRect(3.4, 4.4, 11.2, 8.2, 0.8)), cut(roundRect(6.8, 8.2, 16.4, 13.6, 2.6)), fill(roundRect(8, 9.4, 14, 11, 1.8))],
    hex: "E5E7EB",
  },
];
