"use client";

// bubble/9: bubble/8 copied whole (2026-11-05): its bugs fixed first, then a new vocabulary of signs (components/screen/bubble/docs/9.md).
// bubble/8: bubble/7 copied (2026-11-03), its material a liquid film (bubble/1's soap film: render/film.ts, 비주얼 → 재질)
// instead of Koons's coated steel, and its objects in formal groups (objects/kinds/groups.ts), a third of tech logos.
// bubble/7: bubble/6 copied, with modes at the bottom left (panels/mode-control.tsx):
// 군집 (the raft), 전파 (strains spreading through it, spread/) and 랩 (one object at
// a time on the liquid morph, objects/morph/morph.ts). bubble/6: bubble/5 copied, the web's attention bounded and tiring so it
// keeps churning without a few pages taking it all (web/model.ts). bubble/5:
// bubble/4 copied, its pages shown as 3D objects in the bubbles' material (objects/). bubble/4 was bubble/3's material lab, copied as the
// start of the goldfish's lifecycle. This component holds the canvases and the pointer. Folders, each a layer that knows only those before it:
// model/ (what there is and how large — the contract in world.ts; today web/'s PageRank behind pagerank.ts), raft/ (layout, views),
// simulation/ (what is shown of the model: display, the bubbles emitted, the fish's watching), fish/, spread/, objects/, render/ (WebGL),
// sound/, link/, loop/ (the frame: the order all of that runs in), state/ (the settings), presets/, looks/, ui/ and panels/.

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./bubble-three.module.css";
import { startFrameLoop, type FrameLoop } from "./loop/frame-loop";
import { BubbleFeed, FEED_ENABLED } from "./link/feed"; // 연결
import { ModeControl } from "./panels/mode-control"; // 모드
import { useHiddenUi } from "./panels/hidden-ui"; // X: 화면의 컨트롤 숨김
import { fadeCandidate } from "./web/model";
import { FishPanel } from "./panels/fish-panel";
import { NetworkPanel } from "./panels/network-panel";
import { PanelTriggers } from "./panels/panel-triggers";
import { SoundPanel } from "./panels/sound-panel";
import { VisualPanel } from "./panels/visual-panel";
import { ObjectPanel } from "./panels/object-panel"; // 오브제
import { OPENING_PRESET } from "./presets";
import { Raft } from "./raft/raft";
import { OPENING } from "./state/opening";
import type { PanelId } from "./state/schema";
import { useSettings } from "./state/use-settings";
import { useTouchSound } from "./sound/use-touch-sound";

const DRAG_THRESHOLD = 6;
/** 전파: a stroke brings in a newcomer every this many CSS px of its path (finger skating). */
const STROKE_SPACING = 30;

const DESCRIPTION =
  "A living web of pages ranked by PageRank, shown as a raft of foam performing the power iteration. Every page is a bubble as large as its displayed rank, pressed against its neighbours; along every link, each on its own rhythm, a small bubble of rank buds off its source, squeezes between the others and coalesces into the bubble it feeds, so the display converges to PageRank and settles again whenever the web changes. Tap empty space to add a page; drag from one page to another to add a link or let it fade; drag from a page to empty space to create a page it links to; tap between two pages to let their link fade; tap a page to highlight its links. Press N to add a page linked from the leader, Escape to clear focus.";

type Press = { x: number; y: number; source: number | null; dragging: boolean };

function pointIn(event: PointerEvent<HTMLCanvasElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

/** `setup`: the member of the first preset family (presets/families.ts) to open on; /screen/bubble/9b opens on A2 through ./clock.tsx. */
export default function RankedWebIteration({ setup = OPENING_PRESET }: { setup?: number } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishCanvasRef = useRef<HTMLCanvasElement>(null);
  const [raft] = useState(() => new Raft({ pages: OPENING.pages, groups: OPENING.groups, damping: OPENING.damping }));
  const pressRef = useRef<Press | null>(null);
  /** 전파: each pointer's stroke, where it last brought a newcomer in and which. */
  const strokesRef = useRef(new Map<number, { x: number; y: number; last: number | null }>());

  const [panel, setPanel] = useState<PanelId | null>(null);
  const uiHidden = useHiddenUi();
  const [summary, setSummary] = useState("");
  const [frameCost, setFrameCost] = useState("");
  // Every panel's values, their setters and actions, and what the frame loop reads of them (state/use-settings.ts).
  const { state, set, actions, preset, settingsRef } = useSettings(raft, setup);
  const { view, rates, damping, population, groups, diversity, visual, fishCount, fish, fishPalette, feedback, life, objects, sound, mode, lab, spread } = state;
  const setLab = set.lab;
  const [labMorph, setLabMorph] = useState({ from: "heart", to: "heart" });
  const loopRef = useRef<FrameLoop | null>(null);
  const touchSound = useTouchSound(sound);

  const { playing } = touchSound;
  // 연결: the goldfish's contacts go to socket feed/1 for pc/mobiles (`?feed=0` off).
  const feedRef = useRef<BubbleFeed | null>(null);
  useEffect(() => {
    if (!FEED_ENABLED) return;
    const feed = new BubbleFeed();
    feedRef.current = feed;
    return () => {
      feedRef.current = null;
      feed.close();
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const loop = startFrameLoop(raft, canvas, fishCanvasRef.current, settingsRef, {
      sound: playing,
      summary: setSummary,
      frameCost: setFrameCost,
      labMorph: (from, to) => setLabMorph({ from, to }),
      feed: () => feedRef.current,
    });
    loopRef.current = loop;
    return () => {
      loopRef.current = null;
      loop?.dispose();
    };
  }, [raft, playing, settingsRef]);

  const togglePanel = useCallback((id: PanelId) => setPanel((current) => (current === id ? null : id)), []);

  return (
    // The page behind the canvases is the ground's colour too, so a frame the canvas has not drawn yet (load, resize) is never another colour.
    <main className={styles.page} style={{ background: `rgb(${visual.background.map((value) => Math.round(value * 255)).join(",")})` }}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        data-placing={mode === "spread" || undefined}
        role="application"
        tabIndex={0}
        aria-describedby="bubble-three-summary"
        data-frame-cost={frameCost || undefined}
        aria-label={DESCRIPTION}
        onPointerDown={(event) => {
          // 랩: a tap moves on to the next shape.
          if (mode === "lab") {
            setLab((current) => ({ ...current, step: current.step + 1 }));
            return;
          }
          // 전파: a tap brings in the chosen colour and object there; held and moved, a trail of them
          // (finger skating, SCC finger-skating), one stroke per finger.
          if (mode === "spread") {
            event.currentTarget.setPointerCapture(event.pointerId);
            const point = pointIn(event);
            strokesRef.current.set(event.pointerId, { ...point, last: loopRef.current?.arrive(point.x, point.y) ?? null });
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointIn(event);
          pressRef.current = { ...point, source: raft.pageAt(point.x, point.y), dragging: false };
        }}
        onPointerMove={(event) => {
          const stroke = strokesRef.current.get(event.pointerId);
          if (stroke) {
            const bounds = event.currentTarget.getBoundingClientRect();
            // Every sample the browser coalesced, so a fast stroke leaves an even trail.
            for (const sample of event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent]) {
              const x = sample.clientX - bounds.left;
              const y = sample.clientY - bounds.top;
              const gap = Math.hypot(x - stroke.x, y - stroke.y);
              if (gap < STROKE_SPACING) continue;
              // Evenly along the way, however far the pointer jumped.
              const steps = Math.floor(gap / STROKE_SPACING);
              const fromX = stroke.x;
              const fromY = stroke.y;
              for (let step = 1; step <= steps; step += 1) {
                stroke.x = fromX + ((x - fromX) * step * STROKE_SPACING) / gap;
                stroke.y = fromY + ((y - fromY) * step * STROKE_SPACING) / gap;
                stroke.last = loopRef.current?.arrive(stroke.x, stroke.y, stroke.last) ?? stroke.last;
              }
            }
            return;
          }
          const press = pressRef.current;
          if (!press || (event.buttons & 1) === 0 || press.dragging) return;
          const point = pointIn(event);
          if (Math.hypot(point.x - press.x, point.y - press.y) >= DRAG_THRESHOLD) press.dragging = true;
        }}
        onPointerUp={(event) => {
          if (strokesRef.current.delete(event.pointerId)) return;
          const press = pressRef.current;
          pressRef.current = null;
          if (!press) return;
          const point = pointIn(event);
          if (press.source !== null && press.dragging) {
            // Dragged from a page: onto empty space makes a page it links to; onto another page, a link.
            const target = raft.pageAt(point.x, point.y);
            if (target === null) raft.createPage(point.x, point.y, press.source);
            else if (target !== press.source) raft.toggleLink(press.source, target);
            return;
          }
          if (press.source !== null) {
            raft.toggleFocus(press.source);
            return;
          }
          if (press.dragging) return;
          // A tap on a link lets it fade; anywhere else empty, a new page.
          const link = raft.linkAt(point.x, point.y);
          if (link) fadeCandidate(raft.web, link.from, link.to);
          else raft.createPage(point.x, point.y, null);
        }}
        onPointerCancel={(event) => {
          strokesRef.current.delete(event.pointerId);
          pressRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") raft.clearFocus();
          if (event.key === "n" || event.key === "N") raft.createPageFromLeader();
        }}
      />
      <canvas ref={fishCanvasRef} className={styles.fish} aria-hidden="true" hidden={mode === "lab"} />
      <p id="bubble-three-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div hidden={uiHidden}>
        <ModeControl mode={mode} onMode={set.mode} objects={objects} setObjects={set.objects} lab={lab} setLab={set.lab} labMorph={labMorph} spread={spread} setSpread={set.spread} preset={preset} onPreset={actions.preset} />
        <div className={styles.control}>
          {panel === "network" && (
            <NetworkPanel
              view={view}
              onView={actions.view}
              rates={rates}
              onRates={actions.rates}
              damping={damping}
              onDamping={actions.damping}
              population={population}
              onPopulation={actions.population}
              groups={groups}
              onGroups={actions.groups}
              diversity={diversity}
              onDiversity={actions.diversity}
              onReshuffle={actions.reshuffle}
              flow={(visual.flow ?? 1) >= 0.5}
              onFlow={actions.flow}
              portions={visual.portions}
              onPortions={actions.portions}
            />
          )}
          {panel === "visual" && <VisualPanel visual={visual} setVisual={set.visual} onExport={actions.export} />}
          {panel === "objects" && <ObjectPanel objects={objects} setObjects={set.objects} />}
          {panel === "fish" && (
            <FishPanel
              count={fishCount}
              onCount={set.fishCount}
              fish={fish}
              setFish={set.fish}
              palette={fishPalette}
              onPalette={set.fishPalette}
              feedback={feedback}
              setFeedback={set.feedback}
              life={life}
              setLife={set.life}
              onDefaults={actions.fishDefaults}
              onOpening={actions.opening}
            />
          )}
          {panel === "sound" && <SoundPanel on={touchSound.on} onToggle={touchSound.toggle} sound={sound} setSound={set.sound} />}
          <PanelTriggers panel={panel} onToggle={togglePanel} soundOn={touchSound.on} />
        </div>
      </div>
    </main>
  );
}
