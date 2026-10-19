# SCC documentation index

Read [AGENTS.md](../AGENTS.md) for operational policy, then the target app's
index and relevant contract. This is a lookup map, not a reading checklist.

| App | Status | Entry point |
| --- | --- | --- |
| SCC | Experimental archive | [SCC docs](../apps/scc/docs/README.md) |
| Goldfishes | Experimental archive | [Goldfishes docs](../apps/goldfishes/docs/README.md) |
| six-sigma | Experimental archive | [six-sigma docs](../apps/six-sigma/docs/README.md) |
| xyt-cube | Experimental archive | [xyt-cube docs](../apps/xyt-cube/docs/README.md) |
| C-VAL | Finished; maintenance | [C-VAL docs](../apps/c-val/docs/README.md) |
| ddong-meong | Finished; maintenance | [ddong-meong docs](../apps/ddong-meong/docs/README.md) |

Root `harness/` owns engineering procedures; `foundations/` owns theory.
App docs retain feature contracts and historical evidence. Consult theory and
history when their subject affects the task, not for every code change.

## Harness and foundations

- [Harness overview](./harness/overview.md)
- [Documentation writing policy](./harness/documentation.md)
- [2026-09-08 harness review](./harness/2026-09-08-harness-review.md)
- [Monorepo apps and Vercel setup](./harness/monorepo.md)
- [Experiment and component structure](./harness/experiments.md)
- [Next.js notes](./harness/nextjs.md)
- [HTTPS and sockets](./harness/https-and-sockets.md)
- [반포자이즘 EC2와 SCC socket 공동 운영 결정](./harness/banpo-ec2-scc-cohosting.md)
- [SCC relay deployment](./harness/scc-relay-deployment.md)
- [Local image collections](./harness/local-image-collections.md)
- [Visual rendering research](./harness/visual-rendering-research.md)
- [WebGPU/TSL particle source-clone protocol](./harness/webgpu-tsl-particles.md)
- [Tinkering as the SCC working method](./foundations/tinkering.md)
- [Common visual design guidelines](./foundations/design-guidelines.md)
- [Multi-Device Web Artwork](./foundations/mdwa.md)
- [Parametric détournement research](./foundations/parametric-detournement.md)

## Experiment map

- [six-sigma mobile / K6](../apps/six-sigma/docs/mobile/k6/1.md): regular-hexagon complete graph, `mobile/k6/1`.
- [six-sigma mobile / local optimum](../apps/six-sigma/docs/mobile/k6/2.md): coupled 1D/2D maps on K6, `mobile/k6/2`.
- [xyt-cube spacetime/1](../apps/xyt-cube/docs/spacetime/1.md): a clip as an (x, y, t) cube; phones compactify time, boost the observer and place masses, `screen/spacetime/1`.

- [SNS mobile surfaces 1–13](../apps/scc/docs/experiments/sns/mobile/README.md): mobile services and Instagram, TikTok and X replicas.

- [Chemical decomposition](../apps/scc/docs/experiments/ar/chemical-decomposition/README.md): on-device AR that letters the camera view with the chemical formulas of what each thing is made of, `ar/chemical-decomposition/1`.
- [Splice](../apps/scc/docs/experiments/standalone/splice/README.md): two-deck audio collage practice; a separate instrument for the later native application collage direction.

- [advertisement/tv](../apps/scc/docs/experiments/advertisement/README.md): TV-ad clones; `archive/korean-1` and `archive/american-1` are recorded failures.
- [xyzt city](../apps/scc/docs/experiments/dimensions/xyzt-city/README.md): Lower Manhattan in (x, y, t) with height as the swept threshold, variant `archive` (reference set; numbered variants are experiments on it).
- [desktop-collage](../apps/scc/docs/experiments/desktop-collage/README.md): real browser windows as collage material (papier collé / Dada lineage), `primitives/1` heart of windows.
- [Aerodynamics](../apps/scc/docs/experiments/standalone/aerodynamics/README.md): standalone 3D ABC Euler flow, variants `1`–`2`.
- [Traffic light](../apps/scc/docs/experiments/standalone/transportation/traffic-light/README.md): standalone 3D Korean signal heads on a cantilever pole under `transportation/`, variants `1`–`2` (`2`: fifty poles down one road).
- [Road signs](../apps/scc/docs/experiments/standalone/transportation/road-signs/README.md): every current Korean 안전표지 and 노면표시 as SVG under `transportation/`, variant `1`.

| Code family | Registered variants | Documentation |
| --- | --- | --- |
| `apps/ddong-meong/components` | Unversioned finished app | [ddong-meong](../apps/ddong-meong/docs/README.md) · [콘텐츠 확장 매뉴얼](../apps/ddong-meong/docs/content-manual.md) |
| `apps/scc/components/ui/dashboard/github` | `1`, `2` | [github/1](../apps/scc/docs/experiments/dashboard/github/1.md) · [github/2](../apps/scc/docs/experiments/dashboard/github/2.md) |
| `apps/scc/components/ui/dashboard/palantir` | `1` | [palantir/1](../apps/scc/docs/experiments/dashboard/palantir/1.md) |
| `apps/scc/components/ui/dashboard/stock` | `default`, `1`, `2`, `3`, `4` | [stock index](../apps/scc/docs/experiments/dashboard/stock/README.md) |
| `apps/scc/components/complex-systems/amoeba` | `1`, `2` | [amoeba plaques and blooms](../apps/scc/docs/experiments/complex-systems/amoeba/README.md) · [amoeba/2](../apps/scc/docs/experiments/complex-systems/amoeba/2.md) |
| `apps/scc/components/complex-systems/bubble` | `1`–`5` | [bubble family](../apps/scc/docs/experiments/complex-systems/bubble/README.md) |
| `apps/scc/components/complex-systems/barabasi-albert` | `1` | [Barabási–Albert network growth](../apps/scc/docs/experiments/complex-systems/barabasi-albert/README.md) |
| `apps/scc/components/complex-systems/self-evolving-network` | `1` | [self-evolving network](../apps/scc/docs/experiments/complex-systems/self-evolving-network/README.md) |
| `apps/scc/components/complex-systems/erdos-renyi` | `1` | [Erdős–Rényi random graph](../apps/scc/docs/experiments/complex-systems/erdos-renyi/README.md) |
| `apps/scc/components/complex-systems/financial-network` | `1`–`4` | [financial network / 4](../apps/scc/docs/experiments/complex-systems/financial-network/4.md) |
| `apps/scc/components/complex-systems/living-topology` | `1`–`4` | [living topology](../apps/scc/docs/experiments/complex-systems/living-topology/README.md) |
| `apps/scc/components/dynamical-systems/attractor` | `1`–`3` | [attractor sequence](../apps/scc/docs/experiments/dynamical-systems/attractor/README.md) |
| `apps/scc/components/dynamical-systems/three-body` | `1` | [three body](../apps/scc/docs/experiments/dynamical-systems/three-body/README.md) |
| `apps/scc/components/dynamical-systems/duffing` | `1`–`3` | [Duffing oscillator](../apps/scc/docs/experiments/dynamical-systems/duffing/README.md) |
| `apps/scc/components/dynamical-systems/bifurcation` | `1`–`3` | [bifurcation field](../apps/scc/docs/experiments/dynamical-systems/bifurcation/README.md) |
| `apps/scc/components/dynamical-systems/orbital-resonance` | `1` | [orbital resonance](../apps/scc/docs/experiments/dynamical-systems/orbital-resonance/README.md) |
| `apps/scc/components/statistical-modelling/normal-distribution` | `1`–`5` | [normal-distribution particle field](../apps/scc/docs/experiments/statistical-modelling/normal-distribution/README.md) |
| `apps/scc/components/complex-systems/void` | `1`–`3` | [void field](../apps/scc/docs/experiments/complex-systems/void/README.md) |
| `apps/scc/components/complex-systems/face-voronoi` | `1`–`3` | [face voronoi](../apps/scc/docs/experiments/complex-systems/face-voronoi/README.md) |
| `apps/scc/components/complex-systems/page-rank` | `1` | [page rank](../apps/scc/docs/experiments/complex-systems/page-rank/README.md) |
| `apps/scc/components/complex-systems/diffusion-graph` | `1` | [diffusion graph](../apps/scc/docs/experiments/complex-systems/diffusion-graph/README.md) |
| `apps/scc/components/complex-systems/flight-visualisation` | `1` | [flight visualisation (viz1090 port)](../apps/scc/docs/experiments/complex-systems/flight-visualisation/README.md) |
| `apps/scc/components/complex-systems/cellular-automata` | `colour/1`–`6`, `grid-network/1` | [cellular automata](../apps/scc/docs/experiments/complex-systems/cellular-automata/README.md) |
| `apps/scc/components/complex-systems/adaptive-coevolving-network` | `1`–`7` and variants | [adaptive coevolving networks](../apps/scc/docs/experiments/complex-systems/adaptive-coevolving-network/README.md) |
| Complex-systems acceptance standard | — | [removals and simulation standard](../apps/scc/docs/experiments/complex-systems/rejected-examples.md) |
| `apps/scc/components/standalone/chess` | `1` | [chess](../apps/scc/docs/experiments/standalone/chess/README.md) |
| `apps/scc/components/standalone/bastille-day` | `1`, `2` | [bastille-day](../apps/scc/docs/experiments/standalone/bastille-day/README.md) |
| `apps/scc/components/standalone/cv` | `1`, `2`, `3` | [cv](../apps/scc/docs/experiments/standalone/cv/README.md) |
| `apps/scc/components/standalone/macos` | `1` | [macos](../apps/scc/docs/experiments/standalone/macos/README.md) |
| `apps/scc/components/standalone/swarm` | `1`–`3` | [swarm](../apps/scc/docs/experiments/standalone/swarm/README.md) |
| `apps/scc/components/standalone/spoon-class` | `default`, `1`, `2`, `3` | [spoon-class baseline, module field, human-life fork and dense scaled wall](../apps/scc/docs/experiments/standalone/spoon-class/README.md) |
| `apps/scc/components/standalone/grid` | `1`, `2`, `3`, `4`, `5` | [grid](../apps/scc/docs/experiments/standalone/grid/README.md) |
| `apps/scc/components/parametric-interface` | `1`, `2`, `0815/flight`, `0815/stock`, `0815/apollo`, `0815/led-text` | [parametric-interface](../apps/scc/docs/experiments/parametric-interface/README.md) |
| `apps/goldfishes/components/screen` | `default`, `2d/1`, `attraction-targets`, `pillars`, `media-grid`, `keyword-field`, `overlay-3d`, `overlay-2d`, `attention-print`, `tech-eyes` (`<family>/<serial>`, serials by date) | [archive](../apps/goldfishes/docs/README.md), [agent onboarding](../apps/goldfishes/docs/agent-onboarding.md) |
| `apps/goldfishes/components/pc` | `news-phones`, `image-search` | [archive](../apps/goldfishes/docs/README.md) |
| `apps/scc/components/dj` | `1` | [dj](../apps/scc/docs/experiments/dj/README.md) |
| `apps/c-val/components` | Unversioned finished app; numbered records are history | [c-val](../apps/c-val/docs/README.md) |
| `apps/scc/components/network-system` | `default`, `macro-economy`, `cycle`, `population`, `competitive-firms` | [network-system index](../apps/scc/docs/experiments/network-system/README.md) |
| `apps/scc/components/ui/sns` | `feed/1`, `navigation/default`, `navigation/1`, `navigation/2`, `youtube/1`, `youtube/2`, `linkedin/1` | [sns index](../apps/scc/docs/experiments/sns/README.md) |

The registries under `apps/*/components/**/experiments.ts` remain the source of truth
for executable variants. This index describes them; it does not replace those
registries.
