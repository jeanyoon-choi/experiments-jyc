// A hype event as a Tinder profile: the event's person, whose whole bio is the
// hype. Pure: every choice comes from the post's seed (`post.pick`).

import { portraitFor } from "../../content/images";
import type { AppPost } from "../types";

export type Profile = {
  id: number;
  name: string;
  age: number;
  verified: boolean;
  photo: string;
  photos: number;
  job: string;
  distance: string;
  active: boolean;
  bio: string;
  passions: readonly string[];
};

const TITLES = /^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?|the)\s+/i;

function firstName(name: string): string {
  if (name.includes("&")) return name;
  const bare = name.replace(TITLES, "");
  if (/^the\s/i.test(name)) return name;
  return bare.split(/\s+/)[0] ?? bare;
}

function choose<T>(list: readonly T[], value: number): T {
  return list[Math.min(list.length - 1, Math.floor(value * list.length))]!;
}

function bioOf(post: AppPost): string {
  const { event, label } = post;
  const tag = event.tags[0] ?? label;
  const [first = "1", second = "2"] = event.figures;
  const lines = [
    `${tag} owner. Will talk about ${event.org} on the first date.`,
    `Looking for someone who understands that ${first} is a love language.`,
    `Swipe right if you've been on the ${event.org} waitlist too. ${second} and counting.`,
    `My therapist says I talk about ${tag} too much. Anyway, ${first}.`,
    `Not here for hookups, here for ${tag}. ${event.dek}`,
    `Two truths and a lie: I own ${first}, I've met ${event.person.name}, I don't think about ${tag}.`,
  ];
  return choose(lines, post.pick(11));
}

const EXTRA = ["Early adopter", "Hustle", "Networking", "Startups", "Crypto", "Podcasts", "Productivity", "Disruption"];

export function profileOf(post: AppPost): Profile {
  const { event, item, label } = post;
  const passions = [...event.tags.slice(0, 3)];
  if (passions.length < 3) passions.push(choose(EXTRA, post.pick(5)));
  if (passions.length < 3) passions.push(label);
  const miles = 1 + Math.floor(post.pick(3) * 18);
  return {
    id: item.id,
    name: firstName(event.person.name),
    age: 23 + Math.floor(post.pick(1) * 15),
    verified: post.pick(2) > 0.3,
    photo: portraitFor(item.seed),
    photos: 3 + Math.floor(post.pick(4) * 4),
    job: `${event.person.role}`.includes(event.org) ? event.person.role : `${event.person.role} at ${event.org}`,
    distance: `${miles} ${miles === 1 ? "mile" : "miles"} away`,
    active: post.pick(6) > 0.45,
    bio: bioOf(post),
    passions,
  };
}

/** The real push wordings, filled with the hype. */
export function tinderNotice(post: AppPost): { title: string; body: string } {
  const profile = profileOf(post);
  const kind = post.pick(9);
  if (kind < 0.4) return { title: "You have a new match!", body: `You and ${profile.name} liked each other. ${profile.bio}` };
  if (kind < 0.75) return { title: "Someone liked you", body: `Someone into ${post.event.tags[0] ?? post.label} liked you. Open Tinder to see if it's a match.` };
  return { title: `${profile.name} sent you a message`, body: `"Quick question: how do you feel about ${post.event.figures[0] ?? post.label}?"` };
}
