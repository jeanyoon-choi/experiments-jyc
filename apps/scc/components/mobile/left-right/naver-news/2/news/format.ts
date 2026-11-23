// A news portal's time grammar: "3분전" in the lists, "2026.11.16. 오후 4:15" on an article.

export function ago(since: number, now: number) {
  const minutes = Math.max(1, Math.floor((now - since) / 60_000));
  if (minutes < 60) return `${minutes}분전`;
  return `${Math.floor(minutes / 60)}시간전`;
}

/** Under an hour old: the time is printed in blue. */
export const recent = (since: number, now: number) => now - since < 3_600_000;

export function stamp(at: number) {
  const date = new Date(at);
  const hours = date.getHours();
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}. ${hours < 12 ? "오전" : "오후"} ${hour}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export const count = (value: number) => value.toLocaleString("ko-KR");
