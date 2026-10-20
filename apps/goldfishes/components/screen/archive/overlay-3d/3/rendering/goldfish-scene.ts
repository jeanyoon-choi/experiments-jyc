import * as THREE from "three";
import { TARGET_CAPTURE_PADDING } from "../model/attention-school";

const MAX_FISH_COUNT = 1000;
const MAX_APPROACH_RING_STATES = MAX_FISH_COUNT * 2;
const TRACE_HISTORY_SAMPLE_RATE = 12;
const MAX_TRACE_SECONDS = 10;
const TRACE_HISTORY_SAMPLES = TRACE_HISTORY_SAMPLE_RATE * MAX_TRACE_SECONDS + 1;
const MAX_TRACE_SEGMENTS_PER_FRAME = 12_000;
const FISH_MOUTH_OFFSET = 6.15;
const APPROACH_RING_ALPHA_BINS = 8;
const APPROACH_RING_VISUAL_PADDING = 24;
const APPROACH_RING_FADE_IN_SECONDS = 0.2;
const APPROACH_RING_FADE_OUT_SECONDS = 0.3;
const RING_RENDER_PIXEL_RATIO = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);

export type GoldfishAgent = Readonly<{ id: number; x: number; y: number; vx: number; vy: number; facing: number; target: number }>;
export type TargetRelations = Readonly<{ cellCount: number; centers: Float64Array; radii: Float64Array }>;
export type TargetLineShape = "straight" | "curve";
export type FishColourPaletteId = "classic" | "instagram" | "rose" | "sunset" | "poppy" | "pink";

const FISH_COLOUR_PALETTES: Readonly<Record<FishColourPaletteId, { body: string; fin: string }>> = {
  classic: { body: "#cf741c", fin: "#e7b365" },
  instagram: { body: "#ff5e29", fin: "#fed044" },
  rose: { body: "#f45b99", fin: "#ffc990" },
  sunset: { body: "#ef5551", fin: "#ffe179" },
  poppy: { body: "#e83c42", fin: "#f8a15d" },
  pink: { body: "#e57687", fin: "#f6c0a4" },
};

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
  private readonly ringRenderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly ringScene = new THREE.Scene();
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
  private readonly ringRoot = new THREE.Object3D();
  private readonly local = new THREE.Object3D();
  private readonly matrix = new THREE.Matrix4();
  private readonly phases = new Float64Array(MAX_FISH_COUNT);
  private readonly traceContext: CanvasRenderingContext2D;
  private readonly traceTimes = new Float64Array(TRACE_HISTORY_SAMPLES);
  private readonly tracePositions = new Float32Array(MAX_FISH_COUNT * TRACE_HISTORY_SAMPLES * 2);
  private traceHead = 0;
  private traceSampleCount = 0;
  private lastTraceSampleAt = Number.NEGATIVE_INFINITY;
  private readonly targetLineStartX = new Float32Array(MAX_FISH_COUNT);
  private readonly targetLineStartY = new Float32Array(MAX_FISH_COUNT);
  private readonly targetLineEndX = new Float32Array(MAX_FISH_COUNT);
  private readonly targetLineEndY = new Float32Array(MAX_FISH_COUNT);
  private readonly targetLineActive = new Uint8Array(MAX_FISH_COUNT);
  private readonly targetLineTarget = new Int32Array(MAX_FISH_COUNT);
  private readonly approachRingCounts = new Uint16Array(MAX_FISH_COUNT);
  private readonly approachRingCurrentTargets = new Int32Array(MAX_FISH_COUNT);
  private readonly approachRingCurrentRadii = new Float32Array(MAX_FISH_COUNT);
  private readonly approachRingCurrentOpacities = new Float32Array(MAX_FISH_COUNT);
  private readonly approachRingDepartingTargets = new Int32Array(MAX_FISH_COUNT);
  private readonly approachRingDepartingRadii = new Float32Array(MAX_FISH_COUNT);
  private readonly approachRingDepartingOpacities = new Float32Array(MAX_FISH_COUNT);
  private readonly approachRingBucketCounts = new Uint16Array(APPROACH_RING_ALPHA_BINS);
  private readonly approachRingBucketEntries = new Int32Array(APPROACH_RING_ALPHA_BINS * MAX_APPROACH_RING_STATES);
  private readonly approachRingMaterials: readonly THREE.MeshBasicMaterial[];
  private readonly approachRingMeshes: readonly THREE.InstancedMesh[];
  private tracesVisible = false;
  private targetLinesVisible = false;
  private approachRingsVisible = false;
  private fishPaletteId: FishColourPaletteId | undefined;
  private width = 1;
  private height = 1;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, private readonly traceCanvas: HTMLCanvasElement, ringCanvas: HTMLCanvasElement, count = 72, private readonly fishScale = 1) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: "high-performance" });
    this.ringRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: ringCanvas, powerPreference: "high-performance" });
    const traceContext = traceCanvas.getContext("2d", { alpha: true });
    if (!traceContext) throw new Error("Canvas2D trail layer is unavailable");
    this.traceContext = traceContext;
    this.targetLineTarget.fill(-1);
    this.approachRingCurrentTargets.fill(-1);
    this.approachRingDepartingTargets.fill(-1);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.ringRenderer.setPixelRatio(RING_RENDER_PIXEL_RATIO);
    this.ringRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.ringRenderer.setClearColor(0x000000, 0);
    const ringGeometry = new THREE.RingGeometry(0.978, 1, 192);
    ringGeometry.rotateX(-Math.PI / 2);
    const ringMaterials: THREE.MeshBasicMaterial[] = [];
    const ringMeshes: THREE.InstancedMesh[] = [];
    for (let bin = 0; bin < APPROACH_RING_ALPHA_BINS; bin += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: "#edf2f3",
        depthTest: false,
        depthWrite: false,
        opacity: 0.075 + bin * 0.04,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const mesh = new THREE.InstancedMesh(ringGeometry, material, MAX_APPROACH_RING_STATES);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      ringMaterials.push(material);
      ringMeshes.push(mesh);
      this.ringScene.add(mesh);
    }
    this.approachRingMaterials = ringMaterials;
    this.approachRingMeshes = ringMeshes;
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
    this.ringRenderer.setPixelRatio(RING_RENDER_PIXEL_RATIO);
    this.ringRenderer.setSize(this.width, this.height, false);
    this.traceCanvas.width = Math.round(this.width);
    this.traceCanvas.height = Math.round(this.height);
    this.traceContext.setTransform(1, 0, 0, 1, 0, 0);
    this.clearTraceHistory();
    this.camera.left = -this.width / 2; this.camera.right = this.width / 2;
    this.camera.top = this.height / 2; this.camera.bottom = -this.height / 2;
    const distance = Math.max(this.width, this.height) * 1.1;
    this.camera.position.set(0, distance, 0); this.camera.up.set(0, 0, -1); this.camera.lookAt(0, 0, 0); this.camera.updateProjectionMatrix();
  }

  render(agents: readonly GoldfishAgent[], elapsedSeconds: number, deltaSeconds = 0, showTraces = false, traceDurationSeconds = 5, showTargetLines = false, showApproachRings = false, targetLineShape: TargetLineShape = "straight", targetRelations: TargetRelations | undefined = undefined, fishPaletteId: FishColourPaletteId = "classic") {
    if (this.disposed) return;
    const count = Math.min(MAX_FISH_COUNT, agents.length);
    const hadFieldOverlay = this.targetLinesVisible || this.approachRingsVisible;
    const hadApproachRings = this.approachRingsVisible;
    const hadTraceOverlay = this.tracesVisible || this.targetLinesVisible;
    this.setFishPalette(fishPaletteId);
    if (!showTraces && this.tracesVisible) {
      this.clearTraceHistory();
    }
    this.tracesVisible = showTraces;
    this.targetLinesVisible = showTargetLines;
    this.approachRingsVisible = showApproachRings;
    if (showApproachRings && targetRelations) this.drawApproachRings(agents, count, targetRelations, deltaSeconds);
    else if (hadApproachRings) this.clearApproachRingStates();
    if (showTraces || showTargetLines) {
      this.traceContext.clearRect(0, 0, this.width, this.height);
      if (showTargetLines && targetRelations) this.drawTargetLines(agents, count, targetRelations, targetLineShape, deltaSeconds);
      if (showTraces) {
      this.recordTraceSample(agents, count, elapsedSeconds);
      this.drawTraceHistory(count, elapsedSeconds, traceDurationSeconds);
      }
    } else if (hadTraceOverlay || hadFieldOverlay) {
      this.traceContext.clearRect(0, 0, this.width, this.height);
    }
    for (const mesh of this.meshes) mesh.count = count;
    for (let index = 0; index < count; index += 1) {
      const fish = agents[index]!;
      const speed = Math.hypot(fish.vx, fish.vy);
      this.phases[index] = THREE.MathUtils.euclideanModulo(this.phases[index]! + deltaSeconds * (5.2 + speed * 0.018), Math.PI * 2);
      const phase = this.phases[index]!;
      const tailAngle = Math.sin(phase) * 0.38;
      const heading = fish.facing;
      this.root.position.set(fish.x - this.width / 2, 10 + Math.sin(elapsedSeconds * 0.55 + fish.id * 2.173) * 1.2, fish.y - this.height / 2);
      this.root.rotation.set(0, -heading, 0);
      this.root.scale.setScalar(this.fishScale);
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

  dispose() { if (this.disposed) return; this.disposed = true; this.clearTraceHistory(); for (const mesh of this.meshes) { mesh.geometry.dispose(); mesh.dispose(); } this.approachRingMeshes[0]?.geometry.dispose(); for (const material of this.approachRingMaterials) material.dispose(); this.bodyMaterial.dispose(); this.finMaterial.dispose(); this.eyeMaterial.dispose(); this.renderer.dispose(); this.ringRenderer.dispose(); }

  private clearTraceHistory() {
    this.traceContext.clearRect(0, 0, this.width, this.height);
    this.traceHead = 0;
    this.traceSampleCount = 0;
    this.lastTraceSampleAt = Number.NEGATIVE_INFINITY;
  }

  private recordTraceSample(agents: readonly GoldfishAgent[], count: number, elapsedSeconds: number) {
    if (this.traceSampleCount > 0 && elapsedSeconds - this.lastTraceSampleAt < 1 / TRACE_HISTORY_SAMPLE_RATE) return;
    const slot = this.traceHead;
    this.traceTimes[slot] = elapsedSeconds;
    for (let index = 0; index < count; index += 1) {
      const fish = agents[index]!;
      const position = (index * TRACE_HISTORY_SAMPLES + slot) * 2;
      this.tracePositions[position] = fish.x;
      this.tracePositions[position + 1] = fish.y;
    }
    this.traceHead = (slot + 1) % TRACE_HISTORY_SAMPLES;
    this.traceSampleCount = Math.min(TRACE_HISTORY_SAMPLES, this.traceSampleCount + 1);
    this.lastTraceSampleAt = elapsedSeconds;
  }

  private drawTraceHistory(count: number, elapsedSeconds: number, traceDurationSeconds: number) {
    if (this.traceSampleCount < 2) return;
    const oldestSlot = (this.traceHead - this.traceSampleCount + TRACE_HISTORY_SAMPLES) % TRACE_HISTORY_SAMPLES;
    const cutoff = elapsedSeconds - Math.max(1, Math.min(MAX_TRACE_SECONDS, traceDurationSeconds));
    let first = 0;
    while (first < this.traceSampleCount - 1 && this.traceTimes[(oldestSlot + first) % TRACE_HISTORY_SAMPLES]! < cutoff) first += 1;
    const visibleSamples = this.traceSampleCount - first;
    if (visibleSamples < 2) return;
    const stride = Math.max(1, Math.ceil(count * (visibleSamples - 1) / MAX_TRACE_SEGMENTS_PER_FRAME));
    const last = this.traceSampleCount - 1;
    this.traceContext.save();
    this.traceContext.strokeStyle = "rgb(216 182 106 / 30%)";
    this.traceContext.lineCap = "round";
    this.traceContext.lineWidth = 0.7;
    this.traceContext.beginPath();
    for (let fishIndex = 0; fishIndex < count; fishIndex += 1) {
      const base = fishIndex * TRACE_HISTORY_SAMPLES * 2;
      for (let sample = first; sample <= last; sample += stride) {
        const slot = (oldestSlot + sample) % TRACE_HISTORY_SAMPLES;
        const position = base + slot * 2;
        if (sample === first) this.traceContext.moveTo(this.tracePositions[position]!, this.tracePositions[position + 1]!);
        else this.traceContext.lineTo(this.tracePositions[position]!, this.tracePositions[position + 1]!);
      }
      if ((last - first) % stride !== 0) {
        const slot = (oldestSlot + last) % TRACE_HISTORY_SAMPLES;
        const position = base + slot * 2;
        this.traceContext.lineTo(this.tracePositions[position]!, this.tracePositions[position + 1]!);
      }
    }
    this.traceContext.stroke();
    this.traceContext.restore();
  }

  /**
   * Every fish within its target's 24px approach band owns one complete circle.
   * The keyword is the centre and the fish centre lies on its circumference. A
   * ring fades in at that boundary, remains while the condition holds, then
   * fades out from its last radius after departure. Preallocated opacity buckets
   * draw each active ring once, without DOM or per-fish allocations.
   */
  private drawApproachRings(agents: readonly GoldfishAgent[], count: number, relations: TargetRelations, deltaSeconds: number) {
    const { cellCount, centers, radii } = relations;
    if (cellCount === 0) return;
    const countableCells = Math.min(cellCount, this.approachRingCounts.length);
    const delta = Math.max(1 / 120, Math.min(0.1, deltaSeconds));
    const fadeIn = delta / APPROACH_RING_FADE_IN_SECONDS;
    const fadeOut = delta / APPROACH_RING_FADE_OUT_SECONDS;
    this.approachRingCounts.fill(0, 0, countableCells);
    for (let index = 0; index < count; index += 1) {
      const fish = agents[index]!;
      const cell = fish.target;
      const currentTarget = this.approachRingCurrentTargets[index]!;
      const radius = cell >= 0 && cell < countableCells ? radii[cell]! : 0;
      const ringRadius = radius > 0 ? Math.hypot(fish.x - centers[cell * 2]!, fish.y - centers[cell * 2 + 1]!) : 0;
      const isInsideBand = ringRadius > radius + 0.75 && ringRadius <= radius + APPROACH_RING_VISUAL_PADDING;

      if (isInsideBand) {
        if (currentTarget !== cell) {
          this.moveCurrentRingToDeparture(index);
          this.approachRingCurrentTargets[index] = cell;
          this.approachRingCurrentOpacities[index] = 0;
        }
        this.approachRingCurrentRadii[index] = ringRadius;
        this.approachRingCurrentOpacities[index] = Math.min(1, this.approachRingCurrentOpacities[index]! + fadeIn);
      } else if (currentTarget >= 0) {
        this.moveCurrentRingToDeparture(index);
      }

      const currentCell = this.approachRingCurrentTargets[index]!;
      if (currentCell >= 0 && this.approachRingCurrentOpacities[index]! > 0) this.approachRingCounts[currentCell] += 1;
      const departingCell = this.approachRingDepartingTargets[index]!;
      if (departingCell >= 0) {
        const nextOpacity = Math.max(0, this.approachRingDepartingOpacities[index]! - fadeOut);
        this.approachRingDepartingOpacities[index] = nextOpacity;
        if (nextOpacity === 0) this.approachRingDepartingTargets[index] = -1;
        else this.approachRingCounts[departingCell] += 1;
      }
    }

    this.approachRingBucketCounts.fill(0);
    for (let index = 0; index < count; index += 1) {
      this.enqueueApproachRing(index, false, countableCells);
      this.enqueueApproachRing(index, true, countableCells);
    }

    for (let bin = 0; bin < APPROACH_RING_ALPHA_BINS; bin += 1) {
      const bucketCount = this.approachRingBucketCounts[bin]!;
      const mesh = this.approachRingMeshes[bin]!;
      mesh.count = bucketCount;
      if (bucketCount === 0) continue;
      const bucketStart = bin * MAX_APPROACH_RING_STATES;
      for (let entry = 0; entry < bucketCount; entry += 1) {
        const encoded = this.approachRingBucketEntries[bucketStart + entry]!;
        const index = encoded >> 1;
        const departing = (encoded & 1) === 1;
        const cell = departing ? this.approachRingDepartingTargets[index]! : this.approachRingCurrentTargets[index]!;
        const ringRadius = departing ? this.approachRingDepartingRadii[index]! : this.approachRingCurrentRadii[index]!;
        const centerX = centers[cell * 2]!;
        const centerY = centers[cell * 2 + 1]!;
        this.ringRoot.position.set(centerX - this.width / 2, 0, centerY - this.height / 2);
        this.ringRoot.scale.set(ringRadius, 1, ringRadius);
        this.ringRoot.updateMatrix();
        mesh.setMatrixAt(entry, this.ringRoot.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.ringRenderer.render(this.ringScene, this.camera);
  }

  private enqueueApproachRing(index: number, departing: boolean, countableCells: number) {
    const cell = departing ? this.approachRingDepartingTargets[index]! : this.approachRingCurrentTargets[index]!;
    const ringRadius = departing ? this.approachRingDepartingRadii[index]! : this.approachRingCurrentRadii[index]!;
    const transitionOpacity = departing ? this.approachRingDepartingOpacities[index]! : this.approachRingCurrentOpacities[index]!;
    if (cell < 0 || cell >= countableCells || transitionOpacity <= 0 || ringRadius <= 0) return;
    const ringsAtTarget = this.approachRingCounts[cell]!;
    const densityOpacity = ringsAtTarget <= 1 ? 1 : ringsAtTarget <= 3 ? 0.74 : 0.54;
    const ringBin = Math.min(APPROACH_RING_ALPHA_BINS - 1, Math.floor(transitionOpacity * densityOpacity * APPROACH_RING_ALPHA_BINS));
    const bucketLength = this.approachRingBucketCounts[ringBin]!;
    if (bucketLength >= MAX_APPROACH_RING_STATES) return;
    this.approachRingBucketEntries[ringBin * MAX_APPROACH_RING_STATES + bucketLength] = index * 2 + (departing ? 1 : 0);
    this.approachRingBucketCounts[ringBin] = bucketLength + 1;
  }

  private moveCurrentRingToDeparture(index: number) {
    const target = this.approachRingCurrentTargets[index]!;
    const opacity = this.approachRingCurrentOpacities[index]!;
    if (target >= 0 && opacity > this.approachRingDepartingOpacities[index]!) {
      this.approachRingDepartingTargets[index] = target;
      this.approachRingDepartingRadii[index] = this.approachRingCurrentRadii[index]!;
      this.approachRingDepartingOpacities[index] = opacity;
    }
    this.approachRingCurrentTargets[index] = -1;
    this.approachRingCurrentOpacities[index] = 0;
  }

  private clearApproachRingStates() {
    this.approachRingCurrentTargets.fill(-1);
    this.approachRingCurrentOpacities.fill(0);
    this.approachRingDepartingTargets.fill(-1);
    this.approachRingDepartingOpacities.fill(0);
    for (const mesh of this.approachRingMeshes) mesh.count = 0;
    this.ringRenderer.render(this.ringScene, this.camera);
  }

  private drawTargetLines(agents: readonly GoldfishAgent[], count: number, relations: TargetRelations, shape: TargetLineShape, deltaSeconds: number) {
    const { cellCount, centers, radii } = relations;
    const blend = 1 - Math.exp(-Math.max(1 / 24, Math.min(0.1, deltaSeconds)) / 0.13);
    this.traceContext.save();
    this.traceContext.strokeStyle = "#d8b66a";
    this.traceContext.globalAlpha = 0.5;
    this.traceContext.lineCap = "round";
    this.traceContext.lineJoin = "round";
    this.traceContext.lineWidth = 1;
    this.traceContext.beginPath();
    for (let index = 0; index < count; index += 1) {
      const fish = agents[index]!;
      const cell = fish.target;
      const mouthX = fish.x + Math.cos(fish.facing) * FISH_MOUTH_OFFSET * this.fishScale;
      const mouthY = fish.y + Math.sin(fish.facing) * FISH_MOUTH_OFFSET * this.fishScale;
      const hasTarget = cell >= 0 && cell < cellCount && radii[cell]! > 0;
      if (hasTarget) {
        const targetX = centers[cell * 2]!, targetY = centers[cell * 2 + 1]!;
        const dx = targetX - mouthX, dy = targetY - mouthY;
        const distance = Math.hypot(dx, dy);
        const radius = radii[cell]!;
        if (distance > radius + 0.2) {
          const scale = (distance - radius) / distance;
          const endX = mouthX + dx * scale, endY = mouthY + dy * scale;
          if (!this.targetLineActive[index]) {
            this.targetLineActive[index] = 1;
            this.targetLineTarget[index] = cell;
            this.targetLineStartX[index] = mouthX;
            this.targetLineStartY[index] = mouthY;
            // A line switched on from the field controls should be visible immediately.
            this.targetLineEndX[index] = endX;
            this.targetLineEndY[index] = endY;
          } else if (this.targetLineTarget[index] !== cell) {
            // Do not sweep a relation across the field when a fish changes target.
            // Retract it to the current mouth, then let the new relation grow out.
            this.targetLineTarget[index] = cell;
            this.targetLineStartX[index] = mouthX;
            this.targetLineStartY[index] = mouthY;
            this.targetLineEndX[index] = mouthX;
            this.targetLineEndY[index] = mouthY;
          }
          this.targetLineStartX[index] += (mouthX - this.targetLineStartX[index]!) * blend;
          this.targetLineStartY[index] += (mouthY - this.targetLineStartY[index]!) * blend;
          this.targetLineEndX[index] += (endX - this.targetLineEndX[index]!) * blend;
          this.targetLineEndY[index] += (endY - this.targetLineEndY[index]!) * blend;
        } else {
          this.targetLineActive[index] = 0;
          this.targetLineTarget[index] = -1;
        }
      } else if (this.targetLineActive[index]) {
        this.targetLineStartX[index] += (mouthX - this.targetLineStartX[index]!) * blend;
        this.targetLineStartY[index] += (mouthY - this.targetLineStartY[index]!) * blend;
        this.targetLineEndX[index] += (this.targetLineStartX[index]! - this.targetLineEndX[index]!) * blend;
        this.targetLineEndY[index] += (this.targetLineStartY[index]! - this.targetLineEndY[index]!) * blend;
        if (Math.hypot(this.targetLineEndX[index]! - this.targetLineStartX[index]!, this.targetLineEndY[index]! - this.targetLineStartY[index]!) < 0.25) {
          this.targetLineActive[index] = 0;
          this.targetLineTarget[index] = -1;
        }
      }
      if (!this.targetLineActive[index]) continue;
      const startX = this.targetLineStartX[index]!, startY = this.targetLineStartY[index]!;
      const endX = this.targetLineEndX[index]!, endY = this.targetLineEndY[index]!;
      this.traceContext.moveTo(startX, startY);
      if (shape === "straight") {
        this.traceContext.lineTo(endX, endY);
      } else {
        const dx = endX - startX, dy = endY - startY;
        const distance = Math.hypot(dx, dy);
        if (distance < 1) this.traceContext.lineTo(endX, endY);
        else {
          // A cubic Bézier is P0 (moveTo), two separate control points, and P3
          // (the final end point). Both controls live on one stable side of the
          // chord, creating an intentional arc rather than an almost-straight line.
          const bendDirection = (fish.id * 37 + this.targetLineTarget[index]! * 61) % 2 === 0 ? -1 : 1;
          const bend = bendDirection * Math.min(42, Math.max(4, distance * 0.24));
          const normalX = -dy / distance, normalY = dx / distance;
          this.traceContext.bezierCurveTo(
            startX + dx * 0.22 + normalX * bend,
            startY + dy * 0.22 + normalY * bend,
            startX + dx * 0.78 + normalX * bend,
            startY + dy * 0.78 + normalY * bend,
            endX,
            endY,
          );
        }
      }
    }
    this.traceContext.stroke();
    this.traceContext.restore();
  }

  private setFishPalette(id: FishColourPaletteId) {
    if (this.fishPaletteId === id) return;
    this.fishPaletteId = id;
    const palette = FISH_COLOUR_PALETTES[id];
    this.bodyMaterial.color.set(palette.body);
    this.bodyMaterial.emissive.set(palette.body);
    this.finMaterial.color.set(palette.fin);
    this.finMaterial.emissive.set(palette.fin);
  }

  private part(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) {
    this.local.position.set(x, y, z); this.local.rotation.set(rx, ry, rz); this.local.scale.set(sx, sy, sz); this.local.updateMatrix();
    this.matrix.multiplyMatrices(this.root.matrix, this.local.matrix); mesh.setMatrixAt(index, this.matrix);
  }
}
