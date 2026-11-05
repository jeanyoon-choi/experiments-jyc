// 앱 아이콘 (bubble/9 기호의 파티, user 2026-11-05): about a hundred of the world's most used apps as their icons sit
// on a phone's home screen — not the bare logo but the icon as shipped: the iOS tile (a continuous-curvature squircle,
// corner radius 22.37 % of the side, Apple's continuous corner as reverse-engineered for UIBezierPath), its own
// background (flat or gradient) and the glyph raised on it as an injection-moulded part, each separately coloured
// part of a multi-colour glyph its own layer (or, where the shipped mark is one outline, a paint-only mask clipped to
// it, so the moulding stays one piece and only the colour divides).
//
// Which apps: the 2025 global download leaders (AppTweak's 2025 worldwide ranking,
// https://www.apptweak.com/en/reports/most-downloaded-apps-globally-android-ios; Appfigures' monthly charts via
// https://backlinko.com/most-popular-apps; Sensor Tower's State of Mobile 2026,
// https://tools.prnewswire.com/en-us/live/20813/release/20260225EN94109), with each region's own leaders: China by
// QuestMobile MAU (https://www.remio.ai/post/douyin-crosses-1-billion-but-the-app-top30-headline-mixes-two-rankings,
// https://www.ciw.news/p/china-internet-overview), Korea by IGAWorks Mobile Index 2025
// (https://www.digitaltoday.co.kr/en/view/703/youtube-most-used-app-in-south-korea-in-2025-chatgpt-tops-new-installs),
// India by Sensor Tower 2025 (https://techcrunch.com/2026/01/21/indias-app-downloads-rebounded-to-25-5-billion-in-2025-fueled-by-ai-assistants-and-microdrama-boom/).
//
// Marks: simple-icons (CC0 path data; every mark remains its owner's trademark) and, for AI apps without a
// simple-icons mark, @lobehub/icons-static-svg (MIT), copied in below. Google's multi-colour icons are coloured as
// the shipped 2020 icon SVGs are (Wikimedia Commons: Maps https://commons.wikimedia.org/wiki/File:Google_Maps_icon_(2020).svg,
// Drive https://commons.wikimedia.org/wiki/File:Google_Drive_icon_(2020).svg, Meet
// https://commons.wikimedia.org/wiki/File:Google_Meet_icon_(2020).svg, Calendar
// https://commons.wikimedia.org/wiki/File:Google_Calendar_icon_(2020).svg). Each icon's composition (tile colour,
// glyph scale and placement) follows its App Store listing (https://apps.apple.com/).
//
// Not here because no exact mark is available locally (simple-icons removed them at the owners' request or never
// had them), rather than invented: Amazon, Temu, SHEIN, Walmart, Mercado Libre, CapCut, LinkedIn, Microsoft
// Outlook/Teams/Word/Excel/Edge, Slack, Canva, Disney+, Prime Video, Coupang, 배달의민족, 토스, 당근, PayPay,
// Mercari, Taobao (its icon is 淘 alone, simple-icons ships the 淘宝 Taobao lockup), Lazada, Flipkart, Meesho, JD, Pinduoduo, DingTalk, Zoom's camera (only its wordmark ships), Zalo's
// bubble, Google Photos' 2025 icon, Weibo and QQ (their app icons are not the mono mark), and games whose icons are
// character art (PUBG Mobile, Free Fire, Candy Crush, Fortnite).

import {
  siAirbnb, siAlipay, siApplemusic, siApplepodcasts, siAppletv, siAppstore, siBaidu, siBereal, siBilibili, siBinance,
  siBluesky, siBookingdotcom, siCashapp, siClaude, siCrunchyroll, siDeliveroo, siDiscord, siDoordash, siDropbox,
  siDuolingo, siEbay, siEpicgames, siEtsy, siFacebook, siGmail, siGojek, siGoogle, siGooglecalendar, siGooglechrome,
  siGoogledrive, siGooglemaps, siGooglemeet, siGoogleplay, siGrab, siIfood, siImessage, siInstagram, siKakaotalk,
  siKlarna, siKuaishou, siLine, siLyft, siMcdonalds, siMeituan, siMessenger, siNaver, siNeteasecloudmusic, siNetflix,
  siNotion, siNubank, siPaypal, siPaytm, siPhonepe, siPicpay, siPinterest, siPlaystation, siReddit, siRevolut,
  siRobinhood, siRoblox, siSafari, siShazam, siShopee, siSignal, siSnapchat, siSoundcloud, siSpotify, siSteam,
  siStrava, siSwiggy, siTarget, siTelegram, siThreads, siTiktok, siTinder, siTripadvisor, siTwitch, siUber,
  siUbereats, siVenmo, siViber, siVinted, siWaze, siWebtoon, siWechat, siWhatsapp, siWise, siX, siXiaohongshu,
  siYoutube, siZhihu, siZomato,
} from "simple-icons";
import { subpathsOf } from "../marks.ts";
import type { CatalogueGroup, CatalogueKind, Paint, ReliefLayer } from "./types.ts";

// ── marks copied from @lobehub/icons-static-svg (MIT) ──

/** @lobehub/icons-static-svg openai.svg (MIT). */
const LOBE_OPENAI = "M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z";
/** @lobehub/icons-static-svg gemini-color.svg (MIT): fills #3186FF, url(#lobe-icons-gemini-0-_R_0_), url(#lobe-icons-gemini-1-_R_0_), url(#lobe-icons-gemini-2-_R_0_). */
const LOBE_GEMINI = ["M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z","M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z","M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z","M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"];
/** @lobehub/icons-static-svg perplexity-color.svg (MIT): fills #22B8CD. */
const LOBE_PERPLEXITY = "M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z";
/** @lobehub/icons-static-svg deepseek-color.svg (MIT): fills #4D6BFE. */
const LOBE_DEEPSEEK = "M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z";
/** @lobehub/icons-static-svg grok.svg (MIT). */
const LOBE_GROK = "M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815";
/** @lobehub/icons-static-svg kimi-color.svg (MIT): fills #1783FF, currentColor. */
const LOBE_KIMI = ["M21.846 0a1.923 1.923 0 110 3.846H20.15a.226.226 0 01-.227-.226V1.923C19.923.861 20.784 0 21.846 0z","M11.065 11.199l7.257-7.2c.137-.136.06-.41-.116-.41H14.3a.164.164 0 00-.117.051l-7.82 7.756c-.122.12-.302.013-.302-.179V3.82c0-.127-.083-.23-.185-.23H3.186c-.103 0-.186.103-.186.23V19.77c0 .128.083.23.186.23h2.69c.103 0 .186-.102.186-.23v-3.25c0-.069.025-.135.069-.178l2.424-2.406a.158.158 0 01.205-.023l6.484 4.772a7.677 7.677 0 003.453 1.283c.108.012.2-.095.2-.23v-3.06c0-.117-.07-.212-.164-.227a5.028 5.028 0 01-2.027-.807l-5.613-4.064c-.117-.078-.132-.279-.028-.381z"];
/** @lobehub/icons-static-svg doubao-color.svg (MIT): fills #1E37FC, #37E1BE, #A569FF, #1E37FC. */
const LOBE_DOUBAO = ["M5.31 15.756c.172-3.75 1.883-5.999 2.549-6.739-3.26 2.058-5.425 5.658-6.358 8.308v1.12C1.501 21.513 4.226 24 7.59 24a6.59 6.59 0 002.2-.375c.353-.12.7-.248 1.039-.378.913-.899 1.65-1.91 2.243-2.992-4.877 2.431-7.974.072-7.763-4.5l.002.001z","M22.57 10.283c-1.212-.901-4.109-2.404-7.397-2.8.295 3.792.093 8.766-2.1 12.773a12.782 12.782 0 01-2.244 2.992c3.764-1.448 6.746-3.457 8.596-5.219 2.82-2.683 3.353-5.178 3.361-6.66a2.737 2.737 0 00-.216-1.084v-.002z","M14.303 1.867C12.955.7 11.248 0 9.39 0 7.532 0 5.883.677 4.545 1.807 2.791 3.29 1.627 5.557 1.5 8.125v9.201c.932-2.65 3.097-6.25 6.357-8.307.5-.318 1.025-.595 1.569-.829 1.883-.801 3.878-.932 5.746-.706-.222-2.83-.718-5.002-.87-5.617h.001z","M17.305 4.961a199.47 199.47 0 01-1.08-1.094c-.202-.213-.398-.419-.586-.622l-1.333-1.378c.151.615.648 2.786.869 5.617 3.288.395 6.185 1.898 7.396 2.8-1.306-1.275-3.475-3.487-5.266-5.323z"];
/** @lobehub/icons-static-svg qwen-color.svg (MIT): fills #082dff. */
const LOBE_QWEN = "M19.713 2.825h-5.907c0-.251-.066-.503-.196-.728L12.819.728A1.46 1.46 0 0 0 11.559 0h-1.58c-.52 0-1 .275-1.26.728l-2.42 4.19a1.45 1.45 0 0 0 0 1.453l.791 1.37c.26.448.74.727 1.26.727h11.36c.52 0 1-.275 1.26-.728l.79-1.37a1.45 1.45 0 0 0 0-1.451l-.79-1.37a1.46 1.46 0 0 0-1.26-.728zM.195 9.905l2.951 5.115a1.46 1.46 0 0 0-.531.531l-.791 1.37a1.45 1.45 0 0 0 0 1.452l.79 1.37c.26.448.74.727 1.26.727h4.84c.52 0 1-.275 1.26-.728l.79-1.37a1.45 1.45 0 0 0 0-1.451L5.086 7.083a1.46 1.46 0 0 0-1.26-.728h-1.58c-.52 0-1 .276-1.26.728l-.79 1.37a1.45 1.45 0 0 0 0 1.452m15.888 13.367 2.951-5.115c.217.125.469.196.728.196h1.582c.52 0 1-.275 1.26-.728l.79-1.37a1.45 1.45 0 0 0 0-1.451l-2.42-4.191a1.46 1.46 0 0 0-1.259-.728h-1.582c-.52 0-1 .276-1.259.728l-5.678 9.838a1.45 1.45 0 0 0 0 1.452l.79 1.37c.26.448.74.727 1.26.727h1.582c.52 0 1-.275 1.26-.728z";
/** @lobehub/icons-static-svg copilot-color.svg (MIT): fills url(#lobe-icons-copilot-0-_R_0_), url(#lobe-icons-copilot-1-_R_0_), url(#lobe-icons-copilot-2-_R_0_), url(#lobe-icons-copilot-3-_R_0_). */
const LOBE_COPILOT = ["M16.295 5.29l-0.242 0.986h-2.32c-1.721 0-3.22 1.197-3.638 2.902l-2.101 8.593H3.798c-2.44 0-4.229-2.342-3.637-4.761l2.106-8.612c0.557-2.274 2.556-3.87 4.85-3.87h5.54c2.44 0 4.23 2.343 3.638 4.761","M16.295 5.29l-0.242 0.986h-2.32c-1.721 0-3.22 1.197-3.638 2.902l-2.101 8.593H3.798c-2.44 0-4.229-2.342-3.637-4.761l2.106-8.612c0.557-2.274 2.556-3.87 4.85-3.87h5.54c2.44 0 4.23 2.343 3.638 4.761","M7.752 18.758l0.242-0.986h2.321c1.72 0 3.22-1.197 3.637-2.903l2.102-8.593h4.196c2.439 0 4.228 2.343 3.637 4.762l-2.107 8.611c-0.556 2.274-2.555 3.87-4.85 3.87h-5.54c-2.44 0-4.229-2.342-3.638-4.761","M7.752 18.758l0.242-0.986h2.321c1.72 0 3.22-1.197 3.637-2.903l2.102-8.593h4.196c2.439 0 4.228 2.343 3.637 4.762l-2.107 8.611c-0.556 2.274-2.555 3.87-4.85 3.87h-5.54c-2.44 0-4.229-2.342-3.638-4.761"];

type Point = readonly [number, number];
/** A glyph as closed polygons (the relief flattens curves the same way), filled with the non-zero rule. */
type Shape = readonly (readonly Point[])[];

/** The glyph raised on it. */
const GLYPH = { height: 0.065, bevel: 0.025 };

// ── shapes ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const shape = (d: string): Shape => subpathsOf(d).map(({ points }) => points.map(([x, y]) => [x, y] as const));

const num = (value: number) => String(Math.round(value * 1000) / 1000);

const pathOf = (s: Shape) =>
  s
    .filter((polygon) => polygon.length > 2)
    .map((polygon) => `M${polygon.map(([x, y]) => `${num(x)} ${num(y)}`).join("L")}Z`)
    .join("");

/** Some of a mark's subpaths, by index. */
const pick = (s: Shape, ...indices: number[]): Shape => indices.map((index) => s[index]!);
const drop = (s: Shape, ...indices: number[]): Shape => s.filter((_, index) => !indices.includes(index));

const moved = (s: Shape, dx: number, dy: number, k = 1): Shape => s.map((p) => p.map(([x, y]) => [x * k + dx, y * k + dy] as const));

const area = (p: readonly Point[]) => {
  let sum = 0;
  p.forEach(([x, y], index) => {
    const [u, v] = p[(index + 1) % p.length]!;
    sum += x * v - u * y;
  });
  return sum / 2;
};

const reversed = (s: Shape): Shape => s.map((p) => [...p].reverse());

function contains(p: readonly Point[], [x, y]: Point) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i, i += 1) {
    const [xi, yi] = p[i]!;
    const [xj, yj] = p[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A path drawn for the even-odd rule, re-wound so the non-zero rule fills the same: each subpath's turn by its depth. */
function evenOdd(s: Shape): Shape {
  return s.map((p, index) => {
    const depth = s.filter((q, other) => other !== index && contains(q, p[0]!)).length;
    return (area(p) > 0) === (depth % 2 === 0) ? p : [...p].reverse();
  });
}

/** Each subpath clipped to a convex region (Sutherland–Hodgman), which keeps every winding number inside it. */
function clip(s: Shape, region: readonly Point[]): Shape {
  const turn = Math.sign(area(region));
  const side = ([ax, ay]: Point, [bx, by]: Point, [px, py]: Point) => turn * ((bx - ax) * (py - ay) - (by - ay) * (px - ax));
  return s
    .map((polygon) => {
      let out: Point[] = [...polygon];
      region.forEach((a, index) => {
        const b = region[(index + 1) % region.length]!;
        const input = out;
        out = [];
        input.forEach((p, k) => {
          const q = input[(k + 1) % input.length]!;
          const sp = side(a, b, p);
          const sq = side(a, b, q);
          if (sp >= 0) out.push(p);
          if (sp >= 0 !== sq >= 0) {
            const t = sp / (sp - sq);
            out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
          }
        });
      });
      return out;
    })
    .filter((polygon) => polygon.length > 2);
}

const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** A wedge from (cx, cy) between two angles (degrees, clockwise from +x as the screen has it), under 180° wide. */
function wedge(cx: number, cy: number, from: number, to: number, reach = 40): Point[] {
  const points: Point[] = [[cx, cy]];
  for (let k = 0; k <= 8; k += 1) {
    const angle = ((from + ((to - from) * k) / 8) * Math.PI) / 180;
    points.push([cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach]);
  }
  return points;
}

/** The convex hull of a polygon (monotone chain). */
function hull(p: readonly Point[]): Point[] {
  const points = [...p].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const point of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Point[] = [];
  for (const point of [...points].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * What a container mark cuts out of itself (a glyph drawn as a hole in its badge, as simple-icons draws Alipay's 支 or
 * Facebook's f): a sheet larger than the badge minus the badge, clipped to the badge's hull drawn in by `inset`.
 */
function cutOut(s: Shape, container = 0, inset = 0.04): Shape {
  const outline = hull(s[container]!);
  const cx = outline.reduce((sum, [x]) => sum + x, 0) / outline.length;
  const cy = outline.reduce((sum, [, y]) => sum + y, 0) / outline.length;
  const region = outline.map(([x, y]) => {
    const length = Math.hypot(x - cx, y - cy);
    return [x - ((x - cx) / length) * inset, y - ((y - cy) / length) * inset] as const;
  });
  const sheet = rect(-4, -4, 28, 28);
  const sheetTurn = Math.sign(area(sheet));
  // The sheet turns one way; the badge, wherever it is filled, the other.
  const badge = Math.sign(area(s[container]!)) === sheetTurn ? reversed(s) : s;
  return clip([sheet, ...badge], region);
}

// ── icons ──────────────────────────────────────────────────────────────────────────────────────────────────────────

type Part = { readonly d: Shape | string; readonly paint?: Paint; readonly height?: number; readonly bevel?: number; readonly stroke?: number };

type Icon = {
  readonly id: string;
  readonly label: string;
  readonly feed: string;
  readonly sub: string;
  readonly source: string;
  /** The tile's paint; a gradient's coordinates are in the tile's own unit square (0–1, y down). */
  readonly tile: Paint;
  /** The tile's side in the glyph's units (a simple-icons mark is 24 wide), so the glyph's share of the tile is 24 / side. */
  readonly side: number;
  /** The tile's centre in the glyph's units. */
  readonly at?: Point;
  readonly parts: readonly Part[];
  readonly on?: true;
};

const WHITE = "#ffffff";
const BLACK = "#000000";

/** A gradient from the tile's top to its bottom. */
const down = (top: string, bottom: string): Paint => ({ linear: [0, 0, 0, 1], stops: [[0, top], [1, bottom]] });

function kindOf(icon: Icon): CatalogueKind {
  const [cx, cy] = icon.at ?? [12, 12];
  const x0 = cx - icon.side / 2;
  const y0 = cy - icon.side / 2;
  const unit = (paint: Paint): Paint => {
    if (typeof paint === "string") return paint;
    if ("linear" in paint) {
      const [ax, ay, bx, by] = paint.linear;
      return { linear: [x0 + ax * icon.side, y0 + ay * icon.side, x0 + bx * icon.side, y0 + by * icon.side], stops: paint.stops };
    }
    const [rx, ry, rr] = paint.radial;
    return { radial: [x0 + rx * icon.side, y0 + ry * icon.side, rr * icon.side], stops: paint.stops };
  };
  // bubble/9 (user, 2026-11-05): the icon is its mark alone, never the tile it sits on (`tile` kept for the record).
  void unit;
  const layers: ReliefLayer[] = [
    ...icon.parts.map((part) => ({
      d: typeof part.d === "string" ? part.d : pathOf(part.d),
      height: part.height ?? GLYPH.height,
      bevel: part.bevel ?? GLYPH.bevel,
      ...(part.stroke ? { stroke: part.stroke } : {}),
      ...(part.paint ? { paint: part.paint } : {}),
    })),
  ];
  return {
    id: icon.id,
    label: icon.label,
    feed: icon.feed,
    sub: icon.sub,
    source: icon.source,
    make: { source: "relief", viewBox: [x0, y0, icon.side, icon.side], layers },
  };
}

const si = (icon: { path: string }) => shape(icon.path);
const of = (slug: string) => `simple-icons ${slug} (CC0 data; mark © its owner)`;
const lobe = (name: string) => `@lobehub/icons-static-svg ${name}.svg (MIT; mark © its owner)`;
/** One flat-colour glyph. */
const mono = (s: Shape | string, paint: Paint = WHITE): Part[] => [{ d: s, paint }];
/** A paint-only mask: colours the part of `s` inside a convex region, adding no height. */
const mask = (s: Shape, region: readonly Point[], paint: Paint): Part => ({ d: clip(s, region), paint, height: 0 });

// TikTok's note: the white note over its cyan and red offset prints (as moulded plates, they stack).
const TIKTOK = si(siTiktok);
const tiktokNote: Part[] = [
  { d: moved(TIKTOK, -0.55, -0.45), paint: "#25f4ee", height: 0.03, bevel: 0.015 },
  { d: moved(TIKTOK, 0.55, 0.45), paint: "#fe2c55", height: 0.03, bevel: 0.015 },
  { d: TIKTOK, paint: WHITE, height: 0.035, bevel: 0.015 },
];

// Facebook's f, cut out of its circle and run off the tile's bottom edge as the 2023 app icon has it.
const FACEBOOK_F = (() => {
  const f = cutOut(si(siFacebook));
  const foot = f.flat().filter(([, y]) => y > 19 && y < 22);
  const left = Math.min(...foot.map(([x]) => x));
  const right = Math.max(...foot.map(([x]) => x));
  const turn = Math.sign(area(f[0]!));
  const stem = rect(left, 21, right, 23.7);
  return [...f, Math.sign(area(stem)) === turn ? stem : [...stem].reverse()];
})();

// Gmail's M: one moulding, coloured as the 2020 logo (blue and green posts, dark red and yellow shoulders, red V).
const GMAIL = si(siGmail);
const gmail: Part[] = [
  { d: GMAIL, paint: "#ea4335" },
  mask(GMAIL, rect(-1, 11.73, 5.455, 22), "#4285f4"),
  mask(GMAIL, rect(-1, 2, 5.455, 11.73), "#c5221f"),
  mask(GMAIL, rect(18.545, 2, 25, 11.73), "#fbbc04"),
  mask(GMAIL, rect(18.545, 11.73, 25, 22), "#34a853"),
];

// Google's G: red over the top, yellow at the left, green under, blue on the right and the bar.
const G = si(siGoogle);
const google: Part[] = [
  { d: G, paint: "#4285f4" },
  mask(G, wedge(12, 12, 30, 150), "#34a853"),
  mask(G, wedge(12, 12, 150, 212), "#fbbc04"),
  mask(G, wedge(12, 12, 212, 332), "#ea4335"),
  mask(G, rect(11, 9.2, 25, 14.8), "#4285f4"),
];

// Gemini's spark: blue, warmed by red from the top, yellow from the left and green from below (lobehub's overlays).
const GEMINI = evenOdd(shape(LOBE_GEMINI[0]!));
const gemini: Part[] = [
  { d: GEMINI, paint: "#3186ff" },
  mask(GEMINI, wedge(12, 12, 225, 315), { linear: [12, 2, 12, 11], stops: [[0, "#f94543"], [1, "#3186ff"]] }),
  mask(GEMINI, wedge(12, 12, 135, 225), { linear: [2, 12, 11, 12], stops: [[0, "#fabc12"], [1, "#3186ff"]] }),
  mask(GEMINI, wedge(12, 12, 45, 135), { linear: [12, 22, 12, 13], stops: [[0, "#08b962"], [1, "#3186ff"]] }),
];

const DRIVE = si(siGoogledrive);
const MEET = si(siGooglemeet);
const CAL = si(siGooglecalendar);
const PLAY = si(siGoogleplay);
const MAPS = si(siGooglemaps);
const CHROME = si(siGooglechrome);
const EBAY = si(siEbay);
const PAYTM = si(siPaytm);
const UBEREATS = si(siUbereats);
const WAZE = si(siWaze);
const NETFLIX = si(siNetflix);
const SNAPCHAT = si(siSnapchat);
const VENMO = si(siVenmo);

const SNS = "SNS";
const CHAT = "메신저";
const MEDIA = "영상·음악";
const MONEY = "결제·금융";
const SHOP = "쇼핑·배달";
const MOVE = "생활·이동";
const GOOGLE = "구글";
const APPLE = "애플·생산성";
const AI = "AI";
const CHINA = "중국";
const KOREA = "한국·일본";
const SOUTH = "인도·동남아";
const GAMES = "게임";

const ICONS: Icon[] = [
  // SNS
  {
    id: "appInstagram", label: "인스타그램", feed: "Instagram", sub: SNS, source: of("instagram"), on: true, side: 37,
    tile: { radial: [0.18, 1.04, 1.3], stops: [[0, "#ffd600"], [0.22, "#ff7a00"], [0.48, "#ff0069"], [0.75, "#d300c5"], [1, "#7638fa"]] },
    parts: mono(si(siInstagram)),
  },
  { id: "appFacebook", label: "페이스북", feed: "Facebook", sub: SNS, source: of("facebook"), on: true, side: 24, tile: "#0866ff", parts: mono(FACEBOOK_F) },
  { id: "appThreads", label: "스레드", feed: "Threads", sub: SNS, source: of("threads"), on: true, side: 40, tile: BLACK, parts: mono(si(siThreads)) },
  { id: "appX", label: "X", feed: "X", sub: SNS, source: of("x"), on: true, side: 44, tile: BLACK, parts: mono(si(siX)) },
  {
    id: "appSnapchat", label: "스냅챗", feed: "Snapchat", sub: SNS, source: of("snapchat"), on: true, side: 34, tile: "#fffc00",
    parts: [{ d: SNAPCHAT, paint: WHITE }, { d: siSnapchat.path, stroke: 0.9, height: 0, paint: BLACK }],
  },
  { id: "appPinterest", label: "핀터레스트", feed: "Pinterest", sub: SNS, source: of("pinterest"), side: 31, tile: WHITE, parts: mono(si(siPinterest), "#e60023") },
  { id: "appReddit", label: "레딧", feed: "Reddit", sub: SNS, source: of("reddit"), side: 27, tile: "#ff4500", parts: mono(drop(si(siReddit), 0)) },
  { id: "appBluesky", label: "블루스카이", feed: "Bluesky", sub: SNS, source: of("bluesky"), side: 40, tile: "#1185fe", parts: mono(si(siBluesky)) },
  { id: "appBereal", label: "비리얼", feed: "BeReal", sub: SNS, source: of("bereal"), side: 30, tile: BLACK, parts: mono(si(siBereal)) },
  {
    id: "appTinder", label: "틴더", feed: "Tinder", sub: SNS, source: of("tinder"), side: 40,
    tile: { linear: [1, 0, 0, 1], stops: [[0, "#ff655b"], [1, "#fd267a"]] }, parts: mono(si(siTinder)),
  },

  // 메신저
  { id: "appWhatsapp", label: "왓츠앱", feed: "WhatsApp", sub: CHAT, source: of("whatsapp"), on: true, side: 34, tile: down("#5ffc7b", "#28d146"), parts: mono(si(siWhatsapp)) },
  {
    id: "appMessenger", label: "메신저", feed: "Messenger", sub: CHAT, source: of("messenger"), on: true, side: 33, tile: WHITE,
    parts: mono(si(siMessenger), { radial: [3, 24, 30], stops: [[0, "#ff6968"], [0.5, "#a334fa"], [1, "#0695ff"]] }),
  },
  { id: "appTelegram", label: "텔레그램", feed: "Telegram", sub: CHAT, source: of("telegram"), on: true, side: 24, tile: down("#2aabee", "#229ed9"), parts: mono(pick(si(siTelegram), 1)) },
  { id: "appDiscord", label: "디스코드", feed: "Discord", sub: CHAT, source: of("discord"), on: true, side: 37, tile: "#5865f2", parts: mono(si(siDiscord)) },
  { id: "appSignal", label: "시그널", feed: "Signal", sub: CHAT, source: of("signal"), side: 36, tile: "#3b45fd", parts: mono(si(siSignal)) },
  { id: "appViber", label: "바이버", feed: "Viber", sub: CHAT, source: of("viber"), side: 34, tile: "#7360f2", parts: mono(si(siViber)) },
  { id: "appMessages", label: "메시지", feed: "iMessage", sub: CHAT, source: of("imessage"), side: 24, tile: down("#5bf675", "#0cbd2a"), parts: mono(pick(si(siImessage), 1)) },

  // 영상·음악
  { id: "appYoutube", label: "유튜브", feed: "YouTube", sub: MEDIA, source: of("youtube"), on: true, side: 33, tile: WHITE, parts: mono(si(siYoutube), "#ff0000") },
  { id: "appTiktok", label: "틱톡", feed: "TikTok", sub: MEDIA, source: of("tiktok"), on: true, side: 40, tile: BLACK, parts: tiktokNote },
  {
    id: "appNetflix", label: "넷플릭스", feed: "Netflix", sub: MEDIA, source: of("netflix"), on: true, side: 40, tile: BLACK,
    // The N's two legs, and the ribbon folded over them.
    parts: [{ d: pick(NETFLIX, 1, 2), paint: "#b1060f" }, { d: pick(NETFLIX, 0), paint: "#e50914" }],
  },
  { id: "appSpotify", label: "스포티파이", feed: "Spotify", sub: MEDIA, source: of("spotify"), on: true, side: 36, tile: BLACK, parts: mono(si(siSpotify), "#1ed760") },
  {
    id: "appAppleMusic", label: "Apple Music", feed: "Apple Music", sub: MEDIA, source: of("applemusic"), side: 24,
    tile: { linear: [0, 1, 0, 0], stops: [[0, "#fa233b"], [1, "#fb5c74"]] }, parts: mono(pick(si(siApplemusic), 1)),
  },
  { id: "appSoundcloud", label: "사운드클라우드", feed: "SoundCloud", sub: MEDIA, source: of("soundcloud"), side: 33, tile: down("#ff8800", "#ff3300"), parts: mono(si(siSoundcloud)) },
  { id: "appShazam", label: "샤잠", feed: "Shazam", sub: MEDIA, source: of("shazam"), side: 24, tile: down("#1cb8ff", "#0066ff"), parts: mono(pick(si(siShazam), 1, 2)) },
  { id: "appAppleTv", label: "Apple TV", feed: "Apple TV", sub: MEDIA, source: of("appletv"), side: 38, tile: BLACK, parts: mono(si(siAppletv)) },
  { id: "appPodcasts", label: "팟캐스트", feed: "Podcasts", sub: MEDIA, source: of("applepodcasts"), side: 24, tile: down("#f452ff", "#832bc1"), parts: mono(drop(si(siApplepodcasts), 0)) },
  { id: "appCrunchyroll", label: "크런치롤", feed: "Crunchyroll", sub: MEDIA, source: of("crunchyroll"), side: 36, tile: "#f47521", parts: mono(si(siCrunchyroll)) },

  // 결제·금융
  {
    id: "appPaypal", label: "페이팔", feed: "PayPal", sub: MONEY, source: of("paypal"), side: 30, tile: WHITE,
    parts: [{ d: pick(si(siPaypal), 0), paint: "#002991" }, { d: pick(si(siPaypal), 1), paint: "#60cdff" }, { d: pick(si(siPaypal), 2), paint: "#008cff", height: 0 }],
  },
  // Venmo's icon is its wordmark's v alone.
  { id: "appVenmo", label: "벤모", feed: "Venmo", sub: MONEY, source: of("venmo"), side: 8.4, at: [2.1, 11.95], tile: "#008cff", parts: mono(pick(VENMO, 6)) },
  { id: "appCashapp", label: "캐시앱", feed: "Cash App", sub: MONEY, source: of("cashapp"), side: 24, tile: "#00d64f", parts: mono(pick(si(siCashapp), 1)) },
  { id: "appRevolut", label: "레볼루트", feed: "Revolut", sub: MONEY, source: of("revolut"), side: 38, tile: BLACK, parts: mono(si(siRevolut)) },
  { id: "appKlarna", label: "클라르나", feed: "Klarna", sub: MONEY, source: of("klarna"), side: 40, tile: "#ffa8cd", parts: mono(si(siKlarna), "#0b051d") },
  { id: "appWise", label: "와이즈", feed: "Wise", sub: MONEY, source: of("wise"), side: 38, tile: "#9fe870", parts: mono(si(siWise), "#163300") },
  { id: "appNubank", label: "누뱅크", feed: "Nubank", sub: MONEY, source: of("nubank"), side: 38, tile: "#820ad1", parts: mono(si(siNubank)) },
  { id: "appPicpay", label: "픽페이", feed: "PicPay", sub: MONEY, source: of("picpay"), side: 34, tile: "#21c25e", parts: mono(si(siPicpay)) },
  { id: "appBinance", label: "바이낸스", feed: "Binance", sub: MONEY, source: of("binance"), side: 38, tile: "#181a20", parts: mono(si(siBinance), "#f0b90b") },
  { id: "appRobinhood", label: "로빈후드", feed: "Robinhood", sub: MONEY, source: of("robinhood"), side: 38, tile: "#ccff00", parts: mono(si(siRobinhood), BLACK) },

  // 쇼핑·배달
  {
    id: "appEbay", label: "이베이", feed: "eBay", sub: SHOP, source: of("ebay"), side: 30, tile: WHITE,
    parts: [
      { d: EBAY, paint: "#e53238" },
      mask(EBAY, rect(6.1, 0, 12.15, 24), "#0064d2"),
      mask(EBAY, rect(12.15, 0, 17.55, 24), "#f5af02"),
      mask(EBAY, rect(17.55, 0, 25, 24), "#86b817"),
    ],
  },
  { id: "appEtsy", label: "엣시", feed: "Etsy", sub: SHOP, source: of("etsy"), side: 40, tile: "#f1641e", parts: mono(si(siEtsy)) },
  { id: "appTarget", label: "타깃", feed: "Target", sub: SHOP, source: of("target"), side: 32, tile: WHITE, parts: mono(si(siTarget), "#cc0000") },
  { id: "appVinted", label: "빈티드", feed: "Vinted", sub: SHOP, source: of("vinted"), side: 36, tile: "#007782", parts: mono(si(siVinted)) },
  { id: "appMcdonalds", label: "맥도날드", feed: "McDonald's", sub: SHOP, source: of("mcdonalds"), side: 34, tile: "#db0007", parts: mono(si(siMcdonalds), "#ffbc0d") },
  { id: "appDoordash", label: "도어대시", feed: "DoorDash", sub: SHOP, source: of("doordash"), side: 38, tile: "#ff3008", parts: mono(si(siDoordash)) },
  {
    id: "appUberEats", label: "우버이츠", feed: "Uber Eats", sub: SHOP, source: of("ubereats"), side: 30, tile: BLACK,
    parts: [{ d: pick(UBEREATS, 0, 1, 2, 3, 4, 5), paint: WHITE }, { d: drop(UBEREATS, 0, 1, 2, 3, 4, 5), paint: "#06c167" }],
  },
  { id: "appDeliveroo", label: "딜리버루", feed: "Deliveroo", sub: SHOP, source: of("deliveroo"), side: 36, tile: "#00ccbc", parts: mono(si(siDeliveroo)) },
  { id: "appIfood", label: "아이푸드", feed: "iFood", sub: SHOP, source: of("ifood"), side: 33, tile: "#ea1d2c", parts: mono(si(siIfood)) },

  // 생활·이동
  { id: "appUber", label: "우버", feed: "Uber", sub: MOVE, source: of("uber"), side: 32, tile: BLACK, parts: mono(si(siUber)) },
  { id: "appLyft", label: "리프트", feed: "Lyft", sub: MOVE, source: of("lyft"), side: 38, tile: "#ff00bf", parts: mono(si(siLyft)) },
  { id: "appAirbnb", label: "에어비앤비", feed: "Airbnb", sub: MOVE, source: of("airbnb"), side: 40, tile: WHITE, parts: mono(si(siAirbnb), "#ff385c") },
  {
    id: "appBooking", label: "부킹닷컴", feed: "Booking.com", sub: MOVE, source: of("bookingdotcom"), side: 24, tile: "#003b95",
    parts: [{ d: pick(si(siBookingdotcom), 1, 2, 3), paint: WHITE }, { d: pick(si(siBookingdotcom), 4), paint: "#009fe3" }],
  },
  {
    id: "appWaze", label: "웨이즈", feed: "Waze", sub: MOVE, source: of("waze"), side: 32, tile: "#33ccff",
    // The white body, and its outline, eyes and smile standing proud of it.
    parts: [{ d: pick(WAZE, 1), paint: WHITE }, { d: WAZE, paint: "#0a0a0a" }],
  },
  { id: "appStrava", label: "스트라바", feed: "Strava", sub: MOVE, source: of("strava"), side: 38, tile: "#fc4c02", parts: mono(si(siStrava)) },
  { id: "appDuolingo", label: "듀오링고", feed: "Duolingo", sub: MOVE, source: of("duolingo"), side: 32, tile: "#58cc02", parts: mono(si(siDuolingo)) },
  { id: "appTripadvisor", label: "트립어드바이저", feed: "Tripadvisor", sub: MOVE, source: of("tripadvisor"), side: 32, tile: "#34e0a1", parts: mono(si(siTripadvisor), BLACK) },

  // 구글
  { id: "appGoogle", label: "구글", feed: "Google", sub: GOOGLE, source: of("google"), on: true, side: 39, tile: WHITE, parts: google },
  {
    id: "appChrome", label: "크롬", feed: "Chrome", sub: GOOGLE, source: of("googlechrome"), on: true, side: 30, tile: WHITE,
    parts: [
      { d: pick(CHROME, 0), paint: "#ea4335" },
      { d: pick(CHROME, 1), paint: "#34a853" },
      { d: pick(CHROME, 2), paint: "#fbbc04" },
      { d: pick(CHROME, 3), paint: "#1a73e8" },
    ],
  },
  { id: "appGmail", label: "지메일", feed: "Gmail", sub: GOOGLE, source: of("gmail"), on: true, side: 32, tile: WHITE, parts: gmail },
  {
    id: "appMaps", label: "구글 지도", feed: "Google Maps", sub: GOOGLE, source: of("googlemaps"), on: true, side: 33, tile: WHITE,
    parts: [
      { d: pick(MAPS, 0), paint: "#34a853" },
      { d: pick(MAPS, 1), paint: "#fbbc04" },
      { d: pick(MAPS, 2), paint: "#ea4335" },
      { d: pick(MAPS, 3), paint: "#4285f4" },
      { d: pick(MAPS, 4), paint: "#1a73e8" },
    ],
  },
  {
    id: "appDrive", label: "구글 드라이브", feed: "Google Drive", sub: GOOGLE, source: of("googledrive"), side: 31, tile: WHITE,
    parts: [
      { d: pick(DRIVE, 0), paint: "#ffba00" },
      { d: pick(DRIVE, 1), paint: "#00ac47" },
      mask(pick(DRIVE, 1), rect(-1, 15.9, 12, 24), "#0066da"),
      { d: pick(DRIVE, 2), paint: "#2684fc" },
      mask(pick(DRIVE, 2), [[16.4, 15.9], [30, 15.9], [30, 23], [20.45, 23]], "#ea4335"),
    ],
  },
  {
    id: "appMeet", label: "구글 미트", feed: "Google Meet", sub: GOOGLE, source: of("googlemeet"), side: 32, tile: WHITE,
    parts: [
      { d: pick(MEET, 0), paint: "#ea4335" },
      { d: pick(MEET, 1), paint: "#ffba00" },
      { d: pick(MEET, 2), paint: "#00ac47" },
      { d: pick(MEET, 3), paint: "#2684fc" },
      { d: pick(MEET, 4), paint: "#00ac47" },
      { d: pick(MEET, 5), paint: "#0066da" },
    ],
  },
  {
    id: "appCalendar", label: "구글 캘린더", feed: "Google Calendar", sub: GOOGLE, source: of("googlecalendar"), side: 31, tile: WHITE,
    parts: [
      { d: pick(CAL, 0), paint: "#fbbc04" },
      { d: pick(CAL, 1), paint: "#34a853" },
      { d: pick(CAL, 2, 3, 4), paint: "#4285f4" },
      { d: pick(CAL, 5), paint: "#1967d2" },
      { d: pick(CAL, 6), paint: "#ea4335" },
      { d: pick(CAL, 7), paint: "#188038" },
    ],
  },
  {
    id: "appPlay", label: "구글 플레이", feed: "Google Play", sub: GOOGLE, source: of("googleplay"), side: 32, tile: WHITE,
    parts: [
      { d: pick(PLAY, 0), paint: "#fbbc04" },
      { d: pick(PLAY, 1), paint: "#4285f4" },
      { d: pick(PLAY, 2), paint: "#34a853" },
      { d: pick(PLAY, 3), paint: "#ea4335" },
    ],
  },

  // 애플·생산성
  { id: "appAppStore", label: "App Store", feed: "App Store", sub: APPLE, source: of("appstore"), side: 40, tile: down("#18bffb", "#2072f3"), parts: mono(si(siAppstore)) },
  {
    id: "appSafari", label: "사파리", feed: "Safari", sub: APPLE, source: of("safari"), side: 28, tile: WHITE,
    parts: mono(si(siSafari), { radial: [12, 12, 12], stops: [[0, "#1fd1f9"], [1, "#1e6ff1"]] }),
  },
  { id: "appNotion", label: "노션", feed: "Notion", sub: APPLE, source: of("notion"), side: 32, tile: WHITE, parts: mono(si(siNotion), BLACK) },
  { id: "appDropbox", label: "드롭박스", feed: "Dropbox", sub: APPLE, source: of("dropbox"), side: 38, tile: "#0061fe", parts: mono(si(siDropbox)) },

  // AI
  { id: "appChatgpt", label: "ChatGPT", feed: "ChatGPT", sub: AI, source: lobe("openai"), on: true, side: 36, tile: WHITE, parts: mono(evenOdd(shape(LOBE_OPENAI)), BLACK) },
  { id: "appGemini", label: "제미나이", feed: "Gemini", sub: AI, source: lobe("gemini-color"), on: true, side: 32, tile: WHITE, parts: gemini },
  { id: "appClaude", label: "클로드", feed: "Claude", sub: AI, source: of("claude"), on: true, side: 36, tile: "#faf9f5", parts: mono(si(siClaude), "#d97757") },
  { id: "appPerplexity", label: "퍼플렉시티", feed: "Perplexity", sub: AI, source: lobe("perplexity-color"), side: 36, tile: "#091717", parts: mono(evenOdd(shape(LOBE_PERPLEXITY)), "#22b8cd") },
  { id: "appDeepseek", label: "딥시크", feed: "DeepSeek", sub: AI, source: lobe("deepseek-color"), side: 32, tile: WHITE, parts: mono(evenOdd(shape(LOBE_DEEPSEEK)), "#4d6bfe") },
  { id: "appGrok", label: "그록", feed: "Grok", sub: AI, source: lobe("grok"), side: 38, tile: BLACK, parts: mono(evenOdd(shape(LOBE_GROK))) },
  {
    id: "appCopilot", label: "코파일럿", feed: "Copilot", sub: AI, source: lobe("copilot-color"), side: 32, tile: WHITE,
    parts: [
      { d: shape(LOBE_COPILOT[0]!), paint: { linear: [12.67, 0.59, 2.9, 20.43], stops: [[0.25, "#109df2"], [0.72, "#aad445"], [0.97, "#ffd400"]] } },
      { d: shape(LOBE_COPILOT[2]!), paint: { linear: [21.95, 4.76, 12, 25.55], stops: [[0.07, "#8c48ff"], [0.5, "#f2598a"], [0.9, "#ffb152"]] } },
    ],
  },
  {
    id: "appDoubao", label: "더우바오", feed: "Doubao", sub: AI, source: lobe("doubao-color"), side: 32, tile: WHITE,
    parts: [
      { d: shape(LOBE_DOUBAO[2]!), paint: "#a569ff" },
      { d: shape(LOBE_DOUBAO[0]!), paint: "#1e37fc" },
      { d: shape(LOBE_DOUBAO[3]!), paint: "#1e37fc" },
      { d: shape(LOBE_DOUBAO[1]!), paint: "#37e1be" },
    ],
  },
  {
    id: "appKimi", label: "키미", feed: "Kimi", sub: AI, source: lobe("kimi-color"), side: 34, tile: BLACK,
    parts: [{ d: shape(LOBE_KIMI[1]!), paint: WHITE }, { d: shape(LOBE_KIMI[0]!), paint: "#1783ff" }],
  },
  { id: "appQwen", label: "큐원", feed: "Qwen", sub: AI, source: lobe("qwen-color"), side: 32, tile: WHITE, parts: mono(shape(LOBE_QWEN), "#082dff") },

  // 중국
  { id: "appWechat", label: "위챗", feed: "WeChat", sub: CHINA, source: of("wechat"), on: true, side: 33, tile: "#07c160", parts: mono(si(siWechat)) },
  { id: "appAlipay", label: "알리페이", feed: "Alipay", sub: CHINA, source: of("alipay"), side: 24.6, tile: "#1677ff", parts: mono(cutOut(si(siAlipay))) },
  { id: "appDouyin", label: "더우인", feed: "Douyin", sub: CHINA, source: of("tiktok"), side: 40, tile: BLACK, parts: tiktokNote },
  { id: "appMeituan", label: "메이퇀", feed: "Meituan", sub: CHINA, source: of("meituan"), side: 24, tile: "#ffd100", parts: mono(drop(si(siMeituan), 0), "#111111") },
  { id: "appXiaohongshu", label: "샤오홍슈", feed: "Xiaohongshu", sub: CHINA, source: of("xiaohongshu"), side: 31, tile: "#ff2442", parts: mono(si(siXiaohongshu)) },
  { id: "appBilibili", label: "빌리빌리", feed: "Bilibili", sub: CHINA, source: of("bilibili"), side: 34, tile: "#fb7299", parts: mono(si(siBilibili)) },
  { id: "appKuaishou", label: "콰이쇼우", feed: "Kuaishou", sub: CHINA, source: of("kuaishou"), side: 34, tile: "#ff4906", parts: mono(si(siKuaishou)) },
  { id: "appZhihu", label: "즈후", feed: "Zhihu", sub: CHINA, source: of("zhihu"), side: 24, tile: "#0084ff", parts: mono(drop(si(siZhihu), 0)) },
  { id: "appBaidu", label: "바이두", feed: "Baidu", sub: CHINA, source: of("baidu"), side: 32, tile: WHITE, parts: mono(si(siBaidu), "#2932e1") },
  { id: "appNeteaseMusic", label: "왕이윈뮤직", feed: "NetEase Cloud Music", sub: CHINA, source: of("neteasecloudmusic"), side: 24, tile: "#ec4141", parts: mono(drop(si(siNeteasecloudmusic), 2)) },

  // 한국·일본
  { id: "appKakaotalk", label: "카카오톡", feed: "KakaoTalk", sub: KOREA, source: of("kakaotalk"), on: true, side: 24, tile: "#fee500", parts: mono(evenOdd(drop(si(siKakaotalk), 0)), "#3a1d1d") },
  { id: "appNaver", label: "네이버", feed: "Naver", sub: KOREA, source: of("naver"), on: true, side: 50, tile: "#03c75a", parts: mono(si(siNaver)) },
  { id: "appLine", label: "라인", feed: "LINE", sub: KOREA, source: of("line"), on: true, side: 30, tile: "#06c755", parts: mono(si(siLine)) },
  { id: "appWebtoon", label: "웹툰", feed: "WEBTOON", sub: KOREA, source: of("webtoon"), side: 30, tile: "#00dc64", parts: mono(si(siWebtoon)) },

  // 인도·동남아
  { id: "appPhonepe", label: "폰페", feed: "PhonePe", sub: SOUTH, source: of("phonepe"), side: 24, tile: "#5f259f", parts: mono(pick(si(siPhonepe), 2, 0)) },
  {
    id: "appPaytm", label: "페이티엠", feed: "Paytm", sub: SOUTH, source: of("paytm"), side: 30, tile: WHITE,
    parts: [{ d: drop(PAYTM, 0, 1), paint: "#002e6e" }, { d: pick(PAYTM, 0, 1), paint: "#00baf2" }],
  },
  { id: "appSwiggy", label: "스위기", feed: "Swiggy", sub: SOUTH, source: of("swiggy"), side: 38, tile: "#fc8019", parts: mono(si(siSwiggy)) },
  { id: "appZomato", label: "조마토", feed: "Zomato", sub: SOUTH, source: of("zomato"), side: 30, tile: "#e23744", parts: mono(si(siZomato)) },
  { id: "appGrab", label: "그랩", feed: "Grab", sub: SOUTH, source: of("grab"), side: 30, tile: "#00b14f", parts: mono(si(siGrab)) },
  { id: "appGojek", label: "고젝", feed: "Gojek", sub: SOUTH, source: of("gojek"), side: 36, tile: "#00aa13", parts: mono(si(siGojek)) },
  { id: "appShopee", label: "쇼피", feed: "Shopee", sub: SOUTH, source: of("shopee"), side: 38, tile: "#ee4d2d", parts: mono(si(siShopee)) },

  // 게임
  { id: "appRoblox", label: "로블록스", feed: "Roblox", sub: GAMES, source: of("roblox"), side: 34, tile: "#1b1b1f", parts: mono(si(siRoblox)) },
  { id: "appSteam", label: "스팀", feed: "Steam", sub: GAMES, source: of("steam"), side: 30, tile: { linear: [0, 0, 1, 1], stops: [[0, "#111d2e"], [1, "#1a4f7a"]] }, parts: mono(si(siSteam)) },
  { id: "appPlaystation", label: "플레이스테이션", feed: "PlayStation", sub: GAMES, source: of("playstation"), side: 36, tile: down("#0070d1", "#003791"), parts: mono(si(siPlaystation)) },
  { id: "appEpicGames", label: "에픽게임즈", feed: "Epic Games", sub: GAMES, source: of("epicgames"), side: 34, tile: "#121212", parts: mono(si(siEpicgames)) },
  { id: "appTwitch", label: "트위치", feed: "Twitch", sub: GAMES, source: of("twitch"), side: 34, tile: "#9146ff", parts: mono(evenOdd(pick(si(siTwitch), 3, 0, 1))) },
];

const apps: CatalogueGroup = { id: "apps", label: "앱 아이콘", kinds: ICONS.map(kindOf) };

export default apps;
