/*
 * audio.js — Chiptune-Engine (WebAudio, keine externen Dateien).
 * Musik: "Korobeiniki" (russisches Volkslied, gemeinfrei) = das originale
 * Tetris-Thema A, dazu Bach-Menuett (gemeinfrei) und ein eigener Zen-Track.
 */
(function (global) {
  'use strict';

  var T = global.TETRIS = global.TETRIS || {};

  var NOTES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

  function freq(note) {
    if (!note || note === '-') { return 0; }
    var m = /^([A-G][#b]?)(-?\d)$/.exec(note);
    if (!m) { return 0; }
    var semi = NOTES[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (semi - 69) / 12);
  }

  // Kompaktes Format: "Note:Dauer" in 16teln, "-" = Pause.
  function parse(str) {
    return str.trim().split(/\s+/).map(function (tok) {
      var p = tok.split(':');
      return { note: p[0], dur: parseInt(p[1] || '4', 10) };
    });
  }

  /* --------- Track A: Korobeiniki (Tetris-Thema A) --------- */
  var KORO_LEAD = parse([
    // A-Teil
    'E5:4 B4:2 C5:2 D5:4 C5:2 B4:2',
    'A4:4 A4:2 C5:2 E5:4 D5:2 C5:2',
    'B4:6 C5:2 D5:4 E5:4',
    'C5:4 A4:4 A4:4 -:4',
    '-:2 D5:6 F5:2 A5:4 G5:2 F5:2',
    'E5:6 C5:2 E5:4 D5:2 C5:2',
    'B4:4 B4:2 C5:2 D5:4 E5:4',
    'C5:4 A4:4 A4:4 -:4',
    // A-Teil Wiederholung
    'E5:4 B4:2 C5:2 D5:4 C5:2 B4:2',
    'A4:4 A4:2 C5:2 E5:4 D5:2 C5:2',
    'B4:6 C5:2 D5:4 E5:4',
    'C5:4 A4:4 A4:4 -:4',
    '-:2 D5:6 F5:2 A5:4 G5:2 F5:2',
    'E5:6 C5:2 E5:4 D5:2 C5:2',
    'B4:4 B4:2 C5:2 D5:4 E5:4',
    'C5:4 A4:4 A4:4 -:4',
    // B-Teil
    'E5:8 C5:8',
    'D5:8 B4:8',
    'C5:8 A4:8',
    'G#4:8 B4:6 -:2',
    'E5:8 C5:8',
    'D5:8 B4:8',
    'C5:4 E5:4 A5:8',
    'G#5:8 -:8'
  ].join(' '));

  var KORO_HARM = parse([
    'B4:4 G#4:4 A4:4 G4:4',
    'E4:4 E4:4 A4:4 A4:4',
    'G#4:8 B4:4 G#4:4',
    'A4:4 E4:4 E4:4 -:4',
    'F4:8 F4:4 D4:4',
    'C5:8 A4:4 A4:4',
    'G#4:4 G#4:4 B4:4 B4:4',
    'A4:4 E4:4 E4:4 -:4',
    'B4:4 G#4:4 A4:4 G4:4',
    'E4:4 E4:4 A4:4 A4:4',
    'G#4:8 B4:4 G#4:4',
    'A4:4 E4:4 E4:4 -:4',
    'F4:8 F4:4 D4:4',
    'C5:8 A4:4 A4:4',
    'G#4:4 G#4:4 B4:4 B4:4',
    'A4:4 E4:4 E4:4 -:4',
    'B4:8 A4:8',
    'B4:8 G#4:8',
    'A4:8 E4:8',
    'E4:8 D#4:6 -:2',
    'B4:8 A4:8',
    'B4:8 G#4:8',
    'A4:4 C5:4 E5:8',
    'D#5:8 -:8'
  ].join(' '));

  var KORO_BASS = parse([
    'E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2',
    'A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2',
    'G#2:2 G#3:2 G#2:2 G#3:2 E2:2 E3:2 E2:2 E3:2',
    'A2:2 A3:2 A2:2 A3:2 B2:2 B3:2 B2:2 B3:2',
    'D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2',
    'A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2',
    'E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2',
    'A2:2 A3:2 A2:2 A3:2 B2:2 B3:2 B2:2 B3:2',
    'E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2',
    'A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2',
    'G#2:2 G#3:2 G#2:2 G#3:2 E2:2 E3:2 E2:2 E3:2',
    'A2:2 A3:2 A2:2 A3:2 B2:2 B3:2 B2:2 B3:2',
    'D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2',
    'A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2',
    'E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2',
    'A2:2 A3:2 A2:2 A3:2 B2:2 B3:2 B2:2 B3:2',
    'E2:4 E3:4 A2:4 A3:4',
    'B2:4 B3:4 E2:4 E3:4',
    'A2:4 A3:4 A2:4 A3:4',
    'E2:4 E3:4 B2:4 B3:4',
    'E2:4 E3:4 A2:4 A3:4',
    'B2:4 B3:4 E2:4 E3:4',
    'A2:4 A3:4 A2:4 A3:4',
    'E2:4 B2:4 E2:8'
  ].join(' '));

  /* --------- Track B: Bach, Menuett in G (gemeinfrei) --------- */
  var BACH_LEAD = parse([
    'D5:4 G4:2 A4:2 B4:2 C5:2',
    'D5:4 G4:4 G4:4',
    'E5:4 C5:2 D5:2 E5:2 F#5:2',
    'G5:4 G4:4 G4:4',
    'C5:4 D5:2 C5:2 B4:2 A4:2',
    'B4:4 C5:2 B4:2 A4:2 G4:2',
    'F#4:4 G4:2 A4:2 B4:4',
    'G4:8 -:4',
    'D5:4 G4:2 A4:2 B4:2 C5:2',
    'D5:4 G4:4 G4:4',
    'E5:4 C5:2 D5:2 E5:2 F#5:2',
    'G5:4 G4:4 G4:4',
    'C5:4 D5:2 C5:2 B4:2 A4:2',
    'B4:4 C5:2 B4:2 A4:2 G4:2',
    'A4:4 B4:2 A4:2 G4:2 F#4:2',
    'G4:8 -:4'
  ].join(' '));
  var BACH_BASS = parse([
    'G2:4 D3:4 B2:4', 'G2:4 B2:4 G2:4', 'C3:4 E3:4 C3:4', 'B2:4 G2:4 B2:4',
    'A2:4 F#3:4 D3:4', 'G2:4 E3:4 C3:4', 'D3:4 D2:4 D3:4', 'G2:8 -:4',
    'G2:4 D3:4 B2:4', 'G2:4 B2:4 G2:4', 'C3:4 E3:4 C3:4', 'B2:4 G2:4 B2:4',
    'A2:4 F#3:4 D3:4', 'G2:4 E3:4 C3:4', 'D3:4 A2:4 D3:4', 'G2:8 -:4'
  ].join(' '));

  /* --------- Track C: "Neon Zen" (eigene Komposition) --------- */
  var ZEN_LEAD = parse([
    'A4:8 C5:4 E5:4', 'D5:8 C5:8', 'G4:8 B4:4 D5:4', 'C5:16',
    'F4:8 A4:4 C5:4', 'E5:8 D5:8', 'G4:8 B4:8', 'A4:16'
  ].join(' '));
  var ZEN_BASS = parse([
    'A2:8 A2:8', 'D3:8 D3:8', 'G2:8 G2:8', 'C3:8 C3:8',
    'F2:8 F2:8', 'C3:8 C3:8', 'G2:8 G2:8', 'A2:8 A2:8'
  ].join(' '));

  var TRACKS = {
    korobeiniki: {
      id: 'korobeiniki', name: 'Thema A · Korobeiniki', bpm: 150, drums: true,
      parts: [
        { data: KORO_LEAD, type: 'square', gain: 0.30, octave: 0, duty: 0.5 },
        { data: KORO_HARM, type: 'square', gain: 0.12, octave: -1, duty: 0.25 },
        { data: KORO_BASS, type: 'triangle', gain: 0.34, octave: 0 }
      ]
    },
    bach: {
      id: 'bach', name: 'Thema B · Menuett', bpm: 132, drums: true,
      parts: [
        { data: BACH_LEAD, type: 'square', gain: 0.26, octave: 0 },
        { data: BACH_BASS, type: 'triangle', gain: 0.30, octave: 0 }
      ]
    },
    zen: {
      id: 'zen', name: 'Thema C · Neon Zen', bpm: 96, drums: false,
      parts: [
        { data: ZEN_LEAD, type: 'triangle', gain: 0.24, octave: 0 },
        { data: ZEN_BASS, type: 'sine', gain: 0.30, octave: 0 }
      ]
    }
  };

  function Audio() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabledMusic = true;
    this.enabledSfx = true;
    this.volume = 0.7;
    this.track = 'korobeiniki';
    this.playing = false;
    this.tempoScale = 1;
    this.timer = null;
    this.voices = [];
    this.noiseBuf = null;
  }

  Audio.TRACKS = TRACKS;

  Audio.prototype.init = function () {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') { this.ctx.resume(); }
      return this.ctx;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { return null; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.enabledMusic ? 0.55 : 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.enabledSfx ? 0.9 : 0;
    this.sfxGain.connect(this.master);

    // Rauschpuffer für Drums
    var len = this.ctx.sampleRate * 0.5;
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { d[i] = Math.random() * 2 - 1; }
    this.noiseBuf = buf;
    return this.ctx;
  };

  Audio.prototype.setVolume = function (v) {
    this.volume = v;
    if (this.master) { this.master.gain.value = v; }
  };
  Audio.prototype.setMusic = function (on) {
    this.enabledMusic = on;
    if (this.musicGain) { this.musicGain.gain.value = on ? 0.55 : 0; }
    if (on && !this.playing) { this.startMusic(); }
    if (!on) { this.stopMusic(); }
  };
  Audio.prototype.setSfx = function (on) {
    this.enabledSfx = on;
    if (this.sfxGain) { this.sfxGain.gain.value = on ? 0.9 : 0; }
  };

  /* ---------------- SFX ---------------- */

  Audio.prototype.tone = function (o) {
    if (!this.enabledSfx) { return; }
    var ctx = this.init();
    if (!ctx) { return; }
    var t0 = ctx.currentTime + (o.delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1 && o.f1 !== o.f0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + (o.dur || 0.1));
    }
    var vol = (o.gain == null ? 0.3 : o.gain);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (o.dur || 0.1));
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t0); osc.stop(t0 + (o.dur || 0.1) + 0.02);
  };

  Audio.prototype.noise = function (o) {
    if (!this.enabledSfx) { return; }
    var ctx = this.init();
    if (!ctx) { return; }
    o = o || {};
    var t0 = ctx.currentTime + (o.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    var filt = ctx.createBiquadFilter();
    filt.type = o.filter || 'highpass';
    filt.frequency.value = o.freq || 1200;
    var g = ctx.createGain();
    g.gain.setValueAtTime(o.gain == null ? 0.2 : o.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (o.dur || 0.12));
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(t0); src.stop(t0 + (o.dur || 0.12) + 0.02);
  };

  var SFX = {
    move: function (a) { a.tone({ f0: 220, f1: 250, dur: 0.04, gain: 0.14, type: 'square' }); },
    rotate: function (a) { a.tone({ f0: 380, f1: 520, dur: 0.06, gain: 0.16, type: 'square' }); },
    lock: function (a) { a.tone({ f0: 160, f1: 90, dur: 0.08, gain: 0.2, type: 'square' }); a.noise({ freq: 800, dur: 0.05, gain: 0.1 }); },
    harddrop: function (a) { a.tone({ f0: 500, f1: 80, dur: 0.1, gain: 0.22, type: 'sawtooth' }); a.noise({ freq: 400, dur: 0.09, gain: 0.16 }); },
    hold: function (a) { a.tone({ f0: 600, f1: 900, dur: 0.07, gain: 0.15 }); },
    softdrop: function (a) { a.tone({ f0: 150, f1: 170, dur: 0.02, gain: 0.06 }); },
    clear: function (a) {
      [523, 659, 784].forEach(function (f, i) { a.tone({ f0: f, f1: f * 1.02, dur: 0.1, gain: 0.2, delay: i * 0.045 }); });
      a.noise({ freq: 2000, dur: 0.2, gain: 0.12 });
    },
    tetris: function (a) {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) { a.tone({ f0: f, dur: 0.14, gain: 0.24, delay: i * 0.05, type: 'square' }); });
      a.noise({ freq: 1500, dur: 0.35, gain: 0.16 });
    },
    tspin: function (a) {
      [392, 523, 659, 880].forEach(function (f, i) { a.tone({ f0: f, f1: f * 1.5, dur: 0.12, gain: 0.22, delay: i * 0.04, type: 'triangle' }); });
    },
    perfect: function (a) {
      [523, 659, 784, 1046, 1318, 1568].forEach(function (f, i) { a.tone({ f0: f, dur: 0.2, gain: 0.26, delay: i * 0.06, type: 'triangle' }); });
    },
    combo: function (a, n) {
      var base = 440 * Math.pow(1.06, Math.min(n, 12));
      a.tone({ f0: base, f1: base * 1.5, dur: 0.09, gain: 0.18, type: 'square' });
    },
    levelup: function (a) {
      [392, 523, 659, 784, 1046].forEach(function (f, i) { a.tone({ f0: f, dur: 0.11, gain: 0.24, delay: i * 0.06 }); });
    },
    coin: function (a) { a.tone({ f0: 988, dur: 0.05, gain: 0.16 }); a.tone({ f0: 1319, dur: 0.12, gain: 0.16, delay: 0.05 }); },
    buy: function (a) { [659, 880, 1319].forEach(function (f, i) { a.tone({ f0: f, dur: 0.12, gain: 0.2, delay: i * 0.07, type: 'triangle' }); }); },
    deny: function (a) { a.tone({ f0: 200, f1: 120, dur: 0.18, gain: 0.2, type: 'sawtooth' }); },
    achievement: function (a) { [784, 988, 1319, 1568].forEach(function (f, i) { a.tone({ f0: f, dur: 0.16, gain: 0.22, delay: i * 0.08, type: 'square' }); }); },
    gameover: function (a) {
      [440, 415, 392, 370, 349, 330, 311, 294, 262].forEach(function (f, i) {
        a.tone({ f0: f, dur: 0.16, gain: 0.22, delay: i * 0.09, type: 'square' });
      });
    },
    win: function (a) { [523, 659, 784, 1046, 784, 1046, 1318].forEach(function (f, i) { a.tone({ f0: f, dur: 0.16, gain: 0.24, delay: i * 0.1 }); }); },
    ui: function (a) { a.tone({ f0: 660, dur: 0.04, gain: 0.12 }); },
    countdown: function (a) { a.tone({ f0: 440, dur: 0.12, gain: 0.2 }); },
    go: function (a) { a.tone({ f0: 880, dur: 0.2, gain: 0.24 }); },
    warn: function (a) { a.tone({ f0: 300, f1: 200, dur: 0.12, gain: 0.14, type: 'sawtooth' }); },
    power: function (a) { [200, 400, 800, 1600].forEach(function (f, i) { a.tone({ f0: f, f1: f * 1.4, dur: 0.1, gain: 0.2, delay: i * 0.04, type: 'sawtooth' }); }); }
  };

  Audio.prototype.play = function (name, arg) {
    var fn = SFX[name];
    if (fn && this.enabledSfx) { this.init(); fn(this, arg); }
  };

  /* ---------------- Musik-Sequencer ---------------- */

  Audio.prototype.setTrack = function (id) {
    if (!TRACKS[id]) { return; }
    var wasPlaying = this.playing;
    this.stopMusic();
    this.track = id;
    if (wasPlaying) { this.startMusic(); }
  };

  Audio.prototype.setTempoScale = function (s) {
    this.tempoScale = Math.max(0.5, Math.min(2.2, s));
  };

  Audio.prototype.startMusic = function () {
    if (!this.enabledMusic || this.playing) { return; }
    var ctx = this.init();
    if (!ctx) { return; }
    this.playing = true;
    var track = TRACKS[this.track];
    this.seq = {
      cursors: track.parts.map(function () { return { i: 0, t: 0 }; }),
      drumT: 0,
      nextTime: ctx.currentTime + 0.1
    };
    var self = this;
    this.timer = setInterval(function () { self.schedule(); }, 25);
    this.schedule();
  };

  Audio.prototype.stopMusic = function () {
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.voices.forEach(function (v) {
      try { v.stop(); } catch (e) { /* schon gestoppt */ }
    });
    this.voices = [];
  };

  Audio.prototype.schedule = function () {
    if (!this.playing || !this.ctx) { return; }
    var ctx = this.ctx;
    var track = TRACKS[this.track];
    var sixteenth = 60 / (track.bpm * this.tempoScale) / 4;
    var horizon = ctx.currentTime + 0.25;
    var self = this;

    track.parts.forEach(function (part, pi) {
      var cur = self.seq.cursors[pi];
      var partLen = part.data.reduce(function (s, n) { return s + n.dur; }, 0);
      var guard = 0;
      while (self.seq.nextTime + cur.t * sixteenth < horizon && guard < 64) {
        guard++;
        var ev = part.data[cur.i];
        var when = self.seq.nextTime + cur.t * sixteenth;
        var dur = ev.dur * sixteenth;
        if (ev.note !== '-') {
          self.playNote(freq(ev.note) * Math.pow(2, part.octave || 0), when, dur * 0.92, part);
        }
        cur.t += ev.dur;
        cur.i++;
        if (cur.i >= part.data.length) { cur.i = 0; cur.t = cur.t - partLen + partLen; cur.t = cur.t; }
        if (cur.i === 0) { cur.loopT = cur.t; }
      }
    });

    if (track.drums) {
      var guard2 = 0;
      while (this.seq.nextTime + this.seq.drumT * sixteenth < horizon && guard2 < 64) {
        guard2++;
        var beat = this.seq.drumT % 16;
        var when2 = this.seq.nextTime + this.seq.drumT * sixteenth;
        if (beat % 8 === 0) { this.drum(when2, 'kick'); }
        else if (beat % 8 === 4) { this.drum(when2, 'snare'); }
        if (beat % 2 === 0) { this.drum(when2, 'hat'); }
        this.seq.drumT += 2;
      }
    }

    // Zeitbasis regelmäßig zurücksetzen, damit Fließkommafehler nicht wachsen.
    var minT = Math.min.apply(null, this.seq.cursors.map(function (c) { return c.t; }).concat(track.drums ? [this.seq.drumT] : []));
    if (minT > 256) {
      this.seq.nextTime += minT * sixteenth;
      this.seq.cursors.forEach(function (c) { c.t -= minT; });
      this.seq.drumT -= minT;
    }
  };

  Audio.prototype.playNote = function (f, when, dur, part) {
    if (!f || !this.ctx) { return; }
    var ctx = this.ctx;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = part.type || 'square';
    osc.frequency.setValueAtTime(f, when);
    var peak = part.gain || 0.2;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.01);
    g.gain.setValueAtTime(peak, when + Math.max(0.02, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(when); osc.stop(when + dur + 0.02);
    var self = this;
    this.voices.push(osc);
    osc.onended = function () {
      var idx = self.voices.indexOf(osc);
      if (idx >= 0) { self.voices.splice(idx, 1); }
    };
  };

  Audio.prototype.drum = function (when, kind) {
    if (!this.ctx || !this.noiseBuf) { return; }
    var ctx = this.ctx;
    if (kind === 'kick') {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, when);
      o.frequency.exponentialRampToValueAtTime(45, when + 0.11);
      g.gain.setValueAtTime(0.32, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.13);
      o.connect(g); g.connect(this.musicGain);
      o.start(when); o.stop(when + 0.15);
    } else {
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gg = ctx.createGain();
      s.buffer = this.noiseBuf;
      f.type = 'highpass';
      f.frequency.value = kind === 'snare' ? 1200 : 7000;
      gg.gain.setValueAtTime(kind === 'snare' ? 0.14 : 0.05, when);
      gg.gain.exponentialRampToValueAtTime(0.0001, when + (kind === 'snare' ? 0.12 : 0.04));
      s.connect(f); f.connect(gg); gg.connect(this.musicGain);
      s.start(when); s.stop(when + 0.15);
    }
  };

  T.Audio = Audio;
  T.audio = new Audio();
})(typeof window !== 'undefined' ? window : globalThis);
