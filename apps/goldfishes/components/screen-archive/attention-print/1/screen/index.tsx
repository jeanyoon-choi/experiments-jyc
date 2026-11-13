"use client";

import { useEffect, useRef, useState } from "react";
import { AttentionSchool, storyCenter, type FieldLayout } from "../model/attention-school";
import { createSocialStorySystem, stepSocialStorySystem, maintainSocialStoryActivity, resizeSocialStorySystem } from "../model/social-stories";
import { loadSocialStorySystem, saveSocialStorySystem } from "../model/session";
import { techKeywordAt } from "../model/tech-keywords";
import { GoldfishScene } from "../rendering/goldfish-scene";
import styles from "./story-tray.module.css";

const KEY = "goldfishes:attention-print:v1";
const INITIAL: FieldLayout = { width: 1, height: 1, columns: 1, rows: 1, iconSize: 56, gap: 44, showLabels: false };

export function InstagramSocialStoryTray() {
  const stageRef = useRef<HTMLDivElement>(null);
  const fishRef = useRef<HTMLCanvasElement>(null);
  const traceRef = useRef<HTMLCanvasElement>(null);
  const clearRef = useRef<(() => void) | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [edges, setEdges] = useState(true);
  const [layout, setLayout] = useState(INITIAL);
  const [system, setSystem] = useState(() => createSocialStorySystem(1, 1));

  useEffect(() => {
    const stage = stageRef.current, fishCanvas = fishRef.current, traceCanvas = traceRef.current;
    if (!stage || !fishCanvas || !traceCanvas) return;
    const stored = loadSocialStorySystem(KEY);
    let current = stored?.system ?? createSocialStorySystem(1, 1);
    let now = stored?.time ?? 0;
    let previous = performance.now(), lastStory = now, lastSave = now;
    let geometry = INITIAL;
    let school: AttentionSchool | undefined;
    const scene = new GoldfishScene(fishCanvas, traceCanvas, 72);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number;
    let disposed = false;
    const persist = () => saveSocialStorySystem(KEY, now, current);
    const resize = () => {
      const width = stage.clientWidth, height = stage.clientHeight;
      if (!width || !height) return;
      const iconSize = Math.max(36, Math.min(64, width * 0.058));
      const gap = Math.max(34, iconSize * 0.8);
      geometry = { width, height, iconSize, gap, showLabels: false,
        columns: Math.max(1, Math.floor((width + gap) / (iconSize + gap))),
        rows: Math.max(1, Math.floor((height + gap) / (iconSize + gap))) };
      current = resizeSocialStorySystem(current, geometry.columns, geometry.rows, now);
      if (school) school.resize(geometry); else school = new AttentionSchool(geometry, 72);
      school.updateTargets(current);
      scene.setSize(width, height);
      scene.render(school.fish);
      setLayout(geometry); setSystem(current);
    };
    const tick = () => {
      if (disposed) return;
      const timestamp = performance.now();
      const dt = Math.min(1 / 24, Math.max(0, (timestamp - previous) / 1000));
      previous = timestamp;
      if (!document.hidden && !motion.matches && !pausedRef.current && school) {
        now += dt * 1000;
        school.step(dt, now);
        if (now - lastStory >= 210) {
          current = maintainSocialStoryActivity(stepSocialStorySystem(current, now, school.drainAttention()), now);
          school.updateTargets(current);
          setSystem(current); lastStory = now;
        }
        scene.render(school.fish);
        if (now - lastSave >= 3000) { persist(); lastSave = now; }
      }
      timer = window.setTimeout(tick, 1000 / 24);
    };
    const visibility = () => { previous = performance.now(); if (document.hidden) persist(); };
    clearRef.current = () => scene.clearTraces();
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", persist);
    motion.addEventListener("change", visibility);
    timer = window.setTimeout(tick, 1000 / 24);
    return () => {
      disposed = true; window.clearTimeout(timer); observer.disconnect(); persist();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", persist);
      motion.removeEventListener("change", visibility);
      clearRef.current = null; scene.dispose();
    };
  }, []);

  return (
    <main className={styles.screen}>
      <header className={styles.header}><h1>Attention</h1><span>Goldfishes</span></header>
      <div className={styles.field} ref={stageRef} aria-label="A school of goldfish discovers technology keywords and leaves an accumulating drawing of its attention.">
        <canvas className={styles.traces} ref={traceRef} aria-hidden="true" />
        {edges && <svg className={styles.edges} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
          <defs><marker id="print-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L7 4L1 7" /></marker></defs>
          {system.influences.map(edge => {
            const a = storyCenter(edge.source, layout), b = storyCenter(edge.target, layout);
            const dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy));
            const r = layout.iconSize / 2 + 3;
            const x1 = a.x + dx / length * r, y1 = a.y + dy / length * r;
            const x2 = b.x - dx / length * r, y2 = b.y - dy / length * r;
            return <path key={edge.id} className={styles.signal} d={`M${x1},${y1} Q${(x1+x2)/2-dy*.15},${(y1+y2)/2+dx*.15} ${x2},${y2}`} markerEnd="url(#print-arrow)" pathLength="1" />;
          })}
        </svg>}
        <div className={styles.keywords}>
          {system.nodes.map(node => {
            const state = system.states[node.index]!;
            const point = storyCenter(node.index, layout), keyword = techKeywordAt(node.index);
            return <div key={node.id} title={keyword.text} aria-label={`${keyword.text}: ${state.status}`} className={styles.keyword} data-state={state.status}
              style={{left:point.x,top:point.y,width:layout.iconSize,height:layout.iconSize,fontSize:layout.iconSize*(keyword.abbreviation.length>2?.29:.38)}}>
              <span>{keyword.abbreviation}</span>
            </div>;
          })}
        </div>
        <canvas className={styles.fish} ref={fishRef} aria-hidden="true" />
      </div>
      <footer className={styles.footer}>
        <div className={styles.actions}>
          <button aria-pressed={edges} onClick={() => setEdges(!edges)}>Propagation {edges ? "on" : "off"}</button>
          <button onClick={() => clearRef.current?.()}>Clear traces</button>
          <button aria-pressed={paused} onClick={() => { pausedRef.current = !paused; setPaused(!paused); }}>{paused ? "Resume" : "Pause"}</button>
        </div>
      </footer>
    </main>
  );
}
