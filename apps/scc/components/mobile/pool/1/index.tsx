"use client";

import { useEffect, useRef, useState } from "react";
import { mount } from "./scene/game";
import styles from "./screen.module.css";

export default function PoolOne() {
  const pageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const unlockRef = useRef<(() => void) | null>(null);
  // Sound needs one tap (a drag does not count on iOS): asked once, gone once sound is out.
  const [ask, setAsk] = useState(true);

  useEffect(() => {
    const game = mount(pageRef.current!, canvasRef.current!, (open) => setAsk(!open));
    unlockRef.current = game.unlock;
    return () => {
      unlockRef.current = null;
      game.dispose();
    };
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      <canvas ref={canvasRef} className={styles.table} role="img" aria-label="포켓볼" />
      {ask && (
        <button
          type="button"
          className={styles.ask}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => unlockRef.current?.()}
        >
          <span className={styles.askCard}>
            <span className={styles.askText}>소리를 켜고 시작합니다</span>
            <span className={styles.askButton}>시작</span>
          </span>
        </button>
      )}
    </main>
  );
}
