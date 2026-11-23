import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { lips3DStudies } from "../model/lips-3d";

const COUNT = lips3DStudies.length;
const TILE = 128;
const INSPECT = 256;
// Keep room for every source: evicting a visible source would strand its canvas
// behind the request dedupe guard. 10² tiles are still only a 1280² texture.
const ATLAS_COLUMNS = 10;
const ATLAS_CAPACITY = ATLAS_COLUMNS * ATLAS_COLUMNS;
const WORLD = 2.55;
const WIDTH = INSPECT;
const HEIGHT = INSPECT;
const FRAME_MS = 1000 / 18;
const MAX_FIELD_DRAWS_PER_FRAME = 8;

type Entry = { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; index: number; active: boolean; inspect: boolean };
type Pose = { x: number; y: number; t: number };

function seed(index: number, salt: number) {
  const value = Math.sin((index + 1) * 91.37 + salt * 141.11) * 43758.5453;
  return value - Math.floor(value);
}

/** A closed, front-and-back lip volume: analytic silhouette, not a photo plane. */
function createLipGeometry(upper: boolean) {
  const across = 32, down = 8;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const point = (u: number, v: number, front: boolean) => {
    const x = (u - .5) * 2;
    const dome = Math.pow(Math.max(0, 1 - Math.abs(x) ** 1.65), .57);
    const seam = upper ? .025 - .10 * Math.exp(-x * x * 18) : -.025;
    const y = seam + (upper ? 1 : -1) * v * (upper ? .42 : .48) * dome;
    const swell = (.045 + .19 * dome * Math.sin(v * Math.PI * .88) ** .72) * (front ? 1 : -.42);
    positions.push(x, y, swell);
    // The V2 crop remains source material, split across upper/lower tissue.
    uvs.push(u, upper ? .5 + v * .5 : .5 - v * .5);
  };
  for (const front of [true, false]) for (let row = 0; row <= down; row++) {
    for (let column = 0; column <= across; column++) point(column / across, row / down, front);
  }
  const stride = across + 1;
  const backOffset = stride * (down + 1);
  for (let row = 0; row < down; row++) for (let column = 0; column < across; column++) {
    const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1;
    // Upper V increases upward; lower V increases downward. Their front winding
    // must therefore be opposite for both front surfaces to face the camera.
    if (upper) {
      indices.push(a, b, c, b, d, c);
      indices.push(backOffset + a, backOffset + c, backOffset + b, backOffset + b, backOffset + c, backOffset + d);
    } else {
      indices.push(a, c, b, b, c, d);
      indices.push(backOffset + a, backOffset + b, backOffset + c, backOffset + b, backOffset + d, backOffset + c);
    }
  }
  const edge = (a: number, b: number) => indices.push(a, b, backOffset + a, b, backOffset + b, backOffset + a);
  for (let column = 0; column < across; column++) { edge(column, column + 1); edge(down * stride + column + 1, down * stride + column); }
  for (let row = 0; row < down; row++) { edge(row * stride, (row + 1) * stride); edge(row * stride + across, (row + 1) * stride + across); }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

export class Lips3DRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly environment: THREE.WebGLRenderTarget;
  private readonly sourceCanvas = document.createElement("canvas");
  private readonly sourceContext: CanvasRenderingContext2D;
  private readonly sourceTexture: THREE.CanvasTexture;
  private readonly tiles = new THREE.InstancedBufferAttribute(new Float32Array((COUNT + 1) * 2), 2);
  private readonly forms = new THREE.InstancedBufferAttribute(new Float32Array((COUNT + 1) * 2), 2);
  private readonly upper: THREE.InstancedMesh;
  private readonly lower: THREE.InstancedMesh;
  private readonly mouth: THREE.InstancedMesh;
  private readonly teeth: THREE.InstancedMesh;
  private readonly meshes: THREE.InstancedMesh[];
  private readonly entries = new Map<HTMLCanvasElement, Entry>();
  /** One bounded 10×10 source atlas: 1280², never an 80-wide texture. */
  private readonly loaded = new Map<number, number>();
  private readonly slotOwners = Array<number | undefined>(ATLAS_CAPACITY);
  private readonly lastUsed = new Map<number, number>();
  private readonly requested = new Set<number>();
  private readonly loading = new Set<HTMLImageElement>();
  private readonly queue: number[] = [];
  private readonly poses: Pose[] = Array.from({ length: COUNT }, () => ({ x: 0, y: 0, t: 0 }));
  private readonly root = new THREE.Object3D();
  private readonly part = new THREE.Object3D();
  private readonly matrix = new THREE.Matrix4();
  private timer: number | undefined;
  private fieldCursor = 0;
  private decoding = 0;
  private dirty = true;
  private disposed = false;
  private failed = false;
  private inspectPose = { x: 0, y: 0 };
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(WIDTH, HEIGHT, false);
    this.renderer.setClearColor("#0c080a", 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    const worldWidth = WIDTH / TILE * WORLD;
    this.camera = new THREE.OrthographicCamera(-worldWidth / 2, worldWidth / 2, WORLD, -WORLD, .1, 30);
    this.camera.position.z = 10;
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, .03, .1, 100, { size: 128 });
    room.dispose(); pmrem.dispose();
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = .26;
    this.scene.add(new THREE.HemisphereLight("#ffe5db", "#241319", .9));
    const key = new THREE.DirectionalLight("#fff1ea", 2.1); key.position.set(-3, 4, 8); this.scene.add(key);
    const rim = new THREE.DirectionalLight("#f17d9c", .6); rim.position.set(4, 1, 5); this.scene.add(rim);

    this.sourceCanvas.width = ATLAS_COLUMNS * TILE; this.sourceCanvas.height = ATLAS_COLUMNS * TILE;
    this.sourceContext = this.sourceCanvas.getContext("2d")!;
    this.sourceTexture = new THREE.CanvasTexture(this.sourceCanvas);
    this.sourceTexture.colorSpace = THREE.SRGBColorSpace;
    this.sourceTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    const upperMaterial = this.createLipMaterial(true), lowerMaterial = this.createLipMaterial(false);
    const upperGeometry = createLipGeometry(true), lowerGeometry = createLipGeometry(false);
    upperGeometry.setAttribute("lipTile", this.tiles); lowerGeometry.setAttribute("lipTile", this.tiles);
    upperGeometry.setAttribute("lipForm", this.forms); lowerGeometry.setAttribute("lipForm", this.forms);
    this.upper = new THREE.InstancedMesh(upperGeometry, upperMaterial, COUNT + 1);
    // Material.clone() drops onBeforeCompile; both surfaces need the atlas UV shader.
    this.lower = new THREE.InstancedMesh(lowerGeometry, lowerMaterial, COUNT + 1);
    this.mouth = new THREE.InstancedMesh(new THREE.CircleGeometry(.72, 32), new THREE.MeshStandardMaterial({ color: "#50302d", roughness: .85 }), COUNT + 1);
    this.teeth = new THREE.InstancedMesh(new THREE.CircleGeometry(.67, 32), new THREE.MeshStandardMaterial({ color: "#f6e6d6", roughness: .68 }), COUNT + 1);
    this.meshes = [this.upper, this.lower, this.mouth, this.teeth];
    this.meshes.forEach((mesh) => { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; this.scene.add(mesh); });
    for (let slot = 0; slot <= COUNT; slot++) this.hide(slot);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.invalidate);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
  }

  private createLipMaterial(upper: boolean) {
    const material = new THREE.MeshPhysicalMaterial({ map: this.sourceTexture, roughness: .57, metalness: 0, clearcoat: .12, clearcoatRoughness: .42, sheen: .08, sheenColor: "#ff9cae", envMapIntensity: .28 });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = "attribute vec2 lipTile; attribute vec2 lipForm; varying vec2 lipUv; varying float sourceCoverage;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n${upper ? "transformed.y-=lipForm.x*exp(-transformed.x*transformed.x*18.)*smoothstep(.52,.98,uv.y);" : ""}\ntransformed.y+=lipForm.y*transformed.x*transformed.x;`);
      // Canvas rows start at the top, while texture UV rows start at the bottom.
      shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>\nlipUv=uv; sourceCoverage=lipTile.y; vMapUv=(vec2(mod(lipTile.x,${ATLAS_COLUMNS}.),${ATLAS_COLUMNS - 1}.-floor(lipTile.x/${ATLAS_COLUMNS}.))+vec2(.035+vMapUv.x*.93,.035+vMapUv.y*.86))/vec2(${ATLAS_COLUMNS}.0,${ATLAS_COLUMNS}.0);`);
      shader.fragmentShader = "varying vec2 lipUv; varying float sourceCoverage;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\nfloat edge=smoothstep(.02,.16,lipUv.x)*smoothstep(.02,.16,1.-lipUv.x); diffuseColor.rgb=mix(vec3(.34,.055,.07),diffuseColor.rgb,mix(.54,1.,edge)*sourceCoverage);");
    };
    material.customProgramCacheKey = () => `0922-lips-3d-source-volume-${upper ? "upper" : "lower"}-v2`;
    return material;
  }

  private onVisibility = () => { window.clearTimeout(this.timer); this.timer = undefined; if (!document.hidden) this.invalidate(); };
  private onContextLost = (event: Event) => { event.preventDefault(); this.failed = true; window.clearTimeout(this.timer); this.timer = undefined; this.entries.forEach(({ canvas }) => { canvas.style.visibility = "hidden"; canvas.dataset.lips3dStatus = "fallback"; }); };
  private invalidate = () => { this.dirty = true; this.schedule(); };
  private schedule() { if (this.timer === undefined && !this.disposed && !this.failed && !document.hidden) this.timer = window.setTimeout(this.frame, FRAME_MS); }

  private request(index: number) {
    if (!lips3DStudies[index]?.usable || this.loaded.has(index) || this.requested.has(index)) return;
    this.requested.add(index); this.queue.push(index); this.loadNext();
  }
  private loadNext() {
    while (!this.disposed && this.decoding < 2 && this.queue.length) {
      const index = this.queue.shift()!, study = lips3DStudies[index]!;
      const image = new Image(); this.decoding++; this.loading.add(image);
      const finish = () => { this.decoding--; this.loading.delete(image); this.loadNext(); };
      image.onload = () => {
        if (this.disposed) return;
        const slot = this.reserveSlot(index);
        if (slot === undefined) { finish(); return; }
        this.sourceContext.drawImage(image, slot % ATLAS_COLUMNS * TILE, Math.floor(slot / ATLAS_COLUMNS) * TILE, TILE, TILE);
        this.sourceTexture.needsUpdate = true; this.loaded.set(index, slot); this.lastUsed.set(index, performance.now()); this.invalidate(); finish();
      };
      image.onerror = () => { this.entries.forEach((entry) => { if (entry.index === index) entry.canvas.dataset.lips3dStatus = "fallback"; }); finish(); };
      image.src = study.sourceImage;
    }
  }
  private reserveSlot(index: number) {
    const vacant = this.slotOwners.findIndex((owner) => owner === undefined);
    if (vacant >= 0) { this.slotOwners[vacant] = index; return vacant; }
    const protectedIndices = new Set([...this.entries.values()].filter((entry) => entry.active || entry.inspect).map((entry) => entry.index));
    const candidates = [...this.loaded.keys()].filter((candidate) => !protectedIndices.has(candidate));
    const victim = (candidates.length ? candidates : [...this.loaded.keys()]).sort((a, b) => (this.lastUsed.get(a) ?? 0) - (this.lastUsed.get(b) ?? 0))[0];
    if (victim === undefined) return undefined;
    const slot = this.loaded.get(victim)!; this.loaded.delete(victim); this.lastUsed.delete(victim); this.slotOwners[slot] = index; return slot;
  }

  private hide(slot: number) { this.matrix.makeScale(0, 0, 0); this.meshes.forEach((mesh) => mesh.setMatrixAt(slot, this.matrix)); }
  private place(slot: number, index: number, pose: { x: number; y: number }, inspect: boolean) {
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(pose.x, pose.y, (seed(index, 1) - .5) * .08);
    const scale = (inspect ? 1.82 : 1.64 + seed(index, 2) * .06), form = lips3DStudies[index]!.form;
    this.root.scale.set(scale * form.width, scale, scale); this.root.updateMatrix();
    this.part.position.set(0, form.smileLift * .22, 0); this.part.scale.set(1, form.upperFullness, 1); this.part.updateMatrix();
    this.matrix.multiplyMatrices(this.root.matrix, this.part.matrix); this.upper.setMatrixAt(slot, this.matrix);
    this.part.position.set(0, form.smileLift * .18, 0); this.part.scale.set(1, form.lowerFullness, 1); this.part.updateMatrix();
    this.matrix.multiplyMatrices(this.root.matrix, this.part.matrix); this.lower.setMatrixAt(slot, this.matrix);
    // Aperture and teeth are separate shallow forms, not a straight visual cut.
    this.part.position.set(0, form.smileLift * .25, -.012); this.part.scale.set(1, form.aperture, 1); this.part.updateMatrix();
    this.matrix.multiplyMatrices(this.root.matrix, this.part.matrix); this.mouth.setMatrixAt(slot, this.matrix);
    this.part.position.set(0, form.smileLift * .27 + .014, -.004); this.part.scale.set(1, form.teeth, 1); this.part.updateMatrix();
    this.matrix.multiplyMatrices(this.root.matrix, this.part.matrix); this.teeth.setMatrixAt(slot, this.matrix);
    // A usable exact-person crop keeps its photographed albedo. Only the two
    // historic clipped-baseline sources retain the deliberate reduced blend.
    this.tiles.setXY(slot, this.loaded.get(index)!, lips3DStudies[index]!.sourceQuality === "baseline-preserved" ? .72 : 1);
    this.forms.setXY(slot, form.cupidDip, form.smileLift);
  }

  private frame = () => {
    this.timer = undefined;
    if (this.disposed || this.failed || document.hidden) return;
    const active = new Set<number>(); let inspector: Entry | undefined;
    this.entries.forEach((entry) => {
      if (entry.inspect) { inspector = entry; return; }
      if (entry.active) { const rect = entry.canvas.getBoundingClientRect(); if (rect.width > 0 && rect.top < window.innerHeight && rect.bottom > 0) active.add(entry.index); }
    });
    if (!this.dirty && !active.size) return;
    const draw = (entry: Entry, inspect: boolean) => {
      if (!this.loaded.has(entry.index)) { this.request(entry.index); return; }
      const index = entry.index;
      const pose = this.poses[index]!;
      if (!inspect && active.has(index) && !this.reducedMotion.matches) { pose.t += FRAME_MS / 1000; pose.x = Math.sin(pose.t * .38 + index) * .055; pose.y = Math.sin(pose.t * .27 + index * 2) * .12; }
      this.place(0, index, inspect ? this.inspectPose : pose, inspect);
      this.meshes.forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; }); this.tiles.needsUpdate = true; this.forms.needsUpdate = true;
      this.renderer.render(this.scene, this.camera);
      const size = inspect ? INSPECT : TILE;
      entry.context.drawImage(this.renderer.domElement, 0, 0, INSPECT, INSPECT, 0, 0, size, size);
      entry.canvas.style.visibility = "visible"; entry.canvas.dataset.lips3dStatus = "ready"; entry.canvas.dataset.lips3dSource = lips3DStudies[index]!.id;
      this.lastUsed.set(index, performance.now());
    };
    const fieldEntries = [...this.entries.values()].filter((entry) => !entry.inspect && active.has(entry.index));
    const selected = fieldEntries.length <= MAX_FIELD_DRAWS_PER_FRAME
      ? fieldEntries
      : Array.from({ length: MAX_FIELD_DRAWS_PER_FRAME }, (_, offset) => fieldEntries[(this.fieldCursor + offset) % fieldEntries.length]!);
    this.fieldCursor = fieldEntries.length ? (this.fieldCursor + selected.length) % fieldEntries.length : 0;
    selected.forEach((entry) => draw(entry, false));
    if (inspector) draw(inspector, true);
    this.dirty = false; if (active.size) this.schedule();
  };

  attach(canvas: HTMLCanvasElement, index: number, active = true, inspect = false) {
    if (inspect && [...this.entries.values()].some((entry) => entry.inspect)) return;
    const context = canvas.getContext("2d", { alpha: false }); if (!context) return;
    index = ((index % COUNT) + COUNT) % COUNT; canvas.width = inspect ? INSPECT : TILE; canvas.height = canvas.width;
    this.entries.set(canvas, { canvas, context, index, active, inspect }); if (inspect) this.inspectPose = { x: 0, y: 0 };
    if (active || inspect) this.request(index); this.invalidate();
  }
  update(canvas: HTMLCanvasElement, active: boolean) { const entry = this.entries.get(canvas); if (entry) { entry.active = active; if (active || entry.inspect) this.request(entry.index); this.invalidate(); } }
  turn(canvas: HTMLCanvasElement, x: number, y: number) { if (!this.entries.get(canvas)?.inspect) return; this.inspectPose.x = THREE.MathUtils.clamp(this.inspectPose.x + y, -.8, .8); this.inspectPose.y += x; this.invalidate(); }
  detach(canvas: HTMLCanvasElement) { this.entries.delete(canvas); this.invalidate(); }
  dispose() {
    this.disposed = true; window.clearTimeout(this.timer); this.queue.length = 0;
    this.loading.forEach((image) => { image.onload = null; image.onerror = null; image.src = ""; }); this.loading.clear(); this.entries.clear();
    document.removeEventListener("visibilitychange", this.onVisibility); this.reducedMotion.removeEventListener("change", this.invalidate); this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.meshes.forEach((mesh) => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose(); });
    this.sourceTexture.dispose(); this.environment.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
