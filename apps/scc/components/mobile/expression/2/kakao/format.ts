// KakaoTalk's time grammar: "오후 3:42" today, "어제", then "10월 30일".

const DAY = 86_400_000;

export function clock(at: number) {
  const date = new Date(at);
  const hours = date.getHours();
  const half = hours < 12 ? "오전" : "오후";
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${half} ${hour}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const startOfDay = (at: number) => {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export function listTime(at: number, now: number) {
  const today = startOfDay(now);
  if (at >= today) return clock(at);
  if (at >= today - DAY) return "어제";
  const date = new Date(at);
  if (date.getFullYear() === new Date(now).getFullYear()) return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function dayLabel(at: number) {
  const date = new Date(at);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
}

export const sameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b);
export const sameMinute = (a: number, b: number) => Math.floor(a / 60_000) === Math.floor(b / 60_000);

export const badge = (count: number) => (count > 999 ? "999+" : String(count));
