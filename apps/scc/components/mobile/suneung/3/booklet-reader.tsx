"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { fitLines } from "./fit";
import styles from "./screen.module.css";
import { startSwarm } from "./swarm";
import swarm from "./swarm.module.css";

const FACES = ["400", "700", "800"].map((weight) => ({ weight, variable: "--suneung-myeongjo" }))
  .concat(["400", "500", "700", "900"].map((weight) => ({ weight, variable: "--suneung-gothic" })))
  .concat([
    { weight: "400", variable: "--suneung-old-hangul" },
    { weight: "400", variable: "--suneung-equation" },
    { weight: "italic 400", variable: "--suneung-equation" },
    { weight: "400", variable: "--suneung-equation-symbols" },
  ]);

/** The paper's body size in points; the body scale is the screen's body size over it. */
const PAPER_BODY = 10.93;

/**
 * Sets the swarm to work once the booklet is fitted (./swarm). Sizes the printed header to the measure, figures to the
 * body's scale, shrinks a display equation that would overflow, and fits the
 * printed lines once the fonts are in.
 */
export function BookletReader({ className, children }: { className: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const cursors = useRef<HTMLDivElement>(null);
  const [fitted, setFitted] = useState(false);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const layout = () => {
      for (const screen of Array.from(element.querySelectorAll<HTMLElement>("[data-question]"))) {
        const style = getComputedStyle(screen);
        const measure = screen.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const body = parseFloat(style.fontSize) / PAPER_BODY;
        for (const cut of Array.from(screen.querySelectorAll<HTMLElement>('[data-scale="body"]'))) {
          cut.style.setProperty("--k", String(body));
        }
        for (const cut of Array.from(screen.querySelectorAll<HTMLElement>('[data-scale="header"]'))) {
          cut.style.setProperty("--k", String(measure / Number(cut.style.getPropertyValue("--w"))));
        }
        for (const figure of Array.from(screen.querySelectorAll<HTMLElement>("[data-fig-w]"))) {
          const w = Number(figure.dataset.figW);
          const k = Math.min(body, measure / w);
          const inner = figure.firstElementChild as HTMLElement;
          const h = Number(getComputedStyle(figure).getPropertyValue("--h"));
          figure.style.width = `${w * k}px`;
          figure.style.height = `${h * k}px`;
          inner.style.transform = `scale(${k})`;
        }
        for (const eq of Array.from(screen.querySelectorAll<HTMLElement>("[data-eq]"))) {
          eq.style.fontSize = "";
          const available = eq.clientWidth - parseFloat(getComputedStyle(eq).paddingLeft);
          const needed = (eq.firstElementChild as HTMLElement).offsetWidth;
          if (needed > available) eq.style.fontSize = `${(available / needed) * 100}%`;
        }
        // A margin line wider than the measure shrinks to fit, like a display equation.
        for (const typed of Array.from(screen.querySelectorAll<HTMLElement>("[data-op] > [data-type]"))) {
          typed.style.fontSize = "";
          const line = typed.parentElement as HTMLElement;
          const available = line.getBoundingClientRect().right - typed.getBoundingClientRect().left;
          const needed = typed.scrollWidth;
          if (needed > available) typed.style.fontSize = `${(available / needed) * 100}%`;
        }
      }
    };
    layout();
    const resize = new ResizeObserver(layout);
    resize.observe(element);

    let cancelled = false;
    const computed = getComputedStyle(element);
    const loads = FACES.map(({ weight, variable }) =>
      document.fonts.load(`${weight} 16px ${computed.getPropertyValue(variable)}`, "가A1①ᄀᆞ∫Σ").catch(() => []),
    );
    let stopPlayer: (() => void) | null = null;
    Promise.all(loads).then(() => {
      if (cancelled) return;
      fitLines(element);
      layout();
      setFitted(true);
      if (cursors.current) stopPlayer = startSwarm(element, cursors.current);
    });
    return () => {
      cancelled = true;
      resize.disconnect();
      stopPlayer?.();
    };
  }, []);

  return (
    <>
      <div ref={root} lang="ko" className={`${styles.reader} ${swarm.reader} ${className}`} data-fitted={fitted}>
        {children}
      </div>
      {/* Outside the reader: its inline-size container would otherwise contain the fixed layer. */}
      <div ref={cursors} className={swarm.cursors} aria-hidden="true" />
    </>
  );
}
