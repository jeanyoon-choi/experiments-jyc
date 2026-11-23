# KakaoTalk /1 — tilted politics

2026-11-09, revised 2026-11-16. Experimental. `/mobile/left-right/kakao-talk/1` is a KakaoTalk clone whose chat rooms drift into political talk as the mobile rolls: left toward 진보·민주당 지지층, right toward 보수·국민의힘·윤어게인. Holding the lean pushes every room from 온건 through 강경 to 극단. People who disagree argue at first, then fall quiet, then leave the room. The UI started as a copy of the since-removed `expression/2` (copied, not imported). The camera and face reading were removed the same day by request. On 2026-11-16 the route moved from `/mobile/kakao-talk/1` (now a permanent redirect) into the [left-right](../README.md) family, and by request the tilt prompt, the readout, the rooms' pace and tone, and parts of the interface were revised (see [Revision 2026-11-16](#revision-2026-11-16)).

## Mechanism

- **Input** (`index.tsx`). The mobile's roll (`deviceorientation` gamma, corrected for screen rotation) maps to a lean of −1 … +1.
  - Rolls under 4° count as level; 32° counts as fully tilted, before the OS rotates the screen.
  - iOS needs a tap: on touch devices, when `requestPermission` exists, a KakaoTalk-style popup ("좌우로 기울여 보세요", 확인) covers the screen, and a tap anywhere asks for motion access.
  - Desktop has no sheet: hold ← / →.
- **Speed** (`director/director.ts`) follows the tilt only. Across the list, messages per second = `12 · |lean|^1.3`: 2/s at a quarter tilt, 4.9/s at half, 12/s at full.
  - A token bucket holds every delivery to that rate: lines, pile-ons, thread beats and departures. A slot is spent only when something is posted.
  - When nothing queued is due, a new political line is drawn at once from a room weighted by `politics^1.5`.
  - **Talk gathers** (by request, 2026-11-16). A third bucket adds `12 · |lean|^1.3` messages per second that go only to rooms already talking, drawn by `politics^1.5 · (1 + messages/4)` (messages counted up to 80). Rooms keep piling up messages and unread counts, and the list's own bucket keeps opening new rooms at its usual pace. It also takes queued lines that are due first, which leaves the list's bucket free for new draws. Full tilt is therefore about 24/s in all. Headless at full right tilt: 34 rooms open after 5 s, 60 after 30 s, 64 after 60 s (64–66 at 60 s before this bucket existed), while the eight busiest rooms held 74–113 messages each after 90 s and the median room 22.
  - The room on screen has a second bucket of its own, `1.6 · |lean|^0.7` per second (half that in a 1:1), so an open room keeps talking however many rooms share the list.
  - **Level means silence** (|lean| < 0.03). Nothing is posted, the queue is dropped, and no room appears or moves.
  - There is no small talk. A room appears only with its first political message, and replies to the participant come only while tilted.
- **Heat.** Each side has a heat from 0 to 3.
  - It rises at 0.2/s · |lean| toward the side the mobile leans to, and falls at 0.08/s otherwise.
  - The tier is 온건 below 0.9, 강경 below 1.9, 극단 above. At full tilt that is about 4.5 s to 강경 and 9.5 s to 극단.
  - Each room works up to the tier: its first 3 political lines are 온건 and its first 8 at most 강경, however hot the side already is.
  - Heat only sets the tier. A side returned to resumes near the tier it left.
- **People**: 93 rooms, every member fictional. `director/rooms.ts` holds 20 written by hand; `director/more-rooms.ts` adds 73 room types (친척, 동창, 회사, 동네, 취미, 종교, 학부모, 군대, 오픈채팅, 1:1), each with a lean bias and spread, members drawn from a seeded generator. Every member has a lean (−2…+2) and a voice (elder, parent, young, office, anon).
  - Members on the favoured side speak most.
  - The other side pushes back at 온건, mutters at 강경, and at 극단 walks out ("○○님이 나갔습니다.").
  - People with no side ask for quiet, then leave too.
  - Members come back, invited by someone in the room, once the room swings back their way.
- **Open chats** have a home side, the majority.
  - Under its own tilt the lone plant objects and is kicked ("○○님을 내보냈습니다."). Under the opposite tilt the room is silent.
  - A kicked outsider returns only when the mobile is level and cool.
  - Kick talk (강퇴, 분탕 신고, entry checks) appears only in open chats.
- **Narrative** (`director/script.ts`). In groups, 40% of political turns start a scripted thread, 3–7 beats with roles A/B (favoured side), O (other side) and N (no side).
  - Threads follow the research's observed rhythm: a link or 장문, short agreement, a rebuttal, sarcasm, a plea for quiet, and at 극단 a pile-on.
  - A swing to the other side cuts a running thread.
- **Tone by room** (`director/scenes.ts`). Every room has a scene (family, friends, army, work, town, parents, hobby, faith, open, acquaintance) that decides what is said there, after the room types in the [research](research-timeline.md) (Part C).
  - A cap: a company group stays at 온건 and its people say more one to one; 입주민 and 학부모 rooms and work 1:1s stop at 강경; an acquaintance stays at 온건.
  - Register: in work, town, parents and acquaintance rooms everyone but elders writes 존댓말, and scripted threads (written in 반말) are not played. Elders never type community slang (ㄹㅇ, ㅋㅋ, ~함), and do not write 존댓말 to their own family.
  - Where a line may appear: kicks, entry checks, 수박 hunts and roll-calls only in open chats; lines addressed to a room never in a 1:1; family lines only among relatives. Each scene adds its own pleas for quiet (`HUSH`).
  - A claim comes first. Someone on the favoured side speaks, and only then may the other side answer or the uninvolved ask for quiet (two replies per claim). A room where nobody leans the favoured way stays silent, as does a 1:1 with someone who does not.
  - A thread needs two people on the favoured side; nobody answers themselves.
  - **Only the tilted side speaks** (by request, 2026-11-16). The side is the sign of the lean, with no leftover share for the other side's heat; a swing drops everything the first side had queued. A supporters' open chat (everyone but one outsider leaning hard one way, such as 자유대한민국 수호 애국방) never changes sides: under the other tilt it says nothing. In mixed rooms the other side still answers the favoured side's claims.
- **History.** A room appears with what it was talking about before (`seed`: two or three everyday lines, hours or days old) above its first political message. These lines carry no unread count and do not move the list.
- **UI**: the expression/2 clone, plus KakaoTalk's join and leave notices as a centred grey pill.
- **Party colour.** The background follows the tilt. Left mixes toward 민주당 blue `#004EA2`, right toward 국민의힘 red `#E61E2B`, by |lean|.
  - The list background and rows go up to 34% at full tilt; the room ground (#B6C9DA) up to 46%.
  - Level is plain KakaoTalk. The `--tint` custom property eases over 140 ms.
  - Bubbles, badges and the readout keep their colours.

## Revision 2026-11-16

By request, with the move into `left-right`:
- **Tilt prompt.** The bottom sheet with a `기울기 켜기` button became a KakaoTalk-style popup over the whole screen; a tap anywhere starts the tilt.
- **Readout.** Three lines of sensor numbers became one: the side, its tier and the angle ("◀ 진보 · 강경 · 18°"; "수평" when level).
- **Pace and tone.** The rules under Speed, Tone by room and History above. Before, one shared bank spoke for every room (a team room could call for kicks) and an open room got about 0.5 messages a second.
- **Interface.** The list previews the last message on up to two lines in rows of one height, and the date line in a room is a pill like the join and leave notices.

## KakaoTalk behaviour (revised 2026-11-09 by request)

- **Empty start.** The chat tab opens with no rooms and stays empty while the mobile is level. A room appears with its first political message.
- **List order.** A new message moves its room to the top and updates its preview, time and unread badge. No room is pinned.
  - The move is animated (FLIP, 320 ms). The rising row is opaque and slides over the rows it passes, which slide down.
  - A room's first message drops the room in from the top (280 ms).
- **In a room.** A message that arrives while the room is open rises into place (220 ms) and the thread scrolls smoothly to it. Scrolled up, the existing preview bar shows instead. Other rooms arrive as the top in-app banner.
- **Sound.** Plays for messages from other rooms only. It never plays for the open room. No room has 알림 off, so every badge is red and every other room sounds.
  - Messages less than 220 ms apart share one sound. Audio starts after the first tap or key.
  - Kakao's '카톡' voice is its registered sound mark ([서울신문](https://m.go.seoul.co.kr/news/2022/06/29/20220629021001)), so it is not shipped. A recording placed at `public/audio/kakao-talk/notify.m4a` plays instead when present.
  - Without that file, a two-note chime plays, in the style of the 알림음 category the app added in August 2026 ([인사이트](https://www.insight.co.kr/news/210435)).

## Readout (by request)

One line under the app, updated at 10 Hz: the side the mobile leans to, that side's tier, and the measured roll, as in "◀ 진보 · 강경 · 18°" or "보수 · 온건 · 9° ▶". Level reads "수평". On a desktop with no gyroscope it reads "← → 키로 기울이기" until a key is held, and shows no angle. Until 2026-11-16 it was a three-line strip of raw sensor values, lean, heat and rate.

The app sits above the line.

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

Fifth check (2026-11-16 revision), headless only. Messages per second across the list over 30–60 s: 0 at level, 2.0 at lean 0.25, 4.9 at 0.5, 12.0 at 1. With a group room open at full tilt that room alone ran at about 2.8/s. Transcripts read per room: the team room stayed in 존댓말 at 온건, the family room moved from 물가 and 보유세 to 날치기 with 엄마 asking for quiet, the right open chat shouted down its one outsider, and a 1:1 with a neutral acquaintance stayed empty. Later the same day in the browser (desktop, → held, stage at 390 px): 36 rooms after 6 s, the list with two-line previews, the time on the name's line and the badge beside the preview, the readout "보수 · 강경 ▶", and an open room filling while a banner announced another.

Not yet checked:
- The iOS motion popup and the date pill of the 2026-11-16 revision.
- No test on a mobile or with the real gyroscope.
- No check of the iOS permission sheet.

## /2 (2026-11-23)

Experimental. `/mobile/left-right/kakao-talk/2` is a copy of /1 (`components/mobile/left-right/kakao-talk/2`, nothing imported from `1`), made by request: tilting further should make the talk more extreme. In /1 the tier came from heat, which measures how long the mobile is held, plus a per-room warm-up, so full tilt stayed 온건 for about 4.5 s and the angle set only the speed. /1 is unchanged and remains the baseline. Everything not listed here (interface, pace, tint, popup, sound, rooms) is as in /1.

- **Angles widened 2.5 times** (same day, by request: the tiers came too soon). `2/index.tsx` reads the roll with an 8° dead zone and 78° as full tilt (4° and 32° in /1), so from level 강경 starts at about 25°, 극단 at 41° and the fourth tier at 58°. The degrees given below are the first version's. The three message rates were raised 2.5 times with it (list 30/s, open room 4/s, gathering 30/s at full tilt), so the same angle is about as busy as before.
- **The angle sets the tier** (`2/director/director.ts`). `reach = |lean| · 4.2 + hold`, and the tier is its whole part, up to 3.
  - From a level start: 온건 below a lean of about 0.24 (11°), 강경 from there, 극단 from about 0.48 (17°), the fourth tier from about 0.71 (24°).
  - `hold` is what a long lean adds: it rises at 0.1/s · |lean| up to |lean| itself and falls at 0.5/s when the mobile eases back. Holding an angle lifts the talk by at most one step, after about 8 s (0.2 → 강경, 0.4 → 극단, 0.6 → fourth tier). A lean under 0.19 stays 온건 however long it is held.
  - Up is immediate. A step down waits until the reach is 0.12 under the tier's floor, so a hand on a boundary does not flip the room; on a step down, queued thread beats are dropped.
  - Heat and the warm-up are gone. Only a room's very first political line is one tier lower than the angle asks.
- **A fourth tier, 극좌 / 극우** (`2/director/script.ts`, `types.ts`). New `SAY` banks per register (casual 25/23, polite 18/17, elder 16/17, open 9/9 lines, left/right), 14 `PILE` lines and 4 threads per side. The three lower tiers' lines are untouched.
  - Content: the other half of the country as the enemy (내란 잔당·수구·매국 / 종북·주사파·반국가세력), courts, media and the election commission as one cartel with a hidden hand, purity tests on one's own moderates (중도·협치·절윤), and forwarding orders (서명, 탄원, 구독, 후원, 총집결, ★전달★).
  - Unlike the lower tiers these lines are composed, not mined line by line: they recombine vocabulary from the [left](research-left.md) and [right](research-right.md) notes, name only events in [timeline](research-timeline.md) Part A, and keep the [content boundary](#content-boundary). The only figures are from Part A (67곳, 8대0, 부정 50%).
  - Scene caps (`2/director/scenes.ts`) are as in /1, except that rooms that reached 극단 (family, friends, army, hobby, faith, open) now reach the fourth tier. Company groups stay 온건; 입주민, 학부모 and work 1:1 rooms stop at 강경.
  - At this tier someone who objects or asks for quiet leaves (or is kicked) half the time they speak, against 28% at 극단; one in ten claims also pushes out someone who said nothing; agreement is scheduled in twos.
- **Readout** (`2/index.tsx`). The tier shown is the one the angle gives: "◀ 진보 · 강경 · 12°", and at the fourth tier "◀ 극좌 · 30°" / "극우 · 30° ▶".

Checked (headless, seeded, director only; same numbers left and right unless noted):

| Lean held 5 s | Tier at 1 s / 5 s | Messages | Fourth-tier lines (left / right) |
| --- | --- | --- | --- |
| 0.15 | 온건 / 온건 | 10 | 0 |
| 0.4 | 강경 / 강경 | 34 | 0 |
| 0.6 | 극단 / 극단 | 60 | 0 |
| 1.0 | fourth / fourth | 114 | 54 / 47 |

- Message counts equal /1's rates: the tier does not change the pace.
- Full tilt for 20 s: 474 messages, 302 (left) and 275 (right) of them fourth-tier, 63 distinct lines each; 22 (left) and 5 (right) departures or kicks; no fourth-tier line in a capped room.
- Dropping from 1.0 after 5 s: to 0.5, 극단 within 0.3 s; to 0.2, 강경 within 0.2 s (it stays 강경 there, since 0.2 held is the boundary); to 0.15, 온건 within 0.7 s. No fourth-tier line was posted later than 1 s after the drop.
- `pnpm typecheck` and `pnpm lint` on `2/`.

Not checked: the browser (readout text, a room at the fourth tier on screen), a mobile with a real gyroscope, and whether the boundaries feel right in the hand; the constants at the top of `director.ts` are the ones to tune.
