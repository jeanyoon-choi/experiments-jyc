import { MyIcon, NaverMark, SearchIcon } from "./icons";
import styles from "./naver.module.css";

const SECTIONS = ["정치", "경제", "사회", "생활/문화", "IT/과학", "세계", "랭킹", "신문보기", "오피니언", "TV", "팩트체크", "언론사별"];

/** Naver News's mobile header: the service bar and the section tabs. */
export function Header({ active, onHome }: { active: boolean; onHome: () => void }) {
  return (
    <header className={styles.gnb}>
      <div className={styles.bar}>
        <button type="button" className={styles.logo} aria-label="네이버 뉴스 홈" onClick={onHome}>
          <NaverMark />
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
      <nav className={styles.lnb} aria-label="뉴스 섹션">
        <ul>
          {SECTIONS.map((section, index) => (
            <li key={section} data-active={active && index === 0 ? "true" : undefined}>
              <span>{section}</span>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
