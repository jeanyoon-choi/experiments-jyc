# Repository agent rules

## Scope and ownership

- Complete the requested work without unrelated redesigns or cleanup. Later requests are additive unless explicitly replacing earlier work. Make routine decisions; ask only when a missing choice materially changes scope or outcome.
- Inspect `git status`; preserve others' modified/untracked work. Re-read shared files before surgical edits. Never revert, relocate, or finish another task's work unasked.
- `apps/scc`, `apps/goldfishes`, `apps/six-sigma`, and `apps/xyt-cube` are experimental archives: use bounded, reversible trials and preserve baselines, stable routes, and useful failures. In `apps/scc`, prefer merging a variant into an existing experiment or exposing it as an option (original behavior as the default) over adding another numbered experiment; this is a preference, not a hard rule. `apps/c-val` and `apps/ddong-meong` are finished projects: maintain established behavior and presentation unless the user requests an extension.
- Navigation lists experiments by latest activity. When a request changes what an existing SCC, Goldfishes, six-sigma, or xyt-cube experiment does or means (new mechanism, option, model, or visual direction), set `updated: "<today ISO>"` on its navigation registry entry as part of that change; leave it for renames, moves, config, docs, refactors, lint, or small tuning. Do not backfill or audit other entries.
- Keep six independent app roots. Routes stay thin; implementation/data/registries belong in the owning `components/` family, sockets in `apps/<owner>/socket/experiments/`, and notes in `apps/<owner>/docs/`.

## Model and token policy

- Respect the user's model selection, including mid-session switches. Current preference: `gpt-6-astra` for important composition, architecture, difficult diagnosis, and integration; `gpt-5.6-terra` for everyday work. Do not force a primary-model switch or change global configuration.
- Delegate independent, bounded tasks to `gpt-5.6-terra` when this saves total work. Keep composition and final review with the lead. Use a stronger subagent only when needed; if model selection is unavailable, disclose the fallback.
- Give subagents only the objective, owned paths, relevant constraints, and acceptance criteria; avoid full-history forks. Request concise findings/diffs/checks. Avoid delegation for trivial tasks, overlapping edits, or recursive fan-out without concrete benefit.
- Search narrowly, load task-relevant docs, and summarize routine output. Verify proportionately; stop after sufficient checks. Keep updates/handoffs concise. In reference or precedent research reports, link each work inline where it is named, not only in a trailing source list. The user can replace these model preferences.

## Verification and runtime

<!-- BEGIN:repo-agent-rules -->
- Never run `pnpm build`, `pnpm dev`, or `pnpm dev:http`. Never start dev/socket servers through any command. Do not kill servers unless explicitly asked.
- 필요할 경우 브라우저 들어가기: when a visual, layout, or interaction result matters, open the running HTTPS route in the browser and check it directly. All local runtime verification uses HTTPS.
- `pnpm lint`, `pnpm typecheck`, and scoped static/pure checks are allowed. Documentation-only edits need link/diff checks, not application builds.
- Servers are usually already running (SCC `https://localhost:2000`, ports in [HTTPS/sockets](docs/harness/https-and-sockets.md)); request the route there and open it in the browser before deciding a start is needed. If authorized verification needs a first server start, use exactly: `전하, 소인이 감히 실제 작동을 확인해 올리려면 서버가 필요하옵니다. 번거로우시겠지만 서버 켜주세요 전하.`
- If changed server/socket code needs an existing server restarted, use exactly: `전하, 미천한 소인이 감히 새로 고친 서버 코드를 반영해 올리려면 기존 서버를 다시 기동해야 하옵니다. 번거로우시겠지만 서버 재시작해주세요 전하.`
<!-- END:repo-agent-rules -->

- Use pnpm. Preserve local Node `26.5.1` / npm `11.17.0`, `.nvmrc`, `.node-version`, `engines.node: 24.x || 26.x`, and `@types/node` major 24 (deployment compatibility). A sandbox's Node version does not override these.
<!-- BEGIN:nextjs-agent-rules -->
- Next.js APIs may differ from model memory. Before writing Next-specific code, read the relevant installed guide in `node_modules/next/dist/docs/`, especially for routing, configuration, images, styling setup, or server behavior; heed deprecations.
<!-- END:nextjs-agent-rules -->
- React list keys use stable model IDs, never generated or mutable display text.
- Socket experiments have isolated event prefixes, rooms, and state. Servers own abstract domain state/time; browsers derive colors, geometry, opacity, layout, animation phase, and highlights.

## Visual and experimental contracts

- Data/math/input/transport changes do not authorize visual changes. Preserve unmentioned geometry, typography, spacing, interaction, and domain language; reuse existing visual primitives.
- Derive new interfaces from the participant's perceptual/action task. Avoid generic themed dashboards, fake live/debug chrome, decorative labels, captions, footers, badges, and dividers. Use spacing and typography for hierarchy.
- Non-scrollable content fits the viewport. Fixed-format artifacts scale internal text, spacing, and controls with their container at usable visual size.
- Never add unmeasured GPU/particle cost that risks freezing the device. Read the particle safety budget before particle/compute work.
- Never use iframes to show clones, apps, or experiments inside another page (grids, side-by-side, multi-phone fields). Render the components directly; scope viewport units, pointer scale, and document-wide effects to each instance.

## Read only what the task requires

Start with target code and the app's `docs/README.md`; follow relevant links, not the entire archive. [Documentation map](docs/README.md) locates families.

| Task | Required reference |
| --- | --- |
| Create/substantially change an SCC, Goldfishes, six-sigma, or xyt-cube experiment | [Tinkering](docs/foundations/tinkering.md) |
| New/materially redesigned UI | [Design](docs/foundations/design-guidelines.md) |
| Routes, registries, component organization | [Structure](docs/harness/experiments.md) |
| New rendering techniques/current references | [Rendering research](docs/harness/visual-rendering-research.md) |
| Particles, GPU compute, source clones | [GPU safety](docs/harness/webgpu-tsl-particles.md) |
| Socket transport or deployment | [HTTPS/sockets](docs/harness/https-and-sockets.md); [relay runbook](docs/harness/scc-relay-deployment.md) for deployment |
| Write/reorganize documentation | [Documentation policy](docs/harness/documentation.md) |

`AGENTS.md` owns shared operational policy; `llm.txt` is only an index. Put detailed procedures in `docs/harness/`, theory in `docs/foundations/`, and feature contracts/history in app docs. Repository “memory” requests update these files, never global memory unless explicitly named. Replace duplicate rules instead of appending another checklist.
