# 칭찬도장

`/mobile/praise-stamp/1` (2026-11-09) is a sheet of 64 Korean classroom praise stamps, from the old 참!잘했어요 rubber stamps to today's ink-filled 칭찬스탬프. It lives at [`/mobile/praise-stamp/[experiment]`](../../../app/mobile/praise-stamp/[experiment]/page.tsx).

- Faces (`components/mobile/praise-stamp/1/`): each stamp is solid rubber in a 1000-unit square (`pen.ts`, `stamps.ts`). Six are potrace outlines of real impressions and catalogue sheets (`traced.ts`): 검 in a laurel ([나무위키 「참 잘했어요」](https://namu.wiki/w/%EC%B0%B8%20%EC%9E%98%ED%96%88%EC%96%B4%EC%9A%94)), 좀더열심히 with a turtle (same page), the crowned 참!잘했어요 children, the thumbs-up 참잘했어요 with five stars, 참! 잘했어요 very good and the 엄지척 확인완료 hexagon (the last four from Bing image results). The other 58 are redrawn in the same grammar: a ring or seal edge, lettering arched over the crown or under the base, stars, and one central figure (children's faces, owl, flower, bear, puppy, thumbs, crown, laurel, medal). Report-card grades 수·우·미·양·가 and the classroom 검, 검사, 확인, 합격 are included.
- Lettering: Jua, Do Hyeon, Black Han Sans, Gowun Dodum and Gaegu Bold (SIL OFL 1.1, google/fonts), subset to the stamps' letters in `fonts/`. Gowun Dodum is stroked slightly bolder, since cut rubber cannot hold its hairlines.
- Ink (`ink.ts`): one impression per stamp, seeded. The face is softened by about a pixel, its edge broken by paper tooth; pressure varies by a random tilt and slow blotches, and where it is low, paper grain shows through as pinholes; ink pools slightly along solid edges. Nine pad colours (red, crimson, blue, violet, navy, black, green, pink, orange). Each lands rotated up to ±7° and a little off centre.
- Layout: the paper is `#fbf9f3`; stamps sit in an auto-fill grid with cells at least 104 px wide (three columns on a phone, roughly 17–20 mm each, which is the size of a real stamp). Tapping a stamp presses it again with a new impression.

Sourcing: most web results for 참잘했어요 도장 are watermarked stock illustrations (크라우드픽 and others). They were not traced; only clean sources were.

Checks (2026-11-09): lint and typecheck. Seen in the browser at desktop width (10 columns). Impression cost 3.0 ms median and 12.9 ms max per stamp at 231 px, 220 ms for all 64. On first load this is spread over frames within 10 ms each. Nothing animates afterwards. Not yet seen on a phone.
