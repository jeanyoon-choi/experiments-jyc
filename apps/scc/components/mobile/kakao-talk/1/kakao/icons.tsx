// Line icons drawn for this clone at KakaoTalk's 24 px grid, 1.7 px strokes.

type IconProps = { size?: number; filled?: boolean };

const svg = (size: number, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const PersonIcon = ({ size = 26, filled }: IconProps) => svg(size, (
  <>
    <circle cx="12" cy="8.2" r="3.8" fill={filled ? "currentColor" : "none"} />
    <path d="M4.5 20c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6" fill={filled ? "currentColor" : "none"} />
  </>
));

export const ChatIcon = ({ size = 26, filled }: IconProps) => svg(size, (
  <path d="M12 4c4.7 0 8.5 3 8.5 6.8s-3.8 6.8-8.5 6.8c-.8 0-1.6-.1-2.3-.3L6 19.6l.9-3.2C4.8 15.1 3.5 13.1 3.5 10.8 3.5 7 7.3 4 12 4Z" fill={filled ? "currentColor" : "none"} />
));

export const NowIcon = ({ size = 26, filled }: IconProps) => svg(size, (
  <>
    <rect x="5" y="3.5" width="14" height="17" rx="3" fill={filled ? "currentColor" : "none"} />
    <path d="m10.5 9.5 4 2.5-4 2.5Z" fill={filled ? "#fff" : "currentColor"} stroke="none" />
  </>
));

export const ShopIcon = ({ size = 26, filled }: IconProps) => svg(size, (
  <>
    <path d="M5 8h14l-1 12H6Z" fill={filled ? "currentColor" : "none"} />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </>
));

export const MoreIcon = ({ size = 26 }: IconProps) => svg(size, (
  <>
    <circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </>
));

export const SearchIcon = ({ size = 24 }: IconProps) => svg(size, (
  <>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15 15 5 5" />
  </>
));

export const NewChatIcon = ({ size = 24 }: IconProps) => svg(size, (
  <>
    <path d="M12 4c4.7 0 8.5 3 8.5 6.8s-3.8 6.8-8.5 6.8c-.8 0-1.6-.1-2.3-.3L6 19.6l.9-3.2C4.8 15.1 3.5 13.1 3.5 10.8 3.5 7 7.3 4 12 4Z" />
    <path d="M12 8v5.5M9.25 10.75h5.5" />
  </>
));

export const GearIcon = ({ size = 24 }: IconProps) => svg(size, (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.4a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2.6 1.5l.5 2.4h4l.5-2.4a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.4Z" />
  </>
));

export const BackIcon = ({ size = 26 }: IconProps) => svg(size, <path d="m14.5 5-7 7 7 7" />);

export const MenuIcon = ({ size = 24 }: IconProps) => svg(size, <path d="M4 7h16M4 12h16M4 17h16" />);

export const PlusIcon = ({ size = 24 }: IconProps) => svg(size, <path d="M12 5v14M5 12h14" />);

export const SmileIcon = ({ size = 24 }: IconProps) => svg(size, (
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" />
    <circle cx="9.2" cy="10" r=".6" fill="currentColor" />
    <circle cx="14.8" cy="10" r=".6" fill="currentColor" />
  </>
));

export const HashIcon = ({ size = 24 }: IconProps) => svg(size, <path d="M9.5 4 8 20M16 4l-1.5 16M4.5 9h15M4 15h15" />);

export const SendIcon = ({ size = 20 }: IconProps) => svg(size, <path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" />);

export const MutedIcon = ({ size = 13 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-label="알림 꺼짐">
    <path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H6.5M10 21h4M3 3l18 18" />
  </svg>
);

export const PinIcon = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="고정됨">
    <path d="M14.5 2.5 21.5 9.5l-2.2.6-3.6 3.6.4 4.8-1.6 1.6-4.3-4.3L4.5 21.5l-1-1 5.6-5.7-4.3-4.3 1.6-1.6 4.8.4 3.6-3.6Z" />
  </svg>
);
