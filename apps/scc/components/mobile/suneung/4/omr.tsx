import { highlight, Typed } from "./code";
import code from "./code.module.css";
import omr from "./omr.module.css";
import screen from "./screen.module.css";
import type { Solution } from "./work";

// The last screen: the answer sheet, filled when the cell's last line runs.
// 선택형 answers are marked ①–⑤; 단답형 answers by digit, 백·십·일 columns of
// 0–9, only the digits the number has. Then the score and the time the whole
// paper took against the 100 minutes it is set for.

const MARKS = ["①", "②", "③", "④", "⑤"];
const PLACES = ["백", "십", "일"];

function digitsOf(value: string): (number | null)[] {
  const n = Number(value);
  return [Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10].map((digit, place) =>
    n >= [100, 10, 0][place] ? digit : null,
  );
}

/** The answers as the cell writes them, ten to a line. */
function answerLines(solutions: Solution[]) {
  const answers = solutions.map((solution) => (MARKS.includes(solution.answer) ? MARKS.indexOf(solution.answer) + 1 : Number(solution.value)));
  const rows: string[] = [];
  for (let i = 0; i < answers.length; i += 10) rows.push(answers.slice(i, i + 10).join(", "));
  return ["const answers = [", ...rows.map((row, i) => `  ${row}${i < rows.length - 1 ? "," : ""}`), "];", "answers.forEach(mark);"];
}

export function AnswerSheet({ solutions, points }: { solutions: Solution[]; points: number }) {
  const choice = solutions.filter((solution) => MARKS.includes(solution.answer));
  const short = solutions.filter((solution) => !MARKS.includes(solution.answer));
  const lines = answerLines(solutions);
  return (
    <section className={`${screen.screen} ${omr.sheet}`} data-omr>
      <div className={omr.card}>
        <p className={omr.title}>수학 영역 답안지</p>
        <div className={omr.choices}>
          {choice.map((solution) => (
            <div key={solution.number} className={omr.row}>
              <span className={omr.n}>{solution.number}</span>
              {MARKS.map((mark, index) => (
                <span key={mark} className={omr.bubble} data-bubble={mark === solution.answer || undefined}>
                  {index + 1}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className={omr.shorts}>
          {short.map((solution) => {
            const digits = digitsOf(solution.value);
            return (
              <div key={solution.number} className={omr.block}>
                <span className={omr.n}>{solution.number}</span>
                <div className={omr.digits}>
                  {PLACES.map((place) => (
                    <span key={place} className={omr.place}>
                      {place}
                    </span>
                  ))}
                  {Array.from({ length: 10 }, (_, digit) =>
                    PLACES.map((place, column) => (
                      <span key={`${place}${digit}`} className={omr.bubble} data-bubble={digits[column] === digit || undefined}>
                        {digit}
                      </span>
                    )),
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className={code.cell} data-cell>
          {lines.map((text, index) => (
            <div
              key={`sheet.${index}`}
              className={code.line}
              data-row
              data-code
              data-stmt={0}
              data-effects={index === lines.length - 1 ? JSON.stringify([{ k: "fill" }]) : undefined}
            >
              <span className={code.ln}>{String(index + 1).padStart(2, "0")}</span>
              <Typed length={text.length}>{highlight(text, `sheet.${index}`)}</Typed>
            </div>
          ))}
        </div>
        <div className={omr.result}>
          <p className={omr.line} data-row data-result>
            <Typed length={4}>{`${points}점`}</Typed>
          </p>
          <p className={omr.line} data-row data-result data-elapsed>
            <Typed length={20}>시험 시간 100분</Typed>
          </p>
        </div>
      </div>
    </section>
  );
}
