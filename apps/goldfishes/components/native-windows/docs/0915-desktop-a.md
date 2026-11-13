# Desktop A — native applications

Experimental, 2026-09-15. Manual terminal trigger and local `/desktop` start/stop page.

question: does attention moving among actual applications produce a materially different experience from the reconstructed PC interfaces?
baseline: PC / 0910 / image-search, conceptually; native control requires a standalone implementation.
mutation: one bounded score acts on Chrome, Terminal, Preview and the real C-VAL Slack workspace.
invariants: existing screen/PC implementations and existing browser/terminal windows are preserved.
evidence: syntax and native execution results recorded below; artistic acceptance belongs to the user.

From the repository root:

```sh
node apps/goldfishes/components/native-windows/a/run.mjs
```

One run creates one Chrome window (three public Wikipedia tabs) and one Terminal window (real `uname` and `uptime` output), opens the existing technology atlas in Preview, opens C-VAL / `#new-channel` through a Slack deep link, then alternates focus and changes the created windows' bounds. Leaves the final state for inspection. No dependencies, AI, synchronization, startup service, or automatic repetition. macOS may ask for Automation permission on first use. No synthetic typing into existing windows, browser JavaScript permission, or Accessibility permission is needed. Preview may reuse an existing image document; its window geometry is not changed. Slack reuses the signed-in app and changes its selected channel; no messages are sent and no publisher/server is started. The channel destination was observed in Slack's UI on 2026-09-15; this does not establish whether the C-VAL report publisher is currently active. See [C-VAL publisher](../../../../c-val/docs/slack-publisher.md).

Ctrl-C in the launching terminal stops subsequent actions. Each Apple event has a 20-second timeout; individual failures are printed and skipped, with no retries. Requested pauses total about 20 seconds; application launch, loading and permission dialogs can extend the run. Do not launch overlapping runs. Close the trial windows manually afterward.

The `score` contains the action sequence and pauses; the AppleScript functions implement app operations. A future fish event or AI decision can select these operations without replacing native execution. Manual one-shot triggering is deliberate for A: compare actual desktop material before adding autonomous timing.

## Fast mode and browser trigger

Append `--fast` to the terminal command for a 500 ms target between action starts. Subtracts each AppleScript call's duration from the pause; calls exceeding 500 ms delay the next action instead of overlapping it. Keeps the original slower A as the default. Three-second lead-in, then 15 actions (roughly 7.5 seconds plus any OS overruns).

Use the existing Goldfishes development server: no additional environment variable or special launch command. Open `https://macbook-air-5.local:2001/` and use the header's `desktop` link, or open `/desktop` directly (adjust for a port override). Localhost is also supported. The server must run on the Mac being controlled; a deployed website cannot control the visiting computer.

The control server (now `components/native-windows/shared/control-server.ts`; `/api/desktop` serves version 1) accepts only fixed start/stop operations, in development on macOS, an exact approved Host (loopback or `macbook-air-5.local`), matching HTTPS Origin, same-origin fetch metadata and JSON content type. This supports the user's existing LAN hostname; it does not authenticate individual LAN visitors. No user-provided commands or paths. One child process per development server; 90-second watchdog, SIGTERM cancellation, no detached worker. Status polling survives a controller reload; the score itself continues if the page closes. Page polling can be delayed while the browser is in the background. macOS Automation permission now belongs to the server's launching app/process and may need a fresh grant. Closing trial windows remains manual; each new run creates another Chrome and Terminal window.

Fast verification: one native `--fast` run completed all 15 operations without reported errors. Goldfishes typecheck passed. Browser start/stop integration has not been exercised because server launch/restart remains user-operated. Actual 500 ms visual timing has not been measured.

Checks: `node --check` and whitespace/link checks passed. One macOS execution completed with all 15 AppleScript actions returning successfully (zero reported errors). Afterward, Chrome's UI showed the three intended tabs with Artificial intelligence selected; Slack's UI showed C-VAL / `#new-channel`. The full temporal composition was not recorded or visually evaluated; native command success is not artistic acceptance. This first score does not scroll, close windows, or make autonomous decisions. Positions are fixed desktop coordinates; other display sizes need a later adaptation.
