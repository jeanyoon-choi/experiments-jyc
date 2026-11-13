/**
 * Contemporary invented signs, not translations of historical Egyptian writing.
 * Profile bodies, angular limbs, compact sign groups and carved negative spaces.
 * Each technological detail is subordinate to the figurative silhouette.
 */
type Part = Readonly<{ ink: string; transform?: string }>;
type Sign = Readonly<{ meaning: string; parts: readonly Part[] }>;
const part = (ink: string, transform?: string): Part => ({ ink, transform });
const sign = (meaning: string, ...parts: Part[]): Sign => ({ meaning, parts });

const head = "M16 29L15 21Q15 10 24 10Q33 10 34 19L38 24L33 25L32 31L25 32L25 34H17L20 29ZM28 19L32 20L28 22Z";
const seated = head + "M17 34Q25 32 28 41L31 53L48 54L51 50L55 52L51 59L28 60L22 48L23 66L46 69L45 84L63 86L64 90L34 90L35 77L16 75Q10 72 12 65ZM17 44L16 65L20 67Z";
const kneeling = head + "M17 34L26 35L32 49L51 45L55 47L51 51L29 56L23 47L23 65Q39 64 44 72L42 82L60 86L60 90H17Q10 84 16 76L21 72L14 68ZM25 73L20 82H35L36 77Z";
const standing = head + "M17 34L26 35L30 49L48 45L52 48L48 52L26 57L22 48L23 63L28 84L39 87L38 91H24L17 69L14 85L23 88L22 92H8L9 63L12 42Z";
const raised = head + "M17 34L25 35L31 47L43 30L42 21L45 15L48 16L47 29L32 56L23 48L24 65L43 70L42 85L60 87V91H32L33 77L13 75L12 65ZM17 45L16 65L20 66Z";
const twoHands = head + "M17 34L25 35L33 45L49 35L54 35L53 39L31 53L22 43L22 51L31 59L51 56L55 59L52 63L29 65L22 59L22 63L44 68L43 84L60 86V90H33L34 77L13 74L12 64Z";
const leaning = head + "M17 34L25 35L38 58L54 64L59 63L60 67L54 70L32 64L22 49L23 66L39 72L33 83L54 86V90H20L24 77L12 71L12 62Z";
const watcher = head + "M17 34L25 35L30 42L41 34L42 26L45 24L47 28L45 38L29 52L22 44L23 65L46 69L44 84L63 86V90H34L35 77L13 74L12 65Z";
const hand = "M12 59Q26 57 35 48L48 26Q51 23 52 27L43 47L62 20Q66 18 66 23L50 49L72 29Q76 28 75 33L57 53L76 42Q81 42 78 47L55 65L35 71L15 70Z";
const die = "M55 31L79 28L84 53L60 57ZM61 36L76 34L78 48L64 51ZM57 24L59 31L62 30L61 20ZM69 19L70 28L73 27L73 19ZM80 20L78 28L82 30L86 23ZM59 57L56 66L60 65L63 57ZM70 56L70 66L74 65L74 55ZM83 53L85 61L88 58L86 51Z";
const register = "M59 18Q75 13 86 17L85 22L59 24ZM57 30L86 27L84 34L57 37ZM58 44L84 40L85 47L58 51ZM60 57L86 53L85 60L60 64Z";
const eye = "M54 31Q68 14 86 29Q72 42 54 31ZM59 30Q70 24 81 29Q72 35 59 30ZM68 26H74V33H68ZM56 34L60 35L68 48L63 49ZM74 38L85 33L86 37L77 42Z";
const screen = "M64 15L84 12L88 56L67 60ZM69 21L79 19L82 50L72 52ZM75 61L80 61L81 75L91 79L90 83H68L67 79L75 76Z";

export const techHieroglyphs: Readonly<Record<string, Sign>> = {
  AI: sign("An attentive profile faces an artificial branching mind", part(watcher), part("M61 15Q78 8 84 23L89 29L83 31L81 42L70 43L69 52H60L63 39L58 32ZM65 20L65 33L71 37L75 34L69 30L69 20ZM72 20L72 25L79 28L80 24Z")),
  ML: sign("A seated learner repeats and varies a learned mark", part(seated), part("M59 18L68 12L74 23L84 16L89 20L73 31L67 21L61 25ZM58 37L67 31L74 41L86 32L91 37L73 50L66 40L60 44Z")),
  DL: sign("A kneeling profile beneath successive inner layers", part(kneeling), part("M56 15L89 12L88 18L61 21L63 27L84 25L83 31L59 34ZM65 39L85 36L84 42L71 45L73 51L84 49L84 55L69 58Z")),
  AGI: sign("A figure addresses sight and a second distinct sign", part(twoHands), part(eye, "translate(0,-7)"), part("M66 57L72 48L80 54L85 49L90 55L80 63L73 57L69 65Z")),
  GPT: sign("A seated figure extends a sequence of unequal marks", part(seated), part("M58 18L65 15L64 27L59 29ZM70 15L78 12L77 29L71 31ZM83 10L91 7L90 32L84 34ZM60 40L67 37L66 44L60 47ZM72 39L81 36L81 45L73 49Z")),
  LLM: sign("A raised arm beside a dense compact language group", part(raised), part("M59 13L65 10L64 22L59 24ZM71 10L77 8L76 22L71 25ZM83 8L89 6L88 22L83 25ZM58 33L72 29L72 35L59 39ZM78 30L89 27L88 34L78 37ZM60 47L66 44L66 56L60 59ZM73 44L80 41L80 56L73 59ZM85 43L91 40L91 54L85 57Z")),
  NLP: sign("A speaker's profile with segmented speech marks", part(standing), part("M47 17Q61 15 68 22L66 26Q58 21 48 22ZM49 29L62 29L61 34H49ZM72 17L79 13L78 29L72 32ZM83 16L90 12L89 29L83 33ZM61 65L72 58L86 65L83 70L72 65L63 71Z")),
  RAG: sign("Two gestures join a stored register to a new sequence", part(twoHands), part("M62 13L88 9L87 15L62 19ZM62 25L88 21L87 27L62 31ZM84 37Q92 52 73 57L71 52Q85 48 80 39ZM63 68L70 65L70 77L63 79ZM77 66L85 63L84 78L77 81Z")),
  CPU: sign("A seated operator meets a single incised processing die", part(seated), part(die)),
  GPU: sign("Paired seated bodies beneath parallel processing teeth", part(seated, "translate(-1,26) scale(.7)"), part(seated, "translate(35,26) scale(.7)"), part("M15 9L83 7L86 19L17 23ZM23 13L23 18L77 15L77 12ZM31 23L36 23L36 29H31ZM51 22H56V28H51ZM71 21H76V27H71Z")),
  NPU: sign("An artificial profile whose torso contains neural branches", part(head, "translate(15,0)"), part("M31 34L44 35L55 44L74 39L78 43L55 51L44 44L47 63L67 69L65 84L82 87V91H56L57 76L29 73L26 64ZM33 41L33 61L39 67L44 64L39 60L38 43ZM51 19L65 15L68 29L54 33ZM56 22L57 28L63 26L62 21ZM73 17L82 14L85 28L76 31Z")),
  RAM: sign("A kneeling figure beside a repeated temporary memory comb", part(kneeling), part("M58 16L88 12L90 40L61 45ZM64 21L67 36L71 35L69 20ZM76 19L78 34L83 33L81 18ZM63 46L67 45L68 53L64 54ZM74 44L78 43L79 51L75 52ZM85 42L89 41L90 49L86 50Z")),
  OS: sign("Two hands address the strata of an operating system", part(twoHands), part("M59 15Q75 8 89 14L87 19Q76 15 60 21ZM59 27Q75 20 88 26L86 33Q74 28 59 34ZM64 46Q76 39 88 44L88 50Q77 46 64 53ZM63 61L88 56L88 62L64 68Z")),
  PC: sign("A seated user with a computer in narrow side elevation", part(seated), part(screen)),
  IoT: sign("A standing user among transmitted waves and a sensor", part(standing), part("M60 19Q71 28 63 40L59 37Q65 29 56 23ZM72 13Q88 28 76 47L71 44Q81 29 67 17ZM83 7Q102 28 89 53L84 50Q95 28 78 11ZM65 62L84 59L86 77L68 80ZM71 67L72 74L80 72L79 65Z")),
  AR: sign("A viewer looks through an open augmented lens", part(watcher), part("M53 17L86 12L90 39L57 44ZM59 23L62 37L84 33L82 19ZM68 23L73 22L73 27L78 26L79 31L68 33ZM62 58L83 50L86 55L65 64Z")),
  VR: sign("A seated body wears an opaque split viewing band", part(seated), part("M24 14L47 13L51 29L33 32L30 25L24 25ZM34 18L35 25L38 25L37 18ZM41 18L42 25L45 24L44 17ZM63 17Q88 23 85 47L80 47Q81 26 61 22Z")),
  XR: sign("A raised hand joins open and enclosed viewing fields", part(raised), part("M56 16L75 12L79 33L60 38ZM62 21L64 31L73 29L71 19ZM76 27L88 23L92 43L79 47ZM82 31L84 40L87 39L85 30ZM64 55L85 50L86 56L65 61Z")),
  UI: sign("An extended hand touches a descending field of controls", part(hand, "translate(-3,24) scale(.85)"), part("M62 14L85 9L87 17L64 22ZM65 28L89 23L90 31L67 36ZM70 42L89 38L90 46L72 51Z")),
  UX: sign("A leaning body and hand follow responsive contours", part(leaning), part("M56 18Q81 11 87 30L82 32Q78 18 58 23ZM60 32Q73 27 79 39L75 43Q71 34 61 37ZM63 47Q70 41 77 49L74 54L68 51L65 54ZM66 74Q79 79 90 66L93 71Q81 86 67 80Z")),
  HCI: sign("A standing person reaches toward a computer surface", part(standing), part(screen)),
  MVP: sign("A crouching maker presents one small functional element", part(leaning), part("M65 52L80 48L87 59L80 72L66 73ZM70 57L71 67L77 67L81 59L77 54ZM68 79L84 77L85 82L69 85Z")),
  API: sign("Opposed hands fit a shared joint between two boundaries", part(hand, "translate(0,0) scale(.64)"), part(hand, "translate(100,98) rotate(180) scale(.64)"), part("M40 38L51 34L55 45L65 42L69 55L57 59L53 49L44 52ZM45 41L47 46L56 43L54 39Z")),
  SDK: sign("Two hands accompany a forked construction implement and code marks", part(twoHands), part("M63 9L67 9L69 25L74 24L76 7L80 6L79 29L72 33L74 53L68 54L66 34L61 30ZM82 43L89 41L87 67L81 69ZM64 68L75 65L76 71L65 75Z")),
  IDE: sign("A seated author beside parallel working registers", part(seated), part("M60 12L67 10L71 45L64 47ZM73 10L80 8L84 43L77 45ZM59 55L87 50L88 56L60 61ZM67 68L83 65L86 73L70 77Z")),
  OOP: sign("A raised hand with three separately enclosed related forms", part(raised), part("M63 11Q77 5 82 17L77 32L62 31L58 20ZM66 15L63 21L66 26L74 27L77 18L72 13ZM58 44Q68 36 74 47L71 59L59 60L55 51ZM62 46L59 51L62 56L67 55L69 48ZM80 44Q89 37 93 49L89 62L79 61L76 52ZM83 46L80 52L83 58L86 57L89 50Z")),
  QA: sign("An inspecting profile looks at a tilted component above an eye", part(watcher), part("M59 11L80 7L87 26L65 33ZM65 15L69 26L81 23L77 12ZM71 15L75 14L77 21L73 23Z"), part(eye, "translate(0,29)")),
  DB: sign("A seated figure and four dense data registers", part(seated), part(register)),
  SQL: sign("A selecting hand singles out one of four registers", part(hand, "translate(-4,19) scale(.8)"), part("M60 12L89 8L89 13L61 18ZM62 25L89 21L89 27L63 31ZM63 38L91 33L92 45L65 50ZM68 59L90 55L91 61L69 65Z")),
  CDN: sign("A figure accompanies copies distributed across three positions", part(standing, "translate(0,8) scale(.88)"), part("M55 10L68 7L72 24L59 28ZM60 14L62 22L67 21L65 13ZM78 32L91 29L94 46L81 49ZM83 35L85 43L90 42L87 34ZM56 62L70 59L73 77L59 80ZM61 66L63 74L68 73L66 64ZM70 29L75 27L81 29L79 33ZM75 51L80 53L73 61L69 58Z")),
  DNS: sign("Paired naming marks connect to an addressed endpoint", part(twoHands), part("M62 12L68 9L69 23L63 26ZM76 9L82 7L83 23L77 26ZM83 33Q96 47 78 57L75 52Q88 44 79 36ZM63 66L83 62L88 77L67 83ZM70 70L72 77L82 74L79 68Z")),
  URL: sign("A profile follows a segmented address to a terminal mark", part(standing), part("M55 13L61 10L62 23L56 26ZM68 10L74 7L75 21L69 24ZM81 7L87 4L88 19L82 22ZM85 29Q97 47 81 57L78 53Q89 46 81 32ZM65 66L83 61L87 80L69 85ZM71 70L73 78L82 75L80 67Z")),
  VPN: sign("Opposed hands pass through a closed protective passage", part(hand, "translate(1,2) scale(.5)"), part(hand, "translate(99,98) rotate(180) scale(.5)"), part("M32 57Q25 32 44 23Q64 18 72 43L67 65L41 74ZM39 55L45 66L61 59L65 43Q59 26 47 30Q33 36 39 55ZM45 42L59 37L61 44L47 49Z")),
  VM: sign("A seated user with a contained second machine", part(seated), part("M60 13L86 9L91 57L65 63ZM66 19L70 55L85 52L81 16ZM70 25L78 23L81 46L73 48ZM76 64L81 63L82 76L91 80L91 84H68L67 80L76 77Z")),
  NFT: sign("A raised hand beside a uniquely incised token and linked loops", part(raised), part("M63 10L81 7L90 19L84 39L65 44L57 29ZM66 16L63 28L69 37L80 34L85 21L78 13ZM70 19L76 16L79 28L73 31ZM61 56Q60 48 69 47L78 52L77 61L71 64L69 60L73 58L73 55L67 52L65 56L68 65L64 67ZM76 63L81 60Q89 61 89 70L84 78L75 76L71 69L75 67L78 72L82 73L85 69L84 65L79 65Z")),
  DAO: sign("Two equal kneeling participants share signs at the same level", part(kneeling, "translate(0,23) scale(.66)"), part(kneeling, "translate(100,23) scale(-.66,.66)"), part("M39 9L59 7L64 19L43 23ZM45 13L47 18L58 16L56 12ZM43 65L56 63L58 73L45 76ZM47 68L48 72L54 70L53 67Z")),
};
