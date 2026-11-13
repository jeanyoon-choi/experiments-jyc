import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { techEye3DStudies } from "../model/tech-eye-3d";
import { createEyeBlink3D, advanceEyeBlink3D, triggerEyeBlink3D, setEyeBlink3DSpeed } from "../model/eye-blink-3d";
import { createEyeLids } from "./tech-eye-lids";

// All identities share four instanced meshes and one transmission capture.
// DOM canvases copy cells of this live 3D atlas; none owns a WebGL context.
const COUNT = techEye3DStudies.length;
const COLUMNS = 10;
const ROWS = Math.ceil(COUNT / COLUMNS);
const TILE = 96;
const INSPECT = 256;
const WORLD_CELL = 2.3;
const WIDTH = COLUMNS * TILE + INSPECT;
const HEIGHT = Math.max(ROWS * TILE, INSPECT);
const FRAME_MS = 1000 / 24;
const BLINK_FRAME_MS = 1000 / 60;
const IRIS_RADIUS = Math.sin(0.55);
const IRIS_Z = Math.cos(0.55);
const SLOT_COUNT = COUNT + 1;

type Entry = { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; index: number; active: boolean; inspect: boolean; blinking: boolean };
type Pose = { x: number; y: number; time: number };

function seeded(index: number, salt: number) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function makeScleraTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext("2d")!;
  const base = context.createLinearGradient(0, 0, 0, 512);
  base.addColorStop(0, "#d9cfc1"); base.addColorStop(0.16, "#e4d7c8");
  base.addColorStop(0.65, "#d2b0a7"); base.addColorStop(1, "#b57e78");
  context.fillStyle = base; context.fillRect(0, 0, 1024, 512);
  for (let vessel = 0; vessel < 90; vessel++) {
    let x = seeded(vessel, 2) * 1024, y = 50 + seeded(vessel, 3) * 430;
    context.beginPath(); context.moveTo(x, y);
    for (let branch = 0; branch < 12; branch++) {
      const nx = x + (seeded(vessel * 12 + branch, 4) - 0.5) * 40;
      const ny = y - 5 - seeded(vessel * 12 + branch, 5) * 15;
      context.quadraticCurveTo(x + (seeded(vessel + branch, 6) - 0.5) * 23, (y + ny) / 2, nx, ny);
      x = nx; y = ny;
    }
    context.lineWidth = 0.5 + seeded(vessel, 8);
    context.strokeStyle = `rgba(143,48,60,${0.13 + seeded(vessel, 7) * 0.16})`;
    context.stroke();
    context.beginPath(); context.moveTo(x, y);
    context.bezierCurveTo(x - 4, y - 6, x - 16, y - 4, x - 25, y - 19);
    context.lineWidth *= 0.45; context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function makeIrisGeometry() {
  const geometry = new THREE.RingGeometry(0.142, IRIS_RADIUS, 48, 6);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const radius = Math.hypot(positions.getX(i), positions.getY(i));
    const t = (radius - 0.142) / (IRIS_RADIUS - 0.142);
    positions.setZ(i, IRIS_Z - 0.075 * (1 - t) + 0.012 * Math.sin(t * Math.PI));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export class TechEyeRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly environment: THREE.WebGLRenderTarget;
  private readonly irisCanvas = document.createElement("canvas");
  private readonly irisContext: CanvasRenderingContext2D;
  private readonly irisTexture: THREE.CanvasTexture;
  private readonly scleraTexture = makeScleraTexture();
  private readonly sclera: THREE.InstancedMesh;
  private readonly iris: THREE.InstancedMesh;
  private readonly pupil: THREE.InstancedMesh;
  private readonly cornea: THREE.InstancedMesh;
  private readonly meshes: THREE.InstancedMesh[];
  private readonly tiles = new THREE.InstancedBufferAttribute(new Float32Array(SLOT_COUNT * 2), 2);
  private readonly shapes = new THREE.InstancedBufferAttribute(new Float32Array(SLOT_COUNT * 2), 2);
  private readonly entries = new Map<HTMLCanvasElement, Entry>();
  private readonly poses: Pose[] = Array.from({ length: COUNT }, () => ({ x: 0, y: 0, time: 0 }));
  private readonly blinks = Array.from({ length: COUNT }, (_, index) => createEyeBlink3D(index));
  private lids: ReturnType<typeof createEyeLids> | undefined;
  private readonly manualBlinks = new Set<number>();
  private readonly loaded = new Set<number>();
  private readonly requested = new Set<number>();
  private readonly loadingImages = new Set<HTMLImageElement>();
  private readonly requests: number[] = [];
  private decoding = 0;
  private timer: number | undefined;
  private lastFrame = 0;
  private movingLid = false;
  private disposed = false;
  private failed = false;
  private dirty = true;
  private pointer = { x: 0, y: 0, valid: false };
  private inspectPose = { x: 0, y: 0 };
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly root = new THREE.Object3D();
  private readonly part = new THREE.Object3D();
  private readonly matrix = new THREE.Matrix4();
  private readonly lidOrientation = new THREE.Quaternion();
  private readonly tint = new THREE.Color();
  private metrics = { started: 0, published: 0, frames: 0, cpuTotal: 0 };

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(WIDTH, HEIGHT, false);
    this.renderer.setClearColor("#07090b", 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.transmissionResolutionScale = 0.7;
    this.renderer.info.autoReset = false;
    const worldWidth = WIDTH / TILE * WORLD_CELL, worldHeight = HEIGHT / TILE * WORLD_CELL;
    this.camera = new THREE.OrthographicCamera(-worldWidth / 2, worldWidth / 2, worldHeight / 2, -worldHeight / 2, 0.1, 30);
    this.camera.position.z = 12;
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, 0.03, 0.1, 100, { size: 128 });
    room.dispose(); pmrem.dispose();
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.35;
    this.scene.add(new THREE.HemisphereLight("#fff4e4", "#453038", 0.7));
    const key = new THREE.DirectionalLight("#fff1dc", 1.65);
    key.position.set(-3, 5, 12); this.scene.add(key);
    const fill = new THREE.DirectionalLight("#b8d3f0", 0.5);
    fill.position.set(4, -2, 10); this.scene.add(fill);

    this.irisCanvas.width = COLUMNS * TILE; this.irisCanvas.height = ROWS * TILE;
    this.irisContext = this.irisCanvas.getContext("2d")!;
    this.irisTexture = new THREE.CanvasTexture(this.irisCanvas);
    this.irisTexture.colorSpace = THREE.SRGBColorSpace;
    this.irisTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());

    const globeGeometry = new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0.55, Math.PI - 0.55);
    globeGeometry.rotateX(Math.PI / 2);
    globeGeometry.setAttribute("eyeShape", this.shapes);
    const globeMaterial = new THREE.MeshPhysicalMaterial({
      map: this.scleraTexture, roughness: 0.38, metalness: 0,
      clearcoat: 0.75, clearcoatRoughness: 0.14, ior: 1.376, envMapIntensity: 0.35,
    });
    globeMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = "attribute vec2 eyeShape;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.xy *= mix(1.0, eyeShape.x, smoothstep(0.45, 0.84, transformed.z));");
      shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nvMapUv.x += eyeShape.y;");
    };
    globeMaterial.customProgramCacheKey = () => "tech-eye-sclera-shape-v1";
    this.sclera = new THREE.InstancedMesh(globeGeometry, globeMaterial, SLOT_COUNT);

    const irisGeometry = makeIrisGeometry();
    irisGeometry.setAttribute("eyeTile", this.tiles);
    const irisMaterial = new THREE.MeshPhysicalMaterial({ map: this.irisTexture, roughness: 0.75, metalness: 0, envMapIntensity: 0.15 });
    irisMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = "attribute vec2 eyeTile; varying vec2 irisLocalUv; varying float irisSeed;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>",
        `#include <uv_vertex>\nirisLocalUv=uv; irisSeed=eyeTile.x+eyeTile.y*10.; vMapUv = (eyeTile + vec2(0.025) + vMapUv * 0.95) / vec2(${COLUMNS}.0, ${ROWS}.0);`);
      // Authored microstructure modulates the actual photographic iris colour.
      shader.fragmentShader = `varying vec2 irisLocalUv; varying float irisSeed;
        float irisHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float irisNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(irisHash(i),irisHash(i+vec2(1,0)),f.x),mix(irisHash(i+vec2(0,1)),irisHash(i+vec2(1,1)),f.x),f.y);}
        float irisRelief(){vec2 p=(irisLocalUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);
          float warp=irisNoise(vec2(a*17.,r*8.+irisSeed));
          float fibers=irisNoise(vec2(a*95.+warp*2.,r*4.+irisSeed));
          float fine=irisNoise(vec2(a*210.,r*11.+irisSeed));
          float crypts=pow(irisNoise(vec2(a*23.,r*16.+irisSeed)),4.)*smoothstep(.28,.42,r);
          float rim=mix(1.,.62,smoothstep(.90,1.,r));
          return (.82+.35*fibers+.16*fine-.20*crypts)*rim;}
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb *= irisRelief();");
    };
    irisMaterial.customProgramCacheKey = () => "tech-eye-source-atlas-v2";
    this.iris = new THREE.InstancedMesh(irisGeometry, irisMaterial, SLOT_COUNT);
    this.pupil = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 24, 16), new THREE.MeshBasicMaterial({ color: "#010101" }), SLOT_COUNT);
    const cap = new THREE.SphereGeometry(0.64, 32, 16, 0, Math.PI * 2, 0, Math.asin(IRIS_RADIUS / 0.64));
    cap.rotateX(Math.PI / 2); cap.translate(0, 0, IRIS_Z - Math.sqrt(0.64 ** 2 - IRIS_RADIUS ** 2));
    this.cornea = new THREE.InstancedMesh(cap, new THREE.MeshPhysicalMaterial({
      transmission: 1, thickness: 0.09, ior: 1.376, roughness: 0.025,
      clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 0.6,
    }), SLOT_COUNT);
    this.meshes = [this.sclera, this.iris, this.pupil, this.cornea];
    this.meshes.forEach((mesh) => {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false; this.scene.add(mesh);
    });
    for (let slot = 0; slot < SLOT_COUNT; slot++) this.hideSlot(slot);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    document.addEventListener("pointerleave", this.onPointerLeave);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.invalidate);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
  }

  private onPointer = (event: PointerEvent) => { this.pointer = { x: event.clientX, y: event.clientY, valid: true }; };
  private onPointerLeave = () => { this.pointer.valid = false; };
  private onContextLost = (event: Event) => {
    event.preventDefault(); this.failed = true;
    window.clearTimeout(this.timer); this.timer = undefined;
    this.entries.forEach(({ canvas }) => { canvas.style.visibility = "hidden"; canvas.dataset.eye3dStatus = "fallback"; });
  };
  private onVisibility = () => {
    window.clearTimeout(this.timer); this.timer = undefined;
    if (!document.hidden) this.invalidate();
  };
  private invalidate = () => { this.dirty = true; this.schedule(); };
  private schedule() {
    if (this.timer !== undefined || this.disposed || this.failed || document.hidden) return;
    const interval = this.movingLid ? BLINK_FRAME_MS : FRAME_MS;
    this.timer = window.setTimeout(this.frame, Math.max(0, this.lastFrame + interval - performance.now()));
  }

  private request(index: number) {
    if (this.requested.has(index)) return;
    this.requested.add(index); this.requests.push(index); this.loadNext();
  }
  private loadNext() {
    if (this.disposed) return;
    while (this.decoding < 3 && this.requests.length) {
      const index = this.requests.shift()!;
      const study = techEye3DStudies[index]!;
      if (study.profile.eye.length < 4) {
        this.entries.forEach((entry) => { if (entry.index === index) entry.canvas.dataset.eye3dStatus = "source-unresolved"; });
        continue;
      }
      const source = new Image(); this.decoding++; this.loadingImages.add(source);
      const finish = () => { this.decoding--; this.loadingImages.delete(source); this.loadNext(); };
      source.onload = () => {
        if (this.disposed) return;
        const [cx, cy, rx, ry] = study.profile.iris;
        this.irisContext.drawImage(source, cx! - rx!, cy! - ry!, rx! * 2, ry! * 2,
          index % COLUMNS * TILE, Math.floor(index / COLUMNS) * TILE, TILE, TILE);
        this.irisTexture.needsUpdate = true;
        this.loaded.add(index); this.invalidate(); finish();
      };
      source.onerror = () => {
        this.entries.forEach((entry) => { if (entry.index === index) entry.canvas.dataset.eye3dStatus = "fallback"; });
        finish();
      };
      source.src = study.sourceImage;
    }
  }

  private hideSlot(slot: number) {
    this.matrix.makeScale(0, 0, 0);
    this.meshes.forEach((mesh) => mesh.setMatrixAt(slot, this.matrix));
    this.lids?.mesh.setMatrixAt(slot, this.matrix);
  }
  private place(slot: number, index: number, pose: { x: number; y: number }, inspect: boolean) {
    const study = techEye3DStudies[index]!;
    const width = Math.hypot(study.profile.eye[3]![0]! - study.profile.eye[0]![0]!, study.profile.eye[3]![1]! - study.profile.eye[0]![1]!);
    const observedIrisRatio = study.profile.iris[2]! * 2 / Math.max(1, width);
    // Source-derived iris proportion; small authored anatomical variations elsewhere.
    const irisScale = 1.18 * THREE.MathUtils.clamp(observedIrisRatio / 0.43 * (0.96 + seeded(index, 19) * 0.08), 0.84, 1.15);
    const overall = (inspect ? INSPECT / TILE : 1) * (0.91 + seeded(index, 10) * 0.07);
    const x = inspect ? (COLUMNS + INSPECT / TILE / 2) * WORLD_CELL : (index % COLUMNS + 0.5) * WORLD_CELL;
    const y = inspect ? INSPECT / TILE / 2 * WORLD_CELL : (Math.floor(index / COLUMNS) + 0.5) * WORLD_CELL;
    this.root.position.set(x - WIDTH / TILE * WORLD_CELL / 2, HEIGHT / TILE * WORLD_CELL / 2 - y, 0);
    this.root.rotation.set(pose.x, pose.y, (seeded(index, 11) - 0.5) * 0.05);
    this.root.scale.set(overall * (0.975 + seeded(index, 12) * 0.05), overall * (0.97 + seeded(index, 13) * 0.06), overall * (0.97 + seeded(index, 14) * 0.07));
    this.root.updateMatrix();
    if (this.lids) {
      // Gaze moves behind the lids; inspection rotates the complete assembly.
      this.matrix.compose(this.root.position, inspect ? this.root.quaternion : this.lidOrientation, this.root.scale);
      this.lids.mesh.setMatrixAt(slot, this.matrix);
    }
    this.sclera.setMatrixAt(slot, this.root.matrix);
    this.sclera.setColorAt(slot, this.tint.setRGB(0.94 + seeded(index, 15) * 0.06, 0.93 + seeded(index, 16) * 0.06, 0.91 + seeded(index, 17) * 0.08));
    this.part.position.set(0, 0, 0); this.part.scale.set(irisScale, irisScale, 1); this.part.updateMatrix();
    this.matrix.multiplyMatrices(this.root.matrix, this.part.matrix);
    this.iris.setMatrixAt(slot, this.matrix); this.cornea.setMatrixAt(slot, this.matrix);
    this.part.position.z = IRIS_Z - 0.24; this.part.updateMatrix();
    this.matrix.multiplyMatrices(this.root.matrix, this.part.matrix); this.pupil.setMatrixAt(slot, this.matrix);
    this.tiles.setXY(slot, index % COLUMNS, ROWS - 1 - Math.floor(index / COLUMNS));
    this.shapes.setXY(slot, irisScale, seeded(index, 18));
  }

  private frame = () => {
    const started = performance.now();
    const delta = this.lastFrame ? Math.min(0.1, (started - this.lastFrame) / 1000) : 0;
    this.lastFrame = started;
    this.timer = undefined;
    if (this.disposed || this.failed || document.hidden) return;
    const active = new Map<number, DOMRect>();
    const present = new Set<number>();
    const firstPaint = new Set<number>();
    const blinkEnabled = new Set<number>();
    let showLids = false;
    let inspector: Entry | undefined;
    this.entries.forEach((entry) => {
      if (entry.blinking) {
        showLids = true;
        if (entry.active && !this.reducedMotion.matches) blinkEnabled.add(entry.index);
      }
      if (entry.inspect) { inspector = entry; return; }
      present.add(entry.index);
      if (entry.canvas.dataset.eye3dStatus !== "ready") firstPaint.add(entry.index);
      if (entry.active && !this.reducedMotion.matches) {
        const rect = entry.canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight) active.set(entry.index, rect);
      }
    });
    this.manualBlinks.forEach((index) => blinkEnabled.add(index));
    showLids ||= this.manualBlinks.size > 0;
    if (!this.dirty && !active.size && !blinkEnabled.size) return;
    if (showLids && !this.lids) { this.lids = createEyeLids(SLOT_COUNT); this.scene.add(this.lids.mesh); }
    if (this.lids) this.lids.mesh.visible = showLids;
    const openness = this.blinks.map((state, index) => advanceEyeBlink3D(state, delta, blinkEnabled.has(index)));
    const justFinished = new Set<number>();
    this.manualBlinks.forEach((index) => {
      if (this.blinks[index]!.phase === "open") {
        this.manualBlinks.delete(index);
        justFinished.add(index);
        this.dirty = true;
      }
    });
    this.movingLid = [...blinkEnabled].some((index) => this.blinks[index]!.phase !== "open");
    showLids = this.manualBlinks.size > 0 || [...this.entries.values()].some((entry) => entry.blinking);
    if (this.lids) this.lids.mesh.visible = showLids;
    let slot = 0;
    const drawn = new Set<number>();
    for (let index = 0; index < COUNT; index++) {
      if (!present.has(index) || !this.loaded.has(index)) continue;
      if (!active.has(index) && !firstPaint.has(index) && !this.manualBlinks.has(index) && !justFinished.has(index)) continue;
      const pose = this.poses[index]!;
      const rect = active.get(index);
      if (rect) {
        pose.time += delta;
        let yaw = Math.sin(pose.time * 0.43 + index * 1.7) * 0.19;
        let pitch = Math.sin(pose.time * 0.31 + index * 2.3) * 0.085;
        if (this.pointer.valid) {
          yaw += THREE.MathUtils.clamp((this.pointer.x - rect.x - rect.width / 2) / 1100, -0.23, 0.23);
          pitch -= THREE.MathUtils.clamp((this.pointer.y - rect.y - rect.height / 2) / 1100, -0.16, 0.16);
        }
        pose.x += (pitch - pose.x) * 0.13; pose.y += (yaw - pose.y) * 0.13;
      }
      this.place(slot, index, pose, false);
      this.lids?.openness.setX(slot, openness[index]!);
      if (this.lids && openness[index]! >= 0.995) {
        this.matrix.makeScale(0, 0, 0);
        this.lids.mesh.setMatrixAt(slot, this.matrix);
      }
      drawn.add(index);
      slot++;
    }
    if (inspector && this.loaded.has(inspector.index)) {
      this.place(slot, inspector.index, this.inspectPose, true);
      this.lids?.openness.setX(slot, openness[inspector.index]!);
      if (this.lids && openness[inspector.index]! >= 0.995) {
        this.matrix.makeScale(0, 0, 0);
        this.lids.mesh.setMatrixAt(slot, this.matrix);
      }
      slot++;
    }
    this.meshes.forEach((mesh) => { mesh.count = slot; });
    if (this.lids) {
      this.lids.mesh.count = slot;
      this.lids.openness.needsUpdate = true; this.lids.mesh.instanceMatrix.needsUpdate = true;
    }
    this.meshes.forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
    if (this.sclera.instanceColor) this.sclera.instanceColor.needsUpdate = true;
    this.tiles.needsUpdate = true; this.shapes.needsUpdate = true;
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    this.entries.forEach((entry) => {
      if (!this.loaded.has(entry.index)) return;
      if (!entry.inspect && !drawn.has(entry.index)) return;
      if (!this.dirty && !entry.inspect && !active.has(entry.index) && !blinkEnabled.has(entry.index)) return;
      const size = entry.inspect ? INSPECT : TILE;
      const x = entry.inspect ? COLUMNS * TILE : entry.index % COLUMNS * TILE;
      const y = entry.inspect ? 0 : Math.floor(entry.index / COLUMNS) * TILE;
      entry.context.drawImage(this.renderer.domElement, x, y, size, size, 0, 0, size, size);
      entry.canvas.style.visibility = "visible";
      entry.canvas.dataset.eye3dStatus = "ready";
      entry.canvas.dataset.eye3dSource = techEye3DStudies[entry.index]!.id;
      entry.canvas.dataset.eye3dOpenness = showLids ? openness[entry.index]!.toFixed(3) : "1.000";
    });
    const completed = performance.now();
    if (!this.metrics.started) this.metrics.started = started;
    this.metrics.frames++;
    this.metrics.cpuTotal += completed - started;
    if (completed - this.metrics.published >= 1000 || !active.size) {
      const seconds = (completed - this.metrics.started) / 1000;
      const report = JSON.stringify({
        frames: this.metrics.frames, seconds: Number(seconds.toFixed(2)),
        renderHz: Number((this.metrics.frames / Math.max(0.001, seconds)).toFixed(2)),
        cpuMs: Number((this.metrics.cpuTotal / this.metrics.frames).toFixed(2)),
        calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
        loaded: this.loaded.size, active: active.size, outputs: this.entries.size,
        atlas: [WIDTH, HEIGHT], textures: this.renderer.info.memory.textures,
      });
      const first = this.entries.values().next().value as Entry | undefined;
      if (first) first.canvas.dataset.eye3dMetrics = report;
      if (inspector) inspector.canvas.dataset.eye3dMetrics = report;
      this.metrics.published = completed;
    }
    this.dirty = false;
    if (active.size || blinkEnabled.size) this.schedule();
  };

  attach(canvas: HTMLCanvasElement, index: number, active: boolean, inspect = false, blinking = false) {
    if (inspect && [...this.entries.values()].some((entry) => entry.inspect)) return;
    index = ((index % COUNT) + COUNT) % COUNT;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    canvas.width = inspect ? INSPECT : TILE; canvas.height = canvas.width;
    this.entries.set(canvas, { canvas, context, index, active, inspect, blinking });
    if (inspect) this.inspectPose = { x: 0, y: 0 };
    this.request(index); this.invalidate();
  }
  update(canvas: HTMLCanvasElement, active: boolean, blinking = false) {
    const entry = this.entries.get(canvas);
    if (entry) { entry.active = active; entry.blinking = blinking; this.invalidate(); }
  }
  turn(canvas: HTMLCanvasElement, x: number, y: number) {
    if (!this.entries.get(canvas)?.inspect) return;
    this.inspectPose.x = THREE.MathUtils.clamp(this.inspectPose.x + y, -1.4, 1.4);
    this.inspectPose.y += x; this.invalidate();
  }
  blinkAll() {
    if (this.disposed || this.failed || document.hidden) return;
    const indices = new Set<number>();
    this.entries.forEach(({ canvas, index }) => {
      const rect = canvas.getBoundingClientRect();
      if (this.loaded.has(index) && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight) indices.add(index);
    });
    indices.forEach((index) => { triggerEyeBlink3D(this.blinks[index]!); this.manualBlinks.add(index); });
    this.invalidate();
  }
  setBlinkSpeed(speed: number) {
    this.blinks.forEach((state) => setEyeBlink3DSpeed(state, speed));
    this.invalidate();
  }
  detach(canvas: HTMLCanvasElement) { this.entries.delete(canvas); this.invalidate(); }
  dispose() {
    this.disposed = true; window.clearTimeout(this.timer);
    this.loadingImages.forEach((source) => { source.onload = null; source.onerror = null; source.src = ""; });
    this.loadingImages.clear(); this.requests.length = 0; this.entries.clear();
    window.removeEventListener("pointermove", this.onPointer);
    document.removeEventListener("pointerleave", this.onPointerLeave);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.removeEventListener("change", this.invalidate);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.meshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    });
    this.irisTexture.dispose(); this.scleraTexture.dispose(); this.environment.dispose();
    this.lids?.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
