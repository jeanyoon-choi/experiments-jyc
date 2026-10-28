// The main screen's objects as product shots: each of bubble/7's kinds,
// rebuilt from its copied meshes (shapes.ts, models.ts, gpu.ts), coated in
// mirror chrome under a studio light and shot on a candy backdrop — Koons's
// finish, an ad's light (NOTES 1020: "Too perfect to be real - 상업적 3D
// object"). Rendered once each, after start-up, a few frames apart, and
// handed to the photographs (content/media.ts) as blob URLs.
//
// The objects will keep changing upstream; when bubble/N's objects change,
// copy its shapes/models/gpu here again and edit objects.ts.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { setObjectRender } from "../content/media";
import { OBJECT_KINDS, type ObjectKind } from "./objects";
import { shapeOf } from "./shapes";

/** Squid Game's pink and teal, acid yellow, electric blue, orange (bubble/7's 전파 colours), softened as studio sweeps. */
const BACKDROPS: readonly [string, string][] = [
  ["#ffd1e3", "#ff5d9e"],
  ["#c9fff4", "#2ec4b6"],
  ["#fbffc2", "#e6f13a"],
  ["#d6e2ff", "#3d6bff"],
  ["#ffe2c4", "#ff8a1f"],
  ["#f1f1f4", "#b9bcc6"],
];

function mesh(kind: ObjectKind) {
  const shape = shapeOf(kind, true);
  const geometry = new THREE.BufferGeometry();
  // The raft's frame is y down; three's is y up.
  const positions = shape.positions.slice();
  const normals = shape.normals.slice();
  for (let index = 1; index < positions.length; index += 3) {
    positions[index] = -positions[index]!;
    normals[index] = -normals[index]!;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  // Flipping y mirrors the winding; reverse it so the faces still face the camera.
  const indices = shape.indices.slice();
  for (let index = 0; index < indices.length; index += 3) [indices[index + 1], indices[index + 2]] = [indices[index + 2]!, indices[index + 1]!];
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

export function renderObjects(kinds: readonly string[] = OBJECT_KINDS, size = 640) {
  let disposed = false;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  const scene = new THREE.Scene();
  scene.environment = environment;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0.35, -0.55, 4.6);
  camera.lookAt(0, 0, 0.2);
  const material = new THREE.MeshStandardMaterial({ color: "#f4f4f6", metalness: 1, roughness: 0.08, envMapIntensity: 1.25 });
  const key = new THREE.DirectionalLight("#ffffff", 1.2);
  key.position.set(-2, 3, 4);
  scene.add(key);

  const queue = kinds.filter((kind): kind is ObjectKind => (OBJECT_KINDS as readonly string[]).includes(kind));
  let index = 0;
  const next = () => {
    if (disposed || index >= queue.length) return finish();
    const kind = queue[index]!;
    const [light, deep] = BACKDROPS[index % BACKDROPS.length]!;
    index += 1;
    const sweep = document.createElement("canvas");
    sweep.width = sweep.height = 256;
    const ctx = sweep.getContext("2d")!;
    const gradient = ctx.createRadialGradient(128, 90, 10, 128, 140, 210);
    gradient.addColorStop(0, light);
    gradient.addColorStop(1, deep);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const backdrop = new THREE.CanvasTexture(sweep);
    backdrop.colorSpace = THREE.SRGBColorSpace;
    scene.background = backdrop;
    const object = new THREE.Mesh(mesh(kind), material);
    object.rotation.set(-0.18, 0.32, -0.06);
    scene.add(object);
    renderer.render(scene, camera);
    scene.remove(object);
    object.geometry.dispose();
    backdrop.dispose();
    canvas.toBlob(
      (blob) => {
        if (blob && !disposed) setObjectRender(kind, URL.createObjectURL(blob));
        setTimeout(next, 60);
      },
      "image/jpeg",
      0.88,
    );
  };
  const finish = () => {
    environment.dispose();
    pmrem.dispose();
    material.dispose();
    renderer.dispose();
  };
  setTimeout(next, 400);
  return () => {
    disposed = true;
  };
}
