"use client";

// bubble/7: bubble/6 copied, with modes at the bottom left (panels/mode-control.tsx):
// 군집 (the raft), 전파 (strains spreading through it, spread/) and 랩 (one object at
// a time on the liquid morph, objects/morph.ts). bubble/6: bubble/5 copied, the web's attention bounded and tiring so it
// keeps churning without a few pages taking it all (web/model.ts). bubble/5:
// bubble/4 copied, its pages shown as 3D objects in the bubbles' material (objects/). bubble/4 was bubble/3's material lab, copied as the
// start of the goldfish's lifecycle. This component holds the panels' state and the pointer. Folders: web/ (model), raft/ (layout, views, shared
// state), render/ (frame loop, WebGL), fish/, sound/, panels/.

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./bubble-three.module.css";
import { startFrameLoop, type FrameLoop, type LoopSettings } from "./render/frame-loop";
import { BubbleFeed, FEED_ENABLED } from "./link/feed"; // 연결
import { ModeControl, type Mode } from "./panels/mode-control"; // 모드
import { LAB_DEFAULTS, type LabSettings } from "./objects/lab"; // 랩
import { SPREAD_DEFAULTS, type SpreadParameters } from "./spread/contagion"; // 전파
import { FISH_DEFAULTS, type FishPaletteId, type FishParameters } from "./fish/goldfish";
import type { LifeParameters } from "./fish/lifecycle";
import { DEFAULT_DIVERSITY, DEFAULT_PARAMETERS, fadeCandidate } from "./web/model";
import { FishPanel } from "./panels/fish-panel";
import { NetworkPanel, type Rates } from "./panels/network-panel";
import { PanelTriggers } from "./panels/panel-triggers";
import { LifePanel } from "./panels/life-panel";
import { SoundPanel } from "./panels/sound-panel";
import { VisualPanel } from "./panels/visual-panel";
import { ObjectPanel } from "./objects/object-panel"; // 오브제
import { Raft } from "./raft/raft";
import { DEFAULT_FISH_PALETTE, DEFAULT_INFLUENCE, FEEDBACK_DEFAULTS, FIRST_BACKGROUND, lookOf, PRESET_3, saveSnapshot, SECOND_BACKGROUND, type Feedback, type PanelId, type Visual } from "./settings";
import { SOUND_DEFAULTS, type SoundParameters } from "./sound/sound";
import { useTouchSound } from "./sound/use-touch-sound";
import type { ViewId } from "./raft/views";
import type { ReactionParameters } from "./reactions/reactions"; // 반응
import type { ObjectParameters } from "./objects/objects"; // 오브제

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

export default function RankedWebIteration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishCanvasRef = useRef<HTMLCanvasElement>(null);
  const [raft] = useState(() => new Raft({ pages: PRESET_3.pages, groups: PRESET_3.groups, damping: PRESET_3.damping }));
  const pressRef = useRef<Press | null>(null);
  /** 전파: each pointer's stroke, where it last brought a newcomer in and which. */
  const strokesRef = useRef(new Map<number, { x: number; y: number; last: number | null }>());

  const [panel, setPanel] = useState<PanelId | null>(null);
  const [summary, setSummary] = useState("");
  const [frameCost, setFrameCost] = useState("");
  // 네트워크
  const [view, setView] = useState<ViewId>("network");
  const [rates, setRates] = useState<Rates>(PRESET_3.rates);
  const [damping, setDamping] = useState(PRESET_3.damping);
  const [population, setPopulation] = useState(PRESET_3.pages);
  const [groups, setGroups] = useState(PRESET_3.groups);
  const [diversity, setDiversity] = useState(DEFAULT_DIVERSITY);
  // 비주얼
  const [visual, setVisual] = useState<Visual>(PRESET_3.visual);
  // 금붕어
  const [fishCount, setFishCount] = useState(PRESET_3.fishCount);
  const [fish, setFish] = useState<FishParameters>(PRESET_3.fish);
  const [fishPalette, setFishPalette] = useState<FishPaletteId>(PRESET_3.fishPalette);
  const [feedback, setFeedback] = useState<Feedback>(PRESET_3.feedback);
  // 생애주기
  const [life, setLife] = useState<LifeParameters>(PRESET_3.life);
  // 반응
  const [reactions, setReactions] = useState<ReactionParameters>(PRESET_3.reactions);
  // 오브제
  const [objects, setObjects] = useState<ObjectParameters>(PRESET_3.objects);
  // 소리
  const [sound, setSound] = useState<SoundParameters>(SOUND_DEFAULTS);
  // 모드: 군집, 전파, 랩
  const [mode, setMode] = useState<Mode>("raft");
  const [lab, setLab] = useState<LabSettings>(LAB_DEFAULTS);
  const [labMorph, setLabMorph] = useState({ from: "heart", to: "heart" });
  const [spread, setSpread] = useState<SpreadParameters>(SPREAD_DEFAULTS);
  const loopRef = useRef<FrameLoop | null>(null);
  const touchSound = useTouchSound(sound);

  // What the frame loop reads every frame, kept current after each render.
  const settingsRef = useRef<LoopSettings>({
    parameters: { ...DEFAULT_PARAMETERS, ...PRESET_3.rates },
    visual: PRESET_3.visual,
    fishCount: PRESET_3.fishCount,
    fish: PRESET_3.fish,
    fishPalette: PRESET_3.fishPalette,
    feedback: PRESET_3.feedback,
    life: PRESET_3.life,
    reactions: PRESET_3.reactions,
    objects: PRESET_3.objects,
    mode: "raft",
    lab: LAB_DEFAULTS,
    spread: SPREAD_DEFAULTS,
  });
  useEffect(() => {
    settingsRef.current = {
      parameters: { ...DEFAULT_PARAMETERS, ...rates },
      visual,
      fishCount,
      fish,
      fishPalette,
      feedback,
      life,
      reactions,
      objects,
      mode,
      lab,
      spread,
    };
  }, [rates, visual, fishCount, fish, fishPalette, feedback, life, reactions, objects, mode, lab, spread]);

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
  }, [raft, playing]);

  const togglePanel = useCallback((id: PanelId) => setPanel((current) => (current === id ? null : id)), []);
  const changeView = (next: ViewId) => {
    setView(next);
    raft.changeView(next);
  };
  const restartWith = (change: () => void) => {
    change();
    raft.requestRestart(population);
  };

  return (
    <main className={styles.page}>
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

      <ModeControl
        mode={mode}
        onMode={setMode}
        objects={objects}
        setObjects={setObjects}
        lab={lab}
        setLab={setLab}
        labMorph={labMorph}
        spread={spread}
        setSpread={setSpread}
      />
      <div className={styles.control}>
        {panel === "network" && (
          <NetworkPanel
            view={view}
            onView={changeView}
            rates={rates}
            onRates={(change) => setRates((current) => ({ ...current, ...change }))}
            damping={damping}
            onDamping={(value) => {
              setDamping(value);
              raft.setDamping(value);
            }}
            population={population}
            onPopulation={(count) => {
              setPopulation(count);
              raft.requestRestart(count);
            }}
            groups={groups}
            onGroups={(count) =>
              restartWith(() => {
                setGroups(count);
                raft.setGroups(count);
              })
            }
            diversity={diversity}
            onDiversity={(value) =>
              restartWith(() => {
                setDiversity(value);
                raft.setDiversity(value);
              })
            }
            onReshuffle={() => restartWith(() => raft.reshuffle())}
          />
        )}
        {panel === "visual" && (
          <VisualPanel
            visual={visual}
            setVisual={setVisual}
            onExport={() =>
              saveSnapshot({
                look: lookOf(visual),
                raft: { area: visual.area, portions: visual.portions },
                network: { view, rates, damping, pages: population, groups, diversity },
                fish: { count: fishCount, parameters: fish, palette: fishPalette, feedback },
                life,
                reactions,
                objects,
                sound,
                mode,
                lab,
                spread,
              })
            }
          />
        )}
        {panel === "objects" && <ObjectPanel objects={objects} setObjects={setObjects} />}
        {panel === "fish" && (
          <FishPanel
            count={fishCount}
            onCount={setFishCount}
            fish={fish}
            setFish={setFish}
            palette={fishPalette}
            onPalette={setFishPalette}
            feedback={feedback}
            setFeedback={setFeedback}
            reactions={reactions}
            setReactions={setReactions}
            onDefaults={(second) => {
              setFish(FISH_DEFAULTS);
              setFishPalette(DEFAULT_FISH_PALETTE);
              setVisual((current) => ({ ...current, background: second ? SECOND_BACKGROUND : FIRST_BACKGROUND }));
              setFeedback({ ...FEEDBACK_DEFAULTS, influence: DEFAULT_INFLUENCE });
            }}
            onPreset3={() => {
              setView("network");
              raft.changeView("network");
              setRates(PRESET_3.rates);
              setDamping(PRESET_3.damping);
              raft.setDamping(PRESET_3.damping);
              setGroups(PRESET_3.groups);
              raft.setGroups(PRESET_3.groups);
              setPopulation(PRESET_3.pages);
              raft.requestRestart(PRESET_3.pages);
              setVisual(PRESET_3.visual);
              setFishCount(PRESET_3.fishCount);
              setFish(PRESET_3.fish);
              setFishPalette(PRESET_3.fishPalette);
              setFeedback(PRESET_3.feedback);
              setLife(PRESET_3.life);
              setReactions(PRESET_3.reactions);
              setObjects(PRESET_3.objects);
            }}
          />
        )}
        {panel === "life" && <LifePanel life={life} setLife={setLife} />}
        {panel === "sound" && <SoundPanel on={touchSound.on} onToggle={touchSound.toggle} sound={sound} setSound={setSound} />}
        <PanelTriggers panel={panel} onToggle={togglePanel} soundOn={touchSound.on} />
      </div>
    </main>
  );
}
