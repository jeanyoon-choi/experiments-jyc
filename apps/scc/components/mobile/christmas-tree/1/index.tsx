"use client";

import { useEffect, useRef } from "react";
import { createTree } from "./scene";
import styles from "./screen.module.css";

export default function ChristmasTreeOne() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const scene = createTree(ref.current!);
    return () => scene.dispose();
  }, []);
  return <main ref={ref} className={styles.page} aria-label="A Christmas tree made of Mark Zuckerberg's face" />;
}
