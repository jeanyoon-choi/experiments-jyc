import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { snsActions, type SnsActionColour } from "../model/sns-actions";
import contours from "../model/sns-action-contours.json";

const SIZE = 256;
const FIELD_SIZE = 96;
const FRAME_MS = 1000 / 24;

type Entry = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  index: number;
  colour: SnsActionColour;
  active: boolean;
  visible: boolean;
  inspect: boolean;
};

/** Extrude the four action glyphs traced directly from the source image. */
function sourceGlyph(index: number) {
  const paths = contours[index]!;
  const solids = paths.filter((path) => !path.hole).map((path) => {
    const shape = new THREE.Shape(path.points.map(([x, y]) => new THREE.Vector2(x, y)));
    return { shape, points: path.points };
  });
  // The like heart alone is solid; the other source glyphs retain their openings.
  for (const hole of paths.filter((path) => path.hole && index !== 0)) {
    const [x, y] = hole.points[0]!;
    const owner = solids.find(({ points }) => {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i]!;
        const [xj, yj] = points[j]!;
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    });
    owner?.shape.holes.push(new THREE.Path(hole.points.map(([px, py]) => new THREE.Vector2(px, py))));
  }
  return solids.map(({ shape }) => {
    const heart = index === 0;
    const depth = heart ? 0.18 : 0.25;
    const extrusion = new THREE.ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: heart ? 0.25 : 0.07,
      bevelSize: heart ? 0.14 : 0.04,
      bevelSegments: 10,
      curveSegments: 1,
    });
    extrusion.translate(0, 0, -depth / 2);
    extrusion.deleteAttribute("normal");
    extrusion.deleteAttribute("uv");
    const geometry = mergeVertices(extrusion);
    geometry.computeVertexNormals();
    extrusion.dispose();
    return geometry;
  });
}

function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext("2d")!;
  const bands = context.createLinearGradient(0, 0, canvas.width, 0);
  [
    [0, "#626971"], [0.18, "#7b838a"], [0.29, "#e7edef"],
    [0.51, "#f6f8f9"], [0.63, "#aeb6bb"], [0.82, "#6d757c"],
    [1, "#626971"],
  ].forEach(([stop, colour]) => bands.addColorStop(Number(stop), String(colour)));
  context.fillStyle = bands;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(texture);
  pmrem.dispose(); texture.dispose();
  return environment;
}

function iconForms(material: THREE.Material) {
  return snsActions.map((_, index) => {
    const group = new THREE.Group();
    sourceGlyph(index).forEach((geometry) => group.add(new THREE.Mesh(geometry, material)));
    return group;
  });
}

export class SnsIcons3DRenderer {
  private readonly renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  private readonly environment: THREE.WebGLRenderTarget;
  private readonly materials = [
    new THREE.MeshPhysicalMaterial({ color: "#e5e7e9", roughness: 0.2, metalness: 0.76, envMapIntensity: 1.1 }),
    ...snsActions.map(({ colour }) => new THREE.MeshPhysicalMaterial({ color: colour, roughness: 0.24, metalness: 0.56, envMapIntensity: 0.8, emissive: colour, emissiveIntensity: 0.08 })),
  ];
  private readonly forms = iconForms(this.materials[0]!);
  private readonly entries = new Map<HTMLCanvasElement, Entry>();
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private timer: number | undefined;
  private lastFrame = 0;
  private dirty = true;
  private disposed = false;
  private failed = false;
  private inspectPose = { x: 0, y: 0.08 };

  constructor() {
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(SIZE, SIZE, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.camera.position.set(0, 0, 3.9);
    this.environment = studioEnvironment(this.renderer);
    this.scene.environment = this.environment.texture;
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#414950", 0.48));
    const key = new THREE.DirectionalLight("#ffffff", 0.72);
    key.position.set(-3, 4, 5); this.scene.add(key);
    this.forms.forEach((form) => { form.visible = false; this.scene.add(form); });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.addEventListener("change", this.invalidate);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
  }

  private onVisibility = () => {
    window.clearTimeout(this.timer); this.timer = undefined;
    if (!document.hidden) this.invalidate();
  };
  private onContextLost = (event: Event) => {
    event.preventDefault(); this.failed = true;
    window.clearTimeout(this.timer); this.timer = undefined;
    this.entries.forEach(({ canvas }) => { this.showCanvas(canvas, false); canvas.dataset.icons3dStatus = "fallback"; });
  };
  private showCanvas(canvas: HTMLCanvasElement, ready: boolean) {
    canvas.style.visibility = ready ? "visible" : "hidden";
    const sourceIcon = canvas.previousElementSibling;
    if (sourceIcon instanceof SVGElement) sourceIcon.style.visibility = ready ? "hidden" : "visible";
  }
  private invalidate = () => { this.dirty = true; this.schedule(); };
  private schedule() {
    if (this.timer !== undefined || this.disposed || this.failed || document.hidden) return;
    this.timer = window.setTimeout(this.frame, Math.max(0, this.lastFrame + FRAME_MS - performance.now()));
  }

  private renderForm(index: number, colour: SnsActionColour, inspect: boolean) {
    const form = this.forms[index]!;
    const material = this.materials[colour === "colour" ? index + 1 : 0]!;
    form.traverse((part) => { if (part instanceof THREE.Mesh) part.material = material; });
    form.rotation.set(
      inspect ? this.inspectPose.x : 0,
      inspect ? this.inspectPose.y : 0.08,
      0,
    );
    form.visible = true;
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    form.visible = false;
  }

  private frame = () => {
    const now = performance.now();
    this.lastFrame = now; this.timer = undefined;
    if (this.disposed || this.failed || document.hidden) return;
    const visible = [...this.entries.values()].filter((entry) => entry.visible);
    if (!this.dirty) return;
    const field = visible.filter((entry) => !entry.inspect && (entry.active || entry.canvas.dataset.icons3dStatus !== "ready"));
    for (let index = 0; index < snsActions.length; index++) {
      for (const colour of ["monochrome", "colour"] as const) {
        const recipients = field.filter((entry) => entry.index === index && entry.colour === colour);
        if (!recipients.length) continue;
        this.renderForm(index, colour, false);
        recipients.forEach(({ canvas, context }) => {
          context.clearRect(0, 0, FIELD_SIZE, FIELD_SIZE);
          context.drawImage(this.renderer.domElement, 0, 0, SIZE, SIZE, 0, 0, FIELD_SIZE, FIELD_SIZE);
          this.showCanvas(canvas, true);
          canvas.dataset.icons3dStatus = "ready";
        });
      }
    }
    const inspector = visible.find((entry) => entry.inspect);
    if (inspector) {
      this.renderForm(inspector.index, inspector.colour, true);
      inspector.context.clearRect(0, 0, SIZE, SIZE);
      inspector.context.drawImage(this.renderer.domElement, 0, 0);
      this.showCanvas(inspector.canvas, true);
      inspector.canvas.dataset.icons3dStatus = "ready";
    }
    this.dirty = false;
  };

  attach(canvas: HTMLCanvasElement, index: number, colour: SnsActionColour, active: boolean, visible: boolean, inspect = false) {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) { canvas.dataset.icons3dStatus = "fallback"; return; }
    canvas.width = inspect ? SIZE : FIELD_SIZE;
    canvas.height = canvas.width;
    this.entries.set(canvas, { canvas, context, index: ((index % snsActions.length) + snsActions.length) % snsActions.length, colour, active, visible, inspect });
    this.invalidate();
  }

  update(canvas: HTMLCanvasElement, colour: SnsActionColour, active: boolean, visible: boolean) {
    const entry = this.entries.get(canvas);
    if (!entry) return;
    if (entry.colour !== colour) canvas.dataset.icons3dStatus = "loading";
    entry.colour = colour; entry.active = active; entry.visible = visible;
    this.invalidate();
  }

  turn(canvas: HTMLCanvasElement, yaw: number, pitch: number) {
    if (!this.entries.get(canvas)?.inspect) return;
    this.inspectPose.y += yaw;
    this.inspectPose.x = THREE.MathUtils.clamp(this.inspectPose.x + pitch, -0.9, 0.9);
    this.invalidate();
  }

  detach(canvas: HTMLCanvasElement) { this.showCanvas(canvas, false); this.entries.delete(canvas); this.invalidate(); }

  dispose() {
    this.disposed = true; window.clearTimeout(this.timer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.reducedMotion.removeEventListener("change", this.invalidate);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    const geometries = new Set<THREE.BufferGeometry>();
    this.forms.forEach((form) => form.traverse((part) => { if (part instanceof THREE.Mesh) geometries.add(part.geometry); }));
    geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.environment.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.entries.clear();
  }
}
