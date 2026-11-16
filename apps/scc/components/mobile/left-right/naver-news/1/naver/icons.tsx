// Marks drawn for this clone at the sizes Naver's news sprite uses.

export const NaverMark = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <rect width="20" height="20" rx="4.4" fill="#03c75a" />
    <path d="M11.35 10.25 8.5 6.1H6.1v7.8h2.55V9.75l2.85 4.15h2.4V6.1h-2.55Z" fill="#fff" />
  </svg>
);

export const SearchIcon = () => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke="#1e1e23" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <circle cx="9.2" cy="9.2" r="6.4" />
    <path d="m14 14 5 5" />
  </svg>
);

export const MyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e1e23" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.2" />
    <circle cx="12" cy="9.8" r="3.1" />
    <path d="M6.1 18.6c1.2-2.4 3.3-3.7 5.9-3.7s4.7 1.3 5.9 3.7" />
  </svg>
);

export const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="#b4b4b8" strokeWidth="1" />
    <path d="M8 7.2v3.9" stroke="#9a9aa0" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8" cy="5.1" r=".75" fill="#9a9aa0" />
  </svg>
);

export const CommentIcon = () => (
  <svg width="14" height="15" viewBox="0 0 14 15" fill="none" stroke="#9c9ca0" strokeWidth="1" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 2.8h9a1 1 0 0 1 1 1v5.9a1 1 0 0 1-1 1H7.6L5 13v-2.3H2.5a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1Z" />
  </svg>
);

export const ChevronDown = () => (
  <svg width="11" height="6" viewBox="0 0 11 6" fill="none" stroke="#8f8f94" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m1 .8 4.5 4.2L10 .8" />
  </svg>
);

/** The article page's 구독 pill. */
export const SubscribeMark = () => (
  <svg width="50" height="24" viewBox="0 0 50 24" aria-hidden="true">
    <rect x=".5" y=".5" width="49" height="23" rx="11.5" fill="#fff" stroke="#d4d4d8" />
    <path d="M12.5 8v8M8.5 12h8" stroke="#03c75a" strokeWidth="1.5" strokeLinecap="round" />
    <text x="20.5" y="16.2" fontSize="12" fontWeight="600" fill="#2e2e2e" letterSpacing="-.4">구독</text>
  </svg>
);

export const SmileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2e2e2e" strokeWidth="1.1" strokeLinecap="round" aria-hidden="true">
    <circle cx="10" cy="10" r="7.9" />
    <path d="M6.8 11.6c.8 1.3 1.9 1.9 3.2 1.9s2.4-.6 3.2-1.9" />
    <circle cx="7.6" cy="8.1" r=".7" fill="#2e2e2e" stroke="none" />
    <circle cx="12.4" cy="8.1" r=".7" fill="#2e2e2e" stroke="none" />
  </svg>
);

export const BubbleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2e2e2e" strokeWidth="1.1" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 2.2a7.8 7.8 0 1 1-3.6 14.7l-2.7.9a.8.8 0 0 1-1-1l.9-2.7A7.8 7.8 0 0 1 10 2.2Z" />
  </svg>
);

export const SpeakerIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#2e2e2e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5.5 10.5h3l4-3.3v11.6l-4-3.3h-3Z" />
    <path d="M16 10.2a4 4 0 0 1 0 5.6M18.4 7.9a7.2 7.2 0 0 1 0 10.2" />
  </svg>
);

export const FontIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
    <text x="4" y="18.5" fontSize="13" fontWeight="500" fill="#2e2e2e">가</text>
    <text x="14" y="18.5" fontSize="9" fontWeight="500" fill="#2e2e2e">가</text>
  </svg>
);

export const ShareIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#2e2e2e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 4.5v10.8M9.3 7.9 13 4.3l3.7 3.6M7 12.5v7.2h12v-7.2" />
  </svg>
);
