import { googleSearchAt } from "../model/google-search";
import styles from "../phone-field.module.css";

function GoogleWordmark() {
  return (
    <span aria-label="Google" className={styles.googleWordmark}>
      <span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span>
    </span>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className={styles.googleSearchIcon} viewBox="0 0 24 24">
      <path d="m15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
    </svg>
  );
}

function LensIcon() {
  return (
    <svg aria-hidden="true" className={styles.googleLensIcon} viewBox="0 0 24 24">
      <path d="M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2Zm0 2.1a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z" />
      <path d="M12 7.2a4.8 4.8 0 0 0-4.8 4.8h2.1A2.7 2.7 0 0 1 12 9.3V7.2Zm4.8 4.8a4.8 4.8 0 0 0-4.8-4.8v2.1a2.7 2.7 0 0 1 2.7 2.7h2.1ZM12 16.8a4.8 4.8 0 0 0 4.8-4.8h-2.1a2.7 2.7 0 0 1-2.7 2.7v2.1Zm-4.8-4.8a4.8 4.8 0 0 0 4.8 4.8v-2.1A2.7 2.7 0 0 1 9.3 12H7.2Z" />
    </svg>
  );
}

export default function GoogleMobile({ surfaceIndex }: { surfaceIndex: number }) {
  const search = googleSearchAt(surfaceIndex);
  return (
    <article aria-label={`Google Search results for ${search.query}`} className={styles.googleSurface}>
      <header className={styles.googleHeader}>
        <GoogleWordmark />
        <span aria-hidden="true" className={styles.googleHeaderActions}>
          <span className={styles.googleApps}>⠿</span>
          <span className={styles.googleSignIn}>Sign in</span>
        </span>
      </header>
      <div className={styles.googleSearchBox}>
        <SearchIcon />
        <span className={styles.googleQuery}>{search.query}</span>
        <span aria-hidden="true" className={styles.googleSearchTools}>
          <span className={styles.googleMicrophone}>●</span>
          <LensIcon />
        </span>
      </div>
      <nav aria-label="Search result types" className={styles.googleTabs}>
        <span className={styles.googleTabSelected}>All</span>
        <span>Images</span>
        <span>Videos</span>
        <span>News</span>
        <span>Shopping</span>
      </nav>
      <main className={styles.googleResults}>
        <p className={styles.googleResultCount}>{search.resultCount}</p>
        {search.results.map((result) => (
          <article className={styles.googleResult} key={result.id}>
            <p className={styles.googleResultSource}>{result.domain} <span>{result.path}</span></p>
            <h2>{result.title}</h2>
            <p>{result.snippet}</p>
          </article>
        ))}
      </main>
    </article>
  );
}
