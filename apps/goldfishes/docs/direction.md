# Goldfishes: direction

Read this before any task that touches what the work means or how its system behaves (a new experiment, the logic, the signs, the audience's part). A fix inside one route does not need it. It holds where things stand; the artist's notes hold the thinking and keep changing.

## Read the notes first

The artist writes in Google Docs; the notes are transcribed into the portfolio repository, which any agent on this machine can read:

- `/Users/jeongyoonchoi/Desktop/project/portfolio-v4/content/texts/entries/notes-YYYY-MM-DD-*.json`, field `original`. Read the latest dated ones first (`ls` the folder; do not rely on the list below staying current). In each, only the block under `핵심 정리` is the artist's own text; what follows `아래 내용: AI 번역, 부정확` is an AI's reading of handwriting and is unreliable. `[AI 추가 레퍼런스]` marks text an AI added.
- `…/content/texts/GLOSSARY.md` for the artist's terms.
- Entry points as of 2026-11-18: `notes-2026-11-15-heterogenous-simulation`, `-11-11-filter-bubble`, `-11-06-goldfishes`, `-10-20-goldfishes`.

Do not copy the notes here. If a note and this file disagree, the note is right and this file is stale: fix it.

## What the work is

Goldfish are people; bubbles are platforms and their algorithms; a bubble carries a sign (a keyword, an object). Each agent optimises only what is in front of it — the fish its next stimulus, the bubble its own audience — with no long-term aim (근시사회, local optimisation). Nobody controls the whole, the audience who make bubbles included; what the screen does is what emerges. The work is the 2020s web and attention economy, never earlier devices.

## Where it stands (2026-11-18)

- **`bubble/` is the visual ground.** Materials, objects, the liquid morph, the goldfish and their deaths. Its logic is PageRank on purpose: a cheap engine that is already lively, there so the visuals could be worked on. Work in `bubble/` stays visual; do not "fix" its logic.
- **`simulation/` is the logic**, begun 2026-11-18: the agents' rules on their own first, then on bubble's body. [simulation/0](../components/screen/simulation/docs/0.md) has the engine, what was measured and the next steps.
- **Later, in this order:** agents that differ (each fish and bubble with its own numerical disposition, changing as it interacts), then a slow semantic layer driven by AI agents. No runtime LLM calls yet: there is no budget for them and the system is not settled.

## What was tried: the model, M1–M9.1 (2026-11-14/16)

A weekend of modelling in a plain 2D canvas, with the artist judging each version. None was accepted; `bubble/9` still looked better. Sources: [all versions, runnable](../components/screen/simulation/docs/model/goldfishes-all-versions.html) and [the document](../components/screen/simulation/docs/model/goldfishes-model.pdf) (formulas, measurements, the artist's 25 corrections).

| Version | Rule in one line | Verdict |
|---|---|---|
| M1 | fish follow the screen-wide trend; bubbles copy a busier neighbour | the big sign keeps winning; lively |
| M2 | signs wear out as they are watched (one freshness for all) | random, too fast |
| M3 | keywords (slow) and their shapes (fast) wear out | the liveliest; but freshness is a global value and new signs come from nowhere |
| M4.1, M4.6 | everything local; then hysteresis, budding, grace periods | the same swap repeats; too many devices (13 parameters) |
| M5 | one quantity, no dice, win-stay lose-shift | locked into one lineage |
| M6, M7 | bubbles choose what the fish nearby would find fresh | dull; a bubble reading fish minds is not myopic |
| M8 | fish see only touching bubbles; bubbles copy the busiest neighbour | frozen, or in uproar with no input |
| M8.1, M8.2 | move only when clearly better; copy only when losing fish; burst over capacity | M8.2 the first to pass: still without input, a stroke answered |
| M9 | fish arrive with a stroke and leave when bored | uproar under many strokes, quiet minutes after. **The engine kept.** |
| M9.1 | M9 with centre and rim evened | first try dull; second undecided |

Found on the way (measured, in the document): the state the screen rests in is decided by how new keywords enter, so a path that makes them without input puts it in uproar for ever; bursting moves bubbles but hardly changes the flow; copying alone ends in one keyword (the voter model), so several never live side by side; the liveliness of M1 and M3 came from size differences, bursts and pushing, not from their rules.

## Principles (the artist's, from those corrections)

- Occam's razor. One objective per agent. No device bolted on to get a wanted scene; a scene (a cluster, a takeover) must come out as a result.
- Myopic means it: an agent sees only what touches it. No sight at a distance, no global value, no reading another agent's mind.
- New things come only from the audience. With no input the screen rests; an input changes the flow.
- A complex system has no fixed cause and effect. Do not report "this input gives that result"; show how differently the same input is answered. 다이내믹-다이내믹 is the aim; one state going on for ever, uproar included, is static.
- Measure, then look: numbers and captures of the running screen must both hold before showing the artist. Do not swap the artist's words for a textbook definition, or read an example as a specification.
- Stay inside what the artist is thinking. No generic "AI" experiment, no idea padded in from outside the notes; if a rule seems needed, ask first.
