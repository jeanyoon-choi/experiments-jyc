/* eslint-disable @next/next/no-img-element -- 32 to 64 px account pictures, drawn at their own size */
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Sheet } from "./sheet";
import { Icon } from "./glyph";
import { commentsOf } from "./comments";
import { people } from "./people";
import { compactCount } from "./feed";
import s from "./reels.module.css";

export type Posted = { id: string; body: string };

const EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

// An account with no picture: Instagram's grey head and shoulders, redrawn (not a sourced glyph).
function Avatar({ src }: { src?: string }) {
  if (src) return <img className={s.avatar} src={src} alt="" loading="lazy" draggable={false} />;
  return (
    <span className={s.avatar}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9.2" r="4.3" /><path d="M2.5 26c0-6 4.2-9.6 9.5-9.6s9.5 3.6 9.5 9.6Z" /></svg>
    </span>
  );
}

const Body = ({ text }: { text: string }) => <p>{text.split(/(@[\w.]+)/).map((part, i) => (part.startsWith("@") ? <b key={i}>{part}</b> : part))}</p>;

export function CommentsSheet({ reel, posted, liked, onLike, onPost, onClose }: { reel: number; posted: Posted[]; liked: string[]; onLike: (id: string) => void; onPost: (body: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const comments = useMemo(() => commentsOf(reel), [reel]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    onPost(body);
    setText("");
    list.current?.scrollTo({ top: 0 });
  };
  const heart = (id: string, likes: number) => {
    const on = liked.includes(id);
    return (
      <button className={`${s.commentLike} ${on ? s.liked : ""}`} aria-label={on ? "Unlike comment" : "Like comment"} aria-pressed={on} onClick={() => onLike(id)}>
        <Icon name="heart" size={16} filled={on} />
        {likes + Number(on) > 0 && <small>{compactCount(likes + Number(on))}</small>}
      </button>
    );
  };

  return (
    <Sheet label="Comments" title="Comments" expandable onClose={onClose}>
      <div ref={list} className={s.comments}>
        {posted.map((mine) => (
          <div key={mine.id} className={s.comment}>
            <Avatar />
            <div><p className={s.meta}><strong>you</strong> <span>now</span></p><Body text={mine.body} /></div>
            {heart(mine.id, 0)}
          </div>
        ))}
        {comments.map((c) => (
          <div key={c.id} className={s.comment}>
            <Avatar src={c.avatar} />
            <div>
              <p className={s.meta}><strong>{c.user}</strong> <span>{c.age}</span></p>
              <Body text={c.body} />
              <button className={s.reply} onClick={() => { setText(`@${c.user} `); field.current?.focus(); }}>Reply</button>
            </div>
            {heart(c.id, c.likes)}
          </div>
        ))}
      </div>
      <div className={s.emojis}>{EMOJIS.map((glyph) => <button key={glyph} aria-label={`Add ${glyph}`} onClick={() => setText((now) => now + glyph)}>{glyph}</button>)}</div>
      <form className={s.commentForm} onSubmit={submit}>
        <Avatar />
        <label>
          <input ref={field} aria-label="Add a comment" placeholder="Add a comment…" value={text} onChange={(event) => setText(event.target.value)} maxLength={300} enterKeyHint="send" autoComplete="off" />
          {text.trim() && <button type="submit">Post</button>}
        </label>
      </form>
    </Sheet>
  );
}

// The selection route first: it is synchronous, so it runs inside the tap and asks no permission. The clipboard API is the
// second try (it can wait on a permission prompt, and the sheet would hang open under it).
async function copy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.cssText = "position:fixed;left:0;top:0;opacity:0;font-size:16px";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let done = false;
  try {
    done = document.execCommand("copy");
  } catch {
    done = false;
  }
  area.remove();
  if (done) return true;
  try {
    // a write the browser never settles (seen in an unfocused window) counts as failed, not as still coming
    return await Promise.race([navigator.clipboard.writeText(text).then(() => true), new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 1200))]);
  } catch {
    return false;
  }
}

/** `onShared(notice)`: the reel went out once more; `notice` is what to say about it, if anything. `onFailed(notice)`: it did not. */
export function ShareSheet({ onShared, onFailed, onClose }: { onShared: (notice?: string) => void; onFailed: (notice: string) => void; onClose: () => void }) {
  const [url] = useState(() => window.location.origin + window.location.pathname);
  const [query, setQuery] = useState("");
  const [to, setTo] = useState<string[]>([]);
  const found = people.filter((p) => `${p.user} ${p.name}`.toLowerCase().includes(query.trim().toLowerCase()));

  const copyLink = async () => {
    if (await copy(url)) onShared("Link copied");
    else onFailed("Couldn't copy link");
  };
  // the device's own share sheet: any app that takes a link
  const shareOut = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ url });
      onShared();
    } catch {
      // put away without choosing: nothing was shared
    }
  };

  return (
    <Sheet label="Share reel" className={s.shareSheet} onClose={onClose}>
      <label className={s.search}><Icon name="search" size={16} /><input placeholder="Search" aria-label="Search people to share with" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" /></label>
      <div className={s.sharePeople}>
        {found.map((p) => {
          const on = to.includes(p.user);
          return (
            <button key={p.user} aria-pressed={on} onClick={() => setTo((list) => (on ? list.filter((x) => x !== p.user) : [...list, p.user]))}>
              <span><Avatar src={p.avatar} />{on && <i><Icon name="circleCheck" size={22} /></i>}</span>
              <small>{p.name}</small>
            </button>
          );
        })}
      </div>
      {to.length > 0 ? (
        <button className={s.sendButton} onClick={() => onShared("Sent")}>{to.length > 1 ? "Send separately" : "Send"}</button>
      ) : (
        <div className={s.shareActions}>
          <button onClick={copyLink}><span><Icon name="link" /></span><small>Copy link</small></button>
          <button onClick={shareOut}><span><Icon name="more" /></span><small>Share to…</small></button>
          <a href={`sms:?&body=${encodeURIComponent(url)}`} onClick={() => onShared()}><span><Icon name="message" /></span><small>Messages</small></a>
        </div>
      )}
    </Sheet>
  );
}
