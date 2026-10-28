// Every app a phone can open (main thread). Painters are registered apart
// (painters.ts), for the workers.

import { facebook } from "./facebook/app";
import { instagram } from "./instagram/app";
import { linkedin } from "./linkedin/app";
import { messages } from "./messages/app";
import { netflix } from "./netflix/app";
import { news } from "./news/app";
import { reels } from "./reels/app";
import { shop } from "./shop/app";
import { stocks } from "./stocks/app";
import { tiktok } from "./tiktok/app";
import { tinder } from "./tinder/app";
import type { AppDef, AppId } from "./types";
import { x } from "./x/app";
import { yelp } from "./yelp/app";

export const APPS: Record<AppId, AppDef> = { instagram, reels, tiktok, x, facebook, linkedin, tinder, yelp, netflix, news, stocks, shop, messages };

export const APP_IDS = Object.keys(APPS) as AppId[];
