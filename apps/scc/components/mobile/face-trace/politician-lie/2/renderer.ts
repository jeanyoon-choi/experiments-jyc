import { drawTaegeuk } from "./flag";
import { OUTLINE_POINTS, type Cover, type MouthShape } from "./mouth";
import { NOSE_HEIGHT, NOSE_WIDTH, type Nose } from "./nose";

// One full-screen pass: the mirrored camera, and inside the opening between
// the lips, the clip. Only pixels within the mouth's bounding box walk the
// outline, so the rest of the screen costs one texture read. Inside the
// nostrils, the 태극: only pixels within the nose's box read their mask.
const VERTEX = `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
const int COUNT = ${OUTLINE_POINTS};
uniform sampler2D uCamera;
uniform sampler2D uClip;
uniform vec2 uResolution;
uniform vec4 uCover;      // camera image on the canvas: offset, size
uniform vec2 uOutline[COUNT];
uniform vec4 uBounds;     // min, max of the outline, padded
uniform vec2 uCenter;
uniform vec2 uAxis;
uniform vec2 uClipSize;   // the clip's drawn size along and across the mouth
uniform float uClipFocus; // clip row (0 top, 1 bottom) at the mouth centre
uniform float uOpen;
uniform float uFeather;
uniform float uShade;
uniform sampler2D uNose;    // how much of each cell of the nose's box is nostril
uniform sampler2D uFlag;
uniform vec4 uNoseRect;     // the box in the camera frame: offset, size
uniform vec4 uNostril[2];   // each flag on the canvas: centre, drawn size
uniform vec2 uNoseAxis;
uniform float uNoseOn;
uniform float uNoseProbe;
out vec4 outColor;

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 cameraUv = (p - uCover.xy) / uCover.zw;
  cameraUv.x = 1.0 - cameraUv.x;
  vec3 color = texture(uCamera, cameraUv).rgb;

  if (uOpen > 0.0 && all(greaterThan(p, uBounds.xy)) && all(lessThan(p, uBounds.zw))) {
    // Signed distance to the closed outline, negative inside.
    vec2 first = p - uOutline[0];
    float nearest = dot(first, first);
    float side = 1.0;
    for (int i = 0, j = COUNT - 1; i < COUNT; j = i, i++) {
      vec2 edge = uOutline[j] - uOutline[i];
      vec2 offset = p - uOutline[i];
      vec2 away = offset - edge * clamp(dot(offset, edge) / max(dot(edge, edge), 1e-6), 0.0, 1.0);
      nearest = min(nearest, dot(away, away));
      bvec3 crossing = bvec3(p.y >= uOutline[i].y, p.y < uOutline[j].y, edge.x * offset.y > edge.y * offset.x);
      if (all(crossing) || all(not(crossing))) side = -side;
    }
    float distanceToLip = side * sqrt(nearest);
    float inside = smoothstep(uFeather, -uFeather, distanceToLip) * uOpen;
    if (inside > 0.0) {
      vec2 q = p - uCenter;
      vec2 local = vec2(dot(q, uAxis), dot(q, vec2(-uAxis.y, uAxis.x)));
      vec2 clipUv = vec2(0.5, uClipFocus) + local / uClipSize;
      vec3 clip = texture(uClip, clipUv).rgb;
      // The lips shade what sits just behind them.
      clip *= mix(0.45, 1.0, smoothstep(0.0, uShade, -distanceToLip));
      color = mix(color, clip, inside);
    }
  }
  if (uNoseOn > 0.0 || uNoseProbe > 0.0) {
    vec2 cell = (cameraUv - uNoseRect.xy) / uNoseRect.zw;
    if (all(greaterThan(cell, vec2(0.0))) && all(lessThan(cell, vec2(1.0)))) {
      float nostril = texture(uNose, cell).r;
      vec4 one = uNostril[0];
      vec4 other = uNostril[1];
      float toOne = one.z > 0.0 ? length((p - one.xy) / one.zw) : 1e6;
      float toOther = other.z > 0.0 ? length((p - other.xy) / other.zw) : 1e6;
      float inside = smoothstep(0.3, 0.55, nostril) * uNoseOn * step(min(toOne, toOther), 1e5);
      if (inside > 0.0) {
        vec4 own = toOne < toOther ? one : other;
        vec2 q = p - own.xy;
        vec2 local = vec2(dot(q, uNoseAxis), dot(q, vec2(-uNoseAxis.y, uNoseAxis.x)));
        vec3 flag = texture(uFlag, vec2(0.5) + local / own.zw).rgb;
        // The rim of the nostril shades what sits just inside it.
        flag *= mix(0.55, 1.0, smoothstep(0.45, 0.85, nostril));
        color = mix(color, flag, inside);
      }
      if (uNoseProbe > 0.0) color = mix(color, vec3(0.0, 1.0, 0.0), 0.15);
    }
  }
  outColor = vec4(color, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader could not be created");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log ?? "Shader could not be compiled");
  }
  return shader;
}

function createTexture(gl: WebGL2RenderingContext, unit: number) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  return texture;
}

export type MouthRenderer = ReturnType<typeof createMouthRenderer>;

export function createMouthRenderer(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!program) throw new Error("Program could not be created");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Program could not be linked");
  }
  const vertexArray = gl.createVertexArray();
  const camera = createTexture(gl, 0);
  const clip = createTexture(gl, 1);
  const noseMask = createTexture(gl, 2);
  const flag = createTexture(gl, 3);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawTaegeuk());
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  const nostrils = new Float32Array(8);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const locations = {
    camera: uniform("uCamera"),
    clip: uniform("uClip"),
    resolution: uniform("uResolution"),
    cover: uniform("uCover"),
    outline: uniform("uOutline"),
    bounds: uniform("uBounds"),
    center: uniform("uCenter"),
    axis: uniform("uAxis"),
    clipSize: uniform("uClipSize"),
    clipFocus: uniform("uClipFocus"),
    open: uniform("uOpen"),
    feather: uniform("uFeather"),
    shade: uniform("uShade"),
    nose: uniform("uNose"),
    flag: uniform("uFlag"),
    noseRect: uniform("uNoseRect"),
    nostril: uniform("uNostril"),
    noseAxis: uniform("uNoseAxis"),
    noseOn: uniform("uNoseOn"),
    noseProbe: uniform("uNoseProbe"),
  };
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  const upload = (unit: number, texture: WebGLTexture | null, source: TexImageSource) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  };

  return {
    setCamera: (source: TexImageSource) => upload(0, camera, source),
    setClip: (source: TexImageSource) => upload(1, clip, source),
    setNose(mask: Uint8Array) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, noseMask);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, NOSE_WIDTH, NOSE_HEIGHT, 0, gl.RED, gl.UNSIGNED_BYTE, mask);
    },
    /**
     * `open` 0–1 fades the clip in; `clipAspect` is the clip's width over
     * height and `clipFocus` the clip row held at the mouth centre. `nose`
     * with `noseOn` 0–1 fades the flag into the nostrils; `noseProbe` tints
     * the box the nostrils are looked for in.
     */
    draw(cover: Cover, shape: MouthShape, open: number, clipAspect: number, clipFocus: number, pixelRatio: number, nose?: Nose, noseOn = 0, noseProbe = false) {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.bindVertexArray(vertexArray);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, camera);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, clip);
      gl.uniform1i(locations.camera, 0);
      gl.uniform1i(locations.clip, 1);
      gl.uniform2f(locations.resolution, width, height);
      gl.uniform4f(locations.cover, cover.offsetX, cover.offsetY, cover.width, cover.height);
      gl.uniform1f(locations.open, open);
      if (open > 0) {
        const feather = 0.9 * pixelRatio;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let index = 0; index < shape.outline.length; index += 2) {
          minX = Math.min(minX, shape.outline[index]);
          maxX = Math.max(maxX, shape.outline[index]);
          minY = Math.min(minY, shape.outline[index + 1]);
          maxY = Math.max(maxY, shape.outline[index + 1]);
        }
        const pad = feather + 1;
        // The clip covers the opening: pinned to the mouth's width until the
        // opening is taller than the clip's own proportions allow.
        const clipWidth = Math.max(shape.halfWidth * 2, shape.halfHeight * 2 * clipAspect, 1);
        const clipHeight = clipWidth / clipAspect;
        const visible = Math.min(1, shape.halfHeight * 2 / clipHeight);
        const focus = Math.min(1 - visible / 2, Math.max(visible / 2, clipFocus));
        gl.uniform2fv(locations.outline, shape.outline);
        gl.uniform4f(locations.bounds, minX - pad, minY - pad, maxX + pad, maxY + pad);
        gl.uniform2f(locations.center, shape.centerX, shape.centerY);
        gl.uniform2f(locations.axis, shape.axisX, shape.axisY);
        gl.uniform2f(locations.clipSize, clipWidth, clipHeight);
        gl.uniform1f(locations.clipFocus, focus);
        gl.uniform1f(locations.feather, feather);
        gl.uniform1f(locations.shade, Math.max(2 * pixelRatio, shape.halfHeight * 0.3));
      }
      gl.uniform1f(locations.noseOn, nose ? noseOn : 0);
      gl.uniform1f(locations.noseProbe, nose && noseProbe ? 1 : 0);
      if (nose && (noseOn > 0 || noseProbe)) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, noseMask);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, flag);
        gl.uniform1i(locations.nose, 2);
        gl.uniform1i(locations.flag, 3);
        gl.uniform4f(locations.noseRect, nose.rect.x, nose.rect.y, nose.rect.width, nose.rect.height);
        // Each 태극 is a disc around its nostril's box, so the opening shows only
        // its red and blue, upright along the line between the wings.
        nose.nostrils.forEach((nostril, index) => {
          const boxWidth = nostril.halfU * 2 * cover.width;
          const boxHeight = nostril.halfV * 2 * cover.height;
          const flagWidth = nostril.halfU > 0 ? Math.max(Math.hypot(boxWidth, boxHeight), 1) * 1.1 : 0;
          nostrils[index * 4] = cover.offsetX + (1 - nostril.u) * cover.width;
          nostrils[index * 4 + 1] = cover.offsetY + nostril.v * cover.height;
          nostrils[index * 4 + 2] = flagWidth;
          nostrils[index * 4 + 3] = flagWidth;
        });
        gl.uniform4fv(locations.nostril, nostrils);
        let axisX = (nose.wings[0] - nose.wings[2]) * cover.width;
        let axisY = (nose.wings[3] - nose.wings[1]) * cover.height;
        if (axisX < 0) {
          axisX = -axisX;
          axisY = -axisY;
        }
        const length = Math.hypot(axisX, axisY) || 1;
        gl.uniform2f(locations.noseAxis, axisX / length, axisY / length);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteTexture(camera);
      gl.deleteTexture(clip);
      gl.deleteTexture(noseMask);
      gl.deleteTexture(flag);
      gl.deleteVertexArray(vertexArray);
      gl.deleteProgram(program);
    },
  };
}
