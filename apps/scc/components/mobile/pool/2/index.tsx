"use client";

import { useEffect, useRef, useState } from "react";
import { mount } from "./scene/game";
import type { Mode } from "./scene/game";
import styles from "./screen.module.css";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "table", label: "당구대" },
  { mode: "diagram", label: "돈의 흐름" },
];

export default function PoolTwo() {
  const pageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const showRef = useRef<((mode: Mode) => void) | null>(null);
  const [mode, setMode] = useState<Mode>("table");

  useEffect(() => {
    const game = mount(pageRef.current!, canvasRef.current!, sheetRef.current!, tabsRef.current!);
    showRef.current = game.show;
    return () => {
      showRef.current = null;
      game.dispose();
    };
  }, []);

  const open = (next: Mode) => {
    setMode(next);
    showRef.current?.(next);
  };

  return (
    <main ref={pageRef} className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.table}
        data-open={mode === "table"}
        role="img"
        aria-label="포켓 없는 당구대"
      />
      <canvas
        ref={sheetRef}
        className={styles.table}
        data-open={mode === "diagram"}
        role="img"
        aria-label="같은 당구대 위의 공들을 회사로, 그 사이 돈의 흐름을 선으로 그린 도면"
      />
      <div ref={tabsRef} className={styles.tabs} role="tablist" onPointerDown={(event) => event.stopPropagation()}>
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={mode === tab.mode}
            className={styles.tab}
            onClick={() => open(tab.mode)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </main>
  );
}
