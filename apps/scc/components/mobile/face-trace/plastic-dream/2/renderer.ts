import type { Face } from "./procedures";
import { MAX_KERNELS, PLATEAU, type Kernel } from "./warp";

// One pass: walk the screen point back through every kernel to the photo
// (the same arithmetic as `warp.ts`), then treat the skin where it has been
// pressed. The skin treatment uses only the photo itself: its own mip levels
// as the blur, its own lit areas as the gloss.

export const SKIN_SIZE = 256;

/** The part of the photo on screen: its centre and height, in photo space. */
export type View = { x: number; y: number; height: number };
const GUARDS = 3;

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_photo;
uniform vec3 u_view;
uniform vec2 u_axisX;
uniform vec2 u_axisY;
uniform int u_count;
uniform vec4 u_shape[${MAX_KERNELS}];
uniform vec3 u_param[${MAX_KERNELS}];
uniform vec4 u_guard[${GUARDS}];
uniform sampler2D u_image;
uniform sampler2D u_skin;

out vec4 outputColor;

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 point = u_view.xy + (pixel - 0.5 * u_resolution) / u_resolution.y * u_view.z;

  for (int i = u_count - 1; i >= 0; i--) {
    vec2 delta = point - u_shape[i].xy;
    vec2 q = vec2(dot(delta, u_axisX), dot(delta, u_axisY));
    float t = length(q / u_shape[i].zw);
    if (u_param[i].z > 0.5) {
      point -= u_param[i].xy * exp(-t * t);
    } else if (t < 1.0) {
      q *= mix(u_param[i].xy, vec2(1.0), smoothstep(${PLATEAU.toFixed(2)}, 1.0, t));
      point = u_shape[i].xy + u_axisX * q.x + u_axisY * q.y;
    }
  }

  vec2 uv = vec2(point.x * u_photo.y / u_photo.x, point.y);
  vec3 color = texture(u_image, uv).rgb;

  float pressed = texture(u_skin, uv).r;
  if (pressed > 0.001) {
    float guard = 0.0;
    for (int i = 0; i < ${GUARDS}; i++) {
      vec2 delta = point - u_guard[i].xy;
      vec2 q = vec2(dot(delta, u_axisX), dot(delta, u_axisY)) / u_guard[i].zw;
      guard = max(guard, 1.0 - smoothstep(0.7, 1.0, length(q)));
    }
    pressed *= 1.0 - guard;
    float wax = 1.0 - exp(-0.22 * pressed);

    // Pores and lines go first; edges hold longer, then go too.
    float texel = log2(u_photo.y / 1080.0);
    vec3 soft = textureLod(u_image, uv, texel + 2.6 + 3.2 * wax).rgb;
    vec3 detail = color - soft;
    float edge = smoothstep(0.05, 0.2, length(detail)) * (1.0 - smoothstep(0.55, 1.0, wax));
    color = soft + detail * mix(1.0, edge, wax);

    // Whitening lifts every tone and drains the colour from it.
    color = 1.0 - pow(1.0 - clamp(color, 0.0, 1.0), vec3(1.0 + 0.05 * pressed));
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(luma), 0.3 * wax);

    // Gloss: the places the room's light already reaches, turned up.
    vec3 broad = textureLod(u_image, uv, texel + 4.5).rgb;
    float lit = smoothstep(0.5, 0.85, dot(broad, vec3(0.299, 0.587, 0.114)));
    color += lit * wax * (0.1 + 0.008 * pressed);
  }

  outputColor = vec4(color, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export function createRenderer(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "link");
  }

  const buffer = gl.createBuffer();
  const array = gl.createVertexArray();
  gl.bindVertexArray(array);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const locations = {
    resolution: uniform("u_resolution"),
    photo: uniform("u_photo"),
    view: uniform("u_view"),
    axisX: uniform("u_axisX"),
    axisY: uniform("u_axisY"),
    count: uniform("u_count"),
    shape: uniform("u_shape"),
    param: uniform("u_param"),
    guard: uniform("u_guard"),
    image: uniform("u_image"),
    skin: uniform("u_skin"),
  };

  const image = gl.createTexture();
  const skin = gl.createTexture();
  const photo = { width: 1, height: 1 };
  const shapes = new Float32Array(MAX_KERNELS * 4);
  const params = new Float32Array(MAX_KERNELS * 3);
  const guards = new Float32Array(GUARDS * 4);

  gl.bindTexture(gl.TEXTURE_2D, skin);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, SKIN_SIZE, SKIN_SIZE, 0, gl.RED, gl.FLOAT, new Float32Array(SKIN_SIZE * SKIN_SIZE));

  return {
    setPhoto(source: HTMLCanvasElement) {
      photo.width = source.width;
      photo.height = source.height;
      gl.bindTexture(gl.TEXTURE_2D, image);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    },
    setSkin(values: Float32Array) {
      gl.bindTexture(gl.TEXTURE_2D, skin);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SKIN_SIZE, SKIN_SIZE, gl.RED, gl.FLOAT, values);
    },
    draw(face: Face, kernels: readonly Kernel[], view: View) {
      const { width, height } = gl.canvas;
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.bindVertexArray(array);
      for (let index = 0; index < kernels.length; index += 1) {
        const kernel = kernels[index];
        shapes.set([kernel.cx, kernel.cy, kernel.rx, kernel.ry], index * 4);
        params.set([kernel.a, kernel.b, kernel.kind], index * 3);
      }
      for (let index = 0; index < GUARDS; index += 1) {
        const guard = face.guards[index];
        guards.set([guard.x, guard.y, guard.rx, guard.ry], index * 4);
      }
      gl.uniform2f(locations.resolution, width, height);
      gl.uniform2f(locations.photo, photo.width, photo.height);
      gl.uniform3f(locations.view, view.x, view.y, view.height);
      gl.uniform2f(locations.axisX, face.frame.xx, face.frame.xy);
      gl.uniform2f(locations.axisY, face.frame.yx, face.frame.yy);
      gl.uniform1i(locations.count, kernels.length);
      gl.uniform4fv(locations.shape, shapes);
      gl.uniform3fv(locations.param, params);
      gl.uniform4fv(locations.guard, guards);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, image);
      gl.uniform1i(locations.image, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, skin);
      gl.uniform1i(locations.skin, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteTexture(image);
      gl.deleteTexture(skin);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(array);
      gl.deleteProgram(program);
    },
  };
}

export type Renderer = ReturnType<typeof createRenderer>;
