import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, copyFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(sourceDirectory, "../../../../..");
const attributionPath = path.join(appDirectory, "public/images/0908/tech-power-faces/attribution.json");
const legacyDirectory = path.join(appDirectory, "public/images/0908/tech-power-faces");
const previousDirectory = path.join(appDirectory, "public/images/0922/tech-eye-3d");
const outputDirectory = path.join(previousDirectory, "portraits");
const profilesPath = path.resolve(sourceDirectory, "../model/tech-eye-3d-profiles.generated.json");
const visionScript = path.join(sourceDirectory, "inspect-all-eye-landmarks.swift");
const CONCURRENCY = 2;
let apiSpacingMs = 1_000;
let nextApiRequestAt = 0;
// One API-throttled portrait recovered directly from its immutable Commons URL.
// Keeping this exception makes a later regeneration reproduce its actual source
// rather than downgrade it to the local 320px fallback.
const DIRECT_COMMONS_ORIGINALS = new Map([
  ["075", { url: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Kevin_Scott.jpg", size: [1024, 684] }],
]);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} exited ${code}: ${stderr}`)));
  });
}

async function mapLimited(items, action) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await action(items[index], index);
    }
  }));
  return results;
}

function commonsTitle(url) {
  const decoded = decodeURIComponent(new URL(url).pathname);
  const marker = "/wiki/";
  const index = decoded.indexOf(marker);
  if (index < 0) throw new Error(`Not a Commons file page: ${url}`);
  return decoded.slice(index + marker.length).replace(/_/g, " ");
}

async function imageInfo(source) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", format: "json", prop: "imageinfo", iiprop: "url|size", iiurlwidth: "1024", iiurlheight: "1024", titles: commonsTitle(source),
  }).toString();
  let response;
  for (let attempt = 0; attempt < 5; attempt++) {
    const now = Date.now();
    const wait = Math.max(0, nextApiRequestAt - now);
    nextApiRequestAt = Math.max(nextApiRequestAt, now) + apiSpacingMs;
    if (wait) await sleep(wait);
    response = await fetch(api, { headers: { "user-agent": "SCC-Goldfishes-source-preparation/1.0" } });
    if (response.status !== 429) break;
    apiSpacingMs = Math.min(4_000, Math.max(1_250, apiSpacingMs * 1.5));
    await sleep(apiSpacingMs * (attempt + 1));
  }
  if (!response?.ok) throw new Error(`Commons API ${response?.status ?? "network_failure"}`);
  const payload = await response.json();
  const page = Object.values(payload.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url || !info?.width || !info?.height) throw new Error("Commons imageinfo missing");
  const useOriginal = Math.max(info.width, info.height) <= 1024;
  return { url: useOriginal ? info.url : info.thumburl, sourceSize: [info.width, info.height], sourceKind: useOriginal ? "commons-original" : "commons-1024-thumbnail" };
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { "user-agent": "SCC-Goldfishes-source-preparation/1.0" } });
  if (!response.ok) throw new Error(`Image download ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Image download empty");
  await writeFile(destination, bytes);
}

async function convertToJpeg(input, output) {
  await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "85", input, "--out", output]);
}

async function prepareAsset(person, scratch, prior) {
  const filename = `${person.id}.jpg`;
  const output = path.join(outputDirectory, filename);
  if (Number(person.id) <= 5) {
    await copyFile(path.join(previousDirectory, `portrait-${filename}`), output);
    return { ...person, assetOrigin: "reused-existing-commons-raster", resolvedSource: person.commons };
  }
  const direct = DIRECT_COMMONS_ORIGINALS.get(person.id);
  if (direct) {
    await download(direct.url, output);
    return { ...person, assetOrigin: "commons-original-direct", resolvedSource: direct.url, sourceSize: direct.size };
  }
  const existing = prior.get(person.id);
  if (existing && existing.assetOrigin !== "local-320px-fallback") {
    return {
      ...person,
      assetOrigin: existing.assetOrigin,
      resolvedSource: existing.resolvedSource,
      sourceSize: existing.sourceSize,
      sourceResolutionStatus: existing.sourceResolutionStatus,
      sourceError: existing.sourceError,
    };
  }
  try {
    const resolved = await imageInfo(person.commons);
    // sips uses the extension while decoding; retain the Commons filename type
    // instead of presenting an otherwise valid JPEG/PNG as an extensionless blob.
    const extension = path.extname(new URL(resolved.url).pathname) || ".image";
    const downloaded = path.join(scratch, `${person.id}.source${extension}`);
    await download(resolved.url, downloaded);
    await convertToJpeg(downloaded, output);
    return { ...person, assetOrigin: resolved.sourceKind, resolvedSource: resolved.url, sourceSize: resolved.sourceSize };
  } catch (error) {
    const local = path.join(legacyDirectory, path.basename(person.image));
    await convertToJpeg(local, output);
    return {
      ...person,
      assetOrigin: "local-320px-fallback",
      resolvedSource: person.image,
      sourceResolutionStatus: "commons_access_blocked_or_unavailable",
      sourceError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function inspect(files) {
  const { stdout } = await run("swift", [visionScript, ...files]);
  return new Map(stdout.trim().split("\n").filter(Boolean).map((line) => {
    const record = JSON.parse(line);
    return [record.file, record];
  }));
}

function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

async function main() {
  const attribution = JSON.parse(await readFile(attributionPath, "utf8"));
  if (!Array.isArray(attribution.selected) || attribution.selected.length !== 80) throw new Error("Expected the 80 selected source records");
  const previousProfiles = JSON.parse(await readFile(profilesPath, "utf8").catch(() => "[]"));
  const prior = new Map(previousProfiles.map((profile) => [profile.id, profile]));
  await mkdir(outputDirectory, { recursive: true });
  const scratch = await mkdtemp(path.join(tmpdir(), "goldfishes-tech-eye-3d-"));
  try {
    const prepared = await mapLimited(attribution.selected, (person) => prepareAsset(person, scratch, prior));
    const landmarks = await inspect(prepared.map((person) => path.join(outputDirectory, `${person.id}.jpg`)));
    const profiles = prepared.map((person) => {
      const landmark = landmarks.get(`${person.id}.jpg`);
      if (!landmark) throw new Error(`No Vision output for ${person.id}`);
      if (landmark.error) {
        const [width, height] = landmark.size;
        const side = Math.min(width, height);
        const pupil = [rounded(width / 2), rounded(height / 2)];
        return {
          id: person.id,
          name: person.name,
          affiliation: person.affiliation,
          sourceImage: `/images/0922/tech-eye-3d/portraits/${person.id}.jpg`,
          size: landmark.size,
          // A finite source-image crop allows the renderer to retain this
          // original photo while its eye geometry is explicitly unavailable.
          crop: [rounded((width - side) / 2), rounded((height - side) / 2), rounded(side)],
          eye: [],
          pupil,
          iris: [pupil[0], pupil[1], rounded(side * 0.04), rounded(side * 0.02)],
          source: person.commons,
          license: person.license,
          licenseUrl: person.licenseUrl,
          artist: person.artist,
          credit: person.credit,
          wikipedia: person.wikipedia,
          assetOrigin: person.assetOrigin,
          resolvedSource: person.resolvedSource,
          sourceSize: person.sourceSize,
          sourceResolutionStatus: person.sourceResolutionStatus,
          sourceError: person.sourceError,
          visionStatus: landmark.error,
        };
      }
      const [minX, minY, maxX, maxY] = landmark.eyeBounds;
      const eyeWidth = maxX - minX;
      const eyeHeight = maxY - minY;
      return {
        id: person.id,
        name: person.name,
        affiliation: person.affiliation,
        sourceImage: `/images/0922/tech-eye-3d/portraits/${person.id}.jpg`,
        size: landmark.size,
        crop: landmark.crop.map(rounded),
        eye: landmark.eye.map(([x, y]) => [rounded(x), rounded(y)]),
        pupil: landmark.pupil.map(rounded),
        iris: [rounded(landmark.pupil[0]), rounded(landmark.pupil[1]), rounded(eyeWidth * 0.2), rounded(Math.max(1, eyeHeight * 0.3))],
        source: person.commons,
        license: person.license,
        licenseUrl: person.licenseUrl,
        artist: person.artist,
        credit: person.credit,
        wikipedia: person.wikipedia,
        assetOrigin: person.assetOrigin,
        resolvedSource: person.resolvedSource,
        sourceSize: person.sourceSize,
        sourceResolutionStatus: person.sourceResolutionStatus,
        sourceError: person.sourceError,
        visionStatus: "ok",
      };
    });
    await writeFile(profilesPath, `${JSON.stringify(profiles, null, 2)}\n`);
    const fallbacks = profiles.filter((profile) => profile.assetOrigin === "local-320px-fallback").length;
    console.log(JSON.stringify({ profiles: profiles.length, fallbacks, outputDirectory, profilesPath }));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

await main();
