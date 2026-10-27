# Goldfishes archive

Code lives at `components/<area>/<family>/<serial>/`; the screen experiments before 2026-10-20 sit under `components/screen/archive/<family>/<serial>/` with their routes and doc paths unchanged, and new screen groups (from `bubble`) start beside `archive/`; likewise the failed pc trials (`news-phones`, `image-search`) sit under `components/pc/archive/<family>/<serial>/` (routes and docs unchanged) and new pc work starts at `components/pc/mobiles/` (areas: `screen`, `pc`, `desktop`, `mobile`); docs mirror it at `docs/<area>/<family>/<serial>.md`. Serials rise with creation date: a later trial in a family always takes the next number. The registry (`components/experiments.ts`) is authoritative for routable experiments, ISO dates, and archive navigation; the navigation's group view (`?view=group`) reads lineages from `foundations/navigation/families.ts`, where each new trial should be added to its family (unassigned keys appear as "unsorted"). `screen/default` is the promoted baseline; archived routes must not be repurposed.

Dates are registry data, not folders. Date archives remain at `/<area>/<MMDD>` (for example `/screen/0908`, `/desktop/0915`, `/mobile/0930`) and list every experiment created that day or formerly filed under that dated folder.

Phone bubbles: `/mobile` → `/mobile/keyword-grid/{1,2}`. [Family index](./mobile/README.md).

Local macOS control: `/desktop` → independent versions [1](./desktop/native-windows/1.md), [2](./desktop/native-windows/2.md), [3](./desktop/native-windows/3.md) at `components/desktop/native-windows/{1,2,3}/`. Their control API stays at `/api/desktop/0915/{1,2,3}`; process control, app adapters, motion and controller primitives are shared in `components/desktop/native-windows/shared/` ([details](./desktop/native-windows/1.md#shared-infrastructure)). [Original fixed-score history](./pc/0915-desktop-a.md).

For a route change, read its document, the specific modules being changed, and the registry. Read [onboarding](./agent-onboarding.md) when creating or substantially changing a Goldfishes experiment; consult [history](./research-and-rendering-history.md) only for a relevant rendering, measurement, or historical-decision question.

Chronological log:

| Route | Date | Former route | Proposition |
| --- | --- | --- | --- |
| `/screen/2d/1` | retained | — | Glyph swarm and media cells. [doc](./2d/1.md) |
| `/screen/default` | baseline (undated, earliest) | — | Orthographic 3D attention field. [doc](./default.md) |
| `/screen/attraction-targets/1` | 2026-08-04 | `/screen/0804/tube` | Stations are fixed attraction targets. [doc](./screen/attraction-targets/1.md) |
| `/screen/attraction-targets/2` | 2026-08-04 | `/screen/0804/html` | Live HTML forms enter the attention loop. [doc](./screen/attraction-targets/2.md) |
| `/screen/attraction-targets/3` | 2026-08-04 | `/screen/0804/node-edge` | A revealed 3D topology is the field. [doc](./screen/attraction-targets/3.md) |
| `/screen/pillars/1` | 2026-08-04 | `/screen/0804/pillars` | Selected cells become symmetric pillars. [doc](./screen/pillars/1.md) |
| `/screen/media-grid/1` | 2026-08-06 | `/screen/0806/compositional-grid` | Selections seed local 2×2 media structures. [doc](./screen/media-grid/1.md) |
| `/screen/pillars/2` | 2026-08-06 | `/screen/0806/side-view` | Pillars begin side-on. [doc](./screen/pillars/2.md) |
| `/screen/pillars/3` | 2026-08-06 | `/screen/0806/duration` | Clicks accumulate downward duration. [doc](./screen/pillars/3.md) |
| `/screen/pillars/4` | 2026-08-06 | `/screen/0806/temporal-decay` | Traces freeze after a lifetime. [doc](./screen/pillars/4.md) |
| `/screen/attention-print/1` | 2026-09-08 | `/screen/0908/attention-print` | Serial technology signs, vermilion fish and accumulated ink. [doc](./screen/attention-print/1.md) |
| `/screen/keyword-field/1` | 2026-09-08 | `/screen/0908/dots` | Instagram/4 copied unchanged as an independent experiment. [doc](./screen/keyword-field/1.md) |
| `/screen/keyword-field/2` | 2026-09-08 | `/screen/0908/aggregated` | A 3D school attends the spreading Instagram/4 keyword field. [doc](./screen/keyword-field/2.md) |
| `/screen/overlay-2d/1` | 2026-09-08 | `/screen/0908/overlay-2d` | Original field with the Canvas2D goldfish glyph from 2d/1. [doc](./screen/overlay-2d/1.md) |
| `/screen/overlay-2d/2` | 2026-09-08 | `/screen/0908/overlay-2d-2` | Persistent individual goldfish trails replace influence edges. [doc](./screen/overlay-2d/2.md) |
| `/screen/overlay-2d/3` | 2026-09-08 | `/screen/0908/overlay-2d-3` | Local attention, habituation and trail feedback reshape the keyword field. [doc](./screen/overlay-2d/3.md) |
| `/screen/overlay-2d/4` | 2026-09-08 | `/screen/0908/overlay-2d-4` | Explicit selected targets, attention contact and keyword propagation. [doc](./screen/overlay-2d/4.md) |
| `/screen/overlay-3d/1` | 2026-09-08 | `/screen/0908/overlay` | Original DOM/SVG field with a transparent 3D school. [doc](./screen/overlay-3d/1.md) |
| `/screen/overlay-3d/2` | 2026-09-08 | `/screen/0908/overlay-2` | Original 3D goldfish school with configurable keyword surfaces. [doc](./screen/overlay-3d/2.md) |
| `/screen/overlay-3d/3` | 2026-09-08 | `/screen/0908/overlay-3` | Original 3D goldfish school with switchable technology typefaces. [doc](./screen/overlay-3d/3.md) |
| `/screen/overlay-3d/4` | 2026-09-08 | `/screen/0908/overlay-4` | Recorded underwater textures from fish arrivals. [doc](./screen/overlay-3d/4.md) |
| `/screen/overlay-3d/5` | 2026-09-08 | `/screen/0908/overlay-5` | Overlay-4 at half speed with larger, roomier icons and smaller fish. [doc](./screen/overlay-3d/5.md) |
| `/pc/news-phones/1` | 2026-09-08 | `/pc/0908/default` | Independent keyword-driven news phones, one per goldfish. [doc](./pc/news-phones/1.md) |
| `/pc/news-phones/2` | 2026-09-08 | `/pc/0908/variations` | Mobile colour and keyword surface variations. [doc](./pc/news-phones/2.md) |
| `/pc/image-search/1` | 2026-09-10 | `/pc/0910/image-search` | Desktop image-search grammar under subsecond technology-query replacement. [doc](./pc/image-search/1.md) |
| `/desktop/native-windows/1` | 2026-09-15 | `/desktop/0915/1` | Preserved configurable native-app baseline. [doc](./desktop/native-windows/1.md) |
| `/desktop/native-windows/2` | 2026-09-15 | `/desktop/0915/2` | Accumulating native windows, unequal sizes and continuous drift. [doc](./desktop/native-windows/2.md) |
| `/desktop/native-windows/3` | 2026-09-15 | `/desktop/0915/3` | New pages mixed with random tab revisits; bounded turnover and scrolling. [doc](./desktop/native-windows/3.md) |
| `/screen/tech-eyes/1` | 2026-09-22 | `/screen/0922/default` | Overlay-5 baseline with optional independent blinking across all 80 tech eyes and [source-matched 3D face/lips field options](./screen/tech-eyes/face-lips-3d-trials.md). [doc](./screen/tech-eyes/1.md) |
| `/screen/tech-eyes/2` | 2026-09-28 | `/screen/0922/interactive` | Participant clicks place story bubbles at their exact screen positions. [doc](./screen/tech-eyes/2.md) |
| `/mobile/keyword-grid/1` | 2026-09-30 | `/mobile/0930/1` | Configure a keyword, place it on a map point; bubbles decay unless finger-skated. [doc](./mobile/keyword-grid/1.md) |
| `/mobile/keyword-grid/2` | 2026-09-30 | `/mobile/0930/2` | + opens word and color pickers; bubbles collide and shrink over 30 seconds. [doc](./mobile/keyword-grid/2.md) |
| `/screen/bubble/1` | 2026-10-20 | — | SCC bubble/3 copied, opening on 기본값 3. [doc](./screen/bubble/1.md) |
| `/screen/bubble/2` | 2026-10-20 | — | bubble/1 with every bubble a lobe of Koons's coated mirror steel. [doc](./screen/bubble/2.md) |
| `/screen/bubble/3` | 2026-10-22 | — | bubble/2's raft as a material lab: physically based parameters, a camera tilt from above (a tank) to the side (bubble/2), switchable looks. [doc](./screen/bubble/3.md) |
| `/screen/bubble/4` | 2026-10-22 | — | bubble/3 copied as the start of the goldfish's lifecycle. [doc](./screen/bubble/4.md) |
| `/screen/bubble/5` | 2026-10-25 | — | bubble/4 with its pages shown as 3D objects (AI sparkle, cloud, GPU, robot) in the bubbles' material. [doc](./screen/bubble/5.md) |
| `/screen/bubble/6` | 2026-10-25 | — | bubble/5 with the web's attention bounded and tiring, so it churns without a few pages taking it all. [doc](./screen/bubble/6.md) |
| `/screen/bubble/7` | 2026-10-27 | — | bubble/6 with an object lab: one object at a time, morphing like liquid metal into the next, its settings shared with the raft. [doc](./screen/bubble/7.md) |
| `/pc/mobiles/1` | 2026-10-27 | — | **Failed (2026-10-28).** One phone per goldfish: each bubble it reaches arrives as the same hype event in hyper-real clones of eight apps, over [socket feed/1](./socket/feed/1.md). The spectacle of fast transitions never appeared; [failure record and handoff](./pc/mobiles/1.md#failure-record-and-handoff-2026-10-28). |

Each experiment is a complete local copy: no cross-experiment implementation or ledger imports. Exception: the desktop native-windows versions share infrastructure through `components/desktop/native-windows/shared/`. Existing public images may be addressed by URL; only immutable company logos are a shared collection (`public/assets/goldfishes/assets/company-logos`). Asset URLs must exist inside this independently deployed app; after changing a collection, run `pnpm audit:goldfishes-assets`.

To add a trial, copy the nearest complete directory into the next serial of its family (`components/<area>/<family>/<n+1>`), or start `components/<area>/<new-family>/1`; mutate only that copy, register its ISO date, concise proposition and the family member, and record the essential decision and open question. Re-open the registry and this index immediately before a surgical patch: parallel work is expected.

Legacy URLs remain available as registry `legacyKeys`: every former dated route (`/screen/MMDD/name`, its root alias `/MMDD/name`, `/pc/MMDD/name`, `/desktop/0915/N`, `/mobile/0930/N`) resolves to its new route; `/default`, `/2d/1` resolve to their `/screen/...` counterparts; `/3d/1` → `/screen/default`; `/3d/2`, `/0804/1` → `/screen/attraction-targets/1`; `/3d/3`, `/0804/2` → `/screen/pillars/1`. Socket protocols are versioned folders, `socket/experiments/<protocol>/<n>/`, with their own prefix, room and state; their browser side is `components/transport/<protocol>/<n>/`, the one cross-experiment import allowed (as `desktop/native-windows/shared`). A screen or pc version picks a protocol by import path. Current: [feed/1](./socket/feed/1.md).
