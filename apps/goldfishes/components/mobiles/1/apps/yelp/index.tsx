// Yelp (Gluttony): the iOS home — search field, category row, then the
// newest businesses as search-result cards (photo, red square stars, price,
// category · neighbourhood, hours, one review quoted). Pure; see ../types.ts.

import { memo } from "react";
import type { CSSProperties } from "react";
import { imageFor } from "../../content/images";
import type { AppDefinition, AppPost, AppScreenProps } from "../types";
import { businessOf, starFills } from "./model";
import styles from "./yelp.module.css";
import { samePost } from "../memo";

const STAR = "M12 4.6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z";

function Stars({ rating }: { rating: number }) {
  return (
    <span className={styles.stars} aria-label={`${rating} star rating`}>
      {starFills(rating).map((fill, index) => (
        <span key={index} className={styles.star} style={{ "--fill": `${fill * 100}%` } as CSSProperties}>
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d={STAR} fill="#fff" />
          </svg>
        </span>
      ))}
    </span>
  );
}

function CardView({ post }: { post: AppPost }) {
  const business = businessOf(post);
  const image = imageFor(post.event.image);
  return (
    <article className={styles.card} data-post>
      <div className={styles.photo} style={{ "--h": business.hue } as CSSProperties}>
        {image ? <img className={styles.photoImage} src={image} alt="" decoding="sync" /> : <span className={styles.plate} />}
        <span className={styles.save} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <h3 className={styles.name}>{business.name}</h3>
      <div className={styles.rating}>
        <Stars rating={business.rating} />
        <span className={styles.score}>{business.rating.toFixed(1)}</span>
        <span className={styles.count}>({business.reviews} reviews)</span>
      </div>
      <div className={styles.meta}>
        {business.price} · {business.categories} · {business.neighbourhood}
      </div>
      <div className={styles.meta}>
        {business.open ? <span className={styles.open}>Open</span> : <span className={styles.closed}>Closed</span>}
        {business.open ? ` until ${business.hours}` : " until 11:00 AM tomorrow"} · {business.distance}
      </div>
      <div className={styles.quote}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M4 5.5h16a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-9.3L6 20.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <p className={styles.quoteText}>
          “{business.quote}” <b>more</b>
        </p>
      </div>
      {business.action && <span className={styles.action}>{business.action}</span>}
    </article>
  );
}

const CATEGORIES = [
  { id: "restaurants", label: "Restaurants", d: "M7 3v7.5M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 10.5V21M17 21V3c-2.2 1.2-3.5 4-3.5 7.5V14H17" },
  { id: "takeout", label: "Takeout", d: "M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8zM9 8V6.5a3 3 0 0 1 6 0V8" },
  { id: "delivery", label: "Delivery", d: "M3 6h11v10H3zM14 9.5h3.8L21 13v3h-7M8.3 18a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM19.3 18a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0z" },
  { id: "coffee", label: "Coffee", d: "M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3" },
  { id: "more", label: "More", d: "M6 12h.01M12 12h.01M18 12h.01" },
];

const TABS = [
  { id: "search", label: "Search", d: "M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.3 15.3 20 20" },
  { id: "projects", label: "Projects", d: "M8 4.5h8M9 3h6v3H9zM6 4.5H5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-1M8 11h8M8 15h5" },
  { id: "me", label: "Me", d: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4.5 20.5c.8-3.6 3.8-6 7.5-6s6.7 2.4 7.5 6" },
  { id: "collections", label: "Collections", d: "M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z" },
  { id: "more", label: "More", d: "M5 12h.01M12 12h.01M19 12h.01" },
];

function Screen({ posts }: AppScreenProps) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.search}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d={TABS[0]!.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Search for burgers, delivery, barbers…</span>
        </div>
      </header>
      <div className={styles.feed} data-feed>
        <nav className={styles.categories}>
          {CATEGORIES.map((category) => (
            <span key={category.id} className={styles.category}>
              <span className={styles.categoryIcon}>
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <path d={category.d} fill="none" stroke="currentColor" strokeWidth={category.id === "more" ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {category.label}
            </span>
          ))}
        </nav>
        <h2 className={styles.section}>Hot and New near you</h2>
        {posts.map((post) => (
          <Card key={post.item.id} post={post} />
        ))}
      </div>
      <nav className={styles.tabs}>
        {TABS.map((tab, index) => (
          <span key={tab.id} className={styles.tab} data-active={index === 0 || undefined}>
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d={tab.d} fill="none" stroke="currentColor" strokeWidth={tab.id === "more" ? 3 : 1.7} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tab.label}
          </span>
        ))}
      </nav>
    </div>
  );
}

/** The Yelp burst: five petals on red. */
function Icon({ size }: { size: number }) {
  const petal = "M0 -4 C 6 -4 9 -14 9 -24 C 9 -33 4 -38 0 -38 C -4 -38 -9 -33 -9 -24 C -9 -14 -6 -4 0 -4 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }} aria-hidden="true">
      <rect width="100" height="100" fill="#FF1A1A" />
      <g transform="translate(51 54)" fill="#fff">
        <path d={petal} transform="rotate(-12) scale(1 1.12)" />
        <path d={petal} transform="rotate(62) scale(0.82)" />
        <path d={petal} transform="rotate(136) scale(0.82)" />
        <path d={petal} transform="rotate(212) scale(0.82)" />
        <path d={petal} transform="rotate(286) scale(0.82)" />
      </g>
    </svg>
  );
}

export const yelpApp: AppDefinition = {
  id: "yelp",
  name: "Yelp",
  sin: "Gluttony",
  Screen,
  Icon,
  statusTone: "dark",
  notify: (post) => {
    const business = businessOf(post);
    return post.pick(11) < 0.5
      ? { title: "Hot and New near you", body: `${business.name} just opened in ${business.neighbourhood}. ${business.rating.toFixed(1)} stars from ${business.reviews} reviews already.` }
      : { title: `${business.reviewer} reviewed ${business.name}`, body: `“${business.quote}.”` };
  },
};

/** A post renders once: the feed puts new ones on top many times a second (pc/mobiles/1 performance). */
const Card = memo(CardView, samePost);
