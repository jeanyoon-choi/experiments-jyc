import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createHum } from "./audio";
import {
  BANKS, FLAT, H, HANDRAIL_SPEED, LIGHT_SAMPLES, LIGHT_X0, LIGHT_X1, LOOP, LX, MAT_KEYS, RUN, SPEED, STEP, STEPS, TAN, TR,
  buildBank, laneMatrix, stepGeometry, stepLight, type Lod, type MatKey,
} from "./build";
import {
  brushedTextures, concreteTexture, handrailTexture, plateTextures, rng, terrazzoTexture, treadTextures,
} from "./textures";

// World: a block of 3 × 3 cells (28 m) by eight storeys. Each cell holds three
// banks of escalators at their own heading and storey phase; concrete columns
// stand at the cell corners. The camera is only ever moved by the viewer.
const CELL = 28;
const BANK_Z = [-9.4, 0, 9.4];
const CELLS = 1;
const STOREYS = 8;
const NEAR_RADIUS = 22;
const STEP_RADIUS = 38;
const FOG = new THREE.Color(0x24231f);
// Resolution adapts to the device: start low, rise while frames keep the 30 Hz pace.
const MIN_DPR = 0.6;
const MAX_DPR = 1.5;
const START_DPR = 1;
const FRAME_MS = 1000 / 30;
const SLAB_DEPTH = 2;

const f = (v: number) => v.toFixed(6);

function buildEnvironment(renderer: THREE.WebGLRenderer) {
  const s = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    s.add(mesh);
    disposables.push(g, m);
    return mesh;
  };
  add(new THREE.BoxGeometry(70, 26, 70), new THREE.MeshBasicMaterial({ color: 0x2a2825, side: THREE.BackSide }), 0, 0, 0);
  add(new THREE.PlaneGeometry(70, 70).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x151412 }), 0, -12.9, 0);
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.93, 0.82).multiplyScalar(7) });
  disposables.push(lamp);
  for (let z = -30; z <= 30; z += 5) {
    for (const x of [-22, -8, 8, 22]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 3.4), lamp);
      m.position.set(x, 12.9, z);
      s.add(m);
      disposables.push(m.geometry);
    }
  }
  const dim = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.82, 0.9).multiplyScalar(1.6) });
  disposables.push(dim);
  for (let y = -6; y <= 6; y += 6) {
    for (const [x, z, ry] of [[0, -34.9, 0], [0, 34.9, 0], [-34.9, 0, Math.PI / 2], [34.9, 0, Math.PI / 2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(60, 0.08, 0.05), dim);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      s.add(m);
      disposables.push(m.geometry);
    }
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(s, 0.03);
  pmrem.dispose();
  for (const d of disposables) d.dispose();
  return rt;
}

// --- Scene ------------------------------------------------------------------

export function createEscalators(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const dprCap = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  let dpr = Math.min(START_DPR, dprCap);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = FOG;
  scene.fog = new THREE.FogExp2(FOG, 0.03);
  const env = buildEnvironment(renderer);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.85;
  const sun = new THREE.DirectionalLight(new THREE.Color(1, 0.95, 0.88), 0.7);
  sun.position.set(0.3, 1, 0.45);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 600);

  // Materials.
  const r = rng(20261102);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tread = treadTextures(r, aniso);
  const plate = plateTextures(r, aniso);
  const brushed = brushedTextures(r, aniso);
  for (const t of [brushed.map, brushed.roughnessMap]) t.repeat.set(1 / 1.2, 1 / 1.2);
  const concrete = concreteTexture(r, aniso);
  concrete.repeat.set(2, 1);
  const terrazzo = terrazzoTexture(r, aniso);
  const handrail = handrailTexture(r, aniso);
  handrail.repeat.set(0.5, 1);
  const textures = [
    tread.map, tread.normalMap, tread.ormMap, plate.map, plate.normalMap, plate.ormMap,
    brushed.map, brushed.roughnessMap, concrete, terrazzo, handrail,
  ];

  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fb8b0, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1,
    depthWrite: false, side: THREE.DoubleSide, vertexColors: true, envMapIntensity: 1.4,
  });
  glass.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `diffuseColor.a = mix(diffuseColor.a, 0.72, pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 4.0));
#include <opaque_fragment>`,
    );
  };
  const materials: Record<MatKey, THREE.Material> = {
    steel: new THREE.MeshStandardMaterial({
      map: brushed.map, roughnessMap: brushed.roughnessMap, metalness: 1, roughness: 1,
      side: THREE.DoubleSide, vertexColors: true,
    }),
    glass,
    rubber: new THREE.MeshStandardMaterial({ map: handrail, roughness: 0.34, metalness: 0, side: THREE.DoubleSide, vertexColors: true }),
    brush: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, side: THREE.DoubleSide, vertexColors: true }),
    plate: new THREE.MeshStandardMaterial({
      map: plate.map, normalMap: plate.normalMap, roughnessMap: plate.ormMap, metalnessMap: plate.ormMap,
      roughness: 1, metalness: 1, vertexColors: true, side: THREE.DoubleSide,
    }),
    terrazzo: new THREE.MeshStandardMaterial({ map: terrazzo, roughness: 0.2, metalness: 0, vertexColors: true }),
    concrete: new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.92, metalness: 0, vertexColors: true }),
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.9, 1).multiplyScalar(2.2), side: THREE.DoubleSide }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.94, 0.84).multiplyScalar(3.2) }),
  };

  // Steps: one instanced quad pair, positioned along the step line in the vertex shader.
  const stepUniforms = {
    uTime: { value: 0 },
    uLight: { value: stepLight() },
  };
  const stepMat = new THREE.MeshStandardMaterial({
    map: tread.map, normalMap: tread.normalMap, roughnessMap: tread.ormMap, metalnessMap: tread.ormMap,
    roughness: 1, metalness: 1,
  });
  stepMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = stepUniforms.uTime;
    shader.uniforms.uLight = stepUniforms.uLight;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec2 aStep;
uniform float uTime;
uniform float uLight[${LIGHT_SAMPLES}];
varying float vStepLight;
float rampU(float u) { if (u <= -${f(TR)}) return 0.0; if (u >= ${f(TR)}) return u; return (u + ${f(TR)}) * (u + ${f(TR)}) / ${f(4 * TR)}; }
float profileY(float x) { return ${f(TAN)} * (rampU(x - ${f(FLAT)}) - rampU(x - ${f(FLAT + RUN)})); }`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
float sx = mod(aStep.x * ${f(STEP)} + aStep.y * uTime * ${f(SPEED)}, ${f(LOOP)}) - 0.6;
transformed.x += sx;
transformed.y += profileY(sx) - 0.006;
float lf = clamp((sx - ${f(LIGHT_X0)}) / ${f(LIGHT_X1 - LIGHT_X0)}, 0.0, 1.0) * ${f(LIGHT_SAMPLES - 1)};
int li = int(floor(lf));
vStepLight = mix(uLight[li], uLight[min(li + 1, ${LIGHT_SAMPLES - 1})], fract(lf))
  * (0.93 + 0.14 * fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453));`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vStepLight;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= vec3(1.0, 0.985, 0.955) * vStepLight;");
  };

  // Layout.
  type Placement = { matrix: THREE.Matrix4; type: number; center: THREE.Vector3 };
  const placements: Placement[] = [];
  const lay = rng(7);
  for (let cx = -CELLS; cx <= CELLS; cx++) {
    for (let cz = -CELLS; cz <= CELLS; cz++) {
      const yaw = Math.floor(lay() * 4) * (Math.PI / 2);
      for (const bz of BANK_Z) {
        const type = lay() < 0.62 ? 0 : 1;
        const phase = (Math.floor(lay() * 8) / 8) * H;
        const base = new THREE.Matrix4()
          .makeTranslation(cx * CELL, phase, cz * CELL)
          .multiply(new THREE.Matrix4().makeRotationY(yaw))
          .multiply(new THREE.Matrix4().makeTranslation(-LX / 2, 0, bz));
        for (let k = 0; k < STOREYS; k++) {
          const matrix = new THREE.Matrix4().makeTranslation(0, k * H, 0).multiply(base);
          placements.push({ matrix, type, center: new THREE.Vector3(LX / 2, H / 2, 0).applyMatrix4(matrix) });
        }
      }
    }
  }
  const half = (CELLS + 0.5) * CELL;
  const bounds = new THREE.Box3(new THREE.Vector3(-half, -SLAB_DEPTH, -half), new THREE.Vector3(half, (STOREYS + 1) * H, half));
  const middle = bounds.getCenter(new THREE.Vector3());

  // Instanced meshes per bank type × detail × material, refilled by distance to the camera.
  const meshes: THREE.InstancedMesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const bins: { type: number; lod: Lod; list: THREE.InstancedMesh[] }[] = [];
  BANKS.forEach((type, ti) => {
    const capacity = placements.filter((p) => p.type === ti).length;
    for (const lod of ["near", "far"] as const) {
      const parts = buildBank(type, lod);
      const list: THREE.InstancedMesh[] = [];
      for (const key of MAT_KEYS) {
        const g = parts.get(key);
        if (!g) continue;
        geometries.push(g);
        const mesh = new THREE.InstancedMesh(g, materials[key], capacity);
        mesh.count = 0;
        mesh.frustumCulled = false;
        if (key === "glass") mesh.renderOrder = 2;
        list.push(mesh);
        meshes.push(mesh);
        scene.add(mesh);
      }
      bins.push({ type: ti, lod, list });
    }
  });

  let stepCapacity = 0;
  for (const p of placements) stepCapacity += BANKS[p.type].lanes.length * STEPS;
  const stepGeom = stepGeometry();
  const aStepAttr = new THREE.InstancedBufferAttribute(new Float32Array(stepCapacity * 2), 2);
  stepGeom.setAttribute("aStep", aStepAttr);
  geometries.push(stepGeom);
  const steps = new THREE.InstancedMesh(stepGeom, stepMat, stepCapacity);
  steps.count = 0;
  steps.frustumCulled = false;
  meshes.push(steps);
  scene.add(steps);

  const laneMatrices = placements.map((p) => BANKS[p.type].lanes.map((lane) => new THREE.Matrix4().multiplyMatrices(p.matrix, laneMatrix(lane))));
  const relayout = (eye: THREE.Vector3) => {
    for (const bin of bins) {
      let n = 0;
      placements.forEach((p) => {
        if (p.type !== bin.type) return;
        const near = p.center.distanceTo(eye) < NEAR_RADIUS;
        if (near !== (bin.lod === "near")) return;
        for (const mesh of bin.list) mesh.setMatrixAt(n, p.matrix);
        n++;
      });
      for (const mesh of bin.list) {
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    let si = 0;
    const aStep = aStepAttr.array as Float32Array;
    placements.forEach((p, pi) => {
      if (p.center.distanceTo(eye) > STEP_RADIUS) return;
      BANKS[p.type].lanes.forEach((lane, li) => {
        const m = laneMatrices[pi][li];
        for (let k = 0; k < STEPS; k++) {
          steps.setMatrixAt(si, m);
          aStep[si * 2] = k;
          aStep[si * 2 + 1] = lane.dir;
          si++;
        }
      });
    });
    steps.count = si;
    steps.instanceMatrix.needsUpdate = true;
    aStepAttr.needsUpdate = true;
  };

  const columnHeight = (STOREYS + 1) * H + SLAB_DEPTH;
  const columnGeom = new THREE.CylinderGeometry(0.75, 0.75, columnHeight, 28, 1, true);
  const cuv = columnGeom.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < cuv.count; i++) cuv.setXY(i, cuv.getX(i) * 2.4, cuv.getY(i) * columnHeight * 0.8);
  geometries.push(columnGeom);
  const columnMat = new THREE.MeshStandardMaterial({ map: concrete, color: 0x9a968f, roughness: 0.9 });
  const corners = 2 * CELLS + 2;
  const columnMesh = new THREE.InstancedMesh(columnGeom, columnMat, corners * corners);
  for (let i = 0; i < corners; i++) {
    for (let j = 0; j < corners; j++) {
      columnMesh.setMatrixAt(i * corners + j, new THREE.Matrix4().makeTranslation(-half + i * CELL, columnHeight / 2 - SLAB_DEPTH, -half + j * CELL));
    }
  }
  columnMesh.frustumCulled = false;
  meshes.push(columnMesh);
  scene.add(columnMesh);

  // Viewer-only camera: one finger orbits, two fingers pinch (dolly) and pan, the wheel dollies.
  // Nothing moves the camera on its own — no ride, no inertia, no settling.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.target.copy(middle);
  controls.minDistance = 1.2;
  controls.maxDistance = 420;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 1.3;
  controls.screenSpacePanning = true;
  camera.position.copy(middle).add(new THREE.Vector3(118, 22, 150));
  controls.update();

  const hum = createHum(STEP / SPEED);
  const onDown = () => hum.start();
  host.addEventListener("pointerdown", onDown);
  // iOS Safari zooms the page on its own gesture events despite touch-action: none.
  const blockGesture = (e: Event) => e.preventDefault();
  host.addEventListener("gesturestart", blockGesture);

  // Fog thins with the distance from the block so its whole structure stays readable from outside;
  // inside, it closes in like the haze of a deep station. Clip planes follow the same distance.
  const fog = scene.fog as THREE.FogExp2;
  const laidOut = new THREE.Vector3(Infinity, 0, 0);
  let dirty = true;
  const onCamera = () => {
    const outside = bounds.distanceToPoint(camera.position);
    fog.density = 0.03 * (30 / (30 + outside * 1.5));
    camera.near = Math.max(0.06, outside * 0.02);
    camera.far = outside + 420;
    camera.updateProjectionMatrix();
    if (camera.position.distanceTo(laidOut) > 3) {
      laidOut.copy(camera.position);
      relayout(camera.position);
    }
    dirty = true;
  };
  controls.addEventListener("change", onCamera);

  const resize = () => {
    const w = Math.max(host.clientWidth, 1);
    const h = Math.max(host.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 62 : 50;
    onCamera();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onVisibility = () => hum.setPaused(document.hidden);
  document.addEventListener("visibilitychange", onVisibility);

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  renderer.domElement.addEventListener("webglcontextlost", onLost);

  // Adaptive resolution: frame interval above ~24 fps lowers DPR at once; a steady 30 Hz raises it slowly.
  let pace = FRAME_MS;
  let lastAdapt = 0;
  const adapt = (interval: number, now: number) => {
    if (interval > 200) return;
    pace += (interval - pace) * 0.1;
    if (now - lastAdapt < 1500) return;
    let next = dpr;
    if (pace > 42) next = Math.max(MIN_DPR, dpr * 0.8);
    else if (pace < FRAME_MS + 3 && now - lastAdapt > 4000) next = Math.min(dprCap, dpr + 0.1);
    if (next === dpr) return;
    dpr = next;
    lastAdapt = now;
    pace = FRAME_MS;
    renderer.setPixelRatio(dpr);
    resize();
  };

  // Loop: only the machines move — steps and handrails.
  let time = 0;
  let last = performance.now();
  let lastFrame = 0;
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (lost || now - lastFrame < FRAME_MS - 2) return;
    const moving = !reduce.matches;
    if (!moving && !dirty) return;
    const interval = now - lastFrame;
    lastFrame = now;
    adapt(interval, now);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (moving) time += dt;
    stepUniforms.uTime.value = time % (LOOP / SPEED);
    handrail.offset.x = -(((time * HANDRAIL_SPEED * handrail.repeat.x) % 1) + 1) % 1;
    renderer.render(scene, camera);
    dirty = false;
  };
  resize();
  // Compile every program off the main path before the first frame, so opening does not stall.
  let disposed = false;
  const begin = () => {
    if (disposed) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  renderer.compileAsync(scene, camera).then(begin, begin);

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.removeEventListener("change", onCamera);
      controls.dispose();
      hum.dispose();
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("gesturestart", blockGesture);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      for (const mesh of meshes) mesh.dispose();
      for (const g of geometries) g.dispose();
      for (const mat of [...Object.values(materials), stepMat, columnMat]) mat.dispose();
      for (const t of textures) t.dispose();
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
