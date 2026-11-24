import type { ReactNode } from "react";
import {
  HYPOTHESES,
  LOG,
  NOTES,
  REFERENCES,
  VERSIONS,
  nodeById,
  relationById,
  say,
  type Claim,
  type Evidence,
  type Hypothesis,
  type Lang,
  type Reference,
  type Status,
  type Text,
  type Version,
} from "./model/index.ts";
import styles from "./system.module.css";
import { CONFIDENCE, STATE, STATUS, WORDS } from "./words.ts";

// The side of the page: what is known about the chosen part, or about the
// version when nothing is chosen.

type Props = {
  version: Version;
  lang: Lang;
  selected: string | null;
  onSelect: (id: string | null) => void;
};

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <h3 className={styles.heading}>{title}</h3>}
      {children}
    </section>
  );
}

/** A source's name; a published note opens in a new window. */
function Source({ note, lang }: { note: string; lang: Lang }) {
  const source = NOTES[note];
  const title = say(source?.title, lang);
  if (!source?.url) return <>{title}</>;
  return (
    <a href={source.url} target="_blank" rel="noreferrer">
      {title}
    </a>
  );
}

function Claims({ claims, lang }: { claims: Claim[]; lang: Lang }) {
  return (
    <Section title={say(WORDS.notes, lang)}>
      {claims.map((claim, index) => (
        <figure key={`${claim.note}-${index}`} className={styles.claim}>
          <blockquote>{claim.text}</blockquote>
          <figcaption className={styles.small}>
            <Source note={claim.note} lang={lang} />
            {claim.where ? ` · ${claim.where}` : ""} · {say(CONFIDENCE[claim.confidence], lang)}
          </figcaption>
        </figure>
      ))}
    </Section>
  );
}

function Built({ status, items, title, lang }: { status?: Status; items?: Evidence[]; title: Text; lang: Lang }) {
  if (!status && !items?.length) return null;
  return (
    <Section title={`${say(title, lang)}${status ? `: ${say(STATUS[status], lang)}` : ""}`}>
      {items?.map((item, index) => (
        <p key={`${item.route ?? item.file ?? ""}-${index}`} className={styles.line}>
          {say(item.text, lang)}
          {item.route && (
            <>
              {" "}
              <a href={`/${item.route}`} target="_blank" rel="noreferrer">
                /{item.route}
              </a>
            </>
          )}
          {item.file && <span className={styles.small}> {item.file}</span>}
        </p>
      ))}
    </Section>
  );
}

function Pick({ id, label, onSelect }: { id: string; label: string; onSelect: (id: string) => void }) {
  return (
    <button type="button" className={styles.pick} onClick={() => onSelect(id)}>
      {label}
    </button>
  );
}

function Questions({ list, lang, onSelect }: { list: Hypothesis[]; lang: Lang; onSelect: (id: string) => void }) {
  if (list.length === 0) return null;
  return (
    <Section title={say(WORDS.open, lang)}>
      {list.map((hypothesis) => (
        <Pick
          key={hypothesis.id}
          id={`h:${hypothesis.id}`}
          label={`${say(hypothesis.question, lang)} — ${say(STATE[hypothesis.state], lang)}`}
          onSelect={onSelect}
        />
      ))}
    </Section>
  );
}

function References({ list, lang }: { list: Reference[]; lang: Lang }) {
  if (list.length === 0) return null;
  return (
    <Section title={say(WORDS.references, lang)}>
      {list.map((reference) => (
        <p key={reference.id} className={styles.line}>
          <a href={reference.href} target="_blank" rel="noreferrer">
            {say(reference.title, lang)}
          </a>
          {" — "}
          {say(reference.note, lang)}
        </p>
      ))}
    </Section>
  );
}

export function Panel({ version, lang, selected, onSelect }: Props) {
  const name = (id: string, at: Version = version) =>
    say(at.labels?.[id] ?? nodeById.get(id)?.label ?? relationById.get(id)?.label, lang);

  /** The names a part had in the other versions it was in. */
  const elsewhere = (id: string) => {
    const others = VERSIONS.filter(
      (other) => other.id !== version.id && (other.nodes.includes(id) || other.relations.includes(id)),
    );
    if (others.length === 0) return null;
    return (
      <Section title={say(WORDS.elsewhere, lang)}>
        {others.map((other) => (
          <p key={other.id} className={styles.line}>
            {other.id} · {other.date} — {name(id, other)}
          </p>
        ))}
      </Section>
    );
  };

  const hypothesis = HYPOTHESES.find((candidate) => `h:${candidate.id}` === selected);
  if (hypothesis) {
    return (
      <div className={styles.detail}>
        <p className={styles.small}>
          {say(WORDS.question, lang)} · {say(STATE[hypothesis.state], lang)}
        </p>
        <h2 className={styles.name}>{say(hypothesis.question, lang)}</h2>
        {hypothesis.verdict && (
          <p className={styles.line}>
            {say(hypothesis.verdict.text, lang)} ({hypothesis.verdict.date})
          </p>
        )}
        <Section title={say(WORDS.about, lang)}>
          {hypothesis.about.map((id) => (
            <Pick key={id} id={id} label={name(id) || say(relationById.get(id)?.carries, lang)} onSelect={onSelect} />
          ))}
        </Section>
        <Claims claims={hypothesis.claims} lang={lang} />
        <Built items={hypothesis.evidence} title={WORDS.seen} lang={lang} />
        {hypothesis.next && (
          <Section title={say(WORDS.next, lang)}>
            <p className={styles.line}>{say(hypothesis.next, lang)}</p>
          </Section>
        )}
      </div>
    );
  }

  const node = selected ? nodeById.get(selected) : undefined;
  const relation = selected ? relationById.get(selected) : undefined;
  const about = HYPOTHESES.filter((candidate) => selected && candidate.about.includes(selected));

  if (node) {
    const ties = version.relations.flatMap((id) => {
      const tie = relationById.get(id);
      return tie && (tie.from === node.id || tie.to === node.id) ? [tie] : [];
    });
    return (
      <div className={styles.detail}>
        <h2 className={styles.name}>{name(node.id)}</h2>
        <p className={styles.line}>{say(node.role, lang)}</p>
        <Section title={say(WORDS.relations, lang)}>
          {ties.map((tie) => (
            <Pick
              key={tie.id}
              id={tie.id}
              label={`${name(tie.from)} ${tie.plain ? "—" : tie.both ? "⇄" : "→"} ${name(tie.to)}${name(tie.id) ? ` : ${name(tie.id)}` : ""}`}
              onSelect={onSelect}
            />
          ))}
        </Section>
        <Built status={node.status} items={node.built} title={WORDS.code} lang={lang} />
        <Questions list={about} lang={lang} onSelect={onSelect} />
        <References list={REFERENCES.filter((reference) => reference.about.includes(node.id))} lang={lang} />
        <Claims claims={node.claims} lang={lang} />
        {elsewhere(node.id)}
      </div>
    );
  }

  if (relation) {
    return (
      <div className={styles.detail}>
        <p className={styles.small}>{say(relation.by === "human" ? WORDS.human : WORDS.computed, lang)}</p>
        <h2 className={styles.name}>{name(relation.id) || say(relation.carries, lang)}</h2>
        <Section>
          <Pick id={relation.from} label={name(relation.from)} onSelect={onSelect} />
          <p className={styles.small}>{relation.plain ? "—" : relation.both ? "⇅" : "↓"}</p>
          <Pick id={relation.to} label={name(relation.to)} onSelect={onSelect} />
        </Section>
        <Section title={say(WORDS.carries, lang)}>
          <p className={styles.line}>{say(relation.carries, lang)}</p>
        </Section>
        <Built status={relation.status} items={relation.built} title={WORDS.code} lang={lang} />
        <Questions list={about} lang={lang} onSelect={onSelect} />
        <Claims claims={relation.claims} lang={lang} />
        {elsewhere(relation.id)}
      </div>
    );
  }

  const index = VERSIONS.indexOf(version);
  const before = VERSIONS[index - 1];
  return (
    <div className={styles.detail}>
      <p className={styles.small}>
        {version.id} · {version.date}
        {index === VERSIONS.length - 1 ? ` · ${say(WORDS.now, lang)}` : ""}
      </p>
      <h2 className={styles.name}>{say(version.title, lang)}</h2>
      <p className={styles.line}>{say(version.summary, lang)}</p>
      <p className={styles.small}>
        {version.sources.map((source, position) => (
          <span key={source}>
            {position > 0 ? " · " : ""}
            <Source note={source} lang={lang} />
          </span>
        ))}
      </p>
      {before && version.changes.length > 0 && (
        <Section title={lang === "ko" ? `${before.id}${say(WORDS.changed, lang)}` : `${version.id}${say(WORDS.changed, lang)} ${before.id}`}>
          {version.changes.map((change, position) => (
            <p key={`${version.id}-${position}`} className={styles.line}>
              {say(change, lang)}
            </p>
          ))}
        </Section>
      )}
      <Questions list={HYPOTHESES} lang={lang} onSelect={onSelect} />
      <References list={REFERENCES} lang={lang} />
      <Section title={say(WORDS.log, lang)}>
        {LOG.map((entry, position) => (
          <p key={`${entry.date}-${position}`} className={styles.line}>
            {entry.date} — {say(entry.text, lang)}
          </p>
        ))}
      </Section>
    </div>
  );
}
