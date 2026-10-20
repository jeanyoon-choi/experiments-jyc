// The pieces of the option panel (road-signs/direction/4's control via bubble/3).

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
