import { createElement } from 'react';
import { igds } from './igds-glyphs';
import { igdsExtra, type IgdsExtraName } from './igds-extra';

// Copied from SCC clone/11 glyph.tsx. Every glyph is a verbatim IGDS module: igds-glyphs.ts (post actions, nav), igds-extra.ts (the rest).
export type IconName = 'home' | 'search' | 'reels' | 'inbox' | 'heart' | 'message' | 'send' | 'save' | 'repost' | IgdsExtraName;

export function Icon({ name, filled = false, size = 24 }: { name: IconName; filled?: boolean; size?: number }) {
  const common = { 'data-icon': name, width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const };
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'heart') return filled ? <svg {...common} viewBox="0 0 48 48"><path d={igds.heartFilled}/></svg> : <svg {...common}><path d={igds.heartOutline}/></svg>;
  if (name === 'message') return <svg {...common}><path {...line} d={igds.comment}/></svg>;
  if (name === 'repost') return <svg {...common}><path d={filled ? igds.repostDone : igds.repost}/></svg>;
  if (name === 'send' || name === 'inbox') return <svg {...common}>{filled ? <path d={igds.directFilled}/> : <><path {...line} d={igds.directOutline}/><line {...line} {...igds.directFold}/></>}</svg>;
  if (name === 'save') return <svg {...common}>{filled ? <path d={igds.saveFilled}/> : <polygon {...line} points={igds.savePoints}/>}</svg>;
  if (name === 'reels') return <svg {...common}><path d={filled ? igds.reelsFilled : igds.reelsOutline}/></svg>;
  if (name === 'home') return <svg {...common}><path d={filled ? igds.homeFilled : igds.homeOutline}/></svg>;
  if (name === 'search') return <svg {...common}><path {...line} d={igds.search}/><line {...line} {...igds.searchHandle}/></svg>;
  const glyph = igdsExtra[name];
  return <svg {...common} viewBox={glyph.viewBox}>{glyph.els.map(([tag, attrs], index) => createElement(tag, { key: `${name}-${index}`, ...attrs }))}</svg>;
}
