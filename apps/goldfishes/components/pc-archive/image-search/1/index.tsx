"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { imageResultsForTopic, searchCadence, searchTopics, topicIndexForQuery } from "./model/search";
import styles from "./image-search.module.css";

function SearchIcon() {
  return <svg aria-hidden="true" className={styles.searchIcon} viewBox="0 0 24 24"><path d="m15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" /></svg>;
}

function LensIcon() {
  return <svg aria-hidden="true" className={styles.lensIcon} viewBox="0 0 24 24"><path d="M9.2 3.5H7.1A3.6 3.6 0 0 0 3.5 7.1v2.1h2V7.1c0-.88.72-1.6 1.6-1.6h2.1v-2Zm7.7 0h-2.1v2h2.1c.88 0 1.6.72 1.6 1.6v2.1h2V7.1a3.6 3.6 0 0 0-3.6-3.6ZM3.5 14.8v2.1a3.6 3.6 0 0 0 3.6 3.6h2.1v-2H7.1c-.88 0-1.6-.72-1.6-1.6v-2.1h-2Zm15 0v2.1c0 .88-.72 1.6-1.6 1.6h-2.1v2h2.1a3.6 3.6 0 0 0 3.6-3.6v-2.1h-2ZM12 7.4A4.6 4.6 0 1 0 12 16.6 4.6 4.6 0 0 0 12 7.4Zm0 2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z" /></svg>;
}

export default function ImageSearch() {
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [draftQuery, setDraftQuery] = useState(searchTopics[0]!.query);
  const [isLoading, setIsLoading] = useState(false);
  const activeTopicIndexRef = useRef(0);
  const inputIsFocused = useRef(false);
  const loadingTimer = useRef<number | undefined>(undefined);

  const activateTopic = useCallback((topicIndex: number) => {
    const nextIndex = ((topicIndex % searchTopics.length) + searchTopics.length) % searchTopics.length;
    activeTopicIndexRef.current = nextIndex;
    setActiveTopicIndex(nextIndex);
    if (!inputIsFocused.current) setDraftQuery(searchTopics[nextIndex]!.query);
    setIsLoading(true);
    if (loadingTimer.current !== undefined) window.clearTimeout(loadingTimer.current);
    loadingTimer.current = window.setTimeout(() => { setIsLoading(false); loadingTimer.current = undefined; }, searchCadence.loadingMs);
  }, []);

  const advanceTopic = useCallback(() => {
    let nextIndex = activeTopicIndexRef.current;
    while (nextIndex === activeTopicIndexRef.current) nextIndex = Math.floor(Math.random() * searchTopics.length);
    activateTopic(nextIndex);
  }, [activateTopic]);

  useEffect(() => {
    let cycleTimer: number | undefined;
    const scheduleNext = () => {
      const delay = searchCadence.minimumMs + Math.round(Math.random() * (searchCadence.maximumMs - searchCadence.minimumMs));
      cycleTimer = window.setTimeout(() => { if (!document.hidden && !inputIsFocused.current) advanceTopic(); scheduleNext(); }, delay);
    };
    scheduleNext();
    return () => {
      if (cycleTimer !== undefined) window.clearTimeout(cycleTimer);
      if (loadingTimer.current !== undefined) window.clearTimeout(loadingTimer.current);
    };
  }, [advanceTopic]);

  const topic = searchTopics[activeTopicIndex]!;
  const imageResults = useMemo(() => imageResultsForTopic(activeTopicIndex), [activeTopicIndex]);
  const columns = useMemo(() => Array.from({ length: searchCadence.columnCount }, (_, column) => imageResults.filter((_, index) => index % searchCadence.columnCount === column)), [imageResults]);

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matchedTopicIndex = topicIndexForQuery(draftQuery);
    if (matchedTopicIndex >= 0) activateTopic(matchedTopicIndex); else setDraftQuery(topic.query);
  }

  return (
    <main className={styles.page} aria-label="Rapid Google Images-like technology search">
      <header className={styles.header}>
        <a aria-label="Google Images" className={styles.wordmark} href="#image-results">Google</a>
        <form aria-busy={isLoading} className={styles.searchForm} onSubmit={submitQuery}>
          <input aria-label="Search" onBlur={() => { inputIsFocused.current = false; setDraftQuery(searchTopics[activeTopicIndexRef.current]!.query); }} onChange={(event) => setDraftQuery(event.currentTarget.value)} onFocus={() => { inputIsFocused.current = true; }} spellCheck={false} value={draftQuery} />
          <button aria-label="Clear search" className={styles.clearButton} onClick={() => setDraftQuery("")} type="button">×</button>
          <span aria-hidden="true" className={styles.formDivider} /><span aria-hidden="true" className={styles.microphone}>●</span><LensIcon />
          <button aria-label="Search" className={styles.searchButton} type="submit"><SearchIcon /></button>
          <span aria-hidden="true" className={styles.loader} data-loading={isLoading}><i /><i /><i /></span>
        </form>
        <div aria-hidden="true" className={styles.accountTools}><span className={styles.appsIcon}><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><span className={styles.accountAvatar}>J</span></div>
      </header>
      <nav aria-label="Search categories" className={styles.searchNavigation}>
        <a href="#image-results">AI Mode</a><a href="#image-results">All</a><a href="#image-results">News</a><a aria-current="page" href="#image-results">Images</a><a href="#image-results">Books</a><a href="#image-results">Videos</a><a href="#image-results">Shopping</a><a href="#image-results">More⌄</a><a href="#image-results">Tools⌄</a><a className={styles.saves} href="#image-results">▮ Saves</a>
      </nav>
      <section aria-label={`Suggested refinements for ${topic.query}`} className={styles.suggestionStrip}><div className={styles.suggestions}>{topic.suggestions.map((suggestion, index) => {
        const preview = imageResults[index % imageResults.length]!;
        return <span className={styles.suggestion} key={`${topic.id}:${suggestion}`}><img alt="" src={preview.src} /><span>{suggestion}</span></span>;
      })}</div></section>
      <section aria-label={`Image results for ${topic.query}`} className={styles.gallery} data-loading={isLoading} id="image-results">
        {columns.map((column, columnIndex) => <div className={styles.galleryColumn} key={`column-${columnIndex}`}>{column.map((result) => <article className={styles.resultCard} key={result.id}><img alt={result.alt} className={styles.resultImage} src={result.src} style={{ aspectRatio: result.ratio }} /><p className={styles.resultTitle}>{result.title}</p><p className={styles.resultSource}><span aria-hidden="true">{result.source.slice(0, 1)}</span>{result.source}</p></article>)}</div>)}
      </section>
    </main>
  );
}
