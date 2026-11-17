import { figures, pages } from "../math-2026";
import { equation, equationSymbols, gothic, myeongjo, oldHangul } from "../paper/fonts";
import solutions from "../math-2026/solutions.json";
import { booklet } from "./booklet";
import { BookletReader } from "./booklet-reader";
import { QuestionScreen } from "./screen";
import type { Solution } from "./solution";

const solutionByNumber = new Map((solutions.questions as Solution[]).map((solution) => [solution.number, solution]));

const pageByNumber = new Map(pages.map((page) => [page.n, page]));

/** Printed size of every figure, from its box on the sheet. */
const sizes: Record<string, { w: number; h: number }> = {};
for (const page of pages) {
  for (const item of page.items) if (item.k === "fig") sizes[item.id] = { w: item.w, h: item.h };
}

/**
 * The mobile booklet of /1 with each question's solution written out under it
 * at the authored pace, lecture-style, turning to the next question when it
 * ends; scrolling to a question starts its solution there.
 */
export default function SuneungMathLecture() {
  return (
    <BookletReader className={`${myeongjo.variable} ${gothic.variable} ${oldHangul.variable} ${equation.variable} ${equationSymbols.variable}`}>
      {booklet.map((question) => {
        return (
          <QuestionScreen
            key={question.n}
            question={question}
            pages={pageByNumber}
            figures={figures}
            sizes={sizes}
            solution={solutionByNumber.get(question.n)}
          />
        );
      })}
    </BookletReader>
  );
}
