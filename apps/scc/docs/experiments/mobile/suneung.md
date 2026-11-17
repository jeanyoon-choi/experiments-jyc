# 수능

`suneung/default` (국어) and `suneung/math` (수학) are the 2026학년도 대학수학능력시험 문제지, 홀수형, all twenty
pages of each area, rebuilt in DOM from the KICE PDFs (시행 2025-11-13). The clone exists to learn the paper's visual
language exactly; the questions themselves will be replaced later, so the grammar below is the deliverable and the
data is one instance of it. All numbers are PDF points measured from the 2026 papers (1 pt = 1 CSS px on the
842 × 1191 sheet).

## The style language

### Sheet and frame

- Sheet 842 × 1191 (A3 proportion, printed as 8절). Text block x 87.9 – 754.2.
- Header rule: one horizontal line at y 147.4, x 87.8 – 754.2, **1.14** thick. Column rule: vertical at x **421.0**,
  y 147.4 – 1067.3, **1.14** thick. Every other line on the paper is **0.36** (hairline); the 홀수형 box is 0.54.
- Two columns: left starts at 87.9, right at 436.56 (= left + 348.66); text measure ≈ 306 in choices, 300–318 in
  passages and boxes.
- Footer: page-number box x 395.5 – 446.4, y 1082.1 – 1104.1 (0.36), split by a diagonal from top-right to
  bottom-left; current page (견명조 11.4) upper-left at (399.9, 1093.7), total `20` lower-right at (427.0, 1100.9).
  The KICE copyright line (굴림 10, blue) is left out of the clone.

### Headers

- Cover (p1, and the first page of each 선택 booklet): `2026학년도 대학수학능력시험 문제지` in 디나루 17.9 (장평
  85 %), centred, baseline 134.1; area title `국어 영역` / `수학 영역` in 견고딕 heavy ≈ 42.6 tall, centred, box
  y 154 – 197; page number `1` 견명조 29.7 at the right (733.9, 135.8); `제 1 교시` (국어) / `제 2 교시` (수학) in
  견명조 17.9 (장평 80 %) inside a pill outline at the left (x 89.4 – 148.9); `홀수형` 견고딕 17.4 (장평 85 %) in a
  rounded box (r 2.7, 0.54) at the right. The 선택 cover adds `(화법과 작문)`, `(언어와 매체)`, `(확률과 통계)`,
  `(미적분)`, `(기하)` after the title in 신그래픽 25.2, overprinted bold.
- Running header (other pages): the page number (견명조 29.7) sits on the **outer** corner and the `홀수형` box on
  the **inner** one — odd pages: box left at 89.4, number right at 733.9; even pages: number left at 87.9, box right
  at 693.1. Title `국어 영역` ≈ 113 × 29 centred at 364.6 (shifted to 282.3 on 선택 pages to make room for the
  subject in parentheses).

### Typefaces and sizes

| Role | HWP face | Size | Web substitute |
| --- | --- | --- | --- |
| Body, passages, choices | 신명조 / 한양신명조, 장평 95 % | 10.93 | Nanum Myeongjo 400 |
| Question number `1.` | 신명 견명조 | 12.35 | Nanum Myeongjo 800 |
| Instruction `[1～3] 다음 글을 읽고 물음에 답하시오.` | 태고딕, 장평 95 % | 10.93 | Noto Sans KR 500 |
| `<보 기>`, `(가)`, labels in boxes | 신명조 | 10.93 | Nanum Myeongjo 400 |
| Running/cover page number | 견명조 | 29.7 | Nanum Myeongjo 800 |
| 수식 (equations) | HyhwpEQ (Computer Modern cut) | 11.04; scripts 7.44 (0.674) | Latin Modern Roman / Italic |
| Large operators ∫ Σ, brace pieces ⎧⎨⎩⎪ | HyhwpEQ | 17.6 – 27.6 | Latin Modern Math |

- HWP 진하게 is an overprint: the same glyph twice, ≈ 0.3 pt apart. Treat it as one bold glyph.
- In equations: variables and function letters are italic (x, y, f, a, θ, π); digits, operators, function names
  (`log`, `lim`, `sin`, `cos`, `ln`) and point names (A, B, O, H) are upright.

### Rhythm and spacing

- Line pitch **18.36** (= 1.68 × 10.93) for body text in every passage, choice and box; a few tight boxes use 17.7.
- Justification: every full line fills its measure. HWP spreads **every glyph** by the same increment inside a
  word and gives the remainder to the word spaces, so a word's glyphs are evenly spaced (advance ≈ 0.95–1.0 em)
  while spaces vary (≈ 0.4–0.6 em). Last lines of paragraphs are set flush left, unspread.
- Paragraph first-line indent **10.26** (0.94 em) — passages and 보기 text alike.

### Question anatomy

- Instruction line (`[n～m] …`) at the column left (87.9 / 436.56), baseline ≈ 17 above the passage box top.
- Passage box: hairline rectangle at the column (87.9 – 405.4 left; 436.6 – 754.0 right), text inset **8.52** from
  the box side (96.42), first baseline 19.6 below the box top, last baseline ≈ 9.8 above the bottom. `(가)`, `(나)`
  labels sit on their own line at the inset.
- Question number at the column left; stem text starts **18.2** after the number's left (106.08 / 454.7); a
  wrapped stem continues at column left + 11.28 (99.18 / 447.84), the same x as the choice numbers.
- Choices ①–⑤, one per line: number at column left + **11.28** (99.18 / 447.84); choice text at number + **15.78**
  (114.96 / 463.62); continuation lines hang at number + **10.31** (109.49 / 458.15) — i.e. under the number's
  right half, not under the text.
- Short choices (수학, short 국어 answers) sit in one row at a fixed pitch of **61.26** (99.18, 160.44, 221.70,
  282.96, 344.16).
- `[2점]`, `[3점]`, `[4점]` follow the stem in body type.
- Vertical placement: questions are spread down the column with blank working space (수학 especially); nothing
  reflows across columns.

### <보기> and boxes

- 보기 box: hairline rectangle at the column (447.8 – 754.0); the top edge is broken for the centred label `<보 기>`
  (two segments of 130.7 with a 44.8 gap, label baseline ≈ 4 below the edge). Text inset 8.6 with the same
  first-line indent and pitch as passages; bullet `◦` items hang the same way as choices.
- Marked phrases: a **box** (hairline, ≈ 1 pt padding, from baseline −0.975 em to +0.22 em) for terms the
  question refers to (`단순 관점`, `연대 보증인`); an **underline** (hairline at baseline +0.2 em) for `않는`,
  `적절하지 않은`, and ⓐ–ⓔ / ㉠–㉤ targets.
- Bracketed choice pairs (국어 13번): `①` then a `[`-shaped bracket of hairlines grouping two lines `ⓐ:` / `ⓑ:`.

### 수식 (math)

- Fractions: numerator and denominator are separate lines centred on a bar; the bar is a hairline of 0.04 em
  (0.44 at 11.04) at **0.604 em above the fraction's baseline** (the bar glyph is stretched horizontally only).
- Superscripts / subscripts at 7.44, raised ≈ 3.1–3.8 or lowered ≈ 0.7 from the baseline.
- Radicals: `√` glyph plus a hairline vinculum over the radicand; piecewise functions use ⎧ ⎨ ⎩ pieces stacked
  at the brace's x.
- Diagrams: hairline geometry (≈ 0.5–0.9), point labels in upright roman, axis/variable labels italic, shaded
  regions a flat light gray, hidden edges dashed, spheres with a soft radial gray.

## Implementation

- `paper/`: the sheet renderer. One page per screen: each 842 × 1191 sheet is scaled to fit inside the viewport,
  centred on white; pages are full-screen snap points, a touch swipe snaps to the next page and a wheel or
  trackpad gesture turns exactly one page (`fitter.tsx`). Pinch zoom is left to the browser.
- Text is live DOM. Each line is positioned at its PDF baseline; inside it, every run (a word with its trailing
  space, or a stretch of one face/size/mark) is an inline-block given exactly its printed advance, and its glyphs
  are spread by letter-spacing to their printed ink width, leaving the rest to the space (`fit.ts`). That
  reproduces HWP's even glyph spacing with substitute fonts and keeps punctuation-width differences from drifting
  along the line. Display faces (디나루, 견고딕, area title, overprinted headings) are fitted by `scaleX` instead.
  Boxed and underlined phrases are run marks.
- Rules, boxes, rounded boxes (polylines in the PDF) and the page-number diagonal are divs. Diagrams use
  `paper/draw.tsx` (segments, sampled curves, ellipses, clip-path areas, labels); figure text that must fill a
  printed width uses `FitText`. Only drawn pictures (illustrations, the pouch) are images, cropped without text.
- Fonts are self-hosted subsets in `paper/fonts` (OFL: Nanum Myeongjo, Noto Sans KR, Noto Serif KR jamo for
  옛한글; GUST: Latin Modern). `next/font/google` failed under Turbopack for Nanum Myeongjo's Korean slices.
- Data: `korean-2026/pages.json`, `math-2026/pages.json`, built by `extract/extract.py <pdf> <out.json> 1 20` and
  `extract/build.py <out.json> <pages.json> extract/<area>-2026.json`. The extractor reads the PDF text trace,
  drops anything under the white cover rectangle (paint order), keeps one copy of overprinted glyphs, groups
  glyphs by column and baseline, splits runs at words and at face/size/mark changes, merges collinear rules,
  turns short vertical pairs and hugging underlines into run marks, maps HWP private-use 옛한글 (코ᇰ, ᄣᅢ,
  어버ᅀᅵ, ᄀᆞᄃᆞᆨ, 『』) and HyhwpEQ glyph ids (no ToUnicode in the PDF; read from the embedded font) to Unicode, and
  turns the HyhwpEQ fraction-bar glyph into a rule. It stops on any unknown face or unmapped glyph.
- Verification: overlay the PDF render on the sheet with `mix-blend-mode: difference`; matched ink goes black.
  Body text, choices, indents, marks and fractions coincide; remaining differences are the substitute glyph
  shapes and hand-measured diagram labels.

## /1 — mobile reader (2026-11-16)

`/mobile/suneung/1`, code in `components/mobile/suneung/1/`. Baseline: `suneung/math`, kept unchanged as the archive
of the printed booklet. Changed variable: the reading unit, from a whole two-column sheet to one question per screen
set as live text that reflows to the screen.

- Questions 1–22 (공통, pages 1–8) and 23–30 (미적분, pages 13–16), transcribed into `booklet.ts`; equations use the
  small typesetter in `math.tsx` (fractions, roots, Σ/∫/lim with limits, cases, boxed blanks), set in the booklet's
  Latin Modern with italic variables and upright digits, capitals and function names.
- Each question is one page of the mobile booklet (`chrome.ts`): the paper's own header, exactly as laid out and
  scaled as one piece to the measure, renumbered for the question — the cover header on 1 and 23 (미적분), the
  running header elsewhere, mirrored by parity as on paper (odd: 홀수형 box left, number right; even: number left,
  box right). Display faces keep their own proportions (HWP 장평 only) and are centred on their printed span,
  never stretched to it; 수학 영역 + (미적분) centre as one group. The foot carries the printed page-number box at
  body scale reading `n/30`. The reader scrolls vertically only.
- The question grammar in em: number, stem at 1.665 em, continuation at 1.03 em; ①–⑤ one per line; hairline
  boxes, `<보 기>` breaking the top edge, ㄱ/∙/(가) hanging items; figures at body scale. No 5지선다형/단답형 labels.
  `[n점]` never breaks from the line before it.
- Scroll snaps question by question; a question taller than the screen (14, 20 at 390 × 639) scrolls within its
  screen. A display equation wider than the measure shrinks to fit.
- Known gaps: `≤ ≥` fall back to a non-Latin-Modern face (not in the subset); Σ is smaller than the paper's.
- `math-2026/solutions.json` holds authored solutions and playback timing for these 30 questions; `/2` plays them.

## /2 — solutions at machine speed (2026-11-16)

`/mobile/suneung/2`, code in `components/mobile/suneung/2/` (a standalone copy of `/1`, plus `solution.tsx` and
`player.ts`). Baseline: `/1`. Changed variable: the booklet explains itself — each question's authored solution
(`math-2026/solutions.json`) is written out under it at the authored pace, lecture-board style.

- Steps are in the DOM from the start, in flow under the question with their text invisible, so nothing reflows
  while it is written and nothing is laid over the question or shrunk. One pen colour (#1846d6, 노토 산스 500).
- Pace (`player.ts`): twice the authored pace. Each step still ends on its authored time, but every character's
  share of it is random — a slow drift of the hand's speed, a speed of its own per word, jitter per stroke, a look
  at the line before it starts, rests after punctuation and between words, a few stops to think.
- Writing never leaves the screen. A solution that starts below the fold is turned to before its clock starts; when
  the line being written would fall below the fold the reader turns down to it (the "second page").
- Ending: 0.5 s after the last character the reader goes back up — to the answer choice first if it does not show
  from the top of the question — and marks it with a drawn pen loop (short answers: the boxed `답 n` at the end of
  the solution); then at the top the marker circles the question number in red (#e8211a, the paper's "correct"
  mark). Two seconds later the reader turns to the next question, whose clock starts when the turn arrives.
- Whatever question the reader settles on, by a turn or a person's scroll, starts its solution from the beginning.
  A person who scrolled in the last 1.5 s keeps the page: follow, return and turn all wait for them.
- Timing is authored, not measured (solutions.json `timing.source`: 157 s in all, the user's 2분 37초). Measured in
  the browser at 480 × 639 over a full run: the caret was inside the screen on every frame it was showing.
- No page-number box at the foot (removed 2026-11-16); the header alone numbers the question.
- Known gap: the 고딕 subset lacks super/subscript digits and Greek (Σ π θ β λ), which fall back to a system face.

## /3 — the swarm (2026-11-17)

`/mobile/suneung/3`, code in `components/mobile/suneung/3/` (a standalone copy of `/2`). Baseline: `/2`. Changed
variable: who works the paper — not a lecturer writing a solution under the question, but a swarm of agents as
multiplayer cursors, after Joel Califa's [Swarm](https://califa.github.io/swarm-site/) and
[swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors) (grammar only: neither has a licence, no code taken).
The aim: the exam reads as something machines dispatch in parallel, faster than reading, not a human domain.

- Invariants: the mobile booklet of `/1`–`/2` (header, question text, figures, choices), the blue pen loop on the
  answer and the red grade circle on the number, the page turns.
- Per question (`swarm.ts`): crosshairs box every equation and badge it with its linear form (`work.ts` `linear`), a
  figure with its printed size, then sweep it; I-beams type the solution's operations into the margin, several lines
  at once, with synthesized key clicks (`audio.ts`, after the first tap); all five choices are evaluated beside
  themselves at once, the four that are not the value struck; the swarm converges on the answer, the number is graded
  in red, and the swarm turns the page. Short answers end on the boxed `답`. Agents are scheduled greedily (each task
  to the active agent free first); harder questions bring more agents in from the sides (easy 6, mid 10, hard 14,
  killer 22, pool 24). One colour per agent; red is kept for grading.
- The margin is set in LaTeX's face: every operation (prose stripped from `solutions.json` steps) is converted to the
  booklet's math source (`work.ts` `mathSource`: scripts, roots, simple fractions) and typeset by `math.tsx` in Latin
  Modern, in its writer's colour, numbered in a mono gutter like code. Badges and the gutter are mono; the maths is
  LaTeX. Typing reveals each line by a clip at measured glyph edges, so it changes no layout.
- Computed, not authored: every choice value and the solution value are evaluated by `work.ts` (all 21 numeric choice
  sets match the official answers); question 1 evaluates its powers; question 7 draws both curves and refines a
  midpoint Riemann sum n = 4 → 256 (3.150000 → 3.199988 → 16/5); question 22 drops 24 candidate points on h(b),
  brackets the sign change, bisects to b = 1.750000 and recovers a·b = 441/16 by continued fractions → 457.
- Geometry: question 14's figure is constructed over the print (points from `math-2026/figures/p5-circles`) beside
  the margin line that uses each step — AC = 5, the radii AE = AG = 2, CE = 3, CG = 2√6, GE = √6, triangle CEG, its
  circumcircle, ∠HCG, GH.
- End: after question 30 the swarm fills the answer sheet (선택형 ①–⑤; 단답형 by 백·십·일 digit), writes `100점` and
  the measured time against the 100 minutes, fires one confetti burst (`confetti.ts`, 2D canvas, 140 pieces, < 3 s)
  and leaves off the sides. The sheet is a schematic of an OMR card, not checked against a real one.
- Pace (user target: about two minutes in all): a question's computation gets 0.29 of its authored duration
  (0.6–2.4 s); hold after grading 0.75 s. Measured (Brave, reader narrowed to 390 px, from load): question 30 graded
  at 114.2 s, sheet written at 1 분 57 초. (Performance below was measured at the faster 1 분 25 초 pace.)
- Performance: a frame reads first and writes after; geometry is measured once per task and kept in scroll
  coordinates, scroll and box come from events, typing is a clip, unmoved cursors are not written, and the loop sleeps
  when nothing moves. Script per frame over a full run (5 563 frames): mean 0.18 ms, p95 0.50, p99 1.30, max 3.6
  (before: mean 0.49, p95 1.20, p99 1.70 over 1 500 frames). One 20.8 ms frame in an earlier run did not reproduce.
- Long questions: the follow-scroll uses the real scroll position once a smooth scroll has had time to land, scroll
  snapping is off while a question taller than the screen plays, and only scrolling (wheel, touchmove, keys), not a
  tap, takes the page from the player — so the line being written stays on screen (reported on 28).
- Known gaps: marks placed on a question do not follow a resize until the next question; sound starts only after the
  first tap. A 서울대 mark at the end was asked for, then dropped.

## /4 — the cell (2026-11-17)

`/mobile/suneung/4`, code in `components/mobile/suneung/4/` (a standalone copy of `/3` without the cursors). Baseline:
`/3`. Changed variable: the agent's presence — no cursors; the work is code. Under each question a cell of
JavaScript is streamed in, run, and checks the choices; the user's direction was "more computational, more like
coding".

- `program.ts` writes each question's cell: a header comment (topic, points), `const given = [...]` with the linear
  form of every equation the question prints (each one is underlined in the question as its line streams), the
  solution's operations as comments set in LaTeX (Latin Modern, up to 7), the value as JavaScript (`jsOf` turns
  `√3(3+8ln2)/16` into `Math.sqrt(3) * (3 + 8 * Math.log(2)) / 16`), the choices, `hit`, `answer`. Questions 1, 2, 7,
  14, 16, 17, 22, 23 are solved by their code (powers, a difference quotient, a 10⁵-term Riemann sum, the triangle
  by `Math.hypot` and the cosine law, a recurrence, F(2), bisection with a search for the denominator, tan 6x / 2x
  at 10⁻⁹). The cell is run when the page is built; every printed `// → …` is its actual value (`0.9999999999999999`
  for question 1 included), and the build stops if a cell's answer is not the official one (all 30 pass).
- `runner.ts` plays it: lines stream in token-sized bursts (1–5 glyphs at an uneven pace, a key click each), then a
  marker runs the code line by line and outputs appear; lines that draw — the curves and Riemann rectangles of 7, the
  curve and scan of 22, the construction of 14 (each statement draws its segment, angle, triangle or circumcircle on
  the printed figure) — first glide the page up to the figure. The last line prints the cell's run time measured in
  this browser (mean of repeated runs). Each choice then gets `true` / `false`, the false ones are struck, the
  answer circled, the number graded red. The sheet is filled by `answers.forEach(mark)`, then the score, the time,
  and the confetti.
- The page glides on its own eased scroll (260 ms within a question, 300 ms to the next) with snapping off while it
  moves; streaming and the run advance by time, several lines a frame when due.
- Pace (user target: about two minutes in all): streaming 2.4 ms per character, run 26 ms per line, hold after grading
  0.8 s. Measured (Brave, reader narrowed to 390 px, from load): question 30 graded at 118.9 s, sheet written at
  2 분 1 초. Script per frame (at the earlier 1 분 2 초 pace, 3 762 frames, first 5 excluded): mean 0.21 ms, p95 1.10,
  p99 1.60, max 5.8; the first frame after load takes ~31 ms (initial layout).
- Known gaps: while the page shows a figure being drawn, the outputs printed below it are off screen.
