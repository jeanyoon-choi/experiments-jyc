import { useEffect, useRef } from "react";
import { SECTIONS } from "../feed/feed";
import type { Section } from "../feed/types";
import { MyIcon, SearchIcon } from "./icons";
import styles from "./news.module.css";

type Props = {
  section: Section;
  onSection: (section: Section) => void;
  onHome: () => void;
};

/** The portal's mobile header: the service bar and the section tabs. */
export function Header({ section, onSection, onHome }: Props) {
  const navRef = useRef<HTMLElement>(null);

  // The open tab is brought into the strip's view.
  useEffect(() => {
    const nav = navRef.current;
    const tab = nav?.querySelector<HTMLElement>('[data-active="true"]');
    if (!nav || !tab) return;
    nav.scrollTo({ left: tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
  }, [section]);

  return (
    <header className={styles.gnb}>
      <div className={styles.bar}>
        <button type="button" className={styles.logo} aria-label="뉴스 홈" onClick={onHome}>
          <span className={styles.service}>뉴스</span>
        </button>
        <span className={styles.family}>엔터</span>
        <span className={styles.family}>스포츠</span>
        <span className={styles.family}>프리미엄</span>
        <span className={styles.tools}>
          <span className={styles.tool}><MyIcon /></span>
          <span className={styles.tool}><SearchIcon /></span>
        </span>
      </div>
      <nav ref={navRef} className={styles.lnb} aria-label="뉴스 섹션">
        <ul>
          {SECTIONS.map(({ id, label }) => (
            <li key={id} data-active={id === section ? "true" : undefined}>
              <button type="button" aria-current={id === section ? "page" : undefined} onClick={() => onSection(id)}>
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
