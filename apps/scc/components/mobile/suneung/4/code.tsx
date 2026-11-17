import type { ReactNode } from "react";
import styles from "./code.module.css";
import { Equation } from "./math";
import type { Cell } from "./program";

// A question's cell, laid out whole and hidden: the player streams each line
// in (a clip at measured glyph edges), runs it (a line marker), and shows each
// statement's output where it was printed. Code is syntax-coloured; the
// derivations in comments are set in LaTeX.

const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|(\b(?:const|let|for|while|if|else|return|true|false|of|in)\b)|([A-Za-z_$][\w$]*(?=\())|([A-Za-z_$][\w$]*)|(=>|\*\*|[-+*/%=<>!&|?:]+)|([()[\]{},;.])/g;
const CLASSES = [styles.comment, styles.string, styles.number, styles.keyword, styles.fn, styles.ident, styles.op, styles.punct];

/** A line of JavaScript as coloured tokens, spaces kept. */
export function highlight(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const group = match.slice(1).findIndex((value) => value !== undefined);
    out.push(
      <span key={`${key}.${index++}`} className={CLASSES[group]}>
        {match[0]}
      </span>,
    );
    last = at + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Typed({ children, length, className }: { children: ReactNode; length: number; className?: string }) {
  return (
    <span className={`${styles.typed} ${className ?? ""}`} data-type data-len={length}>
      <span className={styles.ink} data-ink>
        {children}
      </span>
      <span className={styles.caret} data-caret />
    </span>
  );
}

const number = (n: number) => String(n).padStart(2, "0");

export function CellView({ cell, id, answerOut }: { cell: Cell; id: string; answerOut: boolean }) {
  const lastStatement = cell.statements - 1;
  let n = 0;
  return (
    <div className={styles.cell} data-cell data-body={cell.body}>
      {cell.lines.map((line, index) => {
        const key = `${id}.${index}`;
        if (line.k === "note") {
          return (
            <div key={key} className={`${styles.line} ${styles.note}`} data-row>
              <span className={styles.ln}>{number(++n)}</span>
              <Typed length={line.math.length}>
                <span className={styles.comment}>{"// "}</span>
                <Equation source={line.math} />
              </Typed>
            </div>
          );
        }
        if (line.k === "out") {
          return (
            <div key={key} className={styles.line} data-row data-out-line data-stmt={line.stmt}>
              <span className={styles.ln}>{number(++n)}</span>
              <span className={`${styles.out} ${answerOut && line.stmt === lastStatement ? styles.answer : ""}`} data-out>
                {line.text}
              </span>
            </div>
          );
        }
        return (
          <div
            key={key}
            className={styles.line}
            data-row
            data-code
            data-stmt={line.stmt}
            data-effects={line.effects ? JSON.stringify(line.effects) : undefined}
          >
            <span className={styles.ln}>{number(++n)}</span>
            <Typed length={line.text.length}>{highlight(line.text, key)}</Typed>
            {line.out ? (
              <span className={`${styles.out} ${answerOut && line.stmt === lastStatement ? styles.answer : ""}`} data-out>
                {line.out}
              </span>
            ) : null}
          </div>
        );
      })}
      <div className={styles.line} data-row data-runtime>
        <span className={styles.ln}>{number(++n)}</span>
        <span className={`${styles.out} ${styles.time}`} data-out data-time={cell.statements}>
          {`// ${cell.statements} statements · 0.000 ms`}
        </span>
      </div>
    </div>
  );
}
