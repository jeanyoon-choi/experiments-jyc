import * as THREE from "three/webgpu";

const MAX_FISH_COUNT = 100;
const INITIAL_TILT_DEGREES = 0;
const MAX_TILT_DEGREES = 70;
const SWIM_DEPTH_MINIMUM = 8;
const SWIM_DEPTH_RANGE = 40;

export type GoldfishAgent = Readonly<{
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}>;

export type FieldPoint = Readonly<{ x: number; y: number }>;

function createTailGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.45, 1.12);
  shape.bezierCurveTo(-1.25, 1.82, -3.62, 3.92, -5.8, 4.12);
  shape.bezierCurveTo(-5.28, 2.1, -3.72, 0.64, -2.02, 0);
  shape.bezierCurveTo(-3.72, -0.64, -5.28, -2.1, -5.8, -4.12);
  shape.bezierCurveTo(-3.62, -3.92, -1.25, -1.82, 0.45, -1.12);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.16,
    bevelThickness: 0.16,
    curveSegments: 7,
    depth: 0.34,
    steps: 1,
  });
  geometry.translate(0, 0, -0.17);
  geometry.computeVertexNormals();
  return geometry;
}

function createFinGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0);
  shape.bezierCurveTo(-1.05, 1.4, 0.35, 2.9, 2.35, 2.7);
  shape.bezierCurveTo(1.45, 1.2, 0.45, 0.24, -2.1, 0);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.08,
    bevelThickness: 0.07,
    curveSegments: 6,
    depth: 0.15,
    steps: 1,
  });
  geometry.translate(0, 0, -0.075);
  geometry.computeVertexNormals();
  return geometry;
}

export class GoldfishScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 20_000);

  private readonly renderer: THREE.WebGPURenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly rayHit = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    color: "#cf741c",
    emissive: "#cf741c",
    emissiveIntensity: 0.035,
    roughness: 0.27,
    metalness: 0.055,
  });
  private readonly finMaterial = new THREE.MeshStandardMaterial({
    color: "#e7b365",
    emissive: "#e7b365",
    emissiveIntensity: 0.035,
    roughness: 0.4,
    metalness: 0,
    transparent: true,
    opacity: 0.72,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  private readonly eyeMaterial = new THREE.MeshStandardMaterial({
    color: "#050403",
    roughness: 0.045,
    metalness: 0.025,
  });
  private readonly body: THREE.InstancedMesh;
  private readonly peduncle: THREE.InstancedMesh;
  private readonly tail: THREE.InstancedMesh;
  private readonly dorsalFin: THREE.InstancedMesh;
  private readonly leftFin: THREE.InstancedMesh;
  private readonly rightFin: THREE.InstancedMesh;
  private readonly leftEye: THREE.InstancedMesh;
  private readonly rightEye: THREE.InstancedMesh;
  private readonly fishMeshes: readonly THREE.InstancedMesh[];
  private readonly root = new THREE.Object3D();
  private readonly local = new THREE.Object3D();
  private readonly finalMatrix = new THREE.Matrix4();
  private width = 1;
  private height = 1;
  private fitDistance = 1;
  private azimuth = 0;
  private tiltDegrees = INITIAL_TILT_DEGREES;
  private cameraZoom = 1;
  private deviceLostHandler: (() => void) | null = null;
  private disposed = false;

  private constructor(canvas: HTMLCanvasElement, count: number) {
    this.renderer = new THREE.WebGPURenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.onDeviceLost = () => {
      this.dispose();
      this.deviceLostHandler?.();
    };

    this.scene.add(
      new THREE.HemisphereLight("#d7e0ff", "#11141d", 1.55),
      new THREE.DirectionalLight("#ffd6a0", 2.15),
    );
    const keyLight = this.scene.children.at(-1) as THREE.DirectionalLight;
    keyLight.position.set(-0.35, 1, 0.55);

    const bodyGeometry = new THREE.SphereGeometry(1, 22, 15);
    const peduncleGeometry = new THREE.CylinderGeometry(0.68, 1.2, 2.5, 12, 1);
    peduncleGeometry.rotateZ(Math.PI / 2);
    const tailGeometry = createTailGeometry();
    const finGeometry = createFinGeometry();
    const eyeGeometry = new THREE.SphereGeometry(0.43, 12, 8);

    this.body = new THREE.InstancedMesh(bodyGeometry, this.bodyMaterial, MAX_FISH_COUNT);
    this.peduncle = new THREE.InstancedMesh(peduncleGeometry, this.bodyMaterial, MAX_FISH_COUNT);
    this.tail = new THREE.InstancedMesh(tailGeometry, this.finMaterial, MAX_FISH_COUNT);
    this.dorsalFin = new THREE.InstancedMesh(finGeometry, this.finMaterial, MAX_FISH_COUNT);
    this.leftFin = new THREE.InstancedMesh(finGeometry, this.finMaterial, MAX_FISH_COUNT);
    this.rightFin = new THREE.InstancedMesh(finGeometry, this.finMaterial, MAX_FISH_COUNT);
    this.leftEye = new THREE.InstancedMesh(eyeGeometry, this.eyeMaterial, MAX_FISH_COUNT);
    this.rightEye = new THREE.InstancedMesh(eyeGeometry, this.eyeMaterial, MAX_FISH_COUNT);
    this.fishMeshes = [this.body, this.peduncle, this.tail, this.dorsalFin, this.leftFin, this.rightFin, this.leftEye, this.rightEye];

    const activeCount = Math.min(MAX_FISH_COUNT, Math.max(0, Math.floor(count)));
    for (const mesh of this.fishMeshes) {
      mesh.count = activeCount;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    }
  }

  static async create(canvas: HTMLCanvasElement, count: number): Promise<GoldfishScene> {
    const goldfishScene = new GoldfishScene(canvas, count);
    try {
      await goldfishScene.renderer.init();
      if (goldfishScene.disposed) throw new Error("Goldfish scene was disposed during WebGPU initialization.");
      goldfishScene.updateCamera();
      return goldfishScene;
    } catch (error) {
      goldfishScene.dispose();
      throw error;
    }
  }

  addField(object: THREE.Object3D) {
    this.scene.add(object);
  }

  setDeviceLostHandler(handler: (() => void) | null) {
    this.deviceLostHandler = handler;
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(1);
    // Preserve CSS-pixel projection while bounding attachments on very large displays.
    const resolution = Math.min(1, Math.sqrt(4_194_304 / (this.width * this.height)));
    this.renderer.setSize(Math.max(1, Math.floor(this.width * resolution)), Math.max(1, Math.floor(this.height * resolution)), false);
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.fitDistance = Math.max(this.width, this.height) * 1.5;
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  setView(tiltDegrees: number) {
    this.tiltDegrees = THREE.MathUtils.clamp(tiltDegrees, 0, MAX_TILT_DEGREES);
    this.azimuth = 0;
    this.updateCamera();
  }

  orbit(deltaX: number, deltaY: number) {
    this.azimuth = THREE.MathUtils.euclideanModulo(this.azimuth - deltaX * 0.0045, Math.PI * 2);
    this.tiltDegrees = THREE.MathUtils.clamp(this.tiltDegrees + deltaY * 0.2, 0, MAX_TILT_DEGREES);
    this.updateCamera();
  }

  zoom(deltaY: number) {
    this.cameraZoom = THREE.MathUtils.clamp(this.cameraZoom * Math.exp(deltaY * 0.0015), 0.28, 3);
    this.updateCamera();
  }

  resetCamera() {
    this.azimuth = 0;
    this.tiltDegrees = INITIAL_TILT_DEGREES;
    this.cameraZoom = 1;
    this.updateCamera();
  }

  screenToField(screenX: number, screenY: number): FieldPoint | null {
    this.ndc.set((screenX / this.width) * 2 - 1, -(screenY / this.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.floor, this.rayHit)) return null;
    const x = this.rayHit.x + this.width / 2;
    const y = this.rayHit.z + this.height / 2;
    return x < 0 || x > this.width || y < 0 || y > this.height ? null : { x, y };
  }

  render(agents: readonly GoldfishAgent[], elapsedSeconds: number) {
    if (this.disposed) return;
    const count = Math.min(MAX_FISH_COUNT, agents.length);
    for (const mesh of this.fishMeshes) mesh.count = count;

    for (let index = 0; index < count; index += 1) {
      const agent = agents[index]!;
      const speed = Math.hypot(agent.vx, agent.vy);
      const heading = Math.atan2(agent.vy, agent.vx);
      const phase = elapsedSeconds * (5.2 + speed * 0.018) + agent.id * 1.719;
      const depthSeed = (Math.sin(agent.id * 9.73) + 1) / 2;
      const swimHeight = SWIM_DEPTH_MINIMUM + depthSeed * SWIM_DEPTH_RANGE + Math.sin(elapsedSeconds * 0.55 + agent.id * 2.173) * SWIM_DEPTH_RANGE * 0.16;
      const tailAngle = Math.sin(phase) * 0.38;
      const bodyPulse = 1 + Math.sin(phase * 0.5) * 0.016;
      const bank = THREE.MathUtils.clamp(agent.vy / 110, -0.24, 0.24);
      const tailCant = (agent.id % 2 === 0 ? 1 : -1) * 0.58;

      this.root.position.set(agent.x - this.width / 2, swimHeight, agent.y - this.height / 2);
      this.root.rotation.set(bank * 0.18, -heading, bank);
      // Match the legible naturalistic fish size of 0806/side-view.
      this.root.scale.setScalar(3);
      this.root.updateMatrix();

      this.setPartMatrix(this.body, index, 0.15, 0, 0, 0, 0, 0, 5.65 * bodyPulse, 3.38, 2.72);
      this.setPartMatrix(this.peduncle, index, -5.35, 0, 0, 0, 0, 0, 1, 1.08, 1.12);
      this.setPartMatrix(this.tail, index, -6.05, 0, 0, tailCant, tailAngle, 0, 1, 1, 1);
      this.setPartMatrix(this.dorsalFin, index, -0.9, 2.75, 0, 0.08, 0, 0, 1, 0.95, 1);
      this.setPartMatrix(this.leftFin, index, 1.25, -0.1, 2.28, 0.8 + tailAngle * 0.18, -0.12, -0.3, 0.88, 0.68, 0.84);
      this.setPartMatrix(this.rightFin, index, 1.25, -0.1, -2.28, -0.8 - tailAngle * 0.18, 0.12, -0.3, 0.88, 0.68, 0.84);
      this.setPartMatrix(this.leftEye, index, 3.85, 2.1, 2.45, 0, 0, 0, 2, 2, 2);
      this.setPartMatrix(this.rightEye, index, 3.85, 2.1, -2.45, 0, 0, 0, 2, 2, 2);
    }

    for (const mesh of this.fishMeshes) mesh.instanceMatrix.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const geometry of new Set(this.fishMeshes.map((mesh) => mesh.geometry))) geometry.dispose();
    for (const mesh of this.fishMeshes) mesh.dispose();
    this.bodyMaterial.dispose();
    this.finMaterial.dispose();
    this.eyeMaterial.dispose();
    this.renderer.dispose();
  }

  private updateCamera() {
    const tilt = THREE.MathUtils.degToRad(this.tiltDegrees);
    const distance = this.fitDistance * this.cameraZoom;
    const horizontalDistance = Math.sin(tilt) * distance;
    const sinAzimuth = Math.sin(this.azimuth);
    const cosAzimuth = Math.cos(this.azimuth);
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);
    this.camera.position.set(sinAzimuth * horizontalDistance, cosTilt * distance, cosAzimuth * horizontalDistance);
    this.camera.up.set(-sinAzimuth * cosTilt, sinTilt, -cosAzimuth * cosTilt);
    this.camera.near = Math.max(1, distance * 0.34);
    this.camera.far = distance * 2.35 + 520;
    this.camera.zoom = 1 / this.cameraZoom;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  private setPartMatrix(
    mesh: THREE.InstancedMesh,
    index: number,
    px: number,
    py: number,
    pz: number,
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    this.local.position.set(px, py, pz);
    this.local.rotation.set(rx, ry, rz);
    this.local.scale.set(sx, sy, sz);
    this.local.updateMatrix();
    this.finalMatrix.multiplyMatrices(this.root.matrix, this.local.matrix);
    mesh.setMatrixAt(index, this.finalMatrix);
  }
}
