// The picture: the work's own goldfish in a white studio, holding a mobile far too large for it by its edges and
// looking into it. The mobile stands upright, square to the ground, so the feed is what is seen first (user,
// 2026-11-13). Arrangements, switched from the page: one fish, or a wall — the mobiles standing edge to edge, as many
// across as high (5, 10 or 15), every fish before its own.
//
// A product photograph's light: a soft room for the reflections, one key drawing shadows on the ground. With one
// fish its screen is one more light. No post-processing: the ground is the canvas's clear colour, pure white, which
// a tone-mapped full-screen pass would turn grey.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createSchool, FISH_UNIT } from "./fish/goldfish";
import { createMobiles, MOBILE_SIZE } from "./mobile/mobile";
import type { Settings } from "./settings";

/** How many mobiles across and high: 1 is the one fish, more is a wall of that many squared. */
type Arrangement = number;

const FLOOR = -0.66;
/** The fish hangs at the lower part of its screen, its snout (5.8 model units ahead of its middle) this far from the glass. */
const FISH_Y = FLOOR + 0.44;
const SNOUT_GAP = 0.28;
/** The wall (user, 2026-11-13: upright, the screens as one wall): mobiles side by side across and up, `gap` apart. */

type View = { camera: [number, number, number]; target: [number, number, number]; fov: number; near: number; far: number; shadow: number; reach: [number, number] };
function viewOf(size: Arrangement, gap: number): View {
  const WALL_UP = MOBILE_SIZE.height + gap;
  // One: behind the fish and to its side — its back and tail, and past it the whole screen.
  if (size === 1) return { camera: [-3.9, 0.5, 2.5], target: [0.14, FLOOR + MOBILE_SIZE.height * 0.47, 0], fov: 28, near: 0.05, far: 60, shadow: 2, reach: [1.4, 9] };
  // A wall: before it and a little to its side, far enough back to take its whole height.
  const height = size * WALL_UP;
  const back = height * 1.95;
  return { camera: [-back, FLOOR + height * 0.54, back * 0.36], target: [0.6, FLOOR + height * 0.49, 0], fov: 30, near: 0.5, far: back * 6, shadow: height * 0.75, reach: [back * 0.2, back * 2.2] };
}

export function startScene(canvas: HTMLCanvasElement, first: Settings) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

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
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 8;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0006;
  scene.add(key, key.target);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR;
  floor.receiveShadow = true;
  scene.add(floor);

  let settings = first;
  let feedTime = 0;
  let world: { update(time: number): void; dispose(): void } | null = null;
  let fov = 28;
  const fit = () => {
    // The whole picture stays in a tall window too.
    camera.fov = camera.aspect < 1.2 ? Math.min(75, fov * (1.2 / camera.aspect)) : fov;
    camera.updateProjectionMatrix();
  };
  const arrange = () => {
    world?.dispose();
    const next: Arrangement = settings.wall >= 0.5 ? Math.round(settings.size) : 1;
    const WALL_ACROSS = MOBILE_SIZE.width + settings.gap;
    const WALL_UP = MOBILE_SIZE.height + settings.gap;
    const MOBILE_X = 5.8 * FISH_UNIT * settings.fish + SNOUT_GAP;
    // Where each fish hangs, at the lower part of its own screen.
    const places = Array.from({ length: next * next }, (_, index) => new THREE.Vector3(0, FISH_Y + Math.floor(index / next) * WALL_UP, ((index % next) - (next - 1) / 2) * WALL_ACROSS));
    // Upright on the ground, each screen facing back along −x to its fish.
    const upright = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
    const mobiles = createMobiles(
      renderer,
      environment.texture,
      places.map((place) => new THREE.Matrix4().compose(new THREE.Vector3(place.x + MOBILE_X + MOBILE_SIZE.depth / 2, place.y - FISH_Y + FLOOR + MOBILE_SIZE.height / 2 + 0.004, place.z), upright, new THREE.Vector3(1, 1, 1))),
    );
    // A fish's fins on its mobile's two edges, at its own height.
    const school = createSchool(places, (side) => new THREE.Vector3(MOBILE_X + 0.01, -0.02, side * (MOBILE_SIZE.width / 2 - 0.01)), settings.fish);
    scene.add(mobiles.group, school.group);
    world = {
      update(time) {
        mobiles.update(time);
        // The fin's stroke rises and falls over the swipe.
        school.update(time, (index) => Math.sin(Math.min(1, mobiles.swipe(index)) * Math.PI));
      },
      dispose() {
        scene.remove(mobiles.group, school.group);
        mobiles.dispose();
        school.dispose();
      },
    };
    const view = viewOf(next, settings.gap);
    // A hundred small fish need fewer pixels than one large one.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, next === 1 ? 2 : 1.5));
    resize();
    camera.position.set(...view.camera);
    camera.near = view.near;
    camera.far = view.far;
    controls.target.set(...view.target);
    [controls.minDistance, controls.maxDistance] = view.reach;
    controls.update();
    fov = view.fov;
    fit();
    key.position.set(-0.35 * view.shadow * 2, view.shadow * 2, 0.55 * view.shadow * 2);
    const shadow = key.shadow.camera;
    shadow.left = -view.shadow;
    shadow.right = view.shadow;
    shadow.top = view.shadow;
    shadow.bottom = -view.shadow;
    shadow.near = view.shadow * 0.5;
    shadow.far = view.shadow * 5;
    shadow.updateProjectionMatrix();
  };

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    fit();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  arrange();

  let frame = 0;
  let last = performance.now();
  const loop = () => {
    frame = requestAnimationFrame(loop);
    const now = performance.now();
    // The feeds' own clock runs at 넘기는 속도.
    feedTime += Math.min(0.1, (now - last) / 1000) * settings.pace;
    last = now;
    world?.update(feedTime);
    controls.update();
    renderer.render(scene, camera);
  };
  loop();

  return {
    apply(next: Settings) {
      // Only the pace changes without the picture being set up again.
      const same = next.wall === settings.wall && next.size === settings.size && next.gap === settings.gap && next.fish === settings.fish;
      settings = next;
      if (!same) arrange();
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      world?.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      environment.dispose();
      pmrem.dispose();
      room.dispose();
      renderer.dispose();
    },
  };
}
