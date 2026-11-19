// How far (CSS px) past its own radius a bubble is drawn: its anti-aliased
// edge and, when the ground reacts (groundHalo 1), its halo there. The same
// in every program.
export const HALO = /* glsl */ `
uniform float groundHalo;
float haloOf(float r) {
  return 2.0 + groundHalo * min(1.2 * r + 4.0, 160.0);
}
`;
