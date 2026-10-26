// Mechanical packaging only: copies the upstream ground, cloud and sound
// resources out of the pinned dino.html, byte for byte, for the /4 race.
import { readFileSync, writeFileSync } from "node:fs";

const original = readFileSync(new URL("./dino.html", import.meta.url), "utf8");

function resource(tag, id) {
  const match = original.match(
    new RegExp(`<${tag} id="${id}" src="(data:[^"]+)"`),
  );
  if (!match) throw new Error(`Missing upstream resource ${id}`);
  return match[1];
}

const assets = {
  images: {
    "1x-horizon": resource("img", "1x-horizon"),
    "2x-horizon": resource("img", "2x-horizon"),
    "1x-cloud": resource("img", "1x-cloud"),
    "2x-cloud": resource("img", "2x-cloud"),
  },
  sounds: {
    press: resource("audio", "offline-sound-press"),
    hit: resource("audio", "offline-sound-hit"),
  },
};

writeFileSync(
  new URL("./assets.json", import.meta.url),
  `${JSON.stringify(assets)}\n`,
);
