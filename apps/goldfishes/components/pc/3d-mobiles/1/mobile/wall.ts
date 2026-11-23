// A wall's screens. With one mobile the feed is a canvas drawn every frame (feed.ts); with hundreds that would be
// hundreds of uploads, or a few feeds repeated across them. Here every screen has its own feed at no cost per
// frame: all the clips are laid once in one atlas, and each screen's shader works out, from the time and that
// screen's own beat, which clip it is on, how far into it, and the swipe to the next.
//
// A screen's beat (an instance attribute): its pace — from a clip every 0.4 s to one every 5 s, most quick — its
// phase, and a seed that deals its clips. The pace drifts, so no screen keeps time. swipeOf() is the same sum on the
// CPU, for the fin that strokes the screen.

import * as THREE from "three";
import { CLIPS } from "./feed";

const COLS = 12;
const ROWS = 8;
const TILE_W = 170;
const TILE_H = 368;
/** Seconds a swipe takes. */
const SWIPE = 0.26;

/** Where a screen is in its feed at `time`: `step` clips in, `through` 0 … 1 of the present one. */
function beatAt(time: number, pace: number, phase: number, seed: number) {
  const s = time * pace + phase + 0.35 * Math.sin(time * 0.37 + seed * 40);
  return { step: Math.floor(s), through: s - Math.floor(s) };
}

/** The feed's buttons (like, comment, send, the poster) and the shade under them, once, over every clip. */
function chrome() {
  const canvas = document.createElement("canvas");
  canvas.width = 234;
  canvas.height = 507;
  const c = canvas.getContext("2d")!;
  const shade = c.createLinearGradient(0, 507 * 0.55, 0, 507);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.55)");
  c.fillStyle = shade;
  c.fillRect(0, 507 * 0.55, 234, 507 * 0.45);
  c.strokeStyle = "#fff";
  c.lineWidth = 2;
  c.lineJoin = "round";
  c.lineCap = "round";
  const x = 234 - 23;
  let y = 507 - 186;
  c.beginPath();
  c.moveTo(x, y + 6.5);
  c.bezierCurveTo(x - 13, y - 2.5, x - 7, y - 11, x, y - 4.5);
  c.bezierCurveTo(x + 7, y - 11, x + 13, y - 2.5, x, y + 6.5);
  c.stroke();
  y += 39;
  c.beginPath();
  c.arc(x, y, 7.5, Math.PI * 0.75, Math.PI * 2.55);
  c.lineTo(x - 7.5, y + 8.5);
  c.closePath();
  c.stroke();
  y += 39;
  c.beginPath();
  c.moveTo(x - 8, y - 6);
  c.lineTo(x + 8.5, y - 6);
  c.lineTo(x - 1, y + 8);
  c.lineTo(x - 2.5, y - 0.5);
  c.closePath();
  c.stroke();
  y += 42;
  c.beginPath();
  c.arc(x, y, 9.5, 0, Math.PI * 2);
  c.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export type Wall = {
  material: THREE.ShaderMaterial;
  /** The per-screen attribute to put on the screens' geometry (`beat`). */
  beats: THREE.InstancedBufferAttribute;
  update(time: number): void;
  /** The swipe under way on screen `index`, 0 … 1 (0 while a clip is watched). */
  swipeOf(index: number): number;
  dispose(): void;
};

export function createWall(count: number): Wall {
  // Every clip, cut to the screen's shape, in one sheet.
  const sheet = document.createElement("canvas");
  sheet.width = COLS * TILE_W;
  sheet.height = ROWS * TILE_H;
  const c = sheet.getContext("2d", { alpha: false })!;
  c.fillStyle = "#000";
  c.fillRect(0, 0, sheet.width, sheet.height);
  const atlas = new THREE.CanvasTexture(sheet);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  let disposed = false;
  let arrived = 0;
  let uploaded = 0;
  CLIPS.slice(0, COLS * ROWS).forEach((url, index) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      const scale = Math.max(TILE_W / image.naturalWidth, TILE_H / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      const x = (index % COLS) * TILE_W;
      const y = Math.floor(index / COLS) * TILE_H;
      c.save();
      c.beginPath();
      c.rect(x, y, TILE_W, TILE_H);
      c.clip();
      c.drawImage(image, x + (TILE_W - w) / 2, y + (TILE_H - h) / 2, w, h);
      c.restore();
      arrived += 1;
    };
    image.src = url;
  });
  const buttons = chrome();

  const beats = new Float32Array(count * 3);
  const random = (seed: number) => {
    const s = Math.sin(seed * 127.1 + 311.7) * 43_758.5453;
    return s - Math.floor(s);
  };
  for (let index = 0; index < count; index += 1) {
    // Pace in clips a second: most screens quick, a few slow.
    beats[index * 3] = 0.25 + 2.1 * random(index + 0.37) ** 2.2;
    beats[index * 3 + 1] = random(index + 5.1) * 100;
    beats[index * 3 + 2] = random(index + 9.3);
  }

  const material = new THREE.ShaderMaterial({
    uniforms: { atlas: { value: atlas }, buttons: { value: buttons }, time: { value: 0 }, clips: { value: Math.min(CLIPS.length, COLS * ROWS) } },
    vertexShader: /* glsl */ `
      attribute vec3 beat;
      varying vec2 vUv;
      varying vec3 vBeat;
      void main() {
        vUv = uv;
        vBeat = beat;
        vec4 at = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          at = instanceMatrix * at;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * at;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D atlas;
      uniform sampler2D buttons;
      uniform float time;
      uniform float clips;
      varying vec2 vUv;
      varying vec3 vBeat;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      // Clip number \`turn\` of this screen's feed, held for \`age\` seconds: filling the screen, slowly pushed in.
      vec3 clip(float turn, vec2 uv, float age) {
        float id = min(floor(hash(vec2(vBeat.z * 91.7, turn)) * clips), clips - 1.0);
        vec2 cell = vec2(mod(id, ${COLS.toFixed(1)}), ${(ROWS - 1).toFixed(1)} - floor(id / ${COLS.toFixed(1)}));
        vec2 q = clamp((uv - 0.5) / (1.06 + 0.035 * age) + 0.5, 0.012, 0.988);
        return texture2D(atlas, (cell + q) / vec2(${COLS.toFixed(1)}, ${ROWS.toFixed(1)})).rgb;
      }
      void main() {
        float pace = vBeat.x;
        float s = time * pace + vBeat.y + 0.35 * sin(time * 0.37 + vBeat.z * 40.0);
        float turn = floor(s);
        float through = fract(s);
        // The last ${SWIPE} s of a clip is the swipe to the next: this one leaves upwards, the next follows it in.
        float span = min(0.5, ${SWIPE} * pace);
        float slide = through > 1.0 - span ? 1.0 - pow(1.0 - (through - (1.0 - span)) / span, 3.0) : 0.0;
        float y = vUv.y - slide;
        vec2 uv = vec2(vUv.x, y < 0.0 ? y + 1.0 : y);
        vec3 colour = y < 0.0 ? clip(turn + 1.0, uv, 0.0) : clip(turn, uv, through / pace);
        vec4 chrome = texture2D(buttons, uv);
        colour = mix(colour, chrome.rgb, chrome.a);
        // How far through the clip.
        if (uv.y < 0.006) colour = mix(vec3(0.3), vec3(1.0), step(vUv.x, y < 0.0 ? 0.0 : through / (1.0 - span)));
        gl_FragColor = vec4(colour, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  return {
    material,
    beats: new THREE.InstancedBufferAttribute(beats, 3),
    update(time) {
      material.uniforms.time!.value = time;
      // The sheet goes to the GPU again as clips arrive, a few times in all.
      if (arrived !== uploaded && (arrived === Math.min(CLIPS.length, COLS * ROWS) || arrived - uploaded >= 24)) {
        uploaded = arrived;
        atlas.needsUpdate = true;
      }
    },
    swipeOf(index) {
      const pace = beats[index * 3]!;
      const { through } = beatAt(material.uniforms.time!.value as number, pace, beats[index * 3 + 1]!, beats[index * 3 + 2]!);
      const span = Math.min(0.5, SWIPE * pace);
      return through > 1 - span ? (through - (1 - span)) / span : 0;
    },
    dispose() {
      disposed = true;
      atlas.dispose();
      buttons.dispose();
      material.dispose();
    },
  };
}
