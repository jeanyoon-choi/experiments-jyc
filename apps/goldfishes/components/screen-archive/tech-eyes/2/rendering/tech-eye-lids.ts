import * as THREE from "three";

/** Separate add-on: baseline eyeball geometry/materials are untouched. */
export function createEyeLids(count: number) {
  const columns = 32, rows = 8;
  const positions: number[] = [], uvs: number[] = [], sides: number[] = [], indices: number[] = [];
  for (let side = 0; side < 2; side++) {
    const offset = positions.length / 3;
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
      positions.push(x / columns * 2 - 1, y / rows, 0);
      uvs.push(x / columns, y / rows); sides.push(side);
    }
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const a = offset + y * (columns + 1) + x, b = a + columns + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("lidSide", new THREE.Float32BufferAttribute(sides, 1));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const openness = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1);
  openness.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute("lidOpen", openness);
  const material = new THREE.MeshPhysicalMaterial({
    color: "#bba99b", roughness: 0.58, metalness: 0, clearcoat: 0.22,
    clearcoatRoughness: 0.32, side: THREE.DoubleSide, envMapIntensity: 0.2,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute float lidSide; attribute float lidOpen;
      varying vec2 lidUv; varying float lidTop;
      vec3 lidPoint(){
        float x=uv.x*2.-1.; float arc=sqrt(max(0.,1.-x*x));
        float closed=-.40*arc;
        float opening=smoothstep(0.,1.,lidOpen);
        float edge=mix(closed, lidSide<.5 ? .87*arc : -.90*arc, opening);
        float y=lidSide<.5 ? mix(edge,arc,uv.y) : mix(-arc,edge,uv.y);
        float z=sqrt(max(0.,1.-x*x-y*y))*1.18+.014;
        return vec3(x*.985,y*.985,z);
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>",
      "vec3 lidP=lidPoint(); vec3 objectNormal=normalize(vec3(lidP.xy,lidP.z/(1.18*1.18)));\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(tangent.xyz);\n#endif");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
      "vec3 transformed=lidP; lidUv=uv; lidTop=lidSide;");
    shader.fragmentShader = "varying vec2 lidUv; varying float lidTop;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      float edge=lidTop<.5 ? lidUv.y : 1.-lidUv.y;
      float rim=exp(-edge*80.);
      float crease=exp(-pow((edge-.13)*35.,2.))*.05;
      float pore=fract(sin(dot(floor(lidUv*vec2(480.,160.)),vec2(127.1,311.7)))*43758.5453);
      diffuseColor.rgb *= (1.-crease)*(.975+.05*pore);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.20,.105,.09),rim*.68);
    `);
  };
  material.customProgramCacheKey = () => "tech-eye-lids-v1";
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
  return { mesh, openness, dispose() { mesh.dispose(); geometry.dispose(); material.dispose(); } };
}
