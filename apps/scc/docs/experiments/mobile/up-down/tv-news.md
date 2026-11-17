# up-down / tv-news / 1

`/mobile/up-down/tv-news/1` (2026-11-16). Experimental. The main evening news of the South and of the North, as one picture: tipping the mobile's top edge away turns the anchor, her studio and her voice into the North's; tipping it back, into the South's. In between there is one hybrid anchor. First member of [up-down](README.md). The tilt popup is copied from [kakao-talk/1](../left-right/kakao-talk/README.md) and the idea of morphing geometry and colour together from [politician/2](../politician.md); nothing is imported from either.

## Tested relation

Two real broadcasts a month apart (MBC 2026-11-12, 조선중앙TV 2026-10-13), read on one axis. The baseline is each broadcast alone, which is what either end of the tilt shows, untouched. The changed variable is the pitch of the mobile; the invariant is the composition: both anchors sit at the same place and size of the frame, so only who is speaking changes.

## Material

Real broadcast footage, by the user's decision (2026-11-16: "한번 실제 방송으로 해봐라"); the user checked the legal side of using it. Rights stay with the broadcasters. Sources are listed in [`public/video/up-down/tv-news/1/sources.txt`](../../../../public/video/up-down/tv-news/1/sources.txt).

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

## Unresolved

- The clothes and backdrops only cross-fade; only the face and silhouette truly morph.
- A voice that morphs would need both anchors reading the same sentence, which real broadcasts do not give.
- The North's take ends at a pause between sentences, not at the end of the statement, and the loop then starts over.
- The North's anchor wears glasses; at the halfway share they show faintly on the hybrid face.
