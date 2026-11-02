import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import s from './instagram.module.css';

// Bottom sheet with a grabber: drag down to dismiss, drag up to expand (comments), as in the iOS app.
export function Sheet({ label, title, onClose, expandable = false, className = '', children }: { label: string; title?: string; onClose: () => void; expandable?: boolean; className?: string; children: ReactNode }) {
  const [full, setFull] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  function down(event: PointerEvent<HTMLDivElement>) { start.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }
  function move(event: PointerEvent<HTMLDivElement>) { if (start.current === null) return; const dy = event.clientY - start.current; setDrag(expandable || dy > 0 ? dy : dy / 4); }
  function up() {
    if (start.current === null) return;
    start.current = null;
    if (drag > 110) { if (full) setFull(false); else onClose(); } else if (drag < -60 && expandable) setFull(true);
    setDrag(0);
  }
  return <div className={s.sheetBackdrop} onClick={onClose}>
    <section className={`${s.sheet} ${className} ${full ? s.sheetFull : ''} ${drag ? s.sheetDragging : ''}`} style={drag ? { transform: `translateY(${Math.max(drag, full ? 0 : -120)}px)` } : undefined} role="dialog" aria-modal="true" aria-label={label} onClick={event => event.stopPropagation()}>
      <div className={s.sheetGrab} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><span/>{title && <strong>{title}</strong>}</div>
      {children}
    </section>
  </div>;
}
