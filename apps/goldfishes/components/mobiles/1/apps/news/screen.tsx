// Apple News for iOS 26.2, Today, light appearance, at native points on the
// 390 × 844 glass: " News" + date, the Sports / Puzzles / Politics / Food
// quick links, Top Stories (lead card, then a two-up row), For You (story
// rows, thumbnail right), and the floating Liquid Glass tab bar (Today, News+,
// Audio, Following) with Search beside it. Everything but the tab bar scrolls.

import { memo } from "react";
import type { CSSProperties } from "react";
import type { AppPost, AppScreenProps } from "../types";
import { dateOf, storyOf, type Story } from "./model";
import styles from "./news.module.css";
import { samePost } from "../memo";

const LINKS = ["Sports", "Puzzles", "Politics", "Food"] as const;

export function AppleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 384 512" aria-hidden="true">
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
      />
    </svg>
  );
}

/** The News "N" (iOS 26 icon): a diagonal band and two corners, cut by two narrow gaps. */
export const NEWS_N = "M0 14A14 14 0 0 1 14 0H52L100 48V86A14 14 0 0 1 86 100H48L0 52ZM64 0H86A14 14 0 0 1 100 14V36ZM0 64L36 100H14A14 14 0 0 1 0 86Z";

/** The same "N": as the Today tab glyph. */
export function NewsGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path fill="currentColor" d={NEWS_N} />
    </svg>
  );
}

function Wordmark({ story }: { story: Story }) {
  const { id, name } = story.outlet;
  if (id === "signal") {
    return (
      <span className={styles.wordmark} data-outlet={id}>
        Signal<i>/</i>Noise
      </span>
    );
  }
  return (
    <span className={styles.wordmark} data-outlet={id}>
      {name}
    </span>
  );
}

/** The photo, or an editorial graphic: the event's figure set large on a colourway. */
function Picture({ story, className }: { story: Story; className: string }) {
  if (story.image) {
    return (
      <div className={className}>
        <img src={story.image} alt="" decoding="sync" />
      </div>
    );
  }
  const { from, to, ink, figure, kicker } = story.art;
  return (
    <div className={`${className} ${styles.art}`} style={{ "--from": from, "--to": to, "--ink": ink } as CSSProperties}>
      <span className={styles.artKicker}>{kicker}</span>
      <span className={styles.artFigure}>{figure}</span>
    </div>
  );
}

function Footer({ story }: { story: Story }) {
  return (
    <div className={styles.footer}>
      <span>{story.age}</span>
      <svg className={styles.dots} viewBox="0 0 24 6" aria-hidden="true">
        <circle cx="3" cy="3" r="2.2" />
        <circle cx="12" cy="3" r="2.2" />
        <circle cx="21" cy="3" r="2.2" />
      </svg>
    </div>
  );
}

function Lead({ post, newest }: { post: AppPost; newest: AppPost }) {
  const story = storyOf(post, newest);
  return (
    <article className={styles.lead} data-post>
      <Picture story={story} className={styles.leadPicture} />
      <div className={styles.leadBody}>
        <Wordmark story={story} />
        <h2 className={styles.leadHeadline}>{story.headline}</h2>
        <p className={styles.leadDek}>{story.dek}</p>
        <Footer story={story} />
      </div>
    </article>
  );
}

function HalfView({ post, newest }: { post: AppPost; newest: AppPost }) {
  const story = storyOf(post, newest);
  return (
    <article className={styles.half} data-post>
      <Picture story={story} className={styles.halfPicture} />
      <div className={styles.halfBody}>
        <Wordmark story={story} />
        <h3 className={styles.halfHeadline}>{story.headline}</h3>
        <Footer story={story} />
      </div>
    </article>
  );
}

/** A story row: wordmark, headline and footer beside a square thumbnail. */
function RowView({ post, newest }: { post: AppPost; newest: AppPost }) {
  const story = storyOf(post, newest);
  return (
    <article className={styles.row} data-post>
      <div className={styles.rowBody}>
        <Wordmark story={story} />
        <h3 className={styles.rowHeadline}>{story.headline}</h3>
        <Footer story={story} />
      </div>
      <Picture story={story} className={styles.rowPicture} />
    </article>
  );
}

export function NewsScreen({ posts }: AppScreenProps) {
  const newest = posts[0]!;
  const rows = posts.slice(3);
  return (
    <div className={styles.app}>
      <div className={styles.feed} data-feed>
        <header className={styles.header}>
          <h1 className={styles.title}>
            <AppleMark className={styles.apple} />
            News
          </h1>
          <div className={styles.date}>{dateOf(newest.item.at)}</div>
        </header>

        <div className={styles.links}>
          {LINKS.map((link) => (
            <span key={link} className={styles.link}>
              {link}
            </span>
          ))}
        </div>

        <h2 className={styles.section}>Top Stories</h2>
        <Lead post={newest} newest={newest} />
        <div className={styles.pair}>
          {posts.slice(1, 3).map((post) => (
            <Half key={post.item.id} post={post} newest={newest} />
          ))}
        </div>

        {rows.length > 0 && <h2 className={styles.section}>For You</h2>}
        {rows.map((post) => (
          <Row key={post.item.id} post={post} newest={newest} />
        ))}
      </div>
      <div className={styles.edge} aria-hidden="true" />

      <nav className={styles.tabbar}>
        <div className={styles.tabs}>
          <span className={styles.tabOn}>
            <NewsGlyph className={styles.tabGlyph} />
            Today
          </span>
          <span className={styles.tab}>
            <svg className={styles.tabGlyph} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4.5" y="2.8" width="15" height="18.4" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <path d="M8.2 7.6h7.6M8.2 11.4h7.6M8.2 15.2h4.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            News+
          </span>
          <span className={styles.tab}>
            <svg className={styles.tabGlyph} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 15.5V12a8 8 0 0 1 16 0v3.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <rect x="2.6" y="13" width="5" height="8.4" rx="2" fill="currentColor" />
              <rect x="16.4" y="13" width="5" height="8.4" rx="2" fill="currentColor" />
            </svg>
            Audio
          </span>
          <span className={styles.tab}>
            <svg className={styles.tabGlyph} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="7" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <path d="M7.5 3.4h9.6a3.5 3.5 0 0 1 3.5 3.5v9.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            Following
          </span>
        </div>
        <span className={styles.search}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.4" cy="10.4" r="6.6" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="M15.4 15.4l5.2 5.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </span>
      </nav>
    </div>
  );
}

/** A post renders once: the feed puts new ones on top many times a second (pc/mobiles/1 performance). */
const Half = memo(HalfView, samePost);

/** A post renders once: the feed puts new ones on top many times a second (pc/mobiles/1 performance). */
const Row = memo(RowView, samePost);
