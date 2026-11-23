# 대치동 전단지 /1 — /mobile/daechi/flyer/1

2026-11-23. Experimental. Route: [`/mobile/daechi/flyer/1`](../../../../app/mobile/daechi/flyer/[experiment]/page.tsx). Code: [`components/mobile/daechi/flyer/1/`](../../../../components/mobile/daechi/flyer/1/index.tsx).

Tested relation: whether the press-and-hold of [plastic dream /2](../plastic-dream.md) — one part changes for as long as it is held while a bill runs — carries from a face to a score. Baseline: plastic dream /2, whose board, type scale, colours, bill and zoom lock are copied (not imported). Changed variable: what is in the theatre and what is sold. A 수능 성적통지표 stands where the photographed face stood, there is no camera and no BEFORE inset (removed by request the same day), and the catalogue is cheating methods, sold by an academy named for the November 2026 exam scandals.

## What it answers

- On 2026-11-15 the 제63회 세무사 시험 수석 합격자 confessed that he had photographed the questions with a 초소형 카메라, sent them to an AI and read the answers on a smartphone ([한국경제](https://www.hankyung.com/article/202611156922i)); the camera was on a button ([뉴시스](https://mobile.newsis.com/view/NISX20261118_0003872792)). Four days earlier he had explained his 397.5 out of 400 with "찍는 것도 기술이라고 생각한다" ([주간경향](https://weekly.khan.co.kr/article/202611151009001/)).
- On 2026-11-17 the government answered for the 2027학년도 수능: a sticker over every button, glasses inspected every period, bags in the corridor, 위급재난문자 during the exam. The measures were mocked online with clothes covered in buttons ("수능 날 입으면 연행되는 옷") and with '내년 3월 용산 전자상가', an image of a camera shop under the banner 서울대 70명, 합격을 축하합니다! and a computer shop under 서울대 48명, 전과목 1등급 배출!; commenters wrote "대치동에 전자상가 생기겠네" ([데일리안](https://www.dailian.co.kr/news/view/1716436/), [서플](https://supple.kr/news/cmwlcueji5yb0jkuna6rqzhy9)).
- At the exam on 2026-11-19, 98 were caught with electronics by the end of the fourth period, five of them using a device: 스마트안경 in 충남, a 소형 카메라 with 무선이어폰 in 경기 during 수학, the paper photographed with a smartphone in 서울, smartphones in the toilet in 서울 and 경기 ([한국일보](https://www.hankookilbo.com/news/article/A2026111913560005004), [파이낸셜뉴스](https://www.fnnews.com/news/202611191904419396)). Reports are issued on 2026-12-11.

The flyer is that banner moved to 대치동: an academy that sells the devices. Its name and slogan are the user's (2026-11-23): AI딸깍입시학원, AI 잘 사용하는 것도 실력입니다.

## Screen

The same board as plastic dream /2: full width, 1 em = 1/39 of the width (held to 64% of the height), pure white with red `#e60012`, Line 3 orange `#ef7c1c`, yellow `#ffe600` and black.

- Head: a strip in yellow `#ffb300` with black type and the 수인분당 badge, and 한티역. Yellow is the line's guide colour ([itwiki](https://itwiki.kr/w/%EC%88%98%EB%8F%84%EA%B6%8C_%EC%A0%84%EC%B2%A0_%EC%88%98%EC%9D%B8%C2%B7%EB%B6%84%EB%8B%B9%EC%84%A0)); the hex is OpenStreetMap's tag for the line, not an operator's published value, chosen over the amber `#eea208` of [metro/3](../metro.md) because that read as the 3호선 orange it replaced ([한티역 is on 수인·분당선](https://ko.wikipedia.org/wiki/%ED%95%9C%ED%8B%B0%EC%97%AD); the first version stood at 대치역 on 3호선 and was moved by request) and a live `2028 수능 D-n`, the counter academy sites carry ([러셀](https://russel.megastudy.net/) showed 수능 D-360 on 2026-11-23, which puts the exam on 2027-11-18; counted in Korean time). The academy name AI딸깍입시학원, the slogan AI 잘 사용하는 것도 실력입니다 on yellow, three teaser prices, and the meme's banner, white with red corners. The banner first quoted the meme (서울대 70명, 합격을 축하합니다!); by request it now congratulates wherever the report in the theatre gets in, from real placement data (see Banner).
- Theatre: the report as a sheet of paper on black, as large as the theatre allows.
- Report ([`report.ts`](../../../../components/mobile/daechi/flyer/1/report.ts)): the form of a real report, read from a photograph of a [2022학년도 성적통지표](https://commons.wikimedia.org/wiki/File:2022_CSAT_report.jpg): the title, 수험번호 · 성 명 · 생년월일 · 성 별 · 출신고교 (반 또는 졸업년도), 영 역 with 한국사 · 국어 · 수학 · 영어 · 탐구 (two subjects) · 제2외국어/한문, the rows 선택과목 · 표준점수 · 백분위 · 등 급, cells struck corner to corner where an area prints only its 등급, the date and 한국교육과정평가원장 with a square red seal. It is headed 2027학년도 and dated 2026. 12. 11. Not carried over: the pale blue paper and watermark (the sheet is pure white) and the 유의사항 line. 홍길동, the birth date, 한국고등학교 (9) and the subjects are invented fill; the 수험번호 is eight random digits.
- Devices ([`tools.tsx`](../../../../components/mobile/daechi/flyer/1/tools.tsx)): while a place is held, what it is bought with floats up and to the right of the finger, a quarter of the sheet across: glasses with a camera light and a line reading in the lens, a shirt button whose fifth hole is a lens, a smartwatch, an exam booklet being marked, a 수험표 whose photograph blinks. Up to three fingers each carry one. The pressed column is run over in yellow and every figure that has changed is red.
- Bill: a strip naming what is in use with its price per sitting and count; five catalogue rows and the consulting row with count and cost; 총 수강료 in red; fine print 개인에 따라 결과가 다를 수 있습니다 · 적발 시 성적 무효 (329 scores were voided after the [2005학년도 exam](https://hangyo.com/mobile/article.html?no=14842)).
- Consulting pop-ups ([`counsel.ts`](../../../../components/mobile/daechi/flyer/1/counsel.ts)): every 40 sittings bought (`EVERY`), the academy interrupts with 걸리지 않는 법 1:1 컨설팅, in the grammar of the pop-up [러셀](https://russel.megastudy.net/) opened with on 2026-11-23 (a count, the host, the title, one line, one button, a dark bar reading 오늘 하루 보지 않음 and 닫기). The pop-up takes the fingers off the report, so the climb stops. Six come up in order. Each has three lines:
  - a pitch in red, cheating in the language of an education-innovation brochure (invented copy, direction by the user): 4차 산업혁명의 혁신적 방식으로 수능을 봅니다; 자기주도 학습을 넘어, AI주도 학습으로; 미래형 인재는 외우지 않습니다. 연결합니다; 초연결 시대의 시험장은 교실 밖에 있습니다; 웨어러블 에듀테크로 완성하는 실전 감각; 디지털 대전환, 손으로 푸는 수험생만 남겨집니다;
  - a class name on yellow (단추 스티커 대비반, 안경 전수 점검 대비반, 위급재난문자 대비반, 신호 탐지 대비반, 소매·옷깃 검사 대비반, 화장실 동선 컨설팅);
  - the measure it answers, as reported and not a way round it: every button stickered; glasses laid on the desk before the first period and checked again each period; 위급재난문자 at 08:30, 14:21 and 14:57 that cannot be refused; Wi-Fi and Bluetooth detection supervisors; sleeves rolled and collars checked; a handheld scanner at the toilet ([데일리안](https://www.dailian.co.kr/news/view/1716436/), [한국일보](https://www.hankookilbo.com/news/article/A2026111913560005004), [파이낸셜뉴스](https://www.fnnews.com/news/202611191904419396)).
- 신청하기 leads to 신청하기: a press bills the tier on the button and the button becomes the next tier, with a line saying the last was taken and why that is not enough; the pop-up closes only by 닫기 or 오늘 하루 보지 않음 (which also ends the pop-ups for the visit). The tiers are fees reported for 대치·강남 admissions consulting, read by a research agent: 기본 80분 40만원 (a 시대인재 consultation) and VVIP 10시간 300만원 (the top of "10시간에 240만~300만원", [머니투데이](https://www.mt.co.kr/policy/2025/06/01/2025052812292111575)); 심화 1회 55만원 ([파이낸셜뉴스](https://www.fnnews.com/news/202609190704296502)); 프리미엄 10회 220만원 ([다음 뉴스](https://v.daum.net/v/20250911161046671)). The names 기본 · 심화 · 프리미엄 · VVIP and the upsell lines are invented. The last tier stays on the button for as long as it is pressed.

## Banner

[`admissions.ts`](../../../../components/mobile/daechi/flyer/1/admissions.ts). The banner prints the report's 국수탐 백분위 평균 (국어, 수학 and the mean of the two 탐구, from the figures printed on the sheet) and the universities listed at that average in [대치720's 2026학년도 정시 결과 백분위별 대학](https://daechi720.com/53/?bmode=view&idx=170406370) (2026-03-16), a 대치동 academy's table of where applicants at each average could apply. The 인문계열 column is used, the report's subjects being 확률과 통계 and 사회탐구:

| 백분위 평균 | Banner |
| --- | --- |
| 98 | 의예과 (the table's top row, "의예과 (최소)") |
| 97 · 96 | 서울대 상경 · 서울대 |
| 95 · 94 | 고려대·연세대 상경 · 고려대·연세대 |
| 93 · 92 | 서강대 상경·성균관대 · 서강대·한양대 |
| 90 | 중앙대·경희대·시립대 |
| 87 · 85 | 한국외대·건국대·동국대 · 국민대·숭실대·세종대 |
| 82 · 81 | 광운대·명지대 · 상명대·가천대 |
| 79 · 76 | 가톨릭대·경기대 · 충북대·강원대 (its 국립대 column) |

Under 76 the table has no row and the banner reads 지원 가능 대학 표에 없음. The table says of itself that it runs below 대학어디가's 70% cuts and allows for 교차지원; its ranges (90-91, 87-89, 85-87, 82-84) are entered by their floor. It is one academy's reading of one year, not an official cut, and real admission weighs areas differently by university.

## Contract

- A report is drawn on arrival: every area a whole 등급 from 5 to 8, different each visit. Nothing is entered, saved or sent.
- One position per column. Each column holds a continuous position `g` on the 등급 scale. 등급 is a stanine, nine bands half a standard deviation wide (cumulative 4, 11, 23, 40, 60, 77, 89, 96 %; [등급 비율](https://braindetox.kr/posts/csat_grade_cutoff_explained.html), a secondary source), so `z = (5 − g) / 2`, the printed 등급 is `g` rounded, 표준점수 is `100 + 20z` for 국어 and 수학 and `50 + 10z` for 탐구, and 백분위 is `100·Φ(z)`. These are the definitions, not a year's table.
- Everything is bought whole (by request; the first versions ran continuously and billed ×0.1 of a proxy sitter). One sitting is three tenths of a 등급 (`STEP`), three points of 표준점수 in 국어 and 수학. A version that bought a whole 등급 per step climbed too fast; one at a tenth was then found slow, and three tenths is the trial requested on 2026-11-23. A press buys one sitting at once; a held finger buys another after 0.25 s (`SLOW`), each wait 0.94 of the last (`QUICKEN`) down to 0.1 s (`FAST`): about one and a half 등급 in the first second, three 등급 a second at most. Lifting the finger stops it at once. Pressing the 수험번호 · 성 명 row lowers every column together. Several fingers hold several places at once. The 탐구 heading belongs to whichever subject is under the finger.
- A finger held on the report brings up no magnifier, selection or callout: `touchstart` is cancelled on the sheet (pointer events still drive the press), with `user-select` and `-webkit-touch-callout` off on everything in it, beside the zoom lock copied from plastic dream /2. The pop-up's buttons are outside the sheet.
- The status bar is the strip's yellow: `theme-color` is `#ffb300` and the strip's padding takes in `env(safe-area-inset-top)`.
- Nothing stops at 1등급. The same rule goes on printing: 0등급, −1등급, a 표준점수 past any paper's maximum, 백분위 fixed at 100.
- The bill charges each catalogue row its price once per sitting bought at any place it is sold, in whole counts (so about three times its price per 등급), plus the fee of every consulting tier booked.

## Prices

[`catalog.ts`](../../../../components/mobile/daechi/flyer/1/catalog.ts). Read on 2026-11-23 by a research agent that opened each page; the unit "per 등급" is the flyer's own, and which areas each method is sold at is the experiment's assignment. The list was cut to the button camera and AI glasses for an hour and restored by request.

| Row | Sold at | Won | Source |
| --- | --- | --- | --- |
| AI 안경 | 국어, 영어 | 690,000 | Ray-Ban Meta 2세대, Korean 권장 소비자 가격 "69만원부터" ([뉴시스](https://www.newsis.com/view/NISX20260519_0003635283)) |
| 커닝 세트 | 수학 | 110,000 | 단추 카메라, 보조배터리 and a rice-grain earpiece sold online at "총 11만원 선" ([주간경향](https://weekly.khan.co.kr/article/202611160744001)) |
| 스마트워치 | 한국사, 탐구 | 369,000 | Apple Watch SE 3, from ₩369,000 ([Apple](https://www.apple.com/kr/shop/buy-watch/apple-watch)). On the banned list; no smartwatch case was verified |
| 대리응시 | 제2외국어/한문 | 2,000,000 | TOPIK 대리응시, clients paid "약 200만~800만원"; the low end ([위키트리](https://www.wikitree.co.kr/articles/1147554)) |
| 대리시험 | 수험번호 · 성 명 | 6,200,000 | the 2004 수능 대리시험 in 광주, "6백20만원" ([경향신문](https://www.khan.co.kr/article/200411240904581)) |

## Outcome

Checked in the browser on 2026-11-23 through a 390×844 test frame, holding the 성 명 row for nine seconds from a report of 6, 8, 6, 5, 7, 6, 7: 5 sittings after one second, 20 after three, 70 after nine; the banner went from 백분위 평균 21, 지원 가능 대학 표에 없음, through 광운대·명지대 (84), 한국외대·건국대·동국대 (89), 서강대 상경·성균관대 (93) and 서울대 (97) to 의예과 (99), and the bill read 434,000,000 for 70 proxy sittings. Earlier the same day: the count unchanged 600 ms after release, a synthetic `touchstart` on the sheet cancelled, `theme-color` `#ffb300` served, the pop-up stopping the climb, and two presses of 신청하기 billing 400,000 and 550,000. Pressed by synthetic pointer events only: the magnifier, the status-bar colour and the notch padding are iOS behaviours that were not observed on a real mobile. The first version of the day sold its methods under an invented name at 대치역 and missed the scandal and its memes; the name, slogan, station, pop-ups, whole counts and banner above are the corrections.
