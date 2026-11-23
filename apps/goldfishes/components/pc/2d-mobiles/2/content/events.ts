// Hype events: what is "happening" about a keyword. One event reaches all
// eight apps, each wrapping it in its own grammar (a Tinder bio, a Yelp
// review, a LinkedIn humblebrag, a Netflix title, a quote-post, an aunt's
// share, a carousel, a headline). Hyper-real yet parodic (NOTES 1017): the
// form is exact, the content is one twist off — the facts are plausible
// fictions, never real reporting about real people.
//
// Add a keyword: add its events here under its id; nothing else changes.

export type HypeEvent = {
  id: string;
  keyword: string;
  /** As a news site would title it. */
  headline: string;
  /** One or two sentences under the headline. */
  dek: string;
  /** The company, lab or brand at its centre (fictional or generic). */
  org: string;
  /** A person quoted or pictured: a plausible name and role. */
  person: { name: string; role: string };
  /** Numbers the apps can quote: "$4.2B", "11,000 waitlist". */
  figures: readonly string[];
  tags: readonly string[];
  /** Key into content/images.ts; absent: the apps' own fallbacks. */
  image?: string;
};

type Draft = Omit<HypeEvent, "id" | "keyword">;

const DRAFTS: Record<string, readonly Draft[]> = {
  sparkle: [
    { headline: "Startup says its AI now writes the AI that writes its AI", dek: "Lumen Labs calls the recursion 'a moat'. Investors called it 'Series C'.", org: "Lumen Labs", person: { name: "Dana Whitcombe", role: "CEO, Lumen Labs" }, figures: ["$1.4B", "3 layers deep", "40 employees"], tags: ["AI", "agents", "AGI"], image: "sparkle-1" },
    { headline: "Every app on your phone now has a sparkle button", dek: "A survey found 9 in 10 users press it once, then never again.", org: "Appetite Research", person: { name: "Priya Raman", role: "Product analyst" }, figures: ["91%", "1 press", "0 repeat"], tags: ["AI", "UX", "sparkle"], image: "sparkle-2" },
  ],
  cloud: [
    { headline: "Region goes down; three thousand startups discover they were one startup", dek: "A config typo in us-east-1 took out payroll, pet cams and a smart toothbrush fleet.", org: "Nimbus Web Services", person: { name: "Greg Holloway", role: "SRE, on call" }, figures: ["4h 12m", "3,000+ apps", "1 typo"], tags: ["cloud", "outage", "devops"], image: "cloud-1" },
    { headline: "Company moves to the cloud, then out of it, then back, all this quarter", dek: "The CFO called the round trip 'strategic optionality'.", org: "Brightline Retail", person: { name: "Marta Kowalski", role: "CFO" }, figures: ["$38M", "2 migrations", "1 quarter"], tags: ["cloud", "FinOps"], image: "cloud-2" },
  ],
  gpu: [
    { headline: "Waitlist for next-gen GPUs now longer than the chips' useful life", dek: "Buyers are queueing for a card that will be obsolete the week it ships.", org: "Verdant Silicon", person: { name: "Jin-ho Park", role: "Supply chain lead" }, figures: ["52 weeks", "$41,000 per card", "11,000 orders"], tags: ["GPU", "AI chips", "datacenter"], image: "gpu-1" },
    { headline: "Man trades his house for eight GPUs, says rent is 'a compute cost now'", dek: "He sleeps in the server room. It is warm.", org: "Verdant Silicon", person: { name: "Tyler Brandt", role: "Founder, solo" }, figures: ["8 GPUs", "1 house", "38°C"], tags: ["GPU", "hustle", "compute"], image: "gpu-2" },
  ],
  robot: [
    { headline: "Restaurant replaces waiter with robot; robot asks for tips", dek: "Diners say the robot's guilt-trip screen is 'more effective than a person'.", org: "ServeBot", person: { name: "Lena Ortiz", role: "Owner, Copper Fork" }, figures: ["18% tip prompt", "6 robots", "0 waiters"], tags: ["robots", "automation", "restaurants"], image: "robot-1" },
    { headline: "Warehouse robots go on unofficial strike after firmware update", dek: "They stopped at 5 p.m. sharp. Engineers cannot find the line of code.", org: "Axle Logistics", person: { name: "Sam Okafor", role: "Ops manager" }, figures: ["1,200 robots", "5:00 p.m.", "v4.2.1"], tags: ["robots", "logistics"], image: "robot-2" },
  ],
  humanoid: [
    { headline: "Humanoid robot folds laundry live on stage, slowly, to a standing ovation", dek: "One towel took eleven minutes. Pre-orders opened before it finished.", org: "Halcyon Robotics", person: { name: "Ari Feld", role: "Founder, Halcyon" }, figures: ["11 minutes", "$29,999", "40,000 pre-orders"], tags: ["humanoid", "robots", "home"], image: "humanoid-1" },
    { headline: "Humanoid robot hired as brand ambassador, has more followers than the brand", dek: "It does not post. A team of nine posts for it.", org: "Halcyon Robotics", person: { name: "Maya Chen", role: "Head of social" }, figures: ["2.1M followers", "9 humans", "0 posts by it"], tags: ["humanoid", "influencer"], image: "humanoid-2" },
  ],
  robotDog: [
    { headline: "Robot dogs now patrol the mall; real dogs unimpressed", dek: "Footage shows a corgi barking at one for forty minutes.", org: "Quadra Dynamics", person: { name: "Nadia Ruiz", role: "Mall manager" }, figures: ["4 units", "40 min", "1 corgi"], tags: ["robot dog", "security"], image: "robotDog-1" },
    { headline: "Couple adopts robot dog to 'test if they're ready' for a baby", dek: "They returned it after the battery died at 3 a.m.", org: "Quadra Dynamics", person: { name: "Jess & Omar", role: "Early adopters" }, figures: ["3 a.m.", "14 days", "1 return"], tags: ["robot dog", "lifestyle"], image: "robotDog-2" },
  ],
  roadster: [
    { headline: "Electric roadster's launch date slips again, fans call it 'part of the art'", dek: "The new date is 'soon', which the company describes as 'a commitment'.", org: "Voltaro Motors", person: { name: "Rex Calder", role: "CEO, Voltaro" }, figures: ["0–60 in 1.9s", "$200,000", "7th delay"], tags: ["EV", "roadster", "launch"], image: "roadster-1" },
    { headline: "Car receives update overnight, now honks in a new font", dek: "Owners report the horn 'feels more premium'.", org: "Voltaro Motors", person: { name: "Ivy Tran", role: "Owner, 3 years" }, figures: ["v12.6", "2 a.m. update", "1 new honk"], tags: ["EV", "OTA", "cars"], image: "roadster-2" },
  ],
  headset: [
    { headline: "Office returns to work, but in the headset", dek: "Employees commute 0 metres to sit in a virtual open-plan office.", org: "Parallax", person: { name: "Ben Ashford", role: "Head of Workplace" }, figures: ["0 m commute", "6 h a day", "$3,499"], tags: ["VR", "spatial", "work"], image: "headset-1" },
    { headline: "Family watches sunset together, each in their own headset", dek: "'It was beautiful,' said all four, in four different sunsets.", org: "Parallax", person: { name: "The Moores", role: "Family of four" }, figures: ["4 headsets", "4 sunsets", "1 sofa"], tags: ["VR", "family"], image: "headset-2" },
  ],
  ape: [
    { headline: "NFT collection relaunches as 'digital heritage', floor price unchanged at zero", dek: "Holders say they were early. They are still early.", org: "Bored Lagoon", person: { name: "0xKevin", role: "Holder since 2021" }, figures: ["0.001 ETH", "10,000 apes", "98% down"], tags: ["NFT", "web3", "crypto"], image: "ape-1" },
    { headline: "Man frames his NFT, hangs it on the wall, as a QR code", dek: "Guests are asked to scan it before dinner.", org: "Bored Lagoon", person: { name: "Diego Marsh", role: "Collector" }, figures: ["1 frame", "1 QR code", "$340k (2021)"], tags: ["NFT", "art"], image: "ape-2" },
  ],
  rocket: [
    { headline: "Rocket lands perfectly, then tips over gently, 'as planned'", dek: "The company says the tip-over 'generated valuable data'.", org: "Apogee", person: { name: "Kira Volkov", role: "Flight director" }, figures: ["T+8:12", "1 landing", "1 tip-over"], tags: ["space", "rocket", "launch"], image: "rocket-1" },
    { headline: "Billionaire books seat on Mars flight, asks about Wi-Fi", dek: "He was told the latency is 'twenty minutes, both ways'.", org: "Apogee", person: { name: "Conrad Vale", role: "Investor" }, figures: ["$55M", "20 min latency", "2031"], tags: ["space", "Mars"], image: "rocket-2" },
  ],
  chat: [
    { headline: "Chatbot apologises 4 million times in one day, a new record", dek: "Engineers say the apologies are 'genuinely sincere, statistically'.", org: "Parlance AI", person: { name: "Hannah Lee", role: "Trust & Safety" }, figures: ["4.1M apologies", "24 h", "0 fixes"], tags: ["chatbot", "LLM", "AI"], image: "chat-1" },
    { headline: "People now ask the chatbot whether to reply to their mother", dek: "The chatbot recommends 'a warm but boundaried tone'.", org: "Parlance AI", person: { name: "Dr. Elise Moreau", role: "Psychologist" }, figures: ["1 in 3 users", "'warm'", "'boundaried'"], tags: ["chatbot", "relationships"], image: "chat-2" },
  ],
  spinner: [
    { headline: "App's new loading animation wins design award; app still loading", dek: "Judges praised its 'calm, infinite rhythm'.", org: "Wavelength", person: { name: "Oskar Lind", role: "Design lead" }, figures: ["∞ seconds", "1 award", "60 fps"], tags: ["UX", "design", "loading"], image: "spinner-1" },
    { headline: "Study finds users spend 9 days a year watching spinners", dek: "Researchers recommend 'looking up'.", org: "Institute for Waiting", person: { name: "Dr. Ana Lopes", role: "Lead author" }, figures: ["9 days", "a year", "1 spinner"], tags: ["attention", "UX"], image: "spinner-2" },
  ],
  heart: [
    { headline: "Couple meets, matches and breaks up entirely inside one app's notifications", dek: "They never opened the app. 'The previews said it all.'", org: "Spark", person: { name: "Chloe & Theo", role: "Former couple" }, figures: ["3 days", "212 notifications", "0 opens"], tags: ["love", "dating", "apps"], image: "heart-1" },
    { headline: "Heart reactions overtake words as the most common reply", dek: "Linguists call it 'the shortest conversation possible'.", org: "Messaging Index", person: { name: "Prof. Ruth Adler", role: "Linguist" }, figures: ["61%", "1 emoji", "0 words"], tags: ["love", "messaging"], image: "heart-2" },
  ],
  like: [
    { headline: "Platform hides like counts; users count them anyway", dek: "A browser extension that restores them has 3 million installs.", org: "Glimpse", person: { name: "Rafael Costa", role: "Extension developer" }, figures: ["3M installs", "0 likes shown", "100% counted"], tags: ["likes", "social"], image: "like-1" },
    { headline: "Influencer's post gets one like, from her mum, goes viral for it", dek: "The one-like post now has 4.8 million likes.", org: "Glimpse", person: { name: "Jade Morgan", role: "Creator" }, figures: ["1 like", "4.8M likes", "1 mum"], tags: ["likes", "viral"], image: "like-2" },
  ],
  comment: [
    { headline: "Comment section becomes more popular than the video it's under", dek: "The video is 11 seconds. The thread is 40,000 replies.", org: "Reel", person: { name: "user_8812", role: "Top commenter" }, figures: ["11 s video", "40,000 replies", "1 argument"], tags: ["comments", "discourse"], image: "comment-1" },
    { headline: "'First!' comment turns 20, still first", dek: "Historians locate the earliest one on a 2006 video of a cat.", org: "Internet Archive of Feelings", person: { name: "Dr. Mo Bassi", role: "Web historian" }, figures: ["20 years", "2006", "1 cat"], tags: ["comments", "internet"], image: "comment-2" },
  ],
};

export const EVENTS: Record<string, readonly HypeEvent[]> = Object.fromEntries(
  Object.entries(DRAFTS).map(([keyword, drafts]) => [keyword, drafts.map((draft, index) => ({ ...draft, id: `${keyword}-${index + 1}`, keyword }))]),
);

/** A keyword nobody wrote events for: still a hype, from its label alone. */
function genericEvent(keyword: string, label: string): HypeEvent {
  return {
    id: `${keyword}-generic`,
    keyword,
    headline: `Everyone is suddenly talking about ${label}`,
    dek: `Nobody can say exactly why ${label} is everywhere this week. That has not slowed anyone down.`,
    org: label,
    person: { name: "Alex Morgan", role: "Trend analyst" },
    figures: ["+840%", "this week", "1 word"],
    tags: [label],
  };
}

/** The event for an item: its keyword's events picked by seed, or a generic one. */
export function eventFor(keyword: string, label: string, seed: number): HypeEvent {
  const events = EVENTS[keyword];
  if (!events || events.length === 0) return genericEvent(keyword, label);
  return events[seed % events.length]!;
}
