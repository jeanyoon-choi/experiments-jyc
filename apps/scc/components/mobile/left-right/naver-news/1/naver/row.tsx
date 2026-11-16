/* eslint-disable @next/next/no-img-element -- small local photos, no optimisation needed */
import type { Slot } from "../feed/types";
import { ago, count, recent } from "./format";
import { CommentIcon } from "./icons";
import styles from "./naver.module.css";

export const photoUrl = (key: string) => `/images/left-right/naver-news/${key}.jpg`;

/**
 * One list row, as on Naver's section page: thumbnail, two-line title, then
 * the outlet with either the cluster pill (headlines) or the time (latest).
 * The inner block is keyed by the row's turn so a new article fades in.
 */
export function Row({ slot, now, latest, onOpen }: { slot: Slot; now: number; latest: boolean; onOpen: (slot: Slot) => void }) {
  const { article } = slot;
  return (
    <li className={styles.item}>
      <button type="button" key={slot.turns} className={styles.itemInner} data-turned={slot.turns > 0 ? "true" : undefined} onClick={() => onOpen(slot)}>
        <span className={styles.thumb}>
          <img src={photoUrl(article.photo)} alt="" width={110} height={75} loading="lazy" decoding="async" />
        </span>
        <span className={styles.text}>
          <strong className={styles.title}>{article.title}</strong>
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
