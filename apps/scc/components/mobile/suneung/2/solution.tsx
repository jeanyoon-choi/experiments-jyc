import styles from "./text.module.css";

// A question's authored solution (math-2026/solutions.json). Every step is
// laid out from the start with its text invisible, so the block's final size
// is known before writing begins (the player decides where it goes) and lines
// never reflow while they are written. The player writes each step through
// its caret, character by character.

export type SolutionStep = { id: string; atMs: number; durationMs: number; text: string };
export type Solution = {
  number: number;
  startMs: number;
  durationMs: number;
  steps: SolutionStep[];
  answer: string;
  value: string;
};

const MARKS = ["①", "②", "③", "④", "⑤"];

export function SolutionView({ solution }: { solution: Solution }) {
  const multipleChoice = MARKS.includes(solution.answer);
  return (
    <div className={styles.solution} data-solution data-duration={solution.durationMs} data-answer={multipleChoice ? solution.answer : undefined}>
      {solution.steps.map((step) => (
        <p
          key={step.id}
          className={styles.step}
          data-step
          data-at={step.atMs - solution.startMs}
          data-dur={step.durationMs}
          data-text={step.text}
        >
          <span data-shown />
          <span className={styles.caret} data-caret />
          <span className={styles.rest} data-rest>
            {step.text}
          </span>
        </p>
      ))}
      {multipleChoice ? null : (
        <p className={styles.final} data-final>
          답<span className={styles.value}>{solution.value}</span>
        </p>
      )}
    </div>
  );
}
