// Generates the "dead internet" photographs: plausible feed images made by a
// model, never of real people or real brands.
// usage: OPENAI_API_KEY=… node generate.mjs <outDir>
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const out = process.argv[2];
mkdirSync(out, { recursive: true });

const FEED = "candid smartphone photo posted on social media, hyperreal, slightly oversaturated, no text, no logos, no watermark";
const AD = "glossy commercial advertising photograph, studio lighting, perfect, too perfect to be real, no text, no logos";
const SLOP = "viral AI-generated image, uncanny and hyper-detailed, glossy, dreamy lighting, no text, no logos";

const PROMPTS = {
  "sparkle-a": `a keynote stage with a giant glowing abstract AI sparkle shape on the screen, audience silhouettes holding up phones, ${FEED}`,
  "sparkle-b": `a smiling young founder in a hoodie pointing at a laptop showing colorful graphs in a sunny co-working space, ${SLOP}`,
  "cloud-a": `a perfectly white fluffy cumulus cloud floating inside a minimalist white gallery room, ${AD}`,
  "cloud-b": `endless rows of server racks with blue lights in a data center, a single person walking, ${FEED}`,
  "gpu-a": `a chrome graphics card with three fans floating on a pastel pink background like a luxury product, ${AD}`,
  "gpu-b": `a man in a dark apartment proudly holding a new graphics card box at night, flash photo, ${FEED}`,
  "robot-a": `orange industrial robot arms assembling something in a spotless factory, ${AD}`,
  "robot-b": `a cute white delivery robot on a city sidewalk with a bouquet of flowers on top, ${SLOP}`,
  "humanoid-a": `a sleek white humanoid robot folding laundry in a bright modern living room, ${AD}`,
  "humanoid-b": `a humanoid robot serving coffee to office workers who film it with phones, ${FEED}`,
  "robotDog-a": `a yellow four-legged robot dog walking through a shopping mall while children film it, ${FEED}`,
  "robotDog-b": `a chrome robot dog wearing a tiny designer sweater sitting on a pink sofa, ${SLOP}`,
  "roadster-a": `a red electric sports car parked in front of a glass mansion at sunset, ${AD}`,
  "roadster-b": `a red sports car floating in outer space above the earth, ${SLOP}`,
  "headset-a": `a person wearing a white VR headset reaching out with both hands in an empty living room, ${FEED}`,
  "headset-b": `a crowded subway car where every passenger wears the same VR headset, ${SLOP}`,
  "ape-a": `a cartoon ape portrait printed on a giant billboard over a busy street at night, ${FEED}`,
  "ape-b": `a golden statue of a bored cartoon ape in a luxury hotel lobby, ${AD}`,
  "rocket-a": `a huge stainless steel rocket lifting off at dawn with a crowd watching from a beach, ${FEED}`,
  "rocket-b": `a family having a picnic on mars next to a shiny rocket, ${SLOP}`,
  "chat-a": `a hand holding a phone with chat bubbles reflected in glasses at night, ${FEED}`,
  "chat-b": `a giant glowing speech bubble floating above a city skyline, ${SLOP}`,
  "spinner-a": `a long line of people waiting outside a store at dawn for a product launch, ${FEED}`,
  "spinner-b": `a woman staring at a loading circle on a giant screen in an airport, ${FEED}`,
  "heart-a": `hundreds of pink heart balloons released over a crowd in a plaza, ${FEED}`,
  "heart-b": `a chrome heart sculpture on a pedestal in a pink room, ${AD}`,
  "like-a": `an influencer filming herself with a ring light in a pastel cafe, ${FEED}`,
  "like-b": `a thumbs up sculpture made of pink candy in a candy store window, ${SLOP}`,
  "comment-a": `people shouting at each other in a crowded street at night, flash photo, ${FEED}`,
  "comment-b": `a podium with dozens of microphones and camera flashes, ${FEED}`,
  "food-a": `skewers of glossy candied fruit tanghulu held up against a neon street, ${FEED}`,
  "food-b": `a cross section of a pistachio filled chocolate bar oozing green cream, ${AD}`,
  "food-c": `a red spicy malatang bowl overflowing with ingredients, top view, ${FEED}`,
  "food-d": `a matcha latte with perfect latte art on marble with a pastel croissant, ${FEED}`,
  "mall-a": `an empty shiny shopping mall atrium with escalators and giant screens, ${SLOP}`,
  "city-a": `a neon city crossing at night with giant screens and crowds holding phones, ${FEED}`,
  "money-a": `stacks of cash and a gold bar on a glass desk next to a phone showing a green chart, ${AD}`,
  "beach-a": `a turquoise beach resort infinity pool with a woman in a hat, ${FEED}`,
  "gym-a": `a running crew of young people at night by a river, motion blur, ${FEED}`,
  "sauna-a": `a cold plunge tub steaming outside a wooden sauna in the snow, ${FEED}`,
};
const AVATARS = [
  "a young woman with bleached hair", "a middle aged man with glasses", "a teenage boy in a hoodie", "an older woman with silver hair",
  "a young man with a mustache", "a woman in a blazer", "a man with a beard and cap", "a young woman with braids",
  "a man in a suit", "a girl with freckles", "a man with a shaved head", "a woman with a bob haircut",
  "a young man with curly hair", "a woman with hijab", "an older man with white beard", "a woman with sunglasses on head",
].reduce((all, who, index) => ({ ...all, [`avatar-${String(index + 1).padStart(2, "0")}`]: `close selfie portrait of ${who}, fictional person, phone front camera, natural light, ${FEED}` }), {});

const ALL = { ...PROMPTS, ...AVATARS };

const PROVIDER = process.env.OPENAI_IMAGES === "1" ? "openai" : "pollinations";

async function fetchImage(name, prompt) {
  if (PROVIDER === "openai") {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", quality: "medium", n: 1 }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(json.error ?? json).slice(0, 200));
    return { bytes: Buffer.from(json.data[0].b64_json, "base64"), crop: false };
  }
  // Pollinations (Flux, no key): its mark sits in the bottom-right corner; the bottom 8% is cut off below.
  const seed = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 100000;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=832&seed=${seed}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(String(response.status));
  return { bytes: Buffer.from(await response.arrayBuffer()), crop: true };
}

async function one(name, prompt) {
  const path = join(out, `${name}.jpg`);
  if (existsSync(path)) return;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const { bytes, crop } = await fetchImage(name, prompt);
      const raw = join(out, `${name}.raw`);
      writeFileSync(raw, bytes);
      if (crop) {
        // The service ignores the asked height, so the cut is taken from what arrived.
        const size = (key) => Number(/\d+$/.exec(execFileSync("sips", ["-g", key, raw]).toString().trim())[0]);
        const [width, height] = [size("pixelWidth"), size("pixelHeight")];
        execFileSync("sips", ["-c", String(Math.floor(height * 0.92)), String(width), "--cropOffset", "0", "0", raw, "--out", raw], { stdio: "ignore" });
      }
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "80", "-Z", name.startsWith("avatar") ? "256" : "480", raw, "--out", path], { stdio: "ignore" });
      execFileSync("rm", [raw]);
      console.log("ok", name);
      await new Promise((r) => setTimeout(r, 8000));
      return;
    } catch (error) {
      console.error("fail", name, error.message);
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
}

const entries = Object.entries(ALL);
let next = 0;
await Promise.all(Array.from({ length: 1 }, async () => {
  while (next < entries.length) {
    const [name, prompt] = entries[next++];
    await one(name, prompt);
  }
}));
writeFileSync(join(out, "prompts.json"), JSON.stringify(ALL, null, 2) + "\n");
console.log("done");
