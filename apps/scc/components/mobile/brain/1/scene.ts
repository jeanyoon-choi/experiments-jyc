import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// MRI-derived whole brain (Nevit Dilmen, CC BY-SA 3.0), welded and baked by build-model.mjs:
// COLOR_0.r = fine sulcus depth, COLOR_0.g = deep fissure depth. Units are metres.
const MODEL_URL = "/3d/brain/brain.glb";
const MAX_DPR = 2;

// Ashima 3D simplex noise (MIT), object-space tissue, vessels and bump.
const NOISE = /* glsl */ `
vec3 bm289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 bm289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 bperm(vec4 x){return bm289(((x*34.)+10.)*x);}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=bm289(i);
  vec4 p=bperm(bperm(bperm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=inversesqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 105.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

function brainMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    sheen: 0.35,
    sheenColor: new THREE.Color("#8a2a24"),
    sheenRoughness: 0.55,
    envMapIntensity: 0.22,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec4 cavity;\nvarying vec2 vCav;\nvarying vec3 vObj;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCav = cavity.rg;\nvObj = position;");

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec2 vCav;\nvarying vec3 vObj;\n${NOISE}\nfloat bVessel; float bSulcus; float bTissue; float bAO;`)
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
        {
          vec3 p = vObj * 45.0;
          // domain warp so the veins meander and branch instead of tracing a grid
          vec3 w = vec3(snoise(p * 0.5 + 3.1), snoise(p * 0.5 + 7.7), snoise(p * 0.5 + 1.3));
          float sulc = smoothstep(0.3, 0.85, max(vCav.r, vCav.g * 0.85));
          float deep = smoothstep(0.25, 0.95, vCav.g * 0.6 + vCav.r * 0.6);
          bAO = 1.0 - 0.8 * deep;
          // superficial cortical veins: few, thick, lying in and along the sulci
          float veinA = abs(snoise(p * 0.6 + w * 1.1));
          float core = 1.0 - smoothstep(0.05, 0.05 + 1.5 * fwidth(veinA), veinA);
          float big = core * smoothstep(0.15, 0.6, vCav.g * 0.7 + vCav.r * 0.5);
          bVessel = big;
          bSulcus = sulc;
          float mott = snoise(vObj * 140.0) * 0.5 + snoise(vObj * 31.0) * 0.5;
          bTissue = mott;
          // capillary blush: patches of the pia flushed red, never lines
          float blush = smoothstep(0.1, 0.8, snoise(vObj * 22.0 + 9.0)) * 0.55;
          vec3 crown = vec3(0.56, 0.36, 0.31);
          vec3 crownCool = vec3(0.52, 0.38, 0.35);
          vec3 flush = vec3(0.58, 0.20, 0.18);
          vec3 fold = vec3(0.20, 0.035, 0.04);
          vec3 tissue = mix(crown, crownCool, 0.5 + 0.5 * mott);
          tissue = mix(tissue, flush, blush);
          tissue = mix(tissue, fold, sulc);
          vec3 vein = vec3(0.22, 0.03, 0.07);
          diffuseColor.rgb = mix(tissue, vein, bVessel * 0.92);
        }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor - 0.18 * bSulcus - 0.15 * bVessel + 0.06 * bTissue, 0.18, 1.0);",
      )
      .replace(
        "#include <aomap_fragment>",
        /* glsl */ `#include <aomap_fragment>
        // sulcus occlusion from the baked depth: no shadow maps
        reflectedLight.indirectDiffuse *= bAO;
        reflectedLight.indirectSpecular *= bAO;
        reflectedLight.directDiffuse *= mix(1.0, bAO, 0.6);
        reflectedLight.directSpecular *= bAO;
        #ifdef USE_CLEARCOAT
          clearcoatSpecularIndirect *= bAO;
          clearcoatSpecularDirect *= mix(1.0, bAO, 0.7);
        #endif
        #ifdef USE_SHEEN
          sheenSpecularIndirect *= bAO;
        #endif`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        {
          // fine tissue grain plus raised vessels, as a screen-space bump (no extra textures)
          float h = 0.00004 * snoise(vObj * 520.0) + 0.00025 * bVessel;
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
          float dx = dFdx(h), dy = dFdy(h);
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1) * faceDirection;
          vec3 grad = sign(det) * (dx * r1 + dy * r2);
          normal = normalize(abs(det) * normal - grad);
        }`,
      );
  };
  return material;
}

export function createBrain(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0f0d0d");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = env;

  const key = new THREE.DirectionalLight("#fff3ea", 1.0);
  key.position.set(-0.35, 0.5, 0.45);
  const rim = new THREE.DirectionalLight("#ffd9cf", 0.9);
  rim.position.set(0.4, 0.25, -0.5);
  const fill = new THREE.HemisphereLight("#f4e6e0", "#2a1614", 0.2);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  camera.position.set(0, 0.05, 0.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.rotateSpeed = 0.8;
  let resume = 0;
  const onStart = () => {
    controls.autoRotate = false;
    window.clearTimeout(resume);
  };
  const onEnd = () => {
    window.clearTimeout(resume);
    resume = window.setTimeout(() => (controls.autoRotate = true), 2500);
  };
  controls.addEventListener("start", onStart);
  controls.addEventListener("end", onEnd);

  const pivot = new THREE.Group();
  scene.add(pivot);
  const material = brainMaterial();
  let geometry: THREE.BufferGeometry | null = null;
  let radius = 0.11;

  const fit = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit the bounding sphere to the narrower axis with a margin
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = (radius * 1.12) / Math.sin(Math.min(vFov, hFov) / 2);
    camera.near = dist * 0.05;
    camera.far = dist * 4;
    camera.updateProjectionMatrix();
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.minDistance = dist * 0.35;
    controls.maxDistance = dist * 1.6;
    controls.update();
  };
  const observer = new ResizeObserver(fit);
  observer.observe(host);
  fit();

  let disposed = false;
  new GLTFLoader().load(MODEL_URL, (gltf) => {
    if (disposed) return;
    const mesh = gltf.scene.getObjectByProperty("isMesh", true) as THREE.Mesh | undefined;
    if (!mesh) return;
    geometry = mesh.geometry;
    geometry.setAttribute("cavity", geometry.getAttribute("color"));
    geometry.deleteAttribute("color");
    const brain = new THREE.Mesh(geometry, material);
    // MRI frame (x anterior–posterior, y left–right, z up) to three's y-up, frontal lobe to the viewer's left
    brain.rotation.x = -Math.PI / 2;
    pivot.add(brain);
    geometry.computeBoundingSphere();
    radius = geometry.boundingSphere?.radius ?? radius;
    fit();
  });

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      window.clearTimeout(resume);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      geometry?.dispose();
      material.dispose();
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
