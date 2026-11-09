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
// Inside of the PET: the water's own volume, from the base dome to the mouth.
const INNER_BOTTOM = 0.6;
const INNER_TOP = 21.25;
const NECK_IN = 1.22;
const CAP_Y = 20.5;
const G = 980;

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
  return capLathe().translate(0, -CAP_Y, 0);
}

function capLathe() {
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

function innerRadius(y: number) {
  if (y < INNER_BOTTOM || y > INNER_TOP) return 0;
  return y < SHOULDER_Y1 ? Math.max(NECK_IN, bodyRadius(y) - 0.045) : NECK_IN;
}

// The whole inside as one water volume; the shader keeps only what lies
// below the current level, so the surface stays level however the bottle turns.
function waterGeometry() {
  const pts: THREE.Vector2[] = [];
  for (const v of bottleProfile()) {
    if (v.y >= SHOULDER_Y1) break;
    pts.push(new THREE.Vector2(Math.max(0, v.x - 0.045), v.y + (v.y < 1 ? 0.04 : 0)));
  }
  pts.push(new THREE.Vector2(NECK_IN, SHOULDER_Y1 + 0.1), new THREE.Vector2(NECK_IN, INNER_TOP), new THREE.Vector2(0, INNER_TOP));
  return smoothLathe(pts, 128, shapeFeet);
}

// Equal-volume sample points of the inside, for finding the level that holds a given volume.
function volumeSamples() {
  const DY = 0.2;
  const RINGS = 4;
  const SPOKES = 12;
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const ws: number[] = [];
  for (let y = INNER_BOTTOM + DY / 2; y < INNER_TOP; y += DY) {
    const R = innerRadius(y);
    const w = (Math.PI * R * R * DY) / (RINGS * SPOKES);
    for (let i = 0; i < RINGS; i++) {
      const r = R * Math.sqrt((i + 0.5) / RINGS);
      for (let j = 0; j < SPOKES; j++) {
        const a = ((j + (i % 2) * 0.5) / SPOKES) * Math.PI * 2;
        xs.push(r * Math.sin(a));
        ys.push(y);
        zs.push(r * Math.cos(a));
        ws.push(w);
      }
    }
  }
  return { x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), w: Float32Array.from(ws) };
}

// Flat, light-independent shading: every surface is a function of its view
// angle alone, so the bottle reads as drawn form rather than a lit render.
const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 nn = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      nn = mat3(instanceMatrix) * nn;
    #endif
    vec4 w = modelMatrix * p;
    vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vN = normalize(normalMatrix * nn);
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
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      ${fragment}`,
  });
}

// Water: pale at the facing centre, deeper toward the turning edge, one soft band of light.
const waterMaterial = (side: THREE.Side = THREE.FrontSide, body = 0) => flatMaterial(/* glsl */ `
  uniform vec3 shallow; uniform vec3 deep; uniform float level; uniform float body;
  void main() {
    if (vW.y > level) discard;
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float f = 1.0 - abs(dot(n, normalize(vV)));
    vec3 col = mix(shallow, deep, smoothstep(0.05, 0.95, f));
    float a = mix(0.22 + 0.62 * pow(f, 1.5), 0.62 + 0.3 * f, body);
    float band = smoothstep(0.9, 0.985, dot(n, normalize(vec3(-0.5, 0.12, 0.86))));
    col = mix(col, vec3(1.0), band * 0.85);
    gl_FragColor = vec4(col, max(a, band * 0.75));
    #include <colorspace_fragment>
  }`, { shallow: { value: new THREE.Color("#d8edf5") }, deep: { value: new THREE.Color("#4f9cc6") }, level: { value: 1e9 }, body: { value: body } }, true, side);

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

  // The bottle hangs from a pivot at its middle so a phone tilt turns it in place.
  const pivot = new THREE.Group();
  pivot.position.copy(target);
  scene.add(pivot);
  const bottle = new THREE.Group();
  bottle.position.y = -target.y;
  pivot.add(bottle);
  const disposables: { dispose(): void }[] = [];

  const waterSide = waterGeometry();
  const waterMat = waterMaterial();
  const shell = smoothLathe(bottleProfile(), 144, shapeFeet);
  const shellMat = shellMaterial();
  const capMat = capMaterial();
  const cap = capGeometry();
  const water = new THREE.Mesh(waterSide, waterMat);
  const pet = new THREE.Mesh(shell, shellMat);
  const capMesh = new THREE.Mesh(cap, capMat);
  capMesh.position.y = CAP_Y;
  water.renderOrder = 1;
  pet.renderOrder = 2;
  bottle.add(water, pet, capMesh);

  // The water surface: the level plane cut to the inside, rebuilt each frame in world space.
  const RIM = 72;
  const surfacePos = new Float32Array((RIM + 1) * 3);
  const surfaceNrm = new Float32Array((RIM + 1) * 3);
  for (let i = 0; i <= RIM; i++) surfaceNrm[i * 3 + 1] = 1;
  const surfaceIdx: number[] = [];
  for (let i = 0; i < RIM; i++) surfaceIdx.push(0, 1 + i, 1 + ((i + 1) % RIM));
  const surfaceGeo = new THREE.BufferGeometry();
  surfaceGeo.setIndex(surfaceIdx);
  surfaceGeo.setAttribute("position", new THREE.BufferAttribute(surfacePos, 3));
  surfaceGeo.setAttribute("normal", new THREE.BufferAttribute(surfaceNrm, 3));
  const surfaceMat = waterMaterial(THREE.DoubleSide);
  const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
  surface.frustumCulled = false;
  surface.renderOrder = 1;
  scene.add(surface);

  // Poured water: one tube through the stream's points in the order they left
  // the mouth, each flying on its own arc and thinning as it speeds up.
  const POINTS = 256;
  const SIDES = 12;
  const streamPos = new Float32Array(POINTS * SIDES * 3);
  const streamNrm = new Float32Array(POINTS * SIDES * 3);
  const streamIdx = new Uint16Array((POINTS - 1) * SIDES * 6);
  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setIndex(new THREE.BufferAttribute(streamIdx, 1));
  streamGeo.setAttribute("position", new THREE.BufferAttribute(streamPos, 3));
  streamGeo.setAttribute("normal", new THREE.BufferAttribute(streamNrm, 3));
  streamGeo.setDrawRange(0, 0);
  const streamMat = waterMaterial(THREE.DoubleSide, 1);
  streamMat.transparent = false;
  streamMat.depthWrite = true;
  const stream = new THREE.Mesh(streamGeo, streamMat);
  stream.frustumCulled = false;
  stream.renderOrder = 1;
  scene.add(stream);
  const ptP = new Float32Array(POINTS * 3);
  const ptV = new Float32Array(POINTS * 3);
  const ptR = new Float32Array(POINTS);
  const ptS = new Float32Array(POINTS);
  const ptRun = new Uint32Array(POINTS);
  let ptN = 0;
  let run = 0;
  let pouring = false;

  // A single soft contact shadow.
  const shadowTex = blobTexture([[0, "rgba(40,60,75,0.28)"], [0.45, "rgba(40,60,75,0.12)"], [1, "rgba(40,60,75,0)"]]);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(9, 9, 1);
  shadow.position.y = 0.01;
  scene.add(shadow);
  disposables.push(shadowTex, shadowMat, shadow.geometry, waterSide, shell, cap, waterMat, shellMat, capMat, surfaceGeo, surfaceMat, streamGeo, streamMat);

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

  // Phone attitude: the turn since the tap, in screen axes, is given to the
  // bottle in view axes, so it turns exactly as the phone does.
  const euler = new THREE.Euler();
  const zee = new THREE.Vector3(0, 0, 1);
  const screenTurn = new THREE.Quaternion();
  const device = new THREE.Quaternion();
  const baseInv = new THREE.Quaternion();
  const relative = new THREE.Quaternion();
  const goal = new THREE.Quaternion();
  let motion = false;
  let haveBase = false;
  let haveSample = false;
  const deg = THREE.MathUtils.DEG2RAD;
  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    euler.set(e.beta * deg, e.gamma * deg, e.alpha * deg, "ZXY");
    device.setFromEuler(euler);
    const angle = screen.orientation?.angle ?? 0;
    device.multiply(screenTurn.setFromAxisAngle(zee, -angle * deg));
    if (!haveBase) {
      baseInv.copy(device).invert();
      haveBase = true;
    }
    relative.copy(baseInv).multiply(device);
    haveSample = true;
  };
  const enableMotion = async () => {
    if (motion || !("DeviceOrientationEvent" in window)) return;
    const Orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    try {
      if (Orientation.requestPermission && (await Orientation.requestPermission()) !== "granted") return;
    } catch {
      return;
    }
    motion = true;
    haveBase = false;
    controls.autoRotate = false;
    window.clearTimeout(resume);
    window.addEventListener("deviceorientation", onOrientation);
  };
  // A tap (not a drag) on the bottle asks for the motion sensor.
  let downX = 0;
  let downY = 0;
  const onDown = (e: PointerEvent) => {
    downX = e.clientX;
    downY = e.clientY;
  };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const capScreen = new THREE.Vector3();
  const hitsCap = (x: number, y: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(capMesh).length) return true;
    capMesh.getWorldPosition(capScreen).project(camera);
    const sx = rect.left + ((capScreen.x + 1) / 2) * rect.width;
    const sy = rect.top + ((1 - capScreen.y) / 2) * rect.height;
    return Math.hypot(sx - x, sy - y) < 40;
  };
  const onClick = (e: MouseEvent) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) >= 8) return;
    if (capState === "on" && hitsCap(e.clientX, e.clientY)) {
      capState = "twist";
      capT = 0;
    }
    void enableMotion();
  };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("click", onClick);

  // Water: a fixed volume (cm³) whose level is found from the bottle's turn.
  const samples = volumeSamples();
  const SAMPLES = samples.w.length;
  let volume = 0;
  for (let i = 0; i < SAMPLES; i++) if (samples.y[i] < FILL_Y) volume += samples.w[i];
  const proj = new Float32Array(SAMPLES);
  const up = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const qW = new THREE.Quaternion();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const inside = (p: THREE.Vector3) => innerRadius(p.y) > Math.hypot(p.x, p.z);
  const solveLevel = () => {
    for (let i = 0; i < SAMPLES; i++) proj[i] = samples.x[i] * up.x + samples.y[i] * up.y + samples.z[i] * up.z;
    let lo = -25;
    let hi = 25;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      let v = 0;
      for (let i = 0; i < SAMPLES; i++) if (proj[i] < mid) v += samples.w[i];
      if (v < volume) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  // Cut the level plane (local: p·up = t) to the inside, as a fan from a point well inside it.
  const buildSurface = (t: number) => {
    let best = 0;
    for (let s = INNER_BOTTOM + 0.1; s < INNER_TOP; s += 0.3) {
      probe.set(0, s, 0).addScaledVector(up, t - s * up.y);
      const m = innerRadius(probe.y) - Math.hypot(probe.x, probe.z);
      if (m > best) {
        best = m;
        centre.copy(probe);
      }
    }
    if (best < 0.05) return false;
    e1.set(1, 0, 0);
    if (Math.abs(up.x) > 0.9) e1.set(0, 0, 1);
    e1.addScaledVector(up, -e1.dot(up)).normalize();
    e2.crossVectors(up, e1);
    tmp.copy(centre).applyMatrix4(bottle.matrixWorld);
    surfacePos.set([tmp.x, tmp.y, tmp.z], 0);
    for (let i = 0; i < RIM; i++) {
      const a = (i / RIM) * Math.PI * 2;
      dir.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      let r = 0;
      while (r < 26 && inside(probe.copy(centre).addScaledVector(dir, r + 0.2))) r += 0.2;
      let lo = r;
      let hi = r + 0.2;
      for (let k = 0; k < 6; k++) {
        const mid = (lo + hi) / 2;
        if (inside(probe.copy(centre).addScaledVector(dir, mid))) lo = mid;
        else hi = mid;
      }
      tmp.copy(centre).addScaledVector(dir, lo).applyMatrix4(bottle.matrixWorld);
      surfacePos.set([tmp.x, tmp.y, tmp.z], (i + 1) * 3);
    }
    surfaceGeo.attributes.position.needsUpdate = true;
    return true;
  };

  // Cap: a tap unscrews it, then it springs off and falls away.
  let capState: "on" | "twist" | "off" = "on";
  let capT = 0;
  const capVel = new THREE.Vector3();
  const capSpin = new THREE.Vector3();
  const spinQ = new THREE.Quaternion();
  const spinE = new THREE.Euler();
  const camRight = new THREE.Vector3();
  const updateCap = (dt: number) => {
    if (capState === "twist") {
      capT = Math.min(1, capT + dt / 0.75);
      const k = capT * capT * (3 - 2 * capT);
      capMesh.rotation.y = k * Math.PI * 3;
      capMesh.position.y = CAP_Y + k * 0.7;
      if (capT >= 1) {
        scene.attach(capMesh);
        bottle.getWorldQuaternion(qW);
        axis.set(0, 1, 0).applyQuaternion(qW);
        camRight.setFromMatrixColumn(camera.matrixWorld, 0);
        capVel.copy(axis).multiplyScalar(70).addScaledVector(camRight, 22);
        capSpin.set(2 + Math.random() * 3, Math.random() * 4, 4 + Math.random() * 3);
        capState = "off";
      }
    } else if (capState === "off" && capMesh.visible) {
      capVel.y -= G * dt;
      capMesh.position.addScaledVector(capVel, dt);
      spinQ.setFromEuler(spinE.set(capSpin.x * dt, capSpin.y * dt, capSpin.z * dt));
      capMesh.quaternion.multiply(spinQ);
      if (capMesh.position.y < -80) capMesh.visible = false;
    }
  };

  const mouth = new THREE.Vector3();
  const low = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nA = new THREE.Vector3();
  const nB = new THREE.Vector3();
  const ref = new THREE.Vector3();
  const updateStream = (dt: number) => {
    let n = 0;
    for (let i = 0; i < ptN; i++) {
      const o = i * 3;
      ptV[o + 1] -= G * dt;
      ptP[o] += ptV[o] * dt;
      ptP[o + 1] += ptV[o + 1] * dt;
      ptP[o + 2] += ptV[o + 2] * dt;
      if (ptP[o + 1] < -80) continue;
      if (n !== i) {
        ptP.copyWithin(n * 3, o, o + 3);
        ptV.copyWithin(n * 3, o, o + 3);
        ptR[n] = ptR[i];
        ptS[n] = ptS[i];
        ptRun[n] = ptRun[i];
      }
      n++;
    }
    ptN = n;
    let quads = 0;
    for (let i = 0; i < ptN; i++) {
      const o = i * 3;
      const prev = i > 0 && ptRun[i - 1] === ptRun[i] ? i - 1 : i;
      const next = i + 1 < ptN && ptRun[i + 1] === ptRun[i] ? i + 1 : i;
      tan.set(ptP[next * 3] - ptP[prev * 3], ptP[next * 3 + 1] - ptP[prev * 3 + 1], ptP[next * 3 + 2] - ptP[prev * 3 + 2]);
      if (tan.lengthSq() < 1e-8) tan.set(ptV[o], ptV[o + 1], ptV[o + 2]);
      if (tan.lengthSq() < 1e-8) tan.set(0, -1, 0);
      tan.normalize();
      ref.set(1, 0, 0);
      if (Math.abs(tan.x) > 0.9) ref.set(0, 0, 1);
      nA.crossVectors(tan, ref).normalize();
      nB.crossVectors(tan, nA);
      // Continuity: the same flow through a faster section is thinner; the oldest end closes.
      const speed = Math.hypot(ptV[o], ptV[o + 1], ptV[o + 2]);
      let r = Math.max(0.1, ptR[i] * Math.sqrt(ptS[i] / Math.max(ptS[i], speed)));
      if (prev === i) r *= 0.35;
      for (let k = 0; k < SIDES; k++) {
        const a = (k / SIDES) * Math.PI * 2;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const v = (i * SIDES + k) * 3;
        const nx = nA.x * c + nB.x * sn;
        const ny = nA.y * c + nB.y * sn;
        const nz = nA.z * c + nB.z * sn;
        streamNrm[v] = nx;
        streamNrm[v + 1] = ny;
        streamNrm[v + 2] = nz;
        streamPos[v] = ptP[o] + nx * r;
        streamPos[v + 1] = ptP[o + 1] + ny * r;
        streamPos[v + 2] = ptP[o + 2] + nz * r;
      }
      if (next !== i) {
        for (let k = 0; k < SIDES; k++) {
          const a0 = i * SIDES + k;
          const a1 = i * SIDES + ((k + 1) % SIDES);
          const b0 = a0 + SIDES;
          const b1 = a1 + SIDES;
          streamIdx.set([a0, a1, b0, a1, b1, b0], quads * 6);
          quads++;
        }
      }
    }
    streamGeo.index!.needsUpdate = true;
    streamGeo.attributes.position.needsUpdate = true;
    streamGeo.attributes.normal.needsUpdate = true;
    streamGeo.setDrawRange(0, quads * 6);
  };
  const pour = (dt: number, levelY: number) => {
    const was = pouring;
    pouring = false;
    if (capState === "on" || volume <= 0) return;
    // Lowest point of the mouth's rim against the level.
    axis.set(0, 1, 0).applyQuaternion(qW);
    bottle.localToWorld(mouth.set(0, INNER_TOP, 0));
    low.set(0, -1, 0).addScaledVector(axis, axis.y);
    const lowLen = low.length();
    if (lowLen > 1e-4) low.multiplyScalar(1 / lowLen);
    const depth = levelY - (mouth.y - NECK_IN * lowLen);
    if (depth <= 0) return;
    const q = Math.min(140, 32 * Math.sqrt(depth));
    volume = Math.max(0, volume - q * dt);
    const share = Math.min(1, q / 140);
    const v0 = Math.max(12, Math.min(90, Math.sqrt(2 * G * depth) * 0.35));
    pouring = true;
    if (!was) run++;
    if (ptN >= POINTS) return;
    // One point per frame from the submerged part of the mouth.
    const w = NECK_IN * (1 - 0.55 * share);
    const o = ptN * 3;
    ptP[o] = mouth.x + low.x * w;
    ptP[o + 1] = mouth.y + low.y * w;
    ptP[o + 2] = mouth.z + low.z * w;
    ptV[o] = axis.x * v0;
    ptV[o + 1] = axis.y * v0;
    ptV[o + 2] = axis.z * v0;
    ptR[ptN] = Math.min(NECK_IN * 0.9, Math.max(0.15, Math.sqrt(q / (Math.PI * v0)) * 0.8));
    ptS[ptN] = v0;
    ptRun[ptN] = run;
    ptN++;
  };

  let last = performance.now();
  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    controls.update();
    if (motion) {
      controls.autoRotate = false;
      shadow.visible = false;
      if (haveSample) {
        goal.copy(camera.quaternion).multiply(relative).multiply(screenTurn.copy(camera.quaternion).invert());
        pivot.quaternion.slerp(goal, 0.35);
      }
    }
    pivot.updateMatrixWorld(true);
    updateCap(dt);
    bottle.getWorldQuaternion(qW);
    up.set(0, 1, 0).applyQuaternion(qW.clone().invert());
    let levelY = -1e9;
    if (volume > 0.5) {
      const t = solveLevel();
      levelY = bottle.localToWorld(tmp.copy(up).multiplyScalar(t)).y;
      surface.visible = buildSurface(t);
    } else surface.visible = false;
    waterMat.uniforms.level.value = levelY;
    surfaceMat.uniforms.level.value = levelY + 0.05;
    pour(dt, levelY);
    updateStream(dt);
    renderer.render(scene, camera);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      window.clearTimeout(resume);
      window.removeEventListener("deviceorientation", onOrientation);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("click", onClick);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
