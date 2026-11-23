"use client";

import { useEffect, useRef } from "react";
import { createDaechi } from "./scene";
import styles from "./screen.module.css";

export default function DaechiTwo() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const scene = createDaechi(ref.current!);
    return () => scene.dispose();
  }, []);
  return <main ref={ref} className={styles.page} />;
}
