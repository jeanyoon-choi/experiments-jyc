"use client";

import { useEffect, useRef } from "react";
import { createBrain } from "./scene";
import styles from "./screen.module.css";

export default function BrainOne() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const scene = createBrain(ref.current!);
    return () => scene.dispose();
  }, []);
  return <main ref={ref} className={styles.page} />;
}
