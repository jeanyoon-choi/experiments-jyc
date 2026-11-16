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
- `math-2026/solutions.json` holds authored solutions and playback timing for these 30 questions; nothing reads it yet.
