import type { Tool } from "./catalog";
import styles from "./screen.module.css";

// Each instrument is drawn lying along +x with its working tip at the origin,
// then tilted so the handle clears the finger that is pressing.
const STEEL = "#c9ced4";
const DARK = "#2b2f33";

function Scalpel() {
  return (
    <g className={styles.cut}>
      <path d="M0 0 Q16 -11 38 -9 L42 1 Z" fill="#eef1f4" stroke={DARK} strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="41" y="-5" width="86" height="9" rx="2.5" fill={STEEL} stroke={DARK} strokeWidth="1.2" />
      <path d="M58 -5 V4 M64 -5 V4 M70 -5 V4 M76 -5 V4 M82 -5 V4" stroke={DARK} strokeWidth="1" />
    </g>
  );
}

function Scissors() {
  return (
    <g>
      <g className={styles.snipUp}>
        <path d="M0 -1 L56 -6 L56 2 Z" fill="#eef1f4" stroke={DARK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M56 -2 L100 14" stroke={STEEL} strokeWidth="6" strokeLinecap="round" />
        <circle cx="112" cy="19" r="12" fill="none" stroke={STEEL} strokeWidth="6" />
      </g>
      <g className={styles.snipDown}>
        <path d="M0 1 L56 6 L56 -2 Z" fill="#dfe3e7" stroke={DARK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M56 2 L100 -14" stroke={STEEL} strokeWidth="6" strokeLinecap="round" />
        <circle cx="112" cy="-19" r="12" fill="none" stroke={STEEL} strokeWidth="6" />
      </g>
      <circle cx="56" cy="0" r="2.6" fill={DARK} />
    </g>
  );
}

function Syringe() {
  return (
    <g>
      <path d="M0 0 H34" stroke={DARK} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="34" y="-4" width="8" height="8" fill={STEEL} stroke={DARK} strokeWidth="1.2" />
      <rect x="42" y="-9" width="58" height="18" rx="2" fill="#fff" fillOpacity="0.85" stroke={DARK} strokeWidth="1.2" />
      <path d="M52 -9 V-3 M62 -9 V-3 M72 -9 V-3 M82 -9 V-3 M92 -9 V-3" stroke={DARK} strokeWidth="1" />
      <path d="M100 -15 V15" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
      <g className={styles.plunge}>
        <rect x="62" y="-7" width="8" height="14" fill={DARK} />
        <path d="M70 0 H128" stroke={STEEL} strokeWidth="5" />
        <path d="M128 -11 V11" stroke={DARK} strokeWidth="4" strokeLinecap="round" />
      </g>
    </g>
  );
}

/** One instrument, placed by its parent so its tip is at the pressed point. */
export function Instrument({ tool }: { tool: Tool }) {
  return (
    <svg className={styles.instrument} data-tool={tool} viewBox="-10 -120 150 130" aria-hidden="true">
      <g transform="rotate(-42)">
        {tool === "scalpel" ? <Scalpel /> : tool === "scissors" ? <Scissors /> : <Syringe />}
      </g>
    </svg>
  );
}
