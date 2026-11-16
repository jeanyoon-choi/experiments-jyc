import type { ComponentType, CSSProperties } from "react";
import type { PaperPage } from "../paper/types";
import type { Block, BookletQuestion } from "./booklet";
import { footerFor, headerFor } from "./chrome";
import { PaperCut } from "./cut";
import { Equation, Text } from "./math";
import screen from "./screen.module.css";
import { SolutionView, type Solution } from "./solution";
import styles from "./text.module.css";

export type Figures = Record<string, ComponentType>;
type FigureSizes = Record<string, { w: number; h: number }>;

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤"];

function BlockView({ block, figures, sizes, id }: { block: Block; figures: Figures; sizes: FigureSizes; id: string }) {
  switch (block.k) {
    case "p":
      return (
        <p className={styles.p}>
          <Text source={block.t} />
        </p>
      );
    case "eq":
      return (
        <div className={styles.eq} data-eq>
          <Equation source={block.t} />
        </div>
      );
    case "box":
      return block.label ? (
        <fieldset className={styles.box}>
          <legend className={styles.legend}>&lt;보 기&gt;</legend>
          {block.c.map((child, index) => (
            <BlockView key={`${id}.${index}`} id={`${id}.${index}`} block={child} figures={figures} sizes={sizes} />
          ))}
        </fieldset>
      ) : (
        <div className={styles.box}>
          {block.c.map((child, index) => (
            <BlockView key={`${id}.${index}`} id={`${id}.${index}`} block={child} figures={figures} sizes={sizes} />
          ))}
        </div>
      );
    case "items":
      return (
        <div className={styles.items}>
          {block.c.map(([mark, text], index) => (
            <ItemRow key={`${id}.${index}`} mark={mark} text={text} />
          ))}
        </div>
      );
    case "fig": {
      const Figure = figures[block.id];
      const size = sizes[block.id];
      if (!Figure || !size) return null;
      return (
        <div className={styles.figure} data-fig-w={size.w} style={{ "--w": size.w, "--h": size.h } as CSSProperties}>
          <div className={styles.figureInner} style={{ width: size.w, height: size.h }}>
            <Figure />
          </div>
        </div>
      );
    }
    case "choices":
      return (
        <div className={styles.choices}>
          {block.c.map((choice, index) => (
            <span key={CHOICE_MARKS[index]} className={styles.choice} data-choice={CHOICE_MARKS[index]}>
              <span className={styles.mark}>
                {CHOICE_MARKS[index]}
                <PenCircle />
              </span>
              <span>
                <Text source={choice} />
              </span>
            </span>
          ))}
        </div>
      );
  }
}

/** The lecturer's pen loop around the answer, drawn by the player at the end of a solution. */
function PenCircle() {
  return (
    <svg className={styles.penCircle} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M31 9 C25 3 10 4 6 14 C2 25 10 35 21 35 C32 35 37 25 34 15 C32 9 26 6 18 7" pathLength={1} />
    </svg>
  );
}

/** The marker's red circle over the question number, drawn by the player once the answer is marked. */
function GradeCircle() {
  return (
    <svg className={styles.grade} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M64 9 C40 1 11 18 8 48 C5 79 30 96 55 93 C81 90 96 68 92 43 C88 20 66 7 41 12" pathLength={1} />
    </svg>
  );
}

function ItemRow({ mark, text }: { mark: string; text: string }) {
  return (
    <>
      <span>{mark}</span>
      <span>
        <Text source={text} />
      </span>
    </>
  );
}

/** One question in the paper's frame, with its solution written out under it by the player. */
export function QuestionScreen({
  question,
  pages,
  total,
  figures,
  sizes,
  solution,
}: {
  question: BookletQuestion;
  pages: ReadonlyMap<number, PaperPage>;
  total: number;
  figures: Figures;
  sizes: FigureSizes;
  solution?: Solution;
}) {
  const [first, ...rest] = question.blocks;
  return (
    <section className={screen.screen} data-question={question.n}>
      <PaperCut region={headerFor(question.n, pages)} scale="header" className={screen.header} />
      <div className={`${screen.body} ${styles.question}`}>
        {first?.k === "p" ? (
          <p className={`${styles.p} ${styles.stem}`}>
            <span className={styles.number}>
              {question.n}.
              <GradeCircle />
            </span>
            <Text source={first.t} />
          </p>
        ) : null}
        {rest.map((block, index) => (
          <BlockView key={`${question.n}.${index}`} id={`${question.n}.${index}`} block={block} figures={figures} sizes={sizes} />
        ))}
        {solution ? <SolutionView solution={solution} /> : null}
      </div>
      <PaperCut region={footerFor(question.n, total, pages)} scale="body" className={screen.footer} />
    </section>
  );
}
