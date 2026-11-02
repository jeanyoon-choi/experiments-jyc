/**
 * Machine-room sound: a low drive rumble, mains hum, and the step chain's
 * clack at the step frequency. Starts on the first touch (browser gesture rule).
 */
export function createHum(stepPeriod: number) {
  let ctx: AudioContext | null = null;
  let timer = 0;

  function start() {
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    ctx = c;
    const master = c.createGain();
    master.gain.setValueAtTime(0, c.currentTime);
    master.gain.linearRampToValueAtTime(0.8, c.currentTime + 3);
    master.connect(c.destination);

    const len = c.sampleRate * 4;
    const brown = c.createBuffer(1, len, c.sampleRate);
    const d = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const rumble = c.createBufferSource();
    rumble.buffer = brown;
    rumble.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    const rg = c.createGain();
    rg.gain.value = 0.55;
    rumble.connect(lp).connect(rg).connect(master);
    rumble.start();

    for (const [f, g] of [[50, 0.018], [100, 0.022], [200, 0.006]]) {
      const o = c.createOscillator();
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = g;
      o.connect(og).connect(master);
      o.start();
    }

    const white = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
    const wd = white.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const clack = (t: number) => {
      const s = c.createBufferSource();
      s.buffer = white;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1300 + Math.random() * 700;
      bp.Q.value = 3;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.03, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      s.connect(bp).connect(g).connect(master);
      s.start(t);
      s.stop(t + 0.08);
    };
    let next = c.currentTime + 0.4;
    timer = window.setInterval(() => {
      while (next < c.currentTime + 0.3) {
        clack(next);
        next += stepPeriod * (0.985 + Math.random() * 0.03);
      }
    }, 100);
  }

  function setPaused(paused: boolean) {
    if (!ctx) return;
    void (paused ? ctx.suspend() : ctx.resume());
  }

  function dispose() {
    window.clearInterval(timer);
    void ctx?.close();
    ctx = null;
  }

  return { start, setPaused, dispose };
}
