# Hangman

`/mobile/hangman/1` (2026-10-26) is English hangman at [`/mobile/hangman/[experiment]`](../../../app/mobile/hangman/[experiment]/page.tsx).

- Words: forty Trump-vocabulary words and phrases (`model/words.ts`); spaces and hyphens show from the start, A–Z are guessed.
- Layout, top to bottom: the gallows fill the remaining height; the word, one underlined 1em slot per letter, sized to fit one line; the keyboard edge to edge at the bottom where the phone's own keyboard sits — iOS-light tray, white keys, QWERTY rows staggered by half a key and a key and a half on a 20-column grid. A correct key turns black, a wrong key fades into the tray.
- Figure: each miss first draws a 졸라맨 stroke (head, body, left arm, right arm, left leg, right leg), then dresses that part as Trump: orange face with pale goggle marks and swept yellow hair, navy jacket with a white shirt and an over-long red tie, navy sleeves with hands, navy trousers with black shoes. The sixth miss hangs him: X eyes, swaying from the beam. Solving the word dresses him completely, cuts the rope and drops him to the ground with both arms raised.
- Input: on-screen keys or a physical keyboard. After a game the keys give way to a round arrow (or Enter/Space) for the next random word.

History: the first version that day guessed Korean words by 두벌식 jamo with a plain 졸라맨; replaced at the user's request by English and the Trump dressing.

Static checks only (lint, typecheck); touch feel on a device is unverified.
