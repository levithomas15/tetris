/*
 * main.js — Spielablauf: Loop, Engine-Events, HUD, Power-Ups, Speichern.
 */
(function (global) {
  'use strict';

  var T = global.TETRIS;
  var Engine = T.Engine, Renderer = T.Renderer, Input = T.Input, UI = T.UI;
  var save = T.save, audio = T.audio;

  function $(id) { return document.getElementById(id); }
  function fmtNum(n) { return Math.round(n).toLocaleString('de-DE'); }

  // Ab 100.000 gekürzt, damit die Zahl in die schmale Leiste passt.
  function fmtCompact(n) {
    n = Math.round(n);
    if (n < 100000) { return fmtNum(n); }
    if (n < 1000000) { return Math.floor(n / 1000) + 'k'; }
    return (n / 1000000).toFixed(2).replace('.', ',') + 'M';
  }

  var Game = {
    mode: 'marathon',
    engine: null,
    renderer: null,
    input: null,
    ui: null,
    running: false,
    lastFrame: 0,
    countdownLeft: 0,
    revivesLeft: 0,
    sessionCoins: 0,
    maxB2b: 0,
    pendingItems: {},
    wakeLock: null
  };

  /* ---------------- Aufbau ---------------- */

  Game.init = function () {
    var settings = save.data.settings;

    audio.enabledMusic = settings.music;
    audio.enabledSfx = settings.sfx;
    audio.volume = settings.volume;
    audio.track = save.data.equipped.music || 'korobeiniki';

    this.renderer = new Renderer($('board'), $('holdCanvas'), $('nextCanvas'), save);
    this.ui = new UI(save, audio, this);
    this.mode = localStorage.getItem('gbc-tetris-mode') || 'marathon';

    this.makeEngine();

    var self = this;
    this.input = new Input({
      root: $('app'),
      surface: $('boardWrap'),
      settings: settings,
      getCellSize: function () { return self.renderer.cell / self.renderer.dpr; },
      isPlaying: function () { return self.engine && self.engine.phase === 'playing' && !self.ui.current; },
      actions: {
        move: function (d) { return self.act(function (e) { return e.move(d); }); },
        rotate: function (d) { return self.act(function (e) { return e.rotate(d); }); },
        softDrop: function (on) { if (self.engine) { self.engine.softDropping = !!on && !self.ui.current; } },
        softDropStep: function () { return self.act(function (e) { return e.softDrop(); }); },
        hardDrop: function () { return self.act(function (e) { return e.hardDrop(); }); },
        hold: function () { return self.act(function (e) { return e.holdPiece(); }); },
        pause: function () { self.togglePause(); },
        restart: function () { if (!self.ui.current || self.ui.current === 'pause' || self.ui.current === 'over') { self.restart(); } },
        custom: function (act) {
          var m = /^item(\d)$/.exec(act);
          if (m) { self.useSlot(parseInt(m[1], 10) - 1); }
        }
      }
    });

    window.addEventListener('resize', function () { self.renderer.resize(); });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { self.renderer.resize(); }, 250);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.engine && self.engine.phase === 'playing') { self.pauseGame(); }
    });

    // Erste Nutzergeste schaltet den Ton frei (Browser-Autoplay-Regeln).
    var unlock = function () {
      audio.init();
      if (audio.enabledMusic && !audio.playing) { audio.startMusic(); }
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);

    $('reviveBtn').addEventListener('click', function () { self.doRevive(); });

    $('controls').classList.toggle('lefty', !!settings.leftHanded);
    this.renderItems();
    this.ui.show('menu');
    this.dailyBonus();
    this.ui.checkAchievements();

    this.lastFrame = performance.now();
    requestAnimationFrame(function (t) { self.loop(t); });

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline egal */ });
    }
  };

  Game.act = function (fn) {
    if (!this.engine || this.ui.current) { return false; }
    return fn(this.engine);
  };

  Game.makeEngine = function () {
    var self = this;
    var settings = save.data.settings;
    var opts = {
      mode: this.mode,
      seed: this.mode === 'daily' ? save.dailySeed() : ((Math.random() * 0xFFFFFFFF) >>> 0),
      settings: {
        das: settings.das, arr: settings.arr, softDropFactor: 20,
        lockDelay: 500, maxLockResets: 15,
        nextCount: save.previewCount(), ghost: settings.ghost,
        startLevel: this.mode === 'marathon' ? save.marathonStartLevel() : 1
      },
      onEvent: function (name, data, eng) { self.onEngineEvent(name, data, eng); }
    };
    this.engine = new Engine(opts);
    this.sessionCoins = 0;
    this.maxB2b = 0;
    this.revivesLeft = save.reviveCount();
    this.updateHud(true);
  };

  Game.setMode = function (mode) {
    this.mode = mode;
    try { localStorage.setItem('gbc-tetris-mode', mode); } catch (e) { /* egal */ }
    this.makeEngine();
    this.ui.renderMenu();
  };

  /* ---------------- Ablauf ---------------- */

  Game.play = function () {
    audio.init();
    this.makeEngine();
    this.ui.hide();
    this.startCountdown(3);
  };

  Game.restart = function () {
    audio.init();
    this.makeEngine();
    this.ui.hide();
    this.startCountdown(3);
  };

  Game.quit = function () {
    if (this.engine && !this.engine.finished && this.engine.piecesPlaced > 0) { this.finishGame(false); }
    this.engine.phase = 'over';
    audio.setTempoScale(1);
    this.ui.show('menu');
  };

  Game.startCountdown = function (n, restorePhase) {
    var self = this;
    this.countdownLeft = n;
    var cd = $('countdown');
    cd.classList.remove('hidden');
    this.engine.phase = 'paused';
    this.countdownToken = (this.countdownToken || 0) + 1;
    var token = this.countdownToken;

    var tick = function () {
      if (token !== self.countdownToken) { return; } // ein neuer Countdown läuft
      if (self.countdownLeft <= 0) {
        cd.classList.add('hidden');
        self.engine.phase = restorePhase || 'playing';
        audio.play('go');
        if (audio.enabledMusic && !audio.playing) { audio.startMusic(); }
        return;
      }
      cd.innerHTML = '<span>' + (self.countdownLeft === 1 ? 'LOS!' : self.countdownLeft) + '</span>';
      audio.play(self.countdownLeft === 1 ? 'go' : 'countdown');
      self.countdownLeft--;
      setTimeout(tick, 620);
    };
    tick();
  };

  Game.togglePause = function () {
    if (this.ui.current === 'pause') { this.resume(); }
    else if (!this.ui.current && this.engine && (this.engine.phase === 'playing' || this.engine.phase === 'clearing')) { this.pauseGame(); }
  };

  Game.pauseGame = function () {
    if (!this.engine || this.engine.finished) { return; }
    this.engine.pause();
    this.input.releaseAll();
    this.ui.show('pause');
  };

  Game.resume = function () {
    this.ui.hide();
    // Der Countdown setzt die Phase am Ende selbst zurück (auch mitten im Clear).
    this.startCountdown(1, this.engine.prevPhase || 'playing');
  };

  Game.onViewChange = function (name) {
    if (name && this.engine && this.engine.phase === 'playing') { this.engine.pause(); }
    if (this.input) { this.input.releaseAll(); }
  };

  Game.onCosmeticChange = function () {
    this.renderer.resize();
  };

  /* ---------------- Engine-Events ---------------- */

  Game.onEngineEvent = function (name, d, eng) {
    var r = this.renderer;
    switch (name) {
      case 'move': audio.play('move'); break;
      case 'rotate': audio.play('rotate'); break;
      case 'hold': audio.play('hold'); break;
      case 'softdrop': audio.play('softdrop'); break;
      case 'harddrop':
        audio.play('harddrop');
        r.addShake(Math.min(9, 2 + d.distance * 0.45));
        break;
      case 'lock':
        audio.play('lock');
        d.cells.forEach(function (c) {
          if (c[1] >= Engine.HIDDEN) { r.burst(c[0], c[1] - Engine.HIDDEN, '#ffffff', 2); }
        });
        break;
      case 'clear': this.onClear(d, eng); break;
      case 'levelup':
        audio.play('levelup');
        r.float('LEVEL ' + d.level, '#ffd54f', true);
        this.ui.toast('Level ' + d.level + '!');
        r.addShake(6);
        this.bump('hudLevel');
        break;
      case 'gameover': this.onGameOver(d); break;
      case 'power': audio.play('power'); r.addShake(8); break;
      default: break;
    }
  };

  Game.onClear = function (d, eng) {
    var r = this.renderer;
    var skin = save.skin();
    var colors = skin.colors;

    d.rows.forEach(function (row) {
      var vy = row - Engine.HIDDEN;
      if (vy < 0) { return; }
      for (var x = 0; x < Engine.COLS; x++) {
        var v = eng.board[row][x];
        r.burst(x, vy, colors[(v || 1) - 1] || '#fff', d.lines >= 4 ? 5 : 3);
      }
    });

    if (d.lines >= 4) {
      audio.play('tetris');
      r.addShake(16);
      r.clearFlash = 300;
      r.float('TETRIS!', '#4fd8ff', true);
    } else if (d.tspin) {
      audio.play('tspin');
      r.addShake(11);
      r.float(d.name.toUpperCase(), '#d58bff', true);
    } else {
      audio.play('clear');
      r.addShake(3 + d.lines * 2);
      if (d.lines >= 2) { r.float(d.name.toUpperCase(), '#ffffff'); }
    }

    if (d.perfectClear) {
      audio.play('perfect');
      r.float('PERFECT CLEAR!', '#ffd54f', true);
      r.clearFlash = 400;
      r.addShake(20);
      this.ui.toast('✨ Perfect Clear! +' + d.coins + ' 🪙', 'gold', 2200);
    }
    if (d.b2b > 1) { r.float('B2B ×' + d.b2b, '#ffcf4a'); }
    if (d.combo > 0) {
      audio.play('combo', d.combo);
      this.showCombo(d.combo);
    } else {
      this.showCombo(0);
    }

    this.maxB2b = Math.max(this.maxB2b, d.b2b);
    this.sessionCoins += d.coins;
    this.bump('hudScore');
    if (d.coins) { this.bump('hudCoins'); }

    // Käse-Modus: geschafft, wenn kein Müll mehr liegt
    if (this.mode === 'cheese') {
      var left = 0;
      for (var y = 0; y < Engine.TOTAL_ROWS; y++) {
        for (var x = 0; x < Engine.COLS; x++) { if (eng.board[y][x] === 8) { left++; break; } }
      }
      if (left === 0) { eng.gameOver(true); }
    }
  };

  Game.showCombo = function (n) {
    var badge = $('comboBadge');
    if (n > 0) {
      badge.textContent = 'COMBO ×' + n;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  };

  Game.bump = function (id) {
    var e = $(id);
    if (!e) { return; }
    e.classList.remove('bump');
    void e.offsetWidth;
    e.classList.add('bump');
  };

  /* ---------------- Spielende ---------------- */

  Game.onGameOver = function (d) {
    this.input.releaseAll();
    this.showCombo(0);
    audio.setTempoScale(1);
    audio.play(d.win ? 'win' : 'gameover');
    this.renderer.addShake(d.win ? 6 : 18);
    var self = this;
    setTimeout(function () { self.finishGame(true, d.win); }, 700);
  };

  Game.score = function () {
    return Math.round(this.engine.score * save.scoreMultiplier());
  };

  Game.finishGame = function (showScreen, win) {
    var eng = this.engine;
    var stats = eng.stats();
    stats.score = this.score();
    stats.maxB2b = this.maxB2b;
    stats.win = !!win;

    var prevBest = this.mode === 'sprint' ? save.data.best.sprint : (save.data.best[this.mode] || 0);
    var earned = save.recordGame(this.mode, stats, this.sessionCoins);
    var unlocked = this.ui.checkAchievements();

    var isRecord = this.mode === 'sprint'
      ? (stats.lines >= 40 && (prevBest == null || stats.time < prevBest))
      : (stats.score > prevBest);

    if (!showScreen) { return; }

    $('overTitle').textContent = win ? (this.mode === 'sprint' ? 'Geschafft!' : 'Zeit um!') : 'Game Over';
    var res = $('overResult');
    res.innerHTML = '';
    var self = this;

    function cell(k, v, cls) {
      var c = document.createElement('div');
      c.className = 'cell' + (cls ? ' ' + cls : '');
      c.innerHTML = '<div class="k">' + k + '</div><div class="v">' + v + '</div>';
      res.appendChild(c);
    }

    cell('Punkte', fmtNum(stats.score), isRecord ? 'new wide' : 'wide');
    if (this.mode === 'sprint' || this.mode === 'cheese') { cell('Zeit', UI.fmtTime(stats.time)); }
    else { cell('Zeit', this.ui.fmtClock(stats.time)); }
    cell('Reihen', fmtNum(stats.lines));
    cell('Level', stats.level);
    cell('Tetrises', stats.tetrises);
    cell('T-Spins', stats.tspins);
    cell('Beste Combo', stats.maxCombo);
    cell('Münzen', '+' + fmtNum(earned), 'gold wide');

    if (isRecord) { this.ui.toast('🏅 Neuer Rekord!', 'gold', 2400); }
    if (unlocked.length) { /* Toasts kommen aus checkAchievements */ }

    var reviveBtn = $('reviveBtn');
    var canRevive = !win && this.revivesLeft > 0 && this.mode !== 'sprint' && this.mode !== 'ultra';
    reviveBtn.classList.toggle('hidden', !canRevive);
    if (canRevive) { reviveBtn.textContent = '❤️ Weitermachen (' + this.revivesLeft + '×)'; }

    this.ui.show('over');
    void self;
  };

  Game.doRevive = function () {
    if (this.revivesLeft <= 0) { return; }
    this.revivesLeft--;
    audio.play('power');
    this.ui.hide();
    this.engine.revive();
    this.startCountdown(2);
  };

  /* ---------------- Power-Ups ---------------- */

  Game.renderItems = function () {
    var row = $('itemsRow');
    if (!row) { return; }
    row.innerHTML = '';
    var slots = save.powerSlots();
    var inv = save.data.inventory;
    var owned = T.Save.POWERUPS.filter(function (p) { return (inv[p.id] || 0) > 0; });
    var self = this;
    this.slotItems = owned.slice(0, slots);

    for (var i = 0; i < slots; i++) {
      var p = this.slotItems[i];
      var btn = document.createElement('button');
      btn.className = 'item-btn';
      if (p) {
        btn.innerHTML = p.icon + '<span class="count">' + inv[p.id] + '</span>';
        btn.setAttribute('title', p.name + ' — ' + p.desc);
        (function (idx) {
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            self.useSlot(idx);
          });
        })(i);
      } else {
        btn.innerHTML = '<span style="opacity:.4">➕</span>';
        btn.addEventListener('click', function () {
          audio.play('ui');
          self.ui.show('shop');
          self.ui.shopTab = 'powerups';
          var tabs = $('shopTabs');
          Array.prototype.forEach.call(tabs.children, function (t) {
            t.classList.toggle('active', t.getAttribute('data-tab') === 'powerups');
          });
          self.ui.renderShop();
        });
      }
      row.appendChild(btn);
    }
  };

  Game.useSlot = function (idx) {
    var p = this.slotItems && this.slotItems[idx];
    if (!p) { return; }
    if (!this.engine || this.engine.phase !== 'playing' || this.ui.current) {
      audio.play('deny');
      return;
    }
    if (!save.usePowerup(p.id)) { audio.play('deny'); return; }

    if (p.id === 'bomb') { this.engine.powerBomb(); this.ui.toast('💣 Boom!'); }
    else if (p.id === 'slow') { this.engine.powerSlow(20000); this.ui.toast('⏳ Zeitlupe 20 s'); }
    else if (p.id === 'swap') { this.engine.powerSwap(); this.ui.toast('🔄 Stein getauscht'); }
    else if (p.id === 'clean') { this.engine.powerClean(); this.ui.toast('🧹 Oben aufgeräumt'); }

    this.renderItems();
  };

  /* ---------------- Tagesbonus ---------------- */

  Game.dailyBonus = function () {
    var b = save.claimDailyBonus();
    if (b) {
      var self = this;
      setTimeout(function () {
        audio.play('coin');
        self.ui.toast('🎁 Tagesbonus: +' + b.amount + ' 🪙 (Serie ' + b.streak + ')', 'gold', 3000);
        self.ui.renderMenu();
      }, 500);
    }
  };

  /* ---------------- HUD & Loop ---------------- */

  // Lange Zahlen verkleinern, damit sie in die schmale Leiste passen.
  function setScore(el, text) {
    if (el.textContent === text) { return; }
    el.textContent = text;
    var n = text.length;
    el.style.fontSize = n > 6 ? 'clamp(6px,1.9vw,9px)'
      : n > 5 ? 'clamp(7px,2.2vw,11px)'
        : n > 4 ? 'clamp(7px,2.4vw,12px)' : '';
  }

  Game.updateHud = function (force) {
    var eng = this.engine;
    if (!eng) { return; }
    var scoreEl = $('hudScore');
    var score = this.score();
    if (force || this._lastScore !== score) { setScore(scoreEl, fmtCompact(score)); this._lastScore = score; }

    var goalLabel = $('hudGoalLabel'), linesEl = $('hudLines');
    if (this.mode === 'sprint') {
      goalLabel.textContent = 'Übrig';
      linesEl.textContent = Math.max(0, 40 - eng.lines);
    } else if (this.mode === 'ultra') {
      goalLabel.textContent = 'Restzeit';
      linesEl.textContent = Math.max(0, Math.ceil((120000 - eng.elapsed) / 1000));
    } else {
      goalLabel.textContent = 'Reihen';
      linesEl.textContent = eng.lines;
    }

    $('hudLevel').textContent = eng.level;
    $('hudTime').textContent = this.ui.fmtClock(eng.elapsed);
    setScore($('hudCoins'), fmtCompact(save.data.coins + this.sessionCoins));

    var b2bPanel = $('hudB2bPanel');
    $('hudB2b').textContent = eng.b2b > 0 ? '×' + eng.b2b : '–';
    b2bPanel.classList.toggle('on', eng.b2b > 0);
  };

  Game.updateMusicTempo = function () {
    if (!this.engine || this.engine.phase !== 'playing') { return; }
    var top = this.renderer.stackTop(this.engine);
    var danger = top >= 0 && top < Engine.HIDDEN + 6;
    var lvl = Math.min(this.engine.level, 15);
    var scale = 1 + (lvl - 1) * 0.022 + (danger ? 0.25 : 0);
    if (Math.abs((this._tempo || 1) - scale) > 0.02) {
      this._tempo = scale;
      audio.setTempoScale(scale);
    }
  };

  Game.loop = function (now) {
    var self = this;
    var dt = Math.min(now - this.lastFrame, 100);
    this.lastFrame = now;

    if (this.engine) {
      if (!this.ui.current && this.engine.phase !== 'paused') {
        this.input.update(dt);
        this.engine.update(dt);
      }
      this.renderer.update(dt);
      this.renderer.draw(this.engine);
      this.updateHud(false);
      this.updateMusicTempo();
    }

    requestAnimationFrame(function (t) { self.loop(t); });
  };

  /* ---------------- Start ---------------- */

  function boot() {
    Game.init();
    // Layout nach dem ersten Paint noch einmal messen (mobile URL-Leiste).
    setTimeout(function () { Game.renderer.resize(); }, 100);
    setTimeout(function () { Game.renderer.resize(); }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  T.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
