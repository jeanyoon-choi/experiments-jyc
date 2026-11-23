"use client";

import type { Item } from "./archive";
import { photoUrl } from "./photos";
import styles from "./estate.module.css";

const ago = (at: number, now: number) => {
  const minutes = Math.max(1, Math.floor((now - at) / 60_000));
  return minutes < 60 ? `${minutes}분전` : `${Math.floor(minutes / 60)}시간전`;
};

/** The archive as a news list: thumbnail, two-line headline, outlet · time · comments. */
export function News({ items, now }: { items: Item[]; now: number }) {
  return (
    <ul className={styles.news}>
      {items.map((item) => (
        <li key={item.key} className={styles.item}>
          <span className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(item.photo)} alt="서울의 아파트 단지. 자료사진." width={110} height={75} loading="lazy" />
          </span>
          <span className={styles.text}>
            <strong className={styles.title}>{item.title}</strong>
            <span className={styles.info}>
              <span>{item.press}</span>
              <span className={styles.datetime} data-recent={now - item.at < 3_600_000 || undefined}>
                {ago(item.at, now)}
              </span>
              <span className={styles.cmt}>
                <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
                  <path d="M1.5 2.5h10v7h-5.2L3.8 11.6V9.5H1.5z" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                </svg>
                {item.comments.toLocaleString("ko-KR")}
              </span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
