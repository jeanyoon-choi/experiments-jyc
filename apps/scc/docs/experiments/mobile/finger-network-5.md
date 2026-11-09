# Mobile finger-network/5

- **Route:** `/mobile/finger-network/5`
- **Date:** 2026-11-02; rebased on `/4` on 2026-11-09
- **Baseline:** [`/mobile/finger-network/4`](finger-network-4.md), copied whole (touch network, people, `사랑`/`정치` option, readouts). `/4` remains independently addressable.

## Changed variable: no population upper bound

- **사랑 (`model/society.ts`):** the hard cap of 120 living people (which retired the oldest) is removed, and so is the crowding brake: births no longer scale by (1 − population / 70). A fertile couple has a child at 0.35/yr × (0.5 + satisfaction) regardless of how many people are alive.
- **정치 (`model/politics.ts`):** the cap of 120 present people (which retired the earliest) is removed. Turnover still replaces each retiree one for one, so only touches grow the landscape.

Everything else, including every visual and interaction, is `/4`'s.

## Observations

Pure 사랑 runs from eight touch-born adults (seeds 1–3, 390 × 800 field, no further touches, 60 fps steps in Node on a laptop):

- Seeds 2 and 3 went extinct within about 4 minutes, as in `/4`: removing the ceiling does not help a society that never takes off.
- Seed 1 grew exponentially once births outran deaths: 46 people at 240 s, 98 at 300 s, 260 at 360 s, 596 at 420 s, 1,552 at 480 s. Model step time rose from 0.2 ms to 40 ms over that minute and passed 300 ms at about 2,650 people (510 s). Courtship, temptation, crush search, and personal space all scan every living person, so cost grows with population². A phone would stall earlier; device frame time is unmeasured.

Tests: `/4`'s suite minus the population-cap assertion, plus one test per model that 200 added people all stay alive/present.

## Scenes and sound (2026-11-02)

### Scenes (`model/society.ts` acts, drawn in `index.tsx`)

Couples now act out three short scenes. During a scene both people stop walking and make no other decisions.

- **Kiss (1.5 s):** a union now plays a kiss. The two stand 28 px apart, and both bodies lean 15° toward each other, pivoting at the feet, so their faces meet and overlap. The sound plays when the faces meet, 0.28 s in. The union heart is unchanged.
- **Lying together (2.6 s), then birth:** a birth decision no longer produces a child at once. The couple first lie down flat, one slightly over the other, and get up again. The child is born exactly one model year (1.5 s) after they get up, beside the parent who carried it. A couple cannot conceive again while a child is on the way, and the pregnancy ends if the carrier dies.
- **Slaps on divorce (1.7 s):** the leaver slaps first, at 0.4 s, and the one left slaps back, at 1.0 s. Each slap swings the inner arm across to the other's face and snaps the struck head away (a 16° recoil). Then each turns its back on the other and walks off.
- **Betrayal:** no slaps. The betrayer kisses the new partner straight away.

### Sound: recorded takes (`audio.ts`)

**Superseded synthesis.** Two synthesized versions came first: Web Audio oscillators, then sample-level physical models (glottal pulses with Klatt formants, modal resonator banks) rendered in a worker. The user judged both computer-like and stranger than real sound and asked for sound files instead, so the synthesis code was removed.

**The takes.** Every sound is now a real recording, cut into short takes by [`scripts/cut-finger-network-sounds.py`](../../../scripts/cut-finger-network-sounds.py). Each take is peak-normalized, given a short fade, and encoded as a mono MP3 at 32 kHz and 48–56 kbps. There are 28 files in `public/assets/finger-network/sound/`, about 270 KB in all: a kiss or a slap is about 3 KB, a death jingle 10 KB, and a sax phrase 16 KB.

| Event | Takes | Source (license) |
|---|---|---|
| Faces meet (kiss) | 8 | BigSoundBank, Joseph Sardin: [Kisses #1](https://bigsoundbank.com/kisses-s0178.html), [Kiss #3](https://bigsoundbank.com/kiss-3-s2201.html), [Kisses #5](https://bigsoundbank.com/kisses-5-s2202.html) (CC0) |
| Each slap | 6 | BigSoundBank, Joseph Sardin: [Slaps](https://bigsoundbank.com/slaps-s0597.html) (CC0) |
| Betrayal | 2 | BigSoundBank, Joseph Sardin: [Glass Burst](https://bigsoundbank.com/glass-burst-s0148.html), [Broken Glass of Champagne](https://bigsoundbank.com/broken-glass-of-champagne-s1591.html) (CC0) |
| Birth | 4 | BigSoundBank, Joseph Sardin: [1 day old baby crying](https://bigsoundbank.com/one-day-baby-crying-s0873.html) (CC0, 3 takes); the_yura, [Crying newborn baby](https://commons.wikimedia.org/wiki/File:Crying_newborn_baby.ogg) (CC0, 1 take) |
| Touch-born first breath | 3 | BigSoundBank, Joseph Sardin: [Sigh by the Mouth](https://bigsoundbank.com/sigh-by-the-mouth-s1405.html), [Breathless Man](https://bigsoundbank.com/breathless-man-s1103.html) (CC0) |
| Lying together (before a birth) | 2 | Tenor-sax phrases (2.7 s each), cut from J.G.G., [Embraceable You, tenor sax](https://commons.wikimedia.org/wiki/File:Embraceable-you-tenor-sax-by-JGrandgagnage.ogg) (CC BY-SA 4.0; Gershwin composition) |
| Death | 3 | An original 1.7 s 8-bit "you died" jingle (pulse lead, triangle bass, final slide down), rendered by [`scripts/render-finger-network-death-jingle.py`](../../../scripts/render-finger-network-death-jingle.py) |

**Playback.** The files are fetched when the page mounts, and they are decoded once the first touch has unlocked audio. Playback picks a take other than the last one and varies its speed by ±3–6%. It pans the take to the event's position on screen and runs it through a limiter. Each kind of sound has a minimum gap. There are at most 10 voices at once.

**Checks.** In Chrome, all 24 files loaded (255 KB transferred) and the audio context ran. The takes were cut at boundaries from ffmpeg silence detection and loudness curves; nobody has listened to them yet.

**Death cue and sax (2026-11-02).** The first death sound was the 14 s opening of Chopin's funeral march (Paul Pitman, public domain), played at most once every 12 s. Deaths are frequent, so it played almost constantly and read as background music for a 1–2 s moment; the user rejected it. Every cue now lasts about as long as its moment. A death plays a short game-style jingle, as the user asked ("like Mario's death"): an original melody, not Nintendo's. When a couple lies down before a birth, a 2.7 s sultry tenor-sax phrase plays, and the model emits a `lie` event for it.

**Lying-together pose.** On 2026-11-02 the user asked for the pose to read as an act rather than as lying flat. Both bodies now lean back to about 75° instead of 90°. They rock against each other at 3.4 Hz, the upper body out of phase with the lower, with ±7° of sway, a 4 px thrust, and swinging arms and legs.

## Rebase on `/4`, cap removal and sound reconsidered (2026-11-09)

The user had `/5` deleted and recopied whole from `/4`, then asked again for no population upper bound and for the sound to be reconsidered. The scenes above (kiss, lying together, slaps) are therefore gone, and the sections above are history.

- **No upper bound:** the same removals as before. 사랑 has no 120 hard cap and no crowding brake on births; 정치 has no 120 cap. Tests: `/4`'s suite minus the cap assertion, plus the two 200-person tests.
- **Sound on `/4`'s own events** (`audio.ts`, same recorded takes): union (pink heart) → kiss; divorce (grey heart) → one slap; betrayal (red heart) → glass shatter, then the new union's kiss; newborn → cry; death → the 8-bit jingle; a touch-born person settling, in either model → a breath. There is no lying scene, so the sax phrase is no longer played (`lie-*.mp3` stays in the asset folder, unfetched).
- **Thinning for the explosion:** without a ceiling, events per second grow with the population. Minimum gaps were widened (kiss 0.2 s, slap 0.25 s, shatter 0.4 s, cry 0.45 s, death 1.2 s, breath 0.1 s), and at most 6 voices play at once, so a large crowd sounds like a steady texture instead of a pile-up.

## Unresolved

- What, if anything, should end the explosion now that there is no ceiling: deaths, space, resources, or nothing.
- Whether the recorded takes sit well at phone-speaker size, and whether deaths during a population explosion make the jingle too frequent (minimum gap 0.9 s).
- Whether the step should be made sub-quadratic (e.g. a spatial grid for the local scans) so the growth can be watched for longer.
