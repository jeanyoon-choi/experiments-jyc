import type { KeyboardEvent } from "react";
import { major, nodeById, relationById, say, type Lang, type Status, type Version } from "../model/index.ts";
import styles from "../system.module.css";
import { Glyph } from "./glyphs.tsx";
import { LAYOUTS, SHEET, line, type Box, type Point } from "./layout.ts";

export type Mode = "relations" | "built" | "questions";

type Props = {
  version: Version;
  lang: Lang;
  mode: Mode;
  selected: string | null;
  /** Ids of the parts some open question is about (all of them, or the selected question's). */
  asked: Set<string>;
  onSelect: (id: string | null) => void;
};

function press(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };
}

function head(tip: Point, from: Point) {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const size = 11;
  const spread = 0.42;
  const a = { x: tip.x - size * Math.cos(angle - spread), y: tip.y - size * Math.sin(angle - spread) };
  const b = { x: tip.x - size * Math.cos(angle + spread), y: tip.y - size * Math.sin(angle + spread) };
  return `${tip.x},${tip.y} ${a.x},${a.y} ${b.x},${b.y}`;
}

function nameAt(kind: string, box: Box) {
  if (kind === "box") return { x: box.x + box.w / 2, y: box.y + box.h / 2 + 5, anchor: "middle" as const };
  if (kind === "gb-screen") return { x: box.x + 12, y: box.y + 22, anchor: "start" as const };
  if (kind === "audience") return { x: box.x + box.w / 2, y: box.y - 10, anchor: "middle" as const };
  const stand = kind === "screens" ? 10 : 0;
  return { x: box.x + box.w / 2, y: box.y + box.h + stand + 18, anchor: "middle" as const };
}

export function Diagram({ version, lang, mode, selected, asked, onSelect }: Props) {
  const layout = LAYOUTS[major(version.id)];
  const name = (id: string) => say(version.labels?.[id] ?? nodeById.get(id)?.label ?? relationById.get(id)?.label, lang);

  // How strongly a part is drawn: by what is built, or by what is asked.
  function weight(id: string, status: Status | undefined) {
    if (mode === "built") return status === "working" ? styles.working : status === "partial" ? styles.partial : styles.absent;
    if (mode === "questions") return asked.has(id) ? styles.partial : styles.absent;
    return styles.partial;
  }

  return (
    <svg
      className={styles.sheet}
      viewBox={`0 0 ${SHEET.width} ${SHEET.height}`}
      role="group"
      aria-label={`Goldfishes system, ${version.id}`}
      onClick={() => onSelect(null)}
    >
      {layout.divide !== undefined && (
        <g className={styles.caption}>
          <line className={styles.divide} x1={0} x2={SHEET.width} y1={layout.divide} y2={layout.divide} />
          <text x={16} y={layout.divide - 9}>
            Audiences
          </text>
          <text x={16} y={layout.divide + 20}>
            Installation
          </text>
        </g>
      )}

      {layout.captions?.map((caption) => (
        <text key={`${caption.x}:${caption.y}`} className={styles.caption} x={caption.x} y={caption.y}>
          {say(caption.text, lang)}
        </text>
      ))}

      {version.relations.map((id) => {
        const relation = relationById.get(id);
        if (!relation) return null;
        const [a, b] = line(layout.boxes[relation.from], layout.boxes[relation.to], layout.lanes?.[id] ?? 0);
        const label = name(id);
        const lane = layout.lanes?.[id] ?? 0;
        const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const upright = Math.abs(a.x - b.x) < 1;
        const level = Math.abs(a.y - b.y) < 1;
        // An upright line is named beside it, a level one above or below it.
        const left = upright ? lane < 0 || a.x > SHEET.width * 0.8 : !level && (b.x - a.x) * (b.y - a.y) < 0;
        const at = level
          ? { x: middle.x, y: middle.y + (lane > 0 ? 20 : -9), anchor: "middle" as const }
          : { x: middle.x + (left ? -10 : 10), y: middle.y + 5, anchor: left ? ("end" as const) : ("start" as const) };
        const select = () => onSelect(id);

        return (
          <g
            key={id}
            className={`${styles.part} ${weight(id, relation.status)} ${selected === id ? styles.selected : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`${label || say(relation.carries, lang)}: ${name(relation.from)} → ${name(relation.to)}`}
            aria-pressed={selected === id}
            onClick={(event) => {
              event.stopPropagation();
              select();
            }}
            onKeyDown={press(select)}
          >
            <line className={styles.hit} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line
              className={relation.plain ? styles.plain : relation.by === "human" ? styles.human : styles.computed}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
            {!relation.plain && <polygon className={styles.head} points={head(b, a)} />}
            {relation.both && <polygon className={styles.head} points={head(a, b)} />}
            {label && (
              <text className={styles.relationName} x={at.x} y={at.y} textAnchor={at.anchor}>
                {label}
              </text>
            )}
          </g>
        );
      })}

      {version.nodes.map((id) => {
        const node = nodeById.get(id);
        const box = layout.boxes[id];
        if (!node || !box) return null;
        const label = name(id);
        const at = layout.names?.[id] ?? nameAt(node.kind, box);
        const select = () => onSelect(id);

        return (
          <g
            key={id}
            className={`${styles.part} ${node.kind === "audience" && mode === "built" ? styles.partial : weight(id, node.status)} ${selected === id ? styles.selected : ""}`}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={selected === id}
            onClick={(event) => {
              event.stopPropagation();
              select();
            }}
            onKeyDown={press(select)}
          >
            <rect className={styles.hit} x={box.x} y={box.y} width={box.w} height={box.h} />
            <Glyph kind={node.kind} box={box} />
            <text className={styles.nodeName} x={at.x} y={at.y} textAnchor={at.anchor}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
