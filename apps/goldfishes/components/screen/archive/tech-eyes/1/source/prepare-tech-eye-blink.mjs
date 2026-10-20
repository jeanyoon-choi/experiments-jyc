// Run from the workspace root: node <this-file> <generated-sheet.png> <001..080>
// Generation uses the built-in imagegen tool; this only prepares web assets.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [input, id] = process.argv.slice(2);
if (!input || !/^\d{3}$/.test(id ?? "") || Number(id) < 1 || Number(id) > 80) {
  throw new Error("Expected a generated sheet path and source ID 001..080");
}
const root = path.resolve("apps/goldfishes");
const metadata = await sharp(input).metadata();
if (metadata.width * 2 !== metadata.height * 3) {
  throw new Error("Expected a 3×2 sheet with square cells");
}
const output = `/images/0922/tech-eye-blink/${id}.webp`;
const destination = path.join(root, "public", output);
fs.mkdirSync(path.dirname(destination), { recursive: true });
await sharp(input).resize(576, 384).webp({ quality: 88, effort: 5 }).toFile(destination);
const ledger = path.join(root, "components/screen/archive/tech-eyes/1/source/tech-eye-blink");
fs.mkdirSync(ledger, { recursive: true });
fs.writeFileSync(path.join(ledger, `${id}.json`), `${JSON.stringify({
  id,
  source: `/images/0908/tech-power-eyes/${id}.jpg`,
  generatedOriginal: path.resolve(input),
  output, width: 576, height: 384, bytes: fs.statSync(destination).size,
}, null, 2)}\n`);
