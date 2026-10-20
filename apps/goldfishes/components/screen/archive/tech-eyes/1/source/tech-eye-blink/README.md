# Tech eye sprite provenance

`001.json`–`080.json` map each source eye to its preserved generated original
and the 576×384 WebP used in the browser. Frames are 192×192; layout is 3×2.
The built-in imagegen tool generated the sheets; `../prepare-tech-eye-blink.mjs`
performs the user-approved web resizing/compression without altering the originals.

For the initial three sheets (001, 002, 005), see the trial prompt in the owning
[experiment document](../../../../../../docs/screen/tech-eyes/1.md).

Expansion prompt, applied independently to the matching source photograph:

> Identity-preserving edit for photographic blink sprite sheet. Output landscape
> exactly 3 columns by 2 rows of equal SQUARE frames, no margins, gaps, borders or
> labels. Input is the EXACT photographic eye crop to animate. Keep entire original
> square crop, exact eye size/position, original softness, low resolution detail,
> lighting, skin, eyebrow, glasses if present, identity. DO NOT beautify, upscale
> facial detail, add eyelashes, change eye gaze, zoom, or reframe. Six frames read
> left-to-right top then bottom: 1 original fully open; 2 upper eyelid 25% down;
> 3 upper eyelid 60% down; 4 upper eyelid 85% down; 5 fully naturally closed;
> 6 identical fully closed. Only eyelid changes. All other pixels especially nose
> outline, glasses, eyebrow and surrounding skin must align precisely across all
> cells. Natural photographic creases, no graphic mask. Eyeball stays stationary.
> Preserve source image color. For natural fast blink animation.

031, 053, and 062 initially encountered output-generation moderation failures.
The successful requests included their fully clothed source portraits as facial
anatomy context and explicitly requested an ordinary human-eye blink in the same
six-cell layout. 053 then received an opaque-skin correction because its first
result contained unwanted cutout artifacts. These are generated reconstructions,
not additional photographic observations of the people blinking.
