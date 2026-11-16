import styles from "./text.module.css";

// A question's authored solution (math-2026/solutions.json). The steps are all
// in the DOM from the start, hidden; the player reveals them at their authored
// times, character by character, keeping the unwritten rest of a line in place
// so the text never reflows while it is written.

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
          hidden
        >
          <span data-shown />
          <span className={styles.rest} data-rest>
            {step.text}
          </span>
        </p>
      ))}
      {multipleChoice ? null : (
        <p className={styles.final} data-final hidden>
          답<span className={styles.value}>{solution.value}</span>
        </p>
      )}
    </div>
  );
}
