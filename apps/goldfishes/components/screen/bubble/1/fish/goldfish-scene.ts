// The goldfish body of Goldfishes' screen/tech-eyes/1 (rendering/goldfish-scene.ts),
// copied without its traces, target lines and approach rings: instanced
// parts under a top-locked orthographic camera, on a transparent canvas laid
// over the raft. Field coordinates are CSS px. Created only once fish are asked for.

import * as THREE from "three";
import { FISH_PALETTES, MAX_FISH, MIX_PALETTES, type Fish, type FishPaletteId } from "./goldfish";

function tailGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.45, 1.12);
  shape.bezierCurveTo(-1.25, 1.82, -3.62, 3.92, -5.8, 4.12);
  shape.bezierCurveTo(-5.28, 2.1, -3.72, 0.64, -2.02, 0);
  shape.bezierCurveTo(-3.72, -0.64, -5.28, -2.1, -5.8, -4.12);
  shape.bezierCurveTo(-3.62, -3.92, -1.25, -1.82, 0.45, -1.12);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments: 2, bevelSize: 0.16, bevelThickness: 0.16, curveSegments: 7, depth: 0.34, steps: 1 });
  geometry.translate(0, 0, -0.17);
  return geometry;
}

function finGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0);
  shape.bezierCurveTo(-1.05, 1.4, 0.35, 2.9, 2.35, 2.7);
  shape.bezierCurveTo(1.45, 1.2, 0.45, 0.24, -2.1, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments: 1, bevelSize: 0.08, bevelThickness: 0.07, curveSegments: 6, depth: 0.15, steps: 1 });
  geometry.translate(0, 0, -0.075);
  return geometry;
}

export class GoldfishScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 20_000);
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({ color: "#cf741c", emissive: "#cf741c", emissiveIntensity: 0.035, roughness: 0.27, metalness: 0.055 });
  private readonly finMaterial = new THREE.MeshStandardMaterial({ color: "#e7b365", emissive: "#e7b365", emissiveIntensity: 0.035, roughness: 0.4, transparent: true, opacity: 0.72, depthWrite: true, side: THREE.DoubleSide });
  private readonly eyeMaterial = new THREE.MeshStandardMaterial({ color: "#050403", roughness: 0.045, metalness: 0.025 });
  private readonly body: THREE.InstancedMesh;
  private readonly peduncle: THREE.InstancedMesh;
  private readonly tail: THREE.InstancedMesh;
  private readonly dorsalFin: THREE.InstancedMesh;
  private readonly leftFin: THREE.InstancedMesh;
  private readonly rightFin: THREE.InstancedMesh;
  private readonly leftEye: THREE.InstancedMesh;
  private readonly rightEye: THREE.InstancedMesh;
  private readonly meshes: readonly THREE.InstancedMesh[];
  private readonly root = new THREE.Object3D();
  private readonly local = new THREE.Object3D();
  private readonly matrix = new THREE.Matrix4();
  /** Parts that never move on the body: their local matrices, composed once. */
  private readonly fixedParts = {
    peduncle: this.localMatrix(-5.35, 0, 0, 0, 0, 0, 1, 1.08, 1.12),
    dorsalFin: this.localMatrix(-0.9, 2.75, 0, 0.08, 0, 0, 1, 0.95, 1),
    leftEye: this.localMatrix(3.85, 2.1, 2.45, 0, 0, 0, 2, 2, 2),
    rightEye: this.localMatrix(3.85, 2.1, -2.45, 0, 0, 0, 2, 2, 2),
  };
  private readonly phases = new Float64Array(MAX_FISH);
  private palette: FishPaletteId | undefined;
  private width = 1;
  private height = 1;
  private shownCount = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    for (let index = 0; index < MAX_FISH; index += 1) this.phases[index] = index * 1.719;
    this.scene.add(new THREE.HemisphereLight("#d7e0ff", "#11141d", 1.55));
    const light = new THREE.DirectionalLight("#ffd6a0", 2.15);
    light.position.set(-0.35, 1, 0.55);
    this.scene.add(light);
    const body = new THREE.SphereGeometry(1, 22, 15);
    const peduncle = new THREE.CylinderGeometry(0.68, 1.2, 2.5, 12, 1);
    peduncle.rotateZ(Math.PI / 2);
    const eye = new THREE.SphereGeometry(0.43, 12, 8);
    this.body = new THREE.InstancedMesh(body, this.bodyMaterial, MAX_FISH);
    this.peduncle = new THREE.InstancedMesh(peduncle, this.bodyMaterial, MAX_FISH);
    this.tail = new THREE.InstancedMesh(tailGeometry(), this.finMaterial, MAX_FISH);
    this.dorsalFin = new THREE.InstancedMesh(finGeometry(), this.finMaterial, MAX_FISH);
    this.leftFin = new THREE.InstancedMesh(finGeometry(), this.finMaterial, MAX_FISH);
    this.rightFin = new THREE.InstancedMesh(finGeometry(), this.finMaterial, MAX_FISH);
    this.leftEye = new THREE.InstancedMesh(eye, this.eyeMaterial, MAX_FISH);
    this.rightEye = new THREE.InstancedMesh(eye, this.eyeMaterial, MAX_FISH);
    this.meshes = [this.body, this.peduncle, this.tail, this.dorsalFin, this.leftFin, this.rightFin, this.leftEye, this.rightEye];
    for (const mesh of this.meshes) {
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    }
  }

  /** Drawn at CSS resolution, as tech-eyes/1 draws its fish (pixel ratio 1). */
  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    const distance = Math.max(this.width, this.height) * 1.1;
    this.camera.position.set(0, distance, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.shownCount = -1;
  }

  render(fish: readonly Fish[], elapsedSeconds: number, deltaSeconds: number, scale: number, palette: FishPaletteId) {
    const count = Math.min(MAX_FISH, fish.length);
    // Nothing to draw and nothing drawn: leave the cleared canvas alone.
    if (count === 0 && this.shownCount === 0) return;
    this.setPalette(palette);
    for (const mesh of this.meshes) if (mesh.count !== count) mesh.count = count;
    this.root.scale.setScalar(scale);
    for (let index = 0; index < count; index += 1) {
      const agent = fish[index]!;
      const speed = Math.hypot(agent.vx, agent.vy);
      this.phases[index] = THREE.MathUtils.euclideanModulo(this.phases[index]! + deltaSeconds * (5.2 + speed * 0.018), Math.PI * 2);
      const phase = this.phases[index]!;
      const tailAngle = Math.sin(phase) * 0.38;
      this.root.position.set(agent.x - this.width / 2, 10 + Math.sin(elapsedSeconds * 0.55 + index * 2.173) * 1.2, agent.y - this.height / 2);
      this.root.rotation.set(0, -agent.facing, 0);
      this.root.updateMatrix();
      const pulse = 1 + Math.sin(phase * 0.5) * 0.016;
      this.part(this.body, index, 0.15, 0, 0, 0, 0, 0, 5.65 * pulse, 3.38, 2.72);
      this.placePart(this.peduncle, index, this.fixedParts.peduncle);
      this.part(this.tail, index, -6.05, 0, 0, index % 2 ? -0.58 : 0.58, tailAngle, 0, 1, 1, 1);
      this.placePart(this.dorsalFin, index, this.fixedParts.dorsalFin);
      this.part(this.leftFin, index, 1.25, -0.1, 2.28, 0.8 + tailAngle * 0.18, -0.12, -0.3, 0.88, 0.68, 0.84);
      this.part(this.rightFin, index, 1.25, -0.1, -2.28, -0.8 - tailAngle * 0.18, 0.12, -0.3, 0.88, 0.68, 0.84);
      this.placePart(this.leftEye, index, this.fixedParts.leftEye);
      this.placePart(this.rightEye, index, this.fixedParts.rightEye);
    }
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    this.shownCount = count;
  }

  dispose() {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.bodyMaterial.dispose();
    this.finMaterial.dispose();
    this.eyeMaterial.dispose();
    this.renderer.dispose();
  }

  /**
   * Colours travel per instance (the materials stay white), so 섞음 can deal a
   * different palette to every fish — by a hash of its index, stable while it
   * lives — and a single palette colours them all alike.
   */
  private setPalette(id: FishPaletteId) {
    if (this.palette === id) return;
    this.palette = id;
    const palette = FISH_PALETTES[id];
    this.bodyMaterial.color.set("#ffffff");
    this.bodyMaterial.emissive.set(palette.body);
    this.finMaterial.color.set("#ffffff");
    this.finMaterial.emissive.set(palette.fin);
    const choices = id === "mix" ? MIX_PALETTES.map((choice) => FISH_PALETTES[choice]) : [palette];
    const body = new THREE.Color();
    const fin = new THREE.Color();
    for (let index = 0; index < MAX_FISH; index += 1) {
      const hashed = Math.sin(index * 12.9898 + 78.233) * 43_758.5453;
      const choice = choices[Math.floor((hashed - Math.floor(hashed)) * choices.length)] ?? palette;
      body.set(choice.body);
      fin.set(choice.fin);
      this.body.setColorAt(index, body);
      this.peduncle.setColorAt(index, body);
      this.tail.setColorAt(index, fin);
      this.dorsalFin.setColorAt(index, fin);
      this.leftFin.setColorAt(index, fin);
      this.rightFin.setColorAt(index, fin);
    }
    for (const mesh of [this.body, this.peduncle, this.tail, this.dorsalFin, this.leftFin, this.rightFin]) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  /** A part's matrix on the body: position, Euler rotation, scale. */
  private localMatrix(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) {
    this.local.position.set(x, y, z);
    this.local.rotation.set(rx, ry, rz);
    this.local.scale.set(sx, sy, sz);
    this.local.updateMatrix();
    return this.local.matrix.clone();
  }

  private part(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) {
    this.local.position.set(x, y, z);
    this.local.rotation.set(rx, ry, rz);
    this.local.scale.set(sx, sy, sz);
    this.local.updateMatrix();
    this.placePart(mesh, index, this.local.matrix);
  }

  private placePart(mesh: THREE.InstancedMesh, index: number, local: THREE.Matrix4) {
    this.matrix.multiplyMatrices(this.root.matrix, local);
    mesh.setMatrixAt(index, this.matrix);
  }
}
