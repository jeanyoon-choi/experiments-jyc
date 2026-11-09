import * as THREE from "three";
import { MAX_SEEDS } from "./rot";

// Ashima 3D simplex noise (MIT), object-space tissue, vessels, rot edges and bump.
const NOISE = /* glsl */ `
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

export type BrainUniforms = {
  uSeeds: { value: Float32Array };
  uDecay: { value: number };
};

export function brainMaterial() {
  const uniforms: BrainUniforms = {
    uSeeds: { value: new Float32Array(MAX_SEEDS * 4) },
    uDecay: { value: 0 },
  };
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    sheen: 0.35,
    sheenColor: new THREE.Color("#8a2a24"),
    sheenRoughness: 0.55,
    envMapIntensity: 0.22,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSeeds = uniforms.uSeeds;
    shader.uniforms.uDecay = uniforms.uDecay;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec4 cavity;
        uniform vec4 uSeeds[${MAX_SEEDS}];
        varying vec2 vCav;
        varying vec3 vObj;
        varying float vRot;
        ${NOISE}`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        vCav = cavity.rg;
        vObj = position;
        {
          // ragged patch edges: the same noise widens every patch's boundary
          float edge = snoise(position * 85.0) * 0.006 + snoise(position * 240.0) * 0.0025;
          float rot = 0.0;
          for (int i = 0; i < ${MAX_SEEDS}; i++) {
            vec4 s = uSeeds[i];
            if (s.w <= 0.0) continue;
            float d = distance(position, s.xyz) + edge * min(1.0, s.w / 0.02);
            rot = max(rot, 1.0 - smoothstep(s.w * 0.3, s.w, d));
          }
          vRot = rot;
          // rotten tissue softens and slumps inward, pitted
          float sink = pow(rot, 1.4) * (0.0028 + 0.0018 * snoise(position * 190.0));
          transformed -= objectNormal * sink;
        }`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uDecay;
        varying vec2 vCav;
        varying vec3 vObj;
        varying float vRot;
        ${NOISE}
        float bVessel; float bSulcus; float bTissue; float bAO; float bRot; float bMold;`,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
        {
          vec3 p = vObj * 45.0;
          // domain warp so the veins meander and branch instead of tracing a grid
          vec3 w = vec3(snoise(p * 0.5 + 3.1), snoise(p * 0.5 + 7.7), snoise(p * 0.5 + 1.3));
          float sulc = smoothstep(0.3, 0.85, max(vCav.r, vCav.g * 0.85));
          float deep = smoothstep(0.25, 0.95, vCav.g * 0.6 + vCav.r * 0.6);
          bAO = 1.0 - 0.8 * deep;
          // superficial cortical veins: few, thick, lying in and along the sulci
          float veinA = abs(snoise(p * 0.6 + w * 1.1));
          float core = 1.0 - smoothstep(0.05, 0.05 + 1.5 * fwidth(veinA), veinA);
          float big = core * smoothstep(0.15, 0.6, vCav.g * 0.7 + vCav.r * 0.5);
          bSulcus = sulc;
          float mott = snoise(vObj * 140.0) * 0.5 + snoise(vObj * 31.0) * 0.5;
          bTissue = mott;
          // capillary blush: patches of the pia flushed red, never lines
          float blush = smoothstep(0.1, 0.8, snoise(vObj * 22.0 + 9.0)) * 0.55;
          vec3 crown = vec3(0.56, 0.36, 0.31);
          vec3 crownCool = vec3(0.52, 0.38, 0.35);
          vec3 flush = vec3(0.58, 0.20, 0.18);
          vec3 fold = vec3(0.20, 0.035, 0.04);
          vec3 tissue = mix(crown, crownCool, 0.5 + 0.5 * mott);
          tissue = mix(tissue, flush, blush * (1.0 - uDecay));
          // whole-brain dulling as the reels pile up: pink drains to a grey-yellow
          float lum = dot(tissue, vec3(0.3, 0.55, 0.15));
          tissue = mix(tissue, vec3(lum * 1.05, lum * 0.98, lum * 0.78), uDecay * 0.75);
          tissue = mix(tissue, mix(fold, vec3(0.10, 0.07, 0.04), uDecay * 0.6), sulc);

          // rot: grey-yellow halo, ochre, olive-brown, black liquefied core, mould specks
          float rot = clamp(vRot + snoise(vObj * 380.0) * 0.12 + snoise(vObj * 130.0) * 0.1, 0.0, 1.0);
          rot *= step(0.02, vRot);
          bRot = rot;
          vec3 halo = vec3(lum * 1.1, lum, lum * 0.7);
          vec3 ochre = vec3(0.36, 0.26, 0.09);
          vec3 olive = vec3(0.12, 0.10, 0.035);
          vec3 ooze = vec3(0.025, 0.02, 0.012);
          vec3 r = mix(tissue, halo, smoothstep(0.02, 0.22, rot));
          r = mix(r, ochre, smoothstep(0.2, 0.42, rot));
          r = mix(r, olive, smoothstep(0.42, 0.66, rot));
          r = mix(r, ooze, smoothstep(0.7, 0.92, rot));
          float speck = smoothstep(0.5, 0.72, snoise(vObj * 620.0)) * smoothstep(0.3, 0.45, rot) * (1.0 - smoothstep(0.7, 0.85, rot));
          bMold = speck;
          r = mix(r, vec3(0.64, 0.68, 0.55), speck * 0.9);
          bVessel = big * (1.0 - smoothstep(0.05, 0.3, rot)) * (1.0 - uDecay * 0.5);
          vec3 vein = mix(vec3(0.22, 0.03, 0.07), vec3(0.12, 0.06, 0.07), uDecay);
          diffuseColor.rgb = mix(r, vein, bVessel * 0.92);
          bAO *= 1.0 - 0.35 * rot;
        }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor - 0.18 * bSulcus - 0.15 * bVessel + 0.06 * bTissue, 0.18, 1.0);
        // dry crust around the patch, wet black ooze at its heart, chalky mould
        roughnessFactor = mix(roughnessFactor, 0.78, smoothstep(0.2, 0.5, bRot) * (1.0 - smoothstep(0.7, 0.9, bRot)));
        roughnessFactor = mix(roughnessFactor, 0.2, smoothstep(0.75, 0.95, bRot));
        roughnessFactor = mix(roughnessFactor, 0.95, bMold);`,
      )
      .replace(
        "#include <lights_physical_fragment>",
        /* glsl */ `#include <lights_physical_fragment>
        #ifdef USE_SHEEN
          material.sheenColor *= (1.0 - bRot) * (1.0 - 0.6 * uDecay);
        #endif
        #ifdef USE_CLEARCOAT
          material.clearcoat *= mix(1.0, 0.15, smoothstep(0.2, 0.5, bRot) * (1.0 - smoothstep(0.75, 0.95, bRot))) * (1.0 - bMold);
        #endif`,
      )
      .replace(
        "#include <aomap_fragment>",
        /* glsl */ `#include <aomap_fragment>
        // sulcus occlusion from the baked depth: no shadow maps
        reflectedLight.indirectDiffuse *= bAO;
        reflectedLight.indirectSpecular *= bAO;
        reflectedLight.directDiffuse *= mix(1.0, bAO, 0.6);
        reflectedLight.directSpecular *= bAO;
        #ifdef USE_CLEARCOAT
          clearcoatSpecularIndirect *= bAO;
          clearcoatSpecularDirect *= mix(1.0, bAO, 0.7);
        #endif
        #ifdef USE_SHEEN
          sheenSpecularIndirect *= bAO;
        #endif`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        {
          // tissue grain, raised vessels, rot pitting and mould, as a screen-space bump
          float h = 0.00004 * snoise(vObj * 520.0) + 0.00025 * bVessel
            + bRot * 0.00035 * snoise(vObj * 300.0) + bMold * 0.00012;
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
