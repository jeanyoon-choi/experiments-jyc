import styles from "./screen.module.css";

// The two flags in one 3 : 2 box, the 태극기's own ratio (the user,
// 2026-11-23: "비율은 남쪽 비율에 맞춰라"). The 인공기 is 2 : 1 on its
// construction sheet; here its bands keep their heights and are cut to 3 : 2,
// with the disc and star left round and moved in by the same proportion.

const BARS = "M-6-25H6M-6-22H6M-6-19H6";

/** A five-pointed star around (18, 18), as on the 인공기's white disc. */
const STAR = Array.from({ length: 10 }, (_, index) => {
  const radius = index % 2 === 0 ? 7.75 : 7.75 * 0.381966;
  const angle = (index * Math.PI) / 5;
  return `${(18 + radius * Math.sin(angle)).toFixed(3)},${(18 - radius * Math.cos(angle)).toFixed(3)}`;
}).join(" ");

export function Flags({ ref }: { ref: React.Ref<HTMLSpanElement> }) {
  return (
    <span ref={ref} className={styles.flag} aria-hidden="true">
      <svg viewBox="-36 -24 72 48" preserveAspectRatio="none">
        <rect x="-36" y="-24" width="72" height="48" fill="#fff" />
        <g transform="rotate(-56.3099325)">
          <path d={BARS} stroke="#000" strokeWidth="2" />
          <path d={BARS} transform="translate(0 44)" stroke="#000" strokeWidth="2" />
          <path d="M0 17v10" stroke="#fff" strokeWidth="1" />
          <circle r="12" fill="#cd2e3a" />
          <path d="M0-12A6 6 0 0 0 0 0A6 6 0 0 1 0 12A12 12 0 0 1 0-12Z" fill="#0047a0" />
        </g>
        <g transform="rotate(-123.6900675)">
          <path d={BARS} stroke="#000" strokeWidth="2" />
          <path d={BARS} transform="translate(0 44)" stroke="#000" strokeWidth="2" />
          <path d="M0-23.5v3M0 17v3.5M0 23v3" stroke="#fff" strokeWidth="1" />
        </g>
      </svg>
      <svg className={styles.north} viewBox="0 0 54 36" preserveAspectRatio="none">
        <rect width="54" height="36" fill="#024fa2" />
        <rect y="6" width="54" height="24" fill="#fff" />
        <rect y="7" width="54" height="22" fill="#ed1c27" />
        <circle cx="18" cy="18" r="8" fill="#fff" />
        <polygon points={STAR} fill="#ed1c27" />
      </svg>
    </span>
  );
}
