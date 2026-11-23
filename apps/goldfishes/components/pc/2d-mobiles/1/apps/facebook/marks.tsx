// Facebook's marks and glyphs.
//
// Sourced (verbatim paths):
// - Wordmark: Wikimedia Commons "Facebook logo (2023).svg" (the 2023 Facebook Sans wordmark, #0866FF).
// - App icon "f": Wikimedia Commons "2023 Facebook icon.svg"; the app icon is that white f on a #0866FF field,
//   its stem running off the bottom edge (Simple Icons "facebook" path, simple-icons@13.21.0, the f extended).
// - Messenger: Simple Icons "messenger" (simple-icons@13.21.0), filled, as in the iOS top bar.
//
// Drawn (no public vector of the iOS glyphs was reachable): tab-bar icons, action-row icons, the composer photo
// glyph, the audience globe and the reaction faces — fitted by eye to the App Store "Home" frame
// (apps.apple.com/us/app/facebook/id284882215, 4-iOS-Home.png, 1284 × 2778) and Facebook's reaction set.

import type { ReactNode } from "react";

const WORDMARK =
  "M881.583 257.897h29.48v-47.696l41.137 47.696h36.072l-47.89-54.969 40.909-47.663h-32.825l-37.403 43.93v-96.982l-29.48 3.864v151.82Zm-67.988-105.261c-32.728 0-55.455 22.013-55.455 53.929s22.727 53.929 55.455 53.929c32.727 0 55.455-22.013 55.455-53.929s-22.728-53.929-55.455-53.929Zm0 82.728c-15.163 0-25.552-11.721-25.552-28.799s10.389-28.799 25.552-28.799c15.162 0 25.552 11.721 25.552 28.799s-10.39 28.799-25.552 28.799Zm-119.807-82.728c-32.727 0-55.455 22.013-55.455 53.929s22.728 53.929 55.455 53.929c32.728 0 55.455-22.013 55.455-53.929s-22.727-53.929-55.455-53.929Zm0 82.728c-15.162 0-25.552-11.721-25.552-28.799s10.39-28.799 25.552-28.799c15.163 0 25.552 11.721 25.552 28.799s-10.389 28.799-25.552 28.799Zm-112.826-82.728c-13.636 0-24.935 5.357-32.013 15.162v-65.585l-29.513 3.831v151.82h26.169l.519-15.844c6.981 11.818 19.481 18.474 34.838 18.474 27.988 0 48.475-22.728 48.475-53.929 0-31.202-20.39-53.929-48.475-53.929Zm-6.98 82.728c-15.163 0-25.552-11.721-25.552-28.799s10.389-28.799 25.552-28.799c15.162 0 25.552 11.721 25.552 28.799s-10.39 28.799-25.552 28.799Zm-113.638 1.331c-15.649 0-26.883-7.273-30.714-19.805h72.63c.715-3.831 1.202-8.377 1.202-11.429 0-33.02-18.475-52.825-49.514-52.825-31.331 0-53.02 22.013-53.02 53.929 0 32.338 22.728 53.929 56.462 53.929 17.467 0 34.448-5.844 45.065-15.552l-10.617-18.701c-10.292 7.11-20.39 10.454-31.494 10.454Zm-6.591-61.137c13.637 0 22.338 8.279 22.338 21.104v.098h-47.078c2.825-13.604 11.623-21.202 24.74-21.202Zm-98.994 84.968c15.26 0 30.195-5.844 40.714-15.974l-11.526-19.383c-8.182 6.364-17.467 9.805-26.266 9.805-16.364 0-27.273-11.429-27.273-28.377s10.909-28.377 27.273-28.377c8.084 0 16.883 2.922 24.026 8.085l11.721-19.806c-9.481-8.571-24.156-13.831-38.702-13.831-32.013 0-54.643 22.338-54.643 53.929.032 31.494 22.662 53.929 54.676 53.929Zm-93.735-105.261-.519 15.975c-6.981-11.916-19.481-18.572-34.838-18.572-28.085 0-48.475 22.728-48.475 53.929 0 31.202 20.52 53.929 48.475 53.929 15.357 0 27.889-6.656 34.838-18.474l.519 15.844h26.169V155.265h-26.169Zm-28.377 80.099c-15.162 0-25.552-11.721-25.552-28.799s10.39-28.799 25.552-28.799c15.163 0 25.552 11.721 25.552 28.799s-10.422 28.799-25.552 28.799Zm-57.663-79.906h-26.526v-8.767c0-13.117 5.13-18.149 18.442-18.149 4.123 0 7.467.097 9.383.292v-22.5c-3.637-1.007-12.5-2.013-17.63-2.013-27.111 0-39.611 12.792-39.611 40.422v10.682h-16.753v24.806h16.753v77.631h29.448v-77.599h21.949l4.545-24.805Z";

/** The f of the circle logo, its stem extended to the bottom edge of a 24 × 24 field. */
const F =
  "M9.101 24v-8.289H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246V24Z";

const MESSENGER =
  "M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.389 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 00-2.61.48z";

/** IG's verified badge geometry (IGDSVerifiedIcon), filled Facebook blue: the same scalloped seal at 14 pt. */
const VERIFIED =
  "M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z";

export function Wordmark({ width }: { width: number }) {
  return (
    <svg width={width} height={(width * 158.33) / 886} viewBox="102.28 102.2 886 158.33" aria-label="facebook">
      <path fill="#0866FF" d={WORDMARK} />
    </svg>
  );
}

export function FacebookIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }} aria-hidden="true">
      <rect width="24" height="24" fill="#0866FF" />
      <path fill="#fff" d={F} />
    </svg>
  );
}

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function svg(size: number, children: ReactNode, viewBox = "0 0 24 24") {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

export type GlyphName =
  | "plus"
  | "search"
  | "messenger"
  | "photo"
  | "globe"
  | "verified"
  | "more"
  | "close"
  | "like"
  | "comment"
  | "share"
  | "home"
  | "reels"
  | "marketplace"
  | "friends"
  | "bell"
  | "menu";

export function Glyph({ name, size = 24 }: { name: GlyphName; size?: number }) {
  switch (name) {
    case "plus":
      return svg(size, <path {...line} strokeWidth={2.3} d="M12 4.5v15M4.5 12h15" />);
    case "search":
      return svg(size, <path {...line} strokeWidth={2.3} d="M10.75 18.5a7.75 7.75 0 1 0 0-15.5 7.75 7.75 0 0 0 0 15.5ZM16.4 16.4l4.85 4.85" />);
    case "messenger":
      return svg(size, <path d={MESSENGER} />);
    case "photo":
      return svg(
        size,
        <>
          <rect x="2.5" y="1.5" width="19" height="21" rx="3.5" />
          <circle cx="8.5" cy="7.5" r="2" fill="#fff" />
          <path fill="#fff" d="M4.5 18.5 9 13l3 3.4 3.2-4.4 4.3 6.5Z" />
        </>,
      );
    case "globe":
      return svg(
        size,
        <>
          <circle cx="8" cy="8" r="7" />
          <path
            fill="#fff"
            d="M3.2 4.6c.9.2 1.6.9 2.5.8.8-.1 1.2-.9 2-.9.9.1 1.1 1.3.6 2-.5.7-1.6.6-2 1.4-.4.9.6 1.8.4 2.7-.2.8-1.1 1.2-1.6 1.9-.2-.9-.4-1.9-1-2.6-.5-.6-1.3-1-1.6-1.8A6 6 0 0 1 3.2 4.6Zm6.7-2.4c.7.5 1.6.6 2.3 1.2.6.5.9 1.3 1.5 1.8-.9.3-1.9 0-2.7.4-.6.3-.8 1.1-1.4 1.2-.6 0-1-.8-.8-1.4.2-.7 1-1.1 1-1.9 0-.5-.2-.9 0-1.3Zm.9 6.7c.7-.3 1.5-.2 2.2.1.5.2.9.6 1.4.6a6 6 0 0 1-2.9 3.9c.1-.8.2-1.6-.2-2.3-.3-.5-.8-.9-.8-1.5 0-.3.1-.6.3-.8Z"
          />
        </>,
        "0 0 16 16",
      );
    case "verified":
      return svg(size, <path fill="#0866FF" fillRule="evenodd" d={VERIFIED} />, "0 0 40 40");
    case "more":
      return svg(
        size,
        <>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </>,
      );
    case "close":
      return svg(size, <path {...line} strokeWidth={2.2} d="M5 5l14 14M19 5 5 19" />);
    case "like":
      return svg(size, <path {...line} strokeWidth={1.8} d="M7.5 10.5V20H4.8A1.3 1.3 0 0 1 3.5 18.7v-6.9a1.3 1.3 0 0 1 1.3-1.3h2.7Zm0 0 3.7-6.6a1.7 1.7 0 0 1 3.2.9v4.4h4.7a2 2 0 0 1 2 2.4l-1.4 6.8A2.6 2.6 0 0 1 17.1 20H7.5" />);
    case "comment":
      return svg(size, <path {...line} strokeWidth={1.8} d="M12 3.6c-4.85 0-8.6 3.5-8.6 7.9 0 2.36 1.1 4.47 2.88 5.9l-.36 3.1 3.06-1.62c.95.3 1.97.47 3.02.47 4.85 0 8.6-3.5 8.6-7.85S16.85 3.6 12 3.6Z" />);
    case "share":
      return svg(size, <path {...line} strokeWidth={1.8} d="M13.6 4.6 21 11.4l-7.4 6.8v-3.9c-4.6 0-7.8 1.3-10.3 4.9.9-5 3.9-9.3 10.3-10.2V4.6Z" />);
    case "home":
      return svg(
        size,
        <path
          fillRule="evenodd"
          d="M2.6 10.1c0-.75.34-1.46.93-1.93l6.9-5.5a2.5 2.5 0 0 1 3.14 0l6.9 5.5c.59.47.93 1.18.93 1.93v9.3a2.5 2.5 0 0 1-2.5 2.5H5.1a2.5 2.5 0 0 1-2.5-2.5v-9.3Zm8.4 6.4a1 1 0 0 0-1 1v4.4h4v-4.4a1 1 0 0 0-1-1h-2Z"
        />,
      );
    case "reels":
      return svg(
        size,
        <>
          <rect {...line} x="2.8" y="2.8" width="18.4" height="18.4" rx="4.6" />
          <path {...line} d="M3 8.2h18M8.6 3l2.6 5.2M14.6 3l2.6 5.2" />
          <path d="M10 11.7c0-.6.66-.97 1.17-.66l3.95 2.38c.5.3.5 1.02 0 1.32l-3.95 2.38c-.51.31-1.17-.06-1.17-.66v-4.76Z" />
        </>,
      );
    case "marketplace":
      return svg(
        size,
        <>
          <path {...line} d="M4.6 10.6V19a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-8.4" />
          <path {...line} d="M3.1 7.9 4.7 4.3A2.2 2.2 0 0 1 6.7 3h10.6a2.2 2.2 0 0 1 2 1.3l1.6 3.6a2.55 2.55 0 0 1-4.45 2.4 2.55 2.55 0 0 1-4.45 0 2.55 2.55 0 0 1-4.45 0A2.55 2.55 0 0 1 3.1 7.9Z" />
          <path {...line} d="M9.6 21v-4.4a1.1 1.1 0 0 1 1.1-1.1h2.6a1.1 1.1 0 0 1 1.1 1.1V21" />
        </>,
      );
    case "friends":
      return svg(
        size,
        <>
          <circle {...line} cx="9" cy="7.3" r="3.8" />
          <path {...line} d="M2.4 19.6c0-3.3 2.95-5.6 6.6-5.6s6.6 2.3 6.6 5.6a.9.9 0 0 1-.9.9H3.3a.9.9 0 0 1-.9-.9Z" />
          <circle {...line} cx="17.4" cy="8.6" r="2.6" />
          <path {...line} d="M17.6 14.2c2.6.1 4.2 1.7 4.2 4a.9.9 0 0 1-.9.9h-2.4" />
        </>,
      );
    case "bell":
      return svg(
        size,
        <>
          <path {...line} d="M5.6 16.6V11a6.4 6.4 0 0 1 12.8 0v5.6l1.6 2.1H4l1.6-2.1Z" />
          <path {...line} d="M9.8 21.2h4.4" />
        </>,
      );
    case "menu":
      return svg(size, <path {...line} strokeWidth={2.1} d="M3.5 5.5h17M3.5 12h17M3.5 18.5h17" />);
  }
}

/** Reaction faces as in the summary row: a gradient disc (CSS, so no SVG ids repeat across phones) under a glyph. */
const DISCS = {
  like: "linear-gradient(180deg, #18afff 0%, #0062df 100%)",
  love: "linear-gradient(180deg, #ff6680 0%, #e61739 100%)",
  wow: "linear-gradient(180deg, #feea70 0%, #f69b30 100%)",
  haha: "linear-gradient(180deg, #feea70 0%, #f69b30 100%)",
} as const;

export function Reaction({ kind, size = 18 }: { kind: keyof typeof DISCS; size?: number }) {
  return (
    <span style={{ display: "block", width: size, height: size, borderRadius: "50%", background: DISCS[kind] }}>
      <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }} aria-hidden="true">
        {kind === "like" && (
          <path
            fill="#fff"
            d="M4.1 7.2h1.3c.3 0 .5.2.5.5v4.1c0 .3-.2.5-.5.5H4.1a.5.5 0 0 1-.5-.5V7.7c0-.3.2-.5.5-.5Zm2.6 4.6V7.6c0-.2 0-.3.1-.4l1.9-3c.2-.3.6-.5 1-.3.4.2.6.6.5 1l-.4 1.9h1.9c.8 0 1.3.7 1.1 1.4l-.8 3.2c-.1.5-.6.9-1.1.9H7.3a.6.6 0 0 1-.6-.5Z"
          />
        )}
        {kind === "love" && (
          <path fill="#fff" d="M10.47 4.6c-.98 0-1.8.55-2.47 1.4-.67-.85-1.49-1.4-2.47-1.4C4.15 4.6 3.2 5.68 3.2 7c0 2.3 2.9 4.03 4.43 4.98.23.14.51.14.74 0C9.9 11.03 12.8 9.3 12.8 7c0-1.32-.95-2.4-2.33-2.4Z" />
        )}
        {kind === "wow" && (
          <>
            <ellipse cx="5.4" cy="6.2" rx="1" ry="1.3" fill="#262c34" />
            <ellipse cx="10.6" cy="6.2" rx="1" ry="1.3" fill="#262c34" />
            <ellipse cx="8" cy="10.9" rx="1.9" ry="2.3" fill="#262c34" />
            <path fill="none" stroke="#262c34" strokeWidth=".7" strokeLinecap="round" d="M3.9 4.1c.6-.6 1.4-.8 2.2-.6M12.1 4.1c-.6-.6-1.4-.8-2.2-.6" />
          </>
        )}
        {kind === "haha" && (
          <>
            <path fill="none" stroke="#262c34" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" d="M3.9 5.1 6 6.2 3.9 7.2M12.1 5.1 10 6.2l2.1 1" />
            <path fill="#262c34" d="M3.6 8.9h8.8c0 2.6-2 4.4-4.4 4.4S3.6 11.5 3.6 8.9Z" />
            <path fill="#f55065" d="M5.6 12.4c.6-.6 1.5-.9 2.4-.9s1.8.3 2.4.9c-.7.5-1.5.8-2.4.8s-1.7-.3-2.4-.8Z" />
          </>
        )}
      </svg>
    </span>
  );
}
