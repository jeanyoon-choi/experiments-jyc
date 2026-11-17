import type { ComponentType, CSSProperties } from "react";
import type { PaperPage } from "../paper/types";
import type { Block, BookletQuestion } from "./booklet";
import { headerFor } from "./chrome";
import { CellView } from "./code";
import code from "./code.module.css";
import { PaperCut } from "./cut";
import { Equation, Text } from "./math";
import { PlotView } from "./plot";
import { cellFor, equationsOf } from "./program";
import screen from "./screen.module.css";
import styles from "./text.module.css";
import { workFor, type Construction, type Solution, type Stroke } from "./work";

export type Figures = Record<string, ComponentType>;
type FigureSizes = Record<string, { w: number; h: number }>;

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤"];

const pt = (p: readonly [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

function strokePath(stroke: Stroke) {
  switch (stroke.k) {
    case "seg":
      return `M${pt(stroke.from)}L${pt(stroke.to)}`;
    case "poly":
      return `M${stroke.points.map(pt).join("L")}Z`;
    case "circle":
    case "arc": {
      const [a0, a1] = stroke.k === "circle" ? [0, Math.PI * 2] : [stroke.a0, stroke.a1];
      const steps = 48;
      return Array.from({ length: steps + 1 }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / steps;
        return `${i ? "L" : "M"}${pt([stroke.center[0] + stroke.r * Math.cos(a), stroke.center[1] + stroke.r * Math.sin(a)])}`;
      }).join("");
    }
  }
}

function labelAt(stroke: Stroke): [number, number] | null {
  if (stroke.k === "seg") {
    const [x0, y0] = stroke.from;
    const [x1, y1] = stroke.to;
    const length = Math.hypot(x1 - x0, y1 - y0) || 1;
    return [(x0 + x1) / 2 + ((y1 - y0) / length) * 7, (y0 + y1) / 2 - ((x1 - x0) / length) * 7 + 3];
  }
  if (stroke.k === "arc") {
    const a = (stroke.a0 + stroke.a1) / 2;
    return [stroke.center[0] + (stroke.r + 8) * Math.cos(a), stroke.center[1] + (stroke.r + 8) * Math.sin(a) + 3];
  }
  return null;
}

/** The construction over a printed figure, in its pt coordinates; the cell's lines draw each step as they run. */
function ConstructionView({ construction, w, h }: { construction: Construction; w: number; h: number }) {
  return (
    <svg className={code.construction} viewBox={`0 0 ${w} ${h}`} width={w} height={h} data-construction aria-hidden="true">
      {construction.steps.map((step) => (
        <g key={`step${step.line}`} data-cstep={step.line}>
          {step.strokes.map((stroke, index) => {
            const label = "label" in stroke ? stroke.label : undefined;
            const at = label ? labelAt(stroke) : null;
            return (
              <g key={`step${step.line}.${index}`}>
                <path
                  className={stroke.k === "poly" ? code.cfill : code.cstroke}
                  d={strokePath(stroke)}
                  pathLength={1}
                  data-cpath
                  data-fill={stroke.k === "poly" || undefined}
                />
                {label && at ? (
                  <text className={code.clabel} x={at[0]} y={at[1]} textAnchor="middle" data-clabel>
                    {label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function BlockView({
  block,
  figures,
  sizes,
  id,
  hit,
  construction,
}: {
  block: Block;
  figures: Figures;
  sizes: FigureSizes;
  id: string;
  hit: readonly boolean[] | null;
  construction?: Construction;
}) {
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
            <BlockView key={`${id}.${index}`} id={`${id}.${index}`} block={child} figures={figures} sizes={sizes} hit={hit} />
          ))}
        </fieldset>
      ) : (
        <div className={styles.box}>
          {block.c.map((child, index) => (
            <BlockView key={`${id}.${index}`} id={`${id}.${index}`} block={child} figures={figures} sizes={sizes} hit={hit} />
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
        <div className={styles.figure} data-fig-w={size.w} data-fig-h={size.h} style={{ "--w": size.w, "--h": size.h } as CSSProperties}>
          <div className={styles.figureInner} style={{ width: size.w, height: size.h }}>
            <Figure />
            {construction?.figure === block.id ? <ConstructionView construction={construction} w={size.w} h={size.h} /> : null}
          </div>
        </div>
      );
    }
    case "choices":
      return (
        <div className={styles.choices} data-choices>
          {block.c.map((choice, index) => (
            <span key={CHOICE_MARKS[index]} className={styles.choice} data-choice={CHOICE_MARKS[index]}>
              <span className={styles.mark}>
                {CHOICE_MARKS[index]}
                <PenCircle />
              </span>
              <span className={code.choiceText}>
                <Text source={choice} />
                <span className={code.strike} data-strike />
              </span>
              {hit ? (
                <span className={code.verdict} data-verdict data-true={hit[index] || undefined}>
                  {hit[index] ? "true" : "false"}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      );
  }
}

function PenCircle() {
  return (
    <svg className={styles.penCircle} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M31 9 C25 3 10 4 6 14 C2 25 10 35 21 35 C32 35 37 25 34 15 C32 9 26 6 18 7" pathLength={1} />
    </svg>
  );
}

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

/** The question's texts in reading order, for the equations its cell reads. */
function textsOf(blocks: readonly Block[]): string[] {
  return blocks.flatMap((block): string[] => {
    switch (block.k) {
      case "p":
        return [block.t];
      case "eq":
        return [`\u0000eq:${block.t}`];
      case "box":
        return textsOf(block.c);
      case "items":
        return block.c.map(([, text]) => text);
      default:
        return [];
    }
  });
}

/** One question in the paper's frame with its cell under it. */
export function QuestionScreen({
  question,
  pages,
  figures,
  sizes,
  solution,
}: {
  question: BookletQuestion;
  pages: ReadonlyMap<number, PaperPage>;
  figures: Figures;
  sizes: FigureSizes;
  solution?: Solution;
}) {
  const [first, ...rest] = question.blocks;
  const choices = question.blocks.find((block) => block.k === "choices")?.c;
  const work = solution ? workFor(solution, choices) : null;
  const cell = solution ? cellFor({ solution, equations: equationsOf(textsOf(question.blocks)), choices }) : null;
  return (
    <section className={screen.screen} data-question={question.n} data-level={solution?.level} data-answer={choices ? solution?.answer : undefined}>
      <PaperCut region={headerFor(question.n, pages)} scale="header" className={screen.header} />
      <div className={`${screen.body} ${styles.question}`}>
        {first?.k === "p" ? (
          <p className={`${styles.p} ${styles.stem}`}>
            <span className={styles.number} data-number>
              {question.n}.
              <GradeCircle />
            </span>
            <Text source={first.t} />
          </p>
        ) : null}
        {rest.map((block, index) => (
          <BlockView
            key={`${question.n}.${index}`}
            id={`${question.n}.${index}`}
            block={block}
            figures={figures}
            sizes={sizes}
            hit={cell?.hit ?? null}
            construction={work?.construction}
          />
        ))}
        {work?.plot ? <PlotView plot={work.plot} /> : null}
        {cell ? <CellView cell={cell} id={`${question.n}`} answerOut={!choices} /> : null}
      </div>
    </section>
  );
}
