import * as THREE from "three/webgpu";
import { atan, attribute, step, texture, uv } from "three/tsl";
import { techKeywordAt, techKeywords } from "../model/tech-keywords";
import { storyCenter, type FieldLayout } from "../model/attention-school";
import type { SocialStorySystem, StoryInfluence } from "../model/types";
type Appearance = Readonly<{ surface: "techMono" | "tech"; paletteId: string; directed: boolean }>;
const TECH_PALETTE_FOR_TERM: Readonly<Record<string, string>> = {
  AX: "instagram", DX: "instagram", GD: "instagram", NG: "instagram", AGI: "instagram", GPT: "instagram", LLM: "instagram", RAG: "instagram", VLM: "instagram",
  AI: "lilac", ML: "lilac", DL: "lilac", RL: "lilac", CV: "lilac", NL: "lilac", GPU: "lilac", NLP: "lilac", NPU: "lilac",
  AR: "ocean", BI: "ocean", DB: "ocean", DC: "ocean", DM: "ocean", DS: "ocean", DT: "ocean", KB: "ocean", MR: "ocean", VR: "ocean", XR: "ocean", API: "ocean", CDN: "ocean", CLI: "ocean", IoT: "ocean", SDK: "ocean",
  CD: "forest", CI: "forest", CM: "forest", CR: "forest", QA: "forest", QC: "forest", RD: "forest", RE: "forest", SD: "forest", SE: "forest", SI: "forest", SW: "forest", IDE: "forest", RPA: "forest", SRE: "forest",
  FE: "citrus", IA: "citrus", IC: "citrus", ID: "citrus", IM: "citrus", IS: "citrus", IT: "citrus", NC: "citrus", OA: "citrus", OO: "citrus", OS: "citrus", OT: "citrus", PC: "citrus", UI: "citrus", UX: "citrus", KPI: "citrus", MVP: "citrus",
  CS: "rose", CX: "rose", EM: "rose", HR: "rose", PR: "rose", PS: "rose", SA: "rose", CRM: "rose", ERP: "rose", ESG: "rose",
  OM: "sunset", OP: "sunset", PL: "sunset", PM: "sunset", PO: "sunset", SM: "sunset", SO: "sunset", SP: "sunset", TA: "sunset", TC: "sunset", TD: "sunset", TM: "sunset", TP: "sunset", TS: "sunset", DAO: "sunset", NFT: "sunset",
  EC: "dusk", FI: "dusk", FX: "dusk", IR: "dusk", MA: "dusk", PE: "dusk", PI: "dusk", VC: "dusk",
  BT: "ember", DR: "ember", GC: "ember", IP: "ember", RF: "ember", SC: "ember", SS: "ember", ST: "ember", TF: "ember", VM: "ember",
  KR: "monochrome", MB: "monochrome", OK: "monochrome", RM: "monochrome", SR: "monochrome",
};

const palettes = [
  { id: "instagram", name: "Instagram", gradient: "conic-gradient(from 205deg, #fed044, #ff264f 30%, #ed0e9b 58%, #ff5e29 80%, #fed044)", edgeStart: "#ffbd5b", edgeMiddle: "#fa4aa5", edgeEnd: "#ffd06a" },
  { id: "rose", name: "Rose", gradient: "conic-gradient(from 205deg, #ffc990, #f45b99 30%, #bd4ab9 58%, #ee8a74 80%, #ffc990)", edgeStart: "#ffc49a", edgeMiddle: "#e95f9d", edgeEnd: "#ef9dbe" },
  { id: "sunset", name: "Sunset", gradient: "conic-gradient(from 205deg, #ffe179, #ff993f 30%, #ef5551 58%, #bb4e8a 80%, #ffe179)", edgeStart: "#ffd66f", edgeMiddle: "#f46a4f", edgeEnd: "#ca5793" },
  { id: "lilac", name: "Lilac", gradient: "conic-gradient(from 205deg, #f3b7ff, #c952e8 30%, #7355df 58%, #648de8 80%, #f3b7ff)", edgeStart: "#e6b4ff", edgeMiddle: "#a653e2", edgeEnd: "#6d8ff0" },
  { id: "ocean", name: "Ocean", gradient: "conic-gradient(from 205deg, #87efd5, #2eb7d4 30%, #3f72e4 58%, #776ce7 80%, #87efd5)", edgeStart: "#87efd5", edgeMiddle: "#32a8d6", edgeEnd: "#7473ec" },
  { id: "forest", name: "Forest", gradient: "conic-gradient(from 205deg, #d9ef73, #75c76b 30%, #168c76 58%, #2eaa92 80%, #d9ef73)", edgeStart: "#d1e97c", edgeMiddle: "#54bd7a", edgeEnd: "#2aa991" },
  { id: "citrus", name: "Citrus", gradient: "conic-gradient(from 205deg, #fff36d, #c9e64b 30%, #56bc76 58%, #f2bd43 80%, #fff36d)", edgeStart: "#fff06a", edgeMiddle: "#91d05f", edgeEnd: "#f6c24e" },
  { id: "ember", name: "Ember", gradient: "conic-gradient(from 205deg, #ffc45a, #f86e35 30%, #d94545 58%, #a94d71 80%, #ffc45a)", edgeStart: "#ffbf59", edgeMiddle: "#ed593f", edgeEnd: "#b55075" },
  { id: "dusk", name: "Dusk", gradient: "conic-gradient(from 205deg, #edbb85, #cb688a 30%, #704da7 58%, #426eae 80%, #edbb85)", edgeStart: "#e9b78c", edgeMiddle: "#a8589e", edgeEnd: "#4e72b2" },
  { id: "monochrome", name: "Monochrome", gradient: "conic-gradient(from 205deg, #f3f5f6, #9199a0 30%, #4c555e 58%, #aeb5bb 80%, #f3f5f6)", edgeStart: "#d8dde0", edgeMiddle: "#8b949b", edgeEnd: "#f3f5f6" },
];

export const MAX_KEYWORD_FIELD_INSTANCES = 2048;
const COLUMNS = 16;
const ROWS = Math.ceil(techKeywords.length / COLUMNS);
const TILE = 256;
const MAX_EDGES = 120;
const SEGMENTS = 20;
const MAX_VERTICES = MAX_EDGES * (SEGMENTS * 6 + 3);
const RING_PADDING = 3.5 / 93;
const PALETTE_IDS = palettes.map((palette) => palette.id);

function atlas(canvas: HTMLCanvasElement) {
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.generateMipmaps = false;
  result.minFilter = result.magFilter = THREE.LinearFilter;
  return result;
}
function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  return canvas;
}
function rect(index: number, columns: number, rows: number, buffer: Float32Array, offset: number) {
  buffer[offset] = (index % columns) / columns;
  buffer[offset + 1] = 1 - (Math.floor(index / columns) + 1) / rows;
  buffer[offset + 2] = 1 / columns; buffer[offset + 3] = 1 / rows;
}
function paletteAt(index: number, appearance: Appearance) {
  const id = appearance.surface === "tech" ? TECH_PALETTE_FOR_TERM[techKeywordAt(index).abbreviation] : appearance.paletteId;
  return palettes.find((palette) => palette.id === id) ?? palettes[0]!;
}
function ease(t: number) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }
function envelope(t: number, points: readonly (readonly [number, number])[]) {
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i]![0]) {
      const a = points[i - 1]!, b = points[i]!;
      return a[1] + (b[1] - a[1]) * ease((t - a[0]) / (b[0] - a[0]));
    }
  }
  return points.at(-1)![1];
}
const LINE_FADE = [[0, 0], [.12, .98], [.78, .58], [1, 0]] as const;
const DIRECTED_FADE = [[0, 0], [.11, 0], [.16, .98], [.56, .98], [.70, .78], [1, 0]] as const;
const ARROW_FADE = [[0, 0], [.50, 0], [.57, .98], [.92, .78], [1, 0]] as const;

/** One ground plane in the fish scene; atlases are uploaded only at creation/layout changes. */
export class KeywordField {
  readonly group = new THREE.Group();
  private layout: FieldLayout = { width: 1, height: 1, columns: 1, rows: 1, iconSize: 40, gap: 26, showLabels: false };
  private readonly glyphTexture: THREE.CanvasTexture;
  private readonly ringTexture: THREE.CanvasTexture;
  private readonly labelCanvas = createCanvas(COLUMNS * TILE, ROWS * TILE);
  private readonly labelTexture = atlas(this.labelCanvas);
  private readonly ring: THREE.InstancedMesh;
  private readonly face: THREE.InstancedMesh;
  private readonly labels: THREE.InstancedMesh;
  private readonly alpha = new THREE.InstancedBufferAttribute(new Float32Array(MAX_KEYWORD_FIELD_INSTANCES), 1).setUsage(THREE.DynamicDrawUsage);
  private readonly progress = new THREE.InstancedBufferAttribute(new Float32Array(MAX_KEYWORD_FIELD_INSTANCES), 1).setUsage(THREE.DynamicDrawUsage);
  private readonly ringRects = new THREE.InstancedBufferAttribute(new Float32Array(MAX_KEYWORD_FIELD_INSTANCES * 4), 4).setUsage(THREE.DynamicDrawUsage);
  private readonly glyphRects = new THREE.InstancedBufferAttribute(new Float32Array(MAX_KEYWORD_FIELD_INSTANCES * 4), 4);
  private readonly object = new THREE.Object3D();
  private readonly positions = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3).setUsage(THREE.DynamicDrawUsage);
  private readonly colors = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 4), 4).setUsage(THREE.DynamicDrawUsage);
  private readonly edgeGeometry = new THREE.BufferGeometry();
  private readonly edgeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false });
  private readonly edgeMesh = new THREE.Mesh(this.edgeGeometry, this.edgeMaterial);
  private readonly c0 = new THREE.Color();
  private readonly c1 = new THREE.Color();
  private readonly c2 = new THREE.Color();
  private readonly mixed = new THREE.Color();
  private vertexCount = 0;

  constructor() {
    this.group.name = "keyword-field";
    const glyphCanvas = createCanvas(COLUMNS * TILE, ROWS * TILE);
    this.drawGlyphs(glyphCanvas);
    this.glyphTexture = atlas(glyphCanvas);
    const ringCanvas = createCanvas(4 * TILE, 4 * TILE);
    const ctx = ringCanvas.getContext("2d")!;
    palettes.forEach((palette, i) => {
      const x = (i % 4) * TILE + TILE / 2, y = Math.floor(i / 4) * TILE + TILE / 2;
      // CSS conic-gradient starts at 12 o'clock; Canvas starts on the positive x axis.
      const gradient = ctx.createConicGradient((205 - 90) * Math.PI / 180, x, y);
      const stops = [...palette.gradient.matchAll(/(#[0-9a-f]{6})(?: (\d+)%)?/g)];
      stops.forEach((stop, index) => gradient.addColorStop(stop[2] ? Number(stop[2]) / 100 : index === 0 ? 0 : 1, stop[1]!));
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, TILE / 2 - .5, 0, Math.PI * 2); ctx.fill();
    });
    this.ringTexture = atlas(ringCanvas);
    for (let i = 0; i < MAX_KEYWORD_FIELD_INSTANCES; i++) rect(i % techKeywords.length, COLUMNS, ROWS, this.glyphRects.array as Float32Array, i * 4);
    this.ring = this.createLayer(this.ringTexture, this.ringRects, true);
    this.face = this.createLayer(this.glyphTexture, this.glyphRects, false);
    this.labels = this.createLayer(this.labelTexture, this.glyphRects, false);
    this.edgeGeometry.setAttribute("position", this.positions);
    this.edgeGeometry.setAttribute("color", this.colors);
    this.edgeGeometry.setDrawRange(0, 0);
    this.edgeMesh.frustumCulled = false;
    this.group.add(this.edgeMesh, this.ring, this.face, this.labels);
    this.setLayout(this.layout);
  }

  private createLayer(map: THREE.Texture, atlasRect: THREE.InstancedBufferAttribute, sweep: boolean) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    geometry.setAttribute("tileRect", atlasRect);
    geometry.setAttribute("visibility", this.alpha);
    geometry.setAttribute("viewProgress", this.progress);
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: !sweep, alphaTest: .005, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false });
    const tile = attribute<"vec4">("tileRect", "vec4");
    material.colorNode = texture(map, uv().mul(tile.zw).add(tile.xy));
    let opacity = attribute<"float">("visibility", "float").mul(1);
    if (sweep) {
      const p = uv().sub(.5);
      const angle = atan(p.x, p.y).add(Math.PI * 2).mod(Math.PI * 2).div(Math.PI * 2);
      opacity = opacity.mul(step(attribute<"float">("viewProgress", "float"), angle));
    }
    material.opacityNode = opacity;
    const mesh = new THREE.InstancedMesh(geometry, material, MAX_KEYWORD_FIELD_INSTANCES);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  }

  setLayout(layout: FieldLayout) {
    const redrawLabels = layout.iconSize !== this.layout.iconSize || !this.labels.count;
    this.layout = layout;
    if (redrawLabels) this.drawLabels();
    this.labels.visible = layout.showLabels;
  }

  update(system: SocialStorySystem, appearance: Appearance, now: number) {
    const count = Math.min(system.nodes.length, MAX_KEYWORD_FIELD_INSTANCES);
    for (const mesh of [this.ring, this.face, this.labels]) mesh.count = count;
    for (let i = 0; i < count; i++) {
      const state = system.states[i]!;
      const entering = state.status === "new" && state.availableAt > 0;
      const age = Math.max(0, now - state.availableAt);
      const leavingAge = Math.max(0, now - ((state.leavingUntil ?? now + 300) - 300));
      const visibility = state.status === "empty" ? 0 : state.status === "leaving" ? 1 - ease(leavingAge / 180) : entering ? ease(age / 180) : 1;
      const scale = state.status === "leaving" ? 1 - .22 * ease(leavingAge / 260) : entering ? .78 + .22 * ease(age / 260) : 1;
      this.alpha.setX(i, visibility);
      this.progress.setX(i, state.status === "viewing" ? Math.min(1, Math.max(0, (now - ((state.viewingUntil ?? now + 760) - 760)) / 760)) : state.status === "leaving" ? 1 : 0);
      const palette = paletteAt(i, appearance);
      rect(PALETTE_IDS.indexOf(palette.id), 4, 4, this.ringRects.array as Float32Array, i * 4);
      const center = storyCenter(i, this.layout);
      const size = this.layout.iconSize * scale;
      this.object.position.set(center.x - this.layout.width / 2, .015, center.y - this.layout.height / 2);
      this.object.scale.set(size, 1, size); this.object.updateMatrix();
      this.ring.setMatrixAt(i, this.object.matrix);
      this.object.position.y = .025; this.object.updateMatrix();
      this.face.setMatrixAt(i, this.object.matrix);
      this.object.position.set(center.x - this.layout.width / 2, .03, center.y - this.layout.height / 2 + this.layout.iconSize / 2 + 14);
      this.object.scale.set(this.layout.iconSize * scale, 1, 28 * scale); this.object.updateMatrix();
      this.labels.setMatrixAt(i, this.object.matrix);
    }
    for (const mesh of [this.ring, this.face, this.labels]) mesh.instanceMatrix.needsUpdate = true;
    this.alpha.needsUpdate = this.progress.needsUpdate = this.ringRects.needsUpdate = true;
    this.updateEdges(system.influences, appearance, now);
  }

  private updateEdges(influences: readonly StoryInfluence[], appearance: Appearance, now: number) {
    this.vertexCount = 0;
    for (let index = 0; index < Math.min(MAX_EDGES, influences.length); index++) {
      const edge = influences[index]!;
      const source = storyCenter(edge.source, this.layout), target = storyCenter(edge.target, this.layout);
      const dx = target.x - source.x, dz = target.y - source.y, distance = Math.hypot(dx, dz);
      if (distance < 1) continue;
      const ux = dx / distance, uz = dz / distance;
      const offset = Math.min(this.layout.iconSize * .48, distance * .28);
      const sx = source.x + ux * offset - this.layout.width / 2, sz = source.y + uz * offset - this.layout.height / 2;
      const ex = target.x - ux * offset - this.layout.width / 2, ez = target.y - uz * offset - this.layout.height / 2;
      const bend = Math.min(18, distance * .16) * ((edge.source * 17 + edge.target * 13) % 2 === 0 ? 1 : -1);
      const cx = (sx + ex) / 2 - uz * bend, cz = (sz + ez) / 2 + ux * bend;
      const age = Math.max(0, Math.min(1, (now - edge.createdAt) / 1200));
      const fade = envelope(age, appearance.directed ? DIRECTED_FADE : LINE_FADE);
      if (fade <= 0) continue;
      const fromPalette = paletteAt(edge.source, appearance), toPalette = paletteAt(edge.target, appearance);
      this.c0.set(appearance.surface === "tech" ? fromPalette.edgeMiddle : fromPalette.edgeStart);
      this.c1.set(toPalette.edgeMiddle);
      this.c2.set(appearance.surface === "tech" ? toPalette.edgeMiddle : toPalette.edgeEnd);
      const dash = age < .16 ? 1 : age < .56 ? 1 - ease((age - .16) / .4) : age < .70 ? 0 : -ease((age - .70) / .3);
      const begin = appearance.directed ? Math.max(0, -dash) : 0;
      const end = appearance.directed ? Math.min(1, 1 - dash) : 1;
      for (let segment = 0; segment < SEGMENTS; segment++) {
        const t0 = Math.max(begin, segment / SEGMENTS), t1 = Math.min(end, (segment + 1) / SEGMENTS);
        if (t1 <= t0) continue;
        const m0 = 1 - t0, m1 = 1 - t1;
        const x0 = m0 * m0 * sx + 2 * m0 * t0 * cx + t0 * t0 * ex;
        const z0 = m0 * m0 * sz + 2 * m0 * t0 * cz + t0 * t0 * ez;
        const x1 = m1 * m1 * sx + 2 * m1 * t1 * cx + t1 * t1 * ex;
        const z1 = m1 * m1 * sz + 2 * m1 * t1 * cz + t1 * t1 * ez;
        const length = Math.max(.001, Math.hypot(x1 - x0, z1 - z0));
        const halfWidth = (appearance.directed ? 2.3 : 2.15) / 2;
        const ox = -(z1 - z0) / length * halfWidth, oz = (x1 - x0) / length * halfWidth;
        this.edgeVertex(x0 + ox, z0 + oz, t0, fade); this.edgeVertex(x0 - ox, z0 - oz, t0, fade); this.edgeVertex(x1 + ox, z1 + oz, t1, fade);
        this.edgeVertex(x0 - ox, z0 - oz, t0, fade); this.edgeVertex(x1 - ox, z1 - oz, t1, fade); this.edgeVertex(x1 + ox, z1 + oz, t1, fade);
      }
      if (appearance.directed) {
        const arrow = envelope(age, ARROW_FADE);
        const length = Math.max(.001, Math.hypot(ex - cx, ez - cz));
        const tx = (ex - cx) / length, tz = (ez - cz) / length;
        this.c0.copy(this.c1); this.c2.copy(this.c1);
        this.edgeVertex(ex + tx, ez + tz, 1, arrow);
        this.edgeVertex(ex - tx * 7 - tz * 4, ez - tz * 7 + tx * 4, 1, arrow);
        this.edgeVertex(ex - tx * 7 + tz * 4, ez - tz * 7 - tx * 4, 1, arrow);
      }
    }
    this.edgeGeometry.setDrawRange(0, this.vertexCount);
    this.positions.clearUpdateRanges(); this.colors.clearUpdateRanges();
    if (this.vertexCount) {
      this.positions.addUpdateRange(0, this.vertexCount * 3);
      this.colors.addUpdateRange(0, this.vertexCount * 4);
      this.positions.needsUpdate = this.colors.needsUpdate = true;
    }
  }

  private edgeVertex(x: number, z: number, t: number, alpha: number) {
    this.mixed.copy(t < .62 ? this.c0 : this.c1).lerp(t < .62 ? this.c1 : this.c2, t < .62 ? t / .62 : (t - .62) / .38);
    const gradientAlpha = t < .62 ? .16 + .60 * t / .62 : .76 + .24 * (t - .62) / .38;
    this.positions.setXYZ(this.vertexCount, x, .005, z);
    this.colors.setXYZW(this.vertexCount, this.mixed.r, this.mixed.g, this.mixed.b, alpha * gradientAlpha);
    this.vertexCount++;
  }

  private drawGlyphs(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    const diameter = TILE * (1 - 4 * RING_PADDING);
    techKeywords.forEach((keyword, index) => {
      const x = index % COLUMNS * TILE + TILE / 2, y = Math.floor(index / COLUMNS) * TILE + TILE / 2;
      ctx.fillStyle = "#0c1115"; ctx.beginPath(); ctx.arc(x, y, TILE * (.5 - RING_PADDING), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#242a2f"; ctx.beginPath(); ctx.arc(x, y, diameter / 2, 0, Math.PI * 2); ctx.fill();
      ctx.font = `600 ${diameter * .66 * (keyword.abbreviation.length === 3 ? .47 : .56)}px "SFMono-Regular", Consolas, "Liberation Mono", monospace`;
      ctx.letterSpacing = `${diameter * .66 * (keyword.abbreviation.length === 3 ? -.042 : -.03)}px`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(12,17,21,.28)"; ctx.lineWidth = diameter * .66 * .0135;
      ctx.strokeText(keyword.abbreviation, x, y);
      ctx.fillStyle = "rgba(237,239,240,.86)"; ctx.fillText(keyword.abbreviation, x, y);
    });
  }

  private drawLabels() {
    const ctx = this.labelCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, this.labelCanvas.width, this.labelCanvas.height);
    const size = this.layout.iconSize, fontSize = Math.min(12, Math.max(7, size * .19));
    techKeywords.forEach((keyword, index) => {
      ctx.save(); ctx.translate(index % COLUMNS * TILE, Math.floor(index / COLUMNS) * TILE);
      ctx.beginPath(); ctx.rect(0, 0, TILE, TILE); ctx.clip(); ctx.scale(TILE / size, TILE / 28);
      ctx.font = `400 ${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif`;
      ctx.letterSpacing = `${-fontSize * .035}px`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#f4f4f5";
      let line = "", lineIndex = 0;
      for (const word of keyword.text.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > size && line) {
          ctx.fillText(line, size / 2, 4 + (lineIndex++ + .5) * fontSize * 1.14); line = word;
        } else line = next;
        while (ctx.measureText(line).width > size && line.length > 1) {
          let n = line.length - 1;
          while (n > 1 && ctx.measureText(line.slice(0, n)).width > size) n--;
          ctx.fillText(line.slice(0, n), size / 2, 4 + (lineIndex++ + .5) * fontSize * 1.14); line = line.slice(n);
        }
      }
      ctx.fillText(line, size / 2, 4 + (lineIndex + .5) * fontSize * 1.14); ctx.restore();
    });
    this.labelTexture.needsUpdate = true;
  }

  dispose() {
    this.glyphTexture.dispose(); this.ringTexture.dispose(); this.labelTexture.dispose();
    for (const mesh of [this.ring, this.face, this.labels]) {
      mesh.dispose(); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
    }
    this.edgeGeometry.dispose(); this.edgeMaterial.dispose(); this.group.clear();
  }
}
