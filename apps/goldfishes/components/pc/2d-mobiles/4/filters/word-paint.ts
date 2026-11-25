// The word of a 치환 cell, painted once per word (worker side): white capitals
// on nothing, scaled both ways until their ink fills the tile edge to edge, as
// substitution/3 sets its capitals with `textLength` and a cap height equal to
// the cell's. The compositor uses the tile's alpha as the ink's mask.

import type { Painter } from "../paint/types";

const REST = ', "Helvetica Neue", Helvetica, Arial, "Apple SD Gothic Neo", sans-serif';

/**
 * 서체: the faces a word can be set in, system faces only (a tile is painted in a worker, where a web font would
 * have to be loaded apart). In the order of `model/tuning.ts` SUB_CHOICES 서체. The word is stretched to fill its
 * cell either way, so what tells them apart is the weight of the stroke and the character of the forms, not the width.
 */
const FACES = [
  `700 100px "Helvetica Neue", Helvetica, Arial, "Apple SD Gothic Neo", sans-serif`,
  `400 100px Impact, "Arial Black"${REST}`,
  `900 100px system-ui, -apple-system, "SF Pro Display"${REST}`,
  `700 100px Futura${REST}`,
  `700 100px Menlo, "SF Mono", "Courier New", monospace`,
  `700 100px Didot, "Bodoni 72", "Times New Roman", serif`,
  `100 100px "Helvetica Neue", Helvetica, Arial, sans-serif`,
];

const word: Painter<{ word: string; face?: number }> = {
  paint(ctx, data, env, h) {
    if (!data.word) return;
    ctx.font = FACES[data.face ?? 0] ?? FACES[0]!;
    ctx.textBaseline = "alphabetic";
    const box = ctx.measureText(data.word);
    const inkWidth = box.actualBoundingBoxLeft + box.actualBoundingBoxRight;
    const inkHeight = box.actualBoundingBoxAscent + box.actualBoundingBoxDescent;
    if (inkWidth <= 0 || inkHeight <= 0) return;
    ctx.save();
    ctx.scale(env.w / inkWidth, h / inkHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(data.word, box.actualBoundingBoxLeft, box.actualBoundingBoxAscent);
    ctx.restore();
  },
};

export const SUB_PAINTERS = { "sub.word": word };
