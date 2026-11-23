"use client";

import { useEffect, useRef, useState } from "react";
import { createTree } from "./scene";
import styles from "./screen.module.css";

// Played on a loop from the tap that leaves the intro. The file is not in the repository until the
// user supplies it (see docs/experiments/mobile/christmas-tree.md); without it the tree is silent.
const BGM_URL = "/audio/christmas-tree/last-christmas.mp3";

export default function ChristmasTreeTwo() {
  const treeRef = useRef<HTMLDivElement>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  // The intro stands before everything else; a tap anywhere on it enters and starts the music.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const scene = createTree(treeRef.current!);
    return () => scene.dispose();
  }, []);

  useEffect(() => {
    // the music stops with the page and comes back with it
    const onVisibility = () => {
      const bgm = bgmRef.current;
      if (!bgm) return;
      if (document.hidden) bgm.pause();
      else void bgm.play().catch(() => {});
    };
    const onPageHide = () => bgmRef.current?.pause();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      bgmRef.current?.pause();
      bgmRef.current = null;
    };
  }, []);

  const enter = () => {
    setEntered(true);
    // made and started inside the tap, which is what lets a mobile browser play it
    const bgm = new Audio(BGM_URL);
    bgm.loop = true;
    bgmRef.current = bgm;
    void bgm.play().catch(() => {});
  };

  return (
    <main className={styles.stage}>
      <div ref={treeRef} className={styles.tree} role="img" aria-label="마크 저커버그의 입체 얼굴로만 이루어진 크리스마스 트리. 끌면 돌아가고 위아래로 넘겨 볼 수 있습니다" />
      {!entered && (
        // A tap anywhere on the intro enters; the arrow is the same tap for a keyboard.
        <div className={styles.intro} onClick={enter}>
          <div className={styles.introBody}>
            <h1>크리스마스 트리</h1>
            <button type="button" aria-label="들어가기">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5" />
              </svg>
            </button>
          </div>
          <a className={styles.credit} href="https://jeanyoon.ch/oi" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>jeanyoon.ch/oi</a>
        </div>
      )}
    </main>
  );
}
