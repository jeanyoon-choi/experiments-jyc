"use client";

import { useEffect, useRef } from "react";
import { mount } from "./scene/game";
import styles from "./screen.module.css";

export default function PoolOne() {
  const pageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => mount(pageRef.current!, canvasRef.current!), []);

  return (
    <main ref={pageRef} className={styles.page}>
      <canvas ref={canvasRef} className={styles.table} role="img" aria-label="포켓볼" />
    </main>
  );
}
