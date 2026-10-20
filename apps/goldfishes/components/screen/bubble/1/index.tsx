"use client";

// bubble/1: scc bubble/3 copied unchanged — a living web ranked by PageRank as
// a raft of foam wearing media, with goldfish that surf it — opening on 기본값 3. This component holds the panels' state and the
// pointer. Folders: web/ (model), raft/ (layout, views, shared state),
// render/ (frame loop, WebGL), fish/, media/, sound/, panels/.

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./bubble-three.module.css";
import { startFrameLoop, type FrameLoop, type LoopSettings } from "./render/frame-loop";
import { FISH_DEFAULTS, type FishPaletteId, type FishParameters } from "./fish/goldfish";
import { DEFAULT_KEYWORD_STYLE, DEFAULT_SURFACE, isTextSurface, textSizeFor, type KeywordStyle, type SurfaceId } from "./media/catalogue";
import { MEDIA_DEFAULTS, type MediaParameters } from "./media/model";
import { DEFAULT_DIVERSITY, DEFAULT_PARAMETERS, fadeCandidate } from "./web/model";
import { FishPanel } from "./panels/fish-panel";
import { MediaPanel } from "./panels/media-panel";
import { NetworkPanel, type Rates } from "./panels/network-panel";
import { PanelTriggers } from "./panels/panel-triggers";
import { SoundPanel } from "./panels/sound-panel";
import { VisualPanel } from "./panels/visual-panel";
import { Raft } from "./raft/raft";
import {
  DEFAULT_FISH_PALETTE,
  DEFAULT_INFLUENCE,
  DEFAULT_MAPPING,
  DEFAULT_ON_TOUCH,
  IMAGE_ENVIRONMENT,
  MEDIA_LOOK_DEFAULTS,
  PRESET_3,
  SECOND_BACKGROUND,
  VISUAL_DEFAULTS,
  type MediaLook,
  type PanelId,
  type Visual,
} from "./settings";
import { SOUND_DEFAULTS, type SoundParameters } from "./sound/sound";
import { useTouchSound } from "./sound/use-touch-sound";
import type { ViewId } from "./raft/views";

const DRAG_THRESHOLD = 6;


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
  const loopRef = useRef<FrameLoop | null>(null);
  const pressRef = useRef<Press | null>(null);

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
  const [imageName, setImageName] = useState<string | null>(null);
  // 미디어
  const [surface, setSurface] = useState<SurfaceId>(PRESET_3.surface);
  const [keywordStyle, setKeywordStyle] = useState<KeywordStyle>(DEFAULT_KEYWORD_STYLE);
  const [mapping, setMapping] = useState<number>(PRESET_3.mapping);
  const [media, setMedia] = useState<MediaParameters>(PRESET_3.media);
  const [mediaLook, setMediaLook] = useState<MediaLook>(PRESET_3.mediaLook);
  const [carry, setCarry] = useState(PRESET_3.carry);
  const [onTouch, setOnTouch] = useState(PRESET_3.onTouch);
  // 금붕어
  const [fishCount, setFishCount] = useState(PRESET_3.fishCount);
  const [fish, setFish] = useState<FishParameters>(PRESET_3.fish);
  const [fishPalette, setFishPalette] = useState<FishPaletteId>(PRESET_3.fishPalette);
  const [influence, setInfluence] = useState(PRESET_3.influence);
  // 소리
  const [sound, setSound] = useState<SoundParameters>(SOUND_DEFAULTS);
  const touchSound = useTouchSound(sound);

  // What the frame loop reads every frame, kept current after each render.
  const settingsRef = useRef<LoopSettings>({
    parameters: { ...DEFAULT_PARAMETERS, ...PRESET_3.rates },
    visual: PRESET_3.visual,
    mapping: PRESET_3.mapping,
    media: PRESET_3.media,
    mediaLook: PRESET_3.mediaLook,
    carry: PRESET_3.carry,
    onTouch: PRESET_3.onTouch,
    fishCount: PRESET_3.fishCount,
    fish: PRESET_3.fish,
    fishPalette: PRESET_3.fishPalette,
    influence: PRESET_3.influence,
  });
  useEffect(() => {
    settingsRef.current = {
      parameters: { ...DEFAULT_PARAMETERS, ...rates },
      visual,
      mapping,
      media,
      mediaLook,
      carry,
      onTouch,
      fishCount,
      fish,
      fishPalette,
      influence,
    };
  }, [rates, visual, mapping, media, mediaLook, carry, onTouch, fishCount, fish, fishPalette, influence]);

  const { playing } = touchSound;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const loop = startFrameLoop(raft, canvas, fishCanvasRef.current, settingsRef, { sound: playing, summary: setSummary, frameCost: setFrameCost });
    loopRef.current = loop;
    return () => {
      loopRef.current = null;
      loop?.dispose();
    };
  }, [raft, playing]);
  // After the loop (re)starts, which opens on the catalogue's default surface: 기본값 3 opens on 없음.
  useEffect(() => {
    loopRef.current?.applySurface(surface, keywordStyle);
  }, [surface, keywordStyle, playing]);

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
        role="application"
        tabIndex={0}
        aria-describedby="bubble-three-summary"
        data-frame-cost={frameCost || undefined}
        aria-label={DESCRIPTION}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointIn(event);
          pressRef.current = { ...point, source: raft.pageAt(point.x, point.y), dragging: false };
        }}
        onPointerMove={(event) => {
          const press = pressRef.current;
          if (!press || (event.buttons & 1) === 0 || press.dragging) return;
          const point = pointIn(event);
          if (Math.hypot(point.x - press.x, point.y - press.y) >= DRAG_THRESHOLD) press.dragging = true;
        }}
        onPointerUp={(event) => {
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
        onPointerCancel={() => {
          pressRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") raft.clearFocus();
          if (event.key === "n" || event.key === "N") raft.createPageFromLeader();
        }}
      />
      <canvas ref={fishCanvasRef} className={styles.fish} aria-hidden="true" />
      <p id="bubble-three-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

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
            imageName={imageName}
            onImage={async (file) => {
              if (!loopRef.current) return;
              const image = await createImageBitmap(file);
              loopRef.current?.setEnvironmentImage(image);
              image.close();
              setImageName(file.name);
              setVisual((current) => ({ ...current, envMode: IMAGE_ENVIRONMENT }));
            }}
          />
        )}
        {panel === "fish" && (
          <FishPanel
            count={fishCount}
            onCount={setFishCount}
            fish={fish}
            setFish={setFish}
            palette={fishPalette}
            onPalette={setFishPalette}
            influence={influence}
            onInfluence={setInfluence}
            onDefaults={(second) => {
              setFish(FISH_DEFAULTS);
              setFishPalette(DEFAULT_FISH_PALETTE);
              setVisual((current) => ({ ...current, background: second ? SECOND_BACKGROUND : VISUAL_DEFAULTS.background }));
              setInfluence(DEFAULT_INFLUENCE);
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
              setSurface(PRESET_3.surface);
              setMapping(PRESET_3.mapping);
              setMedia(PRESET_3.media);
              setMediaLook(PRESET_3.mediaLook);
              setCarry(PRESET_3.carry);
              setOnTouch(PRESET_3.onTouch);
              setFishCount(PRESET_3.fishCount);
              setFish(PRESET_3.fish);
              setFishPalette(PRESET_3.fishPalette);
              setInfluence(PRESET_3.influence);
            }}
          />
        )}
        {panel === "media" && (
          <MediaPanel
            surface={surface}
            onSurface={(next) => {
              setSurface(next);
              // A text surface starts at its own 글자 크기.
              if (next !== surface && isTextSurface(next)) setKeywordStyle((current) => (current.fill !== "none" ? current : { ...current, size: textSizeFor(next) }));
            }}
            keywordStyle={keywordStyle}
            setKeywordStyle={setKeywordStyle}
            onTouch={onTouch}
            setOnTouch={setOnTouch}
            mapping={mapping}
            setMapping={setMapping}
            media={media}
            setMedia={setMedia}
            mediaLook={mediaLook}
            setMediaLook={setMediaLook}
            carry={carry}
            setCarry={setCarry}
            onDefaults={() => {
              setSurface(DEFAULT_SURFACE);
              setKeywordStyle(DEFAULT_KEYWORD_STYLE);
              setMapping(DEFAULT_MAPPING);
              setMedia(MEDIA_DEFAULTS);
              setMediaLook(MEDIA_LOOK_DEFAULTS);
              setCarry(true);
              setOnTouch(DEFAULT_ON_TOUCH);
            }}
          />
        )}
        {panel === "sound" && <SoundPanel on={touchSound.on} onToggle={touchSound.toggle} sound={sound} setSound={setSound} />}
        <PanelTriggers panel={panel} onToggle={togglePanel} soundOn={touchSound.on} />
      </div>
    </main>
  );
}
