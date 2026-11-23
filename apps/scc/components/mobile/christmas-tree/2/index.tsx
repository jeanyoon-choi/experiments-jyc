"use client";

import { useEffect, useRef, useState } from "react";
import { FACES, createTree, type FaceId } from "./scene";
import styles from "./screen.module.css";

// Played on a loop from the tap that leaves the intro: Jingle Bells, United States Air Force Band of
// Mid-America, public domain (see public/audio/christmas-tree/license.txt).
const BGM_URL = "/audio/christmas-tree/jingle-bells.mp3";

export default function ChristmasTreeTwo() {
  const treeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createTree> | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  // The intro stands before everything else; a tap anywhere on it enters and starts the music.
  const [entered, setEntered] = useState(false);
  const [face, setFace] = useState<FaceId>(FACES[0].id);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const scene = createTree(treeRef.current!, FACES[0].id);
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
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

  const choose = (id: FaceId) => {
    setFace(id);
    sceneRef.current?.setFace(id);
  };

  const name = FACES.find((item) => item.id === face)!.name;

  return (
    <main className={styles.stage}>
      <div ref={treeRef} className={styles.tree} role="img" aria-label={`${name}의 입체 얼굴로만 이루어진 크리스마스 트리. 끌면 돌아가고 위아래로 넘겨 볼 수 있습니다`} />
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
      {entered && (
        <div className={styles.control}>
          {open && (
            <div className={styles.panel} id="christmas-tree-options">
              <p className={styles.heading}>얼굴</p>
              <div className={styles.chips} role="group" aria-label="얼굴">
                {FACES.map((item) => (
                  <button key={item.id} type="button" aria-pressed={face === item.id} onClick={() => choose(item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" className={styles.trigger} aria-label="옵션" aria-expanded={open} aria-controls="christmas-tree-options" onClick={() => setOpen((value) => !value)}>
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="7" cy="6" r="2.2" fill={open ? "#fff" : "#171717"} stroke="currentColor" strokeWidth="1.6" />
              <circle cx="13" cy="14" r="2.2" fill={open ? "#fff" : "#171717"} stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}
