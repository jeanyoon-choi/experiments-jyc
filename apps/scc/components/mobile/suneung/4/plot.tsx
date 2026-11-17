import styles from "./code.module.css";
import { fixed, type Plot } from "./work";

// A plot under the question, laid out whole and hidden: the cell has the runner
// draw each curve with its pen, lay the Riemann rectangles of each n, and
// drop the candidate points of a search.

const W = 300;
const H = 190;

export function PlotView({ plot }: { plot: Plot }) {
  const sx = (x: number) => ((x - plot.x[0]) / (plot.x[1] - plot.x[0])) * W;
  const sy = (y: number) => H - ((y - plot.y[0]) / (plot.y[1] - plot.y[0])) * H;
  const path = (points: [number, number][]) =>
    points.map(([x, y], i) => `${i ? "L" : "M"}${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`).join("");
  const xAxis = plot.y[0] <= 0 && 0 <= plot.y[1] ? sy(0) : H;
  const yAxis = plot.x[0] <= 0 && 0 <= plot.x[1] ? sx(0) : 0;
  const ticks = [...new Set([Math.ceil(plot.x[0]), Math.floor(plot.x[1])])].filter((x) => x !== 0 || yAxis === 0);

  return (
    <svg className={styles.plot} viewBox={`0 0 ${W} ${H}`} data-plot aria-hidden="true">
      <path className={styles.axis} d={`M0 ${xAxis}H${W}M${yAxis} 0V${H}`} vectorEffect="non-scaling-stroke" />
      {ticks.map((x) => (
        <text key={`tick${x}`} className={styles.tick} x={sx(x)} y={Math.min(H + 10, xAxis + 10)} textAnchor="middle">
          {x}
        </text>
      ))}
      {plot.sums?.map((sum) => (
        <g key={`sum${sum.n}`} className={styles.sum} data-sum={sum.n}>
          {sum.rects.map(([x0, x1, y0, y1], index) => (
            <rect
              key={`sum${sum.n}.${index}`}
              x={sx(x0)}
              y={sy(y1)}
              width={sx(x1) - sx(x0)}
              height={sy(y0) - sy(y1)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ))}
      {plot.curves.map((curve) => (
        <path key={curve.id} className={styles.curve} d={path(curve.points)} pathLength={1} data-curve={curve.id} vectorEffect="non-scaling-stroke" />
      ))}
      {plot.probes?.map((probe) => (
        <circle key={probe.id} className={styles.point} cx={sx(probe.x)} cy={sy(probe.y)} r={3} data-point data-bracket={probe.bracket || undefined} />
      ))}
      {plot.root ? (
        <g className={styles.root} data-root>
          <circle cx={sx(plot.root[0])} cy={sy(plot.root[1])} r={6} vectorEffect="non-scaling-stroke" />
          <text x={sx(plot.root[0]) + 9} y={sy(plot.root[1]) - 8}>
            b = {fixed(plot.root[0], 6)}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
