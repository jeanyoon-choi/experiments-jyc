import * as THREE from "three";

const MAX_FISH_COUNT = 80;

export type GoldfishAgent = Readonly<{ id: number; x: number; y: number; vx: number; vy: number }>;

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

/** A top-locked, transparent WebGL layer: field coordinates remain CSS pixels. */
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
  private readonly phases = new Float64Array(MAX_FISH_COUNT);
  private width = 1;
  private height = 1;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, count = 72) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    for (let index = 0; index < MAX_FISH_COUNT; index += 1) this.phases[index] = index * 1.719;
    this.scene.add(new THREE.HemisphereLight("#d7e0ff", "#11141d", 1.55));
    const light = new THREE.DirectionalLight("#ffd6a0", 2.15);
    light.position.set(-0.35, 1, 0.55);
    this.scene.add(light);
    const body = new THREE.SphereGeometry(1, 22, 15);
    const peduncle = new THREE.CylinderGeometry(0.68, 1.2, 2.5, 12, 1);
    peduncle.rotateZ(Math.PI / 2);
    const eye = new THREE.SphereGeometry(0.43, 12, 8);
    this.body = new THREE.InstancedMesh(body, this.bodyMaterial, MAX_FISH_COUNT);
    this.peduncle = new THREE.InstancedMesh(peduncle, this.bodyMaterial, MAX_FISH_COUNT);
    this.tail = new THREE.InstancedMesh(tailGeometry(), this.finMaterial, MAX_FISH_COUNT);
    this.dorsalFin = new THREE.InstancedMesh(finGeometry(), this.finMaterial, MAX_FISH_COUNT);
    this.leftFin = new THREE.InstancedMesh(finGeometry(), this.finMaterial, MAX_FISH_COUNT);
    this.rightFin = new THREE.InstancedMesh(finGeometry(), this.finMaterial, MAX_FISH_COUNT);
    this.leftEye = new THREE.InstancedMesh(eye, this.eyeMaterial, MAX_FISH_COUNT);
    this.rightEye = new THREE.InstancedMesh(eye, this.eyeMaterial, MAX_FISH_COUNT);
    this.meshes = [this.body, this.peduncle, this.tail, this.dorsalFin, this.leftFin, this.rightFin, this.leftEye, this.rightEye];
    for (const mesh of this.meshes) { mesh.count = Math.min(MAX_FISH_COUNT, count); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; this.scene.add(mesh); }
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width); this.height = Math.max(1, height);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = -this.width / 2; this.camera.right = this.width / 2;
    this.camera.top = this.height / 2; this.camera.bottom = -this.height / 2;
    const distance = Math.max(this.width, this.height) * 1.1;
    this.camera.position.set(0, distance, 0); this.camera.up.set(0, 0, -1); this.camera.lookAt(0, 0, 0); this.camera.updateProjectionMatrix();
  }

  render(agents: readonly GoldfishAgent[], elapsedSeconds: number, deltaSeconds = 0) {
    if (this.disposed) return;
    const count = Math.min(MAX_FISH_COUNT, agents.length);
    for (const mesh of this.meshes) mesh.count = count;
    for (let index = 0; index < count; index += 1) {
      const fish = agents[index]!;
      const speed = Math.hypot(fish.vx, fish.vy);
      this.phases[index] = THREE.MathUtils.euclideanModulo(this.phases[index]! + deltaSeconds * (5.2 + speed * 0.018), Math.PI * 2);
      const phase = this.phases[index]!;
      const tailAngle = Math.sin(phase) * 0.38;
      const heading = Math.atan2(fish.vy, fish.vx);
      this.root.position.set(fish.x - this.width / 2, 10 + Math.sin(elapsedSeconds * 0.55 + fish.id * 2.173) * 1.2, fish.y - this.height / 2);
      this.root.rotation.set(0, -heading, 0);
      this.root.scale.setScalar(1.5);
      this.root.updateMatrix();
      const pulse = 1 + Math.sin(phase * 0.5) * 0.016;
      this.part(this.body, index, 0.15, 0, 0, 0, 0, 0, 5.65 * pulse, 3.38, 2.72);
      this.part(this.peduncle, index, -5.35, 0, 0, 0, 0, 0, 1, 1.08, 1.12);
      this.part(this.tail, index, -6.05, 0, 0, fish.id % 2 ? -0.58 : 0.58, tailAngle, 0, 1, 1, 1);
      this.part(this.dorsalFin, index, -0.9, 2.75, 0, 0.08, 0, 0, 1, 0.95, 1);
      this.part(this.leftFin, index, 1.25, -0.1, 2.28, 0.8 + tailAngle * 0.18, -0.12, -0.3, 0.88, 0.68, 0.84);
      this.part(this.rightFin, index, 1.25, -0.1, -2.28, -0.8 - tailAngle * 0.18, 0.12, -0.3, 0.88, 0.68, 0.84);
      this.part(this.leftEye, index, 3.85, 2.1, 2.45, 0, 0, 0, 2, 2, 2);
      this.part(this.rightEye, index, 3.85, 2.1, -2.45, 0, 0, 0, 2, 2, 2);
    }
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() { if (this.disposed) return; this.disposed = true; for (const mesh of this.meshes) { mesh.geometry.dispose(); mesh.dispose(); } this.bodyMaterial.dispose(); this.finMaterial.dispose(); this.eyeMaterial.dispose(); this.renderer.dispose(); }

  private part(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) {
    this.local.position.set(x, y, z); this.local.rotation.set(rx, ry, rz); this.local.scale.set(sx, sy, sz); this.local.updateMatrix();
    this.matrix.multiplyMatrices(this.root.matrix, this.local.matrix); mesh.setMatrixAt(index, this.matrix);
  }
}
