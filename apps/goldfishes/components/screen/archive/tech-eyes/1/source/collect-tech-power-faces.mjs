import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIRECTORY = path.resolve("apps/goldfishes/public/images/0908/tech-power-faces");
const GENERATED_MODULE = path.resolve("apps/goldfishes/components/screen/archive/tech-eyes/1/model/tech-power-faces.generated.ts");
const USER_AGENT = "SCC-Goldfishes-archive/1.0 (local artistic research; contact via repository owner)";
const TARGET_COUNT = 80;

const candidates = [
  ["Sam Altman", "OpenAI"], ["Mark Zuckerberg", "Meta"], ["Jensen Huang", "Nvidia"], ["Sundar Pichai", "Alphabet"],
  ["Dario Amodei", "Anthropic"], ["Satya Nadella", "Microsoft"], ["Tim Cook", "Apple"], ["Elon Musk", "xAI / SpaceX / Tesla"],
  ["Demis Hassabis", "Google DeepMind"], ["Andy Jassy", "Amazon"], ["Lisa Su", "AMD"], ["Shou Zi Chew", "TikTok"],
  ["Mira Murati", "Thinking Machines Lab"], ["Brian Chesky", "Airbnb"], ["Pony Ma", "Tencent"], ["Safra Catz", "Oracle"],
  ["Mustafa Suleyman", "Microsoft AI"], ["Dara Khosrowshahi", "Uber"], ["Robin Li", "Baidu"], ["Arvind Krishna", "IBM"],
  ["Ilya Sutskever", "Safe Superintelligence"], ["Daniel Ek", "Spotify"], ["Lei Jun", "Xiaomi"], ["Marc Benioff", "Salesforce"],
  ["Fei-Fei Li", "World Labs / Stanford"], ["Evan Spiegel", "Snap"], ["Masayoshi Son", "SoftBank"], ["Hock Tan", "Broadcom"],
  ["Aravind Srinivas", "Perplexity"], ["Pavel Durov", "Telegram"], ["Jack Ma", "Alibaba"], ["Cristiano Amon", "Qualcomm"],
  ["Arthur Mensch", "Mistral AI"], ["Ted Sarandos", "Netflix"], ["Zhang Yiming", "ByteDance"], ["C. C. Wei", "TSMC"],
  ["Greg Brockman", "OpenAI"], ["Adam Mosseri", "Instagram"], ["Eddie Wu", "Alibaba"], ["Bill McDermott", "ServiceNow"],
  ["Daniela Amodei", "Anthropic"], ["Drew Houston", "Dropbox"], ["Ren Zhengfei", "Huawei"], ["Shantanu Narayen", "Adobe"],
  ["Mike Krieger", "Anthropic / Instagram"], ["Eric Yuan", "Zoom"], ["Joe Tsai", "Alibaba"], ["Chuck Robbins", "Cisco"],
  ["Alexandr Wang", "Meta"], ["Dylan Field", "Figma"], ["Richard Liu (businessman)", "JD.com"], ["Lip-Bu Tan", "Intel"],
  ["Geoffrey Hinton", "AI research"], ["Melanie Perkins", "Canva"], ["Colin Huang", "PDD Holdings"], ["Nikesh Arora", "Palo Alto Networks"],
  ["Yann LeCun", "AI research"], ["Tobias Lütke", "Shopify"], ["William Ding", "NetEase"], ["George Kurtz (businessman)", "CrowdStrike"],
  ["Yoshua Bengio", "AI research"], ["Tony Xu", "DoorDash"], ["Martin Lau", "Tencent"], ["Matthew Prince", "Cloudflare"],
  ["Andrew Ng", "DeepLearning.AI"], ["Steve Huffman", "Reddit"], ["Jay Y. Lee", "Samsung"], ["Patrick Collison", "Stripe"],
  ["Andrej Karpathy", "AI research / education"], ["Whitney Wolfe Herd", "Bumble"], ["Morris Chang", "TSMC"], ["Brian Armstrong", "Coinbase"],
  ["Kai-Fu Lee", "Sinovation Ventures"], ["Jack Dorsey", "Block"], ["Young Liu", "Foxconn"], ["John Collison", "Stripe"],
  ["Aidan Gomez", "Cohere"], ["Alex Karp", "Palantir"], ["Bom Kim", "Coupang"], ["Changpeng Zhao", "Binance"],
  ["Ali Ghodsi", "Databricks"], ["Peter Thiel", "Founders Fund / Palantir"], ["Chey Tae-won", "SK Group"], ["Vitalik Buterin", "Ethereum"],
  ["Matei Zaharia", "Databricks"], ["Marc Andreessen", "Andreessen Horowitz"], ["Kim Beom-soo (businessman)", "Kakao"], ["Reid Hoffman", "Greylock / LinkedIn"],
  ["Thomas Kurian", "Google Cloud"], ["Ben Horowitz", "Andreessen Horowitz"], ["Kevin Scott (computer scientist)", "Microsoft"], ["Vinod Khosla", "Khosla Ventures"],
  ["Neal Mohan", "YouTube"], ["Bill Gates", "Microsoft / Gates Foundation"], ["Andrew Bosworth", "Meta"], ["Larry Page", "Alphabet"],
  ["Craig Federighi", "Apple"], ["Sergey Brin", "Alphabet"], ["Eddy Cue", "Apple"], ["Jeff Bezos", "Amazon"],
  ["Jony Ive", "LoveFrom / OpenAI"], ["Steve Ballmer", "Microsoft"], ["Palmer Luckey", "Anduril"], ["Gwynne Shotwell", "SpaceX"],
  ["Michael Dell", "Dell Technologies"], ["Ruth Porat", "Alphabet"], ["Brad Smith (American lawyer)", "Microsoft"], ["David Baszucki", "Roblox"],
];

function apiUrl(host, parameters) {
  return `https://${host}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", ...parameters })}`;
}

async function json(url) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.ok) return response.json();
    if (response.status !== 429) throw new Error(`${response.status} ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
  }
  throw new Error(`rate limited ${url}`);
}

async function imageBytes(url) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status !== 429) throw new Error(`${response.status} ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  throw new Error(`rate limited ${url}`);
}

function chunks(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

function remappedTitle(title, query) {
  const normalized = query.normalized?.find((entry) => entry.from === title)?.to ?? title;
  return query.redirects?.find((entry) => entry.from === normalized)?.to ?? normalized;
}

async function wikipediaImages() {
  const images = new Map();
  for (const batch of chunks(candidates, 40)) {
    const data = await json(apiUrl("en.wikipedia.org", {
      action: "query", redirects: "1", prop: "pageimages", piprop: "name", titles: batch.map(([title]) => title).join("|"),
    }));
    for (const [requestedTitle] of batch) {
      const pageTitle = remappedTitle(requestedTitle, data.query ?? {});
      const page = data.query?.pages?.find((candidate) => candidate.title === pageTitle);
      if (page?.pageimage) images.set(requestedTitle, { pageTitle: page.title, fileTitle: `File:${page.pageimage}` });
    }
  }
  return images;
}

async function commonsImages(fileTitles) {
  const images = new Map();
  for (const batch of chunks(fileTitles, 40)) {
    const data = await json(apiUrl("commons.wikimedia.org", {
      action: "query", prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "320", titles: batch.join("|"),
    }));
    for (const fileTitle of batch) {
      const pageTitle = remappedTitle(fileTitle, data.query ?? {});
      const info = data.query?.pages?.find((candidate) => candidate.title === pageTitle)?.imageinfo?.[0];
      if (info?.thumburl && info.extmetadata?.LicenseShortName?.value) images.set(fileTitle, info);
    }
  }
  return images;
}

function extensionFor(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function plain(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
const selected = [];
const wikipedia = await wikipediaImages();
const commons = await commonsImages(Array.from(new Set(Array.from(wikipedia.values(), ({ fileTitle }) => fileTitle))));

for (const [requestedTitle, affiliation] of candidates) {
  if (selected.length === TARGET_COUNT) break;
  try {
    const pageImage = wikipedia.get(requestedTitle);
    if (!pageImage) continue;
    const imageInfo = commons.get(pageImage.fileTitle);
    if (!imageInfo) continue;
    const number = String(selected.length + 1).padStart(3, "0");
    const extension = extensionFor(imageInfo.mime);
    const filename = `${number}.${extension}`;
    await writeFile(path.join(OUTPUT_DIRECTORY, filename), await imageBytes(imageInfo.thumburl));
    selected.push({
      id: number,
      name: pageImage.pageTitle,
      affiliation,
      image: `/images/0908/tech-power-faces/${filename}`,
      wikipedia: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageImage.pageTitle.replaceAll(" ", "_"))}`,
      commons: imageInfo.descriptionurl,
      license: plain(imageInfo.extmetadata.LicenseShortName?.value),
      licenseUrl: imageInfo.extmetadata.LicenseUrl?.value ?? "",
      artist: plain(imageInfo.extmetadata.Artist?.value),
      credit: plain(imageInfo.extmetadata.Credit?.value),
    });
    process.stdout.write(`${number} ${pageImage.pageTitle}\n`);
  } catch (error) {
    throw new Error(`Failed to download ${requestedTitle}`, { cause: error });
  }
}

if (selected.length !== TARGET_COUNT) throw new Error(`Collected ${selected.length}; expected ${TARGET_COUNT}`);

const expectedFiles = new Set(selected.map(({ image }) => path.basename(image)));
for (const filename of await readdir(OUTPUT_DIRECTORY)) {
  if (/^\d{3}\.(?:jpe?g|png|webp)$/.test(filename) && !expectedFiles.has(filename)) {
    await rm(path.join(OUTPUT_DIRECTORY, filename));
  }
}

await writeFile(path.join(OUTPUT_DIRECTORY, "attribution.json"), `${JSON.stringify({ collectedAt: "2026-09-15", selected }, null, 2)}\n`);
await writeFile(GENERATED_MODULE, `// Generated by source/collect-tech-power-faces.mjs\nexport const techPowerFaces = ${JSON.stringify(selected.map(({ id, name, affiliation, image }) => ({ id, name, affiliation, image })), null, 2)} as const;\n`);
