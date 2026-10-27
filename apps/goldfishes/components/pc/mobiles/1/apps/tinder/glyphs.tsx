// Tinder's glyphs as inline SVG (24 × 24 unless noted). Solid fills only, so
// no gradient ids collide across the 64 phones; gradients are CSS masks.

/** The flame mark, as a path in a 24 × 24 box (also used as a CSS mask). */
export const FLAME_PATH =
  "M8.3 1.2c.3 3.2-1.3 5-3 6.8C3.6 9.8 2.2 11.9 2.2 15c0 4.4 3.9 7.9 9.8 7.9 5.7 0 9.8-3.4 9.8-8.9 0-4-2.2-7.3-4.6-9.3.1 2.2-.7 4.1-2.2 5C14.8 5.7 12.4 2.5 8.3 1.2z";

export const FLAME_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${FLAME_PATH}'/></svg>`,
)}")`;

type GlyphProps = { size?: number };

export function Bell({ size = 26 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4.6 1.6 6.4 2.4 7.2.3.3.1.8-.3.8H3.9c-.4 0-.6-.5-.3-.8C4.4 15.9 6 14.1 6 9.5z" />
      <path d="M9.7 20.5a2.5 2.5 0 0 0 4.6 0" />
    </svg>
  );
}

export function Sliders({ size = 26 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3.5 7h9M17.5 7h3M3.5 17h3M11.5 17h9" />
      <circle cx="15" cy="7" r="2.5" />
      <circle cx="9" cy="17" r="2.5" />
    </svg>
  );
}

export function Briefcase({ size = 16 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3h6a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3.5H2V8a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2zm0 2v1h6V5H9zM2 13h8.5v1.5h3V13H22v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />
    </svg>
  );
}

export function Pin({ size = 16 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.8a7.7 7.7 0 0 0-7.7 7.7c0 5.5 6.3 11.8 7 12.5.4.4 1 .4 1.4 0 .7-.7 7-7 7-12.5A7.7 7.7 0 0 0 12 1.8zm0 10.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
    </svg>
  );
}

export function Verified({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#1786FF"
        d="M12 1.5l2.4 1.7 2.9-.3 1.2 2.7 2.7 1.2-.3 2.9 1.7 2.3-1.7 2.4.3 2.9-2.7 1.2-1.2 2.7-2.9-.3L12 22.5l-2.4-1.6-2.9.3-1.2-2.7-2.7-1.2.3-2.9L1.5 12l1.6-2.3-.3-2.9 2.7-1.2 1.2-2.7 2.9.3z"
      />
      <path d="M7.6 12.2l3 3 5.8-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowUp({ size = 18 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" />
    </svg>
  );
}

export function Rewind({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.4 4.2a8 8 0 1 1-7.9 9.3 1.3 1.3 0 0 1 2.6-.4 5.4 5.4 0 1 0 5.3-6.3H9.9l1.4 1.4a1.3 1.3 0 0 1-1.8 1.8L5.9 6.4a1.3 1.3 0 0 1 0-1.8L9.5 1a1.3 1.3 0 0 1 1.8 1.8L9.9 4.2h2.5z" />
    </svg>
  );
}

export function Nope({ size = 30 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

export function Star({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 17.8l-6.4 3.5L7 14.1l-5.3-5 7.2-.9z" />
    </svg>
  );
}

export function Heart({ size = 30 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.4c-.4 0-.8-.1-1.1-.4C5.3 16.4 1.6 13 1.6 8.6 1.6 5.3 4.1 2.8 7.3 2.8c1.9 0 3.6.9 4.7 2.4 1.1-1.5 2.8-2.4 4.7-2.4 3.2 0 5.7 2.5 5.7 5.8 0 4.4-3.7 7.8-9.3 12.4-.3.3-.7.4-1.1.4z" />
    </svg>
  );
}

export function Bolt({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.6 1.5L4.2 13.4c-.4.5 0 1.2.6 1.2h5.6l-1.3 7.9 9.4-11.9c.4-.5 0-1.2-.6-1.2h-5.6z" />
    </svg>
  );
}

export function Explore({ size = 28 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.2" />
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="2.2" />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.2" />
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.2" />
    </svg>
  );
}

export function Likes({ size = 28 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 2h11a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-1V8a3 3 0 0 0-3-3H5a3 3 0 0 1 3-3z" opacity="0.55" />
      <path d="M5 6h9a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zm4.5 4l-1.3 2.7-3 .4 2.2 2.1-.5 3 2.6-1.4 2.6 1.4-.5-3 2.2-2.1-3-.4z" />
    </svg>
  );
}

export function Chat({ size = 28 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5c5.5 0 10 3.9 10 8.8s-4.5 8.8-10 8.8c-1.2 0-2.3-.2-3.4-.5L4 21.4c-.5.2-1-.3-.8-.8l1.2-3.6C3 15.5 2 13.5 2 11.3 2 6.4 6.5 2.5 12 2.5zM7.5 10a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm4.5 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm4.5 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z" />
    </svg>
  );
}

export function Person({ size = 28 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="7.5" r="5" />
      <path d="M3 21.2c0-4.3 4-7.2 9-7.2s9 2.9 9 7.2c0 .5-.4.8-.9.8H3.9c-.5 0-.9-.3-.9-.8z" />
    </svg>
  );
}
