/* eslint-disable @next/next/no-img-element -- small local photos, no optimisation needed */
import { bodyOf } from "../feed/articles";
import type { Slot } from "../feed/types";
import { count, stamp } from "./format";
import { Header } from "./header";
import { BubbleIcon, FontIcon, ShareIcon, SmileIcon, SpeakerIcon, SubscribeMark } from "./icons";
import styles from "./naver.module.css";
import { Row, photoUrl } from "./row";

type Props = {
  slot: Slot;
  /** Rows still on the main screen, shown under the article; they keep turning with the tilt. */
  more: readonly Slot[];
  now: number;
  closing: boolean;
  onHome: () => void;
  onOpen: (slot: Slot) => void;
};

/** Naver's article page: outlet, headline, byline and tools, photo, body, then more headlines. */
export function ArticleView({ slot, more, now, closing, onHome, onOpen }: Props) {
  const { article } = slot;
  return (
    <section className={styles.end} data-closing={closing} aria-label={article.title}>
      <Header active={false} onHome={onHome} />
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
        {bodyOf(article).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p className={styles.endByline}>{article.reporter} 기자</p>
        <p className={styles.endCopyright}>Copyright ⓒ {article.press}. All rights reserved. 무단 전재 및 재배포 금지.</p>
      </div>
      <div className={styles.section}>
        <div className={styles.head}><span className={styles.headLink}>정치 헤드라인</span></div>
        <div className={styles.list}>
          <ul>
            {more.map((other) => <Row key={other.key} slot={other} now={now} latest={false} onOpen={onOpen} />)}
          </ul>
        </div>
      </div>
    </section>
  );
}
