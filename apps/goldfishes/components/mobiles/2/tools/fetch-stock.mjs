// Fetches freely licensed photographs from Wikimedia Commons, a few per
// keyword, at 720 px, and records author and licence.
// usage: node fetch-stock.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const UA = "goldfishes-art-research/1.0 (ericggul@gmail.com)";

const QUERIES = {
  sparkle: ["artificial intelligence conference stage", "server room blue light"],
  cloud: ["cumulus clouds sky", "data center corridor"],
  gpu: ["graphics card GPU", "computer chip wafer"],
  robot: ["industrial robot arm factory", "robot exhibition"],
  humanoid: ["humanoid robot", "android robot expo"],
  robotDog: ["Boston Dynamics Spot robot", "quadruped robot"],
  roadster: ["Tesla Roadster", "electric sports car red"],
  headset: ["virtual reality headset", "VR headset user"],
  ape: ["NFT art exhibition screen", "crypto billboard Times Square"],
  rocket: ["rocket launch night", "Starship SpaceX Boca Chica"],
  chat: ["smartphone screen hand night", "people using smartphones subway"],
  spinner: ["crowd waiting queue", "airport departure board"],
  heart: ["heart balloons", "concert crowd lights"],
  like: ["selfie crowd", "influencer ring light"],
  comment: ["protest crowd signs", "press conference microphones"],
  extra: ["bubble tea", "shopping mall interior", "stock exchange trading floor", "neon city night Seoul", "Times Square billboards", "food delivery scooter"],
};

async function search(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({
    action: "query", format: "json", generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "12",
    prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "480",
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  const json = await response.json();
  return Object.values(json.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .map((page) => ({ title: page.title, info: page.imageinfo?.[0] }))
    .filter(({ info }) => info && info.mime === "image/jpeg" && info.width >= 900 && info.width / info.height > 0.6 && info.width / info.height < 2.2);
}

const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const credits = [];
for (const [keyword, queries] of Object.entries(QUERIES)) {
  let n = 0;
  for (const query of queries) {
    let results = [];
    try { results = await search(query); } catch (error) { console.error("search failed", query, error.message); }
    for (const { title, info } of results.slice(0, keyword === "extra" ? 2 : 2)) {
      const name = `${keyword}-${String(++n).padStart(2, "0")}.jpg`;
      try {
        const response = await fetch(info.thumburl, { headers: { "User-Agent": UA } });
        if (!response.ok) throw new Error(String(response.status));
        const path = join(out, name);
        writeFileSync(path, Buffer.from(await response.arrayBuffer()));
        execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "78", "-Z", "480", path, "--out", path], { stdio: "ignore" });
        const meta = info.extmetadata ?? {};
        credits.push({ file: name, keyword, source: info.descriptionurl, title, author: strip(meta.Artist?.value), license: strip(meta.LicenseShortName?.value) });
        console.log("ok", name, title);
      } catch (error) {
        n -= 1;
        console.error("download failed", title, error.message);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}
writeFileSync(join(out, "credits.json"), JSON.stringify(credits, null, 2) + "\n");
console.log("done", credits.length);
