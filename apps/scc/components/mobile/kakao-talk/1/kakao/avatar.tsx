/* eslint-disable @next/next/no-img-element -- small local portraits, no optimisation needed */
import type { Member, Room } from "../director/types";
import styles from "./kakao.module.css";

const src = (portrait: number) => `/images/face-voronoi/portraits/${String(portrait).padStart(3, "0")}.jpg`;

// The default KakaoTalk profile: white silhouette on pale blue-grey.
function DefaultFace() {
  return (
    <svg viewBox="0 0 40 40" className={styles.defaultFace} aria-hidden="true">
      <circle cx="20" cy="15.5" r="6.4" fill="#fff" />
      <path d="M8 34c1.6-6.7 6.3-10 12-10s10.4 3.3 12 10Z" fill="#fff" />
    </svg>
  );
}

export function Face({ member, size }: { member: Member | { avatar: number | null }; size: number }) {
  return (
    <span className={styles.face} style={{ width: size, height: size }}>
      {member.avatar === null ? <DefaultFace /> : <img src={src(member.avatar)} alt="" loading="lazy" decoding="async" />}
    </span>
  );
}

/** Group rooms show up to four members in one tile. */
export function RoomFace({ room, size }: { room: Room; size: number }) {
  if (room.kind === "dm") return <Face member={room.members[0]} size={size} />;
  const members = room.members.slice(0, 4);
  return (
    <span className={styles.groupFace} data-count={members.length} style={{ width: size, height: size }}>
      {members.map((member) => <Face key={member.id} member={member} size={size * (members.length === 2 ? 0.62 : 0.48)} />)}
    </span>
  );
}
