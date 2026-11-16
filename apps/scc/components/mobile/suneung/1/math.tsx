import { Fragment, type ReactNode } from "react";
import styles from "./text.module.css";

// A small typesetter for the booklet's HWP 수식 in live text that reflows with
// the screen. Source syntax (inside $…$ in question text):
//   x^2  x^{n+1}  a_n  a_{2k+1}       scripts on the atom before
//   \f{num}{den}                      fraction
//   \r{radicand}                      square root
//   \o{AB}                            segment overline
//   \S{k=1}{n}                        Σ with limits;  \I{0}{2}  ∫ with limits
//   \L{x→0}                           lim with its approach below
//   \c{expr & cond ; expr & cond}     piecewise (cases)
//   \b{(가)}                          boxed blank
//   \t{텍스트}                        Korean inside an equation
//   \{ \}                             literal braces;  ~  thin space
// Lower-case letters and θ π are italic; capitals (point names), digits and
// the function names log lim sin cos tan ln are upright, as in the booklet.

type Node =
  | { k: "text"; t: string; italic: boolean }
  | { k: "op"; t: string }
  | { k: "fn"; t: string }
  | { k: "ko"; t: string }
  | { k: "group"; c: Node[] }
  | { k: "scripts"; base: Node; sup?: Node[]; sub?: Node[] }
  | { k: "frac"; num: Node[]; den: Node[] }
  | { k: "root"; c: Node[] }
  | { k: "over"; c: Node[] }
  | { k: "sum"; lo: Node[]; hi: Node[] }
  | { k: "int"; lo: Node[]; hi: Node[] }
  | { k: "lim"; sub: Node[] }
  | { k: "cases"; rows: [Node[], Node[]][] }
  | { k: "blank"; c: Node[] }
  | { k: "space" };

const FUNCTIONS = ["log", "lim", "sin", "cos", "tan", "ln"];
/** Binary relations and operators that take space on both sides. */
const RELATIONS = new Set(["=", "<", ">", "≤", "≥", "≠", "→"]);
const BINARY = new Set(["+", "−", "×", "±"]);

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  parse(): Node[] {
    const out = this.sequence(null);
    return out;
  }

  private group(): Node[] {
    if (this.s[this.i] === "{") {
      this.i++;
      return this.sequence("}");
    }
    // A single atom.
    const atom = this.atom();
    return atom ? [atom] : [];
  }

  private sequence(end: string | null): Node[] {
    const out: Node[] = [];
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      if (end && ch === end) {
        this.i++;
        return out;
      }
      if (ch === "^" || ch === "_") {
        this.i++;
        const script = this.group();
        const last = out.pop() ?? { k: "text", t: "", italic: false };
        const node: Extract<Node, { k: "scripts" }> = last.k === "scripts" ? last : { k: "scripts", base: last };
        if (ch === "^") node.sup = script;
        else node.sub = script;
        out.push(node);
        continue;
      }
      const atom = this.atom(end);
      if (atom) out.push(atom);
    }
    return out;
  }

  /** Cases body: rows split by ';', cells by '&', up to the closing brace. */
  private rows(): [Node[], Node[]][] {
    this.i++; // {
    let depth = 0;
    const start = this.i;
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      if (ch === "\\") {
        this.i += 2;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") {
        if (depth === 0) break;
        depth--;
      }
      this.i++;
    }
    const body = this.s.slice(start, this.i);
    this.i++; // }
    const split = (text: string, sep: string) => {
      const parts: string[] = [];
      let level = 0;
      let from = 0;
      for (let j = 0; j < text.length; j++) {
        if (text[j] === "\\") {
          j++;
          continue;
        }
        if (text[j] === "{") level++;
        else if (text[j] === "}") level--;
        else if (text[j] === sep && level === 0) {
          parts.push(text.slice(from, j));
          from = j + 1;
        }
      }
      parts.push(text.slice(from));
      return parts;
    };
    return split(body, ";").map((row) => {
      const [expr, cond = ""] = split(row, "&");
      return [new Parser(expr.trim()).parse(), new Parser(cond.trim()).parse()];
    });
  }

  private atom(end: string | null = null): Node | null {
    const s = this.s;
    const ch = s[this.i];
    if (ch === " ") {
      this.i++;
      return null;
    }
    if (ch === "~") {
      this.i++;
      return { k: "space" };
    }
    if (ch === "{") {
      this.i++;
      return { k: "group", c: this.sequence("}") };
    }
    if (ch === "\\") {
      const command = s[this.i + 1];
      this.i += 2;
      switch (command) {
        case "{":
        case "}":
          return { k: "text", t: command, italic: false };
        case "f": {
          const num = this.group();
          return { k: "frac", num, den: this.group() };
        }
        case "r":
          return { k: "root", c: this.group() };
        case "o":
          return { k: "over", c: this.group() };
        case "S": {
          const lo = this.group();
          return { k: "sum", lo, hi: this.group() };
        }
        case "I": {
          const lo = this.group();
          return { k: "int", lo, hi: this.group() };
        }
        case "L":
          return { k: "lim", sub: this.group() };
        case "c":
          return { k: "cases", rows: this.rows() };
        case "b":
          return { k: "blank", c: this.group() };
        case "t": {
          this.i++; // {
          const close = s.indexOf("}", this.i);
          const t = s.slice(this.i, close);
          this.i = close + 1;
          return { k: "ko", t };
        }
        default:
          return { k: "text", t: command, italic: false };
      }
    }
    if (end && ch === end) return null;
    const fn = FUNCTIONS.find((name) => s.startsWith(name, this.i));
    if (fn) {
      this.i += fn.length;
      return { k: "fn", t: fn };
    }
    if (/[0-9.]/.test(ch)) {
      let j = this.i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const t = s.slice(this.i, j);
      this.i = j;
      return { k: "text", t, italic: false };
    }
    this.i++;
    if (/[a-zθπ]/.test(ch)) return { k: "text", t: ch, italic: true };
    if (RELATIONS.has(ch) || BINARY.has(ch)) return { k: "op", t: ch };
    if (/[가-힣]/.test(ch)) return { k: "ko", t: ch };
    return { k: "text", t: ch, italic: false };
  }
}

function isOperand(node: Node | undefined) {
  if (!node) return false;
  if (node.k === "op" || node.k === "space") return false;
  if (node.k === "text" && /^[(\[{,:]$/.test(node.t)) return false;
  return true;
}

function render(nodes: Node[], key = ""): ReactNode[] {
  return nodes.map((node, index) => {
    const id = `${key}${index}`;
    switch (node.k) {
      case "text":
        return node.italic ? (
          <i key={id} className={styles.mi}>
            {node.t}
          </i>
        ) : (
          <span key={id} className={node.t === "," ? styles.comma : undefined}>
            {node.t}
          </span>
        );
      case "op": {
        // A sign at the start of an expression or after another operator is unary: no space.
        const binary = RELATIONS.has(node.t) || (isOperand(nodes[index - 1]) && index + 1 < nodes.length);
        return (
          <span key={id} className={binary ? (RELATIONS.has(node.t) ? styles.rel : styles.bin) : undefined}>
            {node.t}
          </span>
        );
      }
      case "fn":
        return (
          <span key={id} className={styles.fn}>
            {node.t}
          </span>
        );
      case "ko":
        return (
          <span key={id} className={styles.ko}>
            {node.t}
          </span>
        );
      case "space":
        return <span key={id} className={styles.thin} />;
      case "group":
        return <Fragment key={id}>{render(node.c, `${id}.`)}</Fragment>;
      case "scripts":
        return (
          <span key={id} className={styles.scripted}>
            {render([node.base], `${id}b`)}
            {node.sup && node.sub ? (
              <span className={styles.stack}>
                <span className={styles.script}>{render(node.sup, `${id}u`)}</span>
                <span className={styles.script}>{render(node.sub, `${id}d`)}</span>
              </span>
            ) : node.sup ? (
              <span className={`${styles.script} ${styles.sup}`}>{render(node.sup, `${id}u`)}</span>
            ) : (
              <span className={`${styles.script} ${styles.sub}`}>{render(node.sub ?? [], `${id}d`)}</span>
            )}
          </span>
        );
      case "frac":
        return (
          <span key={id} className={styles.frac}>
            <span className={styles.num}>{render(node.num, `${id}n`)}</span>
            <span className={styles.den}>{render(node.den, `${id}d`)}</span>
          </span>
        );
      case "root":
        return (
          <span key={id} className={styles.root}>
            <span className={styles.radical}>√</span>
            <span className={styles.radicand}>{render(node.c, `${id}r`)}</span>
          </span>
        );
      case "over":
        return (
          <span key={id} className={styles.over}>
            {render(node.c, `${id}o`)}
          </span>
        );
      case "sum":
      case "int":
        return node.k === "sum" ? (
          <span key={id} className={styles.limits}>
            <span className={styles.script}>{render(node.hi, `${id}h`)}</span>
            <span className={styles.large}>Σ</span>
            <span className={styles.script}>{render(node.lo, `${id}l`)}</span>
          </span>
        ) : (
          <span key={id} className={styles.integral}>
            <span className={styles.large}>∫</span>
            <span className={styles.stack}>
              <span className={styles.script}>{render(node.hi, `${id}h`)}</span>
              <span className={styles.script}>{render(node.lo, `${id}l`)}</span>
            </span>
          </span>
        );
      case "lim":
        return (
          <span key={id} className={styles.lim}>
            <span className={styles.fn}>lim</span>
            <span className={styles.script}>{render(node.sub, `${id}s`)}</span>
          </span>
        );
      case "cases":
        return (
          <span key={id} className={styles.cases}>
            <span className={styles.brace} style={{ fontSize: `${0.9 + node.rows.length * 0.75}em` }}>
              {"{"}
            </span>
            <span className={styles.caseRows}>
              {node.rows.map(([expr, cond], row) => (
                <Fragment key={`${id}r${row}`}>
                  <span>{render(expr, `${id}r${row}e`)}</span>
                  <span>{render(cond, `${id}r${row}c`)}</span>
                </Fragment>
              ))}
            </span>
          </span>
        );
      case "blank":
        return (
          <span key={id} className={styles.blank}>
            {render(node.c, `${id}b`)}
          </span>
        );
    }
  });
}

export function Equation({ source }: { source: string }) {
  return <span className={styles.math}>{render(new Parser(source).parse())}</span>;
}

/** Korean text with $…$ equations. */
export function Text({ source }: { source: string }) {
  const parts = source.split("$");
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Equation key={index} source={part} />
        ) : part ? (
          // The score keeps to its question: no line break before [2점] [3점] [4점].
          <Fragment key={index}>{part.replace(/ \[(\d)점\]/g, "\u00a0[$1점]")}</Fragment>
        ) : null,
      )}
    </>
  );
}
