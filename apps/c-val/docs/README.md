# C-VAL maintenance map

C-VAL is a finished, phone-driven market installation. A phone’s rotation rate
changes volatility, activity, and liquidity (V/A/L); the shared server turns
those conditions into orders and FIFO executions. The displayed price is always
the last execution, never a client-side assignment.

Maintain the established experience. A data, socket, or rendering change does
not authorize a redesign of the mobile, controller, or screen grammar. Preserve
the server/browser boundary: the server owns abstract market state and time;
clients derive all visual state.

## Live structure

| Role | Route | Owner |
| --- | --- | --- |
| Entry | `/` | `components/home/` |
| Phone input | `/mobile` | `components/mobile/` |
| Controller | `/controller` | `components/controller/` |
| Individual screen | `/screen/[screen]` | `components/screen/` |
| Installation composition | `/whole` | `components/whole/` |
| Relay reset | `/reset` | `components/reset/` |

The registered screens are `news`, `media`, `comments`, and `comments-legacy`.
Their route registry is `components/screens.ts`. Market state, orientation,
multi-user aggregation, idle lifecycle, and outbound publishers live under
`socket/experiments/`; browser transport lives in `components/transport/`.

## Maintenance boundaries

- Phone movement is the sole participant input after browser permission. V/A/L
  are intermediate conditions, not controls.
- Keep the dormant `waiting` lifecycle, execution-derived price, bounded server
  snapshots, stable record IDs, and experiment-specific socket namespace.
- Keep all presentation state out of socket payloads. Do not let a screen alter
  market input, matching, or lifecycle.
- Do not remove historical source, trials, or dated failure records merely
  because their routes are retired.
- Before a change, re-read the target file and the relevant record below; state
  the changed relation and the visual, behavioral, route, and socket invariants.

## Verification

Execution restrictions and browser-testing authorization follow
[AGENTS.md](../../../AGENTS.md). Relevant static/pure checks are `pnpm lint`,
`pnpm --filter @scc/c-val typecheck`, and targeted `node --test` files beside
the changed socket capability.

## Records by purpose

- [Current and historical C-VAL 2 record](./2.md) — sensor/market contract,
  lifecycle history, code map, and linked trial records.
- [Working baseline](./2-working-baseline-2026-08-04.md),
  [iteration ledger](./2-iteration-ledger-2026-08-05.md), and
  [interaction failure review](./2-interaction-failure-review.md) — preserve
  the rejected input approaches and real-phone acceptance boundary.
- [Visual wrapper](./bloomberg-visual-wrapper.md),
  [news migration](./2-news-bloomberg-migration-2026-08-10.md),
  [comments](./2-comments.md), and [media overlay](./2-media-comment-reaction-overlay-2026-08-26.md)
  — screen-specific contracts.
- [Shake harness](./shake-harness.md), [voice iteration](./voice-iteration.md),
  and [beep censoring](./beep-censoring.md) — retained tooling and audio
  contracts; [deployed comment audio](./deployment-storage.md) — FLAC
  delivery and `.vercelignore` boundary.
- [Discord](./external-publisher.md), [Slack](./slack-publisher.md),
  [Telegram](./telegram-publisher.md), and [reset route](./reset-route.md) —
  external transport and deployment runbooks.
- Remaining dated casino, rollercoaster, mobile, controller, and QR records are
  historical decisions; consult them before reviving their subject.
