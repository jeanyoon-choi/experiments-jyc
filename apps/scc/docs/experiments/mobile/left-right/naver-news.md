# left-right / naver-news / 1

`/mobile/left-right/naver-news/1` (2026-11-16). Experimental. A clone of Naver News's mobile 정치 section whose headlines turn with the mobile: rolled left, the rows turn over one by one into 진보 readings of the news; rolled right, into 보수 readings. Any row opens as an article page. It is the second member of [left-right](README.md), after [kakao-talk/1](kakao-talk/README.md), from which the tilt input, the heat and the one-line readout are copied (not imported).

## Tested relation

The same dozen stories, read three ways. The baseline is the level screen: straight reports of each story. The changed variable is the roll of the mobile; the invariant is the interface, which stays Naver's.

## Mechanism

- **Input** (`index.tsx`). As in kakao-talk/1: `deviceorientation` roll, 4° dead zone, 32° full tilt, a tap-anywhere popup for iOS motion access, ← / → on a desktop.
- **Feed** (`feed/feed.ts`). The screen is a fixed set of rows: 10 headlines, then the latest list (12 rows, 10 more each time the end is reached, up to 56).
  - Level, nothing moves. Leaned, rows turn over in place at `5 · |lean|^1.3` rows per second: rows of no side or of the other side first, so the whole screen comes to read one way and the other side leaves it. A turned row fades in (0.42 s) and its time reads "1분전" in blue.
  - Nothing is inserted above the reader, so the page never jumps while it is being read.
  - Heat per side as in kakao-talk (0.2/s · |lean| up, 0.08/s down; 온건 below 0.9, 강경 below 1.9, 극단 above). The tier decides what a turned row may become: 온건 a report with a lean, 강경 a 사설 or 칼럼, 극단 the grammar of fandom media ([단독], [영상], [현장]). Rows already on the side turn again as the tier climbs, mildest first.
  - No article appears twice on screen; pieces come round least recently shown first.
- **Content** (`feed/topics.ts`, `feed/headlines.ts`, `feed/articles.ts`). Twelve stories of autumn 2026 from the verified timeline in [kakao-talk's research](kakao-talk/research-timeline.md) (Part A): the 내란 항소심, 사법개혁 3법, the 조작기소 특검법, 부동산, the 지방선거 and 투표용지, 국민의힘, 무비자, the economy, 호르무즈, the 갤럽 poll, 검찰청 폐지 and the 관세 합의.
  - Per story: 2 straight reports, and 2 pieces per side per tier. 168 articles in all, 72 a side.
  - An article page shows the story's verified `fact` and, for a piece with a side, that side's reading at its tier (`feed/body.ts`). The level screen's reports are the fact alone.
  - Outlets and reporters are invented names; whether any coincides with a real outlet has not been checked. Real politicians appear only as each side names them. The kakao-talk content boundary holds: no calls to violence, no slurs, no numbers the timeline does not carry.
- **Photographs.** 32 photographs from Wikimedia Commons (국회, 헌법재판소, 대법원, rallies of both sides, apartments, polling places, 한국거래소, 문무대왕함, 명동), resized to 640 px wide: 1.6 MB in all. Sources and licences are in [`public/images/left-right/naver-news/license.txt`](../../../../public/images/left-right/naver-news/license.txt). Captions say what each photograph shows, with 자료사진 where it predates the story.

## Interface

Values come from the live site's own stylesheet (`static-nnews.pstatic.net/css/min/20261112/news.css`) and markup, read on 2026-11-16 with a mobile user agent:
- service bar 52 px, section tabs 46 px (17 px, active tab #406cdc with a 2 px underline);
- list rows: 110 × 75 thumbnail on the left, 16/21 px title clamped to two lines (#303038), 14 px outlet line (#767678), comment count, the blue cluster pill on headlines and "N분전" (blue under an hour) on the latest list; sections divided by an 8 px #eff1f6 band;
- article page: outlet row with 구독, 28/36 px headline, reporter and 입력 time at 13 px, tools row, full-bleed photograph with a 15 px caption, body 17 px at 1.56.

Naver's sprite images (the N mark, the 뉴스 wordmark, tool icons) are not copied; they are redrawn as SVG or set as text. The N mark or 뉴스 on an article page returns to the list, as does the browser's back button.

## Checked

Headless, 2026-11-16: 22 rows at start, none of a side; level for 5 s, no row turned; full left, 14 of 22 rows on the left after 3 s, all 22 after 8 s, all at 극단 after 20 s; then full right over 42 rows, none of the left remaining after 14 s; no duplicate on screen at any point.

Browser, 2026-11-16, desktop with held arrow keys, the stage held to 390 px wide:
- Level: 정치 tab active, ten headline rows with thumbnails, outlet, comment count and cluster pill.
- ← held: after 7 s the readout read "◀ 진보 · 강경" and the rows had turned to [칼럼] and [사설] pieces; after 16 s "극단", with [단독] and [현장] pieces from 촛불라이브 and 밭갈이뉴스.
- → held 9 s: the latest list read [사설] and [칼럼] pieces from 나라일보 and 정론타임즈, each "1분전" in blue.
- A row opened its article page (outlet with 구독, headline, reporter and time, photograph with caption, body, 정치 헤드라인 below); the browser's back returned to the list.
- Frame timing over 4 s while rows turned: 240 frames, median 16.7 ms, 95th percentile 17.3 ms, max 17.7 ms, none over 33 ms.

Not yet checked:
- A mobile with a real gyroscope, and the iOS motion popup.
- A side-by-side comparison with a rendering of naver.com: the automation browser cannot open it, so the clone follows Naver's stylesheet and markup, not a screenshot.
