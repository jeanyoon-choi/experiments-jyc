import * as THREE from "three";
import { MAX_SEEDS, RADIUS } from "./rot";
import { NOISE_SPAN } from "./noise";
import { IRIS_RADIUS, IRIS_Z, LIMBUS } from "./globe";

// Ashima 3D simplex noise (MIT), used per vertex and to bake the grain texture (noise.ts). The fragment
// shader evaluates none: its matter is a photograph (the iris), grown vessels (vessels.ts) and baked grain.
export const NOISE = /* glsl */ `
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

export type EyeUniforms = {
  uSeeds: { value: Float32Array };
  uDecay: { value: number };
};

const f = (n: number) => n.toFixed(6);
const MM = RADIUS / 12;

// One material. The iris is a macro photograph of a real one (public/images/scroll-rot/iris.webp), seen
// through the cornea: the view ray bends at the surface and meets a flat disc behind it, so the iris
// has depth and slides under the dome as the eye turns. The vessels of the white are grown (vessels.ts).
export function eyeMaterial(noise: THREE.Data3DTexture, iris: THREE.Texture, vessels: THREE.Texture) {
  const uniforms: EyeUniforms = {
    uSeeds: { value: new Float32Array(MAX_SEEDS * 4) },
    uDecay: { value: 0 },
  };
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMapIntensity: 0.5,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSeeds = uniforms.uSeeds;
    shader.uniforms.uDecay = uniforms.uDecay;
    shader.uniforms.uNoise = { value: noise };
    shader.uniforms.uIris = { value: iris };
    shader.uniforms.uVessels = { value: vessels };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec4 uSeeds[${MAX_SEEDS}];
        uniform float uDecay;
        varying vec3 vObj;
        varying vec3 vObjN;
        varying vec3 vAxis;
        varying vec3 vEye;
        varying float vRot;
        varying vec2 vLow;
        ${NOISE}`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        vObj = position;
        vObjN = normal;
        vAxis = normalMatrix * vec3(0.0, 0.0, 1.0);
        vEye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz; // the globe turns in its pivot: the viewer, in the globe's own frame
        {
          // slow fields, smooth at vertex spacing: flush, yellowing
          vLow = vec2(snoise(position * 14.0 + 9.0), snoise(position * 26.0 + 2.0));
          // no eye is a ball: the globe is very slightly uneven
          transformed += objectNormal * 0.0007 * snoise(position * 9.0 + 5.0);
        }
        {
          // ragged patch edges: the same noise widens every patch's boundary
          float edge = snoise(position * 22.0) * 0.016 + snoise(position * 60.0) * 0.006;
          float rot = 0.0;
          for (int i = 0; i < ${MAX_SEEDS}; i++) {
            vec4 s = uSeeds[i];
            if (s.w <= 0.0) continue;
            float d = distance(position, s.xyz) + edge * min(1.0, s.w / 0.02);
            rot = max(rot, 1.0 - smoothstep(s.w * 0.05, s.w * 1.15, d));
          }
          vRot = rot;
          // rotten tissue caves in; late, the whole globe loses its pressure and puckers
          float sink = pow(rot, 1.6) * (0.0035 + 0.0015 * snoise(position * 55.0));
          float sag = uDecay * uDecay * uDecay * (0.003 + 0.007 * (0.5 + 0.5 * snoise(position * 24.0 + 2.0)));
          transformed -= objectNormal * (sink + sag);
        }`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uDecay;
        varying vec3 vObj;
        varying vec3 vObjN;
        varying vec3 vAxis;
        varying vec3 vEye;
        varying float vRot;
        varying vec2 vLow;
        uniform highp sampler3D uNoise;
        uniform sampler2D uIris;
        uniform sampler2D uVessels;
        // four decorrelated channels of baked simplex noise, mirrored every ${NOISE_SPAN} units
        vec4 tnoise(vec3 v){return texture(uNoise, v * ${f(1 / NOISE_SPAN)}) * 2.0 - 1.0;}
        float bVessel; float bCornea; float bHaze; float bAO; float bRot; float bFilm; float bGrain; float bPit;`,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
        {
          vec3 P = vObj;
          float rho = length(P.xy);
          float front = step(0.0, P.z);
          float cornea = front * (1.0 - smoothstep(${f(LIMBUS - 0.45 * MM)}, ${f(LIMBUS + 0.35 * MM)}, rho));
          bCornea = cornea;
          vec4 nA = tnoise(P * 140.0); // r: fine mottle, g: stain edge
          vec4 nC = tnoise(P * 300.0); // r: wrinkling of dried tissue
          vec4 nD = tnoise(P * 570.0); // g: grain
          vec4 nF = tnoise(P * 34.0); // r, g: the unevenness of the tear film
          bGrain = nD.g;
          bPit = nC.r;
          bFilm = nF.r + 0.5 * nF.g;

          // --- the white. Vessels are read from the grown map, polar about the eye's axis.
          vec3 dirP = normalize(P);
          vec2 vuv = vec2(atan(P.y, P.x) * 0.15915494 + 0.5, 1.0 - acos(clamp(dirP.z, -1.0, 1.0)) * 0.31830989);
          vec3 vs = texture(uVessels, vuv).rgb;
          float red = uDecay; // how bloodshot
          float surface = vs.r * (0.8 + 0.2 * red) + vs.b * smoothstep(0.0, 0.55, red);
          float deep = vs.g;
          vec3 white = mix(vec3(0.86, 0.83, 0.80), vec3(0.80, 0.81, 0.84), 0.5 + 0.5 * nA.r);
          // never a clean white: a faint rose warms it toward the equator and the back
          float back = mix(1.0, smoothstep(${f(LIMBUS * 1.2)}, ${f(RADIUS)}, rho), front);
          white = mix(white, vec3(0.80, 0.62, 0.58), 0.2 * back * (0.6 + 0.4 * vLow.y));
          vec3 sclera = mix(white, vec3(0.66, 0.50, 0.22), red * red * 0.75 * (0.65 + 0.35 * vLow.y));
          // blood leaks under the surface where vessels crowd: a soft red that pools, then spreads
          float bleed = smoothstep(0.25, 0.9, vs.b + vs.r + 0.5 * vLow.x) * smoothstep(0.15, 0.9, red);
          sclera = mix(sclera, vec3(0.60, 0.10, 0.09), max(smoothstep(-0.2, 0.7, vLow.x) * red * 0.4 * back, bleed * 0.6));
          // deep vessels show through the tissue, blue-violet and soft; the surface ones lie on it, sharp
          sclera = mix(sclera, sclera * vec3(0.72, 0.62, 0.78), clamp(deep * 1.4, 0.0, 1.0) * 0.55);
          sclera = mix(sclera, mix(vec3(0.50, 0.035, 0.04), vec3(0.26, 0.04, 0.06), red), clamp(surface, 0.0, 1.0) * 0.92);
          // the cut optic nerve at the back
          float stump = (1.0 - front) * (1.0 - smoothstep(${f(1.7 * MM)}, ${f(2.1 * MM)}, rho));
          float sheath = (1.0 - front) * (1.0 - smoothstep(${f(2.1 * MM)}, ${f(2.9 * MM)}, rho));
          sclera = mix(sclera, vec3(0.42, 0.30, 0.27), sheath * 0.7);
          sclera = mix(sclera, vec3(0.78, 0.66, 0.50), stump);
          // the limbus: the white greys into the cornea's edge
          float limbal = front * smoothstep(${f(LIMBUS * 1.3)}, ${f(LIMBUS)}, rho);
          sclera = mix(sclera, sclera * vec3(0.60, 0.62, 0.68), limbal * 0.55);
          bVessel = clamp(surface, 0.0, 1.0) * (1.0 - cornea);

          // --- the iris, seen through the cornea
          vec3 V = normalize(P - vEye);
          vec3 R = refract(V, normalize(vObjN), ${f(1 / 1.376)});
          vec2 hit = P.xy + R.xy * ((${f(IRIS_Z)} - P.z) / min(R.z, -0.05));
          float rn = length(hit) * ${f(1 / IRIS_RADIUS)};
          // the photograph's lit iris ends at 0.88 of its frame; past that it falls to black, the limbal ring
          vec3 iris = texture(uIris, hit * ${f(0.44 / IRIS_RADIUS)} + 0.5).rgb;
          iris *= 1.0 - smoothstep(1.0, 1.12, rn);
          // the cornea clouds: slowly everywhere, at once under a stain. The pupil goes milky with it.
          float haze = clamp(red * red * red * 0.85 + vRot * 1.2, 0.0, 1.0);
          bHaze = haze * cornea;
          iris = mix(iris, vec3(0.36, 0.40, 0.38) * (0.9 + 0.1 * nA.r), haze * 0.85);

          vec3 tissue = mix(sclera, iris, cornea);
          bAO = 1.0 - 0.3 * limbal * (1.0 - cornea);

          // --- rot is a stain, not a growth: tissue dying from within. Yellowed at its edge, then the red of
          // blood let loose, then dark, then black-green and wet. It runs ahead along the vessels.
          float rot = vRot + (vs.r + 0.6 * vs.g + 0.4 * vs.b) * 0.3 * smoothstep(0.0, 0.35, vRot) + nA.g * 0.06 * step(0.01, vRot);
          rot = clamp(rot, 0.0, 1.0);
          bRot = rot;
          vec3 c = mix(tissue, tissue * vec3(0.86, 0.70, 0.42), smoothstep(0.0, 0.25, rot));
          c = mix(c, vec3(0.42, 0.045, 0.04), smoothstep(0.12, 0.45, rot)); // blood let into the tissue
          c = mix(c, vec3(0.13, 0.018, 0.03), smoothstep(0.4, 0.7, rot)); // gone dark
          c = mix(c, vec3(0.03, 0.035, 0.022), smoothstep(0.68, 0.95, rot)); // black, with green in it
          diffuseColor.rgb = c;
          bAO *= 1.0 - 0.3 * rot;
        }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `#include <roughnessmap_fragment>
        // the iris is matt under its window; the white is smoother
        roughnessFactor = mix(roughnessFactor, 0.62, bCornea);
        roughnessFactor = mix(roughnessFactor, 0.55, smoothstep(0.15, 0.6, bRot));`,
      )
      .replace(
        "#include <lights_physical_fragment>",
        /* glsl */ `#include <lights_physical_fragment>
        // the iris and pupil have no gloss of their own: every reflection there is the cornea's
        material.specularColor *= 1.0 - 0.92 * bCornea * (1.0 - bHaze);
        material.specularF90 *= 1.0 - 0.92 * bCornea * (1.0 - bHaze);
        material.specularColorBlended *= 1.0 - 0.92 * bCornea * (1.0 - bHaze);
        #ifdef USE_CLEARCOAT
          // the tear film dries with the eye and dulls over a clouded cornea; dead tissue weeps and stays wet
          material.clearcoatRoughness = clamp(material.clearcoatRoughness + 0.16 * uDecay + 0.3 * bHaze + 0.12 * smoothstep(0.15, 0.6, bRot), 0.03, 1.0);
          material.clearcoat *= 1.0 - 0.35 * uDecay * (1.0 - smoothstep(0.3, 0.7, bRot));
        #endif`,
      )
      .replace(
        "#include <aomap_fragment>",
        /* glsl */ `#include <aomap_fragment>
        reflectedLight.indirectDiffuse *= bAO;
        reflectedLight.directDiffuse *= mix(1.0, bAO, 0.6);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        {
          // under the cornea the lit surface is the iris, a flat disc: only the tear film keeps the dome
          normal = normalize(mix(normal, normalize(vAxis) * faceDirection, bCornea * (1.0 - bRot) * 0.85));
          // grain, raised vessels and the wrinkling of dried tissue, as a screen-space bump
          float h = 0.00002 * bGrain + 0.0001 * bVessel + bRot * 0.00016 * bPit;
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1) * faceDirection;
          vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
          normal = normalize(abs(det) * normal - grad);
        }`,
      )
      .replace(
        "#include <clearcoat_normal_fragment_maps>",
        /* glsl */ `#include <clearcoat_normal_fragment_maps>
        #ifdef USE_CLEARCOAT
        {
          // the tear film is a liquid skin of uneven depth: its highlights wobble and break
          float film = 0.00028 * bFilm * (1.0 - 0.75 * bCornea) + 0.00012 * bVessel;
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
          vec3 c1 = cross(sy, clearcoatNormal), c2 = cross(clearcoatNormal, sx);
          float cdet = dot(sx, c1) * faceDirection;
          vec3 cgrad = sign(cdet) * (dFdx(film) * c1 + dFdy(film) * c2);
          clearcoatNormal = normalize(abs(cdet) * clearcoatNormal - cgrad);
        }
        #endif`,
      );
  };
  return { material, uniforms };
}
