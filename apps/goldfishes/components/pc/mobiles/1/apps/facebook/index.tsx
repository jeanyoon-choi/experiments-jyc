/* eslint-disable @next/next/no-img-element -- fixed-size feed photos and portraits inside a scaled phone. */
// Facebook (Envy): the iOS home feed, 2025–2026. Metrics measured on the US App Store "Home" frame
// (apps.apple.com/us/app/facebook/id284882215, 4-iOS-Home.png at 1284 × 2778; the 390 pt screen spans 1101 px,
// 2.823 px/pt): wordmark 133.5 × 24 pt at 12 pt, top-bar glyphs 46 pt apart, composer row 61 pt with a 40 pt avatar,
// 3.5 pt grey section bars, 105 × 187 pt story cards on a 113.5 pt pitch, 40 pt post avatars, 17 pt post text,
// a 6-item tab bar (81 pt with the home indicator) whose active item is #0866FF with a 1.5 pt top indicator.
// The post is a Page or a friend sharing the event as a link card; with no photo the card's image is a
// designed cover built from the event's numbers.

import { memo } from "react";
import { imageFor, portraitFor } from "../../content/images";
import type { AppDefinition, AppPost, AppScreenProps } from "../types";
import { FacebookIcon, Glyph, Reaction, Wordmark, type GlyphName } from "./marks";
import { ageOf, authorOf, countsOf, domainOf, shortCount, storiesOf } from "./model";
import s from "./facebook.module.css";
import { samePost } from "../memo";

/**
 * The real home puts stories under the composer. At 187 pt the tray pushes the newest post's reactions under the
 * tab bar, so by default the tray follows the newest post (as Facebook places its Reels tray between posts).
 * Set true for the literal top-of-feed order.
 */
const STORIES_FIRST = false;

const COVERS = [
  "radial-gradient(90% 120% at 85% 10%, #59a8ff 0%, transparent 60%), radial-gradient(80% 110% at 0% 100%, #1b2a6b 0%, transparent 70%), linear-gradient(135deg, #0b1636 0%, #142a66 100%)",
  "radial-gradient(80% 120% at 20% 0%, #ffb36b 0%, transparent 60%), radial-gradient(90% 120% at 100% 100%, #8a1f2b 0%, transparent 70%), linear-gradient(135deg, #2c0f0c 0%, #5a1a14 100%)",
  "radial-gradient(90% 120% at 80% 0%, #a6f2c6 0%, transparent 55%), radial-gradient(90% 120% at 0% 100%, #0f5240 0%, transparent 70%), linear-gradient(135deg, #062a20 0%, #0e3d30 100%)",
  "radial-gradient(80% 120% at 10% 10%, #d7c2ff 0%, transparent 55%), radial-gradient(100% 120% at 100% 100%, #3b1f8f 0%, transparent 70%), linear-gradient(135deg, #160b33 0%, #2a1666 100%)",
];

function Cover({ post }: { post: AppPost }) {
  const photo = imageFor(post.event.image);
  if (photo) return <img className={s.cover} src={photo} alt="" decoding="sync" />;
  const figure = post.event.figures[Math.floor(post.pick(81) * post.event.figures.length)] ?? post.label;
  return (
    <span className={`${s.cover} ${s.designed}`} style={{ background: COVERS[Math.floor(post.pick(82) * COVERS.length)] }}>
      <strong>{figure}</strong>
      <small>{post.event.org}</small>
    </span>
  );
}

function PostView({ post, newestAt }: { post: AppPost; newestAt: number }) {
  const author = authorOf(post);
  const counts = countsOf(post, author);
  return (
    <article className={s.post} data-post="">
      <header className={s.postHead}>
        <img className={s.avatar} src={author.avatar} alt="" decoding="sync" />
        <span className={s.who}>
          <strong>
            {author.name}
            {author.verified && (
              <span className={s.badge}>
                <Glyph name="verified" size={15} />
              </span>
            )}
          </strong>
          <small>
            {ageOf(newestAt, post.item.at)} ·{" "}
            <span className={s.globe}>
              <Glyph name="globe" size={12} />
            </span>
          </small>
        </span>
        <span className={s.headTools}>
          <Glyph name="more" size={20} />
          <Glyph name="close" size={18} />
        </span>
      </header>
      <p className={s.text}>{post.event.dek}</p>
      <div className={s.link}>
        <Cover post={post} />
        <span className={s.linkMeta}>
          <small>{domainOf(post, author)}</small>
          <strong>{post.event.headline}</strong>
        </span>
      </div>
      <div className={s.summary}>
        <span className={s.faces}>
          {counts.faces.map((face) => (
            <span key={face}>
              <Reaction kind={face} />
            </span>
          ))}
        </span>
        <span>{shortCount(counts.reactions)}</span>
        <span className={s.tallies}>
          {shortCount(counts.comments)} comments · {shortCount(counts.shares)} shares
        </span>
      </div>
      <div className={s.actions}>
        <span>
          <Glyph name="like" size={20} />
          Like
        </span>
        <span>
          <Glyph name="comment" size={20} />
          Comment
        </span>
        <span>
          <Glyph name="share" size={20} />
          Share
        </span>
      </div>
    </article>
  );
}

function Stories({ posts, me }: { posts: readonly AppPost[]; me: string }) {
  const stories = storiesOf(posts);
  return (
    <div className={s.stories}>
      <span className={`${s.card} ${s.create}`}>
        <img src={me} alt="" decoding="sync" />
        <i>
          <Glyph name="plus" size={18} />
        </i>
        <b>Create story</b>
      </span>
      {stories.map((story) => (
        <span className={s.card} key={story.id}>
          <img src={story.photo} alt="" decoding="sync" />
          <span className={s.ring}>
            <img src={story.avatar} alt="" decoding="sync" />
          </span>
          <b>{story.name}</b>
        </span>
      ))}
    </div>
  );
}

const TABS: readonly { id: GlyphName; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "reels", label: "Reels" },
  { id: "marketplace", label: "Marketplace" },
  { id: "friends", label: "Friends" },
  { id: "bell", label: "Notifications" },
  { id: "menu", label: "More" },
];

function Screen({ posts }: AppScreenProps) {
  const newest = posts[0]!;
  const me = portraitFor(newest.item.fish * 7 + 3);
  const stories = <Stories posts={posts} me={me} />;
  return (
    <div className={s.app}>
      <header className={s.top}>
        <Wordmark width={133.5} />
        <span className={s.tools}>
          <Glyph name="plus" size={24} />
          <Glyph name="search" size={24} />
          <Glyph name="messenger" size={24} />
        </span>
      </header>
      <div className={s.feed} data-feed="">
        <div className={s.composer}>
          <img src={me} alt="" decoding="sync" />
          <span>What’s on your mind?</span>
          <i>
            <Glyph name="photo" size={23} />
          </i>
        </div>
        {STORIES_FIRST && stories}
        {/* The tray is its own keyed sibling after the newest post, so a new post moves it instead of remounting it. */}
        {posts.flatMap((post, index) => [
          <div key={post.item.id}>
            <Post post={post} newestAt={newest.item.at} />
          </div>,
          ...(!STORIES_FIRST && index === 0 ? [<div key="stories">{stories}</div>] : []),
        ])}
      </div>
      <nav className={s.tabs} aria-hidden="true">
        {TABS.map((tab) => (
          <span key={tab.id} data-active={tab.id === "home" ? "" : undefined}>
            <Glyph name={tab.id} size={24} />
            <small>{tab.label}</small>
          </span>
        ))}
      </nav>
    </div>
  );
}

export const facebookApp: AppDefinition = {
  id: "facebook",
  name: "Facebook",
  sin: "Envy",
  Screen,
  Icon: FacebookIcon,
  statusTone: "dark",
  notify: (post) => {
    const author = authorOf(post);
    return { title: "Facebook", body: `${author.name} shared a link: “${post.event.headline}”` };
  },
};

/** A post renders once: the feed puts new ones on top many times a second (pc/mobiles/1 performance). */
const Post = memo(PostView, samePost);
