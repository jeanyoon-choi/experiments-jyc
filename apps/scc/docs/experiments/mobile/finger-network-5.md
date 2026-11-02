# Mobile finger-network/5

- **Route:** `/mobile/finger-network/5`
- **Date:** 2026-11-02
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

### Sound (`synth.ts`, `synth-worker.ts`, `audio.ts`)

The first version used Web Audio oscillators (sine pops, a sawtooth voice). The user heard it as too computer-like. Every sound is now rendered sample by sample from a physical model:

- **Kiss:** a soft low lip press. Then the wet release: one pop plus 3–8 micro clicks ringing a mouth cavity whose resonance rises from about 0.8 to 2.3 kHz as it opens. A nasal exhale follows.
- **Slap:** a short air whoosh, then a 2.5–4 ms skin contact that rings five damped flesh modes (160–700 Hz) and a cheek-cavity resonance.
- **Betrayal:** glass shattering. Accelerating fracture crackles, a 12-mode body, a low knock, and 10–16 shards, each with its own modes, landing and bouncing with shrinking gaps.
- **Newborn cry:** a Rosenberg glottal pulse at about 400–530 Hz with cycle jitter and shimmer and a period-doubling stretch of roughness. Open-phase aspiration and a cascade of four Klatt formants open from "w" into an infant "a". An inspiratory squeak follows each cry, and 40% of cries have two syllables.
- **Touch-born first breath:** a formant-shaped gasp with flutter and a throat catch, then a breathy, voiced sigh.
- **Death:** a few bars of slow, humanised minor piano (three variants). Each note is built from stretched partials with hammer-position weighting, a two-stage decay, and beating unison strings.

Ceramic cracking is still rendered by `renderCrack` but no longer played. Deaths were silent in the first version.

**Rendering and playback.** A module worker renders a small pool of takes per kind after the first touch, so the animation never waits on synthesis. Measured in Node: the cry takes 13–31 ms, glass 33–39 ms, and each piano variant about 290 ms at 48 kHz; the piano is rendered at half rate. Playback picks a take other than the last one, varies its speed by up to ±8%, pans it to the event's position, and sends it through a generated room and a limiter. Each kind has a minimum gap, and the requiem plays at most once every 7 s. There are at most 10 voices at once.

**Checks.**
- All takes render with no non-finite samples.
- A test covers the scene rules: every birth comes one model year after its parents get up from lying down, and slaps come in returned pairs.
- In Chrome, kisses with hearts, lying couples, and births were seen on screen, and the audio context ran.
- Nobody has listened to the new sounds yet.

## Unresolved

- What, if anything, should end the explosion now that there is no ceiling: deaths, space, resources, or nothing.
- Whether the synthesized sounds read as real at phone-speaker size; recorded samples would be the next step if not.
- Whether the step should be made sub-quadratic (e.g. a spatial grid for the local scans) so the growth can be watched for longer.
