import * as THREE from "three";
import { PLAY_W, RAIL, RAIL_TOP } from "../model/physics";
import type { Table } from "../model/physics";

export type TableMaterials = {
  cloth: THREE.Material;
  /** Rail boards: `wood` has its grain along x, `woodTurned` along y. */
  wood: THREE.Material;
  woodTurned: THREE.Material;
  sight: THREE.Material;
};

/** A slate bed under cloth, sunk between four mitred rail boards with their sights: the cloth runs to the wood. */
export function buildTable(table: Table, materials: TableMaterials) {
  const group = new THREE.Group();
  const hw = PLAY_W / 2;
  const hl = table.length / 2;
  const outerX = hw + RAIL + 0.04;
  const outerY = hl + RAIL + 0.04;

  const bedShape = new THREE.Shape();
  bedShape.moveTo(-outerX, -outerY);
  bedShape.lineTo(outerX, -outerY);
  bedShape.lineTo(outerX, outerY);
  bedShape.lineTo(-outerX, outerY);
  bedShape.closePath();
  const bed = new THREE.Mesh(new THREE.ShapeGeometry(bedShape, 40), materials.cloth);
  bed.receiveShadow = true;
  group.add(bed);

  // Rails: four boards mitred at the corners, each with its grain along its length.
  const innerX = hw;
  const innerY = hl;
  const board = (corners: [number, number][], turned: boolean) => {
    const shape = new THREE.Shape();
    corners.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
    shape.closePath();
    const bevel = 0.003;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: RAIL_TOP - bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: -bevel,
      bevelSegments: 3,
    });
    const mesh = new THREE.Mesh(geometry, turned ? materials.woodTurned : materials.wood);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  for (const s of [-1, 1]) {
    board([[-s * innerX, s * innerY], [s * innerX, s * innerY], [s * outerX, s * outerY], [-s * outerX, s * outerY]], false);
    board([[s * innerX, s * innerY], [s * innerX, -s * innerY], [s * outerX, -s * outerY], [s * outerX, s * outerY]], true);
  }

  // Sights: eighteen, inlaid along the middle of the wood where pool/1 has them.
  const inset = RAIL / 2;
  const sights: [number, number][] = [];
  for (const s of [-1, 1]) {
    for (const k of [-0.5, 0, 0.5]) sights.push([k * hw, s * (hl + inset)]);
    for (const k of [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75]) sights.push([s * (hw + inset), k * hl]);
  }
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.004, 20), materials.sight, sights.length);
  const matrix = new THREE.Matrix4();
  sights.forEach(([x, y], i) => dots.setMatrixAt(i, matrix.makeTranslation(x, y, RAIL_TOP + 0.0002)));
  group.add(dots);

  const dispose = () => {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
  };
  return { group, dispose };
}
