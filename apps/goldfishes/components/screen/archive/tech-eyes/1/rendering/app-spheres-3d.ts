import * as THREE from "three";
import { appServiceAt, appServiceCount, foregroundFor } from "../screen/app-service-mark";

const TILE = 96;
const COLUMNS = 10;
const ROWS = Math.ceil(appServiceCount / COLUMNS);
const WIDTH = COLUMNS * TILE;
const HEIGHT = ROWS * TILE;
const INSPECT_SIZE = 192;
const FRAME_MS = 1000 / 24;
const MAX_PHASE_STEP_MS = FRAME_MS * 2;
const CELL = 2.4;

type Entry = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  index: number;
  active: boolean;
  visible: boolean;
  inspect: boolean;
};

// Angles belong to the app identities, so a bubble leaving and returning does
// not restart its turn. Each starts with its source mark facing the viewer.
const motion = Array.from({ length: appServiceCount }, (_, index) => ({
  y: 0,
  velocity: (index % 2 === 0 ? 1 : -1) * (Math.PI * 2) / (9_000 + (index % 7) * 650),
}));
let lastMotionAt = 0;

export class AppSpheres3DRenderer {
  private readonly renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  private readonly scene = new THREE.Scene();
  private readonly fieldCamera = new THREE.OrthographicCamera(-COLUMNS * CELL / 2, COLUMNS * CELL / 2, ROWS * CELL / 2, -ROWS * CELL / 2, 0.1, 50);
  private readonly inspectCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  private readonly geometry = new THREE.SphereGeometry(1, 40, 28);
  private readonly fieldAtlas = document.createElement("canvas");
  private readonly fieldContext = this.fieldAtlas.getContext("2d")!;
  private readonly entries = new Map<HTMLCanvasElement, Entry>();
  private readonly meshes = new Map<number, THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>();
  private readonly textures = new Map<number, THREE.CanvasTexture>();
  private readonly requested = new Set<number>();
  private readonly inspectorMaterial = new THREE.MeshStandardMaterial();
  private readonly inspector = new THREE.Mesh(this.geometry, this.inspectorMaterial);
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private frameHandle: number | undefined;
  private lastFrame = 0;
  private dirty = true;
  private disposed = false;
  private failed = false;
  private inspectPitch = -0.08;
  private inspectYaw = 0;

  constructor() {
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(WIDTH, HEIGHT, false);
    this.fieldAtlas.width = WIDTH; this.fieldAtlas.height = HEIGHT;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setScissorTest(true);
    this.fieldCamera.position.z = 30;
    this.inspectCamera.position.z = 4.1;
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#354054", 2.2));
    const light = new THREE.DirectionalLight("#ffffff", 2.1);
    light.position.set(-3, 4, 5);
    this.scene.add(light);
    this.inspector.visible = false;
    this.scene.add(this.inspector);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.invalidate);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
  }

  private onVisibility = () => { lastMotionAt = 0; if (!document.hidden) this.invalidate(); };
  private onContextLost = (event: Event) => {
    event.preventDefault(); this.failed = true;
    if (this.frameHandle !== undefined) cancelAnimationFrame(this.frameHandle);
    this.entries.forEach(({ canvas }) => { canvas.style.visibility = "hidden"; canvas.dataset.app3dStatus = "fallback"; });
  };
  private invalidate = () => { this.dirty = true; this.schedule(); };
  private schedule() {
    if (this.frameHandle !== undefined || this.disposed || this.failed || document.hidden) return;
    this.frameHandle = requestAnimationFrame(this.frame);
  }

  private requestTexture(index: number) {
    if (this.requested.has(index)) return;
    this.requested.add(index);
    const service = appServiceAt(index);
    const image = new Image();
    image.onload = () => {
      if (this.disposed) return;
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 128;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = service.background ?? `#${service.icon?.hex ?? "ffffff"}`;
      context.fillRect(0, 0, 256, 128);
      // Three's +Z sphere faces U=.25; the 2D mark occupies that front face.
      context.drawImage(image, 32, 32, 64, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.36, metalness: 0.04 });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.position.set((index % COLUMNS + 0.5 - COLUMNS / 2) * CELL,
        (ROWS / 2 - Math.floor(index / COLUMNS) - 0.5) * CELL, 0);
      mesh.visible = false;
      this.scene.add(mesh);
      this.textures.set(index, texture);
      this.meshes.set(index, mesh);
      this.invalidate();
    };
    image.onerror = () => {
      this.entries.forEach((entry) => { if (entry.index === index) entry.canvas.dataset.app3dStatus = "fallback"; });
    };
    image.src = service.icon
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${foregroundFor(service.icon.hex)}"><path d="${service.icon.path}"/></svg>`)}`
      : service.image!;
  }

  private frame = (now: number) => {
    this.frameHandle = undefined;
    if (this.disposed || this.failed || document.hidden) return;
    if (now - this.lastFrame < FRAME_MS - 1) { this.schedule(); return; }
    const entries = [...this.entries.values()].filter((entry) => entry.visible);
    const moving = !this.reducedMotion.matches && entries.some((entry) => entry.active);
    if (moving && lastMotionAt) {
      const elapsed = Math.min(Math.max(now - lastMotionAt, 0), MAX_PHASE_STEP_MS);
      for (const angle of motion) angle.y += elapsed * angle.velocity;
    }
    lastMotionAt = moving ? now : 0;
    this.lastFrame = now;
    if (!moving && !this.dirty) return;

    const fieldEntries = entries.filter((entry) => !entry.inspect);
    const fieldIndices = new Set(fieldEntries.map((entry) => entry.index));
    for (const [index, mesh] of this.meshes) {
      mesh.visible = fieldIndices.has(index);
      if (mesh.visible) mesh.rotation.set(-0.08 + Math.sin(motion[index]!.y * 0.65) * 0.06, motion[index]!.y, 0);
    }
    this.renderer.setViewport(0, 0, WIDTH, HEIGHT);
    this.renderer.setScissor(0, 0, WIDTH, HEIGHT);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.fieldCamera);
    // Read the WebGL output once; per-bubble copies stay in 2D canvas memory.
    this.fieldContext.drawImage(this.renderer.domElement, 0, 0);
    for (const entry of fieldEntries) {
      if (!this.meshes.has(entry.index)) continue;
      const x = entry.index % COLUMNS * TILE;
      const y = Math.floor(entry.index / COLUMNS) * TILE;
      entry.context.clearRect(0, 0, TILE, TILE);
      entry.context.drawImage(this.fieldAtlas, x, y, TILE, TILE, 0, 0, TILE, TILE);
      entry.canvas.style.backgroundColor = "#171a1e";
      entry.canvas.style.visibility = "visible";
      entry.canvas.dataset.app3dStatus = "ready";
    }

    const inspectorEntry = entries.find((entry) => entry.inspect);
    const inspectMesh = inspectorEntry && this.meshes.get(inspectorEntry.index);
    if (inspectorEntry && inspectMesh) {
      for (const mesh of this.meshes.values()) mesh.visible = false;
      this.inspector.material = inspectMesh.material;
      this.inspector.rotation.set(this.inspectPitch, motion[inspectorEntry.index]!.y + this.inspectYaw, 0);
      this.inspector.visible = true;
      this.renderer.setViewport(0, 0, INSPECT_SIZE, INSPECT_SIZE);
      this.renderer.setScissor(0, 0, INSPECT_SIZE, INSPECT_SIZE);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.inspectCamera);
      this.inspector.visible = false;
      inspectorEntry.context.clearRect(0, 0, INSPECT_SIZE, INSPECT_SIZE);
      inspectorEntry.context.drawImage(this.renderer.domElement, 0, HEIGHT - INSPECT_SIZE, INSPECT_SIZE, INSPECT_SIZE, 0, 0, INSPECT_SIZE, INSPECT_SIZE);
      inspectorEntry.canvas.style.backgroundColor = "#171a1e";
      inspectorEntry.canvas.style.visibility = "visible";
      inspectorEntry.canvas.dataset.app3dStatus = "ready";
    }
    this.dirty = false;
    if (moving) this.schedule();
  };

  attach(canvas: HTMLCanvasElement, index: number, active: boolean, visible: boolean, inspect = false) {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) { canvas.dataset.app3dStatus = "fallback"; return; }
    canvas.width = inspect ? INSPECT_SIZE : TILE;
    canvas.height = canvas.width;
    // The story grid can contain more circles than the service list. Match
    // AppServiceMark's repeated identity before indexing the motion and atlas.
    const serviceIndex = ((index % appServiceCount) + appServiceCount) % appServiceCount;
    this.entries.set(canvas, { canvas, context, index: serviceIndex, active, visible, inspect });
    this.requestTexture(serviceIndex);
    this.invalidate();
  }

  update(canvas: HTMLCanvasElement, active: boolean, visible: boolean) {
    const entry = this.entries.get(canvas);
    if (!entry) return;
    entry.active = active; entry.visible = visible;
    this.invalidate();
  }

  turn(canvas: HTMLCanvasElement, yaw: number, pitch: number) {
    if (!this.entries.get(canvas)?.inspect) return;
    this.inspectYaw += yaw;
    this.inspectPitch = THREE.MathUtils.clamp(this.inspectPitch + pitch, -1.2, 1.2);
    this.invalidate();
  }

  detach(canvas: HTMLCanvasElement) { this.entries.delete(canvas); this.invalidate(); }

  dispose() {
    this.disposed = true;
    if (this.frameHandle !== undefined) cancelAnimationFrame(this.frameHandle);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.removeEventListener("change", this.invalidate);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.meshes.forEach((mesh) => { this.scene.remove(mesh); mesh.material.dispose(); });
    this.textures.forEach((texture) => texture.dispose());
    this.inspectorMaterial.dispose(); this.geometry.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.entries.clear();
    lastMotionAt = 0;
  }
}
