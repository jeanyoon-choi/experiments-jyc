import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { brainMaterial } from "./material";
import { decayOf, pickSeeds, rotUniforms, type Seed } from "./rot";

// MRI-derived whole brain (Nevit Dilmen, CC BY-SA 3.0), welded and baked by build-model.mjs:
// COLOR_0.r = fine sulcus depth, COLOR_0.g = deep fissure depth. Units are metres.
const MODEL_URL = "/3d/brain/brain.glb?v=2"; // bump when build-model.mjs output changes
const MAX_DPR = 2;

// Reels: each swipe up is the next reel, the same brain one level further gone.
const PREVIEW = 0.35; // how much of the next level is already visible while it slides in
const GROW_MS = 1600; // the rest spreads after the reel lands
const COMMIT_FRACTION = 0.18;
const COMMIT_VELOCITY = 0.45; // px/ms
const SLIDE_MS = 280;
const AUTO_TURN = ((2 * Math.PI) / 60) * 0.8; // rad/s, as OrbitControls autoRotateSpeed 0.8
const RESUME_MS = 2500;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function createBrain(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  host.appendChild(renderer.domElement);

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
  // Orbit on a fixed latitude: horizontal drags turn the brain, vertical drags change reel.
  const start = new THREE.Spherical().setFromVector3(new THREE.Vector3(0, 0.05, 0.6));
  let theta = start.theta;
  let thetaPending = 0;
  let dist = 0.6;
  let fitDist = 0.6;
  let autoTurn = true;
  let resume = 0;

  const { material, uniforms } = brainMaterial();
  let geometry: THREE.BufferGeometry | null = null;
  let seeds: Seed[] = [];
  let radius = 0.11;

  const placeCamera = () => {
    camera.position.setFromSphericalCoords(dist, start.phi, theta);
    camera.lookAt(0, 0, 0);
  };

  const fit = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
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
    placeCamera();
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

  // --- reel state ---------------------------------------------------------
  let index = 0; // reel number; its brain has rot level `index`
  let offset = 0; // px the current reel is displaced (negative = pulled up)
  let slide: { from: number; to: number; t0: number; dir: -1 | 0 | 1 } | null = null;
  let grow: { from: number; t0: number } | null = null;

  const levelOf = (reel: number, now: number) => {
    if (reel === index && grow) {
      const t = Math.min(1, (now - grow.t0) / GROW_MS);
      if (t >= 1) grow = null;
      return grow ? grow.from + (index - grow.from) * easeOut(t) : index;
    }
    if (reel === index + 1) return index + PREVIEW;
    return reel;
  };

  const go = (dir: -1 | 0 | 1, now: number) => {
    const h = host.clientHeight || 1;
    slide = { from: offset, to: dir === 1 ? -h : dir === -1 ? h : 0, t0: now, dir };
  };

  // --- gestures -------------------------------------------------------------
  const pointers = new Map<number, { x: number; y: number }>();
  let mode: "none" | "orbit" | "reel" | "pinch" = "none";
  let downX = 0;
  let downY = 0;
  let pinchSpan = 0;
  let pinchDist = 0;
  const trail: { y: number; t: number }[] = [];

  const holdTurn = () => {
    autoTurn = false;
    window.clearTimeout(resume);
  };
  const releaseTurn = () => {
    window.clearTimeout(resume);
    resume = window.setTimeout(() => (autoTurn = true), RESUME_MS);
  };
  const span = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onDown = (e: PointerEvent) => {
    try {
      host.setPointerCapture(e.pointerId);
    } catch {
      // synthetic or already-released pointer: gestures still work without capture
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      mode = "none";
      downX = e.clientX;
      downY = e.clientY;
      trail.length = 0;
    } else if (pointers.size === 2) {
      if (mode === "reel") go(0, performance.now());
      mode = "pinch";
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
    const h = host.clientHeight || 1;
    if (mode === "pinch" && pointers.size === 2) {
      const s = span();
      if (s > 0) dist = THREE.MathUtils.clamp((pinchDist * pinchSpan) / s, fitDist * 0.35, fitDist * 1.6);
      return;
    }
    if (mode === "none") {
      const mx = e.clientX - downX;
      const my = e.clientY - downY;
      if (Math.hypot(mx, my) < 8) return;
      if (Math.abs(mx) > Math.abs(my) || slide) {
        mode = "orbit";
        holdTurn();
      } else {
        mode = "reel";
      }
    }
    if (mode === "orbit") {
      thetaPending -= ((2 * Math.PI * dx) / h) * 0.8;
    } else if (mode === "reel") {
      const pull = e.clientY - downY;
      // nothing above the first reel: rubber-band
      offset = index === 0 && pull > 0 ? pull * 0.25 : pull;
      trail.push({ y: e.clientY, t: e.timeStamp });
      while (trail.length > 2 && e.timeStamp - trail[0].t > 90) trail.shift();
    }
  };

  const onUp = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    const now = performance.now();
    if (mode === "reel") {
      const h = host.clientHeight || 1;
      const first = trail[0];
      const last = trail[trail.length - 1];
      const v = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
      if ((offset < -h * COMMIT_FRACTION || v < -COMMIT_VELOCITY) && offset < 0) go(1, now);
      else if (index > 0 && (offset > h * COMMIT_FRACTION || v > COMMIT_VELOCITY) && offset > 0) go(-1, now);
      else go(0, now);
    }
    if (mode === "orbit" || mode === "pinch") releaseTurn();
    if (pointers.size === 0) mode = "none";
    else if (mode === "pinch") mode = "orbit"; // one finger left: keep turning, never a reel
  };

  // desktop: wheel / arrow keys step one reel
  let wheelLock = 0;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const now = performance.now();
    if (slide || now < wheelLock || Math.abs(e.deltaY) < 20) return;
    wheelLock = now + 450;
    if (e.deltaY > 0) go(1, now);
    else if (index > 0) go(-1, now);
  };
  const onKey = (e: KeyboardEvent) => {
    if (slide) return;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") go(1, performance.now());
    else if ((e.key === "ArrowUp" || e.key === "PageUp") && index > 0) go(-1, performance.now());
  };

  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  host.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);

  // --- frame ----------------------------------------------------------------
  const seedBuf = uniforms.uSeeds.value;
  const drawReel = (reel: number, y: number, w: number, h: number, now: number) => {
    const f = levelOf(reel, now);
    rotUniforms(seeds, f, seedBuf);
    uniforms.uDecay.value = decayOf(f);
    // WebGL y runs up: a reel moved down the screen by y sits lower in the viewport
    const top = Math.max(0, -y);
    const bottom = Math.min(h, h - y);
    if (bottom <= top) return;
    renderer.setViewport(0, -y, w, h);
    renderer.setScissor(0, top, w, bottom - top);
    renderer.render(scene, camera);
  };

  let last = performance.now();
  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (autoTurn) thetaPending -= AUTO_TURN * dt;
    theta += thetaPending * 0.08;
    thetaPending *= 0.92;
    placeCamera();

    if (slide) {
      const t = Math.min(1, (now - slide.t0) / SLIDE_MS);
      offset = slide.from + (slide.to - slide.from) * easeOut(t);
      if (t >= 1) {
        if (slide.dir === 1) {
          index += 1;
          grow = { from: index - 1 + PREVIEW, t0: now };
        } else if (slide.dir === -1) {
          index -= 1;
          grow = null;
        }
        offset = 0;
        slide = null;
      }
    }

    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setScissorTest(true);
    drawReel(index, offset, w, h, now);
    if (offset < 0) drawReel(index + 1, offset + h, w, h, now);
    else if (offset > 0) drawReel(index - 1, offset - h, w, h, now);
    renderer.setScissorTest(false);
  });

  return {
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      window.clearTimeout(resume);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      geometry?.dispose();
      material.dispose();
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

