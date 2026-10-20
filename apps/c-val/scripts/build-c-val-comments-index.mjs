import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptRoot, "..");
const publicRoot = path.join(appRoot, "public");
const outputPath = path.join(
  publicRoot,
  "audio/c-val/exclamations/comments-index.json",
);
const runNames = ["context-corpus-v1-cedar", "context-corpus-v1-marin"];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const corpus = await readJson(
  path.join(scriptRoot, "collections/c-val-context-minimal-utterances.json"),
);
const stylesById = new Map(corpus.styles.map((style) => [style.id, style]));

const entries = [];
for (const runName of runNames) {
  const runDirectory = path.join(
    publicRoot,
    "audio/c-val/exclamations/runs",
    runName,
  );
  const manifest = await readJson(path.join(runDirectory, "manifest.json"));
  const timestamps = await readJson(
    path.join(runDirectory, "profanity-timestamps.json"),
  );
  const timestampsByFile = new Map(
    timestamps.files.map((record) => [record.fileName, record]),
  );

  for (const file of manifest.files) {
    const timestamp = timestampsByFile.get(file.fileName);
    const style = stylesById.get(file.styleId);
    if (!timestamp || !style) {
      throw new Error(`Missing comment metadata for ${runName}/${file.fileName}`);
    }
    // Pages fetch the lossless FLAC; the WAV master is not deployed.
    const src = file.src.replace(/\.wav$/, ".flac");
    await access(path.join(publicRoot, src)).catch(() => {
      throw new Error(`Missing ${src}; run encode-c-val-comments-flac.mjs first`);
    });
    entries.push({
      id: `${manifest.voice}:${file.id}`,
      voice: manifest.voice,
      dialectId: file.dialectId,
      dialectLabel: file.dialectLabel,
      presetId: file.presetId,
      styleId: file.styleId,
      valence: style.valence,
      arousal: style.arousal,
      text: file.text,
      src,
      profanityStatus: timestamp.profanityStatus,
      profanityStart: timestamp.start,
      profanityEnd: timestamp.end,
    });
  }
}

await writeFile(
  outputPath,
  `${JSON.stringify({
    schemaVersion: 1,
    generatedFrom: runNames,
    beep: {
      frequencyHz: 1000,
      peakGain: 0.175,
      fadeSeconds: 0.006,
    },
    entries,
  })}\n`,
  "utf8",
);

console.log(`Wrote ${entries.length} C-VAL comment performances to ${outputPath}`);
