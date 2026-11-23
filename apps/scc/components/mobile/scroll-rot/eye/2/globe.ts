import * as THREE from "three";
import { RADIUS } from "./rot";

// One eyeball: a globe with the cornea raised on its front (+z), in proportion to a 24 mm eye.
// Sclera radius 12 mm; the cornea is a steeper cap, radius 7.8 mm, 11.7 mm across.
const MM = RADIUS / 12;
export const LIMBUS = 5.85 * MM; // the cornea's edge, as a distance from the axis
export const CORNEA_RADIUS = 7.8 * MM;
const LIMBUS_Z = Math.sqrt(RADIUS * RADIUS - LIMBUS * LIMBUS);
export const CORNEA_Z = LIMBUS_Z - Math.sqrt(CORNEA_RADIUS * CORNEA_RADIUS - LIMBUS * LIMBUS); // its centre
export const IRIS_Z = LIMBUS_Z - 0.6 * MM; // the iris, a flat disc behind the cornea
export const IRIS_RADIUS = 5.7 * MM;
export const PUPIL_RADIUS = 1.9 * MM;

export function eyeGeometry() {
  const geometry = new THREE.SphereGeometry(RADIUS, 256, 160);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const blend = 0.5 * MM; // the limbal furrow is a soft turn, not a crease
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const rho = Math.hypot(x, y);
    if (z <= 0 || rho >= LIMBUS + blend) continue;
    const inside = Math.min(rho, LIMBUS);
    const cz = CORNEA_Z + Math.sqrt(CORNEA_RADIUS * CORNEA_RADIUS - inside * inside);
    const t = THREE.MathUtils.smoothstep(rho, LIMBUS - blend, LIMBUS + blend); // 0 cornea, 1 sclera
    const nz = THREE.MathUtils.lerp(cz, z, t);
    position.setZ(i, nz);
    // normals: the cornea's own sphere, turning into the globe's across the furrow
    const cn = new THREE.Vector3(x, y, nz - CORNEA_Z).normalize();
    const sn = new THREE.Vector3(x, y, z).normalize();
    cn.lerp(sn, t).normalize();
    normal.setXYZ(i, cn.x, cn.y, cn.z);
  }
  geometry.deleteAttribute("uv");
  geometry.computeBoundingSphere();
  return geometry;
}
