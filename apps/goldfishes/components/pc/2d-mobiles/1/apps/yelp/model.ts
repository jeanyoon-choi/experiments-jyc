// A hype event as Yelp would list it (Gluttony, NOTES 1017): the hype as a
// place to consume — a business, its stars, its price, one review quoted.
// Pure: every variation comes from the post's pick.

import type { HypeEvent } from "../../content/events";
import type { AppPost } from "../types";

export type Business = {
  name: string;
  categories: string;
  neighbourhood: string;
  distance: string;
  price: string;
  rating: number;
  reviews: string;
  open: boolean;
  hours: string;
  reviewer: string;
  quote: string;
  action: string;
  /** Hue for the drawn photo when there is no image. */
  hue: number;
};

type Venue = {
  name: (event: HypeEvent) => string;
  categories: string;
  hue: number;
  quote: (event: HypeEvent) => string;
  action?: string;
};

const fig = (event: HypeEvent, index: number) => event.figures[index] ?? event.figures[0] ?? "";

const VENUES: Record<string, Venue> = {
  sparkle: { name: () => "Sparkle Bar", categories: "Cocktail Bars, AI Fusion", hue: 268, quote: (e) => `The menu rewrote itself while I was reading it. Ordered the ${fig(e, 1)} tasting flight. Every course was a summary of the last one` },
  cloud: { name: () => "Nimbus Diner", categories: "Diners, Breakfast & Brunch", hue: 205, quote: (e) => `Kitchen went down for ${fig(e, 0)} mid-brunch. When it came back my pancakes belonged to ${fig(e, 1)} other tables` },
  gpu: { name: () => "GPU Café", categories: "Coffee & Tea, Waitlist Only", hue: 140, quote: (e) => `Waited ${fig(e, 0)} for a table. The latte was ${fig(e, 1)} but honestly it's the warmest drink I've ever held`, action: "Join waitlist" },
  robot: { name: (e) => (e.org === "ServeBot" ? "Copper Fork" : `${e.org} Staff Canteen`), categories: "American (New), Robot Service", hue: 22, quote: (e) => `The robot showed me an ${fig(e, 0)} prompt before I sat down. I tipped. I'd tip again. I felt seen` , action: "Find a table" },
  humanoid: { name: () => "Halcyon Wash & Fold", categories: "Laundromats, Live Demos", hue: 190, quote: (e) => `One towel took ${fig(e, 0)}. Everyone stood up and clapped. I pre-ordered before it finished the corner` },
  robotDog: { name: () => "Galleria Food Court", categories: "Food Court, Dog Friendly", hue: 38, quote: (e) => `A robot dog patrolled our table the whole meal. A corgi barked at it for ${fig(e, 1)}. Best dinner theatre in town` },
  roadster: { name: () => "Voltaro Drive-In", categories: "Burgers, EV Charging", hue: 0, quote: () => `Ordered the roadster burger. Pickup time keeps moving to "soon". Staff say this is part of the experience` , action: "Order pickup" },
  headset: { name: () => "Parallax Sunset Lounge", categories: "Lounges, Virtual Reality", hue: 300, quote: (e) => `${fig(e, 0)} at the bar, ${fig(e, 1)}. Gorgeous view. My date was in a different one` , action: "Reserve" },
  ape: { name: () => "Bored Lagoon Steakhouse", categories: "Steakhouses, Members Only", hue: 48, quote: (e) => `Paid ${fig(e, 0)} for the floor. Literally the floor. They framed my receipt as a QR code` },
  rocket: { name: () => "Apogee Orbital Grill", categories: "Space-Themed, Fine Dining", hue: 16, quote: (e) => `Dessert landed perfectly, then tipped over gently. Server said it "generated valuable data". ${fig(e, 0)} on the dot` , action: "Reserve" },
  chat: { name: () => "Parlance Ramen", categories: "Ramen, Conversational", hue: 12, quote: () => `Our server apologised for the broth 40 times. Sincerely, statistically. The broth was fine` },
  spinner: { name: () => "Wavelength Pizza", categories: "Pizza, Design Award Winner", hue: 220, quote: (e) => `Beautiful loading screen at the counter. Calm, infinite rhythm. Pizza ETA: ${fig(e, 0)}` , action: "Order delivery" },
  heart: { name: () => "Spark Wine Bar", categories: "Wine Bars, Date Night", hue: 345, quote: (e) => `Met him here, matched here, broke up here. ${fig(e, 1)} notifications, ${fig(e, 2)}. Great natural wine list`, action: "Reserve" },
  like: { name: () => "Glimpse Brunch Club", categories: "Brunch, Instagrammable", hue: 330, quote: (e) => `They hide the like counts on the menu now. I counted anyway. ${fig(e, 1)}. The eggs were cold from all the photos` },
  comment: { name: () => "Reel Comedy Club", categories: "Comedy Clubs, Open Mic", hue: 265, quote: (e) => `The set was ${fig(e, 0)}. The argument in the parking lot afterwards ran ${fig(e, 1)}. Five stars for the parking lot` },
};

const NEIGHBOURHOODS = ["SoMa", "Mission District", "Hayes Valley", "Williamsburg", "Silver Lake", "South Lake Union", "River North", "Capitol Hill", "Palo Alto", "Fremont"];
const HOURS = ["9:00 PM", "10:00 PM", "11:00 PM", "Midnight", "2:00 AM", "10:30 PM"];
const REVIEWERS = ["Lena O.", "Marcus T.", "Priya R.", "Kevin L.", "Sofia M.", "Daniel K.", "Ashley W.", "Tom B.", "Hannah P.", "Jorge V."];

function generic(event: HypeEvent): Venue {
  return { name: () => `${event.org} Kitchen`, categories: "New American, Trending", hue: 18, quote: () => event.dek.replace(/\.$/, "") };
}

function count(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(value);
}

export function businessOf(post: AppPost): Business {
  const { event } = post;
  const venue = VENUES[event.keyword] ?? generic(event);
  const pick = post.pick;
  // Yelp rounds to tenths; the stars round to halves.
  const rating = Math.round((3.6 + pick(1) * 1.3) * 10) / 10;
  const reviews = Math.floor(40 + pick(2) * pick(3) * 4200);
  return {
    name: venue.name(event),
    categories: venue.categories,
    neighbourhood: NEIGHBOURHOODS[Math.floor(pick(4) * NEIGHBOURHOODS.length)]!,
    distance: `${(0.2 + pick(5) * 2.6).toFixed(1)} mi`,
    price: ["$", "$$", "$$", "$$$", "$$$$"][Math.floor(pick(6) * 5)]!,
    rating,
    reviews: count(reviews),
    open: pick(7) > 0.18,
    hours: HOURS[Math.floor(pick(8) * HOURS.length)]!,
    reviewer: REVIEWERS[Math.floor(pick(9) * REVIEWERS.length)]!,
    quote: venue.quote(event),
    action: venue.action ?? "",
    hue: venue.hue,
  };
}

/** Each of the five squares' fill, 0–1 (Yelp shows halves). */
export function starFills(rating: number): number[] {
  const halves = Math.round(rating * 2) / 2;
  return [0, 1, 2, 3, 4].map((index) => Math.max(0, Math.min(1, halves - index)));
}
