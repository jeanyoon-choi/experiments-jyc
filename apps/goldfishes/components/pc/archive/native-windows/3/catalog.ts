import { createRandom } from '../shared/settings.ts';

export const categories = ['companies', 'startups', 'multilingual-wiki', 'news', 'google-search'] as const;
export type Category = typeof categories[number];

export type CatalogEntry = { id: string; title: string; url: string; category: Category };

const sourceCatalog = [
  ['apple', 'Apple', 'https://www.apple.com/', 'companies'],
  ['google', 'Google', 'https://about.google/', 'companies'],
  ['microsoft', 'Microsoft', 'https://www.microsoft.com/', 'companies'],
  ['nvidia', 'NVIDIA', 'https://www.nvidia.com/', 'companies'],
  ['samsung', 'Samsung', 'https://www.samsung.com/', 'companies'],
  ['sony', 'Sony', 'https://www.sony.com/', 'companies'],
  ['lego', 'LEGO', 'https://www.lego.com/', 'companies'],
  ['nike', 'Nike', 'https://www.nike.com/', 'companies'],
  ['ikea', 'IKEA', 'https://www.ikea.com/', 'companies'],
  ['spotify', 'Spotify', 'https://www.spotify.com/', 'companies'],
  ['airbnb', 'Airbnb', 'https://www.airbnb.com/', 'companies'],
  ['netflix', 'Netflix', 'https://www.netflix.com/', 'companies'],

  ['figma', 'Figma', 'https://www.figma.com/', 'startups'],
  ['notion', 'Notion', 'https://www.notion.com/', 'startups'],
  ['stripe', 'Stripe', 'https://stripe.com/', 'startups'],
  ['linear', 'Linear', 'https://linear.app/', 'startups'],
  ['vercel', 'Vercel', 'https://vercel.com/', 'startups'],
  ['canva', 'Canva', 'https://www.canva.com/', 'startups'],
  ['mistral', 'Mistral AI', 'https://mistral.ai/', 'startups'],
  ['perplexity', 'Perplexity', 'https://www.perplexity.ai/', 'startups'],
  ['hugging-face', 'Hugging Face', 'https://huggingface.co/', 'startups'],
  ['webflow', 'Webflow', 'https://webflow.com/', 'startups'],
  ['supabase', 'Supabase', 'https://supabase.com/', 'startups'],
  ['framer', 'Framer', 'https://www.framer.com/', 'startups'],

  ['wiki-seoul-ko', '서울 — 한국어 위키백과', 'https://ko.wikipedia.org/wiki/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C', 'multilingual-wiki'],
  ['wiki-kimchi-ko', '김치 — 한국어 위키백과', 'https://ko.wikipedia.org/wiki/%EA%B9%80%EC%B9%98', 'multilingual-wiki'],
  ['wiki-tokyo-ja', '東京 — 日本語 Wikipedia', 'https://ja.wikipedia.org/wiki/%E6%9D%B1%E4%BA%AC', 'multilingual-wiki'],
  ['wiki-sushi-ja', '寿司 — 日本語 Wikipedia', 'https://ja.wikipedia.org/wiki/%E5%AF%BF%E5%8F%B8', 'multilingual-wiki'],
  ['wiki-paris-fr', 'Paris — Wikipédia', 'https://fr.wikipedia.org/wiki/Paris', 'multilingual-wiki'],
  ['wiki-art-fr', 'Art — Wikipédia', 'https://fr.wikipedia.org/wiki/Art', 'multilingual-wiki'],
  ['wiki-berlin-de', 'Berlin — Deutsch Wikipedia', 'https://de.wikipedia.org/wiki/Berlin', 'multilingual-wiki'],
  ['wiki-bauhaus-de', 'Bauhaus — Deutsch Wikipedia', 'https://de.wikipedia.org/wiki/Bauhaus', 'multilingual-wiki'],
  ['wiki-mexico-es', 'México — Wikipedia', 'https://es.wikipedia.org/wiki/M%C3%A9xico', 'multilingual-wiki'],
  ['wiki-cine-es', 'Cine — Wikipedia', 'https://es.wikipedia.org/wiki/Cine', 'multilingual-wiki'],
  ['wiki-kyiv-uk', 'Київ — Вікіпедія', 'https://uk.wikipedia.org/wiki/%D0%9A%D0%B8%D1%97%D0%B2', 'multilingual-wiki'],
  ['wiki-cairo-ar', 'القاهرة — ويكيبيديا', 'https://ar.wikipedia.org/wiki/%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9', 'multilingual-wiki'],

  ['bbc', 'BBC News', 'https://www.bbc.com/news', 'news'],
  ['reuters', 'Reuters', 'https://www.reuters.com/', 'news'],
  ['ap', 'Associated Press', 'https://apnews.com/', 'news'],
  ['guardian', 'The Guardian', 'https://www.theguardian.com/international', 'news'],
  ['nyt', 'The New York Times', 'https://www.nytimes.com/', 'news'],
  ['al-jazeera', 'Al Jazeera', 'https://www.aljazeera.com/', 'news'],
  ['nhk', 'NHK WORLD-JAPAN', 'https://www3.nhk.or.jp/nhkworld/', 'news'],
  ['yonhap', 'Yonhap News', 'https://en.yna.co.kr/', 'news'],
  ['le-monde', 'Le Monde', 'https://www.lemonde.fr/en/', 'news'],
  ['elpais', 'EL PAÍS English', 'https://english.elpais.com/', 'news'],
  ['npr', 'NPR', 'https://www.npr.org/', 'news'],
  ['the-verge', 'The Verge', 'https://www.theverge.com/', 'news'],

  ['search-architecture', 'Google: contemporary architecture', 'https://www.google.com/search?q=contemporary+architecture&hl=en', 'google-search'],
  ['search-typography', 'Google: experimental typography', 'https://www.google.com/search?q=experimental+typography&hl=en', 'google-search'],
  ['search-ocean', 'Google: ocean research', 'https://www.google.com/search?q=ocean+research&hl=en', 'google-search'],
  ['search-robotics', 'Google: robotics laboratory', 'https://www.google.com/search?q=robotics+laboratory&hl=en', 'google-search'],
  ['search-streetfood', 'Google: street food Seoul', 'https://www.google.com/search?q=street+food+Seoul&hl=en', 'google-search'],
  ['search-space', 'Google: space telescope images', 'https://www.google.com/search?q=space+telescope+images&hl=en', 'google-search'],
  ['search-woodwork', 'Google: Japanese woodwork', 'https://www.google.com/search?q=Japanese+woodwork&hl=en', 'google-search'],
  ['search-climate', 'Google: climate data visualization', 'https://www.google.com/search?q=climate+data+visualization&hl=en', 'google-search'],
  ['search-jazz', 'Google: jazz records 1970s', 'https://www.google.com/search?q=jazz+records+1970s&hl=en', 'google-search'],
  ['search-maps', 'Google: public transit maps', 'https://www.google.com/search?q=public+transit+maps&hl=en', 'google-search'],
  ['search-gardens', 'Google: urban gardens', 'https://www.google.com/search?q=urban+gardens&hl=en', 'google-search'],
  ['search-materials', 'Google: material science', 'https://www.google.com/search?q=material+science&hl=en', 'google-search'],
] as const satisfies readonly (readonly [string, string, string, Category])[];

export const catalog: readonly CatalogEntry[] = sourceCatalog.map(([id, title, url, category]) => ({ id, title, url, category }));

const fallbackTopics: Record<Category, readonly string[]> = {
  companies: ['industrial design', 'renewable energy company', 'global retail brand'],
  startups: ['independent software startup', 'creative tools startup', 'open source startup'],
  'multilingual-wiki': ['세계의 도시 위키백과', '世界の建築 Wikipedia', 'encyclopédie culture'],
  news: ['world news briefing', 'science news today', 'design news'],
  'google-search': ['visual culture', 'future materials', 'worldwide maps'],
};

/** Returns a seeded, no-repeat set of pages. Empty categories means every category. */
export function createDeck(selectedCategories: Category[], seed: number, count: number): CatalogEntry[] {
  if (!Number.isInteger(count) || count < 0 || count > 120) throw new Error('count must be an integer from 0 to 120.');
  const selected = selectedCategories.length ? [...new Set(selectedCategories)] : [...categories];
  if (selected.some(category => !categories.includes(category))) throw new Error('Unknown category.');
  const rng = createRandom(seed);
  const source = catalog.filter(entry => selected.includes(entry.category));
  for (let index = source.length - 1; index > 0; index--) {
    const other = Math.floor(rng() * (index + 1));
    [source[index], source[other]] = [source[other], source[index]];
  }
  const deck = source.slice(0, count);
  for (let index = deck.length; index < count; index++) {
    const category = selected[index % selected.length];
    const topic = fallbackTopics[category][Math.floor(rng() * fallbackTopics[category].length)];
    const query = `${topic} ${index + 1} ${seed >>> 0}`;
    deck.push({ id: `search-${category}-${index}-${seed >>> 0}`, title: `Google: ${topic}`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`, category });
  }
  return deck;
}
