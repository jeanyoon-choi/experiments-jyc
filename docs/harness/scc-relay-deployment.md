# SCC shared relay deployment

One EC2 instance runs two independent Socket.IO processes:

| Process | Port | Directory | Owner |
| --- | --- | --- | --- |
| `banpo-io` | `127.0.0.1:4000` | `/home/ubuntu/banpo-socket` | Banpo-Xism only |
| `scc-io` | `127.0.0.1:4001` | `/home/ubuntu/scc-socket` | C-VAL, ddong-meong, SCC |

`scc-socket.banpo-xism.com` is the existing Nginx/TLS proxy for port 4001.

## What needs deployment

- Changes under `apps/c-val/socket/experiments/`,
  `apps/ddong-meong/socket/experiments/`, or
  `apps/scc/socket/experiments/` require an `scc-io` relay update.
- Changes under `socket/`, `socket-server-production.mjs`, or relay
  dependencies also require an `scc-io` relay update.
- Frontend-only changes are deployed by Vercel and do not require a relay
  restart.

## Fixed production contract

| Item | Value |
| --- | --- |
| Remote working directory | `/home/ubuntu/scc-socket` |
| PM2 process | `scc-io` |
| Internal listener | `127.0.0.1:4001` |
| Health endpoint | `http://127.0.0.1:4001/socket` |
| Relay entry point | `socket-server-production.mjs` |

The remote directory is a deployed file copy, not a Git checkout. Do not run
`git pull` there. The deployment command synchronizes the server entry and all
three app-owned handler directories; it does not copy frontend code.

## Normal relay release

Every C-VAL, ddong-meong, or SCC relay update is one command:

```bash
pnpm deploy:scc-relay
```

The command uses the existing Banpo EC2 target and its existing PEM file. It
first confirms `scc-io` and 4001, synchronizes the production entry plus all
three app socket-handler directories (excluding tests), checks the entry
syntax, restarts only `scc-io`, and checks the loopback health endpoint. It
does not use a remote Git checkout, run an install or build, touch `banpo-io`,
or expose port 4001.

## Agent procedure

When the user asks to deploy changed relay/server logic, run only:

```bash
pnpm deploy:scc-relay
```

Success means the command ends with `"ok":true` from the 4001 health endpoint.
If it fails, do not retry by changing PM2, Nginx, AWS, DNS, ports, credentials,
or Banpo files. Report the command error and inspect only `scc-io` read-only
status/logs until the user gives a new instruction.

## Dependency or entry-point change

`socket-server-production.mjs` and `socket/create-socket-server.mjs` are
included. If `package.json`, `pnpm-lock.yaml`, or another shared socket module
becomes a runtime dependency, add it to `scripts/deploy-scc-relay.mjs` before
deploying that change.

## Boundaries

- Do not restart `banpo-io`; it owns Banpo-Xism's port `4000` service.
- Do not change Nginx, DNS, TLS, security groups, or Vercel variables as part
  of this procedure.
- Do not expose port `4001`; it remains loopback-only.

## First SCC browser release

The current relay accepts the C-VAL and ddong-meong Vercel origins by default.
Before a deployed SCC browser is pointed at
`https://scc-socket.banpo-xism.com`, set its exact deployed origin once in the
`SOCKET_ALLOWED_ORIGINS` environment of `scc-io`, alongside those two existing
origins, then restart `scc-io`. Do not guess an SCC Vercel hostname.
SCC is served at `https://scc-jyc.vercel.app` and its alias
`https://exp-jyc.vercel.app`; add each origin that should reach the relay.

Since 2026-10-20 `scc-io` runs with `SOCKET_ALLOWED_ORIGINS` set to the C-VAL,
ddong-meong, `scc-jyc`, and `exp-jyc` origins, saved with `pm2 save`. Before
that it was unset and only the two code defaults were accepted. To change it,
restart with the full list and `pm2 restart scc-io --update-env`, then
`pm2 save`; `pnpm deploy:scc-relay` restarts without touching it.
