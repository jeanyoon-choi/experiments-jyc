// Tinder (Lust): the discovery card stack, light theme, at iOS points.
// The newest post is the top card; the one before waits beneath it. The
// person on the card is the event's person, and their bio is the hype.

import type { CSSProperties } from "react";
import type { AppDefinition, AppPost, AppScreenProps } from "../types";
import {
  ArrowUp,
  Bell,
  Bolt,
  Briefcase,
  Chat,
  Explore,
  FLAME_MASK,
  FLAME_PATH,
  Heart,
  Likes,
  Nope,
  Person,
  Pin,
  Rewind,
  Sliders,
  Star,
  Verified,
} from "./glyphs";
import { profileOf, tinderNotice } from "./profile";
import styles from "./tinder.module.css";

const flameMask = { WebkitMaskImage: FLAME_MASK, maskImage: FLAME_MASK } as CSSProperties;

function Card({ post, top }: { post: AppPost; top: boolean }) {
  const profile = profileOf(post);
  // The thumb sometimes rests on the top card mid-swipe, showing the next one.
  const drag = top ? post.pick(7) : 0;
  const lean = drag > 0.78 ? "like" : drag > 0.62 ? "nope" : null;
  return (
    <div className={styles.card} data-lean={lean ?? undefined} data-top={top || undefined}>
      <img className={styles.photo} src={profile.photo} alt="" decoding="sync" />
      <span className={styles.scrim} />
      <span className={styles.bars}>
        {Array.from({ length: profile.photos }, (_, index) => (
          <span key={index} className={styles.bar} data-on={index === 0 || undefined} />
        ))}
      </span>
      {lean === "like" && <span className={styles.stampLike}>LIKE</span>}
      {lean === "nope" && <span className={styles.stampNope}>NOPE</span>}
      <div className={styles.info}>
        {profile.active && (
          <span className={styles.active}>
            <span className={styles.activeDot} />
            Recently Active
          </span>
        )}
        <div className={styles.nameRow}>
          <span className={styles.name}>{profile.name}</span>
          <span className={styles.age}>{profile.age}</span>
          {profile.verified && <Verified size={26} />}
          <span className={styles.more}>
            <ArrowUp size={16} />
          </span>
        </div>
        <span className={styles.line}>
          <Briefcase size={16} />
          <span className={styles.lineText}>{profile.job}</span>
        </span>
        <span className={styles.line}>
          <Pin size={16} />
          <span className={styles.lineText}>{profile.distance}</span>
        </span>
        <p className={styles.bio}>{profile.bio}</p>
        <div className={styles.passions}>
          {profile.passions.map((passion, index) => (
            <span key={passion} className={styles.passion} data-shared={index === 0 || undefined}>
              {passion}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Screen({ posts }: AppScreenProps) {
  const [top, next] = posts;
  const drag = top ? top.pick(7) : 0;
  const lean = drag > 0.78 ? "like" : drag > 0.62 ? "nope" : undefined;
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.logo}>
          <span className={styles.logoFlame} style={flameMask} />
          <span className={styles.wordmark}>tinder</span>
        </span>
        <span className={styles.headerIcons}>
          <Bell />
          <Sliders />
        </span>
      </header>
      <div className={styles.deck}>
        {next && <Card key={next.item.id} post={next} top={false} />}
        {top && <Card key={top.item.id} post={top} top />}
        <div className={styles.actions} data-lean={lean}>
          <span className={styles.action} data-kind="rewind">
            <Rewind size={24} />
          </span>
          <span className={styles.action} data-kind="nope" data-big>
            <Nope size={28} />
          </span>
          <span className={styles.action} data-kind="super">
            <Star size={24} />
          </span>
          <span className={styles.action} data-kind="like" data-big>
            <Heart size={30} />
          </span>
          <span className={styles.action} data-kind="boost">
            <Bolt size={24} />
          </span>
        </div>
      </div>
      <nav className={styles.tabs}>
        <span className={styles.tabFlame} style={flameMask} />
        <span className={styles.tab}>
          <Explore />
        </span>
        <span className={styles.tab}>
          <Likes />
          <span className={styles.badge}>{posts.length > 9 ? "9+" : posts.length}</span>
        </span>
        <span className={styles.tab}>
          <Chat />
        </span>
        <span className={styles.tab}>
          <Person />
        </span>
      </nav>
    </div>
  );
}

function Icon({ size }: { size: number }) {
  return (
    <span className={styles.icon} style={{ width: size, height: size }}>
      <svg width="62%" height="62%" viewBox="0 0 24 24" fill="#fff">
        <path d={FLAME_PATH} />
      </svg>
    </span>
  );
}

export const tinderApp: AppDefinition = {
  id: "tinder",
  name: "Tinder",
  sin: "Lust",
  Screen,
  Icon,
  statusTone: "dark",
  notify: tinderNotice,
};
