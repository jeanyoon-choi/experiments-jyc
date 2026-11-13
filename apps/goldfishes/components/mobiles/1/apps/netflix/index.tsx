// Netflix (Sloth): the iOS home at the top of its scroll. The newest post is
// the billboard (its documentary); the row under it holds the earlier posts'
// titles and the spin-offs the hype has already spawned.

import type { CSSProperties } from "react";
import type { AppDefinition, AppPost, AppScreenProps } from "../types";
import { netflixNotice, titleOf, viewerOf, type Title } from "./titles";
import styles from "./netflix.module.css";

const ROWS = ["New on Netflix", "Trending Now", "Top 10 Shows in the U.S. Today"] as const;
const POSTERS = 4;

function NLogo({ size }: { size: number }) {
  return (
    <svg width={size * 0.56} height={size} viewBox="0 0 56 100" className={styles.n} aria-hidden="true">
      <path d="M0 0h16v100L0 98z" fill="#b1060f" />
      <path d="M40 0h16v98l-16 2z" fill="#b1060f" />
      <path d="M0 0h16l40 98-16 2z" fill="#e50914" />
    </svg>
  );
}

function Treatment({ title, size }: { title: Title; size: "hero" | "poster" }) {
  return (
    <span className={styles.treatment} data-face={title.treatment} data-size={size} style={{ color: title.ink } as CSSProperties}>
      {title.name}
    </span>
  );
}

function Poster({ title, rank }: { title: Title; rank: number | null }) {
  const poster = (
    <span className={styles.poster} style={{ "--tint": title.tint } as CSSProperties}>
      <img className={styles.art} src={title.art} alt="" decoding="sync" />
      <span className={styles.posterShade} />
      <span className={styles.posterN}>
        <NLogo size={14} />
      </span>
      {title.top10 && rank === null && (
        <span className={styles.top10}>
          <span>TOP</span>
          <span>10</span>
        </span>
      )}
      <Treatment title={title} size="poster" />
      {title.ribbon && rank === null && <span className={styles.ribbon}>{title.ribbon}</span>}
    </span>
  );
  if (rank === null) return poster;
  return (
    <span className={styles.ranked}>
      <span className={styles.numeral}>{rank}</span>
      {poster}
    </span>
  );
}

function rowTitles(posts: readonly AppPost[]): Title[] {
  const titles = posts.slice(1, 1 + POSTERS).map((post) => titleOf(post));
  for (let n = 1; titles.length < POSTERS; n += 1) {
    for (const post of posts) {
      if (titles.length >= POSTERS) break;
      titles.push(titleOf(post, n));
    }
  }
  return titles;
}

function Screen({ posts }: AppScreenProps) {
  const lead = posts[0]!;
  const hero = titleOf(lead);
  const row = ROWS[Math.floor(lead.pick(50) * ROWS.length)] ?? ROWS[0];
  const ranked = row === ROWS[2];
  const titles = rowTitles(posts);
  return (
    <div className={styles.app} style={{ "--tint": hero.tint } as CSSProperties}>
      <span className={styles.wash} />
      <header className={styles.header}>
        <span className={styles.forName}>For {viewerOf(posts)}</span>
        <span className={styles.headerIcons}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4 19.5h16" />
          </svg>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5l5 5" />
          </svg>
        </span>
      </header>
      <div className={styles.chips}>
        <span className={styles.chip}>Shows</span>
        <span className={styles.chip}>Movies</span>
        <span className={styles.chip}>
          Categories
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3.5l3 3 3-3" />
          </svg>
        </span>
      </div>
      <section className={styles.billboard} key={hero.id}>
        <img className={styles.heroArt} src={hero.art} alt="" decoding="sync" />
        <span className={styles.heroShade} />
        <div className={styles.heroBody}>
          <span className={styles.format}>
            <NLogo size={20} />
            <span>{hero.format}</span>
          </span>
          <Treatment title={hero} size="hero" />
          {hero.top10 ? (
            <span className={styles.rankLine}>
              <span className={styles.top10} data-inline>
                <span>TOP</span>
                <span>10</span>
              </span>
              #1 in TV Shows Today
            </span>
          ) : (
            <span className={styles.genres}>{hero.genres.join(" • ")}</span>
          )}
          <div className={styles.buttons}>
            <span className={styles.play}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 3.8v16.4c0 .8.9 1.3 1.5.8l12.4-8.2c.6-.4.6-1.2 0-1.6L7.5 3c-.6-.5-1.5 0-1.5.8z" />
              </svg>
              Play
            </span>
            <span className={styles.myList}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 4v16M4 12h16" />
              </svg>
              My List
            </span>
          </div>
        </div>
      </section>
      <section className={styles.row}>
        <h2 className={styles.rowTitle}>{row}</h2>
        <div className={styles.rail} data-ranked={ranked || undefined}>
          {titles.map((title, index) => (
            <Poster key={title.id} title={title} rank={ranked ? index + 2 : null} />
          ))}
        </div>
      </section>
      <nav className={styles.tabs}>
        <span className={styles.tab} data-on>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.3 2.6c.4-.3 1-.3 1.4 0l8.5 7.2c.2.2.3.5.3.8V20c0 .6-.4 1-1 1h-5.5v-6.5h-6V21H3.5c-.6 0-1-.4-1-1v-9.4c0-.3.1-.6.3-.8z" />
          </svg>
          Home
        </span>
        <span className={styles.tab}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M7 7h10a4.5 4.5 0 0 1 4.4 5.4l-.9 4.6a2.5 2.5 0 0 1-4.3 1.2L14 16h-4l-2.2 2.2a2.5 2.5 0 0 1-4.3-1.2l-.9-4.6A4.5 4.5 0 0 1 7 7z" />
            <path d="M8 10v3.5M6.25 11.75h3.5M15.5 11h.01M17.5 13h.01" />
          </svg>
          Games
        </span>
        <span className={styles.tab}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
            <path d="M6 2.5h12" strokeLinecap="round" />
          </svg>
          New &amp; Hot
        </span>
        <span className={styles.tab}>
          <span className={styles.avatar}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#fff">
              <circle cx="5" cy="6" r="1.2" />
              <circle cx="11" cy="6" r="1.2" />
              <path d="M4 9.5c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            </svg>
          </span>
          My Netflix
        </span>
      </nav>
    </div>
  );
}

function Icon({ size }: { size: number }) {
  return (
    <span className={styles.icon} style={{ width: size, height: size }}>
      <NLogo size={size * 0.62} />
    </span>
  );
}

export const netflixApp: AppDefinition = {
  id: "netflix",
  name: "Netflix",
  sin: "Sloth",
  Screen,
  Icon,
  statusTone: "light",
  notify: netflixNotice,
};
