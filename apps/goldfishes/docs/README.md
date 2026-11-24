# Goldfishes archive

**Start with the system map.** Before anything else, an agent new to this app reads the map of the whole work: run `node apps/goldfishes/foundations/system/model/print.ts` (add `ko` for Korean) or open `/system`. It says what the devices are, what passes between them, what is built and what is still asked. How it is kept: [system](./system.md).

What the work is, where it stands and where the artist's notes are: [direction](./direction.md). Read it before a task about the work's meaning or its system; a fix inside one route does not need it.

## Layout

One folder is one unit: a family holds its versions and its own notes, and is moved, copied or removed whole.

| Where | What |
| --- | --- |
| `components/<area>/<family>/<serial>/` | A version's code, under its output channel (`screen` or `pc`; user, 2026-11-23). Serials rise with creation date. Current families: `screen/simulation`, `screen/bubble`, `pc/2d-mobiles`, `pc/3d-mobiles`. |
| `components/<area>/<family>/docs/<serial>.md` | That version's notes, beside the code (`9b.md` for a route with no folder of its own). Other notes of the family sit in the same folder. |
| `components/screen/archive/<family>/…` | The screen families before 2026-10-20 (`default`, `2d`, `attraction-targets`, `pillars`, `media-grid`, `keyword-field`, `overlay-2d`, `overlay-3d`, `attention-print`, `tech-eyes`), each with its `docs/`. |
| `components/pc/archive/<family>/…` | The earlier pc trials (`news-phones`, `image-search`) and the native macOS windows (`native-windows`, formerly the `desktop` area), each with its `docs/`. |
| `components/experiments.ts` | The registry: every routable experiment, its route key, area, ISO dates and loader. Authoritative. |
| `socket/experiments/<protocol>/<n>/` | A socket protocol version, whole: the relay (`index.mjs`, `protocol.mjs`), its browser side (`client/`) and its contract (`README.md`). |
| `foundations/system/` | The system map at `/system`: its model (`model/`) and its page. [Notes](./system.md). |
| `foundations/navigation/` | The index pages; `families.ts` lists each family's members for the group view (`?view=group`; a key missing there shows as "unsorted"). |
| `app/` | Thin routes only: they look a key up in the registry and render it. |
| `docs/` | Only what belongs to no single family: this index, [direction](./direction.md), [the system map](./system.md), [onboarding](./agent-onboarding.md), [history](./research-and-rendering-history.md). |

Rules:
- Experiments never import from each other, and nothing in `components/` is shared between families. The one shared import is a socket protocol's `client/` (`@/socket/experiments/feed/1/client`), picked by version in the import path; `native-windows/shared/` is shared inside its own family only.
- Every new experiment or route is registered in `components/experiments.ts` and assigned in `foundations/navigation/families.ts` in the same change, so the navigation lists it (user, 2026-11-24). This holds for a reference page too; only `/system`, which is pinned above the list, stands outside the registry.
- A new family is a new folder under `components/screen/` or `components/pc/` with its `docs/`, registry entries and a `families.ts` entry. A breaking protocol change copies `socket/experiments/<protocol>/<n>/` whole to `<n+1>` and registers it in `socket/experiments/index.mjs`.
- A route is its folder path under `components/` (user, 2026-11-23): `/screen/bubble/9` is `components/screen/bubble/9/`, `/pc/2d-mobiles/1` is `components/pc/2d-mobiles/1/`, `/screen/archive/pillars/1` is `components/screen/archive/pillars/1/`; the navigation names a family as its folder (`archive/pillars`). A key's first part is its area (`screen` or `pc`), which the index pages filter by. A route that moved keeps its former keys as `legacyKeys`; archived routes are never repurposed. Dates are registry data and do not change with a move; date archives stay at `/<area>/<MMDD>`.
- Removed: `components/mobile/` (`mobile/keyword-grid/1–2`, 2026-09-30) with its routes and notes, on 2026-11-13 at the user's request. It is in git history at commit `14c9b1fb`.

Local macOS control: `/pc/archive/native-windows/{1,2,3}` (`/desktop/…` redirects to `/pc/…`) → independent versions [1](../components/pc/archive/native-windows/docs/1.md), [2](../components/pc/archive/native-windows/docs/2.md), [3](../components/pc/archive/native-windows/docs/3.md) at `components/pc/archive/native-windows/{1,2,3}/`. Their control API stays at `/api/desktop/0915/{1,2,3}`; process control, app adapters, motion and controller primitives are shared in `components/pc/archive/native-windows/shared/` ([details](../components/pc/archive/native-windows/docs/1.md#shared-infrastructure)). [Original fixed-score history](../components/pc/archive/native-windows/docs/0915-desktop-a.md).

For a route change, read its document, the specific modules being changed, and the registry. Read [onboarding](./agent-onboarding.md) when creating or substantially changing a Goldfishes experiment; consult [history](./research-and-rendering-history.md) only for a relevant rendering, measurement, or historical-decision question.

Families (the registry `components/experiments.ts` holds every route's date, phrase and former routes; a version's notes are `components/<area>/<family>/docs/<serial>.md`):

| Family | Versions | What it is |
| --- | --- | --- |
| `screen/simulation` | 0 (2026-11-18) | **The logic.** Two myopic agents, apart from any visual. [0](../components/screen/simulation/docs/0.md); reference: [에이전트 모델 도감](../components/screen/simulation/docs/models.md), to look at, not to follow |
| `screen/bubble` | 1–9 (2026-10-20 → 11-05) | **The visual ground.** A raft of bubbles as objects in one material, liquid morphs, up to 1,000 goldfish with lifecycles; PageRank underneath. Current: [9](../components/screen/bubble/docs/9.md). 9b is unlisted. |
| `pc/2d-mobiles` | 1–3 (2026-10-27 → 11-24) | One mobile per goldfish over [socket feed/1](../socket/experiments/feed/1/README.md). 1 failed ([record](../components/pc/2d-mobiles/docs/1.md#failure-record-and-handoff-2026-10-28)); [2](../components/pc/2d-mobiles/docs/2.md) was rebuilt from zero; [3](../components/pc/2d-mobiles/docs/3.md) is 2 with no device around the glass and an adjustable grid. It was `mobiles` (`/pc/mobiles/N`) until 2026-11-23. |
| `pc/3d-mobiles` | 1–2 (2026-11-13 → 11-23) | The goldfish holding a mobile, in 3D. [1](../components/pc/3d-mobiles/docs/1.md): a feed of clips. [2](../components/pc/3d-mobiles/docs/2.md): `pc/2d-mobiles/2`'s working interfaces on the glass. It was `_experiments/goldfish-mobile` at `/screen/goldfish-mobile/1` until 2026-11-23: it is not a screen output. |
| `screen/archive/*` | before 2026-10-20 | `default`, `2d`, `attraction-targets` 1–3, `pillars` 1–4, `media-grid`, `keyword-field` 1–2, `overlay-2d` 1–4, `overlay-3d` 1–5, `attention-print`, `tech-eyes` 1–2: the attention-field years. [History](./research-and-rendering-history.md) holds what they established. |
| `pc/archive/*` | 2026-09-08 → 09-15 | `news-phones` 1–2, `image-search`: failed pc trials. `native-windows` 1–3: real macOS windows as the field; see the paragraph above. |

Each experiment is a complete local copy: no cross-experiment implementation or ledger imports. Exception: the desktop native-windows versions share infrastructure through `components/pc/archive/native-windows/shared/`. Existing public images may be addressed by URL; only immutable company logos are a shared collection (`public/assets/goldfishes/assets/company-logos`). Asset URLs must exist inside this independently deployed app; after changing a collection, run `pnpm audit:goldfishes-assets`.

To add a trial, copy the nearest complete directory into the next serial of its family (`components/<family>/<n+1>`), or start `components/<new-family>/1`; mutate only that copy, register its ISO date, concise proposition and the family member, and record the essential decision and open question. Re-open the registry and this index immediately before a surgical patch: parallel work is expected.

Legacy URLs remain available as registry `legacyKeys`: every former dated route (`/screen/MMDD/name`, its root alias `/MMDD/name`, `/pc/MMDD/name`) and every route from before the 2026-11-23 move (`/screen/pillars/1`, `/pc/news-phones/1`, `/pc/mobiles/1`, …) resolves to its new route; `/desktop/…` redirects to `/pc/…`; `/default`, `/2d/1` resolve to their `/screen/...` counterparts; `/3d/1` → `/screen/archive/default`; `/3d/2`, `/0804/1` → `/screen/archive/attraction-targets/1`; `/3d/3`, `/0804/2` → `/screen/archive/pillars/1`. Socket protocols are versioned folders, `socket/experiments/<protocol>/<n>/`, with their own prefix, room and state; their browser side is that folder's `client/`, the one cross-experiment import allowed. A screen or pc version picks a protocol by import path. Current: [feed/1](../socket/experiments/feed/1/README.md).
