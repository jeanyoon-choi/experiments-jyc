import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { techFace3DStudies } from "../model/face-3d";

// One WebGL canvas draws the visible field in one pass. Only the inspector
// copies a rendered tile to a 2D canvas.
const INSPECT_TILE = 320;
const FRAME_MS = 1000 / 30;
const MAX_PHASE_STEP_MS = FRAME_MS * 2;
const MAX_IMAGE_LOADS = 2;
const FACE_TEXTURE_WIDTH = 576;
const FACE_TEXTURE_HEIGHT = 384;
const FACE_OPACITY_CHANGE_MS = 260;

// The angle belongs to the identity, not to a bubble mount or active state.
// Keeping it outside the renderer also preserves it when FACE 3D is reselected.
const faceMotion = techFace3DStudies.map((study, index) => ({
  x: study.restingTurn[0],
  y: study.restingTurn[1] + index * 2.399963229728653,
  velocity: (index % 2 === 0 ? 1 : -1) * (Math.PI * 2) / (3_000 + (index % 5) * 250),
}));
let lastMotionAt = 0;

function advanceFaceMotion(now: number, running: boolean) {
  if (running && lastMotionAt) {
    const elapsed = Math.min(Math.max(now - lastMotionAt, 0), MAX_PHASE_STEP_MS);
    for (const motion of faceMotion) motion.y += elapsed * motion.velocity;
  }
  lastMotionAt = running ? now : 0;
}

type FaceEntry = {
  canvas: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  story?: Element;
  root?: THREE.Mesh;
  index: number;
  inspect: boolean;
  active: boolean;
  displayedOpacity: number;
  opacityAt: number;
};

type FaceAsset = {
  root: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  texture?: THREE.Texture;
  loaded: boolean;
  failed: boolean;
};

function createFaceGeometry() {
  return new THREE.SphereGeometry(1, 32, 24);
}

function makeSinglePortraitTexture(source: HTMLImageElement, window: readonly [number, number, number, number]) {
  // Three's sphere faces +Z at UV x=.25. One image occupies the front half;
  // the other half is filled from its own edge colours, not a second surface.
  const canvas = document.createElement("canvas");
  canvas.width = FACE_TEXTURE_WIDTH; canvas.height = FACE_TEXTURE_HEIGHT;
  const context = canvas.getContext("2d")!;
  const [left, top, width, height] = window;
  context.drawImage(source, source.naturalWidth * left, source.naturalHeight * top,
    source.naturalWidth * width, source.naturalHeight * height, 0, 0, 288, 384);
  const averageEdge = (x: number, y: number) => {
    const pixels = context.getImageData(x, y, 3, 6).data;
    let red = 0, green = 0, blue = 0;
    for (let pixel = 0; pixel < pixels.length; pixel += 4) { red += pixels[pixel]!; green += pixels[pixel + 1]!; blue += pixels[pixel + 2]!; }
    const count = pixels.length / 4;
    return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)] as const;
  };
  for (let y = 0; y < 384; y += 6) {
    const leftEdge = averageEdge(60, y), rightEdge = averageEdge(225, y);
    const colour = (value: readonly number[]) => `rgb(${value[0]} ${value[1]} ${value[2]})`;
    const tint = (value: readonly number[], alpha: number) => `rgba(${value[0]}, ${value[1]}, ${value[2]}, ${alpha})`;
    // Extend the face's own nearby colour into its sides inside this one map.
    // No photograph-shaped mesh or second material sits over the ovoid.
    const leftBlend = context.createLinearGradient(0, 0, 66, 0);
    leftBlend.addColorStop(0, tint(leftEdge, 1)); leftBlend.addColorStop(1, tint(leftEdge, 0));
    context.fillStyle = leftBlend; context.fillRect(0, y, 66, 6);
    const rightBlend = context.createLinearGradient(222, 0, 288, 0);
    rightBlend.addColorStop(0, tint(rightEdge, 0)); rightBlend.addColorStop(1, tint(rightEdge, 1));
    context.fillStyle = rightBlend; context.fillRect(222, y, 66, 6);
    const middle = [0, 1, 2].map((index) => Math.round((leftEdge[index]! + rightEdge[index]!) / 2));
    const gradient = context.createLinearGradient(288, 0, 576, 0);
    gradient.addColorStop(0, colour(rightEdge)); gradient.addColorStop(.5, colour(middle)); gradient.addColorStop(1, colour(leftEdge));
    context.fillStyle = gradient; context.fillRect(288, y, 288, 6);
  }
  return canvas;
}

export class Face3DAtlasRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly inspectCamera = new THREE.PerspectiveCamera(27, 1, 0.1, 20);
  private readonly fieldCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  private readonly environment: THREE.WebGLRenderTarget;
  private readonly geometry = createFaceGeometry();
  private readonly assets: FaceAsset[] = [];
  private readonly entries = new Map<HTMLCanvasElement, FaceEntry>();
  private readonly requested = new Set<number>();
  private readonly pending = new Map<number, HTMLImageElement>();
  private readonly loadQueue: number[] = [];
  private stage: HTMLElement | null = null;
  private stageObserver: ResizeObserver | null = null;
  private width = INSPECT_TILE;
  private height = INSPECT_TILE;
  private frameHandle: number | undefined;
  private lastFrame = 0;
  private disposed = false;
  private failed = false;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power", premultipliedAlpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setClearColor("#000000", 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88;
    this.renderer.setScissorTest(true);
    this.inspectCamera.position.set(0, 0.02, 5.1);
    // Field meshes are scaled to pixel-sized radii; the camera must remain
    // outside their depth extent or the near plane clips the whole face.
    this.fieldCamera.position.set(0, 0, 200);

    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 128 });
    room.dispose(); pmrem.dispose();
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.44;
    this.scene.add(new THREE.HemisphereLight("#fff3e6", "#18233a", 0.82));
    const key = new THREE.DirectionalLight("#fff1d8", 1.52);
    key.position.set(-3.8, 4.5, 5.8); this.scene.add(key);
    const fill = new THREE.DirectionalLight("#a8cfff", 0.46);
    fill.position.set(4, -1.5, 3.5); this.scene.add(fill);
    const rim = new THREE.DirectionalLight("#f5a77d", 0.72);
    rim.position.set(-4, 0.5, -3); this.scene.add(rim);

    techFace3DStudies.forEach((study) => {
      const material = new THREE.MeshPhysicalMaterial({
        roughness: 0.77 + study.finish[0] * 0.2, metalness: 0, clearcoat: study.finish[1] * 0.08, clearcoatRoughness: 0.8,
        envMapIntensity: 0.18, reflectivity: 0.16, specularIntensity: 0.1,
        transparent: true, depthWrite: false,
      });
      const root = new THREE.Mesh(this.geometry, material);
      root.scale.setScalar(1); root.visible = false;
      this.assets.push({ root, material, loaded: false, failed: false });
      this.scene.add(root);
    });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.onMotionChange);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
  }

  private onVisibility = () => {
    if (this.frameHandle !== undefined) cancelAnimationFrame(this.frameHandle);
    this.frameHandle = undefined;
    lastMotionAt = 0;
    if (!document.hidden) this.invalidate();
  };
  private onMotionChange = () => { lastMotionAt = 0; this.invalidate(); };
  private onContextLost = (event: Event) => {
    event.preventDefault(); this.failed = true;
    if (this.frameHandle !== undefined) cancelAnimationFrame(this.frameHandle);
    this.frameHandle = undefined;
    this.renderer.domElement.style.visibility = "hidden";
    this.entries.forEach(({ canvas }) => { canvas.style.visibility = "hidden"; canvas.dataset.face3dStatus = "fallback"; });
  };
  private invalidate = () => { this.schedule(); };
  private schedule() {
    if (this.frameHandle !== undefined || this.disposed || this.failed || document.hidden) return;
    this.frameHandle = requestAnimationFrame(this.frame);
  }

  private attachStage(canvas: HTMLCanvasElement) {
    if (this.stage) return;
    const stage = canvas.closest("section");
    if (!stage) return;
    this.stage = stage;
    const output = this.renderer.domElement;
    output.setAttribute("aria-hidden", "true");
    Object.assign(output.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "1",
      pointerEvents: "none",
    });
    stage.append(output);
    const resize = () => {
      const width = Math.max(1, Math.round(stage.clientWidth));
      const height = Math.max(1, Math.round(stage.clientHeight));
      if (width === this.width && height === this.height) return;
      this.width = width;
      this.height = height;
      this.renderer.setSize(width, height, false);
      this.fieldCamera.left = -width / 2;
      this.fieldCamera.right = width / 2;
      this.fieldCamera.top = height / 2;
      this.fieldCamera.bottom = -height / 2;
      this.fieldCamera.updateProjectionMatrix();
      this.invalidate();
    };
    this.stageObserver = new ResizeObserver(resize);
    this.stageObserver.observe(stage);
    resize();
  }

  private request(index: number) {
    if (this.requested.has(index)) return;
    this.requested.add(index);
    this.entries.forEach((entry) => { if (entry.index === index && !this.assets[index]?.loaded) entry.canvas.dataset.face3dStatus = "loading"; });
    this.loadQueue.push(index);
    this.loadNext();
  }

  private loadNext() {
    while (!this.disposed && this.pending.size < MAX_IMAGE_LOADS && this.loadQueue.length) {
      const index = this.loadQueue.shift()!;
      if (!this.requested.has(index) || this.pending.has(index) || this.assets[index]?.loaded) continue;
      const source = new Image();
      source.decoding = "async";
      this.pending.set(index, source);
      source.onload = () => {
        this.pending.delete(index);
        if (this.disposed) return;
        const asset = this.assets[index]!;
        const baked = makeSinglePortraitTexture(source, techFace3DStudies[index]!.faceWindow);
        const texture = new THREE.CanvasTexture(baked);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
        texture.needsUpdate = true;
        asset.texture = texture; asset.material.map = texture; asset.material.needsUpdate = true; asset.loaded = true;
        this.entries.forEach((entry) => {
          if (entry.index === index && !entry.inspect) entry.opacityAt = performance.now();
          if (entry.index === index && entry.root && entry.root !== asset.root) {
            const material = entry.root.material as THREE.MeshPhysicalMaterial;
            material.map = texture;
            material.needsUpdate = true;
          }
        });
        this.invalidate();
        this.loadNext();
      };
      source.onerror = () => {
        this.pending.delete(index);
        const asset = this.assets[index];
        if (asset) asset.failed = true;
        this.entries.forEach((entry) => { if (entry.index === index) entry.canvas.dataset.face3dStatus = "fallback"; });
        this.loadNext();
      };
      source.src = techFace3DStudies[index]!.sourceImage;
    }
  }

  private frame = (now: number) => {
    this.frameHandle = undefined;
    if (this.disposed || this.failed || document.hidden) return;
    if (now - this.lastFrame < FRAME_MS - 1) { this.schedule(); return; }
    this.lastFrame = now;
    const entries = [...this.entries.values()];
    const inspector = entries.find((entry) => entry.inspect);
    const fieldEntries = entries.filter((entry) => !entry.inspect);
    const needsMotion = !this.reducedMotion.matches && (fieldEntries.some((entry) => entry.active) || inspector !== undefined);
    advanceFaceMotion(now, needsMotion);
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor("#000000", 0);
    if (inspector && this.assets[inspector.index]?.loaded && inspector.context) {
      const asset = this.assets[inspector.index]!;
      const study = techFace3DStudies[inspector.index]!;
      const pose = faceMotion[inspector.index]!;
      const size = Math.min(INSPECT_TILE, this.width, this.height);
      asset.root.position.set(0, 0, 0);
      asset.root.scale.setScalar(1);
      asset.root.rotation.set(pose.x, pose.y, 0);
      asset.material.opacity = 1;
      asset.root.visible = true;
      this.renderer.setViewport(0, this.height - size, size, size);
      this.renderer.setScissor(0, this.height - size, size, size);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.inspectCamera);
      asset.root.visible = false;
      inspector.context.clearRect(0, 0, INSPECT_TILE, INSPECT_TILE);
      inspector.context.drawImage(this.renderer.domElement, 0, 0, size, size, 0, 0, INSPECT_TILE, INSPECT_TILE);
      inspector.canvas.style.visibility = "visible";
      if (inspector.canvas.dataset.face3dStatus !== "ready") inspector.canvas.dataset.face3dStatus = "ready";
      if (inspector.canvas.dataset.face3dSource !== study.id) inspector.canvas.dataset.face3dSource = study.id;
    }

    // All field forms share one scene render, so each visible face updates on
    // every frame instead of waiting for its turn in a tile-copy queue.
    let fading = false;
    if (this.stage) {
      const stageRect = this.stage.getBoundingClientRect();
      const scaleX = this.width / Math.max(1, stageRect.width);
      const scaleY = this.height / Math.max(1, stageRect.height);
      for (const entry of fieldEntries) {
        const asset = this.assets[entry.index]!;
        const style = entry.story ? getComputedStyle(entry.story) : null;
        const opacity = style ? Number.parseFloat(style.opacity) : 0;
        if (!entry.active && opacity > 0.01 && style?.animationName.includes("story-leave-opacity") && !style.animationPlayState.includes("paused")) fading = true;
        if (!asset.loaded) continue;
        const elapsed = Math.min(FRAME_MS * 2, Math.max(0, now - entry.opacityAt));
        entry.opacityAt = now;
        const maxChange = this.reducedMotion.matches ? 1 : elapsed / FACE_OPACITY_CHANGE_MS;
        entry.displayedOpacity += THREE.MathUtils.clamp(opacity - entry.displayedOpacity, -maxChange, maxChange);
        if (Math.abs(opacity - entry.displayedOpacity) > 0.001) fading = true;
        if (entry.displayedOpacity <= 0.001) continue;
        const rect = entry.canvas.getBoundingClientRect();
        const study = techFace3DStudies[entry.index]!;
        const pose = faceMotion[entry.index]!;
        const radius = Math.min(rect.width * scaleX, rect.height * scaleY) / 2;
        const root = entry.root!;
        root.position.set((rect.left + rect.width / 2 - stageRect.left) * scaleX - this.width / 2,
          this.height / 2 - (rect.top + rect.height / 2 - stageRect.top) * scaleY, 0);
        root.scale.setScalar(radius);
        root.rotation.set(pose.x, pose.y, 0);
        (root.material as THREE.MeshPhysicalMaterial).opacity = entry.displayedOpacity;
        root.visible = true;
        if (entry.canvas.dataset.face3dStatus !== "ready") entry.canvas.dataset.face3dStatus = "ready";
        if (entry.canvas.dataset.face3dSource !== study.id) entry.canvas.dataset.face3dSource = study.id;
      }
      this.renderer.setViewport(0, 0, this.width, this.height);
      this.renderer.setScissor(0, 0, this.width, this.height);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.fieldCamera);
      fieldEntries.forEach((entry) => { if (entry.root) entry.root.visible = false; });
    }
    if (needsMotion || fading) this.schedule();
  };

  attach(canvas: HTMLCanvasElement, index: number, active: boolean, inspect = false) {
    if (!techFace3DStudies[index] || (inspect && [...this.entries.values()].some((entry) => entry.inspect))) return;
    const context = inspect ? canvas.getContext("2d", { alpha: true }) ?? undefined : undefined;
    if (inspect && !context) return;
    const size = inspect ? INSPECT_TILE : 1;
    canvas.width = size; canvas.height = size;
    const asset = this.assets[index]!;
    const primaryInUse = [...this.entries.values()].some((entry) => !entry.inspect && entry.index === index && entry.root === asset.root);
    const root = inspect ? undefined : primaryInUse ? new THREE.Mesh(this.geometry, asset.material.clone()) : asset.root;
    if (root && root !== asset.root) { root.visible = false; this.scene.add(root); }
    const story = inspect ? undefined : canvas.closest("li")?.firstElementChild ?? undefined;
    this.entries.set(canvas, { canvas, context, story, root, index, active, inspect, displayedOpacity: 0, opacityAt: performance.now() });
    if (!inspect) this.attachStage(canvas);
    if (active || inspect || (story && Number.parseFloat(getComputedStyle(story).opacity) > 0.01)) this.request(index);
    this.invalidate();
  }
  update(canvas: HTMLCanvasElement, active: boolean) {
    const entry = this.entries.get(canvas);
    if (entry) {
      entry.active = active;
      if (active) this.request(entry.index);
      this.invalidate();
    }
  }
  turn(canvas: HTMLCanvasElement, yaw: number, pitch: number) {
    const entry = this.entries.get(canvas);
    if (!entry?.inspect) return;
    const pose = faceMotion[entry.index]!;
    pose.y += yaw; pose.x = THREE.MathUtils.clamp(pose.x + pitch, -0.72, 0.72);
    this.invalidate();
  }
  detach(canvas: HTMLCanvasElement) {
    const entry = this.entries.get(canvas);
    this.entries.delete(canvas);
    if (entry?.root && entry.root !== this.assets[entry.index]!.root) {
      this.scene.remove(entry.root);
      (entry.root.material as THREE.Material).dispose();
    }
    this.invalidate();
  }
  dispose() {
    this.disposed = true;
    if (this.frameHandle !== undefined) cancelAnimationFrame(this.frameHandle);
    lastMotionAt = 0;
    this.stageObserver?.disconnect();
    this.renderer.domElement.remove();
    this.pending.forEach((image) => { image.onload = null; image.onerror = null; image.src = ""; });
    this.pending.clear(); this.entries.clear();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.removeEventListener("change", this.onMotionChange);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.assets.forEach((asset) => { asset.texture?.dispose(); asset.material.dispose(); });
    this.geometry.dispose(); this.environment.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
