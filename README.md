# Experiments workspace

One Git repository contains six independent Next.js app roots:

| App | Workspace root | Production URL | Local HTTPS URL |
| --- | --- | --- | --- |
| SCC archive | `apps/scc` | existing SCC project | `https://<local-hostname>:2000` |
| Goldfishes | `apps/goldfishes` | `https://goldfishes.vercel.app` | `https://<local-hostname>:2001` |
| six-sigma | `apps/six-sigma` | Not deployed | `https://<local-hostname>:2002` |
| xyt-cube | `apps/xyt-cube` | Not deployed | `https://<local-hostname>:2003` |
| ddong-meong | `apps/ddong-meong` | `https://ddong-meong.vercel.app` | `https://<local-hostname>:2010` |
| C-VAL | `apps/c-val` | `https://c-val.vercel.app` | `https://<local-hostname>:2011` |

The apps share dependency installation, certificates, tooling, and the modular
Socket.IO relay without sharing their Next.js route or asset namespaces.

## Runtime

Local development uses Node.js `26.5.1` with npm `11.17.0`, pinned in `.nvmrc`
and `.node-version`. Package operations use pnpm. Vercel builds use Node
`24.x` because Vercel does not yet support Node 26. The package engine range is
`24.x || 26.x`: local Node 26 satisfies it without warnings, while Vercel
selects its currently supported Node 24 runtime.

## Getting started

Install dependencies with the pinned Node version active:

```bash
pnpm install
```

The user-owned HTTPS development workflow for all six apps is:

```bash
pnpm dev
```

It exposes the six app URLs in the table, the socket relay at
`https://<local-hostname>:4000`, and the local root certificate at
`https://<local-hostname>:4000/cert`. Focused workflows start one app plus the
same relay:

```bash
pnpm dev:scc
pnpm dev:c-val
pnpm dev:ddong-meong
pnpm dev:goldfishes
pnpm dev:six-sigma
pnpm dev:xyt-cube
```

C-VAL's canonical routes include `/mobile`, `/controller`, `/screen/[screen]`,
`/whole`, and `/reset`; ddong-meong's are `/`,
`/main`, `/<content-slug>`, and `/screen`; Goldfishes uses `/default`,
`/2d/1`, and its dated archive paths. SCC's former `/c-val/...`,
`/ddong-meong/...`, and `/goldfishes/...` URLs remain compatibility redirects.

Agents must not start the development server. See [AGENTS.md](./AGENTS.md) and
the [HTTPS/socket harness notes](./docs/harness/https-and-sockets.md) for the
operational rules.

## Documentation

- [Documentation index](./docs/README.md)
- [Harness overview](./docs/harness/overview.md)
- [Monorepo apps and Vercel setup](./docs/harness/monorepo.md)
- [Experiment structure](./docs/harness/experiments.md)
