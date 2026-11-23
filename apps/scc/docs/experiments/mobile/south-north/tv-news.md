# south-north / tv-news

[/1](#tested-relation) the anchors, [/2](#2-marks-in-the-corners) with a flag and an information button, [/3](#3-more-pairs-under-the-anchors) with ten more pairs to scroll through.

`/mobile/south-north/tv-news/1` (2026-11-16). Experimental. The main evening news of the South and of the North, as one picture: tipping the mobile's top edge away turns the anchor, her studio and her voice into the North's; tipping it back, into the South's. In between there is one hybrid anchor. First member of [south-north](README.md). The tilt popup is copied from [kakao-talk/1](../left-right/kakao-talk/README.md) and the idea of morphing geometry and colour together from [politician/2](../politician.md); nothing is imported from either.

## Tested relation

Two real broadcasts a month apart (MBC 2026-11-12, 조선중앙TV 2026-10-13), read on one axis. The baseline is each broadcast alone, which is what either end of the tilt shows, untouched. The changed variable is the pitch of the mobile; the invariant is the composition: both anchors sit at the same place and size of the frame, so only who is speaking changes.

## Material

Real broadcast footage, by the user's decision (2026-11-16: "한번 실제 방송으로 해봐라"); the user checked the legal side of using it. Rights stay with the broadcasters. Sources are listed in [`public/video/south-north/tv-news/1/sources.txt`](../../../../public/video/south-north/tv-news/1/sources.txt).

- South: MBC 뉴스데스크, 2026-11-12, four whole links read by the woman anchor (23.0 s, 21.5 s, 22.6 s, 5.9 s), each cut from just before she starts to the pause after her last word.
- North: 조선중앙텔레비죤 20시 보도, 2026-10-13, one unbroken 73.0 s take of the anchor reading a statement, from her first word to a pause between sentences (the take runs about eight minutes in the broadcast).
- The pair was chosen for composition: anchor shots were found by face detection at 1 fps across MBC 뉴스데스크 and KBS 뉴스9 of 2026-11-12 and four 조선중앙TV broadcasts (10-13, 10-16, 10-22, 11-11), keeping frontal, single-anchor, medium shots. KBS's anchor shots that day are wide two-shots.
- Each shot is cropped and scaled so that the pupils' midpoint sits at (0.5, 0.266) of a 608 × 1080 frame and the pupils are 87 px apart (MBC shots scaled 1.03–1.54× from 1080p, 조선중앙TV 1.70× from 720p, so the North is the softer picture).
- `news.mp4` (18.3 MB, 73.0 s, 2,189 frames at 30 fps, H.264) holds both sides in one 1216 × 1080 picture, South left and North right, so one decoder keeps them on the same frame. Its sound is one stereo track: South on the left channel, North on the right, each normalised to −17 LUFS and then levelled by `scripts/tv-news/level.sh` (2026-11-17): at equal integrated loudness the North's voice sat about 2 dB lower at 1–5 kHz and was heard as much quieter, so it gets a presence shelf and 0.5 dB, and both lose the rumble under 120 Hz. Measured after: 1–5 kHz at −24.6 dB (South) and −24.5 dB (North), integrated −17.5 and −16.6 LUFS, peaks −1.4 and −1.5 dBFS.
- The South cuts three times in the loop, as its broadcast does between items; the North does not cut. The two sides' cuts are independent.

## Mechanism

- **Input** (`tilt.ts`, tested in `tilt.test.mjs`). `deviceorientation` pitch (beta, corrected for screen rotation). The angle the mobile is held at when the reading starts (mean of the first 8 readings) is level. 4° dead zone, 24° full tilt. Top edge away from the body is north, as a map is read with north ahead; toward the body is south. iOS gets the tap-anywhere popup for motion access; a desktop holds ↑ / ↓.
- **Share.** Lean −1 … +1 becomes the North's share 0 … 1, eased at 7/s. Level is the halfway anchor. Before the first tilt or key the share drifts slowly between the two ends.
- **Track** (`morph/track.ts`, built by `scripts/tv-news/`). For every frame, 109 corresponding points per side: 76 Vision face landmarks (the 87-point set without its repeats), 16 silhouette points read off a Vision person mask (top of head, head sides, neck, body widths down to the chest), and 17 fixed frame anchors, which also pin the lower-third band so captions do not bend. One Delaunay triangulation of the mean (203 triangles). Stored as int16 (1.9 MB).
- **Picture** (`morph/renderer.ts`). A WebGL2 triangle mesh drawn at the place between the two point sets; each triangle carries both pictures there, mixed by the share in linear light. The video's own frame time (`requestVideoFrameCallback`) picks the track frame, so points and picture never drift apart.
- **Sound** (`sound.ts`). The two channels are split and weighed with equal-power gains, both to both ears. Sound starts on the first touch or key, as browsers require. The two anchors say different sentences, so between the ends the voices overlap; they do not become one voice.
- **Screen.** The 608 × 1080 frame fills the height: a mobile crops its sides, a wide window shows it whole between black. No other UI.

## Checked

Offline, 2026-11-16: the morph rendered at shares 0, 0.25, 0.5, 0.75, 1 for frames 200, 900, 1500 and 2100 against a plain cross-fade. At 0.5 the morph shows one face (one pair of eyes, one mouth); the cross-fade shows two faces through each other.

Brave, 2026-11-16, visible tab, 1194 × 639 window (canvas 720 × 1278):
- ↑ held: the North's broadcast alone, identical to the source. ↓ held: the South's alone. Released: one hybrid anchor, with the two outfits and the two backdrops showing through each other.
- 240 frames while playing: median 16.7 ms, 95th percentile 18.3 ms, max 18.7 ms, none over 33 ms. No console errors.
- After a click the video is unmuted and playing; no page scroll at 558 × 639.

Useful failure: the first cut (2026-11-16, same day) was a 21.9 s loop of two shots a side, with the South's links cut mid-sentence to match the North's shot lengths; it read as random cutting ("너무 빨리 잘리는 거 같은데"). The lengths are no longer matched shot by shot: each side keeps whole utterances and only the totals agree.

Useful failure: the first track carried the silhouette down to the bottom of the frame, and at the halfway share MBC's caption bar bent with the body widths. The body points now stop at the chest and a row of fixed anchors holds the band.

Not checked:
- A mobile with a real gyroscope: the tilt direction and sign in each screen rotation, the iOS motion popup, and whether iOS plays the two channels through the Web Audio graph.
- The balance of the two voices by ear; the levels are matched by measurement only.
- A window narrower than 360 px wide at this height (side crop).

## /2: marks in the corners

`/mobile/south-north/tv-news/2` (2026-11-23). A copy of /1 (nothing imported from it; the footage and track are /1's files under `public/video/south-north/tv-news/1/`, served once). The question is how little guidance makes the tilt readable. /1 is the baseline with no UI. Changed variable: two marks in the lower corners of the visible picture. Picture, sound, input and the tilt popup are /1's.

- **Flag, lower left** (`flags.tsx`). The 태극기 and the 인공기 stacked in one 3 : 2 box, the 태극기's ratio (the user, 2026-11-23: "비율은 남쪽 비율에 맞춰라"; the first cut moved the box from 3 : 2 to 2 : 1 with the share). The 인공기 is 2 : 1 on its sheet: its bands keep their heights and are cut to 3 : 2, the disc and star stay round. The render loop writes the picture's share to `--share` on the box; the 인공기's opacity is the share. It is the only hint of what the tilt does: it moves with the anchor.
- **Information, lower right.** A white ring with a white i on a transparent ground (the user, 2026-11-23; the first cut was a white disc). It opens /1's popup card with the work's text from `info.ts`; a tap anywhere closes it. The text is a placeholder (the two sources and one sentence on the tilt); the user will supply the work's information.
- Both marks are 7.5 % of the visible picture's width (24–40 px), 16 px from its edges plus the safe-area insets.

Checked in the browser, 2026-11-23, visible tab, 454 × 639 window (marks 27 px): ↓ held shows the 태극기 alone at 3 : 2, ↑ held the 인공기 alone (then at 2 : 1; the 3 : 2 box that followed was not captured again), released the two mixed at 0.5; the i opens the card and a tap closes it. 240 frames while playing: median 16.7 ms, 95th percentile 17.5 ms, max 17.7 ms. No console errors. Useful failure: without an edge the 태극기 and the disc vanished on the South anchor's white jacket; the flag now carries a hairline and a soft shadow, the ring a soft dark halo.

Not checked: a real mobile (safe-area insets, the marks under the iOS motion popup), and whether the flag alone is hint enough for a first-time viewer.

## /3: more pairs under the anchors

`/mobile/south-north/tv-news/3` (2026-11-23). A copy of /2 (nothing imported from it). The question is whether the anchors' relation, two broadcasts of the same kind read on one tilt, holds for other kinds of footage. /2 is the baseline. Changed variable: more South/North pairs under the anchors, one swipe each (three at first, ten by the end of the day). The tilt, the flag and the popup are /2's; /2's information button gave way to a reels rail (below).

Sources and cut times are in [`public/video/south-north/tv-news/3/sources.txt`](../../../../public/video/south-north/tv-news/3/sources.txt); real footage, at the user's decision (2026-11-23), who chose these three pairs from a list of candidates. Each pair is 20 s at 30 fps in one 1216 × 1080 file, South left and North right, South's sound on the left channel and North's on the right (each side to −17 LUFS), built by `scripts/tv-news/build_pairs.py`. The 16 : 9 sources are cut to a 608 × 1080 vertical slice whose centre follows the subject shot by shot; nothing is stretched.

- **parade** (11.9 MB). 제76주년 국군의 날 기념식 (KBS, 2024) and the 당 창건 80돐 열병식 (2025). Marching blocks on both sides, then both cut to the leader at 11.71 s: 윤석열 clapping in the stand (to 15.9 s), 김정은 saluting (to 17.2 s), then marching again.
- **anthem** (5.4 MB). 대한민국정부's 「대한민국에 놀라운 '힘'이 깨어났다」 and 《친근한 어버이》. A man alone in the middle of the frame on both sides at 0 s and again at 7.3 s; from 14.5 s the peninsula lit green against the 인공기. The North's picture is letterboxed in its source and is scaled 1.27× to fill; the South's title card (11.2–14.4 s) is shown whole, smaller, on black.
- **stage** (16.6 MB). 장원영's vertical fancam (2025-10-31) and, since that evening at the user's request, "'I Want to Break Free' Performed In North Korea": a re-dub (its uploader marks it "Alternate Reality footage") of a 모란봉악단 and army chorus concert with Queen's song. The fancam is drawn in to her upper half for the North's opening close-up (3.1 s), then shown whole against the chorus. The first cut had a soloist of the 2025년 신년경축공연.
- **leader** (5.8 MB), added that evening under anthem: the leader among his people while a song says his name. 이재명's official campaign song 「지금은 이재명」 and another 20 s of 《친근한 어버이》. Both faces are in the middle of the frame for the first 4 s. The user asked for an official film idolising 문재인 or 이재명; what the search found that is official are campaign songs on the candidate's own channel, and the hymns proper are supporters' work (e.g. 양희삼TV's 「든든한 돌 되리」), not used.

Six more pairs were added the same day, at the user's request for the other fields of the first list (street, housing, resort, food, tourism, and the missiles of the two parades), chosen for the same composition with an opposite air:

- **street** (15.0 MB). A pavement walked at eye height: Gangnam by day, 림흥거리 by night.
- **towers** (6.4 MB). Lit towers at night: 래미안's brand film and the last shots of the 화성지구 준공식 broadcast (720p, scaled 1.5×). The weakest likeness: the South is mostly interiors until its last second.
- **beach** (7.0 MB). A curved beach from the air: 해운대 and 원산갈마. The first 6 s match; then the North cuts to bathers while the South keeps flying.
- **noodles** (7.3 MB). A woman at a table for the first 4.5 s on both sides (a 먹방 and the 《평양랭면풍습》 report), then the bowls.
- **dance** (7.5 MB). People dancing in the open before a monumental building: 대한문 and a Pyongyang square. The North's film is a foreign travel agency's, not a state one.
- **missile** (6.8 MB). 현무-5 and 화성-20형 on their carriers from the front quarter; both in frame from 4 s to 14 s.

Mechanism (rebuilt as a reels feed the same day, at the user's requests: play at once on the swipe "like Reels", a smoother swipe, the next reel when one ends, the action rail of [scroll-rot](../scroll-rot/README.md) on the right, the information button out):

- **Pager** (`pager.ts`). The track follows the finger and settles on a page with UIScrollView's paging spring; logic and constants are copied from `scroll-rot/eye/2`'s scene (nothing imported). A wheel, PageDown/PageUp or Space turn a page on a desktop; ↑ / ↓ stay the tilt keys. The feed has no end: reel n shows part n mod 10.
- **Videos.** Three video elements take turns; reel n uses element n mod 3, so the reel on screen and its two neighbours never share one. The neighbours are loaded and wait on their first frame. The page is decided when the finger lets go, and its video starts then, while the page is still sliding in. A reel that plays to its end turns the page (or plays again if a finger holds the track). A watch in the frame loop restarts the playing video if anything paused it.
- **Sound** (`sound.ts`). One audio context; each of the three elements is split into its two sides as in /1 and only the one playing is let through. Sound is unlocked on a finished touch (`pointerup`) or a key: on the first one, every element is started and the waiting ones stopped again, so that later reels may start with sound without a touch. If a browser still refuses to start a reel with sound, it is started muted and gets its sound back on the next touch.
- **Stills.** Every part has a JPEG of its first frame. A reel that is not playing shows its still, mixed by the same share, so a reel coming up under the finger is not black and the video joins at the frame the still shows.
- **Picture.** The reel on screen and two on either side exist, each with its own canvas and WebGL context running /1's renderer (five contexts; a reel further away is unmounted and its context given up). The anchors keep their measured track; the other pairs have no corresponding points, so they use a four-corner track that does not move (`plainTrack`): a mix in linear light of two pictures cut to the same place, not a morph.
- **Rail and sheets.** Like, comment, repost and share with scroll-rot's glyphs, geometry, count formula and its comments and share sheets (`reels/`, copied): comments can be liked, replied to and posted, the share sheet copies the link, opens the device's share sheet or picks accounts. What is said under each part is this work's own invented text (`reels/pools.ts`). While a sheet is up the reel under it plays again at its end and does not move on. The flag stays lower left.
- **Tilt.** /1's reading with a wider throw: full tilt is 40° from level, not 24° (the user, 2026-11-23; 60° was tried and taken back the same day); the 4° dead zone and the easing are unchanged, so 22° is three quarters one side. /1 and /2 keep 24°.
- **Loudness.** Every pair's two sides are measured after the build and brought to −17 LUFS each, so that at level neither side is the louder one (see `sources.txt`).

Useful failures (2026-11-23), both reported by the user as videos stopping or not starting on the scroll:
- The first cut gave every part its own video element, played every part touching the screen and, on the first touch, started all of them unmuted.
- The second cut had one video element whose source changed once a part was half on screen: nothing was loaded ahead, so each part began with a wait.
- Found while measuring: sound was unlocked on `pointerdown`. A touch that has only begun is not yet a user gesture, and Chrome pauses a muted autoplaying video that is unmuted without one; the first touch stopped the video. /1 and /2 still unlock on `pointerdown`.
- An element carrying the `autoplay` attribute starts by itself whenever it is handed a new source; the first element did, and two reels played at once. The attribute is cleared after the first start.

Checked, 2026-11-23, headless Chrome on the Mac with a throwaway profile, 390 × 844 at 2×, touch emulated (the connected browser refused the local certificate that day): after the popup's tap, six swipes in a row each had the next reel playing 60 ms after the finger left (0.04–0.06 s into the video) and no other video running; a reel seeked to its last 0.6 s handed over to the next; two flicks 120 ms apart landed two reels on with only that one playing; like toggled. 413 frames across the six swipes: median 16.7 ms, 95th percentile 16.8 ms, max 16.8 ms. All files by frame sheets every 2 s. That evening, same setup: the leader and new stage reels started 60 ms after the swipe like the others; the comments sheet opened with 12 comments, a posted comment appeared on top, a tap outside closed it; the share sheet listed 28 accounts; the reel went on playing under both.

Not checked: a real mobile. Above all iOS Safari: whether the waiting elements start with sound after the first touch, how many decoders and WebGL contexts it allows, and the frame timing of a real device.

Unresolved for /3: nothing tells a first-time viewer that there is more below; the new pairs only cross-fade; a reel starts from 0 each time it is returned to; the folder is 80 MB; the 현무-5 caption of the KBS broadcast shows in the missile reel's lower left.

## Unresolved

- The clothes and backdrops only cross-fade; only the face and silhouette truly morph.
- A voice that morphs would need both anchors reading the same sentence, which real broadcasts do not give.
- The North's take ends at a pause between sentences, not at the end of the statement, and the loop then starts over.
- The North's anchor wears glasses; at the halfway share they show faintly on the hybrid face.
