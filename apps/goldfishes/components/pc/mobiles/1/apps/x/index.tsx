// X (Wrath): the hype event as a quote-post pile-on in the Home timeline.

import type { AppDefinition } from "../types";
import { tweetOf } from "./model";
import { XScreen } from "./screen";

/** The home-screen icon: the white X mark on black. */
function XIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: "block" }}>
      <rect width="100" height="100" fill="#000" />
      <g transform="translate(21.2 21.2) scale(2.4)">
        <path fill="#fff" d="m21.62 21.5-7.47-10.9 6.97-8.1H18.7l-5.62 6.54L8.6 2.5H2.48L9.68 13l-7.3 8.5H4.8l5.96-6.93 4.76 6.93zM7.8 4.03l10.93 15.94H16.3L5.38 4.03z" />
      </g>
    </svg>
  );
}

const firstLine = (text: string) => {
  const line = text.split("\n").find((part) => part.trim()) ?? text;
  return line.length > 110 ? `${line.slice(0, 107).trimEnd()}…` : line;
};

export const xApp: AppDefinition = {
  id: "x",
  name: "X",
  sin: "Wrath",
  Screen: XScreen,
  Icon: XIcon,
  statusTone: "light",
  notify: (post) => {
    const tweet = tweetOf(post);
    if (post.pick(31) < 0.3) return { title: `Trending in Technology`, body: `${post.label} · ${firstLine(post.event.headline)}` };
    return { title: "X", body: `${tweet.author.name} posted: ${firstLine(tweet.text)}` };
  },
};
