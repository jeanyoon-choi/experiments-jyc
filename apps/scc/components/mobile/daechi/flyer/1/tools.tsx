import type { Tool } from "./catalog";
import styles from "./screen.module.css";

// Each device is drawn about (60, -60) of a viewBox whose origin is the
// pressed point, so it floats up and to the right of the finger.
const BODY = "#17191c";
const EDGE = "#000";
const GLASS = "#bfe6ff";

function Glasses() {
  return (
    <g>
      <path d="M14 -66 L4 -74 M106 -66 L116 -74" stroke={EDGE} strokeWidth="5" strokeLinecap="round" />
      <rect x="14" y="-78" width="40" height="30" rx="9" fill={GLASS} stroke={BODY} strokeWidth="6" />
      <rect x="66" y="-78" width="40" height="30" rx="9" fill={GLASS} stroke={BODY} strokeWidth="6" />
      <path d="M54 -66 Q60 -72 66 -66" fill="none" stroke={BODY} strokeWidth="5" />
      {/* The camera in the rim, and what the lens is reading back. */}
      <circle className={styles.blink} cx="18" cy="-74" r="2.6" fill="#e60012" />
      <g className={styles.scan}>
        <path d="M72 -63 H100" stroke="#e60012" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </g>
  );
}

// A shirt button with four holes; the fifth, in the middle, is a lens.
function Button() {
  return (
    <g>
      <circle cx="60" cy="-64" r="34" fill="#f1ede4" stroke={EDGE} strokeWidth="2.4" />
      <circle cx="60" cy="-64" r="25" fill="none" stroke="#c9c2b2" strokeWidth="3" />
      {[[-11, -11], [11, -11], [-11, 11], [11, 11]].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={60 + x} cy={-64 + y} r="4.2" fill={BODY} />
      ))}
      <circle cx="60" cy="-64" r="6.4" fill={BODY} stroke={EDGE} strokeWidth="1.2" />
      <circle cx="58" cy="-66" r="2" fill={GLASS} />
      <circle className={styles.blink} cx="60" cy="-64" r="10" fill="none" stroke="#e60012" strokeWidth="2.4" />
    </g>
  );
}

function Watch() {
  return (
    <g>
      <rect x="46" y="-112" width="28" height="100" rx="6" fill="#3a3d42" stroke={EDGE} strokeWidth="2" />
      <rect x="36" y="-86" width="48" height="52" rx="12" fill={BODY} stroke={EDGE} strokeWidth="2" />
      <rect x="84" y="-68" width="4" height="12" rx="2" fill="#3a3d42" />
      <g className={styles.blink}>
        <path d="M44 -72 H76 M44 -62 H70 M44 -52 H74" stroke={GLASS} strokeWidth="3.4" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Card() {
  return (
    <g>
      <rect x="22" y="-96" width="76" height="60" rx="5" fill="#fff" stroke={EDGE} strokeWidth="2" />
      <rect x="29" y="-88" width="26" height="34" fill="#c9ced4" stroke={EDGE} strokeWidth="1.6" />
      {/* The photograph on the 수험표 is not the one who paid. */}
      <g className={styles.blink}>
        <circle cx="42" cy="-76" r="6" fill={BODY} />
        <path d="M31 -55 Q42 -70 53 -55 Z" fill={BODY} />
      </g>
      <path d="M62 -84 H90 M62 -74 H90 M62 -64 H84 M29 -46 H90" stroke={BODY} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}

function Booklet() {
  return (
    <g>
      <rect x="28" y="-102" width="64" height="84" fill="#fff" stroke={EDGE} strokeWidth="2" />
      <path d="M36 -90 H84" stroke={BODY} strokeWidth="4" />
      <path d="M60 -80 V-28" stroke="#c9ced4" strokeWidth="1.6" />
      <path d="M36 -76 H54 M36 -68 H52 M36 -60 H54 M36 -46 H54 M36 -38 H50 M66 -76 H84 M66 -68 H82 M66 -54 H84 M66 -46 H80" stroke={BODY} strokeWidth="2.2" strokeLinecap="round" />
      <g className={styles.blink}>
        <circle cx="40" cy="-53" r="4.4" fill="none" stroke="#e60012" strokeWidth="2.4" />
        <circle cx="70" cy="-61" r="4.4" fill="none" stroke="#e60012" strokeWidth="2.4" />
        <circle cx="70" cy="-39" r="4.4" fill="none" stroke="#e60012" strokeWidth="2.4" />
      </g>
    </g>
  );
}

const DEVICES: Record<Tool, () => React.JSX.Element> = {
  glasses: Glasses,
  button: Button,
  watch: Watch,
  booklet: Booklet,
  card: Card,
};

/** One device, placed by its parent so the pressed point is its viewBox origin. */
export function Instrument({ tool }: { tool: Tool }) {
  const Device = DEVICES[tool];
  return (
    <svg className={styles.instrument} data-tool={tool} viewBox="-10 -120 130 130" aria-hidden="true">
      <Device />
    </svg>
  );
}
