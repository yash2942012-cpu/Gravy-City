/* GRAVY CITY -- procedural audio (no external files) */
(function () {
  var GC = (window.GC = window.GC || {});

  var ctx = null, master = null, noiseBuf = null, muted = false;

  function init() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    var len = Math.floor(ctx.sampleRate * 1.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; }

  function t0() { return ctx ? ctx.currentTime : 0; }

  function tone(o) {
    if (!ctx || muted) return;
    o = o || {};
    var type = o.type || 'sine';
    var f = o.f || 440;
    var f2 = o.f2 == null ? f : o.f2;
    var dur = o.dur || 0.2;
    var vol = (o.vol == null ? 0.3 : o.vol);
    var start = t0() + (o.delay || 0);
    var osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f, start);
    if (f2 !== f) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), start + dur);
    var g = ctx.createGain();
    var atk = o.atk == null ? 0.012 : o.atk;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    var node = osc;
    if (o.filter) {
      var flt = ctx.createBiquadFilter();
      flt.type = o.filter;
      flt.frequency.setValueAtTime(o.cutoff || 900, start);
      if (o.cutoff2) flt.frequency.exponentialRampToValueAtTime(Math.max(40, o.cutoff2), start + dur);
      flt.Q.value = o.q || 1;
      osc.connect(flt); node = flt;
    }
    node.connect(g); g.connect(master);
    osc.start(start); osc.stop(start + dur + 0.05);
  }

  function noise(o) {
    if (!ctx || muted || !noiseBuf) return;
    o = o || {};
    var dur = o.dur || 0.2;
    var vol = o.vol == null ? 0.25 : o.vol;
    var start = t0() + (o.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var flt = ctx.createBiquadFilter();
    flt.type = o.filter || 'bandpass';
    flt.frequency.setValueAtTime(o.freq || 1200, start);
    if (o.freq2) flt.frequency.exponentialRampToValueAtTime(Math.max(40, o.freq2), start + dur);
    flt.Q.value = o.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + (o.atk || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(start); src.stop(start + dur + 0.05);
  }

  var SFX = {
    ding: function () {
      tone({ type: 'triangle', f: 880, dur: 0.35, vol: 0.3 });
      tone({ type: 'triangle', f: 1320, dur: 0.5, vol: 0.22, delay: 0.06 });
      tone({ type: 'sine', f: 1760, dur: 0.4, vol: 0.12, delay: 0.06 });
    },
    coin: function () {
      tone({ type: 'square', f: 988, dur: 0.07, vol: 0.16 });
      tone({ type: 'square', f: 1319, dur: 0.22, vol: 0.16, delay: 0.07 });
    },
    click: function () { tone({ type: 'square', f: 640, dur: 0.05, vol: 0.12 }); },
    bad: function () {
      tone({ type: 'sawtooth', f: 220, f2: 70, dur: 0.4, vol: 0.22, filter: 'lowpass', cutoff: 1400, cutoff2: 300 });
    },
    ring: function () {
      tone({ type: 'square', f: 480, dur: 0.38, vol: 0.16 });
      tone({ type: 'square', f: 620, dur: 0.38, vol: 0.16, delay: 0.4 });
    },
    coo: function () {
      noise({ filter: 'bandpass', freq: 900, freq2: 1500, q: 4, dur: 0.22, vol: 0.2 });
      tone({ type: 'sawtooth', f: 420, f2: 700, dur: 0.2, vol: 0.07, filter: 'bandpass', cutoff: 1100, q: 3 });
    },
    bark: function () {
      noise({ filter: 'bandpass', freq: 800, freq2: 220, q: 1.6, dur: 0.16, vol: 0.34 });
      tone({ type: 'sawtooth', f: 300, f2: 120, dur: 0.15, vol: 0.16, filter: 'lowpass', cutoff: 1200 });
    },
    squeal: function () {
      noise({ filter: 'bandpass', freq: 2600, freq2: 700, q: 6, dur: 0.55, vol: 0.16 });
    },
    step: function () {
      noise({ filter: 'lowpass', freq: 700, freq2: 220, dur: 0.07, vol: 0.08 });
    },
    crackle: function () {
      for (var i = 0; i < 4; i++) {
        noise({ filter: 'highpass', freq: 1800, dur: 0.06, vol: 0.09, delay: i * 0.09 });
      }
    },
    whoosh: function () {
      noise({ filter: 'lowpass', freq: 300, freq2: 1800, dur: 0.35, vol: 0.14 });
    },
    error: function () {
      tone({ type: 'square', f: 210, dur: 0.16, vol: 0.2 });
      tone({ type: 'square', f: 160, dur: 0.3, vol: 0.2, delay: 0.17 });
    },
    trumpet: function () {
      var notes = [392, 392, 466, 622];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'sawtooth', f: notes[i], dur: 0.16, vol: 0.16, filter: 'lowpass', cutoff: 2600, delay: i * 0.17 });
      }
    },
    /* the classic 4-note wah-wah failure */
    trombone: function () {
      var seq = [[196, 0.55], [164.81, 0.5], [130.81, 0.5], [116.54, 0.85]];
      var time = 0;
      for (var i = 0; i < seq.length; i++) {
        var f = seq[i][0], d = seq[i][1];
        var osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t0() + time);
        var flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(700, t0() + time);
        flt.Q.value = 6;
        var lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5.5;
        var lfoGain = ctx.createGain();
        lfoGain.gain.value = 380;
        lfo.connect(lfoGain); lfoGain.connect(flt.frequency);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0() + time);
        // two wah bumps per note
        g.gain.linearRampToValueAtTime(0.26, t0() + time + 0.14);
        g.gain.linearRampToValueAtTime(0.08, t0() + time + 0.26);
        g.gain.linearRampToValueAtTime(0.24, t0() + time + 0.36);
        g.gain.linearRampToValueAtTime(0.0001, t0() + time + d);
        osc.connect(flt); flt.connect(g); g.connect(master);
        osc.start(t0() + time); osc.stop(t0() + time + d + 0.05);
        lfo.start(t0() + time); lfo.stop(t0() + time + d + 0.05);
        time += d;
      }
    },
    /* clock tick for the last 10 seconds */
    tick: function () { tone({ type: 'square', f: 1500, dur: 0.05, vol: 0.14 }); },
    /* angry car horn */
    horn: function () {
      tone({ type: 'square', f: 392, dur: 0.32, vol: 0.13 });
      tone({ type: 'square', f: 523, dur: 0.32, vol: 0.11 });
    },
    /* police wail */
    siren: function () {
      tone({ type: 'sawtooth', f: 620, f2: 980, dur: 0.55, vol: 0.12, filter: 'lowpass', cutoff: 2200 });
      tone({ type: 'sawtooth', f: 980, f2: 620, dur: 0.55, vol: 0.12, filter: 'lowpass', cutoff: 2200, delay: 0.55 });
    }
  };

  GC.audio = {
    init: init,
    resume: resume,
    setMuted: setMuted,
    play: function (name) {
      if (!ctx) { init(); }
      if (!ctx || muted) return;
      if (SFX[name]) { try { SFX[name](); } catch (e) { } }
    },
    tone: tone,
    noise: noise
  };
})();
