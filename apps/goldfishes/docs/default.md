# Goldfishes default

Route: `/default`

Short description: **Orthographic 3D goldfish attraction field.**

This is the promoted baseline formerly available at SCC's `/goldfishes/3d/1`.
One
participant observes and redirects 100 naturalistic goldfish by selecting grid
cells. The initial and reset view is exact-top orthographic; Alt-drag or
right-drag permits a full orbit, and the wheel controls bounded zoom.

Selected cells retain perimeter attraction, collision behavior, optional media
surfaces, and protected-cell behavior. Leva remains a collapsed authoring
surface rather than participant-facing interface chrome.

`apps/goldfishes/components/screen/archive/default` owns its complete model, renderer, atlas code,
media-source ledgers, screen, and styles. It does not supply code to dated
experiments. Promoting a future experiment means deliberately replacing this
directory while retaining that experiment under its original date.
