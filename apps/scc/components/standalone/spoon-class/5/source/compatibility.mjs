// SCC integration correction, 2026-09-08. The upstream engine and assets remain
// in dino.html. Complete its 400ms intro even when CSS emits no legacy event.
//
// 2026-10-03: the intro is also isolated from the browser's support for the
// source's prefixed CSS. Its `@-webkit-keyframes` insertRule and
// `style.webkitAnimation` predate standard CSS animation; a browser that
// rejects the rule made the first jump throw inside the frame loop, freezing
// the game. The standard equivalents are used when the prefixed form fails,
// and a failed intro presentation still starts the game.
export function installRunnerCompatibility(Runner, clock) {
  const originalIntro = Runner.prototype.playIntro;
  const originalStart = Runner.prototype.startGame;
  Runner.events.ANIM_END = "animationend";

  const StyleSheet = clock.CSSStyleSheet;
  if (StyleSheet && StyleSheet.prototype.insertRule) {
    const insertRule = StyleSheet.prototype.insertRule;
    StyleSheet.prototype.insertRule = function (rule, index) {
      try {
        return insertRule.call(this, rule, index);
      } catch (error) {
        if (typeof rule !== "string" || rule.indexOf("@-webkit-keyframes") !== 0) throw error;
        return insertRule.call(this, rule.replace("@-webkit-keyframes", "@keyframes"), index);
      }
    };
  }

  const root = clock.document && clock.document.documentElement;
  if (root && clock.CSSStyleDeclaration && !("webkitAnimation" in root.style)) {
    Object.defineProperty(clock.CSSStyleDeclaration.prototype, "webkitAnimation", {
      configurable: true,
      get() {
        return this.animation;
      },
      set(value) {
        this.animation = value;
      },
    });
  }

  Runner.prototype.startGame = function () {
    if (!this.playingIntro) return;
    clock.clearTimeout(this.introCompletionTimer);
    originalStart.call(this);
  };

  Runner.prototype.playIntro = function () {
    const wasStarted = this.started;
    try {
      originalIntro.call(this);
    } catch (error) {
      if (wasStarted || !this.playingIntro) throw error;
      // Finish the source's own intro state so the frame loop keeps running.
      this.containerEl.style.width = this.dimensions.WIDTH + "px";
      if (this.touchController) this.outerContainerEl.appendChild(this.touchController);
      this.activated = true;
      this.started = true;
    }
    if (!wasStarted && this.playingIntro) {
      this.introCompletionTimer = clock.setTimeout(() => this.startGame(), 400);
    }
  };
}
