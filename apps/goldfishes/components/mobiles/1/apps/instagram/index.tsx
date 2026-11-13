/* eslint-disable @next/next/no-img-element -- fixed-size feed photos and portraits inside a scaled phone. */
// Instagram (Pride): the iOS home feed, 2026. Geometry, colours and glyphs follow SCC clone/11, which measured the
// US App Store frames at 2.351 px/pt and copied the IGDS icon modules verbatim (apps/scc/docs/experiments/sns/mobile/11.md).
// The newest post is the event's account posting it; with no photo, the media is a carousel text card, the
// form news and meme accounts use on Instagram.

import { memo } from "react";
import type { CSSProperties } from "react";
import { imageFor, portraitFor } from "../../content/images";
import type { AppDefinition, AppPost, AppScreenProps } from "../types";
import { Icon } from "./glyph";
import { InstagramIcon, Wordmark } from "./marks";
import { accountOf, ageOf, compactCount, countsOf, hashtags, slidesOf, storyAccounts } from "./model";
import s from "./instagram.module.css";
import { samePost } from "../memo";

const CARDS = [
  { bg: "#0d0d0d", ink: "#ffffff", accent: "#d6ff3d" },
  { bg: "#f2ede3", ink: "#151515", accent: "#ff4a1c" },
  { bg: "#2b46ff", ink: "#ffffff", accent: "#ffe24a" },
  { bg: "#ff5b37", ink: "#1a0c07", accent: "#ffffff" },
  { bg: "#0f3b2e", ink: "#f4f0e6", accent: "#9df2c2" },
] as const;

const MESHES = [
  "radial-gradient(120% 90% at 15% 10%, #6d5bd0 0%, transparent 55%), radial-gradient(90% 80% at 90% 30%, #ff7a59 0%, transparent 60%), radial-gradient(120% 100% at 50% 110%, #101433 10%, #2a1f4d 70%)",
  "radial-gradient(100% 80% at 80% 0%, #8fd3ff 0%, transparent 60%), radial-gradient(90% 90% at 0% 70%, #1d6b8f 0%, transparent 65%), linear-gradient(180deg, #0b2233 0%, #04101a 100%)",
  "radial-gradient(90% 70% at 30% 20%, #ffcf8a 0%, transparent 60%), radial-gradient(100% 90% at 100% 80%, #c2412d 0%, transparent 65%), linear-gradient(160deg, #3a1a10 0%, #120806 100%)",
  "radial-gradient(80% 70% at 70% 25%, #b6ff9e 0%, transparent 55%), radial-gradient(110% 90% at 10% 90%, #1f7a5a 0%, transparent 65%), linear-gradient(180deg, #0c2a20 0%, #051410 100%)",
];

function shortest(figures: readonly string[]) {
  return figures.reduce((best, figure) => (figure.length < best.length ? figure : best), figures[0] ?? "");
}

function Media({ post, handle, avatar }: { post: AppPost; handle: string; avatar: string }) {
  const photo = imageFor(post.event.image);
  const slides = slidesOf(post);
  const counter = <span className={s.counter}>1/{slides}</span>;
  if (photo) {
    return (
      <div className={s.media}>
        <img src={photo} alt="" decoding="sync" />
        {counter}
      </div>
    );
  }
  const variant = Math.floor(post.pick(41) * 3);
  if (variant === 2) {
    return (
      <div className={`${s.media} ${s.meshCard}`} style={{ background: MESHES[Math.floor(post.pick(42) * MESHES.length)] }}>
        <div className={s.meshCopy}>
          <span className={s.cardHandle}>
            <img src={avatar} alt="" decoding="sync" />
            {handle}
          </span>
          <strong>{post.event.headline}</strong>
        </div>
        {counter}
      </div>
    );
  }
  const card = CARDS[Math.floor(post.pick(43) * CARDS.length)]!;
  const style = { "--card-bg": card.bg, "--card-ink": card.ink, "--card-accent": card.accent } as CSSProperties;
  if (variant === 1) {
    return (
      <div className={`${s.media} ${s.figureCard}`} style={style}>
        <span className={s.cardHandle}>
          <img src={avatar} alt="" decoding="sync" />
          {handle}
        </span>
        <strong className={s.figure}>{shortest(post.event.figures)}</strong>
        <p>{post.event.headline}</p>
        {counter}
      </div>
    );
  }
  return (
    <div className={`${s.media} ${s.textCard}`} style={style}>
      <span className={s.cardHandle}>
        <img src={avatar} alt="" decoding="sync" />
        {handle}
      </span>
      <strong>{post.event.headline}</strong>
      <p>{post.event.dek}</p>
      {counter}
    </div>
  );
}

function PostView({ post, newestAt }: { post: AppPost; newestAt: number }) {
  const account = accountOf(post);
  const counts = countsOf(post);
  const ring = post.pick(51) < 0.55;
  const slides = slidesOf(post);
  const tags = hashtags(post.event.tags).join(" ");
  const full = `${post.event.dek} ${tags}`;
  const long = full.length > 84;
  const shown = long ? full.slice(0, 74).replace(/\s+\S*$/, "") : full;
  const split = shown.length > post.event.dek.length ? post.event.dek.length : shown.length;
  return (
    <article className={s.post} data-post="">
      <header className={s.postHead}>
        <span className={`${s.postAvatar} ${ring ? s.ringNew : ""}`}>
          <img src={account.avatar} alt="" decoding="sync" />
        </span>
        <span className={s.identity}>
          <strong>
            {account.handle}
            {account.verified && (
              <span className={s.verified}>
                <Icon name="verified" size={12} />
              </span>
            )}
          </strong>
          {account.subtitle && <small>{account.subtitle}</small>}
        </span>
        <span className={s.postMore}>
          <Icon name="more" />
        </span>
      </header>
      <Media post={post} handle={account.handle} avatar={account.avatar} />
      <div className={s.actions}>
        <span>
          <Icon name="heart" />
          <b>{compactCount(counts.likes)}</b>
        </span>
        <span>
          <Icon name="message" />
          <b>{compactCount(counts.comments)}</b>
        </span>
        <span>
          <Icon name="repost" />
          <b>{compactCount(counts.reposts)}</b>
        </span>
        <span>
          <Icon name="send" />
          <b>{compactCount(counts.shares)}</b>
        </span>
        <i className={s.dots} aria-hidden="true">
          {Array.from({ length: Math.min(slides, 5) }, (_, index) => (
            <em key={index} data-on={index === 0 ? "" : undefined} />
          ))}
        </i>
        <span className={s.save}>
          <Icon name="save" />
        </span>
      </div>
      <div className={s.copy}>
        <p>
          <b>{account.handle}</b> {shown.slice(0, split)}
          {shown.length > split && <span className={s.tag}>{shown.slice(split)}</span>}
          {long && (
            <>
              … <span className={s.muted}>more</span>
            </>
          )}
        </p>
        <span className={s.muted}>View all {counts.comments.toLocaleString("en-US")} comments</span>
        <small>{ageOf(newestAt, post.item.at)}</small>
      </div>
    </article>
  );
}

function Screen({ posts }: AppScreenProps) {
  const newest = posts[0]!;
  const stories = storyAccounts(posts);
  const me = portraitFor(newest.item.fish * 7 + 3);
  return (
    <div className={s.app}>
      <header className={s.top}>
        <Icon name="add" />
        <span className={s.wordmark}>
          <Wordmark width={120} />
        </span>
        <span className={s.activity}>
          <Icon name="heart" size={28} />
          <i />
        </span>
      </header>
      <div className={s.feed} data-feed="">
        <div className={s.stories}>
          <span className={s.story}>
            <span className={s.storyOwn}>
              <img src={me} alt="" decoding="sync" />
              <i>
                <Icon name="add" size={13} />
              </i>
            </span>
            <small className={s.muted}>Your story</small>
          </span>
          {stories.map((story) => (
            <span className={s.story} key={story.id}>
              <span className={`${s.storyRing} ${s.ringNew}`}>
                <img src={story.avatar} alt="" decoding="sync" />
              </span>
              <small>{story.handle}</small>
            </span>
          ))}
        </div>
        {posts.map((post) => (
          <Post key={post.item.id} post={post} newestAt={newest.item.at} />
        ))}
      </div>
      <nav className={s.nav} aria-hidden="true">
        <span data-active="">
          <Icon name="home" filled />
        </span>
        <span>
          <Icon name="reels" />
        </span>
        <span>
          <Icon name="send" />
          <i className={s.navDot} />
        </span>
        <span>
          <Icon name="search" />
        </span>
        <span>
          <img src={me} alt="" decoding="sync" />
        </span>
      </nav>
    </div>
  );
}

function AppIcon({ size }: { size: number }) {
  return <InstagramIcon size={size} />;
}

export const instagramApp: AppDefinition = {
  id: "instagram",
  name: "Instagram",
  sin: "Pride",
  Screen,
  Icon: AppIcon,
  statusTone: "dark",
  notify: (post) => ({ title: "Instagram", body: `${accountOf(post).handle} just shared a post.` }),
};

/** A post renders once: the feed puts new ones on top many times a second (pc/mobiles/1 performance). */
const Post = memo(PostView, samePost);
