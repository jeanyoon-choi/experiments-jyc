// SCC cross-browser correction, 2026-10-03. The upstream page constructs the
// Runner only when the user agent contains "chrome" (so Safari, Firefox and
// every iOS browser, including Chrome as "CriOS", showed no game) and selects
// touch input only for user agents containing "Mobi" (missing iPadOS and
// Android tablets). Each pair is an exact upstream line and its packaged form;
// the engine, assets and styles are otherwise untouched.
export const browserReplacements = [
  [
    "if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {",
    "if (/* spoon-class: every browser runs the original game */ true) {",
  ],
  [
    "if (navigator.userAgent.toLowerCase().indexOf('chrome') <= -1) {",
    "if (/* spoon-class: every browser runs the original game */ false) {",
  ],
  [
    "var IS_MOBILE = window.navigator.userAgent.indexOf('Mobi') > -1 || IS_IOS;",
    "var IS_MOBILE = window.navigator.userAgent.indexOf('Mobi') > -1 || IS_IOS || /* spoon-class: touch-primary devices */ (!!window.matchMedia && window.matchMedia('(pointer: coarse)').matches && (window.navigator.maxTouchPoints > 0 || 'ontouchstart' in window));",
  ],
];

export function applyBrowserReplacements(html) {
  return browserReplacements.reduce((packaged, [upstream, replacement]) => {
    if (packaged.split(upstream).length !== 2) {
      throw new Error(`Expected exactly one upstream occurrence of: ${upstream}`);
    }
    return packaged.replace(upstream, () => replacement);
  }, html);
}

export function restoreBrowserReplacements(html) {
  return browserReplacements.reduce(
    (restored, [upstream, replacement]) => restored.replace(replacement, () => upstream),
    html,
  );
}

// Suppress mobile browser gestures that would steal game taps: double-tap
// zoom, long-press selection/callout and the tap flash. No layout changes.
export const browserStyle = `<style data-spoon-class-browser-style>
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

body {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>`;

// Deliberately self-contained: stringified into the game document. Older
// Safari exposes only webkitAudioContext, and Safari cannot decode the
// source's Ogg sounds; a failed decode must stay silent instead of throwing.
export function installAudioCompatibility(window) {
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    AudioContextClass = function SilentAudioContext() {};
    AudioContextClass.prototype.decodeAudioData = function () {};
  }
  var decode = AudioContextClass.prototype.decodeAudioData;
  AudioContextClass.prototype.decodeAudioData = function (buffer, onDecoded) {
    var result;
    try {
      result = decode.call(this, buffer, onDecoded, function () {});
    } catch {
      return undefined;
    }
    if (result && typeof result.catch === "function") result.catch(function () {});
    return result;
  };
  window.AudioContext = AudioContextClass;
}
