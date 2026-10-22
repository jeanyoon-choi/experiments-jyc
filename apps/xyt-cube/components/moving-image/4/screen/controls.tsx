// The pieces of the option panel (copied from moving-image/2).

import type { ReactNode } from "react";
import styles from "./screen.module.css";

export function Panel({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div id={id} className={styles.panel} role="group" aria-label={label}>
      <p className={styles.heading}>{label}</p>
      {children}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

/** A row of toggle buttons. */
export function Chips({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

export function Reset({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.reset} onClick={onClick}>
      {children}
    </button>
  );
}

/** A labelled range with its value; `onChange` receives the new value, `onRelease` the end of a drag. */
export function Slider({
  label,
  value,
  min,
  max,
  onChange,
  onRelease,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onRelease?: () => void;
}) {
  return (
    <label className={styles.slider}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={(max - min) / 400}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        onPointerUp={onRelease}
        onKeyUp={onRelease}
        onBlur={onRelease}
      />
      <output>{value.toFixed(2)}</output>
    </label>
  );
}
