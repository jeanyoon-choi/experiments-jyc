import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { RAW_KINDS } from "../options.ts";
import { beam, clang, pipe, tink } from "./metal.ts";
import { chime, droop, hymn, pop, swoosh, tap } from "./notify.ts";
import { rawVoice } from "./raw.ts";

// Every computed voice, pinned sample for sample: [length, sha-256 of the Float32 samples, first
// 16 hex]. Recorded 2026-11-18 on Node 26.5.1 (arm64 macOS) from the code as it stood before the
// folder was reorganised, so moving or tidying a voice is provably sample-identical. A digest that
// changes means the sound changed: re-pin only when that was the intent. (V8's Math functions are
// its own, so the digests should hold across machines; if only another platform fails, suspect that.)
// 유리's tones and 군중's yells render through WebAudio and Math.random, and cannot be pinned here.
const PINNED: Record<string, readonly [length: number, digest: string]> = {
  "clang steel 55 1.2": [38400, "dedc3712c571b8d4"],
  "clang steel 58 1.2": [38400, "bac90cbc963de5a6"],
  "clang steel 62 1.2": [38400, "2ecc72f018e3409c"],
  "clang steel 67 1.2": [38400, "e41caa1a834f9b7e"],
  "clang steel 69 1.2": [38400, "2741bc0d817a2f28"],
  "clang steel 74 1.2": [38400, "098b9bf7accc46a4"],
  "clang steel 50 2": [64000, "f5a0fa2f4fa45ff4"],
  "clang aluminium 62 1.4": [44800, "448c31caca761bf3"],
  "tink 86": [9600, "54e7ccde1ba77308"],
  "beam 43 3.6": [115200, "41e9c0b6feb4572d"],
  "beam 50 3.6": [115200, "89aa4cbbeddfa45b"],
  "beam 57 3.2": [102400, "6b3649868144a584"],
  "pipe 55 2.4": [76800, "5943e51803407b7e"],
  "pipe 62 2.4": [76800, "c9320cae2c65c3a3"],
  "pipe 69 2.4": [76800, "e2ad85e9240ef93e"],
  "chime 50": [76800, "4d6fd6f6d722bd87"],
  "chime 62": [76800, "e09df323ac827e6a"],
  "chime 76": [76277, "f657752633aad38b"],
  "chime 31 driven 2.2": [76800, "8f36defd1ac57f5b"],
  "chime 38 driven 2.2": [76800, "5515e1f07238d8ab"],
  "pop 62": [14400, "fce9a0b0fd20f8b9"],
  "pop 74": [14400, "c27161c878469333"],
  "tap 74": [5760, "a45e416e43cabb99"],
  "tap 86": [5760, "4013e4a9bdef8ace"],
  "swoosh 62": [14720, "cd24872e17334203"],
  "swoosh 69": [14720, "93621b8d80724ae5"],
  "hymn 50": [128000, "3b8fe1dc62851ac4"],
  "hymn 62": [128000, "f4c03d04e8972679"],
  "hymn 81": [128000, "04626e41944046e5"],
  "droop chime 50 1.4": [44800, "5a08df292ed768c1"],
  "droop chime 57 1.1": [35200, "f1cd3405eedbfacb"],
  "droop pop 62 0.8": [25600, "1db0f7996e0bb96a"],
  "droop tap 69 0.8": [25600, "a16d8fb5223773c2"],
  "raw instagram x1": [12800, "3540c39295d42a2f"],
  "raw instagram x3": [33280, "3f3052e8cd6bc35c"],
  "raw instagram x12 brutal": [37440, "4700d449e4aadd01"],
  "raw messenger x1": [7040, "3d79edd4eb060f7b"],
  "raw messenger x3": [21120, "4d971c33b277c13e"],
  "raw messenger x12 brutal": [31680, "4cd6156096966308"],
  "raw snapchat x1": [10880, "bce918b478b77044"],
  "raw snapchat x3": [31360, "0ff5e237561ad716"],
  "raw snapchat x12 brutal": [35520, "5bd705443e720fe7"],
  "raw discord x1": [12800, "f4302e3f7a4d83c7"],
  "raw discord x3": [33280, "8ca40dc8e5eb934f"],
  "raw discord x12 brutal": [37440, "984dadec78b50922"],
  "raw whatsapp x1": [8960, "57cda4a5a43eb6a3"],
  "raw whatsapp x3": [26880, "c258633d6714f8da"],
  "raw whatsapp x12 brutal": [33600, "50a0b2694af5b197"],
  "raw slack x1": [13440, "37eaddad98c6d437"],
  "raw slack x3": [33920, "9520ecb61fe57b44"],
  "raw slack x12 brutal": [38080, "4e7418c484aad17f"],
  "raw teams x1": [28800, "ef042da6d823485b"],
  "raw teams x3": [49280, "cef155141fe76766"],
  "raw teams x12 brutal": [53440, "b17d81a4b0ccd640"],
  "raw outlook x1": [28800, "07e7918d3694858d"],
  "raw outlook x3": [49280, "1cd6a47833e09247"],
  "raw outlook x12 brutal": [53440, "d974c848801f1609"],
  "raw zoom x1": [24000, "a0d988523cf67c29"],
  "raw zoom x3": [44480, "07e5255f5dbd2999"],
  "raw zoom x12 brutal": [48640, "2d547155e9d6c800"],
  "raw iphone x1": [17600, "27e630222a3b424a"],
  "raw iphone x3": [38080, "2f3968053e58fb90"],
  "raw iphone x12 brutal": [42240, "e2351affe37ea99b"],
  "raw sent x1": [11520, "117aa448215e33f9"],
  "raw sent x3": [32000, "d8ab472625a1030d"],
  "raw sent x12 brutal": [36160, "d926eb4ab8e3ed1d"],
  "raw haptic x1": [8320, "8df68503a2ada912"],
  "raw haptic x3": [24960, "2f6c0424ffe5f9a1"],
  "raw haptic x12 brutal": [32960, "aede77f0fa583f68"],
};

const renders: Record<string, () => Float32Array> = {};
for (const note of [55, 58, 62, 67, 69, 74]) renders[`clang steel ${note} 1.2`] = () => clang(note, false, 1.2);
renders["clang steel 50 2"] = () => clang(50, false, 2);
renders["clang aluminium 62 1.4"] = () => clang(62, true, 1.4);
renders["tink 86"] = () => tink(86);
for (const note of [43, 50]) renders[`beam ${note} 3.6`] = () => beam(note, 3.6);
renders["beam 57 3.2"] = () => beam(57, 3.2);
for (const note of [55, 62, 69]) renders[`pipe ${note} 2.4`] = () => pipe(note, 2.4);
for (const note of [50, 62, 76]) renders[`chime ${note}`] = () => chime(note);
for (const note of [31, 38]) renders[`chime ${note} driven 2.2`] = () => chime(note, 2.2);
for (const note of [62, 74]) renders[`pop ${note}`] = () => pop(note);
for (const note of [74, 86]) renders[`tap ${note}`] = () => tap(note);
for (const note of [62, 69]) renders[`swoosh ${note}`] = () => swoosh(note);
for (const note of [50, 62, 81]) renders[`hymn ${note}`] = () => hymn(note);
renders["droop chime 50 1.4"] = () => droop("chime", 50, 1.4);
renders["droop chime 57 1.1"] = () => droop("chime", 57, 1.1);
renders["droop pop 62 0.8"] = () => droop("pop", 62, 0.8);
renders["droop tap 69 0.8"] = () => droop("tap", 69, 0.8);
for (const kind of RAW_KINDS) {
  for (const count of [1, 3]) renders[`raw ${kind} x${count}`] = () => rawVoice(kind, count);
  for (const count of [12]) renders[`raw ${kind} x${count} brutal`] = () => rawVoice(kind, count, true);
}
const digest = (data: Float32Array) => createHash("sha256").update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)).digest("hex").slice(0, 16);

test("every computed voice is sample-identical to its pinned render", () => {
  assert.deepEqual(Object.keys(renders), Object.keys(PINNED));
  for (const [name, render] of Object.entries(renders)) {
    const data = render();
    assert.deepEqual([data.length, digest(data)], PINNED[name], name);
  }
});
