// Draws each row in world pixels exactly as the upstream Runner draws its
// canvas, into one host canvas.
import {
  BOOK,
  CLOUD,
  GAME_HEIGHT,
  HORIZON,
  STUN_DURATION,
  TREX,
  isRecovering,
  racerPose,
  type Race,
  type Racer,
} from "./race";
import { INK, PAPER, type SpriteSet } from "./sprites";

// The /3 age clock, drawn at the same 1.5× pixel.
const MONTHS_PER_SECOND = 6;
const MONTH_MILLISECONDS = 1000 / MONTHS_PER_SECOND;
const GLYPH_PIXEL = 3;
const GLYPH_ADVANCE = GLYPH_PIXEL * 4;
const HUD_Y = 5;
// DistanceMeter.x is width - 66; the clock ends 55 pixels after it.
const CLOCK_RIGHT = 11;
const SHAKE_DURATION = 320;
const BLINK_INTERVAL = 100;
const NAME_X = 8;
const NAME_FONT = '700 14px Arial, "Apple SD Gothic Neo", sans-serif';

// One name per runner, by id.
const NAMES = [
  "김민준", "이서연", "박지호", "최수아",
  "정도윤", "강하은", "조예준", "윤지우",
];

const glyphs: Record<string, string[]> = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
  D: ["110", "101", "101", "101", "110"],
  M: ["101", "111", "111", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
};

type GlyphText = { path: Path2D; width: number };

function glyphText(text: string): GlyphText {
  const path = new Path2D();
  for (let index = 0; index < text.length; index += 1) {
    const glyph = glyphs[text[index]];
    if (!glyph) continue;
    glyph.forEach((line, row) => {
      for (let column = 0; column < line.length; column += 1) {
        if (line[column] === "1") {
          path.rect(
            index * GLYPH_ADVANCE + column * GLYPH_PIXEL,
            row * GLYPH_PIXEL,
            GLYPH_PIXEL,
            GLYPH_PIXEL,
          );
        }
      }
    });
  }
  return { path, width: text.length * GLYPH_ADVANCE - GLYPH_PIXEL };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function ageText(age: number) {
  const months = Math.floor(age / MONTH_MILLISECONDS);
  const days = Math.floor(
    ((age % MONTH_MILLISECONDS) / MONTH_MILLISECONDS) * 30,
  );
  return `${pad(Math.floor(months / 12) % 100)}Y ${pad(months % 12)}M ${pad(days)}D`;
}

export type View = {
  width: number;
  height: number;
  pixelRatio: number;
  rowHeight: number;
  scale: number;
  // Game position inside its row (centred when the row is taller).
  gameOffset: number;
};

export function createRenderer() {
  let clock: GlyphText & { text: string } = { ...glyphText(""), text: "" };

  function drawWorld(
    context: CanvasRenderingContext2D,
    race: Race,
    racer: Racer,
    sprites: SpriteSet,
    now: number,
  ) {
    const d = sprites.density;
    const worldWidth = race.width;

    // The two ground segments repeat when the world is wider than both.
    for (let repeat = 0; repeat < worldWidth; repeat += HORIZON.WIDTH * 2) {
      for (let line = 0; line < 2; line += 1) {
        context.drawImage(
          sprites.horizon,
          racer.horizonSource[line] * d,
          0,
          HORIZON.WIDTH * d,
          HORIZON.HEIGHT * d,
          racer.horizonX[line] + repeat,
          HORIZON.YPOS,
          HORIZON.WIDTH,
          HORIZON.HEIGHT,
        );
      }
    }

    for (const cloud of racer.clouds) {
      context.drawImage(
        sprites.cloud,
        0,
        0,
        CLOUD.WIDTH * d,
        CLOUD.HEIGHT * d,
        cloud.x,
        cloud.y,
        CLOUD.WIDTH,
        CLOUD.HEIGHT,
      );
    }

    for (const obstacle of racer.obstacles) {
      obstacle.books.forEach((book, index) => {
        context.drawImage(
          book.basic ? sprites.spines.basic : sprites.spines.advanced,
          obstacle.x + index * BOOK.THICKNESS,
          obstacle.y,
          BOOK.THICKNESS,
          BOOK.HEIGHT,
        );
      });
    }

    context.fillStyle = INK;
    context.save();
    context.translate(worldWidth - CLOCK_RIGHT - clock.width, HUD_Y);
    context.fill(clock.path);
    context.restore();
    context.font = NAME_FONT;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(NAMES[racer.id % NAMES.length], NAME_X, HUD_Y);

    // Hurt: shaking on the ground; getting up: blinking through the obstacle.
    const hurt = racer.stun > 0;
    const shake =
      hurt && racer.stun > STUN_DURATION - SHAKE_DURATION
        ? Math.floor(now / 40) % 2 === 0
          ? 1
          : -1
        : 0;
    context.globalAlpha =
      isRecovering(racer) && Math.floor(now / BLINK_INTERVAL) % 2 === 0
        ? 0.35
        : 1;
    context.drawImage(
      sprites.trex,
      racerPose(racer, race.started) * d,
      0,
      TREX.WIDTH * d,
      TREX.HEIGHT * d,
      Math.round(racer.x) + shake,
      racer.y,
      TREX.WIDTH,
      TREX.HEIGHT,
    );
    context.globalAlpha = 1;

    if (hurt) drawOuch(context, Math.round(racer.x));
  }

  // The warning: a pixel speech bubble from the fallen runner's head.
  function drawOuch(context: CanvasRenderingContext2D, x: number) {
    const left = x + 22;
    const top = 58;
    const width = 46;
    const height = 24;
    context.fillStyle = INK;
    context.fillRect(left, top, width, height);
    context.fillRect(left + 10, top + height, 8, 3);
    context.fillRect(left + 10, top + height + 3, 4, 3);
    context.fillStyle = PAPER;
    context.fillRect(left + 2, top + 2, width - 4, height - 4);
    context.fillRect(left + 12, top + height - 2, 4, 3);
    context.fillStyle = INK;
    context.font = NAME_FONT;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("아야!", left + width / 2, top + height / 2 + 1);
  }

  return function draw(
    context: CanvasRenderingContext2D,
    race: Race,
    sprites: SpriteSet,
    view: View,
    now: number,
  ) {
    const text = ageText(race.age);
    if (text !== clock.text) clock = { ...glyphText(text), text };

    const ratio = view.pixelRatio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = PAPER;
    context.fillRect(0, 0, view.width, view.height);

    for (const racer of race.racers) {
      context.save();
      context.translate(0, racer.id * view.rowHeight);
      context.beginPath();
      context.rect(0, 0, view.width, view.rowHeight);
      context.clip();
      context.fillStyle = PAPER;
      context.fillRect(0, 0, view.width, view.rowHeight);
      context.translate(0, view.gameOffset);
      context.scale(view.scale, view.scale);
      context.beginPath();
      context.rect(0, 0, race.width, GAME_HEIGHT);
      context.clip();
      drawWorld(context, race, racer, sprites, now);
      context.restore();
    }
  };
}
