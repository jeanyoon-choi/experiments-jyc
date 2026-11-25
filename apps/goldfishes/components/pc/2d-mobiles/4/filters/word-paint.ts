// The word of a 치환 cell, painted once per word (worker side): white capitals
// on nothing, scaled both ways until their ink fills the tile edge to edge, as
// substitution/3 sets its capitals with `textLength` and a cap height equal to
// the cell's. The compositor uses the tile's alpha as the ink's mask.

import type { Painter } from "../paint/types";

const FACE = '700 100px "Helvetica Neue", Helvetica, Arial, "Apple SD Gothic Neo", sans-serif';

const word: Painter<{ word: string }> = {
  paint(ctx, data, env, h) {
    if (!data.word) return;
    ctx.font = FACE;
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
