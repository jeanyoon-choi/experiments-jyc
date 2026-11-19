// The reactions in 3D, in the goldfish scene (its camera, its lights, its
// canvas): each glyph extruded and puffed — its bevel starts inside the outline
// and swells out to it, so the face is rounded like a balloon rather than a
// flat cap — in a glossy coat that mirrors a soft studio. One instanced mesh per
// kind; nothing is drawn while none is showing.
//
// A reaction pops up from a quarter of its size with a slight overshoot, rises
// and drifts, rocks a little about the screen's vertical so the light rolls
// over its volume, and at the end shrinks away (the heart beats once, the thumb
// nods).

import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { reactionPath, REACTION_COLOURS } from "./glyphs";
import type { ReactionKind, ReactionParameters } from "./reactions";
import { MOST_REACTIONS, type LiveReaction } from "./reaction-state";

const KINDS: readonly ReactionKind[] = ["heart", "like", "comment"];

/** Per kind, in the glyph's 24-unit box: how deep the puff is and how far in from the outline it starts. */
const PUFF: Record<ReactionKind, { puff: number; depth: number }> = {
  heart: { puff: 4.6, depth: 0.4 },
  like: { puff: 1.2, depth: 0.6 },
  comment: { puff: 5.6, depth: 0.4 },
};

/** Above the goldfish (they swim at height 10). */
const HEIGHT = 40;

/** The glyph puffed into a solid, facing the camera (up the scene's y), centred, its longest side 1. */
function glyphGeometry(kind: ReactionKind) {
  const { puff, depth } = PUFF[kind];
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${reactionPath(kind)}"/></svg>`);
  const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: true,
    bevelThickness: puff,
    bevelSize: puff,
    bevelOffset: -puff,
    bevelSegments: 7,
    curveSegments: 14,
    steps: 1,
  });
  // SVG y runs down the screen, as the scene's z does; the extrusion goes away from the camera.
  geometry.rotateX(Math.PI / 2);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const centre = box.getCenter(new THREE.Vector3());
  geometry.translate(-centre.x, -centre.y, -centre.z);
  const longest = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  geometry.scale(1 / longest, 1 / longest, 1 / longest);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The studio the coat mirrors. The camera looks straight down, so a face
 * turned to it sees the zenith (the top rows) and a rim the horizon: a light
 * ceiling fading to a dim room rounds the glyphs off with dark rims, as on the
 * bubbles, and a softbox off to the upper left puts a highlight on each.
 */
function studio(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#ffffff");
  sky.addColorStop(0.2, "#d4d8dc");
  sky.addColorStop(0.42, "#43474c");
  sky.addColorStop(1, "#141517");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
  // The softbox: a bright rounded window up and to one side.
  const glow = context.createRadialGradient(84, 26, 2, 84, 26, 30);
  glow.addColorStop(0, "#ffffff");
  glow.addColorStop(0.55, "#ffffffcc");
  glow.addColorStop(1, "#ffffff00");
  context.fillStyle = glow;
  context.fillRect(40, 0, 90, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  generator.dispose();
  texture.dispose();
  return target;
}

function smooth(from: number, to: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** Size over a reaction's life (0–1): pop with an overshoot, settle, (heart) beat, shrink away. */
function scaleAt(kind: ReactionKind, age: number) {
  let scale = 0.25 + (1.16 - 0.25) * smooth(0, 0.12, age);
  scale += (0.95 - 1.16) * smooth(0.12, 0.22, age) + (1 - 0.95) * smooth(0.22, 0.3, age);
  if (kind === "heart") scale += 0.13 * smooth(0.4, 0.47, age) - 0.13 * smooth(0.47, 0.54, age);
  return scale * (1 - smooth(0.76, 1, age));
}

export class ReactionMeshes {
  private readonly environment: THREE.WebGLRenderTarget;
  private readonly meshes: Record<ReactionKind, THREE.InstancedMesh>;
  private readonly materials: THREE.MeshPhysicalMaterial[] = [];
  private readonly pose = new THREE.Object3D();

  constructor(parent: THREE.Object3D, renderer: THREE.WebGLRenderer) {
    this.environment = studio(renderer);
    const meshes = {} as Record<ReactionKind, THREE.InstancedMesh>;
    for (const kind of KINDS) {
      const material = new THREE.MeshPhysicalMaterial({
        color: REACTION_COLOURS[kind],
        roughness: 0.22,
        metalness: 0.6,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMap: this.environment.texture,
        envMapIntensity: 1.6,
      });
      this.materials.push(material);
      const mesh = new THREE.InstancedMesh(glyphGeometry(kind), material, MOST_REACTIONS);
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      parent.add(mesh);
      meshes[kind] = mesh;
    }
    this.meshes = meshes;
  }

  /** Places the live reactions for this frame, in a field `width` × `height` (CSS px). */
  update(live: readonly LiveReaction[], time: number, parameters: ReactionParameters, width: number, height: number) {
    const counts = { heart: 0, like: 0, comment: 0 };
    const pose = this.pose;
    for (const reaction of live) {
      const age = Math.min(1, Math.max(0, (time - reaction.born) / parameters.duration));
      const lift = 1 - (1 - age) * (1 - age);
      const scale = scaleAt(reaction.kind, age) * reaction.size;
      if (scale <= 0.01) continue;
      // In the plane: the tilt it pops with settles; the thumb nods.
      let tilt = reaction.tilt * (1 + 0.8 * (1 - smooth(0, 0.3, age)));
      if (reaction.kind === "like") tilt += -0.24 * smooth(0.3, 0.4, age) + 0.33 * smooth(0.4, 0.5, age) - 0.09 * smooth(0.5, 0.58, age);
      // Out of the plane: it rocks about the screen's vertical, so its sides catch the light.
      const rock = reaction.rock * Math.sin(age * Math.PI * 1.6);
      pose.position.set(reaction.x + reaction.drift * lift - width / 2, HEIGHT, reaction.y - reaction.rise * lift - height / 2);
      pose.rotation.set(0, -tilt, rock, "YZX");
      pose.scale.setScalar(scale);
      pose.updateMatrix();
      const mesh = this.meshes[reaction.kind];
      mesh.setMatrixAt(counts[reaction.kind]++, pose.matrix);
    }
    for (const kind of KINDS) {
      const mesh = this.meshes[kind];
      mesh.count = counts[kind];
      if (counts[kind] > 0) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    for (const kind of KINDS) {
      this.meshes[kind].geometry.dispose();
      this.meshes[kind].removeFromParent();
      this.meshes[kind].dispose();
    }
    for (const material of this.materials) material.dispose();
    this.environment.dispose();
  }
}
