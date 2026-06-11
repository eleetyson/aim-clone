'use strict';
/*
 * Classic AIM sounds, synthesized with the Web Audio API.
 * (Procedural homages to the originals: the door-open creak when a buddy
 * signs on, the door slam when they leave, the message "ding", and the
 * little send "whip".)
 */
const SND = (() => {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(c, seconds) {
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* Creaky door opening — buddy sign-on */
  function doorOpen() {
    if (!enabled) return;
    const c = ac(), t = c.currentTime;
    const dur = 0.85;

    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.linearRampToValueAtTime(185, t + dur);

    // stick-slip wobble that speeds up as the door swings
    const vib = c.createOscillator();
    vib.type = 'sine';
    vib.frequency.setValueAtTime(9, t);
    vib.frequency.linearRampToValueAtTime(17, t + dur);
    const vibGain = c.createGain();
    vibGain.gain.value = 26;
    vib.connect(vibGain).connect(osc.frequency);

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.linearRampToValueAtTime(760, t + dur);
    bp.Q.value = 4;

    // tremolo to roughen the creak
    const trem = c.createOscillator();
    trem.type = 'square';
    trem.frequency.setValueAtTime(11, t);
    trem.frequency.linearRampToValueAtTime(20, t + dur);
    const tremDepth = c.createGain();
    tremDepth.gain.value = 0.4;
    const tremBase = c.createGain();
    tremBase.gain.value = 0.6;
    trem.connect(tremDepth).connect(tremBase.gain);

    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.22, t + 0.07);
    env.gain.setValueAtTime(0.22, t + dur - 0.12);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(bp).connect(tremBase).connect(env).connect(c.destination);
    osc.start(t); vib.start(t); trem.start(t);
    osc.stop(t + dur); vib.stop(t + dur); trem.stop(t + dur);
  }

  /* Door slam — buddy sign-off */
  function doorSlam() {
    if (!enabled) return;
    const c = ac(), t = c.currentTime;

    // low thump
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    const og = c.createGain();
    og.gain.setValueAtTime(0.9, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(og).connect(c.destination);
    o.start(t); o.stop(t + 0.32);

    // wooden smack (filtered noise burst)
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.18);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 0.15);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.7, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    n.connect(lp).connect(ng).connect(c.destination);
    n.start(t);

    // frame rattle
    const n2 = c.createBufferSource();
    n2.buffer = noiseBuffer(c, 0.1);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 2;
    const n2g = c.createGain();
    n2g.gain.setValueAtTime(0.12, t + 0.05);
    n2g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    n2.connect(bp).connect(n2g).connect(c.destination);
    n2.start(t + 0.05);
  }

  /* Metallic "ding" — incoming message */
  function receive() {
    if (!enabled) return;
    const c = ac(), t = c.currentTime;
    // inharmonic partials of a struck metal bar
    const partials = [[1245, 1.0], [1660, 0.55], [2490, 0.35], [3320, 0.18]];
    for (const [f, a] of partials) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.985, t + 0.4);
      const g = c.createGain();
      g.gain.setValueAtTime(0.22 * a, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.45);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.5);
    }
    // strike transient
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.03);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2500;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.15, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    n.connect(hp).connect(ng).connect(c.destination);
    n.start(t);
  }

  /* Short "whip" — message sent */
  function send() {
    if (!enabled) return;
    const c = ac(), t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1050, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.09);
    const g = c.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.12);

    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c, 0.04);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 1.5;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.08, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    n.connect(bp).connect(ng).connect(c.destination);
    n.start(t);
  }

  /* dialog error blip */
  function error() {
    if (!enabled) return;
    const c = ac(), t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = 220;
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.setValueAtTime(0.12, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.17);
  }

  return {
    doorOpen, doorSlam, receive, send, error,
    unlock() { try { ac(); } catch (e) {} },
    setEnabled(v) { enabled = !!v; },
    get enabled() { return enabled; }
  };
})();
