# The system map

- Route: `/system`
- Model: `foundations/system/model/` (the one place the map is written)
- Page: `foundations/system/` (`index.tsx`, `panel.tsx`, `diagram/`)
- Made: 2026-11-24 (user: "전체 시스템의 이정표이자 다이어그램 겸 계속 업데이트 될 수 있는", the origin kept up to date, for the artist and for every agent)

The whole work on one sheet: the devices, what passes between them, what the code does today, and what is still asked. What matters most is the structure and the relations from device to device (user, 2026-11-24). The artist and the agents read the same model; the page only draws it. The address holds the view (`/system?v=v2&mode=built&sel=feedback`), so a part can be pointed at.

## The model

| File | What it holds |
| --- | --- |
| `nodes.ts` | The devices and the people, and what G and B carry inside. Each: the notes' sentences with their source, the status of the code, the routes that are its evidence. |
| `relations.ts` | What passes from one to another, and whether the system does it (`computed`) or a person does (`human`). |
| `hypotheses.ts` | The open questions, each tied to the parts it is about. |
| `versions.ts` | The structure as it stood at each date (v0 2026-06 → current), what changed between them, and `LOG`. |
| `references.ts` | Things to look at beside the work (the [agent model book](../components/screen/simulation/docs/models.md)). A reference is never a specification and is never cited as a claim. |
| `notes.ts` | The sources that may be cited; a published note carries its page at `jeanyoon.ch/oi/texts/<key>`, which the page opens in a new window. |
| `types.ts`, `text.ts` | The shapes; `both(ko, en)` for a sentence in both languages. |
| `print.ts` | The current map as plain text, for an agent: every node, relation and question with its status. |
| `model.test.ts` | Every route, file, note and id the map points at exists. |

```sh
node apps/goldfishes/foundations/system/model/print.ts        # the map as text (add ko for Korean)
node --test apps/goldfishes/foundations/system/model/model.test.ts
```

The page: `index.tsx` (the view, held in the address and changed with `history.replaceState`, so no step waits on the server), `diagram/` (the sheet: `layout.ts` where things sit, one arrangement for each major version; `glyphs.tsx` the notes' shapes), `panel.tsx` (the side), `words.ts` (the page's own words in both languages), `prefs.ts` (white or black, 한 or EN, kept in the browser).

## Keeping it true

- **A change that alters what a part does updates the map in the same change.** An experiment that builds a relation, joins two parts, or shows a part does not work sets that node's or relation's `status` and `built`, and adds a line to `LOG`. Tuning, refactors and visual work inside a part do not.
- **Major and minor versions (user, 2026-11-24).** Major (v2 → v3): another structure, a node or a relation added, removed, or given another meaning; it gets its own arrangement in `diagram/layout.ts`. Minor (v2 → v2.1): the same nodes and relations with something in them opened, renamed or qualified (note 1123 opened [0], so it is v2.1). The test holds a minor version to its predecessor's structure. Either comes from a note or from the artist's words, never from an agent's idea.
- **Both languages.** Every sentence the map itself says is `both(ko, en)`. A quotation from a note is never translated; a name from a note stays as written.
- **Every sentence names where it is from.** `own` is the artist's own text; `transcribed` is an AI's reading of handwriting and stays marked as unreliable, `(?)` included; `agent` is an agent's reading. Do not tidy a transcribed sentence into a definition.
- **Agents do not judge.** An agent may add a question, add evidence, and move a question as far as `awaiting`. `supported` and `rejected` need the artist's words and the date in `verdict`.
- **A new note** (see [direction](./direction.md#read-the-notes-first)): read it against the current version, and propose the difference to the artist before writing a version.
- The page has no editing of its own. The model is the source; say what should change, or change the files.

## Where it stands (2026-11-24)

v0–v2.1 were drawn from the EAAS proposal and notes 1020, 1023, 1115, 1118 and 1123; the statuses from the code and each experiment's document. Notes 1118 and 1123 have an empty `핵심 정리`, so v2 and v2.1 rest on transcribed handwriting and wait for the artist's correction.

Seen in the browser (lead, 1305 × 639): the four versions, the three views (관계, 구현, 질문), a node, a relation and a question selected, white and black, 한 and EN. Not checked: a narrow window.
