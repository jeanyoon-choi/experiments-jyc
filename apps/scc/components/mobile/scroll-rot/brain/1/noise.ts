import * as THREE from "three";
import { NOISE } from "./material";

// The fine grain of the tissue as a texture: simplex noise is baked once, on the GPU, into a 3D
// texture, so a fragment pays four trilinear fetches where the first version evaluated the function nine times.
// Mirrored wrapping keeps it continuous past the baked box (simplex noise does not tile).
export const NOISE_SPAN = 8; // noise units across the texture
const SIZE = 128; // 16 texels per noise unit

export function bakeNoise(renderer: THREE.WebGLRenderer) {
  const target = new THREE.WebGL3DRenderTarget(SIZE, SIZE, SIZE, { depthBuffer: false });
  const texture = target.texture;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.MirroredRepeatWrapping;
  texture.generateMipmaps = false;

  const material = new THREE.ShaderMaterial({
    uniforms: { uZ: { value: 0 } },
    vertexShader: /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uZ;
      ${NOISE}
      void main(){
        vec3 v = vec3(gl_FragCoord.xy / ${SIZE.toFixed(1)}, uZ) * ${NOISE_SPAN.toFixed(1)};
        vec4 n = vec4(snoise(v), snoise(v + 31.7), snoise(v + 67.3), snoise(v + 113.9));
        gl_FragColor = clamp(n * 0.5 + 0.5, 0.0, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const camera = new THREE.Camera();
  const previous = renderer.getRenderTarget();
  for (let z = 0; z < SIZE; z++) {
    material.uniforms.uZ.value = (z + 0.5) / SIZE;
    renderer.setRenderTarget(target, z);
    renderer.render(quad, camera);
  }
  renderer.setRenderTarget(previous);
  quad.geometry.dispose();
  material.dispose();
  return { texture: texture as THREE.Data3DTexture, dispose: () => target.dispose() };
}
