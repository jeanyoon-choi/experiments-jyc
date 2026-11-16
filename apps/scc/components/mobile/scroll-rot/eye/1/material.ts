import * as THREE from "three";
import { MAX_SEEDS, RADIUS } from "./rot";
import { NOISE_SPAN } from "./noise";
import { IRIS_RADIUS, IRIS_Z, LIMBUS, PUPIL_RADIUS } from "./globe";

// Ashima 3D simplex noise (MIT). The fragment shader evaluates it twice (the two vessel lines); the slow
// fields are computed per vertex and the fine grain comes from a 3D texture of the same noise (noise.ts).
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

// One material, no textures. The white, its vessels, the iris seen through the cornea (refracted onto a
// flat disc behind it, so it has depth and slides as the eye turns), the pupil, and what rot does to each.
export function eyeMaterial(noise: THREE.Data3DTexture) {
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
    envMapIntensity: 0.3,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSeeds = uniforms.uSeeds;
    shader.uniforms.uDecay = uniforms.uDecay;
    shader.uniforms.uNoise = { value: noise };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec4 uSeeds[${MAX_SEEDS}];
        uniform float uDecay;
        varying vec3 vObj;
        varying vec3 vObjN;
        varying vec3 vAxis;
        varying float vRot;
        varying vec3 vWarp;
        varying vec2 vLow;
        ${NOISE}`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        vObj = position;
        vObjN = normal;
        vAxis = normalMatrix * vec3(0.0, 0.0, 1.0);
        {
          // slow fields, smooth at vertex spacing: vessel warp, flush, yellowing
          vec3 lp = position * 16.0;
          vWarp = vec3(snoise(lp + 3.1), snoise(lp + 7.7), snoise(lp + 1.3));
          vLow = vec2(snoise(position * 14.0 + 9.0), snoise(position * 26.0 + 2.0));
        }
        {
          // ragged patch edges: the same noise widens every patch's boundary
          float edge = snoise(position * 40.0) * 0.011 + snoise(position * 95.0) * 0.005;
          float rot = 0.0;
          for (int i = 0; i < ${MAX_SEEDS}; i++) {
            vec4 s = uSeeds[i];
            if (s.w <= 0.0) continue;
            float d = distance(position, s.xyz) + edge * min(1.0, s.w / 0.02);
            rot = max(rot, 1.0 - smoothstep(s.w * 0.3, s.w, d));
          }
          vRot = rot;
          // rotten tissue caves in; late, the whole globe loses its pressure and puckers
          float sink = pow(rot, 1.4) * (0.004 + 0.002 * snoise(position * 55.0));
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
        varying float vRot;
        varying vec3 vWarp;
        varying vec2 vLow;
        uniform highp sampler3D uNoise;
        ${NOISE}
        // four decorrelated channels of baked simplex noise, mirrored every ${NOISE_SPAN} units
        vec4 tnoise(vec3 v){return texture(uNoise, v * ${f(1 / NOISE_SPAN)}) * 2.0 - 1.0;}
        float bVessel; float bCornea; float bHaze; float bAO; float bRot; float bMold; float bGrain; float bPit;`,
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
          vec4 nA = tnoise(P * 140.0); // r: fine mottle, g: rot edge
          vec4 nB = tnoise(P * 380.0); // r: rot edge, fine
          vec4 nC = tnoise(P * 300.0); // r: rot pitting
          vec4 nD = tnoise(P * 570.0); // r: mould specks, g: grain
          bGrain = nD.g;
          bPit = nC.r;

          // --- the white: porcelain with a little grey-blue, vessels gathering away from the cornea
          vec3 white = mix(vec3(0.70, 0.655, 0.61), vec3(0.64, 0.64, 0.655), 0.5 + 0.5 * nA.r);
          // never a clean white: a faint rose warms it toward the equator and the back
          white = mix(white, vec3(0.66, 0.50, 0.46), 0.22 * mix(1.0, smoothstep(${f(LIMBUS * 1.2)}, ${f(RADIUS)}, rho), front) * (0.6 + 0.4 * vLow.y));
          float away = mix(1.0, smoothstep(${f(LIMBUS * 1.05)}, ${f(LIMBUS * 2.3)}, rho), front);
          float v1 = abs(snoise(P * 30.0 + vWarp * 1.3));
          float v2 = abs(snoise(P * 78.0 + vWarp * 2.2 + 5.0));
          float trunk = 1.0 - smoothstep(0.03 + 0.035 * uDecay, 0.03 + 0.035 * uDecay + 1.5 * fwidth(v1), v1);
          float cap = 1.0 - smoothstep(0.018 + 0.03 * uDecay, 0.018 + 0.03 * uDecay + 1.5 * fwidth(v2), v2);
          // a fresh eye shows a few vessels; they multiply and the white flushes as the reels pile up
          // vessels run a way and stop: the lines are broken where a slow field says so, less as the eye reddens
          float runs = smoothstep(0.15 - 0.6 * uDecay, 0.5 - 0.6 * uDecay, vWarp.y * 0.6 + vLow.y * 0.6);
          float vessels = away * clamp(trunk * runs + cap * (0.15 + 0.85 * uDecay) * mix(runs, 1.0, uDecay), 0.0, 1.0);
          vec3 sclera = mix(white, vec3(0.60, 0.44, 0.17), uDecay * uDecay * 0.85 * (0.65 + 0.35 * vLow.y));
          sclera = mix(sclera, vec3(0.62, 0.20, 0.18), smoothstep(-0.2, 0.7, vLow.x) * uDecay * 0.5 * away);
          sclera = mix(sclera, mix(vec3(0.42, 0.035, 0.045), vec3(0.24, 0.04, 0.07), uDecay), vessels * 0.9);
          // the cut optic nerve at the back
          float stump = (1.0 - front) * (1.0 - smoothstep(${f(1.7 * MM)}, ${f(2.1 * MM)}, rho));
          float sheath = (1.0 - front) * (1.0 - smoothstep(${f(2.1 * MM)}, ${f(2.9 * MM)}, rho));
          sclera = mix(sclera, vec3(0.42, 0.30, 0.27), sheath * 0.7);
          sclera = mix(sclera, vec3(0.78, 0.66, 0.50), stump);
          // the limbus: the white greys and darkens into the cornea's edge
          float limbal = front * smoothstep(${f(LIMBUS * 1.32)}, ${f(LIMBUS)}, rho);
          sclera = mix(sclera, sclera * vec3(0.62, 0.64, 0.70), limbal * 0.6);
          bVessel = vessels * (1.0 - cornea);

          // --- the iris, seen through the cornea: the view ray bends at the surface and meets a flat disc
          vec3 V = normalize(P - cameraPosition);
          vec3 R = refract(V, normalize(vObjN), ${f(1 / 1.376)});
          vec2 hit = P.xy + R.xy * ((${f(IRIS_Z)} - P.z) / min(R.z, -0.05));
          float r = length(hit);
          float rn = r * ${f(1 / IRIS_RADIUS)};
          vec2 dir = hit / max(r, 1e-5);
          // fibres: noise stretched along the radius, wrapped round the pupil without a seam
          vec4 f1 = tnoise(vec3(dir * 7.0 + vec2(4.3, 1.7), rn * 0.5));
          vec4 f2 = tnoise(vec3(dir * 21.0 + vec2(2.1, 5.9), rn * 1.6 + 3.0));
          vec3 iris = mix(vec3(0.035, 0.10, 0.16), vec3(0.17, 0.31, 0.38), 0.5 + 0.5 * f1.r);
          iris *= 0.6 + 0.7 * (0.5 + 0.5 * f2.r);
          // the collarette: an ochre ring of thicker fibres round the pupil
          float collar = smoothstep(0.62, 0.36, rn) * (0.6 + 0.4 * f2.g);
          iris = mix(iris, vec3(0.34, 0.22, 0.075), collar * 0.8);
          iris = mix(iris, vec3(0.012, 0.02, 0.03), smoothstep(0.72, 0.98, rn) * 0.92);
          float pupil = 1.0 - smoothstep(${f(PUPIL_RADIUS - 0.12 * MM)}, ${f(PUPIL_RADIUS + 0.12 * MM)}, r + f2.b * ${f(0.06 * MM)});
          iris = mix(iris, vec3(0.0015), pupil);
          // the cornea clouds: slowly everywhere, at once under a patch. The pupil goes milky with it.
          float haze = clamp(uDecay * uDecay * 0.8 + vRot * 1.3, 0.0, 1.0);
          bHaze = haze * cornea;
          iris = mix(iris, vec3(0.40, 0.44, 0.40) * (0.9 + 0.1 * nA.r), haze * 0.85);

          vec3 tissue = mix(sclera, iris, cornea);
          bAO = 1.0 - 0.3 * limbal * (1.0 - cornea);

          // --- rot: grey-yellow halo, ochre, olive-brown, black liquefied core, mould specks
          float lum = dot(tissue, vec3(0.3, 0.55, 0.15));
          float rot = clamp(vRot + nB.r * 0.12 + nA.g * 0.1, 0.0, 1.0);
          rot *= step(0.02, vRot);
          bRot = rot;
          vec3 halo = vec3(lum * 1.05, lum * 0.95, lum * 0.62);
          vec3 ochre = vec3(0.36, 0.26, 0.09);
          vec3 olive = vec3(0.12, 0.10, 0.035);
          vec3 ooze = vec3(0.025, 0.02, 0.012);
          vec3 c = mix(tissue, halo, smoothstep(0.02, 0.22, rot));
          c = mix(c, ochre, smoothstep(0.2, 0.42, rot));
          c = mix(c, olive, smoothstep(0.42, 0.66, rot));
          c = mix(c, ooze, smoothstep(0.7, 0.92, rot));
          float speck = smoothstep(0.5, 0.72, nD.r) * smoothstep(0.3, 0.45, rot) * (1.0 - smoothstep(0.7, 0.85, rot));
          bMold = speck;
          c = mix(c, vec3(0.64, 0.68, 0.55), speck * 0.9);
          diffuseColor.rgb = c;
          bAO *= 1.0 - 0.35 * rot;
        }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `#include <roughnessmap_fragment>
        // the iris is matt under its window; the white is smoother; vessels sit wet
        roughnessFactor = mix(roughnessFactor, 0.62, bCornea);
        roughnessFactor = clamp(roughnessFactor - 0.1 * bVessel, 0.18, 1.0);
        // dry crust around the patch, wet black ooze at its heart, chalky mould
        roughnessFactor = mix(roughnessFactor, 0.8, smoothstep(0.2, 0.5, bRot) * (1.0 - smoothstep(0.7, 0.9, bRot)));
        roughnessFactor = mix(roughnessFactor, 0.2, smoothstep(0.75, 0.95, bRot));
        roughnessFactor = mix(roughnessFactor, 0.95, bMold);`,
      )
      .replace(
        "#include <lights_physical_fragment>",
        /* glsl */ `#include <lights_physical_fragment>
        // the iris and pupil have no gloss of their own: every reflection there is the cornea's
        material.specularColor *= 1.0 - 0.92 * bCornea * (1.0 - bHaze);
        material.specularF90 *= 1.0 - 0.92 * bCornea * (1.0 - bHaze);
        material.specularColorBlended *= 1.0 - 0.92 * bCornea * (1.0 - bHaze);
        #ifdef USE_CLEARCOAT
          // the tear film dries with the eye, dulls over a clouded cornea, and breaks on a crust
          material.clearcoatRoughness = clamp(material.clearcoatRoughness + (0.2 * uDecay + 0.3 * bHaze) * (1.0 - smoothstep(0.7, 0.92, bRot)), 0.03, 1.0);
          material.clearcoat *= (1.0 - 0.4 * uDecay * (1.0 - smoothstep(0.7, 0.92, bRot))) * mix(1.0, 0.12, smoothstep(0.2, 0.5, bRot) * (1.0 - smoothstep(0.75, 0.95, bRot))) * (1.0 - bMold);
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
          // grain, raised vessels, rot pitting and mould, as a screen-space bump
          float h = 0.00002 * bGrain + 0.00012 * bVessel + bRot * 0.00035 * bPit + bMold * 0.00012;
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
          float dx = dFdx(h), dy = dFdy(h);
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1) * faceDirection;
          vec3 grad = sign(det) * (dx * r1 + dy * r2);
          normal = normalize(abs(det) * normal - grad);
        }`,
      );
  };
  return { material, uniforms };
}
