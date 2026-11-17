import { figures, pages } from "../math-2026";
import solutions from "../math-2026/solutions.json";
import { equation, equationSymbols, gothic, myeongjo, oldHangul } from "../paper/fonts";
import { booklet } from "./booklet";
import { BookletReader } from "./booklet-reader";
import { AnswerSheet } from "./omr";
import { QuestionScreen } from "./screen";
import type { Solution } from "./work";

const all = solutions.questions as Solution[];
const solutionByNumber = new Map(all.map((solution) => [solution.number, solution]));

const pageByNumber = new Map(pages.map((page) => [page.n, page]));

/** Printed size of every figure, from its box on the sheet. */
const sizes: Record<string, { w: number; h: number }> = {};
for (const page of pages) {
  for (const item of page.items) if (item.k === "fig") sizes[item.id] = { w: item.w, h: item.h };
}

/**
 * The mobile booklet of /1 worked by a swarm of agents: each question is read,
 * computed in its margin and checked against its choices in parallel by
 * multiplayer cursors, marked, graded, and left for the next; the answer
 * sheet is filled at the end.
 */
export default function SuneungMathSwarm() {
  return (
    <BookletReader className={`${myeongjo.variable} ${gothic.variable} ${oldHangul.variable} ${equation.variable} ${equationSymbols.variable}`}>
      {booklet.map((question) => (
        <QuestionScreen
          key={question.n}
          question={question}
          pages={pageByNumber}
          figures={figures}
          sizes={sizes}
          solution={solutionByNumber.get(question.n)}
        />
      ))}
      <AnswerSheet solutions={all} points={solutions.score.points} />
    </BookletReader>
  );
}
