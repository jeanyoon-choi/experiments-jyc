'use client';
/* eslint-disable @next/next/no-img-element -- This bounded interface uses editorial sample photography. */
import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type TouchEvent } from 'react';
import { accounts, closeFriends, initialPosts, initiallyUnread, seedThreads, threadAges, verifiedAccounts, type Account, type Post, type ThreadMessage } from '../model/data';
import { Icon } from './glyph';
import { Reels } from './reels';
import { Sheet } from './sheet';
import { StoryViewer, type StoryItem } from './story-viewer';
import s from './instagram.module.css';

type Tab = 'home' | 'reels' | 'inbox' | 'explore' | 'profile' | 'create' | 'activity';
type ProfileSection = 'grid' | 'reels' | 'reposts' | 'tagged';

const avatarFor = (id: string) => accounts.find(a => a.id === id)?.avatar || accounts[0].avatar;
const nameFor = (id: string) => accounts.find(a => a.id === id)?.name || 'mira.cho';
const avatarByName = (name: string) => accounts.find(a => a.name === name)?.avatar || accounts[0].avatar;
const suggested = accounts.filter(account => account.id !== 'you').map(account => account.id);
const storyAccounts = ['you', ...suggested];
const imageChoices = initialPosts.slice(0, 8);
const navTabs = ['home', 'reels', 'inbox', 'explore', 'profile'] as const;
const emojis = [{ id: 'heart', glyph: '❤️' }, { id: 'raised', glyph: '🙌' }, { id: 'fire', glyph: '🔥' }, { id: 'clap', glyph: '👏' }, { id: 'cry', glyph: '😢' }, { id: 'love', glyph: '😍' }, { id: 'wow', glyph: '😮' }, { id: 'laugh', glyph: '😂' }];
const compactCount = (count: number) => { const [unit, size] = count >= 1e6 ? ['M', 1e6] as const : count >= 1e3 ? ['K', 1e3] as const : ['', 1] as const; return size === 1 ? String(count) : `${(count / size).toFixed(count / size >= 100 ? 0 : 1).replace(/\.0$/, '')}${unit}`; };
// Feed timestamps read "1 day ago" in the 2026 frame; comment and story ages stay short ("5h").
const longAge = (age: string) => { const match = /^(\d+)([mhd])$/.exec(age); if (!match) return age; const n = Number(match[1]); const unit = { m: 'minute', h: 'hour', d: 'day' }[match[2] as 'm' | 'h' | 'd']; return `${n} ${unit}${n === 1 ? '' : 's'} ago`; };
const storyItemsFor = (posts: Post[], id: string): StoryItem[] => posts.filter(p => p.accountId === id && !p.reel).slice(0, id === 'you' ? 1 : 3).map(p => ({ id: `story-${p.id}`, image: p.image, alt: p.alt, age: p.age }));

export default function InstagramMobile() {
  const [tab, setTab] = useState<Tab>('home');
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [reposted, setReposted] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>(['flowers', 'interior', 'cafe', 'street']);
  const [seen, setSeen] = useState<string[]>([]);
  const [profileId, setProfileId] = useState('you');
  const [profileSection, setProfileSection] = useState<ProfileSection>('grid');
  const [savedView, setSavedView] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [storyStart, setStoryStart] = useState<number | null>(null);
  const [commentsId, setCommentsId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareTo, setShareTo] = useState<string[]>([]);
  const [optionsId, setOptionsId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState('');
  const [caption, setCaption] = useState('');
  const [choice, setChoice] = useState(0);
  const [createStep, setCreateStep] = useState<'pick' | 'caption'>('pick');
  const [reelStart, setReelStart] = useState<string | null>(null);
  const [reelSection, setReelSection] = useState<'reels' | 'friends'>('reels');
  const [inboxAccount, setInboxAccount] = useState<string | null>(null);
  const [unread, setUnread] = useState<string[]>(initiallyUnread);
  const [message, setMessage] = useState('');
  const [threads, setThreads] = useState<Record<string, ThreadMessage[]>>(seedThreads);
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null);
  const [notice, setNotice] = useState('');
  const scroll = useRef<HTMLDivElement>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const gestureStart = useRef<{x: number; y: number} | null>(null);
  const detail = posts.find(p => p.id === detailId);
  const commentPost = posts.find(p => p.id === commentsId);
  const sharePost = posts.find(p => p.id === shareId);
  const optionPost = posts.find(p => p.id === optionsId);
  const profile: Account = accounts.find(a => a.id === profileId) || accounts[0];
  const reels = useMemo(() => posts.filter(p => p.reel), [posts]);
  const query = search.trim().toLowerCase();
  const matchingAccounts = accounts.filter(a => a.id !== 'you' && `${a.name} ${a.fullName}`.toLowerCase().includes(query));
  const explorePosts = posts.filter(p => !p.reel && (!query || `${p.caption} ${p.location} ${nameFor(p.accountId)}`.toLowerCase().includes(query)));
  const exploreTiles = query ? explorePosts : [...explorePosts.slice(0, 2), reels[0], ...explorePosts.slice(2, 4), reels[1], ...explorePosts.slice(4)].filter(Boolean);
  const inboxOrder = [...Object.keys(threads).sort((a, b) => Number(unread.includes(b)) - Number(unread.includes(a))), ...suggested.filter(id => !threads[id])];

  useEffect(() => { scroll.current?.scrollTo(0, 0); }, [tab, profileId, detailId, savedView, inboxAccount]);
  useEffect(() => { if (!notice) return; const timeout = window.setTimeout(() => setNotice(''), 2800); return () => window.clearTimeout(timeout); }, [notice]);

  function changeTab(next: Tab) { setTab(next); setDetailId(null); setStoryStart(null); setCommentsId(null); setShareId(null); setOptionsId(null); setInboxAccount(null); setSavedView(false); setSearch(''); setCreateStep('pick'); if (next === 'profile') { setProfileId('you'); setProfileSection('grid'); } if (next === 'reels') setReelStart(null); }
  function showProfile(id: string) { setTab('profile'); setProfileId(id); setProfileSection('grid'); setSavedView(false); setDetailId(null); setStoryStart(null); setCommentsId(null); setShareId(null); setOptionsId(null); }
  function openReel(id: string) { setReelStart(id); setReelSection('reels'); setDetailId(null); setTab('reels'); }
  function openStory(id: string) { const index = storyAccounts.indexOf(id); if (index >= 0) setStoryStart(index); }
  function toggle(id: string, values: string[], update: (next: string[]) => void) { update(values.includes(id) ? values.filter(value => value !== id) : [...values, id]); }
  function like(id: string, only = false) { setLiked(current => current.includes(id) ? (only ? current : current.filter(value => value !== id)) : [...current, id]); }
  function photoTap(event: MouseEvent<HTMLDivElement>, id: string) {
    const previous = lastTap.current;
    const now = event.timeStamp;
    if (previous && previous.id === id && now - previous.at < 320) { lastTap.current = null; like(id, true); setBurst({ id, n: now }); return; }
    lastTap.current = { id, at: now };
  }
  function addComment(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!commentsId || !comment.trim()) return; const body = comment.trim(); setPosts(current => current.map(p => p.id === commentsId ? { ...p, comments: [...p.comments, { id: crypto.randomUUID(), author: 'mira.cho', body }] } : p)); setComment(''); }
  function publish(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const selected = imageChoices[choice]; const post: Post = { id: crypto.randomUUID(), accountId: 'you', image: selected.image, alt: selected.alt, caption: caption.trim(), location: 'Seoul, South Korea', likes: 0, age: 'Just now', comments: [], own: true }; setPosts(current => [post, ...current]); setCaption(''); setChoice(0); setCreateStep('pick'); setTab('home'); setNotice('Post added to this local preview'); }
  function sendShare() { if (!sharePost) return; const body = `Shared ${nameFor(sharePost.accountId)}'s ${sharePost.reel ? 'reel' : 'post'}`; setThreads(current => { const next = { ...current }; shareTo.forEach(id => { next[id] = [...(next[id] || []), { id: crypto.randomUUID(), from: 'me', body }]; }); return next; }); setNotice(shareTo.length === 1 ? `Sent to ${nameFor(shareTo[0])}` : `Sent to ${shareTo.length} people`); setShareTo([]); setShareId(null); }
  function sendMessage(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!inboxAccount || !message.trim()) return; const body = message.trim(); setThreads(current => ({...current, [inboxAccount]: [...(current[inboxAccount] || []), {id: crypto.randomUUID(), from: 'me', body}]})); setMessage(''); }
  function finishGesture(event: TouchEvent<HTMLDivElement>) {
    const start = gestureStart.current;
    gestureStart.current = null;
    if (!start || detailId || commentsId || shareId || optionsId || inboxAccount || tab === 'create' || tab === 'activity') return;
    if (event.target instanceof Element && event.target.closest(`.${s.stories}, .${s.highlights}, input, textarea`)) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 85 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const index = navTabs.findIndex(item => item === tab);
    const next = navTabs[index + (dx < 0 ? 1 : -1)];
    if (next) changeTab(next);
  }
  const ringFor = (id: string) => seen.includes(id) ? s.ringSeen : closeFriends.includes(id) ? s.ringClose : s.ringNew;
  const badge = (id: string) => verifiedAccounts.includes(id) && <span className={s.verified}><Icon name="verified" size={12}/></span>;

  function renderPostActions(post: Post) {
    const isLiked = liked.includes(post.id);
    return <div className={s.postActions}>
      <button aria-label={isLiked ? 'Unlike post' : 'Like post'} aria-pressed={isLiked} className={isLiked ? s.isLiked : ''} onClick={() => like(post.id)}><Icon name="heart" filled={isLiked}/><span>{compactCount(post.likes + Number(isLiked))}</span></button>
      <button aria-label="View comments" onClick={() => { setComment(''); setCommentsId(post.id); }}><Icon name="message"/>{post.comments.length > 0 && <span>{compactCount(post.comments.length)}</span>}</button>
      <button aria-label={reposted.includes(post.id) ? 'Undo repost' : 'Repost'} aria-pressed={reposted.includes(post.id)} onClick={() => toggle(post.id, reposted, setReposted)}><Icon name="repost" filled={reposted.includes(post.id)}/><span>{compactCount(Math.round(post.likes / 78) + Number(reposted.includes(post.id)))}</span></button>
      <button aria-label="Share post" onClick={() => setShareId(post.id)}><Icon name="send"/><span>{compactCount(Math.round(post.likes / 31))}</span></button>
      <button className={s.saveAction} aria-label={saved.includes(post.id) ? 'Remove saved post' : 'Save post'} aria-pressed={saved.includes(post.id)} onClick={() => toggle(post.id, saved, setSaved)}><Icon name="save" filled={saved.includes(post.id)}/></button>
    </div>;
  }
  function renderFeedPost(post: Post) {
    const long = post.caption.length > 92 && !expanded.includes(post.id);
    const hasStory = !seen.includes(post.accountId) && post.accountId !== 'you';
    return <article className={s.feedPost}>
      <div className={s.postHead}>
        <button className={`${s.postAvatar} ${hasStory ? ringFor(post.accountId) : ''}`} aria-label={hasStory ? `View ${nameFor(post.accountId)} story` : `${nameFor(post.accountId)} profile`} onClick={() => hasStory ? openStory(post.accountId) : showProfile(post.accountId)}><img src={avatarFor(post.accountId)} alt=""/></button>
        <button className={s.identity} onClick={() => showProfile(post.accountId)}><strong>{nameFor(post.accountId)}{badge(post.accountId)}</strong>{post.location && <small>{post.location}</small>}</button>
        <button className={s.postMore} aria-label="Post options" onClick={() => setOptionsId(post.id)}><Icon name="more"/></button>
      </div>
      <div className={s.photo} onClick={event => photoTap(event, post.id)}>
        <img src={post.image} alt={post.alt} loading="lazy" draggable={false}/>
        {burst?.id === post.id && <span key={burst.n} className={s.heartBurst}><Icon name="heart" filled size={96}/></span>}
      </div>
      {renderPostActions(post)}
      <div className={s.postCopy}>
        {post.caption && <p><button onClick={() => showProfile(post.accountId)}>{nameFor(post.accountId)}</button> {long ? <>{post.caption.slice(0, 78).trimEnd()}… <button className={s.more} onClick={() => setExpanded(current => [...current, post.id])}>more</button></> : post.caption}</p>}
        {post.comments.length > 0 && <button className={s.muted} onClick={() => { setComment(''); setCommentsId(post.id); }}>{post.comments.length === 1 ? 'View 1 comment' : `View all ${post.comments.length} comments`}</button>}
        <small>{longAge(post.age)}</small>
      </div>
    </article>;
  }
  function renderGrid(items: Post[], tall = false) {
    return <div className={`${s.profileGrid} ${tall ? s.reelGrid : ''}`}>{items.map(p => <button key={p.id} onClick={() => p.reel ? openReel(p.id) : setDetailId(p.id)} aria-label={`Open ${p.reel ? 'reel' : 'post'}: ${p.caption}`}><img src={p.image} alt={p.alt} loading="lazy"/>{p.reel && !tall && <span className={s.tileBadge}><Icon name="reels" filled size={18}/></span>}{tall && <span className={s.tileViews}><Icon name="play" size={14}/>{compactCount(p.likes * 9)}</span>}</button>)}</div>;
  }
  function renderHome() {
    return <>
      <header className={s.homeHeader}>
        <button aria-label="Create post" onClick={() => changeTab('create')}><Icon name="add"/></button>
        <img className={s.wordmark} src="/images/sns/mobile/11/instagram-wordmark.svg" alt="Instagram"/>
        <button aria-label="Notifications" onClick={() => changeTab('activity')}><Icon name="heart" size={28}/></button>
      </header>
      <div className={s.stories}>
        <button className={s.storyEntry} onClick={() => openStory('you')}><span className={s.storyOwn}><img src={accounts[0].avatar} alt=""/><i><Icon name="add" size={13}/></i></span><small className={s.muted}>Your story</small></button>
        {suggested.map(id => <button className={s.storyEntry} key={id} onClick={() => openStory(id)}><span className={`${s.storyRing} ${ringFor(id)}`}><img src={avatarFor(id)} alt=""/></span><small>{nameFor(id)}</small></button>)}
      </div>
      <div className={s.feed}>{posts.filter(p => !p.reel && !hidden.includes(p.id)).map(p => <div key={p.id}>{renderFeedPost(p)}</div>)}</div>
    </>;
  }
  function renderExplore() {
    return <>
      <div className={s.exploreHeader}><label className={s.searchBox}><Icon name="search" size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search" aria-label="Search people and posts"/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><Icon name="close" size={14}/></button>}</label></div>
      {query && <div className={s.accountResults}>{matchingAccounts.length ? matchingAccounts.map(a => <button key={a.id} onClick={() => showProfile(a.id)}><img src={a.avatar} alt=""/><span><strong>{a.name}{badge(a.id)}</strong><small>{a.fullName}{following.includes(a.id) ? ' • Following' : ''}</small></span></button>) : <p>No matching accounts</p>}</div>}
      <div className={s.exploreGrid}>{exploreTiles.map((p, index) => { const tall = !query && index % 5 === (Math.floor(index / 5) % 2 ? 0 : 2); return <button key={p.id} className={tall ? (Math.floor(index / 5) % 2 ? s.tallLeft : s.tallRight) : ''} onClick={() => p.reel ? openReel(p.id) : setDetailId(p.id)} aria-label={`Open ${nameFor(p.accountId)} ${p.reel ? 'reel' : 'post'}`}><img src={p.image} alt={p.alt} loading="lazy"/>{p.reel && <span className={s.tileBadge}><Icon name="reels" filled size={18}/></span>}</button>; })}</div>
      {!explorePosts.length && <p className={s.empty}>No posts match that search.</p>}
    </>;
  }
  function renderActivity() {
    const yours = posts.filter(p => p.accountId === 'you' && !p.reel);
    return <>
      <header className={s.subHeader}><button aria-label="Back to home" onClick={() => changeTab('home')}><Icon name="back"/></button><strong>Notifications</strong><span/></header>
      <h2 className={s.activitySection}>New</h2>
      {yours.slice(0, 2).map((p, index) => <button className={s.activityRow} key={`like-${p.id}`} onClick={() => setDetailId(p.id)}><img src={avatarFor(suggested[index * 3])} alt=""/><span><strong>{nameFor(suggested[index * 3])}</strong> and <strong>{compactCount(p.likes - 1)} others</strong> liked your post. <small>{p.age}</small></span><img className={s.activityThumb} src={p.image} alt=""/></button>)}
      <h2 className={s.activitySection}>This week</h2>
      {yours.flatMap(p => p.comments.map(c => <button className={s.activityRow} key={c.id} onClick={() => setDetailId(p.id)}><img src={avatarByName(c.author)} alt=""/><span><strong>{c.author}</strong> commented: {c.body} <small>{p.age}</small></span><img className={s.activityThumb} src={p.image} alt=""/></button>))}
      {suggested.filter(id => !following.includes(id)).slice(0, 3).map(id => <div className={s.activityRow} key={`follow-${id}`}><img src={avatarFor(id)} alt=""/><span><strong>{nameFor(id)}</strong> started following you. <small>2d</small></span><button className={s.followSmall} onClick={() => toggle(id, following, setFollowing)}>Follow back</button></div>)}
    </>;
  }
  function renderInbox() {
    if (inboxAccount) {
      const thread = threads[inboxAccount] || [];
      return <div className={s.thread}>
        <header className={s.threadHeader}><button onClick={() => setInboxAccount(null)} aria-label="Back to inbox"><Icon name="back"/></button><button className={s.threadWho} onClick={() => showProfile(inboxAccount)}><img src={avatarFor(inboxAccount)} alt=""/><span><strong>{accounts.find(a => a.id === inboxAccount)?.fullName}</strong><small>{nameFor(inboxAccount)}</small></span></button><button aria-label="Audio call"><Icon name="call"/></button><button aria-label="Video call"><Icon name="videoCall"/></button></header>
        <div className={s.bubbles}>
          <div className={s.threadIdentity}><img src={avatarFor(inboxAccount)} alt=""/><strong>{accounts.find(a => a.id === inboxAccount)?.fullName}</strong><small>{nameFor(inboxAccount)} · Instagram</small><button onClick={() => showProfile(inboxAccount)}>View profile</button></div>
          {thread.map((entry, index) => <div key={entry.id} className={entry.from === 'me' ? s.sent : s.received}>{entry.from === 'them' && <span className={s.bubbleAvatar}>{thread[index + 1]?.from !== 'them' && <img src={avatarFor(inboxAccount)} alt=""/>}</span>}<p>{entry.body}</p></div>)}
        </div>
        <form className={s.messageForm} onSubmit={sendMessage}><span className={s.cameraButton}><Icon name="camera" size={20}/></span><input value={message} onChange={event => setMessage(event.target.value)} maxLength={500} placeholder="Message…" aria-label="Message"/>{message.trim() ? <button type="submit" className={s.sendText}>Send</button> : <><button type="button" aria-label="Voice message"><Icon name="microphone"/></button><button type="button" aria-label="Gallery"><Icon name="photo"/></button><button type="button" aria-label="Sticker"><Icon name="sticker"/></button></>}</form>
      </div>;
    }
    return <>
      <header className={s.inboxHeader}><strong>{accounts[0].name}<Icon name="chevronDown" size={14}/></strong><button aria-label="New message"><Icon name="compose"/></button></header>
      <label className={`${s.searchBox} ${s.inboxSearch}`}><Icon name="search" size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search" aria-label="Search messages"/></label>
      <div className={s.inboxTitle}><strong>Messages</strong><span>Requests</span></div>
      {inboxOrder.filter(id => !query || `${nameFor(id)} ${accounts.find(a => a.id === id)?.fullName}`.toLowerCase().includes(query)).map(id => { const last = threads[id]?.at(-1); const isUnread = unread.includes(id); return <button className={`${s.threadRow} ${isUnread ? s.unread : ''}`} key={id} onClick={() => { setInboxAccount(id); setUnread(current => current.filter(value => value !== id)); setSearch(''); }}><img src={avatarFor(id)} alt=""/><span><strong>{accounts.find(a => a.id === id)?.fullName}</strong><small>{last ? <>{isUnread ? (threads[id].length > 1 ? `${threads[id].length} new messages` : last.body) : `${last.from === 'me' ? 'You: ' : ''}${last.body}`}<em> · {threadAges[id] || 'now'}</em></> : 'Tap to chat'}</small></span>{isUnread && <i className={s.unreadDot}/>}<span className={s.rowCamera}><Icon name="camera" size={22}/></span></button>; })}
    </>;
  }
  function renderCreate() {
    if (createStep === 'caption') return <form className={s.create} onSubmit={publish}>
      <header className={s.subHeader}><button type="button" aria-label="Back to photos" onClick={() => setCreateStep('pick')}><Icon name="back"/></button><strong>New post</strong><span/></header>
      <div className={s.captionRow}><img src={imageChoices[choice].image} alt={imageChoices[choice].alt}/><textarea value={caption} onChange={event => setCaption(event.target.value)} maxLength={500} placeholder="Add a caption…" aria-label="Caption" rows={4}/></div>
      <button className={s.shareButton} type="submit">Share</button>
    </form>;
    return <>
      <header className={s.subHeader}><button aria-label="Cancel new post" onClick={() => changeTab('home')}><Icon name="close"/></button><strong>New post</strong><button className={s.nextText} onClick={() => setCreateStep('caption')}>Next</button></header>
      <img className={s.createPreview} src={imageChoices[choice].image} alt={imageChoices[choice].alt}/>
      <div className={s.recents}><strong>Recents<Icon name="chevronDown" size={12}/></strong></div>
      <div className={s.photoChoices}>{imageChoices.map((image, index) => <button key={image.id} type="button" className={choice === index ? s.selectedPhoto : ''} onClick={() => setChoice(index)} aria-label={`Choose sample photo ${index + 1}`} aria-pressed={choice === index}><img src={image.image} alt={image.alt}/></button>)}</div>
    </>;
  }
  function renderProfile() {
    const own = profileId === 'you';
    if (savedView) return <>
      <header className={s.subHeader}><button aria-label="Back to profile" onClick={() => setSavedView(false)}><Icon name="back"/></button><strong>Saved</strong><span/></header>
      {saved.length ? renderGrid(posts.filter(p => saved.includes(p.id))) : <p className={s.empty}>Save photos and videos that you want to see again.</p>}
    </>;
    const mine = posts.filter(p => p.accountId === profileId);
    const sectionItems = profileSection === 'grid' ? mine.filter(p => !p.reel) : profileSection === 'reels' ? mine.filter(p => p.reel) : profileSection === 'reposts' ? (own ? posts.filter(p => reposted.includes(p.id)) : []) : [];
    return <>
      <header className={s.profileHeader}>
        {own ? <button aria-label="Create post" onClick={() => changeTab('create')}><Icon name="add"/></button> : <button aria-label="Back" onClick={() => showProfile('you')}><Icon name="back"/></button>}
        <strong>{profile.name}{own ? <Icon name="chevronDown" size={14}/> : badge(profile.id)}</strong>
        {own ? <span><button aria-label="Threads"><Icon name="threads"/></button><button aria-label="Saved and settings" onClick={() => setSavedView(true)}><Icon name="menu"/></button></span> : <span><button aria-label="Profile options"><Icon name="more"/></button></span>}
      </header>
      <div className={s.profileSummary}>
        <button className={`${s.profileAvatar} ${!own && !seen.includes(profile.id) ? s.ringNew : ''}`} onClick={() => openStory(profile.id)} aria-label={`${profile.fullName} story`}><img src={profile.avatar} alt={`${profile.fullName} profile`}/>{own && <i><Icon name="add" size={13}/></i>}</button>
        <div className={s.profileStats}>
          <strong>{profile.fullName}</strong>
          <div className={s.profileCounts}><span><strong>{mine.filter(p => !p.reel).length}</strong><small>posts</small></span><span><strong>{profile.followers}</strong><small>followers</small></span><span><strong>{profile.following}</strong><small>following</small></span></div>
        </div>
      </div>
      <div className={s.bio}><p>{profile.bio}</p></div>
      <div className={s.profileButtons}>
        {own ? <><button>Edit profile</button><button>Share profile</button></> : <><button className={following.includes(profileId) ? '' : s.followButton} onClick={() => toggle(profileId, following, setFollowing)}>{following.includes(profileId) ? <>Following<Icon name="chevronDown" size={12}/></> : 'Follow'}</button><button onClick={() => { setTab('inbox'); setInboxAccount(profileId); setUnread(current => current.filter(value => value !== profileId)); }}>Message</button></>}
        <button className={s.iconButton} aria-label="Discover people"><Icon name="userFollow" size={16}/></button>
      </div>
      <div className={s.highlights}>
        {own && <button onClick={() => changeTab('create')}><span className={s.newHighlight}><Icon name="add" size={22}/></span><small>New</small></button>}
        <button onClick={() => openStory(profile.id)}><span><img src={mine.find(p => !p.reel)?.image || profile.avatar} alt=""/></span><small>{profile.location}</small></button>
      </div>
      <div className={s.profileTabs}>{([['grid', 'gridTall', 'Posts'], ['reels', 'reels', 'Reels'], ['reposts', 'repost', 'Reposts'], ['tagged', 'tagged', 'Tagged']] as const).map(([id, icon, label]) => <button key={id} className={profileSection === id ? s.activeProfileTab : ''} onClick={() => setProfileSection(id)} aria-label={label} aria-pressed={profileSection === id}><Icon name={icon}/></button>)}</div>
      {sectionItems.length ? renderGrid(sectionItems, profileSection === 'reels') : <p className={s.empty}>{profileSection === 'tagged' ? 'Photos and videos of you' : profileSection === 'reposts' ? 'Reposts will appear here' : profileSection === 'reels' ? 'No reels yet' : 'No posts yet'}</p>}
    </>;
  }

  const overlay = storyStart !== null;
  return <main className={s.outer} lang="en"><div className={s.app}>
    {overlay ? <StoryViewer key={storyStart} order={storyAccounts} start={storyStart} itemsFor={id => storyItemsFor(posts, id)} avatarFor={avatarFor} nameFor={nameFor} onSeen={id => setSeen(current => current.includes(id) ? current : [...current, id])} onClose={() => setStoryStart(null)} onReply={(id, body) => { setThreads(current => ({ ...current, [id]: [...(current[id] || []), { id: crypto.randomUUID(), from: 'me', body }] })); setNotice(`Reply sent to ${nameFor(id)}`); }} onProfile={id => showProfile(id)}/> : <>
      {tab === 'reels' && !detail ? <Reels reels={reels} start={reelStart} section={reelSection} onSection={setReelSection} liked={liked} reposted={reposted} following={following} verified={verifiedAccounts} onLike={like} onRepost={id => toggle(id, reposted, setReposted)} onFollow={id => toggle(id, following, setFollowing)} onComments={id => { setComment(''); setCommentsId(id); }} onShare={setShareId} onProfile={showProfile} onCreate={() => changeTab('create')} avatarFor={avatarFor} nameFor={nameFor} compactCount={compactCount}/> : <div className={`${s.scroll} ${tab === 'create' || inboxAccount ? s.noNav : ''}`} ref={scroll} onTouchStartCapture={event => { const touch = event.touches[0]; if (touch) gestureStart.current = {x: touch.clientX, y: touch.clientY}; }} onTouchEndCapture={finishGesture}>
        {detail ? <><header className={s.subHeader}><button aria-label="Back" onClick={() => setDetailId(null)}><Icon name="back"/></button><strong>Posts</strong><span/></header>{renderFeedPost(detail)}</> : tab === 'home' ? renderHome() : tab === 'explore' ? renderExplore() : tab === 'activity' ? renderActivity() : tab === 'inbox' ? renderInbox() : tab === 'create' ? renderCreate() : renderProfile()}
      </div>}
      {tab !== 'create' && !inboxAccount && <nav className={`${s.bottomNav} ${tab === 'reels' && !detail ? s.darkNav : ''}`} aria-label="Main navigation">{navTabs.map(item => <button key={item} onClick={() => changeTab(item)} aria-label={item === 'explore' ? 'Search and explore' : item === 'inbox' ? 'Messages' : item[0].toUpperCase() + item.slice(1)} aria-current={tab === item ? 'page' : undefined}>{item === 'profile' ? <img className={tab === item ? s.activeAvatar : ''} src={accounts[0].avatar} alt=""/> : <Icon name={item === 'explore' ? 'search' : item} filled={tab === item}/>}{item === 'inbox' && unread.length > 0 && <i className={s.navDot}/>}</button>)}</nav>}
    </>}
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
      <div className={s.optionTop}><button onClick={() => { toggle(optionPost.id, saved, setSaved); setOptionsId(null); }}><span><Icon name="save" filled={saved.includes(optionPost.id)}/></span>{saved.includes(optionPost.id) ? 'Unsave' : 'Save'}</button><button onClick={() => { setShareId(optionPost.id); setOptionsId(null); }}><span><Icon name="send"/></span>Share</button></div>
      <div className={s.optionList}>
        {optionPost.accountId !== 'you' && <button onClick={() => { toggle(optionPost.accountId, following, setFollowing); setOptionsId(null); }}>{following.includes(optionPost.accountId) ? 'Unfollow' : 'Follow'}</button>}
        <button onClick={() => { showProfile(optionPost.accountId); }}>About this account</button>
        <button onClick={() => { setDetailId(optionPost.id); setOptionsId(null); }}>Go to post</button>
        <button onClick={() => { setHidden(current => [...current, optionPost.id]); setOptionsId(null); setNotice('Post hidden in this local preview'); }}>Hide</button>
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
