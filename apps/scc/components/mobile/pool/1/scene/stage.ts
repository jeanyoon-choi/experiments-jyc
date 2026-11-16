import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { BALL_R, GONE, ON_TABLE, RAIL, RAIL_TOP, TABLE_W } from "../model/physics";
import type { Table } from "../model/physics";
import { buildTable } from "./table";
import type { TableMaterials } from "./table";
import { ballTexture, clothTexture, contactTexture } from "./textures";

/** Drawn pixels are capped, so a dense screen does not cost more than a mobile GPU can fill. */
const MAX_DPR = 3;
const MAX_PIXELS = 2_600_000;
/** Half the angle the long side of the table fills, seen from the camera over its middle. */
const HALF_VIEW = (21 * Math.PI) / 180;
const CUE_LENGTH = 1.45;
const CUE_LIFT = (4 * Math.PI) / 180;
const ASSETS = "/3d/pool/";

/** Where the cue lies: its line, how far its tip is behind the cue ball, and whether to sight along it. */
export type CuePose = { ux: number; uy: number; back: number; guide: boolean };

function buildCue() {
  const group = new THREE.Group();
  // A little stouter than a real cue, in keeping with the balls.
  const radius = (x: number) => 0.0078 + (0.0175 - 0.0078) * (x / CUE_LENGTH);
  const part = (from: number, to: number, material: THREE.Material) => {
    const geometry = new THREE.CylinderGeometry(radius(to), radius(from), to - from, 20);
    geometry.rotateZ(-Math.PI / 2);
    geometry.translate((from + to) / 2, 0, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    group.add(mesh);
  };
  // Tip to butt: chalked leather, ferrule, maple shaft, joint ring, wrapped butt, rubber bumper.
  part(0, 0.008, new THREE.MeshStandardMaterial({ color: 0x2c63a3, roughness: 1 }));
  part(0.008, 0.034, new THREE.MeshStandardMaterial({ color: 0xece7da, roughness: 0.35 }));
  part(0.034, 0.735, new THREE.MeshStandardMaterial({ color: 0xc7a674, roughness: 0.3 }));
  part(0.735, 0.747, new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.25, metalness: 1 }));
  part(0.747, 1.43, new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.28 }));
  part(1.43, CUE_LENGTH, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 }));
  return group;
}

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
  new HDRLoader().load(`${ASSETS}billiard_hall_512.hdr`, (panorama) => {
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
  // away toward the ends, and balls and cushions throw their shadows the other way.
  const lamp = new THREE.SpotLight(0xfff0dc, 7.5, 0, 1.0, 0.8, 2);
  lamp.position.set(-0.32, -0.2, 1.5);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0003;
  lamp.shadow.normalBias = 0.0015;
  lamp.shadow.radius = 3;
  lamp.shadow.camera.near = 0.8;
  lamp.shadow.camera.far = 4;
  scene.add(lamp, lamp.target);

  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const tooth = clothTexture();
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
      map: tooth,
      bumpMap: tooth,
      bumpScale: 0.6,
      roughness: 0.97,
      metalness: 0,
      shadowSide: THREE.DoubleSide,
      envMapIntensity: 0.3,
    }),
    wood: wood(false),
    woodTurned: wood(true),
    pocket: new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 1, metalness: 0, envMapIntensity: 1.5, vertexColors: true, side: THREE.DoubleSide }),
    dark: new THREE.MeshBasicMaterial({ color: 0x000000 }),
    casting: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.38, metalness: 0, envMapIntensity: 0.9 }),
    sight: new THREE.MeshStandardMaterial({ color: 0xeeeadd, roughness: 0.25, metalness: 0 }),
  };

  const sphere = new THREE.SphereGeometry(BALL_R, 48, 32);
  const contact = contactTexture();
  const contactGeometry = new THREE.PlaneGeometry(BALL_R * 3.2, BALL_R * 3.2);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contact, transparent: true, depthWrite: false, opacity: 0.38, toneMapped: false });
  const BALL_SHINE = 1.5;
  const balls = Array.from({ length: 16 }, (_, id) => {
    const material = new THREE.MeshStandardMaterial({ map: ballTexture(id, anisotropy), roughness: 0.045, metalness: 0, envMapIntensity: BALL_SHINE });
    const mesh = new THREE.Mesh(sphere, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const dark = new THREE.Mesh(contactGeometry, contactMaterial);
    dark.renderOrder = 1;
    scene.add(mesh, dark);
    return { mesh, material, dark };
  });

  const cue = buildCue();
  cue.rotation.order = "ZYX";
  cue.visible = false;
  scene.add(cue);

  // The sighting line lies on the cloth: a hairline to where the cue ball will first touch.
  const guideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), guideMaterial);
  const ghost = new THREE.Mesh(new THREE.RingGeometry(BALL_R - 0.0032, BALL_R, 56), guideMaterial);
  line.renderOrder = 2;
  ghost.renderOrder = 2;
  line.visible = false;
  ghost.visible = false;
  scene.add(line, ghost);

  const traceEnd = { x: 0, y: 0 };
  let built: ReturnType<typeof buildTable> | null = null;
  let builtLength = 0;
  let pixelsPerMetre = 1;
  let landscape = false;

  /** Fits the table to the screen and returns the playing length that results. */
  const fit = (width: number, height: number) => {
    landscape = width > height;
    const short = Math.min(width, height);
    const long = Math.max(width, height);
    pixelsPerMetre = short / TABLE_W;
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
  const render = (table: Table, pose: CuePose | null, shadows: boolean) => {
    rebuild(table);
    for (const ball of table.balls) {
      const { mesh, material, dark } = balls[ball.id];
      mesh.visible = ball.state !== GONE;
      dark.visible = ball.state === ON_TABLE;
      if (!mesh.visible) continue;
      mesh.position.set(ball.x, ball.y, BALL_R + ball.z);
      mesh.quaternion.set(ball.qx, ball.qy, ball.qz, ball.qw);
      dark.position.set(ball.x, ball.y, 0.0005);
      // A ball loses the lamp as it goes down the hole.
      const lit = ball.state === ON_TABLE ? 1 : Math.min(1, Math.max(0, 1 + (ball.z + 0.012) / 0.07));
      material.color.setScalar(lit);
      material.envMapIntensity = lit * BALL_SHINE;
    }

    const white = table.balls[0];
    const shown = pose !== null && white.state === ON_TABLE;
    cue.visible = shown;
    line.visible = shown && pose.guide;
    ghost.visible = line.visible;
    if (shown) {
      const back = BALL_R + pose.back;
      cue.position.set(white.x - pose.ux * back, white.y - pose.uy * back, BALL_R);
      cue.rotation.set(0, -CUE_LIFT, Math.atan2(-pose.uy, -pose.ux));
      if (pose.guide) {
        const length = Math.max(0, Math.hypot(traceEnd.x - white.x, traceEnd.y - white.y) - BALL_R * 2);
        const middle = BALL_R + length / 2;
        line.position.set(white.x + pose.ux * middle, white.y + pose.uy * middle, 0.0012);
        line.rotation.z = Math.atan2(pose.uy, pose.ux);
        line.scale.set(length, Math.max(0.0022, 1.1 / pixelsPerMetre), 1);
        line.visible = length > 0.002;
        ghost.position.set(traceEnd.x, traceEnd.y, 0.0012);
      }
    }
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
    guideMaterial.dispose();
    line.geometry.dispose();
    ghost.geometry.dispose();
    tooth.dispose();
    for (const ball of balls) {
      ball.material.map?.dispose();
      ball.material.dispose();
    }
    cue.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });
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
    /** Where the sighting line ends, set by the caller before a frame that shows it. */
    traceEnd,
    get landscape() {
      return landscape;
    },
  };
}
