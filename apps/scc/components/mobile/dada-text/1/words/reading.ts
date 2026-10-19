import type { TextRole } from "../reading/tokens";
import type { CommandGroup } from "./vocabulary";

/**
 * The word for each part. Every visible part gets a word for its own job, so a name, its @handle and the minutes since
 * posting never share one command. Reads a control's label to know what it does; knows nothing of boxes or drawing.
 */
type Action = "like" | "reply" | "repost" | "share" | "save" | "follow" | "search" | "message" | "notify" |
  "post" | "home" | "watch" | "more" | "back" | "profile" | "menu" | "select";

/** What an interactive element does, read from its label and text. */
export function actionOf(element: Element): Action {
  const tag = element.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    const hint = `${element.getAttribute("placeholder") ?? ""} ${element.getAttribute("aria-label") ?? ""}`.toLowerCase();
    if (/search|검색/.test(hint)) return "search";
    if (/reply|comment|댓글|답글/.test(hint)) return "reply";
    if (/message|메시지/.test(hint)) return "message";
    return "post";
  }
  const text = [element.getAttribute("aria-label"), element.getAttribute("title"), element.textContent?.slice(0, 80)]
    .filter(Boolean).join(" ").toLowerCase();
  if (/unlike|\blike|좋아요|heart/.test(text)) return "like";
  if (/comment|repl|댓글|답글/.test(text)) return "reply";
  if (/repost|retweet|remix|리포스트/.test(text)) return "repost";
  if (/share|send|공유|보내기/.test(text)) return "share";
  if (/save|saved|bookmark|favorite|저장|찜|watch later/.test(text)) return "save";
  if (/unfollow|follow|subscribe|구독|팔로우/.test(text)) return "follow";
  if (/search|explore|discover|검색|탐색/.test(text)) return "search";
  if (/message|inbox|chat|direct|메시지/.test(text)) return "message";
  if (/notification|activity|bell|알림/.test(text)) return "notify";
  if (/create|compose|new post|upload|post\b|게시|만들기/.test(text)) return "post";
  if (/home|for you|following feed|홈/.test(text)) return "home";
  if (/reels|shorts|video|play|pause|mute|unmute|watch|재생|영상/.test(text)) return "watch";
  if (/more|options|menu|더 보기|옵션/.test(text)) return "more";
  if (/back|close|cancel|뒤로|닫기|취소/.test(text)) return "back";
  if (/profile|account|story|stories|프로필|스토리/.test(text)) return "profile";
  if (/library|you\b|drawer|settings|설정/.test(text)) return "menu";
  return "select";
}

const actions: Record<CommandGroup, Record<Action, string>> = {
  consumption: {
    like: "DESIRE", reply: "EXCHANGE", repost: "EXCHANGE", share: "EXCHANGE", save: "ACCUMULATE", follow: "ACCUMULATE",
    search: "SEARCH", message: "EXCHANGE", notify: "DESIRE", post: "EXCHANGE", home: "CONSUME", watch: "CONSUME",
    more: "SELECT", back: "SELECT", profile: "COMPARE", menu: "SELECT", select: "SELECT",
  },
  discipline: {
    like: "CONFORM", reply: "REPORT", repost: "REPEAT", share: "PERFORM", save: "REPEAT", follow: "OBEY",
    search: "TRACK", message: "REPORT", notify: "COMPLY", post: "PERFORM", home: "RETURN", watch: "REPEAT",
    more: "OPTIMIZE", back: "COMPLY", profile: "PERFORM", menu: "PLAN", select: "COMPLY",
  },
  attention: {
    like: "LIKE", reply: "REPLY", repost: "REPOST", share: "SHARE", save: "SAVE", follow: "FOLLOW",
    search: "SCROLL", message: "REPLY", notify: "RETURN", post: "POST", home: "RETURN", watch: "WATCH",
    more: "STAY", back: "RETURN", profile: "FOLLOW", menu: "STAY", select: "STAY",
  },
};

/** Parts recognised by what they are rather than what they do. Within each vocabulary these words differ from one another. */
export type Part = TextRole | "avatar" | "media" | "icon" | "field";
const parts: Record<CommandGroup, Record<Exclude<Part, "control" | "media">, string>> = {
  consumption: { name: "SELECT", handle: "COMPARE", time: "RESERVE", count: "PRICE", tag: "SEARCH", title: "DESIRE", copy: "CONSUME", avatar: "COMPARE", icon: "DESIRE", field: "SEARCH" },
  discipline: { name: "PERFORM", handle: "VERIFY", time: "SCHEDULE", count: "TRACK", tag: "OBEY", title: "OBEY", copy: "REPORT", avatar: "CONFORM", icon: "COMPLY", field: "TRACK" },
  attention: { name: "FOLLOW", handle: "STAY", time: "RETURN", count: "AMPLIFY", tag: "SHARE", title: "WATCH", copy: "SCROLL", avatar: "FOLLOW", icon: "STAY", field: "SCROLL" },
};

/** The invitation of Instagram's pictures and Reels: to be desired, to be performed, to be watched. */
const media: Record<CommandGroup, string> = { consumption: "DESIRE", discipline: "PERFORM", attention: "WATCH" };

/**
 * The word for one part. A handle, time, count, name, title or tag is named by its role even inside a control,
 * because it is a different thing from the control's action; icons, control labels and fields take their control's action.
 */
export function wordFor(part: Part, control: Element | null, group: CommandGroup) {
  if (part === "media") return media[group];
  if ((part === "icon" || part === "control" || part === "field") && control) return actions[group][actionOf(control)];
  if (part === "control") return actions[group].select;
  return parts[group][part];
}
