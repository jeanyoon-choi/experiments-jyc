// Mechanical packaging only: never rewrite the upstream Runner or its assets.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { installRunnerCompatibility } from "./compatibility.mjs";
import {
  applyBrowserReplacements,
  browserStyle,
  installAudioCompatibility,
} from "./browser.mjs";
import { installLifeAgeMeter } from "./life-age.mjs";
import { installJumpCeiling } from "./jump-ceiling.mjs";
import { installGrowth } from "./growth.mjs";
import { installLifeGamePresentation } from "./life-game.mjs";

const original = readFileSync(new URL("./dino.html", import.meta.url), "utf8");
const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`;
// /1 is the presentation fork. It uses the upstream Runner unchanged inside
// each tile, with only non-game page chrome removed.
const moduleStyles = `<style data-spoon-class-module-style>
html, body {
  background: #f7f7f7;
  height: 150px;
  margin: 0;
  overflow: hidden;
  width: 100%;
}

.interstitial-wrapper {
  height: 150px;
  margin: 0 !important;
  max-width: none;
  padding: 0 !important;
  width: 100%;
}
</style>`;
// Install before the original bootstrap. Preserve the upstream file separately
// so the small integration correction is reviewable without rewriting its code.
const adapter = `<script data-spoon-class-compatibility>(${installRunnerCompatibility.toString()})(window.Runner, window);</script>`;
const audioAdapter = `<script data-spoon-class-audio>(${installAudioCompatibility.toString()})(window);</script>`;
// Spine photographs from Aladin's spine downloads, 200px high (see the docs).
const BOOKS = [
  "math-jeongseok",
  "ssen",
  "gaenyeom-wonri",
  "black-label",
  "xistory",
  "mapl-synergy",
];

function jpegSize(bytes) {
  for (let offset = 2; offset < bytes.length; ) {
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG size not found");
}

const books = BOOKS.map((name) => {
  const bytes = readFileSync(new URL(`./books/${name}.jpg`, import.meta.url));
  return {
    src: `data:image/jpeg;base64,${bytes.toString("base64")}`,
    ...jpegSize(bytes),
  };
});
// The host's 책/문제집 option sets window.spoonClassWorkbooks before this runs.
const lifeAdapter = `<script data-spoon-class-life-presentation>(${installLifeGamePresentation.toString()})(document, window.spoonClassWorkbooks ? ${JSON.stringify(books)} : null);</script>`;
const ageAdapter = `<script data-spoon-class-life-age>(${installLifeAgeMeter.toString()})(window);</script>`;
const jumpAdapter = `<script data-spoon-class-jump-ceiling>(${installJumpCeiling.toString()})(window);</script>`;
const growthAdapter = `<script data-spoon-class-growth>(${installGrowth.toString()})(window);</script>`;
const runnerBootstrap = `<script type="text/javascript">
    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {`;
const runnerBootstrapEnd = `  </script>

  <div class="onlyforchrome">`;
const modulePresentation = `<script data-spoon-class-module-presentation>
(function(window, document) {
  var chromeOnly = document.querySelectorAll(".onlyforchrome");
  for (var index = 0; index < chromeOnly.length; index++) {
    chromeOnly[index].remove();
  }
  var nonChromeNotice = document.getElementById("main-frame-notchrome");
  if (nonChromeNotice) nonChromeNotice.remove();

  var host = window.parent !== window ? window.parent : null;

  // Sound plays in the host: one audio context for every module, so sounds
  // from many games overlap, and the first touch, click or key in any module
  // unlocks it. A module's own context would stay suspended unless that very
  // frame received the gesture. Called synchronously inside the trusted
  // event, which browsers require before audio may start.
  function unlockHostAudio() {
    try {
      if (host && host.spoonClassUnlockAudio) host.spoonClassUnlockAudio();
    } catch (error) {}
  }

  var Runner = window.Runner;
  if (host && Runner) {
    Runner.prototype.loadSounds = function () {
      for (var sound in Runner.sounds) this.soundFx[sound] = sound;
    };
    Runner.prototype.playSound = function (sound) {
      if (sound) host.postMessage({ channel: "spoon-class-sound", sound: sound }, "*");
    };
  }

  function syncInput(event) {
    if (!event.isTrusted || window.parent === window) return;
    unlockHostAudio();
    var keyCode = Number(event.keyCode || event.which);
    if (keyCode !== 32 && keyCode !== 38 && keyCode !== 40 && keyCode !== 13) return;
    window.parent.postMessage({
      channel: "spoon-class-input",
      type: event.type,
      keyCode: keyCode
    }, "*");
  }

  // Touch has no key to relay, so a finger is one Space press for every
  // module, this one included, exactly like the host keyboard path.
  function syncTouch(event) {
    if (window.parent === window) return;
    unlockHostAudio();
    event.preventDefault();
    event.stopPropagation();
    window.parent.postMessage({
      channel: "spoon-class-input",
      type: event.type === "touchstart" ? "keydown" : "keyup",
      keyCode: 32
    }, "*");
  }

  document.addEventListener("keydown", syncInput);
  document.addEventListener("keyup", syncInput);
  var touchOptions = { capture: true, passive: false };
  window.addEventListener("touchstart", syncTouch, touchOptions);
  window.addEventListener("touchend", syncTouch, touchOptions);
  window.addEventListener("touchcancel", syncTouch, touchOptions);
  window.addEventListener("pointerdown", unlockHostAudio, true);
})(window, document);
</script>`;
const html = applyBrowserReplacements(
  original
    .replace("<head>", `<head>\n${policy}`)
    .replace("</head>", `${moduleStyles}\n${browserStyle}\n${adapter}\n${audioAdapter}\n</head>`)
    .replace(runnerBootstrap, `${lifeAdapter}\n${runnerBootstrap}`)
    .replace(runnerBootstrapEnd, `  </script>\n${ageAdapter}\n${jumpAdapter}\n${growthAdapter}\n\n  <div class="onlyforchrome">`)
    .replace("</body>", `${modulePresentation}\n</body>`),
);
const packaged = {
  repository: "https://github.com/alexelzx/chrome-dino",
  revision: "6e472666cfd94e95056b7e747f46badf00e1226d",
  sha256: createHash("sha256").update(original).digest("hex"),
  html,
};
writeFileSync(new URL("./document.json", import.meta.url), `${JSON.stringify(packaged, null, 2)}\n`);
