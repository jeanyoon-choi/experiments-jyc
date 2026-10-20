import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// Encodes every comment performance WAV as a lossless FLAC beside it and
// proves the decoded PCM is byte-identical. Deployed pages fetch only the FLAC;
// the WAV masters stay in git for the generator and timestamp scripts.
// Requires the `flac` CLI (`brew install flac`).

const run = promisify(execFile);
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptRoot, "..");
const publicRoot = path.join(appRoot, "public");
// Keep in sync with build-c-val-comments-index.mjs.
const runNames = ["context-corpus-v1-cedar", "context-corpus-v1-marin"];
const concurrency = 8;

function wavPcm(buffer, label) {
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF"
    || buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error(`${label} is not a RIFF/WAVE file`);
  }
  let format = null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      format = {
        audioFormat: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bitsPerSample: buffer.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      if (!format || format.audioFormat !== 1) {
        throw new Error(`${label} is not integer PCM`);
      }
      return { format, data: buffer.subarray(body, body + size) };
    }
    offset = body + size + (size % 2);
  }
  throw new Error(`${label} has no data chunk`);
}

async function encode(wavPath) {
  const flacPath = wavPath.replace(/\.wav$/, ".flac");
  const label = path.relative(publicRoot, wavPath);
  const { data } = wavPcm(await readFile(wavPath), label);
  await run("flac", ["--best", "--silent", "--force", "-o", flacPath, wavPath]);
  const { stdout } = await run(
    "flac",
    [
      "--decode",
      "--silent",
      "--force-raw-format",
      "--endian=little",
      "--sign=signed",
      "--stdout",
      flacPath,
    ],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
  );
  if (!data.equals(stdout)) {
    throw new Error(`${label}: decoded FLAC PCM differs from the WAV`);
  }
  return {
    wavBytes: (await stat(wavPath)).size,
    flacBytes: (await stat(flacPath)).size,
  };
}

const wavPaths = [];
for (const runName of runNames) {
  const runDirectory = path.join(
    publicRoot,
    "audio/c-val/exclamations/runs",
    runName,
  );
  const manifest = JSON.parse(
    await readFile(path.join(runDirectory, "manifest.json"), "utf8"),
  );
  for (const file of manifest.files) {
    wavPaths.push(path.join(publicRoot, file.src));
  }
}

let wavBytes = 0;
let flacBytes = 0;
let next = 0;
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next < wavPaths.length) {
      const sizes = await encode(wavPaths[next++]);
      wavBytes += sizes.wavBytes;
      flacBytes += sizes.flacBytes;
    }
  }),
);

console.log(
  `Encoded ${wavPaths.length} lossless FLAC performances: `
    + `${(wavBytes / 1e6).toFixed(1)} MB WAV -> ${(flacBytes / 1e6).toFixed(1)} MB FLAC`,
);
