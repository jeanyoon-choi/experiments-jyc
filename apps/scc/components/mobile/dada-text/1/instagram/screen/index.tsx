'use client';
/* eslint-disable @next/next/no-img-element -- This bounded interface uses editorial sample photography. */
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { accounts, initialPosts, verifiedAccounts, type Post } from '../model/data';
import { pictureFor, pictures, type Picture } from '../model/pictures';
import { UI } from '../../marks';
import { Icon } from './glyph';
import { Sheet } from './sheet';
import s from './instagram.module.css';

const avatarFor = (id: string) => accounts.find(a => a.id === id)?.avatar || accounts[0].avatar;
const nameFor = (id: string) => accounts.find(a => a.id === id)?.name || 'mira.cho';
const avatarByName = (name: string) => accounts.find(a => a.name === name)?.avatar || accounts[0].avatar;
const suggested = accounts.filter(account => account.id !== 'you').map(account => account.id);
const emojis = [{ id: 'heart', glyph: '❤️' }, { id: 'raised', glyph: '🙌' }, { id: 'fire', glyph: '🔥' }, { id: 'clap', glyph: '👏' }, { id: 'cry', glyph: '😢' }, { id: 'love', glyph: '😍' }, { id: 'wow', glyph: '😮' }, { id: 'laugh', glyph: '😂' }];
const compactCount = (count: number) => { const [unit, size] = count >= 1e6 ? ['M', 1e6] as const : count >= 1e3 ? ['K', 1e3] as const : ['', 1] as const; return size === 1 ? String(count) : `${(count / size).toFixed(count / size >= 100 ? 0 : 1).replace(/\.0$/, '')}${unit}`; };
/** 자율: every tick each tile may turn, so a picture stays about PICTURE_MS and a word about WORD_MS, at random. */
const TICK = 500;
const PICTURE_MS = 3000;
const WORD_MS = 9000;
// Feed timestamps read "1 day ago" in the 2026 frame; comment and story ages stay short ("5h").
const longAge = (age: string) => { const match = /^(\d+)([mhd])$/.exec(age); if (!match) return age; const n = Number(match[1]); const unit = { m: 'minute', h: 'hour', d: 'day' }[match[2] as 'm' | 'h' | 'd']; return `${n} ${unit}${n === 1 ? '' : 's'} ago`; };

/**
 * Only the Explore tab and the post it opens. Which one shows is the route's: `post` is the open post, `onOpen`/`onBack` move
 * between the two. `pictureEvery` places a picture after every that many word tiles in the grid; null places none.
 * `autoPictures` (자율) instead turns each tile between its word and a picture at random moments.
 */
export default function InstagramMobile({ post: detailId, pictureEvery, autoPictures, onOpen, onBack }: { post: string | null; pictureEvery: number | null; autoPictures: boolean; onOpen: (id: string) => void; onBack: () => void }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [reposted, setReposted] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>(['flowers', 'interior', 'cafe', 'street']);
  const [commentsId, setCommentsId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareTo, setShareTo] = useState<string[]>([]);
  const [optionsId, setOptionsId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState('');
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [turned, setTurned] = useState<string[]>([]);
  const scroll = useRef<HTMLDivElement>(null);
  const gridScroll = useRef(0);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const detail = posts.find(p => p.id === detailId);
  // Sheets belong to the open post, so they are gone once the route leaves it.
  const commentPost = detail && commentsId === detail.id ? detail : undefined;
  const sharePost = detail && shareId === detail.id ? detail : undefined;
  const optionPost = detail && optionsId === detail.id ? detail : undefined;
  const reels = posts.filter(p => p.reel);
  const query = search.trim().toLowerCase();
  const matchingAccounts = accounts.filter(a => a.id !== 'you' && `${a.name} ${a.fullName}`.toLowerCase().includes(query));
  const explorePosts = posts.filter(p => !p.reel && !hidden.includes(p.id) && (!query || `${p.caption} ${p.location} ${nameFor(p.accountId)}`.toLowerCase().includes(query)));
  const postTiles = query ? explorePosts : [...explorePosts.slice(0, 2), reels[0], ...explorePosts.slice(2, 4), reels[1], ...explorePosts.slice(4)].filter(Boolean);
  // Without a search, a picture follows every few word tiles.
  const exploreTiles: (Post | Picture)[] = query || !pictureEvery || autoPictures ? postTiles : postTiles.flatMap((p, index) => (index + 1) % pictureEvery ? [p] : [p, { ...pictures[((index + 1) / pictureEvery - 1) % pictures.length], id: `picture-after-${p.id}` }]);

  // A post opens at its top; going back returns the grid to where it was left.
  useLayoutEffect(() => { scroll.current?.scrollTo(0, detailId ? 0 : gridScroll.current); }, [detailId]);
  useEffect(() => {
    if (!autoPictures) return;
    const ids = initialPosts.map(p => p.id);
    const tick = window.setInterval(() => setTurned(current => {
      const next = ids.filter(id => current.includes(id) ? Math.random() >= TICK / PICTURE_MS : Math.random() < TICK / WORD_MS);
      return next.length === current.length && next.every(id => current.includes(id)) ? current : next;
    }), TICK);
    return () => window.clearInterval(tick);
  }, [autoPictures]);
  useEffect(() => { if (!notice) return; const timeout = window.setTimeout(() => setNotice(''), 2800); return () => window.clearTimeout(timeout); }, [notice]);

  function toggle(id: string, values: string[], update: (next: string[]) => void) { update(values.includes(id) ? values.filter(value => value !== id) : [...values, id]); }
  function like(id: string, only = false) { setLiked(current => current.includes(id) ? (only ? current : current.filter(value => value !== id)) : [...current, id]); }
  function photoTap(event: MouseEvent<HTMLDivElement>, id: string) {
    const previous = lastTap.current;
    const now = event.timeStamp;
    if (previous && previous.id === id && now - previous.at < 320) { lastTap.current = null; like(id, true); setBurst({ id, n: now }); return; }
    lastTap.current = { id, at: now };
  }
  function addComment(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!commentsId || !comment.trim()) return; const body = comment.trim(); setPosts(current => current.map(p => p.id === commentsId ? { ...p, comments: [...p.comments, { id: crypto.randomUUID(), author: 'mira.cho', body }] } : p)); setComment(''); }
  function sendShare() { if (!sharePost) return; setNotice(shareTo.length === 1 ? `Sent to ${nameFor(shareTo[0])}` : `Sent to ${shareTo.length} people`); setShareTo([]); setShareId(null); }
  const badge = (id: string) => verifiedAccounts.includes(id) && <span className={s.verified}><Icon name="verified" size={12}/></span>;

  function renderPostActions(post: Post) {
    const isLiked = liked.includes(post.id);
    return <div className={s.postActions}>
      <button aria-label={isLiked ? 'Unlike post' : 'Like post'} aria-pressed={isLiked} className={isLiked ? s.isLiked : ''} onClick={() => like(post.id)}><Icon name="heart" filled={isLiked}/><span>{compactCount(post.likes + Number(isLiked))}</span></button>
      <button aria-label="View comments" onClick={() => { setComment(''); setCommentsId(post.id); }}><Icon name="message"/>{post.comments.length > 0 && <span>{compactCount(post.comments.length)}</span>}</button>
      <button aria-label={reposted.includes(post.id) ? 'Undo repost' : 'Repost'} aria-pressed={reposted.includes(post.id)} onClick={() => toggle(post.id, reposted, setReposted)}><Icon name="repost" filled={reposted.includes(post.id)}/><span>{compactCount(Math.round(post.likes / 78) + Number(reposted.includes(post.id)))}</span></button>
      <button aria-label="Share post" onClick={() => { setShareTo([]); setShareId(post.id); }}><Icon name="send"/><span>{compactCount(Math.round(post.likes / 31))}</span></button>
      <button className={s.saveAction} aria-label={saved.includes(post.id) ? 'Remove saved post' : 'Save post'} aria-pressed={saved.includes(post.id)} onClick={() => toggle(post.id, saved, setSaved)}><Icon name="save" filled={saved.includes(post.id)}/></button>
    </div>;
  }
  // Profile and story links lead outside the two pages, so they keep their look and do nothing.
  function renderFeedPost(post: Post) {
    const long = post.caption.length > 92 && !expanded.includes(post.id);
    return <article className={s.feedPost}>
      <div className={s.postHead}>
        <button className={s.postAvatar} aria-label={`${nameFor(post.accountId)} profile`}><img src={avatarFor(post.accountId)} alt=""/></button>
        <button className={s.identity}><strong>{nameFor(post.accountId)}{badge(post.accountId)}</strong>{post.location && <small>{post.location}</small>}</button>
        <button className={s.postMore} aria-label="Post options" onClick={() => setOptionsId(post.id)}><Icon name="more"/></button>
      </div>
      <div className={s.photo} onClick={event => photoTap(event, post.id)}>
        <img src={post.image} alt={post.alt} loading="lazy" draggable={false}/>
        {burst?.id === post.id && <span key={burst.n} className={s.heartBurst}><Icon name="heart" filled size={96}/></span>}
      </div>
      {renderPostActions(post)}
      <div className={s.postCopy}>
        {post.caption && <p><button>{nameFor(post.accountId)}</button> {long ? <>{post.caption.slice(0, 78).trimEnd()}… <button className={s.more} onClick={() => setExpanded(current => [...current, post.id])}>more</button></> : post.caption}</p>}
        {post.comments.length > 0 && <button className={s.muted} onClick={() => { setComment(''); setCommentsId(post.id); }}>{post.comments.length === 1 ? 'View 1 comment' : `View all ${post.comments.length} comments`}</button>}
        <small>{longAge(post.age)}</small>
      </div>
    </article>;
  }
  function renderExplore() {
    return <>
      <div className={s.exploreHeader}><label className={s.searchBox}><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search" aria-label="Search people and posts"/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><Icon name="close" size={14}/></button>}</label></div>
      {query && <div className={s.accountResults}>{matchingAccounts.length ? matchingAccounts.map(a => <button key={a.id}><img src={a.avatar} alt=""/><span><strong>{a.name}{badge(a.id)}</strong><small>{a.fullName}{following.includes(a.id) ? ' • Following' : ''}</small></span></button>) : <p>No matching accounts</p>}</div>}
      <div className={s.exploreGrid}>{exploreTiles.map((p, index) => { const tall = !query && index % 5 === (Math.floor(index / 5) % 2 ? 0 : 2); const place = tall ? (Math.floor(index / 5) % 2 ? s.tallLeft : s.tallRight) : '';
        // A picture is marked as the filter's own, so it is neither read nor hidden: it shows as it is, and opens nothing.
        if (!('accountId' in p)) return <button key={p.id} type="button" className={place} aria-label={p.name} {...{ [UI]: '' }}><img src={p.image} alt={p.name} loading="lazy"/></button>;
        // Under 자율 a tile turned to its picture carries the same mark for as long as it stays turned.
        const picture = autoPictures && !query && turned.includes(p.id) ? pictureFor(p.id) : null;
        return <button key={p.id} className={place} onClick={() => onOpen(p.id)} aria-label={`Open ${nameFor(p.accountId)} ${p.reel ? 'reel' : 'post'}`} {...(picture ? { [UI]: '' } : {})}><img src={picture ? picture.image : p.image} alt={picture ? picture.name : p.alt} loading="lazy"/></button>; })}</div>
      {!explorePosts.length && <p className={s.empty}>No posts match that search.</p>}
    </>;
  }

  return <main className={s.outer} lang="en"><div className={s.app}>
    <div className={`${s.scroll} ${s.noNav}`} ref={scroll} onScroll={event => { if (!detailId) gridScroll.current = event.currentTarget.scrollTop; }}>
      {detail ? <><header className={s.subHeader}><button aria-label="Back" onClick={onBack}><Icon name="back"/></button><strong>Posts</strong><span/></header>{renderFeedPost(detail)}</> : renderExplore()}
    </div>
    {commentPost && <Sheet label="Comments" title="Comments" expandable onClose={() => setCommentsId(null)}>
      <div className={s.comments}>
        {commentPost.caption && <div className={s.commentRow}><img src={avatarFor(commentPost.accountId)} alt=""/><div><p className={s.commentMeta}><strong>{nameFor(commentPost.accountId)}</strong>{badge(commentPost.accountId)} <span>{commentPost.age}</span></p><p>{commentPost.caption}</p></div></div>}
        {commentPost.comments.map(c => <div className={s.commentRow} key={c.id}><img src={avatarByName(c.author)} alt=""/><div><p className={s.commentMeta}><strong>{c.author}</strong> <span>{commentPost.age}</span></p><p>{c.body}</p><button className={s.replyButton} onClick={() => setComment(`@${c.author} `)}>Reply</button></div><button className={`${s.commentLike} ${likedComments.includes(c.id) ? s.isLiked : ''}`} aria-label={likedComments.includes(c.id) ? 'Unlike comment' : 'Like comment'} aria-pressed={likedComments.includes(c.id)} onClick={() => toggle(c.id, likedComments, setLikedComments)}><Icon name="heart" size={16} filled={likedComments.includes(c.id)}/></button></div>)}
        {!commentPost.comments.length && <div className={s.noComments}><strong>No comments yet</strong><span>Start the conversation.</span></div>}
      </div>
      <div className={s.emojiBar}>{emojis.map(e => <button key={e.id} onClick={() => setComment(current => current + e.glyph)} aria-label={`Add ${e.id} emoji`}>{e.glyph}</button>)}</div>
      <form className={s.commentForm} onSubmit={addComment}><img src={accounts[0].avatar} alt=""/><label><input aria-label="Add a comment" placeholder="Add a comment" value={comment} onChange={event => setComment(event.target.value)} maxLength={300}/>{comment.trim() ? <button type="submit">Post</button> : <span aria-hidden="true"><Icon name="sticker"/></span>}</label></form>
    </Sheet>}
    {optionPost && <Sheet label="Post options" className={s.optionSheet} onClose={() => setOptionsId(null)}>
      <div className={s.optionTop}><button onClick={() => { toggle(optionPost.id, saved, setSaved); setOptionsId(null); }}><span><Icon name="save" filled={saved.includes(optionPost.id)}/></span>{saved.includes(optionPost.id) ? 'Unsave' : 'Save'}</button><button onClick={() => { setShareTo([]); setShareId(optionPost.id); setOptionsId(null); }}><span><Icon name="send"/></span>Share</button></div>
      <div className={s.optionList}>
        {optionPost.accountId !== 'you' && <button onClick={() => { toggle(optionPost.accountId, following, setFollowing); setOptionsId(null); }}>{following.includes(optionPost.accountId) ? 'Unfollow' : 'Follow'}</button>}
        <button onClick={() => { setHidden(current => [...current, optionPost.id]); setNotice('Post hidden in this local preview'); onBack(); }}>Hide</button>
      </div>
    </Sheet>}
    {sharePost && <Sheet label="Share post" className={s.shareSheet} onClose={() => { setShareId(null); setShareTo([]); }}>
      <label className={`${s.searchBox} ${s.shareSearch}`}><Icon name="search" size={16}/><input placeholder="Search" aria-label="Search people to share with"/></label>
      <div className={s.sharePeople}>{suggested.map(id => <button key={id} aria-pressed={shareTo.includes(id)} onClick={() => toggle(id, shareTo, setShareTo)}><span><img src={avatarFor(id)} alt=""/>{shareTo.includes(id) && <i><Icon name="circleCheck" size={22}/></i>}</span><small>{accounts.find(a => a.id === id)?.fullName}</small></button>)}</div>
      {shareTo.length > 0 && <button className={s.shareButton} onClick={sendShare}>{shareTo.length > 1 ? 'Send separately' : 'Send'}</button>}
    </Sheet>}
    {notice && <div className={s.toast} role="status">{notice}</div>}
  </div></main>;
}
