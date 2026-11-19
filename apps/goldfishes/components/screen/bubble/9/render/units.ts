// What the raft's programs, the objects' (objects/object-pass.ts) and the materials agree on: which texture unit
// holds what, how the bubbles lie in their data textures, and how a height and a body are written into the frame.
// Nothing here touches the DOM or WebGL.

/**
 * The texture units. A fragment shader has sixteen (the objects' program uses them all), the context at least 32.
 * `first`/`second` (the ownership passes) and `sceneColour`/`sceneDepth` (keep and present) share 0 and 1: they are
 * never read by one program. `objects` is the first of the objects' eleven field arrays (8–18) and `winners` their
 * winner per pixel, both bound by objects/object-pass.ts.
 */
export const UNIT = {
  first: 0,
  second: 1,
  sceneColour: 0,
  sceneDepth: 1,
  bubbleData: 2,
  neighbours: 3,
  lightMap: 4,
  shadowField: 5,
  shadowTint: 6,
  plates: 7,
  objects: 8,
  printMap: 19,
  lastScene: 20,
  winners: 22,
} as const;

export const MAX_BUBBLES = 16_384;
/** Floats per bubble: x y radius seed (CSS px). */
export const BUBBLE_FLOATS = 4;
/** Bubble data and neighbour lists are kept in textures this many bubbles wide. */
export const ROW = 128;
/** Each bubble lists up to this many neighbours it overlaps (4 per texel), most deeply pressed first. */
export const NEIGHBOUR_TEXELS = 4;
export const NEIGHBOURS = NEIGHBOUR_TEXELS * 4;

/** A height (CSS px) is written as depth: 0.5 − height / HEIGHT_SPAN (the ground and nothing: 1). */
export const HEIGHT_SPAN = 8192;
/** The kept frame (lastScene) holds a height in this many steps per CSS px, as its alpha's whole part … */
export const HEIGHT_STEPS = 8;
/** … and the body's id as its fraction, held under this so it never carries into the height. */
export const BODY_KEPT_MOST = 0.99;
/** A body's id in the frame's alpha, over BODY_LEVELS: 2 + one of BODY_IDS by its seed, an object's BODY_OBJECT higher (so a half and above). */
export const BODY_IDS = 120;
export const BODY_OBJECT = 128;
export const BODY_LEVELS = 255;

/** A number as a GLSL float literal (8192 → "8192.0", 0.125 → "0.125"). */
export const float = (value: number) => (Number.isInteger(value) ? value.toFixed(1) : String(value));
