"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { KEY_ROWS, WORDS, isLetter } from "./model/words";
import styles from "./screen.module.css";

// Head, body, left arm, right arm, left leg, right leg: the sixth miss hangs him.
const PARTS = 6;

// Keys are two grid columns wide; rows two and three start half a key and a
// key and a half in, as on a phone's QWERTY keyboard.
const ROW_OFFSET = [0, 1, 3];

const pickWord = (previous?: string) => {
  const pool = WORDS.filter((word) => word !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
};

const subscribe = () => () => {};

export default function HangmanOne() {
  // The word is random, so the game only exists on the client.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return <main className={styles.page}>{mounted ? <Game /> : null}</main>;
}

function Game() {
  const [word, setWord] = useState(() => pickWord());
  const [guessed, setGuessed] = useState<ReadonlySet<string>>(() => new Set());

  const characters = [...word];
  const needed = new Set(characters.filter(isLetter));
  const misses = [...guessed].filter((letter) => !needed.has(letter)).length;
  const won = [...needed].every((letter) => guessed.has(letter));
  const lost = !won && misses >= PARTS;
  const over = won || lost;

  const guess = useCallback((letter: string) => {
    if (over || !isLetter(letter)) return;
    setGuessed((current) => (current.has(letter) ? current : new Set(current).add(letter)));
  }, [over]);

  const next = useCallback(() => {
    setWord((current) => pickWord(current));
    setGuessed(new Set());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (over && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        next();
        return;
      }
      guess(event.key.toUpperCase());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guess, next, over]);

  // Every letter slot is 1em wide with 0.2em between; a space is 0.8em.
  const span = characters.reduce((sum, character) => sum + (character === " " ? 0.8 : 1.2), 0);
  const wordSize = `min(34px, calc((100vw - 40px) / ${span}))`;

  return (
    <>
      <Figure key={word} misses={misses} won={won} lost={lost} />

      <p className={styles.word} style={{ fontSize: wordSize }} aria-label={over ? word : `${needed.size} letters`}>
        {characters.map((character, index) => {
          if (character === " ") return <span key={index} className={styles.space} />;
          if (!isLetter(character)) return <span key={index} className={styles.mark}>{character}</span>;
          const known = guessed.has(character);
          return (
            <span key={index} className={`${styles.slot} ${!known && over ? styles.missed : ""}`}>
              {known || over ? character : ""}
            </span>
          );
        })}
      </p>

      <div className={styles.tray}>
        {over ? (
          <div className={styles.end}>
            <button type="button" className={styles.next} onClick={next} aria-label="Next word">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : (
          <div className={styles.keyboard}>
            {KEY_ROWS.flatMap((row, rowIndex) =>
              row.map((letter, index) => {
                const used = guessed.has(letter);
                const state = !used ? "" : needed.has(letter) ? styles.hit : styles.miss;
                return (
                  <button
                    key={letter}
                    type="button"
                    className={`${styles.key} ${state}`}
                    style={{ gridRow: rowIndex + 1, gridColumn: `${ROW_OFFSET[rowIndex] + index * 2 + 1} / span 2` }}
                    disabled={used}
                    onClick={() => guess(letter)}
                  >
                    {letter}
                  </button>
                );
              }),
            )}
          </div>
        )}
      </div>
    </>
  );
}

const ARMS = {
  down: ["M130 108L108 132", "M130 108L152 132"],
  up: ["M130 108L110 84", "M130 108L150 84"],
};
const HANDS = { down: [[108, 132], [152, 132]], up: [[110, 84], [150, 84]] };
const SLEEVES = { down: ["M119 104L108 132", "M141 104L152 132"], up: ["M119 104L110 84", "M141 104L150 84"] };

function Figure({ misses, won, lost }: { misses: number; won: boolean; lost: boolean }) {
  // Each miss draws a 졸라맨 stroke, then dresses that part as Trump. Saved, he
  // appears whole, raises both arms and drops to the ground.
  const shown = (part: number) => won || misses > part;
  const pose = won ? "up" : "down";
  const figureClass = [styles.figure, won ? styles.freed : "", lost ? styles.hanged : ""].join(" ");

  const arm = (side: 0 | 1) => (
    <g>
      <path className={styles.draw} d={ARMS[pose][side]} pathLength={1} />
      <g className={styles.dress}>
        <path className={styles.sleeve} d={SLEEVES[pose][side]} />
        <circle className={styles.skin} cx={HANDS[pose][side][0]} cy={HANDS[pose][side][1]} r="3.6" />
      </g>
    </g>
  );

  const leg = (d: string, trouser: string, shoe: [number, number]) => (
    <g>
      <path className={styles.draw} d={d} pathLength={1} />
      <g className={styles.dress}>
        <path className={styles.sleeve} d={trouser} />
        <ellipse className={styles.shoe} cx={shoe[0]} cy={shoe[1]} rx="6.5" ry="3.2" />
      </g>
    </g>
  );

  return (
    <svg className={styles.stage} viewBox="0 0 200 220" role="img" aria-label={`Hangman ${won ? "saved" : lost ? "hanged" : `${misses} of ${PARTS}`}`}>
      <path className={styles.gallows} d="M14 210H122M40 210V20H134M40 52L72 20" />
      <g className={figureClass}>
        <path className={`${styles.rope} ${won ? styles.cut : ""}`} d="M130 20V60" />
        <g className={styles.man}>
          {/* Painted back to front, whatever order the misses reveal them in. */}
          {shown(4) && leg("M130 146L112 182", "M124 146L112 181", [110, 180])}
          {shown(5) && leg("M130 146L148 182", "M136 146L148 181", [150, 180])}
          {shown(2) && arm(0)}
          {shown(3) && arm(1)}
          {shown(1) && (
            <g>
              <path className={styles.draw} d="M130 96V146" pathLength={1} />
              <g className={styles.dress}>
                <path className={styles.jacket} d="M116 98H144L148 150H112Z" />
                <path className={styles.shirt} d="M124 98L130 113L136 98Z" />
                <path className={styles.tie} d="M128.4 101H131.6L133.4 152L130 157L126.6 152Z" />
              </g>
            </g>
          )}
          {shown(0) && (
            <g>
              <circle className={styles.draw} cx="130" cy="78" r="18" pathLength={1} />
              <g className={styles.dress}>
                <ellipse className={styles.skin} cx="130" cy="80" rx="16" ry="18" />
                <ellipse className={styles.goggle} cx="123.5" cy="79" rx="4.6" ry="3" />
                <ellipse className={styles.goggle} cx="136.5" cy="79" rx="4.6" ry="3" />
                {!lost && <path className={styles.feature} d="M121.5 79h4M134.5 79h4" />}
                <ellipse className={styles.mouth} cx="130" cy="91" rx="3.4" ry="2.2" />
                <path className={styles.hair} d="M112 78C109 62 121 55 134 56C147 57 153 64 151 73C147 67 139 65 129 67C121 68 115 72 112 78Z" />
              </g>
            </g>
          )}
          {lost && <path className={styles.eyes} d="M120.5 76l6 6M126.5 76l-6 6M133.5 76l6 6M139.5 76l-6 6" />}
        </g>
      </g>
    </svg>
  );
}
