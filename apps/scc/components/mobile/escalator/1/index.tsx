"use client";

import { useEffect, useRef } from "react";
import { createEscalators } from "./scene";
import styles from "./screen.module.css";

export default function EscalatorOne() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const scene = createEscalators(ref.current!);
    return () => scene.dispose();
  }, []);
  return <main ref={ref} className={styles.page} />;
}
