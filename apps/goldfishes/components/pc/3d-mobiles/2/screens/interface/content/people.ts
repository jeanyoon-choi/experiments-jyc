// Fictional posters, by the reader's language: plausible, never real.

import type { Lang } from "../paint/types";
import type { Random } from "../model/random";

const FIRST: Record<Lang, readonly string[]> = {
  en: ["Maya", "Jordan", "Priya", "Tyler", "Chloe", "Marcus", "Aisha", "Ben", "Sofia", "Ethan", "Nina", "Leo", "Harper", "Diego", "Zoe", "Sam"],
  ko: ["민지", "서준", "지우", "하은", "도윤", "수아", "예준", "지민", "서연", "현우", "채원", "유나", "태오", "다은"],
  ja: ["さくら", "ゆうと", "ひな", "はると", "あおい", "そうた", "めい", "れん", "ゆい", "かいと"],
  es: ["Lucía", "Mateo", "Valentina", "Santiago", "Camila", "Diego", "Martina", "Hugo", "Paula", "Álvaro"],
};
const LAST: Record<Lang, readonly string[]> = {
  en: ["Chen", "Okafor", "Patel", "Rivera", "Kowalski", "Nguyen", "Brooks", "Haddad", "Lindqvist", "Moreau", "Park", "Silva"],
  ko: ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"],
  ja: ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村"],
  es: ["García", "Martínez", "López", "Sánchez", "Romero", "Torres", "Navarro", "Gil"],
};
const HANDLE_BITS = ["daily", "irl", "vibes", "official", "hq", "lab", "_", "x", "2026", "real", "now", "core", "mood", "drop"];
const ROMAN: Record<string, string> = { 민지: "minji", 서준: "seojun", 지우: "jiwoo", 하은: "haeun", 도윤: "doyun", 수아: "sua", 예준: "yejun", 지민: "jimin", 서연: "seoyeon", 현우: "hyunwoo", 채원: "chaewon", 유나: "yuna", 태오: "taeo", 다은: "daeun", さくら: "sakura", ゆうと: "yuto", ひな: "hina", はると: "haruto", あおい: "aoi", そうた: "sota", めい: "mei", れん: "ren", ゆい: "yui", かいと: "kaito" };

export function personFor(lang: Lang, rng: Random) {
  const first = rng.pick(FIRST[lang]);
  const last = rng.pick(LAST[lang]);
  const name = lang === "ko" || lang === "ja" ? `${last}${first}` : `${first} ${last}`;
  const base = (ROMAN[first] ?? first)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");
  const handle = `${base}${rng.chance(0.5) ? "." : "_"}${rng.pick(HANDLE_BITS)}${rng.chance(0.4) ? rng.int(99) : ""}`;
  return { name, handle };
}
