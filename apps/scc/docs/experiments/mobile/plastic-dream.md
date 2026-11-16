# Plastic dream — /mobile/face-trace/plastic-dream/1

2026-11-16. Experimental. A subfamily of [face trace](face-trace.md) about Korean cosmetic surgery, staged as a clinic advertisement at 신사역. The front camera takes one still, the camera stops, and the participant operates on that photo: pressing and holding a part of the face exaggerates that part only, for as long as it is held, while a bill counts what it would cost. Nothing is saved or sent.

## Screen

A portrait board, 56% of the viewport height wide at most, set entirely in em (1 em = 1/39 of its width), on pure white with red `#e60012`, Line 3 orange `#ef7c1c`, yellow `#ffe600` and black:

- Head: the ad, placed at 신사역, whose crossroads is the real clinic district ([52 clinic signs counted around it, 11 of them within 250 m of exit 5](https://www.medicaltimes.com/Main/view.html?ID=1120895)). A strip in Seoul Metro Line 3 orange `#ef7c1c` with the line roundel (3 신사역 성형거리 · 5번 출구 도보 1분), the invented clinic name 플라스틱드림성형외과, the slogan 누르는 만큼 예뻐집니다 (which is also the instruction), and three teaser prices from the catalogue.
- Theatre: the face alone, enlarged and centred (1.7 face heights of the photo, kept inside the frame), labelled AFTER, with the untouched face inset as BEFORE.
- Instruments ([`tools.tsx`](../../../components/mobile/face-trace/plastic-dream/1/tools.tsx)): while a part is held, a scalpel, scissors or syringe sits with its tip on the pressed point and works (cutting stroke, snipping, plunger). Up to three fingers each carry one. Scissors for 앞트임, 뒤트임 and 콧볼축소; syringe for 입술필러, 이마지방이식 and 물광주사; scalpel for the rest.
- Bill: a strip naming what is under the knife now with its unit price and count; fourteen catalogue rows with count and cost; the total in red.

## Prices

[`catalog.ts`](../../../components/mobile/face-trace/plastic-dream/1/catalog.ts). One operation is 4 units of amount, 1.6 s of pressing; cost is unit price × operations and runs continuously. Left and right are billed together as one operation. Unit prices are list prices (before event discounts) read on 2026-11-16:

| Row | Won | Source |
| --- | --- | --- |
| 쌍꺼풀 | 850,000 | 자연유착 list price, [Gangnam Unni clinic listing](https://www.gangnamunni.com/hospitals/213) (via search summary) |
| 앞트임 · 뒤트임 | 1,040,000 | 절개 트임 list price, same listings |
| 콧대 | 1,840,000 | 첫코 보형물 list price, [Modoodoc 코 성형 비용](https://www.modoodoc.com/blog/post/123/%EC%BD%94-%EC%84%B1%ED%98%95-%EB%B9%84%EC%9A%A9%EA%B0%80%EA%B2%A9%EC%9D%80-2026) |
| 코끝 | 1,460,000 | derived: a 3,300,000 콧대·코끝 listing ([Gangnam Unni event](https://www.gangnamunni.com/events/35269)) minus the 콧대 price |
| 콧볼축소 | 1,000,000 | [Modoodoc 콧볼축소 가격](https://www.modoodoc.com/blog/post/124/%EC%BD%A7%EB%B3%BC%EC%B6%95%EC%86%8C-%EA%B0%80%EA%B2%A9%EB%B9%84%EC%9A%A9%EC%9D%80-2026) |
| 입술필러 | 150,000 | 1 cc list price, [Modoodoc 필러 가격](https://www.modoodoc.com/blog/post/101/%ED%95%84%EB%9F%AC-%EA%B0%80%EA%B2%A9%EC%9D%80-%EB%B6%80%EC%9E%91%EC%9A%A9%EA%B3%BC-%EC%A3%BC%EC%9D%98%EC%82%AC%ED%95%AD%EA%B9%8C%EC%A7%80-2026) |
| 입꼬리 · 인중축소 | 1,309,000 each | a package listing on Gangnam Unni from a Busan clinic, not Gangnam |
| 광대축소 · 사각턱 | 2,189,000 each | event prices at one Gangnam clinic, [Gangnam Unni](https://www.gangnamunni.com/events/76894) (via search summary) |
| 턱끝 | 1,650,000 | same listing |
| 이마지방이식 | 1,500,000 | estimate; no listing found |
| 물광주사 | 200,000 | estimate; no listing found |

Prices came from search-result summaries of these pages, not from reading each page in full.

## Contract

- One photo, whatever the face: the still is the mirrored preview as shown. MediaPipe Face Landmarker reads it once (`IMAGE` mode) and is closed. There is no template or target face; every operation is measured from this face's own landmarks.
- One amount per place: each procedure holds how long it has been pressed, at 2.5 units per second (`RATE`; `t` below). Amounts only rise, have no cap, and are independent from place to place. Left and right are one operation: pressing either side raises both by the same amount (changed on 2026-11-16 by request; the first version operated on each side alone). The warp is a smooth function of the amount, with no steps or thresholds. Several fingers can hold several places at once.
- Procedures ([`procedures.ts`](../../../components/mobile/face-trace/plastic-dream/1/procedures.ts)), 20 places. `g = 1 + 0.1t`; "closing" means the stated share of the gap times `1 − e^(−t/5)`:

| Press | Procedure | Warp |
| --- | --- | --- |
| Eye (each) | 쌍꺼풀 · 눈매교정 | magnify, ×g^1.15 wide, ×g^1.5 tall |
| Inner eye corner (each) | 앞트임 | push toward the midline, closing 90% |
| Outer eye corner (each) | 뒤트임 · 밑트임 | push outward and down, 0.09 eye widths per unit |
| Nose bridge | 융비술 | both flanks pushed to the centre line, closing 80% |
| Nose tip | 코끝 | push toward the bridge, closing 70% |
| Nose wing (each) | 콧볼 축소 | push toward the midline, closing 85% |
| Lips | 입술 필러 | magnify, ×g^0.95 wide, ×g^1.5 tall |
| Mouth corner (each) | 입꼬리 수술 | push outward and up, 0.05 mouth widths per unit |
| Philtrum | 인중 축소 | upper lip pushed to the nose base, closing 85% |
| Cheekbone (each) | 광대 축소 | push toward the midline, closing 45% |
| Jaw angle (each) | 사각턱 절제 | push toward the midline and slightly up, closing 60% |
| Chin | V라인 · 턱끝 | narrow push down, 0.035 face widths per unit |
| Forehead | 이마 지방이식 | hairline pushed up, 0.16 brow heights per unit |
| Bare skin inside the face outline | 보톡스 · 미백 · 물광 | painted where the finger is; see Skin |

- Warp ([`warp.ts`](../../../components/mobile/face-trace/plastic-dream/1/warp.ts), mirrored in the shader of `renderer.ts`): two kernels on the face's own axes. Magnify scales uniformly inside 40% of its radius and eases to 1 at the rim, and its radius grows with its scale, so a growing feature squeezes its neighbours instead of covering them. Push moves a point with a Gaussian falloff; a long push is a stroke of two to four equal short pushes, each carried on by the last, so it travels far while moving only what is near it. Each kernel is one-to-one and kernels are composed in sequence, small ones first, so no amount folds the photo. Each kernel's anchor is carried forward through the kernels before it.
- View: the renderer shows only the face (`Face.view`), so presses and instruments act on the enlarged face.
- Hit test: the pressed screen point is walked back through the current warp to the photo, then matched to the procedures' zones, small zones first; a press within 1.5 zone radii of the nearest zone still counts as that zone. A swollen feature is therefore pressed where it is seen.
- Skin: a 256² float map over the photo accumulates pressing around the finger (reach 0.14 face widths). The shader uses only the photo: its own mip levels remove pores, then edges; tones lift toward white and lose colour; the areas the room's light already reaches are turned up as gloss. Eyes and lips are exempt.
- Budget: the canvas draws only while something is held or on resize, at up to 2× and 4 million pixels; at most 64 kernels per pixel (53 with every place pressed).

## Not built

A drawn double-eyelid crease and 애교살 shading were left out: both would be marks added to the photo rather than changes to it. There is no retake control; reloading starts over. The bill shows fourteen fixed rows; it is not a scrolling receipt.

## Useful failures

Seen the same day, in the captures described under Evidence:

- Rates of one unit per second made a short press look like nothing; `RATE` is now 2.5.
- Exponential growth, much taller than wide, turned lips and eyes into vertical streaks within ten seconds; the polynomial `g` curves replaced it.
- A single wide push for the nose tip (unbounded) and the jaw dragged the upper lip, an eye and the mouth with it. Strokes of short pushes, and a nose tip that closes on the bridge, keep them local.
- A forehead magnify squeezed the brows into a frown and narrowed the eyes; the forehead now rises from the hairline instead.
- The first version was the warped photo full-screen with nothing else. The user rejected it outright: it read as a face-distortion toy, not surgery. The ad board, the enlarged face, the instruments and the bill are the answer to that.
- The first skin treatment made a white spot like a torch on the cheek in three seconds; its reach was widened and its whitening and gloss cut to about a quarter.

## Evidence

2026-11-16. `pnpm typecheck` and eslint pass. A pure check of `warp.ts` (five overlapping kernels, amounts 0.5 to 60) found forward-then-inverse error under 5e-7 and no negative Jacobian on a 90×120 grid.

Headless Brave over CDP at the HTTPS origin, 390×844 at 2×, with `getUserMedia` replaced by a canvas stream of `public/images/face-voronoi/portraits/030.jpg` and presses sent as real touch and mouse input:

- Observed, final screen: the board fits 390×844 without scrolling; the face is enlarged and centred with the BEFORE inset; scissors, scalpel and syringe appear with their tips on the pressed point; the strip, rows and total run while a part is held (10,886,153원 after seven presses).
- Observed, before the ad board was added: the capture flow; each of the 20 places and the skin responding alone to a three-second press; repeated presses on an already-warped face landing on what is seen; a 1440×800 viewport capturing correctly. No console errors.
- Frame intervals (desktop GPU, headless): median 16.7 ms and p95 16.7–16.8 ms idle, with 2 places, with 15 places, and at an extreme.
- Observed at 1440×800: the board stays a centred portrait column on white and a mouse press operates with the scalpel on the spot.
- Unverified: a real camera, a real mobile and its GPU cost, faces other than this one (turned, small in frame, glasses), and multi-touch.
