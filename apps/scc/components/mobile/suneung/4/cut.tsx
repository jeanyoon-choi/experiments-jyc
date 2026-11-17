import type { CSSProperties } from "react";
import type { PaperItem, PaperLine } from "../paper/types";
import type { PaperRegion } from "./chrome";
import styles from "./screen.module.css";

// Paper items rendered at their printed positions, copied from
// ../paper/sheet.tsx so the archived booklet can change without moving this
// variant. Used for the header and footer, which stay exactly as printed.

const fontClass: Record<string, string> = {
  m: styles.m,
  mb: styles.mb,
  g: styles.g,
  d: styles.d,
  gb: styles.gb,
  gh: styles.gh,
  gx: styles.gx,
  gt: styles.gt,
  e: styles.e,
  ei: styles.ei,
};

/** HWP 장평 of each font class. */
const condense: Record<string, number> = { m: 0.95, mb: 0.95, g: 0.95, d: 0.85, gb: 0.95, gh: 0.95, gx: 0.85, gt: 0.92, e: 1, ei: 1 };
const stretched = new Set(["d", "gh", "gx", "gt"]);

function Line({ line }: { line: PaperLine }) {
  const scale = condense[line.runs[0].f] ?? 1;
  return (
    <div className={styles.line} data-line data-scale={scale} style={{ left: line.x, top: line.y, fontSize: line.s }}>
      <span className={styles.glyphs} style={{ transform: `scaleX(${scale})` }}>
        <i className={styles.baseline} />
        {line.runs.map((run) => {
          const style: CSSProperties = {};
          if (run.s) style.fontSize = run.s;
          if (run.c) style.color = run.c;
          if (run.dy) style.top = run.dy;
          return (
            <span
              key={run.id}
              className={`${styles.run} ${fontClass[run.f]}`}
              data-w={run.w}
              data-e={run.e}
              data-n={Array.from(run.t).length}
              data-fit={stretched.has(run.f) ? "scale" : undefined}
              style={style}
            >
              {run.t}
            </span>
          );
        })}
      </span>
    </div>
  );
}

function Item({ item }: { item: PaperItem }) {
  switch (item.k) {
    case "line":
      return <Line line={item} />;
    case "h":
      return <div className={styles.rule} style={{ left: item.x, top: item.y - item.sw / 2, width: item.w, height: item.sw }} />;
    case "v":
      return <div className={styles.rule} style={{ left: item.x - item.sw / 2, top: item.y, width: item.sw, height: item.h }} />;
    case "d": {
      const length = Math.hypot(item.x2 - item.x, item.y2 - item.y);
      const angle = Math.atan2(item.y2 - item.y, item.x2 - item.x);
      return (
        <div
          className={styles.rule}
          style={{
            left: item.x,
            top: item.y - item.sw / 2,
            width: length,
            height: item.sw,
            transform: `rotate(${angle}rad)`,
            transformOrigin: `0 ${item.sw / 2}px`,
          }}
        />
      );
    }
    case "box":
      return (
        <div
          className={styles.box}
          style={{
            left: item.x - item.sw / 2,
            top: item.y - item.sw / 2,
            width: item.w + item.sw,
            height: item.h + item.sw,
            borderWidth: item.sw,
            borderRadius: item.r,
          }}
        />
      );
    case "fill":
      return <div className={styles.fill} style={{ left: item.x, top: item.y, width: item.w, height: item.h, background: item.color }} />;
    case "fig":
      return null;
  }
}

/**
 * A printed region at its size times `--k` (set by the reader): the header is
 * scaled as one piece to the measure, the footer box takes the body's scale.
 */
export function PaperCut({ region, scale, className }: { region: PaperRegion; scale: "header" | "body"; className?: string }) {
  return (
    <div
      className={`${styles.cutBox} ${className ?? ""}`}
      data-scale={scale}
      style={{ "--w": region.w, "--h": region.h } as CSSProperties}
    >
      <div className={styles.cut} style={{ width: region.w, height: region.h }}>
        <div className={styles.origin} style={{ left: -region.x, top: -region.y }}>
          {region.items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

