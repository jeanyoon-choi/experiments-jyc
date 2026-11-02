"use client";

import { useEffect, useRef } from "react";
import { createSamdasoo } from "./scene";
import styles from "./screen.module.css";

export default function SamdasooOne() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const scene = createSamdasoo(ref.current!);
    return () => scene.dispose();
  }, []);
  return <main ref={ref} className={styles.page} />;
}
