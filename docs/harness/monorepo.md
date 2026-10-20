# Monorepo apps and deployment

The repository is a pnpm workspace with six independent Next.js roots. A
change to one artwork does not require a second Git repository or a duplicate
dependency checkout.

| Vercel project | Root Directory | Intended domain |
| --- | --- | --- |
| SCC archive (`scc-jy`) | `apps/scc` | `scc-jyc.vercel.app`, alias `exp-jyc.vercel.app` |
| C-VAL | `apps/c-val` | `c-val.vercel.app` |
| ddong-meong | `apps/ddong-meong` | `ddong-meong.vercel.app` |
| Goldfishes | `apps/goldfishes` | `goldfishes.vercel.app` |

`apps/six-sigma` and `apps/xyt-cube` are local experimental apps at HTTPS
ports 2002 and 2003; they have no Vercel project or intended domain yet.

Create or connect four Vercel projects to the same Git repository and set each
Root Directory exactly as above. Keep the repository's pnpm install command and
the app-local Next.js build command selected by Vercel. The exact `vercel.app`
names still depend on availability in the Vercel account.

The SCC project accepts `C_VAL_APP_URL`, `DDONG_MEONG_APP_URL`, and
`GOLDFISHES_APP_URL`, each a
deployed origin without a trailing path. They default in production to the
intended domains above. SCC uses them only to preserve the old `/c-val/...`,
`/ddong-meong/...`, and `/goldfishes/...` entry paths; the path suffix and query
string are carried to the standalone app.

Browser clients continue to use `NEXT_PUBLIC_SOCKET_URL` when explicitly
configured. Otherwise the existing HTTPS hostname plus
`NEXT_PUBLIC_SOCKET_PORT` behavior remains. The local runner can scope its
registry for an individual artwork. Production C-VAL, ddong-meong, and SCC
share one `scc-io` relay process on the Banpo-Xism EC2; their browser origins
point at its one socket hostname. Socket deployment remains a stateful service
and is not part of an app's Vercel Root Directory. See
[the shared relay deployment](./scc-relay-deployment.md).

To add a future standalone artwork, create another `apps/<artwork>` workspace,
give it its own Next.js config and public directory, add it to the HTTPS runner,
and connect another Vercel project to that directory. Do not move its routes
back into the SCC archive app.

## Deployment storage

The Hobby account's Deployment Storage is shared by every project and counts
each retained deployment's full static output; identical `public/` files are
not deduplicated across deployments. Measured 2026-10-20: one SCC deployment
is about 268 MB static plus an 8.8 MB function bundle; one C-VAL deployment was
231 MB, 205 MB of it WAV. About 30 days of SCC pushes reached 3.4 GB.

- Retention for `scc-jy` and `c-val` is 1 week for canceled, errored,
  pre-production, and production deployments (Settings → Build and Deployment
  → Deployment Retention Policy). Vercel always keeps the latest three Ready
  production deployments; older ones cannot be rolled back to after a week.
- "Skip unaffected projects" is on, so an app redeploys only when its root or
  a shared root file (`package.json`, `pnpm-lock.yaml`) changes.
- `exp-jyc.vercel.app` is a second production domain on `scc-jy`, not a
  project: it serves the same deployment and adds no storage. A host rewrite
  in `apps/scc/next.config.ts` serves `/` there from `app/exp-jyc/` (title
  "Experiments — Jeanyoon Choi"). An inline script in the root layout sets
  `data-scc-host="exp-jyc"` on that host before paint, so the navigation's
  home label reads `exp-jyc` on every static index page. Routes and `scc-jyc`
  are otherwise unchanged and static. Per-origin
  allowlists must name it too: the desktop-collage helper's `defaultOrigins`
  already does, and so does the relay's `SOCKET_ALLOWED_ORIGINS`
  ([relay](./scc-relay-deployment.md#first-scc-browser-release)).
- C-VAL deploys FLAC comment audio and excludes WAV masters through
  `apps/c-val/.vercelignore`; see
  [deployed comment audio](../../apps/c-val/docs/deployment-storage.md).
- SCC `public/` JPG/PNG files were losslessly recompressed on 2026-10-20
  (`jpegtran -optimize -copy all`, `oxipng -o 4 --strip safe`); a file was
  replaced only when smaller and its decoded RGBA64 pixels matched. 217 files
  saved about 3 MB; 41 PNGs whose ffmpeg pixel check differed were left as is.
  Gains are small because most images are already compressed JPG.

Remaining larger levers, each with a trade-off: serve the onnxruntime (41 MB)
and MediaPipe (23 MB) WASM from a CDN, move large media to external object
storage, or re-encode video lossily.
