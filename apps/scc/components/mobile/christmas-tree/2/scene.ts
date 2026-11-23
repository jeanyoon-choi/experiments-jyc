import * as THREE from "three";
import { TREE_RADIUS, TREE_TOP, plantTree } from "./tree";

// Whose head fills the tree. Each is a cut-out photograph and the same photograph as a relief head,
// built by build-model.mjs (credits in public/images/christmas-tree/license.txt). Raise ?v= when a
// build's output changes.
export const FACES = [
  { id: "zuckerberg", label: "저커버그", name: "마크 저커버그", image: "/images/christmas-tree/face.webp", head: "/3d/christmas-tree/zuckerberg.json?v=2" },
  { id: "kim", label: "김정은", name: "김정은", image: "/images/christmas-tree/kim.webp", head: "/3d/christmas-tree/kim.json?v=2" },
] as const;
export type FaceId = (typeof FACES)[number]["id"];
const MAX_DPR = 2;
// Resolution governor, as in /1: when frames keep running late the canvas drops a step and stays there.
const SLOW_MS = 22; // a frame later than this missed 60 Hz
const WINDOW = 45; // frames judged together
const SLOW_SHARE = 0.4;
const DPR_STEP = 0.85;
const MIN_DPR = 1.25;
const TURN_RATE = 0.28; // rad/s, left alone
const RESUME_MS = 2500;
const FOV = 30;
const TOPPER = 0.17; // height of the head at the top, where the star goes
const ELEVATION = 0.1; // rad, where the camera starts: looking slightly down
const LOWEST = -0.45; // rad, from under the boughs
const HIGHEST = 1.35; // rad, nearly from straight above

type Head = { positions: number[]; uvs: number[]; indices: number[] };

export function createTree(host: HTMLElement, first: FaceId) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  let ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const minRatio = Math.min(ratio, MIN_DPR);
  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#000");
  // One hard light fixed in the room and little else: noses, brows and cheeks shade themselves, and
  // each head passes from lit to dark as the tree carries it round.
  const key = new THREE.DirectionalLight("#ffffff", 3.1);
  key.position.set(-0.8, 0.7, 1);
  const sky = new THREE.HemisphereLight("#ffffff", "#2a2a2a", 0.85);
  scene.add(key, sky);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 20);
  const top = TREE_TOP + TOPPER * 0.8;
  const middle = top / 2;

  // the backs show from above, from under the boughs and behind the one at the top
  const material = new THREE.MeshLambertMaterial({ alphaTest: 0.5, side: THREE.DoubleSide });

  const tree = new THREE.Group();
  const topper = new THREE.Group();
  topper.position.set(0, TREE_TOP + TOPPER * 0.3, 0);
  scene.add(tree, topper);

  // every head is one instance of the same relief; where each sits does not depend on whose it is
  const leaves = plantTree();
  const placement = new THREE.InstancedBufferAttribute(new Float32Array(leaves.length * 16), 16);
  {
    const matrix = new THREE.Matrix4();
    const basis = new THREE.Matrix4();
    const tip = new THREE.Matrix4();
    const roll = new THREE.Matrix4();
    const along = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const across = new THREE.Vector3();
    const size = new THREE.Vector3();
    leaves.forEach((leaf, i) => {
      const cx = Math.cos(leaf.azimuth);
      const cz = Math.sin(leaf.azimuth);
      const s = Math.sin(leaf.slope);
      const c = Math.cos(leaf.slope);
      along.set(-cx * s, c, -cz * s); // up the skirt
      normal.set(cx * c, s, cz * c); // out of it
      across.crossVectors(along, normal);
      basis.makeBasis(across, along, normal).setPosition(leaf.x, leaf.y, leaf.z);
      tip.makeRotationX(leaf.lean);
      roll.makeRotationZ(leaf.roll);
      matrix.copy(basis).multiply(tip).multiply(roll).scale(size.setScalar(leaf.size));
      matrix.toArray(placement.array, i * 16);
    });
  }

  let disposed = false;
  let heads: THREE.InstancedMesh | null = null;
  let star: THREE.Mesh | null = null;
  const loaded = new Map<FaceId, Promise<{ geometry: THREE.BufferGeometry; texture: THREE.Texture }>>();
  const load = (id: FaceId) => {
    let entry = loaded.get(id);
    if (!entry) {
      const face = FACES.find((item) => item.id === id)!;
      entry = Promise.all([
        fetch(face.head).then((response) => response.json() as Promise<Head>),
        new THREE.TextureLoader().loadAsync(face.image),
      ]).then(([head, texture]) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(head.positions, 3));
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(head.uvs, 2));
        geometry.setIndex(head.indices);
        geometry.computeVertexNormals();
        return { geometry, texture };
      });
      loaded.set(id, entry);
    }
    return entry;
  };
  let wanted: FaceId = first;
  const setFace = (id: FaceId) => {
    wanted = id;
    load(id)
      .then(({ geometry, texture }) => {
        // a later choice may have overtaken this one while it loaded
        if (disposed || wanted !== id) return;
        material.map = texture;
        material.needsUpdate = true;
        if (!heads || !star) {
          heads = new THREE.InstancedMesh(geometry, material, leaves.length);
          heads.instanceMatrix = placement;
          tree.add(heads);
          star = new THREE.Mesh(geometry, material);
          star.scale.setScalar(TOPPER);
          topper.add(star);
        } else {
          heads.geometry = geometry;
          star.geometry = geometry;
        }
      })
      .catch(() => {});
  };
  setFace(first);

  let angle = 0;
  let elevation = ELEVATION;
  let zoom = 1;
  let fitDist = 4;
  let resume = 0;
  let spin = 0; // rad/ms carried from the last drag

  let w = 1;
  let h = 1;
  const fit = () => {
    w = host.clientWidth || 1;
    h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    fitDist = Math.max((top * 0.56) / half, (TREE_RADIUS * 1.26) / (half * camera.aspect));
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(fit);
  observer.observe(host);
  fit();

  // one finger turns the tree and tips the view over or under it, two zoom
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  let lastMove = 0;
  const spread = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onDown = (event: PointerEvent) => {
    host.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    spin = 0;
    if (pointers.size === 2) pinch = spread();
  };
  const onMove = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (pointers.size === 1) {
      const turned = (dx / w) * Math.PI * 1.4;
      angle += turned;
      elevation = THREE.MathUtils.clamp(elevation + (dy / h) * Math.PI * 0.9, LOWEST, HIGHEST);
      const now = performance.now();
      const dt = Math.max(1, now - lastMove);
      spin = dt < 80 ? turned / dt : 0;
      lastMove = now;
    } else if (pointers.size === 2) {
      const now = spread();
      if (pinch > 0 && now > 0) zoom = THREE.MathUtils.clamp((zoom * pinch) / now, 0.12, 1);
      pinch = now;
    }
  };
  const onUp = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    if (performance.now() - lastMove > 80) spin = 0;
    if (pointers.size === 0) resume = performance.now() + RESUME_MS;
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(event.deltaY * 0.0015), 0.12, 1);
  };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  host.addEventListener("wheel", onWheel, { passive: false });

  let last = 0;
  let slow = 0;
  let judged = 0;
  renderer.setAnimationLoop((now: number) => {
    const dt = last ? Math.min(now - last, 100) : 16;
    last = now;
    if (pointers.size === 0) {
      if (Math.abs(spin) > 0.00002) {
        angle += spin * dt;
        spin *= Math.pow(0.996, dt);
      } else if (now >= resume) {
        angle += (TURN_RATE * dt) / 1000;
      }
    }
    tree.rotation.y = angle;
    const dist = fitDist * zoom;
    // zooming in closes on the middle of the tree
    camera.position.set(0, middle + Math.sin(elevation) * dist, Math.cos(elevation) * dist);
    camera.lookAt(0, middle, 0);
    // the one at the top does not turn with the tree: it keeps facing whoever looks
    topper.lookAt(camera.position);
    renderer.render(scene, camera);

    if (dt > SLOW_MS) slow += 1;
    judged += 1;
    if (judged >= WINDOW) {
      if (slow / judged > SLOW_SHARE && ratio > minRatio) {
        ratio = Math.max(minRatio, ratio * DPR_STEP);
        renderer.setPixelRatio(ratio);
        renderer.setSize(w, h, false);
      }
      slow = 0;
      judged = 0;
    }
  });

  return {
    setFace,
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("wheel", onWheel);
      heads?.dispose();
      material.dispose();
      for (const entry of loaded.values()) {
        void entry.then(({ geometry, texture }) => {
          geometry.dispose();
          texture.dispose();
        }).catch(() => {});
      }
      renderer.dispose();
      canvas.remove();
    },
  };
}
