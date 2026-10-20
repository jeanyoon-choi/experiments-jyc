# Deployed comment audio (FLAC) and `.vercelignore`

Status: current since 2026-10-20. Shared Vercel storage context lives in
[monorepo deployment storage](../../../docs/harness/monorepo.md#deployment-storage).

## Contract

Pages fetch only `public/audio/c-val/exclamations/comments-index.json` and the
1,248 files it lists. Every `src` points to a lossless `.flac` beside its WAV
master in `runs/context-corpus-v1-{cedar,marin}/`. The screens decode them with
`decodeAudioData` exactly as before; profanity timestamps, beep settings, text,
and order are unchanged.

[`.vercelignore`](../.vercelignore) keeps everything else under `exclamations/`
out of the deployment: all WAVs (masters, `raw/` takes, retired
`dialect-v1`/`natural-v2`/`generator-smoke` runs), run `manifest.json` and
`profanity-timestamps.json`, and `beep-tests/`. They stay in git because the
generator, timestamp, and index scripts read them. Do not point runtime code at
a WAV or run JSON without changing `.vercelignore`.

## Regenerating

After generating WAVs and extracting timestamps
([beep censoring](./beep-censoring.md)), run from the repository root:

```sh
node apps/c-val/scripts/encode-c-val-comments-flac.mjs   # needs `brew install flac`
node apps/c-val/scripts/build-c-val-comments-index.mjs
```

The encoder writes `--best` FLAC and fails unless the decoded PCM equals the
WAV data chunk byte for byte. The index builder rewrites `.wav` to `.flac` and
fails if a FLAC is missing.

## Evidence (2026-10-20)

- Deployment before: 231 MB, of which 205 MB WAV. After (simulated with git's
  ignore engine against `.vercelignore`): about 92 MB of `public/`; 2,088 files
  (205 MB) excluded, 0 indexed `src` missing.
- FLAC: 111.1 MB WAV to 67.4 MB. Encoder PCM check, an independent ffmpeg PCM
  md5 check, and a Brave `AudioContext` (48 kHz) `decodeAudioData` comparison
  each found 1,248 of 1,248 identical; the regenerated index differs from the
  old one only in the `src` extension.
- Unverified: Vercel's docs do not state that Git-integration builds honour
  `.vercelignore`. On the first deploy after this change, check the c-val
  deployment's Resources tab: no `.wav` under `/audio`, static total near
  92 MB. If WAVs still appear, move the excluded files out of `public/` instead.
- Pre-existing, unrelated: 4 of 20 tests in the comments and comments-legacy
  `presenter.test.ts` files fail with and without this change (outdated
  expectations, and a corpus path resolving to `apps/public/...`).
