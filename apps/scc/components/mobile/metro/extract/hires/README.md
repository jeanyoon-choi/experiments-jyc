# metro/2 extraction, second pass: the 7089-px original

Rebuilds `../../2/model/official.json` from 서울시's full-size map image. The
first pass ([`../official`](../official/README.md)) read the 2555-px web
edition and left most ordinary stations off their dots, several line paths on
a neighbouring line, and every name set in the wrong size with tracking. This
pass keeps that file's topology and interchange matching and re-reads the rest.

Sources (2026-11-16), fetched into a scratch folder — not committed:

- `ref/orig.jpg`: `https://news.seoul.go.kr/culture/files/2023/12/202603030941470009.jpg`
  (7089 × 7102; one map unit = 7089 / 2555 of its pixels).
- `fontsrc/SeoulAlrim-{Medium,Bold,ExtraBold}.otf` from `seoul_font3.zip`
  ([서울서체](https://www.seoul.go.kr/seoul/font.do), 공공누리 제1유형).
- `official.json`: the current model (any earlier version works as input).

Run from the scratch folder, with a venv holding `pillow numpy scipy
scikit-image fonttools brotli` (run with `-I`; scripts take the folder as
`argv[1]` where they import each other):

1. `dots.py` — white station dots: small round white blobs ringed by a line colour.
2. `pathcheck.py` — `printed.json`: each line's colour as printed (median along its path).
3. `cls.py` — every pixel classed to a printed line colour; every capsule disc
   (a round blob of one line's colour inside a white, then dark, ring).
4. `rebuild.py` — interchange discs snapped to the detected ones; the seven
   single-line stations the map rings (구로, 금천구청, 병점, 성수, 강동, 문산, 가좌)
   given one disc; each chain between anchors traced over its own colour
   (minimum-cost path, cheapest along the stroke's centre), the part under the
   capsules dropped, cleaned to the map's grammar with `clean_lib.py` (from
   the first pass's `build.py`, runs no longer pinned to disc centres) and
   ended at the foot of each anchor on the line; ordinary stations set on the
   dots along the chain, in order → `geo.json`.
5. `labels.py` — every name row matched in 서울알림체 by normalised
   cross-correlation against the map's dark ink: Korean in one or two lines,
   bracketed second names, English in one to three lines, each row on its
   own; long English placed word by word where the map's word spacing differs
   from the font's; two names claiming one place resolved by a second look.
   `overrides.json` holds what had to be read by eye: the map's own English
   forms and line breaks, three second names, two renamed stations.
6. `ground.py` — Seoul's white field and the water as even-odd outlines.
7. `assemble.py` — `new.json` (copy to `official.json`); subset the fonts to
   the characters of all rows and badges as in `../official/subset.py`.

Measured typography: interchange names ExtraBold 14.6 units, their English
Bold 10.0; other names Bold 12.7, English Bold 6.9; second names Bold 5.5–7;
no tracking anywhere.

Checks: `tiles.py <dir> new.json` draws the model beside the original in 36
tiles (`render.py` is an offline twin of the app's drawing); the low-score
lists printed by `labels.py` name what to look at.
