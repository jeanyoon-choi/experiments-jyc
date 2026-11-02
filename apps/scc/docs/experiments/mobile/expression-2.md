# Expression /2 — face-reading KakaoTalk

2026-11-02. Experimental. `/mobile/expression/2` is a KakaoTalk clone in which every chat room reads the participant's face through the front camera and remarks on it in real time. It stages Korean 눈치 culture as a surveillance society: people over-read one another's expressions, a held neutral face counts as an expression, a smile is suspected of being a mask, and looks are graded constantly. The camera is never shown; the participant learns they are being watched only from the messages. Sensing is [`/1`](expression.md)'s `reader.ts` and `assets.ts`, copied (not imported) into `2/sensing/`.

## Structure

- `sensing/`: copies of /1. Face Landmarker at most every 50 ms on a 640-wide frame; neutral calibration over the first 30 face frames.
- `director/triggers.ts`: /1 readings → 19 situations (smile, fake smile = mouth without eyes, laugh, blank, frown, angry, sad, disgust, smirk, surprise, tilt, turn, down, eyes shut, nervous blinking, too close, cute act, talking, face gone) and the measures messages quote (smile seconds, tilt/turn degrees, blinks per minute, asymmetry, face share of frame).
- `director/rooms.ts`: 26 rooms (12 groups, 14 DMs), fictional people, pravatar portraits reused from `face-voronoi`. Each room has a register (반말/존댓말), a base rate, a sensitivity per situation, and a looks weight.
- `director/script.ts`: generic lines per register × situation × three pressure tiers; per-relation voices (mom, boss, partner, ex, plastic-surgery counsellor, PT, company notices, anonymous 얼평 open chat and others); fragment spam; group pile-ons; read-without-reply complaints; replies that set the participant's typed words against the face; looks remarks in three tiers.
- `director/director.ts`: each room is a Poisson source, rate = `base/60 + 0.06 · drive · (1 + 0.9 · pressure)` per second, where `drive = Σ sensitivity · level · HEAT`. HEAT per situation is 0.15 for blank and talking, 0.5 for smile, 0.65 for tilt, 1 for fake smile and closeness, and 1.8 for anger. When a situation crosses 0.5, a burst reaches 1–6 of the most sensitive rooms within 0.2–1.5 s. Pressure (0–3) rises at `0.35 · drive − 0.1` per second. It sets the tier, and above 2.2 one message in three becomes fragment spam ("??", "야", "읽씹?"). Groups pile on with probability `0.3 + 0.15 · pressure`. Global cap: 7 messages per second.
- `director/chat.ts`: local store (160 messages per room), unread counts, list order (pinned, then latest). The participant's own messages carry KakaoTalk's yellow unread count, and readers catch up quickly; in groups about 4% never read.
- `kakao/`: the clone, chat tab only (no bottom tab bar or friends tab, by request).
  - The list has the header (검색 · 새로운 채팅 · 설정), grey folder chips (전체 with a red total, 안읽음, 업무), 46 px squircle profiles, group mosaics, member counts, pin and mute marks, one-line previews and red badges (grey when muted).
  - Rooms copy the iOS 26 captures: blue-grey ground (#B6C9DA), floating glass back button and search/menu pill around a centred title, pill bubbles without tails (white and #FEE500), sender name and avatar at each run start, time on the last bubble of a minute, a plain date line, a scrolled-up preview, and a floating capsule composer (+, 메시지 입력, emoticon, #, yellow send).
  - Navigation is a UIKit push and pop: the room slides in over 0.34 s, and the list slides 30% left and dims. Other rooms arrive as a glass banner under the room header for 2.2 s.
  - The open room watches hardest: double drive, triple base rate, and first in every burst.
- `?sim`: hold keys to act out situations without a camera (1 smile, 2 fake, 3 laugh, 4 blank, 5 frown, 6 angry, 7 sad, 8 disgust, 9 smirk, 0 surprise, q tilt, w turn, e down, r shut, t nervous, y close, u cute, i talk, o gone).

## Reference

KakaoTalk's September 2025 redesign turned the friends tab into a feed grid; after the backlash, the list returned in December 2025 ([뉴시스](https://www.newsis.com/view/NISX20251216_0003442706), [디지털데일리](https://www.ddaily.co.kr/page/view/2025092916304365220)). The tab order 친구 · 채팅 · 지금 · 쇼핑 · 더보기 follows that redesign. Chat ground #B2C7DA and yellow #FEE500 are from a third-party design-system gallery ([oppadu](https://www.oppadu.com/tools/design-systems-site/brand/kakao.html)), not a measured capture. On 2026-11-02 the room and list grammar were re-read from the current App Store screenshots (iOS 26 glass header, capsule composer, tail-less bubbles, chip style in 지금/오픈채팅). The 채팅 tab's own chip labels and the exact icon drawings are still inferred.

## Content boundary

The looks remarks are deliberately extreme (by request: 극한까지): weight, jaw, nose, eyes, skin, 성형 quotes, scores and percentiles. They exclude race, disability, sexual content and incitement to self-harm.

## Measured

A headless run (all rooms, one situation held at full level for 30 s, cap 7/s) gave these messages per second, first 3 s → seconds 10–30:

| Situation | Messages/s |
| --- | --- |
| Nothing | 0 → 0.3 |
| Blank, shut, talk | 1.7–2.3 → 0.3 |
| Smile | 2.0 → 0.8 |
| Tilt / turn | 2.7–3.0 → about 1.0 |
| Laugh | 4.0 → 2.8 |
| Close | 4.7 → 3.6 |
| Fake smile | 2.3 → 5.8 |
| Frown, smirk, angry, disgust, gone | 4.3–5.3 → 5.7–6.5 |

`pnpm typecheck` and scoped eslint pass.

## Browser check (2026-11-02)

Checked in Chrome at 390 px wide in `?sim`. The first version broke every button's padding: a global `.app button` reset outranked the class styles. The reset now uses `:where()`. After the fix:
- The list matches the reference grammar.
- Room header, bubbles and composer match the capture.
- Holding frown (5) in a group room produced eight messages in six seconds, with pile-ons ("ㅇㅈ", "ㄹㅇ 매번 저럼") and a looks remark.
- Back runs the pop animation.

Not yet checked:
- Not tested on a phone or with a real face.
- The director pauses while the page is hidden.
