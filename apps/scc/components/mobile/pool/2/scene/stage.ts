import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { BALL_R, RAIL, RAIL_TOP, TABLE_W } from "../model/physics";
import type { Table } from "../model/physics";
import { buildTable } from "./table";
import type { TableMaterials } from "./table";
import { FACE_ALL_OVER, ballSkin, contactTexture, dollarPrint, loadAtlas } from "./textures";

/** Drawn pixels are capped, so a dense screen does not cost more than a mobile GPU can fill. */
const MAX_DPR = 2;
const MAX_PIXELS = 1_400_000;
/** Half the angle the long side of the table fills, seen from the camera over its middle. */
const HALF_VIEW = (21 * Math.PI) / 180;
const ASSETS = "/3d/pool/";

export function createStage(canvas: HTMLCanvasElement, onReady: () => void) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: (window.devicePixelRatio || 1) < 2.5,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Shadows are redrawn only on frames where something that casts one has moved.
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environmentIntensity = 0.45;
  // The panorama is y-up; the table is z-up.
  scene.environmentRotation.set(Math.PI / 2, 0, 0);
  let disposed = false;
  let environment: THREE.WebGLRenderTarget | null = null;
  // What the balls and lacquer reflect: a photographed billiard hall.
  new HDRLoader().load(`${ASSETS}billiard_hall_256.hdr`, (panorama) => {
    if (disposed) {
      panorama.dispose();
      return;
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromEquirectangular(panorama);
    pmrem.dispose();
    panorama.dispose();
    scene.environment = environment.texture;
    onReady();
  });

  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 20);

  // One lamp low over the table and off to one side: the cloth is brightest under it and falls
  // away toward the ends, and balls and rails throw their shadows the other way.
  const lamp = new THREE.SpotLight(0xfff0dc, 7.5, 0, 1.0, 0.8, 2);
  lamp.position.set(-0.32, -0.2, 1.5);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0003;
  lamp.shadow.normalBias = 0.0015;
  lamp.shadow.radius = 3;
  lamp.shadow.camera.near = 0.8;
  lamp.shadow.camera.far = 4;
  scene.add(lamp, lamp.target);

  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const print = dollarPrint(anisotropy);
  const loader = new THREE.TextureLoader();
  const grain = (file: string, colour: boolean, turned: boolean) => {
    const texture = loader.load(ASSETS + file, onReady);
    if (colour) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // One sheet of veneer covers 0.4 m of rail.
    texture.repeat.set(2.5, 2.5);
    texture.rotation = turned ? Math.PI / 2 : 0;
    texture.anisotropy = anisotropy;
    return texture;
  };
  const wood = (turned: boolean) =>
    new THREE.MeshPhysicalMaterial({
      // Stained dark and lacquered.
      color: 0x5e4334,
      map: grain("walnut_diff.jpg", true, turned),
      normalMap: grain("walnut_nor.jpg", false, turned),
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.8,
    });
  const materials: TableMaterials = {
    cloth: new THREE.MeshStandardMaterial({
      color: 0x0e6b52,
      map: print,
      roughness: 0.97,
      metalness: 0,
      shadowSide: THREE.DoubleSide,
      envMapIntensity: 0.3,
    }),
    wood: wood(false),
    woodTurned: wood(true),
    sight: new THREE.MeshStandardMaterial({ color: 0xeeeadd, roughness: 0.25, metalness: 0 }),
  };

  const sphere = new THREE.SphereGeometry(BALL_R, 32, 20);
  const contact = contactTexture();
  const contactGeometry = new THREE.PlaneGeometry(BALL_R * 3.2, BALL_R * 3.2);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contact, transparent: true, depthWrite: false, opacity: 0.38, toneMapped: false });
  const balls = Array.from({ length: 16 }, (_, id) => {
    const skin = ballSkin(id, anisotropy);
    const material = new THREE.MeshStandardMaterial({ map: skin.texture, roughness: 0.045, metalness: 0, envMapIntensity: 1.5 });
    const mesh = new THREE.Mesh(sphere, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return { mesh, material, paint: skin.paint };
  });
  // The sixteen darks under the balls are one draw.
  const darks = new THREE.InstancedMesh(contactGeometry, contactMaterial, balls.length);
  darks.renderOrder = 1;
  // They are spread over the whole table and move every frame: never culled as one small thing.
  darks.frustumCulled = false;
  const place = new THREE.Matrix4();
  scene.add(darks);
  const pictures: { faces: ImageData | null; marks: ImageData | null } = { faces: null, marks: null };
  const arrived = (which: "faces" | "marks") => (atlas: ImageData) => {
    if (disposed) return;
    pictures[which] = atlas;
    for (const ball of balls) ball.paint(pictures.faces, pictures.marks);
    onReady();
  };
  loadAtlas(`${ASSETS}faces-768.jpg`, arrived("faces"));
  if (!FACE_ALL_OVER) loadAtlas(`${ASSETS}logos-768.png`, arrived("marks"));

  let built: ReturnType<typeof buildTable> | null = null;
  let builtLength = 0;
  let landscape = false;
  let viewWidth = 1;
  let viewHeight = 1;
  const point = new THREE.Vector3();

  /** Fits the table to the screen and returns the playing length that results. */
  const fit = (width: number, height: number) => {
    landscape = width > height;
    viewWidth = width;
    viewHeight = height;
    const short = Math.min(width, height);
    const long = Math.max(width, height);
    const tableLength = (TABLE_W * long) / short;
    // The rail tops, not the cloth, meet the screen's edge.
    const distance = tableLength / 2 / Math.tan(HALF_VIEW);
    camera.position.set(0, 0, RAIL_TOP + distance);
    camera.up.set(landscape ? -1 : 0, landscape ? 0 : 1, 0);
    camera.lookAt(0, 0, RAIL_TOP);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((landscape ? TABLE_W : tableLength) / 2 / distance));
    camera.aspect = width / height;
    camera.near = distance - 0.5;
    camera.far = distance + 0.5;
    camera.updateProjectionMatrix();
    // The drawing reads this camera while the table itself is not being rendered, so it is brought
    // up to date here and not left to the next render.
    camera.updateMatrixWorld();
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR, Math.sqrt(MAX_PIXELS / (width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    return tableLength - RAIL * 2;
  };

  const rebuild = (table: Table) => {
    if (built && Math.abs(builtLength - table.length) < 1e-6) return;
    if (built) {
      scene.remove(built.group);
      built.dispose();
    }
    built = buildTable(table, materials);
    builtLength = table.length;
    scene.add(built.group);
  };

  /** Draws one frame of the table as it stands. */
  const render = (table: Table, shadows: boolean) => {
    rebuild(table);
    for (const ball of table.balls) {
      const { mesh } = balls[ball.id];
      mesh.position.set(ball.x, ball.y, BALL_R);
      mesh.quaternion.set(ball.qx, ball.qy, ball.qz, ball.qw);
      darks.setMatrixAt(ball.id, place.makeTranslation(ball.x, ball.y, 0.0005));
    }
    darks.instanceMatrix.needsUpdate = true;
    if (shadows) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
  };

  const dispose = () => {
    disposed = true;
    built?.dispose();
    sphere.dispose();
    contact.dispose();
    contactGeometry.dispose();
    contactMaterial.dispose();
    darks.dispose();
    print.dispose();
    for (const ball of balls) {
      ball.material.map?.dispose();
      ball.material.dispose();
    }
    for (const material of [materials.wood, materials.woodTurned] as THREE.MeshPhysicalMaterial[]) {
      material.map?.dispose();
      material.normalMap?.dispose();
    }
    Object.values(materials).forEach((material) => material.dispose());
    environment?.dispose();
    lamp.shadow.dispose();
    renderer.dispose();
  };

  return {
    fit,
    render,
    dispose,
    /** Where a point of the table (m) falls on the page (CSS px from its top left), as this camera sees it. */
    project(x: number, y: number, z: number, out: { x: number; y: number }) {
      point.set(x, y, z).project(camera);
      out.x = (point.x * 0.5 + 0.5) * viewWidth;
      out.y = (0.5 - point.y * 0.5) * viewHeight;
      return out;
    },
    get landscape() {
      return landscape;
    },
  };
}
