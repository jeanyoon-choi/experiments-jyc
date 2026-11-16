import { figures, pages } from "../math-2026";
import { equation, equationSymbols, gothic, myeongjo, oldHangul } from "../paper/fonts";
import { booklet } from "./booklet";
import { BookletReader } from "./booklet-reader";
import { QuestionScreen } from "./screen";

const pageByNumber = new Map(pages.map((page) => [page.n, page]));

/** Printed size of every figure, from its box on the sheet. */
const sizes: Record<string, { w: number; h: number }> = {};
for (const page of pages) {
  for (const item of page.items) if (item.k === "fig") sizes[item.id] = { w: item.w, h: item.h };
}

/**
 * The 2026 수능 수학 (공통 + 미적분) for mobile: one question per screen, set as
 * live text that reflows to the screen inside the paper's printed header and
 * page-number footer.
 */
export default function SuneungMathMobile() {
  return (
    <BookletReader className={`${myeongjo.variable} ${gothic.variable} ${oldHangul.variable} ${equation.variable} ${equationSymbols.variable}`}>
      {booklet.map((question) => {
        return <QuestionScreen key={question.n} question={question} pages={pageByNumber} total={booklet.length} figures={figures} sizes={sizes} />;
      })}
    </BookletReader>
  );
}
