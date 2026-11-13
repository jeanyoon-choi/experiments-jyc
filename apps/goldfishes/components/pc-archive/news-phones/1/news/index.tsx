import type { FishPhone } from "../model/field";
import { topics } from "../model/config";
import styles from "../phone-field.module.css";

export default function NewsPage({ phone, onTopic }: { phone: FishPhone; onTopic: (index: number) => void }) {
  return (
    <div className={styles.website}>
      <header className={styles.masthead}>
        <span className={styles.edition}>THE DAILY EDITION</span>
        <h1>The Current</h1>
        <span className={styles.tagline}>Ideas, people & everyday life</span>
      </header>
      <nav className={styles.topics} aria-label="News topics">
        {topics.map((topic, index) => (
          <button key={topic.id} type="button" aria-pressed={phone.topicIndex === index} onClick={() => onTopic(index)}>{topic.section}</button>
        ))}
      </nav>
      <div className={styles.topicHeading}>
        <span>YOUR BRIEFING</span>
        <h2>{topics[phone.topicIndex].keyword}</h2>
      </div>
      <div className={styles.stories}>
        {phone.stories.map((story, index) => (
          <article key={story.id} className={styles.story}>
            <div className={styles.storyMeta}><span>{story.section}</span><span>{index === 0 ? "Just added" : "Earlier"}</span></div>
            <details>
              <summary><h3>{story.headline}</h3></summary>
              <p>{story.summary}</p>
            </details>
            {index === 0 && <p className={styles.preview}>{story.summary}</p>}
            <span className={styles.byline}>The Current desk · {index + 2} min read</span>
          </article>
        ))}
      </div>
    </div>
  );
}
