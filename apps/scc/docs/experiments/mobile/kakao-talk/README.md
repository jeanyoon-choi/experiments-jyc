# KakaoTalk /1 — tilted politics

2026-11-09. Experimental. `/mobile/kakao-talk/1` is a KakaoTalk clone whose chat rooms drift into political talk as the phone rolls: left toward 진보·민주당 지지층, right toward 보수·국민의힘·윤어게인. Holding the lean pushes every room from 온건 through 강경 to 극단. People who disagree argue at first, then fall quiet, then leave the room. The UI started as a copy of [`expression/2`](../expression-2.md) (copied, not imported). The camera and face reading were removed the same day by request.

## Mechanism

- **Input** (`index.tsx`). The phone's roll (`deviceorientation` gamma, corrected for screen rotation) maps to a lean of −1 … +1.
  - Rolls under 4° count as level; 32° counts as fully tilted, before the OS rotates the screen.
  - iOS needs a tap: on touch devices a `기울기 켜기` sheet appears when `requestPermission` exists.
  - Desktop has no sheet: hold ← / →.
- **Speed** (`director/director.ts`) follows the tilt only: messages per second = `8 · |lean|^1.5`. That is 1/s at a quarter tilt, 2.8/s at half, 5.2/s at three quarters and 8/s at full.
  - A token bucket holds every delivery to that rate: lines, pile-ons, thread beats and departures. A slot is spent only when something is posted.
  - When nothing queued is due, a new political line is drawn at once from a room weighted by `politics^1.5`; the open room counts three times.
  - **Level means silence** (|lean| < 0.03). Nothing is posted, the queue is dropped, and no room appears or moves.
  - There is no small talk. A room appears only with its first political message, and replies to the participant come only while tilted.
- **Heat.** Each side has a heat from 0 to 3.
  - It rises at 0.2/s · |lean| toward the side the phone leans to, and falls at 0.08/s otherwise.
  - The tier is 온건 below 0.9, 강경 below 1.9, 극단 above. At full tilt that is about 4.5 s to 강경 and 9.5 s to 극단.
  - Swinging to the other side meets what is left of the first side's heat.
- **People**: 93 rooms, every member fictional. `director/rooms.ts` holds 20 written by hand; `director/more-rooms.ts` adds 73 room types (친척, 동창, 회사, 동네, 취미, 종교, 학부모, 군대, 오픈채팅, 1:1), each with a lean bias and spread, members drawn from a seeded generator. Every member has a lean (−2…+2) and a voice (elder, parent, young, office, anon).
  - Members on the favoured side speak most.
  - The other side pushes back at 온건, mutters at 강경, and at 극단 walks out ("○○님이 나갔습니다.").
  - People with no side ask for quiet, then leave too.
  - Members come back, invited by someone in the room, once the room swings back their way.
- **Open chats** have a home side, the majority.
  - Under the opposite tilt the lone plant speaks up and the majority shouts back in its own voice, then kicks the plant ("○○님을 내보냈습니다.").
  - A kicked outsider returns only when the phone is level and cool.
  - Kick talk (강퇴, 분탕 신고, entry checks) appears only in open chats.
- **Narrative** (`director/script.ts`). In groups, 40% of political turns start a scripted thread, 3–7 beats with roles A/B (favoured side), O (other side) and N (no side).
  - Threads follow the research's observed rhythm: a link or 장문, short agreement, a rebuttal, sarcasm, a plea for quiet, and at 극단 a pile-on.
  - A swing to the other side cuts a running thread.
  - When the phone is level, rooms return to small talk.
- **UI**: the expression/2 clone, plus KakaoTalk's join and leave notices as a centred grey pill.
- **Party colour.** The background follows the tilt. Left mixes toward 민주당 blue `#004EA2`, right toward 국민의힘 red `#E61E2B`, by |lean|.
  - The list background and rows go up to 34% at full tilt; the room ground (#B6C9DA) up to 46%.
  - Level is plain KakaoTalk. The `--tint` custom property eases over 140 ms.
  - Bubbles, badges and the readout keep their colours.

## KakaoTalk behaviour (revised 2026-11-09 by request)

- **Empty start.** The chat tab opens with no rooms and stays empty while the phone is level. A room appears with its first political message.
- **List order.** A new message moves its room to the top and updates its preview, time and unread badge. No room is pinned.
  - The move is animated (FLIP, 320 ms). The rising row is opaque and slides over the rows it passes, which slide down.
  - A room's first message drops the room in from the top (280 ms).
- **In a room.** A message that arrives while the room is open rises into place (220 ms) and the thread scrolls smoothly to it. Scrolled up, the existing preview bar shows instead. Other rooms arrive as the top in-app banner.
- **Sound.** Plays for messages from other rooms only. It never plays for the open room. No room has 알림 off, so every badge is red and every other room sounds.
  - Messages less than 220 ms apart share one sound. Audio starts after the first tap or key.
  - Kakao's '카톡' voice is its registered sound mark ([서울신문](https://m.go.seoul.co.kr/news/2022/06/29/20220629021001)), so it is not shipped. A recording placed at `public/audio/kakao-talk/notify.m4a` plays instead when present.
  - Without that file, a two-note chime plays, in the style of the 알림음 category the app added in August 2026 ([인사이트](https://www.insight.co.kr/news/210435)).

## Sensor readout (by request)

A three-line strip under the app shows how the tilt is read, updated at 10 Hz:
1. The source: 자이로, with raw γ, β and screen angle; or 키보드; or 대기.
2. The roll used → the target lean → the eased lean, with the dead zone (±4°) and the full tilt (±32°).
3. The 진보 and 보수 heat with their tier, messages per second against the target rate, and rooms opened out of 93.

The app sits above the strip.

## Corpus

Lines follow the banpo-xism comment-corpus rules (`banpo-xism/docs/overplan/mobile/0418_mobile_comments.md`):
- Phrasings are mined from real community and news text, not invented.
- Mostly very short lines, with a few 장문 (forwarded 지라시, 공지, 후기).
- About a third name no person or party.
- Community markers: ㄹㅇ, ㅁㅊ, ㄷㄷ, 각, ㅇㅈ. Elders type with misplaced spaces, `_()_` and a space before `!`.

Sources, each line coded to its origin:
- [진보 쪽](research-left.md): 클리앙, 딴지, 경향 2030 응원봉 interviews, 재명이네 마을 reporting.
- [보수 쪽](research-right.md): 에펨코리아, 디시 미국정치·새로운보수당 갤러리, 박사모 카페, 경향·한겨레21 analyses of 극우 오픈채팅, 노컷's 투표용지 지라시.
- [Timeline and room dynamics](research-timeline.md): verified events from 2024-12-03 to 2026-11-09, real 단톡방 exchanges from 82cook, 클리앙 and 블라인드, and room types with who leans which way.

## Content boundary

The work presents each camp's rhetoric as rhetoric. Left out on purpose:
- execution methods and curses on judges' families, though both appear in the real posts
- doxxing, and calls to violence (for example "몽둥이")
- ethnic and gender slurs; 반중 claims are kept without slurs
- invented or unverified numbers (for example "78% 중국인", "160조")

Real politicians appear only as each side names them.

## Measured

Headless run of the director, all rooms, messages per second at 0–3 s / 3–10 s / 10–30 s / 30–60 s:

| Lean | Messages/s | Departures in 60 s |
| --- | --- | --- |
| Level | 0 / 0.1 / 0.2 / 0.2 | 0 |
| Full left | 2.3 / 3.3 / 5.7 / 4.8 | 2–9 |
| Full right | 2.7 / 3.9 / 5.4 / 5.4 | 1–3 |
| Half right | 0.7 / 1.7 / 2.3 / 5.2 | 0–1 |
| Left 30 s, then right | 3.0 / 3.7 / 5.3 / 5.5 | 5–7, with 3–5 returns |

## Browser check (2026-11-09)

Checked in Chrome on desktop with held arrow keys.
- 2024 공채 동기 turned left with 한지호 pushing back.
- The right open chat climbed from 지지율 and 세금 to 날치기 and 사법 쿠데타, then to 탄핵무효, 선거무효 and kicks.
- The family room played 아빠 "계엄은 합법이다", then 언니 "얘넨 그냥 극우임.", then 엄마 "이제 같이 있을 때 뉴스 를 아예 안 튼다", then "엄마님이 나갔습니다."

Two bugs found in the browser and fixed:
- Late-listed rooms starved under the global cap.
- In an open chat, the majority used to walk out instead of kicking the plant.

Second check, after the behaviour revision:
- Empty tab at load, then 1 → 11 rooms in 14 s.
- 8 chimes in 14 s from unmuted rooms.
- At full tilt the list ran 222 row moves and 5 inserts in 8 s.
- Frame timing over 5 s while reordering: 301 frames, median 16.7 ms, max 17.7 ms, none over 33 ms.
- Arriving bubbles animate, the thread stays pinned to the bottom, and the banner shows other rooms.

Third check (93 rooms, faster rates): at full left tilt the list reached 16 messages/s, with 63 of 93 rooms open after about 9 s and 93 after 15 s. Frame timing over 5 s with 41 rows moving: median 16.7 ms, max 17.7 ms, none over 33 ms. Headless: level 1.3–2.3 messages/s of small talk; full tilt 12–13 messages/s from 3 s on.

Fourth check (tilt-proportional speed), driving the real `deviceorientation` handler:
- Level: 0 rooms, 0/s.
- γ −12° (lean −0.29): 1/s against a target of 1.2, 7 rooms.
- γ −32°: 8/s against a target of 8.0, 35 rooms, 극단.
- Back to γ +1°: 0/s at once.

Headless runs over 30 s, messages per second:

| Lean | Messages/s |
| --- | --- |
| 0 | 0 |
| 0.25 | 1.0 |
| 0.5 | 2.8 |
| 0.75 | 5.2 |
| 1 | 7.5 |

Not yet checked:
- No test on a phone or with the real gyroscope.
- No check of the iOS permission sheet.
