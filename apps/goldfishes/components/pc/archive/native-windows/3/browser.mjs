// AppleScript builders and pure ownership rules for version 3. Every script
// addresses an exact numeric window/tab ID; nothing clicks, types or submits.
const nativeId = n => { if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Invalid native ID'); return n; };
export function chooseRevisit(pages, previousTabId, pick) {
  const eligible = pages.filter(p => p.tabId !== previousTabId);
  return eligible[Math.min(eligible.length - 1, Math.floor(pick * eligible.length))];
}
export function focusScript(page) {
  return `tell application "Google Chrome"
    set w to window id ${nativeId(page.windowId)}
    repeat with gfTabIndex from 1 to count of tabs of w
      if id of tab gfTabIndex of w is ${nativeId(page.tabId)} then
        set active tab index of w to gfTabIndex
        set index of w to 1
        activate
        return "focused"
      end if
    end repeat
    return "missing"
  end tell`;
}
export function reconcile(owned, live) {
  return owned.filter(p => Number.isSafeInteger(p.windowId) && Number.isSafeInteger(p.tabId) && live.some(t => t.windowId === p.windowId && t.tabId === p.tabId));
}
export function closeScript(page) {
  return `tell application "Google Chrome"
    if exists window id ${nativeId(page.windowId)} then
      set w to window id ${page.windowId}
      repeat with t in tabs of w
        if id of t is ${nativeId(page.tabId)} then
          close t
          exit repeat
        end if
      end repeat
    end if
  end tell`;
}
export function creationScript(url, targetWindow) {
  if (!url.startsWith('https://') || /[\r\n]/.test(url)) throw new Error('HTTPS URL required');
  const quoted = JSON.stringify(url);
  return `tell application "Google Chrome"
    ${targetWindow ? `set w to window id ${nativeId(targetWindow)}\nset t to make new tab at end of tabs of w with properties {URL:${quoted}}\nset active tab index of w to count of tabs of w` : `set w to make new window\nset t to active tab of w\nset URL of t to ${quoted}`}
    set index of w to 1
    activate
    return (id of w as text) & ":" & (id of t as text)
  end tell`;
}
export function scrollScript(page, upward = false) {
  return `tell application "Google Chrome"
    if not frontmost then return "skipped"
    if id of front window is not ${nativeId(page.windowId)} then return "skipped"
    if id of active tab of front window is not ${nativeId(page.tabId)} then return "skipped"
  end tell
  tell application "System Events"
    tell process "Google Chrome"
      if frontmost then key code ${upward ? 116 : 121}
    end tell
  end tell`;
}
export function cadence(baseMs, commandAverage, pageCount) {
  return Math.round(Math.max(baseMs, commandAverage * 1.3, pageCount > 30 ? 1000 : pageCount > 20 ? 700 : 250));
}
export const inventoryScript = `tell application "Google Chrome"
    set gfTabInventoryText to ""
    repeat with w in windows
      repeat with t in tabs of w
        set gfTabInventoryText to gfTabInventoryText & (id of w as text) & ":" & (id of t as text) & ","
      end repeat
    end repeat
    return gfTabInventoryText
  end tell`;
export function parseInventory(result) {
  return result.split(',').filter(Boolean).map(pair => { const [windowId, tabId] = pair.split(':').map(Number); return { windowId, tabId }; });
}
