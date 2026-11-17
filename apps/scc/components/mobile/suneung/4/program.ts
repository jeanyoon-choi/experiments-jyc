import { choiceValues, evaluate, jsOf, linear, mathSource, operations, type Solution } from "./work";

// Each question as a cell of real JavaScript: what it reads from the paper,
// what it computes, and how it checks the choices. The cell is run here, when
// the page is built, and each statement's printed output is its actual value;
// the player reruns it in the browser for the time it takes. Derivations from
// solutions.json that are not computed appear as comments, set in LaTeX.
//
// Some questions are solved by their code (1, 2, 7, 14, 16, 17, 22, 23); the
// rest compute the value of the solution and check the choices against it.

/** What a line does on the paper when it is written or run. */
export type Effect =
  | { k: "read"; index: number }
  | { k: "curve"; id: string }
  | { k: "sums" }
  | { k: "points" }
  | { k: "root" }
  | { k: "build"; step: number }
  /** The answer sheet: every answer marked. */
  | { k: "fill" };

export type Line =
  | { k: "code"; text: string; out?: string; stmt?: number; effects?: Effect[] }
  | { k: "out"; text: string; stmt: number }
  | { k: "note"; math: string };

export type Cell = {
  lines: Line[];
  /** The compiled body: statements with their outputs captured into __o. */
  body: string;
  statements: number;
  /** Choice verdicts (true for the answer), if multiple choice. */
  hit: boolean[] | null;
};

/** Code columns the cell is written to; longer lines put their output below. */
const COLUMNS = 46;

type Statement = {
  /** Source lines as shown. */
  code: string[];
  /** Expression whose value is printed; for an expression statement, the statement itself. */
  show?: string;
  expression?: boolean;
  effects?: (Effect[] | undefined)[];
};

const s = (code: string | string[], show?: string, effects?: (Effect[] | undefined)[]): Statement => ({
  code: Array.isArray(code) ? code : [code],
  show,
  effects,
});
const e = (expression: string, effects?: Effect[]): Statement => ({ code: [`${expression};`], show: expression, expression: true, effects: [effects] });
const note = (math: string) => ({ note: math });

type Part = Statement | { note: string };

/** Question-specific programs that solve the question in code; `value` names its result. */
const solved: Record<number, { parts: Part[]; value: string }> = {
  1: {
    parts: [s("const x = 9 ** (1 / 4) * 3 ** (-1 / 2);", "x"), e("Math.round(x * 1e9) / 1e9")],
    value: "Math.round(x * 1e9) / 1e9",
  },
  2: {
    parts: [
      s("const f = (x) => 3 * x ** 3 + 4 * x + 1;"),
      s("const h = 1e-6;"),
      e("(f(1 + h) - f(1)) / h"),
      note("\\L{h→0}\\f{f(1+h)−f(1)}{h}=f′(1)"),
    ],
    value: "Math.round((f(1 + h) - f(1)) / h)",
  },
  7: {
    parts: [
      s("const f = (x) => x ** 2 + 3;", undefined, [[{ k: "curve", id: "f" }]]),
      s("const g = (x) => -(x ** 2) / 5 + 3;", undefined, [[{ k: "curve", id: "g" }]]),
      s("let n = 1e5, area = 0;"),
      s(["for (let k = 0; k < n; k++) {", "  const m = (2 * (k + 0.5)) / n;", "  area += ((f(m) - g(m)) * 2) / n;", "}"], undefined, [[{ k: "sums" }]]),
      e("area"),
    ],
    value: "area",
  },
  14: {
    parts: [
      s("const AB = 3, BC = 4, AD = 2;"),
      s("const AC = Math.hypot(AB, BC);", "AC", [[{ k: "build", step: 0 }]]),
      s("const sinA = BC / AC;", "sinA", [[{ k: "build", step: 1 }, { k: "build", step: 2 }]]),
      s("const AE = AD, AG = AD, CE = AC - AE;", "CE", [[{ k: "build", step: 3 }]]),
      s("const CG = 2 * Math.sqrt(6);", "CG"),
      s(["const cosCAG =", "  (AC ** 2 + AG ** 2 - CG ** 2) / (2 * AC * AG);"], "cosCAG", [undefined, [{ k: "build", step: 4 }]]),
      s(["const GE =", "  Math.sqrt(AE ** 2 + AG ** 2 - 2 * AE * AG * cosCAG);"], "GE", [undefined, [{ k: "build", step: 6 }]]),
      s(["const cosE =", "  (CE ** 2 + GE ** 2 - CG ** 2) / (2 * CE * GE);"], "cosE", [undefined, [{ k: "build", step: 8 }]]),
      s("const R = CG / (2 * Math.sqrt(1 - cosE ** 2));", "R", [[{ k: "build", step: 10 }]]),
      note("∠HCG=∠BAC"),
      s("const GH = 2 * R * sinA;", "GH", [[{ k: "build", step: 11 }, { k: "build", step: 12 }]]),
    ],
    value: "GH",
  },
  16: {
    parts: [s("let a = 1;"), s("for (let n = 1; n <= 2; n++) a = n ** 2 * a + 1;"), e("a")],
    value: "a",
  },
  17: {
    parts: [note("F(x)=∫(4x^{3}−2x)dx=x^{4}−x^{2}+C, F(0)=4"), s("const F = (x) => x ** 4 - x ** 2 + 4;"), e("F(2)")],
    value: "F(2)",
  },
  22: {
    parts: [
      note("B=(2b, 2a), 2a=4^{2b−1}−\\f{1}{2}"),
      s("const a = (b) => 2 ** (4 * b - 3) - 1 / 4;"),
      s("const h = (b) => (a(b) + 2 * b) / 2 - 77 / 8;", undefined, [[{ k: "curve", id: "h" }]]),
      s("let lo = 1, hi = 2;", undefined, [[{ k: "points" }]]),
      s(["for (let i = 0; i < 40; i++) {", "  const mid = (lo + hi) / 2;", "  if (h(mid) < 0) lo = mid;", "  else hi = mid;", "}"]),
      s("const b = Math.round(lo * 1e9) / 1e9;", "b", [[{ k: "root" }]]),
      s("const ab = a(b) * b;", "ab"),
      s("let p = 1;"),
      s("while (Math.abs(ab * p - Math.round(ab * p)) > 1e-9) p++;"),
      e("[Math.round(ab * p), p]"),
    ],
    value: "Math.round(ab * p) + p",
  },
  23: {
    parts: [s("const f = (x) => Math.tan(6 * x) / (2 * x);"), e("f(1e-3)"), e("f(1e-9)")],
    value: "f(1e-9)",
  },
};

/** A printed value, as a console would show it. */
function print(v: unknown): string {
  if (typeof v === "number") {
    const text = String(v);
    return text.length > 18 ? String(Number(v.toPrecision(12))) : text;
  }
  if (Array.isArray(v)) return `[${v.map(print).join(", ")}]`;
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
}

/** The equations of a question in reading order (the same order the player finds them in the page). */
export function equationsOf(texts: string[]) {
  const out: string[] = [];
  for (const text of texts) {
    if (text.startsWith("\u0000eq:")) out.push(text.slice(4));
    else text.split("$").forEach((part, i) => i % 2 === 1 && out.push(part));
  }
  return out;
}

export function cellFor({
  solution,
  equations,
  choices,
}: {
  solution: Solution;
  equations: string[];
  choices: readonly string[] | undefined;
}): Cell {
  const parts: Part[] = [];
  const own = solved[solution.number];
  const points = solution.points ? ` · ${solution.points}점` : "";
  parts.push(note(`\\t{${solution.number}. ${solution.topic ?? ""}${points}}`));

  // What it reads: the question's equations, one string per line.
  const read = equations.slice(0, 8).map(linear);
  if (read.length) {
    parts.push(
      s(
        ["const given = [", ...read.map((text) => `  ${JSON.stringify(text)},`), "];"],
        undefined,
        [undefined, ...read.map((_, index): Effect[] => [{ k: "read", index }]), undefined],
      ),
    );
  }

  if (own) parts.push(...own.parts);
  else {
    // The solution's operations, set as maths in comments.
    const ops = [...new Set(solution.steps.flatMap((step) => operations(step.text)))];
    for (const op of ops.slice(0, 7)) parts.push(note(mathSource(op)));
  }

  const values = choices ? choiceValues(choices) : [];
  const numeric = choices && values.every((v) => v !== null);
  let hitExpression: string | null = null;
  if (choices) {
    const valueCode = own ? own.value : jsOf(solution.value);
    if (numeric && valueCode) {
      parts.push(s(`const value = ${valueCode};`, "value"));
      const list = choices.map((choice) => jsOf(linear(choice.replace(/\$/g, ""))) ?? "NaN");
      const oneLine = `const choices = [${list.join(", ")}];`;
      parts.push(s(oneLine.length <= COLUMNS ? oneLine : ["const choices = [", ...list.map((item) => `  ${item},`), "];"]));
      parts.push(s(["const hit = choices.map(", "  (c) => Math.abs(c - value) < 1e-6,", ");"], "hit"));
    } else {
      parts.push(s(`const value = ${JSON.stringify(solution.value)};`, "value"));
      parts.push(s(`const choices = [${choices.map((choice) => JSON.stringify(choice)).join(", ")}];`));
      parts.push(s("const hit = choices.map((c) => c === value);", "hit"));
    }
    hitExpression = "hit";
    parts.push(s("const answer = hit.indexOf(true) + 1;", "answer"));
  } else {
    parts.push(s(`const answer = ${own ? own.value : (jsOf(solution.value) ?? JSON.stringify(solution.value))};`, "answer"));
  }

  // Compile and run.
  const statements = parts.filter((part): part is Statement => !("note" in part));
  const body = statements
    .map((statement, i) =>
      statement.expression ? `__o[${i}] = (${statement.show});` : `${statement.code.join("\n")}\n${statement.show ? `__o[${i}] = (${statement.show});` : ""}`,
    )
    .join("\n");
  const run = new Function("__o", `${body}\n${hitExpression ? `__o.hit = ${hitExpression};` : ""}\nreturn __o;`) as (o: unknown[]) => unknown[] & { hit?: boolean[] };
  const outputs = run([]);
  const answer = outputs[statements.length - 1];
  const expected = choices ? ["①", "②", "③", "④", "⑤"].indexOf(solution.answer) + 1 : evaluate(solution.value);
  if (answer !== expected) throw new Error(`question ${solution.number}: the cell gives ${print(answer)}, the answer is ${expected}`);

  const lines: Line[] = [];
  let index = 0;
  for (const part of parts) {
    if ("note" in part) {
      lines.push({ k: "note", math: part.note });
      continue;
    }
    const stmt = index++;
    const out = part.show !== undefined ? `// → ${print(outputs[stmt])}` : undefined;
    part.code.forEach((text, j) => {
      const lastLine = j === part.code.length - 1;
      const effects = part.effects?.[j];
      const inline = lastLine && out && text.length + out.length + 2 <= COLUMNS;
      lines.push({ k: "code", text, stmt, effects, out: inline ? out : undefined });
      if (lastLine && out && !inline) lines.push({ k: "out", text: out, stmt });
    });
  }
  return { lines, body, statements: statements.length, hit: outputs.hit ?? null };
}
