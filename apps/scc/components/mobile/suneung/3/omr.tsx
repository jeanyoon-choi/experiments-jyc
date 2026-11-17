import omr from "./omr.module.css";
import screen from "./screen.module.css";
import { Typed } from "./screen";
import swarm from "./swarm.module.css";
import type { Solution } from "./work";

// The last screen: the answer sheet, filled by the swarm in one pass. 선택형
// answers are marked ①–⑤; 단답형 answers by digit, 백·십·일 columns of 0–9,
// only the digits the number has. Under it, the score and the time the whole
// paper took against the 100 minutes it is set for.

const MARKS = ["①", "②", "③", "④", "⑤"];
const PLACES = ["백", "십", "일"];

function digitsOf(value: string): (number | null)[] {
  const n = Number(value);
  return [Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10].map((digit, place) =>
    n >= [100, 10, 0][place] ? digit : null,
  );
}

export function AnswerSheet({ solutions, points }: { solutions: Solution[]; points: number }) {
  const choice = solutions.filter((solution) => MARKS.includes(solution.answer));
  const short = solutions.filter((solution) => !MARKS.includes(solution.answer));
  const line = (key: string, text: string, data?: string) => (
    <p key={key} className={omr.line} data-op>
      <Typed data={data} length={text.length}>
        {text}
      </Typed>
    </p>
  );
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
        <div className={omr.result}>
          {line("score", `${points}점`)}
          {line("time", "시험 시간 100분", "elapsed")}
        </div>
      </div>
      <div className={swarm.layer} data-layer />
    </section>
  );
}
