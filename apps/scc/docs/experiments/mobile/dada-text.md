# Dada text — /mobile/dada-text/[experiment]

Experimental, 2026-10-18; named `semantic-instagram` until 2026-10-19. A standalone line for the in-place command substitution of Instagram alone. Its baseline is
[`substitution/3`](substitution.md#3--in-place-2026-10-13) on clone 11: `/default` (first `/1`) must look and behave exactly as
`/mobile/transform/substitution/3/11` does with the same options chosen. The tested relation is the same; what changes is
ownership: nothing here is shared with `clone/` or `transform/`, so later variants (`/1`, `/2`) can alter the clone, the
reading or the drawing without touching the four-clone family or `/mobiles/2`.

## /default — 2026-10-18 (was /1)

Defaults differ from `substitution/3`'s: 주의 (attention) vocabulary, Didot, 테두리 0 (no frames, no dividers), 바깥 테두리 1 px,
검은 바탕, 먹. The option set is unchanged: 화면 (원본, 치환, 콘텐츠만), 명령어 (소비, 규율, 주의), the six typefaces, 글자색
(먹, 대표색, 랜덤), 바탕, both frame sliders and 기본값으로.

Layout, in `components/mobile/dada-text/`. One variant is one folder; a later variant is a copy of `default/` with
one layer changed; `default/` is the baseline. Dependencies run one way: `reading/` → `paint.ts` ← `drawing/`; `words/` is used by reading and knows
no box; `panel/` holds state only; `renderer.tsx` joins them.

- `experiments.ts` — the family registry the route reads. `default/index.tsx` composes the clone, the renderer and the panel.
- `default/instagram/` — a verbatim copy of `clone/11` (`model/data.ts`, `screen/`). The host-page scale context (`CloneScale`,
  used only when `/mobiles/2` draws phones smaller) is dropped: pointer positions are read as they are.
- `default/marks.ts` — every attribute and custom-property name written into the page, in one place. `drawing/sheet.css` repeats
  them by hand; `marks.test.mjs` fails if one is missing there.
- `default/reading/` — DOM → parts, knowing nothing of typefaces or ink. `tokens.ts` (text split into parts with roles; tested),
  `geometry.ts` (boxes, nearness, rounded insets), `facts.ts` (each box's original paint, read once with the hiding lifted),
  `picture-colour.ts` (a picture's mean colour), `hues.ts` (랜덤), `parts.ts` (`visit`: which elements are parts and boxes),
  `text.ts` (runs → tokens → one cell per line), and `paint.ts`, the contract: `Paint`, `Layer`, `CellSpec`, `Reach`, `ReadOptions`.
- `default/words/` — part → word. `vocabulary.ts` is the three word lists; `reading.ts` reads a control's label for its action and
  names each part.
- `default/drawing/` — `Paint` → screen. `look.ts` (`Look`, the six typefaces, palette, the two slider maxima), `cell-image.ts`
  (one cell as an SVG data URI, cached), `properties.ts` (a paint as custom properties), `sheet.css` (the hiding sheet).
- `default/renderer.tsx` — when to read (DOM changes, 100 ms while scrolling, resize, fonts, loaded media) and the writing of
  properties and marks; a new look rewrites from the cached facts without reading again.
- `default/panel/` — `settings.ts` (what the panel sets, and the defaults), `panel.tsx`, `panel.css`.

What to open for a change:

| To change | File |
| --- | --- |
| the defaults a variant opens on | `panel/settings.ts` |
| a word list, or which word a part gets | `words/vocabulary.ts`, `words/reading.ts` |
| what counts as a part, face, field or box | `reading/parts.ts` |
| how text is split or a token's role | `reading/tokens.ts` (+ test) |
| how a text part becomes cells | `reading/text.ts` |
| a typeface, the frame, the ground, the ink | `drawing/look.ts`, `drawing/cell-image.ts` |
| what the hiding sheet hides | `drawing/sheet.css` (names from `marks.ts`) |
| when the page is re-read | `renderer.tsx` |
| the option panel | `panel/panel.tsx`, `panel/panel.css` |
| the clone itself | `instagram/` |

Checks: `tokens.test.mjs` and `marks.test.mjs` pass; typecheck and lint pass; `reading/parts.ts`'s `visit`, the text pass and `cellSvg` diff clean against `substitution/3` once names are normalised; the navigation registry test accepts the new entry. 
**Horizontal lock (2026-10-18, later).** The feed scroller (`.scroll`) was `overflow-y: auto` alone, so its overflow-x computed
to `auto`; the home header's Notifications button ends 1 px past the 430 px frame (431 px scroll width, in `clone/11` and
`substitution/3/11` too), so a finger moving down and slightly sideways panned the feed sideways. Here `.scroll` is
`overflow-x: hidden`, `.app` has `overscroll-behavior-x: none` and `.outer` `overflow-x: hidden`; no box moved. The stories and
highlights rows keep their own sideways scroll. `clone/11` and `substitution/3` are left as they were.

**Check (2026-10-18, Brave, 1470 px window, so the frame is its full 430 px).** Every element box under `<body>` on
`/mobile/dada-text/1` (now `/default`) and `/mobile/transform/substitution/3/11`, Next's dev overlay and scripts excluded, was listed as
tag and rounded rect and compared in order: 4,071 boxes, not one different. The stylesheet has no media query between 350 px
and the frame's 430 px, so a 390 px phone lays out from the same rules. Both pages wrote 86 cells on first read. Not checked:
a real phone's touch, and the hidden automation tab could not be resized to phone width.

## /1 — 2026-10-19

The first step away from the clone towards an interface of its own: only the fourth tab, Explore (search and grid), and the
post a tile opens. The two are separate routes, `/mobile/dada-text/1` and `/mobile/dada-text/1/<post id>`,
so the browser's back moves between them instead of leaving the experiment. A copy of `default/` with the clone changed;
reading, words, drawing and panel are untouched.

- Route: the experiment is drawn by `app/mobile/dada-text/[experiment]/layout.tsx`, so it stays mounted (panel
  settings, likes, search) while `[post]/page.tsx` changes under it; both pages render nothing. `experiments.ts`'s
  `dadaTextPosts` lists which variants take a post route and which ids; any other id is a 404.
- `1/index.tsx` reads the post from `useParams` and moves with `router.push` / `router.back`. The post's back button is the
  browser's back when the post was opened from the grid, and a push to the grid when it was opened by its URL.
- `1/instagram/screen/index.tsx`: no bottom navigation, stories, reels, inbox, profile or create. Reel tiles open as posts.
  Profile, name and story links keep their look and do nothing. Comments, share and options sheets stay; options keeps
  Save, Share, Follow and Hide (Hide returns to the grid without that post). The grid's scroll is restored on return.
  `reels.tsx` and `story-viewer.tsx` are not copied.


**Black only (2026-10-19, later).** `/1` is now the black 치환 alone; `default/` keeps every mode.
- Removed: the 화면 (원본, 치환, 콘텐츠만) and 바탕 options, with `Reach`, `Look.dark`, the `TEXT` mark, `Paint.text` and the
  content and white-ground rules of `sheet.css`. `<html>` carries `data-dada-text` while the filter is on: black ground, white ink.
- Notch: the `[experiment]` layout's `generateViewport` sets `themeColor: #000` for `/1` only. `.outer` and `.app` are black from
  the first frame.
- 바깥 테두리: 0–1 px in 0.05 steps. 테두리 (each cell's frame) likewise 0–1 px, drawn at its actual width in full white
  rather than a 1 px line that fades below 1.
- Explore: no search glyph before "SCROLL" (the field is centred in the 430 px frame) and no reel badge on tiles.
- Frames: a box (container) draws no frame and no border lines; only cells do, once each, so frames never nest. The Explore
  grid's gap is 0, so neighbouring tiles share one line instead of two lines 2 px apart.

**하이프 (2026-10-19, later).** Both frames default to 0, and 테두리 (each cell's frame) is 0–1 px, drawn at its actual width
in full white. A new 명령어 choice, 하이프, is the default: instead of a word read from each part's role, every part (an element
cell, or one token of a text) takes the next of six tech-hype keywords, AI · BLOCK CHAIN · META VERSE · NFT · WEB3 · AGI, cycling
(after `complex-systems/bubble/3`'s tech keywords). A first test dealt the NYT banner of 12 September 2001 instead.
- `words/sequence.ts` holds the words and the sequence. A part keeps its word while its element lives (numbers are kept per
  element and slot). Parts first met in one reading are numbered top to bottom, then left to right, after the whole reading
  (`settle`), so text, read after elements, still falls in visual order.
- The sequence runs on across the two routes: a post opened from the grid continues it rather than restarting.
- A field keeps its own word and is never framed, so the search box at the top stays SCROLL, with no frame at any 테두리. (Removing the search section was tried and undone.)
- A space in a word sets it over two lines in its cell (`drawing/cell-image.ts`), each line filling the width, with a gap of
  3 % of the letters' height; a cell too short for two lines sets the word whole on one line (BLOCKCHAIN).
- 텍스트 (shown under 하이프): 섞기, the six cycling (default), or one of them for every cell (`Settings.hype`; the
  sequence is then dealt from that one word). The search field stays SCROLL either way.
- 소비, 규율 and 주의 remain as choices.
- Notch: besides `themeColor`, the viewport declares `colorScheme: dark`, and `sheet.css` makes `<html>` and `<body>` black
  whenever the panel is in the page (`html:has([data-dada-text-ui])`), i.e. from the first server-rendered frame, not only once
  the renderer has read. The sticky Explore and post headers are black in the clone's own CSS too.

**Ink fit (2026-10-19, later).** `/1` no longer sizes letters from a fixed cap height per face (`look.ts`'s `cap`), which let
round letters (C, O, S) overshoot and be cut at the cell's top. `drawing/cell-image.ts` measures each line's own ink (canvas
`actualBoundingBoxAscent`/`Descent` at 100 px, cached per face and line) and fits it to its band exactly; `cap` remains only as
the fallback where no canvas is available. An element cell's letters are inset only by its frame's width and its rounded
corners (`reading/parts.ts`, was at least 2 px), so at 테두리 0 the ink touches the cell's top and bottom: rendered tiles
measured 0 px clear above and below.

**Pictures in the grid (2026-10-19, a test).** Without a search, the Explore grid places one picture after every four word
tiles (사진 빈도 in the panel), cycling through eight tech-leader portraits from
/screen/tech-eyes/1's Wikimedia Commons set already in `public/images/0908/tech-power-faces/` (attribution there): Altman,
Zuckerberg, Huang, Musk, Pichai, Nadella, Cook, Hassabis. A picture tile carries the `UI` mark, so the filter neither reads
nor hides it and it shows as a photograph; it opens nothing. Its key is derived from the post it follows.

The panel's 사진 sets this: 있음 (the default) with a 사진 빈도 slider, one picture after every 12 tiles (left) to every tile
(right), default 4; 없음; and 자율, where no pictures are inserted and instead each post tile turns between its word and a
picture at random moments. Every 500 ms each tile may turn: a picture stays about 3 s and a word about 9 s on average
(`PICTURE_MS`, `WORD_MS` in `1/instagram/screen/index.tsx`), so about a quarter of the tiles are pictures at any time. A
tile always turns to the same portrait (`pictureFor`), carries the `UI` mark while turned, still opens its post, and gets
its own word back when it turns again. Measured in the browser: 102 tiles, 8 → 21 turned over the first 7 s.
