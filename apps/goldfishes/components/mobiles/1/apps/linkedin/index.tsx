// LinkedIn (Greed): the iOS home feed — avatar, search, messaging; post
// cards (author • 1st, headline, age • globe, body …more, a document or
// link card, reactions, comments • reposts, Like Comment Repost Send); the
// five-tab bar. Pure; see ../types.ts.

import { memo } from "react";
import type { CSSProperties } from "react";
import { imageFor, portraitFor } from "../../content/images";
import type { AppDefinition, AppPost, AppScreenProps } from "../types";
import { linkedInPostOf, monogram, type Reaction } from "./model";
import styles from "./linkedin.module.css";
import { samePost } from "../memo";

/** The viewer's own avatar, top left. */
const ME = 17;

const ICON = {
  search: "M14.56 12.44 11.3 9.18a5.51 5.51 0 1 0-2.12 2.12l3.26 3.26a1.5 1.5 0 1 0 2.12-2.12zM3 6.5A3.5 3.5 0 1 1 6.5 10 3.5 3.5 0 0 1 3 6.5z",
  messaging: "M16 4H8a7 7 0 0 0 0 14h4v4l8.16-5.39A6.78 6.78 0 0 0 23 11a7 7 0 0 0-7-7zm-8 8.25A1.25 1.25 0 1 1 9.25 11 1.25 1.25 0 0 1 8 12.25zm4 0A1.25 1.25 0 1 1 13.25 11 1.25 1.25 0 0 1 12 12.25zm4 0A1.25 1.25 0 1 1 17.25 11 1.25 1.25 0 0 1 16 12.25z",
  globe: "M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zM3 8a5 5 0 0 1 1-3l.55.55A1.5 1.5 0 0 1 5 6.62v1.07a.75.75 0 0 0 .22.53l.56.56a.75.75 0 0 0 .53.22H7v.69a.75.75 0 0 0 .22.53l.56.56a.75.75 0 0 1 .22.53V13a5 5 0 0 1-5-5zm6.24 4.83 2-2.46a.75.75 0 0 0 .09-.8l-.58-1.16A.76.76 0 0 0 10 8H7v-.19a.51.51 0 0 1 .28-.45l.38-.19a.74.74 0 0 1 .68 0L9 7.5l.38-.7a1 1 0 0 0 .12-.48v-.85a.78.78 0 0 1 .21-.53l1.07-1.09a5 5 0 0 1-1.54 9z",
  dots: "M14 12a2 2 0 1 1-2-2 2 2 0 0 1 2 2zM4 10a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm16 0a2 2 0 1 0 2 2 2 2 0 0 0-2-2z",
  close: "M13.42 12 20 18.58 18.58 20 12 13.42 5.42 20 4 18.58 10.58 12 4 5.42 5.42 4 12 10.58 18.58 4 20 5.42z",
  like: "M19.46 11l-3.91-3.91a7 7 0 0 1-1.69-2.74l-.49-1.47A2.76 2.76 0 0 0 10.76 1 2.75 2.75 0 0 0 8 3.74v1.12a9.19 9.19 0 0 0 .46 2.85L8.89 9H4.12A2.12 2.12 0 0 0 2 11.12a2.16 2.16 0 0 0 .92 1.76A2.11 2.11 0 0 0 2 14.62a2.14 2.14 0 0 0 1.28 2 2 2 0 0 0-.28 1 2.12 2.12 0 0 0 2 2.12v.14A2.12 2.12 0 0 0 7.12 22h7.49a8.08 8.08 0 0 0 3.58-.84l.31-.16H21V11zM19 19h-1l-.73.37a6.14 6.14 0 0 1-2.69.63H7.72a1 1 0 0 1-1-.72l-.25-.87-.85-.41A1 1 0 0 1 5 17l.17-1-.76-.74A1 1 0 0 1 4.27 14l.66-1.09-.73-1.1a.49.49 0 0 1 .08-.7.48.48 0 0 1 .34-.11h7.05l-1.31-3.92A7 7 0 0 1 10 4.86V3.75a.77.77 0 0 1 .75-.75.75.75 0 0 1 .71.51L12 5a9 9 0 0 0 2.13 3.5l4.5 4.5H19z",
  comment: "M7 9h10v1H7zm0 4h7v-1H7zm16-2a6.78 6.78 0 0 1-2.84 5.61L12 22v-4H8A7 7 0 0 1 8 4h8a7 7 0 0 1 7 7zm-2 0a5 5 0 0 0-5-5H8a5 5 0 0 0 0 10h6v2.28L19 15a4.79 4.79 0 0 0 2-4z",
  repost: "M13.96 5H6c-.55 0-1 .45-1 1v10H3V6c0-1.66 1.34-3 3-3h7.96L12 0h2.37L17 4l-2.63 4H12l1.96-3zm5.04 3v10c0 .55-.45 1-1 1h-7.96L12 16H9.63L7 20l2.63 4H12l-1.96-3H18c1.66 0 3-1.34 3-3V8h-2z",
  send: "M21 3 0 10l7.66 4.26L16 8l-6.26 8.34L14 24l7-21z",
  home: "M23 9v2h-2v7a3 3 0 0 1-3 3h-4v-6h-4v6H6a3 3 0 0 1-3-3v-7H1V9l11-7z",
  network: "M12 16v6H3v-6a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3zm5.5-3A3.5 3.5 0 1 0 14 9.5a3.5 3.5 0 0 0 3.5 3.5zm1 2h-2a2.5 2.5 0 0 0-2.5 2.5V22h7v-4.5a2.5 2.5 0 0 0-2.5-2.5zM7.5 2A4.5 4.5 0 1 0 12 6.5 4.49 4.49 0 0 0 7.5 2z",
  post: "M18 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3zm-1 10h-4v4h-2v-4H7v-2h4V7h2v4h4z",
  bell: "M22 19h-8.28a2 2 0 1 1-3.44 0H2v-1a4.52 4.52 0 0 1 1.17-2.83l1-1.17h15.7l1 1.17A4.42 4.42 0 0 1 22 18zM18.21 7.44A6.27 6.27 0 0 0 12 2a6.27 6.27 0 0 0-6.21 5.44L5 13h14z",
  jobs: "M17 6V5a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3v1H2v4a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V6zM9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9zm10 9a4 4 0 0 0 3-1.38V17a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-4.38A4 4 0 0 0 5 14z",
};

const REACTION: Record<Reaction, { fill: string; d: string }> = {
  like: { fill: "#378fe9", d: "M4.6 7.2h1.6v4.6H4.6zM7 11.8h3.4c.5 0 .9-.3 1-.8l.7-2.6c.1-.6-.3-1.1-.9-1.1H9.4l.3-1.7c.1-.6-.3-1.2-.9-1.2L7 7.2z" },
  celebrate: { fill: "#6dae4f", d: "M5.2 11.6 4 7.4c-.1-.4.1-.8.5-.9s.8.1.9.5l.7 2.2-.2-3.6c0-.4.3-.8.7-.8s.8.3.8.7l.2 2.6.5-3.4c.1-.4.4-.7.8-.6.4 0 .7.4.6.8l-.4 3 .9-2c.2-.4.6-.5.9-.4.4.2.5.6.4.9l-1.4 3.6c-.5 1.2-1.7 2-3 2-.7 0-1.2-.2-1.6-.4zM11.6 4.2l.7-1.2M12.6 6l1.2-.4" },
  insightful: { fill: "#f5bb5c", d: "M8 3.2a3.2 3.2 0 0 0-2 5.7v1.4h4V8.9a3.2 3.2 0 0 0-2-5.7zM6.2 11.2h3.6v.8H6.2zM6.8 12.6h2.4v.6H6.8z" },
  love: { fill: "#df704d", d: "M8 12.6 4 8.8a2.3 2.3 0 0 1 3.3-3.2l.7.7.7-.7A2.3 2.3 0 0 1 12 8.8z" },
  support: { fill: "#a872e8", d: "M8 11.4 5 8.6a1.7 1.7 0 0 1 2.4-2.4l.6.5.6-.5A1.7 1.7 0 0 1 11 8.6zM3.4 10.6l3.2 2.6h4.2l1.8-1.6" },
};

function Glyph({ d, size = 24 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function CardView({ post, index }: { post: AppPost; index: number }) {
  const card = linkedInPostOf(post, index);
  const image = imageFor(post.event.image);
  const tone = { "--h": card.hue } as CSSProperties;
  return (
    <article className={styles.card} data-post>
      <header className={styles.author}>
        <img className={styles.avatar} src={portraitFor(post.item.seed)} alt="" decoding="sync" />
        <div className={styles.byline}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{card.name}</span>
            <span className={styles.degree}> • {card.degree}</span>
          </div>
          <div className={styles.headline}>{card.headline}</div>
          <div className={styles.age}>
            {card.age} •{" "}
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path d={ICON.globe} fill="currentColor" />
            </svg>
          </div>
        </div>
        <span className={styles.controls}>
          <Glyph d={ICON.dots} size={20} />
          <Glyph d={ICON.close} size={20} />
        </span>
      </header>
      <div className={styles.body}>
        {card.body}
        <span className={styles.more}>…more</span>
      </div>
      {card.media === "document" ? (
        <div className={styles.document} style={tone}>
          <div className={styles.documentBar}>
            {card.documentTitle} • {card.pages} pages
          </div>
          <div className={styles.slide}>
            <span className={styles.slideKicker}>{post.event.org}</span>
            <span className={styles.slideTitle}>{card.documentTitle}</span>
            <span className={styles.slideAuthor}>
              {card.name}
              <span className={styles.slideArrow}>→</span>
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.link}>
          <div className={styles.linkImage} style={tone}>
            {image ? <img src={image} alt="" decoding="sync" /> : <span className={styles.linkMark}>{monogram(post.event.org)}</span>}
          </div>
          <div className={styles.linkText}>
            <span className={styles.linkTitle}>{card.linkTitle}</span>
            <span className={styles.linkSource}>{card.linkSource}</span>
          </div>
        </div>
      )}
      <div className={styles.social}>
        <span className={styles.reactions}>
          {card.stack.map((reaction) => (
            <svg key={reaction} className={styles.reaction} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="8" cy="8" r="8" fill={REACTION[reaction].fill} />
              <path d={REACTION[reaction].d} fill="#fff" stroke={reaction === "celebrate" ? "#fff" : "none"} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          ))}
          <span className={styles.count}>{card.reactions}</span>
        </span>
        <span className={styles.count}>
          {card.comments} comments • {card.reposts} reposts
        </span>
      </div>
      <footer className={styles.actions}>
        {(["like", "comment", "repost", "send"] as const).map((action) => (
          <span key={action} className={styles.action}>
            <Glyph d={ICON[action]} size={20} />
            {action === "like" ? "Like" : action === "comment" ? "Comment" : action === "repost" ? "Repost" : "Send"}
          </span>
        ))}
      </footer>
    </article>
  );
}

const TABS = [
  { id: "home", label: "Home", d: ICON.home },
  { id: "network", label: "My Network", d: ICON.network },
  { id: "post", label: "Post", d: ICON.post },
  { id: "bell", label: "Notifications", d: ICON.bell },
  { id: "jobs", label: "Jobs", d: ICON.jobs },
];

function Screen({ posts }: AppScreenProps) {
  const unread = Math.min(99, posts.length);
  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <img className={styles.me} src={portraitFor(ME)} alt="" decoding="sync" />
        <span className={styles.search}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d={ICON.search} fill="currentColor" />
          </svg>
          Search
        </span>
        <span className={styles.messaging}>
          <Glyph d={ICON.messaging} />
        </span>
      </header>
      <div className={styles.feed} data-feed>
        {posts.map((post, index) => (
          <Card key={post.item.id} post={post} index={index} />
        ))}
      </div>
      <nav className={styles.tabs}>
        {TABS.map((tab, index) => (
          <span key={tab.id} className={styles.tab} data-active={index === 0 || undefined}>
            <span className={styles.tabIcon}>
              <Glyph d={tab.d} />
              {tab.id === "bell" && <span className={styles.badge}>{unread}</span>}
            </span>
            {tab.label}
          </span>
        ))}
      </nav>
    </div>
  );
}

/** The iOS icon: white "in" on LinkedIn blue. */
function Icon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }} aria-hidden="true">
      <rect width="100" height="100" fill="#0a66c2" />
      <g fill="#fff">
        <circle cx="31" cy="30.5" r="7.6" />
        <rect x="24.4" y="42" width="13.2" height="38" rx="1" />
        <path d="M45.4 42h12.6v5.4c2.3-3.9 6.8-6.5 12.4-6.5 9.4 0 14.2 5.8 14.2 17.3V80H71.4V61.2c0-5.8-2-8.6-6.6-8.6-4.7 0-7.2 3.2-7.2 9V80H45.4z" />
      </g>
    </svg>
  );
}

export const linkedinApp: AppDefinition = {
  id: "linkedin",
  name: "LinkedIn",
  sin: "Greed",
  Screen,
  Icon,
  statusTone: "dark",
  notify: (post) => {
    const card = linkedInPostOf(post, 0);
    const first = card.body.split("\n")[0]!;
    return post.pick(12) < 0.5
      ? { title: "LinkedIn", body: `${card.name} just posted: ${first}` }
      : { title: "LinkedIn", body: `${card.name} shared a post that's getting attention in your network: ${first}` };
  },
};

/** A post renders once: the feed puts new ones on top many times a second (pc/mobiles/1 performance). */
const Card = memo(CardView, samePost);
