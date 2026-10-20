// The pieces every option panel is built from (road-signs/direction/4's control).

import type { ReactNode } from "react";
import styles from "../bubble-three.module.css";
import type { PanelId } from "../settings";

export function Panel({ id, label, children }: { id: PanelId; label: string; children: ReactNode }) {
  return (
    <div id={`bubble-three-${id}`} className={styles.panel} role="group" aria-label={label}>
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

type SliderProps = {
  label: ReactNode;
  /** Shown after the label; omitted, the label stands alone. */
  output?: ReactNode;
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

export function Slider({ label, output, ariaLabel, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className={styles.row}>
      <span>
        {label}
        {output !== undefined && (
          <>
            {" "}
            <output>{output}</output>
          </>
        )}
      </span>
      <input
        aria-label={ariaLabel}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
