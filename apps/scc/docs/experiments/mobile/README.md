# Mobile experiments

The component family is `apps/scc/components/mobile/`. Its `clone/1`–`clone/14` entries preserve the SNS mobile variants; the public routes remain `/sns/mobile/1`–`/sns/mobile/14` so existing links continue to work. Their individual records remain in [SNS mobile](../sns/mobile/README.md).

`finger-skating/default` (formerly `/1`) is a single-device arrow field changed by a moving finger at [`/mobile/finger-skating/default`](../../../app/mobile/finger-skating/[experiment]/page.tsx); opt 3 deposits vorticity into a still fluid layer. See [finger skating](finger-skating.md).

Removed 2026-10-07: `finger-skating/2` (skated curve read back as a formula); its code and notes remain in git history before that date.

`finger-skating/clock` lists finger-skated experiments that live in other families, at [`/mobile/finger-skating/clock`](../../../app/mobile/finger-skating/clock/page.tsx): [`fractal/clock/2` and `/3`](../complex-systems/fractal/clock/README.md). They are tagged with `also` in `foundations/navigation/experiments.ts`; their code and routes stay in `fractal`.

`finger-skating/road-sign/1` lists [`transportation/road-signs/direction/4`](../standalone/transportation/road-signs/direction/4.md) at [`/mobile/finger-skating/road-sign`](../../../app/mobile/finger-skating/road-sign/page.tsx); the alias sets its own name with `slug: "1"`.

`ui-collage/` tiles the screen with faithful clones of everyday components and lets finger skating play them: `loading/1` is a grid of twelve circular phone loaders, `loading/2` stacks full-width progress bars from MS-DOS Setup onward (loading/1 restarts at 0% where a finger crosses; loading/2 jumps to the crossing position), and `sliders/1` is a row of narrow vertical sliders set to the finger's height. See [ui-collage](ui-collage/README.md).

`lucky-ticket/1`–`/3` are full-viewport scratch-off fortunes with one-line, long-form, and scattered-word presentations at [`/mobile/lucky-ticket/[experiment]`](../../../app/mobile/lucky-ticket/[experiment]/page.tsx). See [lucky ticket](lucky-ticket.md).

`arithmetic/default` sets the four Instagram post actions — 사칙연산 — large in one row in Instagram's dark-mode colours; `arithmetic/calculator` is an iOS 27 Calculator clone whose ÷ × − + keys are those four actions; on `arithmetic/1`, each tap places one of the four at random under the finger, and skating leaves a trail of them; `arithmetic/fractal` traces a chosen one with smaller copies of itself, edge by edge. All are at [`/mobile/arithmetic/[experiment]`](../../../app/mobile/arithmetic/[experiment]/page.tsx). See [사칙연산](arithmetic.md).

`suneung/default` (국어) and `suneung/math` (수학) are the 2026학년도 수능 홀수형 booklets (20 pages each) rebuilt in DOM from the KICE PDFs, one page per screen, at [`/mobile/suneung/[experiment]`](../../../app/mobile/suneung/[experiment]/page.tsx). [수능](suneung.md) records the paper's style language (frame, headers, type, rhythm, question anatomy, boxes, 수식) in measured points.

`hangman/1` is English hangman whose 졸라맨 is dressed stroke by stroke as Trump, at [`/mobile/hangman/1`](../../../app/mobile/hangman/[experiment]/page.tsx). See [hangman](hangman.md).

`metro/1` draws the whole 수도권 전철 network — 24 lines, 656 stations, topology from OpenStreetMap — in 서울시's 2023 노선도 grammar with 2호선 as a circle at the centre, turned 90° to stand in a phone, at [`/mobile/metro/1`](../../../app/mobile/metro/[experiment]/page.tsx). See [수도권 전철 노선도](metro.md). `metro/2` copies it as a rubber sheet: drag a station and the network bends around it without tearing or crossing, text included.

`daechi/1` is a Daechi-dong academy street at 10 p.m. in three.js — stacked academy signs, LED tickers, 학원차 hazards and 1,050 upright backpacked goldfish walking on two legs; tiled academy buildings lettered pane by pane; a lifted fish or car smashes the signs and knocks the street into the air — at [`/mobile/daechi/1`](../../../app/mobile/daechi/[experiment]/page.tsx). See [대치동](daechi.md).

`no-longer-human/1` sets the opening of Dazai's 인간 실격 — the preface and the first notebook's beginning — as a paged phone e-book whose letters, skated by vertical strokes, come loose and collide with each other and the page edges, at [`/mobile/no-longer-human/1`](../../../app/mobile/no-longer-human/[experiment]/page.tsx). See [인간 실격](no-longer-human.md).

`samdasoo/1` sets one bare, unlabelled 500 mL 제주삼다수 bottle on a studio floor in three.js, turning slowly and by drag, at [`/mobile/samdasoo/1`](../../../app/mobile/samdasoo/[experiment]/page.tsx). See [삼다수](samdasoo.md).

`escalator/1` builds a three.js block of running escalators in every heading and storey phase, orbited and pinched by the viewer from the whole structure down to a single step, at [`/mobile/escalator/1`](../../../app/mobile/escalator/[experiment]/page.tsx). See [escalator](escalator.md).

`face-trace/1` keeps the live eye and mouth cutouts inside a full-screen `face-voronoi/3` `face-gradient 3` lattice made only of those features and their short echoes. Opening the mouth swells and melts the lattice outward from the mouth. It is at [`/mobile/face-trace/1`](../../../app/mobile/face-trace/[experiment]/page.tsx). See [face trace](face-trace.md).

`expression/1` reads the front camera, on the device, as 58 named facial conditions (smile to scream, wink to side-eye, turn and tilt), head pose, blink and nod counts, landmark ratios and all 51 raw blendshapes, each lit by its own value over the mirrored face, at [`/mobile/expression/1`](../../../app/mobile/expression/[experiment]/page.tsx). See [expression](expression.md).

`expression/2` is a KakaoTalk clone whose 26 chat rooms read the face through the hidden front camera and nag about it, faster for anger and fake smiles than for a blank face, at [`/mobile/expression/2`](../../../app/mobile/expression/[experiment]/page.tsx). See [expression /2](expression-2.md).

`finger-network/1` maps each active mobile touch to a node and joins every pair at [`/mobile/finger-network/1`](../../../app/mobile/finger-network/[experiment]/page.tsx). See [finger network](finger-network.md).

`finger-network/2` keeps the network baseline and turns two to five active touches into a continuously moving 2D human figure whose freedom grows with the finger count at [`/mobile/finger-network/2`](../../../app/mobile/finger-network/[experiment]/page.tsx). See [finger network /2](finger-network-2.md).

`finger-network/3` copies `/1`'s network but keeps every node after its finger lifts; each touch session is a complete graph, earlier sessions join only nearby nodes, and an option raises a stick figure per session at [`/mobile/finger-network/3`](../../../app/mobile/finger-network/[experiment]/page.tsx). See [finger network /3](finger-network-3.md).

`finger-network/4` starts from `/3` with people on and keeps each session's person: when the fingers lift it joins, by a bottom option, either a one-sex society of couples, children, betrayal, divorce, ageing, and death, or a political landscape where height is opinion (상파 above, 하파 below), at [`/mobile/finger-network/4`](../../../app/mobile/finger-network/[experiment]/page.tsx). See [finger network /4](finger-network-4.md).

`finger-network/5` copies `/4` and removes every population upper bound: no hard cap, no crowding brake on births, no political cap, at [`/mobile/finger-network/5`](../../../app/mobile/finger-network/[experiment]/page.tsx). See [finger network /5](finger-network-5.md).

`gaze-tracking/1` preserves the independent camera-input study. The [`/mobile/gaze-tracking`](../../../app/mobile/gaze-tracking/page.tsx) index also links to `gaze-tracking/2`, which applies gaze-driven difference circles, liquid displacement, or a local-curl mesh distortion to each clone. See [gaze tracking](gaze-tracking.md) for the sensing and accuracy boundary.

`transform/pixelate/` applies one shared viewport raster effect to any of the archived clones without editing them. The selection index is at [`/mobile/transform/pixelate`](../../../app/mobile/transform/pixelate/page.tsx). See [pixelate](pixelate.md) for its rendering and interaction boundary.

`transform/substitution/1` switches between the original clone, object outlines, and representative colors. `substitution/2` adds uppercase command readings in three vocabulary groups, with an original mode. Both share one renderer across all clones. `substitution/3`, for Instagram, TikTok, X and YouTube only, writes each part's cell into the CSS background of the element already there, so cells scroll, clip and round with the interface. Names, handles, times and counts are separate parts, and every word is stretched to fill its cell. The selection index is at [`/mobile/transform/substitution`](../../../app/mobile/transform/substitution/page.tsx). See [substitution](substitution.md). `dada-text/default` (first `/1`) is `substitution/3` on Instagram alone as a standalone line (its own copy of the clone and the filter, nothing shared with `clone/` or `transform/`), opening on 주의, Didot, no frames, a 1 px edge and a black ground; `dada-text/1` keeps only Explore and the post it opens, on two routes; `dada-text/2` splits `/default` down the screen's middle, the original on the left and the replacement on the right; see [dada-text](dada-text.md).

`transform/language/1` hides the glyphs of every recognised interface string in a clone and redraws them in one of 40 literal translations; each button or text block changes language on its own Markov chain, optionally coupled to its on-screen neighbours, at up to 60 steps per second. The selection index is at [`/mobile/transform/language`](../../../app/mobile/transform/language/page.tsx). See [language](language.md).

`transform/decomposition/` takes the interface in front apart into atoms (text runs, icons, images, fills and borders) and sorts the copies by structural category (every time beside every time, every heart beside every heart), still clickable; a bottom toggle animates between original and decomposition, and new screens or modals are decomposed as they open. The selection index is at [`/mobile/transform/decomposition`](../../../app/mobile/transform/decomposition/page.tsx). See [decomposition](decomposition.md).

`transform/finger-decomposition/` draws the clone in WebGL on a liquid sheet. A finger holds the element under it and carries it rigidly, while the rest of the interface flows, stretches, and eddies around it continuously and keeps flowing briefly after release. A tap still reaches the live page. The selection index is at [`/mobile/transform/finger-decomposition`](../../../app/mobile/transform/finger-decomposition/page.tsx). See [finger decomposition](finger-decomposition.md).

`transform/stretch/` multiplies the height of every photograph, image, video frame and photo background in a clone by a factor from ×0.3 to ×12 (width unchanged, the picture itself distorted, the feed reflowing). A round icon button at the lower right opens a logarithmic slider. The selection index is at [`/mobile/transform/stretch`](../../../app/mobile/transform/stretch/page.tsx). See [stretch](stretch.md).
