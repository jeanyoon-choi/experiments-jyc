import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { brainMaterial } from "./material";
import { bakeNoise } from "./noise";
import { decayOf, pickSeeds, rotUniforms, type Seed } from "./rot";

// MRI-derived whole brain (Nevit Dilmen, CC BY-SA 3.0), welded and baked by build-model.mjs:
// COLOR_0.r = fine sulcus depth, COLOR_0.g = deep fissure depth. Units are metres.
const MODEL_URL = "/3d/brain/brain.glb?v=2"; // bump when build-model.mjs output changes
const MAX_DPR = 2;
// Resolution governor: when frames keep running late the canvas drops a step and stays there.
const SLOW_MS = 22; // a frame later than this missed 60 Hz
const WINDOW = 45; // frames judged together
const SLOW_SHARE = 0.4;
const DPR_STEP = 0.85;
const MIN_DPR = 1.25;
const DOUBLE_TAP_MS = 300;

// The swipe is iOS's own pager, the one a native feed is built on, rebuilt here because the browser's
// scroll snap is not it: on iOS a snap container has no flick at all, only a slow drift to the nearest
// page. What makes the native one feel the way it does:
//   - the page follows the finger exactly, from the first point past the slop;
//   - a flick of 300 pt/s turns the page however short the drag, even 10 pt; slower, the nearer page wins;
//   - one page a flick;
//   - the release hands its speed to a spring that is 90% there in about 190 ms, lands 2 pt past and
//     comes back, at rest by 550 ms;
//   - a finger put down mid-flight catches the page where it is.
// The spring is UIScrollView's paging deceleration as read from UIKit at runtime
// (https://github.com/zeronsh/zgx/pull/1780): once a millisecond, v = (v + (target − x)·pull)·friction; x += v.
const PULL = 0.000284858;
const FRICTION = 0.970815;
const FLICK = 0.3; // px/ms
const SLOP = 10; // px before a touch becomes a drag
const BAND = 0.55; // UIScrollView's rubber band, above the first reel
// One WebGL canvas lives in the page at rest. Every other page shows a still of its brain. While a
// page is in full flight nothing else happens here: no drawing, no copying, no page made or dropped.
// The work is done as a page glides into place.
const AHEAD = 2; // pages kept ready on each side of the resting one
// The last of a page's travel already counts as rest. A feed is flicked on before a page has quite
// stopped, so waiting for a true stop would leave the reels ahead unprepared, and black.
const REST = 0.06; // of a page height
const PREVIEW = 0.35; // how much of the next level a reel already shows as it slides in
const GROW_MS = 1600; // the rest spreads after the reel lands
const AUTO_TURN = ((2 * Math.PI) / 60) * 0.8; // rad/s, as OrbitControls autoRotateSpeed 0.8
const RESUME_MS = 2500;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export type BrainHooks = {
  /** the scroll rested on this reel: pages reel-2 … reel+2 must exist before this returns */
  onLive: (reel: number) => void;
  onDoubleTap: () => void;
  /** a reel whose page shows something else than the brain: nothing is drawn for it */
  isOther: (reel: number) => boolean;
};

type Still = { level: number; theta: number; dist: number; stamp: number };

/**
 * `host` is the viewport and `track` slides inside it. `track` holds one page per reel: `[data-reel="n"]`, with a `[data-live]` mount and, over it,
 * a `canvas[data-still]`. The pages are the caller's; this fills them.
 */
export function createBrain(host: HTMLElement, track: HTMLElement, hooks: BrainHooks) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  let ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const minRatio = Math.min(ratio, MIN_DPR);
  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0f0d0d");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = env;

  const key = new THREE.DirectionalLight("#fff3ea", 1.0);
  key.position.set(-0.35, 0.5, 0.45);
  const rim = new THREE.DirectionalLight("#ffd9cf", 0.9);
  rim.position.set(0.4, 0.25, -0.5);
  const fill = new THREE.HemisphereLight("#f4e6e0", "#2a1614", 0.2);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  // Orbit on a fixed latitude: horizontal drags turn the brain, vertical ones are the scroll.
  const start = new THREE.Spherical().setFromVector3(new THREE.Vector3(0, 0.05, 0.6));
  let theta = start.theta;
  let thetaPending = 0;
  let dist = 0.6;
  let fitDist = 0.6;
  let autoTurn = true;
  let resume = 0;

  const noise = bakeNoise(renderer);
  const { material, uniforms } = brainMaterial(noise.texture);
  const seedBuf = uniforms.uSeeds.value;
  let geometry: THREE.BufferGeometry | null = null;
  let seeds: Seed[] = [];
  let radius = 0.11;

  // --- pages ------------------------------------------------------------------
  const pageOf = (reel: number) => track.querySelector<HTMLElement>(`[data-reel="${reel}"]`);
  const stillOf = (reel: number) => pageOf(reel)?.querySelector<HTMLCanvasElement>("canvas[data-still]") ?? null;
  const stills = new WeakMap<HTMLCanvasElement, Still>();
  let stamp = 0; // raised when size or view changes: every still is then out of date

  let live = 0; // the reel the WebGL canvas sits in
  let near = 0; // the reel nearest the viewport
  let grow: { from: number; t0: number } | null = null;
  let reveal = 1; // rest frames until the live page's still steps aside for the canvas under it
  pageOf(0)?.querySelector("[data-live]")?.appendChild(canvas);

  // the pager: where the track stands, how fast it moves, and the page it is being pulled to
  let pos = 0; // px
  let vel = 0; // px/ms
  let target: number | null = null; // px, while the spring runs
  let shown = 0;

  let w = 1;
  let h = 1;
  const fit = () => {
    const before = h;
    w = host.clientWidth || 1;
    h = host.clientHeight || 1;
    if (h !== before) {
      // keep the same reel in place
      pos = (pos / before) * h;
      if (target !== null) target = Math.round(target / before) * h;
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit the bounding sphere to the narrower axis with a margin
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const next = (radius * 1.12) / Math.sin(Math.min(vFov, hFov) / 2);
    dist *= next / fitDist;
    fitDist = next;
    camera.near = fitDist * 0.05;
    camera.far = fitDist * 4;
    camera.updateProjectionMatrix();
    stamp += 1;
  };
  const observer = new ResizeObserver(fit);
  observer.observe(host);
  fit();

  let disposed = false;
  new GLTFLoader().load(MODEL_URL, (gltf) => {
    if (disposed) return;
    const mesh = gltf.scene.getObjectByProperty("isMesh", true) as THREE.Mesh | undefined;
    if (!mesh) return;
    geometry = mesh.geometry;
    const cavity = geometry.getAttribute("color") as THREE.BufferAttribute;
    geometry.setAttribute("cavity", cavity);
    geometry.deleteAttribute("color");
    const fine = new Float32Array(cavity.count);
    for (let i = 0; i < cavity.count; i++) fine[i] = cavity.getX(i);
    seeds = pickSeeds(geometry.getAttribute("position").array, fine, 1);
    const brain = new THREE.Mesh(geometry, material);
    // MRI frame (x anterior–posterior, y left–right, z up) to three's y-up
    brain.rotation.x = -Math.PI / 2;
    scene.add(brain);
    geometry.computeBoundingSphere();
    radius = geometry.boundingSphere?.radius ?? radius;
    fit();
  });

  const draw = (level: number, th: number, d: number) => {
    rotUniforms(seeds, level, seedBuf);
    uniforms.uDecay.value = decayOf(level);
    camera.position.setFromSphericalCoords(d, start.phi, th);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };

  // What a page other than the live one shows: a reel still ahead arrives part-rotted, one behind is as it was left.
  const restLevel = (reel: number) => (reel > live ? reel - 1 + PREVIEW : reel);

  /** Keep the frame just drawn in a page. The drawing buffer is this task's. */
  const keep = (still: HTMLCanvasElement, level: number) => {
    if (still.width !== canvas.width || still.height !== canvas.height) {
      still.width = canvas.width;
      still.height = canvas.height;
    }
    still.getContext("2d")?.drawImage(canvas, 0, 0);
    stills.set(still, { level, theta, dist, stamp });
  };
  const fresh = (still: HTMLCanvasElement, level: number) => {
    const kept = stills.get(still);
    return kept !== undefined && kept.stamp === stamp && kept.level === level;
  };

  const liveLevel = (now: number) => {
    if (!grow) return live;
    const t = Math.min(1, (now - grow.t0) / GROW_MS);
    if (t >= 1) {
      grow = null;
      return live;
    }
    return grow.from + (live - grow.from) * easeOut(t);
  };

  /** The scroll has come to rest on `near`: the canvas moves there and picks up where its still stands. */
  const land = (now: number) => {
    // the page being left shows its still again; it is off screen, so nothing is seen to change
    const left = stillOf(live);
    if (left) left.style.visibility = "";
    canvas.remove();
    live = near;
    hooks.onLive(live);
    const arrived = stillOf(live);
    const seen = arrived ? stills.get(arrived) : undefined;
    let from = live;
    if (seen && seen.stamp === stamp) {
      theta = seen.theta;
      dist = seen.dist;
      thetaPending = 0;
      from = seen.level;
    }
    grow = from < live ? { from, t0: now } : null;
    // the still stays on top for two frames, so the canvas arriving under it is never seen empty
    pageOf(live)?.querySelector("[data-live]")?.appendChild(canvas);
    reveal = 2;
  };

  // --- gestures -------------------------------------------------------------
  const pointers = new Map<number, { x: number; y: number }>();
  let mode: "none" | "orbit" | "reel" | "pinch" = "none";
  let downX = 0;
  let downY = 0;
  let anchorY = 0; // where the drag took hold, and the track's place then
  let anchorPos = 0;
  let pinchSpan = 0;
  let pinchDist = 0;
  let dragged = false; // this gesture moved something: its click must not press a button
  let lastTap = 0;
  const trail: { y: number; t: number }[] = [];

  const holdTurn = () => {
    autoTurn = false;
    window.clearTimeout(resume);
  };
  const releaseTurn = () => {
    stamp += 1; // the neighbours' stills now face the old way
    window.clearTimeout(resume);
    resume = window.setTimeout(() => (autoTurn = true), RESUME_MS);
  };
  const span = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const capture = (id: number) => {
    try {
      host.setPointerCapture(id);
    } catch {
      // synthetic or already-released pointer: gestures still work without capture
    }
  };
  const band = (x: number) => (1 - 1 / ((x * BAND) / h + 1)) * h;
  const take = (y: number) => {
    mode = "reel";
    dragged = true;
    anchorY = y;
    anchorPos = pos;
    trail.length = 0;
  };
  /** Let go: the spring takes the track to a page, with the speed it was left at. */
  const release = (speed: number) => {
    const page = pos / h;
    const next = speed > FLICK ? Math.floor(page) + 1 : speed < -FLICK ? Math.ceil(page) - 1 : Math.round(page);
    target = Math.max(0, next) * h;
    vel = pos < 0 ? 0 : speed;
  };

  const onDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      mode = "none";
      dragged = false;
      downX = e.clientX;
      downY = e.clientY;
      if (target !== null) {
        // caught in flight: the page stops under the finger and is dragged from there
        target = null;
        vel = 0;
        capture(e.pointerId);
        take(e.clientY);
      }
    } else if (pointers.size === 2) {
      if (mode === "reel") release(0);
      mode = "pinch";
      dragged = true;
      pinchSpan = span();
      pinchDist = dist;
      holdTurn();
    }
  };

  const onMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    p.x = e.clientX;
    p.y = e.clientY;
    if (mode === "pinch" && pointers.size === 2) {
      const s = span();
      if (s > 0) dist = THREE.MathUtils.clamp((pinchDist * pinchSpan) / s, fitDist * 0.35, fitDist * 1.6);
      return;
    }
    if (mode === "none") {
      const mx = e.clientX - downX;
      const my = e.clientY - downY;
      if (Math.hypot(mx, my) < SLOP) return;
      capture(e.pointerId);
      if (Math.abs(mx) > Math.abs(my)) {
        mode = "orbit";
        dragged = true;
        holdTurn();
      } else take(e.clientY); // from here, not from the touch: the page never jumps to catch up
    }
    if (mode === "orbit") thetaPending -= ((2 * Math.PI * dx) / h) * 0.8;
    else if (mode === "reel") {
      const raw = anchorPos - (e.clientY - anchorY);
      pos = raw < 0 ? -band(-raw) : raw;
      trail.push({ y: e.clientY, t: e.timeStamp });
      while (trail.length > 2 && e.timeStamp - trail[0].t > 100) trail.shift();
    }
  };

  const onUp = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    if (mode === "none" && e.type === "pointerup" && !(e.target instanceof Element && e.target.closest("button"))) {
      // a tap on the reel itself: two in a row like it
      if (e.timeStamp - lastTap < DOUBLE_TAP_MS) {
        lastTap = 0;
        hooks.onDoubleTap();
      } else lastTap = e.timeStamp;
    }
    if (mode === "reel") {
      const first = trail[0];
      const last = trail[trail.length - 1];
      // a finger that stopped before lifting throws nothing
      const moving = first && last && last.t > first.t && e.timeStamp - last.t < 60;
      release(moving ? THREE.MathUtils.clamp(-(last.y - first.y) / (last.t - first.t), -6, 6) : 0);
    }
    if (mode === "orbit" || mode === "pinch") releaseTurn();
    if (pointers.size === 0) mode = "none";
    else if (mode === "pinch") mode = "orbit"; // one finger left: keep turning, never a reel
  };

  const onClick = (e: MouseEvent) => {
    if (!dragged) return;
    e.stopPropagation();
    e.preventDefault();
  };
  // desktop: wheel and arrow keys turn one page
  const step = (by: number) => {
    if (target !== null || pointers.size > 0) return;
    target = Math.max(0, Math.round(pos / h) + by) * h;
  };
  let wheelLock = 0;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 20) return;
    wheelLock = now + 450;
    step(e.deltaY > 0 ? 1 : -1);
  };
  const onKey = (e: KeyboardEvent) => {
    const by = e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " ? 1 : e.key === "ArrowUp" || e.key === "PageUp" ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    step(by);
  };

  host.addEventListener("click", onClick, true);
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  host.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);

  // --- frame ----------------------------------------------------------------
  let last = performance.now();
  let settle = WINDOW; // frames the governor ignores: after start, a resize, or any frame that was not plain
  let seen = 0;
  let slow = 0;
  renderer.setAnimationLoop((now: number) => {
    const gap = now - last;
    const dt = Math.min(0.05, Math.max(0, gap / 1000));
    last = now;

    if (target !== null) {
      for (let ms = Math.min(64, Math.max(1, Math.round(gap))); ms > 0; ms--) {
        vel = (vel + (target - pos) * PULL) * FRICTION;
        pos += vel;
      }
      if (Math.abs(target - pos) < 0.3 && Math.abs(vel) < 0.005) {
        pos = target;
        vel = 0;
        target = null;
      }
    }
    if (pos !== shown) {
      shown = pos;
      track.style.transform = `translate3d(0,${-pos}px,0)`;
    }
    const top = pos;
    near = Math.max(0, Math.round(top / h));
    const atRest = Math.abs(top - near * h) < Math.max(1, h * REST);
    // rest on another reel, or (rarely) flicked past every page that was ready
    if (near !== live && (atRest || Math.abs(near - live) >= AHEAD)) land(now);
    // While the pages move the canvas keeps its last frame: nothing competes with the scroll.
    if (!atRest) {
      settle = WINDOW;
      // never a black page: a reel coming into view with no picture at all is shot on the spot
      if (geometry) {
        for (const reel of [near, top > near * h ? near + 1 : near - 1]) {
          if (reel < 0 || reel === live || hooks.isOther(reel)) continue;
          const still = stillOf(reel);
          if (!still || stills.get(still)?.stamp === stamp) continue;
          const level = restLevel(reel);
          draw(level, theta, dist);
          keep(still, level);
          if (canvas.isConnected) draw(liveLevel(now), theta, dist);
          break;
        }
      }
      return;
    }
    if (!geometry) {
      renderer.render(scene, camera);
      return;
    }

    // one out-of-date neighbour per frame, nearest first
    for (const reel of [live + 1, live - 1, live + 2, live - 2]) {
      if (reel < 0 || hooks.isOther(reel)) continue;
      const still = stillOf(reel);
      const level = restLevel(reel);
      if (!still || fresh(still, level)) continue;
      draw(level, theta, dist);
      keep(still, level);
      settle = WINDOW;
      break;
    }

    // the brain is not on this page: its canvas rests under whatever is
    if (hooks.isOther(live)) {
      settle = WINDOW;
      return;
    }

    if (document.hidden || gap > 250) settle = WINDOW;
    else if (settle > 0) settle -= 1;
    else {
      seen += 1;
      if (gap > SLOW_MS) slow += 1;
      if (seen >= WINDOW) {
        if (slow > WINDOW * SLOW_SHARE && ratio > minRatio) {
          ratio = Math.max(minRatio, ratio * DPR_STEP);
          renderer.setPixelRatio(ratio);
          fit();
          settle = WINDOW;
        }
        seen = 0;
        slow = 0;
      }
    }

    if (autoTurn) thetaPending -= AUTO_TURN * dt;
    theta += thetaPending * 0.08;
    thetaPending *= 0.92;
    const level = liveLevel(now);
    draw(level, theta, dist);

    const own = stillOf(live);
    if (!own) return;
    // once grown, the reel's own still catches up: it is what shows when the canvas leaves
    if (!grow && pointers.size === 0 && !fresh(own, live)) {
      keep(own, live);
      settle = WINDOW;
    }
    if (reveal > 0 && (reveal -= 1) === 0) own.style.visibility = "hidden";
  });

  return {
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      window.clearTimeout(resume);
      host.removeEventListener("click", onClick, true);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      geometry?.dispose();
      material.dispose();
      noise.dispose();
      env.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
