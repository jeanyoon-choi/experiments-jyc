# metro/2 extraction: the published 2026 map

Rebuilds `../../2/model/official.json` by reading 서울시's published 서울 지하철
노선도 over `../../1/model/network.json`'s topology, and subsets 서울알림체 into
`../../2/fonts`. Sources are not committed; fetch them into a scratch folder
`ref/` and run every step from that folder's parent with a Python venv holding
`pymupdf pillow numpy scipy scikit-image fonttools brotli` (run with `-I`).

Sources (2026-11-09):

- Map: `202603030941470009-scaled.jpg` (2555 × 2560, the 2026-03 edition) from
  [news.seoul.go.kr/culture/archives/522224](https://news.seoul.go.kr/culture/archives/522224).
  The 7089-px original exists but the server dropped every download.
- Line colours: that page's "노선별 색상값" PDF (`colors.pdf`).
- Typeface: 서울알림체 from [서울서체](https://www.seoul.go.kr/seoul/font.do)
  (`seoul_font3.zip`, OTF Medium/Bold/ExtraBold into `font/alrim/`), 공공누리 제1유형.

Steps (outputs go to `ex/`; copy these scripts there):

1. `palette.py` — official sRGB per line from the PDF; `legend.py` — the same
   lines as printed, sampled from the map's legend.
2. `detect.py <map> 1` — every pixel classed to a line colour; white station dots.
3. `discs.py <map> 1` — interchange discs, grouped into capsules.
4. `node ours.mjs <network.json> ex/ours.json` — /1's topology.
5. `match2.py` — interchanges to capsules: line sets that occur once anchor a
   thin-plate spline; the rest match by position and line set.
6. `build.py` — places what the matcher could not from `manual_names.json`
   (coordinates read off the map: termini, branch stations, crowded
   interchanges), finds one disc per line, traces each line between placed
   stations over its own colour (other stations' capsules blocked, badges
   passable), cleans each trace to the map's grammar (2호선 as the fitted
   circle; elsewhere 0/45/90° runs, offset parallel runs merged, 14-unit
   rounded corners) and sets ordinary stations at the white dots along it.
   도라산 is dropped: the map ends 경의·중앙선 at 임진강.
7. `labels.py` — each Korean and English name rendered in 서울알림체 and
   matched against the map's ink near its station, over size, tracking and
   two-line breaks; the match gives each name's pen origin, size and tracking.
   English follows the map's forms (`en.py`: Univ., 3(sam)-ga).
8. `ground.py` — Seoul's white field and the 한강 / sea as polygons.
9. `assemble.py <out>` — `official.json`; `subset.py names.json <fonts dir>`.

Checks: `preview.py official.json x0 y0 x1 y1 scale out.png` draws the data
beside the same crop of the map; `audit.py official.json` lists line pieces
off the 45° grid; `grid.py` crops the map with a coordinate grid for reading
positions by hand.
