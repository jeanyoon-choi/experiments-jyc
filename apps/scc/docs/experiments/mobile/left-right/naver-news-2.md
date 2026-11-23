# left-right / naver-news / 2

`/mobile/left-right/naver-news/2` (2026-11-23). Experimental. [naver-news/1](naver-news.md) copied (not imported) and changed by request: the further the mobile leans, the further out the news stands; the article body is larger and longer; the section tabs can be chosen; and no service is named on screen. /1 is kept as the baseline.

## Why /1 did not get more extreme with the angle

In /1 the tier came only from a per-side heat that rose 0.2 a second while the mobile leaned (온건 below 0.9, 강경 below 1.9, 극단 above). The angle set only how fast rows arrived. So at any angle the first 4.5 s were 온건 and 극단 took 9.5 s, and the hardest pieces were reports of rallies. Leaning further made the list faster, not harder.

## What changed

- **The angle sets the tier** (`feed/feed.ts`): `reach = |lean| · 4.2 + hold`, `tier = ⌊reach⌋`. The roll is read with an 8° dead zone and 78° as full tilt (4° and 32° at first; widened 2.5 times by request the same day, as the tiers came too soon). From level: 온건 to about 25°, 강경 to 41°, 극단 to 58°, 선동 to 75°, 광란 from there. Easing back brings the milder pieces again. `hold` gains 0.1/s · |lean| on the side leaned to, never more than the lean itself, and loses 0.5/s above it: a mobile held still drifts one step further out and no more.
- **Two tiers past 극단** (`feed/extreme.ts`): 선동 and 광란 are not written per story. One set of frames per side (enemy-naming, a hidden hand, a purity test for one's own side, an order to share and gather) is filled with the story's name, so every story is told the same way. The readout names the camp 극좌 / 극우 from 선동 on.
- **Headline and body grow with the tier** (`news/news.module.css`): list titles 16 px regular to 20 px black at weight 900; article titles 28 to 38 px; article body 21 px (17 px in /1) to 26 px at weight 800. The ground tint reaches 46% of the party colour (34% in /1).
- **Longer bodies** (`feed/articles.ts`): a straight report is the fact, both sides' mildest readings in turn and a close (6 paragraphs); a sided piece 4 to 6; 선동 8, with the fact left as "what the press only said"; 광란 7, with no fact at all.
- **An open article does not change**: it stays the piece that was tapped, whatever the mobile does after. Only the headline rows under it keep turning with the tilt (by request, 2026-11-23; a first version turned the open article too).
- **Sound** (`news/sound.ts`, synthesised interface tones, after the first tap or key): a blip for each piece arriving, higher, louder and harsher with the tier (pieces under 90 ms apart share one); and one alert for each step further out, never on the way back: 강경 a push-alert ding, 극단 two, 선동 the three rising notes of a 속보, 광란 the two-tone buzz of an emergency alert, each under a second.
- **Section tabs**: 정치, 경제, 사회, 생활/문화, IT/과학, 세계 each open their own list. The 20 stories of /1 are filed by section (some under two); six were added: KBS 사장 교체, 평등법 발의, 종묘 앞 재개발 ([sources](naver-news-2-culture-sources.md)) and 원전 공론화, 쿠팡 과징금, 반도체 주52시간 예외 ([sources](naver-news-2-tech-sources.md)). 26 stories, 160 pieces each, 4,160 in all.
- **No service named**: the mark, the name in labels and the brand green are gone; the header is the word 뉴스. Layout measures are carried over from /1. The route keeps its name.
- **Pace**: rows arrive at `25 · |lean|^1.5` a second (60 in /1). It was 10 at first; raised 2.5 times by request when the angles were widened, so the same angle brings rows about as fast as before.
- Photographs are /1's public set plus 17 for the new stories, in the same folder and `license.txt`.

The kakao-talk [content boundary](kakao-talk/README.md#content-boundary) holds: no calls to violence, no doxxing, no ethnic or gender slurs, no invented numbers.

## Checked

Headless, 2026-11-23 (seeded feed, 2 s at each lean): 0.15 → 온건, 0.3 → 강경, 0.5 → 극단, 0.75 → 선동, 1.0 → 광란; eased to 0.2 → 강경; every tab fills 22 rows and turns wholly to the leaned side at full tilt, with no repeat among the top 14 rows.

Browser, 2026-11-23, 400 px wide, tilt sent as synthetic `deviceorientation` events:
- 14°: readout "◀ 진보 · 강경", rows [시론] and [사설] pieces; 33°: "◀ 극좌 · 광란", rows in 20 px black type from 선동 outlets.
- IT/과학 tab opened its own level list; a row opened as an article.

Not checked:
- A mobile with a real gyroscope, the iOS motion popup, and how the tier boundaries feel in the hand.
- The sounds by ear: the automation tab cannot be listened to.
- Frame timing: the automation tab is hidden, so paint cannot be measured there.
- The new stories' facts date from 2026-11-23; two say "24일" of events not yet held.
