import type { NodeKind } from "../model/index.ts";
import type { Box } from "./layout.ts";

// The notes' own shapes: people, a mobile, the screen of bubbles (B) and
// goldfish (G), a board of mobiles, a cluster of screens. Line only.

function Fish({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={11} ry={5.5} />
      <path d={`M${x - 11 * s} ${y} l${-8 * s} -6 v12 z`} />
      <text x={x} y={y - 10} textAnchor="middle" fontSize={11} stroke="none" fill="currentColor">
        G
      </text>
    </g>
  );
}

function Bubble({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={14} stroke="none" fill="currentColor">
        B
      </text>
    </g>
  );
}

function Screen({ x, y, w, h }: Box) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} />
      <path d={`M${x + w / 2} ${y + h} v8 M${x + w / 2 - 12} ${y + h + 8} h24`} />
    </g>
  );
}

export function Glyph({ kind, box }: { kind: NodeKind; box: Box }) {
  const { x, y, w, h } = box;

  if (kind === "audience") {
    const people = 5;
    const step = w / people;
    return (
      <g>
        {Array.from({ length: people }, (_, i) => {
          const cx = x + step * (i + 0.5);
          return (
            <g key={i}>
              <circle cx={cx} cy={y + 16} r={11} />
              <path d={`M${cx - 20} ${y + h} v-22 a20 20 0 0 1 40 0 v22`} />
            </g>
          );
        })}
      </g>
    );
  }

  if (kind === "mobile") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={9} />
        <path d={`M${x + w / 2 - 8} ${y + h - 8} h16`} />
      </g>
    );
  }

  if (kind === "gb-screen") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={4} />
        <Bubble x={x + w * 0.3} y={y + h * 0.4} r={h * 0.15} />
        <Bubble x={x + w * 0.5} y={y + h * 0.36} r={h * 0.19} />
        <Bubble x={x + w * 0.72} y={y + h * 0.56} r={h * 0.14} />
        <Fish x={x + w * 0.14} y={y + h * 0.72} />
        <Fish x={x + w * 0.44} y={y + h * 0.84} />
        <Fish x={x + w * 0.9} y={y + h * 0.84} flip />
        <Fish x={x + w * 0.88} y={y + h * 0.26} flip />
      </g>
    );
  }

  if (kind === "mobiles") {
    const columns = 7;
    const rows = 2;
    const pad = 10;
    const gap = 8;
    const cw = (w - 2 * pad - gap * (columns - 1)) / columns;
    const ch = (h - 2 * pad - gap * (rows - 1)) / rows;
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={4} />
        {Array.from({ length: columns * rows }, (_, i) => (
          <rect
            key={i}
            x={x + pad + (i % columns) * (cw + gap)}
            y={y + pad + Math.floor(i / columns) * (ch + gap)}
            width={cw}
            height={ch}
            rx={5}
          />
        ))}
      </g>
    );
  }

  if (kind === "screens") {
    const big = { x: x + w * 0.02, y, w: w * 0.44, h: h * 0.5 };
    const small = { w: w * 0.24, h: h * 0.3 };
    return (
      <g>
        <Screen {...big} />
        <Screen x={x + w * 0.54} y={y + h * 0.06} {...small} />
        <Screen x={x + w * 0.04} y={y + h * 0.64} {...small} />
        <Screen x={x + w * 0.36} y={y + h * 0.62} {...small} />
        <Screen x={x + w * 0.7} y={y + h * 0.56} {...small} />
      </g>
    );
  }

  return <rect x={x} y={y} width={w} height={h} rx={3} />;
}
