// 정보의 포장 (UI) (bubble/9 기호의 파티, user 2026-11-05): the UI icons today's phones and web apps ship — the packaging
// of information — each the shipped artwork, manufactured. A filled glyph (Google's Material Symbols, the filled
// weight-400 set Android ships) is a raised enamel/acrylic piece: flat top, a small rounded edge, no tile — the glyph
// is the object. A stroke icon (Lucide, stroke 2 with round caps, the outline look Instagram/X-style feeds ship) is a
// bent rod of round section: its height half the stroke's width and its bevel that height. Paint only where an icon
// has a canonical colour (iOS notification red, heart red, verified blue, iOS switch green, Material error red).
// Nothing is thickened or merged beyond the shipped drawing.
//
// Sources: Material Symbols via @iconify-json/material-symbols (Apache-2.0; https://fonts.google.com/icons), Lucide
// via @iconify-json/lucide (ISC; https://lucide.dev/icons/). Built from the shipped specs: the iOS switch
// (51×31 pt, https://developer.apple.com/design/human-interface-guidelines/toggles), the Material 3 slider
// (https://m3.material.io/components/sliders/specs), the iOS activity indicator
// (https://developer.apple.com/design/human-interface-guidelines/progress-indicators); colours from
// https://developer.apple.com/design/human-interface-guidelines/color (systemRed #FF3B30, systemGreen #34C759) and
// https://m3.material.io/styles/color/roles (error #B3261E, primary #6750A4).

import { MARK_FILL, subpathsOf } from "../shapes/marks.ts";
import type { CatalogueGroup, CatalogueKind, Paint, ReliefMake } from "./types.ts";

const BOX = [0, 0, 24, 24] as const;
/** An enamel glyph's height and edge, in object units. */
const ENAMEL = 0.22;
const ENAMEL_BEVEL = 0.045;

/** A filled Material glyph as a raised enamel piece, flat on top. */
function enamel(d: string, paint?: Paint): ReliefMake {
  return { source: "relief", viewBox: BOX, layers: [{ d, height: ENAMEL, bevel: ENAMEL_BEVEL, ...(paint ? { paint } : {}) }] };
}

/** How many object units one viewBox unit is, as relief.ts frames the layers (centred, the furthest point at `fill`). */
function unitOf(ds: readonly { d: string; pad: number }[], centre: readonly [number, number], fill = MARK_FILL) {
  let far = 1e-6;
  for (const { d, pad } of ds) for (const subpath of subpathsOf(d)) for (const [x, y] of subpath.points) far = Math.max(far, Math.hypot(x - centre[0], y - centre[1]) + pad);
  return fill / far;
}

// Path data copied from the packages (Material Symbols filled weight 400, 24 box; Lucide 24 box, stroke 2).
const M_ADD = "M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z";
const M_ALTERNATE_EMAIL = "M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12v1.45q0 1.475-1.012 2.513T18.5 17q-.875 0-1.65-.375t-1.3-1.075q-.725.725-1.638 1.088T12 17q-2.075 0-3.537-1.463T7 12t1.463-3.537T12 7t3.538 1.463T17 12v1.45q0 .65.425 1.1T18.5 15t1.075-.45t.425-1.1V12q0-3.35-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20h5v2zm2.125-7.875Q15 13.25 15 12t-.875-2.125T12 9t-2.125.875T9 12t.875 2.125T12 15t2.125-.875";
const M_ARROW_SELECTOR_TOOL = "m13.775 22l-3.625-7.8L6 20V2l14 11h-7.1l3.6 7.725z";
const M_ATTACH_FILE = "M18 15.75q0 2.6-1.825 4.425T11.75 22t-4.425-1.825T5.5 15.75V6.5q0-1.875 1.313-3.187T10 2t3.188 1.313T14.5 6.5v8.75q0 1.15-.8 1.95t-1.95.8t-1.95-.8t-.8-1.95V6h2v9.25q0 .325.213.538t.537.212t.538-.213t.212-.537V6.5q-.025-1.05-.737-1.775T10 4t-1.775.725T7.5 6.5v9.25q-.025 1.775 1.225 3.013T11.75 20q1.75 0 2.975-1.237T16 15.75V6h2z";
const M_BATTERY_CHARGING_FULL = "M16.5 22v-3H14l3.5-5v3H20zM8 22q-.425 0-.712-.288T7 21V5q0-.425.288-.712T8 4h2V2h4v2h2q.425 0 .713.288T17 5v7q-2.5.025-4.25 1.763T11 18q0 1.15.4 2.175T12.525 22z";
const M_BATTERY_FULL = "M8 22q-.425 0-.712-.288T7 21V5q0-.425.288-.712T8 4h2V2h4v2h2q.425 0 .713.288T17 5v16q0 .425-.288.713T16 22z";
const M_BOOKMARK = "M5 21V5q0-.825.588-1.412T7 3h10q.825 0 1.413.588T19 5v16l-7-3z";
const M_CALENDAR_MONTH = "M12 14q-.425 0-.712-.288T11 13t.288-.712T12 12t.713.288T13 13t-.288.713T12 14m-4.712-.288Q7 13.426 7 13t.288-.712T8 12t.713.288T9 13t-.288.713T8 14t-.712-.288M16 14q-.425 0-.712-.288T15 13t.288-.712T16 12t.713.288T17 13t-.288.713T16 14m-4 4q-.425 0-.712-.288T11 17t.288-.712T12 16t.713.288T13 17t-.288.713T12 18m-4.712-.288Q7 17.426 7 17t.288-.712T8 16t.713.288T9 17t-.288.713T8 18t-.712-.288M16 18q-.425 0-.712-.288T15 17t.288-.712T16 16t.713.288T17 17t-.288.713T16 18M5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V2h2v2h8V2h2v2h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22zm0-2h14V10H5z";
const M_CHAT_BUBBLE = "M2 22V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18H6z";
const M_CHECK = "m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z";
const M_CLOSE = "M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z";
const M_CLOUD = "M6.5 20q-2.275 0-3.887-1.575T1 14.575q0-1.95 1.175-3.475T5.25 9.15q.625-2.3 2.5-3.725T12 4q2.925 0 4.963 2.038T19 11q1.725.2 2.863 1.488T23 15.5q0 1.875-1.312 3.188T18.5 20z";
const M_DELETE = "M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z";
const M_FAVORITE = "m12 21l-1.45-1.3q-2.525-2.275-4.175-3.925T3.75 12.812T2.388 10.4T2 8.15Q2 5.8 3.575 4.225T7.5 2.65q1.3 0 2.475.55T12 4.75q.85-1 2.025-1.55t2.475-.55q2.35 0 3.925 1.575T22 8.15q0 1.15-.387 2.25t-1.363 2.412t-2.625 2.963T13.45 19.7z";
const M_FLIGHT = "M7 22v-2.5l3-2.1v-3.6L2 17v-3l8-5.6V4q0-.825.588-1.412T12 2t1.413.588T14 4v4.4l8 5.6v3l-8-3.2v3.6l3 2.1V22l-5-1.5z";
const M_FOLDER = "M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.587 1.413T20 20z";
const M_HELP = "M12.838 17.638q.362-.363.362-.888t-.362-.888t-.888-.362t-.887.363t-.363.887t.363.888t.887.362t.888-.363M11.05 14.15h1.85q0-.825.188-1.3t1.062-1.3q.65-.65 1.025-1.238T15.55 8.9q0-1.4-1.025-2.15T12.1 6q-1.425 0-2.312.75T8.55 8.55l1.65.65q.125-.45.563-.975T12.1 7.7q.8 0 1.2.438t.4.962q0 .5-.3.938t-.75.812q-1.1.975-1.35 1.475t-.25 1.825M12 22q-2.075 0-3.9-.787t-3.175-2.138T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22";
const M_HOME = "M4 21V9l8-6l8 6v12h-6v-7h-4v7z";
const M_HOURGLASS_TOP = "M8 20h8v-3q0-1.65-1.175-2.825T12 13t-2.825 1.175T8 17zm-4 2v-2h2v-3q0-1.525.713-2.863T8.7 12q-1.275-.8-1.987-2.137T6 7V4H4V2h16v2h-2v3q0 1.525-.712 2.863T15.3 12q1.275.8 1.988 2.138T18 17v3h2v2z";
const M_IMAGE = "M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z";
const M_INFO = "M11 17h2v-6h-2zm1.713-8.287Q13 8.425 13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9t.713-.288M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22";
const M_LINK = "M11 17H7q-2.075 0-3.537-1.463T2 12t1.463-3.537T7 7h4v2H7q-1.25 0-2.125.875T4 12t.875 2.125T7 15h4zm-3-4v-2h8v2zm5 4v-2h4q1.25 0 2.125-.875T20 12t-.875-2.125T17 9h-4V7h4q2.075 0 3.538 1.463T22 12t-1.463 3.538T17 17z";
const M_LOCAL_SHIPPING = "M3.875 19.125Q3 18.25 3 17H1V6q0-.825.588-1.412T3 4h14v4h3l3 4v5h-2q0 1.25-.875 2.125T18 20t-2.125-.875T15 17H9q0 1.25-.875 2.125T6 20t-2.125-.875m2.838-1.412Q7 17.425 7 17t-.288-.712T6 16t-.712.288T5 17t.288.713T6 18t.713-.288m12 0Q19 17.426 19 17t-.288-.712T18 16t-.712.288T17 17t.288.713T18 18t.713-.288M17 13h4.25L19 10h-2z";
const M_LOCATION_ON = "M13.413 11.413Q14 10.825 14 10t-.587-1.412T12 8t-1.412.588T10 10t.588 1.413T12 12t1.413-.587M12 22q-4.025-3.425-6.012-6.362T4 10.2q0-3.75 2.413-5.975T12 2t5.588 2.225T20 10.2q0 2.5-1.987 5.438T12 22";
const M_LOCK = "M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22zm7.413-5.587Q14 15.825 14 15t-.587-1.412T12 13t-1.412.588T10 15t.588 1.413T12 17t1.413-.587M9 8h6V6q0-1.25-.875-2.125T12 3t-2.125.875T9 6z";
const M_MIC = "M9.875 13.125Q9 12.25 9 11V5q0-1.25.875-2.125T12 2t2.125.875T15 5v6q0 1.25-.875 2.125T12 14t-2.125-.875M11 21v-3.075q-2.6-.35-4.3-2.325T5 11h2q0 2.075 1.463 3.538T12 16t3.538-1.463T17 11h2q0 2.625-1.7 4.6T13 17.925V21z";
const M_NOTIFICATIONS = "M4 19v-2h2v-7q0-2.075 1.25-3.687T10.5 4.2v-.7q0-.625.438-1.062T12 2t1.063.438T13.5 3.5v.7q2 .5 3.25 2.113T18 10v7h2v2zm8 3q-.825 0-1.412-.587T10 20h4q0 .825-.587 1.413T12 22";
const M_PAN_TOOL = "M10.05 23q-.75 0-1.4-.337T7.575 21.7L1.2 12.375l.6-.575q.475-.475 1.125-.55t1.175.3L7 13.575V4q0-.425.288-.712T8 3t.713.288T9 4v8h2V2q0-.425.288-.712T12 1t.713.288T13 2v10h2V3q0-.425.288-.712T16 2t.713.288T17 3v9h2V5q0-.425.288-.712T20 4t.713.288T21 5v14q0 1.65-1.175 2.825T17 23z";
const M_PAN_TOOL_ALT = "M9.95 21q-.675 0-1.287-.288T7.625 19.9L1.15 11.925l.65-.625q.475-.475 1.125-.55t1.175.3L7 13.075V3q0-.425.288-.712T8 2t.713.288T9 3v8h2V7q0-.425.288-.712T12 6t.713.288T13 7v4h2V8q0-.425.288-.712T16 7t.713.288T17 8v3h2v-1q0-.425.288-.712T20 9t.713.288T21 10v7q0 1.65-1.175 2.825T17 21z";
const M_PAUSE = "M14 19V5h4v14zm-8 0V5h4v14z";
const M_PHOTO_CAMERA = "M12 17.5q1.875 0 3.188-1.312T16.5 13t-1.312-3.187T12 8.5T8.813 9.813T7.5 13t1.313 3.188T12 17.5m0-2q-1.05 0-1.775-.725T9.5 13t.725-1.775T12 10.5t1.775.725T14.5 13t-.725 1.775T12 15.5M4 21q-.825 0-1.412-.587T2 19V7q0-.825.588-1.412T4 5h3.15L9 3h6l1.85 2H20q.825 0 1.413.588T22 7v12q0 .825-.587 1.413T20 21z";
const M_PLAY_ARROW = "M8 19V5l11 7z";
const M_POWER_SETTINGS_NEW = "M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12q0-2.1.788-3.912t2.137-3.163l1.4 1.4q-1.1 1.1-1.712 2.55T4 12q0 3.35 2.325 5.675T12 20t5.675-2.325T20 12q0-1.675-.612-3.125t-1.713-2.55l1.4-1.4q1.35 1.35 2.138 3.163T22 12q0 2.075-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m-1-9V2h2v11z";
const M_SAVE = "M21 7v12q0 .825-.587 1.413T19 21H5q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h12zm-6.875 10.125Q15 16.25 15 15t-.875-2.125T12 12t-2.125.875T9 15t.875 2.125T12 18t2.125-.875M6 10h9V6H6z";
const M_SCHEDULE = "m15.3 16.7l1.4-1.4l-3.7-3.7V7h-2v5.4zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22";
const M_SEARCH = "m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14";
const M_SELL = "m21.4 14.25l-7.15 7.15q-.3.3-.675.45t-.75.15t-.75-.15t-.675-.45l-8.825-8.825q-.275-.275-.425-.637T2 11.175V4q0-.825.588-1.412T4 2h7.175q.4 0 .775.163t.65.437l8.8 8.825q.3.3.438.675t.137.75t-.137.738t-.438.662M6.5 8q.625 0 1.063-.437T8 6.5t-.437-1.062T6.5 5t-1.062.438T5 6.5t.438 1.063T6.5 8";
const M_SETTINGS = "m9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75l-2.575 1.95q.025.175.025.338v.674q0 .163-.05.338l2.575 1.95l-2.75 4.75l-2.95-1.25q-.275.2-.575.375t-.6.3l-.4 3.2zm2.8-6.5q1.45 0 2.475-1.025T15.55 12t-1.025-2.475T12.05 8.5q-1.475 0-2.488 1.025T8.55 12t1.013 2.475T12.05 15.5";
const M_SHOPPING_BAG = "M6 22q-.825 0-1.412-.587T4 20V8q0-.825.588-1.412T6 6h2q0-1.65 1.175-2.825T12 2t2.825 1.175T16 6h2q.825 0 1.413.588T20 8v12q0 .825-.587 1.413T18 22zm4-16h4q0-.825-.587-1.412T12 4t-1.412.588T10 6m5.713 4.713Q16 10.425 16 10V8h-2v2q0 .425.288.713T15 11t.713-.288m-6 0Q10 10.426 10 10V8H8v2q0 .425.288.713T9 11t.713-.288";
const M_SHOPPING_CART = "M5.588 21.413Q5 20.825 5 20t.588-1.412T7 18t1.413.588T9 20t-.587 1.413T7 22t-1.412-.587m10 0Q15 20.825 15 20t.588-1.412T17 18t1.413.588T19 20t-.587 1.413T17 22t-1.412-.587M5.2 4h14.75q.575 0 .875.513t.025 1.037l-3.55 6.4q-.275.5-.737.775T15.55 13H8.1L7 15h12v2H7q-1.125 0-1.7-.987t-.05-1.963L6.6 11.6L3 4H1V2h3.25z";
const M_SIGNAL_CELLULAR_ALT = "M5 20v-6h3v6zm6 0V9h3v11zm6 0V4h3v16z";
const M_TAG = "m6 20l1-4H3l.5-2h4l1-4h-4L5 8h4l1-4h2l-1 4h4l1-4h2l-1 4h4l-.5 2h-4l-1 4h4l-.5 2h-4l-1 4h-2l1-4H9l-1 4zm3.5-6h4l1-4h-4z";
const M_THUMB_DOWN = "M6 3h10v13l-7 7l-1.25-1.25q-.175-.175-.288-.475T7.35 20.7v-.35L8.45 16H3q-.8 0-1.4-.6T1 14v-2q0-.175.037-.375t.113-.375l3-7.05q.225-.5.75-.85T6 3m12 13V3h4v13z";
const M_THUMB_UP = "M18 21H8V8l7-7l1.25 1.25q.175.175.288.475t.112.575v.35L15.55 8H21q.8 0 1.4.6T23 10v2q0 .175-.037.375t-.113.375l-3 7.05q-.225.5-.75.85T18 21M6 8v13H2V8z";
const M_VERIFIED = "m8.6 22.5l-1.9-3.2l-3.6-.8l.35-3.7L1 12l2.45-2.8l-.35-3.7l3.6-.8l1.9-3.2L12 2.95l3.4-1.45l1.9 3.2l3.6.8l-.35 3.7L23 12l-2.45 2.8l.35 3.7l-3.6.8l-1.9 3.2l-3.4-1.45zm2.35-6.95L16.6 9.9l-1.4-1.45l-4.25 4.25l-2.15-2.1L7.4 12z";
const M_VIDEOCAM = "M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h12q.825 0 1.413.588T18 6v4.5l4-4v11l-4-4V18q0 .825-.587 1.413T16 20z";
const M_VOLUME_UP = "M14 20.725v-2.05q2.25-.65 3.625-2.5t1.375-4.2t-1.375-4.2T14 5.275v-2.05q3.1.7 5.05 3.138T21 11.975t-1.95 5.613T14 20.725M3 15V9h4l5-5v16l-5-5zm11 1V7.95q1.175.55 1.838 1.65T16.5 12q0 1.275-.663 2.363T14 16";
const M_WARNING = "M1 21L12 2l11 19zm11.713-3.287Q13 17.425 13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18t.713-.288M11 15h2v-5h-2z";
const M_WIFI = "M10.225 20.275Q9.5 19.55 9.5 18.5t.725-1.775T12 16t1.775.725t.725 1.775t-.725 1.775T12 21t-1.775-.725M6.35 15.35l-2.1-2.15q1.475-1.475 3.463-2.337T12 10t4.288.875t3.462 2.375l-2.1 2.1q-1.1-1.1-2.55-1.725T12 13t-3.1.625t-2.55 1.725M2.1 11.1L0 9q2.3-2.35 5.375-3.675T12 4t6.625 1.325T24 9l-2.1 2.1q-1.925-1.925-4.462-3.012T12 7T6.563 8.088T2.1 11.1";

/** A rounded rectangle's path (corner radii: left pair `rl`, right pair `rr`). */
function roundRect(x: number, y: number, w: number, h: number, rl: number, rr = rl) {
  return `M${x + rl} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}V${y + h - rr}A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}H${x + rl}A${rl} ${rl} 0 0 1 ${x} ${y + h - rl}V${y + rl}A${rl} ${rl} 0 0 1 ${x + rl} ${y}Z`;
}

function circle(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
}

/** iOS activity indicator: eight spokes, round caps, outer radius 11 and inner 5.5 of a 24 box (20 pt drawn at 24). */
const SPOKE_WIDTH = 2.4;
const SPOKES = Array.from({ length: 8 }, (_, k) => {
  const a = (k * Math.PI) / 4 - Math.PI / 2;
  const [r0, r1] = [5.5 + SPOKE_WIDTH / 2, 11 - SPOKE_WIDTH / 2];
  const f = (n: number) => n.toFixed(3);
  return `M${f(12 + r0 * Math.cos(a))} ${f(12 + r0 * Math.sin(a))}L${f(12 + r1 * Math.cos(a))} ${f(12 + r1 * Math.sin(a))}`;
}).join("");
const SPOKE_HALF = (SPOKE_WIDTH * unitOf([{ d: SPOKES, pad: SPOKE_WIDTH / 2 }], [12, 12])) / 2;

const CUSTOM = {
  /** iOS UISwitch, on: a 51×31 pt green track, the 27 pt white knob standing proud of it at the right. */
  switch: {
    source: "relief",
    viewBox: [0, 0, 51, 31],
    layers: [
      { d: roundRect(0, 0, 51, 31, 15.5), height: 0.14, bevel: 0.05, paint: "#34C759" },
      { d: circle(35.5, 15.5, 13.5), height: 0.12, bevel: 0.1, paint: "#FFFFFF" },
    ],
  },
  /** iOS activity indicator: eight rods. */
  spinner: { source: "relief", viewBox: BOX, layers: [{ d: SPOKES, stroke: SPOKE_WIDTH, height: SPOKE_HALF, bevel: SPOKE_HALF }] },
} satisfies Record<string, ReliefMake>;

const group: CatalogueGroup = {
  id: "ui",
  label: "정보의 포장 (UI)",
  kinds: [
  { id: "uiBell", label: "알림 종", feed: "Notifications", sub: "알림·소셜", make: enamel(M_NOTIFICATIONS), source: "@iconify-json/material-symbols notifications (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiHeart", label: "좋아요", feed: "Like", sub: "알림·소셜", make: enamel(M_FAVORITE, "#FF3040"), source: "@iconify-json/material-symbols favorite (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiThumbUp", label: "추천", feed: "Like", sub: "알림·소셜", make: enamel(M_THUMB_UP), source: "@iconify-json/material-symbols thumb-up (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiThumbDown", label: "비추천", feed: "Dislike", sub: "알림·소셜", make: enamel(M_THUMB_DOWN), source: "@iconify-json/material-symbols thumb-down (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiChatBubble", label: "채팅", feed: "Chat", sub: "알림·소셜", make: enamel(M_CHAT_BUBBLE), source: "@iconify-json/material-symbols chat-bubble (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiBookmark", label: "저장", feed: "Bookmark", sub: "알림·소셜", make: enamel(M_BOOKMARK), source: "@iconify-json/material-symbols bookmark (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiVerified", label: "인증 배지", feed: "Verified", sub: "알림·소셜", make: enamel(M_VERIFIED, "#1D9BF0"), source: "@iconify-json/material-symbols verified (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiAt", label: "멘션 @", feed: "Mention", sub: "알림·소셜", make: enamel(M_ALTERNATE_EMAIL), source: "@iconify-json/material-symbols alternate-email (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiHashtag", label: "해시태그 #", feed: "Hashtag", sub: "알림·소셜", make: enamel(M_TAG), source: "@iconify-json/material-symbols tag (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiPlay", label: "재생", feed: "Play", sub: "미디어", make: enamel(M_PLAY_ARROW), source: "@iconify-json/material-symbols play-arrow (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiPause", label: "일시정지", feed: "Pause", sub: "미디어", make: enamel(M_PAUSE), source: "@iconify-json/material-symbols pause (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiVolume", label: "볼륨", feed: "Volume", sub: "미디어", make: enamel(M_VOLUME_UP), source: "@iconify-json/material-symbols volume-up (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiMic", label: "마이크", feed: "Mic", sub: "미디어", make: enamel(M_MIC), source: "@iconify-json/material-symbols mic (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiCamera", label: "카메라", feed: "Camera", sub: "미디어", make: enamel(M_PHOTO_CAMERA), source: "@iconify-json/material-symbols photo-camera (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiVideocam", label: "비디오", feed: "Video", sub: "미디어", make: enamel(M_VIDEOCAM), source: "@iconify-json/material-symbols videocam (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiWifi", label: "와이파이", feed: "Wi-Fi", sub: "시스템", make: enamel(M_WIFI), source: "@iconify-json/material-symbols wifi (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiSignal", label: "신호", feed: "Signal", sub: "시스템", make: enamel(M_SIGNAL_CELLULAR_ALT), source: "@iconify-json/material-symbols signal-cellular-alt (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiBatteryFull", label: "배터리", feed: "Battery", sub: "시스템", make: enamel(M_BATTERY_FULL), source: "@iconify-json/material-symbols battery-full (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiBatteryCharging", label: "충전 중", feed: "Charging", sub: "시스템", make: enamel(M_BATTERY_CHARGING_FULL, "#34C759"), source: "@iconify-json/material-symbols battery-charging-full (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiLock", label: "잠금", feed: "Lock", sub: "시스템", make: enamel(M_LOCK), source: "@iconify-json/material-symbols lock (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiPower", label: "전원", feed: "Power", sub: "시스템", make: enamel(M_POWER_SETTINGS_NEW), source: "@iconify-json/material-symbols power-settings-new (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiSettings", label: "설정", feed: "Settings", sub: "시스템", make: enamel(M_SETTINGS), source: "@iconify-json/material-symbols settings (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiAirplane", label: "비행기 모드", feed: "Airplane mode", sub: "시스템", make: enamel(M_FLIGHT), source: "@iconify-json/material-symbols flight (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiLocation", label: "위치", feed: "Location", sub: "시스템", make: enamel(M_LOCATION_ON, "#EA4335"), source: "@iconify-json/material-symbols location-on (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiHome", label: "홈", feed: "Home", sub: "탐색·입력", make: enamel(M_HOME), source: "@iconify-json/material-symbols home (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiSearch", label: "검색", feed: "Search", sub: "탐색·입력", make: enamel(M_SEARCH), source: "@iconify-json/material-symbols search (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiClose", label: "닫기", feed: "Close", sub: "탐색·입력", make: enamel(M_CLOSE), source: "@iconify-json/material-symbols close (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiAdd", label: "추가", feed: "Add", sub: "탐색·입력", make: enamel(M_ADD), source: "@iconify-json/material-symbols add (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiCheck", label: "확인", feed: "Check", sub: "탐색·입력", make: enamel(M_CHECK), source: "@iconify-json/material-symbols check (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiToggle", label: "토글 스위치", feed: "Toggle", sub: "탐색·입력", make: CUSTOM.switch, source: "iOS UISwitch, 51×31 pt, knob 27 pt, on #34C759 (Apple HIG Toggles)" },
  { id: "uiCart", label: "장바구니", feed: "Cart", sub: "커머스", make: enamel(M_SHOPPING_CART), source: "@iconify-json/material-symbols shopping-cart (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiBag", label: "쇼핑백", feed: "Shopping", sub: "커머스", make: enamel(M_SHOPPING_BAG), source: "@iconify-json/material-symbols shopping-bag (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiPriceTag", label: "가격표", feed: "Sale", sub: "커머스", make: enamel(M_SELL), source: "@iconify-json/material-symbols sell (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiShipping", label: "배송", feed: "Shipping", sub: "커머스", make: enamel(M_LOCAL_SHIPPING), source: "@iconify-json/material-symbols local-shipping (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiClock", label: "시계", feed: "Schedule", sub: "시간·상태", make: enamel(M_SCHEDULE), source: "@iconify-json/material-symbols schedule (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiCalendar", label: "캘린더", feed: "Calendar", sub: "시간·상태", make: enamel(M_CALENDAR_MONTH), source: "@iconify-json/material-symbols calendar-month (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiHourglass", label: "모래시계", feed: "Loading", sub: "시간·상태", make: enamel(M_HOURGLASS_TOP), source: "@iconify-json/material-symbols hourglass-top (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiSpinner", label: "로딩 스피너 (iOS)", feed: "Loading", sub: "시간·상태", make: CUSTOM.spinner, source: "iOS UIActivityIndicatorView (iOS 13+): eight round-capped spokes" },
  { id: "uiWarning", label: "경고", feed: "Warning", sub: "시간·상태", make: enamel(M_WARNING), source: "@iconify-json/material-symbols warning (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiInfo", label: "정보", feed: "Info", sub: "시간·상태", make: enamel(M_INFO), source: "@iconify-json/material-symbols info (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiHelp", label: "도움말", feed: "Help", sub: "시간·상태", make: enamel(M_HELP), source: "@iconify-json/material-symbols help (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiCursor", label: "화살표 커서", feed: "Cursor", sub: "커서·손", make: enamel(M_ARROW_SELECTOR_TOOL), source: "@iconify-json/material-symbols arrow-selector-tool (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiPointer", label: "포인터 손", feed: "Pointer", sub: "커서·손", make: enamel(M_PAN_TOOL_ALT), source: "@iconify-json/material-symbols pan-tool-alt (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiGrab", label: "잡는 손", feed: "Grab", sub: "커서·손", make: enamel(M_PAN_TOOL), source: "@iconify-json/material-symbols pan-tool (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiFolder", label: "폴더", feed: "Folder", sub: "파일", make: enamel(M_FOLDER), source: "@iconify-json/material-symbols folder (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiImage", label: "이미지", feed: "Image", sub: "파일", make: enamel(M_IMAGE), source: "@iconify-json/material-symbols image (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiLink", label: "링크", feed: "Link", sub: "파일", make: enamel(M_LINK), source: "@iconify-json/material-symbols link (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiAttach", label: "첨부", feed: "Attachment", sub: "파일", make: enamel(M_ATTACH_FILE), source: "@iconify-json/material-symbols attach-file (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiCloud", label: "클라우드", feed: "Cloud", sub: "파일", make: enamel(M_CLOUD), source: "@iconify-json/material-symbols cloud (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiTrash", label: "휴지통", feed: "Trash", sub: "파일", make: enamel(M_DELETE), source: "@iconify-json/material-symbols delete (Material Symbols, filled 400, Apache-2.0)" },
  { id: "uiSave", label: "저장 (플로피)", feed: "Save", sub: "파일", make: enamel(M_SAVE), source: "@iconify-json/material-symbols save (Material Symbols, filled 400, Apache-2.0)" },
  ] satisfies CatalogueKind[],
};

export default group;
