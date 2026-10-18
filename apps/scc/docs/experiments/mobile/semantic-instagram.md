# Semantic Instagram — /mobile/semantic-instagram/[experiment]

Experimental, 2026-10-18. A standalone line for the in-place command substitution of Instagram alone. Its baseline is
[`substitution/3`](substitution.md#3--in-place-2026-10-13) on clone 11: `/1` must look and behave exactly as
`/mobile/transform/substitution/3/11` does with the same options chosen. The tested relation is the same; what changes is
ownership: nothing here is shared with `clone/` or `transform/`, so later variants (`/2`, `/3`) can alter the clone, the
reading or the drawing without touching the four-clone family or `/mobiles/2`.

## /1 — 2026-10-18

Defaults differ from `substitution/3`'s: 주의 (attention) vocabulary, Didot, 테두리 0 (no frames, no dividers), 바깥 테두리 1 px,
검은 바탕, 먹. The option set is unchanged: 화면 (원본, 치환, 콘텐츠만), 명령어 (소비, 규율, 주의), the six typefaces, 글자색
(먹, 대표색, 랜덤), 바탕, both frame sliders and 기본값으로.

Layout, in `components/mobile/semantic-instagram/`. One variant is one folder; a later variant is a copy of `1/` with
one layer changed. Dependencies run one way: `reading/` → `paint.ts` ← `drawing/`; `words/` is used by reading and knows
no box; `panel/` holds state only; `renderer.tsx` joins them.

- `experiments.ts` — the family registry the route reads. `1/index.tsx` composes the clone, the renderer and the panel.
- `1/instagram/` — a verbatim copy of `clone/11` (`model/data.ts`, `screen/`). The host-page scale context (`CloneScale`,
  used only when `/mobiles/2` draws phones smaller) is dropped: pointer positions are read as they are.
- `1/marks.ts` — every attribute and custom-property name written into the page, in one place. `drawing/sheet.css` repeats
  them by hand; `marks.test.mjs` fails if one is missing there.
- `1/reading/` — DOM → parts, knowing nothing of typefaces or ink. `tokens.ts` (text split into parts with roles; tested),
  `geometry.ts` (boxes, nearness, rounded insets), `facts.ts` (each box's original paint, read once with the hiding lifted),
  `picture-colour.ts` (a picture's mean colour), `hues.ts` (랜덤), `parts.ts` (`visit`: which elements are parts and boxes),
  `text.ts` (runs → tokens → one cell per line), and `paint.ts`, the contract: `Paint`, `Layer`, `CellSpec`, `Reach`, `ReadOptions`.
- `1/words/` — part → word. `vocabulary.ts` is the three word lists; `reading.ts` reads a control's label for its action and
  names each part.
- `1/drawing/` — `Paint` → screen. `look.ts` (`Look`, the six typefaces, palette, the two slider maxima), `cell-image.ts`
  (one cell as an SVG data URI, cached), `properties.ts` (a paint as custom properties), `sheet.css` (the hiding sheet).
- `1/renderer.tsx` — when to read (DOM changes, 100 ms while scrolling, resize, fonts, loaded media) and the writing of
  properties and marks; a new look rewrites from the cached facts without reading again.
- `1/panel/` — `settings.ts` (what the panel sets, and the defaults), `panel.tsx`, `panel.css`.

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
`/mobile/semantic-instagram/1` and `/mobile/transform/substitution/3/11`, Next's dev overlay and scripts excluded, was listed as
tag and rounded rect and compared in order: 4,071 boxes, not one different. The stylesheet has no media query between 350 px
and the frame's 430 px, so a 390 px phone lays out from the same rules. Both pages wrote 86 cells on first read. Not checked:
a real phone's touch, and the hidden automation tab could not be resized to phone width.
