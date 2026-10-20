import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";
import type { CursorAgent, SelectedCell } from "../model";
import {
  MEDIA_ATLAS_COLUMNS,
  MEDIA_ATLAS_ROWS,
  MEDIA_IMAGE_COUNTS,
  loadMediaAtlas,
  type AttentionSurface,
  type MediaSurface,
} from "./media-atlas";

const MAX_FISH_COUNT = 1000;
const MAX_ATTENTION_CELL_COUNT = 4096;
const MEDIA_CELL_OVERSCAN = 2;
const FLOOR_Y = 0;
const INITIAL_CAMERA_ELEVATION = Math.PI / 2;

type GoldfishSceneOptions = {
  canvas: HTMLCanvasElement;
  fieldCanvas: HTMLCanvasElement;
  htmlLayer: HTMLDivElement;
  onHTMLTargetChange: (
    cellKey: string,
    state: { active: boolean; strength: number },
  ) => void;
  count: number;
  color: string;
  paperColor: string;
  cameraProjection?: CameraProjection;
  fishModelStyle?: FishModelStyle;
};

export type CameraProjection = "perspective" | "orthographic";
export type FishModelStyle = "minimal" | "naturalistic";

export type GoldfishRenderSettings = {
  agentScale: number;
  depth: number;
  tailMotion: number;
};

export type FieldPoint = {
  x: number;
  y: number;
};

export type { AttentionSurface };

export type GoldfishPerformanceInfo = {
  drawCalls: number;
  geometries: number;
  textures: number;
  triangles: number;
};

type MediaPlayback = {
  current: number;
  imageCount: number;
  next: number;
  startedAt: number;
  duration: number;
  randomState: number;
};

function nextPlaybackRandom(playback: MediaPlayback) {
  playback.randomState =
    (Math.imul(playback.randomState, 1664525) + 1013904223) >>> 0;
  return playback.randomState / 0xffffffff;
}

function getPlaybackDuration(playback: MediaPlayback, speed: number) {
  if (speed === 0) return Number.POSITIVE_INFINITY;
  const diversity = 0.72;
  const factor =
    1 + (nextPlaybackRandom(playback) * 2 - 1) * diversity;
  return 1000 / (speed * Math.max(0.05, factor));
}

function getOtherMediaIndex(playback: MediaPlayback, current: number) {
  const candidate = Math.floor(
    nextPlaybackRandom(playback) * (playback.imageCount - 1),
  );
  return candidate >= current ? candidate + 1 : candidate;
}

function createTailGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.45, 1.12);
  shape.bezierCurveTo(-1.25, 1.82, -3.62, 3.92, -5.8, 4.12);
  shape.bezierCurveTo(-5.28, 2.1, -3.72, 0.64, -2.02, 0);
  shape.bezierCurveTo(-3.72, -0.64, -5.28, -2.1, -5.8, -4.12);
  shape.bezierCurveTo(-3.62, -3.92, -1.25, -1.82, 0.45, -1.12);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.16,
    bevelThickness: 0.16,
    curveSegments: 7,
    depth: 0.34,
    steps: 1,
  });
  geometry.translate(0, 0, -0.17);
  geometry.computeVertexNormals();
  return geometry;
}

function createFinGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0);
  shape.bezierCurveTo(-1.05, 1.4, 0.35, 2.9, 2.35, 2.7);
  shape.bezierCurveTo(1.45, 1.2, 0.45, 0.24, -2.1, 0);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.08,
    bevelThickness: 0.07,
    curveSegments: 6,
    depth: 0.15,
    steps: 1,
  });
  geometry.translate(0, 0, -0.075);
  geometry.computeVertexNormals();
  return geometry;
}

function setMeshColor(material: THREE.MeshStandardMaterial, color: string) {
  material.color.set(color);
  material.emissive.set(color).multiplyScalar(0.035);
}

export class GoldfishScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly htmlRenderer = new CSS3DRenderer();
  private readonly scene = new THREE.Scene();
  private readonly htmlScene = new THREE.Scene();
  private readonly camera:
    | THREE.PerspectiveCamera
    | THREE.OrthographicCamera;
  private readonly cameraProjection: CameraProjection;
  private fishModelStyle: FishModelStyle;
  private currentColor: string;
  private readonly raycaster = new THREE.Raycaster();
  private readonly floorPlane = new THREE.Plane(
    new THREE.Vector3(0, 1, 0),
    -FLOOR_Y,
  );
  private readonly hitPoint = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();
  private readonly fieldTexture: THREE.CanvasTexture;
  private readonly floorMaterial: THREE.MeshBasicMaterial;
  private readonly floor: THREE.Mesh;
  private readonly mediaTile = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_ATTENTION_CELL_COUNT),
    1,
  );
  private readonly mediaMaterial: THREE.ShaderMaterial;
  private readonly mediaCells: THREE.InstancedMesh;
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.38,
    metalness: 0.02,
  });
  private readonly finMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.52,
    metalness: 0,
    transparent: true,
    opacity: 0.72,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  private readonly eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a09,
    roughness: 0.24,
    metalness: 0,
  });
  private readonly body: THREE.InstancedMesh;
  private readonly peduncle: THREE.InstancedMesh;
  private readonly tail: THREE.InstancedMesh;
  private readonly dorsalFin: THREE.InstancedMesh;
  private readonly leftFin: THREE.InstancedMesh;
  private readonly rightFin: THREE.InstancedMesh;
  private readonly leftEye: THREE.InstancedMesh;
  private readonly rightEye: THREE.InstancedMesh;
  private readonly root = new THREE.Object3D();
  private readonly local = new THREE.Object3D();
  private readonly finalMatrix = new THREE.Matrix4();
  private width = 1;
  private height = 1;
  private activeCount: number;
  private fitDistance = 1;
  private cameraAzimuth = 0;
  private cameraElevation = INITIAL_CAMERA_ELEVATION;
  private cameraZoom = 1;
  private attentionSurface: AttentionSurface = "white";
  private mediaSpeed = 24;
  private attentionCells: SelectedCell[] = [];
  private readonly mediaAtlasTextures = new Map<
    MediaSurface,
    THREE.CanvasTexture
  >();
  private readonly mediaAtlasLoading = new Set<MediaSurface>();
  private mediaPlayback: MediaPlayback[] = [];
  private readonly mediaPlaybackByCell = new Map<string, MediaPlayback>();
  private lastElapsedMilliseconds = 0;
  private disposed = false;
  private readonly htmlLayer: HTMLDivElement;
  private readonly onHTMLTargetChange: GoldfishSceneOptions["onHTMLTargetChange"];
  private readonly htmlTargets = new Map<
    string,
    {
      object: CSS3DObject;
      fieldset: HTMLFieldSetElement;
      toggle: HTMLInputElement;
      strength: HTMLInputElement;
      strengthOutput: HTMLOutputElement;
      populationOutput: HTMLOutputElement;
      populationMeter: HTMLMeterElement;
      cell: SelectedCell;
      active: boolean;
      attractionStrength: number;
      population: number;
    }
  >();

  constructor({
    canvas,
    fieldCanvas,
    htmlLayer,
    onHTMLTargetChange,
    count,
    color,
    paperColor,
    cameraProjection = "perspective",
    fishModelStyle = "minimal",
  }: GoldfishSceneOptions) {
    this.htmlLayer = htmlLayer;
    this.onHTMLTargetChange = onHTMLTargetChange;
    this.cameraProjection = cameraProjection;
    this.fishModelStyle = fishModelStyle;
    this.currentColor = color;
    this.camera =
      cameraProjection === "orthographic"
        ? new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 10000)
        : new THREE.PerspectiveCamera(40, 1, 1, 10000);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.htmlLayer.append(this.htmlRenderer.domElement);

    this.applyFishModelMaterials();

    this.fieldTexture = new THREE.CanvasTexture(fieldCanvas);
    this.fieldTexture.colorSpace = THREE.SRGBColorSpace;
    this.fieldTexture.minFilter = THREE.LinearFilter;
    this.fieldTexture.magFilter = THREE.LinearFilter;
    this.floorMaterial = new THREE.MeshBasicMaterial({
      map: this.fieldTexture,
      side: THREE.DoubleSide,
    });
    const floorGeometry = new THREE.PlaneGeometry(1, 1);
    floorGeometry.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floor.position.y = FLOOR_Y - 0.6;
    this.scene.add(this.floor);

    const mediaGeometry = new THREE.PlaneGeometry(1, 1);
    mediaGeometry.rotateX(-Math.PI / 2);
    this.mediaTile.setUsage(THREE.DynamicDrawUsage);
    mediaGeometry.setAttribute("mediaTile", this.mediaTile);
    this.mediaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        mediaAtlas: { value: null },
      },
      vertexShader: `
        attribute float mediaTile;
        varying vec2 vMediaUv;
        varying float vMediaTile;

        void main() {
          vMediaUv = uv;
          vMediaTile = mediaTile;
          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            instanceMatrix *
            vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D mediaAtlas;
        varying vec2 vMediaUv;
        varying float vMediaTile;

        vec2 mediaAtlasUv(float tileIndex) {
          float column = mod(
            tileIndex,
            ${MEDIA_ATLAS_COLUMNS.toFixed(1)}
          );
          float row = floor(
            tileIndex / ${MEDIA_ATLAS_COLUMNS.toFixed(1)}
          );
          vec2 localUv = mix(
            vec2(0.012),
            vec2(0.988),
            vMediaUv
          );
          return vec2(
            (column + localUv.x) /
              ${MEDIA_ATLAS_COLUMNS.toFixed(1)},
            1.0 -
              (row + 1.0 - localUv.y) /
                ${MEDIA_ATLAS_ROWS.toFixed(1)}
          );
        }

        void main() {
          gl_FragColor = texture2D(
            mediaAtlas,
            mediaAtlasUv(vMediaTile)
          );
          #include <colorspace_fragment>
        }
      `,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mediaCells = new THREE.InstancedMesh(
      mediaGeometry,
      this.mediaMaterial,
      MAX_ATTENTION_CELL_COUNT,
    );
    this.mediaCells.count = 0;
    this.mediaCells.frustumCulled = false;
    this.mediaCells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mediaCells.visible = false;
    this.scene.add(this.mediaCells);

    const bodyGeometry = new THREE.SphereGeometry(1, 22, 15);
    const peduncleGeometry = new THREE.CylinderGeometry(0.68, 1.2, 2.5, 12, 1);
    peduncleGeometry.rotateZ(Math.PI / 2);
    const tailGeometry = createTailGeometry();
    const finGeometry = createFinGeometry();
    const eyeGeometry = new THREE.SphereGeometry(0.43, 12, 8);

    this.body = new THREE.InstancedMesh(
      bodyGeometry,
      this.bodyMaterial,
      MAX_FISH_COUNT,
    );
    this.peduncle = new THREE.InstancedMesh(
      peduncleGeometry,
      this.bodyMaterial,
      MAX_FISH_COUNT,
    );
    this.tail = new THREE.InstancedMesh(
      tailGeometry,
      this.finMaterial,
      MAX_FISH_COUNT,
    );
    this.dorsalFin = new THREE.InstancedMesh(
      finGeometry,
      this.finMaterial,
      MAX_FISH_COUNT,
    );
    this.leftFin = new THREE.InstancedMesh(
      finGeometry,
      this.finMaterial,
      MAX_FISH_COUNT,
    );
    this.rightFin = new THREE.InstancedMesh(
      finGeometry,
      this.finMaterial,
      MAX_FISH_COUNT,
    );
    this.leftEye = new THREE.InstancedMesh(
      eyeGeometry,
      this.eyeMaterial,
      MAX_FISH_COUNT,
    );
    this.rightEye = new THREE.InstancedMesh(
      eyeGeometry,
      this.eyeMaterial,
      MAX_FISH_COUNT,
    );

    for (const mesh of this.fishMeshes) {
      mesh.frustumCulled = false;
      mesh.count = count;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
    }

    const hemisphere = new THREE.HemisphereLight(0xfff7e6, 0x4a5261, 1.85);
    const key = new THREE.DirectionalLight(0xffe0a8, 4.6);
    key.position.set(-0.5, 1, 0.72);
    const rim = new THREE.DirectionalLight(0x91b8d8, 2.15);
    rim.position.set(0.72, 0.45, -0.85);
    this.scene.add(hemisphere, key, rim);

    this.activeCount = count;
    this.setColor(color);
    this.setPaperColor(paperColor);
  }

  private get fishMeshes() {
    return [
      this.body,
      this.peduncle,
      this.tail,
      this.dorsalFin,
      this.leftFin,
      this.rightFin,
      this.leftEye,
      this.rightEye,
    ];
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.htmlRenderer.setSize(this.width, this.height);

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = this.width / this.height;
      const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
      const horizontalFov =
        2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
      const direction = new THREE.Vector3(0, 0.8, 0.6).normalize();
      const depthExtent = (this.height / 2) * direction.z;
      const verticalExtent = (this.height / 2) * direction.y;
      const horizontalDistance =
        this.width / 2 / Math.tan(horizontalFov / 2) + depthExtent;
      const verticalDistance =
        verticalExtent / Math.tan(verticalFov / 2) + depthExtent;
      this.fitDistance =
        Math.max(horizontalDistance, verticalDistance) * 1.035;
    } else {
      this.camera.left = -this.width / 2;
      this.camera.right = this.width / 2;
      this.camera.top = this.height / 2;
      this.camera.bottom = -this.height / 2;
      this.fitDistance = Math.max(this.width, this.height) * 1.5;
    }
    this.updateCamera();

    this.floor.scale.set(this.width, 1, this.height);
    this.floor.updateMatrixWorld();
  }

  private updateCamera() {
    const distance = this.fitDistance * this.cameraZoom;
    const horizontalDistance = Math.cos(this.cameraElevation) * distance;
    const sinAzimuth = Math.sin(this.cameraAzimuth);
    const cosAzimuth = Math.cos(this.cameraAzimuth);
    const sinElevation = Math.sin(this.cameraElevation);
    const cosElevation = Math.cos(this.cameraElevation);
    this.camera.position.set(
      sinAzimuth * horizontalDistance,
      sinElevation * distance,
      cosAzimuth * horizontalDistance,
    );
    this.camera.up.set(
      -sinAzimuth * sinElevation,
      cosElevation,
      -cosAzimuth * sinElevation,
    );
    this.camera.near = Math.max(1, distance * 0.34);
    this.camera.far = distance * 2.35 + 520;
    if (this.cameraProjection === "orthographic") {
      this.camera.zoom = 1 / this.cameraZoom;
    }
    this.camera.lookAt(0, 12, 0);
    this.camera.updateProjectionMatrix();
  }

  orbit(deltaX: number, deltaY: number) {
    this.cameraAzimuth = THREE.MathUtils.euclideanModulo(
      this.cameraAzimuth - deltaX * 0.0045,
      Math.PI * 2,
    );
    this.cameraElevation = THREE.MathUtils.euclideanModulo(
      this.cameraElevation + deltaY * 0.0035,
      Math.PI * 2,
    );
    this.updateCamera();
  }

  zoom(deltaY: number) {
    this.cameraZoom = THREE.MathUtils.clamp(
      this.cameraZoom * Math.exp(deltaY * 0.0015),
      0.28,
      3,
    );
    this.updateCamera();
  }

  resetCamera() {
    this.cameraAzimuth = 0;
    this.cameraElevation = INITIAL_CAMERA_ELEVATION;
    this.cameraZoom = 1;
    this.updateCamera();
  }

  updateField() {
    this.fieldTexture.needsUpdate = true;
  }

  private createMediaPlayback(
    cell: SelectedCell,
    surface: MediaSurface,
  ) {
    const surfaceSeed = {
      cat: 0x2c9277b5,
      kiss: 0x165667b1,
      politician: 0x7f4a7c15,
      company: 0x6f2e9b41,
    }[surface];
    const randomState =
      (
        Math.imul(cell.column + 1, 0x45d9f3b) ^
        Math.imul(cell.row + 1, 0x119de1f3) ^
        surfaceSeed
      ) >>> 0;
    const playback: MediaPlayback = {
      current: 0,
      imageCount: MEDIA_IMAGE_COUNTS[surface],
      next: 0,
      startedAt: this.lastElapsedMilliseconds,
      duration: 0,
      randomState,
    };
    playback.current = Math.floor(
      nextPlaybackRandom(playback) * playback.imageCount,
    );
    playback.next = getOtherMediaIndex(
      playback,
      playback.current,
    );
    playback.duration = getPlaybackDuration(playback, this.mediaSpeed);
    return playback;
  }

  private useMediaAtlas(surface: MediaSurface) {
    const texture = this.mediaAtlasTextures.get(surface);
    if (!texture) return false;
    this.mediaMaterial.uniforms.mediaAtlas.value = texture;
    return true;
  }

  private prepareMediaAtlas(surface: MediaSurface) {
    if (this.useMediaAtlas(surface) || this.mediaAtlasLoading.has(surface)) {
      return;
    }
    this.mediaAtlasLoading.add(surface);

    void loadMediaAtlas(surface)
      .then((canvas) => {
        if (this.disposed) return;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = Math.min(
          4,
          this.renderer.capabilities.getMaxAnisotropy(),
        );
        this.mediaAtlasTextures.set(surface, texture);
        if (this.attentionSurface === surface) {
          this.mediaMaterial.uniforms.mediaAtlas.value = texture;
          this.mediaMaterial.needsUpdate = true;
          this.mediaCells.visible = this.mediaCells.count > 0;
        }
      })
      .catch(() => {
        if (this.attentionSurface === surface) {
          this.mediaCells.visible = false;
        }
      })
      .finally(() => {
        this.mediaAtlasLoading.delete(surface);
      });
  }

  setAttentionSurface(surface: AttentionSurface) {
    this.attentionSurface = surface;

    if (surface === "white") {
      this.mediaCells.visible = false;
      return;
    }

    this.setAttentionCells(this.attentionCells);
  }

  setMediaSpeed(speed: number) {
    this.mediaSpeed = THREE.MathUtils.clamp(speed, 0, 40);
    for (const playback of this.mediaPlaybackByCell.values()) {
      playback.startedAt = this.lastElapsedMilliseconds;
      playback.duration = getPlaybackDuration(
        playback,
        this.mediaSpeed,
      );
    }
  }

  setAttentionCells(cells: readonly SelectedCell[]) {
    const count = Math.min(cells.length, MAX_ATTENTION_CELL_COUNT);
    this.attentionCells = cells.slice(0, count);
    this.setHTMLTargets(this.attentionCells);
    const mediaSurface =
      this.attentionSurface === "white"
        ? null
        : this.attentionSurface;
    const playback: MediaPlayback[] = [];

    for (let index = 0; index < count; index += 1) {
      const cell = cells[index];
      let cellPlayback: MediaPlayback | null = null;
      if (mediaSurface) {
        const key = `${mediaSurface}:${cell.column}:${cell.row}`;
        cellPlayback = this.mediaPlaybackByCell.get(key) ?? null;
        if (!cellPlayback) {
          cellPlayback = this.createMediaPlayback(cell, mediaSurface);
          this.mediaPlaybackByCell.set(key, cellPlayback);
        }
        playback.push(cellPlayback);
      }

      this.local.position.set(
        cell.centerX - this.width / 2,
        FLOOR_Y - 0.42,
        cell.centerY - this.height / 2,
      );
      this.local.rotation.set(0, 0, 0);
      this.local.scale.set(
        cell.width + MEDIA_CELL_OVERSCAN,
        1,
        cell.height + MEDIA_CELL_OVERSCAN,
      );
      this.local.updateMatrix();
      this.mediaCells.setMatrixAt(index, this.local.matrix);
      this.mediaTile.setX(index, cellPlayback?.current ?? 0);
    }

    this.mediaPlayback = playback;
    this.mediaCells.count = count;
    this.mediaCells.instanceMatrix.clearUpdateRanges();
    this.mediaCells.instanceMatrix.addUpdateRange(0, count * 16);
    this.mediaCells.instanceMatrix.needsUpdate = true;
    this.mediaTile.clearUpdateRanges();
    this.mediaTile.addUpdateRange(0, count);
    this.mediaTile.needsUpdate = true;

    if (mediaSurface && count > 0) {
      this.prepareMediaAtlas(mediaSurface);
    }
    this.mediaCells.visible =
      mediaSurface !== null &&
      this.useMediaAtlas(mediaSurface) &&
      count > 0;
  }

  private setHTMLTargets(cells: readonly SelectedCell[]) {
    const retainedKeys = new Set<string>();

    for (const cell of cells) {
      const key = `${cell.column}:${cell.row}`;
      retainedKeys.add(key);
      let target = this.htmlTargets.get(key);

      if (!target) {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "goldfishes-html-target";
        const legend = document.createElement("legend");
        legend.textContent = `target ${cell.column}.${cell.row}`;

        const toggleLabel = document.createElement("label");
        toggleLabel.className = "goldfishes-html-toggle";
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = true;
        toggleLabel.append(toggle, document.createTextNode(" gather"));

        const strengthLabel = document.createElement("label");
        strengthLabel.className = "goldfishes-html-strength";
        const strengthText = document.createElement("span");
        strengthText.textContent = "pull";
        const strengthOutput = document.createElement("output");
        strengthOutput.textContent = "1.0×";
        const strength = document.createElement("input");
        strength.type = "range";
        strength.min = "0.2";
        strength.max = "2";
        strength.step = "0.1";
        strength.value = "1";
        strengthLabel.append(strengthText, strengthOutput, strength);

        const populationRow = document.createElement("div");
        populationRow.className = "goldfishes-html-population";
        const populationOutput = document.createElement("output");
        populationOutput.textContent = "0 nearby";
        const populationMeter = document.createElement("meter");
        populationMeter.min = 0;
        populationMeter.max = 12;
        populationMeter.value = 0;
        populationRow.append(populationOutput, populationMeter);

        fieldset.append(legend, toggleLabel, strengthLabel, populationRow);
        const object = new CSS3DObject(fieldset);
        object.rotation.x = -Math.PI / 2;
        target = {
          object,
          fieldset,
          toggle,
          strength,
          strengthOutput,
          populationOutput,
          populationMeter,
          cell,
          active: true,
          attractionStrength: 1,
          population: 0,
        };
        toggle.addEventListener("change", () => {
          if (!target) return;
          target.active = toggle.checked;
          this.updateHTMLTargetElement(target);
          this.onHTMLTargetChange(key, {
            active: target.active,
            strength: target.attractionStrength,
          });
        });
        strength.addEventListener("input", () => {
          if (!target) return;
          target.attractionStrength = Number(strength.value);
          this.updateHTMLTargetElement(target);
          this.onHTMLTargetChange(key, {
            active: target.active,
            strength: target.attractionStrength,
          });
        });
        this.htmlTargets.set(key, target);
        this.htmlScene.add(object);
        this.onHTMLTargetChange(key, { active: true, strength: 1 });
      }

      target.cell = cell;
      target.object.position.set(
        cell.centerX - this.width / 2,
        FLOOR_Y + 0.4,
        cell.centerY - this.height / 2,
      );
      this.updateHTMLTargetElement(target);
    }

    for (const [key, target] of this.htmlTargets) {
      if (retainedKeys.has(key)) continue;
      target.object.removeFromParent();
      target.fieldset.remove();
      this.htmlTargets.delete(key);
      this.onHTMLTargetChange(key, { active: false, strength: 0 });
    }
  }

  private updateHTMLTargetElement(target: {
    fieldset: HTMLFieldSetElement;
    toggle: HTMLInputElement;
    strength: HTMLInputElement;
    strengthOutput: HTMLOutputElement;
    active: boolean;
    attractionStrength: number;
  }) {
    target.fieldset.dataset.active = String(target.active);
    target.toggle.checked = target.active;
    target.strength.value = String(target.attractionStrength);
    target.strengthOutput.value = `${target.attractionStrength.toFixed(1)}×`;
  }

  private updateHTMLTargetPopulations(agents: readonly CursorAgent[]) {
    const radiusSquared = 96 ** 2;
    const meterMaximum = Math.max(
      12,
      Math.ceil(agents.length / Math.max(1, this.htmlTargets.size)),
    );

    for (const target of this.htmlTargets.values()) {
      let population = 0;
      for (const agent of agents) {
        const dx = agent.x - target.cell.centerX;
        const dy = agent.y - target.cell.centerY;
        if (dx * dx + dy * dy <= radiusSquared) population += 1;
      }
      target.populationMeter.max = meterMaximum;
      target.populationMeter.value = Math.min(population, meterMaximum);
      if (population === target.population) continue;
      target.population = population;
      target.populationOutput.value = `${population} nearby`;
    }
  }

  private updateMediaPlayback(elapsedMilliseconds: number) {
    this.lastElapsedMilliseconds = elapsedMilliseconds;
    if (!this.mediaCells.visible) return;
    let tileChanged = false;

    for (let index = 0; index < this.mediaPlayback.length; index += 1) {
      const playback = this.mediaPlayback[index];
      let playbackChanged = false;

      while (
        elapsedMilliseconds >=
        playback.startedAt + playback.duration
      ) {
        tileChanged = true;
        playbackChanged = true;
        playback.startedAt += playback.duration;
        playback.current = playback.next;
        playback.next = getOtherMediaIndex(
          playback,
          playback.current,
        );
        playback.duration = getPlaybackDuration(
          playback,
          this.mediaSpeed,
        );
      }

      if (playbackChanged) {
        this.mediaTile.setX(index, playback.current);
      }
    }

    if (tileChanged) {
      this.mediaTile.clearUpdateRanges();
      this.mediaTile.addUpdateRange(0, this.mediaPlayback.length);
      this.mediaTile.needsUpdate = true;
    }
  }

  screenToField(screenX: number, screenY: number): FieldPoint | null {
    this.ndc.set(
      (screenX / this.width) * 2 - 1,
      -(screenY / this.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(
      this.floorPlane,
      this.hitPoint,
    );
    if (!hit) return null;

    return {
      x: THREE.MathUtils.clamp(hit.x + this.width / 2, 0, this.width),
      y: THREE.MathUtils.clamp(hit.z + this.height / 2, 0, this.height),
    };
  }

  setCount(count: number) {
    this.activeCount = Math.min(MAX_FISH_COUNT, Math.max(0, Math.floor(count)));
    for (const mesh of this.fishMeshes) mesh.count = this.activeCount;
  }

  setColor(color: string) {
    this.currentColor = color;
    setMeshColor(this.bodyMaterial, color);
    const finColor = new THREE.Color(color).lerp(
      new THREE.Color("#fff0c8"),
      this.fishModelStyle === "naturalistic" ? 0.38 : 0.2,
    );
    setMeshColor(this.finMaterial, `#${finColor.getHexString()}`);
  }

  private applyFishModelMaterials() {
    const naturalistic = this.fishModelStyle === "naturalistic";
    this.bodyMaterial.roughness = naturalistic ? 0.27 : 0.38;
    this.bodyMaterial.metalness = naturalistic ? 0.055 : 0.02;
    this.finMaterial.roughness = naturalistic ? 0.4 : 0.52;
    this.eyeMaterial.color.set(naturalistic ? "#050403" : "#0a0a09");
    this.eyeMaterial.roughness = naturalistic ? 0.045 : 0.24;
    this.eyeMaterial.metalness = naturalistic ? 0.025 : 0;
    this.bodyMaterial.needsUpdate = true;
    this.finMaterial.needsUpdate = true;
    this.eyeMaterial.needsUpdate = true;
  }

  setFishModelStyle(style: FishModelStyle) {
    if (this.fishModelStyle === style) return;
    this.fishModelStyle = style;
    this.applyFishModelMaterials();
    this.setColor(this.currentColor);
  }

  setPaperColor(color: string) {
    this.renderer.setClearColor(color, 1);
    this.scene.background = new THREE.Color(color);
  }

  setFinOpacity(opacity: number) {
    this.finMaterial.opacity = THREE.MathUtils.clamp(opacity, 0.2, 1);
  }

  private setPartMatrix(
    mesh: THREE.InstancedMesh,
    index: number,
    px: number,
    py: number,
    pz: number,
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    this.local.position.set(px, py, pz);
    this.local.rotation.set(rx, ry, rz);
    this.local.scale.set(sx, sy, sz);
    this.local.updateMatrix();
    this.finalMatrix.multiplyMatrices(this.root.matrix, this.local.matrix);
    mesh.setMatrixAt(index, this.finalMatrix);
  }

  render(
    agents: readonly CursorAgent[],
    elapsedSeconds: number,
    settings: GoldfishRenderSettings,
  ) {
    this.updateMediaPlayback(elapsedSeconds * 1000);
    const count = Math.min(this.activeCount, agents.length);
    if (count !== this.body.count) {
      for (const mesh of this.fishMeshes) mesh.count = count;
    }

    const scale = settings.agentScale;
    for (let index = 0; index < count; index += 1) {
      const agent = agents[index];
      const speed = Math.hypot(agent.vx, agent.vy);
      const heading = Math.atan2(agent.vy, agent.vx);
      const phase = elapsedSeconds * (5.2 + speed * 0.018) + agent.id * 1.719;
      const depthSeed = (Math.sin(agent.id * 9.73) + 1) / 2;
      const swimHeight =
        10 +
        depthSeed * settings.depth +
        Math.sin(elapsedSeconds * 0.55 + agent.id * 2.173) *
          settings.depth *
          0.16;
      const tailAngle = Math.sin(phase) * settings.tailMotion;
      const bodyPulse = 1 + Math.sin(phase * 0.5) * 0.016;
      const bank = THREE.MathUtils.clamp(agent.vy / 110, -0.24, 0.24);
      const naturalistic = this.fishModelStyle === "naturalistic";
      const tailCant = naturalistic
        ? (agent.id % 2 === 0 ? 1 : -1) * 0.58
        : 0;

      this.root.position.set(
        agent.x - this.width / 2,
        swimHeight,
        agent.y - this.height / 2,
      );
      this.root.rotation.set(bank * 0.18, -heading, bank);
      this.root.scale.set(scale, scale, scale);
      this.root.updateMatrix();

      this.setPartMatrix(
        this.body,
        index,
        0.15,
        0,
        0,
        0,
        0,
        0,
        (naturalistic ? 5.65 : 5.35) * bodyPulse,
        naturalistic ? 3.38 : 3.45,
        naturalistic ? 2.72 : 2.48,
      );
      this.setPartMatrix(
        this.peduncle,
        index,
        naturalistic ? -5.35 : -5.1,
        0,
        0,
        0,
        0,
        0,
        1,
        naturalistic ? 1.08 : 1,
        naturalistic ? 1.12 : 1,
      );
      this.setPartMatrix(
        this.tail,
        index,
        naturalistic ? -6.05 : -5.95,
        0,
        0,
        tailCant,
        tailAngle,
        0,
        1,
        1,
        1,
      );
      this.setPartMatrix(
        this.dorsalFin,
        index,
        -0.9,
        2.75,
        0,
        0.08,
        0,
        0,
        1,
        0.95,
        1,
      );
      this.setPartMatrix(
        this.leftFin,
        index,
        naturalistic ? 1.25 : 0.35,
        naturalistic ? -0.1 : -0.25,
        naturalistic ? 2.28 : 2.1,
        0.8 + tailAngle * 0.18,
        -0.12,
        -0.3,
        naturalistic ? 0.88 : 0.72,
        naturalistic ? 0.68 : 0.62,
        naturalistic ? 0.84 : 0.72,
      );
      this.setPartMatrix(
        this.rightFin,
        index,
        naturalistic ? 1.25 : 0.35,
        naturalistic ? -0.1 : -0.25,
        naturalistic ? -2.28 : -2.1,
        -0.8 - tailAngle * 0.18,
        0.12,
        -0.3,
        naturalistic ? 0.88 : 0.72,
        naturalistic ? 0.68 : 0.62,
        naturalistic ? 0.84 : 0.72,
      );
      this.setPartMatrix(
        this.leftEye,
        index,
        naturalistic ? 3.85 : 3.82,
        naturalistic ? 2.1 : 0.88,
        naturalistic ? 2.45 : 1.92,
        0,
        0,
        0,
        naturalistic ? 2 : 1,
        naturalistic ? 2 : 1,
        naturalistic ? 2 : 0.52,
      );
      this.setPartMatrix(
        this.rightEye,
        index,
        naturalistic ? 3.85 : 3.82,
        naturalistic ? 2.1 : 0.88,
        naturalistic ? -2.45 : -1.92,
        0,
        0,
        0,
        naturalistic ? 2 : 1,
        naturalistic ? 2 : 1,
        naturalistic ? 2 : 0.52,
      );
    }

    for (const mesh of this.fishMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.updateHTMLTargetPopulations(agents);
    this.htmlRenderer.render(this.htmlScene, this.camera);
  }

  getPerformanceInfo(): GoldfishPerformanceInfo {
    return {
      drawCalls: this.renderer.info.render.calls,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      triangles: this.renderer.info.render.triangles,
    };
  }

  dispose() {
    this.disposed = true;
    for (const mesh of this.fishMeshes) {
      mesh.geometry.dispose();
    }
    this.mediaCells.geometry.dispose();
    this.mediaMaterial.dispose();
    for (const texture of this.mediaAtlasTextures.values()) {
      texture.dispose();
    }
    this.floor.geometry.dispose();
    this.floorMaterial.dispose();
    this.fieldTexture.dispose();
    this.bodyMaterial.dispose();
    this.finMaterial.dispose();
    this.eyeMaterial.dispose();
    this.renderer.dispose();
    for (const target of this.htmlTargets.values()) {
      target.object.removeFromParent();
      target.fieldset.remove();
    }
    this.htmlTargets.clear();
    this.htmlRenderer.domElement.remove();
  }
}
