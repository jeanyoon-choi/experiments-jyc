# C-VAL profanity timestamp and beep workflow

This is the handoff record for censoring the existing C-VAL voice corpus. The
audio tooling is repository-level and version-independent. It does not modify
or belong to C-VAL 1 or C-VAL 2.

## Accepted relation

Keep every generated Cedar and Marin WAV unchanged. Do not regenerate speech
and do not create a second censored copy of the complete corpus. Store only the
time interval occupied by `씨발` for each source file. At playback time, mute
that interval in the original track and schedule the established broadcast
beep over the same interval with Web Audio.

The two source runs are:

- `public/audio/c-val/exclamations/runs/context-corpus-v1-cedar/`
- `public/audio/c-val/exclamations/runs/context-corpus-v1-marin/`

Each run contains 624 WAV files: 78 utterances across eight dialect directions.
The runs use the same text corpus but have different timing because Cedar and
Marin are separate performances. Never reuse one voice's timestamps for the
other voice.

## Timestamp extraction

Run:

```sh
/opt/homebrew/Caskroom/miniconda/base/bin/python \
  apps/c-val/scripts/extract-c-val-profanity-timestamps.py
```

The script reads each source run's `manifest.json`, runs
`mlx-community/whisper-large-v3-turbo` locally with word timestamps, and
identifies the profanity word. It then tightens Whisper's broad word interval
to the active portion of the original waveform at a -42 dBFS threshold and
adds 15 ms of padding. It writes one resumable sidecar per source run:

```text
public/audio/c-val/exclamations/runs/context-corpus-v1-cedar/profanity-timestamps.json
public/audio/c-val/exclamations/runs/context-corpus-v1-marin/profanity-timestamps.json
```

Audio never leaves the local computer. The MLX model is downloaded once into
the local Hugging Face cache and then reused. Up to twelve source clips are
placed on one temporary in-memory timeline with 750 ms gaps, aligned in one
Whisper window, and mapped back to their independent source clocks. No combined
audio file is retained. If the grouped pass does not explicitly recognize a
profanity spelling, that source WAV is immediately transcribed again by itself
with its own expected text as the prompt. The process requires Apple Metal
GPU access; a headless or sandboxed process without Metal will fail before
reading the corpus. The script checkpoints after every eight files, so rerunning
it resumes missing files. Use `--overwrite` only when every alignment should be
computed again. Useful bounded controls are `--runs <comma-separated names>`
and `--limit <n>`.

The implementation deliberately preserves the returned transcript and word
list in the sidecar so questionable matches can be audited without rerunning
inference.

After extraction, encode the FLAC copies and rebuild the comments index as in
[deployed comment audio](./deployment-storage.md); pages play the FLAC, not the
WAV.

## Sidecar contract

Every file record contains:

```json
{
  "fileName": "seoul-casual-u005-take-01.wav",
  "src": "/audio/c-val/exclamations/runs/context-corpus-v1-cedar/seoul-casual-u005-take-01.wav",
  "text": "아니, 씨발.",
  "profanityPosition": "final",
  "transcript": "아니, 씨발.",
  "recognizedWords": [
    { "word": "아니,", "start": 0, "end": 0.32 },
    { "word": "씨발.", "start": 0.56, "end": 1.3 }
  ],
  "matchedWord": "씨발.",
  "selectionMethod": "recognized-profanity",
  "rawStart": 0.56,
  "rawEnd": 1.3,
  "activeStart": 0.78,
  "activeEnd": 1.39,
  "start": 0.765,
  "end": 1.39
}
```

`start` and `end` are the runtime censor bounds. They include at most 15 ms of
padding around the recognized word and are clamped to the audio duration.
`rawStart` and `rawEnd` preserve Whisper's unrefined result. `activeStart` and
`activeEnd` preserve the waveform-refined speech activity before padding.

Some generated source files do not actually contain the profanity requested by
their text prompt. Those records use `profanityStatus:
"missing-in-source-audio"` and `start: null`, `end: null`; runtime playback
must leave them unchanged. Ambiguous recognitions are resolved in
`apps/c-val/scripts/collections/c-val-profanity-timestamp-overrides.json`, which records
the waveform evidence and makes every manual audit decision reproducible.

Preferred `selectionMethod` values are `recognized-profanity` and
`recognized-profanity-position`. `declared-position-fallback` means the
transcriber did not spell the profanity as one of `씨발`, `시발`, `씨팔`, or
`시팔`; the script selected a timestamped word using the source manifest's
declared initial/medial/final position. Agents must audit every fallback before
treating a corpus as accepted.

## Source beep contract

The accepted source/audition beep is the original test beep:

- sine wave: 1000 Hz
- effective peak amplitude: 0.175 in Web Audio (`ffmpeg` sine default `0.125`
  multiplied by the established level factor `1.4`)
- attack and release: 6 ms linear fades
- duration: exactly `end - start`

Use one audio clock for both the source and oscillator. An `AudioBufferSourceNode`
feeds a `GainNode`; automate that gain to zero only from `start` to `end`.
Schedule an `OscillatorNode` through its own gain envelope over the same
absolute `AudioContext.currentTime` interval. Do not coordinate two HTML audio
elements with `setTimeout`, because that introduces avoidable scheduling drift.

The browser-only C-VAL comments presentation applies a reversible final trim:
70% peak gain, 12 ms attack/release, and a 2.5% exponential downward frequency
glide over the censored interval. These values are shared by current comments,
legacy comments, and the media overlay in
`components/screen/comment-beep.ts`; they do not change source WAVs, sidecars,
or command-line audition output.

### C-VAL 2 rapid-move presentation trial — 2026-08-12

The C-VAL 2 comments screen retains this 1000 Hz value as the neutral beep
base. When selected speech receives a market-driven playback-rate and detune
transform, the beep keeps the full playback-rate multiplier but receives 0.3×
the detune in cents. Its duration still tracks the adjusted profanity interval,
while the smaller pitch displacement preserves its broadcast-censor identity.
This is a browser presentation effect only; the source WAV files, timestamp
sidecars, and command-line neutral-beep audition remain unchanged.

The command-line audition helper uses the same relation for a known interval:

```sh
node apps/c-val/scripts/censor-c-val-profanity.mjs \
  --input path/to/source.wav \
  --output path/to/audition.wav \
  --start 0.782 \
  --end 1.394125
```

It exists for listening tests only. Its default 1000 Hz frequency and `1.4`
level factor are the accepted beep. Do not use it to duplicate the full corpus
unless a later export requirement explicitly needs self-contained censored
files.

## Acceptance audit

Before application integration, verify all of the following:

1. Both sidecars report `status: "complete"`.
2. Each sidecar reports `expectedFiles: 624` and `completedFiles: 624`.
3. File names are unique and match the corresponding source manifest exactly.
4. Every record satisfies `0 <= start < end <= audio duration`.
5. `fallbackFiles` is zero. Audited recognition variants and genuinely omitted
   source profanity are represented through the explicit override ledger, not
   silent position-only inference.
6. Original WAV byte counts and existing source manifests remain unchanged.

The application embedding is intentionally deferred. The current artifact is
the complete, auditable timestamp layer only.

## Completed corpus state

The 2026-08-11 extraction and audit produced:

- Cedar: 624 assessed files; 622 with censor intervals, two whose source audio
  omitted the prompted profanity, four waveform-audited overrides, zero
  fallbacks, and zero errors.
- Marin: 624 assessed files; 617 with censor intervals, seven whose source audio
  omitted the prompted profanity, twelve waveform-audited overrides, zero
  fallbacks, and zero errors.
- Combined: 1,248 unique source files in exact manifest order; 1,239 usable
  censor intervals and nine explicit `missing-in-source-audio` records.

The nine source omissions are listed in the override ledger with their audit
reasons. They must play unchanged at runtime because there is no profanity
performance to cover.
