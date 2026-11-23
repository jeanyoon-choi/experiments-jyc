/* eslint-disable @next/next/no-img-element -- small local photos, no optimisation needed */
import type { Slot } from "../feed/types";
import { ago, count, recent } from "./format";
import { CommentIcon } from "./icons";
import styles from "./news.module.css";

// The photographs are the ones collected for naver-news/1 (public assets, shared).
export const photoUrl = (key: string) => `/images/left-right/naver-news/${key}.jpg`;

type Props = {
  slot: Slot;
  now: number;
  latest: boolean;
  onOpen: (slot: Slot) => void;
};

/**
 * One list row: thumbnail, two-line title, then the outlet with either the
 * cluster pill (headlines) or the time (latest). The title is set heavier and
 * larger the further out the piece stands (data-tier).
 */
export function Row({ slot, now, latest, onOpen }: Props) {
  const { article } = slot;
  return (
    <li className={styles.item}>
      <button type="button" className={styles.itemInner} onClick={() => onOpen(slot)}>
        <span className={styles.thumb}>
          <img src={photoUrl(article.photo)} alt="" width={110} height={75} decoding="async" />
        </span>
        <span className={styles.text}>
          <strong className={styles.title} data-tier={article.slant === "none" ? undefined : article.tier} data-slant={article.slant}>{article.title}</strong>
          <span className={styles.info}>
            <span className={styles.infoLeft}>
              <span className={styles.press}>{article.press}</span>
              {latest && <span className={styles.datetime} data-recent={recent(slot.since, now) ? "true" : undefined}>{ago(slot.since, now)}</span>}
              <span className={styles.cmt}><CommentIcon />{count(article.comments)}</span>
            </span>
            {!latest && <span className={styles.cluster}>{article.cluster}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}
