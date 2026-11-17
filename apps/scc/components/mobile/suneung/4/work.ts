// What the cells read and print, computed from the booklet and solutions.json at
// render time: the question's equations read back as linear tokens, the
// operations of each solution step stripped of its prose, every choice
// evaluated to a number, and for a few questions an actual computation
// (a Riemann sum, a root search) with a plot. Nothing here is typed in by
// hand as a result: the numbers are evaluated.

export type Solution = {
  number: number;
  topic?: string;
  points?: number;
  level: "easy" | "mid" | "hard" | "killer";
  durationMs: number;
  steps: { id: string; text: string }[];
  answer: string;
  value: string;
};

export type Plot = {
  /** Domain and range of the plot box. */
  x: [number, number];
  y: [number, number];
  /** Curves drawn by the pen, as sampled polylines in plot coordinates. */
  curves: { id: string; points: [number, number][] }[];
  /** Riemann rectangles for successive n, each as [x0, x1, y0, y1] in plot coordinates. */
  sums?: { n: number; rects: [number, number, number, number][] }[];
  /** Candidate points of a search, with whether the function changes sign after them. */
  probes?: { id: string; x: number; y: number; bracket: boolean }[];
  /** The root found, if the plot is a search. */
  root?: [number, number];
};

/** A stroke of a construction on a printed figure, in the figure's own coordinates (pt). */
export type Stroke =
  | { k: "seg"; from: [number, number]; to: [number, number]; label?: string; at?: number }
  | { k: "arc"; center: [number, number]; r: number; a0: number; a1: number; label?: string }
  | { k: "poly"; points: [number, number][] }
  | { k: "circle"; center: [number, number]; r: number };

/** A construction drawn over a figure, each step with the margin line it is drawn beside. */
export type Construction = { figure: string; steps: { line: number; strokes: Stroke[] }[] };

export type Work = {
  /** Lines written in the margin, in order, as ./math.tsx sources. */
  ops: string[];
  construction?: Construction;
  plot?: Plot;
  /** Which ops lines are written while the plot is drawn (the rest follow). */
  plotOps?: number;
};

// ---------------------------------------------------------------------------
// Math source (./math.tsx syntax) read back as linear tokens.

/** The argument in braces starting at i (s[i] === "{"); returns its text and the index after it. */
function braced(s: string, i: number): [string, number] {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "\\" && (s[j + 1] === "{" || s[j + 1] === "}")) {
      j++;
      continue;
    }
    if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}

const simple = (t: string) => /^[0-9A-Za-zθπ.]+$/.test(t) || /^√[0-9A-Za-z]+$/.test(t);
const wrap = (t: string) => (simple(t) ? t : `(${t})`);

/** `\f{1}{4}` → `1/4`, `x^{n+1}` → `x^(n+1)`, `\L{x→0}` → `lim[x→0]`… */
export function linear(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      const command = source[i + 1];
      if (command === "{" || command === "}") {
        out += command;
        i += 2;
        continue;
      }
      i += 2;
      const args: string[] = [];
      const arity = command === "f" || command === "S" || command === "I" ? 2 : 1;
      for (let a = 0; a < arity && source[i] === "{"; a++) {
        const [arg, next] = braced(source, i);
        args.push(linear(arg));
        i = next;
      }
      switch (command) {
        case "f":
          out += `${wrap(args[0])}/${wrap(args[1])}`;
          break;
        case "r":
          out += simple(args[0]) ? `√${args[0]}` : `√(${args[0]})`;
          break;
        case "S":
          out += `Σ[${args[0]}..${args[1]}]`;
          break;
        case "I":
          out += `∫[${args[0]}..${args[1]}]`;
          break;
        case "L":
          out += `lim[${args[0]}]`;
          break;
        case "c":
          out += `{${args[0].replace(/\s*&\s*/g, ", ").replace(/\s*;\s*/g, " | ")}}`;
          break;
        case "b":
          out += `[${args[0]}]`;
          break;
        default:
          out += args[0] ?? "";
      }
      continue;
    }
    if ((ch === "^" || ch === "_") && source[i + 1] === "{") {
      const [arg, next] = braced(source, i + 1);
      const inner = linear(arg);
      out += `${ch}${simple(inner) ? inner : `(${inner})`}`;
      i = next;
      continue;
    }
    out += ch === "~" ? " " : ch;
    i++;
  }
  return out.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// A numeric evaluator for the linear form: + − × · / ^, √, π, ln, parentheses
// and implicit multiplication (3√3, √3(3+8ln2), 2ln2).

type Token = { k: "n"; v: number } | { k: "op"; v: string } | { k: "fn"; v: string } | { k: "(" } | { k: ")" };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const s = text.replace(/\s+/g, "").replace(/−/g, "-").replace(/[×·]/g, "*");
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const number = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (number) {
      tokens.push({ k: "n", v: Number(number[0]) });
      i += number[0].length;
    } else if (ch === "π") {
      tokens.push({ k: "n", v: Math.PI });
      i++;
    } else if (s.startsWith("ln", i)) {
      tokens.push({ k: "fn", v: "ln" });
      i += 2;
    } else if (ch === "√") {
      tokens.push({ k: "fn", v: "√" });
      i++;
    } else if ("+-*/^".includes(ch)) {
      tokens.push({ k: "op", v: ch });
      i++;
    } else if (ch === "(") {
      tokens.push({ k: "(" });
      i++;
    } else if (ch === ")") {
      tokens.push({ k: ")" });
      i++;
    } else {
      throw new Error(`cannot evaluate "${text}" at "${s.slice(i)}"`);
    }
  }
  return tokens;
}

/** Evaluates the linear form of a value, or null if it is not a number (ㄱ, ㄷ). */
export function evaluate(text: string): number | null {
  let tokens: Token[];
  try {
    tokens = tokenize(text);
  } catch {
    return null;
  }
  let i = 0;
  const peek = () => tokens[i];
  const startsOperand = (t: Token | undefined) => !!t && (t.k === "n" || t.k === "fn" || t.k === "(");

  // sum := product (("+" | "-") product)*
  const sum = (): number => {
    let v = product();
    for (let t = peek(); t?.k === "op" && (t.v === "+" || t.v === "-"); t = peek()) {
      i++;
      v = t.v === "+" ? v + product() : v - product();
    }
    return v;
  };
  // product := unary (("*" | "/") unary | implicit unary)*
  const product = (): number => {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t?.k === "op" && (t.v === "*" || t.v === "/")) {
        i++;
        v = t.v === "*" ? v * unary() : v / unary();
      } else if (startsOperand(t)) {
        v *= power();
      } else return v;
    }
  };
  const unary = (): number => {
    const t = peek();
    if (t?.k === "op" && t.v === "-") {
      i++;
      return -unary();
    }
    return power();
  };
  // power := atom ("^" unary)?
  const power = (): number => {
    const base = atom();
    const t = peek();
    if (t?.k === "op" && t.v === "^") {
      i++;
      return base ** unary();
    }
    return base;
  };
  const atom = (): number => {
    const t = tokens[i++];
    if (!t) throw new Error("unexpected end");
    if (t.k === "n") return t.v;
    if (t.k === "(") {
      const v = sum();
      if (tokens[i++]?.k !== ")") throw new Error("missing )");
      return v;
    }
    if (t.k === "fn") {
      const v = power();
      return t.v === "ln" ? Math.log(v) : Math.sqrt(v);
    }
    throw new Error("unexpected token");
  };

  try {
    const v = sum();
    return i === tokens.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * The linear form of a value as JavaScript (`√3(3+8ln2)/16` →
 * `Math.sqrt(3) * (3 + 8 * Math.log(2)) / 16`), or null if it is not a number.
 */
export function jsOf(text: string): string | null {
  let tokens: Token[];
  try {
    tokens = tokenize(text);
  } catch {
    return null;
  }
  type Out = { s: string; p: number };
  let i = 0;
  const peek = () => tokens[i];
  const wrap = (o: Out, p: number) => (o.p < p ? `(${o.s})` : o.s);
  const startsOperand = (t: Token | undefined) => !!t && (t.k === "n" || t.k === "fn" || t.k === "(");
  const sum = (): Out => {
    let o = product();
    for (let t = peek(); t?.k === "op" && (t.v === "+" || t.v === "-"); t = peek()) {
      i++;
      const r = product();
      o = { s: `${o.s} ${t.v} ${t.v === "-" ? wrap(r, 3) : r.s}`, p: 1 };
    }
    return o;
  };
  const product = (): Out => {
    let o = unary();
    for (;;) {
      const t = peek();
      if (t?.k === "op" && (t.v === "*" || t.v === "/")) {
        i++;
        const r = unary();
        o = { s: `${wrap(o, 2)} ${t.v} ${wrap(r, t.v === "/" ? 3 : 2)}`, p: 2 };
      } else if (startsOperand(t)) {
        o = { s: `${wrap(o, 2)} * ${wrap(power(), 3)}`, p: 2 };
      } else return o;
    }
  };
  const unary = (): Out => {
    const t = peek();
    if (t?.k === "op" && t.v === "-") {
      i++;
      return { s: `-${wrap(unary(), 3)}`, p: 3 };
    }
    return power();
  };
  const power = (): Out => {
    const base = atom();
    const t = peek();
    if (t?.k === "op" && t.v === "^") {
      i++;
      return { s: `${wrap(base, 5)} ** ${wrap(unary(), 4)}`, p: 4 };
    }
    return base;
  };
  const atom = (): Out => {
    const t = tokens[i++];
    if (!t) throw new Error("end");
    if (t.k === "n") return { s: t.v === Math.PI ? "Math.PI" : String(t.v), p: 5 };
    if (t.k === "(") {
      const o = sum();
      i++;
      return { s: o.s, p: o.p };
    }
    if (t.k === "fn") return { s: `${t.v === "ln" ? "Math.log" : "Math.sqrt"}(${power().s})`, p: 5 };
    throw new Error("token");
  };
  try {
    const o = sum();
    return i === tokens.length ? o.s : null;
  } catch {
    return null;
  }
}

/** A choice's source (`$\f{3}{8}$`) evaluated, or null. */
export const evaluateChoice = (source: string) => evaluate(linear(source.replace(/\$/g, "")));

export function fixed(v: number, digits = 4) {
  const text = v.toFixed(digits);
  return text.startsWith("-") ? `−${text.slice(1)}` : text;
}

/** Best fraction p/q for v with q ≤ limit, by continued fractions. */
export function fraction(v: number, limit = 1000): [number, number] {
  let [h0, h1, k0, k1] = [0, 1, 1, 0];
  let x = v;
  for (let step = 0; step < 32; step++) {
    const a = Math.floor(x);
    const [h2, k2] = [a * h1 + h0, a * k1 + k0];
    if (k2 > limit) break;
    [h0, h1, k0, k1] = [h1, h2, k1, k2];
    if (Math.abs(x - a) < 1e-12) break;
    x = 1 / (x - a);
  }
  return [h1, k1];
}

// ---------------------------------------------------------------------------
// Operations of a solution step: its runs of non-Hangul text that state a
// relation, without the prose around them.

const RELATION = /[=<>≤≥→]/;

export function operations(text: string): string[] {
  return text
    .split(/[가-힣]+/)
    // Cases written on one line (`x < −1: … / −1 ≤ x < 0: …`) become one line each.
    .flatMap((run) => run.split(" / "))
    .map((run) =>
      run
        .replace(/^[\s,.:;)+]+/, "")
        .replace(/[\s,.:;(]+$/, "")
        .trim(),
    )
    .filter((run) => RELATION.test(run) && run.length >= 5)
    .map((run) => {
      // Balance a parenthesis cut off by the prose.
      const open = (run.match(/\(/g) ?? []).length;
      const close = (run.match(/\)/g) ?? []).length;
      if (open > close) return run + ")".repeat(open - close);
      if (close > open && run.endsWith(")")) return run.replace(/\)+$/, (m) => m.slice(0, m.length - (close - open)));
      return run;
    });
}

// ---------------------------------------------------------------------------
// A solution's operation (plain Unicode, as solutions.json writes it) as a
// ./math.tsx source, so the margin is set like the paper: italic variables,
// upright digits, real fractions of scripts and roots.

const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "−", ᵗ: "t" };
const SUB: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

export function mathSource(op: string): string {
  const scripted = op
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻ᵗ]+/g, (run) => `^{${Array.from(run, (c) => SUP[c]).join("")}}`)
    .replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, (run) => `_{${Array.from(run, (c) => SUB[c]).join("")}}`);
  let out = "";
  const closers: string[] = [];
  for (let i = 0; i < scripted.length; i++) {
    const ch = scripted[i];
    const previous = scripted[i - 1];
    if ((ch === "^" || ch === "_") && scripted[i + 1] === "(") {
      out += `${ch}{`;
      closers.push("}");
      i++;
    } else if (ch === "√" && scripted[i + 1] === "(") {
      out += "\\r{";
      closers.push("}");
      i++;
    } else if (ch === "√") {
      const run = /^[0-9A-Za-z]+/.exec(scripted.slice(i + 1))?.[0] ?? "";
      out += `\\r{${run}}`;
      i += run.length;
    } else if (ch === "(") {
      out += "(";
      closers.push(")");
    } else if (ch === "{") {
      const grouping = previous === "^" || previous === "_";
      out += grouping ? "{" : "\\{";
      closers.push(grouping ? "}" : "\\}");
    } else if (ch === ")" || ch === "}") {
      out += closers.pop() ?? ch;
    } else if (/[ㄱ-ㅎ]/.test(ch)) {
      out += `\\t{${ch}}`;
    } else {
      out += ch;
    }
  }
  // Simple fractions (13/3, n/3, 1/4) are set as fractions.
  return (out + closers.reverse().join("")).replace(
    /(^|[^0-9A-Za-z)}^_])([0-9]+|[A-Za-z])\/([0-9]+|[A-Za-z])(?![0-9A-Za-z({^_])/g,
    (_, before: string, num: string, den: string) => `${before}\\f{${num}}{${den}}`,
  );
}

// ---------------------------------------------------------------------------
// Authored computations: what is computed for a question beyond its
// solution's operations.

function sample(f: (x: number) => number, x0: number, x1: number, steps = 64): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / steps;
    return [x, f(x)];
  });
}

/** Question 1: the exponents evaluated directly. */
function question1(): Work {
  const a = 9 ** 0.25;
  const b = 3 ** -0.5;
  return {
    ops: [
      `9^{\\f{1}{4}}=${fixed(a, 7)}`,
      `3^{−\\f{1}{2}}=${fixed(b, 7)}`,
      `${fixed(a, 7)}×${fixed(b, 7)}=${fixed(a * b, 7)}`,
      "log_{3}: 2·\\f{1}{4}−\\f{1}{2}=0 → 3^{0}=1",
    ],
  };
}

/** Question 7: the area as a midpoint Riemann sum, refined until it settles. */
function question7(): Work {
  const f = (x: number) => x * x + 3;
  const g = (x: number) => -(x * x) / 5 + 3;
  const ns = [4, 8, 16, 32, 64, 256];
  const sums = ns.map((n) => {
    const h = 2 / n;
    let total = 0;
    const rects: [number, number, number, number][] = [];
    for (let k = 0; k < n; k++) {
      const m = h * (k + 0.5);
      total += (f(m) - g(m)) * h;
      rects.push([h * k, h * (k + 1), g(m), f(m)]);
    }
    return { n, rects, total };
  });
  const [p, q] = fraction(sums[sums.length - 1].total, 100);
  return {
    ops: [
      "f(x)−g(x)=\\f{6}{5}x^{2}≥0~(0≤x≤2)",
      ...sums.map(({ n, total }) => `S_{${n}}=${fixed(total, 6)}`),
      `S_{n} → \\f{${p}}{${q}}`,
    ],
    plotOps: 1 + sums.length,
    plot: {
      x: [-0.4, 2.4],
      y: [1.6, 8.4],
      curves: [
        { id: "f", points: sample(f, -0.4, 2.3) },
        { id: "g", points: sample(g, -0.4, 2.3) },
      ],
      sums: sums.slice(0, 5).map(({ n, rects }) => ({ n, rects })),
    },
  };
}

/** Question 22: B's condition makes the midpoint a function of b alone; its root is searched. */
function question22(): Work {
  const a = (b: number) => 2 ** (4 * b - 3) - 1 / 4;
  const h = (b: number) => (a(b) + 2 * b) / 2 - 77 / 8;
  const count = 24;
  const xs = Array.from({ length: count }, (_, k) => 1 + k / (count - 1));
  let lo = 1;
  let hi = 2;
  const probes = xs.map((x, k) => {
    const bracket = k + 1 < count && Math.sign(h(x)) !== Math.sign(h(xs[k + 1]));
    if (bracket) [lo, hi] = [x, xs[k + 1]];
    return { id: `b${k}`, x, y: h(x), bracket };
  });
  const [bracketLo, bracketHi] = [lo, hi];
  for (let step = 0; step < 30; step++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(h(mid)) === Math.sign(h(lo))) lo = mid;
    else hi = mid;
  }
  const b = (lo + hi) / 2;
  const av = a(b);
  const [p, q] = fraction(av * b, 1000);
  return {
    ops: [
      "B=(2b, 2a), 2a=4^{2b−1}−\\f{1}{2}",
      "h(b)=\\f{2^{4b−3}−\\f{1}{4}+2b}{2}−\\f{77}{8}",
      `h(1+\\f{k}{${count - 1}}), k=0, 1, …, ${count - 1}`,
      `h(${fixed(bracketLo, 3)})<0<h(${fixed(bracketHi, 3)})`,
      `b_{30}=${fixed(b, 6)}`,
      `a=2^{4b−3}−\\f{1}{4}=${fixed(av, 6)}`,
      `\\f{b+2a}{2}=${fixed((b + 2 * av) / 2, 3)}=\\f{133}{8}`,
      `ab=${fixed(av * b, 4)}=\\f{${p}}{${q}}`,
      `p+q=${q}+${p}=${p + q}`,
    ],
    plotOps: 4,
    plot: {
      x: [0.95, 2.05],
      y: [-9, 9.5],
      curves: [{ id: "h", points: sample(h, 1, 2, 96) }],
      probes,
      root: [b, 0],
    },
  };
}

/**
 * Question 14: the solution drawn on the printed figure (math-2026/figures/
 * p5-circles, points in its own pt coordinates), step by step beside the
 * margin line that uses it.
 */
function question14(): Construction {
  const A: [number, number] = [309 / 4, 725 / 4];
  const B: [number, number] = [594 / 4, 725 / 4];
  const C: [number, number] = [594 / 4, 345 / 4];
  const G: [number, number] = [189 / 4, 575 / 4];
  const H: [number, number] = [72 / 4, 120 / 4];
  const r = 189 / 4;
  const ac = Math.atan2(C[1] - A[1], C[0] - A[0]);
  const ag = Math.atan2(G[1] - A[1], G[0] - A[0]);
  const D: [number, number] = [A[0] + r, A[1]];
  const E: [number, number] = [A[0] + r * Math.cos(ac), A[1] + r * Math.sin(ac)];
  const angle = (from: [number, number], a: [number, number], b: [number, number]) => [
    Math.atan2(a[1] - from[1], a[0] - from[0]),
    Math.atan2(b[1] - from[1], b[0] - from[0]),
  ];
  const [cg, ch] = angle(C, G, H);
  return {
    figure: "p5-circles",
    steps: [
      { line: 0, strokes: [{ k: "seg", from: A, to: C, label: "5" }, { k: "seg", from: A, to: B, label: "3" }, { k: "seg", from: B, to: C, label: "4" }] },
      { line: 1, strokes: [{ k: "arc", center: A, r: 14, a0: ac, a1: 0, label: "∠A" }] },
      { line: 2, strokes: [{ k: "seg", from: A, to: D, label: "2" }] },
      { line: 3, strokes: [{ k: "seg", from: A, to: E, label: "2" }, { k: "seg", from: A, to: G, label: "2" }, { k: "seg", from: E, to: C, label: "3" }] },
      { line: 4, strokes: [{ k: "seg", from: G, to: C, label: "2√6" }, { k: "arc", center: A, r: 20, a0: ag, a1: ac }] },
      { line: 6, strokes: [{ k: "seg", from: G, to: E, label: "√6" }] },
      { line: 8, strokes: [{ k: "poly", points: [C, E, G] }] },
      { line: 10, strokes: [{ k: "circle", center: [302 / 4, 301 / 4], r: 295 / 4 }] },
      { line: 11, strokes: [{ k: "arc", center: C, r: 16, a0: cg, a1: ch + Math.PI * 2, label: "∠A" }] },
      { line: 12, strokes: [{ k: "seg", from: G, to: H, label: "GH" }] },
    ],
  };
}

const authored: Record<number, () => Work> = { 1: question1, 7: question7, 22: question22 };
const constructions: Record<number, () => Construction> = { 14: question14 };

/** The margin work for a question: authored computation where there is one, then its solution's operations. */
export function workFor(solution: Solution, choices: readonly string[] | undefined): Work {
  const own = authored[solution.number]?.();
  const fromSteps = [...new Set(solution.steps.flatMap((step) => operations(step.text)))].map(mathSource);
  const ops = own ? (solution.number === 1 ? [...own.ops, ...fromSteps] : own.ops) : fromSteps;
  const value = evaluate(solution.value);
  const closing =
    choices && value !== null
      ? `${mathSource(solution.value)}≈${fixed(value)}`
      : choices
        ? `=${mathSource(solution.value)}`
        : null;
  return { ...own, ops: closing ? [...ops, closing] : ops, construction: constructions[solution.number]?.() };
}

/** Each choice's value, or null for choices that are not numbers. */
export function choiceValues(choices: readonly string[]) {
  return choices.map((choice) => evaluateChoice(choice));
}
