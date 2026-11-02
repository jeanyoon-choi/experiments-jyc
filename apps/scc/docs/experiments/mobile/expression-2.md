# Expression /2 — face-reading KakaoTalk

2026-11-02. Experimental. `/mobile/expression/2` is a KakaoTalk clone in which every chat room reads the participant's face through the front camera and remarks on it in real time. It stages Korean 눈치 culture as a surveillance society: people over-read one another's expressions, a held neutral face counts as an expression, a smile is suspected of being a mask, and looks are graded constantly. The camera is never shown; the participant learns they are being watched only from the messages. Sensing is [`/1`](expression.md)'s `reader.ts` and `assets.ts`, copied (not imported) into `2/sensing/`.

## Structure

- `sensing/`: copies of /1. Face Landmarker at most every 50 ms on a 640-wide frame; neutral calibration over the first 30 face frames.
- `director/triggers.ts`: /1 readings → 19 situations (smile, fake smile = mouth without eyes, laugh, blank, frown, angry, sad, disgust, smirk, surprise, tilt, turn, down, eyes shut, nervous blinking, too close, cute act, talking, face gone) and the measures messages quote (smile seconds, tilt/turn degrees, blinks per minute, asymmetry, face share of frame).
- `director/rooms.ts`: 26 rooms (12 groups, 14 DMs), fictional people, pravatar portraits reused from `face-voronoi`. Each room has a register (반말/존댓말), a base rate, a sensitivity per situation, and a looks weight.
- `director/script.ts`: generic lines per register × situation × three pressure tiers; per-relation voices (mom, boss, partner, ex, plastic-surgery counsellor, PT, company notices, anonymous 얼평 open chat and others); fragment spam; group pile-ons; read-without-reply complaints; replies that set the participant's typed words against the face; looks remarks in three tiers.
- `director/director.ts`: each room is a Poisson source, rate = `base/60 + 0.06 · drive · (1 + 0.9 · pressure)` per second, where `drive = Σ sensitivity · level · HEAT`. HEAT per situation is 0.15 for blank and talking, 0.5 for smile, 0.65 for tilt, 1 for fake smile and closeness, and 1.8 for anger. When a situation crosses 0.5, a burst reaches 1–6 of the most sensitive rooms within 0.2–1.5 s. Pressure (0–3) rises at `0.35 · drive − 0.1` per second. It sets the tier, and above 2.2 one message in three becomes fragment spam ("??", "야", "읽씹?"). Groups pile on with probability `0.3 + 0.15 · pressure`. Global cap: 7 messages per second.
- `director/chat.ts`: local store (160 messages per room), unread counts, list order (pinned, then latest). The participant's own messages carry KakaoTalk's yellow unread count, and readers catch up quickly; in groups about 4% never read.
- `kakao/`: the clone. Chat tab (header 검색 · 새로운 채팅 · 설정, folder chips 전체/안읽음/업무, rows with squircle profiles, group mosaics, member counts, pin and mute marks, two-line previews, red badges or grey when muted). Friends tab (my profile, friend list opening DMs). Five-icon tab bar with the total unread on 채팅; 지금, 쇼핑 and 더보기 are present but inert. Room: #B2C7DA ground, white/#FEE500 bubbles with a tail on the first of a run, sender name and avatar once per run, time on the last of a minute, date pill, preview bar when scrolled up, composer (+, field, emoticon, #, yellow send). Other rooms arrive as a top banner for 2.2 s.
- `?sim`: hold keys to act out situations without a camera (1 smile, 2 fake, 3 laugh, 4 blank, 5 frown, 6 angry, 7 sad, 8 disgust, 9 smirk, 0 surprise, q tilt, w turn, e down, r shut, t nervous, y close, u cute, i talk, o gone).

## Reference

KakaoTalk's September 2025 redesign turned the friends tab into a feed grid; after the backlash, the list returned in December 2025 ([뉴시스](https://www.newsis.com/view/NISX20251216_0003442706), [디지털데일리](https://www.ddaily.co.kr/page/view/2025092916304365220)). The tab order 친구 · 채팅 · 지금 · 쇼핑 · 더보기 follows that redesign. Chat ground #B2C7DA and yellow #FEE500 are from a third-party design-system gallery ([oppadu](https://www.oppadu.com/tools/design-systems-site/brand/kakao.html)), not a measured capture. Folder chip labels, icon drawings, type sizes and spacing are reconstructions not yet measured against a current App Store capture; that is the next fidelity pass.

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

## Not yet checked

- Not seen in a browser. On 2026-11-02 the connected automation browser rejected the localhost certificate.
- Not tested on a phone or with a real face.
- The director pauses while the page is hidden.
