import type { SccArea } from "./areas";

export type SccExperimentRoute = {
  label: string;
  href: string;
};

/** A further family index that lists an experiment; its route stays canonical. */
export type SccExperimentAlias = {
  area: SccArea;
  family: string;
  /** Name inside the alias family; defaults to the canonical last segment. */
  slug?: string;
};

export type SccExperiment = {
  /** Stable id: the canonical route path without its leading slash. */
  key: string;
  area: SccArea;
  /** Family index path, e.g. `grid`, `sns/youtube`, `mobile/face-trace`. */
  family: string;
  /** Other families this experiment is an example of, e.g. a technique. */
  also?: readonly SccExperimentAlias[];
  /** ISO date the experiment was created. */
  date: string;
  /**
   * ISO date of its latest major revision: behaviour or meaning changed at the
   * user's request (not renames, moves, config, docs or refactors). The date
   * view lists the experiment under this date instead of `date`.
   */
  updated?: string;
  phrase: string;
  /** Device roles for multi-device experiments; the first is the primary link. */
  routes?: readonly SccExperimentRoute[];
};

export type SccNavigationItem = {
  key: string;
  area: SccArea;
  family: string;
  /** Latest activity: the major revision date, else the creation date. */
  date: string;
  /** Creation date, when the registry knows it. */
  created?: string;
  phrase: string;
  routes: readonly SccExperimentRoute[];
};

// Navigation index for every SCC experiment. Family `experiments.ts`
// registries stay authoritative for executable variants; add each new variant
// here with its creation date so it appears in the archive navigation, and
// set `updated` when a later request changes what it does (see AGENTS.md).
export const sccExperiments: readonly SccExperiment[] = [
  { key: "adaptive-coevolving-network/1", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-01", phrase: "Opinions and ties coevolve: adopt or rewire, consensus or fragmentation" },
  { key: "adaptive-coevolving-network/1-3d", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-05", phrase: "The same adopt-or-rewire voter network as a turning volume of luminous islands" },
  { key: "adaptive-coevolving-network/1-glsl", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-05", phrase: "The same adopt-or-rewire voter network as one neon gel of cells and swaying processes" },
  { key: "adaptive-coevolving-network/2", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-02", phrase: "Epidemic where the healthy cut ties to the infected and rewire among themselves" },
  { key: "adaptive-coevolving-network/3", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-02", phrase: "Prisoner's dilemma where players leave defectors and cooperators become hubs" },
  { key: "adaptive-coevolving-network/4", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-02", phrase: "Opinions choose who talks; homophily splits talk into two echo chambers" },
  { key: "adaptive-coevolving-network/5", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-02", phrase: "Blinking threshold network where still nodes gain inputs and busy ones lose them" },
  { key: "adaptive-coevolving-network/6", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-02", phrase: "News of a disease spreads online; the aware cut contact with the infected" },
  { key: "adaptive-coevolving-network/7", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-02", phrase: "Living web where each page's area is its PageRank and attention flows by rank" },
  { key: "adaptive-coevolving-network/7-glsl", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-06", phrase: "The same PageRank web as one gel of rank-sized cells and flowing links" },
  { key: "adaptive-coevolving-network/7-glsl-2", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-06", phrase: "The same PageRank gel with domed cells, stout roots and brighter main arteries" },
  { key: "adaptive-coevolving-network/7-glsl-3", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-07", phrase: "The PageRank web as a Turing tissue: dividing cells in pages, fibres along links" },
  { key: "adaptive-coevolving-network/7-glsl-4", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-07", phrase: "The PageRank tissue with small pages as tailed protists, spread wider" },
  { key: "adaptive-coevolving-network/7-glsl-5", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-07", phrase: "PageRank performed by a dividing colony of random surfers whose trail is the web" },
  { key: "adaptive-coevolving-network/7-glsl-6", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-07", phrase: "PageRank as a raft of soap bubbles, rank budding from bubble to bubble" },
  { key: "adaptive-coevolving-network/7-glsl-7", area: "complex-systems", family: "adaptive-coevolving-network", date: "2026-10-07", phrase: "PageRank as sumi ink drawn along currents on still water" },
  { key: "amoeba/1", area: "complex-systems", family: "amoeba", date: "2026-10-05", phrase: "Amoebae eat a bacterial lawn, divide into plaques and return in waves" },
  { key: "amoeba/2", area: "complex-systems", family: "amoeba", date: "2026-10-06", phrase: "Full-screen lawn where amoeba sizes are inherited, drift and differ wildly" },
  { key: "bubble/1", area: "complex-systems", family: "bubble", date: "2026-10-07", phrase: "The PageRank soap-bubble raft of 7-glsl-6, as the bubble family's baseline" },
  { key: "bubble/2", area: "complex-systems", family: "bubble", date: "2026-10-08", updated: "2026-10-09", phrase: "The same raft with its network and visual parameters open to adjustment" },
  { key: "bubble/3", area: "complex-systems", family: "bubble", date: "2026-10-10", updated: "2026-10-12", phrase: "The raft wearing Goldfishes' media — fixed per page, churning, or chasing a trend along the links" },
  { key: "bubble/failure/2", area: "complex-systems", family: "bubble", date: "2026-10-07", phrase: "Failure: Apollonian bubble rafts in five renderings, all rejected" },
  { key: "bubble/failure/3", area: "complex-systems", family: "bubble", date: "2026-10-07", phrase: "Failure: a coarsening foam drawn as pebbles, then neon blobs" },
  { key: "bubble/failure/4", area: "complex-systems", family: "bubble", date: "2026-10-07", phrase: "Failure: a circle-packed foam, slow, then a wireframe" },
  { key: "bubble/failure/5", area: "complex-systems", family: "bubble", date: "2026-10-07", phrase: "Failure: a GPU Potts foam with jagged lattice walls" },
  { key: "barabasi-albert/1", area: "complex-systems", family: "barabasi-albert", date: "2026-09-10", phrase: "Degree-proportional growth where early hubs accumulate links" },
  { key: "cellular-automata/colour/1", area: "complex-systems", family: "cellular-automata", date: "2026-08-13", phrase: "Binary Conway Life on a toroidal field with direct painting" },
  { key: "cellular-automata/colour/2", area: "complex-systems", family: "cellular-automata", date: "2026-08-13", phrase: "Three-state RGB successor transmission on a toroidal field" },
  { key: "cellular-automata/colour/3", area: "complex-systems", family: "cellular-automata", date: "2026-08-16", phrase: "Seven-colour cycle with stochastic transmission and mutation" },
  { key: "cellular-automata/colour/4", area: "complex-systems", family: "cellular-automata", date: "2026-08-16", phrase: "Background and text fields evolving in opposite colour cycles" },
  { key: "cellular-automata/colour/5", area: "complex-systems", family: "cellular-automata", date: "2026-08-16", phrase: "Nested square and circle layers, each with its own automaton" },
  { key: "cellular-automata/colour/6", area: "complex-systems", family: "cellular-automata", date: "2026-08-16", phrase: "Nested hexagon and circle layers with six-neighbour Life" },
  { key: "cellular-automata/grid-network/1", area: "complex-systems", family: "cellular-automata", date: "2026-09-04", phrase: "Independent binary background and border fields on a 24×24 grid" },
  { key: "cellular-automata/grid-network/2", area: "complex-systems", family: "cellular-automata", date: "2026-09-04", phrase: "Independent RGB fields with equal-state link disconnection" },
  { key: "cellular-automata/grid-network/3", area: "complex-systems", family: "cellular-automata", date: "2026-09-05", phrase: "Compact 3D cellular volume to rotate and zoom" },
  { key: "fractal/clock/1", area: "complex-systems", family: "fractal", date: "2026-08-28", phrase: "Recursive analogue clocks held at the tips of parent hands, optionally finger-skated" },
  { key: "fractal/clock/2", area: "complex-systems", family: "fractal", also: [{ area: "mobile", family: "mobile/finger-skating/clock" }], date: "2026-10-02", phrase: "Clock grid finger-skated: hour hands keep exit direction, minute hands follow the finger" },
  { key: "fractal/clock/3", area: "complex-systems", family: "fractal", also: [{ area: "mobile", family: "mobile/finger-skating/clock" }], date: "2026-10-02", phrase: "Finger-skated clock grid where each clock carries three clocks at its hand tips" },
  { key: "fractal/logo/1", area: "complex-systems", family: "fractal", date: "2026-10-05", phrase: "AI logos holding half-size copies of themselves at every tip, down to sub-pixel" },
  { key: "diffusion-graph/1", area: "complex-systems", family: "diffusion-graph", date: "2026-09-10", phrase: "Conserved value spreading over a lattice of rewired directed links" },
  { key: "erdos-renyi/1", area: "complex-systems", family: "erdos-renyi", date: "2026-09-10", phrase: "Independent-edge random graph with components set by probability p" },
  { key: "face-voronoi/1", area: "complex-systems", family: "face-voronoi", date: "2026-08-20", phrase: "Growing and dividing sites clip local portraits to Voronoi cells" },
  { key: "face-voronoi/2", area: "complex-systems", family: "face-voronoi", date: "2026-08-20", phrase: "Fertility-driven population of sites with switchable renderers" },
  { key: "face-voronoi/3", area: "complex-systems", family: "face-voronoi", date: "2026-08-20", phrase: "Nearest-feature bisector material field warped by the pointer" },
  { key: "financial-network/1", area: "complex-systems", family: "financial-network", date: "2026-09-10", phrase: "Named actors, debt and payment edges, and selectable liquidity locks" },
  { key: "financial-network/2", area: "complex-systems", family: "financial-network", date: "2026-09-10", phrase: "Rollover, payment and collateral dependence producing fragility" },
  { key: "financial-network/3", area: "complex-systems", family: "financial-network", date: "2026-09-10", phrase: "Live monetary field with edge width drawn from current flow" },
  { key: "financial-network/4", area: "complex-systems", family: "financial-network", date: "2026-09-10", phrase: "Only current transfers drawn, with circles sized by spendable cash" },
  { key: "financial-network/5", area: "complex-systems", family: "financial-network", date: "2026-09-10", phrase: "Adaptive actors that rewire relations, with a 200-household mode" },
  { key: "flight-visualisation/1", area: "complex-systems", family: "flight-visualisation", date: "2026-09-30", phrase: "Live ADS-B aircraft, trails and self-arranging labels after viz1090" },
  { key: "living-topology/1", area: "complex-systems", family: "living-topology", date: "2026-08-13", phrase: "Manual birth, death, connect and sever primitives on a graph" },
  { key: "living-topology/2", area: "complex-systems", family: "living-topology", date: "2026-08-13", phrase: "Autonomous local network driven by node energy and stimulus" },
  { key: "living-topology/3", area: "complex-systems", family: "living-topology", date: "2026-08-13", phrase: "Local network with adjustable parameters and curved relations" },
  { key: "living-topology/4", area: "complex-systems", family: "living-topology", date: "2026-08-13", phrase: "Local network rendered by entropy of node connections" },
  { key: "page-rank/1", area: "complex-systems", family: "page-rank", date: "2026-08-20", phrase: "Sparse directed web ranked by random surfers and diffusion" },
  { key: "page-rank/2", area: "complex-systems", family: "page-rank", date: "2026-09-04", phrase: "Denser web whose links rewire adaptively with visible flow" },
  { key: "page-rank/3", area: "complex-systems", family: "page-rank", date: "2026-09-05", phrase: "Rank shown as territory in a diagram over the sparse web" },
  { key: "self-evolving-network/1", area: "complex-systems", family: "self-evolving-network", date: "2026-10-01", phrase: "Fixed population rewiring itself through introductions and turnover" },
  { key: "void/1", area: "complex-systems", family: "void", date: "2026-09-01", phrase: "Vicsek-style flock where local coupling weight sets attractivity" },
  { key: "void/2", area: "complex-systems", family: "void", date: "2026-09-01", phrase: "Influence territories drawn in bands of relationship strength" },
  { key: "void/3", area: "complex-systems", family: "void", date: "2026-09-01", phrase: "Weighted-attractivity alignment rendered as a dense particle field" },
  { key: "attractor/1", area: "dynamical-systems", family: "attractor", date: "2026-08-28", phrase: "Up to 20 RK4 orbits with short trails over a fixed trace" },
  { key: "attractor/2", area: "dynamical-systems", family: "attractor", date: "2026-09-01", phrase: "Reference and companion orbit separation with a finite-time λT" },
  { key: "attractor/3", area: "dynamical-systems", family: "attractor", date: "2026-09-01", phrase: "Density of 30,000 GPU-resident states on a fixed field" },
  { key: "bifurcation/1", area: "dynamical-systems", family: "bifurcation", date: "2026-09-03", phrase: "Logistic-map particles splitting from one state to chaos as r steps" },
  { key: "bifurcation/2", area: "dynamical-systems", family: "bifurcation", date: "2026-09-30", phrase: "Particles each iterating a map at their own parameter, settling into the cascade" },
  { key: "bifurcation/3", area: "dynamical-systems", family: "bifurcation", date: "2026-09-30", phrase: "A 3D particle flow living through splits, loops and chaos as its parameter drifts" },
  { key: "duffing/1", area: "dynamical-systems", family: "duffing", date: "2026-09-01", phrase: "Driven, damped nonlinear oscillator with editable coefficients" },
  { key: "duffing/2", area: "dynamical-systems", family: "duffing", date: "2026-09-30", phrase: "Oscillators rolling in a double well tilted around one ring of drive phase" },
  { key: "duffing/3", area: "dynamical-systems", family: "duffing", date: "2026-09-30", phrase: "The double-well ring under a slowly drifting drive, from two wells to chaos and back" },
  { key: "orbital-resonance/1", area: "dynamical-systems", family: "orbital-resonance", date: "2026-09-30", phrase: "Test particles around a star and planet whose period-matched orbits stand still" },
  { key: "three-body/1", area: "dynamical-systems", family: "three-body", date: "2026-09-01", phrase: "Burrau's unequal-mass Pythagorean orbit problem" },
  { key: "three-body/2", area: "dynamical-systems", family: "three-body", date: "2026-09-10", phrase: "Softened N-body trial with 3 to 32 elements and force links" },
  { key: "normal-distribution/1", area: "statistical-modelling", family: "normal-distribution", date: "2026-09-03", phrase: "Static bivariate normal density at fixed particle positions" },
  { key: "normal-distribution/2", area: "statistical-modelling", family: "normal-distribution", date: "2026-09-03", phrase: "Twelve bounded increments summing into an empirical density envelope" },
  { key: "normal-distribution/3", area: "statistical-modelling", family: "normal-distribution", date: "2026-09-03", phrase: "3D random-walk endpoints and paths with correlated x and y" },
  { key: "normal-distribution/4", area: "statistical-modelling", family: "normal-distribution", date: "2026-09-04", phrase: "Static terrain from a union of nearest normal densities" },
  { key: "normal-distribution/5", area: "statistical-modelling", family: "normal-distribution", date: "2026-09-04", phrase: "Static terrain of variable-radius peaks under a Gaussian envelope" },
  { key: "github/1", area: "dashboard", family: "github", date: "2026-09-03", phrase: "Signed-out GitHub homepage first viewport rebuilt as an editable page" },
  { key: "github/2", area: "dashboard", family: "github", date: "2026-09-03", phrase: "Wheel and touch input morph the flat GitHub surface into a cylinder or torus" },
  { key: "palantir/1", area: "dashboard", family: "palantir", date: "2026-07-23", phrase: "Map-first global situation monitor with event feeds and live video" },
  { key: "stock/default", area: "dashboard", family: "stock", date: "2026-07-10", phrase: "Original stock-card dashboard with historical records" },
  { key: "stock/2", area: "dashboard", family: "stock", date: "2026-07-06", phrase: "Bloomberg-style terminal with command-driven function screens" },
  { key: "stock/3", area: "dashboard", family: "stock", date: "2026-07-16", phrase: "Dense Bloomberg workstation reconstructed from a reference image" },
  { key: "stock/4", area: "dashboard", family: "stock", date: "2026-07-16", phrase: "Stock 3 workstation whose hovered panels become cat photographs" },
  { key: "stock/1", area: "dashboard", family: "stock", date: "2026-07-10", phrase: "Phone tilt drives three synthetic stocks on a shared screen", routes: [{ label: "screen", href: "/stock/1/screen" }, { label: "mobile", href: "/stock/1/mobile" }] },
  { key: "aerodynamics/1", area: "standalone", family: "aerodynamics", date: "2026-09-08", phrase: "Arrows advected through a 3D Arnold-Beltrami-Childress flow" },
  { key: "aerodynamics/2", area: "standalone", family: "aerodynamics", date: "2026-09-08", phrase: "The same ABC flow carried by 300 raised-middle-finger hand models" },
  { key: "bastille-day/1", area: "standalone", family: "bastille-day", date: "2026-07-15", phrase: "Thirty full-viewport parade and revolution images under one Marseillaise loop" },
  { key: "bastille-day/2", area: "standalone", family: "bastille-day", date: "2026-07-15", phrase: "Bastille Day image sequence with a curated dark source set and playback control" },
  { key: "chess/1", area: "standalone", family: "chess", date: "2026-09-08", phrase: "Self-playing chess board with staggered relation-edge drawing and side gutters" },
  { key: "chess/2", area: "standalone", family: "chess", date: "2026-09-08", phrase: "Baseline board copy with plain margin controls and no gutters" },
  { key: "chess/3", area: "standalone", family: "chess", date: "2026-09-09", phrase: "Chess relations mapped onto a twisted continuous three-dimensional surface" },
  { key: "chess/4", area: "standalone", family: "chess", date: "2026-09-09", phrase: "Viewport-filling field of independent simultaneous chess games" },
  { key: "cv/1", area: "standalone", family: "cv", date: "2026-07-09", phrase: "A4 CV generator navigated by pointer position across job family and experience" },
  { key: "cv/2", area: "standalone", family: "cv", date: "2026-07-09", phrase: "Scrollable 100 by 100 plane of generated CVs" },
  { key: "cv/3", area: "standalone", family: "cv", date: "2026-07-09", phrase: "Scrollable CV plane of parallel-universe versions of one named person" },
  { key: "grid/1", area: "standalone", family: "grid", date: "2026-07-25", phrase: "Ten by ten source-credited media grid" },
  { key: "grid/2", area: "standalone", family: "grid", date: "2026-07-25", phrase: "Eighty-cell random image field with album, speed and diversity controls" },
  { key: "grid/3", area: "standalone", family: "grid", date: "2026-08-06", phrase: "Mutable rectangular composition of media cells" },
  { key: "grid/4", area: "standalone", family: "grid", date: "2026-08-06", phrase: "Rectangles flashing over a persistent unit field" },
  { key: "grid/5", area: "standalone", family: "grid", date: "2026-08-06", phrase: "Orthogonal media field placed at random coordinates" },
  { key: "macos/1", area: "standalone", family: "macos", date: "2026-07-10", phrase: "macOS menu bar with populated menus and monochrome status icons" },
  { key: "desktop-collage/primitives/2", area: "desktop-collage", family: "desktop-collage/primitives", date: "2026-10-05", phrase: "Chrome app windows each hold a sphere of one desktop-wide field; brought close, they connect" },
  { key: "desktop-collage/primitives/1", area: "desktop-collage", family: "desktop-collage/primitives", date: "2026-10-05", phrase: "Real Safari windows open one by one or all at once until their rectangles trace a heart" },
  { key: "desktop-collage/hype/1", area: "desktop-collage", family: "desktop-collage/hype", date: "2026-10-09", phrase: "Under one keyword, real pages and cloned services open at a stochastic rhythm while a reader scrolls, writes and follows links" },
  { key: "desktop-collage/hype/2", area: "desktop-collage", family: "desktop-collage/hype", date: "2026-10-10", updated: "2026-10-11", phrase: "Two dozen browser-sized windows of AI fear-of-missing-out pour in, then one attention flicks among them for twenty seconds" },
  { key: "desktop-collage/hype/3", area: "desktop-collage", family: "desktop-collage/hype", date: "2026-10-11", phrase: "The same AI fear-of-missing-out as a scatter of same-sized phone windows, pages served and scaled as phone pages, flicked through" },
  { key: "advertisement/tv/korean/1", area: "advertisement", family: "advertisement/tv/korean", date: "2026-10-09", phrase: "LINA OK Silver 120-second direct-response spot, scene by scene, with measured caption and bar layers" },
  { key: "advertisement/tv/korean/2", area: "advertisement", family: "advertisement/tv/korean", date: "2026-10-09", phrase: "Heungkuk Life family-love dementia care 120-second direct-response spot, scene by scene" },
  { key: "advertisement/tv/korean/3", area: "advertisement", family: "advertisement/tv/korean", date: "2026-10-09", phrase: "AIA Life family dementia 60-second direct-response spot, scene by scene" },
  { key: "advertisement/tv/korean/4", area: "advertisement", family: "advertisement/tv/korean", date: "2026-10-09", phrase: "Heungkuk Life Dasarang 3N5 health 60-second direct-response spot, scene by scene" },
  { key: "advertisement/tv/korean/5", area: "advertisement", family: "advertisement/tv/korean", date: "2026-10-09", phrase: "Daytime direct-response analysis spot: a centred 6-, 5- and 3-axis radar chart per scene" },
  { key: "advertisement/tv/american/1", area: "advertisement", family: "advertisement/tv/american", date: "2026-10-09", phrase: "2003 mesothelioma law-firm spot: embossed Times captions on a grey 4:3 card, scene by scene" },
  { key: "advertisement/tv/american/2", area: "advertisement", family: "advertisement/tv/american", date: "2026-10-09", phrase: "Colonial Penn 120-second daytime life-insurance spot: P___ blanks, checklist, $9.95 supers, phone bar" },
  { key: "advertisement/tv/archive/korean-1", area: "advertisement", family: "advertisement/tv/archive", date: "2026-10-09", phrase: "Failure: LINA Life X-ray spot redrawn as flat vector illustration, rejected for quality" },
  { key: "advertisement/tv/archive/american-1", area: "advertisement", family: "advertisement/tv/archive", date: "2026-10-09", phrase: "Failure: Ozempic \"Oh!\" redrawn as flat vector illustration, rejected for quality" },
  { key: "advertisement/tv/grid/1", area: "advertisement", family: "advertisement/tv/grid", date: "2026-10-14", phrase: "korean/5 tiled as a wall of 16:9 television screens: 1–4 rows, gap and margin, like mobiles/2" },
  { key: "advertisement/tv/grid/2", area: "advertisement", family: "advertisement/tv/grid", date: "2026-10-14", phrase: "The polygon chart alone as the unit: hexagons packed edge to edge in rows, held fully drawn" },
  { key: "advertisement/tv/grid/3", area: "advertisement", family: "advertisement/tv/grid", date: "2026-10-14", phrase: "One unbroken honeycomb of hexagon charts on a single canvas, each cell its own data and phase; densities 1/1 to 1/7" },
  { key: "dimensions/xyzt-city/1", area: "dimensions", family: "dimensions/xyzt-city", date: "2026-10-03", phrase: "Lower Manhattan as building lifespans in x, y and time, raised into a city by a height threshold" },
  { key: "mobiles/1", area: "standalone", family: "mobiles", date: "2026-10-03", phrase: "Ninety phones living one stochastic New York weekday on a shared clock" },
  { key: "mobiles/1/mobile-testing", area: "standalone", family: "mobiles", date: "2026-10-04", phrase: "The same phone OS to use by hand: lock screen, home screen and every app" },
  { key: "mobiles/2", area: "standalone", family: "mobiles", date: "2026-10-11", updated: "2026-10-14", phrase: "Instagram, TikTok, X and YouTube clones live side by side at phone width, in one to six rows, with substitution/3's in-place filter" },
  { key: "splice/1", area: "standalone", family: "splice", date: "2026-09-16", phrase: "Two-source audio instrument for finding, repeating, mixing and interrupting fragments" },
  { key: "spoon-class/default", area: "standalone", family: "spoon-class", date: "2026-09-08", phrase: "Upstream Chrome dino game embedded unchanged in one viewport frame" },
  { key: "spoon-class/1", area: "standalone", family: "spoon-class", date: "2026-09-08", phrase: "Chrome dino repeated as a responsive field of game modules" },
  { key: "spoon-class/2", area: "standalone", family: "spoon-class", date: "2026-09-08", phrase: "Dino field where a pixel human ages past tests and life blocks, less dense or dense" },
  { key: "spoon-class/3", area: "standalone", family: "spoon-class", date: "2026-10-03", phrase: "Mobile stack of full-width human-life dino games, eight to a screen by default" },
  { key: "swarm/1", area: "standalone", family: "swarm", date: "2026-07-14", phrase: "Neutral flock field with adjustable separation, alignment and cohesion" },
  { key: "swarm/2", area: "standalone", family: "swarm", date: "2026-07-14", phrase: "Flock confined to a world coastline map with a latitude-longitude graticule" },
  { key: "swarm/3", area: "standalone", family: "swarm", date: "2026-07-17", phrase: "Map clicks launch missile salvos that the flock steers away from" },
  { key: "transportation/road-signs/archive", area: "standalone", family: "transportation/road-signs", date: "2026-10-06", phrase: "Reference archive: every current Korean traffic safety sign and road marking, 101 to 549, in its official order" },
  { key: "transportation/road-signs/direction/1", area: "standalone", family: "transportation/road-signs/direction", date: "2026-10-06", phrase: "One large 305–307 instruction sign whose arrow turns through the full circle toward the pointer" },
  { key: "transportation/road-signs/direction/2", area: "standalone", family: "transportation/road-signs/direction", date: "2026-10-07", phrase: "Fractal of three-way signs: straight, left and right each open into smaller straight, left and right signs" },
  { key: "transportation/road-signs/direction/3", area: "standalone", family: "transportation/road-signs/direction", date: "2026-10-07", phrase: "One large sign whose single arrow branches straight, left and right, and every branch branches again, endlessly" },
  { key: "transportation/road-signs/direction/4", area: "standalone", family: "transportation/road-signs/direction", also: [{ area: "mobile", family: "mobile/finger-skating/road-sign", slug: "1" }], date: "2026-10-07", phrase: "A grid of instruction signs finger-skated: each arrow keeps the direction the finger left it" },
  { key: "transportation/traffic-light/1", area: "standalone", family: "transportation/traffic-light", date: "2026-10-06", phrase: "Korean signal heads on a galvanised cantilever pole, cycling through real junction timing plans" },
  { key: "transportation/traffic-light/2", area: "standalone", family: "transportation/traffic-light", date: "2026-10-06", phrase: "The same signal pole repeated fifty times down one straight road" },
  { key: "reference", area: "standalone", family: "reference", date: "2026-09-02", phrase: "Working visual references for when a question stays open" },
  { key: "ui/buttons/1", area: "ui", family: "ui/buttons", date: "2026-09-04", phrase: "YouTube Subscribe button as a field toggled by a mouse sweep" },
  { key: "ui/buttons/2", area: "ui", family: "ui/buttons", date: "2026-09-04", phrase: "LinkedIn Connect button field progressing through Pending to Connected" },
  { key: "ui/buttons/3", area: "ui", family: "ui/buttons", date: "2026-09-04", phrase: "MP3 transport circles cycling Play, Pause and Stop under the pointer" },
  { key: "ui/smile/1", area: "ui", family: "ui/smile", date: "2026-09-04", phrase: "Airport satisfaction buttons propagating responses across a field" },
  { key: "ui/smile/2", area: "ui", family: "ui/smile", date: "2026-09-04", phrase: "Concentric smiling faces, each turned one further degree" },
  { key: "parametric-interface/whole", area: "parametric-interface", family: "parametric-interface", date: "2026-08-16", phrase: "One continuous lyric moving through randomly selected wrappers" },
  { key: "parametric-interface/1", area: "parametric-interface", family: "parametric-interface", date: "2026-08-15", phrase: "Binary response field" },
  { key: "parametric-interface/2", area: "parametric-interface", family: "parametric-interface", date: "2026-08-15", phrase: "Lyric words held in individual spreadsheet centre-row cells" },
  { key: "parametric-interface/3", area: "parametric-interface", family: "parametric-interface", date: "2026-08-15", phrase: "macOS menu-bar field with a central lyric" },
  { key: "parametric-interface/4", area: "parametric-interface", family: "parametric-interface", date: "2026-08-15", phrase: "Fixed high-density departure FIDS with lyric destinations" },
  { key: "parametric-interface/5", area: "parametric-interface", family: "parametric-interface", date: "2026-08-15", phrase: "Gmail inbox where starred mail accumulates and lyric messages arrive in the stream" },
  { key: "parametric-interface/6", area: "parametric-interface", family: "parametric-interface", date: "2026-08-15", phrase: "zsh terminal line with lyric developed inside a printf argument" },
  { key: "parametric-interface/7", area: "parametric-interface", family: "parametric-interface", date: "2026-08-15", phrase: "Engineering lecture note with lyric words held in ordered outline slots" },
  { key: "dj/1", area: "multi-device", family: "dj", date: "2026-07-09", phrase: "Four-screen K4 graph where controller gestures target nodes and edges", routes: [{ label: "controller", href: "/dj/1/controller" }, { label: "screen/1", href: "/dj/1/screen/1" }, { label: "screen/2", href: "/dj/1/screen/2" }, { label: "screen/3", href: "/dj/1/screen/3" }, { label: "screen/4", href: "/dj/1/screen/4" }, { label: "screen/whole", href: "/dj/1/screen/whole" }] },
  { key: "dj/2", area: "multi-device", family: "dj", date: "2026-09-14", phrase: "Distributed lyric channels toggled by initial consonant across browsers", routes: [{ label: "controller", href: "/dj/2/controller" }, { label: "screen", href: "/dj/2/screen" }] },
  { key: "dj/3", area: "multi-device", family: "dj", date: "2026-09-14", phrase: "Distributed word video cut by selected letters of the spoken text", routes: [{ label: "controller", href: "/dj/3/controller" }, { label: "screen", href: "/dj/3/screen" }] },
  { key: "network-system/default", area: "multi-device", family: "network-system", date: "2026-07-12", phrase: "Probability chain reseeded at a node and observed across four screens", routes: [{ label: "controller", href: "/network-system/default/controller" }, { label: "screen/1", href: "/network-system/default/screen/1" }, { label: "screen/2", href: "/network-system/default/screen/2" }, { label: "screen/3", href: "/network-system/default/screen/3" }, { label: "screen/4", href: "/network-system/default/screen/4" }, { label: "screen/whole", href: "/network-system/default/screen/whole" }] },
  { key: "network-system/macro-economy", area: "multi-device", family: "network-system", date: "2026-07-12", phrase: "Signed four-institution dynamics of central bank, treasury, banks and economy", routes: [{ label: "controller", href: "/network-system/macro-economy/controller" }, { label: "screen/1", href: "/network-system/macro-economy/screen/1" }, { label: "screen/2", href: "/network-system/macro-economy/screen/2" }, { label: "screen/3", href: "/network-system/macro-economy/screen/3" }, { label: "screen/4", href: "/network-system/macro-economy/screen/4" }, { label: "screen/whole", href: "/network-system/macro-economy/screen/whole" }] },
  { key: "network-system/cycle", area: "multi-device", family: "network-system", date: "2026-07-14", phrase: "Nine-node macro cycle with news, employment and graph screens", routes: [{ label: "controller", href: "/network-system/cycle/controller" }, { label: "screen/news", href: "/network-system/cycle/screen/news" }, { label: "screen/employment", href: "/network-system/cycle/screen/employment" }, { label: "screen/employment-2", href: "/network-system/cycle/screen/employment-2" }, { label: "screen/graphs", href: "/network-system/cycle/screen/graphs" }, { label: "screen/graphs-2", href: "/network-system/cycle/screen/graphs-2" }, { label: "screen/left", href: "/network-system/cycle/screen/left" }, { label: "screen/right", href: "/network-system/cycle/screen/right" }, { label: "screen/whole", href: "/network-system/cycle/screen/whole" }] },
  { key: "network-system/population", area: "multi-device", family: "network-system", date: "2026-07-13", phrase: "Seven annual flows between juvenile, single, partnered and deceased stocks", routes: [{ label: "controller", href: "/network-system/population/controller" }, { label: "screen/1", href: "/network-system/population/screen/1" }, { label: "screen/2", href: "/network-system/population/screen/2" }, { label: "screen/3", href: "/network-system/population/screen/3" }, { label: "screen/4", href: "/network-system/population/screen/4" }, { label: "screen/whole", href: "/network-system/population/screen/whole" }] },
  { key: "network-system/competitive-firms", area: "multi-device", family: "network-system", date: "2026-07-13", phrase: "Four competing firms whose management decisions shift market share", routes: [{ label: "controller", href: "/network-system/competitive-firms/controller" }, { label: "screen/1", href: "/network-system/competitive-firms/screen/1" }, { label: "screen/2", href: "/network-system/competitive-firms/screen/2" }, { label: "screen/3", href: "/network-system/competitive-firms/screen/3" }, { label: "screen/4", href: "/network-system/competitive-firms/screen/4" }, { label: "screen/whole", href: "/network-system/competitive-firms/screen/whole" }] },
  { key: "sns/mobile/1", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "Design shop with product options, bag and local order" },
  { key: "sns/mobile/2", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "Neighborhood meals with customization and delivery or pickup" },
  { key: "sns/mobile/3", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "Small-stay search with dates, guests and local reservations" },
  { key: "sns/mobile/4", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "Team task board with checklists, comments and inbox" },
  { key: "sns/mobile/5", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "Secondhand market with saved listings and local chat" },
  { key: "sns/mobile/6", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "British fashion resale filtered by category and UK size" },
  { key: "sns/mobile/7", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "New York food ordering with delivery or pickup" },
  { key: "sns/mobile/8", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "British rail with outbound and return fare selection" },
  { key: "sns/mobile/9", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "US fitness class booking with studios and credits" },
  { key: "sns/mobile/10", area: "mobile", family: "sns/mobile", date: "2026-09-23", phrase: "London neighbourhood marketplace with nearby items and chat" },
  { key: "sns/mobile/11", area: "mobile", family: "sns/mobile", date: "2026-09-23", updated: "2026-10-11", phrase: "Instagram replica linking feed, stories, Reels and profiles" },
  { key: "sns/mobile/12", area: "mobile", family: "sns/mobile", date: "2026-09-23", updated: "2026-10-11", phrase: "TikTok replica of video feed, comments, search and creators" },
  { key: "sns/mobile/13", area: "mobile", family: "sns/mobile", date: "2026-09-23", updated: "2026-10-11", phrase: "X replica of timeline, threads, search and composer" },
  { key: "sns/mobile/14", area: "mobile", family: "sns/mobile", date: "2026-10-11", phrase: "YouTube replica with watch page, miniplayer, Shorts and library" },
  { key: "sns/feed/1", area: "sns", family: "sns/feed", date: "2026-07-09", phrase: "Instagram-style feed wrapping through 100 predefined posts" },
  { key: "sns/instagram/1", area: "sns", family: "sns/instagram", date: "2026-09-03", phrase: "Reconstruction of one supplied Instagram home frame" },
  { key: "sns/instagram/2", area: "sns", family: "sns/instagram", date: "2026-09-03", phrase: "Story-bubble grid with independent per-cell state loops" },
  { key: "sns/instagram/3", area: "sns", family: "sns/instagram", date: "2026-09-04", phrase: "Story grid with states propagating between neighbouring cells" },
  { key: "sns/instagram/3-finger", area: "sns", family: "sns/instagram", date: "2026-09-24", phrase: "Story grid activated by one continuous finger gesture" },
  { key: "sns/instagram/4", area: "sns", family: "sns/instagram", date: "2026-09-07", phrase: "Propagating story grid with tech keywords and session memory" },
  { key: "sns/navigation/default", area: "sns", family: "sns/navigation", date: "2026-07-09", phrase: "Floating Instagram tab bar with finger-skating selection" },
  { key: "sns/navigation/1", area: "sns", family: "sns/navigation", date: "2026-07-09", phrase: "Two five-part cycles compared: a day and a lifetime" },
  { key: "sns/navigation/2", area: "sns", family: "sns/navigation", date: "2026-08-28", phrase: "Instagram post-action row stacked as finger-skating groups" },
  { key: "sns/youtube/1", area: "sns", family: "sns/youtube", date: "2026-07-16", phrase: "Long-form video platform linking discovery, playback and library" },
  { key: "sns/youtube/2", area: "sns", family: "sns/youtube", date: "2026-07-17", phrase: "Dark mobile YouTube reconstruction from supplied references" },
  { key: "sns/youtube/3", area: "sns", family: "sns/youtube", date: "2026-08-27", phrase: "YouTube 2 stretched to fill the opposite device viewport" },
  { key: "sns/youtube/4", area: "sns", family: "sns/youtube", date: "2026-08-27", phrase: "Three inverted YouTube 2 surfaces tiled in one viewport" },
  { key: "sns/youtube/5", area: "sns", family: "sns/youtube", date: "2026-08-27", phrase: "Native-scale YouTube 2 repeated in parametric narrow columns" },
  { key: "sns/youtube/6", area: "sns", family: "sns/youtube", date: "2026-08-27", phrase: "YouTube desktop with an eight-column grid of half-scale cards" },
  { key: "sns/linkedin/1", area: "sns", family: "sns/linkedin", date: "2026-07-17", phrase: "Responsive LinkedIn home and jobs with separate mobile layout" },
  { key: "sns/linkedin/2", area: "sns", family: "sns/linkedin", date: "2026-09-13", phrase: "LinkedIn desktop feed rebuilt from screenshot and observations" },
  { key: "sns/linkedin/3", area: "sns", family: "sns/linkedin", date: "2026-09-13", phrase: "LinkedIn 2 modules as freely draggable, nested canvas layers" },
  { key: "sns/linkedin/4", area: "sns", family: "sns/linkedin", date: "2026-09-13", phrase: "LinkedIn 2 with all text shifted by a code point offset" },
  { key: "sns/linkedin/5", area: "sns", family: "sns/linkedin", date: "2026-09-13", phrase: "LinkedIn 2 covered in colour planes by pointer contact" },
  { key: "sns/linkedin/6", area: "sns", family: "sns/linkedin", date: "2026-09-14", phrase: "LinkedIn 2 components as live 3D cylinders" },
  { key: "sns/linkedin/6-test", area: "sns", family: "sns/linkedin", date: "2026-09-14", phrase: "Preserved failed texture-capture cylinder renderer" },
  { key: "mobile/finger-network/1", area: "mobile", family: "mobile/finger-network", date: "2026-09-28", phrase: "Each touch as a node joined to every other touch" },
  { key: "mobile/finger-network/2", area: "mobile", family: "mobile/finger-network", date: "2026-09-28", phrase: "Five touches driving one moving 2D human figure" },
  { key: "mobile/finger-network/3", area: "mobile", family: "mobile/finger-network", date: "2026-10-02", phrase: "Touch sessions leave fading graphs, optionally carrying people" },
  { key: "mobile/finger-network/4", area: "mobile", family: "mobile/finger-network", date: "2026-10-02", phrase: "Touch-born people join a love society or an up/down political landscape" },
  { key: "mobile/finger-skating/default", area: "mobile", family: "mobile/finger-skating", date: "2026-09-25", phrase: "Arrow field changed by a moving finger, three options" },
  { key: "mobile/ui-collage/loading/1", area: "mobile", family: "mobile/ui-collage/loading", date: "2026-10-03", phrase: "A grid of cloned phone loaders that restart wherever a finger skates" },
  { key: "mobile/ui-collage/loading/2", area: "mobile", family: "mobile/ui-collage/loading", date: "2026-10-03", updated: "2026-10-13", phrase: "Full-width progress bars from MS-DOS to Fluent, set to where a finger crosses" },
  { key: "mobile/ui-collage/loading/3", area: "mobile", family: "mobile/ui-collage/loading", date: "2026-10-13", phrase: "Progress bars made of the word LOADING in random faces and languages, inked in where a finger crosses" },
  { key: "mobile/ui-collage/sliders/1", area: "mobile", family: "mobile/ui-collage/sliders", date: "2026-10-03", phrase: "Narrow vertical sliders from Windows 95 to Material 3, drawn and played like a pentatonic equalizer" },
  { key: "mobile/ui-collage/sliders/2", area: "mobile", family: "mobile/ui-collage/sliders", date: "2026-10-13", phrase: "Sliders made of the word SLIDER turned on its side, stretched up to where a finger crosses" },
  { key: "mobile/ui-collage/volume/1", area: "mobile", family: "mobile/ui-collage/volume", date: "2026-10-13", phrase: "A spectrum visualiser whose bars are the word being sung, stretched by the loudness of each band" },
  { key: "mobile/lucky-ticket/1", area: "mobile", family: "mobile/lucky-ticket", date: "2026-09-28", phrase: "Scratch-off fortune with one-line text and seconds counter" },
  { key: "mobile/lucky-ticket/2", area: "mobile", family: "mobile/lucky-ticket", date: "2026-09-28", phrase: "Scratch-off fortune with a long centered scolding text" },
  { key: "mobile/lucky-ticket/3", area: "mobile", family: "mobile/lucky-ticket", date: "2026-09-28", phrase: "Scratch-off fortune with scattered single-line words" },
  { key: "mobile/arithmetic/default", area: "mobile", family: "mobile/arithmetic", date: "2026-10-09", phrase: "Four Instagram post actions as 사칙연산 in Instagram dark-mode colours" },
  { key: "mobile/arithmetic/calculator", area: "mobile", family: "mobile/arithmetic", date: "2026-10-09", phrase: "iOS Calculator whose ÷ × − + are Instagram's like, comment, repost and share" },
  { key: "mobile/arithmetic/1", area: "mobile", family: "mobile/arithmetic", date: "2026-10-09", phrase: "Taps and finger-skating trails place the four SNS actions at random" },
  { key: "mobile/arithmetic/fractal", area: "mobile", family: "mobile/arithmetic", date: "2026-10-09", phrase: "Each SNS action traced edge by edge by smaller copies of itself, four to switch between" },
  { key: "mobile/suneung/default", area: "mobile", family: "mobile/suneung", date: "2026-10-13", phrase: "The 2026 수능 국어 홀수형 booklet, all twenty pages rebuilt in DOM from the KICE PDF" },
  { key: "mobile/suneung/math", area: "mobile", family: "mobile/suneung", date: "2026-10-13", phrase: "The 2026 수능 수학 홀수형 booklet in DOM, HWP equations set as live Latin Modern text" },
  { key: "mobile/face-trace/1", area: "mobile", family: "mobile/face-trace", date: "2026-09-30", phrase: "Live eyes and mouth inside a liquid lattice of themselves" },
  { key: "mobile/gaze-tracking/1", area: "mobile", family: "mobile/gaze-tracking", date: "2026-09-24", phrase: "Two dots following the left and right iris positions" },
  { key: "mobile/gaze-tracking/2", area: "mobile", family: "mobile/gaze-tracking", date: "2026-09-25", phrase: "Gaze-driven circles, liquid or mesh distortion over the clones" },
  { key: "mobile/transform/pixelate", area: "mobile", family: "mobile/transform/pixelate", date: "2026-09-24", phrase: "Adjustable viewport pixelation over any of the clones" },
  { key: "mobile/transform/substitution/1", area: "mobile", family: "mobile/transform/substitution", date: "2026-09-25", phrase: "Clones swapped for object outlines or representative colors" },
  { key: "mobile/transform/substitution/2", area: "mobile", family: "mobile/transform/substitution", date: "2026-09-25", phrase: "Clone targets replaced by uppercase command words" },
  { key: "mobile/transform/substitution/3", area: "mobile", family: "mobile/transform/substitution", date: "2026-10-13", phrase: "Instagram, TikTok, X and YouTube with every text run, icon, image and box replaced in place by a command word filling it" },
  { key: "mobile/transform/language/1", area: "mobile", family: "mobile/transform/language", date: "2026-10-03", phrase: "Every interface label drifting through 40 literal translations by Markov chain" },
  { key: "ar/chemical-decomposition/1", area: "ar", family: "ar/chemical-decomposition", date: "2026-10-13", phrase: "The camera's view written over with the chemical formulas of what each thing is made of" },
  { key: "mobile/transform/decomposition", area: "mobile", family: "mobile/transform/decomposition", date: "2026-10-03", phrase: "Interface taken apart into atoms, each sorted beside its kind, still clickable" },
  { key: "mobile/transform/finger-decomposition", area: "mobile", family: "mobile/transform/finger-decomposition", date: "2026-10-07", phrase: "Interface as a liquid sheet in WebGL: a finger carries the element it holds, the rest flows around it" },
  { key: "mobile/transform/stretch", area: "mobile", family: "mobile/transform/stretch", date: "2026-10-13", phrase: "Every photograph stretched in height from x0.3 to x12 while width stays, the feed reflowing around it" },
  { key: "mobile/semantic-instagram/1", area: "mobile", family: "mobile/semantic-instagram", date: "2026-10-18", phrase: "Instagram alone, every text run, icon, picture and box replaced in place by a command word: 주의, Didot, no frames, a 1 px edge, white on black" },
];

function toNavigationItem(experiment: SccExperiment): SccNavigationItem {
  return {
    key: experiment.key,
    area: experiment.area,
    family: experiment.family,
    date: experiment.updated ?? experiment.date,
    created: experiment.date,
    phrase: experiment.phrase,
    routes: experiment.routes ?? [
      { label: experiment.key, href: `/${experiment.key}` },
    ],
  };
}

export function getSccNavigationItems(
  filter: { area?: SccArea; family?: string } = {},
) {
  const matches = ({ area, family }: SccExperimentAlias) =>
    (!filter.area || area === filter.area) &&
    (!filter.family ||
      family === filter.family ||
      family.startsWith(`${filter.family}/`));
  const items = sccExperiments.filter(matches).map(toNavigationItem);

  // The unscoped archive lists every experiment once, under its own family.
  if (!filter.area && !filter.family) return items;

  const aliases = sccExperiments.flatMap((experiment) => {
    if (matches(experiment)) return [];
    const alias = experiment.also?.find(matches);
    if (!alias) return [];
    // Named inside the alias family (`mobile/finger-skating/clock/2`); the
    // link still opens the canonical route.
    const slug = alias.slug ?? experiment.key.split("/").at(-1);
    return [{
      ...toNavigationItem(experiment),
      area: alias.area,
      family: alias.family,
      key: `${alias.family}/${slug}`,
    }];
  });
  return [...items, ...aliases];
}

/** Clone pickers inside a mobile transform: one row per `sns/mobile` surface, or only the given clone numbers. */
export function getCloneNavigationItems(parentKey: string, clones?: readonly string[]) {
  const parent = sccExperiments.find((experiment) => experiment.key === parentKey);
  if (!parent) return [];

  return sccExperiments
    .filter((experiment) => experiment.family === "sns/mobile" && (!clones || clones.includes(experiment.key.split("/").at(-1)!)))
    .map<SccNavigationItem>((clone) => {
      const key = `${parentKey}/${clone.key.split("/").at(-1)}`;
      return {
        key,
        area: parent.area,
        family: parentKey,
        date: parent.updated ?? parent.date,
        created: parent.date,
        phrase: clone.phrase,
        routes: [{ label: key, href: `/${key}` }],
      };
    });
}
