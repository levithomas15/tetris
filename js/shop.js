/*
 * shop.js — Speicherstand, Münzen, Shop, Upgrades, Achievements, Statistiken.
 */
(function (global) {
  'use strict';

  var T = global.TETRIS = global.TETRIS || {};
  var KEY = 'gbc-tetris-save-v1';

  /* ---------------- Katalog ---------------- */

  var SKINS = [
    { id: 'gbc', name: 'Game Boy Color', desc: 'Der Klassiker in Farbe', price: 0, colors: ['#37c8e0', '#2f6fd8', '#f0921f', '#f2d024', '#4fc84f', '#c34fd8', '#e0403c'] },
    { id: 'dmg', name: 'DMG Grün', desc: '4 Grüntöne wie 1989', price: 150, colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f', '#306230', '#0f380f', '#8bac0f'], mono: true },
    { id: 'neon', name: 'Neon Nights', desc: 'Leuchtendes Synthwave-Set', price: 400, colors: ['#00fff7', '#3d5afe', '#ff9100', '#ffea00', '#00e676', '#d500f9', '#ff1744'], glow: true },
    { id: 'candy', name: 'Candy Pop', desc: 'Zuckersüße Pastelltöne', price: 400, colors: ['#7fdbda', '#7f9bdb', '#ffb677', '#ffe08a', '#a8e6a1', '#d5a6f0', '#ff9aa2'] },
    { id: 'ice', name: 'Eiskristall', desc: 'Kühles Blau-Weiß', price: 650, colors: ['#a8f0ff', '#5ec8f0', '#c8e8ff', '#e8f8ff', '#7fd8e8', '#b0c4f0', '#5aa8d8'], glow: true },
    { id: 'magma', name: 'Magma', desc: 'Glühende Lava', price: 650, colors: ['#ffb300', '#ff6d00', '#ff3d00', '#ffea00', '#dd2c00', '#bf360c', '#ff5722'], glow: true },
    { id: 'mono', name: 'Tinte', desc: 'Monochrom & elegant', price: 500, colors: ['#f5f5f5', '#c8c8c8', '#a0a0a0', '#e0e0e0', '#b4b4b4', '#8c8c8c', '#dcdcdc'], mono: true },
    { id: 'gold', name: 'Goldbarren', desc: 'Für Angeber', price: 1200, colors: ['#ffe082', '#ffd54f', '#ffca28', '#ffc107', '#ffb300', '#ffa000', '#ff8f00'], glow: true },
    { id: 'rainbow', name: 'Regenbogen', desc: 'Farbwechsel in Echtzeit', price: 2000, colors: ['#ff0000', '#ff8800', '#ffee00', '#33dd33', '#00ccff', '#4444ff', '#cc44ff'], rainbow: true, glow: true }
  ];

  var SHELLS = [
    { id: 'berry', name: 'Berry', price: 0, body: '#c2185b', body2: '#8e1044', accent: '#ff5c8a' },
    { id: 'teal', name: 'Teal', price: 200, body: '#00838f', body2: '#005662', accent: '#4fd8e8' },
    { id: 'grape', name: 'Grape', price: 200, body: '#5e35b1', body2: '#3f2380', accent: '#b39ddb' },
    { id: 'kiwi', name: 'Kiwi', price: 200, body: '#558b2f', body2: '#33691e', accent: '#aed581' },
    { id: 'atomic', name: 'Atomic Purple', price: 600, body: '#6a4a8f', body2: '#3d2a5c', accent: '#d0b0ff', clear: true },
    { id: 'dmgshell', name: 'DMG Grau', price: 400, body: '#9a9a94', body2: '#6e6e6a', accent: '#8b2f6b' },
    { id: 'midnight', name: 'Midnight', price: 800, body: '#1f2733', body2: '#131922', accent: '#4fc3f7' },
    { id: 'ghostshell', name: 'Ghost', price: 1500, body: '#3a3f4b', body2: '#22262e', accent: '#7cffcb', clear: true }
  ];

  var MUSIC = [
    { id: 'korobeiniki', name: 'Thema A · Korobeiniki', desc: 'Die Original-Tetris-Melodie', price: 0 },
    { id: 'bach', name: 'Thema B · Menuett', desc: 'Bach, chippy interpretiert', price: 300 },
    { id: 'zen', name: 'Thema C · Neon Zen', desc: 'Entspannter Loop', price: 300 }
  ];

  var POWERUPS = [
    { id: 'bomb', name: 'Bombe', icon: '💣', desc: 'Sprengt die untersten 3 Reihen', price: 120 },
    { id: 'slow', name: 'Zeitlupe', icon: '⏳', desc: '20 s lang 60 % langsamer', price: 100 },
    { id: 'swap', name: 'Tausch', icon: '🔄', desc: 'Tauscht den aktuellen Stein', price: 60 },
    { id: 'clean', name: 'Planierer', icon: '🧹', desc: 'Räumt die 2 obersten Reihen ab', price: 150 }
  ];

  var UPGRADES = [
    { id: 'coinBoost', name: 'Münz-Magnet', desc: '+25 % Münzen pro Stufe', max: 4, price: function (l) { return 300 * (l + 1); } },
    { id: 'startLevel', name: 'Startlevel', desc: 'Marathon startet 1 Level höher', max: 9, price: function (l) { return 200 * (l + 1); } },
    { id: 'slots', name: 'Item-Gürtel', desc: '+1 Power-Up-Slot im Spiel', max: 2, price: function (l) { return 500 * (l + 1); } },
    { id: 'revive', name: 'Extraleben', desc: 'Einmal pro Spiel weitermachen', max: 3, price: function (l) { return 700 * (l + 1); } },
    { id: 'preview', name: 'Weitblick', desc: '+1 Vorschau-Stein', max: 2, price: function (l) { return 250 * (l + 1); } },
    { id: 'scoreBoost', name: 'Punkte-Turbo', desc: '+10 % Punkte pro Stufe', max: 3, price: function (l) { return 450 * (l + 1); } }
  ];

  var ACHIEVEMENTS = [
    { id: 'first', name: 'Erster Stein', desc: 'Spiele dein erstes Spiel', coins: 20, check: function (s) { return s.stats.games >= 1; } },
    { id: 'lines100', name: 'Fleißarbeit', desc: '100 Reihen insgesamt', coins: 50, check: function (s) { return s.stats.lines >= 100; } },
    { id: 'lines1000', name: 'Reihenweise', desc: '1 000 Reihen insgesamt', coins: 250, check: function (s) { return s.stats.lines >= 1000; } },
    { id: 'lines5000', name: 'Maschinist', desc: '5 000 Reihen insgesamt', coins: 800, check: function (s) { return s.stats.lines >= 5000; } },
    { id: 'tetris1', name: 'TETRIS!', desc: 'Räume 4 Reihen auf einmal', coins: 40, check: function (s) { return s.stats.tetrises >= 1; } },
    { id: 'tetris50', name: 'Tetris-Fabrik', desc: '50 Tetrises', coins: 200, check: function (s) { return s.stats.tetrises >= 50; } },
    { id: 'tetris250', name: 'Vierling-Meister', desc: '250 Tetrises', coins: 600, check: function (s) { return s.stats.tetrises >= 250; } },
    { id: 'tspin1', name: 'Dreh-Trick', desc: 'Erster T-Spin', coins: 60, check: function (s) { return s.stats.tspins >= 1; } },
    { id: 'tspin25', name: 'T-Spin-Doktor', desc: '25 T-Spins', coins: 250, check: function (s) { return s.stats.tspins >= 25; } },
    { id: 'combo5', name: 'Kettenreaktion', desc: 'Combo von 5', coins: 80, check: function (s) { return s.stats.maxCombo >= 5; } },
    { id: 'combo10', name: 'Combo-König', desc: 'Combo von 10', coins: 300, check: function (s) { return s.stats.maxCombo >= 10; } },
    { id: 'pc1', name: 'Blitzblank', desc: 'Erster Perfect Clear', coins: 150, check: function (s) { return s.stats.perfectClears >= 1; } },
    { id: 'pc10', name: 'Putzteufel', desc: '10 Perfect Clears', coins: 500, check: function (s) { return s.stats.perfectClears >= 10; } },
    { id: 'level10', name: 'Aufsteiger', desc: 'Erreiche Level 10', coins: 100, check: function (s) { return s.stats.maxLevel >= 10; } },
    { id: 'level15', name: 'Schwindelfrei', desc: 'Erreiche Level 15', coins: 300, check: function (s) { return s.stats.maxLevel >= 15; } },
    { id: 'level20', name: 'Übermensch', desc: 'Erreiche Level 20', coins: 900, check: function (s) { return s.stats.maxLevel >= 20; } },
    { id: 'score50k', name: 'Halbe Million?', desc: '50 000 Punkte in einem Spiel', coins: 150, check: function (s) { return s.best.marathon >= 50000; } },
    { id: 'score150k', name: 'Punktejäger', desc: '150 000 Punkte in einem Spiel', coins: 500, check: function (s) { return s.best.marathon >= 150000; } },
    { id: 'sprint', name: 'Sprinter', desc: 'Sprint 40L unter 3:00', coins: 200, check: function (s) { return s.best.sprint && s.best.sprint <= 180000; } },
    { id: 'sprintFast', name: 'Düsenjäger', desc: 'Sprint 40L unter 1:30', coins: 700, check: function (s) { return s.best.sprint && s.best.sprint <= 90000; } },
    { id: 'ultra', name: 'Zwei Minuten Ruhm', desc: '10 000 Punkte in Ultra', coins: 250, check: function (s) { return s.best.ultra >= 10000; } },
    { id: 'rich', name: 'Sparfuchs', desc: 'Besitze 2 000 Münzen', coins: 100, check: function (s) { return s.coins >= 2000; } },
    { id: 'collector', name: 'Sammler', desc: 'Besitze 5 Skins', coins: 300, check: function (s) { return s.owned.skins.length >= 5; } },
    { id: 'fashion', name: 'Modebewusst', desc: 'Besitze 4 Gehäuse', coins: 250, check: function (s) { return s.owned.shells.length >= 4; } },
    { id: 'daily3', name: 'Stammgast', desc: '3 Tage Serie', coins: 150, check: function (s) { return s.streak >= 3; } },
    { id: 'daily7', name: 'Wochenroutine', desc: '7 Tage Serie', coins: 500, check: function (s) { return s.streak >= 7; } },
    { id: 'pieces1000', name: 'Tausendsassa', desc: '1 000 Steine gesetzt', coins: 120, check: function (s) { return s.stats.pieces >= 1000; } },
    { id: 'marathon', name: 'Ausdauer', desc: '1 Stunde Gesamtspielzeit', coins: 300, check: function (s) { return s.stats.playtime >= 3600000; } },
    { id: 'b2b5', name: 'Serientäter', desc: '5× Back-to-Back am Stück', coins: 200, check: function (s) { return s.stats.maxB2b >= 5; } },
    { id: 'allSkins', name: 'Vollausstattung', desc: 'Alle Skins freigeschaltet', coins: 1000, check: function (s) { return s.owned.skins.length >= SKINS.length; } }
  ];

  /* ---------------- Speicherstand ---------------- */

  function defaultSave() {
    return {
      v: 1,
      coins: 0,
      totalCoins: 0,
      owned: { skins: ['gbc'], shells: ['berry'], music: ['korobeiniki'] },
      upgrades: {},
      equipped: { skin: 'gbc', shell: 'berry', music: 'korobeiniki' },
      inventory: { bomb: 1, slow: 1, swap: 1, clean: 0 },
      stats: {
        games: 0, lines: 0, pieces: 0, score: 0, tetrises: 0, tspins: 0,
        maxCombo: 0, perfectClears: 0, playtime: 0, maxLevel: 1, maxB2b: 0,
        singles: 0, doubles: 0, triples: 0, holds: 0
      },
      best: { marathon: 0, sprint: null, ultra: 0, zen: 0, cheese: null, daily: {} },
      achievements: {},
      streak: 0,
      admin: { noGravity: false, invincible: false, infiniteItems: false, fps: false },
      lastPlayDay: null,
      lastBonusDay: null,
      settings: {
        music: true, sfx: true, volume: 0.7, vibrate: true, ghost: true,
        gestures: true, das: 150, arr: 33, leftHanded: false, tapRotateSplit: false,
        grid: true, particles: true, shake: true
      }
    };
  }

  function deepMerge(base, extra) {
    if (!extra || typeof extra !== 'object') { return base; }
    Object.keys(extra).forEach(function (k) {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        deepMerge(base[k], extra[k]);
      } else if (extra[k] !== undefined) {
        base[k] = extra[k];
      }
    });
    return base;
  }

  function Save() {
    this.data = defaultSave();
    this.load();
    this.listeners = [];
  }

  Save.SKINS = SKINS;
  Save.SHELLS = SHELLS;
  Save.MUSIC = MUSIC;
  Save.POWERUPS = POWERUPS;
  Save.UPGRADES = UPGRADES;
  Save.ACHIEVEMENTS = ACHIEVEMENTS;

  Save.prototype.load = function () {
    try {
      var raw = global.localStorage && global.localStorage.getItem(KEY);
      if (raw) { deepMerge(this.data, JSON.parse(raw)); }
    } catch (e) { /* Speicher nicht verfügbar → Standardwerte */ }
  };

  Save.prototype.save = function () {
    try {
      if (global.localStorage) { global.localStorage.setItem(KEY, JSON.stringify(this.data)); }
    } catch (e) { /* Quota/Private Mode → still ignorieren */ }
  };

  Save.prototype.reset = function () {
    this.data = defaultSave();
    this.save();
  };

  /* ---------------- Münzen & Käufe ---------------- */

  Save.prototype.coinMultiplier = function () {
    return 1 + 0.25 * (this.data.upgrades.coinBoost || 0);
  };
  Save.prototype.scoreMultiplier = function () {
    return 1 + 0.10 * (this.data.upgrades.scoreBoost || 0);
  };
  Save.prototype.powerSlots = function () {
    return 2 + (this.data.upgrades.slots || 0);
  };
  Save.prototype.previewCount = function () {
    return 3 + (this.data.upgrades.preview || 0);
  };
  Save.prototype.reviveCount = function () {
    return this.data.upgrades.revive || 0;
  };
  Save.prototype.marathonStartLevel = function () {
    return 1 + (this.data.upgrades.startLevel || 0);
  };

  Save.prototype.addCoins = function (n) {
    n = Math.max(0, Math.round(n));
    this.data.coins += n;
    this.data.totalCoins += n;
    this.save();
    return n;
  };

  Save.prototype.spend = function (n) {
    if (this.data.coins < n) { return false; }
    this.data.coins -= n;
    this.save();
    return true;
  };

  Save.prototype.owns = function (cat, id) {
    var list = this.data.owned[cat];
    return !!(list && list.indexOf(id) >= 0);
  };

  Save.prototype.buy = function (cat, id) {
    var catalog = { skins: SKINS, shells: SHELLS, music: MUSIC }[cat];
    if (!catalog) { return { ok: false, reason: 'unknown' }; }
    var item = catalog.filter(function (i) { return i.id === id; })[0];
    if (!item) { return { ok: false, reason: 'unknown' }; }
    if (this.owns(cat, id)) { return { ok: false, reason: 'owned' }; }
    if (!this.spend(item.price)) { return { ok: false, reason: 'poor' }; }
    this.data.owned[cat].push(id);
    this.save();
    return { ok: true, item: item };
  };

  Save.prototype.equip = function (cat, id) {
    if (!this.owns(cat, id)) { return false; }
    var key = { skins: 'skin', shells: 'shell', music: 'music' }[cat];
    this.data.equipped[key] = id;
    this.save();
    return true;
  };

  Save.prototype.buyPowerup = function (id, qty) {
    qty = qty || 1;
    var item = POWERUPS.filter(function (i) { return i.id === id; })[0];
    if (!item) { return { ok: false, reason: 'unknown' }; }
    var cost = item.price * qty;
    if (!this.spend(cost)) { return { ok: false, reason: 'poor' }; }
    this.data.inventory[id] = (this.data.inventory[id] || 0) + qty;
    this.save();
    return { ok: true, item: item, qty: qty };
  };

  Save.prototype.usePowerup = function (id) {
    if (this.data.admin && this.data.admin.infiniteItems) { return true; }
    if (!this.data.inventory[id]) { return false; }
    this.data.inventory[id]--;
    this.save();
    return true;
  };

  Save.prototype.upgradeLevel = function (id) { return this.data.upgrades[id] || 0; };

  Save.prototype.upgradePrice = function (id) {
    var up = UPGRADES.filter(function (u) { return u.id === id; })[0];
    if (!up) { return null; }
    var lvl = this.upgradeLevel(id);
    if (lvl >= up.max) { return null; }
    return up.price(lvl);
  };

  Save.prototype.buyUpgrade = function (id) {
    var price = this.upgradePrice(id);
    if (price == null) { return { ok: false, reason: 'max' }; }
    if (!this.spend(price)) { return { ok: false, reason: 'poor' }; }
    this.data.upgrades[id] = this.upgradeLevel(id) + 1;
    this.save();
    return { ok: true, level: this.data.upgrades[id] };
  };

  /* ---------------- Fortschritt ---------------- */

  Save.prototype.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  Save.prototype.dailySeed = function () {
    var s = this.today().replace(/-/g, '');
    return parseInt(s, 10) >>> 0;
  };

  // Tagesbonus: einmal pro Tag, wächst mit der Serie.
  Save.prototype.claimDailyBonus = function () {
    var today = this.today();
    if (this.data.lastBonusDay === today) { return null; }
    var yesterday = new Date(Date.now() - 86400000);
    var yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    if (this.data.lastBonusDay === yStr) { this.data.streak = (this.data.streak || 0) + 1; }
    else { this.data.streak = 1; }
    this.data.lastBonusDay = today;
    var amount = 50 + Math.min(this.data.streak, 7) * 25;
    this.addCoins(amount);
    return { amount: amount, streak: this.data.streak };
  };

  Save.prototype.recordGame = function (mode, stats, coinsRaw) {
    var s = this.data.stats;
    s.games++;
    s.lines += stats.lines;
    s.pieces += stats.pieces;
    s.score += stats.score;
    s.tetrises += stats.tetrises;
    s.tspins += stats.tspins;
    s.perfectClears += stats.perfectClears;
    s.playtime += stats.time;
    s.maxCombo = Math.max(s.maxCombo, stats.maxCombo);
    s.maxLevel = Math.max(s.maxLevel, stats.level);
    s.maxB2b = Math.max(s.maxB2b || 0, stats.maxB2b || 0);

    var best = this.data.best;
    if (mode === 'sprint') {
      if (stats.lines >= 40 && (best.sprint == null || stats.time < best.sprint)) { best.sprint = stats.time; }
    } else if (mode === 'cheese') {
      // Käse wird über die Zeit gewertet — nur ein geschafftes Feld zählt.
      if (stats.win && (best.cheese == null || stats.time < best.cheese)) { best.cheese = stats.time; }
    } else if (mode === 'daily') {
      best.daily = best.daily || {};
      var t = this.today();
      if (!best.daily[t] || stats.score > best.daily[t]) { best.daily[t] = stats.score; }
    } else if (best[mode] == null || stats.score > best[mode]) {
      best[mode] = stats.score;
    }

    var earned = this.addCoins((coinsRaw + Math.floor(stats.score / 500)) * this.coinMultiplier());
    this.save();
    return earned;
  };

  Save.prototype.checkAchievements = function () {
    var unlocked = [];
    var self = this;
    ACHIEVEMENTS.forEach(function (a) {
      if (self.data.achievements[a.id]) { return; }
      var ok = false;
      try { ok = a.check(self.data); } catch (e) { ok = false; }
      if (ok) {
        self.data.achievements[a.id] = Date.now();
        self.addCoins(a.coins);
        unlocked.push(a);
      }
    });
    if (unlocked.length) { this.save(); }
    return unlocked;
  };

  Save.prototype.achievementProgress = function () {
    var done = Object.keys(this.data.achievements).length;
    return { done: done, total: ACHIEVEMENTS.length };
  };

  Save.prototype.skin = function () {
    var id = this.data.equipped.skin;
    return SKINS.filter(function (s) { return s.id === id; })[0] || SKINS[0];
  };
  Save.prototype.shell = function () {
    var id = this.data.equipped.shell;
    return SHELLS.filter(function (s) { return s.id === id; })[0] || SHELLS[0];
  };

  T.Save = Save;
  T.save = new Save();
})(typeof window !== 'undefined' ? window : globalThis);
