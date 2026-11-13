// Apple News (the eighth axis): the morning ritual, news that carries no information.

import { useId } from "react";
import type { AppDefinition } from "../types";
import { storyOf } from "./model";
import { NEWS_N, NewsScreen } from "./screen";

/** The iOS 26 home-screen icon: the red "N" on a pale squircle. */
function NewsIcon({ size }: { size: number }) {
  const id = `news${useId().replace(/[^A-Za-z0-9]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ececee" />
        </linearGradient>
        <linearGradient id={`${id}n`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5a74" />
          <stop offset="1" stopColor="#f5103d" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}bg)`} />
      <g transform="translate(22 22) scale(0.56)">
        <path fill={`url(#${id}n)`} d={NEWS_N} />
      </g>
    </svg>
  );
}

export const newsApp: AppDefinition = {
  id: "news",
  name: "News",
  sin: "—",
  Screen: NewsScreen,
  Icon: NewsIcon,
  statusTone: "dark",
  notify: (post) => {
    const story = storyOf(post, post);
    return { title: story.outlet.name, body: story.headline };
  },
};
