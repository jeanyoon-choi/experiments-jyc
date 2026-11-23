/* eslint-disable @next/next/no-img-element -- small local photos, no optimisation needed */
import { bodyOf } from "../feed/articles";
import { SECTIONS } from "../feed/feed";
import type { Section, Slot } from "../feed/types";
import { count, stamp } from "./format";
import { Header } from "./header";
import { BubbleIcon, FontIcon, ShareIcon, SmileIcon, SpeakerIcon, SubscribeMark } from "./icons";
import styles from "./news.module.css";
import { Row, photoUrl } from "./row";

type Props = {
  slot: Slot;
  section: Section;
  /** Rows still on the main screen, shown under the article; they keep turning with the tilt. */
  more: readonly Slot[];
  now: number;
  closing: boolean;
  onHome: () => void;
  onSection: (section: Section) => void;
  onOpen: (slot: Slot) => void;
};

/**
 * The article page: outlet, headline, byline and tools, photo, body, then more
 * headlines. The piece stays as it was when tapped; only the headlines under
 * it turn with the mobile. It is set larger and heavier the further out it
 * stands (data-tier).
 */
export function ArticleView({ slot, section, more, now, closing, onHome, onSection, onOpen }: Props) {
  const { article } = slot;
  const label = SECTIONS.find(({ id }) => id === section)?.label ?? "";
  return (
    <section className={styles.end} data-closing={closing} data-tier={article.slant === "none" ? undefined : article.tier} data-slant={article.slant} aria-label={article.title}>
      <Header section={section} onSection={onSection} onHome={onHome} />
      <div className={styles.endTop}>
        <span className={styles.endPressMark}>{article.press.slice(0, 1)}</span>
        <span className={styles.endPress}>{article.press}</span>
        <span className={styles.endSubscribe}><SubscribeMark /></span>
      </div>
      <h2 className={styles.endTitle}>{article.title}</h2>
      <div className={styles.endInfo}>
        <div className={styles.endJournalist}>
          <span className={styles.endFace} />
          <span>
            <em className={styles.endName}>{article.reporter} 기자</em>
            <span className={styles.endDate}><i>입력</i>{stamp(slot.since)}</span>
          </span>
        </div>
        <div className={styles.endVariety}>
          <span className={styles.endLike}><SmileIcon />추천</span>
          <span className={styles.endCmt}><BubbleIcon />{count(article.comments)}</span>
          <span className={styles.endTools}><SpeakerIcon /><FontIcon /><ShareIcon /></span>
        </div>
      </div>
      <div className={styles.endBody}>
        <span className={styles.endPhoto}>
          <img src={photoUrl(article.photo)} alt="" />
          <em>{article.caption}</em>
        </span>
        {bodyOf(article).map((paragraph, index) => <p key={`${article.id}-${index}`}>{paragraph}</p>)}
        <p className={styles.endByline}>{article.reporter} 기자</p>
        <p className={styles.endCopyright}>Copyright ⓒ {article.press}. All rights reserved. 무단 전재 및 재배포 금지.</p>
      </div>
      <div className={styles.section}>
        <div className={styles.head}><span className={styles.headLink}>{label} 헤드라인</span></div>
        <div className={styles.list}>
          <ul>
            {more.map((other) => <Row key={other.key} slot={other} now={now} latest={false} onOpen={onOpen} />)}
          </ul>
        </div>
      </div>
    </section>
  );
}
