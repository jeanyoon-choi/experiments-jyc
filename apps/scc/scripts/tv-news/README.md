# tv-news asset pipeline

Offline tools that produced `public/video/up-down/tv-news/1/`. They are not part of the app. Run from a working folder holding the source segments; see [the experiment record](../../docs/experiments/mobile/up-down/tv-news.md).

1. `track.swift` (`swiftc -O track.swift -o track`): per-frame Vision face landmarks, body pose and, with `MASK=<file>`, the person mask.
2. `align.py`: finds each shot's stable run and the crop that puts its eyes at the shared place.
3. `cut.py`: cuts, crops and scales the shots into the aligned `S.mov` and `N.mov`.
4. `build_track.py`: after `track` has run on both aligned clips, writes `track.bin` / `track.json` and a morph preview.
