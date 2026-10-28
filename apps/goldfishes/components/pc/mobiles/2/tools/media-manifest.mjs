// Lists the photographs in public/assets/goldfishes/pc-mobiles-2/{stock,generated}
// into content/media.json, so the phones know what exists without probing.
// Run after adding or removing files: node components/pc/mobiles/2/tools/media-manifest.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "../../../../..");
const base = "/assets/goldfishes/pc-mobiles-2";
const list = (folder) =>
  readdirSync(join(app, "public", base, folder))
    .filter((file) => file.endsWith(".jpg"))
    .sort()
    .map((file) => `${base}/${folder}/${file}`);
const manifest = { stock: list("stock"), generated: list("generated") };
writeFileSync(join(here, "../content/media.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`stock ${manifest.stock.length}, generated ${manifest.generated.length}`);
