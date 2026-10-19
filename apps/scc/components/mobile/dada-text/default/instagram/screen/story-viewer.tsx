/* eslint-disable @next/next/no-img-element -- This bounded interface uses editorial sample photography. */
import { useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { Icon } from './glyph';
import s from './instagram.module.css';

export type StoryItem = { id: string; image: string; alt: string; age: string };
type Props = {
  order: string[];
  start: number;
  itemsFor: (accountId: string) => StoryItem[];
  avatarFor: (accountId: string) => string;
  nameFor: (accountId: string) => string;
  onSeen: (accountId: string) => void;
  onClose: () => void;
  onReply: (accountId: string, body: string) => void;
  onProfile: (accountId: string) => void;
};

// Instagram story viewer: one progress segment per item of the current account, tap thirds to step,
// hold to pause (chrome hides), swipe sideways to change account, swipe down to dismiss.
export function StoryViewer({ order, start, itemsFor, avatarFor, nameFor, onSeen, onClose, onReply, onProfile }: Props) {
  const [userIndex, setUserIndex] = useState(start);
  const [itemIndex, setItemIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reply, setReply] = useState('');
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const gesture = useRef<{ x: number; y: number; timer: number; hold: boolean } | null>(null);
  const accountId = order[userIndex];
  const items = itemsFor(accountId);
  const item = items[Math.min(itemIndex, items.length - 1)];

  function goUser(next: number) {
    onSeen(accountId);
    if (next < 0) { setItemIndex(0); return; }
    if (next >= order.length) { onClose(); return; }
    setUserIndex(next);
    setItemIndex(0);
  }
  function step(direction: 1 | -1) {
    const next = itemIndex + direction;
    if (next < 0) goUser(userIndex - 1);
    else if (next >= items.length) goUser(userIndex + 1);
    else setItemIndex(next);
  }
  function down(event: PointerEvent<HTMLDivElement>) {
    const timer = window.setTimeout(() => { if (gesture.current) gesture.current.hold = true; setHeld(true); }, 220);
    gesture.current = { x: event.clientX, y: event.clientY, timer, hold: false };
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    setHeld(false);
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (dy > 90 && dy > Math.abs(dx)) { onSeen(accountId); onClose(); return; }
    if (Math.abs(dx) > 60) { goUser(userIndex + (dx < 0 ? 1 : -1)); return; }
    if (g.hold) return;
    const box = event.currentTarget.getBoundingClientRect();
    step(event.clientX - box.left < box.width / 3 ? -1 : 1);
  }
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reply.trim()) return;
    onReply(accountId, reply.trim());
    setReply('');
    setTyping(false);
  }
  const paused = held || typing;

  return <section className={`${s.story} ${held ? s.storyHeld : ''}`} aria-label="Story viewer">
    <div className={s.storyMedia}>
      <img src={item.image} alt={item.alt}/>
      <div className={s.storyShade}/>
      <div className={s.storyTop}>
        <div className={s.storyProgress}>{items.map((entry, index) => <span key={entry.id}>{index < itemIndex ? <i className={s.storyDone}/> : index === itemIndex ? <i key={`${accountId}-${entry.id}`} className={s.storyRunning} style={{ animationPlayState: paused ? 'paused' : 'running' }} onAnimationEnd={() => step(1)}/> : null}</span>)}</div>
        <div className={s.storyIdentity}>
          <button onClick={() => onProfile(accountId)}><img src={avatarFor(accountId)} alt=""/><strong>{nameFor(accountId)}</strong></button>
          <small>{item.age}</small>
          <button aria-label="Story options"><Icon name="more"/></button>
          <button onClick={() => { onSeen(accountId); onClose(); }} aria-label="Close story"><Icon name="close"/></button>
        </div>
      </div>
      <div className={s.storyTaps} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { if (gesture.current) window.clearTimeout(gesture.current.timer); gesture.current = null; setHeld(false); }}/>
    </div>
    <form className={s.storyBottom} onSubmit={send}>
      <input aria-label="Send message" placeholder="Send message" value={reply} maxLength={300} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} onChange={event => setReply(event.target.value)}/>
      {reply.trim() ? <button type="submit" className={s.storySend}>Send</button> : <>
        <button type="button" aria-label={likedItems.includes(item.id) ? 'Unlike story' : 'Like story'} aria-pressed={likedItems.includes(item.id)} className={likedItems.includes(item.id) ? s.isLiked : ''} onClick={() => setLikedItems(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}><Icon name="heart" size={26} filled={likedItems.includes(item.id)}/></button>
        <button type="button" aria-label="Share story"><Icon name="send" size={26}/></button>
      </>}
    </form>
  </section>;
}
