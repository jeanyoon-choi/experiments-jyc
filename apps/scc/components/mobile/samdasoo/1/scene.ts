import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Units are centimetres: a 500 mL bottle, 6.6 cm across and 21.6 cm to the cap.
const BODY_R = 3.3;
const PANEL_R = 3.25;
const NECK_R = 1.36;
const SHOULDER_Y0 = 14.2;
const SHOULDER_Y1 = 18.6;
const PANEL_Y0 = 5.35;
const PANEL_Y1 = 10.85;
const FILL_Y = 16.2;
const TOP_Y = 21.62;
const GROOVES = [2.3, 3.1, 3.9, 4.7, 11.7, 12.5, 13.3];

const MAX_DPR = 2;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function bodyRadius(y: number) {
  if (y >= SHOULDER_Y0) {
    const t = Math.min(1, (y - SHOULDER_Y0) / (SHOULDER_Y1 - SHOULDER_Y0));
    return NECK_R + (BODY_R - NECK_R) * Math.pow(Math.cos((t * Math.PI) / 2), 1.6);
  }
  const panel = smooth(PANEL_Y0 - 0.35, PANEL_Y0, y) * (1 - smooth(PANEL_Y1, PANEL_Y1 + 0.35, y));
  let r = BODY_R - (BODY_R - PANEL_R) * panel;
  for (const c of GROOVES) r -= 0.16 * Math.exp(-(((y - c) / 0.13) ** 2));
  return r;
}

// Outer profile, base centre to the lip under the cap.
function bottleProfile() {
  const pts: THREE.Vector2[] = [];
  const base: [number, number][] = [
    [0, 0.55], [0.5, 0.53], [1.0, 0.45], [1.5, 0.28], [1.95, 0.08], [2.3, 0.0],
    [2.7, 0.04], [3.0, 0.2], [3.2, 0.5], [3.28, 0.8],
  ];
  for (const [r, y] of base) pts.push(new THREE.Vector2(r, y));
  for (let y = 1.0; y < SHOULDER_Y1; y += 0.035) pts.push(new THREE.Vector2(bodyRadius(y), y));
  const neck: [number, number][] = [
    [NECK_R, 18.6], [NECK_R, 19.28], [1.5, 19.32], [1.58, 19.38], [1.58, 19.44], [1.5, 19.47],
    [1.33, 19.46], [1.33, 21.25], [1.25, 21.32], [1.1, 21.32],
  ];
  for (const [r, y] of neck) pts.push(new THREE.Vector2(r, y));
  return pts;
}

// Petaloid base: five feet, the valleys between them pulled up and in.
function shapeFeet(geometry: THREE.BufferGeometry) {
  const p = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    if (y > 1.6) continue;
    const r = Math.hypot(x, z);
    const theta = Math.atan2(x, z);
    const valley = 0.5 - 0.5 * Math.cos(5 * theta);
    const w = Math.pow(1 - y / 1.6, 1.2) * smooth(0.7, 1.9, r);
    const nr = r * (1 - 0.13 * valley * w);
    const ny = y + 0.42 * valley * w;
    const s = r > 1e-6 ? nr / r : 0;
    p.setXYZ(i, x * s, ny, z * s);
  }
}

function smoothLathe(points: THREE.Vector2[], segments: number, displace?: (g: THREE.BufferGeometry) => void) {
  let g: THREE.BufferGeometry = new THREE.LatheGeometry(points, segments);
  displace?.(g);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g;
}

function capGeometry() {
  const pts: [number, number][] = [
    [1.36, 19.46], [1.54, 19.46], [1.565, 19.5], [1.565, 19.7], [1.535, 19.74], [1.535, 19.77], [1.565, 19.81], [1.565, 19.9], [1.565, 21.3], [1.55, 21.48],
    [1.48, 21.58], [1.3, TOP_Y], [0.6, TOP_Y + 0.01], [0, TOP_Y + 0.01],
  ];
  const vectors: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i];
    const [r1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(r1 - r0, y1 - y0) / 0.05));
    for (let k = 0; k < n; k++) vectors.push(new THREE.Vector2(r0 + ((r1 - r0) * k) / n, y0 + ((y1 - y0) * k) / n));
  }
  vectors.push(new THREE.Vector2(0, TOP_Y + 0.01));
  return smoothLathe(vectors, 480, (g) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 1.5) continue;
      const theta = Math.atan2(x, z);
      const k = smooth(19.85, 19.95, y) * (1 - smooth(21.2, 21.3, y));
      const ridge = Math.pow(0.5 + 0.5 * Math.cos(96 * theta), 0.6) - 0.6;
      const s = (r + 0.045 * ridge * k) / r;
      p.setX(i, x * s);
      p.setZ(i, z * s);
    }
  });
}

function waterGeometry() {
  const pts: THREE.Vector2[] = [];
  for (const v of bottleProfile()) {
    if (v.y > FILL_Y) break;
    pts.push(new THREE.Vector2(Math.max(0, v.x - 0.045), v.y + (v.y < 1 ? 0.04 : 0)));
  }
  pts.push(new THREE.Vector2(bodyRadius(FILL_Y) - 0.045, FILL_Y));
  return smoothLathe(pts, 128, shapeFeet);
}

// Flat, light-independent shading: every surface is a function of its view
// angle alone, so the bottle reads as drawn form rather than a lit render.
const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

function flatMaterial(fragment: string, uniforms: Record<string, THREE.IUniform>, transparent: boolean, side: THREE.Side = THREE.FrontSide) {
  return new THREE.ShaderMaterial({
    transparent,
    depthWrite: !transparent,
    side,
    uniforms,
    vertexShader: VERT,
    fragmentShader: `
      varying vec3 vN; varying vec3 vV;
      ${fragment}`,
  });
}

// Water: pale at the facing centre, deeper toward the turning edge, one soft band of light.
const waterMaterial = () => flatMaterial(/* glsl */ `
  uniform vec3 shallow; uniform vec3 deep;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float f = 1.0 - abs(dot(n, normalize(vV)));
    vec3 col = mix(shallow, deep, smoothstep(0.05, 0.95, f));
    float a = 0.22 + 0.62 * pow(f, 1.5);
    float band = smoothstep(0.9, 0.985, dot(n, normalize(vec3(-0.5, 0.12, 0.86))));
    col = mix(col, vec3(1.0), band * 0.85);
    gl_FragColor = vec4(col, max(a, band * 0.75));
    #include <colorspace_fragment>
  }`, { shallow: { value: new THREE.Color("#d8edf5") }, deep: { value: new THREE.Color("#4f9cc6") } }, true);

// PET: only its turning edges, so grooves, shoulder and neck draw as lines.
const shellMaterial = () => flatMaterial(/* glsl */ `
  uniform vec3 ink;
  void main() {
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    gl_FragColor = vec4(ink, 0.025 + 0.6 * pow(f, 2.2));
    #include <colorspace_fragment>
  }`, { ink: { value: new THREE.Color("#5d7a8c") } }, true);

// Cap: one flat blue, stepped by a single fixed direction.
const capMaterial = () => flatMaterial(/* glsl */ `
  uniform vec3 base;
  void main() {
    vec3 n = normalize(vN);
    float l = 0.7 + 0.3 * max(dot(n, normalize(vec3(-0.45, 0.6, 0.66))), 0.0);
    float f = 1.0 - abs(dot(n, normalize(vV)));
    gl_FragColor = vec4(base * l * (1.0 - 0.22 * f * f), 1.0);
    #include <colorspace_fragment>
  }`, { base: { value: new THREE.Color("#2f8fd0") } }, false, THREE.DoubleSide);

function blobTexture(stops: [number, string][]) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createSamdasoo(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eef1f2");

  const camera = new THREE.PerspectiveCamera(28, 1, 1, 400);
  const target = new THREE.Vector3(0, 10.4, 0);

  const bottle = new THREE.Group();
  scene.add(bottle);
  const disposables: { dispose(): void }[] = [];

  const waterSide = waterGeometry();
  const waterTop = new THREE.CircleGeometry(bodyRadius(FILL_Y) - 0.045, 128);
  waterTop.rotateX(-Math.PI / 2);
  waterTop.translate(0, FILL_Y, 0);
  const waterMat = waterMaterial();
  const shell = smoothLathe(bottleProfile(), 144, shapeFeet);
  const shellMat = shellMaterial();
  const capMat = capMaterial();
  const cap = capGeometry();
  const water = new THREE.Mesh(waterSide, waterMat);
  const surface = new THREE.Mesh(waterTop, waterMat);
  const pet = new THREE.Mesh(shell, shellMat);
  water.renderOrder = 1;
  surface.renderOrder = 1;
  pet.renderOrder = 2;
  bottle.add(water, surface, pet, new THREE.Mesh(cap, capMat));

  // A single soft contact shadow.
  const shadowTex = blobTexture([[0, "rgba(40,60,75,0.28)"], [0.45, "rgba(40,60,75,0.12)"], [1, "rgba(40,60,75,0)"]]);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(9, 9, 1);
  shadow.position.y = 0.01;
  scene.add(shadow);
  disposables.push(shadowTex, shadowMat, shadow.geometry, waterSide, waterTop, shell, cap, waterMat, shellMat, capMat);

  // The bottle turns slowly; a drag turns it by hand.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = Math.PI * 0.3;
  controls.maxPolarAngle = Math.PI * 0.56;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.7;
  let resume = 0;
  const onStart = () => {
    controls.autoRotate = false;
    window.clearTimeout(resume);
  };
  const onEnd = () => {
    resume = window.setTimeout(() => (controls.autoRotate = true), 2500);
  };
  controls.addEventListener("start", onStart);
  controls.addEventListener("end", onEnd);

  const elevation = 0.12;
  const fit = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(13.2 / tanV, 7.4 / (tanV * camera.aspect));
    camera.updateProjectionMatrix();
    controls.minDistance = dist * 0.55;
    controls.maxDistance = dist * 1.6;
    const dir = camera.position.clone().sub(target);
    if (dir.lengthSq() < 1e-6) dir.set(0, Math.sin(elevation), Math.cos(elevation));
    camera.position.copy(target).addScaledVector(dir.normalize(), dist);
    controls.update();
  };
  const observer = new ResizeObserver(fit);
  observer.observe(host);
  fit();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      window.clearTimeout(resume);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
