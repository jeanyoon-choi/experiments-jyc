// 액체's parameters, without the 액체: it is no longer offered (user, 2026-11-11) and nothing draws it — its GLSL
// (render/film.ts: the film's bands, swells and dye), the spheres' flat cap for it, its sliders and its 연출 (물방울,
// 얇은 막, 물든 막, 비눗막 · 검정) were removed 2026-11-18; bubble/8 still has them. Its uniforms' defaults stay in
// MATERIAL_DEFAULTS (index.ts), so a Look's type and saved 연출 that carry film* keep working: no program has a
// uniform of those names, and look.ts passes them over. What it was, and was drawn from:
//
// 액체 (bubble/8, user 2026-11-03): the objects and spheres as liquid, not as
// Koons's coated steel (NOTES 1023: his fetish is hardware, solid and
// unchanging; this work's is software, liquid, variable). The liquid is the
// bubbles' own — SCC bubble/1's drained films, Goldfishes bubble/1's pale drops
// on white — varied for this work's white studio, objects seen from above at a
// tilt, ~800 of them, melting into one another.
//
// References, looked at (2026-11-03):
//   - the old routes, frame by frame: SCC bubble/1 (grey films on black, wavy
//     level drainage bands, bright walls, rainbow only at the walls), SCC
//     bubble/3, Goldfishes bubble/1 (pale drops on white, soft grey wavy
//     reflections, a darker crescent inside the rim);
//   - Shinichi Maruyama's Water Sculptures, clear water thrown against white
//     (https://www.google.com/search?q=Shinichi+Maruyama+water+sculpture&udm=2 —
//     Bruce Silverstein Gallery, Designboom);
//   - clear water splashes shot at high speed on white (Vecteezy, Dreamstime:
//     https://www.google.com/search?q=clear+water+splash+white+background+high+speed+photography+studio&udm=2);
//   - water drops on white paper and on a white plate (Vecteezy, Dreamstime,
//     Magnific: https://www.google.com/search?q=water+droplets+on+white+surface+macro+photograph&udm=2),
//     the drop as a lens (Don Komarechka,
//     https://petapixel.com/2019/06/05/shooting-water-droplet-refractions-for-magical-macro-images/);
//   - single soap bubbles and white foam on white and grey grounds (Shutterstock,
//     PNGimg, Vecteezy: https://www.google.com/search?q=soap+bubble+on+white+background+photograph+clear+grey&udm=2);
//   - soap foam in black and white (Alamy, Dreamstime, Vecteezy:
//     https://www.google.com/search?q=soap+bubbles+foam+black+and+white+photograph&udm=2);
//   - rippled water from above in black and white (Pexels, Unsplash, Alamy:
//     https://www.google.com/search?q=water+surface+ripples+from+above+white+tray+studio+photograph+black+and+white&udm=2);
//   - soap films in macro, their drained, swirled interference (Canon Ireland's
//     macro soap bubbles, Dreamstime:
//     https://www.google.com/search?q=soap+bubble+macro+photograph+white+background+film+swirl&udm=2;
//     drainage and black film rising from the rims,
//     https://engage.aps.org/dfd/resources/virtual-pressroom/2008-pressroom/soap-bubbles);
//   - an opaque liquid: Harold Edgerton's Milk Drop Coronet, 1957 (MoMA, Wikipedia:
//     https://www.google.com/search?q=Harold+Edgerton+milk+drop+coronet+1957&udm=2).
// Its colour (user, 2026-11-05: the 액체 colour chips and picker must really colour it), looked at:
//   - food-coloured water drops shot in macro (Stuart Willson's Liquid Fire, https://fstoppers.com/photo/485927;
//     dyed drops falling into plain water, https://www.talkphotography.co.uk/threads/waterdrop-collisions.368439/;
//     coloured drops on white, https://www.google.com/search?q=food+coloring+water+drop+on+white+macro&udm=2):
//     the colour is the light's path through the liquid — pale at a drop's thin outline, rich in its middle,
//     deepest in the dark band at its rim, its caustic focus a bright saturated spot, its highlights still white;
//   - dyed soap bubbles (https://uspto.report/patent/app/20120035311 — dyed solution blows nearly colourless
//     bubbles; dyed soap layers, https://www.flowvis.org/media/2013spring/GetWet/Reports/Lotem_Sella.pdf):
//     a dyed film is faintly tinted, its colour gathering where it is thick — the drained foot and the walls —
//     under the interference colours, which stay its own.
// Common to all of them, on a light ground:
//   1. It is mostly the ground seen through it: its body stays within a few
//      per cent of the white, with no grey fill and no mirrored room (that
//      reads as chrome or mercury, Koons's steel, which this replaces).
//   2. It is drawn by thin, crisp dark lines where its surface turns steep —
//      a narrow band at a drop's rim, a sheet's edges and folds (Maruyama), a
//      bubble's or foam wall's hairline — wider only the deeper the liquid.
//   3. Its moving surface leaves faint refraction lines and light caustic
//      brightening inside it, travelling; a thrown or melting liquid carries
//      many more, darker ones (Maruyama's rings).
//   4. It is mirror-smooth: the window or softbox comes back as a few sharp,
//      small, white highlights.
//   5. It never rests: swells and drainage keep every line sliding.
//   6. Colour only as a hairline in thin films at walls, never bands.
// What varies (sliders and looks): its depth (렌즈: a drop's broad band … a
// film's hairline), how much its skin moves (물결), the film's drained bands
// faint in it (몸), its dye (전파's strains, a brand), the ground (black in
// SCC bubble/1). Looks: 물방울 (drops and thrown water: 1–6 at full depth),
// 얇은 막 (bubbles and foam on white: hairlines, the bands, little depth), 물든
// 막, 비눗막 · 검정 (SCC bubble/1). Melting (Surface.melt) is when it is most
// liquid: its swells grow and quicken and its film flows with the currents —
// a smooth drop, never terraced into rings along its height (user, 2026-11-05).
//

export const FILM_DEFAULTS = {
  filmThickness: 900,
  filmColour: 0.2,
  filmSwirl: 1,
  filmFlow: 1,
  filmBody: 0.15,
  filmLens: 1,
  filmDye: 0.7,
  filmSheen: 0.03,
  filmEdge: 0.9,
  filmDome: 0.45,
  filmRipple: 0.9,
  filmRound: 0.85,
};
