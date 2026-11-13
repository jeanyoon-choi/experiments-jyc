// A deals app as a phone uses it (Gluttony's commerce, NOTES 1017): the hype
// as merchandise by the next morning — a flash sale counting down, then a
// two-up grid of the keyword's objects at 87% off; its notification the
// clock running out.

import type { Lang } from "../../paint/types";
import type { AppDef, ItemContext } from "../types";
import type { ShopFlash, ShopGrid, ShopProduct } from "./paint";

const PRODUCTS: Record<Lang, readonly string[]> = {
  en: ["{k} Mini Desktop Ornament 2026 New", "{k} Phone Case Shockproof Unisex", "{k}-Shaped LED Night Light USB", "Plush {k} Toy Soft Gift for Him Her", "{k} Pro Max (Replica) 1:12 Scale", "{k} Keychain Metal Premium Luxury", "{k} Sticker Pack 50pcs Waterproof", "Official-Style {k} Hoodie Oversized", "{k} Starter Kit for Beginners", "Inflatable {k} Party Decoration"],
  ko: ["{k} 미니 데스크 장식 2026 신상", "{k} 폰케이스 충격방지 남녀공용", "{k} 모양 LED 무드등 USB", "{k} 인형 말랑 선물용", "{k} 프로 맥스 (레플리카) 1:12", "{k} 키링 메탈 고급 럭셔리", "{k} 방수 스티커 50매", "{k} 오버핏 후드티", "입문자용 {k} 스타터 키트"],
  ja: ["{k} ミニ卓上オブジェ 2026新作", "{k} スマホケース 耐衝撃 男女兼用", "{k}型 LEDナイトライト USB", "{k} ぬいぐるみ ふわふわ ギフト", "{k} Pro Max（レプリカ）1/12", "{k} キーホルダー メタル 高級", "{k} 防水ステッカー 50枚", "{k} オーバーサイズパーカー"],
  es: ["Adorno de escritorio {k} mini 2026", "Funda de móvil {k} antigolpes unisex", "Lámpara LED con forma de {k} USB", "Peluche {k} suave para regalo", "{k} Pro Max (réplica) escala 1:12", "Llavero {k} metal premium lujo", "Pack 50 pegatinas {k} impermeables", "Sudadera {k} oversize"],
};

const SEARCHES: Record<Lang, readonly string[]> = {
  en: ["phone case", "led strip lights", "oversized hoodie", "desk organizer"],
  ko: ["폰케이스", "LED 무드등", "오버핏 후드티", "책상 정리함"],
  ja: ["スマホケース", "LEDテープライト", "パーカー", "デスク収納"],
  es: ["funda móvil", "luces led", "sudadera", "organizador"],
};

function product(ctx: ItemContext, fresh: boolean, sponsored: boolean): ShopProduct {
  const { rng } = ctx;
  const price = rng.range(0.99, 19.99);
  return {
    photo: ctx.photo(fresh || rng.chance(0.5) ? "object" : "any"),
    title: rng.pick(PRODUCTS[ctx.lang]).replace("{k}", ctx.label),
    price,
    was: price * rng.range(3, 12),
    sold: Math.round(rng.range(40, 90_000)),
    rating: rng.range(4.1, 5),
    reviews: rng.int(12_000),
    badge: fresh ? "lightning" : rng.pick(["", "", "lightning", "local", "almost"] as const),
    sponsored,
  };
}

const clock = (seconds: number) => [seconds / 3600, (seconds / 60) % 60, seconds % 60].map((n) => String(Math.floor(n)).padStart(2, "0")).join(":");

export const shop: AppDef = {
  id: "shop",
  name: "Deals",
  kind: "feed",
  mode: (persona) => persona.mode,
  bg: (mode) => (mode === "dark" ? "#121212" : "#ffffff"),
  top: 142,
  bottom: 83,
  chrome: (ctx) => ({ search: ctx.rng.pick(SEARCHES[ctx.lang]), cart: 1 + ctx.rng.int(9) }),
  opening(ctx) {
    const data: ShopFlash = {
      seconds: 60 + ctx.rng.int(3600),
      products: [0, 1, 2].map((index) => {
        const item = product(ctx, index === 0, false);
        return { photo: item.photo, price: item.price, was: item.was, claimed: ctx.rng.range(0.55, 0.98) };
      }),
    };
    return [{ painter: "shop.flash", data }];
  },
  item(ctx) {
    const sponsored = !ctx.fresh && ctx.rng.chance(0.2);
    const data: ShopGrid = { products: [product(ctx, ctx.fresh, sponsored), product(ctx, false, false)] };
    return { painter: "shop.grid", data };
  },
  notify(ctx) {
    const time = clock(60 + ctx.rng.int(3600));
    const name = ctx.rng.pick(PRODUCTS[ctx.lang]).replace("{k}", ctx.label);
    const off = 70 + ctx.rng.int(25);
    const bodies: Record<Lang, string> = {
      en: `⚡ Flash sale ends in ${time}! ${name} −${off}%`,
      ko: `⚡ 타임 세일 종료까지 ${time}! ${name} ${off}% 할인`,
      ja: `⚡ タイムセール終了まで${time}！${name}が${off}%OFF`,
      es: `⚡ ¡La oferta flash termina en ${time}! ${name} −${off} %`,
    };
    return { title: "Deals", body: bodies[ctx.lang] };
  },
};
