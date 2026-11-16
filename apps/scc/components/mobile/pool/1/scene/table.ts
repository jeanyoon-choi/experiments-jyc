import * as THREE from "three";
import { BALL_R, CUSHION_DEPTH, PLAY_W, POCKET_DEPTH, RAIL, RAIL_TOP, cushionBack } from "../model/physics";
import type { Cushion, Table } from "../model/physics";

export type TableMaterials = {
  cloth: THREE.Material;
  /** Rail boards: `wood` has its grain along x, `woodTurned` along y. */
  wood: THREE.Material;
  woodTurned: THREE.Material;
  pocket: THREE.Material;
  dark: THREE.Material;
  casting: THREE.Material;
  sight: THREE.Material;
};

// The nose meets a ball a little above its middle.
const NOSE_LOW = BALL_R * 1.05;
const NOSE_HIGH = BALL_R * 1.31;
/** The moulded casting that backs each pocket, between the hole and the wood. */
const CASTING = 0.017;
const CASTING_PROUD = 0.003;

/** One strip of cushion: a rubber wedge under cloth, its ends cut back toward the pockets. */
function cushionGeometry(c: Cushion) {
  const back = cushionBack(c);
  // Cross-section, (distance behind the nose, height): undercut, nose, slope up to the rail.
  const profile: [number, number][] = [
    [CUSHION_DEPTH * 0.24, 0.0004],
    [0, NOSE_LOW],
    [0, NOSE_HIGH],
    [CUSHION_DEPTH, RAIL_TOP - 0.001],
    [CUSHION_DEPTH, 0.0004],
  ];
  const at = (end: 0 | 1, [d, z]: [number, number]) => {
    const k = d / CUSHION_DEPTH;
    return end === 0
      ? [c.ax + (back.ax - c.ax) * k, c.ay + (back.ay - c.ay) * k, z]
      : [c.bx + (back.bx - c.bx) * k, c.by + (back.by - c.by) * k, z];
  };
  const positions: number[] = [];
  // Keep every face turned outward whichever way the strip runs.
  const flip = back.tx * c.oy - back.ty * c.ox < 0;
  const tri = (p: number[], q: number[], s: number[]) => {
    for (const v of flip ? [p, s, q] : [p, q, s]) positions.push(v[0], v[1], v[2]);
  };
  for (let i = 0; i < profile.length; i += 1) {
    const j = (i + 1) % profile.length;
    const a0 = at(0, profile[i]);
    const a1 = at(0, profile[j]);
    const b0 = at(1, profile[i]);
    const b1 = at(1, profile[j]);
    tri(a0, b0, b1);
    tri(a0, b1, a1);
  }
  for (let i = 1; i < profile.length - 1; i += 1) {
    tri(at(0, profile[0]), at(0, profile[i]), at(0, profile[i + 1]));
    tri(at(1, profile[0]), at(1, profile[i + 1]), at(1, profile[i]));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const uv: number[] = [];
  for (let i = 0; i < positions.length; i += 3) uv.push(positions[i], positions[i + 1] + positions[i + 2]);
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** The round cut the rail takes at one pocket: where it leaves and rejoins the line behind the cushions. */
type Cut = { x: number; y: number; r: number; hole: number; from: number; to: number; inX: number; inY: number; outX: number; outY: number };

function pocketCuts(table: Table) {
  const hx = PLAY_W / 2 + CUSHION_DEPTH;
  const hy = table.length / 2 + CUSHION_DEPTH;
  const [bl, br, tl, tr, left, right] = table.pockets;
  const reach = (radius: number, d: number) => Math.sqrt(Math.max(0, radius * radius - d * d));
  const cut = (p: { x: number; y: number; radius: number }, where: string): Cut => {
    const r = p.radius + CASTING;
    const sx = reach(r, hx - Math.abs(p.x));
    const sy = reach(r, hy - Math.abs(p.y));
    // Entry and exit of the cut, walking the opening anticlockwise.
    const ends: Record<string, number[]> = {
      bl: [-hx, p.y + sx, p.x + sy, -hy],
      br: [p.x - sy, -hy, hx, p.y + sx],
      right: [hx, p.y - sx, hx, p.y + sx],
      tr: [hx, p.y - sx, p.x - sy, hy],
      tl: [p.x + sy, hy, -hx, p.y - sx],
      left: [-hx, p.y + sx, -hx, p.y - sx],
    };
    const [inX, inY, outX, outY] = ends[where];
    return {
      x: p.x,
      y: p.y,
      r,
      hole: p.radius,
      from: Math.atan2(inY - p.y, inX - p.x),
      to: Math.atan2(outY - p.y, outX - p.x),
      inX,
      inY,
      outX,
      outY,
    };
  };
  return { br: cut(br, "br"), right: cut(right, "right"), tr: cut(tr, "tr"), tl: cut(tl, "tl"), left: cut(left, "left"), bl: cut(bl, "bl") };
}

/** Slate bed under cloth, cushions, four mitred rail boards with their sights, and six pockets with depth. */
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
  for (const pocket of table.pockets) {
    const hole = new THREE.Path();
    hole.absarc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2, true);
    bedShape.holes.push(hole);
  }
  const bed = new THREE.Mesh(new THREE.ShapeGeometry(bedShape, 40), materials.cloth);
  // The bed shades its own holes: only the lamp-side lip of each pocket wall is lit.
  bed.castShadow = true;
  bed.receiveShadow = true;
  group.add(bed);

  for (const cushion of table.cushions) {
    const mesh = new THREE.Mesh(cushionGeometry(cushion), materials.cloth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Rails: four boards mitred at the corners, each with its grain along its length.
  const cuts = pocketCuts(table);
  const q = Math.PI / 4;
  const board = (trace: (shape: THREE.Shape) => void, turned: boolean) => {
    const shape = new THREE.Shape();
    trace(shape);
    shape.closePath();
    const bevel = 0.003;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: RAIL_TOP - bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: -bevel,
      bevelSegments: 3,
      curveSegments: 24,
    });
    const mesh = new THREE.Mesh(geometry, turned ? materials.woodTurned : materials.wood);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const corner = (shape: THREE.Shape, c: Cut, mitre: number, first: boolean) => {
    if (first) shape.absarc(c.x, c.y, c.r, mitre, c.to, false);
    else {
      shape.lineTo(c.inX, c.inY);
      shape.absarc(c.x, c.y, c.r, c.from, mitre, false);
    }
  };
  const side = (shape: THREE.Shape, c: Cut) => {
    shape.lineTo(c.inX, c.inY);
    shape.absarc(c.x, c.y, c.r, c.from, c.to, false);
  };
  board((s) => {
    corner(s, cuts.bl, -3 * q, true);
    corner(s, cuts.br, -q, false);
    s.lineTo(outerX, -outerY);
    s.lineTo(-outerX, -outerY);
  }, false);
  board((s) => {
    corner(s, cuts.br, -q, true);
    side(s, cuts.right);
    corner(s, cuts.tr, q, false);
    s.lineTo(outerX, outerY);
    s.lineTo(outerX, -outerY);
  }, true);
  board((s) => {
    corner(s, cuts.tr, q, true);
    corner(s, cuts.tl, 3 * q, false);
    s.lineTo(-outerX, outerY);
    s.lineTo(outerX, outerY);
  }, false);
  board((s) => {
    corner(s, cuts.tl, 3 * q, true);
    side(s, cuts.left);
    corner(s, cuts.bl, 5 * q, false);
    s.lineTo(-outerX, -outerY);
    s.lineTo(-outerX, outerY);
  }, true);

  // Pocket castings: the black moulding that backs each pocket, standing proud of the wood.
  for (const c of Object.values(cuts)) {
    const band = new THREE.Shape();
    band.absarc(c.x, c.y, c.r + 0.0005, c.from, c.to, false);
    band.absarc(c.x, c.y, c.hole, c.to, c.from, true);
    band.closePath();
    const lip = 0.002;
    const casting = new THREE.Mesh(
      new THREE.ExtrudeGeometry(band, {
        depth: RAIL_TOP + CASTING_PROUD - lip,
        bevelEnabled: true,
        bevelThickness: lip,
        bevelSize: lip,
        bevelOffset: -lip,
        bevelSegments: 3,
        curveSegments: 28,
      }),
      materials.casting,
    );
    casting.castShadow = true;
    casting.receiveShadow = true;
    group.add(casting);
  }

  for (const pocket of table.pockets) {
    const wall = new THREE.CylinderGeometry(pocket.radius, pocket.radius, POCKET_DEPTH, 40, 1, true);
    wall.rotateX(Math.PI / 2);
    // Less of the room reaches the wall the further down it goes.
    const depth = wall.attributes.position;
    const shade = new Float32Array(depth.count * 3);
    for (let i = 0; i < depth.count; i += 1) shade.fill(depth.getZ(i) > 0 ? 1 : 0, i * 3, i * 3 + 3);
    wall.setAttribute("color", new THREE.BufferAttribute(shade, 3));
    const tube = new THREE.Mesh(wall, materials.pocket);
    tube.position.set(pocket.x, pocket.y, -POCKET_DEPTH / 2);
    tube.receiveShadow = true;
    group.add(tube);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(pocket.radius, 40), materials.dark);
    floor.position.set(pocket.x, pocket.y, -POCKET_DEPTH);
    group.add(floor);
  }

  // Sights: three between each pair of pockets, inlaid along the middle of the wood.
  const inset = CUSHION_DEPTH + (RAIL - CUSHION_DEPTH) / 2;
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
