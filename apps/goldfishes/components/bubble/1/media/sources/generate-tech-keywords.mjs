// Generates the 기술 surface: one quiet fine-art photograph per tech keyword,
// evoking it obliquely through a material or social analogue rather than a literal render.
// Run from the workspace root with OPENAI_API_KEY in .env:
//   node apps/scc/components/complex-systems/bubble/3/media/sources/generate-tech-keywords.mjs [--only AI,GPU] [--out <dir>]
// Writes <out>/<KEYWORD>.jpg (default apps/scc/public/images/1011/tech-keywords) and a ledger.json beside them.
import fs from "node:fs";
import path from "node:path";

const MODEL = "gpt-image-2";
const SIZE = "1024x1024";
const QUALITY = "medium";
const CONCURRENCY = 4;

const STYLE =
  "Quiet fine-art photograph in the register of contemporary editorial and museum photography, medium-format camera, " +
  "soft even natural daylight, restrained muted palette of greys, off-whites and pale earth tones with at most one quiet accent colour, " +
  "one clear subject or one strong simple pattern filling a square frame so it reads instantly at thumbnail size, calm and composed, " +
  "real materials and real places, fine grain, no dramatic lighting. No text, no letters, no numbers, no logos, no signage, no watermark, " +
  "no screens showing content, no glowing lights, no neon, no circuit-board motifs, no robots, no holograms, no 3D render look, " +
  "no people or faces.";

/** Keyword order is tech-eyes/1's; each scene evokes the keyword obliquely, through a material or social analogue. */
export const SCENES = [
  ["AI", "a starling murmuration forming one dense dark shape against a pale overcast winter sky above a flat field"],
  ["ML", "wind-formed ripples in pale sand seen close from above in low raking light, repeating curves slowly correcting themselves"],
  ["DL", "looking straight down a deep circular stone well, concentric rings of masonry receding into darkness"],
  ["AGI", "a salt flat at dawn where the white ground and the pale sky meet without a visible horizon, utterly empty"],
  ["GPT", "a tall stack of tens of thousands of blank paper sheets seen edge-on, the edges forming fine grey and white striations"],
  ["LLM", "an enormous old library reading room seen from a high balcony, endless shelves of books too distant to read, Gursky-like scale"],
  ["NLP", "an empty soundproof interpreter's booth with two microphones on a desk, its window looking onto a dim empty assembly hall"],
  ["RAG", "a long archive corridor of rolling compact shelving, one aisle cranked open, grey document boxes in rows"],
  ["CPU", "a dense orthogonal city grid photographed straight down from very high above on an overcast day, rooftops like a tiled pattern"],
  ["GPU", "an aerial view of thousands of identical greenhouse roofs in parallel rows, white plastic sheeting in a dry landscape"],
  ["NPU", "a macro photograph of a dragonfly wing, the fine network of veins and translucent cells against a pale background"],
  ["RAM", "a wall of small identical grey metal locker doors in a grid, a few left ajar, flat daylight"],
  ["OS", "a railway marshalling yard from above, many parallel tracks branching and merging, empty of trains, grey morning"],
  ["PC", "a still life of a single beige 1990s desktop computer with its monitor switched off on a bare wooden desk beside a window"],
  ["IoT", "overhead power and telephone lines criss-crossing above a narrow residential alley, silhouetted against a pale sky"],
  ["AR", "a shop window in which the reflection of the street outside lies over the objects inside, two scenes layered in one plane"],
  ["VR", "a theatre stage seen from the wings, a painted backdrop of distant mountains with its bare wooden frame and ropes visible behind it"],
  ["XR", "a large free-standing mirror placed in an open grass field, reflecting the sky so the landscape seems to continue into it"],
  ["UI", "a close-up of a row of chunky vintage push buttons and toggle switches set into a cream enamel control panel, unlabelled"],
  ["UX", "a worn desire path cutting diagonally across a neatly mown lawn, seen from above"],
  ["HCI", "the polished, worn bright patch on an old bronze door handle where countless hands have touched it, close-up"],
  ["MVP", "a rough cardboard and masking-tape prototype of a chair standing on a plywood workshop table"],
  ["API", "a close-up of the heavy steel coupling joining two railway carriages, weathered paint, overcast light"],
  ["SDK", "a flat-lay of hand tools neatly arranged in the compartments of a worn wooden toolbox tray, seen from directly above"],
  ["IDE", "an architect's drafting table under north light with tracing paper, steel rulers, set squares and pencils laid out"],
  ["OOP", "shelves in a museum storeroom holding many identical white plaster casts of the same architectural ornament, with small variations"],
  ["QA", "rows of identical white porcelain cups on a factory inspection table, one of them with a hairline crack"],
  ["DB", "a cold seed-bank vault with tall shelving of identical sealed grey boxes receding down a narrow aisle"],
  ["SQL", "a wooden library card-catalogue drawer pulled fully open, hundreds of index cards seen edge-on, a brass rod through them"],
  ["CDN", "a thick armoured submarine cable emerging from concrete and running down into the sea on a grey pebble beach"],
  ["DNS", "a wall of wooden pigeonhole mail-sorting boxes in an old post office, a few letters resting in some of them"],
  ["URL", "a lone mailbox on a post at the end of a dirt road in a wide empty landscape"],
  ["VPN", "a long empty concrete tunnel with a small distant square of daylight at its end"],
  ["VM", "an architectural scale model of a building displayed inside the vast empty hall of that same building"],
  ["NFT", "an empty white gallery wall with a single picture hook and a faint paler rectangle where a painting once hung"],
  ["DAO", "a circle of empty folding chairs in a bare community hall, soft daylight from high windows"],
];

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const env = fs.readFileSync(path.resolve(".env"), "utf8");
  const line = env.split("\n").find((entry) => entry.startsWith("OPENAI_API_KEY="));
  if (!line) throw new Error("OPENAI_API_KEY not found");
  return line.slice("OPENAI_API_KEY=".length).trim().replace(/^"|"$/g, "");
}

const args = process.argv.slice(2);
const only = args.includes("--only") ? new Set(args[args.indexOf("--only") + 1].split(",")) : null;
const out = args.includes("--out") ? path.resolve(args[args.indexOf("--out") + 1]) : path.resolve("apps/scc/public/images/1011/tech-keywords");
fs.mkdirSync(out, { recursive: true });
const key = loadKey();

async function generate([keyword, scene]) {
  const target = path.join(out, `${keyword}.jpg`);
  const prompt = `${scene}. ${STYLE}`;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, size: SIZE, quality: QUALITY, n: 1, output_format: "jpeg", output_compression: 88 }),
  });
  if (!response.ok) throw new Error(`${keyword}: ${response.status} ${await response.text()}`);
  const body = await response.json();
  const image = body.data?.[0]?.b64_json;
  if (!image) throw new Error(`${keyword}: no image in response`);
  fs.writeFileSync(target, Buffer.from(image, "base64"));
  return { keyword, file: path.relative(out, target), prompt, model: MODEL, size: SIZE, quality: QUALITY, bytes: fs.statSync(target).size, usage: body.usage ?? null };
}

const queue = SCENES.filter(([keyword]) => !only || only.has(keyword));
const ledgerPath = path.join(out, "ledger.json");
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { generatedAt: null, style: STYLE, images: {} };
let next = 0;
const failures = [];
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
  while (next < queue.length) {
    const scene = queue[next];
    next += 1;
    try {
      const entry = await generate(scene);
      ledger.images[entry.keyword] = entry;
      console.log(`ok ${entry.keyword} ${entry.bytes} B`);
    } catch (error) {
      failures.push(String(error));
      console.error(String(error));
    }
  }
}));
ledger.generatedAt = new Date().toISOString();
ledger.style = STYLE;
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(`${queue.length - failures.length}/${queue.length} written to ${out}`);
if (failures.length) process.exit(1);
