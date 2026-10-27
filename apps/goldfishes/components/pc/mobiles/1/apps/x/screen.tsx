// X for iOS, Home timeline, dark ("Lights out"), at native points on the
// 390 × 844 glass. Chrome and glyphs follow SCC clone 13 (x.com's served
// icon modules); the timeline holds every post, newest first, as one
// [data-feed] column that a driver outside the clone scrolls by transform.

import { memo } from "react";
import type { ReactNode } from "react";
import { portraitFor } from "../../content/images";
import type { AppPost, AppScreenProps } from "../types";
import { Icon, Verified, XLogo, type IconName } from "./icons";
import { compact, stampOf, tweetOf, type Account } from "./model";
import styles from "./x.module.css";
import { samePost } from "../memo";

function Avatar({ account, size }: { account: Account; size: number }) {
  if (account.avatar) {
    return <img className={styles.avatar} src={account.avatar} alt="" width={size} height={size} decoding="sync" />;
  }
  return (
    <span className={styles.orgAvatar} style={{ width: size, height: size, background: account.tint, fontSize: size * 0.42 }}>
      {account.monogram}
    </span>
  );
}

function Name({ account }: { account: Account }) {
  return (
    <span className={styles.name}>
      <strong>{account.name}</strong>
      {account.verified && <Verified tone={account.verified} />}
    </span>
  );
}

/** @handles and #tags in blue, as X links them. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/([@#][A-Za-z0-9_]+)/g);
  const out: ReactNode[] = [];
  let offset = 0;
  for (const part of parts) {
    out.push(/^[@#][A-Za-z0-9_]/.test(part) ? <span key={offset} className={styles.link}>{part}</span> : part);
    offset += part.length + 1;
  }
  return <>{out}</>;
}

function Action({ icon, count }: { icon: IconName; count?: string }) {
  return (
    <span className={styles.action}>
      <Icon name={icon} />
      {count && <span className={styles.count}>{count}</span>}
    </span>
  );
}

function PostView({ post, newest }: { post: AppPost; newest: AppPost }) {
  const tweet = tweetOf(post);
  const stamp = stampOf(post, newest);
  return (
    <article className={styles.post} data-post="">
      <Avatar account={tweet.author} size={40} />
      <div className={styles.main}>
        <div className={styles.head}>
          <span className={styles.identity}>
            <Name account={tweet.author} />
            <span className={styles.muted}>@{tweet.author.handle}</span>
            <span className={styles.stamp}>· {stamp}</span>
          </span>
          <span className={styles.more}>
            <Icon name="grok" />
            <Icon name="more" />
          </span>
        </div>
        <p className={styles.text}>
          <Rich text={tweet.text} />
        </p>
        {tweet.image && (
          <div className={styles.media}>
            <img src={tweet.image} alt="" decoding="sync" />
          </div>
        )}
        {tweet.quote && (
          <div className={styles.quote}>
            <div className={styles.quoteHead}>
              <Avatar account={tweet.quote.author} size={20} />
              <Name account={tweet.quote.author} />
              <span className={styles.muted}>@{tweet.quote.author.handle}</span>
              <span className={styles.stamp}>· 1h</span>
            </div>
            <p className={styles.quoteText}>{tweet.quote.text}</p>
            {tweet.quote.image && <img className={styles.quoteImage} src={tweet.quote.image} alt="" decoding="sync" />}
          </div>
        )}
        <div className={styles.actions}>
          <Action icon="reply" count={compact(tweet.replies)} />
          <Action icon="repost" count={compact(tweet.reposts)} />
          <Action icon="heart" count={compact(tweet.likes)} />
          <Action icon="views" count={compact(tweet.views)} />
          <span className={styles.pair}>
            <Action icon="bookmark" />
            <Action icon="share" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function XScreen({ posts }: AppScreenProps) {
  const newest = posts[0]!;
  return (
    <div className={styles.app}>
      <div className={styles.timeline} data-feed="">
        {posts.map((post) => (
          <Post key={post.item.id} post={post} newest={newest} />
        ))}
      </div>

      <header className={styles.chrome}>
        <div className={styles.topBar}>
          <img className={styles.self} src={portraitFor(newest.item.fish * 7 + 3)} alt="" width={32} height={32} decoding="sync" />
          <span className={styles.logo}>
            <XLogo />
          </span>
          <span className={styles.self} />
        </div>
        <div className={styles.tabs}>
          <span className={styles.tabOn}>
            <span>For you</span>
          </span>
          <span className={styles.tab}>
            <span>Following</span>
          </span>
        </div>
      </header>

      <span className={styles.fab}>
        <Icon name="compose" />
      </span>

      <nav className={styles.tabbar}>
        <Icon name="homeFill" />
        <Icon name="search" />
        <Icon name="grok" />
        <span className={styles.bell}>
          <Icon name="bell" />
          <span className={styles.badge}>{1 + Math.floor(newest.pick(21) * 19)}</span>
        </span>
        <Icon name="chat" />
      </nav>
    </div>
  );
}

/** A post renders once: the feed puts new ones on top many times a second (pc/mobiles/1 performance). */
const Post = memo(PostView, samePost);
