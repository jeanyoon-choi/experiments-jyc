// The picture: the work's own goldfish in a white studio, each holding a mobile far too large for it by its edges and
// looking into it. The mobile stands upright, square to the ground, so the screen is what is seen first (user,
// 2026-11-13). Arrangements: one fish; a wall — the mobiles standing edge to edge, as many across as high, every
// fish before its own; or that wall fitted to the window (화면 맞춤, user 2026-11-23): its rows and columns are the
// ones that show the mobiles largest in the window's shape, seen from straight before it, and it is set up again
// when the window's shape asks for other rows.
//
// This file sets the studio up and runs the frame; what it puts together is in its own folders: fish/ (the school),
// mobile/ (the slabs), screens/ (what is on the glass — a source chosen in settings.ts, with what feeds it). Each
// frame: the source draws its screens, tells what each owner is doing, and the school follows that.
//
// A product photograph's light: a soft room for the reflections and one key. No shadows and no ground (user,
// 2026-11-23: pc/3d-mobiles/1's are not needed), no post-processing: the ground is the canvas's clear colour.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createSchool, FISH_UNIT, type FishPose } from "./fish/goldfish";
import { createMobiles, MOBILE_SIZE, SCREEN_SIZE } from "./mobile/mobile";
import { createClipScreens } from "./screens/clips";
import { createInterfaceScreens, INTERFACE_TUNING, type Tuning } from "./screens/interface";
import { restingHand, type ScreenSource } from "./screens/source";
import { GROUND_COLOURS, STRUCTURAL, type Settings } from "./settings";

/** How many mobiles, and how many of them across and up; `fitted`: to the window's shape. */
type Arrangement = { count: number; columns: number; rows: number; fitted: boolean };

/** The rows and columns that show `count` mobiles largest in a window of `aspect` (width over height), `gap` between them. */
function fitWall(count: number, aspect: number, gap: number) {
  const across = MOBILE_SIZE.width + gap;
  const up = MOBILE_SIZE.height + gap;
  let best = { columns: 1, rows: count, size: 0 };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    // A mobile's size on the display, to a common factor.
    const size = Math.min(aspect / (columns * across), 1 / (rows * up));
    // Ties go to the wall with fewer empty places.
    if (size > best.size + 1e-9 || (Math.abs(size - best.size) <= 1e-9 && columns * rows < best.columns * best.rows)) best = { columns, rows, size };
  }
  return best;
}

function arrangementOf(settings: Settings, aspect: number): Arrangement {
  const kind = Math.round(settings.wall);
  if (kind === 2) {
    const asked = Math.max(2, Math.round(settings.count));
    const wall = fitWall(asked, aspect, settings.gap);
    // Every row whole: the few places left over in the last row are filled (모바일 수 is at least that many), while the interfaces can take them.
    const whole = wall.columns * wall.rows;
    return { count: whole <= MAX_MOBILES ? whole : asked, ...wall, fitted: true };
  }
  const size = kind === 1 ? Math.round(settings.size) : 1;
  return { count: size * size, columns: size, rows: size, fitted: false };
}

/** As many as the interfaces' engine takes (screens/interface/gl/shaders.ts MAX_PHONES). */
const MAX_MOBILES = 225;
const FLOOR = -0.66;
/** The fish hangs at the lower part of its screen, its snout (5.8 model units ahead of its middle) this far from the glass. */
const FISH_Y = FLOOR + 0.44;
const SNOUT_GAP = 0.28;
/** A fin's tip on its mobile's edge, from the fish's place: a little before the glass, a little below the fish's middle. */
const GRIP = { ahead: 0.01, y: -0.02, inset: 0.01 };

type View = { camera: [number, number, number]; target: [number, number, number]; fov: number; near: number; far: number; light: number; reach: [number, number] };
function viewOf({ count, columns, rows, fitted }: Arrangement, gap: number, aspect: number): View {
  const WALL_UP = MOBILE_SIZE.height + gap;
  // One: behind the fish and to its side — its back and tail, and past it the whole screen.
  if (count === 1) return { camera: [-3.9, 0.5, 2.5], target: [0.14, FLOOR + MOBILE_SIZE.height * 0.47, 0], fov: 28, near: 0.05, far: 60, light: 2, reach: [1.4, 9] };
  if (fitted) {
    // Fitted: from straight before the wall, as far back as takes all of it in, a thin margin round it.
    const height = rows * WALL_UP;
    const width = columns * (MOBILE_SIZE.width + gap);
    // A long lens, so each fish is seen before its own screen, at the wall's edges as at its middle.
    const fov = 12;
    const half = Math.tan((fov * Math.PI) / 360);
    const back = Math.max(height / 2 / half, width / 2 / (half * aspect)) * 1.07;
    // The depth range kept as tight as looking round allows: far through a long lens it is what tells surfaces apart.
    return { camera: [-back, FLOOR + height / 2, 0], target: [0.6, FLOOR + height / 2, 0], fov, near: back * 0.1, far: back * 3, light: height * 0.75, reach: [back * 0.15, back * 2.2] };
  }
  // A wall: before it and a little to its side, far enough back to take its whole height.
  const height = rows * WALL_UP;
  const back = height * 1.95;
  return { camera: [-back, FLOOR + height * 0.54, back * 0.36], target: [0.6, FLOOR + height * 0.49, 0], fov: 30, near: 0.5, far: back * 6, light: height * 0.75, reach: [back * 0.2, back * 2.2] };
}

/** The interfaces' own options under the panel's values (read live by the engine). */
const tuningOf = (settings: Settings): Tuning => ({ ...INTERFACE_TUNING, speed: settings.pace, hop: settings.hop, ads: settings.ads });

export function startScene(canvas: HTMLCanvasElement, first: Settings) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  /** The background, and with it the mobiles' metal: silver on black, dark on white. */
  const ground = (settings: Settings) => {
    renderer.setClearColor(GROUND_COLOURS[Math.round(settings.ground)] ?? GROUND_COLOURS[0], 1);
    world?.finish(Math.round(settings.ground) === 1);
  };
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.75;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.52;

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  scene.add(key, key.target);

  let settings = first;
  let tuning = tuningOf(first);
  let feedTime = 0;
  let world: { source: ScreenSource; finish(silver: boolean): void; update(time: number, dt: number): void; dispose(): void } | null = null;
  // For measuring: `?pr=1` sets the canvas's pixel ratio.
  const pr = Number(new URLSearchParams(window.location.search).get("pr"));
  const pixelRatioOverride = pr > 0 ? pr : null;
  let fov = 28;
  let arranged: Arrangement = { count: 1, columns: 1, rows: 1, fitted: false };
  const aspectNow = () => (canvas.clientWidth > 0 && canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1.6);
  const fit = () => {
    // The whole picture stays in a tall window too (a fitted wall is placed for the window's own shape).
    camera.fov = !arranged.fitted && camera.aspect < 1.2 ? Math.min(75, fov * (1.2 / camera.aspect)) : fov;
    camera.updateProjectionMatrix();
  };
  /** The camera where the arrangement is seen whole. */
  const look = () => {
    const view = viewOf(arranged, settings.gap, aspectNow());
    camera.position.set(...view.camera);
    camera.near = view.near;
    camera.far = view.far;
    controls.target.set(...view.target);
    [controls.minDistance, controls.maxDistance] = view.reach;
    controls.update();
    fov = view.fov;
    fit();
    key.position.set(-0.7 * view.light, 2 * view.light, 1.1 * view.light);
  };
  const arrange = () => {
    world?.dispose();
    const next = arrangementOf(settings, aspectNow());
    arranged = next;
    const { count, columns } = next;
    const WALL_ACROSS = MOBILE_SIZE.width + settings.gap;
    const WALL_UP = MOBILE_SIZE.height + settings.gap;
    const MOBILE_X = 5.8 * FISH_UNIT * settings.fish + SNOUT_GAP;
    // Where each fish hangs, at the lower part of its own screen.
    const places = Array.from({ length: count }, (_, index) => new THREE.Vector3(0, FISH_Y + Math.floor(index / columns) * WALL_UP, ((index % columns) - (columns - 1) / 2) * WALL_ACROSS));
    // Upright, each screen facing back along −x to its fish.
    const upright = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
    /** A mobile's middle, from its fish's place. */
    const middle = new THREE.Vector3(MOBILE_X + MOBILE_SIZE.depth / 2, -FISH_Y + FLOOR + MOBILE_SIZE.height / 2 + 0.004, 0);
    const source: ScreenSource =
      Math.round(settings.screens) === 0
        ? createInterfaceScreens(renderer, { count, columns, budget: settings.budget, feed: Math.round(settings.feed) === 1 ? "socket" : "demo", tuning: () => tuning })
        : createClipScreens(count);
    const mobiles = createMobiles(
      environment.texture,
      places.map((place) => new THREE.Matrix4().compose(place.clone().add(middle), upright, new THREE.Vector3(1, 1, 1))),
      source,
    );
    // A fish's fins on its mobile's two edges, at its own height.
    const grip = (side: number) => new THREE.Vector3(MOBILE_X + GRIP.ahead, GRIP.y, side * (MOBILE_SIZE.width / 2 - GRIP.inset));
    const school = createSchool(places, grip, settings.fish);
    scene.add(mobiles.group, school.group);
    const hand = restingHand();
    /** The stroking fin's grip (fish/goldfish.ts: the fin on the fish's −z side). */
    const held = grip(-1);
    const pose = (index: number, out: FishPose) => {
      source.hand(index, hand);
      out.flick = hand.stroke;
      // 터치 지점까지: the fish moves so that fin's tip is where the glass is touched (the screen's left is the fish's −z).
      if (Math.round(settings.hold) === 1 && hand.on) out.offset.set(0, middle.y + (0.5 - hand.y) * SCREEN_SIZE.height - held.y, (hand.x - 0.5) * SCREEN_SIZE.width - held.z);
      return out;
    };
    world = {
      source,
      finish: mobiles.finish,
      update(time, dt) {
        source.update(time);
        school.update(time, dt, pose);
      },
      dispose() {
        scene.remove(mobiles.group, school.group);
        mobiles.dispose();
        school.dispose();
        source.dispose();
      },
    };
    // A hundred small fish need fewer pixels than one large one; a fitted wall fills the window with glazed fish, so
    // fewer still (measured 2026-11-23, 17 × 6 at 1470 × 919: 27 ms a frame at 1.5, 16.7 ms at 1.25).
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioOverride ?? (count === 1 ? 2 : next.fitted ? 1.25 : 1.5)));
    size();
    look();
    ground(settings);
  };

  function size() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return false;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    fit();
    return true;
  }
  let refit = 0;
  function resize() {
    if (!size() || !arranged.fitted) return;
    // A fitted wall follows the window: seen whole again at once, and set up with other rows once the window rests
    // on a shape that asks for them (setting up starts every screen over).
    look();
    window.clearTimeout(refit);
    refit = window.setTimeout(() => {
      const next = arrangementOf(settings, aspectNow());
      if (next.columns !== arranged.columns || next.rows !== arranged.rows) arrange();
    }, 350);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  size();
  arrange();

  let frame = 0;
  let last = performance.now();
  /** The last frames' lengths and what the scene's own work took of each, ms (stats()). */
  const spans: number[] = [];
  const work: number[] = [];
  const loop = () => {
    frame = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    spans.push(now - last);
    if (spans.length > 600) spans.shift();
    // The screens' own clock runs at 쓰는 속도.
    feedTime += dt * settings.pace;
    last = now;
    world?.update(feedTime, dt);
    controls.update();
    renderer.render(scene, camera);
    work.push(performance.now() - now);
    if (work.length > 600) work.shift();
  };
  loop();

  const centile = (values: readonly number[], at: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    return Math.round((sorted[Math.floor(sorted.length * at)] ?? 0) * 10) / 10;
  };

  return {
    apply(next: Settings) {
      const same = STRUCTURAL.every((key) => next[key] === settings[key]);
      settings = next;
      tuning = tuningOf(next);
      ground(next);
      if (!same) arrange();
    },
    /** For measuring: frame lengths and the main thread's share of them over the last frames, and the source's own figures. */
    stats: () => ({ frames: spans.length, frame: { median: centile(spans, 0.5), p95: centile(spans, 0.95), worst: centile(spans, 0.999) }, work: { median: centile(work, 0.5), p95: centile(work, 0.95) }, calls: renderer.info.render.calls, source: world?.source.stats?.() }),
    dispose() {
      cancelAnimationFrame(frame);
      window.clearTimeout(refit);
      observer.disconnect();
      controls.dispose();
      world?.dispose();
      environment.dispose();
      pmrem.dispose();
      room.dispose();
      renderer.dispose();
    },
  };
}
