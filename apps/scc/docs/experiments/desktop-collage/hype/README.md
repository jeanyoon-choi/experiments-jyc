# hype/1 — keyword cascades of real and cloned pages

Route: `/desktop-collage/hype/1`, created 2026-10-09. Control endpoint:
`/desktop-collage/hype/1/control`; cloned pages at
`/desktop-collage/hype/1/window`. Implementation:
`components/desktop-collage/hype/1/`. The family name follows the Goldfishes
proposal's word for what the keyword does ("hype"); `primitives/` keeps the
elementary gestures.

## Tested relation

One keyword, **AI**. At a stochastic rhythm (about one window every 7 s,
with bursts and lulls) a browser window of laptop size opens with something
about the keyword or one of its derivatives (AGI, generative AI, LLM, xAI,
physical AI, AI agents, GPU, OpenAI, NVIDIA, …). The material mixes **real
pages** (Wikipedia, YouTube talks by Altman, Amodei, Huang, Karpathy and
Sutskever, arXiv, company sites, Google, Naver and Hacker News) with
**hyper-real clones** served by this app (a Slack channel, an article on an
invented outlet, a Google results page, a YouTube watch page around the real
video, a SaaS landing page). A reader attends to the newest window: it
scrolls, pauses, returns; in cloned pages it types and sends; in real pages
it may follow a link to a derived keyword, which spawns another window.
Nobody touches the computer.

Question: does the desktop read as attention being pulled around by hype,
rather than as a demonstration of windows opening? Baselines:
[Goldfishes native-windows/3](../../../../../goldfishes/components/native-windows/docs/3.md)
(many unrelated pages at 0.3 s through AppleScript on the user's Chrome) and
[primitives/2](../primitives/2.md) (the Chrome app surface).

Later, keyword events will come from
[Goldfishes tech-eyes/1](../../../../../goldfishes/components/screen-archive/tech-eyes/docs/1.md):
a goldfish meeting a keyword fires one event. That app is about to be
rebuilt, so only the event interface (`model/rhythm.ts` produces arrival
times; `plan.ts` consumes them) is kept open; the sync is not designed.

## How it works

- **Rhythm** (`model/rhythm.ts`): a self-exciting (Hawkes) point process
  sampled by Ogata thinning from the seed. Gaps are exponential; `burst`
  (0–100 %) makes each arrival raise the rate for a few seconds (memory 0.4 ×
  interval, up to 0.8 expected followers per arrival at full burst). The
  base rate is lowered so the stationary mean gap stays at `interval`: burst
  trades even spacing for clusters and lulls, not for more windows. Gaps are
  never under 0.35 s.
- **Keyword chain** (`model/keywords.ts`): the root and 20 derived keywords
  with base weights. Draws return the root 30 % of the time, otherwise a
  derived keyword by weight. Reading a window raises its keyword, a derived
  keyword found in a window's title raises that one, and a followed link
  raises its keyword most; weights relax to base with a 40 s constant.
- **Deck** (`model/catalogue.ts`): 52 real pages and 40 clones over 21
  keywords (Slack 7, article 12, Google 11, YouTube 5, landing page 5). A
  window is a clone with probability `clones` %, then the other kind, then
  the root's pages, when the keyword has none left; 0 % and 100 % mean
  exactly that. The five YouTube IDs were verified through oEmbed on
  2026-10-09. Every real page was opened in the throwaway instance on
  2026-10-10 (ten at a time, titles read through DevTools after 16 s):
  Google web search answered every query with its "unusual traffic" page
  (`/sorry/`), and chatgpt.com and x.ai stopped at Cloudflare's challenge,
  so those eight pages were removed; Google News search, Google Trends,
  Naver, Wikipedia, YouTube, arXiv, Hugging Face, openai.com, nvidia.com,
  anthropic.com, The Verge, TechCrunch and Hacker News all loaded.
  Wikipedia now redirects the xAI article to SpaceXAI, which loads.
- **Windows** (`model/layout.ts`): widths spread from 0.4 × the mean
  (`size` % of the visible width) up to the mean and never beyond it, so no
  window covers the desktop; proportions a laptop browser's (width over
  height 1.3–1.75, kept when a bound clamps), never under 380 × 300. Places: a cascade from the top-left by 22 pt with jitter
  (40 %), anywhere on the desktop (35 %), or against the right, left or
  bottom edge (25 %); newest in front. Above `limit` the oldest closes
  through DevTools. With `pages: scaled` a window narrower than 1280 pt
  shows its page zoomed out in proportion (down to 0.5), so a small window
  holds a whole desktop page as a small browser would not: cloned pages
  zoom themselves from their URL, real pages are told to through their
  session, again after a followed link. A share `dark` of the windows
  (default 50 %) is rendered in Chrome's automatic dark mode through its
  session (`Emulation.setAutoDarkModeOverride` plus a dark
  `prefers-color-scheme`), real pages and clones alike, so the stack mixes
  dark and light grounds. The whole run is composed from the seed
  (`compose` in `plan.ts`), so the control page previews exactly what the
  Mac will do: the rectangles in order (dark ones fainter) and the arrivals
  on a time strip.
- **Reader** (`agent/reader.ts`, `read` in `plan.ts`): a timed script per
  window, started 2.5 s after placement; attention always moves to the newest
  settled window and the previous script is abandoned. `passive` scrolls
  2–5 times with pauses and the odd scroll back. `active` additionally, in
  clones only, focuses the page's composer, types a line from a small corpus
  character by character (55–120 ms each), sends it, and often likes. On
  real pages with `links: follow`, 55 % of scripts end by following a
  visible link whose text mentions a chain keyword (derived first, by
  weight), in the same window; the keyword then spawns a window 1.5–4 s
  later. Real pages are never written to. The pure test holds that.
  With `attention: restless` the reader also keeps returning: whenever it
  is idle, every 3–9 s, it picks an earlier window (newer ones more likely),
  brings it to the front (`Page.bringToFront`) and pays it a brief visit of
  one or two scrolls, writing there only if it has not written there before
  and only sometimes, following a link less often. A new window still takes
  attention first, once.

  Replaced the same night: `restless` now **flicks**. Every 0.25–1 s it
  brings another open window to the front (newer ones more likely) with one
  small scroll, without waiting for anything to finish; the newest window's
  reading script runs underneath regardless. On a real page a flick leaves
  through a link with a small chance (6 % × `spawn`), so navigation itself
  keeps spawning windows.

  `spawn` (0–100 %, default 60) sets how readily links are followed (the
  chance a real page's script ends in a link rises from 0.2 to 0.95 with it;
  0 never) and how many windows a followed keyword spawns (one, and a second
  with probability `spawn`).
- **Cloned pages** (`window/`): each registers `window.__hype` with
  `focus`, `type`, `submit` and `act`. Slack sends as the member 지안 and
  likes with a 👍 reaction; the article posts a comment and likes the first;
  Google types into the search box and answers a sent query the way Google
  corrects one ("Showing results for …"), opening a "People also ask" row on
  like; YouTube comments and likes; the landing page opens its support chat,
  sends, and accepts the cookie banner on like. Titles carry the keyword, so
  the reader's title check feeds the chain.
- **Foundations**, all additive with current behaviour as default:
  `PlanItem.at` (per-window arrival time) and `Plan.sound`; the DevTools
  client takes a session ID; the Chrome app surface attaches a session per
  page and offers `opened`, `evaluate`, `scroll`, `click`, `close` and
  `open`, re-attaching once after a cross-site navigation; `animate`
  receives that `Acting` object as a fifth argument; the browser fallback
  schedules by `at` and acts on its own-origin pop-ups only. Without sound
  the instance is muted (`--mute-audio`); with it, autoplay is allowed.
  The Mac helper serves `hype/1` too.

Parameters: interval 2–20 s (7), burst 0–100 % (40), windows 4–40 (20), size
40–100 % (70), kept open 4–24 (12), pages (zoomed out when narrow / at
100 %), cloned pages 0–100 % (50), dark pages 0–100 % (50), sound, reader
(no one / scrolls / scrolls and writes), links (may follow / leaves alone)
with derived 0–100 % (60), attention (newest window / flicks around),
pattern, clear before a run.

Not built: clones of X and LinkedIn. The repository's rule for the four
post-action glyphs (served platform assets, never drawn) could not be met
for X tonight; a tweet is still material to add once its glyphs are
sourced. A vision-model reader (`model` level) is reserved, not started.
Windows do not move after opening.

## Evidence

Pure tests (`model/model.test.ts`, 7) cover reproducible increasing
arrivals with the minimum gap, the stationary mean gap at burst 0 and 100
with a higher coefficient of variation when bursty, the chain's draws, raise
and relaxation, containment on three displays at three sizes, unique deck
IDs and no repeats before exhaustion, the reader never writing on real pages,
and a composed run that fits the display with clone URLs on the window
route. They pass with the existing desktop-collage tests (29 in all);
`pnpm --filter @scc/archive typecheck` passes; ESLint on the area reports
no errors (three warnings: `<img>` for the real stills and the Google Fonts
link in the window page).

2026-10-09 23:59–00:03, this Mac (1470 × 956, visible 843 high, Brave as the
main browser), defaults, through the control route, with desktop captures:
- the schedule read `+0.6 s AI · Google · real, +3.0 s Hacker News, +8.3 s
  arXiv, +15.6 s AI agents · landing page · clone, +20.6 s GPU · Wikipedia,
  +23.2 s NVIDIA · Signal · clone, +31.0 s AI · Google · clone, +54.1 s
  xAI …`, 20 windows over 158 s;
- at 00:00 the stack showed, as thin-barred app windows over Brave: Hacker
  News, the Agentry landing page, Graphics processing unit — Wikipedia, the
  Signal article on Nvidia scrolled to its comments, and on top the Google
  clone with `bubble` being typed into its search box by the reader;
- at 00:01 the reader had scrolled 네이버 뉴스: 엔비디아 and Hugging Face
  (real), the Sam Altman article still showed behind, and the landing
  page's chat panel was open;
- at 00:02 the first Google clone had been sent the whole line `my feed is
  100% AI bubble now and i don't remember choosing that` and had re-run its
  page for it, a second Google clone (superintelligence) had its box cleared
  for typing, and the YouTube clone of the Altman episode sat behind;
- the run ended `Done`, the button turned to `Stop reading`, 12 windows
  were kept open, and `clear all` closed 12.

Changed after the captures: the Google clone now keeps its results on the
keyword and shows a sent query as a correction line, because the overview
rewritten around a typed sentence read as broken rather than as a search.

2026-10-10 00:23–00:27, after the feedback that the stack read as
monotonous and that some pages did not load: deck pruned as above, sizes
and places spread, pages scaled, attention restless (the rest default).
Observed in captures: a small TechCrunch window (about 520 pt wide) holding
the whole desktop page zoomed out over a large 전자신문 article window; that
article was reached by the reader following a link from the Naver 엔비디아
news page (the run counted 21 windows for 20 planned, the spawn); the Naver
window brought back to the front in full over the others; sizes from a
third of the screen to nearly all of it. Chrome's translate bubble opened
over the Korean page; the instance now starts with Translate disabled. The
run ended `Done` with 12 kept; `clear all` closed 12.

2026-10-10 00:33–00:37, after the next feedback (flick constantly, mix
dark and light, no window as wide as the screen, more derived windows):
defaults with attention flicking. The run reached 27 windows for 20 planned
(seven derived from followed links); captures five seconds apart showed a
different window in front each time (the dark xAI Google clone, then Google
Trends, NVIDIA and two Naver news windows), dark and light grounds side by
side (Trends, NVIDIA and the Google clone dark; Naver and Wikipedia light),
and no window wider than about two thirds of the screen. The translate
bubble still appeared over Naver despite the flag, so the profile's
preference now turns translate off before each cold start (not yet
observed). The run ended `Done` with 12 kept; `clear all` closed 12.

2026-10-10 23:59, found while building hype/2: `Page.bringToFront`, which
restless mode had used to bring a window forward, only activates a tab and
never reordered the windows, so the flicks seen in the 00:33 captures were
the windows' own openings and moves, not the flicks. The surface now raises
with `Target.activateTarget`, measured to reorder within 150 ms; restless
mode in this route has not been re-observed since.

Not yet observed: sound on; the browser fallback; the helper path; frame
times with 24 windows kept; the translate preference; restless mode with
the working raise.

## References

Searched 2026-10-09 for the exact genre: a software agent acting in real web
pages as a live performance; live found-text displays; clone websites as
artwork. Desktop and window choreography (JODI, Amisola, Staal) is in the
[area README](../README.md).

- **Agents acting in the real web, shown live.**
  [*Synthetic Messenger*](https://lav.io/projects/synthetic-messenger/)
  (Tega Brain and Sam Lavigne, 2021): every day 100 bots visited each climate
  article and clicked every ad, two weeks inside a public Zoom call
  ([Salon](https://www.salon.com/2021/06/18/think-climate-change-isnt-click-worthy-these-bots-disagree_partner/)).
  The closest precedent for "bots browsing as the work"; a grid of bot
  screens, not a desktop, and real pages only.
  [*Random Darknet Shopper*](https://zkm.de/index%2Ephp/en/node/5990)
  (!Mediengruppe Bitnik, 2014–16): a bot with a weekly budget buying one
  random item; the question of who acts.
- **Live found text as material.**
  [*Listening Post*](https://sjmusart.org/exhibition/listening-post) (Mark
  Hansen and Ben Rubin, 2001–): chat-room fragments on 231 small screens.
  [*Beacon*](https://fact.co.uk/artwork/beacon-2005-2008) (Thomson &
  Craighead, 2005–): live web searches on a railway flap sign. Both show the
  keyword stream; neither opens the pages.
- **Association chains.** [*I'm Google*](https://artbase.rhizome.org/wiki/Q1501)
  (Dina Kelberman, 2011–): a hand-made chain of Google images, each batch
  leading to the next by form. Here the chain is semantic (AI → AGI → xAI).
- **The real web transformed in the browser.**
  [*Abstract Browsing*](https://www.phaidon.com/en-us/blogs/stories/browse-a-polychromatic-web-with-rafael-rozendaal)
  (Rafaël Rozendaal, Chrome extension): every page reduced to colour blocks
  while it still works.
- **Clones as artwork.** Eva and Franco Mattes,
  [*Vaticano.org* (1998) and *Copies* (1999)](https://en.wikipedia.org/wiki/Eva_and_Franco_Mattes):
  near-exact copies of the Holy See's site and of other net artists' works.
  The clone is the object there; here clones and originals share one stack.
- **Scrolling as the act.**
  [*The Hidden Life of an Amazon User*](https://theglassroom.org/object/joana_moll-the-hidden-life-of-an-amazon-user)
  (Joana Moll, 2019): 8,724 pages of code scrolled through for one purchase.
- **Human as agent, the inverse.**
  [*LAUREN*](https://get-lauren.com/) (Lauren Lee McCarthy, 2017): the artist
  as a human smart-home assistant for days.
- **Agent spectatorship, 2024–26.**
  [Truth Terminal](https://knowyourmeme.com/memes/truth-terminal) (Andy Ayrey,
  2024; its posting was filtered, not unsupervised),
  [Claude Plays Pokémon](https://techcrunch.com/2025/02/25/anthropics-claude-ai-is-playing-pokemon-on-twitch-slowly)
  (reasoning on the left, screen on the right) and
  [Moltbook](https://www.techradar.com/pro/everything-you-need-to-know-about-moltbook)
  (2026, an agents-only network whose autonomy turned out far smaller than
  reported). The culture the piece sits in; none of it is a desktop.
- Not found after these searches: a work in which an agent opens real and
  cloned pages on a real desktop under a keyword.

What this adds: the operating system is the stage and the stack is left as
it falls; the keyword drives which page, how soon, how large and what the
reader does; real pages and hyper-real clones interleave in one stack, and
the reader only reads the real ones and only writes in the clones, so the
real/fake boundary is where its agency starts and also the ethical boundary
(nothing is posted to a real service); real data sits inside fake frames (a
cloned watch page plays the real talk, a cloned channel quotes a headline)
and a real page receives a fake reader.

## Open questions

- Whether a followed link should always stay in the window (now) or
  sometimes open beside it; and whether spawned windows should be marked
  in the control page's strip.
- Whether clones should carry a quiet tell (a wrong favicon, an impossible
  count) or stay indistinguishable. They are indistinguishable now.
- Whether the windows should drift or breathe, as native-windows/2 does, or
  whether stillness is what makes the arrivals legible.
- Whether restless visits should also move or resize the window they
  return to, and how long a visit should hold before the next.
- How the Goldfishes events replace the point process: one event per
  goldfish contact would be far denser than one per 7 s.
