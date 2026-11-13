# Goldfishes archive

## Layout

One folder is one unit: a family holds its versions and its own notes, and is moved, copied or removed whole.

| Where | What |
| --- | --- |
| `components/<family>/<serial>/` | A version's code. Serials rise with creation date. Current families: `bubble`, `mobiles`, `native-windows`. |
| `components/<family>/docs/<serial>.md` | That version's notes, beside the code (`9b.md` for a route with no folder of its own). Other notes of the family sit in the same folder. |
| `components/screen-archive/<family>/…` | The screen families before 2026-10-20 (`default`, `2d`, `attraction-targets`, `pillars`, `media-grid`, `keyword-field`, `overlay-2d`, `overlay-3d`, `attention-print`, `tech-eyes`), each with its `docs/`. |
| `components/pc-archive/<family>/…` | The failed pc trials (`news-phones`, `image-search`), each with its `docs/`. |
| `components/experiments.ts` | The registry: every routable experiment, its route key, area, ISO dates and loader. Authoritative. |
| `socket/experiments/<protocol>/<n>/` | A socket protocol version, whole: the relay (`index.mjs`, `protocol.mjs`), its browser side (`client/`) and its contract (`README.md`). |
| `foundations/navigation/` | The index pages; `families.ts` lists each family's members for the group view (`?view=group`; a key missing there shows as "unsorted"). |
| `app/` | Thin routes only: they look a key up in the registry and render it. |
| `docs/` | Only what belongs to no single family: this index, [onboarding](./agent-onboarding.md), [history](./research-and-rendering-history.md). |

Rules:
- Experiments never import from each other, and nothing in `components/` is shared between families. The one shared import is a socket protocol's `client/` (`@/socket/experiments/feed/1/client`), picked by version in the import path; `native-windows/shared/` is shared inside its own family only.
- A new family is a new folder under `components/` with its `docs/`, registry entries and a `families.ts` entry. A breaking protocol change copies `socket/experiments/<protocol>/<n>/` whole to `<n+1>` and registers it in `socket/experiments/index.mjs`.
- Routes are registry keys and did not move with the folders (2026-11-13): `/screen/bubble/9` is `components/bubble/9/`. A key's first part is its area (`screen`, `pc`, `desktop`), which the index pages filter by. Archived routes are never repurposed. Dates are registry data; date archives stay at `/<area>/<MMDD>`.
- Removed: `components/mobile/` (`mobile/keyword-grid/1–2`, 2026-09-30) with its routes and notes, on 2026-11-13 at the user's request. It is in git history at commit `14c9b1fb`.

Local macOS control: `/desktop` → independent versions [1](../components/native-windows/docs/1.md), [2](../components/native-windows/docs/2.md), [3](../components/native-windows/docs/3.md) at `components/native-windows/{1,2,3}/`. Their control API stays at `/api/desktop/0915/{1,2,3}`; process control, app adapters, motion and controller primitives are shared in `components/native-windows/shared/` ([details](../components/native-windows/docs/1.md#shared-infrastructure)). [Original fixed-score history](../components/native-windows/docs/0915-desktop-a.md).

For a route change, read its document, the specific modules being changed, and the registry. Read [onboarding](./agent-onboarding.md) when creating or substantially changing a Goldfishes experiment; consult [history](./research-and-rendering-history.md) only for a relevant rendering, measurement, or historical-decision question.

Chronological log:

| Route | Date | Former route | Proposition |
| --- | --- | --- | --- |
| `/screen/2d/1` | retained | — | Glyph swarm and media cells. [doc](../components/screen-archive/2d/docs/1.md) |
| `/screen/default` | baseline (undated, earliest) | — | Orthographic 3D attention field. [doc](../components/screen-archive/default/docs/README.md) |
| `/screen/attraction-targets/1` | 2026-08-04 | `/screen/0804/tube` | Stations are fixed attraction targets. [doc](../components/screen-archive/attraction-targets/docs/1.md) |
| `/screen/attraction-targets/2` | 2026-08-04 | `/screen/0804/html` | Live HTML forms enter the attention loop. [doc](../components/screen-archive/attraction-targets/docs/2.md) |
| `/screen/attraction-targets/3` | 2026-08-04 | `/screen/0804/node-edge` | A revealed 3D topology is the field. [doc](../components/screen-archive/attraction-targets/docs/3.md) |
| `/screen/pillars/1` | 2026-08-04 | `/screen/0804/pillars` | Selected cells become symmetric pillars. [doc](../components/screen-archive/pillars/docs/1.md) |
| `/screen/media-grid/1` | 2026-08-06 | `/screen/0806/compositional-grid` | Selections seed local 2×2 media structures. [doc](../components/screen-archive/media-grid/docs/1.md) |
| `/screen/pillars/2` | 2026-08-06 | `/screen/0806/side-view` | Pillars begin side-on. [doc](../components/screen-archive/pillars/docs/2.md) |
| `/screen/pillars/3` | 2026-08-06 | `/screen/0806/duration` | Clicks accumulate downward duration. [doc](../components/screen-archive/pillars/docs/3.md) |
| `/screen/pillars/4` | 2026-08-06 | `/screen/0806/temporal-decay` | Traces freeze after a lifetime. [doc](../components/screen-archive/pillars/docs/4.md) |
| `/screen/attention-print/1` | 2026-09-08 | `/screen/0908/attention-print` | Serial technology signs, vermilion fish and accumulated ink. [doc](../components/screen-archive/attention-print/docs/1.md) |
| `/screen/keyword-field/1` | 2026-09-08 | `/screen/0908/dots` | Instagram/4 copied unchanged as an independent experiment. [doc](../components/screen-archive/keyword-field/docs/1.md) |
| `/screen/keyword-field/2` | 2026-09-08 | `/screen/0908/aggregated` | A 3D school attends the spreading Instagram/4 keyword field. [doc](../components/screen-archive/keyword-field/docs/2.md) |
| `/screen/overlay-2d/1` | 2026-09-08 | `/screen/0908/overlay-2d` | Original field with the Canvas2D goldfish glyph from 2d/1. [doc](../components/screen-archive/overlay-2d/docs/1.md) |
| `/screen/overlay-2d/2` | 2026-09-08 | `/screen/0908/overlay-2d-2` | Persistent individual goldfish trails replace influence edges. [doc](../components/screen-archive/overlay-2d/docs/2.md) |
| `/screen/overlay-2d/3` | 2026-09-08 | `/screen/0908/overlay-2d-3` | Local attention, habituation and trail feedback reshape the keyword field. [doc](../components/screen-archive/overlay-2d/docs/3.md) |
| `/screen/overlay-2d/4` | 2026-09-08 | `/screen/0908/overlay-2d-4` | Explicit selected targets, attention contact and keyword propagation. [doc](../components/screen-archive/overlay-2d/docs/4.md) |
| `/screen/overlay-3d/1` | 2026-09-08 | `/screen/0908/overlay` | Original DOM/SVG field with a transparent 3D school. [doc](../components/screen-archive/overlay-3d/docs/1.md) |
| `/screen/overlay-3d/2` | 2026-09-08 | `/screen/0908/overlay-2` | Original 3D goldfish school with configurable keyword surfaces. [doc](../components/screen-archive/overlay-3d/docs/2.md) |
| `/screen/overlay-3d/3` | 2026-09-08 | `/screen/0908/overlay-3` | Original 3D goldfish school with switchable technology typefaces. [doc](../components/screen-archive/overlay-3d/docs/3.md) |
| `/screen/overlay-3d/4` | 2026-09-08 | `/screen/0908/overlay-4` | Recorded underwater textures from fish arrivals. [doc](../components/screen-archive/overlay-3d/docs/4.md) |
| `/screen/overlay-3d/5` | 2026-09-08 | `/screen/0908/overlay-5` | Overlay-4 at half speed with larger, roomier icons and smaller fish. [doc](../components/screen-archive/overlay-3d/docs/5.md) |
| `/pc/news-phones/1` | 2026-09-08 | `/pc/0908/default` | Independent keyword-driven news phones, one per goldfish. [doc](../components/pc-archive/news-phones/docs/1.md) |
| `/pc/news-phones/2` | 2026-09-08 | `/pc/0908/variations` | Mobile colour and keyword surface variations. [doc](../components/pc-archive/news-phones/docs/2.md) |
| `/pc/image-search/1` | 2026-09-10 | `/pc/0910/image-search` | Desktop image-search grammar under subsecond technology-query replacement. [doc](../components/pc-archive/image-search/docs/1.md) |
| `/desktop/native-windows/1` | 2026-09-15 | `/desktop/0915/1` | Preserved configurable native-app baseline. [doc](../components/native-windows/docs/1.md) |
| `/desktop/native-windows/2` | 2026-09-15 | `/desktop/0915/2` | Accumulating native windows, unequal sizes and continuous drift. [doc](../components/native-windows/docs/2.md) |
| `/desktop/native-windows/3` | 2026-09-15 | `/desktop/0915/3` | New pages mixed with random tab revisits; bounded turnover and scrolling. [doc](../components/native-windows/docs/3.md) |
| `/screen/tech-eyes/1` | 2026-09-22 | `/screen/0922/default` | Overlay-5 baseline with optional independent blinking across all 80 tech eyes and [source-matched 3D face/lips field options](../components/screen-archive/tech-eyes/docs/face-lips-3d-trials.md). [doc](../components/screen-archive/tech-eyes/docs/1.md) |
| `/screen/tech-eyes/2` | 2026-09-28 | `/screen/0922/interactive` | Participant clicks place story bubbles at their exact screen positions. [doc](../components/screen-archive/tech-eyes/docs/2.md) |
| `/screen/bubble/1` | 2026-10-20 | — | SCC bubble/3 copied, opening on 기본값 3. [doc](../components/bubble/docs/1.md) |
| `/screen/bubble/2` | 2026-10-20 | — | bubble/1 with every bubble a lobe of Koons's coated mirror steel. [doc](../components/bubble/docs/2.md) |
| `/screen/bubble/3` | 2026-10-22 | — | bubble/2's raft as a material lab: physically based parameters, a camera tilt from above (a tank) to the side (bubble/2), switchable looks. [doc](../components/bubble/docs/3.md) |
| `/screen/bubble/4` | 2026-10-22 | — | bubble/3 copied as the start of the goldfish's lifecycle. [doc](../components/bubble/docs/4.md) |
| `/screen/bubble/5` | 2026-10-25 | — | bubble/4 with its pages shown as 3D objects (AI sparkle, cloud, GPU, robot) in the bubbles' material. [doc](../components/bubble/docs/5.md) |
| `/screen/bubble/6` | 2026-10-25 | — | bubble/5 with the web's attention bounded and tiring, so it churns without a few pages taking it all. [doc](../components/bubble/docs/6.md) |
| `/screen/bubble/7` | 2026-10-27 | — | bubble/6 with an object lab: one object at a time, morphing like liquid metal into the next, its settings shared with the raft. [doc](../components/bubble/docs/7.md) |
| `/pc/mobiles/1` | 2026-10-27 | — | **Failed (2026-10-28).** One phone per goldfish: each bubble it reaches arrives as the same hype event in hyper-real clones of eight apps, over [socket feed/1](../socket/experiments/feed/1/README.md). The spectacle of fast transitions never appeared; [failure record and handoff](../components/mobiles/docs/1.md#failure-record-and-handoff-2026-10-28). |
| `/pc/mobiles/2` | 2026-10-28 | — | From zero after mobiles/1: one WebGL2 compositor moves every phone every moment; each strike is an interrupt you see (buzz, banner, the post scrolled to); bubble/7's own goldfish is the thumb and dies its spent death. [doc](../components/mobiles/docs/2.md) |
| `/screen/bubble/8` | 2026-11-03 | — | bubble/7 beyond Koons's steel: switchable materials (liquid, gel, plaster/marble, concrete, glass, maximal mix), object groups (tech logos, celebrity heads, currency signs), up to 1,000 goldfish. [doc](../components/bubble/docs/8.md) |
| `/screen/bubble/9` | 2026-11-05 | — | bubble/8 with its bugs fixed, as the ground for a new vocabulary of signs. [doc](../components/bubble/docs/9.md) |
| `/screen/bubble/9b` | 2026-11-06 | — | Temporary: bubble/9 opening on the clock morph style (same code), to compare. [doc](../components/bubble/docs/9b.md) |

Each experiment is a complete local copy: no cross-experiment implementation or ledger imports. Exception: the desktop native-windows versions share infrastructure through `components/native-windows/shared/`. Existing public images may be addressed by URL; only immutable company logos are a shared collection (`public/assets/goldfishes/assets/company-logos`). Asset URLs must exist inside this independently deployed app; after changing a collection, run `pnpm audit:goldfishes-assets`.

To add a trial, copy the nearest complete directory into the next serial of its family (`components/<family>/<n+1>`), or start `components/<new-family>/1`; mutate only that copy, register its ISO date, concise proposition and the family member, and record the essential decision and open question. Re-open the registry and this index immediately before a surgical patch: parallel work is expected.

Legacy URLs remain available as registry `legacyKeys`: every former dated route (`/screen/MMDD/name`, its root alias `/MMDD/name`, `/pc/MMDD/name`, `/desktop/0915/N`) resolves to its new route; `/default`, `/2d/1` resolve to their `/screen/...` counterparts; `/3d/1` → `/screen/default`; `/3d/2`, `/0804/1` → `/screen/attraction-targets/1`; `/3d/3`, `/0804/2` → `/screen/pillars/1`. Socket protocols are versioned folders, `socket/experiments/<protocol>/<n>/`, with their own prefix, room and state; their browser side is that folder's `client/`, the one cross-experiment import allowed. A screen or pc version picks a protocol by import path. Current: [feed/1](../socket/experiments/feed/1/README.md).
