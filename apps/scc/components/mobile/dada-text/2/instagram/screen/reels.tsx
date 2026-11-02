/* eslint-disable @next/next/no-img-element -- This bounded interface uses editorial sample photography. */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { Post } from '../model/data';
import { Icon } from './glyph';
import s from './instagram.module.css';

type Props = {
  reels: Post[];
  start: string | null;
  section: 'reels' | 'friends';
  onSection: (next: 'reels' | 'friends') => void;
  liked: string[];
  reposted: string[];
  following: string[];
  verified: string[];
  onLike: (id: string, only?: boolean) => void;
  onRepost: (id: string) => void;
  onFollow: (accountId: string) => void;
  onComments: (id: string) => void;
  onShare: (id: string) => void;
  onProfile: (accountId: string) => void;
  onCreate: () => void;
  avatarFor: (accountId: string) => string;
  nameFor: (accountId: string) => string;
  compactCount: (count: number) => string;
};

// The bundled clips repeat so vertical paging continues, as the real Reels feed never ends.
const cycles = [0, 1, 2];

export function Reels({ reels, start, section, onSection, liked, reposted, following, verified, onLike, onRepost, onFollow, onComments, onShare, onProfile, onCreate, avatarFor, nameFor, compactCount }: Props) {
  const slots = useMemo(() => cycles.flatMap(cycle => reels.map(reel => ({ key: `${reel.id}:${cycle}`, reel }))), [reels]);
  const [active, setActive] = useState(() => Math.max(0, slots.findIndex(slot => slot.reel.id === start)));
  const [muted, setMuted] = useState(true);
  const [flash, setFlash] = useState(0);
  const [burst, setBurst] = useState<{ key: string; n: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const pager = useRef<HTMLDivElement>(null);
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const tap = useRef<{ x: number; y: number; at: number; timer: number; hold: boolean; single: number } | null>(null);

  useEffect(() => { const el = pager.current; if (el && active) el.scrollTo(0, active * el.clientHeight); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial position only
  useEffect(() => {
    slots.forEach((slot, index) => {
      const video = videos.current[slot.key];
      if (!video) return;
      video.muted = muted;
      if (index === active && section === 'reels') void video.play().catch(() => undefined);
      else video.pause();
    });
  }, [active, muted, section, slots]);

  function onScroll() { const el = pager.current; if (!el) return; const next = Math.round(el.scrollTop / el.clientHeight); if (next !== active) { setActive(next); setProgress(0); } }
  function down(event: PointerEvent<HTMLDivElement>, key: string) {
    const previous = tap.current;
    const timer = window.setTimeout(() => { if (tap.current) { tap.current.hold = true; videos.current[key]?.pause(); } }, 260);
    tap.current = { x: event.clientX, y: event.clientY, at: event.timeStamp, timer, hold: false, single: previous && event.timeStamp - previous.at < 300 ? previous.single : 0 };
  }
  function up(event: PointerEvent<HTMLDivElement>, key: string, reel: Post) {
    const g = tap.current;
    if (!g) return;
    window.clearTimeout(g.timer);
    if (g.hold) { void videos.current[key]?.play().catch(() => undefined); tap.current = null; return; }
    if (Math.abs(event.clientX - g.x) > 10 || Math.abs(event.clientY - g.y) > 10) { tap.current = null; return; }
    if (g.single) {
      window.clearTimeout(g.single);
      g.single = 0;
      onLike(reel.id, true);
      setBurst({ key, n: event.timeStamp });
      return;
    }
    g.single = window.setTimeout(() => { setMuted(value => !value); setFlash(value => value + 1); }, 300);
  }

  return <section className={s.reelsView}>
    <header className={s.reelsHeader}>
      <button aria-label="Create reel" onClick={onCreate}><Icon name="add"/></button>
      <div>
        <button className={section === 'reels' ? s.activeReelSection : ''} onClick={() => onSection('reels')}>Reels</button>
        <button className={section === 'friends' ? s.activeReelSection : ''} onClick={() => onSection('friends')}>Friends<span className={s.friendFaces}>{following.slice(0, 2).map(id => <img key={id} src={avatarFor(id)} alt=""/>)}</span></button>
      </div>
      <button aria-label="Reels settings"><Icon name="sliders"/></button>
    </header>
    {section === 'friends' ? <div className={s.friendsNote}>Reels your friends have interacted with appear here in Instagram. This preview has no friend activity.</div> : <div className={s.reelPager} ref={pager} onScroll={onScroll}>
      {slots.map(({ key, reel }, index) => <article key={key} className={s.reelSlot}>
        <video ref={element => { videos.current[key] = element; }} className={s.reelVideo} src={reel.video} poster={reel.image} muted loop playsInline preload={Math.abs(index - active) < 2 ? 'auto' : 'metadata'} aria-label={reel.alt} onTimeUpdate={event => { if (index === active && event.currentTarget.duration) setProgress(event.currentTarget.currentTime / event.currentTarget.duration); }}/>
        <div className={s.reelShade}/>
        <div className={s.reelTouch} onPointerDown={event => down(event, key)} onPointerUp={event => up(event, key, reel)}/>
        {index === active && flash > 0 && <span key={flash} className={s.muteFlash}><Icon name={muted ? 'volumeOff' : 'volumeOn'} size={22}/></span>}
        {burst?.key === key && <span key={burst.n} className={s.heartBurst}><Icon name="heart" filled size={96}/></span>}
        <div className={s.reelSide}>
          <button aria-label={liked.includes(reel.id) ? 'Unlike reel' : 'Like reel'} aria-pressed={liked.includes(reel.id)} className={liked.includes(reel.id) ? s.isLiked : ''} onClick={() => onLike(reel.id)}><Icon name="heart" size={28} filled={liked.includes(reel.id)}/><small>{compactCount(reel.likes + Number(liked.includes(reel.id)))}</small></button>
          <button aria-label="View reel comments" onClick={() => onComments(reel.id)}><Icon name="message" size={28}/><small>{compactCount(reel.comments.length + Math.round(reel.likes / 64))}</small></button>
          <button aria-label={reposted.includes(reel.id) ? 'Undo repost' : 'Repost'} aria-pressed={reposted.includes(reel.id)} onClick={() => onRepost(reel.id)}><Icon name="repost" size={28} filled={reposted.includes(reel.id)}/><small>{compactCount(Math.round(reel.likes / 78) + Number(reposted.includes(reel.id)))}</small></button>
          <button aria-label="Share reel" onClick={() => onShare(reel.id)}><Icon name="send" size={28}/><small>{compactCount(Math.round(reel.likes / 31))}</small></button>
          <button className={s.audioThumb} aria-label="Original audio" onClick={() => onProfile(reel.accountId)}><img src={avatarFor(reel.accountId)} alt=""/></button>
        </div>
        <div className={s.reelCopy}>
          <div className={s.reelAuthor}>
            <button onClick={() => onProfile(reel.accountId)}><img src={avatarFor(reel.accountId)} alt=""/><strong>{nameFor(reel.accountId)}</strong>{verified.includes(reel.accountId) && <span className={s.verified}><Icon name="verified" size={14}/></span>}</button>
            {!following.includes(reel.accountId) && <button className={s.reelFollow} onClick={() => onFollow(reel.accountId)}>Follow</button>}
          </div>
          <p>{reel.caption}</p>
        </div>
        <div className={s.reelProgress}><i style={{ transform: `scaleX(${index === active ? progress : 0})` }}/></div>
      </article>)}
    </div>}
  </section>;
}
