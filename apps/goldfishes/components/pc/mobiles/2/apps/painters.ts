// Every painter, for the painting workers (paint/worker.ts).

import type { PainterTable } from "../paint/types";
import { FACEBOOK_PAINTERS } from "./facebook/paint";
import { INSTAGRAM_PAINTERS } from "./instagram/paint";
import { LINKEDIN_PAINTERS } from "./linkedin/paint";
import { MESSAGES_PAINTERS } from "./messages/paint";
import { NETFLIX_PAINTERS } from "./netflix/paint";
import { NEWS_PAINTERS } from "./news/paint";
import { REELS_PAINTERS } from "./reels/paint";
import { SHOP_PAINTERS } from "./shop/paint";
import { STOCKS_PAINTERS } from "./stocks/paint";
import { SYSTEM_PAINTERS } from "./system/paint";
import { TIKTOK_PAINTERS } from "./tiktok/paint";
import { TINDER_PAINTERS } from "./tinder/paint";
import { X_PAINTERS } from "./x/paint";
import { YELP_PAINTERS } from "./yelp/paint";

export const PAINTERS: PainterTable = {
  ...SYSTEM_PAINTERS,
  ...INSTAGRAM_PAINTERS,
  ...REELS_PAINTERS,
  ...TIKTOK_PAINTERS,
  ...X_PAINTERS,
  ...FACEBOOK_PAINTERS,
  ...LINKEDIN_PAINTERS,
  ...TINDER_PAINTERS,
  ...YELP_PAINTERS,
  ...NETFLIX_PAINTERS,
  ...NEWS_PAINTERS,
  ...STOCKS_PAINTERS,
  ...SHOP_PAINTERS,
  ...MESSAGES_PAINTERS,
};
