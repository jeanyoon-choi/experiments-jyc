"use client";

import type { Item } from "./archive";
import { photoUrl } from "./photos";
import styles from "./estate.module.css";

const stamp = (at: number) => {
  const d = new Date(at);
  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}. ${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}:${minute}`;
};

/** One report opened: outlet, headline, reporter and time, the photograph, the body. */
export function Article({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <article className={styles.article}>
      <button type="button" className={styles.back} aria-label="목록으로" onClick={onClose}>
        <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true">
          <path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className={styles.endTop}>
        <span className={styles.endPressMark}>{item.press[0]}</span>
        <span className={styles.endPress}>{item.press}</span>
      </div>
      <h2 className={styles.endTitle}>{item.title}</h2>
      <div className={styles.endInfo}>
        <span className={styles.endName}>{item.reporter} 기자</span>
        <span className={styles.endDate}>입력 {stamp(item.at)}</span>
      </div>
      <div className={styles.endBody}>
        <figure className={styles.endPhoto}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(item.photo)} alt="" />
          <figcaption>서울의 아파트 단지. 자료사진.</figcaption>
        </figure>
        {item.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p className={styles.endCopyright}>Copyright ⓒ {item.press}. All rights reserved. 무단 전재 및 재배포 금지.</p>
      </div>
    </article>
  );
}
